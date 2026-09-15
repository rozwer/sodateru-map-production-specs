import test from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,readFileSync,rmSync} from 'node:fs';import{tmpdir}from'node:os';import{join}from'node:path';
import{openDatabases}from'../../db/connection.ts';import{loadLocalIdentity,seedProfiles}from'../../core/session.ts';import{createApp}from'../../app/app.ts';import{createExplorationFeature}from'./http.mjs';
const discovery={anchor:{kind:'building',targetId:'b1',features:['白い雲']},bridge:'雲の色に注目',knowledge:'散乱の一般説明',observationPrompt:'空を観察',conceptIds:['cloud'],sources:[]};
test('CORE auth/validation and real SQLite HTTP save/replay/reopen/hide/delete with no cross-mode access',async()=>{
 const root=mkdtempSync(join(tmpdir(),'exploration-http-'));let databases;
 try{
  const runtime=()=>({dialogue:{settings:async()=>({enabled:true,version:'v1'}),decide:async()=>({action:'finish',category:'',destinationId:'',text:'確認しました'}),search:async()=>{throw Error('not used');},route:async()=>{throw Error('not used');}},getConversation:async(c,id)=>({id,purpose:'consult'}),discovery:{getRun:async(c,id)=>({id,task:'discover',status:'complete',attempt:1,version:1,result:discovery,sourceRefs:[]}),checkSources:()=>[],assertAdoptable:()=>{},recordAdoption:()=>{}}});
  let feature=createExplorationFeature(runtime);
  const open=()=>openDatabases({livePath:join(root,'live.sqlite'),demoPath:join(root,'demo.sqlite'),migrations:feature.migrations});
  databases=open();const identity=loadLocalIdentity(join(root,'profiles.json'));seedProfiles(databases,identity.profiles);
  const contract=JSON.parse(readFileSync(new URL('../../../docs/01_requirements/04_api/openapi.json',import.meta.url)));
  const fragment=JSON.parse(readFileSync(new URL('../../../docs/01_requirements/04_api/fragments/EXPLORATION.json',import.meta.url)));
  Object.assign(contract.components.schemas,fragment.schemas);
  for(const {method,path,...operation}of fragment.operations)(contract.paths[path]??={})[method]=operation;
  let app=createApp({databases,identity,features:[feature],contract}),cookie;
  const request=async(method,path,body,extra={})=>{
   const headers={'X-Request-Id':crypto.randomUUID(),'X-Data-Mode':'live','Idempotency-Key':crypto.randomUUID(),...extra};
   if(cookie)headers.Cookie=cookie;if(body!==undefined)headers['Content-Type']='application/json';
   return app.request('/api/v1'+path,{method,headers,...(body!==undefined?{body:JSON.stringify(body)}:{})});
  };
  assert.equal((await request('GET','/discovery-cards')).status,401);
  const login=await request('POST','/session',{profileKey:'self'});assert.equal(login.status,201);cookie=login.headers.get('set-cookie').split(';')[0];
  const dialogueKey=crypto.randomUUID(),dialogueInput={text:'相談する',origin:{coordinates:[136.96,35.16],label:'地図の中心',kind:'map-center'}};
  const dialogueResponse=await request('POST','/map-dialogues',dialogueInput,{'Idempotency-Key':dialogueKey});assert.equal(dialogueResponse.status,200,await dialogueResponse.clone().text());
  const dialogueResult=(await dialogueResponse.json()).data;
  const dialogueReplay=await request('POST','/map-dialogues',dialogueInput,{'Idempotency-Key':dialogueKey});assert.equal((await dialogueReplay.json()).data.resultId,dialogueResult.resultId);
  assert.equal((await request('POST','/map-dialogues',{...dialogueInput,text:'異なる相談'},{'Idempotency-Key':dialogueKey})).status,409);
  const transientReceipt=databases.live.prepare("SELECT result_json FROM core_requests WHERE request_key=?").get(dialogueKey);assert.equal(transientReceipt.result_json.includes('確認しました'),false);
  const key=crypto.randomUUID(),input={id:'card1',assistantMessageId:'a1',expectedAttempt:1};
  const created=await request('POST','/discovery-cards',input,{'Idempotency-Key':key});assert.equal(created.status,201,await created.clone().text());
  const replay=await request('POST','/discovery-cards',input,{'Idempotency-Key':key});assert.equal(replay.status,201);assert.deepEqual(await replay.json(),await created.json());
  const conflict=await request('POST','/discovery-cards',{...input,id:'different'},{'Idempotency-Key':key});assert.equal(conflict.status,409);
  assert.equal(databases.live.prepare('SELECT COUNT(*) n FROM discovery_cards').get().n,1);
  await request('POST','/discovery-cards/card1/reactions',{id:'r1',reaction:'saved'});
  assert.equal((await (await request('GET','/discovery-cards')).json()).items.length,1);
  databases.close();databases=open();feature=createExplorationFeature(runtime);app=createApp({databases,identity,features:[feature],contract});
  assert.equal((await request('GET','/map-dialogues/results/'+dialogueResult.resultId)).status,410);
  assert.equal((await request('POST','/map-dialogues',dialogueInput,{'Idempotency-Key':dialogueKey})).status,410);
  const restored=await request('GET','/discovery-cards/card1');assert.equal(restored.status,200);assert.equal((await restored.json()).data.knowledge,discovery.knowledge);
  assert.equal((await request('GET','/discovery-cards/card1',undefined,{'X-Data-Mode':'demo'})).status,401);
  await request('POST','/discovery-cards/card1/reactions',{id:'r2',reaction:'dismissed'});
  assert.equal((await (await request('GET','/discovery-cards')).json()).items.length,0);
  assert.equal((await request('DELETE','/discovery-cards/card1')).status,428);
  assert.equal((await request('DELETE','/discovery-cards/card1',undefined,{'If-Match':'"1"'})).status,204);
  assert.equal((await request('POST','/discovery-cards',input,{'Idempotency-Key':key})).status,404);
 }finally{databases?.close();rmSync(root,{recursive:true,force:true});}
});
