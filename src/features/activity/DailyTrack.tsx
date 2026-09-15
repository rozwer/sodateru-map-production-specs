import { useState, type ReactNode } from 'react';
import type { MediaDraft } from '../records/form-types';
import { MediaGallery, RecordHeading, RecordIcon, RecordNotice } from '../records/RecordParts';
import { activityMessages as m } from './messages';
import './activity.css';
import { MediaContent } from '../records/MediaContent';

export type TimelineEntry = {
 id: string; recordId?: string; visitId?: string; name: string; time: string; duration: string;
 body?: string; media: MediaDraft[]; mood?: string | null;
 status: 'confirmed' | 'candidate' | 'rejected' | 'record';
 /** True only when a recorded segment connects these items; missing positions stay unconnected. */
 connectedToNext: boolean;
 color?: string; undated?: boolean; mapNumber?:number;
};

export function shiftDay(date: string, amount: number): string {
 const next = new Date(`${date}T12:00:00Z`); next.setUTCDate(next.getUTCDate() + amount); return next.toISOString().slice(0,10);
}
export function formatDay(date: string): string {
 return new Intl.DateTimeFormat('ja-JP',{month:'long',day:'numeric',weekday:'short',timeZone:'UTC'}).format(new Date(`${date}T12:00:00Z`));
}

export function DailyTrack({ date, onDate, entries, expandedId, onExpand, onEdit, onReflect, onVisit, onBack, onMenu, onRecord, map, loading, error, onRetry, onMore, confirmedPlaces, duration, missingTrack, calendar = false, onCalendar, recordedDates, onMonth, onFitTrack, trackTimes }: {
 date: string; onDate:(date:string)=>void; entries:TimelineEntry[]; expandedId:string|null; onExpand:(id:string)=>void;
 onEdit:(id:string)=>void; onReflect:(id:string)=>void; onVisit:(id:string)=>void; onBack:()=>void; onMenu:()=>void; onRecord:()=>void;
 map:ReactNode; loading?:boolean; error?:string; onRetry:()=>void; onMore?:()=>void;
 onFitTrack?:()=>void; trackTimes?:{start:string;end:string};
 confirmedPlaces:number; duration:string; missingTrack:boolean; calendar?:boolean; onCalendar:(open:boolean)=>void; recordedDates:Set<string>; onMonth?:(month:string)=>void;
}) {
 const [month,setMonth] = useState(date.slice(0,7));
 const [menuOpen,setMenuOpen]=useState(false);
 const first = new Date(`${month}-01T12:00:00Z`);
 const days = new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate();
 const changeMonth = (offset:number) => { const next = new Date(first);next.setUTCMonth(next.getUTCMonth()+offset);const nextMonth=next.toISOString().slice(0,7);setMonth(nextMonth);onMonth?.(nextMonth); };
 const selectedEntry = entries.find(entry=>entry.id===expandedId);
 return <section className={`records-screen activity-daily ${calendar ? 'activity-calendar-screen' : ''}`}>
   {calendar ? <RecordHeading title={m.dailyTitle} onBack={onBack} end={<button type="button" className="records-icon-button" aria-label="メニュー" aria-expanded={menuOpen} onClick={()=>setMenuOpen(!menuOpen)}><RecordIcon name="more"/></button>}/> : <header className="activity-daily-heading"><button type="button" className="records-icon-button" aria-label="戻る" onClick={onBack}><RecordIcon name="back"/></button><h2>{m.dailyTitle}</h2><button type="button" className="records-icon-button" aria-label="メニュー" onClick={onMenu}><RecordIcon name="menu"/></button></header>}
   {calendar && menuOpen && <div className="activity-calendar-menu" role="menu"><button type="button" role="menuitem" onClick={()=>{setMenuOpen(false);onCalendar(false);}}>この日の軌跡を見る</button><button type="button" role="menuitem" onClick={()=>{setMenuOpen(false);onRecord();}}>体験を残す</button></div>}
   {calendar && <p className="records-lead">{m.byDate}</p>}
   {!calendar && <div className="activity-track-map">{map}
     <div className="activity-map-caption"><span>{missingTrack?'立ち寄った場所':'一日の移動'}</span>{onFitTrack&&<button type="button" onClick={onFitTrack} aria-label="軌跡全体を表示"><RecordIcon name="map"/>全体を見る</button>}</div>
     {trackTimes?.start&&<div className="activity-route-endpoints"><span><i/>{missingTrack?'最初の記録':'出発'} <b>{trackTimes.start}</b></span><span aria-hidden="true">→</span><span><i/>{missingTrack?'最後の記録':'到着'} <b>{trackTimes.end}</b></span></div>}
   </div>}
   <div className="activity-track-sheet">
     {!calendar && <><div className="activity-sheet-handle"/><div className="activity-day-row"><button type="button" className="records-icon-button" aria-label={m.previousDay} onClick={()=>onDate(shiftDay(date,-1))}><RecordIcon name="back"/></button><button type="button" className="activity-day-select" onClick={()=>{setMonth(date.slice(0,7));onCalendar(true);}}>{formatDay(date)}</button><button type="button" className="records-icon-button" aria-label={m.nextDay} onClick={()=>onDate(shiftDay(date,1))}><RecordIcon name="next"/></button><span>{confirmedPlaces}か所{duration && `・${duration}`}</span></div><div className="activity-track-legend">{!missingTrack&&<span><i className="activity-track-line"/>移動の軌跡</span>}<span><i className="activity-stop-number">1</i>立ち寄り順</span><small>地点をタップして最初の記録を見る</small></div></>}
     {calendar && <section className="activity-calendar"><div className="activity-month-row"><button type="button" className="records-icon-button" aria-label={m.previousMonth} onClick={()=>changeMonth(-1)}><RecordIcon name="back"/></button><h3>{first.getUTCFullYear()}年{first.getUTCMonth()+1}月</h3><button type="button" className="records-icon-button" aria-label={m.nextMonth} onClick={()=>changeMonth(1)}><RecordIcon name="next"/></button></div><div className="activity-calendar-grid" role="group" aria-label="日付を選択">{'日月火水木金土'.split('').map(day=><span className="activity-weekday" key={day}>{day}</span>)}{Array.from({length:first.getUTCDay()},(_,index)=><span key={`blank-${index}`} />)}{Array.from({length:days},(_,index)=>{const key=`${month}-${String(index+1).padStart(2,'0')}`;return <button type="button" key={key} aria-label={`${key}${recordedDates.has(key) ? ' 記録あり' : ''}`} aria-pressed={key===date} onClick={()=>onDate(key)}><span>{index+1}</span>{recordedDates.has(key)&&<i/>}</button>;})}</div></section>}
     {loading && <RecordNotice>この日の記録を読み込んでいます…</RecordNotice>}{error && <RecordNotice error retry={onRetry}>{error}</RecordNotice>}
     {calendar && <div className="activity-records-heading"><h3>{formatDay(date)}の記録</h3><span>{entries.filter(item=>item.recordId).length}件</span></div>}
     {!calendar && missingTrack && <p className="activity-missing-track"><RecordIcon name="info"/>立ち寄った場所を表示しています。移動経路は未記録です。</p>}
     {!loading && entries.length===0 && <div className="activity-empty"><p>{m.noRecords}</p><button type="button" className="records-outline" onClick={onRecord}>{m.newRecord}</button></div>}
     <ol className={`activity-timeline ${calendar ? 'activity-calendar-records' : ''}`}>
       {entries.map(entry => <li key={entry.id} className={`${entry.connectedToNext ? 'is-connected' : ''} ${entry.id===expandedId ? 'is-expanded' : ''}`} style={{'--entry-color':entry.color ?? '#50bdb7'} as React.CSSProperties}>
         {!calendar && <div className="activity-timeline-time"><time>{entry.time || m.noTime}</time>{entry.mapNumber?<i className="activity-stop-number">{entry.mapNumber}</i>:<i className="activity-unplaced-dot"/>}</div>}
         <article className={`activity-timeline-card activity-status-${entry.status}`}>
           <button type="button" className="activity-entry-toggle" onClick={()=>onExpand(entry.id)} aria-expanded={expandedId===entry.id}>
             {calendar && <div className="records-place-photo">{entry.media.find(media=>media.kind==='photo' && media.url)?.url ? <MediaContent item={entry.media.find(media=>media.kind==='photo' && media.url)!} photoOnly/> : <RecordIcon name="document"/>}</div>}
             <span><strong>{entry.name || m.noPlace}</strong>{calendar ? <small>{entry.time || m.noTime}</small> : entry.duration && <small><RecordIcon name="clock"/>{entry.duration}</small>}{entry.undated && <small>日時未指定の記録</small>}{entry.status!=='record' && entry.status!=='confirmed' && <small className="activity-visit-state">{entry.status==='candidate' ? '訪問は確認待ち' : '行っていない'}</small>}</span><RecordIcon name="next"/>
           </button>
           {expandedId===entry.id && <div className="activity-entry-detail">
             {entry.media.length>0 && <MediaGallery items={entry.media}/>}
             {entry.body && <p className="activity-entry-body">{entry.body}</p>}
             {entry.mood && <p className="activity-mood"><RecordIcon name="smile"/>{m.mood}<strong>{entry.mood}</strong></p>}
             {entry.recordId && <><button type="button" className="records-primary" onClick={()=>onEdit(entry.recordId!)}><RecordIcon name="edit"/>{m.edit}</button><button type="button" className="records-outline" onClick={()=>onReflect(entry.recordId!)}><RecordIcon name="book"/>{m.reflect}</button></>}
             {entry.visitId && <button type="button" className="records-text-button" onClick={()=>onVisit(entry.visitId!)}>訪問の確認・訂正</button>}
           </div>}
         </article>
       </li>)}
     </ol>
     {onMore && <button type="button" className="records-text-button" onClick={onMore} disabled={loading}>さらに表示</button>}
     {calendar && <button type="button" className="records-primary" onClick={()=>onCalendar(false)}><RecordIcon name="map"/>{m.showTrack}</button>}
     {!calendar && selectedEntry && <span className="activity-visually-hidden" aria-live="polite">{selectedEntry.name}を表示中</span>}
   </div>
 </section>;
}
