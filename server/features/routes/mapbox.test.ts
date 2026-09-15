import test from 'node:test';
import assert from 'node:assert/strict';
import { MapboxRoadProvider } from './mapbox.ts';
import { RoutesService, validateRouteInput } from './service.ts';
import type { Coordinates } from './types.ts';
const points: Coordinates[] = [[139.76,35.68],[139.77,35.69],[139.78,35.70]];
const reply = (a: Coordinates, b: Coordinates, distance=100.2, duration=60.6) => ({code:'Ok',routes:[{geometry:{type:'LineString',coordinates:[a,b]},distance,duration}]});

test('all legs keep provider geometry, exact joins, unrounded distance and per-leg rounded seconds', async () => {
  let calls=0;
  const provider=new MapboxRoadProvider('test-token', (async (url: URL) => {
    assert.equal(url.searchParams.get('alternatives'),'false'); assert.equal(url.searchParams.get('steps'),'false');
    return Response.json(reply(points[calls]!,points[++calls]!));
  }) as typeof fetch);
  const route=await provider.route(points,'walking');
  assert.equal(calls,2); assert.deepEqual(route.geometry.coordinates,points);
  assert.equal(route.distanceM,200.4); assert.equal(route.durationSec,122);
  assert.deepEqual(route.legs.map(l=>[l.fromIndex,l.toIndex]),[[0,1],[1,2]]);
});

test('second-leg NoRoute, 429, bad body and broken boundary fail the entire route', async () => {
  for (const [second, code] of [[()=>Response.json({code:'NoRoute'}),'ROUTE_NOT_FOUND'],[()=>new Response('',{status:429}),'RATE_LIMITED'],[()=>new Response('not-json'),'OUTPUT_INVALID'],[()=>Response.json(reply([139.7701,35.69],points[2]!)),'OUTPUT_INVALID']] as const) {
    let calls=0;
    const provider=new MapboxRoadProvider('test-token',(async()=> ++calls===1 ? Response.json(reply(points[0]!,points[1]!)) : second()) as typeof fetch);
    await assert.rejects(()=>provider.route(points,'walking'),{code}); assert.equal(calls,2);
  }
});

test('provider cancellation and unsupported conditions never silently fall back', async () => {
  const ac=new AbortController(); ac.abort();
  const provider=new MapboxRoadProvider('token',(async()=>{throw Error('must not fetch')}) as typeof fetch);
  await assert.rejects(()=>provider.route(points,'walking',ac.signal),{code:'CANCELLED'});
  await assert.rejects(()=>provider.route(points,'transit'),{code:'MODE_UNSUPPORTED'});
  for (const conditions of [{avoidStairs:true},{preferCovered:true},{departAt:0},{returnBy:1},{transitPassIds:['pass-1']}]) assert.throws(()=>validateRouteInput({waypoints:points.map(coordinates=>({kind:'point',coordinates,label:'地点'})),mode:'walking',title:'条件',conditions}),{code:'MODE_UNSUPPORTED'});
});

test('second-leg failure publishes no preview and executes no DB writes', async () => {
  let calls=0;
  const provider=new MapboxRoadProvider('token',(async()=>{
    calls++;
    if(calls===2)return Response.json({code:'NoRoute'});
    const body=reply(points[0]!,points[1]!);
    (body.routes[0] as any).legs=[{steps:[{geometry:body.routes[0]!.geometry,distance:100,duration:60,name:'道',maneuver:{location:points[0]!,type:'depart',instruction:'進みます'}}]}];
    return Response.json(body);
  }) as typeof fetch);
  const db={prepare(){throw Error('failure must never write')}} as any;
  const service=new RoutesService(db,work=>work(),provider);
  const context={personId:'self',dataMode:'live',requestId:'test',signal:new AbortController().signal} as const;
  await assert.rejects(()=>service.previewRoute(context,{waypoints:points.map(coordinates=>({kind:'point',coordinates,label:'地点'})),mode:'walking',title:'失敗'}),{code:'ROUTE_NOT_FOUND'});
  await assert.rejects(async()=>service.revalidatePreview(context,'missing'),{code:'RESULT_EXPIRED'});
});

test('comparison requests each leg once and returns only distinct complete candidates', async () => {
  let calls=0;
  const provider=new MapboxRoadProvider('token',(async(url: URL)=>{
    assert.equal(url.searchParams.get('alternatives'),'true');
    const start=points[calls]!,end=points[++calls]!;
    const r=reply(start,end).routes[0] as any;
    r.legs=[{steps:[{geometry:r.geometry,distance:100,duration:60,name:'道',maneuver:{location:start,type:'depart',instruction:'進みます'}}]}];
    return Response.json({code:'Ok',routes:[r]});
  }) as typeof fetch);
  const candidates=await provider.compare(points,'walking');
  assert.equal(calls,2); assert.equal(candidates.length,1); assert.equal(candidates[0]!.legs.length,2);
});

test('motorway avoidance sends exclude, records evidence, and refuses a provider violation', async () => {
  validateRouteInput({waypoints:points.slice(0,2).map(coordinates=>({kind:'point',coordinates,label:'地点'})),mode:'driving',title:'高速回避',conditions:{avoidMotorways:true}});
  for(const violation of [false,true]) {
    const provider=new MapboxRoadProvider('token',(async(url:URL)=>{
      assert.equal(url.searchParams.get('exclude'),'motorway');
      const r=reply(points[0]!,points[1]!).routes[0] as any;
      r.legs=[{notifications:violation?[{type:'violation',subtype:'motorway'}]:[],steps:[{geometry:r.geometry,distance:100,duration:60,name:'道',maneuver:{location:points[0]!,type:'depart',instruction:'進みます'}}]}];
      return Response.json({code:'Ok',routes:[r]});
    }) as typeof fetch);
    if(violation) await assert.rejects(()=>provider.route(points.slice(0,2),'driving',undefined,true,undefined,{avoidMotorways:true}),{code:'STATE_CONFLICT'});
    else { const route=await provider.route(points.slice(0,2),'driving',undefined,true,undefined,{avoidMotorways:true}); assert.equal(route.conditionEvaluations?.[0]?.status,'applied'); }
  }
});
