import type { DatabaseSync } from 'node:sqlite';
import type { AiContext, AppliedRef, Run } from './types.ts';
import { aiError } from './errors.ts';
import { canonicalHash, dependencies } from './registry.ts';
import { transaction } from '../db/migrate.ts';
export { transaction } from '../db/migrate.ts';
export function conversationRow(db:DatabaseSync,ctx:AiContext,id:string):any {
 const row=db.prepare('SELECT * FROM conversations WHERE id=? AND person_id=?').get(id,ctx.personId);
 if(!row)throw aiError('NOT_FOUND','会話が見つかりません');return row;
}
export function messageRow(db:DatabaseSync,ctx:AiContext,id:string):any {
 const row=db.prepare('SELECT m.* FROM messages m JOIN conversations c ON c.id=m.conversation_id WHERE m.id=? AND c.person_id=?').get(id,ctx.personId);
 if(!row)throw aiError('NOT_FOUND','発言が見つかりません');return row;
}
export function conversationDto(r:any){return {id:r.id,personId:r.person_id,purpose:r.purpose,title:r.title,recordId:r.record_id,version:r.version,createdAt:r.created_at,updatedAt:r.updated_at};}
export function messageDto(r:any){return {id:r.id,conversationId:r.conversation_id,position:r.position,role:r.role,body:r.body,status:r.status,attempt:r.attempt,model:r.model,insightId:r.insight_id,sourceRefs:JSON.parse(r.source_refs_json),version:r.version,createdAt:r.created_at,updatedAt:r.updated_at};}
export function runDto(r:any):Run {
 if(r.role!=='assistant')throw aiError('INVALID_INPUT','本人の発言にRunはありません');
 const req=JSON.parse(r.request_json);
 return {id:r.id,conversationId:r.conversation_id,userMessageId:req.userMessageId,task:r.task,status:r.status,attempt:r.attempt,version:r.version,model:r.model,promptVersion:req.promptVersion,result:r.result_json?JSON.parse(r.result_json):null,error:r.status==='failed'?(req.error??{code:r.error_code,message:'AI処理に失敗しました',retryable:true}):null,sourceRefs:JSON.parse(r.source_refs_json),insightId:r.insight_id,createdAt:r.created_at,updatedAt:r.updated_at};
}
export function createConversation(db:DatabaseSync,ctx:AiContext,input:{id:string;purpose:string;title:string;recordId:string|null}) {
 if(!input||typeof input.id!=='string'||!input.id.trim()||Array.from(input.id).length>80||!['consult','reflection','analysis','comparison'].includes(input.purpose)||typeof input.title!=='string'||!input.title.trim()||Array.from(input.title).length>200||!(input.recordId===null||typeof input.recordId==='string'))throw aiError('INVALID_INPUT','会話入力が不正です');
 return transaction(db,()=>{
  const found=db.prepare('SELECT * FROM conversations WHERE id=?').get(input.id) as any;
  if(found){if(found.person_id!==ctx.personId)throw aiError('NOT_FOUND','会話が見つかりません');if(found.purpose!==input.purpose||found.title!==input.title||found.record_id!==input.recordId)throw aiError('REQUEST_CONFLICT','同じ会話IDに異なる入力です');return conversationDto(found);}
  if(input.recordId!==null)dependencies.assertConversationRecord(db,ctx,input.recordId);
  const now=Date.now();db.prepare('INSERT INTO conversations(id,person_id,purpose,title,record_id,version,created_at,updated_at) VALUES(?,?,?,?,?,1,?,?)').run(input.id,ctx.personId,input.purpose,input.title,input.recordId,now,now);return conversationDto(conversationRow(db,ctx,input.id));
 });
}
export function getConversation(db:DatabaseSync,ctx:AiContext,id:string){return conversationDto(conversationRow(db,ctx,id));}
function limitValue(limit?:number){const n=limit??50;if(!Number.isInteger(n)||n<1||n>100)throw aiError('INVALID_INPUT','limitが不正です');return n;}
function decode(cursor:string):any {try {return JSON.parse(Buffer.from(cursor,'base64url').toString());}catch{throw aiError('INVALID_INPUT','cursorが不正です');}}
const encode=(value:any)=>Buffer.from(JSON.stringify(value)).toString('base64url');
export async function listConversations(db:DatabaseSync,ctx:AiContext,query:{purpose?:string;q?:string;dateFrom?:number;dateTo?:number;cursor?:string;limit?:number}={}) {
 const n=limitValue(query.limit),q=query.q?.normalize('NFKC').toLowerCase()??'';
 const binding=canonicalHash({personId:ctx.personId,dataMode:ctx.dataMode,purpose:query.purpose??null,q,dateFrom:query.dateFrom??null,dateTo:query.dateTo??null});
 let rows=db.prepare('SELECT * FROM conversations WHERE person_id=? ORDER BY updated_at DESC,id DESC').all(ctx.personId) as any[];
 const filtered=[];
 for(const r of rows){
  if(query.purpose&&r.purpose!==query.purpose||query.dateFrom!==undefined&&r.updated_at<query.dateFrom||query.dateTo!==undefined&&r.updated_at>=query.dateTo)continue;
  if(q&&!r.title.normalize('NFKC').toLowerCase().includes(q)){
   let match=false;for(const m of db.prepare('SELECT * FROM messages WHERE conversation_id=?').all(r.id) as any[]){try{await dependencies.assertSourceRefs(db,ctx,JSON.parse(m.source_refs_json));if(m.body.normalize('NFKC').toLowerCase().includes(q)){match=true;break;}}catch(e){if(!['NOT_FOUND','SOURCE_CHANGED'].includes((e as any).code))throw e;}}if(!match)continue;
  }filtered.push(r);
 }
 rows=filtered;
 if(query.cursor){const c=decode(query.cursor);if(c.binding!==binding)throw aiError('INVALID_INPUT','cursorの条件が違います');rows=rows.filter(r=>r.updated_at<c.updatedAt||r.updated_at===c.updatedAt&&r.id<c.id);}
 const page=rows.slice(0,n),last=page.at(-1);return {items:page.map(conversationDto),nextCursor:rows.length>n?encode({binding,updatedAt:last.updated_at,id:last.id}):null};
}
export async function listMessages(db:DatabaseSync,ctx:AiContext,id:string,query:{cursor?:string;limit?:number}={}) {
 conversationRow(db,ctx,id);const n=limitValue(query.limit);let position=0;
 if(query.cursor){const c=decode(query.cursor);if(c.conversationId!==id||!Number.isSafeInteger(c.position))throw aiError('INVALID_INPUT','cursorが不正です');position=c.position;}
 const rows=db.prepare('SELECT * FROM messages WHERE conversation_id=? AND position>? ORDER BY position,id LIMIT ?').all(id,position,n+1) as any[];
 const page=rows.slice(0,n);
 for(const r of page)await dependencies.assertSourceRefs(db,ctx,JSON.parse(r.source_refs_json));
 return {items:page.map(messageDto),nextCursor:rows.length>n?encode({conversationId:id,position:page.at(-1).position,id:page.at(-1).id}):null};
}
export function patchConversation(db:DatabaseSync,ctx:AiContext,id:string,title:string,version:number) {
 if(typeof title!=='string'||!title.trim()||Array.from(title).length>200)throw aiError('INVALID_INPUT','題名が不正です');
 return transaction(db,()=>{const r=conversationRow(db,ctx,id);if(r.version!==version)throw aiError('VERSION_CONFLICT','会話の版が変わりました',false,412);
 db.prepare('UPDATE conversations SET title=?,version=version+1,updated_at=? WHERE id=? AND version=?').run(title,Date.now(),id,version);return getConversation(db,ctx,id);});
}
export function readAppliedRefs(db:DatabaseSync,ctx:AiContext,id:string):AppliedRef[]{return JSON.parse(messageRow(db,ctx,id).applied_refs_json);}
export function appendAppliedRef(db:DatabaseSync,ctx:AiContext,id:string,ref:AppliedRef):AppliedRef[]{
 const row=messageRow(db,ctx,id);if(row.role!=='assistant'||row.status!=='complete')throw aiError('REQUEST_CONFLICT','完了結果だけを採用できます');
 if(!ref||!['record','theme','insight','discovery','map-settings','transfer-plan-set','pilgrimage-plan'].includes(ref.type)||typeof ref.id!=='string'||!ref.id.trim()||Array.from(ref.id).length>80||!Number.isSafeInteger(ref.version)||ref.version<1||!/^[a-f0-9]{64}$/.test(ref.contentHash))throw aiError('INVALID_INPUT','採用参照が不正です');
 const refs=JSON.parse(row.applied_refs_json) as AppliedRef[];
 if(!refs.some(r=>r.type===ref.type&&r.id===ref.id&&r.contentHash===ref.contentHash)){refs.push(ref);db.prepare('UPDATE messages SET applied_refs_json=?,version=version+1,updated_at=? WHERE id=?').run(JSON.stringify(refs),Date.now(),id);}
 return refs;
}

export function assertRunAdoptable(db:DatabaseSync,ctx:AiContext,id:string,expected:{expectedAttempt:number;expectedVersion?:number}):Run {
 const row=messageRow(db,ctx,id);if(row.role!=='assistant'||row.status!=='complete'||row.attempt!==expected.expectedAttempt||expected.expectedVersion!==undefined&&row.version!==expected.expectedVersion)throw aiError('REQUEST_CONFLICT','採用する応答の状態が変わりました');return runDto(row);
}
