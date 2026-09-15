import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { serve } from "@hono/node-server";
import { openDatabases } from "../../db/connection.ts";
import { createApp } from "../../app/app.ts";
import { loadContract, type ApiContract } from "../../core/validation.ts";
import { seedProfiles } from "../../core/session.ts";
import { assessCommonRoute } from "./route-evidence.ts";
import { BikeService, type Installation, type RoutesBoundary, type RouteSnapshot } from "./service.ts";
import { createBikeFeature } from "./feature.ts";
import { CommonError } from "../../core/errors.ts";
import { assessTags, defaultSettings, geometryHash, settingsHash, validateSettings, type BikeSettings } from "./domain.ts";
import { OverpassBikeProvider, type BikeProvider } from "./overpass.ts";
import { bikeMigration } from "./migration.ts";

const settings = structuredClone(defaultSettings);
const source = { id: "test-osm", name: "TEST FIXTURE (not live evidence)", url: "https://www.openstreetmap.org/node/1", attribution: "test fixture", fetchedAt: Date.now(), updatedAt: null };
const provider: BikeProvider = { async search() { return { source, roads: [], places: [{ id: "fixture-place", name: "模擬駐車場", category: "motorcycle_parking", position: { longitude: 139.702, latitude: 35.659 }, tags: { motorcycle: "yes" }, source, vehicleAssessment: assessTags({ motorcycle: "yes" }, settings, source.id, Date.now()) }] }; } };
const preview: RouteSnapshot = { previewId: "fixture-route", mode: "driving", geometry: { type: "LineString", coordinates: [[139.701,35.659],[139.702,35.659]] }, fetchedAt: Date.now(), expiresAt: Date.now()+900000, retention: "storable" };
const routes: RoutesBoundary = { revalidatePreview: () => structuredClone(preview), saveRoute: () => { throw Error("unknown route MUST NOT save"); }, getSavedRoute: () => { throw Error("no adoption"); } };

test("vehicle restrictions, missing evidence and invalid settings", () => {
  assert.equal(assessTags({}, settings, "osm", 1).status, "unknown");
  assert.equal(assessTags({ motorcycle: "no" }, settings, "osm", 1).status, "ineligible");
  assert.equal(assessTags({ motorcycle: "yes", "motorcycle:conditional": "no @ (Su)" }, settings, "osm", 1).status, "unknown");
  assert.equal(assessTags({ highway: "motorway" }, { ...settings, highwayPolicy: "allow", vehicle: { class: "light_motorcycle", displacementCc: 125 } }, "osm", 1).status, "ineligible");
  assert.equal(assessTags({ motorcycle: "yes" }, { ...settings, vehicle: { class: "electric_motorcycle" } }, "osm", 1).status, "unknown");
  assert.throws(() => validateSettings({ ...settings, vehicle: { class: "electric_motorcycle", displacementCc: 125 } }));
  assert.throws(() => validateSettings({ ...settings, region: { id: "JP", bounds: [139,35,140,36] } }));
});

test("adapter refuses rate limits and incomplete responses; keeps actual source timestamp", async () => {
  const call = (status: number, body: unknown) => new OverpassBikeProvider("https://example.test", (async () => new Response(JSON.stringify(body), { status })) as typeof fetch).search(settings, new AbortController().signal);
  await assert.rejects(call(429, {}), { code: "RATE_LIMITED" });
  await assert.rejects(call(200, { elements: [], remark: "runtime error: timeout" }), { code: "UPSTREAM_FAILED" });
  const result = await call(200, { osm3s: { timestamp_osm_base: "2026-09-15T00:00:00Z" }, elements: [{ type: "node", id: 1, lat: 35.659, lon: 139.702, timestamp: "2026-09-10T00:00:00Z", tags: { amenity: "motorcycle_parking", motorcycle: "no" } }] });
  assert.equal(result.places[0]?.vehicleAssessment.status, "ineligible");
  assert.equal(result.places[0]?.source.updatedAt, Date.parse("2026-09-10T00:00:00Z"));
});

test("HTTP + real SQLite: persisted search/replay/reopen, isolation, unknown adoption denial and stop", async () => {
  const directory = mkdtempSync(join(tmpdir(), "bike-test-"));
  const paths = { livePath: join(directory,"live.sqlite"), demoPath: join(directory,"demo.sqlite"), migrations:[bikeMigration] };
  let databases = openDatabases(paths);
  const identity = { version: 1 as const, secret: "test-only-secret", profiles: [{ key: "kaiya", id: randomUUID(), name: "TEST KAIYA" }] };
  seedProfiles(databases, identity.profiles);
  let installation: Installation | null = { installId: "bike-test-install", version: 1, enabled: true, settings, visible: true };
  let calls = 0;
  const counted: BikeProvider = { async search(s, signal) { calls++; return provider.search(s,signal); } };
  const serviceFor = (db: typeof databases.live) => new BikeService(db, () => installation, routes, counted);
  const fragment = JSON.parse(readFileSync(new URL("../../../docs/01_requirements/04_api/fragments/BIKE.json",import.meta.url), "utf8"));
  const contract = loadContract();
  (contract.components as any).schemas = { ...(contract.components as any).schemas, ...fragment.schemas };
  for (const op of fragment.operations) { const {method,path,...rest}=op; (contract.paths[path] ??= {})[method.toLowerCase()]=rest; }
  let server: ReturnType<typeof serve>;
  let origin: string;
  const start = async () => {
    const app = createApp({databases,identity,features:[createBikeFeature(serviceFor)],contract:contract as ApiContract});
    await new Promise<void>(resolve => { server = serve({fetch:app.fetch,hostname:"127.0.0.1",port:0},info=>{origin=`http://127.0.0.1:${info.port}/api/v1`;resolve();}); });
  };
  const stop = () => new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));
  let cookie = "";
  async function api(path: string, method = "GET", body?: unknown, key = randomUUID(), mode = "live") {
    const r=await fetch(origin+path,{method,headers:{"X-Request-Id":randomUUID(),"X-Data-Mode":mode,...(cookie?{Cookie:cookie}:{}),...(method==="POST"?{"Idempotency-Key":key,"Content-Type":"application/json"}: {})},...(body===undefined?{}:{body:JSON.stringify(body)})});
    if (r.headers.get("set-cookie")) cookie=r.headers.get("set-cookie")!.split(";")[0]!;
    return {status:r.status,...await r.json() as any};
  }
  try {
    await start();
    assert.equal((await api("/session","POST",{profileKey:"kaiya"})).status,201);
    const key=randomUUID(), first=await api("/bike/searches","POST",{},key);
    assert.equal(first.status,201,JSON.stringify(first));
    assert.equal((await api("/bike/searches","POST",{},key)).data.id,first.data.id);
    assert.equal(calls,1);
    const state=await api("/bike/state");
    assert.equal(state.data.display.geojson.features.length,1);
    const assessment=await api("/bike/route-assessments","POST",{previewId:preview.previewId,searchId:first.data.id});
    assert.equal(assessment.status,201,JSON.stringify(assessment));
    assert.equal(assessment.data.adoptable,false);
    assert.equal((await api("/bike/adoptions","POST",{id:randomUUID(),assessmentId:assessment.data.id,title:"reject unknown"})).status,409);
    installation!.enabled=false;
    const stopped=await api("/bike/state");
    assert.deepEqual(stopped.data.display.clearOwnerKeys,["plugin:bike-test-install"]);
    assert.deepEqual(stopped.data.display.geojson.features,[]);
    assert.equal(stopped.data.results.length,2);
    installation!.enabled=true; installation!.version=2;
    assert.equal((await api("/bike/route-assessments","POST",{previewId:preview.previewId,searchId:first.data.id})).status,409);
    const other={personId:randomUUID(),dataMode:"live" as const,requestId:randomUUID(),signal:new AbortController().signal};
    assert.throws(()=>serviceFor(databases.live).get(other,first.data.id),{code:"NOT_FOUND"});
    assert.throws(()=>serviceFor(databases.demo).get({...other,personId:identity.profiles[0]!.id,dataMode:"demo"},first.data.id),{code:"NOT_FOUND"});
    await stop(); databases.close(); databases=openDatabases(paths); await start();
    const reread=await api(`/bike/results/${first.data.id}`);
    assert.deepEqual(reread.data,first.data);
    assert.equal((await api("/bike/searches","POST",{},key)).data.id,first.data.id);
    assert.equal(calls,1);
  } finally { await stop(); databases.close(); rmSync(directory,{recursive:true,force:true}); }
});

test("motorway proof must belong to the same preview fetch and requested condition", () => {
  const context={personId:"fixture",dataMode:"live" as const,requestId:"fixture",signal:new AbortController().signal};
  const proof={key:"avoidMotorways",status:"applied",reason:"provider excluded motorways",provider:"mapbox-directions",sourceUrl:"https://docs.mapbox.com/api/navigation/directions/",fetchedAt:preview.fetchedAt};
  const route={...preview,requestedConditions:{avoidMotorways:true},conditionEvaluations:[proof]};
  assert.equal(assessCommonRoute(context,route,settings).highway.status,"verified");
  assert.equal(assessCommonRoute(context,route,settings).vehicle.status,"unknown");
  assert.equal(assessCommonRoute(context,{...route,fetchedAt:route.fetchedAt+1},settings).highway.status,"unknown");
  assert.equal(assessCommonRoute(context,{...route,requestedConditions:{avoidMotorways:false}},settings).highway.status,"unknown");
});

test("verified fixture adoption is atomic and replay checks the current saved route", async () => {
  const dir=mkdtempSync(join(tmpdir(),"bike-adopt-"));
  const databases=openDatabases({livePath:join(dir,"live.sqlite"),demoPath:join(dir,"demo.sqlite"),migrations:[bikeMigration]});
  const personId=randomUUID(), db=databases.live;
  seedProfiles(databases,[{id:personId,key:"test",name:"FIXTURE"}]);
  const context={personId,dataMode:"live" as const,requestId:randomUUID(),signal:new AbortController().signal};
  db.exec("CREATE TABLE fixture_saved_routes(id TEXT PRIMARY KEY, geometry_json TEXT NOT NULL)");
  let failAfterSave=false;
  const boundary: RoutesBoundary={
    revalidatePreview:()=>structuredClone(preview),
    assess:(_c,r,s)=>({vehicle:{status:"verified",reason:"TEST PROOF ONLY",sourceRefs:["fixture"],checkedAt:Date.now()},highway:{status:"verified",reason:"TEST PROOF ONLY",sourceRefs:["fixture"],checkedAt:Date.now()},geometryHash:geometryHash(r.geometry),settingsHash:settingsHash(s)}),
    saveRoute:(_c,input)=>{db.prepare("INSERT INTO fixture_saved_routes VALUES (?,?)").run(input.id,JSON.stringify(preview.geometry));if(failAfterSave)throw new CommonError("STATE_CONFLICT","fixture failure");return {data:{id:input.id},created:true};},
    getSavedRoute:(_c,id)=>{const row=db.prepare("SELECT geometry_json FROM fixture_saved_routes WHERE id=?").get(id) as {geometry_json:string}|undefined;if(!row)throw new CommonError("NOT_FOUND","fixture route removed");return {id,geometry:JSON.parse(row.geometry_json)};},
  };
  const service=new BikeService(db,()=>({installId:"fixture",version:1,enabled:true,visible:true,settings}),boundary,provider);
  try {
    const search=await service.search(context);
    const assessed=service.assessRoute(context,{previewId:preview.previewId,searchId:search.id});
    const input={id:randomUUID(),assessmentId:assessed.id,title:"fixture verified"};
    failAfterSave=true;assert.throws(()=>service.adopt(context,input));
    assert.equal(db.prepare("SELECT count(*) AS n FROM fixture_saved_routes").get()!.n,0);
    failAfterSave=false;const saved=service.adopt(context,input);
    assert.equal(service.replayAdoption(context,saved.id).routeId,input.id);
    db.prepare("UPDATE fixture_saved_routes SET geometry_json=? WHERE id=?").run(JSON.stringify({...preview.geometry,coordinates:[[139.701,35.659],[139.704,35.661]]}),input.id);
    assert.throws(()=>service.replayAdoption(context,saved.id),{code:"SOURCE_CHANGED"});
    db.prepare("DELETE FROM fixture_saved_routes WHERE id=?").run(input.id);
    assert.throws(()=>service.replayAdoption(context,saved.id),{code:"NOT_FOUND"});
  } finally {databases.close();rmSync(dir,{recursive:true,force:true});}
});
