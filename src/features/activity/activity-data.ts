import type { ApiClient, RecordView, Visit, TrackPoint, RecordDetail, Place, GrowthItem } from '../../../packages/api-client/index';
import type { TimelineEntry } from './DailyTrack';
import { mediaDraft, readRecord } from '../records/record-flow';

export function localDay(date:string,timeZone:string):{from:number;to:number} {
  const midnight=(value:string)=>{
    const expected=Date.parse(`${value}T00:00:00Z`);
    let guess=expected;
    const formatter=new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
    for(let step=0;step<3;step++){
      const parts=Object.fromEntries(formatter.formatToParts(new Date(guess)).map(part=>[part.type,part.value]));
      const represented=Date.UTC(Number(parts.year),Number(parts.month)-1,Number(parts.day),Number(parts.hour),Number(parts.minute),Number(parts.second));
      const next=guess+expected-represented;if(next===guess)break;guess=next;
    }
    return guess;
  };
  const next=new Date(`${date}T12:00:00Z`);next.setUTCDate(next.getUTCDate()+1);
  return {from:midnight(date),to:midnight(next.toISOString().slice(0,10))};
}
export function displayTime(value:number|null,timeZone:string):string {return value===null?'':new Intl.DateTimeFormat('ja-JP',{timeZone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(value);}
export function displayDuration(start:number|null,end:number|null):string {
  if(start===null||end===null)return '';
  const minutes=Math.max(0,Math.round((end-start)/60000));
  return minutes>=60?`${Math.floor(minutes/60)}時間${minutes%60?`${minutes%60}分`:''}`:`${minutes}分`;
}
export async function allVisits(client:ApiClient,query:{from:number;to:number},signal:AbortSignal):Promise<Visit[]> {
  const items:Visit[]=[];let cursor:string|undefined;
  do{const page=await client.request('getVisits',{query:{...query,limit:100,...(cursor?{cursor}:{})},signal});items.push(...page.items);cursor=page.nextCursor??undefined;}while(cursor);
  return items;
}
export async function allTrackPoints(client:ApiClient,query:{from:number;to:number},signal:AbortSignal):Promise<TrackPoint[]> {
  const items:TrackPoint[]=[];let cursor:string|undefined;
  do{const page=await client.request('getTrackPoints',{query:{...query,limit:100,...(cursor?{cursor}:{})},signal});items.push(...page.items);cursor=page.nextCursor??undefined;}while(cursor);
  return items;
}
export async function growthForPlace(client:ApiClient,placeId:string,signal:AbortSignal):Promise<GrowthItem|null> {
  let cursor:string|undefined;
  do{const page=await client.request('getMapGrowth',{query:{limit:100,...(cursor?{cursor}:{})},signal});const item=page.items.find(item=>item.place.id===placeId);if(item)return item;cursor=page.nextCursor??undefined;}while(cursor);
  return null;
}

export async function recordDetails(client:ApiClient,records:RecordView[],signal:AbortSignal):Promise<Map<string,RecordDetail>> {
  const results=await Promise.allSettled(records.map(record=>readRecord(client,record.id,signal)));
  return new Map(results.flatMap(result=>result.status==='fulfilled'?[[result.value.record.id,result.value] as const]:[]));
}

/** Keep explicit provider gaps even when points retain the same segmentId. */
export function trackRuns(points:TrackPoint[]):{id:string;points:TrackPoint[]}[] {
 const runs:{id:string;points:TrackPoint[]}[]=[];
 for(const point of [...points].sort((a,b)=>a.observedAt-b.observedAt||a.id.localeCompare(b.id))){
  const previous=runs.at(-1);
  const breakBefore='breakBefore' in point && point.breakBefore===true;
  if(!previous || previous.points.at(-1)?.segmentId!==point.segmentId || breakBefore)runs.push({id:`${point.segmentId}:${point.id}`,points:[point]});
  else previous.points.push(point);
 }
 return runs;
}

export function timelineEntries(records:RecordView[],visits:Visit[],places:Map<string,Place>,details:Map<string,RecordDetail>,timeZone:string,track:TrackPoint[]=[]):TimelineEntry[] {
  const entries:{time:number|null;entry:TimelineEntry}[]=[];
  const attached=new Set(records.flatMap(record=>record.visitId?[record.visitId]:[]));
  for(const record of records){
    const visit=visits.find(visit=>visit.id===record.visitId),place=record.effectivePlaceId?places.get(record.effectivePlaceId):undefined;
    const detail=details.get(record.id);
    entries.push({time:record.effectiveStartedAt,entry:{id:record.id,recordId:record.id,...(record.visitId?{visitId:record.visitId}:{}),name:place?.name??(record.effectivePlaceId?'場所を取得できません':'場所未指定'),time:displayTime(record.effectiveStartedAt,timeZone),duration:displayDuration(record.effectiveStartedAt,record.effectiveEndedAt),body:record.body,undated:record.effectiveStartedAt===null,media:detail?.media.status==='ready'?detail.media.data.items.map(mediaDraft):[],status:visit?.status??'record',connectedToNext:false}});
  }
  for(const visit of visits){
    if(attached.has(visit.id))continue;
    entries.push({time:visit.startedAt,entry:{id:visit.id,visitId:visit.id,name:places.get(visit.placeId)?.name??'訪問先を取得できません',time:displayTime(visit.startedAt,timeZone),duration:displayDuration(visit.startedAt,visit.endedAt),media:[],status:visit.status,connectedToNext:false}});
  }
  const segments=trackRuns(track).map(run=>({from:run.points[0]!.observedAt,to:run.points.at(-1)!.observedAt}));
  const sorted=entries.sort((a,b)=>(a.time??Infinity)-(b.time??Infinity)||a.entry.id.localeCompare(b.entry.id));
  return sorted.map(({time,entry},index)=>{
    const next=sorted[index+1];
    return {...entry,connectedToNext:time!==null && next?.time!=null && segments.some(segment=>segment.from<=time && segment.to>=next.time!)};
  });
}
