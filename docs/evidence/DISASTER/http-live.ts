import assert from 'node:assert/strict';
import { mkdtempSync,readFileSync,writeFileSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { serve } from '@hono/node-server';
import { createApp } from '../../../server/app/app.ts';
import { openDatabases } from '../../../server/db/connection.ts';
import { loadLocalIdentity,seedProfiles } from '../../../server/core/session.ts';
import type { ApiContract } from '../../../server/core/validation.ts';
import plugins from '../../../server/features/plugins/register.ts';
import places from '../../../server/features/places/register.ts';
import disaster from '../../../server/plugins/disaster/register.ts';

const dir=mkdtempSync(join(tmpdir(),'disaster-http-live-')),contractPath=join(dir,'contract.json');
execFileSync('mise',['exec','--','python3','docs/evidence/DISASTER/compose-contract.py',contractPath]);
const contract=JSON.parse(readFileSync(contractPath,'utf8')) as ApiContract;
const features=[plugins,places,disaster];
const identity=loadLocalIdentity(join(dir,'profiles.json'));
const open=()=>openDatabases({livePath:join(dir,'live.sqlite'),demoPath:join(dir,'demo.sqlite'),migrations:features.flatMap(f=>f.migrations??[])});
let databases=open();seedProfiles(databases,identity.profiles);
let server:ReturnType<typeof serve>|undefined,origin='';const cookies:Record<string,string>={};
const checks:string[]=[];let evidence:Record<string,unknown>={};
const realFetch=globalThis.fetch;let simulateOutage=false,providerCalls=0;
let holdProvider:Promise<void>|null=null,releaseProvider:(()=>void)|undefined,providerStarted:(()=>void)|undefined;
globalThis.fetch=async(input,init)=>{
 const url=String(input);
 if(url.startsWith('https://disaportaldata.gsi.go.jp/')||url.startsWith('https://cyberjapandata.gsi.go.jp/')||url.startsWith('https://www.jma.go.jp/')){
   providerCalls++;if(simulateOutage)throw new Error('EXPLICIT TEST FIXTURE: provider outage');
   if(holdProvider){providerStarted?.();await holdProvider;}
 }
 return realFetch(input,init);
};
async function start(){const app=createApp({databases,identity,features,contract});await new Promise<void>(resolve=>{server=serve({fetch:app.fetch,hostname:'127.0.0.1',port:0},address=>{origin=`http://127.0.0.1:${address.port}`;resolve();});});}
async function stop(){if(server)await new Promise<void>((resolve,reject)=>server!.close(error=>error?reject(error):resolve()));server=undefined;}
async function call(path:string,method='GET',body?:unknown,options:{mode?:string;key?:string;version?:number}={}){
 const mode=options.mode??'live',headers:Record<string,string>={'X-Request-Id':randomUUID(),'X-Data-Mode':mode};
 if(cookies[mode])headers.Cookie=cookies[mode];if(method==='POST')headers['Idempotency-Key']=options.key??randomUUID();
 if(options.version)headers['If-Match']=`"${options.version}"`;if(body!==undefined)headers['Content-Type']='application/json';
 const response=await fetch(origin+'/api/v1'+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
 const cookie=response.headers.get('set-cookie');if(cookie)cookies[mode]=cookie.split(';')[0]!;
 const text=await response.text();return {status:response.status,body:text?JSON.parse(text):null};
}
try{
 await start();assert.equal((await call('/session','POST',{profileKey:'self'})).status,201);checks.push('CORE real HTTP session');
 const search=await call('/place-candidates?q='+encodeURIComponent('江戸川区役所')+'&limit=1');
 assert.equal(search.status,200,JSON.stringify(search));const candidate=search.body.data.items[0];assert.equal(candidate.retention,'storable');
 const {longitude:lon,latitude:lat}=candidate.position;
 const settings={region:{id:('選択地点周辺: '+candidate.name).slice(0,200),bounds:[lon-0.025,lat-0.025,lon+0.025,lat+0.025]},layerIds:['flood-hazard','terrain','rainfall']};
 checks.push('PLACES real Nominatim search supplies selected point; user bounds are not administrative boundaries');
 const trial=await call('/plugins/disaster/trial','POST',{pluginVersion:'1.0.0',settings});
 assert.equal(trial.status,200,JSON.stringify(trial));assert.equal(trial.body.data.preview.dataKind,'mock');assert.equal((await call('/disaster')).body.data.result,null);
 checks.push('trial is explicitly mock and does not save disaster results');
 const installed=await call('/plugin-settings','POST',{id:'disaster',pluginVersion:'1.0.0',settings,enabled:true,confirmed:true,stateRevision:trial.body.data.stateRevision});
 assert.equal(installed.status,201,JSON.stringify(installed));let item=installed.body.data;
 const first=await call('/disaster/refresh','POST',{}, {key:'real-refresh',version:item.version});
 assert.equal(first.status,200,JSON.stringify(first));const snapshot=first.body.data.result;
 assert.equal(first.body.data.map.action,'apply');assert.deepEqual(snapshot.settings,settings);
 assert.ok(snapshot.layers.every((l:any)=>l.tiles.length>0&&l.tiles.every((t:any)=>t.status==='available')));
 assert.ok(snapshot.layers.find((l:any)=>l.layerId==='rainfall').noDataMask);
 checks.push('installed PLUGINS settings -> real flood/terrain/rainfall + no-data GeoJSON -> SQLite -> map apply');
 const beforeReplay=providerCalls;assert.equal((await call('/disaster/refresh','POST',{}, {key:'real-refresh',version:item.version})).body.data.result.resultId,snapshot.resultId);assert.equal(providerCalls,beforeReplay);
 checks.push('same-key completed replay does not refetch providers');
 await stop();databases.close();databases=open();await start();
 const restored=(await call('/disaster')).body.data;assert.deepEqual(restored.result,snapshot);assert.equal(restored.map.action,'apply');
 checks.push('HTTP server stop + SQLite close/reopen -> identical images, settings, region, timestamps and map apply');
 await call('/session','POST',{profileKey:'self'},{mode:'demo'});const demo=(await call('/disaster','GET',undefined,{mode:'demo'})).body.data;assert.equal(demo.result,null);assert.equal(demo.settings,null);
 checks.push('demo session cannot read live settings/results');
 simulateOutage=true;
 const failed=await call('/disaster/refresh','POST',{}, {key:'outage',version:item.version});assert.equal(failed.status,502,JSON.stringify(failed));
 const stale=(await call('/disaster')).body.data;assert.deepEqual(stale.result,snapshot);assert.equal(stale.stale,true);assert.equal(stale.lastAttempt.status,'failed');
 assert.equal(databases.live.prepare("SELECT count(*) n FROM core_requests WHERE state='pending'").get()!.n,0);
 checks.push('explicit outage fixture -> HTTP502, original snapshot retained/stale, diagnostic failure persisted, no pending receipt');
 const callsBefore=providerCalls;assert.equal((await call('/disaster/refresh','POST',{}, {key:'real-refresh',version:item.version})).status,200);assert.equal(providerCalls,callsBefore);
 const changedSettings={...settings,region:{id:'選択地点の東側周辺',bounds:[lon,lat-0.02,lon+0.04,lat+0.02]}};
 const revision=(await call('/plugin-state')).body.data.revision;
 const changed=await call('/plugin-settings/disaster','PATCH',{settings:changedSettings},{version:item.version});
 assert.equal(changed.status,200,JSON.stringify(changed));item=changed.body.data;assert.equal((await call('/disaster')).body.data.map.action,'clear');
 simulateOutage=false;
 const recovered=await call('/disaster/refresh','POST',{}, {key:'after-settings-change',version:item.version});assert.equal(recovered.status,200,JSON.stringify(recovered));
 assert.deepEqual(recovered.body.data.result.settings,changedSettings);assert.notEqual(recovered.body.data.result.resultId,snapshot.resultId);assert.equal(recovered.body.data.map.action,'apply');
 checks.push('settings PATCH clears old region; real refresh recovers and applies only new bounds');
 const started=new Promise<void>(resolve=>{providerStarted=resolve;});
 holdProvider=new Promise<void>(resolve=>{releaseProvider=resolve;});
 const lateRefresh=call('/disaster/refresh','POST',{}, {key:'delayed-real-refresh',version:item.version});
 await started;
 const disabled=await call('/plugin-settings/disaster','PATCH',{enabled:false},{version:item.version});assert.equal(disabled.status,200);item=disabled.body.data;
 releaseProvider!();holdProvider=null;providerStarted=undefined;
 const lateResult=await lateRefresh;assert.equal(lateResult.status,409,JSON.stringify(lateResult));
 const stopped=(await call('/disaster')).body.data;assert.equal(stopped.result.resultId,recovered.body.data.result.resultId);
 checks.push('real provider completion delayed until after HTTP disable -> SOURCE_CHANGED 409; no cache overwrite or map resurrection');assert.equal(stopped.map.action,'clear');assert.equal(stopped.map.ownerKey,`plugin:${item.installId}`);assert.ok(stopped.result);
 assert.equal((await call('/disaster/refresh','POST',{}, {key:'stopped',version:item.version})).status,409);
 const replayStopped=await call('/disaster/refresh','POST',{}, {key:'real-refresh',version:1});assert.equal(replayStopped.status,200);assert.equal(replayStopped.body.data.map.action,'clear');
 assert.equal((await call('/plugin-settings/disaster','DELETE',undefined,{version:item.version})).status,204);assert.equal((await call('/disaster')).body.data.map.action,'clear');
 checks.push('stop/delete retain cache, clear only install owner; stopped refresh rejected; old replay never restores map');
 evidence={status:'passed',verifiedAt:new Date().toISOString(),personId:identity.profiles[0]!.id,dataMode:'live',checks,
   selectedPlace:{resultId:search.body.data.resultId,candidateId:candidate.candidateId,expiresAt:search.body.data.expiresAt,sourceUrl:candidate.sourceUrl,attribution:candidate.attribution,position:candidate.position},
   firstSettings:settings,updatedSettings:changedSettings,resultId:snapshot.resultId,
   sources:snapshot.layers.map((l:any)=>({layerId:l.layerId,kind:l.kind,unit:l.unit,status:l.status,sourceUrl:l.sourceUrl,sourceUpdatedAt:l.sourceUpdatedAt,validAt:l.validAt,issuedAt:l.issuedAt,fetchedAt:l.fetchedAt,noDataMask:l.noDataMask?{...l.noDataMask,geojson:{type:'FeatureCollection',featureCount:l.noDataMask.geojson.features.length}}:null,tiles:l.tiles.map(({imageDataUrl,...tile}:any)=>({...tile,savedImageBytes:Buffer.from(imageDataUrl.split(',')[1],'base64').length}))})),
   limitations:['Map apply/clear DTO verified over real HTTP; actual Mapbox rendering and UI interaction are owned by A and separately pending.','Outage path deliberately uses an explicit test fixture; successful provider requests are real.']};
}catch(error){evidence={status:'failed',verifiedAt:new Date().toISOString(),checks,error:String(error)};process.exitCode=1;}
finally{releaseProvider?.();globalThis.fetch=realFetch;await stop();databases.close();writeFileSync(new URL('./http-live.json',import.meta.url),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify({status:evidence.status,checks:evidence.checks,error:evidence.error}));rmSync(dir,{recursive:true,force:true});}
