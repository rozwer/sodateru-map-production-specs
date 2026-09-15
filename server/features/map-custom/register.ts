import { readFileSync, existsSync } from 'node:fs';
import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { defineFeature } from '../../core/features.ts';
import type { CoreEnv } from '../../core/context.ts';
import { CommonError, expectedVersion } from '../../core/errors.ts';
import { idempotentMutation, type StoredResult } from '../../core/idempotency.ts';
import { mapCustomService } from './service.ts';

// Manual persistence is deployable before AI.engine. Its unavailable actions explicitly return 503.
const aiAvailable = existsSync(new URL('../../ai/index.ts', import.meta.url)) && existsSync(new URL('../plugins/index.ts', import.meta.url));
const adoptionModule = aiAvailable ? await import('./adoption.ts') : null;
if (aiAvailable) (await import('./mapstyle.ts')).registerMapstyleTask();

function respond(c: Context<CoreEnv>, result: StoredResult) {
  for (const [name,value] of Object.entries(result.headers ?? {})) c.header(name,value);
  return c.body(JSON.stringify(result.body),result.status as ContentfulStatusCode,{'Content-Type':'application/json'});
}
function identity(c: Context<CoreEnv>) {
  return {context:c.get('context'),operation:`${c.req.method} ${c.req.path}`,key:c.req.header('Idempotency-Key')!,input:c.get('input').body ?? null};
}
function adoption(c: Context<CoreEnv>) {
  if (!adoptionModule) throw new CommonError('PROVIDER_UNAVAILABLE','共通AI実行器がまだ接続されていません。',true,{},503);
  return new adoptionModule.MapCustomAdoption(c.get('db'),c.get('context'));
}
export default defineFeature({
  id:'map-custom',
  migrations:[{id:'map-custom/001',sql:readFileSync(new URL('../../db/migrations/map-custom/001-map-custom.sql',import.meta.url),'utf8')}],
  register(api,services) {
    const service = (c: Context<CoreEnv>) => mapCustomService(c.get('db'),c.get('context'));
    api.get('/map-objects', c => c.json(service(c).listObjects()));
    api.get('/map-objects/:objectId', c => {
      const data=service(c).getObject(c.req.param('objectId'));
      c.header('ETag',`"${data.version}"`); return c.json({data});
    });
    api.post('/map-objects', c => {
      const operations=service(c);
      const result=idempotentMutation(c.get('db'),identity(c),{
        execute() {
          const data=operations.createObject(c.get('input').body);
          return {status:201,body:{data},resource:{type:'map-object',id:data.id},headers:{ETag:`"${data.version}"`,Location:'/api/v1/map-objects/'+data.id}};
        },
        replay(receipt) {
          const data=operations.getObject(receipt.resource!.id);
          return {status:200,body:{data},headers:{ETag:`"${data.version}"`,Location:'/api/v1/map-objects/'+data.id}};
        },
      });
      return respond(c,result);
    });
    api.patch('/map-objects/:objectId', c => {
      const data=services.transaction(c.get('db'),()=>service(c).patchObject(c.req.param('objectId'),expectedVersion(c.req.header('If-Match')),c.get('input').body));
      c.header('ETag',`"${data.version}"`);return c.json({data});
    });
    api.delete('/map-objects/:objectId', c => {
      services.transaction(c.get('db'),()=>service(c).deleteObject(c.req.param('objectId'),expectedVersion(c.req.header('If-Match'))));
      return c.body(null,204);
    });
    api.get('/map-settings', c => {
      const data=services.transaction(c.get('db'),()=>service(c).getSettings());
      c.header('ETag',`"${data.version}"`);return c.json({data});
    });
    api.patch('/map-settings', c => {
      const data=services.transaction(c.get('db'),()=>service(c).patchSettings(expectedVersion(c.req.header('If-Match')),c.get('input').body));
      c.header('ETag',`"${data.version}"`);return c.json({data});
    });
    api.post('/map-settings/previews', async c => {
      const operations=adoption(c);
      const {messageId}=c.get('input').body as {messageId:string};
      const verified=await operations.verifiedResult(messageId);
      return respond(c,idempotentMutation(c.get('db'),identity(c),{
        execute() {
          const data=operations.createPreviewSync(messageId,verified);
          return {status:201,body:{data},resource:{type:'map-settings-preview',id:data.id},headers:{ETag:`"${data.version}"`,Location:'/api/v1/map-settings/previews/'+data.id}};
        },
        replay(receipt) {const data=operations.getPreview(receipt.resource!.id);return {status:200,body:{data},headers:{ETag:`"${data.version}"`}};},
      }));
    });
    api.get('/map-settings/previews/:previewId', async c => {
      const operations=adoption(c),data=operations.getPreview(c.req.param('previewId'));
      await operations.verifiedResult(data.messageId);
      c.header('ETag',`"${data.version}"`);return c.json({data});
    });
    api.post('/map-settings/previews/:previewId/cancel', c => {
      const operations=adoption(c),id=c.req.param('previewId');
      return respond(c,idempotentMutation(c.get('db'),identity(c),{
        execute() {const data=operations.cancelSync(id,expectedVersion(c.req.header('If-Match')));return {status:200,body:{data},resource:{type:'map-settings-preview',id},headers:{ETag:`"${data.version}"`}};},
        replay() {const data=operations.getPreview(id);return {status:200,body:{data},headers:{ETag:`"${data.version}"`}};},
      }));
    });
    api.post('/map-settings/previews/:previewId/adopt', async c => {
      const operations=adoption(c),id=c.req.param('previewId'),preview=operations.getPreview(id);
      const verified=await operations.verifiedResult(preview.messageId);
      const read=()=>operations.adoptSync(id,expectedVersion(c.req.header('If-Match')),verified);
      return respond(c,idempotentMutation(c.get('db'),identity(c),{
        execute() {const data=read();return {status:200,body:{data},resource:{type:'map-settings-adoption',id},headers:{ETag:`"${data.settings.version}"`}};},
        replay() {const data=read();return {status:200,body:{data},headers:{ETag:`"${data.settings.version}"`}};},
      }));
    });
  },
});
