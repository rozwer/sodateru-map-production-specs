import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
export type Coordinates = [number,number];
export type Geometry = { type:'LineString'; coordinates:Coordinates[] };
export interface TransferWalk { fromStopId:string; toStopId:string; durationSec:number; geometry:Geometry; sourceUrl:string; fetchedAt:number }
export interface TransferQuery { fromStopIds:string[]; toStopIds:string[]; earliestDepartureAt:number; latestArrivalAt?:number; maxTransfers?:number; maxJourneySec?:number; minTransferSec?:number; payment?:'cash'|'ic'; transferWalks?:TransferWalk[] }
export interface TransitSource {url:string;sha256:string;version:string;validFrom:string;validThrough:string;lastModified:string|null;fetchedAt:number|null;loadedAt:number;license:string;attribution:string;modification:string}
export interface TransitFare {status:'known'|'unknown';amount:number|null;currency:string|null;payment:'cash'|'ic';passEvaluation:'not_applied';fareId?:string;fareIds?:string[];rules?:Record<string,string>[];transfers?:string;transferDurationSec?:number;reason?:string;warnings?:string[]}
export interface TransitStop {stopId:string;name:string;coordinates:Coordinates;parentId:string|null}
export interface BusLeg {kind:'bus';tripId:string;routeId:string;routeName:string;serviceId:string;serviceDate:string;agencyId:string;agencyName:string;shapeId:string;fromStop:TransitStop;toStop:TransitStop;departureAt:number;arrivalAt:number;durationSec:number;geometry:Geometry|null;distanceM:number|null;stops:(TransitStop & {stopSequence:number;shapePosition:number|null;arrivalAt:number;departureAt:number;pickupType:number;dropOffType:number})[];fare:TransitFare;source:TransitSource;shapeMatching:{method:'monotonic_segment_projection_inference';maxSnapM:number};warnings:string[]}
export interface WalkingLeg extends TransferWalk {kind:'walking';departureAt:number;arrivalAt:number}
export interface TransferJourney {status:'ready'|'partial';legs:(BusLeg|WalkingLeg)[];departureAt:number;arrivalAt:number;waitDurationSec:number;rideDurationSec:number;durationSec:number;transferCount:number;fare:TransitFare;source:TransitSource;warnings:string[]}
export interface TransferResult {status:'ok'|'partial'|'no_service'|'no_trip'|'out_of_period';journeys:TransferJourney[];source:TransitSource;warnings:string[];scope:{maxTransfers:number;maxJourneySec:number;minTransferSec:number;walking:'trusted-road-edges-only';realTime:false}}
export interface ToeiTransferOptions {feedPath:string;metadataPath:string}
export class TransitProviderError extends Error {
  constructor(public code:string,message:string){super(message);this.name='TransitProviderError';}
}
/** Stop-to-stop search. ROUTES resolves access/egress road legs and owns HTTP/save DTO adaptation. */
export async function searchToeiTransfers(options:ToeiTransferOptions,request:TransferQuery,signal?:AbortSignal):Promise<TransferResult>{
  signal?.throwIfAborted();
  return new Promise((resolve,reject)=>{
    const child=execFile('python3',[fileURLToPath(new URL('./runner.py',import.meta.url)),options.feedPath,options.metadataPath],{signal,timeout:60000,maxBuffer:16000000,env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}},(error,stdout)=>{
      if(signal?.aborted){reject(new TransitProviderError('CANCELLED','乗継検索を取り消しました'));return;}
      try{
        const value=JSON.parse(stdout);
        if(value.error){reject(new TransitProviderError(value.error.code,value.error.message));return;}
        if(error||!Array.isArray(value.journeys)||!['ok','partial','no_service','no_trip','out_of_period'].includes(value.status)){reject(new TransitProviderError('PROVIDER_UNAVAILABLE','既存GTFS読込または乗継検索が失敗しました'));return;}
        resolve(value as TransferResult);
      }catch{reject(new TransitProviderError('PROVIDER_UNAVAILABLE','既存GTFS読込または乗継検索が失敗しました'));}
    });
    child.stdin?.on('error',()=>{});
    child.stdin?.end(JSON.stringify(request));
  });
}
