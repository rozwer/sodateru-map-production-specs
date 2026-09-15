import type { Hono, Context } from 'hono';
import { createConversation, getConversation, listConversations, patchConversation, deleteConversation, listMessages, startRun, cancelRun, retryRun } from '../../ai/index.ts';
import { messageRow, messageDto, runDto } from '../../ai/storage.ts';
import { dependencies } from '../../ai/registry.ts';
import { aiError } from '../../ai/errors.ts';
type Helpers={expectedVersion:(header:string|undefined)=>number;requireVersion:(actual:number,expected:number)=>void};
const useToTask:Record<string,string>={comparison:'compare','theme-name':'theme','map-style':'mapstyle',discovery:'discover'};
const taskToUse=Object.fromEntries(Object.entries(useToTask).map(([use,task])=>[task,use]));
const httpMessage=(row:any)=>({...messageDto(row),errorCode:row.error_code});
function queryNumber(value:string|undefined){if(value===undefined)return undefined;const n=Number(value);if(!Number.isSafeInteger(n)||n<0)throw aiError('INVALID_INPUT','数値queryが不正です');return n;}
async function body(c:Context,keys:string[]){const data=await c.req.json().catch(()=>{throw aiError('INVALID_INPUT','JSON本文が不正です');});if(!data||typeof data!=='object'||Array.isArray(data)||Object.keys(data).some(k=>!keys.includes(k)))throw aiError('INVALID_INPUT','本文の項目が不正です');return data;}
export function registerConversationRoutes(api:Hono<any>,helpers:Helpers){
 api.get('/conversations',async c=>{
  const q=c.req.query();
  if(q.purpose&&!['consult','reflection','analysis','comparison'].includes(q.purpose))throw aiError('INVALID_INPUT','purposeが不正です');
  const dateFrom=queryNumber(q.dateFrom),dateTo=queryNumber(q.dateTo);if(dateFrom!==undefined&&dateTo!==undefined&&dateTo<=dateFrom)throw aiError('INVALID_INPUT','期間が不正です');
  return c.json(await listConversations(c.get('db'),c.get('context'),{purpose:q.purpose,q:q.q,dateFrom,dateTo,cursor:q.cursor,limit:queryNumber(q.limit)}));
 });
 api.post('/conversations',async c=>{
  const data=await body(c,['id','purpose','title','recordId']);return c.json({data:createConversation(c.get('db'),c.get('context'),data)},201);
 });
 api.get('/conversations/:conversationId',c=>{
  const data=getConversation(c.get('db'),c.get('context'),c.req.param('conversationId'));c.header('ETag','"'+data.version+'"');return c.json({data});
 });
 api.patch('/conversations/:conversationId',async c=>{
  const input=await body(c,['title']),version=helpers.expectedVersion(c.req.header('If-Match'));
  const data=patchConversation(c.get('db'),c.get('context'),c.req.param('conversationId'),input.title,version);c.header('ETag','"'+data.version+'"');return c.json({data});
 });
 api.delete('/conversations/:conversationId',c=>{deleteConversation(c.get('db'),c.get('context'),c.req.param('conversationId'),helpers.expectedVersion(c.req.header('If-Match')));return c.body(null,204);});
 api.get('/conversations/:conversationId/messages',async c=>c.json(await listMessages(c.get('db'),c.get('context'),c.req.param('conversationId'),{cursor:c.req.query('cursor'),limit:queryNumber(c.req.query('limit'))})));
 api.post('/conversations/:conversationId/messages',async c=>{
  const input=await body(c,['userMessageId','assistantMessageId','body','use','context','expectedRefs']);
  const db=c.get('db'),ctx=c.get('context');
  const run=await startRun(db,ctx,{conversationId:c.req.param('conversationId'),userMessageId:input.userMessageId,assistantMessageId:input.assistantMessageId,text:input.body,task:useToTask[input.use]??input.use,input:input.context,expectedRefs:input.expectedRefs});
  return c.json({data:{userMessage:httpMessage(messageRow(db,ctx,run.userMessageId)),assistantMessage:httpMessage(messageRow(db,ctx,run.id)),statusUrl:'/api/v1/messages/'+encodeURIComponent(run.id)}},202);
 });
 api.get('/messages/:messageId',async c=>{
  const db=c.get('db'),ctx=c.get('context'),row=messageRow(db,ctx,c.req.param('messageId'));
  await dependencies.assertSourceRefs(db,ctx,JSON.parse(row.source_refs_json));
  const run=row.role==='assistant'?runDto(row):null;
  c.header('ETag','"'+row.version+'"');
  return c.json({data:{message:httpMessage(row),run,output:run?.status==='complete'?{use:taskToUse[run.task]??run.task,value:run.result}:null}});
 });
 for(const action of ['cancel','retry'] as const)api.post('/messages/:messageId/'+action,async c=>{
  const input=await body(c,['attempt']),db=c.get('db'),ctx=c.get('context'),id=c.req.param('messageId'),version=helpers.expectedVersion(c.req.header('If-Match'));
  helpers.requireVersion(messageRow(db,ctx,id).version,version);
  const run=await (action==='cancel'?cancelRun:retryRun)(db,ctx,id,{expectedVersion:version,expectedAttempt:input.attempt});
  const message=httpMessage(messageRow(db,ctx,id));c.header('ETag','"'+run.version+'"');
  return action==='cancel'?c.json({data:message},200):c.json({data:{message,statusUrl:'/api/v1/messages/'+encodeURIComponent(id)}},202);
 });
}
