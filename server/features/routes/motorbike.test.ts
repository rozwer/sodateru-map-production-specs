import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync,mkdtempSync,rmSync,writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createMotorbikeRoutesService } from './index.ts';
import { ValhallaMotorbikeProvider } from './motorbike.ts';
import { openDatabases } from '../../db/connection.ts';
import { seedProfiles } from '../../core/session.ts';
import { assessCommonRoute } from '../../plugins/bike/route-evidence.ts';
import { defaultSettings } from '../../plugins/bike/domain.ts';
import { BikeService } from '../../plugins/bike/service.ts';
import { bikeMigration } from '../../plugins/bike/migration.ts';
import type { Coordinates,RouteInput } from './types.ts';
const archive=JSON.parse(readFileSync(new URL('../../../docs/evidence/BIKE/valhalla-live.json',import.meta.url),'utf8'));
const points:Coordinates[]=[[139.701,35.659],[139.712,35.665]];
const conditions={departAt:Date.parse('2026-09-15T13:30:00+09:00'),timeZone:'Asia/Tokyo',avoidMotorways:true};
const input:RouteInput={mode:'driving',title:'二輪経路',waypoints:points.map((coordinates,i)=>({kind:'point',coordinates,label:`地点${i}`})),conditions};
const context={personId:'motorbike-owner',dataMode:'live',requestId:'motorbike-evidence',signal:new AbortController().signal} as const;

test('formal motorbike factory → exact-shape trace → real BIKE assessment/save → another OS saved route read',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'motorbike-route-')),options={livePath:join(directory,'live.sqlite'),demoPath:join(directory,'demo.sqlite'),migrations:[bikeMigration]};
 let calls=0;
 const replay=createServer(async(req,res)=>{try{const chunks=[];for await(const chunk of req)chunks.push(chunk);const request=JSON.parse(Buffer.concat(chunks).toString());const record=archive.requests[req.url==='/route'?0:2];assert.equal(req.headers['x-client-id'],'sodateru-map-production-specs-routes-25');assert.deepEqual(request,record.request);calls++;res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(record.body));}catch(error){res.writeHead(500);res.end(String(error));}});
 await new Promise<void>(resolve=>replay.listen(0,'127.0.0.1',resolve));
 const previous=process.env.ROUTES_VALHALLA_URL;process.env.ROUTES_VALHALLA_URL=`http://127.0.0.1:${(replay.address() as import('node:net').AddressInfo).port}/route`;
 const dbs=openDatabases(options);
 try{
  seedProfiles(dbs,[{key:'self',id:context.personId,name:'二輪再生確認'}]);
  const routes=createMotorbikeRoutesService(dbs.live,{profile:'motorcycle'});
  const preview=await routes.previewRoute(context,input);assert.equal(calls,2);assert.equal(preview.mode,'driving');
  assert.equal(preview.segmentEvidence!.edges.length,52);assert.equal(preview.segmentEvidence!.edges.at(-1)!.endShapeIndex,79);
  assert.equal(preview.segmentEvidence!.routeFetchedAt,preview.fetchedAt);
  assert.equal(preview.conditionEvaluations!.find(e=>e.key==='avoidMotorways')!.status,'ignored');
  const observations=JSON.parse(readFileSync(new URL('../../../docs/evidence/BIKE/live-overpass.json',import.meta.url),'utf8'));
  const bike=new BikeService(dbs.live,()=>({installId:'replay-installation',version:1,enabled:true,visible:true,settings:defaultSettings}),{revalidatePreview:routes.revalidatePreview.bind(routes),saveRoute:routes.saveRoute.bind(routes),getSavedRoute:routes.getSavedRoute.bind(routes),assess:assessCommonRoute},{async search(){return {source:observations.source,places:observations.places,roads:observations.roadExamples}}});
  const search=await bike.search(context),assessment=bike.assessRoute(context,{previewId:preview.previewId,searchId:search.id});
  assert.equal(assessment.vehicleAssessment.status,'unknown');assert.equal(assessment.highwayAssessment.status,'unknown');assert.equal(assessment.adoptable,false);
  assert.equal(assessment.resultEvaluation!.requestedExclusion.status,'ignored');assert.equal(assessment.resultEvaluation!.motorwayAssessment.status,'verified');
  assert.throws(()=>bike.adopt(context,{id:'must-not-adopt',assessmentId:assessment.id,title:'拒否'}),{code:'STATE_CONFLICT'});
  assert.throws(()=>routes.revalidatePreview({...context,personId:'other'},preview.previewId),{code:'NOT_FOUND'});
  // A plain route snapshot save is distinct from BIKE's rejected compliant adoption.
  const save={id:'motorbike-snapshot',previewId:preview.previewId,title:'未適合の経路snapshot'},saved=routes.saveRoute(context,save).data;
  assert.deepEqual(saved.segmentEvidence,preview.segmentEvidence);assert.deepEqual(routes.saveRoute(context,save).data,saved);
  dbs.close();
  const script=`import {openDatabases} from './server/db/connection.ts';import {createRoutesService} from './server/features/routes/index.ts';const dbs=openDatabases(${JSON.stringify({livePath:options.livePath,demoPath:options.demoPath})});try{const c={personId:'motorbike-owner',dataMode:'live',requestId:'read',signal:new AbortController().signal};const s=createRoutesService(dbs.live);console.log(JSON.stringify({pid:process.pid,route:s.getSavedRoute(c,'motorbike-snapshot',true),replay:s.saveRoute(c,${JSON.stringify(save)}).data}));}finally{dbs.close()}`;
  // Migration objects cannot be serialized; existing DB reads need only base/core migrations.
  const child=spawnSync(process.execPath,['--experimental-transform-types','--input-type=module','-e',script],{cwd:fileURLToPath(new URL('../../../',import.meta.url)),encoding:'utf8',maxBuffer:4e6});
  assert.equal(child.status,0,child.stderr);const reread=JSON.parse(child.stdout);assert.notEqual(reread.pid,process.pid);assert.deepEqual(reread.route,saved);assert.deepEqual(reread.replay,saved);assert.equal(calls,2);
  writeFileSync(new URL('../../../docs/evidence/ROUTES/motorbike-connection.json',import.meta.url),JSON.stringify({result:'PASS',checkedAt:new Date().toISOString(),scope:'Archived real route/trace replay over local HTTP → formal ROUTES factory → real BIKE service and SQLite → another OS route read; installation and Overpass inputs are test fixtures. No fresh provider claim.',externalCalls:0,localProviderCalls:calls,profile:'motorcycle',checks:['same shape all 52 edges / 79 segments','warning208 ignored, motorway observation verified separately','Japanese vehicle/highway unknown, BIKE adoption rejected','owner binding and same-ID replay','plain route snapshot preserves all evidence after OS restart'],preview,saved,assessment},null,2)+'\n');
 }finally{if(dbs.live.isOpen)dbs.close();if(previous===undefined)delete process.env.ROUTES_VALHALLA_URL;else process.env.ROUTES_VALHALLA_URL=previous;await new Promise<void>(resolve=>replay.close(()=>resolve()));rmSync(directory,{recursive:true,force:true});}
});

test('trace shape/profile/coverage failures and 429 never issue a partial success',async()=>{
 for(const change of [(t:any)=>{t.shape=archive.requests[0].body.trip.legs[0].shape.slice(1)},(t:any)=>{t.edges[1].begin_shape_index++},(t:any)=>{t.edges[0].vehicle_type='motor_scooter'}]){
  let count=0;const trace=structuredClone(archive.requests[2].body);change(trace);
  const p=new ValhallaMotorbikeProvider('https://example.test/route',{profile:'motorcycle'},(async()=>Response.json(count++===0?archive.requests[0].body:trace)) as typeof fetch);
  await assert.rejects(p.route(points,'driving',undefined,true,undefined,conditions),{code:'OUTPUT_INVALID'});
 }
 const limited=new ValhallaMotorbikeProvider('https://example.test/route',{profile:'motorcycle'},(async()=>new Response('{}',{status:429})) as typeof fetch);
 await assert.rejects(limited.route(points,'driving',undefined,true,undefined,conditions),{code:'RATE_LIMITED'});
});


test('actual scooter trace keeps missing vehicle metadata and still rejects BIKE eligibility',async()=>{
 const trace=JSON.parse(readFileSync(new URL('../../../docs/evidence/ROUTES/motor-scooter-trace.json',import.meta.url),'utf8'));
 assert.equal(trace.httpStatus,200);let calls=0;
 const provider=new ValhallaMotorbikeProvider('https://example.test/route',{profile:'motor_scooter',topSpeed:30},(async(_url,init)=>{
  const request=JSON.parse(init!.body as string);assert.equal(request.costing,'motor_scooter');assert.equal(request.costing_options.motor_scooter.top_speed,30);
  if(calls++===0)return Response.json(archive.requests[1].body);
  assert.deepEqual(request,trace.request);return Response.json(trace.body);
 }) as typeof fetch);
 const route=await provider.route(points,'driving',undefined,true,undefined,conditions);
 assert.deepEqual(route.providerEvidence!.traceVehicleTypes,['null']);assert.equal(route.segmentEvidence!.profile,'motor_scooter');assert.equal(route.segmentEvidence!.options.topSpeed,30);
 const result=assessCommonRoute(context,{...route,mode:'driving',previewId:'test-scooter',retention:'storable',expiresAt:route.fetchedAt+900000},defaultSettings);
 assert.equal(result.vehicle.status,'unknown');assert.equal(result.highway.status,'unknown');assert.equal(result.resultEvaluation!.requestedExclusion.status,'ignored');assert.equal(calls,2);
});
