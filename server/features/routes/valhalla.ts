import { setTimeout as delay } from 'node:timers/promises';
import { createHash } from 'node:crypto';
import { RouteFault, coordinate, samePoint, type Coordinates, type Conditions, type Mode, type RoadResult, type RoadProvider, type RouteLeg, type RouteStep, type RouteTiming, type ConditionEvaluation } from './types.ts';
const sourceUrl = 'https://valhalla.github.io/valhalla/api/route/api-reference/';
const invalid = (message: string): never => { throw new RouteFault('OUTPUT_INVALID', message); };
function number(value: unknown, zero = false): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || (zero ? value < 0 : value <= 0)) return invalid('経路の距離・時間が不正です');
  return value;
}
export function decodePolyline6(shape: unknown): Coordinates[] {
  if (typeof shape !== 'string' || shape.length > 2_000_000) return invalid('経路形状が不正です');
  let index=0, lat=0, lon=0;
  const points: Coordinates[]=[];
  function next() {
    let value=0,shift=0,byte: number;
    do {
      if (index>= (shape as string).length || shift>30) return invalid('経路形状が途切れています');
      byte=(shape as string).charCodeAt(index++)-63;
      if(byte<0 || byte>63) return invalid('経路形状が不正です');
      value+=(byte&31)*2**shift;shift+=5;
    } while(byte>=32);
    return value%2 ? -(value+1)/2 : value/2;
  }
  while(index<shape.length) { lat+=next();lon+=next();const p: Coordinates=[lon/1e6,lat/1e6];if(!coordinate(p)) return invalid('経路座標が不正です');points.push(p); }
  if(points.length<2 || !points.some(p=>!samePoint(p,points[0]!))) return invalid('経路形状が空です');
  return points;
}
function localMinute(epoch: number, timeZone: string) {
  const parts=new Intl.DateTimeFormat('sv-SE',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(epoch);
  const part=(key:string)=>parts.find(p=>p.type===key)!.value;
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`;
}
function steps(raw: any, points: Coordinates[]): RouteStep[] {
  if(!Array.isArray(raw) || !raw.length) return invalid('ターン案内が欠落しています');
  const modifiers: Record<number,string>={9:'slight right',10:'right',11:'sharp right',12:'uturn',13:'uturn',14:'sharp left',15:'left',16:'slight left',17:'straight',18:'right',19:'left',20:'right',21:'left',22:'straight',23:'right',24:'left',37:'right',38:'left'};
  return raw.map(m=>{
    const begin=m?.begin_shape_index,end=m?.end_shape_index;
    if(!Number.isInteger(begin)||!Number.isInteger(end)||begin<0||end<begin||end>=points.length||!Number.isInteger(m.type)||typeof m.instruction!=='string') return invalid('ターン案内の形状参照が不正です');
    if(m.travel_mode !== 'bicycle' && m.travel_mode !== 'pedestrian') return invalid('自転車以外の交通経路が混入しています');
    const coordinates=points.slice(begin,end+1);if(coordinates.length===1)coordinates.push(coordinates[0]!);
    return {geometry:{type:'LineString',coordinates},location:points[begin]!,distanceM:number(m.length,true)*1000,durationSec:Math.round(number(m.time,true)),type:m.type>=1&&m.type<=3?'depart':m.type>=4&&m.type<=6?'arrive':`valhalla:${m.type}`,modifier:modifiers[m.type]??null,instruction:m.instruction,name:Array.isArray(m.street_names)?m.street_names.filter((n:unknown)=>typeof n==='string').join(' / '):''};
  });
}
export function parseValhalla(body: any, points: Coordinates[], conditions: Conditions | undefined, endpoint: string, strategy: 'balanced'|'shortest', fetchedAt: number): RoadResult {
  const trip=body?.trip;
  if ((body?.warnings !== undefined && !Array.isArray(body.warnings)) || (trip?.warnings !== undefined && !Array.isArray(trip.warnings))) return invalid('provider警告の形式が不正です');
  const warnings=[...(Array.isArray(body?.warnings)?body.warnings:[]),...(Array.isArray(trip?.warnings)?trip.warnings:[])];
  if(warnings.length) throw new RouteFault('MODE_UNSUPPORTED','providerが条件の警告を返したため採用できません',501,{warnings,applied:false});
  if(trip?.status!==0||trip.units!=='kilometers'||!Array.isArray(trip.locations)||trip.locations.length!==points.length||!Array.isArray(trip.legs)||trip.legs.length!==points.length-1) return invalid('自転車経路の全区間が揃いません');
  trip.locations.forEach((l:any,i:number)=>{if(l.original_index!==i||!samePoint([l.lon,l.lat],points[i]!))return invalid('地点順・座標が要求と一致しません');});
  const coordinates: Coordinates[]=[];
  const legs: RouteLeg[]=trip.legs.map((l:any,i:number)=>{
    const line=decodePolyline6(l.shape);
    if(i && !samePoint(coordinates.at(-1)!,line[0]!)) return invalid('経路区間の境界が連続していません');
    coordinates.push(...(i?line.slice(1):line));
    return {fromIndex:i,toIndex:i+1,geometry:{type:'LineString',coordinates:line},distanceM:number(l.summary?.length)*1000,durationSec:Math.round(number(l.summary?.time)),steps:steps(l.maneuvers,line)};
  });
  const distanceM=legs.reduce((sum,l)=>sum+l.distanceM,0),durationSec=legs.reduce((sum,l)=>sum+l.durationSec,0);
  // Valhalla rounds kilometre summaries to 3 decimals; tolerate only that rounding.
  if(Math.abs(distanceM-number(trip.summary?.length)*1000)>legs.length || Math.abs(trip.legs.reduce((sum:number,l:any)=>sum+l.summary.time,0)-number(trip.summary?.time))>0.01) return invalid('全行程と各区間の距離・時間が一致しません');
  const geometry={type:'LineString' as const,coordinates};
  let timing: RouteTiming|undefined;
  const evaluations: ConditionEvaluation[]=[];
  if(conditions?.departAt!==undefined || conditions?.returnBy!==undefined) {
    const depart=conditions.departAt!==undefined, anchor=depart?0:points.length-1;
    const requestedAt=(depart?conditions.departAt:conditions.returnBy)!;
    const locations: RouteTiming['locations']=trip.locations.map((l:any,i:number)=>{
      if(typeof l.date_time!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(l.date_time)||typeof l.time_zone_name!=='string'||!/^[-+]\d\d:\d\d$/.test(l.time_zone_offset)) return invalid('経路時刻・時間帯が欠落しています');
      if(!Number.isFinite(Date.parse(l.date_time+l.time_zone_offset))) return invalid('経路時刻が不正です');
      return {waypointIndex:i,localDateTime:l.date_time,timeZone:l.time_zone_name,utcOffset:l.time_zone_offset};
    });
    const times=locations.map(l=>Date.parse(l.localDateTime+l.utcOffset));
    if(times.some((t,i)=>i>0&&t<times[i-1]!)) return invalid('経由地点の時刻が逆行しています');
    const a=locations[anchor]!;
    if(Date.parse(a.localDateTime+a.utcOffset)!==requestedAt) return invalid('指定した日時・時間帯がproviderへ適用されていません');
    // These are planned times from provider duration, not guaranteed arrival times.
    const elapsedMs=Math.ceil(Math.max(durationSec,trip.summary.time)*1000);
    const departureAt=depart?requestedAt:requestedAt-elapsedMs;
    const arrivalAt=depart?requestedAt+elapsedMs:requestedAt;
    if(conditions.returnBy!==undefined && arrivalAt>conditions.returnBy) throw new RouteFault('STATE_CONFLICT','帰着期限を満たす自転車経路がありません',409,{condition:'returnBy',arrivalAt,returnBy:conditions.returnBy,applied:false});
    if(departureAt<0) return invalid('推定出発日時が範囲外です');
    timing={departureAt,arrivalAt,timeZone:conditions.timeZone!,providerTimePrecisionSec:60,locations};
    for(const key of ['departAt','returnBy'] as const)if(conditions[key]!==undefined)evaluations.push({key,status:'applied',reason:'同一応答の指定端点日時・時間帯を照合し、区間秒合計で出発/到着予定と期限を評価（推定値）',provider:'valhalla',sourceUrl,fetchedAt});
  }
  return {geometry,legs,distanceM,durationSec,provider:'valhalla',sourceUrl,fetchedAt,...(conditions?{requestedConditions:structuredClone(conditions),conditionEvaluations:evaluations}:{}),...(timing?{timing}:{}),providerEvidence:{endpoint,attribution:'© OpenStreetMap contributors (ODbL); routing by Valhalla',geometryHash:createHash('sha256').update(JSON.stringify(geometry)).digest('hex'),strategy,warnings:[]}};
}
export class ValhallaCyclingProvider implements RoadProvider {
  constructor(private endpoint: string, private fetcher: typeof fetch=fetch) {}
  async route(points: Coordinates[],mode: Mode,signal?: AbortSignal,_navigation=true,_pick?: number,conditions?: Conditions): Promise<RoadResult> {
    return this.calculate(points,mode,signal,conditions,'balanced');
  }
  async compare(points: Coordinates[],mode: Mode,signal?: AbortSignal,conditions?: Conditions): Promise<RoadResult[]> {
    const first=await this.calculate(points,mode,signal,conditions,'balanced');
    try { await delay(1100,undefined,{signal}); } catch { throw new RouteFault('CANCELLED','自転車経路の比較を取り消しました',409); }
    const second=await this.calculate(points,mode,signal,conditions,'shortest');
    return (JSON.stringify(first.geometry)===JSON.stringify(second.geometry)?[first]:[first,second]).sort((a,b)=>a.durationSec-b.durationSec||a.distanceM-b.distanceM);
  }
  private async calculate(points: Coordinates[],mode: Mode,signal: AbortSignal|undefined,conditions: Conditions|undefined,strategy: 'balanced'|'shortest'): Promise<RoadResult> {
    if(mode!=='cycling') throw new RouteFault('MODE_UNSUPPORTED','Valhallaの接続は自転車のみです',501);
    if(points.length<2||points.length>10||!points.every(coordinate)||points.some((p,i)=>i>0&&samePoint(p,points[i-1]!)))throw new RouteFault('INVALID_INPUT','異なる隣接地点を2〜10点指定してください');
    const unsupported=Object.entries(conditions??{}).filter(([k,v])=>!['departAt','returnBy','timeZone'].includes(k) && (Array.isArray(v)?v.length>0:v!==false));
    if(unsupported.length)throw new RouteFault('MODE_UNSUPPORTED','未対応の自転車条件です',501,{unsupportedConditions:unsupported.map(([k])=>k),applied:false});
    const at=conditions?.departAt??conditions?.returnBy;
    if(at!==undefined && (!Number.isSafeInteger(at)||at<0||at%60000!==0||!conditions?.timeZone))throw new RouteFault('INVALID_INPUT','日時は分単位とIANA時間帯で指定してください');
    let url: URL;
    try {url=new URL(this.endpoint);if(!['https:','http:'].includes(url.protocol)||url.username||url.password||url.search||url.hash)throw Error();}catch{throw new RouteFault('PROVIDER_UNAVAILABLE','自転車providerのURL設定が不正です',503);}
    let date_time;
    if(at!==undefined)try{date_time={type:conditions?.departAt!==undefined?1:2,value:localMinute(at,conditions!.timeZone!)};}catch{throw new RouteFault('INVALID_INPUT','日時・時間帯が不正です');}
    const input={locations:points.map(([lon,lat])=>({lon,lat,type:'break'})),costing:'bicycle',costing_options:{bicycle:{shortest:strategy==='shortest'}},units:'kilometers',language:'ja-JP',...(date_time?{date_time}:{})};
    const deadline=AbortSignal.any([...(signal?[signal]:[]),AbortSignal.timeout(20000)]);
    try {
      deadline.throwIfAborted();
      const response=await this.fetcher(url,{method:'POST',headers:{'Content-Type':'application/json','X-Client-Id':'sodateru-map-production-specs-routes-25'},body:JSON.stringify(input),signal:deadline});
      if(response.status===429)throw new RouteFault('RATE_LIMITED','自転車providerの利用上限です',429,{retryAfter:response.headers.get('retry-after')});
      let body:any;
      try{body=await response.json();}catch(error){if(deadline.aborted)throw error;return invalid('自転車providerのJSONが不正です');}
      if(body?.error_code===442)throw new RouteFault('ROUTE_NOT_FOUND','指定地点間の自転車経路がありません',422);
      if(!response.ok)throw new RouteFault('PROVIDER_UNAVAILABLE','自転車providerが経路を返しませんでした',503,{providerStatus:response.status});
      deadline.throwIfAborted();
      return parseValhalla(body,points,conditions,url.toString(),strategy,Date.now());
    }catch(error){
      if(error instanceof RouteFault)throw error;
      if(signal?.aborted)throw new RouteFault('CANCELLED','自転車経路の取得を取り消しました',409);
      if(deadline.aborted)throw new RouteFault('TIMEOUT','自転車経路の取得が時間切れです',504);
      throw new RouteFault('PROVIDER_UNAVAILABLE','自転車providerへ接続できません',503);
    }
  }
}
