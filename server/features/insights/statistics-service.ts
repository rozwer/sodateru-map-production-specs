import type {DatabaseSync} from "node:sqlite";
import type {RequestContext} from "../../core/context.ts";
import {CommonError} from "../../core/errors.ts";
import {transaction} from "../../db/migrate.ts";
import {createInformationService} from "../../information/service.ts";
import {listVisits,listPoints} from "../activity/queries.ts";
import {activityStatistics,type StatisticsRange,type VisitMaterial,type RecordMaterial} from "./statistics.ts";
import type {TrackMaterial} from "./gps-statistics.ts";

function allPages<T>(context:RequestContext,read:(cursor?:string)=>{items:T[];nextCursor:string|null}):T[]{
 const result:T[]=[];let cursor:string|undefined;
 do{context.signal.throwIfAborted();const page=read(cursor);result.push(...page.items);cursor=page.nextCursor??undefined;}while(cursor);
 return result;
}
export function getActivityStatistics(db:DatabaseSync,context:RequestContext,range:StatisticsRange){
 if(!Number.isSafeInteger(range.from)||!Number.isSafeInteger(range.to)||range.to<=range.from)throw new CommonError("INVALID_INPUT","開始より後の終端を指定してください。");
 try{new Intl.DateTimeFormat("en",{timeZone:range.timeZone});}catch{throw new CommonError("INVALID_INPUT","有効なIANAタイムゾーンを指定してください。");}
 return transaction(db,()=>{
  context.signal.throwIfAborted();
  const info=createInformationService(db);
  // All confirmed history determines whether a period place is new. Pagination must not truncate it.
  const visits=allPages<VisitMaterial>(context,cursor=>listVisits(db,context,{status:"confirmed",limit:100,...(cursor?{cursor}:{})}));
  const points=allPages<TrackMaterial>(context,cursor=>listPoints(db,context,{from:range.from,to:range.to,limit:100,...(cursor?{cursor}:{})}));
  const records:RecordMaterial[]=info.ownMaterials(context,{range:{startAt:range.from,endAt:range.to,timezone:range.timeZone},rangeMatch:"startsWithin",includeUndated:true}).map(record=>({...record,updatedAt:info.getOwnRecord(context,record.id).updatedAt as number}));
  const result=activityStatistics(range,visits,records,points);
  if(result.sourceRefs.length>1000)throw new CommonError("INPUT_TOO_LARGE","根拠が多すぎます。対象期間を絞ってください。");
  info.assertSourcesCurrent(context,{refs:result.sourceRefs});
  context.signal.throwIfAborted();
  return {...range,...result};
 });
}
