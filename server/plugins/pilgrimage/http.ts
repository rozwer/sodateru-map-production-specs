import { readFileSync } from 'node:fs';
import type { Context } from 'hono';
import type { RequestContext, CoreEnv } from '../../core/context.ts';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { defineFeature } from '../../core/features.ts';
import { CommonError, expectedVersion } from '../../core/errors.ts';
import { idempotentMutation, idempotencyKey, requestHash } from '../../core/idempotency.ts';
import type { DatabaseSync } from 'node:sqlite';
import type { PilgrimageService } from './service.ts';
import type { StoredResult } from '../../core/idempotency.ts';
import type { Selection, SearchInput } from './types.ts';
function endpoint(fn:(c:Context<CoreEnv>)=>Response|Promise<Response>) {
 return async(c:Context<CoreEnv>)=>{try{return await fn(c);}catch(e:any){if(c.get('context')?.signal.aborted)throw new CommonError('CANCELLED','操作を取り消しました。',false,{},409);if(e instanceof CommonError)throw e;if(typeof e?.code==='string')throw new CommonError(e.code,e.message,!!e.retryable,e.details??{},e.status);throw e;}};
}
const needsPreview=Symbol('needsPreview');
export async function requestPreview(db:DatabaseSync,context:RequestContext,service:PilgrimageService,body:Selection,key:string):Promise<StoredResult> {
 const identity={context,operation:'POST /api/v1/plugins/pilgrimage/previews',key,input:body};
 let existing:StoredResult|undefined;
 const replay=(r:StoredResult):StoredResult=>({status:200,body:{data:service.getPreview(context,r.resource!.id)}});
 // Probe through the public CORE transaction wrapper; a new reservation rolls back before I/O.
 try { existing=idempotentMutation(db,identity,{execute(){throw needsPreview;},replay}); }
 catch(error){if(error!==needsPreview)throw error;}
 if(existing)return existing;
 const preview=await service.preview(context,body);
 return idempotentMutation(db,identity,{execute:()=>({status:201,body:{data:preview},resource:{type:'pilgrimage-preview',id:preview.id},expiresAt:preview.expiresAt}),replay});
}
export function pilgrimageFeature(createPilgrimageService:(db:DatabaseSync)=>PilgrimageService, ai:{createConversation:(...args:any[])=>any;startRun:(...args:any[])=>Promise<any>;getRun:(...args:any[])=>Promise<any>}) {
 const {createConversation,startRun,getRun}=ai;
 return defineFeature({
 id:'PILGRIMAGE',migrations:[{id:'pilgrimage/001',sql:readFileSync(new URL('../../db/migrations/pilgrimage/001-pilgrimage.sql',import.meta.url),'utf8')}],
 register(api) {
  // Preserve common provider/plugin/AI fault codes at the HTTP boundary.
  api.get('/plugins/pilgrimage/settings',endpoint(c=>c.json({data:createPilgrimageService(c.get('db')).settings(c.get('context')).setting})));
  api.post('/plugins/pilgrimage/searches',endpoint(async c=>{
   const body=c.get('input').body as SearchInput;
   // Stable user-issued search ID is the durable replay identity for external reads.
   if(idempotencyKey(c.req.header('Idempotency-Key'))!==body.id)throw new CommonError('INVALID_INPUT','検索のIdempotency-Keyには本文idと同じ値を指定してください。');
   return c.json({data:await createPilgrimageService(c.get('db')).search(c.get('context'),body)},201);
  }));
  api.get('/plugins/pilgrimage/searches/:searchId',endpoint(c=>c.json({data:createPilgrimageService(c.get('db')).getSearch(c.get('context'),c.req.param('searchId'))})));
  api.post('/plugins/pilgrimage/previews',endpoint(async c=>{
   const db=c.get('db'),context=c.get('context'),service=createPilgrimageService(db),body=c.get('input').body as Selection;
   const result=await requestPreview(db,context,service,body,idempotencyKey(c.req.header('Idempotency-Key')));
   return c.json(result.body as any,result.status as ContentfulStatusCode);
  }));
  api.get('/plugins/pilgrimage/previews/:previewId',endpoint(c=>c.json({data:createPilgrimageService(c.get('db')).getPreview(c.get('context'),c.req.param('previewId'))})));
  api.post('/plugins/pilgrimage/plans',endpoint(c=>{
   const db=c.get('db'),context=c.get('context'),service=createPilgrimageService(db),body=c.get('input').body as {id:string;previewId:string};
   const result=idempotentMutation(db,{context,operation:'POST /api/v1/plugins/pilgrimage/plans',key:idempotencyKey(c.req.header('Idempotency-Key')),input:body},{execute:()=>({status:201,body:{data:service.savePlan(context,body.id,body.previewId)},resource:{type:'pilgrimage-plan',id:body.id}}),replay:r=>({status:200,body:{data:service.getPlan(context,r.resource!.id)}})});
   const plan=(result.body as any).data;c.header('ETag',`"${plan.version}"`);return c.json(result.body as any,result.status as ContentfulStatusCode);
  }));
  api.get('/plugins/pilgrimage/plans',endpoint(c=>c.json(createPilgrimageService(c.get('db')).listPlans(c.get('context')))));
  api.get('/plugins/pilgrimage/plans/:planId',endpoint(c=>{const data=createPilgrimageService(c.get('db')).getPlan(c.get('context'),c.req.param('planId'));c.header('ETag',`"${data.version}"`);return c.json({data});}));
  api.patch('/plugins/pilgrimage/plans/:planId',endpoint(c=>{const body=c.get('input').body as {previewId:string};const data=createPilgrimageService(c.get('db')).savePlan(c.get('context'),c.req.param('planId'),body.previewId,expectedVersion(c.req.header('If-Match')));c.header('ETag',`"${data.version}"`);return c.json({data});}));
  api.get('/plugins/pilgrimage/overlay',endpoint(c=>c.json({data:createPilgrimageService(c.get('db')).overlay(c.get('context'))})));
  api.post('/plugins/pilgrimage/ai-proposals',endpoint(async c=>{
   const db=c.get('db'),context=c.get('context'),body=c.get('input').body as any;
   const key=idempotencyKey(c.req.header('Idempotency-Key')),suffix=requestHash([context.personId,context.dataMode,key]).slice(0,48);
   const conversationId=`pilgrim-c-${suffix}`,userMessageId=`pilgrim-u-${suffix}`,assistantMessageId=`pilgrim-a-${suffix}`;
   createConversation(db,context,{id:conversationId,purpose:'consult',title:'聖地巡りの順序案',recordId:null});
   const run=await startRun(db,context,{conversationId,userMessageId,assistantMessageId,text:body.text,task:'pilgrimage',input:{searchId:body.searchId,relationIds:body.relationIds,settingsVersion:body.settingsVersion},expectedRefs:[]});
   return c.json({data:run},202);
  }));
  api.get('/plugins/pilgrimage/ai-proposals/:runId',endpoint(async c=>{const run=await getRun(c.get('db'),c.get('context'),c.req.param('runId'));if(run.task!=='pilgrimage')throw new CommonError('NOT_FOUND','聖地巡りのAI案がありません。');return c.json({data:run});}));
 }
});
}
