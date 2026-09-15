import { useRef, useState, type ReactNode } from 'react';
import type { PlaceChoice, RecordDraft } from './form-types';
import { recordMessages as m } from './messages';
import { MediaGallery, MediaPicker, PlaceCard, PurposesInput, RecordHeading, RecordIcon, RecordNotice, TextField, type RecordIconName } from './RecordParts';

export type RecordComposerProps = {
  draft: RecordDraft;
  setDraft: (draft: RecordDraft) => void;
  place: PlaceChoice | null;
  step: 'editor' | 'confirmation';
  onStep: (step: 'editor' | 'confirmation') => void;
  editing?: boolean;
  busy?: boolean;
  error?: string;
  notice?: string;
  onBack: () => void;
  onChoosePlace: () => void;
  onFiles: (files: File[]) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onSave: () => void;
  onRetry?: () => void;
  onReload?: () => void;
  moodControl?: ReactNode;
  sharingControl?: ReactNode;
  savedLocationLocked?: boolean;
};

export function formatDraftDate(draft: RecordDraft): string {
  if (!draft.date) return m.noDate;
  const date = new Date(`${draft.date}T12:00:00`);
  if (!Number.isFinite(date.getTime())) return m.noDate;
  return new Intl.DateTimeFormat('ja-JP', {year:'numeric',month:'long',day:'numeric',weekday:'short'}).format(date);
}

function DateEditor({ draft, setDraft, onDone }: Pick<RecordComposerProps,'draft'|'setDraft'> & { onDone: () => void }) {
  return <div className="records-time-editor" role="group" aria-label="日時を編集">
    <label>日付<input type="date" value={draft.date} onChange={event => setDraft({...draft, date:event.target.value, timePrecision: event.target.value ? 'approximate' : 'unknown', ...(!event.target.value ? {startTime:'',endTime:''} : {})})} /></label>
    <div className="records-input-grid"><label>開始時刻<input type="time" disabled={!draft.date} value={draft.startTime} onChange={event => setDraft({...draft,startTime:event.target.value,timePrecision:event.target.value ? 'exact' : 'approximate'})} /></label><label>終了時刻（任意）<input type="time" disabled={!draft.startTime} value={draft.endTime} onChange={event => setDraft({...draft,endTime:event.target.value})} /></label></div>
    <label>日時の精度<select value={draft.timePrecision} onChange={event => setDraft({...draft,timePrecision:event.target.value as RecordDraft['timePrecision'],...(event.target.value === 'unknown' ? {date:'',startTime:'',endTime:''} : {})})}><option value="unknown">分からない</option><option value="approximate" disabled={!draft.date}>おおよそ</option><option value="exact" disabled={!draft.date || !draft.startTime}>正確</option></select></label>
    <div className="records-actions"><button type="button" className="records-text-button" onClick={() => setDraft({...draft,date:'',startTime:'',endTime:'',timePrecision:'unknown'})}>日時を未指定にする</button><button type="button" className="records-text-button" onClick={onDone}>設定する</button></div>
  </div>;
}

function ReviewCard({ title, icon, children, onEdit }: { title: string; icon: RecordIconName; children: ReactNode; onEdit?: () => void }) {
  return <section className="records-review-card"><div className="records-review-heading"><RecordIcon name={icon} /><strong>{title}</strong>{onEdit && <button type="button" className="records-edit-link" aria-label={`${title}を編集`} onClick={onEdit}><RecordIcon name="edit" />{m.edit}</button>}</div>{children}</section>;
}

export function RecordComposer(props: RecordComposerProps) {
  const { draft, setDraft, place, step, onStep, editing, busy, error, notice, onBack, onChoosePlace, onFiles, onRemove, onMove, onSave, onRetry, onReload, moodControl, sharingControl, savedLocationLocked } = props;
  const [dateOpen, setDateOpen] = useState(false);
  const [help, setHelp] = useState<'visit' | 'sharing' | null>(null);
  const sharingSelect = useRef<HTMLSelectElement>(null);
  const confirmation = step === 'confirmation';
  const update = <K extends keyof RecordDraft>(key: K, value: RecordDraft[K]) => setDraft({...draft,[key]:value});
  const valid = Boolean(draft.body.trim() || draft.media.length);
  const changeStep = (next: 'editor' | 'confirmation') => { setDateOpen(false); onStep(next); };
  return <section className={`records-screen ${editing ? 'records-edit' : confirmation ? 'records-confirmation' : 'records-create'}`}>
    <RecordHeading title={editing ? m.editTitle : confirmation ? m.confirmTitle : m.createTitle} onBack={confirmation ? () => changeStep('editor') : onBack} close={!editing && !confirmation} />
    <fieldset className="records-body records-composer-fields" disabled={busy}>
      {!editing && <p className="records-lead">{confirmation ? m.confirmLead : m.createLead}</p>}
      {error && <RecordNotice error retry={onRetry}>{error}{(draft.body || draft.media.length > 0) && <p>{m.retainDraft}</p>}{onReload && <button type="button" className="records-text-button" onClick={onReload}>現在の内容を読み直す</button>}</RecordNotice>}
      {notice && <RecordNotice>{notice}</RecordNotice>}
      {editing && <PlaceCard place={place} detail={<p><RecordIcon name="calendar" />{formatDraftDate(draft)} {draft.startTime}{draft.endTime && ` ～ ${draft.endTime}`}</p>} />}
      {!editing && <MediaGallery items={draft.media} onRemove={confirmation || busy ? undefined : onRemove} onMove={confirmation || busy ? undefined : onMove} />}
      {!editing && !confirmation && <MediaPicker onFiles={onFiles} disabled={busy} />}
      {!confirmation && <>
        <TextField label={editing ? m.ownWords : m.body} value={draft.body} maxLength={20000} onChange={value => update('body',value)} optional={!editing} compact={editing} />
        {editing && <>
          <PurposesInput value={draft.purposes} onChange={value => update('purposes',value)} disabled={busy} />
          <TextField label={m.impression} value={draft.impression} maxLength={4000} onChange={value => update('impression',value)} compact />
          <div className="records-input-grid">
            {moodControl}
            <div className="records-input-label">{m.time}<button className="records-inline-input" type="button" onClick={() => setDateOpen(!dateOpen)} aria-expanded={dateOpen}><RecordIcon name="clock" /><span>{draft.startTime ? `${draft.startTime}${draft.endTime ? ` ～ ${draft.endTime}` : ''}` : m.noDate}</span></button></div>
          </div>
        </>}
        {!editing && <>
          <button type="button" className="records-detail-row" onClick={onChoosePlace} disabled={busy || savedLocationLocked}><RecordIcon name="pin" /><strong>{m.choosePlace}</strong><span className="records-row-value">{place?.name ?? m.noPlace}</span><RecordIcon name="next" /></button>
          <button type="button" className="records-detail-row" onClick={() => setDateOpen(!dateOpen)} aria-expanded={dateOpen}><RecordIcon name="calendar" /><strong>{m.date}</strong><span className="records-row-value">{formatDraftDate(draft)}</span><RecordIcon name="next" /></button>
        </>}
        {dateOpen && <DateEditor draft={draft} setDraft={setDraft} onDone={() => setDateOpen(false)} />}
        {editing && <>
          <section><h3 className="records-mini-title">写真（任意）</h3><div className="records-photo-section"><MediaGallery items={draft.media} compact onRemove={busy ? undefined : onRemove} onMove={busy ? undefined : onMove} /><MediaPicker compact onFiles={onFiles} disabled={busy} /></div></section>
          <label className="records-input-label">{m.bookmark}（任意）<span className="records-inline-input"><RecordIcon name="bookmark" /><span>大切だった時間</span><input type="checkbox" checked={draft.bookmarked} onChange={event => update('bookmarked',event.target.checked)} /></span></label>
        </>}
        {!valid && <p className="records-draft-state">{m.noContent}</p>}
        <button type="button" disabled={busy || !valid} className="records-primary" onClick={editing ? onSave : () => changeStep('confirmation')}>{busy ? m.saving : editing ? m.saveChanges : m.confirm}{!editing && <RecordIcon name="next" />}</button>
        {editing && <button type="button" className="records-text-button records-centered" onClick={onBack}>{m.returnList}</button>}
      </>}
      {confirmation && <>
        <ReviewCard title={m.text} icon="document" onEdit={() => changeStep('editor')}><p className="records-review-value">{draft.body || '本文なし（媒体のみの記録）'}</p></ReviewCard>
        <ReviewCard title={m.place} icon="pin" onEdit={savedLocationLocked || busy ? undefined : onChoosePlace}><PlaceCard place={place} /></ReviewCard>
        <ReviewCard title={m.date} icon="calendar" onEdit={() => setDateOpen(!dateOpen)}><p className="records-review-value">{formatDraftDate(draft)} {draft.startTime}{draft.endTime && ` ～ ${draft.endTime}`}</p>{dateOpen && <DateEditor draft={draft} setDraft={setDraft} onDone={() => setDateOpen(false)} />}</ReviewCard>
        <section className="records-review-card"><div className="records-review-heading"><RecordIcon name="walk" /><strong>{m.visitHeading}</strong><button type="button" className="records-help-button" aria-label="訪問の確認の説明" onClick={() => setHelp(help === 'visit' ? null : 'visit')}><RecordIcon name="help" /></button></div><label className="records-visit-check"><input type="checkbox" checked={draft.visited} disabled={!place || busy || savedLocationLocked} onChange={event => update('visited',event.target.checked)} />{m.visited}</label><p className="records-visit-help">{place ? m.visitHelp : '場所を選ぶと訪問を確認できます。'}</p>{help === 'visit' && <RecordNotice>行ったことを自分で確認した場合だけチェックしてください。記録の保存と訪問の確認は別に残ります。</RecordNotice>}</section>
        <section className="records-review-card"><div className="records-review-heading"><RecordIcon name="lock" /><strong>{m.visibility}</strong><button type="button" className="records-help-button" aria-label="公開範囲の説明" onClick={() => setHelp(help === 'sharing' ? null : 'sharing')}><RecordIcon name="help" /></button><button type="button" className="records-edit-link" onClick={() => sharingSelect.current?.focus()}><RecordIcon name="edit" />{m.edit}</button></div><label className="records-visibility"><RecordIcon name={draft.visibility === 'private' ? 'lock' : draft.visibility === 'public' ? 'globe' : 'people'} /><select ref={sharingSelect} aria-label={m.visibility} value={draft.visibility} onChange={event => setDraft({...draft,visibility:event.target.value as RecordDraft['visibility'],sharedWith:[]})}><option value="private">{m.private}</option><option value="selected">{m.selected}</option><option value="public">{m.public}</option></select></label>{draft.visibility === 'selected' && sharingControl}{help === 'sharing' && <RecordNotice>選んだ範囲に写真と本文を共有します。訪問履歴や分析結果を自動で共有しません。</RecordNotice>}</section>
        <div className="records-actions"><button type="button" className="records-secondary" disabled={busy} onClick={() => changeStep('editor')}>{m.backEdit}</button><button type="button" className="records-primary" disabled={busy || !valid || (draft.visibility === 'selected' && draft.sharedWith.length === 0)} onClick={onSave}>{busy ? m.saving : m.save}</button></div>
      </>}
    </fieldset>
  </section>;
}
