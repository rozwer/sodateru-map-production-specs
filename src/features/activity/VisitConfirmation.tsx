import type { ReactNode } from 'react';
import type { PlaceChoice } from '../records/form-types';
import { PlaceCard, RecordHeading, RecordIcon, RecordNotice } from '../records/RecordParts';
import { activityMessages as m } from './messages';
import './activity.css';

export function VisitConfirmation({ place, date, time, duration, origin, status, onStatus, onSave, onBack, onPlace, onExpandMap, map, busy, error, notice, candidateOnly, onReload, current, extra }: {
 place: PlaceChoice | null; date: string; time: string; duration: string; origin: 'manual' | 'gps';
 status: 'confirmed'|'rejected'|'candidate'; onStatus: (status:'confirmed'|'rejected'|'candidate') => void;
 onSave: () => void; onBack: () => void; onPlace: () => void; onExpandMap: () => void; map: ReactNode;
 busy?: boolean; error?: string; notice?: string; candidateOnly?: boolean; onReload?: () => void; current?: string; extra?: ReactNode;
}) {
 return <section className="records-screen activity-visit"><RecordHeading title={m.visitTitle} onBack={onBack}/><div className="records-body">
   <div><h3 className="records-section-title">{m.visitHeading}</h3><p className="records-section-lead">{origin === 'gps' ? m.gpsSource : m.manualSource}</p></div>
   {error && <RecordNotice error retry={onReload}>{error}</RecordNotice>}{notice && <RecordNotice>{notice}</RecordNotice>}
   <section className="activity-visit-place"><PlaceCard place={place} onClick={onPlace}/><div className="activity-visit-date"><span><RecordIcon name="calendar"/>{date} {time}</span><span><RecordIcon name="clock"/>{duration}</span></div><div className="activity-visit-map">{map}<button type="button" className="activity-expand-map" aria-label="地図を拡大" onClick={onExpandMap}>↗</button></div>{origin === 'gps' && <p className="activity-nearby"><RecordIcon name="pin"/>{m.nearby}</p>}</section>
   {current && <p>{current}</p>}<fieldset className="activity-visit-choices" disabled={busy || candidateOnly}><legend className="activity-visually-hidden">訪問状態</legend>{(['confirmed','rejected','candidate'] as const).map(option => <label key={option} className={status === option ? 'is-selected' : ''}><input type="radio" name="visit-status" checked={status === option} onChange={() => onStatus(option)}/><RecordIcon name={option === 'confirmed' ? 'walk' : option === 'rejected' ? 'close' : 'help'}/><span><strong>{m[option]}</strong><small>{m[`${option}Help`]}</small></span><span className="records-choice-dot" aria-hidden="true"/></label>)}</fieldset>
   <button type="button" className="records-primary" disabled={busy || !place} onClick={onSave}>{busy ? '保存しています…' : candidateOnly ? '訪問候補として保存' : m.saveVisit}</button>
 {extra}</div></section>;
}
