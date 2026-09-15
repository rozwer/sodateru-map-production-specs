import {readFileSync} from 'node:fs';
import {defineFeature} from '../../core/features.ts';
import {CommonError,expectedVersion,errorResponse} from '../../core/errors.ts';
import {idempotentMutation} from '../../core/idempotency.ts';
import {SuggestionsRepository} from './repository.mjs';
import {generateBatch} from './service.mjs';

export function commonError(error) {
  if(error instanceof CommonError)return error;
  if(error?.name==='AbortError')return new CommonError('CANCELLED','操作が取り消されました。',false,{},409);
  if(error?.code && /^[A-Z_]+$/.test(error.code) && !error.code.startsWith('SQLITE') && !error.code.startsWith('ERR_'))return new CommonError(error.code,error.message,false,error.details??{},error.status);
  return new CommonError('INTERNAL_ERROR','提案処理に失敗しました。',false,{},500);
}
const wrap=fn=>async c=>{try{return await fn(c);}catch(error){throw commonError(error);}};
const response=(c,data,status=200)=>{if(data?.version)c.header('ETag',`"${data.version}"`);return c.json({data},status);};
const migration=name=>({id:`suggestions/${name}`,sql:readFileSync(new URL(`../../db/migrations/suggestions/${name}.sql`,import.meta.url),'utf8')});
async function shared(db,context) {
  const {readDependencies}=await import('./adapters.mjs');
  return readDependencies(db,context);
}

export default defineFeature({
  id:'suggestions',migrations:[migration('001-suggestions'),migration('002-batch-runs'),migration('003-detail-view')],
  register(api,services) {
    // Executions from a previous server process are never blindly retried.
    for(const mode of ['live','demo']) {
      const db=services.databases[mode];
      for(const row of db.prepare("SELECT DISTINCT person_id FROM suggestion_batch_runs WHERE status='running'").all())new SuggestionsRepository(db,row.person_id,services.transaction,mode).interruptPending(Date.now());
    }
    const store=c=>new SuggestionsRepository(c.get('db'),c.get('context').personId,services.transaction,c.get('context').dataMode);
    api.get('/self-checkins',wrap(c=>c.json(store(c).listCheckins(c.get('input').query))));
    api.get('/self-checkins/:checkinId',wrap(c=>response(c,store(c).getCheckin(c.req.param('checkinId')))));
    api.post('/self-checkins',wrap(c=>{
      const db=c.get('db'),context=c.get('context'),input=c.get('input').body,repo=store(c);
      const result=idempotentMutation(db,{context,operation:'POST /api/v1/self-checkins',key:c.req.header('Idempotency-Key'),input},{
        execute:()=>({status:201,body:{data:repo.createCheckin(input,Date.now())},resource:{type:'self-checkin',id:input.id}}),
        replay:result=>({status:200,body:{data:repo.getCheckin(result.resource.id)}}),
      });
      c.header('Location',`/api/v1/self-checkins/${encodeURIComponent(result.body.data.id)}`);
      return response(c,result.body.data,result.status);
    }));
    api.patch('/self-checkins/:checkinId',wrap(c=>response(c,store(c).patchCheckin(c.req.param('checkinId'),c.get('input').body,expectedVersion(c.req.header('If-Match')),Date.now()))));
    api.delete('/self-checkins/:checkinId',wrap(c=>{
      store(c).deleteCheckin(c.req.param('checkinId'),expectedVersion(c.req.header('If-Match')));return c.body(null,204);
    }));
    api.post('/suggestion-batches',wrap(async c=>{
      const db=c.get('db'),context=c.get('context'),input=c.get('input').body,repo=store(c);
      let started=false;
      idempotentMutation(db,{context,operation:'POST /api/v1/suggestion-batches',key:c.req.header('Idempotency-Key'),input},{
        execute:()=>{repo.reserveBatch(input,Date.now());started=true;return {status:202,resource:{type:'suggestion-batch-run',id:input.id}};},
        replay:result=>({status:200,resource:result.resource}),
      });
      if(!started) {
        const batch=repo.getBatch(input.id),read=await shared(db,context);
        for(const item of batch.items)read.assertReadable(item);
        return response(c,{...batch,items:batch.items.filter(item=>read.allowed(item))},200);
      }
      try {
        const {generationDependencies}=await import('./adapters.mjs');
        const deps=await generationDependencies(db,context,repo,services.transaction);
        const batch=await generateBatch(context,input,deps);
        c.header('Location',`/api/v1/suggestions?batchId=${encodeURIComponent(batch.id)}`);
        return response(c,batch,201);
      }catch(error) {
        const safe=commonError(error);
        repo.failBatch(input.id,{code:safe.code,message:safe.message,status:errorResponse(safe,context.requestId).status},Date.now());throw safe;
      }
    }));
    api.get('/suggestions',wrap(async c=>{
      const repo=store(c),query=c.get('input').query;
      const batch=query.batchId?repo.getBatch(query.batchId):null;
      const page=repo.listSuggestions(query),read=await shared(c.get('db'),c.get('context'));
      const items=[];
      for(const item of page.items) {
        if(!['selected','completed','not_done','dismissed'].includes(query.status)&&!read.allowed(item))continue;
        read.assertReadable(item);items.push({...item,sourceState:'current'});
      }
      return c.json({...page,items,...(batch?{emptyReason:batch.emptyReason,expiresAt:batch.expiresAt,conditions:batch.conditions}:{})});
    }));
    api.get('/suggestions/:suggestionId',wrap(async c=>{
      const item=store(c).getSuggestion(c.req.param('suggestionId'));
      const read=await shared(c.get('db'),c.get('context'));read.assertReadable(item);
      if(['offered','later'].includes(item.status)&&!read.allowed(item))throw new CommonError('INPUT_CHANGED','この候補は設定で停止されています。');
      return response(c,{...item,sourceState:'current'});
    }));
    api.patch('/suggestions/:suggestionId',wrap(async c=>{
      const db=c.get('db'),context=c.get('context'),repo=store(c),patch=c.get('input').body,id=c.req.param('suggestionId');
      const read=await shared(db,context);
      const prior=repo.getSuggestion(id);
      const visitReader=(patch.status??prior.status)==='completed'?await read.visitReader():null;
      const routeReader=patch.routeId?await read.routeReader():null;
      const data=services.transaction(db,()=>{
        const old=repo.getSuggestion(id);
        const cancellation=old.status==='completed'&&patch.status==='selected';
        read.assertReadable(old);
        if((patch.presented||patch.viewed||(['selected','completed'].includes(patch.status)&&!cancellation))&&!read.allowed(old))throw new CommonError('INPUT_CHANGED','この候補は設定で停止されています。');
        const visitId=patch.completedVisitId??old.completedVisitId;
        const visit=visitId&&visitReader?visitReader(visitId):null;
        if(routeReader) {
          const route=routeReader(patch.routeId);
          if(route.personId!==context.personId||!route.waypoints.some(point=>point.placeId===old.placeId))throw new CommonError('VALIDATION_FAILED','提案先と本人が一致する保存ルートを指定してください。');
        }
        return repo.patchSuggestion(id,patch,expectedVersion(c.req.header('If-Match')),Date.now(),visit);
      });
      return response(c,data);
    }));
  },
});
