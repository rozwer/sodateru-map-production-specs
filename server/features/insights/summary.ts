import type {DatabaseSync} from "node:sqlite";
import type {RequestContext} from "../../core/context.ts";
import {CommonError} from "../../core/errors.ts";
import {deriveDailyEvidence,type ExperienceRecord} from "./daily-evidence.ts";
import {normalizeRefs,type SourceRef} from "./identity.ts";
import type {createInsightsService} from "./service.ts";
import type {StatisticsRange} from "./statistics.ts";
export const aggregationVersion="insights-fixed-five-1";
export type SummaryDependencies={
 ownMaterials(db:DatabaseSync,context:RequestContext,query:{from:number;to:number;rangeMatch:"startsWithin"}):ExperienceRecord[];
 assertSourcesCurrent(db:DatabaseSync,context:RequestContext,input:{refs:SourceRef[]}):unknown;
 insights(db:DatabaseSync):ReturnType<typeof createInsightsService>;
};
export function createSummaryService(db:DatabaseSync,deps:SummaryDependencies){
 function get(context:RequestContext,range:StatisticsRange){
   if(!Number.isSafeInteger(range.from)||!Number.isSafeInteger(range.to)||range.to<=range.from)throw new CommonError("INVALID_INPUT","対象期間の開始・終端が不正です。");
   try{new Intl.DateTimeFormat("en",{timeZone:range.timeZone});}catch{throw new CommonError("INVALID_INPUT","IANAタイムゾーンが不正です。");}
   context.signal.throwIfAborted();
   const records=deps.ownMaterials(db,context,{from:range.from,to:range.to,rangeMatch:"startsWithin"});
   const sourceRefs=normalizeRefs(records.flatMap(r=>r.sourceRefs));
   if(sourceRefs.length>1000)throw new CommonError("INPUT_TOO_LARGE","根拠が多すぎます。対象期間を絞ってください。");
   const result=deriveDailyEvidence(range,records);
   deps.assertSourcesCurrent(db,context,{refs:sourceRefs});
   context.signal.throwIfAborted();
   return {...range,result,sourceRefs};
 }
 function create(context:RequestContext,input:StatisticsRange&{id:string}){
   const {id,...range}=input;
   const summary=get(context,range);
   return deps.insights(db).saveAnalysis(context,{
     id,conditions:{from:range.from,to:range.to},sourceRefs:summary.sourceRefs,
     rangeStart:range.from,rangeEnd:range.to,timeZone:range.timeZone,generatorVersion:aggregationVersion,
     model:null,summary:"この期間に明記された体験を日単位で集計しました。記録のない日は不明です。",
     result:summary.result
   });
 }
 return {get,create};
}
