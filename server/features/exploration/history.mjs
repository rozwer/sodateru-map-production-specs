import {assertInput,fail} from './errors.mjs';
const key=(c,id)=>JSON.stringify([c.personId,c.dataMode,id]);
export class ConsultHistoryService {
 constructor(dialogue,getConversation){this.dialogue=dialogue;this.getConversation=getConversation;this.links=new Map();}
 async conversation(c,id){
  assertInput(typeof id==='string'&&id.trim()&&id.length<=80,'会話IDが必要です');
  const conversation=await this.getConversation(c,id);
  if(!conversation||conversation.id!==id||conversation.purpose!=='consult')fail('NOT_FOUND','相談会話がありません');
  if(c.signal?.aborted)fail('CANCELLED','処理を取り消しました');
  return conversation;
 }
 async link(c,resultId,input){
  await this.conversation(c,input?.conversationId);
  const result=await this.dialogue.get(c,resultId);
  this.links.set(key(c,input.conversationId),{resultId,expiresAt:result.expiresAt});
  return {conversationId:input.conversationId,resultId,result,expiresAt:result.expiresAt,resumeAction:'continue'};
 }
 async resume(c,conversationId){
  await this.conversation(c,conversationId);
  const link=this.links.get(key(c,conversationId));
  if(link){
   try{
    const result=await this.dialogue.get(c,link.resultId);
    return {conversationId,resultId:result.resultId,result,expiresAt:result.expiresAt,resumeAction:'continue'};
   }catch(e){if(e.code!=='RESULT_EXPIRED')throw e;this.links.delete(key(c,conversationId));}
  }
  return {conversationId,resultId:null,result:null,expiresAt:null,resumeAction:'search'};
 }
}
