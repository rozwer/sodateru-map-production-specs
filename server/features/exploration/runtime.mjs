import {CommonError} from '../../core/errors.ts';
import {getRun,getConversation,assertRunAdoptable,appendAppliedRef,canonicalHash,registerAiTask} from '../../ai/index.ts';
import {runEphemeral,getAiConfiguration} from '../../ai/provider.ts';
import {assertAiAllowed,readSettings} from '../settings/service.ts';
import {existsSync} from 'node:fs';
const informationUrl=new URL('../../information/service.ts',import.meta.url);
const informationModule=existsSync(informationUrl)?await import(informationUrl.href):null;
function createInformationService(db){if(!informationModule)throw new CommonError('PROVIDER_UNAVAILABLE','記録と根拠の共通接続は準備中です。',true,undefined,503);return informationModule.createInformationService(db);}
import {placesService} from '../places/service.ts';
import {getPlace} from '../places/repository.ts';
import {createRoutesService} from '../routes/index.ts';
import {createDiscoverTask} from './discover-task.mjs';
import {listDiscoveryFacts,validateDiscoverySources,discoveryFacts} from './facts.mjs';

const runtimes=new WeakMap();
function readAnchor(db,context,anchor){
 const information=()=>createInformationService(db);
 if(anchor.kind==='place'){
  const place=getPlace(db,anchor.targetId);
  if(!place)throw new CommonError('NOT_FOUND','観察対象の場所がありません。');
  return [{type:'place',id:place.id,version:place.version}];
 }
 if(anchor.kind==='photo'){
  const media=information().requireReadableMedia(context,anchor.targetId);
  if(media.kind!=='photo'||media.status!=='ready')throw new CommonError('NOT_FOUND','観察対象の写真を利用できません。');
  return information().getRecord(context,media.record_id).sourceRefs;
 }
 return [];
}
function readFacts(db,context,anchor){
 const facts=listDiscoveryFacts(anchor,discoveryFacts);
 if(anchor.kind==='place'){
  const place=getPlace(db,anchor.targetId);
  facts.push({factKey:'place-identity-'+canonicalHash(place.id).slice(0,24),text:'取得元に登録された名称: '+place.name+'。住所: '+(place.address??'未確認')+'。営業状況と現地の入口は未確認。取得元: '+place.provider+'。帰属: '+place.attribution,conceptIds:['place-identity'],source:{url:place.sourceUrl,title:'取得元の場所情報（'+place.provider+'）',claimScope:'place-specific',sourceId:place.id},anchor:{kind:'place',targetId:place.id}});
 }
 return facts;
}
export function installDiscoverTask(){registerAiTask(createDiscoverTask({readAnchor,readFacts,assertAllowed:(db,context,anchor)=>assertAiAllowed(db,context.personId,anchor.kind==='photo'?{media:true}:{location:true})}));}
function routeDto(r){
 return {previewId:r.previewId,waypoints:r.waypoints.map(w=>({coordinates:w.coordinates,name:w.name,placeId:w.placeId})),mode:r.mode,
 legs:r.legs.map(l=>({fromIndex:l.fromIndex,toIndex:l.toIndex,geometry:l.geometry,distanceM:l.distanceM,durationSec:l.durationSec})),
 geometry:r.geometry,distanceM:r.distanceM,durationSec:r.durationSec,provider:r.provider,fetchedAt:r.fetchedAt,expiresAt:r.expiresAt,retention:r.retention};
}
export function runtimeFor(db,dataMode){
 if(runtimes.has(db))return runtimes.get(db);
 const information=()=>createInformationService(db),routes=createRoutesService(db);
 const settings=context=>{
  assertAiAllowed(db,context.personId,{location:true});
  const config=getAiConfiguration('consult'),preferences=readSettings(db,context.personId);
  return {version:canonicalHash({configurationVersion:config.configurationVersion,ai:preferences.ai}),enabled:true,config};
 };
 const runtime={
  facts:(context,anchor)=>readFacts(db,context,anchor),
  dialogue:{
   settings,
   async decide(context,payload,options){
    const current=settings(context);
    if(current.version!==options.settingsVersion)throw new CommonError('RESULT_EXPIRED','AI設定が変わりました。');
    return runEphemeral({prompt:options.prompt+'\nsource_payload='+JSON.stringify(payload),schema:options.schema,model:current.config.model,signal:context.signal,deadline:options.deadline,task:'consult'});
   },
   search(context,{category,origin}){return placesService.search(context,db,{category,longitude:origin[0],latitude:origin[1]});},
   async route(context,{origin,candidate,searchResultId}){
    placesService.resolveCandidate(context,searchResultId,candidate.candidateId);
    const route=await routes.previewRoute(context,{waypoints:[{kind:'point',coordinates:origin.coordinates,label:origin.label},{kind:'candidate',resultId:searchResultId,candidateId:candidate.candidateId}],mode:'walking',title:candidate.name.slice(0,100)});
    return routeDto(route);
   }
  },
  getConversation(context,id){return getConversation(db,context,id);},
  discovery:{
   getRun(context,id){return getRun(db,context,id);},
   checkSources(context,input){return information().checkSources(context,input);},
   validateCard(context,card){
    try{validateDiscoverySources(card,readFacts(db,context,card.anchor));}catch(e){if(e.code==='OUTPUT_INVALID')throw new CommonError('SOURCE_CHANGED','発見の出典が変わりました。再生成してください。');throw e;}
   },
   assertAdoptable(context,run){
    information().assertSourcesCurrent(context,{refs:run.sourceRefs});
    return assertRunAdoptable(db,context,run.id,{expectedAttempt:run.attempt,expectedVersion:run.version});
   },
   recordAdoption(context,run,card){
    const content={anchor:card.anchor,bridge:card.bridge,knowledge:card.knowledge,observationPrompt:card.observationPrompt,conceptIds:card.conceptIds,sources:card.sources,sourceRefs:card.sourceRefs};
    appendAppliedRef(db,context,run.id,{type:'discovery',id:card.id,version:card.version,contentHash:canonicalHash(content)});
   }
  }
 };
 runtimes.set(db,runtime);return runtime;
}
