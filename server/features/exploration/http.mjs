import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {defineFeature} from '../../core/features.ts';
import {CommonError,expectedVersion} from '../../core/errors.ts';
import {idempotentMutation} from '../../core/idempotency.ts';
import {DialogueService} from './dialogue.mjs';
import {DiscoveryRepository,DiscoveryService} from './discovery.mjs';
import {ConsultHistoryService} from './history.mjs';
import {ExplorationError} from './errors.mjs';

const migration={id:'exploration/001-discovery',sql:readFileSync(new URL('../../db/migrations/exploration/001-discovery.sql',import.meta.url),'utf8')};
const identity=c=>({context:c.get('context'),operation:c.req.method+' '+c.req.path,key:c.req.header('Idempotency-Key'),input:c.get('input').body??null});
function boundary(handler){return async c=>{try{return await handler(c);}catch(e){
 if(e instanceof ExplorationError)throw new CommonError(e.code,e.message,Boolean(e.details?.retryable),e.details,e.code==='CANCELLED'||e.code==='NOT_READY'?409:undefined);
 throw e;
}};}
/** Dependencies are production services; the optional factory also permits bounded integration tests. */
export function createExplorationFeature(runtimeFor){
 return defineFeature({id:'exploration',migrations:[migration],register(api,services){
  const runtime=c=>runtimeFor(services.databases[c.dataMode],c.dataMode,services);
  const dialogue=new DialogueService(Object.fromEntries(['settings','decide','search','route'].map(name=>[name,(context,...args)=>runtime(context).dialogue[name](context,...args)])));
  const history=new ConsultHistoryService(dialogue,(context,id)=>runtime(context).getConversation(context,id));
  const requests=new Map();
  async function ephemeral(c,work,refresh){
   let created=false;
   const receipt=idempotentMutation(c.get('db'),identity(c),{
    execute(){created=true;return {status:200,resource:{type:'exploration-temporary-request',id:randomUUID()},expiresAt:Date.now()+900000};},
    replay:stored=>stored
   });
   const token=receipt.resource.id;
   if(created){
    const promise=Promise.resolve().then(work);
    promise.catch(()=>{});requests.set(token,promise);
    const timer=setTimeout(()=>requests.delete(token),Math.max(1,receipt.expiresAt-Date.now()));timer.unref?.();
   }
   const promise=requests.get(token);
   if(!promise)throw new CommonError('RESULT_EXPIRED','一時相談は終了しました。新しい操作で再検索してください。');
   const data=await promise;
   if(c.get('context').signal.aborted)throw new CommonError('CANCELLED','処理を取り消しました。',true,{},409);
   return c.json({data:refresh?await refresh(data):data});
  }
  function discovery(c,kind='card',cardId){
   const context=c.get('context'),db=c.get('db'),repository=new DiscoveryRepository(db,context.dataMode);
   const dependencies=runtime(context).discovery;
   return new DiscoveryService(repository,{...dependencies,commit(work){
    const result=idempotentMutation(db,identity(c),{
     execute(){const data=work();return {status:201,body:{data},resource:{type:kind==='card'?'discovery':'discovery-reaction',id:data.id}};},
     replay(stored){const data=kind==='card'?repository.get(context,stored.resource.id):repository.reaction(context,cardId,stored.resource.id);return {status:201,body:{data},resource:stored.resource};}
    });
    return result.body.data;
   }});
  }
  api.post('/map-dialogues',boundary(c=>ephemeral(c,()=>dialogue.run(c.get('context'),c.get('input').body),data=>dialogue.get(c.get('context'),data.resultId))));
  api.post('/map-dialogues/select',boundary(c=>ephemeral(c,()=>dialogue.select(c.get('context'),c.get('input').body),data=>dialogue.get(c.get('context'),data.resultId))));
  api.post('/map-dialogues/cancel',boundary(c=>{
   idempotentMutation(c.get('db'),identity(c),{execute(){dialogue.cancel(c.get('context'),c.get('input').body);return {status:204};}});
   return c.body(null,204);
  }));
  api.get('/map-dialogues/results/:resultId',boundary(async c=>c.json({data:await dialogue.get(c.get('context'),c.req.param('resultId'))})));
  api.post('/map-dialogues/results/:resultId/history',boundary(c=>ephemeral(c,()=>history.link(c.get('context'),c.req.param('resultId'),c.get('input').body),data=>history.resume(c.get('context'),data.conversationId))));
  api.get('/conversations/:conversationId/map-dialogue',boundary(async c=>c.json({data:await history.resume(c.get('context'),c.req.param('conversationId'))})));
  api.get('/discovery-facts',boundary(async c=>c.json({items:await runtime(c.get('context')).facts(c.get('context'),c.get('input').query),nextCursor:null})));
  api.post('/discovery-cards',boundary(async c=>{
   const data=await discovery(c).create(c.get('context'),c.get('input').body);c.header('ETag','"'+data.version+'"');c.header('Location','/api/v1/discovery-cards/'+encodeURIComponent(data.id));return c.json({data},201);
  }));
  api.get('/discovery-cards',boundary(async c=>c.json(await discovery(c).list(c.get('context'),c.get('input').query))));
  api.get('/discovery-cards/:cardId',boundary(async c=>{
   const data=await discovery(c).get(c.get('context'),c.req.param('cardId'));c.header('ETag','"'+data.version+'"');return c.json({data});
  }));
  api.delete('/discovery-cards/:cardId',boundary(async c=>{
   await discovery(c).remove(c.get('context'),c.req.param('cardId'),expectedVersion(c.req.header('If-Match')));return c.body(null,204);
  }));
  api.post('/discovery-cards/:cardId/reactions',boundary(async c=>{
   const data=await discovery(c,'reaction',c.req.param('cardId')).react(c.get('context'),c.req.param('cardId'),c.get('input').body);return c.json({data},201);
  }));
  api.get('/discovery-cards/:cardId/reactions',boundary(async c=>c.json(await discovery(c).reactions(c.get('context'),c.req.param('cardId'),c.get('input').query))));
  api.get('/discovery-cards/:cardId/reactions/:reactionId',boundary(async c=>c.json({data:await discovery(c).reaction(c.get('context'),c.req.param('cardId'),c.req.param('reactionId'))})));
 }});
}
