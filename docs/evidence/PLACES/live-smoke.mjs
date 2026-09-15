import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {mkdtempSync,writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {randomUUID} from "node:crypto";
import {DatabaseSync} from "node:sqlite";
process.loadEnvFile(process.env.PLACES_ENV_FILE || "/Users/shimurakaiya/3_Workspace/sodateru-map-production-specs/.env");
const root=fileURLToPath(new URL("../../../",import.meta.url));
const directory=mkdtempSync(join(tmpdir(),"places-http-"));
const livePath=join(directory,"live.sqlite"),demoPath=join(directory,"demo.sqlite");
let child,origin,cookie="";const checks=[];
async function start(){
 child=spawn(process.execPath,["--experimental-transform-types","server/app/main.ts"],{cwd:root,env:{...process.env,SODATERU_PORT:"0",SODATERU_DB_PATH:livePath,SODATERU_DEMO_DB_PATH:demoPath,SODATERU_PROFILES_PATH:join(directory,"profiles.json")},stdio:["ignore","pipe","pipe"]});
 await new Promise((resolve,reject)=>{let out="",err="";const timeout=setTimeout(()=>reject(new Error("server start timeout: "+err)),15000);
 child.stdout.on("data",data=>{out+=data.toString();for(const line of out.split("\n")){try{const event=JSON.parse(line);if(event.event==="ready"){origin=event.origin;clearTimeout(timeout);resolve();}}catch{}}});
 child.stderr.on("data",data=>{err+=data.toString();});child.once("exit",code=>{clearTimeout(timeout);reject(new Error(`server exited ${code}: ${err}`));});
 });
}
async function stop(){if(!child||child.exitCode!==null)return;const c=child;await new Promise(resolve=>{c.once("exit",resolve);c.kill("SIGTERM");});child=null;}
async function request(path,{method="GET",body,key,mode="live"}={}){
 const response=await fetch(origin+"/api/v1"+path,{method,headers:{"X-Request-Id":randomUUID(),"X-Data-Mode":mode,...(cookie?{Cookie:cookie}:{}),...(body?{"Content-Type":"application/json"}:{}),...(key?{"Idempotency-Key":key}:{})},body:body?JSON.stringify(body):undefined});
 if(response.headers.get("set-cookie"))cookie=response.headers.get("set-cookie").split(";")[0];
 const value=await response.json();return {status:response.status,value,etag:response.headers.get("etag")};
}
function count(path=livePath){const db=new DatabaseSync(path,{readOnly:true});try{return db.prepare("SELECT count(*) AS n FROM places").get().n;}finally{db.close();}}
let evidence;
try{
 await start();
 let response=await request("/session",{method:"POST",key:randomUUID(),body:{profileKey:"self"}});assert.equal(response.status,201);checks.push("CORE session HTTP 201");
 assert.equal(count(),0);
 response=await request("/place-candidates?q="+encodeURIComponent("東京駅")+"&limit=3");assert.equal(response.status,200,JSON.stringify(response.value));assert.ok(response.value.data.items.length>0);assert.equal(count(),0);checks.push("Nominatim adapter real HTTP search; database still empty");
 const result=response.value.data,candidate=result.items[0];assert.equal(candidate.retention,"storable");assert.ok(candidate.fetchedAt);assert.ok(candidate.sourceUrl);
 const input={id:randomUUID(),mode:"candidate",resultId:result.resultId,candidateId:candidate.candidateId},key=randomUUID();
 response=await request("/places",{method:"POST",body:input,key});assert.equal(response.status,201,JSON.stringify(response.value));const place=response.value.data;assert.equal(count(),1);assert.equal(response.etag,'"1"');checks.push("adoption persisted one place with CORE idempotency receipt");
 response=await request("/places",{method:"POST",body:input,key});assert.equal(response.status,200);assert.equal(response.value.data.id,place.id);assert.equal(count(),1);checks.push("same HTTP key replay returns same placeId");
 response=await request("/places",{method:"POST",body:{...input,id:randomUUID()},key});assert.equal(response.status,409);assert.equal(response.value.error.code,"IDEMPOTENCY_CONFLICT");checks.push("same key with changed input conflicts");
 response=await request("/places",{method:"POST",body:{...input,candidateId:"candidate-other"},key:randomUUID()});assert.equal(response.status,409);assert.equal(response.value.error.code,"REQUEST_CONFLICT");checks.push("same adoption target with changed input conflicts");
 response=await request("/place-candidates?category=coffee&longitude=139.7671&latitude=35.6812");assert.equal(response.status,200,JSON.stringify(response.value));assert.ok(response.value.data.items.length);const nearby=response.value.data;assert.equal(nearby.items[0].retention,"temporary");
 response=await request("/places",{method:"POST",body:{id:randomUUID(),mode:"candidate",resultId:nearby.resultId,candidateId:nearby.items[0].candidateId},key:randomUUID()});assert.equal(response.status,409);assert.equal(response.value.error.code,"REQUEST_CONFLICT");assert.equal(count(),1);checks.push("Mapbox adapter real HTTP search; temporary adopt rejected without DB growth");
 await stop();const db=new DatabaseSync(livePath);db.prepare("UPDATE places SET name=?,version=version+1 WHERE id=?").run("再送現在値検証",place.id);db.close();await start();
 response=await request("/places",{method:"POST",body:input,key});assert.equal(response.status,200,JSON.stringify(response.value));assert.equal(response.value.data.id,place.id);assert.equal(response.value.data.name,"再送現在値検証");assert.equal(response.value.data.version,2);checks.push("server restart, candidates gone, replay reads current persisted resource");
 response=await request("/places",{method:"POST",body:input,key:randomUUID()});assert.equal(response.status,200);assert.equal(response.value.data.id,place.id);checks.push("business receipt replay also survives restart under a new HTTP key");
 response=await request("/places?q="+encodeURIComponent("再送現在値検証"));assert.equal(response.status,200);assert.equal(response.value.items[0].id,place.id);assert.equal(count(demoPath),0);checks.push("saved list re-fetch and live/demo DB separation");
 await stop();const deleted=new DatabaseSync(livePath);deleted.exec("PRAGMA foreign_keys=ON");deleted.prepare("DELETE FROM places WHERE id=?").run(place.id);deleted.close();await start();
 response=await request("/places",{method:"POST",body:input,key});assert.equal(response.status,404);assert.equal(response.value.error.code,"NOT_FOUND");assert.equal(count(),0);checks.push("deleted resource replay returns NOT_FOUND without restoration");
 evidence={timestamp:new Date().toISOString(),status:"passed",checks,source:{provider:candidate.provider,sourceUrl:candidate.sourceUrl,attribution:candidate.attribution,fetchedAt:candidate.fetchedAt},candidate:{resultId:result.resultId,candidateId:candidate.candidateId,expiresAt:result.expiresAt},placeId:place.id,notes:"Current-value and deletion states injected directly into isolated test DB while server stopped. PATCH and INFORMATION detail not exercised here. Mapbox temporary candidate payloads and all credentials excluded."};
}catch(error){evidence={timestamp:new Date().toISOString(),status:"failed",checks,error:String(error)};process.exitCode=1;}
finally{await stop();writeFileSync(new URL("live-search.json",import.meta.url),JSON.stringify(evidence,null,2)+"\n");console.log(JSON.stringify(evidence,null,2));}
