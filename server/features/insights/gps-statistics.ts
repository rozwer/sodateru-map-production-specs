import type {StatisticsRange} from "./statistics.ts";
export type TrackMaterial={id:string;sourcePointId:string;segmentId:string;observedAt:number;longitude:number;latitude:number;accuracyM:number;breakBefore?:boolean;updatedAt:number};
const radians=(value:number)=>value*Math.PI/180;
function distance(a:TrackMaterial,b:TrackMaterial){
 const dlat=radians(b.latitude-a.latitude),dlon=radians(b.longitude-a.longitude);
 const h=Math.sin(dlat/2)**2+Math.cos(radians(a.latitude))*Math.cos(radians(b.latitude))*Math.sin(dlon/2)**2;
 return 6_371_008.8*2*Math.atan2(Math.sqrt(Math.min(1,h)),Math.sqrt(Math.max(0,1-h)));
}

/** Geometric length of saved GPS observations, with the same breaks as ACTIVITY drawing.
 * No inferred travel across missing points and no conversion to steps or health distance.
 */
export function gpsStatistics(range:StatisticsRange,input:readonly TrackMaterial[]){
 const points=[...new Map(input.filter(p=>p.observedAt>=range.from&&p.observedAt<range.to).map(p=>[p.sourcePointId,p])).values()].sort((a,b)=>a.observedAt-b.observedAt||(a.id<b.id?-1:a.id>b.id?1:0));
 let meters=0,edgeCount=0,disconnectedEdges=0;
 let previous:TrackMaterial|undefined;
 for(const point of points){
   if(!Number.isFinite(point.longitude)||!Number.isFinite(point.latitude)||!Number.isFinite(point.accuracyM))throw new TypeError("Invalid GPS observation");
   if(previous){
     if(point.segmentId===previous.segmentId&&!point.breakBefore&&point.observedAt>previous.observedAt){meters+=distance(previous,point);edgeCount++;}
     else disconnectedEdges++;
   }
   previous=point;
 }
 return {
   value:edgeCount?meters:null,unit:"m" as const,source:"track_points" as const,
   status:edgeCount?"observed" as const:points.length?"insufficient" as const:"unavailable" as const,
   pointCount:points.length,edgeCount,disconnectedEdges,
   maxAccuracyM:points.length?points.reduce((max,p)=>Math.max(max,p.accuracyM),0):null,
   firstObservedAt:points[0]?.observedAt??null,lastObservedAt:points.at(-1)?.observedAt??null,
   lastUpdatedAt:points.length?points.reduce((max,p)=>Math.max(max,p.updatedAt),0):null,
   sourcePointIds:points.map(p=>p.sourcePointId),
   description:"保存されたGPS観測線の距離。測位間の移動や未取得区間は補間していません。"
 };
}
