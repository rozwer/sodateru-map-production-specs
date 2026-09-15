import { dateInZone,calendarDays } from "./aggregation.ts";
import { normalizeRefs,type SourceRef } from "./identity.ts";
import { gpsStatistics,type TrackMaterial } from "./gps-statistics.ts";

export type StatisticsRange={from:number;to:number;timeZone:string};
export type VisitMaterial={id:string;placeId:string;startedAt:number|null;endedAt:number|null;timePrecision:string;status:string;origin:string;version:number;updatedAt:number};
export type RecordMaterial={id:string;effectiveAt:number|null;endedAt:number|null;timePrecision:string;visitStatus:string|null;purposes:string[];activities:{id:string;name:string}[];sourceRefs:SourceRef[]};
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
   ...records.flatMap(r=>r.sourceRefs),
   ...period.map(v=>({type:"visit" as const,id:v.id,version:v.version})),
   ...[...first.values()].filter(v=>periodPlaces.has(v.placeId)).map(v=>({type:"visit" as const,id:v.id,version:v.version})),
   ...confirmed.filter(v=>unknownPlaces.has(v.placeId)).map(v=>({type:"visit" as const,id:v.id,version:v.version}))
 ]);
 return {
   confirmedVisits:{value:period.length,unit:"visits" as const,source:"visits.confirmed" as const,visitIds:period.map(v=>v.id).sort()},
   newPlaces:{value:newPlaces.length,unit:"places" as const,source:"visits.confirmed.firstStartedAt" as const,placeIds:newPlaces.map(v=>v.placeId).sort(),unknownPlaceIds:[...periodPlaces].filter(id=>unknownPlaces.has(id)).sort()},
   undatedVisits:confirmed.filter(v=>v.startedAt===null||v.timePrecision==="unknown").length,
   recordCount:records.length,activities,daily,sourceRefs:refs,
   lastUpdatedAt:period.length?Math.max(...period.map(v=>v.updatedAt)):null,
   gpsDistanceMeters:gpsStatistics(range,points)
 };
}
