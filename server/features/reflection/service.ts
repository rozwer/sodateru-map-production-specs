import type { DatabaseSync } from 'node:sqlite';
import type { RequestContext } from '../../core/context.ts';
import { CommonError } from '../../core/errors.ts';
import { createInformationService } from '../../information/service.ts';
import { createRecord, patchRecord } from '../records/service.ts';
import { createInsightsService } from '../insights/service.ts';
import { getRun, assertRunAdoptable, readAppliedRefs, appendAppliedRef, canonicalHash } from '../../ai/index.ts';
import { QuestionStore } from './questions.ts';
import type { QuestionStatus, Question } from './questions.ts';
import { extractPatch, questionDisplay } from './logic.ts';

type Transaction = <T>(db: DatabaseSync, fn:()=>T)=>T;
function fail(code:string,message:string,status?:number):never { throw new CommonError(code,message,false,undefined,status); }
export function memoInput(id:string, body:string, kind:'memo'|'diary'='memo', occurredAt:number|null=null) {
 return {id,kind,visitId:null,placeId:null,occurredAt,endedAt:null,timePrecision:occurredAt===null?'unknown':'exact',body,purposes:[],activities:[],impression:'',periodAnswers:{},bookmarked:false,useForSuggestions:false,topicKey:null,visibility:'private',sharedWith:[]};
}
export function createReflectionService(db:DatabaseSync, {transaction}:{transaction:Transaction}) {
 const questions = new QuestionStore(db);
 const info = createInformationService(db);
 const insights = createInsightsService(db,{checkSources: (context:any, input:any)=>info.checkSources(context,input)});
 function getQuestion(context:RequestContext,id:string) {
   const q=questions.get(context.personId,id);
   if (!q) fail('NOT_FOUND','質問が見つかりません',404);
   let answer:any=null;
   if (q.answerRecordId) {
     try { answer=info.getOwnRecord(context,q.answerRecordId); }
     catch (e:any) { if (e.code!=='NOT_FOUND') throw e; }
   }
   const visible=questionDisplay(q,info.checkSources(context,{refs:q.sourceRefs as any}));
   return {...visible,answerText:answer?.body ?? null,answerVersion:answer?.version ?? null,
     answerRef:answer?{type:'record',id:answer.id,version:answer.version}:null,
     answerUnavailable:Boolean(q.answerRecordId&&!answer)};
 }
 function updateQuestion(context:RequestContext,id:string,version:number,input:{status:QuestionStatus;answerText?:string;answerVersion?:number}) {
  return transaction(db,()=>{
   const q=getQuestion(context,id);
   if(q.version!==version) fail('VERSION_CONFLICT','質問の状態が更新されています',412);
   let answerId=q.answerRecordId;
   if(input.status==='answered') {
    if(typeof input.answerText!=='string'||!input.answerText.trim()||[...input.answerText].length>4000) fail('INVALID_REQUEST','回答は1〜4000文字です',400);
    if(answerId) {
      if(!q.answerVersion) fail('NOT_FOUND','回答記録は削除されています',404);
      if(input.answerVersion===undefined) fail('VERSION_REQUIRED','回答の版が必要です',428);
      patchRecord(db,context.personId,answerId,{body:input.answerText},input.answerVersion);
    } else {
      answerId='answer_'+canonicalHash({personId:context.personId,questionId:id}).slice(0,48);
      createRecord(db,context.personId,memoInput(answerId,input.answerText) as any);
    }
   } else if(input.answerText!==undefined||input.answerVersion!==undefined) fail('INVALID_REQUEST','回答保存はansweredを指定してください',400);
   if(!questions.update(context.personId,id,version,{status:input.status,...(answerId?{answerRecordId:answerId}:{})})) fail('VERSION_CONFLICT','質問の状態が更新されています',412);
   return getQuestion(context,id);
  });
 }
 function listQuestions(context:RequestContext,query:any) {
   const {cursor,limit=50,status,targetRecordId}=query;
   let before;
   if(cursor) {
    try {
      const payload=JSON.parse(Buffer.from(cursor,'base64url').toString());
      if(payload.personId!==context.personId||payload.dataMode!==context.dataMode||payload.status!==(status??null)||payload.targetRecordId!==(targetRecordId??null)||!Number.isSafeInteger(payload.createdAt)||typeof payload.id!=='string') throw Error();
      before={createdAt:payload.createdAt,id:payload.id};
    } catch {fail('INVALID_REQUEST','一覧位置が検索条件と一致しません',400);}
   }
   const page=questions.list(context.personId,{status,targetRecordId,limit,before});
   const last=page.items.at(-1);
   return {items:page.items.map(q=>getQuestion(context,q.id)),nextCursor:page.hasMore&&last?Buffer.from(JSON.stringify({personId:context.personId,dataMode:context.dataMode,status:status??null,targetRecordId:targetRecordId??null,createdAt:last.createdAt,id:last.id})).toString('base64url'):null};
 }
 function proposal(context:RequestContext,messageId:string) {
   const row=db.prepare('SELECT * FROM reflection_proposals WHERE message_id=? AND person_id=?').get(messageId,context.personId) as any;
   if(!row) fail('NOT_FOUND','保存済みの提案が見つかりません',404);
   return {...row,input:JSON.parse(row.input_json)};
 }
 async function questionFromRun(context:RequestContext,input:{assistantMessageId:string}) {
   const run=await getRun(db,context,input.assistantMessageId);
   if(run.status!=='complete'||run.task!=='extract') fail('INVALID_REQUEST','完了した体験整理が必要です',400);
   const p=proposal(context,input.assistantMessageId);
   const target=p.input.recordId;
   const q=questions.list(context.personId,{targetRecordId:target,limit:100}).items.find(q=>q.id==='question_'+canonicalHash({personId:context.personId,targetRecordId:target,topic:run.result.question?.topic,sourceRefs:run.sourceRefs}).slice(0,48));
   if(!q) fail('NOT_FOUND','追加の質問はありません',404);
   return getQuestion(context,q.id);
 }
 async function prepareAdoption(context:RequestContext,input:any) {
   const run=assertRunAdoptable(db,context,input.assistantMessageId,{expectedAttempt:input.expectedAttempt});
   const p=proposal(context,input.assistantMessageId);
   const fields=run.task==='extract'?extractPatch(run.result,input.fields??[]):{body:input.body};
   const contentHash=canonicalHash({task:run.task,fields,...(run.task==='diary'?{date:p.input.date,timezone:p.input.timezone,...(input.create===true?{occurredAt:input.occurredAt}:{})}:{})});
   const prior=readAppliedRefs(db,context,input.assistantMessageId).some(r=>r.type==='record'&&r.id===input.recordId&&r.contentHash===contentHash);
   if(!prior) await getRun(db,context,input.assistantMessageId);
   return {run,p};
 }
 function adopt(context:RequestContext,input:any,version:number|null,prepared:any) {
   const {run,p}=prepared;
   if(run.status!=='complete'||!['extract','diary'].includes(run.task)) fail('INVALID_REQUEST','採用できる提案がありません',400);
   if(run.task==='extract'&&p.input.recordId!==input.recordId) fail('INVALID_REQUEST','提案の対象記録が一致しません',400);
   if(run.task==='diary'&&typeof input.body!=='string') fail('INVALID_REQUEST','本人が確認した日記本文が必要です',400);
   const fields=run.task==='extract'?extractPatch(run.result,input.fields??[]):{body:input.body};
   if(!Object.keys(fields).length) fail('INVALID_REQUEST','採用する項目がありません',400);
   if(run.task==='diary'&&input.fields!==undefined) fail('INVALID_REQUEST','日記にはfieldsを指定できません',400);
   const contentHash=canonicalHash({task:run.task,fields,...(run.task==='diary'?{date:p.input.date,timezone:p.input.timezone,...(input.create===true?{occurredAt:input.occurredAt}:{})}:{})});
   return transaction(db,()=>{
     assertRunAdoptable(db,context,input.assistantMessageId,{expectedAttempt:run.attempt});
     const prior=readAppliedRefs(db,context,input.assistantMessageId).find((r:any)=>r.type==='record'&&r.id===input.recordId&&r.contentHash===contentHash);
     if(prior) return info.getOwnRecord(context,input.recordId);
     info.assertSourcesCurrent(context,{refs:run.sourceRefs});
     let record:any;
     if(input.create===true) {
       if(run.task!=='diary'||version!==null) fail('INVALID_REQUEST','新規採用は日記のみです',400);
       if(!Number.isSafeInteger(input.occurredAt)) fail('INVALID_REQUEST','日記の対象日時が必要です',400);
       const day=new Intl.DateTimeFormat('en-CA',{timeZone:p.input.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(input.occurredAt);
       if(day!==p.input.date) fail('INVALID_REQUEST','日記の対象日が一致しません',400);
       record=createRecord(db,context.personId,memoInput(input.recordId,input.body,'diary',input.occurredAt) as any);
     } else {
       if(version===null) fail('VERSION_REQUIRED','採用先の版が必要です',428);
       const current=info.getOwnRecord(context,input.recordId);
       if(run.task==='diary') {
         if(current.kind!=='diary') fail('INVALID_REQUEST','日記の保存先が必要です',400);
         const day=current.occurredAt===null?null:new Intl.DateTimeFormat('en-CA',{timeZone:p.input.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(current.occurredAt);
         if(day!==p.input.date) fail('INVALID_REQUEST','別の日の日記へ採用できません',400);
       }
       record=patchRecord(db,context.personId,input.recordId,fields as any,version);
     }
     appendAppliedRef(db,context,input.assistantMessageId,{type:'record',id:record.id,version:record.version,contentHash});
     return record;
   });
 }
 function manualRow(context:RequestContext,id:string) {
   const row=db.prepare('SELECT * FROM reflection_comparisons WHERE id=? AND person_id=?').get(id,context.personId) as any;
   if(!row) fail('NOT_FOUND','比較が見つかりません',404);
   return row;
 }
 function getComparison(context:RequestContext,id:string) {
   const row=manualRow(context,id);
   const left=JSON.parse(row.left_json),right=JSON.parse(row.right_json);
   const checks=info.checkSources(context,{refs:[left,right]});
   if(checks.some((c:any)=>c.state==='unavailable')) fail('NOT_FOUND','比較の根拠を現在は参照できません',404);
   const changed=checks.some((c:any)=>c.state==='changed');
   return {id:row.id,personId:row.person_id,left,right,common:row.common_text,differences:row.differences_text,
    timeZone:row.timezone,insightId:row.insight_id,version:row.version,createdAt:row.created_at,updatedAt:row.updated_at,
    evidenceState:changed?'changed':'current',insight:changed?null:insights.get(context,row.insight_id)};
 }
 function saveComparison(context:RequestContext,input:any,version:number|null=null) {
  return transaction(db,()=>{
   let old:any;
   if(version!==null) {
     old=manualRow(context,input.id);
     if(old.version!==version) fail('VERSION_CONFLICT','比較が更新されています',412);
     const left=JSON.parse(old.left_json),right=JSON.parse(old.right_json);
     if(input.left.id!==left.id||input.right.id!==right.id) fail('INVALID_REQUEST','比較対象のIDは変更できません',400);
   } else {
     const existing=db.prepare('SELECT * FROM reflection_comparisons WHERE id=?').get(input.id) as any;
     if(existing) {
       if(existing.person_id===context.personId&&existing.left_json===JSON.stringify(input.left)&&existing.right_json===JSON.stringify(input.right)&&existing.common_text===input.common&&existing.differences_text===input.differences&&existing.timezone===input.timeZone) return getComparison(context,input.id);
       fail('REQUEST_CONFLICT','比較IDは別の入力に使われています',409);
     }
   }
   if(input.left.type!=='record'||input.right.type!=='record'||input.left.id===input.right.id) fail('INVALID_REQUEST','異なる2件の記録を選んでください',400);
   info.assertSourcesCurrent(context,{refs:[input.left,input.right]});
   const saved=insights.saveComparison(context,{id:'comparison_'+canonicalHash({id:input.id,version:version??0,input}).slice(0,48),
     conditions:{left:input.left.id,right:input.right.id,manual:{common:input.common,differences:input.differences}},sourceRefs:[input.left,input.right],
     timeZone:input.timeZone,generatorVersion:'reflection-manual-v1',model:null,summary:'',
     result:{common:input.common?[input.common]:[],differences:input.differences?[input.differences]:[],unknown:[]},rangeStart:null,rangeEnd:null});
   const now=Date.now();
   if(old) db.prepare('UPDATE reflection_comparisons SET left_json=?,right_json=?,common_text=?,differences_text=?,timezone=?,insight_id=?,version=version+1,updated_at=? WHERE id=? AND person_id=? AND version=?')
      .run(JSON.stringify(input.left),JSON.stringify(input.right),input.common,input.differences,input.timeZone,saved.insight.id,now,input.id,context.personId,version);
   else db.prepare('INSERT INTO reflection_comparisons (id,person_id,left_json,right_json,common_text,differences_text,timezone,insight_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
      .run(input.id,context.personId,JSON.stringify(input.left),JSON.stringify(input.right),input.common,input.differences,input.timeZone,saved.insight.id,now,now);
   return getComparison(context,input.id);
  });
 }
 return {getSavedRecord:(context:RequestContext,id:string)=>info.getOwnRecord(context,id),getQuestion,listQuestions,updateQuestion,questionFromRun,prepareAdoption,adopt,getComparison,saveComparison};
}
