import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { serve } from '@hono/node-server';
import type { Server } from 'node:http';
import { createApp } from '../../app/app.ts';
import { openDatabases } from '../../db/connection.ts';
import { transaction } from '../../db/migrate.ts';
import { seedProfiles } from '../../core/session.ts';
import type { LocalIdentity } from '../../core/session.ts';
import { loadContract } from '../../core/validation.ts';
import { createInformationService } from '../../information/service.ts';
import { createRecord, patchRecord } from '../records/service.ts';
import insightsFeature from '../insights/register.ts';
import recordsFeature from '../records/register.ts';
import { createInsightsService } from '../insights/service.ts';
import { configureAi, createConversation, startRun, getRun } from '../../ai/index.ts';
import reflection from './register.ts';
import { memoInput } from './service.ts';

// The only substitute is the explicitly named AI provider below; SQL, ownership,
// SourceRefs, HTTP validation, receipts and all feature persistence are production code.
test('real HTTP/SQLite reflection answers, adoption replay, corrections and revoked evidence', async () => {
 const root=mkdtempSync(join(tmpdir(),'reflection-http-'));
 const identity:LocalIdentity={version:1,secret:'test-only-reflection-identity-secret',profiles:[{key:'self',id:'p',name:'本人'},{key:'friend',id:'f',name:'友達'}]};
 const options={livePath:join(root,'live.sqlite'),demoPath:join(root,'demo.sqlite'),migrations:[...(recordsFeature.migrations??[]),...(insightsFeature.migrations??[]),...(reflection.migrations??[])]};
 let dbs=openDatabases(options);
 seedProfiles(dbs,identity.profiles);
 const context={personId:'p',dataMode:'live' as const,requestId:randomUUID(),signal:new AbortController().signal};
 const contract=loadContract();
 // Test-local composition until CORE regenerates the shared client/contract.
 for(const name of ['REFLECTION','INSIGHTS']) {
  const file=new URL('../../../docs/01_requirements/04_api/fragments/'+name+'.json',import.meta.url);
  const fragment=JSON.parse(readFileSync(file,'utf8'));
  contract.components.schemas={...(contract.components.schemas as object),...fragment.schemas};
  for(const {method,path,...operation} of fragment.operations) {
   contract.paths[path]??={};contract.paths[path]![method.toLowerCase()]=operation;
  }
 }
 let server:Server,origin='';
 async function boot() {
  const app=createApp({databases:dbs,identity,features:[insightsFeature,reflection],contract});
  await new Promise<void>(resolve=>{server=serve({fetch:app.fetch,hostname:'127.0.0.1',port:0},address=>{origin='http://127.0.0.1:'+address.port;resolve();}) as Server;});
 }
 async function stop(){await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));dbs.close();}
 const cookies:Record<string,string>={};
 async function request(method:string,path:string,body?:unknown,headers:Record<string,string>={},mode='live',person='self') {
  const response=await fetch(origin+'/api/v1'+path,{method,headers:{'X-Request-Id':randomUUID(),'X-Data-Mode':mode,...(body===undefined?{}:{'Content-Type':'application/json'}),...(cookies[mode+person]?{Cookie:cookies[mode+person]}:{}),...headers},body:body===undefined?undefined:JSON.stringify(body)});
  const value=response.status===204?null:await response.json();
  return {status:response.status,value};
 }
 async function login(mode='live',person='self') {
   const response=await fetch(origin+'/api/v1/session',{method:'POST',headers:{'X-Request-Id':randomUUID(),'X-Data-Mode':mode,'Idempotency-Key':randomUUID(),'Content-Type':'application/json'},body:JSON.stringify({profileKey:person})});
   assert.equal(response.status,201);cookies[mode+person]=response.headers.get('set-cookie')!.split(';')[0]!;
 }
 let providerFails=false;
 configureAi({
  model:()=> 'explicit-test-provider',
  assertAllowed:()=>{},
  assertConversationRecord:(db,ctx,id)=>{createInformationService(db).getOwnRecord(ctx,id);},
  assertSourceRefs:(db,ctx,refs)=>{createInformationService(db).assertSourcesCurrent(ctx,{refs});},
  provider:async({task})=>{
   if(task==='diary')return {text:'水の音を聞いて休憩した日。',evidenceIds:['src_1']};
   if(providerFails)throw new Error('explicit test provider failure');
   return {purpose:'休憩',reason:'静かだった',context:{weather:null,companion:null,timeBudgetMinutes:null,timeBand:null,notes:null},evidenceIds:['src_1'],question:{topic:'reason',text:'どんな静けさがよかったですか？'}};
  }
 });
 async function run(id:string,task='extract',input:any={recordId:'record',answers:[]},version=1) {
   await startRun(dbs.live,context,{conversationId:'conversation',userMessageId:id+'-user',assistantMessageId:id,text:'体験を整理したい',task,input,expectedRefs:[{type:'record',id:'record',version}]});
   const deadline=Date.now()+3000;
   while(Date.now()<deadline){const state=await getRun(dbs.live,context,id);if(['complete','failed'].includes(state.status))return state;await new Promise(r=>setTimeout(r,10));}
   throw Error('AI test provider did not settle');
 }
 try {
  await boot();await login();await login('demo');await login('live','friend');
  transaction(dbs.live,()=>{
   createRecord(dbs.live,'p',{...memoInput('record','本人の原文','memo',Date.parse('2026-09-15T01:00:00Z')),kind:'experience'} as any);
   createRecord(dbs.live,'f',{...memoInput('friend-record','友達の共有原文'),kind:'experience',visibility:'public'} as any);
  });
  createConversation(dbs.live,context,{id:'conversation',purpose:'consult',title:'整理',recordId:'record'});
  const completed=await run('extract-one');assert.equal(completed.status,'complete');
  const question=await request('POST','/reflection/questions',{assistantMessageId:completed.id},{'Idempotency-Key':'question'});
  assert.equal(question.status,200,JSON.stringify(question.value));
  const qid=question.value.data.id;
  assert.equal((await request('PATCH','/reflection/questions/'+qid,{status:'later'})).status,428);
  assert.equal((await request('PATCH','/reflection/questions/'+qid,{status:'later'},{'If-Match':'"1"'})).status,200);
  const answer=await request('PATCH','/reflection/questions/'+qid,{status:'answered',answerText:'水の音が聞こえたから'},{'If-Match':'"2"'});
  assert.equal(answer.status,200,JSON.stringify(answer.value));
  assert.equal(answer.value.data.answerVersion,1);
  const answerId=answer.value.data.answerRecordId;
  providerFails=true;assert.equal((await run('failed-ai')).status,'failed');
  assert.equal((await request('GET','/reflection/questions/'+qid)).value.data.answerText,'水の音が聞こえたから');
  const corrected=await request('PATCH','/reflection/questions/'+qid,{status:'answered',answerText:'木々と水の音だった',answerVersion:1},{'If-Match':'"3"'});
  assert.equal(corrected.status,200,JSON.stringify(corrected.value));assert.equal(corrected.value.data.answerRecordId,answerId);
  assert.equal(corrected.value.data.answerVersion,2);
  assert.equal((await request('PATCH','/reflection/questions/'+qid,{status:'answered',answerText:'古い訂正',answerVersion:1},{'If-Match':'"4"'})).status,412);
  assert.equal((await request('GET','/reflection/questions/'+qid,undefined,{},'demo')).status,404);
  assert.equal((await request('GET','/reflection/questions/'+qid,undefined,{},'live','friend')).status,404);

  const adoptedInput={assistantMessageId:completed.id,expectedAttempt:completed.attempt,recordId:'record',fields:['purpose']};
  const adopted=await request('POST','/reflection/adoptions',adoptedInput,{'Idempotency-Key':'adopt','If-Match':'"1"'});
  assert.equal(adopted.status,200,JSON.stringify(adopted.value));
  assert.equal(adopted.value.data.body,'本人の原文');assert.deepEqual(adopted.value.data.purposes,['休憩']);
  const replay=await request('POST','/reflection/adoptions',adoptedInput,{'Idempotency-Key':'adopt','If-Match':'"1"'});
  assert.equal(replay.status,200,JSON.stringify(replay.value));assert.equal(replay.value.data.version,2);
  const sameContent=await request('POST','/reflection/adoptions',adoptedInput,{'Idempotency-Key':'adopt-again','If-Match':'"1"'});
  assert.equal(sameContent.status,200);assert.equal(sameContent.value.data.version,2);
  const changedQuestion=await request('GET','/reflection/questions/'+qid);
  assert.equal(changedQuestion.value.data.questionText,null);assert.equal(changedQuestion.value.data.evidenceState,'changed');
  assert.equal(changedQuestion.value.data.answerText,'木々と水の音だった');

  providerFails=false;
  const diary=await run('diary-one','diary',{date:'2026-09-15',timezone:'Asia/Tokyo',recordIds:['record']},2);
  assert.equal(diary.status,'complete',JSON.stringify(diary.error));
  // New diary adoption has no destination version; required question/PATCH headers remain checked above.
  const diarySaved=await request('POST','/reflection/adoptions',{assistantMessageId:diary.id,expectedAttempt:diary.attempt,recordId:'diary',create:true,occurredAt:Date.parse('2026-09-15T01:00:00Z'),body:diary.result.text},{'Idempotency-Key':'diary'});
  assert.equal(diarySaved.status,200,JSON.stringify(diarySaved.value));
  assert.equal(diarySaved.value.data.body,diary.result.text);
  transaction(dbs.live,()=>patchRecord(dbs.live,'p','diary',{body:'生成後に本人が直した日記'},1));
  const oldDiary=await request('POST','/reflection/adoptions',{assistantMessageId:diary.id,expectedAttempt:diary.attempt,recordId:'diary',body:'古い下書き'},{'Idempotency-Key':'old-diary','If-Match':'"1"'});
  assert.equal(oldDiary.status,412,JSON.stringify(oldDiary.value));
  assert.equal(createInformationService(dbs.live).getOwnRecord(context,'diary').body,'生成後に本人が直した日記');

  const comparisonInput={id:'manual',left:{type:'record',id:'record',version:2},right:{type:'record',id:'friend-record',version:1},common:'休憩した',differences:'場所が違う',timeZone:'Asia/Tokyo'};
  const comparison=await request('POST','/reflection/comparisons',comparisonInput,{'Idempotency-Key':'manual'});
  assert.equal(comparison.status,201,JSON.stringify(comparison.value));
  const info=createInformationService(dbs.live);
  const insights=createInsightsService(dbs.live,{checkSources:(ctx:any,input:any)=>info.checkSources(ctx,input)});
  const insight=insights.get(context,comparison.value.data.insightId);
  insights.review(context,insight.id,insight.version,{review:'disagree',reviewNote:'好みが同じとは思わない'});
  const judgment=await request('GET','/reflection/comparisons/manual');
  assert.equal(judgment.value.data.insight.review,'disagree');
  await stop();dbs=openDatabases(options);seedProfiles(dbs,identity.profiles);await boot();
  assert.equal((await request('GET','/reflection/questions/'+qid)).value.data.answerText,'木々と水の音だった');
  assert.equal(createInformationService(dbs.live).getOwnRecord(context,'diary').body,'生成後に本人が直した日記');
  assert.equal((await request('GET','/reflection/comparisons/manual')).value.data.insight.reviewNote,'好みが同じとは思わない');
  transaction(dbs.live,()=>patchRecord(dbs.live,'f','friend-record',{body:'訂正された原文'},1));
  const stale=await request('GET','/reflection/comparisons/manual');
  assert.equal(stale.status,200);assert.equal(stale.value.data.insight,null);assert.equal(stale.value.data.evidenceState,'changed');assert.equal(stale.value.data.common,'休憩した');
  transaction(dbs.live,()=>patchRecord(dbs.live,'f','friend-record',{visibility:'private',sharedWith:[]},2));
  assert.equal((await request('GET','/reflection/comparisons/manual')).status,404);
  transaction(dbs.live,()=>dbs.live.prepare("DELETE FROM records WHERE id='record'").run());
  const unavailableQuestion=await request('GET','/reflection/questions/'+qid);
  assert.equal(unavailableQuestion.value.data.evidenceState,'unavailable');assert.equal(unavailableQuestion.value.data.questionText,null);
  assert.equal(unavailableQuestion.value.data.answerText,'木々と水の音だった');
 } finally {await stop();rmSync(root,{recursive:true,force:true});}
});
