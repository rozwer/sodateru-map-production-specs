import { randomUUID } from "node:crypto";
import { requestHash } from "../../core/idempotency.ts";
import type { DatabaseSync } from "node:sqlite";
import type { RequestContext } from "../../core/context.ts";
import { CommonError } from "../../core/errors.ts";
import { searchNominatim, searchMapbox } from "./providers.ts";
import { getPlace, savedCandidates, insertPlace, placeDto } from "./repository.ts";
import { isPosition, normalize, type PlaceCreate, type SearchResult, type PlaceCandidate, type CandidateInput } from "./types.ts";
const invalid = (message = "場所の入力を確認してください。") => new CommonError("INVALID_INPUT",message,false);
const id = (v:unknown): v is string => typeof v==="string" && !!v.trim() && [...v].length<=80;
const str = (v:unknown,max:number): v is string => typeof v==="string" && !!v.trim() && [...v].length<=max;
const optional = (v:unknown,max:number) => v===null || (typeof v==="string" && [...v].length<=max);
export const hash = requestHash;
export function validateCreate(value:any):PlaceCreate {
  if(!value || typeof value!=="object" || !id(value.id))throw invalid();
  const keys=value.mode==="candidate"?["id","mode","resultId","candidateId"]:["id","mode","name","position","address","buildingKey"];
  if(Object.keys(value).some(k=>!keys.includes(k)) || keys.some(k=>!(k in value)))throw invalid();
  if(value.mode==="candidate") {if(!id(value.resultId)||!id(value.candidateId))throw invalid();}
  else if(value.mode==="manual") {
    if(!str(value.name,200)||(!value.position||Object.keys(value.position).some(k=>!["longitude","latitude"].includes(k))||!isPosition([value.position.longitude,value.position.latitude]))||!optional(value.address,2000)||(value.buildingKey!==null&&!str(value.buildingKey,300)))throw invalid();
  } else throw invalid();
  return value;
}
export function validateSearch(value:any):CandidateInput {
  if(!value||typeof value!=="object")throw invalid();
  if("q" in value) {
    if(Object.keys(value).some(k=>!["q","limit"].includes(k))||!str(value.q,200))throw invalid();
    const limit=value.limit===undefined?10:Number(value.limit);
    if(!Number.isInteger(limit)||limit<1||limit>10)throw invalid();
    return {q:value.q.trim(),limit};
  }
  if(Object.keys(value).some(k=>!["category","longitude","latitude"].includes(k)) || !["coffee","restaurant","bakery","park"].includes(value.category)
    || value.longitude===undefined||value.latitude===undefined||value.longitude===""||value.latitude==="")throw invalid();
  const position=[Number(value.longitude),Number(value.latitude)];
  if(!isPosition(position,85))throw invalid();
  return {category:value.category,longitude:position[0],latitude:position[1]};
}
type StoredResult = {personId:string;dataMode:string;input:CandidateInput;result:SearchResult};
export class PlacesService {
  private results=new Map<string,StoredResult>();
  constructor(private now:()=>number=Date.now){}
  async search(context:RequestContext,db:DatabaseSync,input:CandidateInput):Promise<SearchResult> {
    input=validateSearch(input);
    const now=this.now();
    for(const [key,value] of this.results)if(value.result.expiresAt<=now)this.results.delete(key);
    // Reuse live in-memory provider results for identical conditions; no persistent candidate cache.
    for(const cached of this.results.values())if(cached.personId===context.personId&&cached.dataMode===context.dataMode&&hash(cached.input)===hash(input)) {
      if(!("q" in input)||(cached.result.items.every(item=>item.placeId===null)&&savedCandidates(db,input.q,input.limit??10).length===0))return structuredClone(cached.result);
    }
    context.signal.throwIfAborted();
    let items:Omit<PlaceCandidate,"candidateId">[];
    if("q" in input) {
      items=savedCandidates(db,input.q,input.limit??10);
      if(items.length===0)items=await searchNominatim(input.q,input.limit??10,context.signal);
    } else items=await searchMapbox(input.category,[input.longitude,input.latitude],context.signal);
    context.signal.throwIfAborted();
    const result={resultId:randomUUID(),items:items.map((item,i)=>({...item,candidateId:`candidate-${i+1}`})),expiresAt:this.now()+15*60_000};
    this.results.set(result.resultId,{personId:context.personId,dataMode:context.dataMode,input,result});
    return structuredClone(result);
  }
  resolveCandidate(context:RequestContext,resultId:string,candidateId:string):PlaceCandidate {
    const stored=this.results.get(resultId);
    if(!stored)throw new CommonError("RESULT_EXPIRED","候補の期限が切れました。検索し直してください。",false);
    if(stored.personId!==context.personId||stored.dataMode!==context.dataMode)throw new CommonError("NOT_FOUND","候補が見つかりません。",false);
    if(stored.result.expiresAt<=this.now())throw new CommonError("RESULT_EXPIRED","候補の期限が切れました。検索し直してください。",false);
    const candidate=stored.result.items.find(item=>item.candidateId===candidateId);
    if(!candidate)throw new CommonError("NOT_FOUND","候補が見つかりません。",false);
    return structuredClone(candidate);
  }
  resolveCandidateReference(context:RequestContext,resultId:string,candidateId:string) {
    const candidate=this.resolveCandidate(context,resultId,candidateId);
    return {candidate,expiresAt:this.results.get(resultId)!.result.expiresAt};
  }
  // Caller uses CORE transaction: receipt and the place are committed together.
  adopt(context:RequestContext,db:DatabaseSync,input:PlaceCreate) {
    input=validateCreate(input);
    const inputHash=hash(input);
    const receipt=db.prepare("SELECT input_hash,result_id FROM creation_receipts WHERE person_id=? AND operation='place-adopt' AND target_id=?").get(context.personId,input.id) as any;
    if(receipt) {
      if(receipt.input_hash!==inputHash)throw new CommonError("REQUEST_CONFLICT","同じ保存IDが別の内容で使用されています。",false);
      return {place:getPlace(db,receipt.result_id),created:false};
    }
    let candidate:Omit<PlaceCandidate,"candidateId">;
    if(input.mode==="candidate") {
      const match=this.resolveCandidate(context,input.resultId,input.candidateId);
      if(match.retention!=="storable")throw new CommonError("REQUEST_CONFLICT","この検索候補は一時表示です",false);
      candidate=match;
    } else candidate={placeId:null,name:input.name,address:input.address,coordinates:[input.position.longitude,input.position.latitude],categories:[],provider:"manual",externalId:null,buildingKey:input.buildingKey,sourceUrl:null,attribution:"",fetchedAt:null,retention:"storable"};
    let existing=candidate.placeId?getPlace(db,candidate.placeId):null;
    if(!existing&&candidate.externalId) {
      const row=db.prepare("SELECT * FROM places WHERE provider=? AND external_id=?").get(candidate.provider,candidate.externalId);
      if(row)existing=placeDto(row);
    }
    const occupied=db.prepare("SELECT id FROM places WHERE id=?").get(input.id);
    if(occupied&&existing?.id!==input.id)throw new CommonError("REQUEST_CONFLICT","同じ保存IDが別の場所で使用されています。",false);
    const place=existing??insertPlace(db,input.id,candidate,context.personId,this.now());
    db.prepare("INSERT INTO creation_receipts(person_id,operation,target_id,input_hash,result_type,result_id,created_at) VALUES (?,'place-adopt',?,?,'place',?,?)")
      .run(context.personId,input.id,inputHash,place.id,this.now());
    return {place,created:!existing};
  }
}
export function listPlaces(context:RequestContext,db:DatabaseSync,input:Record<string,string>) {
  if(Object.keys(input).some(k=>!["q","bbox","buildingKey","cursor","limit"].includes(k)))throw invalid();
  if(input.q!==undefined&&!str(input.q,200)||input.buildingKey!==undefined&&!str(input.buildingKey,400))throw invalid();
  const limit=input.limit===undefined?50:Number(input.limit);
  if(!Number.isInteger(limit)||limit<1||limit>100)throw invalid();
  let bbox:[number,number,number,number]|undefined;
  if(input.bbox!==undefined){bbox=input.bbox.split(",").map(Number) as [number,number,number,number];if(bbox.length!==4||!isPosition(bbox.slice(0,2))||!isPosition(bbox.slice(2))||bbox[0]>=bbox[2]||bbox[1]>=bbox[3])throw invalid();}
  const queryHash=hash({personId:context.personId,dataMode:context.dataMode,q:normalize(input.q??""),bbox:bbox??null,buildingKey:input.buildingKey??null,order:"name,id"});
  let after:any=null;
  if(input.cursor){try{after=JSON.parse(Buffer.from(input.cursor,"base64url").toString());}catch{throw invalid("ページ位置が不正です。");}if(after.queryHash!==queryHash||!id(after.id)||typeof after.name!=="string")throw invalid("検索条件が変更されています。");}
  let rows=db.prepare("SELECT * FROM places ORDER BY name ASC,id ASC").all() as any[];
  const q=normalize(input.q??"");
  rows=rows.filter(r=>(!q||normalize(r.name).includes(q)||normalize(r.address??"").includes(q))&&(!input.buildingKey||r.building_key===input.buildingKey)&&(!bbox||r.longitude>=bbox[0]&&r.latitude>=bbox[1]&&r.longitude<=bbox[2]&&r.latitude<=bbox[3]));
  if(after){const i=rows.findIndex(r=>r.name===after.name&&r.id===after.id);if(i>=0)rows=rows.slice(i+1);else rows=rows.filter(r=>Buffer.compare(Buffer.from(r.name),Buffer.from(after.name))>0||(r.name===after.name&&Buffer.compare(Buffer.from(r.id),Buffer.from(after.id))>0));}
  const items=rows.slice(0,limit).map(placeDto),last=items.at(-1);
  return {items,nextCursor:rows.length>limit&&last?Buffer.from(JSON.stringify({queryHash,name:last.name,id:last.id})).toString("base64url"):null};
}

export const placesService = new PlacesService();
