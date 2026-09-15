import type { DatabaseSync } from "node:sqlite";
import type { RequestContext } from "../../core/context.ts";
import { CommonError } from "../../core/errors.ts";
import { createInformationService } from "../../information/service.ts";
import { getPlaceMetadata } from "./metadata.ts";
import { getPlace, colocated } from "./repository.ts";
async function section<T>(read:()=>T|Promise<T>) {
  try{return {status:"ready" as const,items:await read(),error:null};}
  catch(error){return {status:"failed" as const,items:[],error:error instanceof CommonError
    ?{code:error.code,message:error.message,retryable:error.retryable}
    :{code:"PROVIDER_UNAVAILABLE",message:"この情報を取得できません。",retryable:true}};}
}
export async function getPlaceDetail(context:RequestContext,db:DatabaseSync,placeId:string) {
  const place=getPlace(db,placeId);
  const information=createInformationService(db);
  const query={placeId,includeUndated:true};
  const [ownRecords,sharedRecords,visits]=await Promise.all([
    section(()=>information.allRecords(context,{...query,audience:"own"})),
    section(async()=>(await information.allRecords(context,{...query,audience:"visible"})).filter(record=>record.person.id!==context.personId)),
    section(()=>information.ownVisits(context,placeId))
  ]);
  return {place,...getPlaceMetadata(db,placeId),colocated:colocated(db,place),ownRecords,sharedRecords,visits};
}
