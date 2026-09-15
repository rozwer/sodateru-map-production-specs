/** Real providers + actual CORE/PLUGINS/ROUTES HTTP. Requires their integrated contracts. */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { defaultSettings } from "./domain.ts";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const dir = join(root, ".local", "bike-e2e", randomUUID());
mkdirSync(dir, { recursive: true });
const env = { ...process.env, SODATERU_PORT: "0", SODATERU_DB_PATH: join(dir,"live.sqlite"), SODATERU_DEMO_DB_PATH: join(dir,"demo.sqlite"), SODATERU_PROFILES_PATH: join(dir,"profiles.json") };
let server: ReturnType<typeof spawn>;
let origin = "", cookie = "";
async function start() {
  await new Promise<void>((resolve,reject) => {
    server=spawn(process.execPath,["--experimental-transform-types",join(root,"server/app/main.ts")],{cwd:root,env,stdio:["ignore","pipe","pipe"]});
    const timeout=setTimeout(()=>reject(Error("CORE startup timed out")),20000);
    let output="",errors="";
    server.stderr!.on("data",chunk=>{errors+=chunk.toString();});
    server.stdout!.on("data",chunk=>{
      output+=chunk.toString();
      for(const line of output.split("\n")) {try { const data=JSON.parse(line);if(data.event==="ready"){origin=data.origin+"/api/v1";clearTimeout(timeout);resolve();} } catch {} }
    });
    server.once("exit",code=>{clearTimeout(timeout);if(code!==0)reject(Error("CORE failed to start: "+errors));});
  });
}
async function stop(){ if(server.exitCode!==null)return;await new Promise<void>(resolve=>{server.once("exit",()=>resolve());server.kill("SIGTERM");}); }
async function api(path:string,method="GET",body?:unknown,version?:number,key=randomUUID()) {
  const response=await fetch(origin+path,{method,headers:{"X-Request-Id":randomUUID(),"X-Data-Mode":"live",...(cookie?{Cookie:cookie}:{}),...(body===undefined?{}:{"Content-Type":"application/json"}),...(method==="POST"?{"Idempotency-Key":key}:{}),...(version?{"If-Match":`"${version}"`}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  if(response.headers.get("set-cookie"))cookie=response.headers.get("set-cookie")!.split(";")[0]!;
  return {status:response.status,body:await response.json() as any};
}
const success=(r:Awaited<ReturnType<typeof api>>)=>{assert(r.status>=200&&r.status<300,JSON.stringify(r));return r.body;};
try {
  await start();
  const profiles=success(await api("/session/profiles"));
  success(await api("/session","POST",{profileKey:profiles.items[0].profileKey}));
  const trial=success(await api("/plugins/bike/trial","POST",{pluginVersion:"1.0.0",settings:defaultSettings}));
  assert.equal(trial.data.preview.dataKind,"mock");
  const before=success(await api("/plugin-state"));
  const installed=success(await api("/plugin-settings","POST",{id:"bike",pluginVersion:"1.0.0",settings:defaultSettings,enabled:true,confirmed:true,stateRevision:before.data.revision}));
  const searchKey=randomUUID();
  const search=success(await api("/bike/searches","POST",{},undefined,searchKey)).data;
  assert.equal(search.dataKind,"real");assert(search.places.length>0);assert(search.roads.length>0);
  assert.deepEqual(success(await api("/bike/searches","POST",{},undefined,searchKey)).data,search);
  const route=success(await api("/route-searches","POST",{title:"BIKE live verification",mode:"driving",conditions:{avoidMotorways:true},waypoints:[{kind:"point",coordinates:[139.701,35.659],label:"渋谷付近出発"},{kind:"point",coordinates:[139.712,35.665],label:"渋谷付近到着"}]})).data;
  const assessment=success(await api("/bike/route-assessments","POST",{previewId:route.resultId,searchId:search.id})).data;
  assert.equal(assessment.highwayAssessment.status,"verified");
  assert.equal(assessment.adoptable,false,"Until complete motorcycle evidence is connected, adoption must remain unavailable");
  assert.equal((await api("/bike/adoptions","POST",{id:randomUUID(),assessmentId:assessment.id,title:"unknown route rejection"})).status,409);
  const state=success(await api("/bike/state")).data;
  assert(state.display.visible);assert(state.display.geojson.features.length>0);
  const plugin=success(await api("/plugin-settings/bike")).data;
  success(await api("/plugin-settings/bike","PATCH",{enabled:false},plugin.version));
  const stopped=success(await api("/bike/state")).data;
  assert.deepEqual(stopped.display.geojson.features,[]);
  assert.deepEqual(stopped.display.clearOwnerKeys,[state.display.ownerKey]);
  assert.deepEqual(success(await api(`/bike/results/${search.id}`)).data,search);
  await stop();await start();
  assert.deepEqual(success(await api(`/bike/results/${search.id}`)).data,search);
  assert.deepEqual(success(await api(`/bike/results/${assessment.id}`)).data,assessment);
  const restored=success(await api("/bike/state")).data;
  assert.equal(restored.display.visible,false);
  assert.deepEqual(restored.installation.settings,defaultSettings);
  const evidence={checkedAt:Date.now(),dataMode:"live",dataKind:"real",searchId:search.id,assessmentId:assessment.id,source:search.source,counts:{places:search.places.length,roads:search.roads.length},route:{resultId:route.resultId,provider:route.provider,fetchedAt:route.fetchedAt,geometryHash:assessment.geometryHash},vehicleAssessment:assessment.vehicleAssessment,highwayAssessment:assessment.highwayAssessment,adoptable:assessment.adoptable,checks:{mockTrialSeparated:true,realSearch:true,idempotentReplay:true,sqliteRestartSameSnapshot:true,settingsRestored:true,stopClearsOnlyBikeOwner:true,unknownAdoptionRejected:true},remaining:["Live verified motorcycle route adoption", "UI display acceptance"]};
  writeFileSync(join(root,"docs/evidence/BIKE/live-http-sqlite.json"),JSON.stringify(evidence,null,2)+"\n");
  console.log(JSON.stringify(evidence));
} finally {if(server!)await stop();}
