import { useState } from 'react';
import { recordMessages as m } from './messages';
import { PurposesInput, RecordHeading, RecordIcon, RecordNotice, TextField } from './RecordParts';

export function RecordCorrection({ body, date, interpretation, purposes, onPurposes, reason, onReason, onSavePurpose, onSaveReason, onBack, onReload, error, notice, busy, currentPurposes, currentVersion, reasonAvailable = true }: {
  body: string; date: string; interpretation: string; purposes: string[]; onPurposes: (value: string[]) => void;
  reason: string; onReason: (value: string) => void; onSavePurpose: () => void; onSaveReason: () => void;
  currentPurposes?: string[]; currentVersion?: number; onBack: () => void; onReload?: () => void; error?: string; notice?: string; busy?: boolean; reasonAvailable?: boolean;
}) {
  const [help, setHelp] = useState(false);
  const [purposeOpen, setPurposeOpen] = useState(false);
  return <section className="records-screen records-correction"><RecordHeading title={m.correctionTitle} onBack={onBack} /><div className="records-body">
    <div><h3 className="records-section-title">{m.correctionHeading}</h3><p className="records-section-lead">{m.correctionLead}</p></div>
    {error && <RecordNotice error retry={onReload}>{error}</RecordNotice>}{notice && <RecordNotice>{notice}</RecordNotice>}
    <section className="records-original-card"><div className="records-review-heading"><RecordIcon name="quote" /><strong>{m.original}</strong><time>{date}</time></div><blockquote><RecordIcon name="quote" /><p>{body}</p></blockquote></section>
    <section className="records-interpretation-card"><div className="records-review-heading"><RecordIcon name="spark" /><strong>{m.interpretation}</strong><button type="button" className="records-help-button" aria-label="アプリの解釈の説明" onClick={() => setHelp(!help)}><RecordIcon name="help" /></button></div><div className="records-interpretation-value">{interpretation.split(/\n\s*\n/).map((paragraph,index)=><p key={index}>{index===0 && interpretation.includes('\n') ? <strong>{paragraph}</strong> : paragraph}</p>)}</div>{help && <RecordNotice>アプリが記録をもとに作った解釈です。本人の言葉と異なる場合は用途や理由を訂正できます。</RecordNotice>}</section>
    <div><h3 className="records-section-title">{m.correction}</h3><p className="records-section-lead">{m.correctionHelp}</p></div>
    <section className="records-correction-field">{currentPurposes && <p>保存済みの用途（版 {currentVersion}）：{currentPurposes.join("・") || "未指定"}</p>}<div className="records-label-icon"><RecordIcon name="tag" /><strong>{m.purpose}</strong><button type="button" className="records-purpose-summary" aria-expanded={purposeOpen} onClick={() => setPurposeOpen(!purposeOpen)}>{purposes.join('・') || '未指定'}<RecordIcon name="next" /></button></div>{purposeOpen && <PurposesInput value={purposes} onChange={onPurposes} disabled={busy} />}<button type="button" className="records-outline" onClick={onSavePurpose} disabled={busy}>{busy ? m.saving : m.savePurpose}</button></section>
    <section className="records-correction-field"><div className="records-correction-reason"><RecordIcon name="document"/><TextField label={m.reason} value={reason} onChange={onReason} maxLength={10000} compact /></div>{!reasonAvailable && <p>訂正する解釈が未取得のため、理由はまだ保存できません。</p>}<button type="button" className="records-outline" onClick={onSaveReason} disabled={busy || !reasonAvailable}>{busy ? m.saving : m.saveReason}</button></section>
    <RecordNotice><strong>{m.preservation}</strong><p>{m.preservationHelp}</p></RecordNotice>
  </div></section>;
}
