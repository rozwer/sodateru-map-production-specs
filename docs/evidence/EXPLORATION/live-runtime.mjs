import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {serve} from '@hono/node-server';
import {openDatabases} from '../../../server/db/connection.ts';
import {loadLocalIdentity,seedProfiles} from '../../../server/core/session.ts';
import {createApp} from '../../../server/app/app.ts';
import {createApiClient} from '../../../packages/api-client/index.ts';
import exploration from '../../../server/features/exploration/register.ts';
import settings from '../../../server/features/settings/register.ts';
import conversations from '../../../server/features/conversations/register.ts';
import places from '../../../server/features/places/register.ts';
import routes from '../../../server/features/routes/register.ts';

process.env.MAPBOX_ACCESS_TOKEN ||= process.env.VITE_MAPBOX_ACCESS_TOKEN;
process.env.CODEX_AI_MODEL='gpt-5.6-luna';
if(!process.env.MAPBOX_ACCESS_TOKEN)throw Error('Mapbox token missing');
const root=mkdtempSync('/tmp/exploration-live-'),features=[conversations,settings,places,routes,exploration];
const contract=JSON.parse(readFileSync(new URL('../../01_requirements/04_api/openapi.json',import.meta.url)));
for(const name of ['SETTINGS','ROUTES','PLACES','AI','EXPLORATION']){
 const part=JSON.parse(readFileSync(new URL('../../01_requirements/04_api/fragments/'+name+'.json',import.meta.url)));
 Object.assign(contract.components.schemas,part.schemas);
 for(const {method,path,...operation}of part.operations)(contract.paths[path]??={})[method]=operation;
}
let db,server,client,cookie='',origin='',stage='startup';
const identity=loadLocalIdentity(join(root,'profiles.json'));
const proof={status:'failed',model:'gpt-5.6-luna',transport:'TCP HTTP + shared generated client (settings/history via raw HTTP until CORE generation)',features:features.map(f=>f.id),databaseDirectory:root};
async function start(){
 db=openDatabases({livePath:join(root,'live.sqlite'),demoPath:join(root,'demo.sqlite'),migrations:features.flatMap(f=>f.migrations??[])});
 seedProfiles(db,identity.profiles);
 const app=createApp({databases:db,identity,features,contract});
 await new Promise(resolve=>{server=serve({fetch:app.fetch,hostname:'127.0.0.1',port:0},info=>{origin='http://127.0.0.1:'+info.port;resolve();});});
 client=createApiClient({baseUrl:origin+'/api/v1',fetch:async(url,init)=>{const headers=new Headers(init.headers);if(cookie)headers.set('Cookie',cookie);const r=await fetch(url,{...init,headers});if(r.headers.has('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return r;}});
}
async function stop(){if(server)await new Promise(resolve=>server.close(resolve));db?.close();}
const call=(operation,input={})=>client.request(operation,{...input,idempotencyKey:crypto.randomUUID()});
async function raw(method,path,body,extra={}){
 const r=await fetch(origin+'/api/v1'+path,{method,headers:{'Content-Type':'application/json','X-Request-Id':crypto.randomUUID(),'X-Data-Mode':'live','Idempotency-Key':crypto.randomUUID(),Cookie:cookie,...extra},...(body?{body:JSON.stringify(body)}:{})});
 const result=await r.json();if(!r.ok)throw Error(path+' HTTP '+r.status+' '+result.error?.code);return result;
}
try{
 await start();await call('postSession',{body:{profileKey:'self'}});
 stage='settings';const saved=(await raw('GET','/me/settings')).data;
 await raw('PATCH','/me/settings',{ai:{...saved.ai,enabled:true,allowLocation:true,allowMedia:true}},{'If-Match':'"'+saved.version+'"'});
 const originPoint={coordinates:[136.9066,35.1709],label:'名古屋駅付近の地図中心',kind:'map-center'};
 stage='real-dialogue';console.log(JSON.stringify({stage}));
 const first=(await call('postMapDialogues',{body:{text:'近くのカフェを探して候補を示してください。まだ経路は不要です。',origin:originPoint}})).data;
 assert.ok(first.places.length>=2);proof.candidateCount=first.places.length;
 stage='second-candidate';console.log(JSON.stringify({stage}));
 const secondId=first.places[1].candidateId;
 const continued=(await call('postMapDialogues',{body:{text:'2番目の候補まで歩く経路を教えてください。再検索せず同じ候補を使ってください。',origin:originPoint}})).data;
 assert.ok(continued.routes.length>=1);assert.deepEqual(continued.origin,first.origin);
 const selected=(await call('postMapDialoguesSelect',{body:{resultId:continued.resultId,candidateId:secondId}})).data;
 assert.equal(selected.places[0].candidateId,secondId);assert.deepEqual(selected.origin,first.origin);assert.equal(selected.routes.length,1);
 proof.dialogue={sameSecondCandidate:true,fixedOrigin:true,routeCount:1,provider:selected.routes[0].provider,retention:selected.routes[0].retention};
 stage='history';const conversationId=crypto.randomUUID();
 await call('postConversations',{body:{id:conversationId,purpose:'consult',title:'実接続の街歩き相談',recordId:null}});
 await raw('POST','/map-dialogues/results/'+selected.resultId+'/history',{conversationId});
 const resumed=(await raw('GET','/conversations/'+conversationId+'/map-dialogue')).data;
 assert.equal(resumed.resultId,selected.resultId);proof.historyBeforeRestart=true;
 stage='discovery';console.log(JSON.stringify({stage}));
 const uid=crypto.randomUUID(),aid=crypto.randomUUID();
 await call('postConversationsConversationIdMessages',{path:{conversationId},body:{userMessageId:uid,assistantMessageId:aid,body:'白い雲が見えます。雲の色の一般的な仕組みを教えてください。',use:'discovery',context:{anchor:{kind:'building',targetId:'demo-observation-cloud',features:['白い雲']},factKeys:['jma-cloud-white']},expectedRefs:[]}});
 let result;const began=Date.now();
 do{result=(await call('getMessagesMessageId',{path:{messageId:aid}})).data;if(!['pending','running'].includes(result.run.status))break;await new Promise(resolve=>setTimeout(resolve,700));}while(Date.now()-began<190000);
 assert.equal(result.run.status,'complete',JSON.stringify(result.run.error));
 proof.discoveryRun={status:result.run.status,attempt:result.run.attempt,model:result.run.model,sourceCount:result.run.result.sources.length};
 const cardId=crypto.randomUUID();
 const card=(await call('postDiscoveryCards',{body:{id:cardId,assistantMessageId:aid,expectedAttempt:result.run.attempt}})).data;
 await call('postDiscoveryCardsCardIdReactions',{path:{cardId},body:{id:crypto.randomUUID(),reaction:'saved'}});
 stage='restart';await stop();await start();
 const restored=(await call('getDiscoveryCardsCardId',{path:{cardId}})).data;assert.equal(restored.knowledge,card.knowledge);assert.deepEqual(restored.sources,card.sources);
 const expired=(await raw('GET','/conversations/'+conversationId+'/map-dialogue')).data;assert.equal(expired.resumeAction,'search');
 await call('postDiscoveryCardsCardIdReactions',{path:{cardId},body:{id:crypto.randomUUID(),reaction:'dismissed'}});
 const list=await call('getDiscoveryCards');assert.ok(!list.items.some(x=>x.id===cardId));
 proof.discovery={saveReloadEqual:true,sourcesEqual:true,dismissedHidden:true};proof.historyAfterRestart='search';proof.status='complete';
}catch(e){proof.stage=stage;proof.error={name:e.name,code:e.code??null,message:e.message.slice(0,1200),reason:e.details?.reason??null};process.exitCode=1;}
finally{await stop();writeFileSync(new URL('./live-runtime.json',import.meta.url),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));}
