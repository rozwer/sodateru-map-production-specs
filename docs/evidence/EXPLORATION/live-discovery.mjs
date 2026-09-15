import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {createApiClient} from '../../../packages/api-client/index.ts';
const root=fileURLToPath(new URL('../../../',import.meta.url)),id=crypto.randomUUID();
const directory=resolve(root,'.local/exploration-followup',id);mkdirSync(directory,{recursive:true});
process.env.CODEX_AI_MODEL='gpt-5.6-luna';
process.env.MAPBOX_ACCESS_TOKEN ||= process.env.VITE_MAPBOX_ACCESS_TOKEN;
let child,origin='',cookie='',client,stage='startup';
const proof={id,model:process.env.CODEX_AI_MODEL,databaseDirectory:directory,status:'failed',entry:'server/app/main.ts',client:'packages/api-client/index.ts',dataMode:'live'};
async function start(){
 child=spawn(process.execPath,['--experimental-transform-types',...(process.argv.includes('--diagnose')?['--import','./docs/evidence/EXPLORATION/provider-diagnostic.mjs']:[]),'server/app/main.ts'],{cwd:root,env:{...process.env,EXPLORATION_PROVIDER_DIAGNOSTIC:resolve(root,'docs/evidence/EXPLORATION/provider-diagnostic.json'),SODATERU_PORT:'0',SODATERU_DB_PATH:resolve(directory,'live.sqlite'),SODATERU_DEMO_DB_PATH:resolve(directory,'demo.sqlite'),SODATERU_PROFILES_PATH:resolve(directory,'profiles.json')},stdio:['ignore','pipe','pipe']});
 let stderr='';child.stderr.on('data',data=>{stderr=(stderr+String(data)).slice(-4000);});
 await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('Server startup timed out')),25000);
  child.once('exit',code=>{clearTimeout(timer);if(!origin)reject(Error('Server exit '+code+': '+stderr));});
  createInterface({input:child.stdout}).on('line',line=>{try{const ready=JSON.parse(line);if(ready.event==='ready'){origin=ready.origin;clearTimeout(timer);resolve();}}catch{}});
 });
 client=createApiClient({baseUrl:origin+'/api/v1',fetch:async(url,init)=>{const h=new Headers(init.headers);if(cookie)h.set('Cookie',cookie);const response=await fetch(url,{...init,headers:h});if(response.headers.has('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];return response;}});
}
async function stop(){if(child&&child.exitCode===null)await new Promise(resolve=>{const timer=setTimeout(()=>child.kill('SIGKILL'),10000);child.once('exit',()=>{clearTimeout(timer);resolve();});child.kill('SIGTERM');});child=undefined;origin='';}
const call=(operation,input={})=>client.request(operation,{...input,idempotencyKey:input.idempotencyKey??crypto.randomUUID()});
const phase=name=>{stage=name;console.log(JSON.stringify({stage}));};
try{
 await start();await call('postSession',{body:{profileKey:'self'}});
 phase('allow-ai');const settings=(await call('getMeSettings')).data;
 const enabled=(await call('patchMeSettings',{version:settings.version,body:{ai:{...settings.ai,enabled:true,allowLocation:true,allowMedia:true}}})).data;proof.settingsVersion=enabled.version;
 const conversationId='discovery-'+id,assistantMessageId='a-'+id,cardId='card-'+id;
 await call('postConversations',{body:{id:conversationId,purpose:'consult',title:'出典付き発見の実保存確認',recordId:null}});
 const anchor={kind:'building',targetId:'synthetic-observation-cloud',features:['白い雲']};
 const facts=await call('getDiscoveryFacts',{query:{kind:anchor.kind,targetId:anchor.targetId}});
 assert.ok(facts.items.some(f=>f.factKey==='jma-cloud-white'));
 phase('real-discovery');
 const began=Date.now();
 await call('postConversationsConversationIdMessages',{path:{conversationId},body:{userMessageId:'u-'+id,assistantMessageId,body:'白い雲を見ました。雲の白さの一般的な仕組みを、出典に基づいて教えてください。',use:'discovery',context:{anchor,factKeys:['jma-cloud-white']},expectedRefs:[]}});
 let result;
 do{result=(await call('getMessagesMessageId',{path:{messageId:assistantMessageId}})).data;if(!['pending','running'].includes(result.run.status))break;await new Promise(resolve=>setTimeout(resolve,800));}while(Date.now()-began<195000);
 proof.run={status:result.run.status,attempt:result.run.attempt,model:result.run.model,error:result.run.error};
 assert.equal(result.run.status,'complete',JSON.stringify(result.run.error));
 assert.equal(result.run.model,proof.model);
 phase('save-card');
 const input={id:cardId,assistantMessageId,expectedAttempt:result.run.attempt},key=crypto.randomUUID();
 const card=(await call('postDiscoveryCards',{body:input,idempotencyKey:key})).data;
 assert.equal(card.sources[0].claimScope,'general');
 await call('postDiscoveryCardsCardIdReactions',{path:{cardId},body:{id:'saved-'+id,reaction:'saved'}});
 const refs=(await call('getMessagesMessageId',{path:{messageId:assistantMessageId}})).data.appliedRefs;
 assert.ok(refs.some(ref=>ref.type==='discovery'&&ref.id===cardId));
 phase('restart');
 await stop();await start();
 const restored=(await call('getDiscoveryCardsCardId',{path:{cardId}})).data;
 assert.deepEqual(restored,card);
 const replay=(await call('postDiscoveryCards',{body:input,idempotencyKey:key})).data;assert.deepEqual(replay,card);
 const after=(await call('getMessagesMessageId',{path:{messageId:assistantMessageId}})).data;
 assert.deepEqual(after.run.result,result.run.result);
 assert.ok((await call('getDiscoveryCards')).items.some(c=>c.id===cardId));
 phase('hide');
 await call('postDiscoveryCardsCardIdReactions',{path:{cardId},body:{id:'dismissed-'+id,reaction:'dismissed'}});
 assert.ok(!(await call('getDiscoveryCards')).items.some(c=>c.id===cardId));
 proof.status='complete';proof.durationMs=Date.now()-began;proof.card={id:card.id,version:card.version,sourceCount:card.sources.length,claimScopes:card.sources.map(s=>s.claimScope)};proof.checks={realSdk:true,save:true,appliedRefs:true,processRestart:true,cardAndSourcesEqual:true,runResultEqual:true,idempotentReplay:true,savedVisible:true,dismissedHidden:true};
}catch(e){proof.stage=stage;proof.error={name:e.name,code:e.code??null,message:e.message.slice(0,2500)};process.exitCode=1;}
finally{await stop();writeFileSync(new URL('./live-discovery.json',import.meta.url),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));}
