import { useEffect, useId, useRef, useState } from 'react';
import { InsightGlyph, InsightPhoto, InsightStatus } from '../insights/InsightViews';
import type { ViewStatus } from '../insights/types';
import { themesMessages as m } from './messages';
import type { ThemeColor, ThemeDraft, ThemeRecordView, ThemeView } from './types';
import './themes.css';

export function ThemesView({ themes, selectedId, onSelect, onCreate, onEdit, onMap, status = {}, onRetry, onMore }: {
  themes: ThemeView[]; selectedId: string | null; onSelect: (id: string) => void; onCreate: () => void;
  onEdit: (id: string) => void; onMap: (id: string) => void; status?: ViewStatus; onRetry?: () => void; onMore?: () => void;
}) {
  return <div className="themes-ui theme-list"><header className="theme-list-heading"><div><h1>{m.title}</h1><p>{m.subtitle}</p></div><button type="button" onClick={onCreate} className="theme-create"><span><InsightGlyph name="plus"/></span>{m.create}</button></header>
    <InsightStatus {...status} onRetry={onRetry}/>{!status.loading && !themes.length && !status.error && <p className="theme-empty">{m.noThemes}</p>}
    <ul className="theme-cards">{themes.map(theme => <li key={theme.id} className={`theme-card theme-color-${theme.color} ${selectedId === theme.id ? 'is-selected' : ''}`}>
      <button type="button" className="theme-card-heading" onClick={() => onEdit(theme.id)} aria-label={`${theme.name}を編集`}><span className="theme-icon"><InsightGlyph name={theme.icon ?? 'leaf'}/></span><span className="theme-card-copy"><strong>{theme.name}</strong><span>{theme.description}</span><small>{theme.recordIds.length}{m.count}</small></span><span className="theme-chevron"><InsightGlyph name="chevron"/></span></button>
      <button type="button" className="theme-card-cover" onClick={() => onSelect(theme.id)} aria-pressed={selectedId === theme.id} aria-label={`${theme.name}を地図に表示するテーマとして選ぶ`}><InsightPhoto src={theme.photoUrl} alt={theme.photoLabel ?? theme.name}/>{theme.placeLabel && <span className="theme-place"><InsightGlyph name="pin"/>{theme.placeLabel}</span>}{selectedId === theme.id && <span className="theme-selected"><InsightGlyph name="check"/><span className="insight-sr-only">{m.selected}</span></span>}</button>
    </li>)}</ul>{onMore && <button type="button" className="theme-more" onClick={onMore} disabled={status.loading}>{m.more}</button>}
    <div className="theme-list-footer"><button type="button" className="insight-primary" disabled={!selectedId || !themes.some(theme => theme.id === selectedId)} onClick={() => { if (selectedId) onMap(selectedId); }}><InsightGlyph name="map"/>{m.map}<InsightGlyph name="chevron"/></button></div>
  </div>;
}

export function ThemeEditView({ draft, onChange, records, title = m.edit, status = {}, dirty = false, onSave, onCancel, onDelete, onRecord, onMoreRecords, onRetry }: {
  draft: ThemeDraft; onChange: (draft: ThemeDraft) => void; records: ThemeRecordView[]; title?: string; status?: ViewStatus;
  dirty?: boolean; onSave: () => void; onCancel: () => void; onDelete?: () => void; onRecord?: (id: string) => void;
  onMoreRecords?: () => void; onRetry?: () => void;
}) {
  const id = useId(); const fileInput = useRef<HTMLInputElement>(null); const deleteButton = useRef<HTMLButtonElement>(null);
  const [deleteOpen, setDeleteOpen] = useState(false); const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoPickerOpen, setPhotoPickerOpen] = useState(false); const photoButton = useRef<HTMLButtonElement>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  useEffect(() => { if (!draft.photoFile) { setFilePreview(null); return; } const url = URL.createObjectURL(draft.photoFile); setFilePreview(url); return () => URL.revokeObjectURL(url); }, [draft.photoFile]);
  const nameCount = Array.from(draft.name).length, descriptionCount = Array.from(draft.description).length;
  const valid = !!draft.name.trim() && nameCount <= 20 && descriptionCount <= 100 && (!draft.photoFile || !!draft.photoRecordId);
  const selectedPhotoRecord = records.find(record => record.id === draft.photoRecordId || (record.photoUrl && record.photoUrl === draft.photoUrl));
  function closeDelete() { setDeleteOpen(false); deleteButton.current?.focus(); }
  function closePhotos() { setPhotoPickerOpen(false); photoButton.current?.focus(); }
  function selectRecord(id: string, checked: boolean) { onChange({ ...draft, recordIds: checked ? [...draft.recordIds, id] : draft.recordIds.filter(recordId => recordId !== id) }); }
  return <form className="themes-ui theme-editor" aria-label={title} onSubmit={event => { event.preventDefault(); if (valid && !status.busy) onSave(); }}>
    <div className="theme-edit-card"><InsightStatus {...status} onRetry={onRetry}/>
      <div className="theme-field"><label htmlFor={`${id}-name`}>{m.name}</label><output id={`${id}-name-count`} className={nameCount > 20 ? 'is-invalid' : ''}>{nameCount}/20</output><input id={`${id}-name`} value={draft.name} onChange={event => onChange({ ...draft, name: event.target.value })} aria-describedby={`${id}-name-count`} aria-invalid={nameCount > 20} disabled={status.busy} required/>{nameCount > 20 && <p className="theme-validation">{m.invalidName}</p>}</div>
      <div className="theme-field"><label htmlFor={`${id}-description`}>{m.description}</label><output id={`${id}-description-count`} className={descriptionCount > 100 ? 'is-invalid' : ''}>{descriptionCount}/100</output><textarea id={`${id}-description`} value={draft.description} rows={2} onChange={event => onChange({ ...draft, description: event.target.value })} aria-describedby={`${id}-description-count`} aria-invalid={descriptionCount > 100} disabled={status.busy}/>{descriptionCount > 100 && <p className="theme-validation">{m.invalidDescription}</p>}</div>
      <fieldset className="theme-colors" disabled={status.busy}><legend>{m.color}</legend>{(Object.keys(m.colors) as ThemeColor[]).map(color => <label key={color} className={`theme-color-${color} ${draft.color === color ? 'is-selected' : ''}`}><input name={`${id}-color`} type="radio" value={color} checked={draft.color === color} onChange={() => onChange({ ...draft, color })}/><span className="theme-color-circle">{draft.color === color && <InsightGlyph name="check"/>}</span><span className="insight-sr-only">{m.colors[color]}</span></label>)}</fieldset>
      <section className="theme-record-section"><h2>{m.records}</h2><p className="theme-helper">{m.recordsHint}</p><ul className="theme-records">{records.map(record => <li key={record.id}><label className="theme-record-choice"><input type="checkbox" checked={draft.recordIds.includes(record.id)} disabled={status.busy || record.sourceState === 'unavailable'} onChange={event => selectRecord(record.id, event.target.checked)}/><span className="theme-check"><InsightGlyph name="check"/></span><span className="theme-record-photo"><InsightPhoto src={record.photoUrl} alt=""/></span><span className="theme-record-description"><strong>{record.title}</strong><small>{record.dateLabel}　{record.placeLabel}</small></span></label>{onRecord && <button type="button" className="theme-record-open" disabled={status.busy} aria-label={`${record.title}を開く`} onClick={() => onRecord(record.id)}><InsightGlyph name="chevron"/></button>}</li>)}</ul>
        {!records.length && !status.loading && <p className="theme-empty">{m.noRecords}</p>}{onMoreRecords && <button type="button" className="theme-more" onClick={onMoreRecords} disabled={status.loading}>{m.more}</button>}
        <aside className="theme-multiple-note"><InsightGlyph name="bulb"/><p>{m.multiHint}</p></aside>
      </section>
      <section className="theme-photo-section"><h2>{m.photo}</h2><div className="theme-photo-row"><span className="theme-photo-preview"><InsightPhoto src={filePreview ?? draft.photoUrl} alt={selectedPhotoRecord?.title ?? m.photo}/></span><div>{selectedPhotoRecord ? <><strong>{selectedPhotoRecord.title}</strong><span><InsightGlyph name="pin"/>{selectedPhotoRecord.placeLabel}</span></> : <span>{draft.photoFile?.name ?? m.noPhoto}</span>}</div><button type="button" ref={photoButton} aria-expanded={photoPickerOpen} onClick={() => setPhotoPickerOpen(!photoPickerOpen)} disabled={status.busy}>{m.changePhoto}</button></div>
        {photoPickerOpen && <section className="theme-photo-picker" aria-label={m.choosePhoto} onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); closePhotos(); } }}><h2>{m.choosePhoto}</h2><ul>{records.flatMap(record => (record.photos ?? []).map(photo => <li key={photo.id}><button type="button" onClick={() => { onChange({ ...draft, photoFile: null, photoUrl: photo.url, coverMediaId: photo.id, photoRecordId: record.id }); closePhotos(); }} aria-pressed={draft.coverMediaId === photo.id} aria-label={`${record.title}の写真を選ぶ`}><InsightPhoto src={photo.url} alt=""/><span>{record.title}</span></button></li>))}</ul><div><button type="button" onClick={() => fileInput.current?.click()}>{m.devicePhoto}</button><button type="button" onClick={closePhotos}>{m.close}</button></div></section>}
        <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={status.busy} onChange={event => { const file = event.target.files?.[0]; if (!file) return; if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setPhotoError(m.imageOnly); return; } setPhotoError(null); onChange({ ...draft, photoFile: file, photoRecordId: selectedPhotoRecord?.id ?? null }); setPhotoPickerOpen(false); event.target.value = ''; }}/>{photoError && <p role="alert" className="theme-validation">{photoError}</p>}
        {draft.photoFile && <div className="theme-photo-target"><label htmlFor={`${id}-photo-record`}>{m.photoRecord}</label><select id={`${id}-photo-record`} value={draft.photoRecordId ?? ''} disabled={status.busy} onChange={event => onChange({ ...draft, photoRecordId: event.target.value || null })}><option value="">{m.chooseRecord}</option>{records.filter(record => record.sourceState !== 'unavailable').map(record => <option key={record.id} value={record.id}>{record.title}</option>)}</select><p>{m.photoRecordHint}</p></div>}
      </section>
      {onDelete && <button type="button" ref={deleteButton} className="theme-delete" disabled={status.busy} onClick={() => setDeleteOpen(true)}><InsightGlyph name="trash"/>{m.remove}</button>}
      {deleteOpen && <section className="theme-delete-confirm" role="group" aria-label={m.deleteTitle} onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); closeDelete(); } }}><h2>{m.deleteTitle}</h2><p>{m.deleteBody}</p><div><button type="button" onClick={closeDelete}>{m.cancel}</button><button type="button" disabled={status.busy} onClick={onDelete}>{m.deleteConfirm}</button></div></section>}
      <footer className="theme-edit-footer">{dirty && <span className="theme-dirty" aria-live="polite">{m.unsaved}</span>}<button type="button" className="theme-cancel" onClick={onCancel} disabled={status.busy}>{m.cancel}</button><button type="submit" className="insight-primary" disabled={!valid || status.busy}>{status.busy ? m.saving : m.save}</button></footer>
    </div>
  </form>;
}
