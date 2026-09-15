import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {mkdtempSync,writeFileSync,readFileSync} from "node:fs";
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
async function request(path,{method="GET",body,key,mode="live",version,anonymous=false}={}){
 const response=await fetch(origin+"/api/v1"+path,{method,headers:{"X-Request-Id":randomUUID(),"X-Data-Mode":mode,...(!anonymous&&cookie?{Cookie:cookie}:{}),...(body?{"Content-Type":"application/json"}:{}),...(key?{"Idempotency-Key":key}:{}),...(version?{"If-Match":`"${version}"`}:{})},body:body?JSON.stringify(body):undefined});
 if(response.headers.get("set-cookie"))cookie=response.headers.get("set-cookie").split(";")[0];
 const value=await response.json();return {status:response.status,value,etag:response.headers.get("etag")};
}
function count(path=livePath){const db=new DatabaseSync(path,{readOnly:true});try{return db.prepare("SELECT count(*) AS n FROM places").get().n;}finally{db.close();}}
let evidence;
try{
 await start();
 let response=await request("/session",{method:"POST",key:randomUUID(),body:{profileKey:"self"}});assert.equal(response.status,201);
 response=await request("/place-candidates?q="+encodeURIComponent("東京駅")+"&limit=1");assert.equal(response.status,200,JSON.stringify(response.value));
 const search=response.value.data, candidate=search.items[0];assert.ok(candidate);const placeId=randomUUID();
 response=await request("/places",{method:"POST",key:randomUUID(),body:{id:placeId,mode:"candidate",resultId:search.resultId,candidateId:candidate.candidateId}});assert.equal(response.status,201,JSON.stringify(response.value));
 const original=response.value.data;
 const openingHours={rawText:"現地未確認の営業時間",timezone:null,sourceUrl:null,fetchedAt:null,verificationStatus:"unverified"};
 const entrances=[{id:"entrance-unverified",coordinates:original.coordinates,label:null,accessibility:"unknown",sourceUrl:null,fetchedAt:null,verificationStatus:"unverified"}];
 response=await request(`/places/${placeId}`,{method:"PATCH",version:1,body:{name:"手動訂正を維持",openingHours,entrances}});assert.equal(response.status,200,JSON.stringify(response.value));checks.push("extended metadata PATCH accepted by actual common contract and persisted");
 response=await request(`/places/${placeId}`,{method:"PATCH",version:2,body:{refreshExternal:true}});assert.equal(response.status,200,JSON.stringify(response.value));assert.equal(response.value.data.name,"手動訂正を維持");assert.equal(response.value.data.version,3);assert.ok(response.value.data.fetchedAt>=original.fetchedAt);checks.push("real Nominatim refresh through HTTP preserves manual correction");
 response=await request(`/places/${placeId}`);assert.equal(response.status,200);assert.deepEqual(response.value.data.openingHours,openingHours);assert.deepEqual(response.value.data.entrances,entrances);assert.deepEqual(response.value.data.correctedFields,["entrances","name","openingHours"]);
 response=await request(`/places/${placeId}`,{method:"PATCH",version:3,body:{resetFields:["name","openingHours","entrances"]}});assert.equal(response.status,200,JSON.stringify(response.value));assert.notEqual(response.value.data.name,"手動訂正を維持");
 response=await request(`/places/${placeId}`);const before=response.value.data;assert.deepEqual(before.correctedFields,[]);if(before.openingHours)assert.equal(before.openingHours.verificationStatus,"unverified");checks.push("reset restores latest external metadata without inferring confirmation");
 await stop();await start();response=await request(`/places/${placeId}`);assert.equal(response.status,200);assert.deepEqual(response.value.data,before);checks.push("extended attributes and source survive server restart and re-fetch");
 evidence={timestamp:new Date().toISOString(),status:"passed",checks,placeId,provider:before.place.provider,externalId:before.place.externalId,sourceUrl:before.place.sourceUrl,fetchedAt:before.place.fetchedAt,version:before.place.version,recordSourceStates:{own:before.ownRecords.status,shared:before.sharedRecords.status,visits:before.visits.status}};
}catch(error){evidence={timestamp:new Date().toISOString(),status:"failed",checks,error:String(error)};process.exitCode=1;}
finally{await stop();writeFileSync(new URL("live-refresh.json",import.meta.url),JSON.stringify(evidence,null,2)+"\n");console.log(JSON.stringify(evidence,null,2));}
