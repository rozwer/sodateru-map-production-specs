import { withRecordMediaScope } from '../records/MediaContent';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Place, RecordView, RecordDetail, Visit, TrackPoint, GrowthItem } from '../../../packages/api-client/index';
import { api } from '../../app/api';
import type { ScreenDefinition, ScreenProps } from '../../app/contracts';
import { useScreenState } from '../../app/useScreenState';
import { MapBridge } from '../../app/map-bridge';
import { RecordMapPreview as MapPreview, showRecordGrowth } from '../records/map-preview';
import { RecordHeading, RecordNotice } from '../records/RecordParts';
import { errorText, readRecord } from '../records/record-flow';
import { placeChoice, useRecordDetail, useScreenMutation } from '../records/record-hooks';
import type { PlaceChoice } from '../records/form-types';
import { VisitEditor } from './VisitEditor';
import { GrowthResult } from './GrowthResult';
import { DailyTrack, type TimelineEntry } from './DailyTrack';
import { allTrackPoints, allVisits, displayDuration, displayTime, growthForPlace, localDay, recordDetails, timelineEntries, trackRuns } from './activity-data';

function usePreviewBridge(scopeKey:string) {
 const bridge=useMemo(()=>new MapBridge(`${scopeKey}:records-preview`),[scopeKey]);
 useEffect(()=>()=>bridge.dispose(),[bridge]);return bridge;
}


function GrowthScreen({route,scopeKey,back,navigate,active=true}:ScreenProps & {active?:boolean}) {
 const loaded=useRecordDetail(route.params.recordId,scopeKey,active);
 const [growth,setGrowth]=useState<GrowthItem|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(false);
 const bridge=usePreviewBridge(scopeKey);
 useEffect(()=>{
  const placeId=loaded.detail?.record.effectivePlaceId;if(!placeId||!active)return;
  const abort=new AbortController();setLoading(true);setError('');
  void growthForPlace(api,placeId,abort.signal).then(result=>{
   if(abort.signal.aborted)return;setGrowth(result);showRecordGrowth(bridge,result?[result]:[]);
   if(result){bridge.showPlaces('daily-track',{places:[{id:placeId,placeId,coordinates:result.place.coordinates,label:result.place.name}]});bridge.focus('daily-track',{center:result.place.coordinates,zoom:18});bridge.setView({dimension:'3d',lens:'personal'});}
  }).catch(error=>{if(!abort.signal.aborted)setError(errorText(error));}).finally(()=>{if(!abort.signal.aborted)setLoading(false);});return()=>abort.abort();
 },[loaded.detail?.record.effectivePlaceId,loaded.detail?.record.version,scopeKey,active]);
 if(!loaded.detail)return <section className="records-screen"><RecordHeading title="体験から形になる" onBack={back}/><div className="records-body"><RecordNotice error={!!loaded.error} retry={loaded.error?loaded.reload:undefined}>{loaded.error||'成長のもとになった記録を読み込んでいます…'}</RecordNotice></div></section>;
 const record=loaded.detail.record;
 return <GrowthResult place={loaded.place} body={record.body} purposes={growth?.purposes??[]} visitCount={loading||error||!record.effectivePlaceId?null:growth?.confirmedVisitCount??0} preview={active?<MapPreview bridge={bridge} label="体験による建物の成長"/>:null} onBack={back} onOriginal={()=>navigate('record-edit',{recordId:record.id})} onNext={()=>navigate('self-checkin',{recordId:record.id})} onMap={()=>navigate('map',{...(record.effectivePlaceId?{placeId:record.effectivePlaceId}:{})})} loading={loading} error={error||loaded.error}/>;
}

interface DailyState {date:string;calendar:boolean;month:string;expandedId:string|null}
function DailyScreen({route,scopeKey,back,navigate,active=true}:ScreenProps & {active?:boolean}) {
 const [state,setState]=useScreenState<DailyState>(()=>{const date=route.params.date||new Date().toLocaleDateString('sv-SE');return {date,calendar:route.params.view==='calendar',month:date.slice(0,7),expandedId:route.params.recordId??null};});
 const [records,setRecords]=useState<RecordView[]>([]),[visits,setVisits]=useState<Visit[]>([]),[track,setTrack]=useState<TrackPoint[]>([]);
 const [places,setPlaces]=useState(new Map<string,Place>()),[details,setDetails]=useState(new Map<string,RecordDetail>());
 const [loading,setLoading]=useState(false),[error,setError]=useState(''),[revision,setRevision]=useState(0),[cursor,setCursor]=useState<string|null>(null);
 const [recordedDates,setRecordedDates]=useState(new Set<string>());
 const bridge=usePreviewBridge(scopeKey);
 const timeZone=route.params.timeZone||Intl.DateTimeFormat().resolvedOptions().timeZone;
 const includeUndated=route.params.includeUndated==='true';
 const moreController=useRef<AbortController|null>(null);
 useEffect(()=>()=>moreController.current?.abort(),[state.date,timeZone,scopeKey,active,revision,route.params.recordId,includeUndated]);
 useEffect(()=>{
  if(!active)return;const abort=new AbortController();setLoading(true);setError('');setRecords([]);setVisits([]);setTrack([]);setDetails(new Map());setPlaces(new Map());setCursor(null);bridge.clear('daily-track');
  const load=async()=>{
   const range=localDay(state.date,timeZone);
   const results=await Promise.allSettled([
    api.request('getRecords',{query:{...range,timeZone,includeUndated,limit:20},signal:abort.signal}),
    allVisits(api,range,abort.signal),allTrackPoints(api,range,abort.signal),
   ]);
   if(abort.signal.aborted)return;
   let recordRows=results[0].status==='fulfilled'?results[0].value.items:[];
   const visitRows=results[1].status==='fulfilled'?results[1].value:[];
   const points=results[2].status==='fulfilled'?results[2].value:[];
   const warnings=results.flatMap((result,index)=>result.status==='rejected'?[`${['記録','訪問','位置記録'][index]}：${errorText(result.reason)}`]:[]);
   if(route.params.recordId&&!recordRows.some(record=>record.id===route.params.recordId)){
    try{const selected=await readRecord(api,route.params.recordId,abort.signal);const timestamp=selected.record.effectiveStartedAt;if(timestamp===null&&includeUndated||timestamp!==null&&timestamp>=range.from&&timestamp<range.to)recordRows=[...recordRows,selected.record];}catch(error){warnings.push(errorText(error));}
   }
   if(abort.signal.aborted)return;
   setRecords(recordRows);setVisits(visitRows);setTrack(points);setCursor(results[0].status==='fulfilled'?results[0].value.nextCursor:null);
   const placeIds=[...new Set([...recordRows.flatMap(record=>record.effectivePlaceId?[record.effectivePlaceId]:[]),...visitRows.map(visit=>visit.placeId)])];
   const [placeResults,detailRows]=await Promise.all([Promise.allSettled(placeIds.map(placeId=>api.request('getPlacesPlaceId',{path:{placeId},signal:abort.signal}))),recordDetails(api,recordRows,abort.signal)]);
   if(abort.signal.aborted)return;
   const placeMap=new Map<string,Place>(placeResults.flatMap(result=>result.status==='fulfilled'?[[result.value.data.place.id,result.value.data.place] as const]:[]));
   setPlaces(placeMap);setDetails(detailRows);
   if(placeResults.some(result=>result.status==='rejected'))warnings.push('一部の場所を取得できません。記録本文は表示しています。');
   if(detailRows.size<recordRows.length || [...detailRows.values()].some(detail=>detail.media.status==='failed'))warnings.push('一部の媒体を取得できません。記録本文は表示しています。');
   setError(warnings.join(' '));
  };
  void load().catch(error=>{if(!abort.signal.aborted)setError(errorText(error));}).finally(()=>{if(!abort.signal.aborted)setLoading(false);});
  return()=>abort.abort();
 },[state.date,timeZone,scopeKey,active,revision,route.params.recordId,includeUndated]);
 useEffect(()=>{
  if(!state.calendar||!active)return;const abort=new AbortController();
  const load=async()=>{
   const next=new Date(`${state.month}-01T12:00:00Z`);next.setUTCMonth(next.getUTCMonth()+1);
   const from=localDay(`${state.month}-01`,timeZone).from,to=localDay(next.toISOString().slice(0,10),timeZone).from;
   const days=new Set<string>();let nextCursor:string|undefined;
   do{const page=await api.request('getRecords',{query:{from,to,timeZone,limit:100,...(nextCursor?{cursor:nextCursor}:{})},signal:abort.signal});for(const record of page.items){if(record.effectiveStartedAt!==null)days.add(new Intl.DateTimeFormat('sv-SE',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(record.effectiveStartedAt));}nextCursor=page.nextCursor??undefined;}while(nextCursor);
   if(!abort.signal.aborted)setRecordedDates(days);
  };void load().catch(error=>{if(!abort.signal.aborted)setError(errorText(error));});return()=>abort.abort();
 },[state.calendar,state.month,scopeKey,active,timeZone,revision]);
 useEffect(()=>{
  if(!active)return;
  const segments=trackRuns(track);
  const points=visits.flatMap(visit=>{const place=places.get(visit.placeId);return place?[{id:visit.id,coordinates:place.coordinates,label:`${place.name} ${displayTime(visit.startedAt,timeZone)}`}]:[];});
  bridge.showTrack('daily-track',{segments:segments.filter(run=>run.points.length>1).map(run=>({id:run.id,coordinates:run.points.map(point=>[point.longitude,point.latitude])})),points});
  if(points[0])bridge.focus('daily-track',{center:points[0].coordinates,zoom:14});
 },[track,visits,places,active]);
 const entries=useMemo(()=>timelineEntries(records,visits,places,details,timeZone,track),[records,visits,places,details,timeZone,track]);
 const selectedRecords=state.calendar?entries.filter(entry=>entry.recordId):entries;
 const durationMs=visits.filter(visit=>visit.status==='confirmed'&&visit.startedAt!==null&&visit.endedAt!==null).reduce((sum,visit)=>sum+Math.max(0,visit.endedAt!-visit.startedAt!),0);
 const more=async()=>{
  if(!cursor||loading)return;setLoading(true);
  const abort=new AbortController();moreController.current=abort;
  try{
   const range=localDay(state.date,timeZone);
   const page=await api.request('getRecords',{query:{...range,timeZone,includeUndated,limit:20,cursor},signal:abort.signal});
   if(abort.signal.aborted)return;
   setRecords(previous=>[...previous,...page.items.filter(record=>!previous.some(item=>item.id===record.id))]);setCursor(page.nextCursor);
   const extra=await recordDetails(api,page.items,abort.signal);
   if(abort.signal.aborted)return;setDetails(previous=>new Map([...previous,...extra]));
   const ids=[...new Set(page.items.flatMap(record=>record.effectivePlaceId&&!places.has(record.effectivePlaceId)?[record.effectivePlaceId]:[]))];
   const extraPlaces=await Promise.allSettled(ids.map(placeId=>api.request('getPlacesPlaceId',{path:{placeId},signal:abort.signal})));
   if(abort.signal.aborted)return;
   setPlaces(previous=>new Map([...previous,...extraPlaces.flatMap(result=>result.status==='fulfilled'?[[result.value.data.place.id,result.value.data.place] as const]:[])]));
   if(extraPlaces.some(result=>result.status==='rejected'))setError('一部の場所を取得できません。記録本文は表示しています。');
  }catch(error){if(!abort.signal.aborted)setError(errorText(error));}finally{if(!abort.signal.aborted)setLoading(false);}
 };
 const carry={date:state.date,timeZone,returnPage:'daily-track'};
 return <DailyTrack date={state.date} onDate={date=>setState(previous=>({...previous,date,expandedId:null}))} entries={selectedRecords} expandedId={state.expandedId} onExpand={id=>setState(previous=>({...previous,expandedId:previous.expandedId===id?null:id}))} onEdit={recordId=>navigate('record-edit',{...carry,recordId})} onReflect={recordId=>navigate('reflection-question',{...carry,recordId})} onVisit={visitId=>navigate('visit-confirm',{...carry,visitId})} onBack={back} onMenu={()=>navigate('navigation')} onRecord={()=>navigate('record-create',carry)} map={active?<MapPreview bridge={bridge} label="今日の軌跡と滞在地点" interactive/>:null} loading={loading} error={error} onRetry={()=>setRevision(value=>value+1)} onMore={cursor?()=>void more():undefined} confirmedPlaces={new Set(visits.filter(visit=>visit.status==='confirmed').map(visit=>visit.placeId)).size} duration={durationMs?displayDuration(0,durationMs):''} missingTrack={track.length===0} calendar={state.calendar} onCalendar={calendar=>setState(previous=>({...previous,calendar,month:previous.date.slice(0,7)}))} onMonth={month=>setState(previous=>({...previous,month}))} recordedDates={recordedDates}/>;
}

export const screens:ScreenDefinition[]=[
 {id:'visit-confirm',title:'訪問の確認',component:withRecordMediaScope(VisitEditor),layout:{presentation:'fullscreen',header:'none',contentPadding:'none',bottomNav:false}},
 {id:'growth-result',title:'体験で地図が育った',component:withRecordMediaScope(GrowthScreen),layout:{presentation:'fullscreen',header:'none',contentPadding:'none',bottomNav:false}},
 {id:'daily-track',title:'今日の軌跡',component:withRecordMediaScope(DailyScreen),layout:{presentation:'fullscreen',header:'none',contentPadding:'none',bottomNav:true}},
];
