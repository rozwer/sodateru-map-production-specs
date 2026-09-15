import {createHash} from 'node:crypto';
import { fail, assertInput } from './errors.mjs';
const id = v => typeof v==='string'&&v.trim().length>0&&v.length<=80;
const reactions=new Set(['known','interested','saved','blocked','dismissed']);
function cardDto(r) {return {id:r.id,personId:r.person_id,anchor:JSON.parse(r.anchor_json),bridge:r.bridge,knowledge:r.knowledge,observationPrompt:r.observation_prompt,conceptIds:JSON.parse(r.concept_ids_json),sources:JSON.parse(r.sources_json),sourceRefs:JSON.parse(r.source_refs_json),version:r.version,createdAt:r.created_at,updatedAt:r.updated_at};}
function reactionDto(r) {return {id:r.id,personId:r.person_id,cardId:r.card_id,reaction:r.reaction,createdAt:r.created_at};}
function checkActive(c) {if(c.signal?.aborted)fail('CANCELLED','処理を取り消しました');}
const queryHash=(c,kind)=>createHash('sha256').update(JSON.stringify([c.personId,c.dataMode,kind,'createdAt-desc-id-asc'])).digest('hex');
function pageInput(c,input,kind) {
 const limit=input.limit===undefined?50:Number(input.limit);assertInput(Number.isInteger(limit)&&limit>=1&&limit<=100,'取得件数は1〜100です');
 if(!input.cursor)return {limit,after:null};
 let p;try{p=JSON.parse(Buffer.from(input.cursor,'base64url').toString('utf8'));}catch{fail('INVALID_INPUT','cursorが不正です');}
 assertInput(p&&p.queryHash===queryHash(c,kind)&&p.unknown===false&&Number.isSafeInteger(p.time)&&id(p.id),'cursorの対象が一致しません');
 return {limit,after:{at:p.time,id:p.id}};
}
function page(c,rows,limit,kind,convert) {
 const more=rows.length>limit;const items=rows.slice(0,limit).map(convert);const last=items.at(-1);
 return {items,nextCursor:more?Buffer.from(JSON.stringify({queryHash:queryHash(c,kind),time:last.createdAt,id:last.id,unknown:false})).toString('base64url'):null};
}
export class DiscoveryRepository {
 constructor(db,dataMode) {this.db=db;this.dataMode=dataMode;}
 owner(c) {if(c.dataMode!==this.dataMode)fail('NOT_FOUND','対象がありません');checkActive(c);return c.personId;}
 transaction(work) {
  this.db.exec('SAVEPOINT exploration_write');
  try{const result=work();this.db.exec('RELEASE exploration_write');return result;}
  catch(e){this.db.exec('ROLLBACK TO exploration_write; RELEASE exploration_write');throw e;}
 }
 get(c,cardId) {
  const row=this.db.prepare('SELECT * FROM discovery_cards WHERE id=? AND person_id=?').get(cardId,this.owner(c));
  if(!row)fail('NOT_FOUND','発見カードがありません');return cardDto(row);
 }
 receipt(c,input) {
  const r=this.db.prepare('SELECT * FROM exploration_discovery_adoptions WHERE person_id=? AND card_id=?').get(this.owner(c),input.id);
  if(!r)return null;
  if(r.assistant_message_id!==input.assistantMessageId||r.attempt!==input.expectedAttempt)fail('REQUEST_CONFLICT','同じIDが別の採用に使われています');
  return this.get(c,input.id);
 }
 insert(c,input,run,now) {
  if(this.db.prepare('SELECT id FROM discovery_cards WHERE id=?').get(input.id))fail('REQUEST_CONFLICT','カードIDが使用済みです');
  const r=run.result,owner=this.owner(c);
  this.db.prepare('INSERT INTO discovery_cards(id,person_id,anchor_json,bridge,knowledge,observation_prompt,concept_ids_json,sources_json,source_refs_json,version,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,1,?,?)').run(input.id,owner,JSON.stringify(r.anchor),r.bridge,r.knowledge,r.observationPrompt,JSON.stringify(r.conceptIds),JSON.stringify(r.sources),JSON.stringify(run.sourceRefs),now,now);
  this.db.prepare('INSERT INTO exploration_discovery_adoptions VALUES(?,?,?,?,?)').run(owner,input.id,input.assistantMessageId,input.expectedAttempt,now);
  return this.get(c,input.id);
 }
 list(c,input) {
  const owner=this.owner(c),{limit,after}=pageInput(c,input,'cards');
  const rows=this.db.prepare(`SELECT c.* FROM discovery_cards c WHERE c.person_id=? AND
   (SELECT r.reaction FROM discovery_reactions r WHERE r.card_id=c.id AND r.person_id=c.person_id AND r.reaction IN ('saved','blocked','dismissed') ORDER BY r.created_at DESC,r.id DESC LIMIT 1)='saved'
   AND (? IS NULL OR c.created_at<? OR (c.created_at=? AND c.id>?))
   ORDER BY c.created_at DESC,c.id ASC LIMIT ?`).all(owner,after?.at??null,after?.at??null,after?.at??null,after?.id??null,limit+1);
  return page(c,rows,limit,'cards',cardDto);
 }
 react(c,cardId,input,now) {
  this.get(c,cardId);
  const prior=this.db.prepare('SELECT * FROM discovery_reactions WHERE id=?').get(input.id);
  if(prior){
   if(prior.person_id!==this.owner(c)||prior.card_id!==cardId||prior.reaction!==input.reaction)fail('REQUEST_CONFLICT','反応IDが別の操作に使われています');
   return reactionDto(prior);
  }
  this.db.prepare('INSERT INTO discovery_reactions VALUES(?,?,?,?,?)').run(input.id,this.owner(c),cardId,input.reaction,now);
  return this.reaction(c,cardId,input.id);
 }
 reaction(c,cardId,reactionId) {
  this.get(c,cardId);
  const row=this.db.prepare('SELECT * FROM discovery_reactions WHERE id=? AND card_id=? AND person_id=?').get(reactionId,cardId,this.owner(c));
  if(!row)fail('NOT_FOUND','反応がありません');return reactionDto(row);
 }
 reactions(c,cardId,input) {
  this.get(c,cardId);const kind='reactions:'+cardId,{limit,after}=pageInput(c,input,kind);
  const rows=this.db.prepare('SELECT * FROM discovery_reactions WHERE card_id=? AND person_id=? AND (? IS NULL OR created_at<? OR (created_at=? AND id>?)) ORDER BY created_at DESC,id ASC LIMIT ?').all(cardId,this.owner(c),after?.at??null,after?.at??null,after?.at??null,after?.id??null,limit+1);
  return page(c,rows,limit,kind,reactionDto);
 }
 remove(c,cardId,expectedVersion) {
  const card=this.get(c,cardId);
  if(card.version!==expectedVersion)fail('VERSION_CONFLICT','カードの版が変わりました');
  const change=this.db.prepare('DELETE FROM discovery_cards WHERE id=? AND person_id=? AND version=?').run(cardId,this.owner(c),expectedVersion);
  if(change.changes!==1)fail('VERSION_CONFLICT','カードの版が変わりました');
  return {id:cardId,deleted:true};
 }
}
function validateResult(result) {
 assertInput(result&&result.anchor&&['place','building','photo'].includes(result.anchor.kind)&&id(result.anchor.targetId),'発見の対象が不正です');
 assertInput(Array.isArray(result.anchor.features)&&result.anchor.features.length>=1&&result.anchor.features.length<=10&&result.anchor.features.every(x=>typeof x==='string'&&x.trim()&&x.length<=300),'観察した特徴が不正です');
 for(const [k,max]of [['bridge',1500],['knowledge',2500],['observationPrompt',1000]])assertInput(typeof result[k]==='string'&&result[k].length<=max,'発見の説明が不正です');
 assertInput(Array.isArray(result.conceptIds)&&result.conceptIds.length<=100&&result.conceptIds.every(id)&&new Set(result.conceptIds).size===result.conceptIds.length,'概念IDが不正です');
 assertInput(Array.isArray(result.sources)&&result.sources.length<=50,'出典が不正です');
 for(const s of result.sources) {
  assertInput(s&&typeof s.title==='string'&&s.title.trim()&&s.title.length<=300&&['general','place-specific'].includes(s.claimScope)&&(s.sourceId===null||id(s.sourceId)),'出典の組が不正です');
  if(s.url!==null){let u;try{u=new URL(s.url);}catch{fail('OUTPUT_INVALID','出典URLが不正です');}assertInput(['http:','https:'].includes(u.protocol)&&s.url.length<=2048,'出典URLが不正です');}
 }
}
export class DiscoveryService {
 constructor(repository,dependencies) {this.repository=repository;this.dependencies=dependencies;}
 async sources(c,card) {
  checkActive(c);
  const checks=await this.dependencies.checkSources(c,{refs:card.sourceRefs});
  const list=Array.isArray(checks)?checks:checks.items;
  if(!Array.isArray(list)||list.length!==card.sourceRefs.length)fail('OUTPUT_INVALID','根拠の照合結果が不足しています');
  if(list.some(s=>s.state==='unavailable'))fail('NOT_FOUND','参照元を閲覧できません');
  if(list.some(s=>s.state==='changed'))fail('SOURCE_CHANGED','参照元が変わりました。再取得してください');
  if(list.some(s=>s.state!=='current'))fail('OUTPUT_INVALID','根拠の照合状態が不正です');
  checkActive(c);return card;
 }
 async create(c,input) {
  assertInput(id(input?.id)&&id(input?.assistantMessageId)&&Number.isSafeInteger(input?.expectedAttempt)&&input.expectedAttempt>=1,'採用入力が不正です');
  const previous=this.repository.receipt(c,input);
  if(previous)return this.sources(c,previous);
  const run=await this.dependencies.getRun(c,input.assistantMessageId);checkActive(c);
  if(run.task!=='discover'||run.status!=='complete'||!run.result)fail('NOT_READY','完成した発見だけを保存できます');
  if(run.id!==input.assistantMessageId||run.attempt!==input.expectedAttempt)fail('STATE_CONFLICT','生成の試行が変わりました');
  validateResult(run.result);
  await this.sources(c,{sourceRefs:run.sourceRefs});
  return this.repository.transaction(()=>{
   checkActive(c);
   const raced=this.repository.receipt(c,input);if(raced)return raced;
   const guard=this.dependencies.assertAdoptable(c,run);
   if(guard&&typeof guard.then==='function')fail('INTERNAL_ERROR','採用照合は同期処理が必要です');
   const card=this.repository.insert(c,input,run,this.dependencies.now?.()??Date.now());
   const applied=this.dependencies.recordAdoption(c,run,card);
   if(applied&&typeof applied.then==='function')fail('INTERNAL_ERROR','採用記録は同期処理が必要です');
   return card;
  });
 }
 async get(c,cardId) {return this.sources(c,this.repository.get(c,cardId));}
 async list(c,input={}) {const result=this.repository.list(c,input);for(const card of result.items)await this.sources(c,card);return result;}
 async react(c,cardId,input) {
  assertInput(id(input?.id)&&reactions.has(input?.reaction),'反応が不正です');
  await this.get(c,cardId);checkActive(c);
  return this.repository.transaction(()=>this.repository.react(c,cardId,input,this.dependencies.now?.()??Date.now()));
 }
 async reactions(c,cardId,input={}) {await this.get(c,cardId);return this.repository.reactions(c,cardId,input);}
 async reaction(c,cardId,reactionId) {await this.get(c,cardId);return this.repository.reaction(c,cardId,reactionId);}
 async remove(c,cardId,expectedVersion) {
  assertInput(Number.isSafeInteger(expectedVersion)&&expectedVersion>=1,'削除する版が必要です');
  return this.repository.transaction(()=>this.repository.remove(c,cardId,expectedVersion));
 }
}
