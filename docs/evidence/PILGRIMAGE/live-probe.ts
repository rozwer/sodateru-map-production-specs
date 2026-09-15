/** Live service integration; no provider doubles. Optional roots only inspect unmerged dependencies. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
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
const run=randomUUID(),paths={livePath:resolve(proofDirectory,`${run}-live.sqlite`),demoPath:resolve(proofDirectory,`${run}-demo.sqlite`)};
const dbs=openDatabases({...paths,migrations:[{id:'places/001',sql:readFileSync(resolve(routeRoot,'server/db/migrations/places/001-details.sql'),'utf8')},{id:'plugins/001',sql:readFileSync(resolve(pluginRoot,'server/db/migrations/plugins/001-plugins.sql'),'utf8')},{id:'pilgrimage/001',sql:readFileSync(new URL('../../../server/db/migrations/pilgrimage/001-pilgrimage.sql',import.meta.url),'utf8')}]});
const ctx={personId:`probe-${run}`,dataMode:'live' as const,requestId:randomUUID(),signal:new AbortController().signal};
try {
 dbs.live.prepare('INSERT INTO people(id,created_at,updated_at,name,bio) VALUES(?,?,?,?,?)').run(ctx.personId,Date.now(),Date.now(),'PILGRIMAGE実接続検証','');
 const registry=new PluginRegistry();registry.register(pilgrimageRelease);
 const plugins=new PluginService(new PluginStore(dbs.live,ctx),registry);
 const setting=await plugins.install({id:'pilgrimage',pluginVersion:'1.0.0',enabled:true,settings:{workQuery:'君の名は。',region:{id:'飛騨',bounds:[137,36,137.4,36.5]},mode:'walking'},confirmed:true,stateRevision:plugins.state().revision});
 const deps={search:searchSources,pluginState:getPluginState,places:placesService,routes:createRoutesService};
 const service=new PilgrimageService(dbs.live,deps);
 const search=await service.search(ctx,{id:`search-${run}`,workQuery:'君の名は。',region:{id:'飛騨',bounds:[137,36,137.4,36.5]}});
 assert.equal(search.relations.filter(r=>r.verificationStatus==='confirmed').length,4);
 const selection={searchId:search.id,orderedRelationIds:['hida-2','hida-1'],mode:'walking' as const,title:'飛騨古川駅 → 飛騨市図書館',settingsVersion:setting.version,acknowledgeUnverified:false};
 const preview=await service.preview(ctx,selection),plan=service.savePlan(ctx,`plan-${run}`,preview.id);
 assert.deepEqual(plan.orderedRelationIds,selection.orderedRelationIds);assert.equal(plan.route.provider,'mapbox-directions');assert.ok(plan.route.geometry.coordinates.length>2);assert.ok(plan.route.distanceM>0);assert.ok(plan.orderedPlaceIds.every(Boolean));
 assert.deepEqual(createRoutesService(dbs.live).getSavedRoute(ctx,plan.routeId,true).geometry,plan.route.geometry);
 const placesBefore=dbs.live.prepare('SELECT count(*) AS n FROM places').get(),routesBefore=dbs.live.prepare('SELECT count(*) AS n FROM saved_routes').get(),recordsBefore=dbs.live.prepare('SELECT count(*) AS n FROM records').get();
 assert.equal(service.overlay(ctx).features.length,3);
 plugins.patch('pilgrimage',setting.version,{enabled:false});assert.equal(service.overlay(ctx).visible,false);assert.equal(service.overlay(ctx).features.length,0);assert.deepEqual(service.getPlan(ctx,plan.id),plan);
 assert.deepEqual(dbs.live.prepare('SELECT count(*) AS n FROM places').get(),placesBefore);assert.deepEqual(dbs.live.prepare('SELECT count(*) AS n FROM saved_routes').get(),routesBefore);assert.deepEqual(dbs.live.prepare('SELECT count(*) AS n FROM records').get(),recordsBefore);
 const reopened=new DatabaseSync(paths.livePath);try{assert.deepEqual(new PilgrimageService(reopened,deps).getPlan(ctx,plan.id),plan);}finally{reopened.close();}
 const output={checkedAt:new Date().toISOString(),dependencies:{routeRoot,pluginRoot,integrated:routeRoot===resolve('.')&&pluginRoot===resolve('.')},assertions:{realOfficialSources:true,realNominatimPlaces:true,realMapboxRoute:true,orderRetained:true,sqliteReopen:true,disabledOverlayOnly:true,placesAndRoutesAndRecordsRetained:true},search,plan};
 writeFileSync(resolve(proofDirectory,'result.json'),JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify({result:resolve(proofDirectory,'result.json'),assertions:output.assertions,distanceM:plan.route.distanceM,durationSec:plan.route.durationSec,geometryPoints:plan.route.geometry.coordinates.length}));
}finally{dbs.close();}
