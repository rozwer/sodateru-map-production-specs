import {test} from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {randomUUID} from "node:crypto";
import {serve} from "@hono/node-server";
import {createApp} from "../../app/app.ts";
import {openDatabases} from "../../db/connection.ts";
import {transaction} from "../../db/migrate.ts";
import {loadLocalIdentity,seedProfiles} from "../../core/session.ts";
import insights from "./register.ts";
import activity from "../activity/register.ts";
import records from "../records/register.ts";
import {createVisit,patchVisit,createPoints,deletePoints} from "../activity/service.ts";
import {createRecord} from "../records/service.ts";

test("統計HTTPは全ページ・本人境界・初回履歴・GPS削除分断・欠測とゼロを反映",async()=>{
 const dir=mkdtempSync(join(tmpdir(),"insights-statistics-")),identity=loadLocalIdentity(join(dir,"profiles.json"));
 const features=[activity,records,insights];
 const dbs=openDatabases({livePath:join(dir,"live.sqlite"),demoPath:join(dir,"demo.sqlite"),migrations:features.flatMap(f=>[...f.migrations??[]])});
 seedProfiles(dbs,identity.profiles);
 const db=dbs.live,context={personId:identity.profiles[0]!.id,dataMode:"live"};
 const from=Date.parse("2026-09-01T00:00:00Z"),to=from+86400000;
 transaction(db,()=>{
  for(const id of ["known","new","uncertain"])db.prepare("INSERT INTO places(id,created_at,updated_at,name,longitude,latitude,provider,attribution) VALUES (?,1,1,?,0,0,'test','synthetic')").run(id,id);
  const visit=(id:string,placeId:string,at:number|null,confirmed=true)=>{
   const v=createVisit(db,context,{id,placeId,startedAt:at,endedAt:null,timePrecision:at===null?"unknown":"exact",origin:"manual"});
   if(confirmed)patchVisit(db,context,id,{status:"confirmed"},v.version);
  };
  visit("old","known",from-86400000);
  for(let i=0;i<101;i++)visit("v"+i,i%2?"new":"known",from+i);
  visit("uncertain-dated","uncertain",from+200);visit("uncertain-undated","uncertain",null);
  visit("candidate","new",from+300,false);
  const record={id:"dated-record",kind:"diary",visitId:null,placeId:null,occurredAt:from+400,endedAt:null,timePrecision:"exact",body:"合成記録",purposes:[],activities:[{id:"book",name:"本を見つけた",purpose:null,outcome:null,satisfaction:null,repeatIntent:null}],impression:"",periodAnswers:{},bookmarked:false,useForSuggestions:false,topicKey:null,visibility:"private",sharedWith:[]};
  createRecord(db,context.personId,record);
  createRecord(db,context.personId,{...record,id:"undated-record",occurredAt:null,timePrecision:"unknown"});
  const items=Array.from({length:102},(_,i)=>({id:"p"+i,sourcePointId:"sp"+i,segmentId:"segment",observedAt:from+i*1000,longitude:i*0.00001,latitude:0,accuracyM:5}));
  createPoints(db,context,{items});
  deletePoints(db,context,{segmentId:"segment",from:from+50000,to:from+50001,targets:[{id:"p50",version:1}]});
  createPoints(db,context,{items:[0,1].map(i=>({id:"zero"+i,sourcePointId:"sz"+i,segmentId:"zero",observedAt:to+i*1000,longitude:0,latitude:0,accuracyM:5}))});
 });
 const contract=JSON.parse(readFileSync(new URL("../../../docs/01_requirements/04_api/openapi.json",import.meta.url),"utf8"));
 const fragment=JSON.parse(readFileSync(new URL("../../../docs/01_requirements/04_api/fragments/INSIGHTS.json",import.meta.url),"utf8"));
 Object.assign(contract.components.schemas,fragment.schemas);for(const op of fragment.operations)(contract.paths[op.path]??={})[op.method]=op;
 const app=createApp({databases:dbs,identity,features,contract});
 const server=serve({fetch:app.fetch,hostname:"127.0.0.1",port:0});
 if(!server.listening)await new Promise<void>(resolve=>server.once("listening",resolve));
 const origin="http://127.0.0.1:"+(server.address() as any).port;
 const headers:Record<string,string>={"X-Data-Mode":"live","Content-Type":"application/json","X-Request-Id":randomUUID()};
 const get=async(start:number,end:number,mode="live",cookie=headers.Cookie)=>{
  const response=await fetch(origin+"/api/v1/reflection/activity-statistics?from="+start+"&to="+end+"&timeZone=UTC",{headers:{...headers,"X-Data-Mode":mode,Cookie:cookie!}});
  return {status:response.status,body:await response.json() as any};
 };
 try{
  const session=await fetch(origin+"/api/v1/session",{method:"POST",headers:{...headers,"Idempotency-Key":"stats-session"},body:'{"profileKey":"self"}'});
  assert.equal(session.status,201);headers.Cookie=session.headers.get("set-cookie")!.split(";")[0]!;
  const result=await get(from,to);assert.equal(result.status,200,JSON.stringify(result.body));
  const data=result.body.data;
  assert.equal(data.confirmedVisits.value,102);assert.equal(data.confirmedPlaces.value,3);
  assert.equal(data.newPlaces.value,1);assert.deepEqual(data.newPlaces.unknownPlaceIds,["uncertain"]);
  assert.equal(data.undatedVisits,1);assert.equal(data.undatedRecords,1);assert.equal(data.recordCount,1);
  assert.equal(data.activities[0].count,1);assert.equal(data.gpsDistanceMeters.pointCount,101);
  assert.equal(data.gpsDistanceMeters.edgeCount,99);assert.equal(data.gpsDistanceMeters.disconnectedEdges,1);
  assert.ok(Math.abs(data.gpsDistanceMeters.value-110.0831294)<0.001);
  assert.equal(data.daily[0].confirmedVisits,102);assert.equal(data.sources.length,3);assert.equal(typeof data.lastUpdatedAt,"number");
  assert.deepEqual((await get(from,to)).body,result.body);
  const zero=(await get(to,to+3000)).body.data;assert.equal(zero.gpsDistanceMeters.value,0);
  const missing=(await get(to+5000,to+10000)).body.data;assert.equal(missing.gpsDistanceMeters.value,null);assert.equal(missing.confirmedVisits.value,0);
  const otherMode=await get(from,to,"demo");assert.equal(otherMode.status,401);
  const demoSession=await fetch(origin+"/api/v1/session",{method:"POST",headers:{...headers,"X-Data-Mode":"demo","Idempotency-Key":"stats-demo"},body:'{"profileKey":"self"}'});
  const empty=(await get(from,to,"demo",demoSession.headers.get("set-cookie")!.split(";")[0]!)).body.data;
  assert.equal(empty.confirmedVisits.value,0);assert.equal(empty.gpsDistanceMeters.value,null);
  assert.equal((await get(to,from)).status,400);
  writeFileSync(new URL("../../../docs/evidence/INSIGHTS/statistics-http.json",import.meta.url),JSON.stringify({checkedAt:new Date().toISOString(),transport:"localhost HTTP, isolated real SQLite",features:"actual CORE/ACTIVITY/RECORDS/INFORMATION/INSIGHTS",checks:["102 visits and 101 GPS points across pagination","first confirmed all-history and unknown initial date","deleted point gap not connected","same inputs equal","no GPS null; same-location valid edge zero","demo/live isolation","invalid range rejected"],sample:data},null,2)+"\n");
 }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));dbs.close();}
});
