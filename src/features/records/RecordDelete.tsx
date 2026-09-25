import type { PlaceChoice } from './form-types';
import { recordMessages as m } from './messages';
import { PlaceCard, RecordHeading, RecordIcon, RecordNotice } from './RecordParts';

export function RecordDelete({ place, date, onBack, onExport, onDelete, busy, exportBusy, exportUnavailable = false, previewUnavailable = false, error, notice }: {
  place: PlaceChoice | null; date: string; onBack: () => void; onExport: () => void; onDelete: () => void;
  busy?: boolean; exportBusy?: boolean; exportUnavailable?: boolean; previewUnavailable?: boolean; error?: string; notice?: string;
}) {
  return <section className="records-screen records-delete"><RecordHeading title={m.deleteTitle} onBack={onBack} /><div className="records-body">
    {error && <RecordNotice error>{error}</RecordNotice>}{notice && <RecordNotice>{notice}</RecordNotice>}
    <button type="button" className="records-export" onClick={onExport} disabled={busy || exportBusy || exportUnavailable}><RecordIcon name="download" /><span><strong>{exportBusy ? '書き出しています…' : m.export}</strong><small>{exportUnavailable ? '書き出しは準備中です。今はコピーを保存できません。' : m.exportHelp}</small></span><RecordIcon name="next" /></button>
    <section><h3 className="records-delete-heading">{m.deleteHeading}</h3><p className="records-section-lead">{m.deleteLead}</p></section>
    {previewUnavailable && <RecordNotice>削除範囲の個別プレビューは未対応です。以下は一般的な案内です。</RecordNotice>}
    <div className="records-delete-place"><PlaceCard place={place} detail={<p>{date}</p>} /></div>
    <section className="records-deleted-list"><h3><RecordIcon name="trash" />{m.deletedHeading}</h3><ul>{m.deleted.map(text => <li key={text}>{text}</li>)}</ul></section>
    <section className="records-retained-list"><h3><RecordIcon name="check" />{m.retainedHeading}</h3><ul>{m.retained.map(text => <li key={text}>{text}</li>)}</ul></section>
    <p className="records-delete-warning">{m.irreversible}</p>
    <div className="records-actions"><button type="button" className="records-secondary" onClick={onBack} disabled={busy}>{m.cancel}</button><button type="button" className="records-danger" onClick={onDelete} disabled={busy || exportBusy}><RecordIcon name="trash" />{busy ? m.deleting : m.delete}</button></div>
  </div></section>;
}
