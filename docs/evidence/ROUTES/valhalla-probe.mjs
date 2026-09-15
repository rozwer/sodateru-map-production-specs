/** Bounded public-demo probe: three sequential requests, no retries or app registration. */
import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
const locations=[{lon:139.767125,lat:35.681236,type:'break'},{lon:139.769,lat:35.682,type:'break'},{lon:139.771,lat:35.684,type:'break'}];
const scenarios=[
  {name:'bicycle-depart',costing:'bicycle',date_time:{type:1,value:'2026-09-16T10:00'}},
  {name:'bicycle-arrive',costing:'bicycle',date_time:{type:2,value:'2026-09-16T10:30'}},
  {name:'scooter-hard-highway-exclusion',costing:'motor_scooter',costing_options:{motor_scooter:{exclude_highways:true,use_highways:0}},date_time:{type:1,value:'2026-09-16T10:00'}}
];
const results=[];
for(const {name,...scenario} of scenarios){
  if(results.length)await delay(1500);
  const request={locations,units:'kilometers',language:'ja-JP',...scenario};
  const startedAt=new Date().toISOString();
  try {
    const response=await fetch('https://valhalla1.openstreetmap.de/route',{method:'POST',headers:{'Content-Type':'application/json','X-Client-Id':'sodateru-map-production-specs-routes-25-probe'},body:JSON.stringify(request),signal:AbortSignal.timeout(20000)});
    const text=await response.text();let body;try{body=JSON.parse(text)}catch{body={nonJson:true,bodyBytes:text.length}};
    const trip=body.trip;
    results.push({name,startedAt,request,httpStatus:response.status,body,shapeHash:trip?.legs?createHash('sha256').update(JSON.stringify(trip.legs.map(l=>l.shape))).digest('hex'):null});
    console.log(JSON.stringify({name,httpStatus:response.status,status:trip?.status,legs:trip?.legs?.length,summary:trip?.summary,warnings:body.warnings??trip?.warnings??[],locations:trip?.locations?.map(l=>({date_time:l.date_time,original_index:l.original_index})),error:body.error}));
    if(response.status===429)break;
  } catch(error){results.push({name,startedAt,request,error:{name:error.name,message:error.message,cause:error.cause?.code}});console.log(JSON.stringify({name,error:error.name,message:error.message}));break;}
}
writeFileSync(new URL('./valhalla-probe.json',import.meta.url),JSON.stringify({kind:'actual public-demo probe; not product integration or acceptance',endpoint:'https://valhalla1.openstreetmap.de/route',clientId:'sodateru-map-production-specs-routes-25-probe',checkedAt:new Date().toISOString(),results},null,2)+'\n');
