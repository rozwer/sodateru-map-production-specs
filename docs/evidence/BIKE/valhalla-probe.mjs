// Bounded research only. Three identified public requests maximum; no production adapter.
import {writeFileSync} from "node:fs";
const endpoint="https://valhalla1.openstreetmap.de";
const evidence={checkedAt:Date.now(),purpose:"BIKE #91 bounded Japan motorcycle feasibility",endpoint,clientId:"sodateru-map-bike-issue29-research",requests:[]};
const output=new URL("./valhalla-live.json",import.meta.url);
async function call(path,request){
 const startedAt=Date.now();let record;
 try {
  const response=await fetch(endpoint+path,{method:"POST",headers:{"Content-Type":"application/json","X-Client-Id":evidence.clientId,"User-Agent":"sodateru-map-bike/1.0 (+https://github.com/rozwer/sodateru-map-production-specs)"},body:JSON.stringify(request),signal:AbortSignal.timeout(25000)});
  const raw=await response.text();let body;try{body=JSON.parse(raw);}catch{body={unparsed:raw.slice(0,2000)};}
  record={path,request,startedAt,fetchedAt:Date.now(),httpStatus:response.status,body};
 }catch(e){record={path,request,startedAt,fetchedAt:Date.now(),error:{name:e.name,message:e.message}};}
 evidence.requests.push(record);writeFileSync(output,JSON.stringify(evidence,null,2)+"\n");
 console.log(JSON.stringify({path,costing:request.costing,status:record.httpStatus,error:record.error,summary:record.body?.trip?.summary,warnings:record.body?.warnings??record.body?.trip?.warnings,bodyKeys:Object.keys(record.body??{})}));
 return record;
}
const base={locations:[{lat:35.659,lon:139.701,type:"break"},{lat:35.665,lon:139.712,type:"break"}],units:"kilometers",language:"ja-JP",date_time:{type:1,value:"2026-09-15T13:30"}};
const motorcycle=await call("/route",{...base,costing:"motorcycle",costing_options:{motorcycle:{use_highways:0,exclude_highways:true}}});
await call("/route",{...base,costing:"motor_scooter",costing_options:{motor_scooter:{top_speed:30,use_highways:0,exclude_highways:true}}});
const shape=motorcycle.body?.trip?.legs?.[0]?.shape;
if(typeof shape==="string")await call("/trace_attributes",{costing:"motorcycle",costing_options:{motorcycle:{use_highways:0,exclude_highways:true}},date_time:base.date_time,encoded_polyline:shape,shape_match:"edge_walk"});
