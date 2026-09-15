import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync,mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ValhallaCyclingProvider,parseValhalla } from './valhalla.ts';
import { RoutesService } from './service.ts';
import { openDatabases } from '../../db/connection.ts';
import { transaction } from '../../db/migrate.ts';
import { seedProfiles } from '../../core/session.ts';
import type { Coordinates,RouteInput } from './types.ts';
const records=JSON.parse(readFileSync(new URL('../../../docs/evidence/ROUTES/valhalla-probe.json',import.meta.url),'utf8')).results;
const points: Coordinates[]=[[139.767125,35.681236],[139.769,35.682],[139.771,35.684]];
const conditions={departAt:Date.parse('2026-09-16T10:00:00+09:00'),returnBy:Date.parse('2026-09-16T10:30:00+09:00'),timeZone:'Asia/Tokyo'};
const endpoint='https://valhalla1.openstreetmap.de/route';
const precisePoints:Coordinates[]=points.map(([lon,lat])=>[lon+0.0000001,lat-0.0000001]);
const input:RouteInput={mode:'cycling',title:'自転車',waypoints:precisePoints.map((coordinates,i)=>({kind:'point',coordinates,label:`地点${i}`})),conditions};
const context={personId:'cycling-person',dataMode:'live',requestId:'test',signal:new AbortController().signal} as const;
test('recorded actual cycling: whole route, times, comparison, CORE save/reopen and same receipt',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'routes-cycling-')),options={livePath:join(dir,'live.sqlite'),demoPath:join(dir,'demo.sqlite')};let dbs=openDatabases(options);
  let calls=0;
  const provider=new ValhallaCyclingProvider(endpoint,(async (_url,init)=>{calls++;const request=JSON.parse(init!.body as string);assert.equal(new Headers(init!.headers).get('X-Client-Id'),'sodateru-map-production-specs-routes-25');assert.equal(request.costing,'bicycle');assert.deepEqual(request.locations.map((p:any)=>[p.lon,p.lat]),points);assert.equal(request.date_time.value,'2026-09-16T10:00');return Response.json(records[0].body);}) as typeof fetch);
  try {
    seedProfiles(dbs,[{key:'self',id:context.personId,name:'確認用'}]);
    let service=new RoutesService(dbs.live,run=>transaction(dbs.live,run),provider);
    const candidates=await service.compareRoutes(context,input);assert.equal(calls,2);assert.equal(candidates.length,1);
    const p=candidates[0]!;assert.deepEqual(p.waypoints.map(w=>w.coordinates),precisePoints);assert.equal(p.provider,'valhalla');assert.equal(p.durationSec,411);assert.equal(p.legs.length,2);assert.equal(p.timing!.arrivalAt,conditions.departAt+411000);assert.equal(p.conditionEvaluations!.length,2);
    assert.throws(()=>service.revalidatePreview({...context,personId:'other'},p.previewId),{code:'NOT_FOUND'});
    const save={id:'cycling-route',previewId:p.previewId,title:'自転車の保存'};const saved=service.saveRoute(context,save).data;
    assert.deepEqual(saved.timing,p.timing);assert.deepEqual(saved.providerEvidence,p.providerEvidence);assert.equal(saved.sourceUrl,p.sourceUrl);
    dbs.close();dbs=openDatabases(options);service=new RoutesService(dbs.live,run=>transaction(dbs.live,run),provider);
    assert.deepEqual(service.getSavedRoute(context,save.id),saved);assert.deepEqual(service.saveRoute(context,save).data,saved);assert.equal(calls,2);
  }finally{dbs.close();rmSync(dir,{recursive:true,force:true});}
});
test('arrival anchor, impossible deadline, warning208 and incomplete/changed trip are not accepted',()=>{
  const arrival=parseValhalla(records[1].body,points,{returnBy:conditions.returnBy,timeZone:'Asia/Tokyo'},endpoint,'balanced',1);
  assert.equal(arrival.timing!.arrivalAt,conditions.returnBy);assert.equal(arrival.timing!.departureAt,conditions.returnBy-411000);
  assert.throws(()=>parseValhalla(records[0].body,points,{...conditions,returnBy:conditions.departAt+60000},endpoint,'balanced',1),{code:'STATE_CONFLICT'});
  assert.throws(()=>parseValhalla(records[2].body,points,conditions,endpoint,'balanced',1),{code:'MODE_UNSUPPORTED'});
  const incomplete=structuredClone(records[0].body);incomplete.trip.legs.pop();assert.throws(()=>parseValhalla(incomplete,points,conditions,endpoint,'balanced',1),{code:'OUTPUT_INVALID'});
  const changed=structuredClone(records[0].body);changed.trip.locations[1].original_index=0;assert.throws(()=>parseValhalla(changed,points,conditions,endpoint,'balanced',1),{code:'OUTPUT_INVALID'});
});
test('429, NoRoute, cancellation and unsupported cycling conditions remain failures',async()=>{
  for(const [response,code] of [[new Response('{}',{status:429}),'RATE_LIMITED'],[Response.json({error_code:442},{status:400}),'ROUTE_NOT_FOUND']] as const){const provider=new ValhallaCyclingProvider(endpoint,(async()=>response) as typeof fetch);await assert.rejects(provider.route(points,'cycling'),{code});}
  const provider=new ValhallaCyclingProvider(endpoint,(async()=>{throw Error('must not fetch')}) as typeof fetch);
  await assert.rejects(provider.route(points,'cycling',AbortSignal.abort()),{code:'CANCELLED'});
  await assert.rejects(provider.route(points,'cycling',undefined,true,undefined,{avoidMotorways:true}),{code:'MODE_UNSUPPORTED'});
});
