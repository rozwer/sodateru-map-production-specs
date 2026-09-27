import {fileURLToPath} from 'node:url';
import {query,ToeiDirectBusProvider,type ToeiOptions,type DirectTransitEvidence} from './toei.ts';
import {RouteFault,type Coordinates,type Conditions,type Mode,type RoadResult} from './types.ts';
import type {TransferResult,BusLeg} from '../routes-transit/index.ts';

/** Two platform endpoints use published transfers; ordered multi-stop direct trips retain their contract. */
export class ToeiBusProvider extends ToeiDirectBusProvider {
 constructor(private transferOptions:ToeiOptions){super(transferOptions);}
 override async compare(points:Coordinates[],mode:Mode,signal?:AbortSignal,conditions?:Conditions):Promise<RoadResult[]>{
  if(points.length!==2)return super.compare(points,mode,signal,conditions);
  const c=conditions??{};
  if(mode!=='transit'||Object.entries(c).some(([k,v])=>!['departAt','returnBy','timeZone'].includes(k)&&(Array.isArray(v)?v.length>0:v!==false)))throw new RouteFault('MODE_UNSUPPORTED','指定条件は都営時刻表の対象外です',501);
  if(!Number.isSafeInteger(c.departAt)||c.departAt!<0||c.departAt!%60000!==0||c.timeZone!=='Asia/Tokyo')throw new RouteFault('INVALID_INPUT','出発可能時刻とAsia/Tokyoを指定してください');
  const result:TransferResult=await query(this.transferOptions,{points,earliestDepartureAt:c.departAt,latestArrivalAt:c.returnBy,payment:this.transferOptions.payment??'cash'},signal,fileURLToPath(new URL('./transfer_runner.py',import.meta.url)));
  const plans=result.journeys.filter(p=>p.status==='ready'&&p.fare.status==='known'&&p.legs.every(l=>l.kind==='bus'&&l.geometry&&l.fare.status==='known'));
  if(!plans.length)throw new RouteFault(result.status==='out_of_period'?'FEED_EXPIRED':'ROUTE_NOT_FOUND','指定時刻に形状・運賃を確認できるバス経路がありません',422,{providerStatus:result.status});
  return plans.map(plan=>{
   const bus=plan.legs as BusLeg[];
   const {fetchedAt:_fetchedAt,...source}=plan.source;
   const segments:DirectTransitEvidence[]=bus.map(l=>({provider:'toei-gtfs',scope:'direct_bus_only',tripId:l.tripId,routeId:l.routeId,routeName:l.routeName,serviceId:l.serviceId,serviceDate:l.serviceDate,shapeId:l.shapeId,stops:l.stops.map(({pickupType,dropOffType,...s})=>({...s,shapePosition:s.shapePosition!})),departureAt:l.departureAt,arrivalAt:l.arrivalAt,waitDurationSec:0,rideDurationSec:l.durationSec,fare:{fareId:l.fare.fareId!,currency:'JPY',cash:(l.fare as typeof l.fare & {cash:number}).cash,ic:(l.fare as typeof l.fare & {ic:number|null}).ic,payment:l.fare.payment,amount:l.fare.amount!,passEvaluation:'not_applied',rules:l.fare.rules!,transfers:l.fare.transfers!,transferDurationSec:l.fare.transferDurationSec!},shapeMatching:l.shapeMatching,source}));
   const geometry={type:'LineString' as const,coordinates:bus.flatMap(l=>l.geometry!.coordinates)};
   const distanceM=bus.reduce((n,l)=>n+l.distanceM!,0),fetchedAt=source.loadedAt,sourceUrl=source.url;
   return {provider:'toei-gtfs',sourceUrl,fetchedAt,geometry,distanceM,durationSec:plan.durationSec,legs:[{fromIndex:0,toIndex:1,geometry,distanceM,durationSec:plan.durationSec}],transitEvidence:{provider:'toei-gtfs',scope:'bus_transfers',segments,departureAt:plan.departureAt,arrivalAt:plan.arrivalAt,waitDurationSec:plan.durationSec-plan.rideDurationSec,rideDurationSec:plan.rideDurationSec,fare:{amount:plan.fare.amount!,currency:'JPY',payment:plan.fare.payment,passEvaluation:'not_applied'},source},requestedConditions:structuredClone(c),conditionEvaluations:[{key:'departAt',status:'applied',reason:'各便の運行日と乗継余裕を照合した予定時刻。実運休・遅延は未確認。',provider:'toei-gtfs',sourceUrl,fetchedAt},...(c.returnBy===undefined?[]:[{key:'returnBy' as const,status:'applied' as const,reason:'最終便の予定到着が期限以内',provider:'toei-gtfs',sourceUrl,fetchedAt}])],timing:{departureAt:plan.departureAt,arrivalAt:plan.arrivalAt,timeZone:'Asia/Tokyo',providerTimePrecisionSec:1,locations:[plan.departureAt,plan.arrivalAt].map((at,i)=>({waypointIndex:i,localDateTime:new Date(at+9*3600000).toISOString().slice(0,19),timeZone:'Asia/Tokyo',utcOffset:'+09:00'}))}} satisfies RoadResult;
  });
 }
}
