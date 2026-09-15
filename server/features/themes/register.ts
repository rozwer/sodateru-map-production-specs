import { readFileSync } from 'node:fs';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { defineFeature } from '../../core/features.ts';
import { expectedVersion } from '../../core/errors.ts';
import { idempotencyKey, idempotentMutation } from '../../core/idempotency.ts';
import { createTheme, getTheme, listThemes, patchTheme, deleteTheme, normalizeTheme } from './service.ts';

export const themesMigration={id:'themes/001-presentation',sql:readFileSync(new URL('../../db/migrations/themes/001-presentation.sql',import.meta.url),'utf8')};
export default defineFeature({
  id:'themes', migrations:[themesMigration],
  register(api,services) {
    api.get('/themes',c=>{
      const {personId,dataMode}=c.get('context'), query=c.get('input').query;
      return c.json(listThemes(c.get('db'),personId,dataMode,query.limit as number|undefined,query.cursor as string|undefined));
    });
    api.get('/themes/:themeId',c=>{
      const theme=getTheme(c.get('db'),c.get('context').personId,c.req.param('themeId'));
      c.header('ETag',`"${theme.version}"`); return c.json({data:theme});
    });
    api.post('/themes',c=>{
      const db=c.get('db'), context=c.get('context'), input=normalizeTheme(c.get('input').body);
      const result=idempotentMutation(db,{context,operation:'POST /api/v1/themes',key:idempotencyKey(c.req.header('Idempotency-Key')),input:{...input,recordIds:[...input.recordIds].sort()}},{
        execute() {
          const theme=createTheme(db,context.personId,input);
          return {status:201,body:{data:theme},headers:{ETag:`"${theme.version}"`,Location:`/api/v1/themes/${encodeURIComponent(theme.id)}`},resource:{type:'theme',id:theme.id}};
        },
        replay(receipt) {
          const theme=getTheme(db,context.personId,receipt.resource!.id);
          return {status:200,body:{data:theme},headers:{ETag:`"${theme.version}"`}};
        },
      });
      for (const [key,value] of Object.entries(result.headers??{})) c.header(key,value);
      return c.body(JSON.stringify(result.body),result.status as ContentfulStatusCode,{'Content-Type':'application/json'});
    });
    api.patch('/themes/:themeId',c=>{
      const theme=services.transaction(c.get('db'),()=>patchTheme(c.get('db'),c.get('context').personId,c.req.param('themeId'),expectedVersion(c.req.header('If-Match')),c.get('input').body));
      c.header('ETag',`"${theme.version}"`);return c.json({data:theme});
    });
    api.delete('/themes/:themeId',c=>{
      services.transaction(c.get('db'),()=>deleteTheme(c.get('db'),c.get('context').personId,c.req.param('themeId'),expectedVersion(c.req.header('If-Match'))));
      return c.body(null,204);
    });
  },
});
