import { notifyGrowthChanged } from '../activity/growth-refresh';
import { useEffect, useRef, useState } from 'react';
import type { Person, Visit } from '../../../packages/api-client/index';
import { api } from '../../app/api';
import type { ScreenProps } from '../../app/contracts';
import { useScreenState } from '../../app/useScreenState';
import { useMapBridge } from '../../app/useMapBridge';
import { RecordMapPreview as MapPreview } from './map-preview';
import { RecordComposer } from './RecordComposer';
import { PlacePicker } from './PlacePicker';
import { blankDraft, type PlaceChoice, type RecordDraft } from './form-types';
import { RecordNotice } from './RecordParts';
import { createSaveSession, createEditSession, errorText, readRecord, saveNewRecord, saveEditedRecord, type RecordSaveSession, type SaveProgress } from './record-flow';
import { placeChoice } from './record-hooks';
import { takeRecordCapture } from './capture-handoff';

interface CreateState {
 captureId?:string;
 draft:RecordDraft; place:PlaceChoice|null; step:'editor'|'confirmation'|'place-picker'; returnStep:'editor'|'confirmation';
 mode:'map'|'search'|'history'; query:string; selected:PlaceChoice|null; saveSession:RecordSaveSession|null;
}
const fingerprint=(draft:RecordDraft)=>JSON.stringify({...draft,media:draft.media.map(item=>({id:item.id,position:item.position})),removedMedia:draft.removedMedia});

export function CreateRecordScreen({route,navigate,back,scopeKey,active=true}:ScreenProps & {active?:boolean}) {
 const [state,setState]=useScreenState<CreateState>(()=>({draft:blankDraft(),place:null,step:'editor',returnStep:'editor',mode:'map',query:'',selected:null,saveSession:null}));
 const [busy,setBusy]=useState(false), [error,setError]=useState(''), [notice,setNotice]=useState('');
 const [places,setPlaces]=useState<PlaceChoice[]>([]), [placeBusy,setPlaceBusy]=useState(false), [placeError,setPlaceError]=useState('');
 const [attachedVisit,setAttachedVisit]=useState<Visit|null>(null);
 useEffect(()=>{if(!route.params.visitId||!active)return;const abort=new AbortController();
 void api.request('getVisitsVisitId',{path:{visitId:route.params.visitId},signal:abort.signal}).then(async({data})=>{
  const found=await api.request('getPlacesPlaceId',{path:{placeId:data.placeId},signal:abort.signal});
  if(!abort.signal.aborted){setAttachedVisit(data);setState(previous=>({...previous,place:placeChoice(found.data.place)}));}
 }).catch(cause=>{if(!abort.signal.aborted)setError(errorText(cause));});return()=>abort.abort();
 },[route.params.visitId,scopeKey,active]);
 const [people,setPeople]=useState<Person[]>([]), [peopleError,setPeopleError]=useState('');
 const [searchRevision,setSearchRevision]=useState(0);
 const bridge=useMapBridge();
 const submitting=useRef(false);
 const receivedCapture=useRef<string|null>(null);
 useEffect(()=>{
   const captureId=route.params.captureId;
   if(!active||!captureId||state.captureId===captureId||receivedCapture.current===captureId)return;
   receivedCapture.current=captureId;
   const files=takeRecordCapture(captureId,scopeKey);
   if(!files){setError('撮影した写真を引き継げませんでした。もう一度、写真を撮るか端末から選んでください。');return;}
   const room=Math.max(0,100-state.draft.media.length);
   if(files.length>room)setError('一つの記録に添付できる媒体は100件までです。');
   const media=files.slice(0,room).map(file=>({id:crypto.randomUUID(),file,url:URL.createObjectURL(file),kind:file.type.startsWith('image/')?'photo' as const:'video' as const,name:file.name,position:0,state:'draft' as const}));
   setState(previous=>{
     return {...previous,captureId,step:'editor',draft:{...previous.draft,media:[...previous.draft.media,...media.map((item,index)=>({...item,position:previous.draft.media.length+index}))]}};
   });
 },[route.params.captureId,scopeKey,active]);
 const saveController=useRef<AbortController|null>(null);
 useEffect(()=>()=>saveController.current?.abort(),[scopeKey]);
 useEffect(()=>{if(!active)saveController.current?.abort();},[active]);
 useEffect(()=>{
   if(!route.params.placeId || state.place || !active)return;
   const controller=new AbortController();
   void api.request('getPlacesPlaceId',{path:{placeId:route.params.placeId},signal:controller.signal}).then(({data})=>setState(previous=>({...previous,place:placeChoice(data.place)}))).catch(error=>{if(!controller.signal.aborted)setError(errorText(error));});
   return ()=>controller.abort();
 },[route.params.placeId,scopeKey,active]);
 useEffect(()=>{
   if(state.step!=='place-picker' || !active)return;
   const controller=new AbortController();setPlaceBusy(true);setPlaceError('');
   const load=async()=>{
     if(state.mode==='history'){
       const visits=await api.request('getVisits',{query:{limit:100,status:'confirmed'},signal:controller.signal});
       const ids=[...new Set(visits.items.map(item=>item.placeId))];
       const results=await Promise.allSettled(ids.map(placeId=>api.request('getPlacesPlaceId',{path:{placeId},signal:controller.signal})));
       if(controller.signal.aborted)return;
       const items=results.flatMap(result=>result.status==='fulfilled'?[placeChoice(result.value.data.place)]:[]);setPlaces(items);
       if(results.some(result=>result.status==='rejected'))setPlaceError('一部の訪問先を取得できませんでした。取得できた場所は選べます。');
       bridge.showPlaces('record-place-picker',{places:items.map(item=>({id:item.id,placeId:item.id,coordinates:[item.longitude,item.latitude],label:item.name}))});
     }else{
       const camera=bridge.getSnapshot().camera;
       const {data}=await api.request('getPlaceCandidates',{query:{...(state.query.trim()?{q:state.query.trim()}:{}),longitude:camera.longitude,latitude:camera.latitude,limit:20},signal:controller.signal});
       if(controller.signal.aborted)return;
       const items:PlaceChoice[]=data.items.map(item=>({id:item.placeId??item.candidateId,name:item.name,address:item.address,longitude:item.position.longitude,latitude:item.position.latitude,source:item.placeId?'saved':'candidate',resultId:data.resultId}));
       setPlaces(items);
       bridge.showCandidates('record-place-picker',{resultId:data.resultId,expiresAt:data.expiresAt,candidates:items.map(item=>({id:item.id,coordinates:[item.longitude,item.latitude],label:item.name})),selectedCandidateId:state.selected?.id});
     }
   };
   void load().catch(error=>{if(!controller.signal.aborted)setPlaceError(errorText(error));}).finally(()=>{if(!controller.signal.aborted)setPlaceBusy(false);});
   return ()=>{controller.abort();bridge.clear('record-place-picker');};
 },[state.step,state.mode,searchRevision,scopeKey,active]);
 useEffect(()=>bridge.onSelect('record-place-picker',selection=>{const selected=places.find(item=>item.id===selection.id);if(selected)setState(previous=>({...previous,selected}));}),[bridge,places]);
 useEffect(()=>{
   if(state.draft.visibility!=='selected'||!active)return;
   const controller=new AbortController();setPeopleError('');
   void api.request('getPeople',{query:{limit:100},signal:controller.signal}).then(page=>{if(!controller.signal.aborted)setPeople(page.items);}).catch(error=>{if(!controller.signal.aborted)setPeopleError(errorText(error));});
   return ()=>controller.abort();
 },[state.draft.visibility,scopeKey,active]);
 const changeDraft=(draft:RecordDraft)=>{setState(previous=>({...previous,draft}));setError('');};
 const selectPlace=(selected:PlaceChoice|null)=>{
   setState(previous=>({...previous,selected}));
   if(selected){bridge.focus('record-place-picker',{center:[selected.longitude,selected.latitude],zoom:15});bridge.selectCandidate('record-place-picker',selected.id);}
 };
 const addFiles=(files:File[])=>{
   const room=100-state.draft.media.length;
   if(files.length>room)setError('一つの記録に添付できる媒体は100件までです。');
   const added=files.slice(0,room).map((file,index)=>({id:crypto.randomUUID(),file,url:URL.createObjectURL(file),kind:file.type.startsWith('image/')?'photo' as const:'video' as const,name:file.name,position:state.draft.media.length+index,state:'draft' as const}));
   changeDraft({...state.draft,media:[...state.draft.media,...added]});
 };
 const remove=(id:string)=>{
   const item=state.draft.media.find(item=>item.id===id);
   if(item?.file && item.url)URL.revokeObjectURL(item.url);
   changeDraft({...state.draft,media:state.draft.media.filter(item=>item.id!==id).map((item,position)=>({...item,position})),removedMedia:item?.version?[...state.draft.removedMedia,{id,version:item.version}]:state.draft.removedMedia});
 };
 const move=(id:string,direction:-1|1)=>{
   const items=[...state.draft.media],index=items.findIndex(item=>item.id===id),target=index+direction;
   if(index<0||target<0||target>=items.length)return;
   [items[index],items[target]]=[items[target]!,items[index]!];
   changeDraft({...state.draft,media:items.map((item,position)=>({...item,position}))});
 };
 const save=async()=>{
   if(route.params.visitId&&!attachedVisit){setError('関連する訪問を取得できていません。訪問画面から開き直してください。');return;}
   if(submitting.current)return;submitting.current=true;setBusy(true);setError('');
   const controller=new AbortController();saveController.current=controller;
   let session=state.saveSession;
   if(!session){session=createSaveSession(state.draft,state.place,route.params.topicKey || null,attachedVisit??undefined);setState(previous=>({...previous,saveSession:session}));}
   const progress=(value:SaveProgress)=>{
     if(controller.signal.aborted)return;
     setState(previous=>({...previous,draft:{...previous.draft,media:value.media}}));
     setNotice(value.stage==='media'?'本文を保存しました。媒体を処理しています。':value.stage==='place'?'場所を保存しています…':value.stage==='visit'?'訪問を保存しています…':'');
   };
   try{
     const changed=fingerprint(state.draft)!==fingerprint(session.draft);
     // A lost POST response must be replayed with its original key and body.
     // Later edits are applied to that same record after the creation is resolved.
     const requestedDraft={...state.draft,media:state.draft.media.map(item=>({...item}))};
     let saved;
     if(!session.record || !changed){saved=await saveNewRecord(api,session,changed?()=>{}:progress,controller.signal,()=>notifyGrowthChanged(scopeKey));}
     else saved=session.record;
     if(changed){
       const current=await readRecord(api,saved.id,controller.signal);
       if(current.media.status!=='ready')throw new Error('媒体を取得できません。入力を保持しています。');
       const actual=current.media.data.items;
       const edited={...requestedDraft,media:requestedDraft.media.map(item=>{const existing=actual.find(media=>media.id===item.id);return existing?{...item,version:existing.version,state:existing.status}:item;}),removedMedia:actual.filter(media=>!requestedDraft.media.some(item=>item.id===media.id)).map(media=>({id:media.id,version:media.version}))};
       saved=await saveEditedRecord(api,createEditSession(current.record,edited),progress,controller.signal,()=>notifyGrowthChanged(scopeKey));
     }
     if(controller.signal.aborted)return;
     setState({draft:blankDraft(),place:null,step:'editor',returnStep:'editor',mode:'map',query:'',selected:null,saveSession:null});
     setNotice('');
     if(route.params.returnPage==='knowledge-list'){back();return;}
     navigate('daily-track',{recordId:saved.id,date:state.draft.date || new Date().toLocaleDateString('sv-SE'),timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone,includeUndated:state.draft.date?'false':'true'});
   }catch(error){if(!controller.signal.aborted)setError(`${session?.visit?.status === "confirmed" && !session.record ? "訪問の確認は保存済みです。記録の保存は完了していません。" : ""}${errorText(error)}`);}
   finally{submitting.current=false;setBusy(false);}
 };
 const sharing=<div className="records-share-people">{peopleError&&<RecordNotice error>{peopleError}</RecordNotice>}{people.length===0&&!peopleError&&<p>共有する友達がいません。</p>}{people.map(person=><label key={person.id}><input type="checkbox" checked={state.draft.sharedWith.includes(person.id)} onChange={event=>changeDraft({...state.draft,sharedWith:event.target.checked?[...state.draft.sharedWith,person.id]:state.draft.sharedWith.filter(id=>id!==person.id)})}/>{person.name}</label>)}</div>;
 if(state.step==='place-picker')return <PlacePicker mode={state.mode} onMode={mode=>setState(previous=>({...previous,mode}))} query={state.query} onQuery={query=>setState(previous=>({...previous,query}))} onSearch={()=>setSearchRevision(value=>value+1)} items={places} selected={state.selected} onSelect={selectPlace} onUse={()=>setState(previous=>({...previous,place:previous.selected,step:previous.returnStep}))} onBack={()=>setState(previous=>({...previous,step:previous.returnStep}))} onLocate={()=>{navigator.geolocation.getCurrentPosition(position=>{bridge.focus('record-place-picker',{center:[position.coords.longitude,position.coords.latitude],zoom:15});bridge.setCamera({longitude:position.coords.longitude,latitude:position.coords.latitude});setSearchRevision(value=>value+1);},()=>setPlaceError('現在地を取得できませんでした。検索や訪問履歴から場所を選べます。'));}} map={active?<MapPreview bridge={bridge} label="体験の場所を選ぶ地図" interactive/>:null} busy={placeBusy} error={placeError}/>;
 return <RecordComposer draft={state.draft} setDraft={changeDraft} place={state.place} step={state.step} onStep={step=>setState(previous=>({...previous,step}))} onBack={back} onChoosePlace={()=>setState(previous=>({...previous,returnStep:previous.step==='confirmation'?'confirmation':'editor',step:'place-picker',selected:previous.place}))} onFiles={addFiles} onRemove={remove} onMove={move} onSave={()=>void save()} busy={busy} error={error} notice={notice} onRetry={()=>void save()} sharingControl={sharing} savedLocationLocked={state.saveSession!==null||!!route.params.visitId}/>;
}
