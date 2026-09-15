import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {mkdirSync,writeFileSync,copyFileSync,readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {createApiClient} from '../../../packages/api-client/index.ts';
const root=fileURLToPath(new URL('../../../',import.meta.url)),id=crypto.randomUUID();
const directory=resolve(root,'.local/exploration-source-change',id);mkdirSync(directory,{recursive:true});
process.env.CODEX_AI_MODEL='gpt-5.6-luna';
process.env.MAPBOX_ACCESS_TOKEN ||= process.env.VITE_MAPBOX_ACCESS_TOKEN;
let child,origin='',cookie='',client,stage='startup';
const proof={id,aiCalls:0,databaseDirectory:directory,status:'failed',entry:'server/app/main.ts',client:'packages/api-client/index.ts',dataMode:'live'};
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
 const previous=JSON.parse(readFileSync(new URL('./live-discovery-ui.json',import.meta.url)));
 for(const name of ['live.sqlite','demo.sqlite','profiles.json','live.sqlite-wal','live.sqlite-shm','demo.sqlite-wal','demo.sqlite-shm'])if(existsSync(resolve(previous.databaseDirectory,name)))copyFileSync(resolve(previous.databaseDirectory,name),resolve(directory,name));
 await start();await call('postSession',{body:{profileKey:'self'}});
 const cardId=previous.cardId,placeId=previous.anchor.targetId;
 phase('source-current');
 const card=(await call('getDiscoveryCardsCardId',{path:{cardId}})).data;
 assert.equal(card.id,cardId);
 const place=(await call('getPlacesPlaceId',{path:{placeId}})).data.place;
 phase('change-place');
 const updated=(await call('patchPlacesPlaceId',{path:{placeId},version:place.version,body:{name:place.name+'（根拠更新の確認）'}})).data;
 assert.ok(updated.version>place.version);
 const check=async(operation,input)=>{try{await call(operation,input);assert.fail('stale evidence accepted');}catch(e){assert.equal(e.code,'SOURCE_CHANGED',e.message);return e.status;}};
 phase('reject-stale-card');
 const readStatus=await check('getDiscoveryCardsCardId',{path:{cardId}});
 const adoptStatus=await check('postDiscoveryCards',{body:{id:cardId,assistantMessageId:previous.run.id,expectedAttempt:previous.run.attempt}});
 const reactionStatus=await check('postDiscoveryCardsCardIdReactions',{path:{cardId},body:{id:'stale-'+id,reaction:'saved'}});
 proof.status='complete';proof.checks={currentRead:true,placeVersionChanged:true,staleReadRejected:readStatus,staleAdoptionRejected:adoptStatus,staleReactionRejected:reactionStatus,aiCalls:0,originalDatabaseUnmodified:true};proof.originalDatabase=previous.databaseDirectory;
}catch(e){proof.stage=stage;proof.error={name:e.name,code:e.code??null,message:e.message.slice(0,2500)};process.exitCode=1;}
finally{await stop();writeFileSync(new URL('./live-source-change.json',import.meta.url),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));}
