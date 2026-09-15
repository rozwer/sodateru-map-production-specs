import { useEffect, useId, useRef, useState } from 'react';
import { suggestionMessages as m, timeChoices, modeChoices, companionChoices, effortChoices } from './messages';
import { SuggestionIcon as Icon } from './icons';
import type { CandidateView, CheckinForm, Notice } from './view-model';
import './suggestions.css';

export function FeatureHeader({title,onBack,children}: {title:string;onBack:()=>void;children?:React.ReactNode}) {
 return <header className="sg-feature-header"><button type="button" className="sg-header-back" aria-label="戻る" onClick={onBack}><Icon name="arrow"/></button><h1>{title}</h1><div className="sg-header-actions">{children}</div></header>;
}
export function Feedback({notice}: {notice?: Notice | null}) {
  if (!notice) return null;
  return <div className={`sg-notice sg-notice--${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}>{notice.text}{notice.retry && <button type="button" onClick={notice.retry}>{m.retry}</button>}</div>;
}
function Choices<K extends keyof CheckinForm>({field, title, icon, options, value, onChange, disabled}: {
  field: K; title: string; icon: string; options: readonly (readonly [string,string])[]; value: CheckinForm[K]; onChange: (key: K,value: CheckinForm[K])=>void; disabled?: boolean;
}) {
  const name=useId();
  return <fieldset className="sg-field sg-choice-field" disabled={disabled} data-testid={`self-checkin--${field === 'time' ? 'minutes' : field}`}><legend><Icon name={icon}/>{title}</legend><div className="sg-choices">{options.map(([key,label]) => <label key={key} className={value===key ? 'is-selected' : ''}><input type="radio" name={name} value={key} checked={value===key} onChange={()=>onChange(field,key as CheckinForm[K])}/><span>{label}</span></label>)}</div></fieldset>;
}
export function CheckinView({form,onChange,date,busy,notice,onSave,onSearch,onSkip,children}: {
 form: CheckinForm; onChange: <K extends keyof CheckinForm>(key: K,value:CheckinForm[K])=>void; date:string; busy:boolean; notice?:Notice|null;
 onSave:()=>void;onSearch:()=>void;onSkip:()=>void;children?:React.ReactNode;
}) {
 const inputId=useId();
 return <section className="sg-screen sg-checkin" aria-busy={busy}>
  <header className="sg-intro"><h2>{m.checkinTitle}</h2><p>{m.checkinLead}</p></header>
  <form className="sg-form" onSubmit={e=>{e.preventDefault();onSearch();}}>
   {(['state','wishes'] as const).map(field=><div className="sg-field" key={field}><label htmlFor={`${inputId}-${field}`}><Icon name={field==='state'?'heart':'chat'}/>{m[field]} <span>{m.optional}</span></label><div className="sg-input-wrap"><input id={`${inputId}-${field}`} data-testid={`self-checkin--${field}`} value={form[field]} placeholder={field==='state'?'今の気持ちを入力':'今日したいことを入力'} maxLength={field==='state'?10000:200} onChange={e=>onChange(field,e.target.value)} disabled={busy}/>{form[field] && <button type="button" aria-label={`${m[field]}を消す`} onClick={()=>onChange(field,'')} disabled={busy}>×</button>}</div></div>)}
   <Choices field="time" title={m.time} icon="clock" options={timeChoices} value={form.time} onChange={onChange} disabled={busy}/>
   <Choices field="mode" title={m.mode} icon="walk" options={modeChoices} value={form.mode} onChange={onChange} disabled={busy}/>
   <Choices field="companion" title={m.companion} icon="people" options={companionChoices} value={form.companion} onChange={onChange} disabled={busy}/>
   <Choices field="effort" title={m.effort} icon="shoe" options={effortChoices} value={form.effort} onChange={onChange} disabled={busy}/>
   {children}<Feedback notice={notice}/>
   <button type="submit" className="sg-primary" disabled={busy} data-testid="self-checkin--search"><Icon name="search"/>{busy?m.saving:m.search}<Icon name="arrow"/></button>
   <div className="sg-actions"><button type="button" onClick={onSave} disabled={busy} data-testid="self-checkin--save"><Icon name="memo"/>{m.saveOnly}</button><button type="button" onClick={onSkip} disabled={busy} data-testid="self-checkin--skip"><Icon name="book"/>{m.skip}</button></div>
   <small className="sg-date">{date} · 希望と条件は任意入力</small>
  </form>
 </section>;
}
export function ConditionChips({form}: {form:CheckinForm}) {
 const values=[{key:'wishes',value:form.wishes,icon:'chat'},...(['time','mode','companion','effort'] as const).map((key,i)=>({key,value:[timeChoices,modeChoices,companionChoices,effortChoices][i]!.find(v=>v[0]===form[key])?.[1] ?? (key==='mode'&&form.mode==='driving'?'車':''),icon:['clock','walk','people','shoe'][i]!}))].filter(v=>v.value);
 return <div className="sg-chips">{values.length?values.map(v=><span key={v.key}><Icon name={v.icon}/>{v.value}</span>):<span>希望条件の指定なし</span>}</div>;
}
function Photo({photo,allowRetry=false}: {photo?:CandidateView['photos'][number];allowRetry?:boolean}) {
 const [failed,setFailed]=useState(false);
 return photo&&!failed?<img src={photo.url} alt={photo.alt} onError={()=>setFailed(true)}/>:<div className="sg-photo-missing"><Icon name="cup"/><span>{m.photoMissing}</span>{failed&&allowRetry&&<button type="button" onClick={()=>setFailed(false)}>写真を再読込</button>}</div>;
}
function Tags({tags}: {tags:string[]}) {return <div className="sg-tags">{tags.map(tag=><span key={tag}>{tag}</span>)}</div>;}
export function SuggestionsView({form,items,sort,onSort,onConditions,onOpen,notice,busy,hasBatch,onMore,onPresented}: {
 form:CheckinForm; items:CandidateView[];sort:string;onSort:(value:string)=>void;onConditions:()=>void;onOpen:(id:string)=>void;
 notice?:Notice|null;busy:boolean;hasBatch:boolean;onMore?:()=>void;onPresented?:(id:string)=>void;
}) {
 const list=useRef<HTMLUListElement>(null);const presentedCallback=useRef(onPresented);presentedCallback.current=onPresented;
 useEffect(()=>{if(!list.current||!presentedCallback.current||!('IntersectionObserver' in window))return;const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){const id=(entry.target as HTMLElement).dataset.suggestionId;if(id)presentedCallback.current?.(id);observer.unobserve(entry.target);}},{threshold:.25});list.current.querySelectorAll('[data-suggestion-id]').forEach(node=>observer.observe(node));return()=>observer.disconnect();},[items.map(item=>item.id).join('|')]);
 return <section className="sg-screen sg-list" aria-busy={busy}>
  <header className="sg-intro"><h2>{m.listTitle}</h2><p>{items.length?m.listLead:busy?m.loading:hasBatch?'今日の条件に合う候補を確認します。':'今の状態や希望から、行き先を探せます。'}</p></header>
  <section className="sg-conditions"><div><strong>{m.conditions}</strong><button type="button" onClick={onConditions} data-testid="suggestions--conditions">{m.edit}<Icon name="arrow"/></button></div><ConditionChips form={form}/></section>
  <Feedback notice={notice}/>
  <div className="sg-list-toolbar"><span>{busy&&items.length===0?m.loading:notice?.kind==='error'&&items.length===0?'件数を確認できません':`${items.length}件の候補があります`}</span><select aria-label="並び順" value={sort} onChange={e=>onSort(e.target.value)} data-testid="suggestions--sort"><option value="recommended">おすすめ順</option><option value="shortest">合計時間が短い順</option></select></div>
  {!busy&&!notice&&items.length===0&&<div className="sg-empty"><p>{hasBatch?m.empty:m.noBatch}</p><button type="button" onClick={onConditions}>{m.change}</button></div>}
  <ul ref={list} className="sg-candidates">{items.map(item=><li key={item.id} data-suggestion-id={item.id}><button type="button" onClick={()=>onOpen(item.id)} className="sg-candidate" data-testid={`suggestions--candidate-${item.id}`}><div className="sg-card-photo"><Photo key={item.photos[0]?.url} photo={item.photos[0]}/><span className="sg-rating"><Icon name="star"/>{item.evaluation}</span></div><div className="sg-card-body"><h3>{item.title}<Icon name="arrow"/></h3><Tags tags={item.tags}/><p>{item.reason}</p><div className="sg-card-times"><span><Icon name="walk"/>{item.travel}</span><span><Icon name="clock"/>滞在{item.stay}</span><strong>合計 {item.total}</strong></div>{item.status&&<small className="sg-status">{item.status}</small>}</div></button></li>)}</ul>
  {onMore&&<button type="button" className="sg-load-more" disabled={busy} onClick={onMore}>続きを読み込む</button>}
 </section>;
}
export function SuggestionDetailView({item,busy,notice,onSelect,onLater,onDismiss,onBookmark,onShare,onMemo,onStop,onRoute,onVisit,children,selectDisabled,selectReason,showTools=true,memoEditor}: {
 item:CandidateView;busy:boolean;notice?:Notice|null;onSelect:()=>void;onLater:()=>void;onDismiss:()=>void;onBookmark:()=>void;onShare:()=>void;onMemo:(value:string)=>void;onStop:()=>void;onRoute:()=>void;onVisit:()=>void;children?:React.ReactNode;selectDisabled?:boolean;selectReason?:string;showTools?:boolean;memoEditor?:{open:boolean;value:string;onOpen:()=>void;onChange:(value:string)=>void;onClose:()=>void};
}) {
 const [photoIndex,setPhotoIndex]=useState(0);const [editing,setEditing]=useState(false);const [memo,setMemo]=useState(item.memo);const currentPhotoIndex=Math.min(photoIndex,Math.max(0,item.photos.length-1));
 return <section className="sg-screen sg-detail" aria-busy={busy}>
  {showTools&&<div className="sg-detail-tools"><button type="button" aria-label="共有する" onClick={onShare} disabled={busy} data-testid="suggestion-detail--share"><Icon name="share"/></button><button type="button" aria-label="しおり" aria-pressed={item.bookmarked} onClick={onBookmark} disabled={busy} data-testid="suggestion-detail--bookmark"><Icon name="heart"/></button></div>}
  <div className="sg-hero"><Photo key={item.photos[currentPhotoIndex]?.url} photo={item.photos[currentPhotoIndex]} allowRetry/>{item.photos.length>1&&<div className="sg-gallery-controls"><button type="button" aria-label="前の写真" onClick={()=>setPhotoIndex((currentPhotoIndex+item.photos.length-1)%item.photos.length)}>‹</button><span>{currentPhotoIndex+1} / {item.photos.length}</span><button type="button" aria-label="次の写真" onClick={()=>setPhotoIndex((currentPhotoIndex+1)%item.photos.length)}>›</button></div>}</div>
  <div className="sg-detail-content">{item.photos[currentPhotoIndex]&&<small className="sg-photo-credit">{item.photos[currentPhotoIndex].alt}</small>}<div className="sg-title-row"><h2>{item.title}</h2><span className="sg-evaluation"><Icon name="star"/>{item.evaluation}</span></div><Tags tags={item.tags}/>
   <section className="sg-reason"><Icon name="bulb"/><div><h3>{m.reason}</h3><p>{item.reason}</p></div></section>
   <blockquote className="sg-wish"><span aria-hidden="true">❝</span><div><small>{m.wishQuote}</small><p>{item.wishes||'今回の希望は未回答です。'}</p></div></blockquote>
   <h3 className="sg-time-title"><Icon name="clock"/>かかる時間の目安</h3><div className="sg-time-equation"><div><Icon name="walk"/><span><small>移動</small><strong>{item.travel}</strong></span></div><span>＋</span><div><Icon name="cup"/><span><small>滞在</small><strong>{item.stay}</strong></span></div><span>＝</span><div><span><small>合計</small><strong>{item.total}</strong></span></div></div>
   <div className="sg-facts"><section><h3>{m.confirmed}</h3><ul>{(item.confirmed.length?item.confirmed:['確認済み情報はまだありません']).map(text=><li key={text}><span className="sg-fact-icon">{item.confirmed.length?'✓':'?'}</span>{text}</li>)}</ul></section><section><h3>{m.unknown}</h3><ul>{(item.unknown.length?item.unknown:['追加の不明事項は報告されていません']).map(text=><li key={text}><span className="sg-fact-icon">?</span>{text}</li>)}</ul></section></div>
   <div className="sg-source"><strong>{m.source}</strong>{item.sourceUrl&&/^https?:\/\//.test(item.sourceUrl)?<a href={item.sourceUrl} target="_blank" rel="noreferrer"><Icon name="link"/>{item.sourceLabel||m.official} ↗</a>:<span>出典URLは未取得です</span>}</div>{item.fetchedAt&&<small className="sg-timestamp">情報確認：{item.fetchedAt}</small>}{item.expiresAt&&<small className="sg-timestamp">提案の有効期限：{item.expiresAt}</small>}
   <Feedback notice={notice}/>{item.status&&<p className="sg-status" role="status">{item.status}</p>}
  </div>
  <div className="sg-detail-actions">{selectReason&&<p className="sg-status">{selectReason}</p>}<button type="button" className="sg-primary" onClick={onSelect} disabled={busy||selectDisabled} data-testid="suggestion-detail--select"><span className="sg-check-disc"><Icon name="check"/></span>{m.select}</button><div className="sg-actions"><button type="button" onClick={onLater} disabled={busy} data-testid="suggestion-detail--later"><Icon name="bookmark"/>{m.later}</button><button type="button" onClick={()=>{if(memoEditor)memoEditor.onOpen();else{setMemo(item.memo);setEditing(true);}}} disabled={busy} data-testid="suggestion-detail--memo"><Icon name="memo"/>{m.memo}</button></div>
   {(memoEditor?.open??editing)&&<form className="sg-memo-editor" onSubmit={e=>{e.preventDefault();onMemo(memoEditor?.value??memo);}} onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();if(memoEditor)memoEditor.onClose();else setEditing(false);}}}><label>本人のメモ<textarea value={memoEditor?.value??memo} onChange={e=>memoEditor?memoEditor.onChange(e.target.value):setMemo(e.target.value)} maxLength={10000} disabled={busy}/></label><div className="sg-actions"><button type="submit" disabled={busy}>メモを保存</button><button type="button" onClick={()=>memoEditor?memoEditor.onClose():setEditing(false)}>閉じる</button></div></form>}
   <details className="sg-more"><summary>案内・訪問・その他の操作</summary><button type="button" onClick={onRoute} disabled={busy}>ここまでの経路を探す</button><button type="button" onClick={onVisit} disabled={busy}>訪問を確認する</button><button type="button" onClick={onDismiss} disabled={busy}>{m.dismiss}</button><button type="button" onClick={onStop} disabled={busy}>{m.stop}</button>{children}<p>選択や閲覧だけで訪問達成にはなりません。本人が確認した訪問を使います。</p></details>
  </div>
 </section>;
}
