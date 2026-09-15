import { setTimeout as delay } from 'node:timers/promises';
import { requestHash } from '../../core/idempotency.ts';
import type { SegmentEvidence } from '../../plugins/bike/segment-evidence.ts';
import { decodePolyline6, localMinute, parseValhalla } from './valhalla.ts';
import { RouteFault, coordinate, samePoint, type RoadProvider, type RoadResult, type Coordinates, type Mode, type Conditions } from './types.ts';

export type MotorbikeOptions = { profile: 'motorcycle' | 'motor_scooter'; useHighways?: number; topSpeed?: number };
const sourceUrl='https://valhalla.github.io/valhalla/api/map-matching/api-reference/';
const fail=(message:string):never=>{throw new RouteFault('OUTPUT_INVALID',message)};
function warnings(body:any): {code:number;text:string}[] {
  const lists=[body?.warnings,body?.trip?.warnings].filter(v=>v!==undefined);
  if(lists.some(v=>!Array.isArray(v)))return fail('二輪provider警告の形式が不正です');
  const values=lists.flat();
  if(values.some(w=>!Number.isInteger(w?.code)||typeof w.text!=='string'))return fail('二輪provider警告が不正です');
  return values;
}
/** Explicit server-selected profile; never infers Japanese vehicle legality from a profile name. */
export class ValhallaMotorbikeProvider implements RoadProvider {
  readonly drivingTimeConditions=true;
  private readonly options: Required<Pick<MotorbikeOptions,'profile'|'useHighways'>> & {topSpeed:number|null};
  private readonly base: URL;
  constructor(endpoint:string,options:MotorbikeOptions,private fetcher:typeof fetch=fetch){
    if(!options||!['motorcycle','motor_scooter'].includes(options.profile)||Object.keys(options).some(k=>!['profile','useHighways','topSpeed'].includes(k)))throw new RouteFault('INVALID_INPUT','二輪profileを明示してください');
    const useHighways=options.useHighways??0;
    if(!Number.isFinite(useHighways)||useHighways<0||useHighways>1)throw new RouteFault('INVALID_INPUT','useHighwaysは0〜1です');
    if(options.profile==='motorcycle'&&options.topSpeed!==undefined)throw new RouteFault('INVALID_INPUT','topSpeedはmotor_scooter専用です');
    const topSpeed=options.profile==='motor_scooter'?(options.topSpeed??30):null;
    if(topSpeed!==null&&(!Number.isFinite(topSpeed)||topSpeed<1||topSpeed>120))throw new RouteFault('INVALID_INPUT','topSpeedは1〜120km/hです');
    this.options={profile:options.profile,useHighways,topSpeed};
    try{this.base=new URL(endpoint);if(!['https:','http:'].includes(this.base.protocol)||this.base.username||this.base.password||this.base.search||this.base.hash)throw Error();}catch{throw new RouteFault('PROVIDER_UNAVAILABLE','二輪providerのURLが不正です',503);}
  }
  async compare(points:Coordinates[],mode:Mode,signal?:AbortSignal,conditions?:Conditions):Promise<RoadResult[]>{
    // This first unit offers the provider's single whole itinerary; it does not invent alternatives.
    return [await this.route(points,mode,signal,true,undefined,conditions)];
  }
  async route(points:Coordinates[],mode:Mode,signal?:AbortSignal,_navigation=true,_pick?:number,conditions?:Conditions):Promise<RoadResult>{
    if(mode!=='driving')throw new RouteFault('MODE_UNSUPPORTED','二輪profileは明示されたdriving経路にだけ適用します',501);
    if(points.length<2||points.length>10||!points.every(coordinate)||points.some((p,i)=>i>0&&samePoint(p,points[i-1]!)))throw new RouteFault('INVALID_INPUT','順序付きの異なる隣接地点を2〜10点指定してください');
    const c=conditions??{};
    if(Object.entries(c).some(([k,v])=>!['departAt','returnBy','timeZone','avoidMotorways'].includes(k)&&(Array.isArray(v)?v.length>0:v!==false)))throw new RouteFault('MODE_UNSUPPORTED','未対応の二輪条件です',501);
    if(!Number.isSafeInteger(c.departAt)||c.departAt!<0||c.departAt!%60000!==0||typeof c.timeZone!=='string')throw new RouteFault('INVALID_INPUT','二輪属性取得には分単位の出発時刻とIANA時間帯が必要です');
    if(c.returnBy!==undefined&&(!Number.isSafeInteger(c.returnBy)||c.returnBy%60000!==0||c.returnBy<=c.departAt!))throw new RouteFault('INVALID_INPUT','帰着期限が不正です');
    let departureLocal:string;
    try{departureLocal=localMinute(c.departAt!,c.timeZone)}catch{throw new RouteFault('INVALID_INPUT','出発時刻・時間帯が不正です');}
    const {profile,useHighways,topSpeed}=this.options;
    const costingOptions={use_highways:useHighways,exclude_highways:c.avoidMotorways===true,...(topSpeed===null?{}:{top_speed:topSpeed})};
    const common={costing:profile,costing_options:{[profile]:costingOptions}};
    const body=await this.request('route',{locations:points.map(([lon,lat])=>({lat:Number(lat.toFixed(6)),lon:Number(lon.toFixed(6)),type:'break'})),units:'kilometers',language:'ja-JP',date_time:{type:1,value:departureLocal},...common},signal);
    const routeFetchedAt=Date.now();
    const route=parseValhalla(body,points,c,new URL('route',this.base).toString(),'balanced',routeFetchedAt,profile);
    const allWarnings=warnings(body);
    const edges:SegmentEvidence['edges']=[];const traceVehicleTypes=new Set<string|null>();
    let shapeOffset=0,traceFetchedAt=routeFetchedAt,osmChangeset:string|null=null;
    for(const [i,leg] of route.legs.entries()){
      try{await delay(1100,undefined,{signal})}catch{throw new RouteFault('CANCELLED','二輪属性の取得を取り消しました',409);}
      const trace=await this.request('trace_attributes',{...common,date_time:{type:1,value:body.trip.locations[i].date_time},encoded_polyline:body.trip.legs[i].shape,shape_match:'edge_walk'},signal);
      traceFetchedAt=Date.now();
      if(JSON.stringify(decodePolyline6(trace.shape))!==JSON.stringify(leg.geometry.coordinates))return fail('trace形状が取得した経路区間と一致しません');
      const traceWarnings=warnings(trace);allWarnings.push(...traceWarnings);
      if(traceWarnings.some(w=>w.code!==208)||traceWarnings.length&&!c.avoidMotorways)throw new RouteFault('MODE_UNSUPPORTED','二輪属性providerが未対応条件を返しました',501,{warnings:traceWarnings});
      const version=trace.osm_changeset;
      if(typeof version!=='string'&&(!Number.isSafeInteger(version)||version<0))return fail('traceの元データ版が不正です');
      if(i&&String(version)!==osmChangeset)return fail('区間間で道路データ版が変わりました');
      osmChangeset=String(version);
      if(!Array.isArray(trace.edges)||!trace.edges.length)return fail('全区間の道路属性がありません');
      let next=0;
      for(const e of trace.edges){
        // Scooter traces can report the literal string 'null'. Preserve missing metadata; reject a contradictory known profile.
        const vehicle=typeof e.vehicle_type==='string'?e.vehicle_type:null;traceVehicleTypes.add(vehicle);
        if(e.travel_mode!=='drive'||vehicle!==null&&vehicle!=='null'&&vehicle!==profile)return fail('traceの車両profileが要求と一致しません');
        const begin=e.begin_shape_index,end=e.end_shape_index;
        if(!Number.isInteger(begin)||!Number.isInteger(end)||begin!==next||end<=begin||end>=leg.geometry.coordinates.length)return fail('trace属性が経路の全区間を順番に被覆していません');
        next=end;
        edges.push({wayId:Number.isSafeInteger(e.way_id)&&e.way_id>0?e.way_id:null,forward:typeof e.forward==='boolean'?e.forward:null,beginShapeIndex:shapeOffset+begin,endShapeIndex:shapeOffset+end,roadClass:typeof e.road_class==='string'?e.road_class:null,use:typeof e.use==='string'?e.use:null,motorroad:null});
      }
      if(next!==leg.geometry.coordinates.length-1)return fail('trace属性の末尾区間が不足しています');
      shapeOffset+=next;
    }
    if(c.avoidMotorways){const evaluation=route.conditionEvaluations!.find(e=>e.key==='avoidMotorways')!;evaluation.status=allWarnings.some(w=>w.code===208)?'ignored':'unknown';}
    route.providerEvidence!.warnings=structuredClone(allWarnings);route.providerEvidence!.profile=profile;route.providerEvidence!.traceVehicleTypes=[...traceVehicleTypes];
    route.segmentEvidence={provider:'valhalla',profile,geometryHash:requestHash(route.geometry),routeFetchedAt,fetchedAt:traceFetchedAt,sourceUrl,osmChangeset,options:{excludeHighways:c.avoidMotorways===true,useHighways,topSpeed,departureLocal},warnings:allWarnings,edges};
    return route;
  }
  private async request(path:string,input:unknown,signal?:AbortSignal):Promise<any>{
    const deadline=AbortSignal.any([...(signal?[signal]:[]),AbortSignal.timeout(20000)]);
    try{
      deadline.throwIfAborted();
      const response=await this.fetcher(new URL(path,this.base),{method:'POST',headers:{'Content-Type':'application/json','X-Client-Id':'sodateru-map-production-specs-routes-25'},body:JSON.stringify(input),signal:deadline});
      if(response.status===429)throw new RouteFault('RATE_LIMITED','二輪providerの利用上限です',429);
      const body=await response.json();
      if(body?.error_code===442)throw new RouteFault('ROUTE_NOT_FOUND','二輪経路がありません',422);
      if(!response.ok)throw new RouteFault('PROVIDER_UNAVAILABLE','二輪providerが失敗しました',503,{providerStatus:response.status});
      deadline.throwIfAborted();return body;
    }catch(error){
      if(error instanceof RouteFault)throw error;
      if(signal?.aborted)throw new RouteFault('CANCELLED','二輪経路の取得を取り消しました',409);
      if(deadline.aborted)throw new RouteFault('TIMEOUT','二輪providerの取得が時間切れです',504);
      throw new RouteFault('PROVIDER_UNAVAILABLE','二輪providerへ接続できません',503);
    }
  }
}
