import { spawn, type ChildProcess } from 'node:child_process';
import { createInterface } from 'node:readline';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const requestId=randomUUID(),directory=resolve(root,'.local/ai-live-acceptance',requestId);
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
 await request('/me/settings','PATCH',{ai:{...settings.ai,enabled:true}},{'If-Match':'"'+settings.version+'"'});
 stage='read-mapstyle';const settingsMap=(await request('/map-settings')).body.data;
 const conversationId='live-'+requestId,userMessageId='u-'+requestId,assistantMessageId='a-'+requestId;
 await request('/conversations','POST',{id:conversationId,purpose:'consult',title:'Luna 実AI保存受入',recordId:null});
 const input={userMessageId,assistantMessageId,body:'夜でも水辺が見やすい地図にしたい',use:'map-style',context:{current:settingsMap.style},expectedRefs:[]};
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
 const beforeRestart=result;stage='restart';await stop();await start();
 const restored=(await request('/messages/'+assistantMessageId)).body.data;
 assert.deepEqual(restored.run.result,beforeRestart.run.result);assert.equal(restored.run.model,model);assert.equal(restored.run.attempt,beforeRestart.run.attempt);
 const messages=(await request('/conversations/'+conversationId+'/messages')).body.items;
 assert.equal(messages.find((m:any)=>m.id===userMessageId).body,input.body);
 evidence={requestId,model,status:'complete',durationMs:Date.now()-beganAt,conversationId,userMessageId,assistantMessageId,attempt:restored.run.attempt,version:restored.run.version,promptVersion:restored.run.promptVersion,sourceRefs:restored.run.sourceRefs,result:restored.run.result,restartResultEqual:true,userBodyEqual:true,databaseDirectory:directory};
}catch(error){evidence={...evidence,stage,error:String((error as Error).message).slice(0,3000)};process.exitCode=1;}
finally{await stop();writeFileSync(new URL('./live-engine.json',import.meta.url),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence));}
