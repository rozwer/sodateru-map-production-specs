import { useRef, type ReactNode } from 'react';
import { recordMessages as m, purposeOptions } from './messages';
import type { MediaDraft, PlaceChoice } from './form-types';
import './records.css';
import { MediaContent } from './MediaContent';

const shapes = {
  back: <path d="m14 5-7 7 7 7" />,
  next: <path d="m9 5 7 7-7 7" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  edit: <><path d="m15 4 5 5M4 20l5-1L20 8a2 2 0 0 0-5-5L4 14v6Z" /><path d="M12 20h8" /></>,
  pin: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
  camera: <><path d="M8 5 9 3h6l1 2h4v15H4V5h4Z" /><circle cx="12" cy="12" r="4" /></>,
  image: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="m3 17 6-6 4 4 3-3 5 5" /><circle cx="15" cy="8" r="1" /></>,
  calendar: <><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M7 3v5M17 3v5M4 11h16" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 6v6l4 2" /></>,
  book: <><path d="M12 5C8 2 4 3 2 4v15c4-2 7-1 10 1 3-2 6-3 10-1V4c-3-1-7-2-10 1v15" /></>,
  cup: <><path d="M3 4h13v8a6 6 0 0 1-12 0V4ZM16 5h2a4 4 0 0 1 0 8h-2M2 21h18" /></>,
  meal: <><path d="M5 3v7m-3-7v5a3 3 0 0 0 6 0V3M5 11v10M18 3v18m0-18c-5 3-5 10 0 10" /></>,
  work: <><rect x="4" y="4" width="16" height="13" rx="1" /><path d="M2 21h20M8 17v4m8-4v4" /></>,
  walk: <><circle cx="14" cy="4" r="2" /><path d="m9 9 4-2 4 4 4 1M12 8l-2 6 4 2 2 6M10 14l-4 7M8 8l-3 5" /></>,
  more: <><circle cx="4" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="20" cy="12" r="1" /></>,
  smile: <><circle cx="12" cy="12" r="9" /><path d="M8 15c2 3 6 3 8 0M8 9h.01M16 9h.01" /></>,
  bookmark: <path d="M5 3h14v19l-7-5-7 5V3Z" />,
  document: <><path d="M5 3h9l5 5v13H5V3Zm9 0v6h5M8 13h8M8 17h8" /></>,
  lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V6a4 4 0 0 1 8 0v4M12 14v3" /></>,
  people: <><circle cx="9" cy="7" r="3" /><path d="M2 21v-3a7 7 0 0 1 14 0v3M17 4a3 3 0 0 1 0 6M20 21v-3a6 6 0 0 0-3-5" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><path d="M3 12h18" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7h.01" /></>,
  search: <><circle cx="10" cy="10" r="7" /><path d="m15 15 6 6" /></>,
  map: <path d="m2 5 7-3 6 3 7-3v17l-7 3-6-3-7 3V5Zm7-3v17m6-14v17" />,
  locate: <><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2" /><path d="M12 1v4m0 14v4M1 12h4m14 0h4" /></>,
  check: <path d="m5 12 4 4L20 5" />,
  trash: <><path d="M3 6h18M9 6V3h6v3M6 6v15h12V6M10 10v7m4-7v7" /></>,
  download: <><path d="M5 3h9l5 5v6M14 3v5h5M5 3v18h5M17 12v9m-4-4 4 4 4-4" /></>,
  spark: <path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z" />,
  tag: <><path d="m2 13 11-11h8v8L10 21 2 13Z" /><circle cx="17" cy="6" r="1" /></>,
  quote: <path d="M3 12h5v8H2v-8c0-5 2-8 6-9M15 12h5v8h-6v-8c0-5 2-8 6-9" />,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9 8a3 3 0 0 1 6 0c0 3-3 2-3 5M12 17h.01" /></>,
  leaf: <><path d="M4 21C4 10 10 3 21 3c0 12-5 17-13 14M4 21 16 9" /></>,
  menu: <path d="M4 5h16M4 12h16M4 19h16" />,
} satisfies Record<string, ReactNode>;

export type RecordIconName = keyof typeof shapes;
export function RecordIcon({ name, className = '' }: { name: RecordIconName; className?: string }) {
  return <svg className={`records-icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{shapes[name]}</svg>;
}

export function RecordHeading({ title, onBack, close, end }: { title: string; onBack: () => void; close?: boolean; end?: ReactNode }) {
  return <header className="records-heading"><button type="button" className="records-icon-button" aria-label={close ? m.close : m.back} onClick={onBack}><RecordIcon name={close ? 'close' : 'back'} /></button><h2>{title}</h2><div className="records-heading-end">{end}</div></header>;
}

export function RecordNotice({ children, retry, error = false }: { children: ReactNode; retry?: () => void; error?: boolean }) {
  return <div className={`records-notice ${error ? 'records-notice-error' : ''}`} role={error ? 'alert' : 'status'}><RecordIcon name="info" /><div>{children}{retry && <button type="button" className="records-text-button" onClick={retry}>{m.retry}</button>}</div></div>;
}

export function PlaceCard({ place, detail, onClick }: { place: PlaceChoice | null; detail?: ReactNode; onClick?: () => void }) {
  const content = <><div className="records-place-photo">{place?.photoUrl ? <MediaContent item={{id:place.photoMediaId??place.id,version:place.photoMediaVersion,url:place.photoUrl,kind:'photo',name:'場所の写真',position:0,state:'ready'}} photoOnly/> : <RecordIcon name="pin" />}</div><div className="records-place-copy"><strong>{place?.name ?? m.noPlace}</strong>{place?.address && <p><RecordIcon name="pin" />{place.address}</p>}{detail}</div>{onClick && <RecordIcon name="next" />}</>;
  return onClick ? <button type="button" className="records-place-card" onClick={onClick}>{content}</button> : <div className="records-place-card">{content}</div>;
}

export function MediaGallery({ items, onRemove, onMove, compact = false }: { items: MediaDraft[]; onRemove?: (id: string) => void; onMove?: (id: string, direction: -1 | 1) => void; compact?: boolean }) {
  return <div className={`records-media ${compact ? 'records-media-compact' : ''}`}>
    {items.length === 0 && <div className="records-media-empty"><RecordIcon name="image" /><span>{m.emptyMedia}</span></div>}
    {items.map((item, index) => <figure className={`records-media-item records-media-${item.state}`} key={item.id}>
      {item.url ? <MediaContent item={item}/> : <div className="records-media-unavailable"><RecordIcon name="image" />{m.mediaUnavailable}</div>}
      {onRemove && <button type="button" className="records-media-remove" aria-label={`${item.kind === 'photo' ? '写真' : '動画'}を外す：${item.name}`} onClick={() => onRemove(item.id)}><RecordIcon name="close" /></button>}
      {onMove && items.length > 1 && <div className="records-media-order"><button type="button" disabled={index === 0} aria-label={`${item.name}を前へ`} onClick={() => onMove(item.id, -1)}>←</button><button type="button" disabled={index === items.length - 1} aria-label={`${item.name}を後へ`} onClick={() => onMove(item.id, 1)}>→</button></div>}
      {(item.state === 'pending' || item.state === 'failed') && <figcaption>{item.state === 'pending' ? '保存中…' : item.error ?? '保存できませんでした'}</figcaption>}
    </figure>)}
  </div>;
}

export function MediaPicker({ onFiles, disabled, compact }: { onFiles: (files: File[]) => void; disabled?: boolean; compact?: boolean }) {
  const camera = useRef<HTMLInputElement>(null);
  const files = useRef<HTMLInputElement>(null);
  const accept = 'image/jpeg,image/png,image/webp,video/mp4';
  return <div className={`records-media-picker ${compact ? 'records-media-picker-compact' : ''}`}>
    <input ref={camera} type="file" accept={accept} capture="environment" hidden onChange={event => { onFiles(Array.from(event.currentTarget.files ?? [])); event.currentTarget.value = ''; }} />
    <input ref={files} type="file" accept={accept} multiple hidden onChange={event => { onFiles(Array.from(event.currentTarget.files ?? [])); event.currentTarget.value = ''; }} />
    {!compact && <button type="button" disabled={disabled} onClick={() => camera.current?.click()}><RecordIcon name="camera" />{m.capture}</button>}
    <button type="button" disabled={disabled} onClick={() => files.current?.click()}><RecordIcon name={compact ? 'camera' : 'image'} />{compact ? m.addPhoto : m.chooseMedia}</button>
  </div>;
}

export function PurposesInput({ value, onChange, disabled }: { value: string[]; onChange: (value: string[]) => void; disabled?: boolean }) {
  const options = [...purposeOptions, ...value.filter(v => !purposeOptions.some(option => option.value === v)).map(v => ({value: v, icon: 'tag' as const}))];
  return <fieldset className="records-purposes" disabled={disabled}><legend>{m.purposes} <span>（{m.multiple}）</span></legend><div>{options.map(option => <label className={value.includes(option.value) ? 'is-selected' : ''} key={option.value}><input type="checkbox" checked={value.includes(option.value)} onChange={() => onChange(value.includes(option.value) ? value.filter(v => v !== option.value) : [...value, option.value])} /><RecordIcon name={option.icon} /><span>{option.value}</span>{value.includes(option.value) && <RecordIcon name="check" className="records-small-check" />}</label>)}</div></fieldset>;
}

export function TextField({ label, value, onChange, maxLength, optional, compact = false }: { label: string; value: string; onChange: (value: string) => void; maxLength: number; optional?: boolean; compact?: boolean }) {
  return <label className={`records-field ${compact ? 'records-field-compact' : ''}`}><span>{label}{optional && <small>（{m.optional}）</small>}</span><textarea value={value} maxLength={maxLength} onChange={event => onChange(event.target.value)} /><output>{Array.from(value).length.toLocaleString()}/{maxLength.toLocaleString()}</output></label>;
}
