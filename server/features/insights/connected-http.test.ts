import {test} from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {randomUUID} from "node:crypto";
import {serve} from "@hono/node-server";
import {createApp} from "../../app/app.ts";
import {openDatabases} from "../../db/connection.ts";
import {loadLocalIdentity,seedProfiles} from "../../core/session.ts";
import insights from "./register.ts";
import records from "../records/register.ts";

test("実RECORDS/INFORMATIONから固定5軸をHTTP保存・評価・再起動再取得・参照変更拒否",async()=>{
 const dir=mkdtempSync(join(tmpdir(),"insights-connected-"));
 const identity=loadLocalIdentity(join(dir,"profiles.json"));
 const contract=JSON.parse(readFileSync(new URL("../../../docs/01_requirements/04_api/openapi.json",import.meta.url),"utf8"));
 const fragment=JSON.parse(readFileSync(new URL("../../../docs/01_requirements/04_api/fragments/INSIGHTS.json",import.meta.url),"utf8"));
 Object.assign(contract.components.schemas,fragment.schemas);
 for(const op of fragment.operations)(contract.paths[op.path]??={})[op.method]=op;
 const options={livePath:join(dir,"live.sqlite"),demoPath:join(dir,"demo.sqlite"),migrations:[...records.migrations!,...insights.migrations!]};
 let dbs=openDatabases(options);seedProfiles(dbs,identity.profiles);
 const app=()=>createApp({databases:dbs,identity,features:[records,insights],contract});
 let server=serve({fetch:app().fetch,hostname:"127.0.0.1",port:0});
 if(!server.listening)await new Promise<void>(resolve=>server.once("listening",resolve));
 let port=(server.address() as any).port;
 const headers:Record<string,string>={"X-Data-Mode":"live","Content-Type":"application/json"};
 const checks:any[]=[];
 const call=async(path:string,method="GET",body?:unknown,extra:Record<string,string>={})=>{
  const response=await fetch("http://127.0.0.1:"+port+"/api/v1"+path,{method,headers:{...headers,"X-Request-Id":randomUUID(),...extra},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const raw=await response.text();const data=raw?JSON.parse(raw):null;
  checks.push({method,path,status:response.status});
  return {response,data};
 };
 try{
  const session=await call("/session","POST",{profileKey:"self"},{"Idempotency-Key":"session"});
  assert.equal(session.response.status,201);headers.Cookie=session.response.headers.get("set-cookie")!.split(";")[0]!;
  const from=Date.parse("2026-09-01T00:00:00Z"),to=from+2*86400000;
  const input={id:"demo-exp",kind:"diary",visitId:null,placeId:null,occurredAt:from+3600000,endedAt:null,timePrecision:"exact",body:"本を見つけた。カフェで過ごした。公園を歩いた。友人と話した。",purposes:[],activities:[],impression:"",periodAnswers:{},bookmarked:false,useForSuggestions:true,topicKey:null,visibility:"private",sharedWith:[]};
  let r=await call("/records","POST",input,{"Idempotency-Key":"record"});assert.equal(r.response.status,201,JSON.stringify(r.data));
  r=await call("/reflection/summary?from="+from+"&to="+to+"&timeZone=UTC");assert.equal(r.response.status,200,JSON.stringify(r.data));
  assert.deepEqual(r.data.data.result.axes.map((a:any)=>[a.key,a.numerator,a.denominator,a.unknownDays]),["nature","books","cafe","walk","social"].map(key=>[key,1,1,1]));
  const computed=r.data.data.result;
  r=await call("/insights","POST",{id:"demo-insight",from,to,timeZone:"UTC"},{"Idempotency-Key":"insight"});assert.equal(r.response.status,201,JSON.stringify(r.data));
  assert.equal(r.data.data.result.evidence.selfReports.length,5);
  r=await call("/insights/demo-insight","PATCH",{review:"unsure",reviewNote:"別の日も見て考えたい"},{"If-Match":'"1"'});assert.equal(r.response.status,200,JSON.stringify(r.data));
  await new Promise<void>(resolve=>server.close(()=>resolve()));dbs.close();dbs=openDatabases(options);seedProfiles(dbs,identity.profiles);
  server=serve({fetch:app().fetch,hostname:"127.0.0.1",port:0});if(!server.listening)await new Promise<void>(resolve=>server.once("listening",resolve));port=(server.address() as any).port;
  r=await call("/insights/demo-insight");assert.equal(r.response.status,200);assert.equal(r.data.data.reviewNote,"別の日も見て考えたい");
  r=await call("/insights","POST",{id:"demo-insight",from,to,timeZone:"UTC"},{"Idempotency-Key":"insight"});assert.equal(r.response.status,201);assert.equal(r.data.data.review,"unsure");
  r=await call("/records/demo-exp","PATCH",{body:"体験の記録を訂正しました。"},{"If-Match":'"1"'});assert.equal(r.response.status,200,JSON.stringify(r.data));
  r=await call("/insights/demo-insight");assert.equal(r.response.status,409,JSON.stringify(r.data));
  writeFileSync(new URL("../../../docs/evidence/INSIGHTS/connected-http.json",import.meta.url),JSON.stringify({checkedAt:new Date().toISOString(),mode:"live in isolated temporary SQLite",transport:"localhost HTTP ephemeral port",dependencies:"actual CORE/RECORDS/INFORMATION; AI registration only, provider not invoked",checks,computed},null,2)+"\n");
 }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));dbs.close();}
});
