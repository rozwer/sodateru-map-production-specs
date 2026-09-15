import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { openDatabases } from '../db/connection.ts';
import { createApp } from '../app/app.ts';
import { loadLocalIdentity, seedProfiles } from '../core/session.ts';
import type { RequestContext } from '../core/context.ts';
import information from '../information/register.ts';
import { createInformationService } from '../information/service.ts';
import settingsFeature from '../features/settings/register.ts';
import { readSettings, patchSettings } from '../features/settings/service.ts';
import conversations from '../features/conversations/register.ts';
import { registerAiTask, configureAi, createConversation, startRun, retryRun, getRun } from './index.ts';
import type { RunRequest } from './types.ts';

registerAiTask({
 task:'permission-integration',promptVersion:'permission-fixture-v1',
 inputSchema:{type:'object',properties:{recordId:{type:'string'}},required:['recordId'],additionalProperties:false},
 outputSchema:{type:'object',properties:{answer:{type:'string'}},required:['answer'],additionalProperties:false},
 readMaterials(db,ctx,input){
  const record=createInformationService(db).getRecord(ctx,input.recordId);
  return {context:{recordId:record.id},evidence:[{id:'source-1',role:'record',text:record.body,sourceRef:record.sourceRefs[0]!}],sourceRefs:record.sourceRefs};
 },
 buildPrompt:()=> 'Controlled provider test: permission and reference boundaries.',
 validateResult:()=>{},toBody:(value:any)=>value.answer
});
const flush=()=>new Promise<void>(resolve=>setImmediate(resolve));

test('real INFORMATION and SETTINGS enforce source changes, current sharing and permission withdrawal',async t=>{
 const directory=await mkdtemp(join(tmpdir(),'ai-real-permissions-'));
 const options={livePath:join(directory,'live.sqlite'),demoPath:join(directory,'demo.sqlite'),migrations:settingsFeature.migrations};
 let databases=openDatabases(options);
 const identity=loadLocalIdentity(join(directory,'profiles.json'));
 identity.profiles.push({key:'reader',id:randomUUID(),name:'Synthetic reader'});
 seedProfiles(databases,identity.profiles);
 const owner=identity.profiles[0]!.id, reader=identity.profiles[1]!.id;
 const ctx:RequestContext={personId:reader,dataMode:'live',requestId:randomUUID(),signal:new AbortController().signal};
 let app=createApp({databases,identity,features:[information,settingsFeature,conversations]});
 let calls=0;
 const pending:Array<(value:{answer:string})=>void>=[];
 configureAi({model:()=> 'gpt-5.6-luna',provider:async()=>{calls++;return new Promise(resolve=>pending.push(resolve));}});
 const session=await app.request('/api/v1/session',{method:'POST',headers:{'Content-Type':'application/json','X-Data-Mode':'live','X-Request-Id':randomUUID(),'Idempotency-Key':randomUUID()},body:JSON.stringify({profileKey:'reader'})});
 assert.equal(session.status,201);
 const cookie=session.headers.get('set-cookie')!.split(';')[0]!;
 async function http(path:string){
  const response=await app.request('/api/v1'+path,{headers:{Cookie:cookie,'X-Data-Mode':'live','X-Request-Id':randomUUID()}});
  return {status:response.status,body:await response.json() as any};
 }
 function permission(patch:Partial<ReturnType<typeof readSettings>['ai']>){
  const saved=readSettings(databases.live,reader);
  patchSettings(databases.live,reader,saved.version,{ai:{...saved.ai,...patch}});
 }
 function seedRecord(id:string){
  databases.live.prepare(`INSERT INTO records(id,person_id,kind,visit_id,place_id,occurred_at,ended_at,time_precision,body,purposes_json,activities_json,impression,period_answers_json,bookmarked,use_for_suggestions,topic_key,visibility,shared_with_json,version,created_at,updated_at)
   VALUES(?,?,'experience',NULL,NULL,1000,NULL,'exact','Synthetic shared source','[]','[]','','{}',0,1,NULL,'selected',?,1,1000,1000)`).run(id,owner,JSON.stringify([reader]));
 }
 function request(id:string):RunRequest{
  seedRecord(id);const refs=createInformationService(databases.live).getRecord(ctx,id).sourceRefs;
  createConversation(databases.live,ctx,{id:'c-'+id,purpose:'consult',title:'Permission integration',recordId:null});
  return {conversationId:'c-'+id,userMessageId:'u-'+id,assistantMessageId:'a-'+id,text:'Keep this original input',task:'permission-integration',input:{recordId:id},expectedRefs:refs};
 }
 function row(id:string){return databases.live.prepare('SELECT * FROM messages WHERE id=?').get(id) as any;}
 function updateSource(id:string,kind:'version'|'revoke'){
  if(kind==='version')databases.live.prepare("UPDATE records SET body='Corrected source',version=version+1 WHERE id=?").run(id);
  else databases.live.prepare("UPDATE records SET visibility='private',shared_with_json='[]',version=version+1 WHERE id=?").run(id);
 }
 async function rejectedRead(req:RunRequest,code:string){
  await assert.rejects(getRun(databases.live,ctx,req.assistantMessageId),(e:any)=>e.code===code);
  const read=await http('/messages/'+req.assistantMessageId);assert.equal(read.body.error.code,code);assert.equal(read.body.data,undefined);
  assert.equal(row(req.userMessageId).body,req.text);
 }
 try{
  permission({enabled:true,allowRecords:true});
  await t.test('changed expected version rejects before creating messages or sending',async()=>{
   const req=request('before-start');updateSource('before-start','version');const before=calls;
   await assert.rejects(startRun(databases.live,ctx,req),(e:any)=>e.code==='SOURCE_CHANGED');
   assert.equal(row(req.assistantMessageId),undefined);assert.equal(calls,before);
  });
  await t.test('sharing revoked after acceptance prevents external dispatch',async()=>{
   const req=request('before-dispatch'),before=calls;
   await startRun(databases.live,ctx,req);updateSource('before-dispatch','revoke');await flush();
   assert.equal(calls,before);assert.equal(row(req.assistantMessageId).error_code,'NOT_FOUND');assert.equal(row(req.assistantMessageId).result_json,null);
   await rejectedRead(req,'NOT_FOUND');
  });
  for(const kind of ['version','revoke'] as const)await t.test(kind+' changed while provider is pending blocks completion and retry',async()=>{
   const req=request('during-'+kind);await startRun(databases.live,ctx,req);await flush();
   assert.equal(row(req.assistantMessageId).status,'running');
   updateSource('during-'+kind,kind);pending.shift()!({answer:'Must never be returned'});await flush();
   const current=row(req.assistantMessageId),code=kind==='version'?'SOURCE_CHANGED':'NOT_FOUND';
   assert.equal(current.status,'failed');assert.equal(current.error_code,code);assert.equal(current.result_json,null);assert.equal(current.body,'');
   const before=calls;
   await assert.rejects(retryRun(databases.live,ctx,req.assistantMessageId,{expectedAttempt:current.attempt,expectedVersion:current.version}),(e:any)=>e.code===code);
   assert.equal(row(req.assistantMessageId).attempt,1);assert.equal(calls,before);
   await rejectedRead(req,code);
  });
  await t.test('completed output disappears from reads, search and replay after sharing withdrawal and restart',async()=>{
   const req=request('after-complete');await startRun(databases.live,ctx,req);await flush();
   pending.shift()!({answer:'Secretneedle should disappear'});await flush();
   assert.equal((await http('/messages/'+req.assistantMessageId)).body.data.output.value.answer,'Secretneedle should disappear');
   updateSource('after-complete','revoke');
   await rejectedRead(req,'NOT_FOUND');
   assert.equal((await http('/conversations/'+req.conversationId+'/messages')).body.error.code,'NOT_FOUND');
   assert.deepEqual((await http('/conversations?q=Secretneedle')).body.items,[]);
   await assert.rejects(startRun(databases.live,ctx,req),(e:any)=>e.code==='NOT_FOUND');
   databases.close();databases=openDatabases(options);seedProfiles(databases,identity.profiles);
   app=createApp({databases,identity,features:[information,settingsFeature,conversations]});
   await rejectedRead(req,'NOT_FOUND');
  });
  await t.test('latest enabled and records scope block queued attempts; explicit restored permission permits same-input retry',async()=>{
   const req=request('permission');const before=calls;
   await startRun(databases.live,ctx,req);permission({enabled:false});await flush();
   let current=row(req.assistantMessageId);assert.equal(current.status,'failed');assert.equal(current.error_code,'FORBIDDEN');assert.equal(calls,before);
   permission({enabled:true,allowRecords:false});
   await retryRun(databases.live,ctx,req.assistantMessageId,{expectedAttempt:current.attempt,expectedVersion:current.version});await flush();
   current=row(req.assistantMessageId);assert.equal(current.status,'failed');assert.equal(current.error_code,'FORBIDDEN');assert.equal(calls,before);
   permission({allowRecords:true});
   await retryRun(databases.live,ctx,req.assistantMessageId,{expectedAttempt:current.attempt,expectedVersion:current.version});await flush();
   assert.equal(calls,before+1);pending.shift()!({answer:'Explicitly permitted result'});await flush();
   const restored=await getRun(databases.live,ctx,req.assistantMessageId);
   assert.equal(restored.status,'complete');assert.equal(restored.attempt,3);assert.equal(restored.model,'gpt-5.6-luna');
   assert.equal(row(req.userMessageId).body,req.text);assert.deepEqual(JSON.parse(row(req.assistantMessageId).request_json).input,req.input);
  });
 }finally{databases.close();await rm(directory,{recursive:true,force:true});}
});
