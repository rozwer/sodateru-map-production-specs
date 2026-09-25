import { notifyGrowthChanged } from '../activity/growth-refresh';
import { useEffect, useRef, useState } from 'react';
import type { Person } from '../../../packages/api-client/index';
import type { ScreenProps } from '../../app/contracts';
import { useScreenState } from '../../app/useScreenState';
import { api } from '../../app/api';
import { RecordComposer } from './RecordComposer';
import { RecordHeading, RecordIcon, RecordNotice } from './RecordParts';
import { blankDraft, type RecordDraft } from './form-types';
import { useRecordDetail } from './record-hooks';
import { createEditSession, draftFromRecord, errorText, saveEditedRecord, type EditSession } from './record-flow';

interface EditState {draft:RecordDraft; initialized:string|null; session:EditSession|null; current?:EditSession['record'];dirty:boolean}
export function EditRecordScreen({route,scopeKey,back,navigate,active=true}:ScreenProps & {active?:boolean}) {
 const recordId=route.params.recordId;
 const loaded=useRecordDetail(recordId,scopeKey,active);
 const [state,setState]=useScreenState<EditState>(()=>({draft:blankDraft(),initialized:null,session:null,dirty:false}));
 const [busy,setBusy]=useState(false), [error,setError]=useState(''), [notice,setNotice]=useState('');
 const [people,setPeople]=useState<Person[]>([]), [peopleError,setPeopleError]=useState('');
 const submitting=useRef(false), controller=useRef<AbortController|null>(null);
 useEffect(()=>()=>controller.current?.abort(),[scopeKey]);
 useEffect(()=>{if(!active)controller.current?.abort();},[active]);
 useEffect(()=>{
  if(state.draft.visibility!=='selected'||!active)return;
  const abort=new AbortController();setPeopleError('');
  void api.request('getPeople',{query:{limit:100},signal:abort.signal}).then(page=>{if(!abort.signal.aborted)setPeople(page.items);}).catch(cause=>{if(!abort.signal.aborted)setPeopleError(errorText(cause));});
  return()=>abort.abort();
 },[state.draft.visibility,scopeKey,active]);
 useEffect(()=>{
  if(!loaded.detail)return;
  if(state.initialized===recordId && state.dirty){setState(previous=>({...previous,current:loaded.detail!.record,session:null}));setNotice(`現在の保存内容（版 ${loaded.detail.record.version}）：${loaded.detail.record.body} ／ 用途：${loaded.detail.record.purposes.join('・') || '未指定'}。編集中の入力は保持しています。`);return;}
  if(loaded.detail.media.status==='failed'){setError('媒体一覧を取得できませんでした。読み直してから編集してください。');return;}
  setState({draft:draftFromRecord(loaded.detail.record,loaded.detail.media.data.items),initialized:recordId!,session:null,current:loaded.detail.record,dirty:false});
 },[loaded.detail,recordId]);
 const update=(draft:RecordDraft)=>{setState(previous=>({...previous,draft,current:previous.session?.record??previous.current,session:null,dirty:true}));setError('');setNotice('');};
 const files=(files:File[])=>update({...state.draft,media:[...state.draft.media,...files.slice(0,100-state.draft.media.length).map((file,index)=>({id:crypto.randomUUID(),file,url:URL.createObjectURL(file),kind:file.type.startsWith('image/')?'photo' as const:'video' as const,name:file.name,position:state.draft.media.length+index,state:'draft' as const}))]});
 const remove=(id:string)=>{
  const item=state.draft.media.find(item=>item.id===id);if(!item)return;
  if(item.file&&item.url)URL.revokeObjectURL(item.url);
  update({...state.draft,media:state.draft.media.filter(item=>item.id!==id).map((item,position)=>({...item,position})),removedMedia:item.version?[...state.draft.removedMedia,{id,version:item.version}]:state.draft.removedMedia});
 };
 const move=(id:string,direction:-1|1)=>{
  const items=[...state.draft.media],index=items.findIndex(item=>item.id===id),target=index+direction;
  if(index<0||target<0||target>=items.length)return;
  [items[index],items[target]]=[items[target]!,items[index]!];update({...state.draft,media:items.map((item,position)=>({...item,position}))});
 };
 const discard=()=>{
  setState({draft:blankDraft(),initialized:null,session:null,dirty:false});
  setError('');setNotice('');back();
 };
 const save=async()=>{
  if(!loaded.detail||submitting.current)return;
  const original=state.current??loaded.detail.record;
  submitting.current=true;setBusy(true);setError('');setNotice('');const abort=new AbortController();controller.current=abort;
  try{
   const session=state.session??createEditSession(original,state.draft);setState(previous=>({...previous,session}));
   const saved=await saveEditedRecord(api,session,progress=>{
    if(abort.signal.aborted)return;
    setState(previous=>({...previous,draft:{...previous.draft,media:progress.media}}));
    setNotice(progress.stage==='media'?'本文を保存しました。媒体を処理しています。':'');
   },abort.signal,()=>notifyGrowthChanged(scopeKey));
   if(abort.signal.aborted)return;
   setNotice('変更を保存しました。');setState(previous=>({...previous,initialized:null,session:null,dirty:false}));
   if(route.params.returnPage==='daily-track')navigate('daily-track',{date:state.draft.date||route.params.date||new Date().toLocaleDateString('sv-SE'),timeZone:route.params.timeZone||Intl.DateTimeFormat().resolvedOptions().timeZone,recordId:saved.id,includeUndated:saved.effectiveStartedAt===null?'true':'false'});
   else back();
  }catch(error){if(!abort.signal.aborted){setNotice('');setError(errorText(error));}}
  finally{submitting.current=false;setBusy(false);}
 };
 if(!recordId)return <section className="records-screen"><RecordHeading title="体験を編集" onBack={back}/><RecordNotice error>編集する記録が指定されていません。</RecordNotice></section>;
 if(!loaded.detail || !state.initialized)return <section className="records-screen"><RecordHeading title="体験を編集" onBack={back}/><div className="records-body"><RecordNotice error={!!loaded.error} retry={loaded.error?loaded.reload:undefined}>{loaded.error||'記録を読み込んでいます…'}</RecordNotice></div></section>;
 const sharing=<div className="records-share-people">{peopleError&&<RecordNotice error>{peopleError}</RecordNotice>}{people.length===0&&!peopleError&&<p>共有する友達がいません。</p>}{people.map(person=><label key={person.id}><input type="checkbox" checked={state.draft.sharedWith.includes(person.id)} onChange={event=>update({...state.draft,sharedWith:event.target.checked?[...state.draft.sharedWith,person.id]:state.draft.sharedWith.filter(id=>id!==person.id)})}/>{person.name}</label>)}</div>;
 return <RecordComposer draft={state.draft} setDraft={update} place={loaded.place} step="editor" onStep={()=>{}} editing onBack={discard} onChoosePlace={()=>{}} onFiles={files} onRemove={remove} onMove={move} onSave={()=>void save()} onRetry={()=>void save()} onReload={()=>{setState(previous=>({...previous,session:null,current:undefined}));loaded.reload();}} busy={busy} error={error||loaded.error} notice={notice} sharingControl={sharing} editingActions={<nav aria-label="記録と訪問の操作"><button type="button" className="records-detail-row" onClick={()=>navigate('interpretation-correction',{recordId})}>用途を訂正する</button>{loaded.detail.record.visitId && <button type="button" className="records-detail-row" onClick={()=>navigate('visit-confirm',{visitId:loaded.detail!.record.visitId!})}>訪問の確認・取消・場所訂正</button>}<button type="button" className="records-detail-row" onClick={()=>navigate('growth-result',{recordId})}>現在の地図の成長を見る</button><button type="button" className="records-text-button" onClick={()=>navigate('record-delete',{recordId})}>記録の削除を確認する</button></nav>} moodControl={<label className="records-input-label">気分<span className="records-inline-input"><RecordIcon name="smile"/><select aria-label="気分" disabled><option>未取得</option></select></span></label>}/>;
}
