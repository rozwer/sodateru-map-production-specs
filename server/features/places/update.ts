import type { DatabaseSync } from "node:sqlite";
import type { RequestContext } from "../../core/context.ts";
import { CommonError, requireVersion } from "../../core/errors.ts";
import { getPlace } from "./repository.ts";
import { refreshNominatim } from "./providers.ts";
import { getPlaceMetadata, type OpeningHours, type Entrance } from "./metadata.ts";
import { isPosition } from "./types.ts";
const fields=["name","address","buildingKey","openingHours","entrances"] as const;
type Field=typeof fields[number];
export type PlacePatch=Partial<{name:string;address:string|null;buildingKey:string|null;openingHours:OpeningHours|null;entrances:Entrance[];resetFields:Field[];refreshExternal:boolean}>;
const validText=(v:unknown,max:number,empty=false)=>typeof v==="string"&&[...v].length<=max&&(empty||!!v.trim());
const validSource=(v:unknown)=>v===null||(validText(v,2048)&&/^https?:\/\//.test(v as string));
function provenance(v:any) {
  return v && validSource(v.sourceUrl)&&(v.fetchedAt===null||Number.isSafeInteger(v.fetchedAt)&&v.fetchedAt>=0)&&["unverified","confirmed"].includes(v.verificationStatus);
}
export function validatePatch(value:any):PlacePatch {
  const invalid=()=>{throw new CommonError("INVALID_INPUT","場所の訂正内容を確認してください。",false);};
  if(!value||typeof value!=="object"||Array.isArray(value)||!Object.keys(value).length||Object.keys(value).some(k=>![...fields,"resetFields","refreshExternal"].includes(k as any)))invalid();
  if("name" in value&&!validText(value.name,200))invalid();
  if("address" in value&&value.address!==null&&!validText(value.address,2000,true))invalid();
  if("buildingKey" in value&&value.buildingKey!==null&&!validText(value.buildingKey,300))invalid();
  if("refreshExternal" in value&&value.refreshExternal!==true)invalid();
  if("resetFields" in value&&(!Array.isArray(value.resetFields)||!value.resetFields.length||new Set(value.resetFields).size!==value.resetFields.length||value.resetFields.some((f:any)=>!fields.includes(f)||f in value)))invalid();
  const h=value.openingHours;
  if(h!==undefined&&h!==null){
    if(!provenance(h)||!validText(h.rawText,2000)||Object.keys(h).some(k=>!["rawText","timezone","sourceUrl","fetchedAt","verificationStatus"].includes(k)))invalid();
    if(h.timezone!==null){try{if(typeof h.timezone!=="string")invalid();new Intl.DateTimeFormat("ja",{timeZone:h.timezone});}catch{invalid();}}
  }
  if(value.entrances!==undefined){
    if(!Array.isArray(value.entrances)||value.entrances.length>100)invalid();
    const ids=new Set();
    for(const e of value.entrances){
      if(!provenance(e)||!validText(e.id,80)||ids.has(e.id)||!isPosition(e.coordinates)||(e.label!==null&&!validText(e.label,200))||!["unknown","accessible","restricted"].includes(e.accessibility)||Object.keys(e).some(k=>!["id","coordinates","label","accessibility","sourceUrl","fetchedAt","verificationStatus"].includes(k)))invalid();
      ids.add(e.id);
    }
  }
  return value;
}
// Permission policy is supplied by the server registration, never by HTTP input.
// The returned synchronous commit MUST run inside CORE transaction.
export async function preparePlaceUpdate(context:RequestContext,db:DatabaseSync,placeId:string,input:PlacePatch,version:number,authorize:()=>boolean) {
  input=validatePatch(input);
  const check=()=>{if(!authorize())throw new CommonError("FORBIDDEN","この場所を訂正する権限がありません。",false);const p=getPlace(db,placeId);requireVersion(p.version,version);return p;};
  const before=check();
  let refreshed:Awaited<ReturnType<typeof refreshNominatim>>|undefined;
  if(input.refreshExternal){
    if(before.provider!=="nominatim"||!before.externalId)throw new CommonError("REQUEST_CONFLICT","この場所には再取得できる外部情報がありません。",false);
    refreshed=await refreshNominatim(before.externalId,context.signal);
  }
  return ()=>{
    context.signal.throwIfAborted();
    const place=check(),metadata=getPlaceMetadata(db,placeId),now=Date.now();
    const saved=db.prepare("SELECT corrections_json,external_values_json FROM place_details WHERE place_id=?").get(placeId) as any;
    const corrections=JSON.parse(saved?.corrections_json??"{}"),external=JSON.parse(saved?.external_values_json??"{}");
    const values:any={name:place.name,address:place.address,buildingKey:place.buildingKey,openingHours:metadata.openingHours,entrances:metadata.entrances};
    // Keep the last provider value before the first manual correction.
    for(const field of fields)if(!(field in external))external[field]=values[field];
    if(refreshed){
      Object.assign(external,{name:refreshed.candidate.name,address:refreshed.candidate.address,openingHours:refreshed.openingHours,entrances:refreshed.entrances});
      for(const field of fields)if(!(field in corrections))values[field]=external[field];
    }
    for(const field of input.resetFields??[]){delete corrections[field];values[field]=external[field];}
    for(const field of fields)if(field in input){values[field]=input[field];corrections[field]={value:input[field],personId:context.personId,correctedAt:now};}
    const candidate=refreshed?.candidate;
    const changed=db.prepare(`UPDATE places SET name=?,address=?,building_key=?,longitude=?,latitude=?,categories_json=?,source_url=?,attribution=?,fetched_at=?,version=version+1,updated_at=? WHERE id=? AND version=?`)
      .run(values.name,values.address,values.buildingKey,...(candidate?.coordinates??place.coordinates),JSON.stringify(candidate?.categories??place.categories),candidate?.sourceUrl??place.sourceUrl,candidate?.attribution??place.attribution,candidate?.fetchedAt??place.fetchedAt,now,placeId,version);
    if(!changed.changes)throw new CommonError("VERSION_CONFLICT","場所が更新されています。",false,undefined,412);
    db.prepare(`INSERT INTO place_details(place_id,opening_hours_json,entrances_json,corrections_json,external_values_json) VALUES (?,?,?,?,?)
      ON CONFLICT(place_id) DO UPDATE SET opening_hours_json=excluded.opening_hours_json,entrances_json=excluded.entrances_json,corrections_json=excluded.corrections_json,external_values_json=excluded.external_values_json`)
      .run(placeId,JSON.stringify(values.openingHours),JSON.stringify(values.entrances),JSON.stringify(corrections),JSON.stringify(external));
    return getPlace(db,placeId);
  };
}
