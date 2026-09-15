import { useEffect, useId, useState, type ReactNode } from 'react';
import { routeMessages as m } from './messages';
import { RouteIcon } from './icons';
import type { Notice, RouteDraft, RouteMapView } from './types';

export function RouteNotice({ notice, role = 'alert' }: { notice?: Notice; role?: 'alert' | 'status' }) {
  if (!notice) return null;
  return <div className="routes-notice" role={role}><span>{notice.message}</span>{notice.retry && <button type="button" onClick={notice.retry}>{m.retry}</button>}</div>;
}

export function RouteMap({ view, className = '' }: { view: RouteMapView; className?: string }) {
  return <section className={`routes-map ${className}`} aria-label={view.summary}>
    {view.content ?? <div className="routes-map-fallback"><RouteIcon name="map"/><p>{view.unavailable?.message ?? m.mapLoading}</p>{view.unavailable?.retry && <button type="button" onClick={view.unavailable.retry}>{m.retry}</button>}</div>}
    <span className="routes-sr-only">{view.summary}</span>
  </section>;
}

export function RouteHeader({ eyebrow, title, children, onBack }: { eyebrow: string; title: string; children: ReactNode; onBack: () => void }) {
  return <header className="routes-header"><button className="routes-back" type="button" onClick={onBack} aria-label={m.back}><RouteIcon name="back"/><span>{eyebrow}</span></button><h2>{title}</h2><p>{children}</p></header>;
}

export function PlaceImage({ src, alt }: { src?: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (!src) return <span className="routes-place-image routes-place-image-fallback" role="img" aria-label={m.photoMissing}><RouteIcon name="pin"/><small>{m.photoMissing}</small></span>;
  if (failed) return <button className="routes-place-image routes-place-image-fallback" type="button" aria-label={m.photoUnavailable} onClick={() => setFailed(false)}><RouteIcon name="warning"/><small>{m.photoRetry}</small></button>;
  return <img className="routes-place-image" src={src} alt={alt} onError={() => setFailed(true)}/>;
}

export function TimeChoice({ label, value, unspecified, onChange, disabled }: { label: string; value: string; unspecified: string; onChange: (value: string) => void; disabled?: boolean }) {
  const id = useId();
  const [specifying, setSpecifying] = useState(Boolean(value));
  return <div className="routes-time-row"><span className="routes-icon-bubble"><RouteIcon name="clock"/></span><label htmlFor={id}>{label}</label><div className="routes-time-control"><select id={id} value={specifying ? 'specified' : 'unspecified'} onChange={e => { const specified = e.target.value === 'specified'; setSpecifying(specified); if (!specified) onChange(''); }} disabled={disabled}><option value="unspecified">{unspecified}</option><option value="specified">{m.specify}</option></select>{specifying && <input type="time" aria-label={label} value={value} onChange={e => onChange(e.target.value)} disabled={disabled}/>}</div></div>;
}

export function ConditionSummary({ draft }: { draft: RouteDraft }) {
  return <details className="routes-summary"><summary>{m.selectedConditions}</summary><ol>{draft.stops.map(s => <li key={s.key}>{s.place?.name ?? s.query ?? m.unnamed}</li>)}</ol><p>{m[draft.mode]} · {m.departure} {draft.departure || m.now} · {m.returnBy} {draft.returnBy || m.unspecified}</p>{draft.avoidStairs && <p>{m.stairs}</p>}{draft.preferCovered && <p>{m.covered}</p>}</details>;
}

export function duration(seconds: number | null, minimumMinutes = 1): string { return seconds == null ? m.unknownValue : `${Math.max(minimumMinutes, Math.round(seconds / 60))}分`; }
export function distance(metres: number | null): string { return metres == null ? m.unknownValue : metres >= 1000 ? `${(metres / 1000).toFixed(1)}km` : `${Math.round(metres)}m`; }
