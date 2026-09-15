/** Cycling integration: actual providers, shared HTTP/session/DB; separate OS restart. */
import { DatabaseSync } from 'node:sqlite';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { createApiClient } from '../../../packages/api-client/index.ts';

const root=fileURLToPath(new URL('../../../',import.meta.url));
// Optional temporary composed contract until B integrates the generated catalog.
const composed=process.env.ROUTES_COMPOSED_CONTRACT;
if(process.env.ROUTES_EVIDENCE_SERVER==='1') {
  const originalFetch=globalThis.fetch;
  const exchanges:unknown[]=[];
  globalThis.fetch=async(input,init)=>{
    const response=await originalFetch(input,init);
    if(String(input)===(process.env.ROUTES_VALHALLA_URL??'https://valhalla1.openstreetmap.de/route')){
      exchanges.push({fetchedAt:Date.now(),endpoint:String(input),clientId:new Headers(init?.headers).get('X-Client-Id'),request:JSON.parse(String(init?.body)),status:response.status,response:await response.clone().json()});
      await writeFile(new URL('./cycling-provider-responses.json',import.meta.url),JSON.stringify(exchanges,null,2)+'\n');
    }
    return response;
  };
  const {serve}=await import('@hono/node-server');
  const {loadFeatures}=await import('../../../server/core/features.ts');
  const {openDatabases}=await import('../../../server/db/connection.ts');
  const {loadLocalIdentity,seedProfiles}=await import('../../../server/core/session.ts');
  const {createApp}=await import('../../../server/app/app.ts');
  const features=await loadFeatures(join(root,'server'));
  const databases=openDatabases({livePath:process.env.SODATERU_DB_PATH!,demoPath:process.env.SODATERU_DEMO_DB_PATH!,migrations:features.flatMap(f=>f.migrations??[])});
  const identity=loadLocalIdentity(process.env.SODATERU_PROFILES_PATH!);seedProfiles(databases,identity.profiles);
  const app=createApp({databases,identity,features,contract:JSON.parse(await readFile(composed!,'utf8'))});
  const server=serve({fetch:app.fetch,hostname:'127.0.0.1',port:0},info=>console.log(JSON.stringify({event:'ready',origin:`http://127.0.0.1:${info.port}`})));
  process.once('SIGTERM',()=>server.close(()=>{databases.close();process.exit(0)}));
  await new Promise(()=>{});
}
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
  const proc=spawn(process.execPath,['--experimental-transform-types',composed?'docs/evidence/ROUTES/cycling-http.ts':'server/app/main.ts'],{cwd:root,env:{...process.env,ROUTES_EVIDENCE_SERVER:composed?'1':'0',SODATERU_PORT:'0',SODATERU_HOST:'127.0.0.1',SODATERU_DB_PATH:join(directory,'live.sqlite'),SODATERU_DEMO_DB_PATH:join(directory,'demo.sqlite'),SODATERU_PROFILES_PATH:join(directory,'profiles.json')},stdio:['ignore','pipe','pipe']});
  child=proc;processIds.push(proc.pid!);
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
const checks:string[]=[];const processIds:number[]=[];const wait=()=>new Promise(resolve=>setTimeout(resolve,1200));
const counts=()=>{const db=new DatabaseSync(join(directory,'live.sqlite'),{readOnly:true});try{return {places:Number(db.prepare('SELECT count(*) AS n FROM places').get()!.n),routes:Number(db.prepare('SELECT count(*) AS n FROM saved_routes').get()!.n)}}finally{db.close()}};
try {
  await writeFile(join(directory,'profiles.json'),JSON.stringify({version:1,secret:'cycling-evidence-local-only-identity-secret',profiles:[{key:'self',id:'cycling-self',name:'自分'},{key:'other',id:'cycling-other',name:'別本人'}]}));
  await start();
  await client.request('postSession',{body:{profileKey:'self'},idempotencyKey:'cycling-session'});
  const search=await client.request('getPlaceCandidates',{query:{q:'東京駅',limit:3}});
  const candidate=search.data.items.find(c=>c.retention==='storable');assert.ok(candidate);
  const waypoints=[{kind:'candidate' as const,resultId:search.data.resultId,candidateId:candidate.candidateId},{kind:'point' as const,coordinates:[139.769,35.682] as [number,number],label:'経由地'},{kind:'point' as const,coordinates:[139.771,35.684] as [number,number],label:'目的地'}];
  const departAt=Date.parse('2026-09-16T10:00:00+09:00'),returnBy=Date.parse('2026-09-16T10:30:00+09:00');
  const body={waypoints,mode:'cycling' as const,title:'自転車・時刻条件',conditions:{departAt,returnBy,timeZone:'Asia/Tokyo'}};
  const preview=await client.request('postRouteSearches',{body,idempotencyKey:'cycling-preview'});
  assert.equal(preview.data.provider,'valhalla');assert.equal(preview.data.legs.length,2);
  assert.deepEqual(preview.data.waypoints[0]!.coordinates,[candidate.position.longitude,candidate.position.latitude]);
  assert.deepEqual((await client.request('postRouteSearches',{body,idempotencyKey:'cycling-preview'})).data,preview.data);
  assert.deepEqual(counts(),{places:0,routes:0});
  checks.push('actual Nominatim candidate → actual Valhalla cycling all two legs; same-key search replay retains fetchedAt/geometry');
  await wait();
  const comparison=await client.request('postRouteComparisons',{body,idempotencyKey:'cycling-compare'});
  assert.ok(comparison.data.items.length>=1&&comparison.data.items.length<=2);
  for(const item of comparison.data.items){
    assert.equal(item.provider,'valhalla');assert.equal(item.legs.length,2);
    assert.deepEqual(item.waypoints,preview.data.waypoints);
    assert.equal(item.durationSec,item.legs.reduce((s,l)=>s+l.durationSec,0));
    assert.equal(item.distanceM,item.legs.reduce((s,l)=>s+l.distanceM,0));
    assert.equal(item.timing!.departureAt,departAt);assert.ok(item.timing!.arrivalAt<=returnBy);
    assert.deepEqual(item.conditionEvaluations!.map(e=>e.key),['departAt','returnBy']);
    assert.ok(item.conditionEvaluations!.every(e=>e.provider===item.provider&&e.fetchedAt===item.fetchedAt));
    assert.deepEqual(item.providerEvidence!.warnings,[]);
  }
  assert.deepEqual((await client.request('postRouteComparisons',{body,idempotencyKey:'cycling-compare'})).data,comparison.data);
  const selected=comparison.data.items[0]!;
  const input={id:'cycling-comparison-saved',resultId:selected.resultId,title:'東京駅 自転車比較から保存'};
  const saved=await client.request('postSavedRoutes',{body:input,idempotencyKey:'cycling-save'});
  const placeId=saved.data.waypoints[0]!.placeId;assert.ok(placeId);
  for(const key of ['geometry','legs','distanceM','durationSec','fetchedAt','provider','sourceUrl','requestedConditions','conditionEvaluations','timing','providerEvidence'] as const)assert.deepEqual(saved.data[key],selected[key]);
  assert.deepEqual(counts(),{places:1,routes:1});
  const navigating=await client.request('patchSavedRoutesRouteId',{path:{routeId:input.id},body:{status:'navigating',currentLeg:1},version:saved.data.version});
  checks.push('two whole-trip strategies compared in original point order; selected geometry/timing/source/evaluation saved atomically with adopted place');
  // Rejections below must occur before any external provider call or save.
  await assert.rejects(client.request('postRouteSearches',{body:{...body,conditions:{...body.conditions,avoidStairs:true}},idempotencyKey:'cycling-stairs'}),(e:any)=>e.status===501);
  await client.request('postSession',{body:{profileKey:'other'},idempotencyKey:'cycling-other'});
  await assert.rejects(client.request('postSavedRoutes',{body:{...input,id:'other-cannot-save'},idempotencyKey:'cycling-other-save'}),(e:any)=>[403,404,409,410].includes(e.status));
  await assert.rejects(client.request('postRouteSearches',{body,idempotencyKey:'cycling-other-candidate'}),(e:any)=>[403,404,409,410].includes(e.status));
  client.setDataMode('demo');
  await client.request('postSession',{body:{profileKey:'self'},idempotencyKey:'cycling-demo'});
  await assert.rejects(client.request('postRouteSearches',{body,idempotencyKey:'cycling-demo-candidate'}),(e:any)=>[403,404,409,410].includes(e.status));
  await assert.rejects(client.request('getSavedRoutesRouteId',{path:{routeId:input.id}}),(e:any)=>e.status===404);
  client.setDataMode('live');
  await client.request('postSession',{body:{profileKey:'self'},idempotencyKey:'cycling-session'});
  assert.deepEqual(counts(),{places:1,routes:1});
  checks.push('stairs rejected; another person and demo cannot consume live person candidate/preview or saved route; no extra business rows');
  await wait();
  const arrivalBody={waypoints:[{kind:'stored' as const,placeId},...waypoints.slice(1)],mode:'cycling' as const,title:'到着指定',conditions:{returnBy,timeZone:'Asia/Tokyo'}};
  const arrival=await client.request('postRouteSearches',{body:arrivalBody,idempotencyKey:'cycling-arrival'});
  assert.equal(arrival.data.timing!.arrivalAt,returnBy);assert.ok(arrival.data.timing!.departureAt<returnBy);
  const arrivalInput={id:'cycling-arrival-saved',resultId:arrival.data.resultId,title:'到着指定保存'};
  const arrivalSaved=await client.request('postSavedRoutes',{body:arrivalInput,idempotencyKey:'cycling-arrival-save'});
  await stop();await start();
  assert.notEqual(processIds[0],processIds[1]);
  for(const entry of [{input,route:navigating.data,key:'cycling-save'},{input:arrivalInput,route:arrivalSaved.data,key:'cycling-arrival-save'}]){
    assert.deepEqual((await client.request('getSavedRoutesRouteId',{path:{routeId:entry.input.id}})).data,entry.route);
    assert.deepEqual((await client.request('postSavedRoutes',{body:entry.input,idempotencyKey:entry.key})).data,entry.route);
  }
  assert.deepEqual(counts(),{places:1,routes:2});
  checks.push('departure+deadline and arrive-by-only saved snapshots fully identical after separate OS process restart, including navigation/currentLeg, placeId, source timestamps and replay');
  const spec=JSON.parse(await readFile(composed??join(root,'docs/01_requirements/04_api/openapi.json'),'utf8'));
  const ajv=new Ajv({strict:false,allErrors:true});addFormats(ajv);
  for(const [schema,value] of [[spec.paths['/route-comparisons'].post.responses['200'].content['application/json'].schema,comparison],[spec.components.schemas.SavedRoute,navigating.data],[spec.components.schemas.SavedRoute,arrivalSaved.data]]){
    const valid=ajv.compile({...schema,components:spec.components});assert.ok(valid(value),JSON.stringify(valid.errors));
  }
  checks.push('actual comparison and both saved responses validate against official-composed feature schemas');
  const outcome={result:'PASS',checkedAt:new Date().toISOString(),entry:composed?'actual CORE createApp + all loadFeatures + temporary official-composed ROUTES fragment':'server/app/main.ts',generatedCatalogIntegrated:!composed,processIds,externalCalls:{nominatim:1,valhalla:4},clientHeader:'X-Client-Id: sodateru-map-production-specs-routes-25',endpoint:process.env.ROUTES_VALHALLA_URL??'https://valhalla1.openstreetmap.de/route',usage:'local competition/video demo only; 1.1s spacing; no external Discussion post',checks,comparison:comparison.data,saved:navigating.data,arrivalSaved:arrivalSaved.data};
  await writeFile(new URL('./cycling-http.json',import.meta.url),JSON.stringify(outcome,null,2)+'\n');
  console.log(JSON.stringify({result:outcome.result,entry:outcome.entry,externalCalls:outcome.externalCalls,checks},null,2));
} finally {await stop();await rm(directory,{recursive:true,force:true});}
