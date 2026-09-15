import {test} from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {randomUUID,createHash} from "node:crypto";
import {serve} from "@hono/node-server";
import {createApp} from "../../app/app.ts";
import {openDatabases} from "../../db/connection.ts";
import {loadLocalIdentity,seedProfiles} from "../../core/session.ts";
import insights from "./register.ts";
import records from "../records/register.ts";
import information from "../../information/register.ts";

test("原文14件の正式payloadをdemo/selfへHTTP追加し、5軸・再送・既存保持・再開を確認",async()=>{
 const dir=mkdtempSync(join(tmpdir(),"insights-grounded-"));
 const identity=loadLocalIdentity(join(dir,"profiles.json"));
 const manifest=JSON.parse(readFileSync(new URL("../../../docs/evidence/INSIGHTS/grounded-record-import.json",import.meta.url),"utf8"));
 const source=JSON.parse(readFileSync(new URL("../../../docs/evidence/INSIGHTS/self-type-diagnosis-grounded-demo.json",import.meta.url),"utf8"));
 const contract=JSON.parse(readFileSync(new URL("../../../docs/01_requirements/04_api/openapi.json",import.meta.url),"utf8"));
 const fragment=JSON.parse(readFileSync(new URL("../../../docs/01_requirements/04_api/fragments/INSIGHTS.json",import.meta.url),"utf8"));
 Object.assign(contract.components.schemas,fragment.schemas);
 for(const op of fragment.operations)(contract.paths[op.path]??={})[op.method]=op;
 const options={livePath:join(dir,"live.sqlite"),demoPath:join(dir,"demo.sqlite"),migrations:[...records.migrations!,...insights.migrations!,...(information.migrations??[])]};
 let dbs=openDatabases(options);seedProfiles(dbs,identity.profiles);
 const app=()=>createApp({databases:dbs,identity,features:[records,insights,information],contract});
 let server=serve({fetch:app().fetch,hostname:"127.0.0.1",port:0});
 if(!server.listening)await new Promise<void>(resolve=>server.once("listening",resolve));
 let port=(server.address() as any).port;
 const headers:Record<string,string>={"X-Data-Mode":"demo","Content-Type":"application/json"};
 const checks:any[]=[];
 const call=async(path:string,method="GET",body?:unknown,key?:string)=>{
  const response=await fetch("http://127.0.0.1:"+port+"/api/v1"+path,{method,headers:{...headers,"X-Request-Id":randomUUID(),...(key?{"Idempotency-Key":key}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const raw=await response.text();const data=raw?JSON.parse(raw):null;
  checks.push({method,path,status:response.status});
  assert.ok(response.ok,JSON.stringify({path,status:response.status,data}));
  return {response,data};
 };
 const close=()=>new Promise<void>(resolve=>server.close(()=>resolve()));
 try{
  const session=await call("/session","POST",{profileKey:"self"},"grounded-session");
  headers.Cookie=session.response.headers.get("set-cookie")!.split(";")[0]!;
  const baseline={...manifest.records[0].payload,id:"preexisting-kept",occurredAt:null,timePrecision:"unknown",body:"保存済みの記録を保持する",activities:[]};
  const before=(await call("/records","POST",baseline,"baseline")).data.data;
  for(const entry of manifest.records){
   assert.equal(entry.payload.body,source.records.find((r:any)=>r.id===entry.sourceRecordId).text);
   await call("/records","POST",entry.payload,entry.idempotencyKey);
   await call("/records","POST",entry.payload,entry.idempotencyKey);
   const read=(await call("/records/"+entry.payload.id)).data.data.record;
   assert.equal(read.body,entry.payload.body);
   assert.deepEqual(read.activities,entry.payload.activities);
   assert.equal(read.timePrecision,entry.payload.timePrecision);
  }
  const mediaManifest=JSON.parse(readFileSync(new URL("../../../docs/evidence/INSIGHTS/grounded-media-assets.json",import.meta.url),"utf8"));
  const mediaChecks=[];
  for(const asset of mediaManifest.assets){
   const bytes=readFileSync(new URL("../../../"+asset.file,import.meta.url));
   assert.equal(createHash("sha256").update(bytes).digest("hex"),asset.sha256);
   const current=await call("/records/"+asset.recordId);
   const etag=current.response.headers.get("etag")!;
   let uploaded:any;
   for(let attempt=0;attempt<2;attempt++){
    const form=new FormData();form.set("id",asset.mediaId);form.set("position",String(asset.position));
    form.set("file",new Blob([bytes],{type:asset.mimeType}),asset.key+".png");
    const response:Response=await fetch("http://127.0.0.1:"+port+"/api/v1/records/"+asset.recordId+"/media",{
     method:"POST",headers:{"X-Data-Mode":"demo","X-Request-Id":randomUUID(),"Idempotency-Key":asset.idempotencyKey,"If-Match":etag,Cookie:headers.Cookie!},body:form
    });
    uploaded=await response.json();assert.equal(response.status,201,JSON.stringify(uploaded));
    assert.equal(uploaded.data.status,"ready");
   }
   const content=await fetch("http://127.0.0.1:"+port+uploaded.data.contentUrl,{headers:{...headers,"X-Request-Id":randomUUID()}});
   assert.equal(content.status,200);assert.equal(content.headers.get("content-type"),asset.mimeType);
   const actual=Buffer.from(await content.arrayBuffer());assert.deepEqual(actual,bytes);
   const detail=(await call("/records/"+asset.recordId)).data.data;
   assert.equal(detail.record.body,current.data.data.record.body);
   assert.equal(detail.record.version,current.data.data.record.version+1);
   assert.equal(detail.media.data.items.length,1);
   mediaChecks.push({recordId:asset.recordId,mediaId:asset.mediaId,status:uploaded.data.status,contentUrl:uploaded.data.contentUrl,contentStatus:content.status,byteSize:actual.length,sha256:asset.sha256,retryDidNotDuplicate:true,recordVersion:detail.record.version});
  }
  const periodResults=[];
  for(let i=0;i<manifest.insights.length;i++){
   const entry=manifest.insights[i],range=entry.payload;
   const summary=(await call("/reflection/summary?from="+range.from+"&to="+range.to+"&timeZone="+encodeURIComponent(range.timeZone))).data.data;
   const expected=i===0?source.profile.axes:i===1?source.periodComparison.previous.axes:source.periodComparison.current.axes;
   assert.deepEqual(summary.result.axes,expected.map(({key,numerator,denominator,value,unknownDays}:any)=>({key,numerator,denominator,value,unknownDays})));
   const saved=(await call("/insights","POST",range,entry.idempotencyKey)).data.data;
   const replay=(await call("/insights","POST",range,entry.idempotencyKey)).data.data;
   assert.equal(replay.id,saved.id);assert.deepEqual(replay.result,saved.result);
   assert.equal(saved.generatorVersion,"insights-fixed-five-4");
   assert.deepEqual(saved.result,summary.result);
   periodResults.push({request:range,insight:saved});
  }
  const after=(await call("/records/preexisting-kept")).data.data.record;
  assert.equal(after.body,baseline.body);assert.equal(after.version,before.version);
  await close();dbs.close();dbs=openDatabases(options);seedProfiles(dbs,identity.profiles);
  server=serve({fetch:app().fetch,hostname:"127.0.0.1",port:0});
  if(!server.listening)await new Promise<void>(resolve=>server.once("listening",resolve));port=(server.address() as any).port;
  for(const saved of periodResults){
   const reopened=(await call("/insights/"+saved.insight.id)).data.data;
   assert.deepEqual(reopened,saved.insight);
  }
  const list=(await call("/records?limit=100&includeUndated=true")).data.items;
  assert.equal(list.length,15); // existing record + 14 distinct fixed IDs, despite all replays
  writeFileSync(new URL("../../../docs/evidence/INSIGHTS/grounded-http.json",import.meta.url),JSON.stringify({checkedAt:new Date().toISOString(),mode:"demo/self in isolated temporary SQLite; no shared server used",transport:"localhost HTTP ephemeral port",providerInvoked:false,mediaChecks,existingRecordPreserved:true,uniqueRecordCount:list.length,sourceBodiesUnchanged:true,checks,periodResults},null,2)+"\n");
 }finally{await close();dbs.close();}
});
