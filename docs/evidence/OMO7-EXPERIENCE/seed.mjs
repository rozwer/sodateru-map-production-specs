// Explicitly authorized local demo import; no live writes or deletion.
import { demoClient } from "./client.mjs";
import { readFileSync, writeFileSync } from "node:fs";
const { api, session } = await demoClient();
if(session.person.id !== "0f40f7ee-ed3e-493a-a904-a2a72bd585e2") throw new Error("Unexpected demo person");
const at = (time, date="2026-09-15") => Date.parse(`${date}T${time}:00+09:00`);
const report={personId:session.person.id,dataMode:session.dataMode,places:[],records:[],visits:[],route:null,track:null};
const prefix="yokohama-20260915";
async function exists(op,path){try{return await api.request(op,{path});}catch(e){if(e.status===404)return null;throw e;}}
async function manual(key,name,coordinates,address){
 const id=`${prefix}-${key}`;const old=await exists("getPlacesPlaceId",{placeId:id});
 const place=old?.data.place??(await api.request("postPlaces",{body:{id,mode:"manual",name,position:{longitude:coordinates[0],latitude:coordinates[1]},address,buildingKey:null},idempotencyKey:id})).data;
 report.places.push({id:place.id,name:place.name});return place;
}
const hotel=await manual("omo7","OMO7横浜 by 星野リゾート",[139.6380035,35.4436422],"神奈川県横浜市中区港町1丁目1番地1");
const venue=await manual("beach","THE BEACH YOKOHAMA",[139.6616906,35.4383509],"神奈川県横浜市中区新山下3-2-5");
async function candidate(key,q){
 const id=`${prefix}-${key}`;const old=await exists("getPlacesPlaceId",{placeId:id});
 if(old){report.places.push({id:old.data.place.id,name:old.data.place.name});return old.data.place;}
 const {data:result}=await api.request("getPlaceCandidates",{query:{q}});
 const item=result.items.find(p=>p.name===q&&p.address?.includes("横浜"));
 if(!item)throw new Error(`No verified candidate: ${q}`);
 const {data:place}=await api.request("postPlaces",{body:{id,mode:"candidate",resultId:result.resultId,candidateId:item.candidateId},idempotencyKey:id});
 report.places.push({id:place.id,name:place.name});return place;
}
const park=await candidate("yamashita","山下公園");
const cafe=await candidate("cafe","象の鼻カフェ");
async function visit(key,place,start,end){
 const id=`${prefix}-visit-${key}`;let value=(await exists("getVisitsVisitId",{visitId:id}))?.data;
 value??=(await api.request("postVisits",{body:{id,placeId:place.id,startedAt:start,endedAt:end,timePrecision:"approximate",origin:"manual"},idempotencyKey:id})).data;
 if(value.status!=="confirmed")value=(await api.request("patchVisitsVisitId",{path:{visitId:id},body:{status:"confirmed"},version:value.version})).data;
 report.visits.push({id,placeId:place.id});return value;
}
const hotelVisit=await visit("breakfast",hotel,at("07:30"),at("08:10"));
const venueVisit=await visit("venue",venue,at("09:00"),null);
async function record(key,place,body,options={}){
 const id=`${prefix}-record-${key}`;
 if(!await exists("getRecordsRecordId",{recordId:id})) await api.request("postRecords",{body:{
  id,kind:options.kind??"experience",visitId:options.visitId??null,placeId:options.visitId?null:place.id,
  occurredAt:options.visitId?null:(options.at??null),endedAt:null,timePrecision:options.visitId?"unknown":options.at?"approximate":"unknown",
  body,purposes:options.purposes??[],activities:[],impression:options.impression??"",periodAnswers:{},
  bookmarked:true,useForSuggestions:false,topicKey:null,visibility:"private",sharedWith:[]
 },idempotencyKey:id});
 report.records.push({id,placeId:place.id});return id;
}
const breakfast=await record("breakfast",hotel,"OMO7が宿泊場所でパンが美味しかったし、非常に高級感がありました。\n\n横浜で迎える朝。添付は朝食の生成イメージです。表示時刻は朝の流れに合わせた目安です。",{visitId:hotelVisit.id,purposes:["食事","宿泊"],impression:"パンが美味しかったし、非常に高級感がありました。"});
await record("venue",venue,"今は会場に居ます。\n\nTHE BEACH YOKOHAMAで開発中。受付9:00、開発10:15–15:30、提出15:30、審査16:00–18:15、交流・ディナー18:15–20:30、終了21:00。開始時刻は公式日程に沿った目安です。",{visitId:venueVisit.id,purposes:["開発","交流"]});
await record("plans",park,"これからの予定\n21:00 会場を出発 → 山下公園の海辺を短く散歩 → OMO7横浜へ。疲れていたら散歩を省いて直接戻る。\n明日10:00ごろ 象の鼻カフェで港を眺めながらひと休み。空席・営業時間は出発前に確認。\nこれからの移動プランで、訪問済みの記録ではありません。",{kind:"memo",at:at("21:00"),purposes:["散歩","休憩"]});
let detail=(await api.request("getRecordsRecordId",{path:{recordId:breakfast}})).data;
const mediaId=`${prefix}-breakfast-image`;
if(!detail.media.data?.items.some(m=>m.id===mediaId)){
 const form=new FormData();form.set("id",mediaId);form.set("position","0");
 form.set("file",new Blob([readFileSync(new URL("../../../src/features/plugins/assets/omo7-breakfast-generated.png",import.meta.url))],{type:"image/png"}),"朝食の生成イメージ.png");
 await api.request("postRecordsRecordIdMedia",{path:{recordId:breakfast},body:form,version:detail.record.version,idempotencyKey:mediaId});
}
const routeId=`${prefix}-morning-route`;
let route=(await exists("getSavedRoutesRouteId",{routeId}))?.data;
if(!route){const {data:found}=await api.request("postRouteSearches",{body:{waypoints:[{kind:"stored",placeId:hotel.id},{kind:"stored",placeId:venue.id}],mode:"walking",title:"朝の移動プラン：OMO7横浜 → THE BEACH YOKOHAMA"},idempotencyKey:`${prefix}-route-search`});
 route=(await api.request("postSavedRoutes",{body:{id:routeId,resultId:found.resultId,title:"朝の移動プラン：OMO7横浜 → THE BEACH YOKOHAMA"},idempotencyKey:routeId})).data;}
report.route={id:route.id,distanceM:route.distanceM,durationSec:route.durationSec,provider:route.provider};
const segmentId=`${prefix}-synthetic-morning`;
const points=(await api.request("getTrackPoints",{query:{segmentId,limit:100}})).items;
if(!points.length){
 const coordinates=route.geometry.coordinates;
 const distances=[0];for(let i=1;i<coordinates.length;i++){const a=coordinates[i-1],b=coordinates[i];distances.push(distances.at(-1)+Math.hypot((b[0]-a[0])*Math.cos(a[1]*Math.PI/180),b[1]-a[1]));}
 const items=coordinates.map(([longitude,latitude],i)=>({id:`${segmentId}-${i}`,segmentId,sourcePointId:`synthetic-mapbox-${prefix}-${i}`,observedAt:at("08:15")+Math.round(distances[i]/distances.at(-1)*route.durationSec*1000),longitude,latitude,accuracyM:100000}));
 await api.request("postTrackPoints",{body:{items},idempotencyKey:segmentId});
}
report.track={segmentId,count:(await api.request("getTrackPoints",{query:{segmentId,limit:100}})).items.length,provenance:"synthetic timeline along Mapbox walking route; not measured GPS; accuracyM 100000 means unmeasured"};
await record("morning-plan",hotel,`朝の移動プラン\n08:15 OMO7横浜を出発 → 約${Math.ceil(route.durationSec/60)}分、${(route.distanceM/1000).toFixed(1)}km歩いてTHE BEACH YOKOHAMAへ。9:00の受付前に到着する流れです。\n道路経路から組んだ移動イメージです。本人のGPS計測ではありません。`,{kind:"memo",at:at("08:15"),purposes:["移動"]});
for(const r of report.records){const {data}=await api.request("getRecordsRecordId",{path:{recordId:r.id}});r.body=data.record.body;r.media=data.media.data?.items.map(m=>({id:m.id,status:m.status}));}
writeFileSync(new URL("./receipt.json",import.meta.url),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
