import type { DatabaseSync } from "node:sqlite";
import { transaction } from "../../db/migrate.ts";
import type { RequestContext } from "../../core/context.ts";
import { CommonError } from "../../core/errors.ts";
import { canonicalJson, inputKey, normalizeRefs, type SourceRef } from "./identity.ts";
import { createInsightsRepository, type Insight, type Review, type AnalysisResult, type ComparisonResult } from "./repository.ts";

export type SourceCheck = { ref: SourceRef; state: "current" | "changed" | "unavailable"; currentVersion: number | null };
export type InsightsDependencies = { checkSources(context: RequestContext, input: {refs: SourceRef[]}): SourceCheck[] };
export type SaveInsightInput = {
 id:string; conditions:unknown; sourceRefs:SourceRef[]; timeZone:string; generatorVersion:string;
 model:string|null; summary:string; result:AnalysisResult|ComparisonResult; rangeStart:number|null; rangeEnd:number|null;
};
export type ListInsightsInput = { from?:number;to?:number;kind?:"analysis"|"comparison";rangeStart?:number;rangeEnd?:number;timeZone?:string;cursor?:string;limit?:number };

const fail=(code:string,message:string):never=>{throw new CommonError(code,message);};
function range(start:number|null,end:number|null,required=false) {
 if ((start===null)!==(end===null) || (required && start===null) || (start!==null && (!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||end!<=start))) fail("INVALID_INPUT","対象期間を開始・終端の組で指定してください。");
}
function zone(value:string) {
 try { new Intl.DateTimeFormat("en",{timeZone:value}); } catch { fail("INVALID_INPUT","有効なIANAタイムゾーンを指定してください。"); }
}
function checkResult(kind:"analysis"|"comparison",result:AnalysisResult|ComparisonResult) {
 if (!Array.isArray(result.unknown) || result.unknown.some(s=>typeof s!=="string")) fail("INVALID_INPUT","不足情報が不正です。");
 if(kind==="analysis"){
   const axes=(result as AnalysisResult).axes;
   if(!Array.isArray(axes)) fail("INVALID_INPUT","集計値がありません。");
   const keys=new Set<string>();
   for(const a of axes){
     if(!a.key||keys.has(a.key)||[a.numerator,a.denominator,a.unknownDays].some(n=>!Number.isSafeInteger(n)||n<0)||a.numerator>a.denominator||a.value!==(a.denominator===0?null:a.numerator/a.denominator)) fail("INVALID_INPUT","計算済みの分子・分母・欠測・割合が一致しません。");
     keys.add(a.key);
   }
 }else{
   const value=result as ComparisonResult;
   if(!Array.isArray(value.common)||!Array.isArray(value.differences)||[...value.common,...value.differences].some(s=>typeof s!=="string")) fail("INVALID_INPUT","比較の本人文/結果が不正です。");
 }
}

/** Shared evidence-backed insight storage. It never recalculates comparison business results. */
export function createInsightsService(db:DatabaseSync,deps:InsightsDependencies) {
 const repo=createInsightsRepository(db);
 function current(context:RequestContext,refs:SourceRef[]) {
   context.signal.throwIfAborted();
   const checks=deps.checkSources(context,{refs});
   context.signal.throwIfAborted();
   if(checks.length!==refs.length) fail("OUTPUT_INVALID","根拠の照合結果が不足しています。");
   const keys=new Set<string>();
   for(const check of checks){
     const key=canonicalJson(check.ref);
     if(keys.has(key)||!refs.some(ref=>canonicalJson(ref)===key)) fail("OUTPUT_INVALID","根拠の照合結果が一致しません。");
     keys.add(key);
   }
   if(checks.some(c=>c.state==="unavailable")) fail("NOT_FOUND","参照元を現在は取得できません。");
   if(checks.some(c=>c.state==="changed")) fail("SOURCE_CHANGED","参照元が更新されています。再取得してください。");
   if(checks.some(c=>c.state!=="current"||c.currentVersion!==c.ref.version)) fail("OUTPUT_INVALID","根拠の版照合が不正です。");
 }
 function get(context:RequestContext,id:string) {
   context.signal.throwIfAborted();
   const insight=repo.get(context.personId,id);
   if(!insight) return fail("NOT_FOUND","結果がありません。");
   current(context,insight.sourceRefs);
   return insight;
 }
 function save(context:RequestContext,kind:"analysis"|"comparison",input:SaveInsightInput) {
   context.signal.throwIfAborted();
   if(!input.id||input.id.length>80||!input.generatorVersion||input.generatorVersion.length>200||typeof input.summary!=="string"||input.summary.length>10000) fail("INVALID_INPUT","保存する結果の形式が不正です。");
   range(input.rangeStart,input.rangeEnd,kind==="analysis");zone(input.timeZone);checkResult(kind,input.result);
   let refs:SourceRef[];
   try { refs=normalizeRefs(input.sourceRefs); } catch { return fail("INVALID_INPUT","根拠参照が不正、または版が競合しています。"); }
   if(refs.length>1000) fail("INPUT_TOO_LARGE","根拠が多すぎます。期間を絞ってください。");
   const key=inputKey({personId:context.personId,kind,conditions:{rangeStart:input.rangeStart,rangeEnd:input.rangeEnd,value:input.conditions},sourceRefs:refs,timeZone:input.timeZone,generatorVersion:input.generatorVersion,model:input.model});
   current(context,refs);
   // No asynchronous gap between final source check and synchronous receipt/insight persistence.
   const receipt=db.prepare("SELECT input_key,insight_id FROM insights_creation_receipts WHERE person_id=? AND id=?").get(context.personId,input.id);
   if(receipt){
     if(receipt.input_key!==key) return fail("REQUEST_CONFLICT","同じIDに別の入力を保存できません。");
     const existing=repo.get(context.personId,String(receipt.insight_id));
     if(!existing) return fail("NOT_FOUND","この結果は削除済みです。新しい操作で作成してください。");
     return {insight:existing,created:false};
   }
   const same=repo.findByInput(context.personId,kind,key);
   if(same) {
     transaction(db,()=>db.prepare("INSERT INTO insights_creation_receipts(person_id,id,input_key,insight_id) VALUES (?,?,?,?)").run(context.personId,input.id,key,same.id));
     return {insight:same,created:false};
   }
   if(db.prepare("SELECT 1 FROM insights WHERE id=?").get(input.id)) fail("REQUEST_CONFLICT","このIDは使用できません。");
   const now=Date.now();
   const insight:Insight={...input,personId:context.personId,kind,inputKey:key,sourceRefs:refs,review:null,reviewNote:null,reviewedAt:null,version:1,createdAt:now,updatedAt:now};
   // conditions belongs to input identity, not the public Insight DTO.
   delete (insight as any).conditions;
   transaction(db,()=>{
     db.prepare("INSERT INTO insights_creation_receipts(person_id,id,input_key,insight_id) VALUES (?,?,?,?)").run(context.personId,input.id,key,insight.id);
     repo.insert(insight);
   });
   return {insight,created:true};
 }
 function review(context:RequestContext,id:string,expectedVersion:number,patch:{review?:Review;reviewNote?:string|null}) {
   if(!Object.keys(patch).length||Object.keys(patch).some(k=>!["review","reviewNote"].includes(k))) fail("INVALID_INPUT","判断または理由を指定してください。");
   if(patch.review!==undefined&&patch.review!==null&&!["agree","disagree","unsure","edit"].includes(patch.review)) fail("INVALID_INPUT","判断が不正です。");
   if(patch.reviewNote!==undefined&&patch.reviewNote!==null&&(typeof patch.reviewNote!=="string"||Array.from(patch.reviewNote).length>200)) fail("INVALID_INPUT","理由は200文字以内で入力してください。");
   const insight=get(context,id);
   if(insight.version!==expectedVersion) fail("VERSION_CONFLICT","結果の版が更新されています。");
   const value=patch.review===undefined?insight.review:patch.review;
   const note=value===null?null:(patch.reviewNote===undefined?insight.reviewNote:patch.reviewNote);
   const now=Date.now();
   const updated=repo.review(context.personId,id,expectedVersion,{review:value,reviewNote:note,reviewedAt:value===null?null:now},now);
   if(!updated) return fail("VERSION_CONFLICT","結果の版が更新されています。");
   return updated;
 }
 function list(context:RequestContext,input:ListInsightsInput) {
   const {cursor,limit=50,...filters}=input;
   if(!Number.isInteger(limit)||limit<1||limit>100) fail("INVALID_INPUT","一覧件数は1〜100で指定してください。");
   if(filters.kind&&!["analysis","comparison"].includes(filters.kind)) fail("INVALID_INPUT","結果の種類が不正です。");
   for(const n of [filters.from,filters.to,filters.rangeStart,filters.rangeEnd])if(n!==undefined&&!Number.isSafeInteger(n))fail("INVALID_INPUT","日時が不正です。");
   if(filters.from!==undefined&&filters.to!==undefined&&filters.to<=filters.from)fail("INVALID_INPUT","期間が不正です。");
   if(filters.rangeStart!==undefined||filters.rangeEnd!==undefined)range(filters.rangeStart??null,filters.rangeEnd??null,true);
   if(filters.timeZone)zone(filters.timeZone);
   const binding=canonicalJson({personId:context.personId,dataMode:context.dataMode,filters});
   let after:{createdAt:number;id:string}|null=null;
   if(cursor){
     try{
       const decoded=JSON.parse(Buffer.from(cursor,"base64url").toString());
       if(decoded.binding!==binding||!Number.isSafeInteger(decoded.createdAt)||typeof decoded.id!=="string")throw new Error();
       after=decoded;
     }catch{return fail("INVALID_INPUT","この一覧条件のカーソルではありません。");}
   }
   const visible:Insight[]=[];
   for(const row of repo.list(context.personId)){
     if(filters.kind&&row.kind!==filters.kind||filters.from!==undefined&&row.createdAt<filters.from||filters.to!==undefined&&row.createdAt>=filters.to||filters.rangeStart!==undefined&&row.rangeStart!==filters.rangeStart||filters.rangeEnd!==undefined&&row.rangeEnd!==filters.rangeEnd||filters.timeZone&&row.timeZone!==filters.timeZone)continue;
     if(after&&(row.createdAt>after.createdAt||row.createdAt===after.createdAt&&row.id>=after.id))continue;
     try{current(context,row.sourceRefs);}catch(error){if(error instanceof CommonError&&["SOURCE_CHANGED","NOT_FOUND"].includes(error.code))continue;throw error;}
     visible.push(row);if(visible.length>limit)break;
   }
   const items=visible.slice(0,limit),last=items.at(-1);
   return {items,nextCursor:visible.length>limit&&last?Buffer.from(JSON.stringify({binding,createdAt:last.createdAt,id:last.id})).toString("base64url"):null};
 }
 function remove(context:RequestContext,id:string,expectedVersion:number) {
   context.signal.throwIfAborted();
   // A user may delete an invalidated result without reopening its old quotations.
   const row=repo.get(context.personId,id);
   if(!row)fail("NOT_FOUND","結果がありません。");
   if(!repo.remove(context.personId,id,expectedVersion))fail("VERSION_CONFLICT","結果の版が更新されています。");
 }
 return {get,list,review,remove,
   saveComparison:(context:RequestContext,input:SaveInsightInput&{result:ComparisonResult})=>save(context,"comparison",input),
   saveAnalysis:(context:RequestContext,input:SaveInsightInput&{result:AnalysisResult})=>save(context,"analysis",input)};
}
