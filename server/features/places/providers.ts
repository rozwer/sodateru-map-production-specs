import { setTimeout as delay } from "node:timers/promises";
import { CommonError } from "../../core/errors.ts";
import { isPosition, type PlaceCandidate, type Position } from "./types.ts";
type Candidate = Omit<PlaceCandidate, "candidateId">;
const text = (v: unknown): v is string => typeof v === "string" && !!v.trim();
const strings = (xs: unknown[]) => [...new Set(xs.filter(text))];
// Shared by all instances in this API process: serialize calls and space their starts.
let nominatimQueue: Promise<unknown> = Promise.resolve();
let lastNominatimStart = 0;
function providerError(error: unknown, signal: AbortSignal): never {
  if (error instanceof CommonError) throw error;
  if (signal.aborted) {
    if (signal.reason?.name === "TimeoutError") throw new CommonError("TIMEOUT", "場所の取得が時間切れになりました。", true);
    throw signal.reason;
  }
  throw new CommonError("PROVIDER_UNAVAILABLE", "場所の取得元へ接続できません。", true);
}
async function json(url: URL, signal: AbortSignal, headers?: HeadersInit): Promise<any> {
  try {
    const response = await fetch(url, { signal, headers });
    if (!response.ok) {
      if (response.status === 429) throw new CommonError("RATE_LIMITED", "場所の取得元が混雑しています。", true);
      throw new CommonError("PROVIDER_UNAVAILABLE", "場所の取得元を利用できません。", true);
    }
    try { return await response.json(); }
    catch (error) { if (signal.aborted) throw error; throw new CommonError("OUTPUT_INVALID", "場所の取得元の応答形式が不正です。", true); }
  } catch (error) { return providerError(error, signal); }
}
export function parseNominatim(rows: unknown, fetchedAt: number): Candidate[] {
  if (!Array.isArray(rows)) throw new CommonError("OUTPUT_INVALID", "場所の取得元の応答形式が不正です。", true);
  return rows.flatMap(row => {
    if (!row || !["node", "way", "relation"].includes(row.osm_type) || !/^[1-9][0-9]*$/.test(String(row.osm_id))
      || !text(row.lat) || !text(row.lon) || !text(row.display_name)) return [];
    const coordinates: Position = [Number(row.lon), Number(row.lat)];
    if (!isPosition(coordinates)) return [];
    const name = text(row.name) ? row.name.trim() : row.display_name.split(",")[0].trim();
    if (!name || [...name].length > 500 || [...row.display_name].length > 2000) return [];
    return [{placeId:null, name, address:row.display_name, coordinates, categories:strings([row.category,row.type]).filter(x => [...x].length <= 100),
      provider:"nominatim", externalId:row.osm_type[0].toUpperCase()+row.osm_id, buildingKey:null,
      sourceUrl:`https://www.openstreetmap.org/${row.osm_type}/${row.osm_id}`,
      attribution:"© OpenStreetMap contributors (ODbL)", fetchedAt, retention:"storable" as const}];
  });
}
async function nominatimRequest(path: string, params: Record<string,string>, caller: AbortSignal): Promise<any> {
  const deadline = AbortSignal.any([caller, AbortSignal.timeout(30_000)]);
  const work = nominatimQueue.catch(() => {}).then(async () => {
    try {
      deadline.throwIfAborted();
      const wait = Math.max(0, lastNominatimStart + 1100 - Date.now());
      if (wait) await delay(wait, undefined, {signal:deadline});
      deadline.throwIfAborted();
      lastNominatimStart = Date.now();
      const signal = AbortSignal.any([deadline, AbortSignal.timeout(10_000)]);
      const url = new URL(`${(process.env.NOMINATIM_BASE_URL || "https://nominatim.openstreetmap.org").replace(/\/$/, "")}/${path}`);
      url.search = new URLSearchParams({format:"jsonv2",addressdetails:"1",namedetails:"1","accept-language":"ja",...params}).toString();
      const rows = await json(url, signal, {"User-Agent":process.env.NOMINATIM_USER_AGENT || "sodateru-map-production/1.0"});
      return rows;
    } catch (error) { return providerError(error, deadline); }
  });
  nominatimQueue = work;
  // Return promptly on cancellation even while an earlier queued request is running.
  return new Promise((resolve,reject) => {
    const aborted = () => { try { providerError(deadline.reason,deadline); } catch (e) { reject(e); } };
    deadline.addEventListener("abort",aborted,{once:true});
    if (deadline.aborted) aborted();
    work.then(resolve,reject).finally(() => deadline.removeEventListener("abort",aborted));
  });
}
export function nearbyBounds([lon,lat]: Position): number[][] {
  const dx = 0.018 / Math.max(0.2,Math.cos(lat*Math.PI/180));
  const south=Math.max(-85,lat-0.018), north=Math.min(85,lat+0.018);
  const west=lon-dx,east=lon+dx;
  if (west < -180) return [[west+360,south,180,north],[-180,south,east,north]];
  if (east > 180) return [[west,south,180,north],[-180,south,east-360,north]];
  return [[west,south,east,north]];
}
export function parseMapbox(value: unknown, fetchedAt: number): Candidate[] {
  if (!value || !Array.isArray((value as any).features)) throw new CommonError("OUTPUT_INVALID","周辺候補の応答形式が不正です。",true);
  return (value as any).features.flatMap((feature: any) => {
    const p=feature?.properties, coordinates=feature?.geometry?.coordinates;
    if (!p || !text(p.name) || !isPosition(coordinates) || [...p.name].length>500) return [];
    const address=text(p.full_address)?p.full_address:text(p.address)?p.address:null;
    return [{placeId:null,name:p.name,address:address && [...address].length<=2000?address:null,coordinates,
      categories:strings(Array.isArray(p.poi_category)?p.poi_category:[]).filter(x=>[...x].length<=100).slice(0,20),
      provider:"mapbox",externalId:text(p.mapbox_id)?p.mapbox_id:null,buildingKey:null,
      sourceUrl:"https://www.mapbox.com/about/maps/",attribution:"© Mapbox © OpenStreetMap",fetchedAt,retention:"temporary" as const}];
  });
}
export async function searchMapbox(category: string, origin: Position, caller: AbortSignal): Promise<Candidate[]> {
  const token=process.env.MAPBOX_ACCESS_TOKEN;
  if (!token) throw new CommonError("PROVIDER_UNAVAILABLE","Mapboxの検索設定がありません。",false);
  const signal=AbortSignal.any([caller,AbortSignal.timeout(10_000)]);
  const boxes=nearbyBounds(origin);
  const groups=await Promise.all(boxes.map(async bbox => {
    const url=new URL(`https://api.mapbox.com/search/searchbox/v1/category/${category}`);
    url.search=new URLSearchParams({access_token:token,language:"ja",limit:"5",proximity:origin.join(","),bbox:bbox.join(",")}).toString();
    return parseMapbox(await json(url,signal),Date.now());
  })).catch(error=> { if(caller.aborted)throw caller.reason; if(boxes.length===1)throw error; throw new CommonError("PROVIDER_UNAVAILABLE","周辺候補を取得できません。",true); });
  const seen=new Set<string>();
  return groups.flat().filter(item => {if(!item.externalId)return true; if(seen.has(item.externalId))return false;seen.add(item.externalId);return true;}).slice(0,5);
}

export async function searchNominatim(query:string,limit:number,caller:AbortSignal):Promise<Candidate[]> {
  const rows=await nominatimRequest("search",{q:query,limit:String(limit),countrycodes:process.env.NOMINATIM_COUNTRY_CODES || "jp"},caller);
  return parseNominatim(rows,Date.now()).slice(0,limit);
}
export async function refreshNominatim(externalId:string,caller:AbortSignal) {
  if(!/^[NWR][1-9][0-9]*$/.test(externalId))throw new CommonError("INVALID_INPUT","外部場所IDが不正です。",false);
  const rows=await nominatimRequest("lookup",{osm_ids:externalId,extratags:"1",entrances:"1"},caller);
  const fetchedAt=Date.now(),candidate=parseNominatim(rows,fetchedAt).find(item=>item.externalId===externalId);
  if(!candidate)throw new CommonError("OUTPUT_INVALID","外部の場所を再取得できませんでした。",true);
  const row=rows.find((item:any)=>item.osm_type?.[0]?.toUpperCase()+item.osm_id===externalId);
  const openingHours=text(row.extratags?.opening_hours)?{rawText:row.extratags.opening_hours,timezone:null,sourceUrl:candidate.sourceUrl,fetchedAt,verificationStatus:"unverified" as const}:null;
  const entrances=(Array.isArray(row.entrances)?row.entrances:[]).flatMap((item:any)=> {
    const coordinates=[Number(item.lon),Number(item.lat)];
    if(!isPosition(coordinates)||!item.osm_id||item.lat==null||item.lon==null||String(item.lat).trim()===""||String(item.lon).trim()==="")return [];
    return [{id:`N${item.osm_id}`,coordinates,label:text(item.name)?item.name:null,accessibility:"unknown",sourceUrl:`https://www.openstreetmap.org/node/${item.osm_id}`,fetchedAt,verificationStatus:"unverified"}];
  });
  return {candidate,openingHours,entrances:entrances.slice(0,100)};
}
