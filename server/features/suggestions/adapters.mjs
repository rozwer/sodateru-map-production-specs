import {randomUUID} from 'node:crypto';
import {CommonError} from '../../core/errors.ts';

async function dependency(path,label) {
  try {return await import(path);}catch(error) {
    if(error?.code==='ERR_MODULE_NOT_FOUND')throw new CommonError('PROVIDER_UNAVAILABLE',`${label}の統合がまだ利用できません。`,true,{},503);
    throw error;
  }
}
export async function readDependencies(db,context) {
  const [information,settings]=await Promise.all([dependency('../../information/service.ts','共通根拠'),dependency('../settings/service.ts','本人設定')]);
  const info=information.createInformationService(db);
  return {
    allowed:item=>settings.isSuggestionAllowed(db,context.personId,item),
    assertReadable:item=>info.assertSourcesCurrent(context,{refs:item.sourceRefs}),
    visitReader:async()=>{
      const activity=await dependency('../activity/service.ts','訪問');
      return id=>activity.getVisit(db,context,id);
    },
    routeReader:async()=>{
      const routes=await dependency('../routes/index.ts','共通経路');
      const service=routes.createRoutesService(db);
      return id=>service.getSavedRoute(context,id,true);
    },
  };
}

export async function generationDependencies(db,context,store,transaction) {
  const [information,settings,places,placeRows,routes,ai,query]=await Promise.all([
    dependency('../../information/service.ts','共通根拠'),dependency('../settings/service.ts','本人設定'),
    dependency('../places/service.ts','共通場所'),dependency('../places/repository.ts','共通場所'),
    dependency('../routes/index.ts','共通経路'),dependency('../../ai/provider.ts','共通AI'),dependency('../../information/query.ts','共通距離計算'),
  ]);
  const info=information.createInformationService(db),routeService=routes.createRoutesService(db);
  const readPlace=id=>placeRows.getPlace(db,id);
  return {
    store,
    settings:{read:()=>settings.readSettings(db,context.personId),allowed:(candidate,trigger)=>settings.isSuggestionAllowed(db,context.personId,candidate,trigger),assertAiAllowed:scope=>settings.assertAiAllowed(db,context.personId,scope)},
    sources:{materials:()=>info.ownMaterials(context,{includeUndated:true}),assertCurrent:refs=>info.assertSourcesCurrent(context,{refs})},
    places:{
      async candidates(conditions,origin) {
        const saved=[];let cursor;
        do {const page=places.listPlaces(context,db,{limit:'100',...(cursor?{cursor}:{})});saved.push(...page.items);cursor=page.nextCursor;}while(cursor);
        const all=saved.map(place=>({placeId:place.id,name:place.name,coordinates:place.coordinates,sourceRefs:[{type:'place',id:place.id,version:place.version}],placeVersion:place.version}));
        const searchText=conditions.activity||conditions.wishes[0]||(!all.length?'公園':null);
        if(searchText) {
          const found=await places.placesService.search(context,db,{q:searchText,limit:10});
          for(const candidate of found.items) {
            if(candidate.retention!=='storable')throw new CommonError('INPUT_CHANGED','保存できない一時場所候補です。保存可能な場所で再検索してください。');
            if(candidate.placeId&&all.some(item=>item.placeId===candidate.placeId))continue;
            const place=candidate.placeId?readPlace(candidate.placeId):null;
            all.push({placeId:place?.id??randomUUID(),name:candidate.name,coordinates:candidate.coordinates,sourceRefs:place?[{type:'place',id:place.id,version:place.version}]:[],placeVersion:place?.version??null,search:{resultId:found.resultId,candidateId:candidate.candidateId},expiresAt:found.expiresAt});
          }
        }
        // A bounded search pool; final ranking uses actual route duration, never this distance.
        return all.sort((a,b)=>query.distanceM([origin.longitude,origin.latitude],a.coordinates)-query.distanceM([origin.longitude,origin.latitude],b.coordinates)||a.placeId.localeCompare(b.placeId)).slice(0,20);
      },
      revalidate(candidate) {
        if(candidate.search)places.placesService.resolveCandidate(context,candidate.search.resultId,candidate.search.candidateId);
        if(candidate.placeVersion && readPlace(candidate.placeId).version!==candidate.placeVersion)throw new CommonError('SOURCE_CHANGED','候補の場所情報が更新されました。');
      },
      materialize(candidates) {
        for(const candidate of candidates) {
          if(!candidate.placeVersion) {
            const {place}=places.placesService.adopt(context,db,{id:candidate.placeId,mode:'candidate',...candidate.search});
            candidate.placeId=place.id;candidate.placeVersion=place.version;
            candidate.sourceRefs.push({type:'place',id:place.id,version:place.version});
          }
          if(!settings.isSuggestionAllowed(db,context.personId,candidate))throw new CommonError('INPUT_CHANGED','保存前に候補の停止条件が変わりました。');
        }
      },
    },
    routes:{
      preview:(origin,candidate,mode)=>routeService.previewRoute(context,{waypoints:[{kind:'point',coordinates:[origin.longitude,origin.latitude],label:'出発地'},candidate.placeVersion?{kind:'stored',placeId:candidate.placeId}:{kind:'point',coordinates:candidate.coordinates,label:candidate.name}],mode,title:candidate.name.slice(0,100)}),
      revalidate:id=>routeService.revalidatePreview(context,id,true),
    },
    ai:{configuration:()=>ai.getAiConfiguration('suggestions'),explain:args=>ai.runEphemeral(args)},
  };
}
