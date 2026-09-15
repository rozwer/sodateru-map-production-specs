import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { openDatabases } from '../../db/connection.ts';
import { seedProfiles } from '../../core/session.ts';
import { DisasterStore } from './store.ts';
import { DisasterService } from './service.ts';
import { DisasterProvider } from './provider.ts';
import { defaultSettings, definitions } from './catalog.ts';
import { disasterRelease } from './release.ts';
import type { Layer } from './types.ts';
import type { PluginState } from '../../features/plugins/index.ts';

// Explicit state/provider fixtures exercise DISASTER transitions, not PLUGINS/real HTTP evidence.
function setup(){
 const path=mkdtempSync(join(tmpdir(),'disaster-lifecycle-'));
 const options={livePath:join(path,'live.sqlite'),demoPath:join(path,'demo.sqlite'),migrations:[{id:'disaster-001',sql:readFileSync(new URL('../../db/migrations/disaster/001-cache.sql',import.meta.url),'utf8')}]};
 let dbs=openDatabases(options);
 seedProfiles(dbs,[{key:'one',id:'one',name:'one'},{key:'two',id:'two',name:'two'}]);
 const context={personId:'one',dataMode:'live' as const,requestId:randomUUID(),signal:new AbortController().signal};
 const settings={...defaultSettings,layerIds:['terrain' as const]};
 const state={personId:'one',dataMode:'live',revision:'r1',appliedDeclarations:[],conflicts:[],resolutions:[],items:[{id:'disaster',installId:'install-one',version:1,enabled:true,pluginVersion:'1.0.0',settings,icon:'shield',createdAt:1,updatedAt:1,previousVersion:null,declarations:[],manifest:disasterRelease.manifest}],plugins:[{pluginId:'disaster',installId:'install-one',ownerKey:'plugin:install-one',installedVersion:'1.0.0',version:1,enabled:true,resolvedDeclarations:[{pluginId:'disaster',pluginVersion:'1.0.0',targetKey:'layer:disaster',property:'visibility',value:true}]}]} as PluginState;
 const layer:Layer={...definitions.terrain,layerId:'terrain',status:'available',fetchedAt:100,sourceUpdatedAt:90,sourceUpdatedAtMeaning:'fixture',validAt:null,issuedAt:null,bounds:settings.region.bounds,coverage:{envelope:settings.region.bounds,description:'fixture'},noDataMask:null,unknowns:['TEST FIXTURE'],tiles:[{z:10,x:909,y:403,bounds:settings.region.bounds,role:'data',status:'available',sourceUrl:'https://example.test/tile.png',fetchedAt:100,sourceUpdatedAt:90,sha256:'fixture',imageDataUrl:'data:image/png;base64,FIXTURE',error:null}]};
 let layers=[layer];
 const provider=new DisasterProvider();provider.fetchLayers=async()=>structuredClone(layers);
 const service=()=>new DisasterService(new DisasterStore(dbs.live,context),()=>structuredClone(state),provider,()=>1000);
 return {state,layer,context,provider,service,setLayers(value:Layer[]){layers=value;},reopen(){dbs.close();dbs=openDatabases(options);},other(){return new DisasterStore(dbs.live,{...context,personId:'two'}).read();},cleanup(){dbs.close();rmSync(path,{recursive:true,force:true});}};
}
test('persist/reopen, failed refresh retention, settings change and stop/delete clear only plugin owner',async()=>{
 const f=setup();try{
  const first=await f.service().refresh(1);assert.equal(first.failed,false);assert.equal(first.view.map.action,'apply');
  const id=first.view.result!.resultId;f.reopen();assert.equal(f.service().read().result!.resultId,id);assert.equal(f.other().result,null);
  f.setLayers([{...f.layer,status:'providerError',tiles:[]}]);
  const failed=await f.service().refresh(1);assert.equal(failed.failed,true);assert.equal(failed.view.result!.resultId,id);assert.equal(failed.view.stale,true);assert.equal(failed.view.lastAttempt!.status,'failed');
  f.state.items[0]!.settings={...defaultSettings,region:{id:'changed',bounds:[140,35,140.1,35.1]}};f.state.items[0]!.version++;
  assert.equal(f.service().read().map.action,'clear');
  f.state.items[0]!.enabled=false;f.state.plugins[0]!.enabled=false;assert.equal(f.service().read().map.action,'clear');
  f.state.items=[];f.state.plugins=[];const removed=f.service().read();assert.equal(removed.map.ownerKey,'plugin:install-one');assert.equal(removed.result!.resultId,id);
 }finally{f.cleanup();}
});
test('late provider completion after stop does not save or restore map output',async()=>{
 const f=setup();try{
  f.provider.fetchLayers=async()=>{f.state.items[0]!.enabled=false;f.state.plugins[0]!.enabled=false;f.state.revision='r2';return [f.layer];};
  await assert.rejects(f.service().refresh(1),{code:'SOURCE_CHANGED'});
  assert.equal(f.service().read().result,null);assert.equal(f.service().read().map.action,'clear');
 }finally{f.cleanup();}
});

test('a slower refresh cannot replace the result of a newer completed refresh',async()=>{
 const f=setup();try{
  const older=await f.service().prepareRefresh(1);
  const newer=await f.service().refresh(1);
  assert.throws(()=>older.commit(),{code:'SOURCE_CHANGED'});
  assert.equal(f.service().read().result!.resultId,newer.view.result!.resultId);
 }finally{f.cleanup();}
});
