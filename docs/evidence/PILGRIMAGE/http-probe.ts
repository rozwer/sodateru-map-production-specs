/** Live service integration; no provider doubles. Optional roots only inspect unmerged dependencies. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { serve } from '@hono/node-server';
import { once } from 'node:events';
import { createApp } from '../../../server/app/app.ts';
import { seedProfiles } from '../../../server/core/session.ts';
import { pilgrimageFeature } from '../../../server/plugins/pilgrimage/http.ts';
import { CommonError } from '../../../server/core/errors.ts';
import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import assert from 'node:assert/strict';
import { openDatabases } from '../../../server/db/connection.ts';
import { PilgrimageService } from '../../../server/plugins/pilgrimage/service.ts';
import { searchSources } from '../../../server/plugins/pilgrimage/sources.ts';
import { pilgrimageRelease } from '../../../server/plugins/pilgrimage/plugin.ts';
const routeRoot=resolve(process.env.PILGRIMAGE_ROUTES_ROOT??'.'),pluginRoot=resolve(process.env.PILGRIMAGE_PLUGINS_ROOT??'.');
const load=(root:string,file:string)=>import(pathToFileURL(resolve(root,file)).href);
const {createRoutesService}=await load(routeRoot,'server/features/routes/index.ts');
const {placesService}=await load(routeRoot,'server/features/places/service.ts');
const {PluginRegistry,PluginService,PluginStore,getPluginState}=await load(pluginRoot,'server/features/plugins/index.ts');
const proofDirectory=resolve(process.env.PILGRIMAGE_PROBE_DIR??'.local/pilgrimage-live');mkdirSync(proofDirectory,{recursive:true});
let server:any;
const run=randomUUID(),paths={livePath:resolve(proofDirectory,`${run}-live.sqlite`),demoPath:resolve(proofDirectory,`${run}-demo.sqlite`)};
const dbs=openDatabases({...paths,migrations:[{id:'places/001',sql:readFileSync(resolve(routeRoot,'server/db/migrations/places/001-details.sql'),'utf8')},{id:'plugins/001',sql:readFileSync(resolve(pluginRoot,'server/db/migrations/plugins/001-plugins.sql'),'utf8')},{id:'pilgrimage/001',sql:readFileSync(new URL('../../../server/db/migrations/pilgrimage/001-pilgrimage.sql',import.meta.url),'utf8')}]});
const ctx={personId:`probe-${run}`,dataMode:'live' as const,requestId:randomUUID(),signal:new AbortController().signal};
try {
 const identity={version:1 as const,secret:randomUUID()+randomUUID(),profiles:[{key:'self',id:ctx.personId,name:'実HTTP検証'},{key:'other',id:'other-'+run,name:'別本人'}]};seedProfiles(dbs,identity.profiles);
 const registry=new PluginRegistry();registry.register(pilgrimageRelease);
 const plugins=new PluginService(new PluginStore(dbs.live,ctx),registry);
 const setting=await plugins.install({id:'pilgrimage',pluginVersion:'1.0.0',enabled:true,settings:{workQuery:'君の名は。',region:{id:'飛騨',bounds:[137,36,137.4,36.5]},mode:'walking'},confirmed:true,stateRevision:plugins.state().revision});
 const deps={search:searchSources,pluginState:getPluginState,places:placesService,routes:createRoutesService};
 const service=new PilgrimageService(dbs.live,deps);
 const spec=JSON.parse(readFileSync(new URL('../../../docs/01_requirements/04_api/openapi.json',import.meta.url),'utf8'));
 const fragment=JSON.parse(readFileSync(new URL('../../../docs/01_requirements/04_api/fragments/PILGRIMAGE.json',import.meta.url),'utf8'));
 Object.assign(spec.components.schemas,fragment.schemas);
 for(const operation of fragment.operations) {spec.paths[operation.path]??={};spec.paths[operation.path][operation.method]=operation;}
 const notTested=()=>{throw new CommonError('PROVIDER_UNAVAILABLE','この検証はAI実行を対象としません。');};
 const feature=pilgrimageFeature(db=>new PilgrimageService(db,deps),{createConversation:notTested,startRun:async()=>notTested(),getRun:async()=>notTested()});
 const app=createApp({databases:dbs,identity,features:[feature],contract:spec});
 server=serve({fetch:app.fetch,port:0,hostname:'127.0.0.1'});if(!server.listening)await once(server,'listening');
 const origin=`http://127.0.0.1:${server.address().port}/api/v1`;
 let cookie='';const responses:any[]=[];
 async function call(method:string,path:string,body?:any,key=randomUUID(),version?:number) {
  const headers:Record<string,string>={'X-Request-Id':randomUUID(),'X-Data-Mode':'live',Cookie:cookie};if(body!==undefined)headers['Content-Type']='application/json';if(method==='POST')headers['Idempotency-Key']=key;if(version)headers['If-Match']=`"${version}"`;
  const response=await fetch(origin+path,{method,headers,...(body!==undefined?{body:JSON.stringify(body)}:{})});
  if(response.headers.get('set-cookie'))cookie=response.headers.get('set-cookie')!.split(';')[0]!;
  const result=await response.json();responses.push({method,path,status:response.status,error:result.error?.code??null});
  return {status:response.status,body:result};
 }
 assert.equal((await call('POST','/session',{profileKey:'self'})).status,201);
 const searchResponse=await call('POST','/plugins/pilgrimage/searches',{id:`search-${run}`,workQuery:'君の名は。',region:{id:'飛騨',bounds:[137,36,137.4,36.5]}},`search-${run}`);
 assert.equal(searchResponse.status,201,JSON.stringify(searchResponse.body));const search=searchResponse.body.data;
 assert.equal(search.relations.filter(r=>r.verificationStatus==='confirmed').length,4);
 const selection={searchId:search.id,orderedRelationIds:['hida-2','hida-1'],mode:'walking' as const,title:'飛騨古川駅 → 飛騨市図書館',settingsVersion:setting.version,acknowledgeUnverified:false};
 const bad=await call('POST','/plugins/pilgrimage/previews',{...selection,mode:'cycling'});assert.equal(bad.status,422);
 const previewResponse=await call('POST','/plugins/pilgrimage/previews',selection);assert.equal(previewResponse.status,201,JSON.stringify(previewResponse.body));const preview=previewResponse.body.data;
 const planKey=randomUUID(),planInput={id:`plan-${run}`,previewId:preview.id};
 const planResponse=await call('POST','/plugins/pilgrimage/plans',planInput,planKey);assert.equal(planResponse.status,201,JSON.stringify(planResponse.body));const plan=planResponse.body.data;
 assert.deepEqual((await call('GET',`/plugins/pilgrimage/plans/${plan.id}`)).body.data,plan);
 assert.equal((await call('POST','/plugins/pilgrimage/plans',planInput,planKey)).status,200);
 assert.equal((await call('POST','/plugins/pilgrimage/plans',{...planInput,id:'changed'},planKey)).status,409);
 dbs.live.prepare("INSERT INTO records(id,created_at,updated_at,person_id,kind,time_precision,body,purposes_json,activities_json,impression,period_answers_json,bookmarked,use_for_suggestions,visibility,shared_with_json) VALUES(?,?,?,?,'memo','unknown','保持確認の本人記録','[]','[]','','{}',0,0,'private','[]')").run('record-'+run,Date.now(),Date.now(),ctx.personId);
 assert.deepEqual(plan.orderedRelationIds,selection.orderedRelationIds);assert.equal(plan.route.provider,'mapbox-directions');assert.ok(plan.route.geometry.coordinates.length>2);assert.ok(plan.route.distanceM>0);assert.ok(plan.orderedPlaceIds.every(Boolean));
 assert.deepEqual(createRoutesService(dbs.live).getSavedRoute(ctx,plan.routeId,true).geometry,plan.route.geometry);
 const placesBefore=dbs.live.prepare('SELECT count(*) AS n FROM places').get(),routesBefore=dbs.live.prepare('SELECT count(*) AS n FROM saved_routes').get(),recordsBefore=dbs.live.prepare('SELECT count(*) AS n FROM records').get();
 assert.equal(service.overlay(ctx).features.length,3);
 plugins.patch('pilgrimage',setting.version,{enabled:false});assert.equal((await call('GET','/plugins/pilgrimage/overlay')).body.data.visible,false);assert.deepEqual((await call('GET',`/plugins/pilgrimage/plans/${plan.id}`)).body.data,plan);assert.equal((await call('POST','/plugins/pilgrimage/plans',planInput,planKey)).status,200);assert.equal(service.overlay(ctx).visible,false);assert.equal(service.overlay(ctx).features.length,0);assert.deepEqual(service.getPlan(ctx,plan.id),plan);
 assert.deepEqual(dbs.live.prepare('SELECT count(*) AS n FROM places').get(),placesBefore);assert.deepEqual(dbs.live.prepare('SELECT count(*) AS n FROM saved_routes').get(),routesBefore);assert.deepEqual(dbs.live.prepare('SELECT count(*) AS n FROM records').get(),recordsBefore);
 const reopened=new DatabaseSync(paths.livePath);try{assert.deepEqual(new PilgrimageService(reopened,deps).getPlan(ctx,plan.id),plan);}finally{reopened.close();}
 const ownCookie=cookie;assert.equal((await call('POST','/session',{profileKey:'other'})).status,201);assert.equal((await call('GET',`/plugins/pilgrimage/plans/${plan.id}`)).status,404);cookie=ownCookie;
 const output={httpResponses:responses,checkedAt:new Date().toISOString(),dependencies:{routeRoot,pluginRoot,integrated:routeRoot===resolve('.')&&pluginRoot===resolve('.')},assertions:{realHttp:true,authenticatedIsolation:true,postReplay:true,inputValidation:true,realOfficialSources:true,realNominatimPlaces:true,realMapboxRoute:true,orderRetained:true,sqliteReopen:true,disabledOverlayOnly:true,placesAndRoutesAndRecordsRetained:true},search,plan};
 writeFileSync(resolve(proofDirectory,'http-result.json'),JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify({result:resolve(proofDirectory,'http-result.json'),assertions:output.assertions,distanceM:plan.route.distanceM,durationSec:plan.route.durationSec,geometryPoints:plan.route.geometry.coordinates.length}));
}finally{if(server)await new Promise<void>(resolve=>server.close(()=>resolve()));dbs.close();}
