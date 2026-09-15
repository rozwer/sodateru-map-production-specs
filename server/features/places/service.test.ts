import {test} from "node:test";
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {mkdtempSync,readFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {PlacesService,listPlaces,validateSearch} from "./service.ts";
import {getPlace} from "./repository.ts";
import {candidateResultDto} from "./http-dto.ts";
import {nearbyBounds,parseNominatim,parseMapbox} from "./providers.ts";
import {preparePlaceUpdate} from "./update.ts";
import {getPlaceMetadata} from "./metadata.ts";
import {getPlaceDetail} from "./detail.ts";
const context=(personId="person-a",dataMode:"live"|"demo"="live")=>({personId,dataMode,requestId:"00000000-0000-4000-8000-000000000001",signal:new AbortController().signal});
// Minimal table fixture for isolated business SQL checks; not CORE migration/runtime evidence.
function fixture(path=":memory:"){
 const db=new DatabaseSync(path);
 db.exec(`PRAGMA foreign_keys=ON;
 CREATE TABLE people(id TEXT PRIMARY KEY);
 INSERT INTO people VALUES ('person-a'),('person-b');
 CREATE TABLE places(id TEXT PRIMARY KEY,name TEXT NOT NULL,address TEXT,longitude REAL,latitude REAL,categories_json TEXT NOT NULL DEFAULT '[]',provider TEXT,external_id TEXT,building_key TEXT,source_url TEXT,attribution TEXT,fetched_at INTEGER,version INTEGER,created_at INTEGER,updated_at INTEGER,UNIQUE(provider,external_id));
 CREATE TABLE creation_receipts(person_id TEXT,operation TEXT,target_id TEXT,input_hash TEXT,result_type TEXT,result_id TEXT,created_at INTEGER,PRIMARY KEY(person_id,operation,target_id));`);
 db.exec(readFileSync(new URL("../../db/migrations/places/001-details.sql",import.meta.url),"utf8"));
 db.exec(readFileSync(new URL("../../db/migrations/places/002-presentation.sql",import.meta.url),"utf8"));
 return db;
}
function tx<T>(db:DatabaseSync,fn:()=>T){db.exec("BEGIN IMMEDIATE");try{const value=fn();db.exec("COMMIT");return value;}catch(error){db.exec("ROLLBACK");throw error;}}
const manual=(id:string,name="Cafe Ａ")=>({id,mode:"manual" as const,name,position:{longitude:139.7,latitude:35.6},address:"東京",buildingKey:null});
const code=(name:string)=>(error:any)=>error.code===name;
const osm={osm_type:"node",osm_id:123,lat:"35.6",lon:"139.7",name:"駅前カフェ",display_name:"駅前カフェ, 東京",category:"amenity",type:"cafe"};
test("saved priority, HTTP DTO, expiry retry, persistence and deletion",async()=>{
 const directory=mkdtempSync(join(tmpdir(),"places-unit-")),path=join(directory,"test.sqlite");
 let db=fixture(path),now=1000;const service=new PlacesService(()=>now),ctx=context();
 try{
   const first=tx(db,()=>service.adopt(ctx,db,manual("place-one"))).place;
   const result=await service.search(ctx,db,{q:"cafe a"});
   assert.equal(result.items.length,1);assert.equal(result.items[0]!.placeId,first.id);
   assert.deepEqual(candidateResultDto(result).items[0]!.position,{longitude:139.7,latitude:35.6});
   const cancelled=new AbortController();cancelled.abort();
   await assert.rejects(service.search({...ctx,signal:cancelled.signal},db,{q:"cafe a"}),(error:any)=>error.name==="AbortError");
   const input={id:"adoption-one",mode:"candidate" as const,resultId:result.resultId,candidateId:"candidate-1"};
   assert.equal(tx(db,()=>service.adopt(ctx,db,input)).place.id,first.id);
   now+=16*60_000;
   db.prepare("UPDATE places SET name='訂正後',version=2 WHERE id=?").run(first.id);
   assert.equal(tx(db,()=>service.adopt(ctx,db,input)).place.name,"訂正後");
   assert.throws(()=>tx(db,()=>service.adopt(ctx,db,{...input,candidateId:"candidate-2"})),code("REQUEST_CONFLICT"));
   db.close();db=new DatabaseSync(path);
   assert.equal(tx(db,()=>new PlacesService(()=>now).adopt(ctx,db,input)).place.version,2);
   db.prepare("DELETE FROM places WHERE id=?").run(first.id);
   assert.throws(()=>tx(db,()=>service.adopt(ctx,db,input)),code("NOT_FOUND"));
   assert.equal((db.prepare("SELECT count(*) AS n FROM places").get() as any).n,0);
 }finally{db.close();rmSync(directory,{recursive:true,force:true});}
});
test("Nominatim candidates do not insert, owner/mode binding, duplicate provider adopt",async()=>{
 const db=fixture(),service=new PlacesService(),ctx=context(),originalFetch=globalThis.fetch;
 globalThis.fetch=async()=>new Response(JSON.stringify([osm]));
 try{
  const result=await service.search(ctx,db,{q:"駅前"});
  assert.equal((db.prepare("SELECT count(*) AS n FROM places").get() as any).n,0);
  assert.equal(result.items[0]!.sourceUrl,"https://www.openstreetmap.org/node/123");
  assert.throws(()=>service.resolveCandidate(context("person-b"),result.resultId,"candidate-1"),code("NOT_FOUND"));
  assert.throws(()=>service.resolveCandidate(context("person-a","demo"),result.resultId,"candidate-1"),code("NOT_FOUND"));
  const input={id:"adopt-a",mode:"candidate" as const,resultId:result.resultId,candidateId:"candidate-1"};
  assert.equal(tx(db,()=>service.adopt(ctx,db,input)).created,true);
  assert.equal(tx(db,()=>service.adopt(ctx,db,{...input,id:"adopt-b"})).place.id,"adopt-a");
  assert.equal((db.prepare("SELECT count(*) AS n FROM places").get() as any).n,1);
 }finally{globalThis.fetch=originalFetch;db.close();}
});
test("temporary Mapbox candidate adoption is rejected and writes nothing",async()=>{
 const db=fixture(),service=new PlacesService(),ctx=context(),originalFetch=globalThis.fetch,token=process.env.MAPBOX_ACCESS_TOKEN;
 process.env.MAPBOX_ACCESS_TOKEN="test-token";
 globalThis.fetch=async()=>new Response(JSON.stringify({features:[{geometry:{coordinates:[139.7,35.6]},properties:{name:"Cafe",mapbox_id:"mapbox-id"}}]}));
 try{
  const result=await service.search(ctx,db,{category:"coffee",longitude:139.7,latitude:35.6});
  assert.equal(result.items[0]!.retention,"temporary");
  assert.throws(()=>tx(db,()=>service.adopt(ctx,db,{id:"temporary",mode:"candidate",resultId:result.resultId,candidateId:"candidate-1"})),code("REQUEST_CONFLICT"));
  assert.equal((db.prepare("SELECT count(*) AS n FROM places").get() as any).n,0);
  assert.equal((db.prepare("SELECT count(*) AS n FROM creation_receipts").get() as any).n,0);
 }finally{globalThis.fetch=originalFetch;if(token===undefined)delete process.env.MAPBOX_ACCESS_TOKEN;else process.env.MAPBOX_ACCESS_TOKEN=token;db.close();}
});
test("provider validation, dateline and query/cursor boundaries",()=>{
 assert.deepEqual(parseNominatim([{...osm,lat:"NaN"},{...osm,osm_type:"invalid"}],1),[]);
 assert.throws(()=>parseNominatim({},1),code("OUTPUT_INVALID"));
 assert.deepEqual(parseMapbox({features:[{properties:{name:"missing geometry"}}]},1),[]);
 assert.equal(nearbyBounds([179.999,35]).length,2);
 for(const box of nearbyBounds([-179.999,-85])){assert.ok(box[0]!>=-180&&box[2]!<=180&&box[0]!<box[2]!);assert.ok(box[1]!>=-85);}
 assert.throws(()=>validateSearch({category:"coffee",longitude:0,latitude:86}),code("INVALID_INPUT"));
 assert.throws(()=>validateSearch({category:"coffee",longitude:0,latitude:0,limit:5}),code("INVALID_INPUT"));
 const db=fixture(),ctx=context(),service=new PlacesService();
 try{
  tx(db,()=>service.adopt(ctx,db,manual("a","A")));tx(db,()=>service.adopt(ctx,db,manual("b","B")));
  const page=listPlaces(ctx,db,{limit:"1"});assert.equal(page.items[0]!.id,"a");
  assert.equal(listPlaces(ctx,db,{limit:"1",cursor:page.nextCursor!}).items[0]!.id,"b");
  assert.throws(()=>listPlaces(context("person-b"),db,{limit:"1",cursor:page.nextCursor!}),code("INVALID_INPUT"));
 }finally{db.close();}
});
test("manual correction, unknown details, version and authorization",async()=>{
 const db=fixture(),ctx=context(),service=new PlacesService();
 try{
  tx(db,()=>service.adopt(ctx,db,manual("place")));
  assert.equal(getPlaceMetadata(db,"place").openingHours,null);
  assert.deepEqual(getPlaceMetadata(db,"place").entrances,[]);
  await assert.rejects(preparePlaceUpdate(ctx,db,"place",{name:"X"},1,()=>false),code("FORBIDDEN"));
  const commit=await preparePlaceUpdate(ctx,db,"place",{name:"訂正"},1,()=>true);
  assert.equal(tx(db,commit).version,2);
  assert.deepEqual(getPlaceMetadata(db,"place").correctedFields,["name"]);
  await assert.rejects(preparePlaceUpdate(ctx,db,"place",{name:"古い版"},1,()=>true),code("VERSION_CONFLICT"));
  tx(db,await preparePlaceUpdate(ctx,db,"place",{resetFields:["name"]},2,()=>true));
  assert.equal(getPlace(db,"place").name,"Cafe Ａ");
 }finally{db.close();}
});

test("place detail retains the place when one record source fails",async()=>{
 const db=fixture(),ctx=context(),service=new PlacesService();
 try{
  tx(db,()=>service.adopt(ctx,db,manual("detail")));
  const detail=await getPlaceDetail(ctx,db,"detail",{allRecords(_context,query){if(query.audience==="visible")throw new Error("private diagnostic must not leak");return [];},ownVisits(){return [];}});
  assert.equal(detail.place.id,"detail");assert.equal(detail.ownRecords.status,"ready");assert.equal(detail.visits.status,"ready");assert.equal(detail.sharedRecords.status,"failed");
  assert.ok(!JSON.stringify(detail).includes("private diagnostic"));
 }finally{db.close();}
});

test("external refresh preserves corrections and failure preserves saved values",async()=>{
 const db=fixture(),ctx=context(),service=new PlacesService(),originalFetch=globalThis.fetch;
 globalThis.fetch=async()=>new Response(JSON.stringify([osm]));
 try{
  const result=await service.search(ctx,db,{q:"refresh-check"});
  tx(db,()=>service.adopt(ctx,db,{id:"refresh",mode:"candidate",resultId:result.resultId,candidateId:"candidate-1"}));
  tx(db,await preparePlaceUpdate(ctx,db,"refresh",{name:"本人の訂正"},1,()=>true));
  globalThis.fetch=async()=>new Response(JSON.stringify([{...osm,name:"新しい外部名",display_name:"新しい住所",extratags:{opening_hours:"Mo-Fr 09:00-18:00",description:"Provider description",image:"https://example.org/image.jpg"}}]));
  tx(db,await preparePlaceUpdate(ctx,db,"refresh",{refreshExternal:true},2,()=>true));
  assert.equal(getPlace(db,"refresh").name,"本人の訂正");assert.equal(getPlace(db,"refresh").address,"新しい住所");
  assert.equal(getPlaceMetadata(db,"refresh").openingHours?.verificationStatus,"unverified");
  assert.equal(getPlaceMetadata(db,"refresh").description?.text,"Provider description");assert.equal(getPlaceMetadata(db,"refresh").photos[0]?.attribution,null);
  tx(db,await preparePlaceUpdate(ctx,db,"refresh",{resetFields:["name"]},3,()=>true));
  assert.equal(getPlace(db,"refresh").name,"新しい外部名");
  const before=JSON.stringify({place:getPlace(db,"refresh"),metadata:getPlaceMetadata(db,"refresh")});
  globalThis.fetch=async()=>new Response("unavailable",{status:503});
  await assert.rejects(preparePlaceUpdate(ctx,db,"refresh",{refreshExternal:true},4,()=>true),code("PROVIDER_UNAVAILABLE"));
  assert.equal(JSON.stringify({place:getPlace(db,"refresh"),metadata:getPlaceMetadata(db,"refresh")}),before);
 }finally{globalThis.fetch=originalFetch;db.close();}
});

test("server adapter candidates preserve scope, provenance, expiry and adoption receipts",()=>{
 const db=fixture();let now=1000;const service=new PlacesService(()=>now),ctx=context();
 const candidate={...parseNominatim([osm],1)[0]!,candidateId:"bike-node-123",provider:"openstreetmap",externalId:"node/123",fetchedAt:now};
 try{
  const result=service.registerCandidates(ctx,{items:[candidate],expiresAt:now+60_000});
  assert.equal((db.prepare("SELECT count(*) AS n FROM places").get() as any).n,0);
  candidate.name="mutated input";result.items[0]!.name="mutated output";
  const resolved=service.resolveCandidateReference(ctx,result.resultId,candidate.candidateId);
  assert.equal(resolved.candidate.name,"駅前カフェ");assert.equal(resolved.expiresAt,61_000);
  assert.throws(()=>service.resolveCandidate(context("person-b"),result.resultId,candidate.candidateId),code("NOT_FOUND"));
  assert.throws(()=>service.resolveCandidate(context("person-a","demo"),result.resultId,candidate.candidateId),code("NOT_FOUND"));
  assert.throws(()=>service.registerCandidates(ctx,{items:[candidate,candidate],expiresAt:2000}),code("INVALID_INPUT"));
  assert.throws(()=>service.registerCandidates(ctx,{items:[{...candidate,provider:"mapbox",retention:"storable"}],expiresAt:2000}),code("INVALID_INPUT"));
  const input={id:"bike-adopt",mode:"candidate" as const,resultId:result.resultId,candidateId:candidate.candidateId};
  const adopted=tx(db,()=>service.adopt(ctx,db,input));assert.equal(adopted.created,true);assert.equal(adopted.place.externalId,"N123");assert.equal(adopted.place.provider,"nominatim");assert.equal(adopted.place.fetchedAt,1000);
  now=62_000;assert.throws(()=>service.resolveCandidate(ctx,result.resultId,candidate.candidateId),code("RESULT_EXPIRED"));
  assert.equal(tx(db,()=>service.adopt(ctx,db,input)).place.id,"bike-adopt");
  assert.throws(()=>tx(db,()=>service.adopt(ctx,db,{...input,candidateId:"changed"})),code("REQUEST_CONFLICT"));
  db.prepare("DELETE FROM places WHERE id=?").run("bike-adopt");
  assert.throws(()=>tx(db,()=>service.adopt(ctx,db,input)),code("NOT_FOUND"));
 }finally{db.close();}
});
