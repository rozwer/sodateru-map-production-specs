import type { DatabaseSync } from 'node:sqlite';
import type { AiContext, Materials, RunRequest, Run, SourceRef } from './types.ts';
import { aiError, asRunError } from './errors.ts';
import { canonicalHash, commonInstruction, dependencies, getTask, normalizeRequest, validateRefs } from './registry.ts';
import { conversationRow, messageRow, runDto, transaction } from './storage.ts';
const controllers=new WeakMap<DatabaseSync,Map<string,{attempt:number;controller:AbortController}>>();
function active(db:DatabaseSync){let map=controllers.get(db);if(!map){map=new Map();controllers.set(db,map);}return map;}
function validateRequest(req:RunRequest){
 if(!req||typeof req!=='object'||Object.keys(req).some(k=>!['conversationId','userMessageId','assistantMessageId','text','task','input','expectedRefs'].includes(k)))throw aiError('INVALID_INPUT','実行入力が不正です');
 for(const k of ['conversationId','userMessageId','assistantMessageId'] as const)if(typeof req[k]!=='string'||!req[k].trim()||req[k].length>80)throw aiError('INVALID_INPUT','IDが不正です');
 if(req.userMessageId===req.assistantMessageId||typeof req.text!=='string'||!req.text.trim()||req.text.length>20000||typeof req.task!=='string')throw aiError('INVALID_INPUT','実行入力が不正です');
 validateRefs(req.expectedRefs);if(!getTask(req.task).input(req.input))throw aiError('INVALID_INPUT','用途の入力形式が不正です');
}
async function materialsFor(db:DatabaseSync,ctx:AiContext,req:RunRequest):Promise<Materials>{
 await dependencies.assertSourceRefs(db,ctx,req.expectedRefs);
 const materials=await getTask(req.task).definition.readMaterials(db,ctx,req.input,req);
 validateRefs(materials.sourceRefs);await dependencies.assertSourceRefs(db,ctx,materials.sourceRefs);
 const refs=new Set(materials.sourceRefs.map(r=>canonicalHash(r)));
 const evidenceIds=new Set<string>();
 for(const e of materials.evidence){if(!e.id||evidenceIds.has(e.id)||typeof e.text!=='string'||e.sourceRef&&!refs.has(canonicalHash(e.sourceRef)))throw aiError('INVALID_INPUT','引用と根拠の対応が不正です');evidenceIds.add(e.id);}
 if(Buffer.byteLength(JSON.stringify({request:req.text,context:materials.context,evidence:materials.evidence}))>128*1024)throw aiError('INPUT_TOO_LARGE','AI材料が128KiBを超えました');
 return materials;
}
function findExisting(db:DatabaseSync,ctx:AiContext,req:RunRequest,hash:string):Run|undefined {
 const row=db.prepare('SELECT * FROM messages WHERE id=?').get(req.assistantMessageId) as any;
 if(!row)return;
 messageRow(db,ctx,req.assistantMessageId);
 if(row.role!=='assistant'||row.request_hash!==hash)throw aiError('REQUEST_CONFLICT','同じ応答IDに異なる入力です');
 return runDto(row);
}
export async function startRun(db:DatabaseSync,ctx:AiContext,raw:RunRequest):Promise<Run>{
 validateRequest(raw);const req=normalizeRequest(raw),hash=canonicalHash(req);conversationRow(db,ctx,req.conversationId);
 const existing=findExisting(db,ctx,req,hash);if(existing)return getRun(db,ctx,existing.id);
 const registered=getTask(req.task),model=dependencies.model(req.task);
 if(!model)throw aiError('PROVIDER_UNAVAILABLE','AIモデルが未設定です',true);
 const materials=await materialsFor(db,ctx,req);
 const outcome=transaction(db,()=>{
  conversationRow(db,ctx,req.conversationId);
  const duplicate=findExisting(db,ctx,req,hash);if(duplicate)return {run:duplicate,created:false};
  if(db.prepare('SELECT id FROM messages WHERE id=?').get(req.userMessageId))throw aiError('REQUEST_CONFLICT','本人の発言IDが使用済みです');
  if(db.prepare("SELECT id FROM messages WHERE conversation_id=? AND status IN ('pending','running') AND role='assistant'").get(req.conversationId))throw aiError('BUSY','同じ会話でAI処理中です',true);
  const now=Date.now(),position=Number((db.prepare('SELECT COALESCE(MAX(position),0) AS n FROM messages WHERE conversation_id=?').get(req.conversationId) as any).n);
  const stored={...req,sourceRefs:materials.sourceRefs,model,promptVersion:registered.definition.promptVersion};
  const sql='INSERT INTO messages(id,conversation_id,position,role,body,status,attempt,model,error_code,insight_id,source_refs_json,version,created_at,updated_at,task,request_hash,request_json,result_json,applied_refs_json) VALUES(?,?,?,?,?,?,1,?,NULL,NULL,?,1,?,?,?,?,?,NULL,\'[]\')';
  const insert=db.prepare(sql);
  insert.run(req.userMessageId,req.conversationId,position+1,'user',req.text,'complete',null,'[]',now,now,null,null,null);
  insert.run(req.assistantMessageId,req.conversationId,position+2,'assistant','','pending',model,JSON.stringify(materials.sourceRefs),now,now,req.task,hash,JSON.stringify(stored));
  db.prepare('UPDATE conversations SET version=version+1,updated_at=? WHERE id=?').run(now,req.conversationId);
  return {run:runDto(messageRow(db,ctx,req.assistantMessageId)),created:true};
 });
 if(outcome.created)setImmediate(()=>void execute(db,ctx,req,outcome.run.attempt,materials));return outcome.run;
}
export async function getRun(db:DatabaseSync,ctx:AiContext,id:string):Promise<Run>{
 const run=runDto(messageRow(db,ctx,id));
 await dependencies.assertSourceRefs(db,ctx,run.sourceRefs);return run;
}
function expectations(row:any,input:{expectedVersion:number;expectedAttempt:number}){
 if(!Number.isSafeInteger(input?.expectedVersion)||!Number.isSafeInteger(input?.expectedAttempt)||input.expectedVersion<1||input.expectedAttempt<1)throw aiError('INVALID_INPUT','版または試行番号が不正です');
 if(row.version!==input.expectedVersion||row.attempt!==input.expectedAttempt)throw aiError('REQUEST_CONFLICT','状態が更新されています');
}
export async function cancelRun(db:DatabaseSync,ctx:AiContext,id:string,input:{expectedVersion:number;expectedAttempt:number}):Promise<Run>{
 const run=transaction(db,()=>{const row=messageRow(db,ctx,id);expectations(row,input);
  if(row.role!=='assistant'||!['pending','running'].includes(row.status))throw aiError('REQUEST_CONFLICT','実行中の応答だけを取り消せます');
  db.prepare("UPDATE messages SET status='cancelled',version=version+1,updated_at=? WHERE id=? AND version=? AND attempt=?").run(Date.now(),id,input.expectedVersion,input.expectedAttempt);
  return runDto(messageRow(db,ctx,id));});
 const current=active(db).get(id);if(current?.attempt===input.expectedAttempt)current.controller.abort();return run;
}
export async function retryRun(db:DatabaseSync,ctx:AiContext,id:string,input:{expectedVersion:number;expectedAttempt:number}):Promise<Run>{
 const row=messageRow(db,ctx,id);expectations(row,input);if(row.role!=='assistant'||!['failed','cancelled'].includes(row.status))throw aiError('REQUEST_CONFLICT','失敗または取消だけを再試行できます');
 const stored=JSON.parse(row.request_json),definition=getTask(row.task).definition;
 if(stored.promptVersion!==definition.promptVersion)throw aiError('PROVIDER_UNAVAILABLE','元の依頼文の版を利用できません。新しい発言で送信してください');
 const req:RunRequest={conversationId:row.conversation_id,userMessageId:stored.userMessageId,assistantMessageId:id,text:stored.text,task:row.task,input:stored.input,expectedRefs:stored.sourceRefs};
 const materials=await materialsFor(db,ctx,req);
 if(canonicalHash([...materials.sourceRefs].sort(refOrder))!==canonicalHash([...stored.sourceRefs].sort(refOrder)))throw aiError('SOURCE_CHANGED','AI材料の参照が変わりました');
 const run=transaction(db,()=>{
  const current=messageRow(db,ctx,id);expectations(current,input);
  if(!['failed','cancelled'].includes(current.status))throw aiError('REQUEST_CONFLICT','再試行できない状態です');
  if(db.prepare("SELECT id FROM messages WHERE conversation_id=? AND role='assistant' AND status IN ('pending','running')").get(row.conversation_id))throw aiError('BUSY','同じ会話でAI処理中です',true);
  delete stored.error;
  db.prepare("UPDATE messages SET status='pending',attempt=attempt+1,version=version+1,updated_at=?,result_json=NULL,error_code=NULL,request_json=? WHERE id=? AND version=? AND attempt=?").run(Date.now(),JSON.stringify(stored),id,input.expectedVersion,input.expectedAttempt);
  return runDto(messageRow(db,ctx,id));
 });
 setImmediate(()=>void execute(db,ctx,req,run.attempt,materials));return run;
}
function refOrder(a:SourceRef,b:SourceRef){return (a.type+':'+a.id).localeCompare(b.type+':'+b.id);}
async function execute(db:DatabaseSync,ctx:AiContext,req:RunRequest,attempt:number,materials:Materials){
 let timer:ReturnType<typeof setTimeout>|undefined;
 const control=new AbortController();let timedOut=false;
 try {
  const row=messageRow(db,ctx,req.assistantMessageId);
  if(row.status!=='pending'||row.attempt!==attempt)return;
  const changed=db.prepare("UPDATE messages SET status='running',version=version+1,updated_at=? WHERE id=? AND attempt=? AND status='pending' AND version=?").run(Date.now(),row.id,attempt,row.version);
  if(!changed.changes)return;
  active(db).set(row.id,{attempt,controller:control});
  const {definition,output}=getTask(req.task),stored=JSON.parse(row.request_json);
  const duration=Math.min(definition.timeoutMs??180000,180000),deadline=Date.now()+duration;
  timer=setTimeout(()=>{timedOut=true;control.abort();},duration);
  await dependencies.assertSourceRefs(db,ctx,materials.sourceRefs);
  const scope={...definition.permissionScope};
  if(materials.sourceRefs.some(r=>r.type==='record'))scope.records=true;
  if(materials.sourceRefs.some(r=>['place','visit','route'].includes(r.type)))scope.location=true;
  await dependencies.assertAllowed(db,ctx,scope);
  if(control.signal.aborted)throw aiError('TIMEOUT','AI実行の期限を超えました',true);
  const payload={request:req.text,context:materials.context,evidence:materials.evidence};
  const prompt=commonInstruction+'\n'+definition.buildPrompt(materials,req)+'\nsource_payload:\n'+JSON.stringify(payload);
  const result=await dependencies.provider({prompt,schema:definition.outputSchema,model:stored.model,signal:control.signal,deadline,task:req.task});
  if(control.signal.aborted)throw aiError(timedOut?'TIMEOUT':'CANCELLED',timedOut?'AI実行の期限を超えました':'AI実行を取り消しました',true);
  if(Buffer.byteLength(JSON.stringify(result)??'')>256*1024||!output(result))throw aiError('OUTPUT_INVALID','AI応答の形式が不正です',true);
  try{definition.validateResult(result,materials,req);}catch(e){throw aiError('OUTPUT_INVALID','AI応答が用途の意味条件を満たしません',true);}
  await dependencies.assertSourceRefs(db,ctx,materials.sourceRefs);
  const body=definition.toBody(result);
  transaction(db,()=>{
   const current=db.prepare('SELECT * FROM messages WHERE id=?').get(row.id) as any;
   if(!current||current.attempt!==attempt||current.status!=='running')return;
   const saved=definition.persistResult?.(db,ctx,result,materials,{...req,model:stored.model,promptVersion:stored.promptVersion});
   db.prepare("UPDATE messages SET status='complete',body=?,result_json=?,error_code=NULL,insight_id=?,version=version+1,updated_at=? WHERE id=? AND attempt=? AND status='running'").run(body,JSON.stringify(result),saved?.insightId??null,Date.now(),row.id,attempt);
  });
 }catch(error){
  try{
   const row=db.prepare('SELECT * FROM messages WHERE id=?').get(req.assistantMessageId) as any;
   if(row?.attempt===attempt&&row.status==='running'){
    const stored=JSON.parse(row.request_json);stored.error=asRunError(timedOut?aiError('TIMEOUT','AI実行の期限を超えました',true):error);
    db.prepare("UPDATE messages SET status='failed',result_json=NULL,error_code=?,request_json=?,version=version+1,updated_at=? WHERE id=? AND attempt=? AND status='running'").run(stored.error.code,JSON.stringify(stored),Date.now(),row.id,attempt);
   }
  }catch{/* A closed process/DB is recovered on the next startup; never surface source payloads in logs. */}
 }finally{if(timer)clearTimeout(timer);if(active(db).get(req.assistantMessageId)?.attempt===attempt)active(db).delete(req.assistantMessageId);}
}
export function recoverInterruptedRuns(db:DatabaseSync){
 for(const current of active(db).values())current.controller.abort();active(db).clear();
 return transaction(db,()=>{
  const rows=db.prepare("SELECT id,request_json FROM messages WHERE role='assistant' AND status IN ('pending','running')").all() as any[];
  for(const row of rows){const stored=JSON.parse(row.request_json);stored.error={code:'INTERRUPTED',message:'サーバー再起動で中断しました。再試行してください',retryable:true};
   db.prepare("UPDATE messages SET status='failed',error_code='INTERRUPTED',result_json=NULL,request_json=?,version=version+1,updated_at=? WHERE id=?").run(JSON.stringify(stored),Date.now(),row.id);}
  return rows.length;
 });
}
export function deleteConversation(db:DatabaseSync,ctx:AiContext,id:string,expectedVersion:number){
 const ids=transaction(db,()=>{const row=conversationRow(db,ctx,id);if(row.version!==expectedVersion)throw aiError('VERSION_CONFLICT','会話の版が変わりました',false,412);
  const ids=db.prepare('SELECT id FROM messages WHERE conversation_id=?').all(id).map(r=>String(r.id));
  db.prepare('DELETE FROM messages WHERE conversation_id=?').run(id);db.prepare('DELETE FROM conversations WHERE id=? AND version=?').run(id,expectedVersion);return ids;});
 for(const messageId of ids){active(db).get(messageId)?.controller.abort();active(db).delete(messageId);}
}
