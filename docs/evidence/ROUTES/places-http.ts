/** Real CORE HTTP entry, real Mapbox, real SQLite; restart the OS process before rereading. */
import { DatabaseSync } from 'node:sqlite';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { createApiClient } from '../../../packages/api-client/index.ts';

const root=fileURLToPath(new URL('../../../',import.meta.url));
const envPath=process.env.ROUTES_ENV_FILE;
if(!envPath)throw Error('Set ROUTES_ENV_FILE to the configured env file');
const env=await readFile(envPath,'utf8');
const token=env.match(/^MAPBOX_ACCESS_TOKEN=(.*)$/m)?.[1]?.trim().replace(/^[\'\"]|[\'\"]$/g,'');
if(!token)throw Error('MAPBOX_ACCESS_TOKEN is not configured');
const directory=await mkdtemp(join(tmpdir(),'routes-http-'));
let child:ChildProcess|undefined,origin='';
const cookies=new Map<string,string>();
const client=createApiClient({baseUrl:'http://route-test/api/v1',fetch:async(url,init)=>{
  const headers=new Headers(init?.headers);
  headers.set('Cookie',[...cookies].map(([k,v])=>`${k}=${v}`).join('; '));
  const u=new URL(String(url));
  const response=await fetch(origin+u.pathname+u.search,{...init,headers});
  for(const value of response.headers.getSetCookie()) {
    const cookie=value.split(';')[0]!,i=cookie.indexOf('=');
    cookies.set(cookie.slice(0,i),cookie.slice(i+1));
  }
  return response;
}});
async function start(){
  const proc=spawn(process.execPath,['--experimental-transform-types','server/app/main.ts'],{cwd:root,env:{...process.env,MAPBOX_ACCESS_TOKEN:token,SODATERU_PORT:'0',SODATERU_HOST:'127.0.0.1',SODATERU_DB_PATH:join(directory,'live.sqlite'),SODATERU_DEMO_DB_PATH:join(directory,'demo.sqlite'),SODATERU_PROFILES_PATH:join(directory,'profiles.json')},stdio:['ignore','pipe','pipe']});
  child=proc;
  await new Promise<void>((resolve,reject)=>{
    let output='',errors='';
    const timer=setTimeout(()=>{proc.kill('SIGTERM');reject(Error('HTTP server startup timeout'));},20000);
    proc.stderr!.on('data',data=>{errors+=String(data)});
    proc.once('error',error=>{clearTimeout(timer);reject(error)});
    proc.once('exit',code=>{clearTimeout(timer);if(!origin)reject(Error(`HTTP server exited ${code}: ${errors}`))});
    proc.stdout!.on('data',data=>{
      output+=String(data);
      for(const line of output.split('\n'))if(line.startsWith('{'))try{const event=JSON.parse(line);if(event.event==='ready'){origin=event.origin;clearTimeout(timer);resolve()}}catch{}
    });
  });
}
async function stop(){if(!child||child.exitCode!==null)return;const proc=child;await new Promise<void>(resolve=>{proc.once('exit',()=>resolve());proc.kill('SIGTERM')});origin='';}
const checks:string[]=[];
const counts=()=>{const db=new DatabaseSync(join(directory,'live.sqlite'),{readOnly:true});try{return {places:Number(db.prepare('SELECT count(*) AS n FROM places').get()!.n),routes:Number(db.prepare('SELECT count(*) AS n FROM saved_routes').get()!.n)}}finally{db.close()}};
try {
  await start();
  await client.request('postSession',{body:{profileKey:'self'},idempotencyKey:'places-route-session'});
  const search=await client.request('getPlaceCandidates',{query:{q:'東京駅',limit:3}});
  const candidate=search.data.items.find(c=>c.retention==='storable');
  assert.ok(candidate);assert.deepEqual(counts(),{places:0,routes:0});
  const waypoints=[{kind:'candidate' as const,resultId:search.data.resultId,candidateId:candidate.candidateId},{kind:'point' as const,coordinates:[139.769,35.682] as [number,number],label:'経由地'},{kind:'point' as const,coordinates:[139.771,35.684] as [number,number],label:'目的地'}];
  const preview=await client.request('postRouteSearches',{body:{waypoints,mode:'walking',title:'候補から経路'},idempotencyKey:'places-route-preview'});
  assert.equal(preview.data.waypoints[0]!.name,candidate.name);
  assert.deepEqual(preview.data.waypoints[0]!.coordinates,[candidate.position.longitude,candidate.position.latitude]);
  assert.equal(preview.data.legs.length,2);assert.deepEqual(counts(),{places:0,routes:0});
  checks.push('real Nominatim HTTP candidate resolved into actual Mapbox two-leg route; preview writes no place or route');
  const input={id:'route-from-candidate',resultId:preview.data.resultId,title:'東京駅・検索候補から保存'};
  const saved=await client.request('postSavedRoutes',{body:input,idempotencyKey:'places-route-save'});
  const placeId=saved.data.waypoints[0]!.placeId;assert.ok(placeId);
  assert.deepEqual(counts(),{places:1,routes:1});
  assert.deepEqual(saved.data.geometry,preview.data.geometry);assert.deepEqual(saved.data.legs,preview.data.legs);
  assert.equal(saved.data.fetchedAt,preview.data.fetchedAt);
  const places=await client.request('getPlaces',{query:{q:candidate.name}});
  assert.equal(places.items[0]!.id,placeId);
  assert.deepEqual((await client.request('postSavedRoutes',{body:input,idempotencyKey:'places-route-save'})).data,saved.data);
  assert.deepEqual(counts(),{places:1,routes:1});
  checks.push('route save adopts candidate and saves route in common transaction; same-key replay creates no duplicates');
  await stop();await start();
  assert.deepEqual((await client.request('getSavedRoutesRouteId',{path:{routeId:input.id}})).data,saved.data);
  assert.deepEqual((await client.request('postSavedRoutes',{body:input,idempotencyKey:'places-route-save'})).data,saved.data);
  checks.push('full saved snapshot and adopted placeId identical after OS process restart and save replay');
  const stored=await client.request('postRouteSearches',{body:{waypoints:[{kind:'stored',placeId},...waypoints.slice(1)],mode:'walking',title:'保存地点から再検索'},idempotencyKey:'stored-place-route'});
  assert.equal(stored.data.waypoints[0]!.placeId,placeId);assert.equal(stored.data.waypoints[0]!.name,candidate.name);
  assert.equal(stored.data.legs.length,2);assert.deepEqual(counts(),{places:1,routes:1});
  checks.push('persisted PLACES id resolves through real route HTTP after restart');
  const nearby=await client.request('getPlaceCandidates',{query:{category:'coffee',longitude:139.7671,latitude:35.6812}});
  const temporary=nearby.data.items.find(c=>c.retention==='temporary');assert.ok(temporary);
  const temporaryPreview=await client.request('postRouteSearches',{body:{waypoints:[{kind:'candidate',resultId:nearby.data.resultId,candidateId:temporary.candidateId},...waypoints.slice(1)],mode:'walking',title:'一時候補'},idempotencyKey:'temporary-route-preview'});
  await assert.rejects(client.request('postSavedRoutes',{body:{id:'must-not-save',resultId:temporaryPreview.data.resultId,title:'一時候補保存拒否'},idempotencyKey:'temporary-route-save'}),(error:any)=>error.status===409);
  assert.deepEqual(counts(),{places:1,routes:1});
  checks.push('actual Mapbox temporary candidate can preview but save rejects 409; no extra place or saved route');
  const outcome={result:'PASS',checkedAt:new Date().toISOString(),entry:'server/app/main.ts',processStarts:2,integratedDevelop:'e4da1c8',placesMerge:'2332231',routesMerge:'ddb8614',checks,source:{provider:candidate.provider,sourceUrl:candidate.sourceUrl,fetchedAt:candidate.fetchedAt},route:{id:saved.data.id,placeId,waypoints:saved.data.waypoints,legs:saved.data.legs.length,distanceM:saved.data.distanceM,durationSec:saved.data.durationSec,fetchedAt:saved.data.fetchedAt}};
  await writeFile(new URL('./places-http.json',import.meta.url),JSON.stringify(outcome,null,2)+'\n');console.log(JSON.stringify(outcome,null,2));
} finally {await stop();await rm(directory,{recursive:true,force:true});}
