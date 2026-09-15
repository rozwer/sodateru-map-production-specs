import { readFileSync } from 'node:fs';
import { defineFeature } from '../../core/features.ts';
import { CommonError, expectedVersion } from '../../core/errors.ts';
import { idempotentMutation, type StoredResult } from '../../core/idempotency.ts';
import { registerPlugin, getPluginState } from '../../features/plugins/index.ts';
import { disasterRelease } from './release.ts';
import { DisasterService } from './service.ts';
import { DisasterStore } from './store.ts';

registerPlugin(disasterRelease);
const preparationRequired=Symbol('disaster external read required');
export default defineFeature({
  id:'DISASTER',
  migrations:[{id:'disaster-001',sql:readFileSync(new URL('../../db/migrations/disaster/001-cache.sql',import.meta.url),'utf8')}],
  register(api){
    api.get('/disaster',c=>c.json({data:new DisasterService(new DisasterStore(c.get('db'),c.get('context')),getPluginState).read()}));
    api.post('/disaster/refresh',async c=>{
      const db=c.get('db'),context=c.get('context');
      const service=new DisasterService(new DisasterStore(db,context),getPluginState);
      const version=expectedVersion(c.req.header('If-Match'));
      const body=c.get('input').body;
      if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).length)throw new CommonError('VALIDATION_FAILED','更新の本文は空のJSON objectです。設定はプラグイン設定で変更してください。');
      const identity={context,operation:'POST /api/v1/disaster/refresh',key:c.req.header('Idempotency-Key')!,input:{body,version}};
      const read=():StoredResult=>({status:200,body:{data:service.read()},resource:{type:'disaster-cache',id:context.personId}});
      const mutate=(execute:()=>StoredResult)=>idempotentMutation(db,identity,{execute,replay:()=>read()});
      // Same pending-free preparation boundary as PLUGINS: CORE validates completed
      // replay/hash first; a new-operation sentinel rolls back the reservation.
      // Provider work consists only of public GETs, with no external side effect.
      try { const replay=mutate(()=>{throw preparationRequired;});return c.json(replay.body); }
      catch(error){if(error!==preparationRequired)throw error;}
      const prepared=await service.prepareRefresh(version);
      if(prepared.failed){
        // Persist diagnostic failure/old snapshot without marking the POST successful.
        prepared.commit();
        throw new CommonError('UPSTREAM_FAILED','防災情報を取得できませんでした。保存済み結果と失敗理由を再取得してください。',true,{statePath:'/api/v1/disaster'});
      }
      const result=mutate(()=>{prepared.commit();return read();});
      return c.json(result.body);
    });
  },
});
