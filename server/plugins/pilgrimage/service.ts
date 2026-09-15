import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import type { RequestContext } from '../../core/context.ts';
import { CommonError, requireVersion } from '../../core/errors.ts';
import { requestHash } from '../../core/idempotency.ts';
import { transaction } from '../../db/migrate.ts';
import type { Dependencies, SearchInput, SearchResult, Selection, Preview, Plan, Relation } from './types.ts';
import { id, validateSearch, validateSelection, distanceM, inRegion } from './validation.ts';
const normal=(s:string)=>s.normalize('NFKC').toLowerCase().replaceAll('驒','騨').replace(/[\s・]/g,'');
const stateByDb=new WeakMap<DatabaseSync,Map<string,{owner:string;mode:string;value:Preview}>>();
export class PilgrimageService {
 private previews:Map<string,{owner:string;mode:string;value:Preview}>;
 constructor(private db:DatabaseSync,private deps:Dependencies) { if(!stateByDb.has(db))stateByDb.set(db,new Map());this.previews=stateByDb.get(db)!; }
 settings(context:RequestContext,enabled=false) {
  const state=this.deps.pluginState(this.db,context),setting=state.items.find((s:any)=>s.id==='pilgrimage');
  if(!setting)throw new CommonError('NOT_FOUND','聖地巡りを導入してください。');
  if(enabled&&!setting.enabled)throw new CommonError('STATE_CONFLICT','聖地巡りが停止中です。保存した計画と場所は残っています。');
  return {setting,revision:state.revision};
 }
 getSearch(context:RequestContext,searchId:string):SearchResult {
  id(searchId);const row=this.db.prepare('SELECT result_json FROM pilgrimage_searches WHERE id=? AND person_id=? AND data_mode=?').get(searchId,context.personId,context.dataMode) as any;
  if(!row)throw new CommonError('NOT_FOUND','作品検索がありません。');return JSON.parse(row.result_json);
 }
 async search(context:RequestContext,input:SearchInput):Promise<SearchResult> {
  validateSearch(input);this.settings(context,true);
  const inputHash=requestHash(input),existing=this.db.prepare('SELECT * FROM pilgrimage_searches WHERE id=?').get(input.id) as any;
  if(existing) {if(existing.person_id!==context.personId||existing.data_mode!==context.dataMode)throw new CommonError('NOT_FOUND','作品検索がありません。');if(existing.input_hash!==inputHash)throw new CommonError('REQUEST_CONFLICT','同じ検索IDに異なる条件が指定されました。');return this.getSearch(context,input.id);}
  const result:SearchResult={id:input.id,input,...await this.deps.search(input,context.signal)};
  context.signal.throwIfAborted();
  return transaction(this.db,()=>{this.settings(context,true);const duplicate=this.db.prepare('SELECT * FROM pilgrimage_searches WHERE id=?').get(input.id) as any;if(duplicate){if(duplicate.person_id!==context.personId||duplicate.data_mode!==context.dataMode||duplicate.input_hash!==inputHash)throw new CommonError('REQUEST_CONFLICT','検索IDが使用されています。');return this.getSearch(context,input.id);}this.db.prepare('INSERT INTO pilgrimage_searches VALUES(?,?,?,?,?,?)').run(input.id,context.personId,context.dataMode,inputHash,JSON.stringify(result),Date.now());return result;});
 }
 selected(context:RequestContext,selection:Selection):Relation[] {
  validateSelection(selection);const search=this.getSearch(context,selection.searchId);
  const selected=selection.orderedRelationIds.map(relationId=>{const r=search.relations.find(r=>r.id===relationId);if(!r)throw new CommonError('INVALID_INPUT','検索結果にない地点が指定されました。');if(!inRegion(r.coordinates,search.input.region))throw new CommonError('SOURCE_CHANGED','地点が対象地域外です。');if(r.verificationStatus!=='confirmed'&&!selection.acknowledgeUnverified)throw new CommonError('REQUEST_CONFLICT','未確認の関連を含みます。出典を確認し、未確認として巡ることを明示してください。');return r;});
  return selected;
 }
 private validateAi(context:RequestContext,selection:Selection) {
  if(!selection.ai)return;
  if(!this.deps.ai)throw new CommonError('PROVIDER_UNAVAILABLE','共通AIが未接続です。');
  const run=this.deps.ai.assertRunAdoptable(this.db,context,selection.ai.runId,{expectedAttempt:selection.ai.attempt});
  if(run.task!=='pilgrimage'||run.result?.searchId!==selection.searchId||requestHash(run.result?.orderedRelationIds)!==requestHash(selection.orderedRelationIds)||run.result?.settingsVersion!==selection.settingsVersion)throw new CommonError('SOURCE_CHANGED','AI案と選択順・検索・設定が一致しません。手動変更はAI採用と分けてください。');
 }
 async preview(context:RequestContext,selection:Selection):Promise<Preview> {
  const relations=this.selected(context,selection),{setting,revision}=this.settings(context,true);
  if(setting.version!==selection.settingsVersion)throw new CommonError('SOURCE_CHANGED','聖地巡りの設定が変更されています。');this.validateAi(context,selection);
  const waypoints=[];
  for(const relation of relations) {
   const result=await this.deps.places.search(context,this.db,{q:relation.name,limit:10});
   const matches=result.items.filter((p:any)=>p.retention==='storable'&&distanceM(p.coordinates,relation.coordinates)<=300&&normal(p.name).includes(normal(relation.name)));
   if(matches.length!==1)throw new CommonError('REQUEST_CONFLICT',matches.length?'施設の候補を一意に確認できません。':'保存できる施設位置を確認できません。場所を再検索してください。',false,{relationId:relation.id,reason:matches.length?'AMBIGUOUS_PLACE':'PLACE_UNRESOLVED'});
   const match=matches[0];this.deps.places.resolveCandidate(context,result.resultId,match.candidateId);
   waypoints.push({kind:'candidate',resultId:result.resultId,candidateId:match.candidateId});
  }
  const route=await this.deps.routes(this.db).previewRoute(context,{waypoints,mode:selection.mode,title:selection.title});
  context.signal.throwIfAborted();
  if(this.settings(context,true).revision!==revision)throw new CommonError('SOURCE_CHANGED','取得中に拡張機能の設定が変更されました。');
  this.validateAi(context,selection);
  const preview:Preview={id:randomUUID(),selection:structuredClone(selection),relations,route,pluginRevision:revision,expiresAt:route.expiresAt};
  for(const [key,row] of this.previews)if(row.value.expiresAt<=Date.now())this.previews.delete(key);
  this.previews.set(preview.id,{owner:context.personId,mode:context.dataMode,value:structuredClone(preview)});return preview;
 }
 getPreview(context:RequestContext,previewId:string):Preview {
  id(previewId);const row=this.previews.get(previewId);
  if(!row)throw new CommonError('RESULT_EXPIRED','計画案の期限が切れました。再取得してください。');
  if(row.owner!==context.personId||row.mode!==context.dataMode)throw new CommonError('NOT_FOUND','計画案がありません。');
  if(row.value.expiresAt<=Date.now())throw new CommonError('RESULT_EXPIRED','計画案の期限が切れました。');return structuredClone(row.value);
 }
 getPlan(context:RequestContext,planId:string):Plan {
  id(planId);const row=this.db.prepare('SELECT plan_json FROM pilgrimage_plans WHERE id=? AND person_id=? AND data_mode=?').get(planId,context.personId,context.dataMode) as any;
  if(!row)throw new CommonError('NOT_FOUND','保存した巡回計画がありません。');return JSON.parse(row.plan_json);
 }
 listPlans(context:RequestContext) { return {items:this.db.prepare('SELECT plan_json FROM pilgrimage_plans WHERE person_id=? AND data_mode=? ORDER BY updated_at DESC,id DESC').all(context.personId,context.dataMode).map((r:any)=>JSON.parse(r.plan_json) as Plan)}; }
 savePlan(context:RequestContext,planId:string,previewId:string,expected?:number):Plan {
  id(planId);id(previewId);
  return transaction(this.db,()=>{
   context.signal.throwIfAborted();
   const exists=this.db.prepare('SELECT person_id,data_mode FROM pilgrimage_plans WHERE id=?').get(planId) as any;
   let current:Plan|null=null;
   if(exists){current=this.getPlan(context,planId);if(expected===undefined)throw new CommonError('REQUEST_CONFLICT','計画IDがすでに使用されています。');requireVersion(current.version,expected);}else if(expected!==undefined)throw new CommonError('NOT_FOUND','更新対象の計画がありません。');
   const preview=this.getPreview(context,previewId),{setting,revision}=this.settings(context,true);
   if(revision!==preview.pluginRevision||setting.version!==preview.selection.settingsVersion)throw new CommonError('SOURCE_CHANGED','採用前に設定が変更されました。');
   this.selected(context,preview.selection);this.validateAi(context,preview.selection);
   const routes=this.deps.routes(this.db),routePreview=routes.revalidatePreview(context,preview.route.previewId,true);
   if(requestHash(routePreview.waypoints)!==requestHash(preview.route.waypoints))throw new CommonError('SOURCE_CHANGED','経路の地点が変更されました。');
   const version=(current?.version??0)+1,routeId=`pilgrimage-${requestHash([context.personId,context.dataMode,planId,version]).slice(0,48)}`;
   const {data:route}=routes.saveRoute(context,{id:routeId,previewId:preview.route.previewId,title:preview.selection.title});
   if(route.waypoints.length!==preview.relations.length||route.waypoints.some((w:any,i:number)=>!w.placeId||distanceM(w.coordinates,preview.relations[i]!.coordinates)>300))throw new CommonError('OUTPUT_INVALID','保存経路の地点順と計画が一致しません。');
   const now=Date.now(),search=this.getSearch(context,preview.selection.searchId);
   const plan:Plan={id:planId,personId:context.personId,dataMode:context.dataMode,title:preview.selection.title,workIds:[...new Set(preview.relations.map(r=>r.workId))],region:search.input.region,orderedRelationIds:preview.selection.orderedRelationIds,orderedPlaceIds:route.waypoints.map((w:any)=>w.placeId),routeId,route,sourceSnapshot:preview.relations,settingsSnapshot:setting.settings,settingsVersion:setting.version,ai:preview.selection.ai??null,version,createdAt:current?.createdAt??now,updatedAt:now};
   if(current){const change=this.db.prepare('UPDATE pilgrimage_plans SET plan_json=?,version=?,updated_at=? WHERE id=? AND person_id=? AND data_mode=? AND version=?').run(JSON.stringify(plan),version,now,planId,context.personId,context.dataMode,expected!);if(change.changes!==1)throw new CommonError('VERSION_CONFLICT','計画が変更されました。');}
   else this.db.prepare('INSERT INTO pilgrimage_plans VALUES(?,?,?,?,?,?,?)').run(planId,context.personId,context.dataMode,JSON.stringify(plan),version,now,now);
   if(plan.ai)this.deps.ai!.appendAppliedRef(this.db,context,plan.ai.runId,{type:'pilgrimage-plan',id:plan.id,version:plan.version,contentHash:requestHash(plan)});
   return plan;
  });
 }
 overlay(context:RequestContext) {
  const state=this.deps.pluginState(this.db,context),setting=state.items.find((s:any)=>s.id==='pilgrimage');
  const visible=!!setting?.enabled && state.appliedDeclarations.some((d:any)=>d.pluginId==='pilgrimage'&&d.targetKey==='layer:pilgrimage'&&d.property==='visibility'&&d.value===true);
  if(!visible)return {visible:false,features:[],plans:[],dataKind:'live' as const};
  const plans=this.listPlans(context).items;
  return {visible:true,dataKind:'live' as const,plans:plans.map(p=>({id:p.id,title:p.title,routeId:p.routeId,version:p.version})),features:plans.flatMap(plan=>[
   ...plan.sourceSnapshot.map((relation,index)=>({type:'Feature',id:`${plan.id}:${index}`,geometry:{type:'Point',coordinates:plan.route.waypoints[index].coordinates},properties:{kind:'pilgrimage',planId:plan.id,placeId:plan.orderedPlaceIds[index],order:index+1,label:relation.name,description:relation.description,verificationStatus:relation.verificationStatus,sourceRefs:relation.sourceRefs}})),
   {type:'Feature',id:`${plan.id}:route`,geometry:plan.route.geometry,properties:{kind:'route',planId:plan.id,routeId:plan.routeId,label:plan.title,fetchedAt:plan.route.fetchedAt,sourceUrl:plan.route.sourceUrl}}
  ])};
 }
}
