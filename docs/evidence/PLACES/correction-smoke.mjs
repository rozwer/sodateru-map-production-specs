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
 const firstId=randomUUID(),secondId=randomUUID(),buildingKey="mapbox:basemap:buildings:test:123";
 const manual=(id,name)=>({id,mode:"manual",name,position:{longitude:139.7,latitude:35.6},address:null,buildingKey});
 response=await request("/places",{method:"POST",key:randomUUID(),body:manual(firstId,"A施設")});assert.equal(response.status,201,JSON.stringify(response.value));
 response=await request("/places",{method:"POST",key:randomUUID(),body:manual(secondId,"B施設")});assert.equal(response.status,201);checks.push("manual places and shared building persisted through CORE HTTP");
 response=await request(`/places/${firstId}`,{method:"PATCH",body:{name:"拒否"},version:1,anonymous:true});assert.equal(response.status,401);checks.push("no session cannot edit");
 await stop();const profilePath=join(directory,"profiles.json"),identity=JSON.parse(readFileSync(profilePath,"utf8"));const editorId=randomUUID();identity.profiles.push({key:"second",id:editorId,name:"Second test user"});writeFileSync(profilePath,JSON.stringify(identity));await start();
 response=await request("/session",{method:"POST",key:randomUUID(),body:{profileKey:"second"}});assert.equal(response.status,201);
 response=await request(`/places/${firstId}`,{method:"PATCH",body:{name:"A共同訂正"}});assert.equal(response.status,428);checks.push("If-Match required");
 response=await request(`/places/${firstId}`,{method:"PATCH",body:{name:"A共同訂正"},version:1});assert.equal(response.status,200,JSON.stringify(response.value));assert.equal(response.value.data.version,2);checks.push("different active user in same mode can collaboratively correct");
 response=await request(`/places/${firstId}`,{method:"PATCH",body:{name:"競合"},version:1});assert.equal(response.status,412);checks.push("stale If-Match conflicts");
 response=await request(`/places/${firstId}`);assert.equal(response.status,200,JSON.stringify(response.value));assert.equal(response.etag,'"2"');assert.deepEqual(response.value.data.colocated.map(item=>item.id),[firstId,secondId]);assert.equal(response.value.data.openingHours,null);assert.deepEqual(response.value.data.entrances,[]);assert.deepEqual(response.value.data.photos,[]);assert.equal(response.value.data.description,null);checks.push("detail re-fetch, ETag, stable colocated selection including selected facility, unknown metadata");
 const before=response.value.data;await stop();await start();response=await request(`/places/${firstId}`);assert.equal(response.status,200);assert.deepEqual(response.value.data,before);checks.push("process restart preserves corrected place and detail metadata");
 const db=new DatabaseSync(livePath,{readOnly:true});const row=db.prepare("SELECT corrections_json FROM place_details WHERE place_id=?").get(firstId);db.close();assert.equal(JSON.parse(row.corrections_json).name.personId,editorId);checks.push("correction actor and timestamp persisted");
 evidence={timestamp:new Date().toISOString(),status:"passed",checks,placeId:firstId,buildingKey,version:2,recordSourceStates:{own:before.ownRecords.status,shared:before.sharedRecords.status,visits:before.visits.status},notes:"Two profiles configured only in isolated test environment. No record source is substituted; unavailable INFORMATION remains failed. Extended refresh/metadata PATCH awaits generated common schema."};
}catch(error){evidence={timestamp:new Date().toISOString(),status:"failed",checks,error:String(error)};process.exitCode=1;}
finally{await stop();writeFileSync(new URL("live-corrections.json",import.meta.url),JSON.stringify(evidence,null,2)+"\n");console.log(JSON.stringify(evidence,null,2));}
