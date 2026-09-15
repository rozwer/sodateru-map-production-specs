import { spawn, type ChildProcess } from 'node:child_process';
import { createInterface } from 'node:readline';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const requestId=randomUUID(),directory=resolve(root,'.local/insights-live-acceptance',requestId);
mkdirSync(directory,{recursive:true});
const model=process.env.CODEX_AI_MODEL;
if(model!=='gpt-5.6-luna')throw new Error('Run with CODEX_AI_MODEL=gpt-5.6-luna');
let child:ChildProcess|undefined,origin='',cookie='',stage='startup';
async function start(){
 child=spawn(process.execPath,['--experimental-transform-types','--env-file-if-exists=.env','server/app/main.ts'],{cwd:root,env:{...process.env,CODEX_AI_MODEL:model,SODATERU_PORT:'0',SODATERU_DB_PATH:resolve(directory,'live.sqlite'),SODATERU_DEMO_DB_PATH:resolve(directory,'demo.sqlite'),SODATERU_PROFILES_PATH:resolve(directory,'profiles.json')},stdio:['ignore','pipe','pipe']});
 const processChild=child;
 let stderr='';processChild.stderr!.on('data',data=>{stderr=(stderr+String(data)).slice(-4000);});
 return new Promise<void>((resolve,reject)=>{
  const timer=setTimeout(()=>reject(new Error('Server startup timed out')),20000);
  processChild.on('exit',code=>{clearTimeout(timer);if(!origin)reject(new Error('Server exited '+code+': '+stderr));});
  const lines=createInterface({input:processChild.stdout!});
  lines.on('line',line=>{try{const ready=JSON.parse(line);if(ready.event==='ready'){origin=ready.origin;clearTimeout(timer);resolve();}}catch{}});
 });
}
async function stop(){
 const running=child;if(!running||running.exitCode!==null)return;
 await new Promise<void>(resolve=>{const timer=setTimeout(()=>running.kill('SIGKILL'),10000);running.once('exit',()=>{clearTimeout(timer);resolve();});running.kill('SIGTERM');});
 child=undefined;origin='';
}
async function request(path:string,method='GET',body?:unknown,extra:Record<string,string>={}){
 const response=await fetch(origin+'/api/v1'+path,{method,headers:{'Content-Type':'application/json','X-Request-Id':randomUUID(),'X-Data-Mode':'live',Cookie:cookie,...(method==='POST'?{'Idempotency-Key':randomUUID()}:{}),...extra},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const data=response.status===204?null:await response.json() as any;
 if(!response.ok)throw new Error(path+' HTTP '+response.status+' '+JSON.stringify(data?.error));
 return {response,body:data};
}
let evidence:any={requestId,model,databaseDirectory:directory,status:'failed'};
try{
 await start();
 const session=await request('/session','POST',{profileKey:'self'});cookie=session.response.headers.get('set-cookie')!.split(';')[0]!;
 stage='enable-settings';const settings=(await request('/me/settings')).body.data;
 await request('/me/settings','PATCH',{ai:{...settings.ai,enabled:true,allowRecords:true}},{'If-Match':'"'+settings.version+'"'});
 stage='create-record';
 const from=Date.parse('2026-09-01T00:00:00Z'),to=from+86400000;
 const recordId='record-'+requestId,insightId='computed-'+requestId;
 await request('/records','POST',{id:recordId,kind:'diary',visitId:null,placeId:null,occurredAt:from+3600000,endedAt:null,timePrecision:'exact',body:'本を見つけた。カフェで過ごした。公園を歩いた。友人と話した。',purposes:[],activities:[],impression:'',periodAnswers:{},bookmarked:false,useForSuggestions:true,topicKey:null,visibility:'private',sharedWith:[]});
 const computed=(await request('/insights','POST',{id:insightId,from,to,timeZone:'UTC'})).body.data;
 await request('/insights/'+computed.id,'PATCH',{review:'unsure',reviewNote:'まだ一日だけなので保留'},{'If-Match':'"1"'});

 const conversationId='live-'+requestId,userMessageId='u-'+requestId,assistantMessageId='a-'+requestId;
 await request('/conversations','POST',{id:conversationId,purpose:'analysis',title:'Luna 期間分析の保存受入',recordId:null});
 const input={userMessageId,assistantMessageId,body:'この一日の記録から言えることと分からないことを分けて説明して',use:'analysis',context:{insightId:computed.id},expectedRefs:computed.sourceRefs};
 stage='start-run';const beganAt=Date.now();
 await request('/conversations/'+conversationId+'/messages','POST',input,{'X-Request-Id':requestId,'Idempotency-Key':requestId});
 let result:any;
 stage='wait-run';
 do{
  result=(await request('/messages/'+assistantMessageId)).body.data;
  if(!['pending','running'].includes(result.run.status))break;
  await new Promise(resolve=>setTimeout(resolve,800));
 }while(Date.now()-beganAt<210000);
 assert.equal(result.run.status,'complete',JSON.stringify(result.run.error));assert.equal(result.run.model,model);
 const generated=(await request('/insights/'+result.run.insightId)).body.data;
 assert.deepEqual(generated.result.axes,computed.result.axes);assert.equal(generated.review,'unsure');
 const beforeRestart=result;stage='restart';await stop();await start();
 const restored=(await request('/messages/'+assistantMessageId)).body.data;
 assert.deepEqual(restored.run.result,beforeRestart.run.result);assert.equal(restored.run.model,model);assert.equal(restored.run.attempt,beforeRestart.run.attempt);
 const messages=(await request('/conversations/'+conversationId+'/messages')).body.items;
 assert.equal(messages.find((m:any)=>m.id===userMessageId).body,input.body);
 evidence={requestId,model,status:'complete',durationMs:Date.now()-beganAt,conversationId,userMessageId,assistantMessageId,attempt:restored.run.attempt,version:restored.run.version,promptVersion:restored.run.promptVersion,sourceRefs:restored.run.sourceRefs,result:restored.run.result,insightId:generated.id,axesPreserved:true,reviewPreserved:generated.review,restartResultEqual:true,userBodyEqual:true,databaseDirectory:directory};
}catch(error){evidence={...evidence,stage,error:String((error as Error).message).slice(0,3000)};process.exitCode=1;}
finally{await stop();writeFileSync(new URL('./live-analysis.json',import.meta.url),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence));}
