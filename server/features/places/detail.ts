import type { DatabaseSync } from "node:sqlite";
import type { RequestContext } from "../../core/context.ts";
import type {CommonInfoRecordView,CommonInfoVisitView} from "../../../packages/api-client/types.generated.ts";
import { CommonError } from "../../core/errors.ts";
import { getPlaceMetadata } from "./metadata.ts";
import { getPlace, colocated } from "./repository.ts";
export interface PlaceInformationReader {
  allRecords(context:RequestContext,query:{placeId:string;includeUndated:boolean;audience:"own"|"visible"}):CommonInfoRecordView[]|Promise<CommonInfoRecordView[]>;
  ownVisits(context:RequestContext,placeId:string):CommonInfoVisitView[]|Promise<CommonInfoVisitView[]>;
}
async function loadInformation(db:DatabaseSync):Promise<PlaceInformationReader> {
  // Optional at feature load time: an unavailable record provider becomes a failed section.
  // The implementation is always INFORMATION's real service, never a local substitute.
  try {
    const module=await import(new URL("../../information/service.ts",import.meta.url).href);
    return module.createInformationService(db);
  }catch{throw new CommonError("PROVIDER_UNAVAILABLE","記録の取得基盤を利用できません。",true);}
}
async function section<T>(read:()=>T|Promise<T>) {
  try{return {status:"ready" as const,items:await read(),error:null};}
  catch(error){return {status:"failed" as const,items:[],error:error instanceof CommonError
    ?{code:error.code,message:error.message,retryable:error.retryable}
    :{code:"PROVIDER_UNAVAILABLE",message:"この情報を取得できません。",retryable:true}};}
}
export async function getPlaceDetail(context:RequestContext,db:DatabaseSync,placeId:string,reader?:PlaceInformationReader) {
  const place=getPlace(db,placeId);
  const information=reader?Promise.resolve(reader):loadInformation(db);
  const query={placeId,includeUndated:true};
  const [ownRecords,sharedRecords,visits]=await Promise.all([
    section(async()=>(await information).allRecords(context,{...query,audience:"own"})),
    section(async()=>(await (await information).allRecords(context,{...query,audience:"visible"})).filter(record=>record.person.id!==context.personId)),
    section(async()=>(await information).ownVisits(context,placeId))
  ]);
  return {place,...getPlaceMetadata(db,placeId),colocated:colocated(db,place),ownRecords,sharedRecords,visits};
}
