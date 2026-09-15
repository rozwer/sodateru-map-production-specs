import { spawn, type ChildProcess } from 'node:child_process';
import { createInterface } from 'node:readline';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const previous=process.env.REFLECTION_RESUME_FILE?JSON.parse(readFileSync(process.env.REFLECTION_RESUME_FILE,'utf8')):null;
const requestId=previous?.requestId??randomUUID(),directory=previous?.databaseDirectory??resolve(root,'.local/ai-live-acceptance',requestId);
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
const recordId='record-'+requestId,otherId='other-'+requestId,diaryId='diary-'+requestId;
const runs:any[]=previous?.runs??[];
async function generate(use:string,input:any,refs:any[],text:string){
 const id=use+'-'+(previous?randomUUID():requestId),conversationId='c-'+id;
 await request('/conversations','POST',{id:conversationId,purpose:'reflection',title:'振り返り実接続',recordId:use==='extract'?recordId:null});
 stage='generate-'+use;
 await request('/conversations/'+conversationId+'/messages','POST',{userMessageId:'u-'+id,assistantMessageId:'a-'+id,use,body:text,context:input,expectedRefs:refs});
 const began=Date.now();
 while(Date.now()-began<210000){
  const value=(await request('/messages/a-'+id)).body.data;
  if(value.run.status==='complete'){runs.push(value.run);return value.run;}
  if(!['pending','running'].includes(value.run.status))throw new Error(use+' '+JSON.stringify(value.run.error));
  await new Promise(r=>setTimeout(r,800));
 }
 throw new Error(use+' timed out');
}
try{
 await start();
 const session=await request('/session','POST',{profileKey:'self'});cookie=session.response.headers.get('set-cookie')!.split(';')[0]!;
 let adopted:any,savedDiary:any;
 if(!previous){
 stage='enable-settings';const settings=(await request('/me/settings')).body.data;
 await request('/me/settings','PATCH',{ai:{...settings.ai,enabled:true,allowRecords:true}},{'If-Match':'"'+settings.version+'"'});
 const input=(id:string,body:string,kind='experience')=>({id,kind,visitId:null,placeId:null,occurredAt:Date.parse('2026-09-15T01:00:00Z'),endedAt:null,timePrecision:'exact',body,purposes:[],activities:[],impression:'',periodAnswers:{},bookmarked:false,useForSuggestions:false,topicKey:null,visibility:'private',sharedWith:[]});
 stage='create-records';
 await request('/records','POST',input(recordId,'川辺のベンチで休憩した。水の音が静かに聞こえて落ち着いた。'));
 await request('/records','POST',input(otherId,'公園のベンチで休憩した。木陰が涼しかった。'));
 await request('/records','POST',input(diaryId,'今日の本人原文。','diary'));
 const extract=await generate('extract',{recordId,answers:[]},[{type:'record',id:recordId,version:1}],'原文から用途と理由を整理してください。');
 assert.equal(extract.model,model);
 stage='adopt-extract';
 adopted=(await request('/reflection/adoptions','POST',{assistantMessageId:extract.id,expectedAttempt:extract.attempt,recordId,fields:['purpose']},{'If-Match':'"1"'})).body.data;
 assert.equal(adopted.body,'川辺のベンチで休憩した。水の音が静かに聞こえて落ち着いた。');
 const refs=[{type:'record',id:recordId,version:adopted.version}];
 const diary=await generate('diary',{date:'2026-09-15',timezone:'Asia/Tokyo',recordIds:[recordId]},refs,'この日の記録から200文字以内の日記を作ってください。');
 stage='adopt-diary';
 savedDiary=(await request('/reflection/adoptions','POST',{assistantMessageId:diary.id,expectedAttempt:diary.attempt,recordId:diaryId,body:diary.result.text},{'If-Match':'"1"'})).body.data;
 assert.equal(savedDiary.body,diary.result.text);
 }else{
 stage='resume-confirmed-saves';
 adopted=(await request('/records/'+recordId)).body.data.record;
 savedDiary=(await request('/records/'+diaryId)).body.data.record;
 }
 const refs=[{type:'record',id:recordId,version:adopted.version}];
 const compare=await generate('comparison',{fromRecordIds:[recordId],toRecordIds:[otherId]},[...refs,{type:'record',id:otherId,version:1}],'二つの記録の共通点と違いを比較してください。');
 assert.ok(compare.insightId);
 stage='reload-comparison';
 const insight=(await request('/insights/'+compare.insightId)).body.data;
 stage='restart';await stop();await start();
 const restored=(await request('/records/'+diaryId)).body.data.record;
 assert.equal(restored.body,savedDiary.body);
 const restoredInsight=(await request('/insights/'+compare.insightId)).body.data;
 assert.equal(restoredInsight.id,insight.id);
 evidence={requestId,model,status:'complete',recordId,diaryId,insightId:insight.id,runs:runs.map(r=>({id:r.id,model:r.model,promptVersion:r.promptVersion,attempt:r.attempt,sourceRefs:r.sourceRefs})),diaryBody:savedDiary.body,comparison:insight.result,restartResultEqual:true,databaseDirectory:directory};
}catch(error){evidence={...evidence,stage,runs:runs.map(r=>({id:r.id,model:r.model,status:r.status})),error:String((error as Error).message).slice(0,3000)};process.exitCode=1;}
finally{await stop();writeFileSync(new URL('./live-integration.json',import.meta.url),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence));}
