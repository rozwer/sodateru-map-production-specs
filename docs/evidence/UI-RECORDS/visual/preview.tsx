import React, { useState, useLayoutEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { RecordComposer } from '../../../../src/features/records/RecordComposer';
import { RecordCorrection } from '../../../../src/features/records/RecordCorrection';
import { RecordDelete } from '../../../../src/features/records/RecordDelete';
import { PlacePicker } from '../../../../src/features/records/PlacePicker';
import { VisitConfirmation } from '../../../../src/features/activity/VisitConfirmation';
import { GrowthResult } from '../../../../src/features/activity/GrowthResult';
import { DailyTrack } from '../../../../src/features/activity/DailyTrack';
import { RecordIcon } from '../../../../src/features/records/RecordParts';
import { blankDraft, type PlaceChoice, type RecordDraft } from '../../../../src/features/records/form-types';
import './preview.css';

// Independent media; the UI reference sheets are never used as product assets.
const photo='https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&auto=format&fit=crop&q=85';
const place:PlaceChoice={id:'visual-place',name:'カフェ でひと息',address:'本山',longitude:136.9638,latitude:35.1668,source:'saved',photoUrl:photo};
const initial:RecordDraft={...blankDraft(),body:'静かな席で読書しました',impression:'落ち着けた',purposes:['読書','休憩'],date:'2026-09-15',startTime:'09:30',endTime:'10:30',timePrecision:'exact',bookmarked:true,media:[{id:'visual-media',name:'カフェの写真',url:photo,kind:'photo',position:0,state:'draft'}]};
const map=<div className="visual-map-pending">共通Mapboxの接続待ち</div>;
function Preview(){
 const screen=new URLSearchParams(location.search).get('screen')??'record-create';
 const [draft,setDraft]=useState(()=>screen==='record-create'||screen==='confirmation'?{...initial,media:[...initial.media,{id:'visual-video',name:'表示確認用の動画',url:'./sample-video.mp4',kind:'video' as const,position:1,state:'draft' as const}]}:initial);
 const [step,setStep]=useState<'editor'|'confirmation'>(screen==='confirmation'?'confirmation':'editor');
 const [status,setStatus]=useState<'confirmed'|'candidate'|'rejected'>('rejected');
 const [selected,setSelected]=useState<PlaceChoice|null>(place);
 const [query,setQuery]=useState('本山 カフェ');
 const [mode,setMode]=useState<'map'|'search'|'history'>('map');
 const [date,setDate]=useState('2026-09-15');
 const [expanded,setExpanded]=useState<string|null>(screen==='calendar'?null:'visual-record');
 const [calendar,setCalendar]=useState(screen==='calendar');
 const [reason,setReason]=useState('落ち着ける席があったから');
 const [notice,setNotice]=useState('');
 useLayoutEffect(()=>{if(new URLSearchParams(location.search).get('text')!=='200')return;const sizes=[...document.querySelectorAll<HTMLElement>('main *')].filter(node=>node.namespaceURI==='http://www.w3.org/1999/xhtml').map(node=>[node,parseFloat(getComputedStyle(node).fontSize)] as const);for(const [node,size] of sizes)node.style.fontSize=`${size*2}px`;},[]);
 const noSave=()=>setNotice('表示確認用です。保存APIは呼び出していません。');
 const onBack=()=>history.back();
 const fields={draft,setDraft,place:selected,step,onStep:setStep,onBack,onChoosePlace:()=>{location.search='?screen=place-picker'},onFiles:(files:File[])=>setDraft(previous=>({...previous,media:[...previous.media,...files.map((file,index)=>({id:crypto.randomUUID(),file,url:URL.createObjectURL(file),kind:file.type.startsWith('image/')?'photo' as const:'video' as const,name:file.name,position:previous.media.length+index,state:'draft' as const}))]})),onRemove:(id:string)=>setDraft(previous=>({...previous,media:previous.media.filter(item=>item.id!==id)})),onMove:()=>{},onSave:noSave,notice,
 moodControl:<label className="records-input-label">気分<span className="records-inline-input"><RecordIcon name="smile"/><select defaultValue="落ち着いた"><option>落ち着いた</option><option>おだやか</option></select></span></label>};
 let content;
 if(screen==='record-create'||screen==='confirmation'||screen==='record-edit')content=<RecordComposer {...fields} editing={screen==='record-edit'}/>;
 else if(screen==='place-picker')content=<PlacePicker mode={mode} onMode={setMode} query={query} onQuery={setQuery} onSearch={()=>{}} items={[place,{...place,id:'visual-place-2',name:'喫茶 木の葉'},{...place,id:'visual-place-3',name:'ブックカフェ こもれび'}]} selected={selected} onSelect={setSelected} onUse={onBack} onBack={onBack} onLocate={()=>{}} map={map}/>;
 else if(screen==='visit-confirm')content=<VisitConfirmation place={place} date="9月15日（火）" time="9:30 ～ 10:30" duration="約1時間" origin="gps" status={status} onStatus={setStatus} onSave={noSave} onBack={onBack} onPlace={()=>{}} onExpandMap={()=>{}} map={map} notice={notice}/>;
 else if(screen==='interpretation-correction')content=<RecordCorrection body={draft.body} date="9月15日" interpretation={'にぎやかな交流の場\n\nカフェは一般的に、人と会話したり交流したりする場所として利用されることが多いと考えられます。'} purposes={draft.purposes} onPurposes={value=>setDraft({...draft,purposes:value})} reason={reason} onReason={setReason} onSavePurpose={noSave} onSaveReason={noSave} onBack={onBack} notice={notice}/>;
 else if(screen==='record-delete')content=<RecordDelete place={place} date="2026/9/15" onBack={onBack} onExport={noSave} onDelete={noSave} notice={notice}/>;
 else if(screen==='growth-result')content=<GrowthResult place={place} body={draft.body} purposes={draft.purposes} visitCount={1} preview={map} onBack={onBack} onOriginal={()=>{}} onNext={()=>{}} onMap={()=>{}}/>;
 else content=<DailyTrack date={date} onDate={setDate} entries={[...(!calendar?[{id:'visual-station',visitId:'visual-station',name:'本山駅',time:'09:00',duration:'15分',media:[],status:'confirmed' as const,connectedToNext:true}]:[]),{id:'visual-record',recordId:'visual-record',visitId:'visual-visit',name:place.name,time:'09:30',duration:'60分',body:'窓際でゆっくり考えられた。\n久しぶりに、これからのことを整理できた気がする。コーヒーもおいしくて、いい時間だった。',mood:'おだやか',media:draft.media,status:'confirmed',connectedToNext:true,color:'#ff6683'}, {id:'visual-bookstore',recordId:'visual-bookstore',name:'書店',time:'11:00',duration:'45分',media:draft.media,status:'confirmed',connectedToNext:true,color:'#37b9ed'}, {id:'visual-park',recordId:'visual-park',name:'公園でひと休み',time:'12:00',duration:'30分',media:draft.media,status:'confirmed',connectedToNext:!calendar,color:'#53cb77'},...(!calendar?[{id:'visual-lunch',visitId:'visual-lunch',name:'ランチ',time:'13:00',duration:'50分',media:[],status:'confirmed' as const,connectedToNext:false,color:'#eec158'}]:[])]} expandedId={expanded} onExpand={id=>setExpanded(expanded===id?null:id)} onEdit={()=>{location.search='?screen=record-edit'}} onReflect={()=>{}} onVisit={()=>{location.search='?screen=visit-confirm'}} onBack={onBack} onMenu={()=>{}} onRecord={()=>{}} map={map} onRetry={()=>{}} confirmedPlaces={5} duration="4時間" missingTrack={false} calendar={calendar} onCalendar={setCalendar} recordedDates={new Set(['2026-09-15'])}/>;
 return <><aside className="visual-label">表示確認用テストデータ · 保存通信なし</aside><main>{content}</main></>;
}
createRoot(document.getElementById('root')!).render(<Preview/>);
