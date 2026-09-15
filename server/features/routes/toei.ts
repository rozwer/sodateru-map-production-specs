import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { RouteFault, type Conditions, type Coordinates, type Mode, type RoadProvider, type RoadResult } from './types.ts';

export type ToeiOptions={feedPath:string;metadataPath:string;payment?:'cash'|'ic'};
export type TransitEvidence={provider:'toei-gtfs';scope:'direct_bus_only';tripId:string;routeId:string;routeName:string;serviceId:string;serviceDate:string;shapeId:string;stops:{stopId:string;parentId:string|null;name:string;coordinates:Coordinates;stopSequence:number;shapePosition:number;arrivalAt:number;departureAt:number}[];departureAt:number;arrivalAt:number;waitDurationSec:number;rideDurationSec:number;fare:{fareId:string;currency:'JPY';cash:number;ic:number|null;payment:'cash'|'ic';amount:number;passEvaluation:'not_applied';rules:Record<string,string>[];transfers:string;transferDurationSec:number};shapeMatching:{method:'monotonic_segment_projection_inference';maxSnapM:number};source:{url:string;license:string;attribution:string;modification:string;sha256:string;version:string;validFrom:string;validThrough:string;lastModified:string|null;loadedAt:number}};
type Plan=TransitEvidence & Pick<RoadResult,'geometry'|'legs'|'distanceM'|'durationSec'>;
const script=fileURLToPath(new URL('./toei_gtfs.py',import.meta.url));
async function query(options:ToeiOptions,input:unknown,signal?:AbortSignal):Promise<any>{
 return new Promise((resolve,reject)=>{
  const child=execFile('python3',[script,options.feedPath,options.metadataPath],{signal,timeout:20000,maxBuffer:8_000_000},(error,stdout)=>{
   if(signal?.aborted){reject(new RouteFault('CANCELLED','バス検索を取り消しました',409));return;}
   try{const result=JSON.parse(stdout);if(result.error){const status=result.error.code==='MODE_UNSUPPORTED'?501:result.error.code==='SOURCE_CHANGED'?409:422;reject(new RouteFault(result.error.code,result.error.message,status));}else if(error)reject(new RouteFault('PROVIDER_UNAVAILABLE','GTFSを読み込めません',503));else resolve(result);}catch{reject(new RouteFault('PROVIDER_UNAVAILABLE','GTFSの読込処理が失敗しました',503));}
  });child.stdin?.end(JSON.stringify(input));
 });
}
export async function searchToeiBusStops(options:ToeiOptions,q:string,signal?:AbortSignal):Promise<{items:{id:string;name:string;coordinates:Coordinates;parentId:string|null}[]}>{
 if(typeof q!=='string'||!q.trim()||q.length>100)throw new RouteFault('INVALID_INPUT','停留所名を指定してください');
 return query(options,{action:'stops',q},signal);
}
/** Explicit direct-bus provider. Walking to platforms, rail, passes and transfers remain unconnected. */
export class ToeiDirectBusProvider implements RoadProvider {
 readonly supportsTransit=true;
 constructor(private options:ToeiOptions){}
 async route(points:Coordinates[],mode:Mode,signal?:AbortSignal,_navigation=true,_pick?:number,conditions?:Conditions):Promise<RoadResult>{return (await this.compare(points,mode,signal,conditions))[0]!;}
 async compare(points:Coordinates[],mode:Mode,signal?:AbortSignal,conditions?:Conditions):Promise<RoadResult[]>{
  if(mode!=='transit')throw new RouteFault('MODE_UNSUPPORTED','都営バス専用のtransit入口です',501);
  const c=conditions??{};
  if(!Number.isSafeInteger(c.departAt)||c.departAt!<0||c.departAt!%60000!==0||c.timeZone!=='Asia/Tokyo')throw new RouteFault('INVALID_INPUT','バスの出発可能時刻とAsia/Tokyoを指定してください');
  if(Object.entries(c).some(([k,v])=>!['departAt','returnBy','timeZone'].includes(k)&&(Array.isArray(v)?v.length>0:v!==false)))throw new RouteFault('MODE_UNSUPPORTED','乗継/定期券/徒歩条件/滞在は未接続です',501);
  const data=await query(this.options,{points,earliestDepartureAt:c.departAt,latestArrivalAt:c.returnBy,payment:this.options.payment??'cash'},signal);
  return data.plans.map((plan:Plan)=>{
   const {geometry,legs,distanceM,durationSec,...transitEvidence}=plan;
   const fetchedAt=plan.source.loadedAt,sourceUrl=plan.source.url;
   return {geometry,legs,distanceM,durationSec,provider:'toei-gtfs',fetchedAt,sourceUrl,transitEvidence,requestedConditions:structuredClone(c),conditionEvaluations:[{key:'departAt',status:'applied',reason:'出発可能時刻以降の同一運行日・便の時刻表を照合。乗車までの待ち時間を全時間に含む。遅延や到着を保証しない',provider:'toei-gtfs',sourceUrl,fetchedAt},...(c.returnBy===undefined?[]:[{key:'returnBy' as const,status:'applied' as const,reason:'同一便の予定到着が期限以内',provider:'toei-gtfs',sourceUrl,fetchedAt}])],timing:{departureAt:plan.departureAt,arrivalAt:plan.arrivalAt,timeZone:'Asia/Tokyo',providerTimePrecisionSec:1,locations:plan.stops.map((s,i)=>({waypointIndex:i,localDateTime:new Date(s.departureAt+9*3600000).toISOString().slice(0,19),timeZone:'Asia/Tokyo',utcOffset:'+09:00'}))}} satisfies RoadResult;
  });
 }
}
