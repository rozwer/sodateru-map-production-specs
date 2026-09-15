import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync,readFileSync,rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { createApp } from "../../app/app.ts";
import { openDatabases } from "../../db/connection.ts";
import { loadLocalIdentity,seedProfiles } from "../../core/session.ts";
import { createInsightsFeature } from "./routes.ts";
import { createInsightsService } from "./service.ts";

test("CORE本人contextからinsights取得・評価・版競合・モード分離・再起動再取得",async()=>{
 const dir=mkdtempSync(join(tmpdir(),"insights-http-"));
 const identity=loadLocalIdentity(join(dir,"profiles.json"));
 // No source data is inserted in this test: only an empty-period computed result.
 const serviceFor=(db:Parameters<typeof createInsightsService>[0])=>createInsightsService(db,{checkSources:(_,{refs})=>{assert.equal(refs.length,0);return [];}});
 const feature=createInsightsFeature(serviceFor);
 const contract=JSON.parse(readFileSync(new URL("../../../docs/01_requirements/04_api/openapi.json",import.meta.url),"utf8"));
 const fragment=JSON.parse(readFileSync(new URL("../../../docs/01_requirements/04_api/fragments/INSIGHTS.json",import.meta.url),"utf8"));
 Object.assign(contract.components.schemas,fragment.schemas);
 for(const operation of fragment.operations) contract.paths[operation.path][operation.method]=operation;
 const options={livePath:join(dir,"live.sqlite"),demoPath:join(dir,"demo.sqlite"),migrations:feature.migrations};
 let dbs=openDatabases(options);seedProfiles(dbs,identity.profiles);
 let app=createApp({databases:dbs,identity,features:[feature],contract});
 const headers:Record<string,string>={"X-Request-Id":randomUUID(),"X-Data-Mode":"live","Content-Type":"application/json"};
 try{
   let response=await app.request("/api/v1/session",{method:"POST",headers:{...headers,"Idempotency-Key":"session"},body:JSON.stringify({profileKey:"self"})});
   assert.equal(response.status,201);headers.Cookie=response.headers.get("set-cookie")!.split(";")[0]!;
   const context={personId:identity.profiles[0]!.id,dataMode:"live" as const,requestId:randomUUID(),signal:new AbortController().signal};
   serviceFor(dbs.live).saveAnalysis(context,{id:"computed-empty",conditions:{},sourceRefs:[],rangeStart:0,rangeEnd:86400000,timeZone:"UTC",generatorVersion:"empty-test-v1",model:null,summary:"記録未取得の検証fixture",result:{axes:[],unknown:["未取得"]}});
   response=await app.request("/api/v1/insights/computed-empty",{headers});assert.equal(response.status,200);assert.equal(response.headers.get("etag"),'"1"');
   response=await app.request("/api/v1/insights/computed-empty",{method:"PATCH",headers:{...headers,"If-Match":'"1"'},body:JSON.stringify({review:"unsure",reviewNote:"まだ分からない"})});
   assert.equal(response.status,200);assert.equal((await response.json() as any).data.version,2);
   response=await app.request("/api/v1/insights/computed-empty",{method:"PATCH",headers:{...headers,"If-Match":'"1"'},body:'{"review":"agree"}'});assert.equal(response.status,412);
   response=await app.request("/api/v1/insights/computed-empty",{method:"PATCH",headers,body:'{"review":"agree"}'});assert.equal(response.status,428);
   response=await app.request("/api/v1/insights/computed-empty",{headers:{...headers,"X-Data-Mode":"demo"}});assert.equal(response.status,401);
   dbs.close();dbs=openDatabases(options);seedProfiles(dbs,identity.profiles);app=createApp({databases:dbs,identity,features:[feature],contract});
   response=await app.request("/api/v1/insights?rangeStart=0&rangeEnd=86400000&timeZone=UTC",{headers});assert.equal(response.status,200);
   const page=await response.json() as any;assert.equal(page.items.length,1);assert.equal(page.items[0].reviewNote,"まだ分からない");
 }finally{dbs.close();rmSync(dir,{recursive:true,force:true});}
});
