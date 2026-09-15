import { readFileSync } from 'node:fs';
import type { Context, Handler } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { defineFeature } from '../../core/features.ts';
import type { CoreEnv } from '../../core/context.ts';
import { CommonError, expectedVersion } from '../../core/errors.ts';
import { idempotentMutation, type StoredResult } from '../../core/idempotency.ts';
import { PluginService, type InstallInput, type PatchInput } from './service.ts';
import { PluginStore } from './store.ts';
import { PluginError, type PluginSetting, type Settings } from './types.ts';
import { pluginSettingPage } from './pagination.ts';

const featureHandler=(run:(c:Context<CoreEnv>)=>Response|Promise<Response>):Handler<CoreEnv>=>async c=>{
  try {return await run(c);}
  catch(e) {if(e instanceof PluginError) throw new CommonError(e.code,e.message,false,(e.details ?? {}) as Record<string,unknown>,e.status);throw e;}
};
const service=(c:Context<CoreEnv>)=>new PluginService(new PluginStore(c.get('db'),c.get('context')));
const response=(c:Context<CoreEnv>,result:StoredResult)=>c.body(JSON.stringify(result.body),result.status as ContentfulStatusCode,{'Content-Type':'application/json',...result.headers});
const stored=(item:PluginSetting,status=200):StoredResult=>({status,body:{data:item},headers:{ETag:`"${item.version}"`},resource:{type:'plugin-setting',id:item.id}});
const mutation=(c:Context<CoreEnv>,input:unknown,execute:()=>StoredResult)=>idempotentMutation(c.get('db'),{
  context:c.get('context'),operation:`POST ${c.req.path}`,key:c.req.header('Idempotency-Key')!,input,
},{execute,replay:result=>result.resource ? stored(service(c).store.get(result.resource.id)) : result});

export default defineFeature({
  id:'PLUGINS',
  migrations:[{id:'plugins-001',sql:readFileSync(new URL('../../db/migrations/plugins/001-plugins.sql',import.meta.url),'utf8')}],
  register(api) {
    api.get('/plugins',featureHandler(c=>c.json(service(c).catalog())));
    api.get('/plugin-state',featureHandler(c=>c.json({data:service(c).state()})));
    api.get('/plugin-settings',featureHandler(c=>c.json(pluginSettingPage(service(c).store.list(),c.get('context'),c.get('input').query as {cursor?:string;limit?:number}))));
    api.get('/plugin-settings/:pluginId',featureHandler(c=>{
      const item=service(c).store.get(c.req.param('pluginId'));c.header('ETag',`"${item.version}"`);return c.json({data:item});
    }));
    api.get('/plugins/:pluginId/versions',featureHandler(c=>c.json({items:service(c).registry.versions(c.req.param('pluginId'))})));
    api.post('/plugins/:pluginId/trial',featureHandler(c=>{
      const body=c.get('input').body as {pluginVersion:string;settings?:Settings;icon?:string};
      return response(c,mutation(c,body,()=>({status:200,body:{data:service(c).trial(c.req.param('pluginId'),body.pluginVersion,body.settings,body.icon)},expiresAt:Date.now()+15*60*1000})));
    }));
    api.post('/plugin-settings',featureHandler(async c=>{
      const body=c.get('input').body as InstallInput, plugins=service(c);
      // prepare performs no persistent writes; CORE wraps only the final synchronous commit.
      const prepared=await plugins.prepareInstall(body);
      const result=mutation(c,body,()=>stored(plugins.installPrepared(body,prepared),201));
      if(result.status===201)c.header('Location',`/api/v1/plugin-settings/${encodeURIComponent(body.id)}`);
      return response(c,result);
    }));
    api.patch('/plugin-settings/:pluginId',featureHandler(c=>{
      const item=service(c).patch(c.req.param('pluginId'),expectedVersion(c.req.header('If-Match')),c.get('input').body as PatchInput);
      return response(c,stored(item));
    }));
    api.delete('/plugin-settings/:pluginId',featureHandler(c=>{
      service(c).remove(c.req.param('pluginId'),expectedVersion(c.req.header('If-Match')));return c.body(null,204);
    }));
    api.post('/plugin-settings/:pluginId/update',featureHandler(async c=>{
      const body=c.get('input').body as Parameters<PluginService['update']>[2], plugins=service(c), id=c.req.param('pluginId');
      const version=expectedVersion(c.req.header('If-Match')), prepared=await plugins.prepareUpdate(id,body);
      return response(c,mutation(c,{body,version},()=>stored(plugins.updatePrepared(id,version,body,prepared))));
    }));
    api.post('/plugin-settings/:pluginId/rollback',featureHandler(c=>{
      const body=c.get('input').body as Parameters<PluginService['rollback']>[2], version=expectedVersion(c.req.header('If-Match'));
      return response(c,mutation(c,{body,version},()=>stored(service(c).rollback(c.req.param('pluginId'),version,body))));
    }));
  },
});
