// Real CORE HTTP + common AI/SETTINGS + owned mapstyle/adoption, with an isolated durable DB.
import {spawn,execFileSync} from 'node:child_process';
import {createInterface} from 'node:readline';
import {mkdtempSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const directory=mkdtempSync(resolve(tmpdir(),'map-custom-ai-'));
const model=process.env.CODEX_AI_MODEL;
assert.equal(model,'gpt-5.6-luna');
execFileSync('python3',[resolve(root,'docs/evidence/MAP-CUSTOM/compose-contract.py'),resolve(directory,'openapi.json')],{cwd:root});
let child,origin,cookie='',stage='startup';
const requestId=randomUUID();
let evidence={requestId,model,status:'failed',databaseDirectory:directory,contract:'official CORE merger in isolated directory; shared generated client pending'};
async function start(){
  child=spawn(process.execPath,['--experimental-transform-types','--env-file-if-exists=.env','server/features/map-custom/http-harness.ts'],{cwd:root,env:{...process.env,CODEX_AI_MODEL:model,MAP_CUSTOM_TEST_DIR:directory,SODATERU_PORT:'0'},stdio:['ignore','pipe','pipe']});
  const current=child;
  let stderr='';current.stderr.on('data',d=>{stderr=(stderr+String(d)).slice(-4000);});
  await new Promise((res,rej)=>{
    const timer=setTimeout(()=>rej(new Error('Startup timed out: '+stderr)),20000);
    current.once('exit',code=>{clearTimeout(timer);if(!origin)rej(new Error('Server exited '+code+': '+stderr));});
    createInterface({input:current.stdout}).on('line',line=>{try {const r=JSON.parse(line);if(r.ready){origin='http://127.0.0.1:'+r.port;clearTimeout(timer);res();}}catch{}});
  });
}
async function stop(){
  if(!child||child.exitCode!==null)return;
  const current=child;
  await new Promise(res=>{const timer=setTimeout(()=>current.kill('SIGKILL'),5000);current.once('exit',()=>{clearTimeout(timer);res();});current.kill('SIGTERM');});
  origin=undefined;child=undefined;
}
async function request(path,method='GET',body,extra={},expected){
  const r=await fetch(origin+'/api/v1'+path,{method,headers:{'Content-Type':'application/json','X-Request-Id':randomUUID(),'X-Data-Mode':'live',Cookie:cookie,...(method==='POST'?{'Idempotency-Key':randomUUID()}:{}),...extra},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const data=r.status===204?null:await r.json();
  if(expected!==undefined)assert.equal(r.status,expected,path+' '+JSON.stringify(data));
  else if(!r.ok)throw new Error(path+' HTTP '+r.status+' '+JSON.stringify(data));
  return {response:r,body:data};
}
const match=version=>({'If-Match':'"'+version+'"'});
try{
  await start();
  const session=await request('/session','POST',{profileKey:'self'});cookie=session.response.headers.get('set-cookie').split(';')[0];
  const initial=(await request('/map-settings')).body.data;
  const conversationId='c-'+requestId,userMessageId='u-'+requestId,assistantMessageId='a-'+requestId;
  await request('/conversations','POST',{id:conversationId,purpose:'consult',title:'地図設定の実AI採用',recordId:null});
  const input={userMessageId,assistantMessageId,body:'夜の水辺を見やすくしたい。夜の照明にして水面を青くしてください。',use:'map-style',context:{current:initial.style},expectedRefs:[]};
  stage='permission-off';
  const deniedInput={...input,userMessageId:'denied-u-'+requestId,assistantMessageId:'denied-a-'+requestId};
  await request('/conversations/'+conversationId+'/messages','POST',deniedInput,{},202);
  let denied;
  for(let i=0;i<30;i++){
    denied=(await request('/messages/'+deniedInput.assistantMessageId)).body.data.run;
    if(denied.status==='failed')break;
    await new Promise(res=>setTimeout(res,100));
  }
  assert.equal(denied.status,'failed');assert.equal(denied.error.code,'FORBIDDEN');
  evidence.permissionOff={httpAccepted:202,runStatus:'failed',error:denied.error.code};
  stage='enable-settings';
  const settings=(await request('/me/settings')).body.data;
  await request('/me/settings','PATCH',{ai:{...settings.ai,enabled:true}},match(settings.version));
  stage='real-ai';const began=Date.now();
  const startKey=randomUUID();
  await request('/conversations/'+conversationId+'/messages','POST',input,{'Idempotency-Key':startKey,'X-Request-Id':requestId},202);
  let result;
  do{
    result=(await request('/messages/'+assistantMessageId)).body.data;
    if(!['pending','running'].includes(result.run.status))break;
    await new Promise(res=>setTimeout(res,1000));
  }while(Date.now()-began<210000);
  assert.equal(result.run.status,'complete',JSON.stringify(result.run.error));
  assert.equal(result.run.model,model);
  evidence.ai={durationMs:Date.now()-began,conversationId,userMessageId,assistantMessageId,attempt:result.run.attempt,promptVersion:result.run.promptVersion,result:result.run.result};
  stage='preview';
  const preview=(await request('/map-settings/previews','POST',{messageId:assistantMessageId},{},201)).body.data;
  assert.deepEqual((await request('/map-settings')).body.data,initial);
  const adoptionKey=randomUUID(),url='/map-settings/previews/'+preview.id+'/adopt';
  stage='adopt';
  const adopted=(await request(url,'POST',undefined,{'Idempotency-Key':adoptionKey,...match(initial.version)},200)).body.data;
  assert.equal(adopted.settings.version,initial.version+1);assert.equal(adopted.alreadyApplied,false);
  assert.deepEqual(adopted.settings.style,result.run.result.proposal);
  assert.deepEqual(adopted.settings.layers,initial.layers);
  const replay=(await request(url,'POST',undefined,{'Idempotency-Key':adoptionKey,...match(initial.version)},200)).body.data;
  assert.equal(replay.alreadyApplied,true);assert.equal(replay.settings.version,adopted.settings.version);
  const readRefs=()=>{const db=new DatabaseSync(resolve(directory,'live.sqlite'),{readOnly:true});try{return JSON.parse(db.prepare('SELECT applied_refs_json FROM messages WHERE id=?').get(assistantMessageId).applied_refs_json);}finally{db.close();}};
  assert.deepEqual(readRefs(),[adopted.appliedRef]);
  stage='restart';await stop();await start();
  const restored=(await request('/map-settings')).body.data;
  const restoredMessage=(await request('/messages/'+assistantMessageId)).body.data;
  assert.deepEqual(restored,adopted.settings);assert.deepEqual(restoredMessage.run.result,result.run.result);
  assert.deepEqual(readRefs(),[adopted.appliedRef]);
  assert.equal((await request('/map-settings/previews/'+preview.id)).body.data.state,'applied');
  const again=(await request(url,'POST',undefined,{'Idempotency-Key':adoptionKey,...match(initial.version)},200)).body.data;
  assert.equal(again.alreadyApplied,true);assert.equal(again.settings.version,adopted.settings.version);
  evidence={...evidence,status:'complete',previewDidNotSave:true,adoption:{previewId:preview.id,settingsId:restored.id,beforeVersion:initial.version,afterVersion:restored.version,appliedRef:adopted.appliedRef,layersUnchanged:true,replayDidNotReapply:true},restart:{settingsEqual:true,resultEqual:true,appliedRefEqualInSql:true,previewApplied:true,replayDidNotReapply:true}};
}catch(error){evidence={...evidence,stage,error:String(error.message).slice(0,5000)};process.exitCode=1;}
finally{await stop();writeFileSync(resolve(root,'docs/evidence/MAP-CUSTOM/live-ai-http.json'),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence,null,2));}
