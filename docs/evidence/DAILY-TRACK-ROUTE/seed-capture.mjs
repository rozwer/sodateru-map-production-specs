// Authorized capture-only mock. Run only against this task's isolated API.
// Place coordinates come from the existing OMO7 source or the live place provider;
// route geometry comes unchanged from the route provider. Times are synthetic,
// never measured GPS. Provenance is retained in sourcePointId and this receipt.
import { createApiClient } from '../../../packages/api-client/index.ts';
import { writeFileSync } from 'node:fs';
let cookie='';
const api=createApiClient({baseUrl:'http://127.0.0.1:3277/api/v1',fetch:async(url,options)=>{
 const headers=new Headers(options.headers);if(headers.get('X-Data-Mode')!=='demo')throw Error('demo only');
 if(cookie)headers.set('Cookie',cookie);
 const response=await fetch(url,{...options,headers});
 if(response.headers.getSetCookie().length)cookie=response.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ');
 return response;
}});api.setDataMode('demo');
await api.request('postSession',{body:{profileKey:'self'},idempotencyKey:'daily-track-capture-session'});
const at=time=>Date.parse(`2026-09-15T${time}:00+09:00`);
const specifications=[
 {key:'hotel',name:'OMO7横浜 by 星野リゾート',coordinates:[139.6380035,35.4436422],address:'神奈川県横浜市中区港町1丁目1番地1',start:'07:30',end:'08:10',body:'朝食のパンを味わってから、街へ。横浜の朝をゆっくり歩き始めました。'},
 {key:'cafe',name:'象の鼻カフェ',start:'08:30',end:'09:00',body:'港を眺めてひと休み。水辺の景色を見ながら、今日の予定を整理しました。'},
 {key:'park',name:'山下公園',start:'09:15',end:'09:35',body:'海沿いを散歩。風が気持ちよく、少し足を止めて景色を楽しみました。'},
 {key:'venue',name:'THE BEACH YOKOHAMA',coordinates:[139.6616906,35.4383509],address:'神奈川県横浜市中区新山下3-2-5',start:'10:00',end:'12:00',body:'会場に到着。ここから開発の時間。歩いてきた道を振り返りながら、今日の発見を記録しました。'},
];
const receipt={provenance:'User-authorized capture mock, not personal measured movement. Place/route coordinates are provider sourced, unmodified. No shared/live DB writes.',date:'2026-09-15',api:'http://127.0.0.1:3277',places:[],visits:[],segments:[]};
async function existing(operation,path){try{return(await api.request(operation,{path})).data}catch(e){if(e.status===404)return null;throw e}}
for(const spec of specifications){
 const id=`capture277-${spec.key}`;
 let place=(await existing('getPlacesPlaceId',{placeId:id}))?.place;
 if(!place){
  let body;
  if(spec.coordinates)body={id,mode:'manual',name:spec.name,address:spec.address,position:{longitude:spec.coordinates[0],latitude:spec.coordinates[1]},buildingKey:null};
  else {const {data:result}=await api.request('getPlaceCandidates',{query:{q:spec.name}});const candidate=result.items.find(p=>p.name===spec.name&&p.address?.includes('横浜'));if(!candidate)throw Error(`No verified candidate ${spec.name}`);body={id,mode:'candidate',resultId:result.resultId,candidateId:candidate.candidateId};}
  place=(await api.request('postPlaces',{body,idempotencyKey:id})).data;
 }
 receipt.places.push({id:place.id,name:place.name,coordinates:place.coordinates});
 const visitId=`${id}-visit`;
 let visit=await existing('getVisitsVisitId',{visitId});
 visit??=(await api.request('postVisits',{body:{id:visitId,placeId:id,startedAt:at(spec.start),endedAt:at(spec.end),timePrecision:'approximate',origin:'manual'},idempotencyKey:visitId})).data;
 if(visit.status!=='confirmed')visit=(await api.request('patchVisitsVisitId',{path:{visitId},body:{status:'confirmed'},version:visit.version})).data;
 receipt.visits.push({id:visitId,placeId:id,startedAt:visit.startedAt});
 const recordId=`${id}-record`;
 if(!await existing('getRecordsRecordId',{recordId}))await api.request('postRecords',{body:{id:recordId,kind:'experience',visitId,placeId:null,occurredAt:null,endedAt:null,timePrecision:'unknown',body:spec.body,purposes:['散歩'],activities:[],impression:'',periodAnswers:{},bookmarked:false,useForSuggestions:false,topicKey:null,visibility:'private',sharedWith:[]},idempotencyKey:recordId});
}
for(let i=1;i<specifications.length;i++){
 const before=specifications[i-1],after=specifications[i],segmentId=`capture277-provider-route-${i}`;
 if((await api.request('getTrackPoints',{query:{segmentId,limit:100}})).items.length)continue;
 const {data:route}=await api.request('postRouteSearches',{body:{waypoints:[{kind:'stored',placeId:`capture277-${before.key}`},{kind:'stored',placeId:`capture277-${after.key}`}],mode:'walking',title:'撮影確認の移動イメージ'},idempotencyKey:crypto.randomUUID()});
 const coordinates=route.geometry.coordinates;
 const from=at(before.end),to=at(after.start);
 const items=coordinates.map(([longitude,latitude],j)=>({id:`${segmentId}-${j}`,segmentId,sourcePointId:`synthetic-provider-${segmentId}-${j}`,observedAt:from+Math.round(j/Math.max(1,coordinates.length-1)*(to-from)),longitude,latitude,accuracyM:100000}));
 for(let start=0;start<items.length;start+=1000)await api.request('postTrackPoints',{body:{items:items.slice(start,start+1000)},idempotencyKey:`${segmentId}-${start}`});
 receipt.segments.push({segmentId,provider:route.provider,pointCount:items.length,distanceM:route.distanceM,provenance:'Synthetic times on unchanged provider road geometry; accuracyM 100000 denotes unmeasured GPS.'});
}
writeFileSync(new URL('./capture-receipt.json',import.meta.url),JSON.stringify(receipt,null,2));
console.log(JSON.stringify({places:receipt.places.length,visits:receipt.visits.length,segments:receipt.segments.length}));
