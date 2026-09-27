// New BIKE HTTP wiring only. Local provider replays archived REAL responses; no external calls.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { serve } from "@hono/node-server";
import { openDatabases } from "../../../server/db/connection.ts";
import { createApp } from "../../../server/app/app.ts";
import { loadContract } from "../../../server/core/validation.ts";
import { seedProfiles } from "../../../server/core/session.ts";
import plugins from "../../../server/features/plugins/register.ts";
import places from "../../../server/features/places/register.ts";
import bike from "../../../server/plugins/bike/register.ts";
import { defaultSettings, settingsHash } from "../../../server/plugins/bike/domain.ts";

const root = new URL("../../../", import.meta.url);
const archive = JSON.parse(readFileSync(new URL("docs/evidence/BIKE/valhalla-live.json",root),"utf8"));
const scooter = JSON.parse(readFileSync(new URL("docs/evidence/ROUTES/motor-scooter-trace.json",root),"utf8"));
const calls: any[] = [];
const provider = createServer(async (req,res) => {
  let raw=""; for await(const part of req) raw+=part;
  const input=JSON.parse(raw); calls.push({path:req.url,input});
  const isScooter=input.costing==="motor_scooter";
  const body=req.url==="/route"?archive.requests[isScooter?1:0].body:isScooter?scooter.body:archive.requests[2].body;
  res.writeHead(200,{"Content-Type":"application/json"});res.end(JSON.stringify(body));
});
await new Promise<void>(resolve=>provider.listen(0,"127.0.0.1",resolve));
process.env.ROUTES_VALHALLA_URL=`http://127.0.0.1:${(provider.address() as any).port}/route`;
const dir=mkdtempSync(join(tmpdir(),"bike-wiring-db-"));
const dbs=openDatabases({livePath:join(dir,"live.sqlite"),demoPath:join(dir,"demo.sqlite"),migrations:[...(plugins.migrations??[]),...(places.migrations??[]),...(bike.migrations??[])]});
const profile={id:randomUUID(),key:"test",name:"BIKE WIRING TEST"};
seedProfiles(dbs,[profile]);
const contract=loadContract();
const fragment=JSON.parse(readFileSync(new URL("docs/01_requirements/04_api/fragments/BIKE.json",root),"utf8"));
Object.assign((contract.components as any).schemas,fragment.schemas);
for(const op of fragment.operations){const {method,path,...rest}=op;(contract.paths[path]??={})[method.toLowerCase()]=rest;}
const app=createApp({databases:dbs,identity:{version:1,secret:"local-test-only",profiles:[profile]},features:[plugins,places,bike],contract});
let server:ReturnType<typeof serve>|undefined, origin="",cookie="";
const api=async(path:string,method="GET",body?:unknown,key=randomUUID(),version?:number)=>{
  const response=await fetch(origin+path,{method,headers:{"X-Data-Mode":"live","X-Request-Id":randomUUID(),...(cookie?{Cookie:cookie}:{}),...(body===undefined?{}:{"Content-Type":"application/json"}),...(method==="POST"?{"Idempotency-Key":key}:{}),...(version===undefined?{}:{"If-Match":`"${version}"`})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  if(response.headers.get("set-cookie"))cookie=response.headers.get("set-cookie")!.split(";")[0]!;
  return {status:response.status,...await response.json() as any};
};
try{
  await new Promise<void>(resolve=>{server=serve({fetch:app.fetch,hostname:"127.0.0.1",port:0},info=>{origin=`http://127.0.0.1:${info.port}/api/v1`;resolve();});});
  assert.equal((await api("/session","POST",{profileKey:"test"})).status,201);
  let state=await api("/plugin-state");
  let installation=await api("/plugin-settings","POST",{id:"bike",pluginVersion:"1.0.0",enabled:true,settings:defaultSettings,confirmed:true,stateRevision:state.data.revision});
  assert.equal(installation.status,201,JSON.stringify(installation));
  const input={title:"archived real route",waypoints:[{kind:"point",coordinates:[139.701,35.659],label:"start"},{kind:"point",coordinates:[139.712,35.665],label:"end"}],departAt:Date.UTC(2026,8,15,4,30),timeZone:"Asia/Tokyo"};
  assert.equal((await api("/bike/route-previews","POST",input)).status,409);assert.equal(calls.length,0);
  state=await api("/plugin-state");
  installation=await api("/plugin-settings/bike/update","POST",{pluginVersion:"1.1.0",confirmed:true,stateRevision:state.data.revision},randomUUID(),installation.data.version);
  assert.equal(installation.status,200,JSON.stringify(installation));
  const key=randomUUID(), preview=await api("/bike/route-previews","POST",input,key);
  assert.equal(preview.status,200,JSON.stringify(preview));assert.equal(calls.length,2);
  assert.equal(calls[0].input.costing,"motorcycle");assert.deepEqual(calls[0].input.costing_options.motorcycle,{use_highways:0,exclude_highways:true});
  assert.deepEqual((await api("/bike/route-previews","POST",input,key)).data,preview.data);assert.equal(calls.length,2);
  assert.equal((await api("/bike/route-previews","POST",{...input,profile:"motor_scooter"})).status,422);assert.equal(calls.length,2);
  const now=Date.now(), source={id:"wiring-fixture",name:"TEST FIXTURE",url:"https://example.test/fixture",attribution:"TEST FIXTURE",fetchedAt:now,updatedAt:null};
  const search={...preview.data,id:randomUUID(),kind:"search",dataKind:"real",source,places:[],roads:[],fetchedAt:now,expiresAt:now+900000};
  delete search.previewId; delete search.geometry;
  dbs.live.prepare("INSERT INTO bike_results VALUES (?,?,?,?,?,?,?,?)").run(search.id,profile.id,"live","search",search.installId,settingsHash(defaultSettings),JSON.stringify(search),now);
  const assessment=await api("/bike/route-assessments","POST",{previewId:preview.data.previewId,searchId:search.id});
  assert.equal(assessment.status,201,JSON.stringify(assessment));
  assert.equal(assessment.data.resultEvaluation.evidence.edges.length,52);
  assert.equal(assessment.data.resultEvaluation.requestedExclusion.status,"ignored");
  assert.equal(assessment.data.resultEvaluation.motorwayAssessment.status,"verified");
  assert.equal(assessment.data.vehicleAssessment.status,"unknown");assert.equal(assessment.data.adoptable,false);
  assert.equal((await api("/bike/adoptions","POST",{id:randomUUID(),assessmentId:assessment.data.id,title:"reject"})).status,409);
  const mopedSettings={...defaultSettings,vehicle:{class:"moped",displacementCc:50}};
  installation=await api("/plugin-settings/bike","PATCH",{settings:mopedSettings},randomUUID(),installation.data.version);
  assert.equal(installation.status,200,JSON.stringify(installation));
  assert.equal((await api("/bike/route-previews","POST",input,key)).status,409);assert.equal(calls.length,2);
  const mopedKey=randomUUID(), moped=await api("/bike/route-previews","POST",input,mopedKey);
  assert.equal(moped.status,200,JSON.stringify(moped));assert.equal(calls.length,4);
  assert.equal(calls[2].input.costing,"motor_scooter");assert.equal(calls[2].input.costing_options.motor_scooter.top_speed,30);
  installation=await api("/plugin-settings/bike","PATCH",{enabled:false},randomUUID(),installation.data.version);
  assert.equal(installation.status,200);assert.equal((await api("/bike/route-previews","POST",input,mopedKey)).status,409);assert.equal(calls.length,4);
  assert.deepEqual((await api(`/bike/results/${assessment.data.id}`)).data,assessment.data);
  const result={checkedAt:Date.now(),scope:"Actual CORE HTTP + production PLUGINS/ROUTES motorbike factory/BIKE + SQLite. Local HTTP replays archived real provider responses; search seed is fixture. No external calls; temporary contract composition.",
    checks:{oldVersionDeniedOnlyNewPreview:true,motorcycleSettingsWired:true,mopedSettingsWired:true,arbitraryProfileRejected:true,replayWithoutProviderCalls:true,settingsChangeAndStopRejectReplay:true,sameShape52EdgesPersisted:true,ignoredAndMotorwayVerifiedSeparated:true,vehicleUnknownAdoptionRejected:true,savedAssessmentRetained:true},
    localProviderCalls:calls.map(c=>({path:c.path,costing:c.input.costing,costing_options:c.input.costing_options})),
    assessment:assessment.data,remaining:["B production generation/client and A UI","Japanese full vehicle/highway conditions and compliant adoption"]};
  writeFileSync(new URL("motorbike-http.json",import.meta.url),JSON.stringify(result,null,2)+"\n");console.log(JSON.stringify(result.checks));
}finally{if(server)await new Promise<void>(r=>server!.close(()=>r()));await new Promise<void>(r=>provider.close(()=>r()));dbs.close();rmSync(dir,{recursive:true,force:true});}
