import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { registerAiTask, configureAi, createConversation, startRun, getRun, cancelRun, retryRun, recoverInterruptedRuns, readAppliedRefs, appendAppliedRef } from './index.ts';
const ctx={personId:'p1',dataMode:'live' as const,requestId:'req',signal:new AbortController().signal};
function db() {
 const d=new DatabaseSync(':memory:');
 d.exec(`CREATE TABLE conversations(id TEXT PRIMARY KEY,person_id TEXT,purpose TEXT,title TEXT,record_id TEXT,version INTEGER,created_at INTEGER,updated_at INTEGER);
 CREATE TABLE messages(id TEXT PRIMARY KEY,conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE,position INTEGER,role TEXT,body TEXT,status TEXT,attempt INTEGER,model TEXT,error_code TEXT,insight_id TEXT,source_refs_json TEXT,version INTEGER,created_at INTEGER,updated_at INTEGER,task TEXT,request_hash TEXT,request_json TEXT,result_json TEXT,applied_refs_json TEXT DEFAULT '[]');
 CREATE UNIQUE INDEX active ON messages(conversation_id) WHERE role='assistant' AND status IN ('pending','running');
 CREATE UNIQUE INDEX pos ON messages(conversation_id,position);`);
 createConversation(d,ctx,{id:'c',purpose:'consult',title:'相談',recordId:null});return d;
}
const pending: Array<(v:unknown)=>void>=[];
registerAiTask({task:'test',promptVersion:'test-v1',inputSchema:{type:'object'},outputSchema:{type:'object',properties:{text:{type:'string'}},required:['text'],additionalProperties:false},
 readMaterials:()=>({context:{},evidence:[],sourceRefs:[]}),buildPrompt:()=> 'test',validateResult:()=>{},toBody:(r:any)=>r.text});
configureAi({provider:async()=>new Promise(resolve=>pending.push(resolve)),assertSourceRefs:()=>{},assertAllowed:()=>{},model:()=> 'test-model'});
const request=(suffix='')=>({conversationId:'c',userMessageId:'u'+suffix,assistantMessageId:'a'+suffix,text:'原文',task:'test',input:{},expectedRefs:[]});
async function tick(){await new Promise(r=>setImmediate(r));}
test('persistent acceptance is idempotent, busy per conversation; cancelled late attempt cannot overwrite retry',async()=>{
 const d=db(); const first=await startRun(d,ctx,request()); await tick();
 assert.equal(first.attempt,1);
 assert.equal((await startRun(d,ctx,request())).id,'a');
 await assert.rejects(startRun(d,ctx,request('2')),{code:'BUSY'});
 await assert.rejects(startRun(d,ctx,{...request(),text:'別入力'}),{code:'REQUEST_CONFLICT'});
 const running=await getRun(d,ctx,'a');
 const cancelled=await cancelRun(d,ctx,'a',{expectedVersion:running.version,expectedAttempt:1});
 assert.equal(cancelled.status,'cancelled');
 const retry=await retryRun(d,ctx,'a',{expectedVersion:cancelled.version,expectedAttempt:1});
 assert.equal(retry.attempt,2);await tick();
 pending.shift()!({text:'古い応答'});await tick();
 assert.equal((await getRun(d,ctx,'a')).status,'running');
 pending.shift()!({text:'現在の応答'});await tick();
 const done=await getRun(d,ctx,'a');assert.equal(done.status,'complete');assert.deepEqual(done.result,{text:'現在の応答'});
 assert.equal(d.prepare("SELECT body FROM messages WHERE id='u'").get()!.body,'原文');
 const ref={type:'map-settings' as const,id:'settings',version:2,contentHash:'a'.repeat(64)};
 appendAppliedRef(d,ctx,'a',ref);appendAppliedRef(d,ctx,'a',ref);assert.equal(readAppliedRefs(d,ctx,'a').length,1);
 await assert.rejects(getRun(d,{...ctx,personId:'other'},'a'),{code:'NOT_FOUND'});
 d.close();
});
test('restart marks pending/running interrupted, invalid schema never produces a result',async()=>{
 const d=db();await startRun(d,ctx,request());await tick();
 recoverInterruptedRuns(d);const interrupted=await getRun(d,ctx,'a');
 assert.equal(interrupted.error?.code,'INTERRUPTED');
 pending.shift()!({text:'late'});await tick();assert.equal((await getRun(d,ctx,'a')).status,'failed');
 await retryRun(d,ctx,'a',{expectedVersion:interrupted.version,expectedAttempt:1});await tick();
 pending.shift()!({wrong:'schema'});await tick();
 const failed=await getRun(d,ctx,'a');assert.equal(failed.status,'failed');assert.equal(failed.error?.code,'OUTPUT_INVALID');assert.equal(failed.result,null);
 d.close();
});

test('source revision change blocks stale result display and retry through shared checker',async()=>{
 const d=db();let changed=false;
 configureAi({assertSourceRefs:()=>{if(changed)throw Object.assign(new Error('更新済み'),{code:'SOURCE_CHANGED',retryable:false});}});
 await startRun(d,ctx,request());await tick();changed=true;
 pending.shift()!({text:'stale'});await tick();
 assert.equal(d.prepare("SELECT status FROM messages WHERE id='a'").get()!.status,'failed');
 await assert.rejects(getRun(d,ctx,'a'),{code:'SOURCE_CHANGED'});
 const row=d.prepare("SELECT version,attempt FROM messages WHERE id='a'").get()!;
 await assert.rejects(retryRun(d,ctx,'a',{expectedVersion:Number(row.version),expectedAttempt:Number(row.attempt)}),{code:'SOURCE_CHANGED'});
 configureAi({assertSourceRefs:()=>{}});d.close();
});
test('missing model rejects before acceptance and preserves caller input',async()=>{
 const d=db(),req=request();configureAi({model:()=>''});
 await assert.rejects(startRun(d,ctx,req),{code:'PROVIDER_UNAVAILABLE'});
 assert.equal(d.prepare('SELECT count(*) AS n FROM messages').get()!.n,0);assert.equal(req.text,'原文');
 configureAi({model:()=> 'test-model'});d.close();
});
