import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabases } from '../../db/connection.ts';
import { transaction } from '../../db/migrate.ts';
import { seedProfiles } from '../../core/session.ts';
import { RoutesService } from './service.ts';
import type { MapboxRoadProvider } from './mapbox.ts';
import type { RouteInput } from './types.ts';

const input: RouteInput = {mode:'walking',title:'東京駅周辺',waypoints:[{kind:'point',coordinates:[139.767125,35.681236],label:'東京駅'},{kind:'point',coordinates:[139.769,35.682],label:'経由地'},{kind:'point',coordinates:[139.771,35.684],label:'目的地'}]};
const context = {personId:'self-person',dataMode:'live',requestId:'test',signal:new AbortController().signal} as const;
const recorded=JSON.parse(readFileSync(new URL('../../../docs/evidence/ROUTES/live-provider.json',import.meta.url),'utf8')).routes[0];
// Recorded provider fixture only; DB, migrations, transaction and DTO are the real CORE/ROUTES code.
const fixtureProvider={async route(){ return {...structuredClone(recorded),fetchedAt:Date.now()}; }} as unknown as MapboxRoadProvider;

test('CORE SQLite persists complete route, names, steps and navigation across reopen; receipts survive deletion', async () => {
  const directory=mkdtempSync(join(tmpdir(),'routes-persistence-'));
  const options={livePath:join(directory,'live.sqlite'),demoPath:join(directory,'demo.sqlite')};
  let dbs=openDatabases(options);
  try {
    seedProfiles(dbs,[{key:'self',id:context.personId,name:'確認用本人'},{key:'other',id:'other-person',name:'別本人'}]);
    let service=new RoutesService(dbs.live,run=>transaction(dbs.live,run),fixtureProvider);
    const preview=await service.previewRoute(context,input);
    const create={id:'saved-route-1',previewId:preview.previewId,title:'保存経路'};
    const saved=service.saveRoute(context,create);
    assert.equal(saved.created,true); assert.equal(saved.data.legs.length,2);
    assert.deepEqual(saved.data.waypoints,preview.waypoints); assert.deepEqual(saved.data.geometry,preview.geometry);
    assert.deepEqual(saved.data.legs,preview.legs); assert.equal(saved.data.fetchedAt,preview.fetchedAt);
    assert.equal(service.saveRoute(context,create).created,false);
    assert.throws(()=>service.saveRoute(context,{...create,title:'別の入力'}),{code:'REQUEST_CONFLICT'});
    assert.throws(()=>service.getSavedRoute({...context,personId:'other-person'},create.id),{code:'NOT_FOUND'});
    assert.throws(()=>service.updateRoute(context,create.id,{status:'navigating'},2),{code:'VERSION_CONFLICT'});
    const navigating=service.updateRoute(context,create.id,{status:'navigating',currentLeg:1},1);
    assert.equal(navigating.version,2);
    assert.deepEqual(service.updateRoute(context,create.id,{status:'navigating',currentLeg:1},2),navigating);
    dbs.close(); dbs=openDatabases(options);
    service=new RoutesService(dbs.live,run=>transaction(dbs.live,run),fixtureProvider);
    assert.deepEqual(service.getSavedRoute(context,create.id),navigating);
    assert.deepEqual(service.saveRoute(context,create).data,navigating); // receipt before expired in-memory preview
    const demo=new RoutesService(dbs.demo,run=>transaction(dbs.demo,run),fixtureProvider);
    assert.throws(()=>demo.getSavedRoute({...context,dataMode:'demo'},create.id),{code:'NOT_FOUND'});
    const finished=service.updateRoute(context,create.id,{status:'finished'},2);
    assert.equal(finished.status,'finished'); assert.equal(finished.version,3);
    const shared=service.updateRoute(context,create.id,{visibility:'selected',sharedWith:['other-person']},3);
    assert.equal(service.getSavedRoute({...context,personId:'other-person'},create.id).version,shared.version);
    service.updateRoute(context,create.id,{visibility:'private',sharedWith:[]},4);
    assert.throws(()=>service.getSavedRoute({...context,personId:'other-person'},create.id),{code:'NOT_FOUND'});
    service.deleteRoute(context,create.id,5);
    assert.throws(()=>service.saveRoute(context,create),{code:'NOT_FOUND'});
    assert.equal(service.listSavedRoutes(context).items.length,0);
  } finally {dbs.close();rmSync(directory,{recursive:true,force:true});}
});
