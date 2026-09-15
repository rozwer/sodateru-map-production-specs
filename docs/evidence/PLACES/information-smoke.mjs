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
 const selfCookie=cookie,placeId=randomUUID(),visitId=randomUUID(),ownId=randomUUID(),sharedId=randomUUID(),privateId=randomUUID();
 response=await request("/places",{method:"POST",key:randomUUID(),body:{id:placeId,mode:"manual",name:"記録接続検証場所",position:{longitude:139.7,latitude:35.6},address:null,buildingKey:null}});assert.equal(response.status,201,JSON.stringify(response.value));
 const now=Date.now();response=await request("/visits",{method:"POST",key:randomUUID(),body:{id:visitId,placeId,startedAt:now,endedAt:null,timePrecision:"exact",origin:"manual"}});assert.equal(response.status,201,JSON.stringify(response.value));
 const record=(id,body,visibility="private",sharedWith=[])=>({id,kind:"experience",visitId:null,placeId,occurredAt:null,endedAt:null,timePrecision:"unknown",body,purposes:[],activities:[],impression:"",periodAnswers:{},bookmarked:false,useForSuggestions:true,topicKey:null,visibility,sharedWith});
 response=await request("/records",{method:"POST",key:randomUUID(),body:{...record(ownId,"本人の訪問記録"),visitId,placeId:null}});assert.equal(response.status,201,JSON.stringify(response.value));
 await stop();const identityPath=join(directory,"profiles.json"),identity=JSON.parse(readFileSync(identityPath,"utf8"));const selfId=identity.profiles.find(p=>p.key==="self").id;identity.profiles.push({key:"other",id:randomUUID(),name:"共有する本人"});writeFileSync(identityPath,JSON.stringify(identity));await start();
 response=await request("/session",{method:"POST",key:randomUUID(),body:{profileKey:"other"}});assert.equal(response.status,201);const otherCookie=cookie;
 response=await request("/records",{method:"POST",key:randomUUID(),body:record(sharedId,"共有対象の記録","selected",[selfId])});assert.equal(response.status,201,JSON.stringify(response.value));
 response=await request("/records",{method:"POST",key:randomUUID(),body:record(privateId,"他人の非公開本文")});assert.equal(response.status,201,JSON.stringify(response.value));
 cookie=selfCookie;response=await request(`/places/${placeId}`);assert.equal(response.status,200,JSON.stringify(response.value));const detail=response.value.data;
 for(const name of ["ownRecords","sharedRecords","visits"])assert.equal(detail[name].status,"ready",JSON.stringify(detail[name]));
 assert.deepEqual(detail.ownRecords.items.map(r=>r.id),[ownId]);assert.deepEqual(detail.sharedRecords.items.map(r=>r.id),[sharedId]);assert.deepEqual(detail.visits.items.map(r=>r.id),[visitId]);assert.equal(detail.ownRecords.items[0].place.id,placeId);assert.ok(!JSON.stringify(detail).includes("他人の非公開本文"));checks.push("actual INFORMATION reads own visit-linked record, selected shared record and own visit; excludes other private record");
 cookie=otherCookie;response=await request(`/records/${sharedId}`,{method:"PATCH",version:1,body:{visibility:"private",sharedWith:[]}});assert.equal(response.status,200,JSON.stringify(response.value));
 cookie=selfCookie;response=await request(`/places/${placeId}`);assert.equal(response.status,200);assert.equal(response.value.data.sharedRecords.items.length,0);assert.equal(response.value.data.ownRecords.items[0].id,ownId);checks.push("current sharing revocation immediately removes shared content from PlaceDetail");
 const before=response.value.data;await stop();await start();response=await request(`/places/${placeId}`);assert.equal(response.status,200);assert.deepEqual(response.value.data,before);checks.push("restart preserves real records, visit resolution and current sharing access");
 response=await request("/session",{method:"POST",key:randomUUID(),body:{profileKey:"self"},mode:"demo"});assert.equal(response.status,201);response=await request(`/places/${placeId}`,{mode:"demo"});assert.equal(response.status,404);checks.push("demo mode cannot read live place/detail");
 evidence={timestamp:new Date().toISOString(),status:"passed",checks,placeId,informationIntegration:"cc710000633262f7436bab3017355aed1633b86e",recordSourceStates:{own:before.ownRecords.status,shared:before.sharedRecords.status,visits:before.visits.status},note:"All records and visit were saved through actual CORE/RECORDS HTTP and read through unmodified INFORMATION service; isolated profile file only configures the second identity."};
}catch(error){evidence={timestamp:new Date().toISOString(),status:"failed",checks,error:String(error)};process.exitCode=1;}
finally{await stop();writeFileSync(new URL("live-information.json",import.meta.url),JSON.stringify(evidence,null,2)+"\n");console.log(JSON.stringify(evidence,null,2));}
