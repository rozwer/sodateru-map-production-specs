import { useEffect, useState, type ReactNode } from 'react';
import { api } from '../../app/api';
import { mapMessages as m } from './messages';
import { MapIcon } from './MapIcon';
import { Icon } from '../../ui/Icon';
import { ObjectPreview } from '../../map/ObjectPreview';
import './map-feature.css';

// Presentation values only. Provider data is supplied through the shared API client.
export type PlacePresentation = { id: string; name: string; address: string | null; categories: string[]; description?: string | null; photoUrl?: string | null; photoAlt?: string; durationMinutes?: number | null; distanceMeters?: number | null; attribution?: string; sourceUrl?: string | null };
export function PlacePhoto({ place, className = '' }: { place: PlacePresentation; className?: string }) {
  const [failed, setFailed] = useState(false);
  const [source, setSource] = useState<string | null>(null);
  useEffect(() => {
    setFailed(false); setSource(null);
    const match = place.photoUrl?.match(/\/api\/v1\/media\/([^/]+)\/content/);
    if (!match) { setSource(place.photoUrl || null); return; }
    const abort = new AbortController(); let objectUrl: string | undefined;
    void api.request('getMediaMediaIdContent', { path: { mediaId: decodeURIComponent(match[1]!) }, signal: abort.signal }).then(blob => {
      if (abort.signal.aborted) return;
      objectUrl = URL.createObjectURL(blob); setSource(objectUrl);
    }).catch(() => { if (!abort.signal.aborted) setFailed(true); });
    return () => { abort.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [place.photoUrl]);
  return source && !failed ? <img className={`map-place-photo ${className}`} src={source} alt={place.photoAlt || place.name} onError={() => setFailed(true)} /> : <div className={`map-photo-missing ${className}`}><MapIcon name="cup"/><span>{m.photoMissing}</span></div>;
}
export function NearbyCards({ places, onSelect, onMore }: { places: PlacePresentation[]; onSelect: (id: string) => void; onMore: () => void }) {
  return <section className="map-nearby"><div className="map-section-heading"><h3>{m.nearby}</h3><button type="button" onClick={onMore}>{m.nearbyMore} <span aria-hidden="true">›</span></button></div>
    <ul>{places.map(place => <li key={place.id}><button type="button" className="map-nearby-card" onClick={() => onSelect(place.id)}><PlacePhoto place={place}/><strong>{place.name}</strong><span className="map-small">{place.categories.join('・')}</span>{place.durationMinutes != null && <span className="map-small map-icon-line"><MapIcon name="walk"/>徒歩 約{place.durationMinutes}分</span>}</button>{place.photoUrl && place.sourceUrl && <a href={place.sourceUrl} target="_blank" rel="noreferrer" className="map-small map-muted">写真：公式サイト</a>}</li>)}</ul>
    {places.length === 0 && <p className="map-muted">周辺の候補はまだありません。</p>}
  </section>;
}
export function PlaceDetailPanel({ place, variant, saved, saving, canSave = true, onSave, onRoute, onShare, onMore, children }: {
  place: PlacePresentation; variant: 'place' | 'search'; saved: boolean; saving: boolean; canSave?: boolean;
  onSave: () => void; onRoute: () => void; onShare: () => void; onMore: () => void; children?: ReactNode;
}) {
  return <section className={`map-place-detail map-place-detail--${variant}`}>
    {variant === 'place' && <PlacePhoto place={place}/>}
    <div className="map-place-copy"><h2>{place.name}</h2>
      {variant === 'place' && <><p className="map-icon-line map-muted"><MapIcon name="cup"/>{place.categories.join('・')}</p><p className="map-address map-icon-line map-muted"><Icon name="pin"/>{place.address || m.addressMissing}</p></>}
      {variant === 'search' && place.durationMinutes != null && <p className="map-icon-line map-muted"><MapIcon name="walk"/>徒歩 {place.durationMinutes}分{place.distanceMeters != null ? `（約${place.distanceMeters}m）` : ''}</p>}
      {variant === 'search' && <PlacePhoto place={place}/>}
      <p className="map-place-description">{place.description || m.descriptionMissing}</p>
      {variant === 'search' && <><p className="map-address map-muted">{place.address || m.addressMissing}</p><div className="map-tags">{place.categories.map(category => <span key={category}>{category}</span>)}</div></>}
      <div className="map-place-actions"><button type="button" className={variant === 'place' ? 'map-primary' : 'map-outline'} disabled={saved || saving || !canSave} onClick={onSave}><MapIcon name="bookmark"/>{saving ? m.saving : saved ? m.saved : variant === 'place' ? m.savePlace : m.save}</button>
        {variant === 'search' ? <button type="button" className="map-primary" onClick={onRoute}><MapIcon name="locate"/>{m.route}</button> : <><button type="button" className="map-round" aria-label="共有" onClick={onShare}><MapIcon name="share"/></button><button type="button" className="map-round" aria-label="場所の三点メニュー" onClick={onMore}><MapIcon name="more"/></button></>}
      </div>
    </div>
    {children}
    {place.attribution && <p className="map-attribution">{place.sourceUrl ? <a href={place.sourceUrl} target="_blank" rel="noreferrer">{place.attribution}</a> : place.attribution}</p>}
  </section>;
}

export type DecorationDraft = { name: string; memo: string; color: string; size: 'small' | 'medium' | 'large'; coordinates: [number, number] };
export function ObjectEditPanel({ draft, onChange, address, photo, onRelocate, onCancel, onSave, onDelete, saving, error, children }: {
  draft: DecorationDraft; onChange: (draft: DecorationDraft) => void; address?: string | null; photo?: PlacePresentation;
  onRelocate: () => void; onCancel: () => void; onSave: () => void; onDelete?: () => void; saving: boolean; error?: string | null; children?: ReactNode;
}) {
  const nameLength = Array.from(draft.name).length, memoLength = Array.from(draft.memo).length;
  return <form className="map-object-form" onSubmit={event => { event.preventDefault(); onSave(); }}>
    {onDelete && <button type="button" className="map-object-delete" aria-label={m.delete} onClick={onDelete}><MapIcon name="trash"/></button>}
    <label><span className="map-field-label">{m.name}<output>{nameLength}/20</output></span><input value={draft.name} onChange={event => onChange({ ...draft, name: Array.from(event.target.value).slice(0, 20).join('') })} aria-label="名前（20文字）" required /></label>
    <label><span className="map-field-label">{m.memo}<output>{memoLength}/200</output></span><textarea rows={3} value={draft.memo} onChange={event => onChange({ ...draft, memo: Array.from(event.target.value).slice(0, 200).join('') })} aria-label="メモ（200文字）" /></label>
    <fieldset><legend>{m.color}</legend><div className="map-color-options">{m.colors.map(color => <label key={color.value} className="map-color-option" style={{ '--swatch': color.value } as React.CSSProperties}><input type="radio" name="object-color" value={color.value} checked={draft.color === color.value} onChange={() => onChange({ ...draft, color: color.value })} aria-label={color.label}/><span aria-hidden="true">{draft.color === color.value ? '✓' : ''}</span></label>)}</div></fieldset>
    <fieldset><legend>{m.size}<small>{m.sizeCaption}</small></legend><p className="map-small map-muted">※{m.sizeHelp}</p><div className="map-size-options">{(['small','medium','large'] as const).map(size => <label className={draft.size === size ? 'is-selected' : ''} key={size}><input type="radio" name="object-size" value={size} checked={draft.size === size} onChange={() => onChange({ ...draft, size })}/><div className="map-size-cube"><ObjectPreview color={draft.color} size={size}/></div><span>{m[size]}</span></label>)}</div></fieldset>
    <section className="map-object-location"><h3>{m.place}</h3><div><span className="map-icon-line"><MapIcon name="locate"/>{address || draft.coordinates.map(x => x.toFixed(5)).join(', ')}</span><button type="button" className="map-outline map-small" onClick={onRelocate}>{m.relocate}</button></div></section>
    <section><h3>{m.preview}</h3><div className="map-object-preview-row">{photo && <PlacePhoto place={photo}/>}<div><ObjectPreview color={draft.color} size={draft.size}/><p className="map-small map-muted">{m.previewHelp}</p></div></div></section>
    {children}{error && <p role="alert" className="map-error">{error}</p>}
    <div className="map-two-actions"><button type="button" className="map-secondary" onClick={onCancel}>{m.cancel}</button><button type="submit" className="map-primary" disabled={saving || !draft.name.trim() || nameLength > 20 || memoLength > 200}>{saving ? m.saving : m.save}</button></div>
  </form>;
}
