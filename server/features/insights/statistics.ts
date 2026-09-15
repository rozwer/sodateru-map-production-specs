import { dateInZone,calendarDays } from "./aggregation.ts";
import { normalizeRefs,type SourceRef } from "./identity.ts";
import { gpsStatistics,type TrackMaterial } from "./gps-statistics.ts";

export type StatisticsRange={from:number;to:number;timeZone:string};
export type VisitMaterial={id:string;placeId:string;startedAt:number|null;endedAt:number|null;timePrecision:string;status:string;origin:string;version:number;updatedAt:number};
export type RecordMaterial={id:string;effectiveAt:number|null;endedAt:number|null;timePrecision:string;visitStatus:string|null;purposes:string[];activities:{id:string;name:string}[];sourceRefs:SourceRef[];updatedAt?:number};
const startsWithin=(start:number|null,range:StatisticsRange)=>start!==null&&start>=range.from&&start<range.to;

/** Counts saved observations only; no axis label or preference is inferred from names. */
export function activityStatistics(range:StatisticsRange,allVisits:readonly VisitMaterial[],materials:readonly RecordMaterial[],points:readonly TrackMaterial[]=[]){
 const days=calendarDays(range.from,range.to,range.timeZone);
 const uniqueVisits=[...new Map(allVisits.map(v=>[v.id,v])).values()];
 const confirmed=uniqueVisits.filter(v=>v.status==="confirmed");
 const period=confirmed.filter(v=>v.timePrecision!=="unknown"&&startsWithin(v.startedAt,range));
 const unknownPlaces=new Set(confirmed.filter(v=>v.startedAt===null||v.timePrecision==="unknown").map(v=>v.placeId));
 const first=new Map<string,VisitMaterial>();
 for(const v of confirmed){
   if(v.startedAt===null||v.timePrecision==="unknown")continue;
   const current=first.get(v.placeId);
   if(!current||v.startedAt<current.startedAt!||v.startedAt===current.startedAt&&v.id<current.id)first.set(v.placeId,v);
 }
 const periodPlaces=new Set(period.map(v=>v.placeId));
 const newPlaces=[...first.values()].filter(v=>!unknownPlaces.has(v.placeId)&&v.startedAt!>=range.from&&v.startedAt!<range.to);
 const records=[...new Map(materials.map(r=>[r.id,r])).values()].filter(r=>r.timePrecision!=="unknown"&&startsWithin(r.effectiveAt,range));
 const activityMap=new Map<string,{ids:Set<string>;records:Set<string>}>();
 for(const record of records)for(const activity of record.activities){
   if(!activityMap.has(activity.name))activityMap.set(activity.name,{ids:new Set(),records:new Set()});
   const group=activityMap.get(activity.name)!;group.ids.add(record.id+":"+activity.id);group.records.add(record.id);
 }
 const activities=[...activityMap].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([name,value])=>({name,count:value.ids.size,recordIds:[...value.records].sort(),source:"records.activities" as const}));
 const daily=days.map(date=>({
   date,confirmedVisits:period.filter(v=>dateInZone(v.startedAt!,range.timeZone)===date).length,
   recordIds:records.filter(r=>dateInZone(r.effectiveAt!,range.timeZone)===date).map(r=>r.id).sort()
 }));
 const refs=normalizeRefs([
   ...materials.filter(r=>r.effectiveAt===null||r.timePrecision==="unknown"||records.some(selected=>selected.id===r.id)).flatMap(r=>r.sourceRefs),
   ...period.map(v=>({type:"visit" as const,id:v.id,version:v.version})),
   ...[...first.values()].filter(v=>periodPlaces.has(v.placeId)).map(v=>({type:"visit" as const,id:v.id,version:v.version})),
   ...confirmed.filter(v=>v.startedAt===null||v.timePrecision==="unknown").map(v=>({type:"visit" as const,id:v.id,version:v.version}))
 ]);
 const gps=gpsStatistics(range,points);
 const undatedRecords=materials.filter(r=>r.effectiveAt===null||r.timePrecision==="unknown").length;
 const sourceVisits=uniqueVisits.filter(v=>refs.some(ref=>ref.type==="visit"&&ref.id===v.id));
 const sourceRecords=materials.filter(r=>refs.some(ref=>ref.type==="record"&&ref.id===r.id));
 const maximum=(values:number[])=>values.length?values.reduce((a,b)=>Math.max(a,b)):null;
 const span=(values:number[])=>({firstObservedAt:values.length?values.reduce((a,b)=>Math.min(a,b)):null,lastObservedAt:maximum(values)});
 const sources=[
   {id:"visits" as const,label:"本人が確認した訪問",itemCount:period.length,...span(period.map(v=>v.startedAt!)),lastUpdatedAt:maximum(sourceVisits.map(v=>v.updatedAt)),status:period.length?"observed" as const:"empty" as const,description:"期間内に開始した確定訪問を数えます。新しい場所の判定だけ全履歴を参照します。"},
   {id:"records" as const,label:"本人の体験・日記・メモ",itemCount:records.length,...span(records.map(r=>r.effectiveAt!)),lastUpdatedAt:maximum(sourceRecords.flatMap(r=>r.updatedAt===undefined?[]:[r.updatedAt])),status:records.length?"observed" as const:"empty" as const,description:"実効日時が期間内にある本人の記録と、記録に保存された活動です。"},
   {id:"gps" as const,label:"保存されたGPS観測",itemCount:gps.pointCount,firstObservedAt:gps.firstObservedAt,lastObservedAt:gps.lastObservedAt,lastUpdatedAt:gps.lastUpdatedAt,status:gps.status,description:gps.description}
 ];
 return {
   confirmedPlaces:{value:periodPlaces.size,unit:"places" as const,source:"visits.confirmed" as const,placeIds:[...periodPlaces].sort()},
   confirmedVisits:{value:period.length,unit:"visits" as const,source:"visits.confirmed" as const,visitIds:period.map(v=>v.id).sort()},
   newPlaces:{value:newPlaces.length,unit:"places" as const,source:"visits.confirmed.firstStartedAt" as const,placeIds:newPlaces.map(v=>v.placeId).sort(),unknownPlaceIds:[...periodPlaces].filter(id=>unknownPlaces.has(id)).sort()},
   undatedVisits:confirmed.filter(v=>v.startedAt===null||v.timePrecision==="unknown").length,
   recordCount:records.length,undatedRecords,activities,daily,sourceRefs:refs,sources,
   lastUpdatedAt:maximum(sources.flatMap(s=>s.lastUpdatedAt===null?[]:[s.lastUpdatedAt])),
   gpsDistanceMeters:gps
 };
}
