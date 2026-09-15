import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {createApiClient} from '../../../packages/api-client/index.ts';
const root=fileURLToPath(new URL('../../../',import.meta.url)),id=crypto.randomUUID();
const directory=resolve(root,'.local/exploration-storable-route',id);mkdirSync(directory,{recursive:true});
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
 await start();await call('postSession',{body:{profileKey:'self'}});
 phase('storable-place-search');
 const found=(await call('getPlaceCandidates',{query:{q:'名古屋市科学館',limit:5}})).data;
 const candidate=found.items.find(p=>p.retention==='storable');assert.ok(candidate,'No storable candidate returned');
 const placeId='place-'+id;
 const place=(await call('postPlaces',{body:{id:placeId,mode:'candidate',resultId:found.resultId,candidateId:candidate.candidateId}})).data;
 phase('real-route');
 const preview=(await call('postRouteSearches',{body:{waypoints:[{kind:'point',coordinates:[136.9066,35.1709],label:'利用者が指定した名古屋駅付近の起点'},{kind:'stored',placeId:place.id}],mode:'walking',title:'保存場所への実徒歩経路'}})).data;
 assert.equal(preview.retention,'storable');
 assert.equal(preview.provider,'mapbox-directions');
 const routeId='route-'+id,key=crypto.randomUUID(),body={id:routeId,resultId:preview.resultId,title:'実APIから保存した徒歩経路'};
 phase('save-route');
 const saved=(await call('postSavedRoutes',{body,idempotencyKey:key})).data;
 phase('restart');await stop();await start();
 const restored=(await call('getSavedRoutesRouteId',{path:{routeId}})).data;
 assert.deepEqual(restored,saved);
 const replay=(await call('postSavedRoutes',{body,idempotencyKey:key})).data;assert.deepEqual(replay,saved);
 proof.status='complete';proof.checks={storableCandidate:true,placeAdopted:true,realMapboxRoute:true,storablePreview:true,explicitSave:true,processRestart:true,routeEqual:true,idempotentReplay:true};proof.place={id:place.id,provider:place.provider,sourceUrl:place.sourceUrl};proof.route={id:routeId,provider:preview.provider,waypointCount:preview.waypoints.length,retention:preview.retention};
}catch(e){proof.stage=stage;proof.error={name:e.name,code:e.code??null,message:e.message.slice(0,2500)};process.exitCode=1;}
finally{await stop();writeFileSync(new URL('./live-storable-route.json',import.meta.url),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));}
