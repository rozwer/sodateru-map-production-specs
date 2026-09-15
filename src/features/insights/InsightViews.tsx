import { useId, useRef, useState, type ReactNode } from 'react';
import { insightsMessages as m } from './messages';
import type { AxisView, EvidenceRecordView, InsightIcon, InsightView, Period, ReviewChoice, ReviewDraft, ViewStatus } from './types';
import './insights.css';

export function InsightGlyph({ name, className = '' }: { name: InsightIcon | 'arrow' | 'chevron' | 'back' | 'info' | 'bulb' | 'question' | 'document' | 'pin' | 'check' | 'map' | 'plus' | 'trash'; className?: string }) {
  const paths: Record<string, ReactNode> = {
    leaf: <><path d="M20 3C9 3 3 8 5 15c7 5 14-1 15-12Z"/><path d="M3 21 15 9"/></>,
    coffee: <><path d="M4 5h12v8a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5Z"/><path d="M16 6h2a3 3 0 0 1 0 6h-2M3 21h16"/></>,
    book: <><path d="M12 5 3 2v17l9 3 9-3V2l-9 3Z"/><path d="M12 5v17"/></>,
    tree: <><path d="M9 19H6a4 4 0 0 1-2-7 4 4 0 0 1 3-6 5 5 0 0 1 10 0 4 4 0 0 1 3 6 4 4 0 0 1-2 7h-3M12 12v10M9 15l3 3 3-3"/></>,
    people: <><circle cx="9" cy="7" r="3"/><path d="M2 21v-4a7 7 0 0 1 14 0v4M16 4a3 3 0 0 1 0 6M19 14a6 6 0 0 1 3 6"/></>,
    arrow: <path d="M3 12h18m-7-7 7 7-7 7"/>, chevron: <path d="m9 5 7 7-7 7"/>, back: <path d="m15 4-8 8 8 8"/>,
    info: <><circle cx="12" cy="12" r="10"/><path d="M12 11v6M12 7h.01"/></>,
    bulb: <><path d="M8 17v-2a7 7 0 1 1 8 0v2M8 18h8M9 21h6"/></>,
    question: <><circle cx="12" cy="12" r="10"/><path d="M9 8a3 3 0 1 1 5 3c-2 1-2 2-2 3M12 18h.01"/></>,
    document: <><path d="M5 2h10l4 4v16H5V2Zm9 0v6h5M8 12h8M8 16h8"/></>,
    pin: <><path d="M19 10c0 5-7 12-7 12S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/></>,
    check: <path d="m4 12 5 5L20 6"/>, map: <><path d="m3 5 6-3 6 3 6-3v17l-6 3-6-3-6 3V5ZM9 2v17M15 5v17"/></>,
    plus: <path d="M12 3v18M3 12h18"/>, trash: <><path d="M3 6h18M9 3h6M6 6l1 16h10l1-16M10 10v8M14 10v8"/></>,
  };
  return <svg className={`insight-glyph ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export function InsightBackHeader({ onBack }: { onBack: () => void }) {
  return <header className="insight-page-header"><button type="button" aria-label="戻る" onClick={onBack}><InsightGlyph name="back"/></button></header>;
}

export function InsightPhoto({ src, alt }: { src?: string | null; alt: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  return src && failedSrc !== src ? <img src={src} alt={alt} loading="lazy" onError={() => setFailedSrc(src)} />
    : <span className="insight-photo-empty" role="img" aria-label={src ? m.imageError : m.noImage}>{src ? m.imageError : m.noImage}</span>;
}

export function InsightStatus({ loading, error, notice, onRetry }: ViewStatus & { onRetry?: () => void }) {
  return <>{loading && <p className="insight-status" role="status">{m.loading}</p>}{error && <div className="insight-error" role="alert"><p>{error}</p>{onRetry && <button type="button" onClick={onRetry}>{m.retry}</button>}</div>}{notice && <p className="insight-status" role="status">{notice}</p>}</>;
}

function ReviewOptions({ value, onChange, disabled, compact = false }: { value: ReviewChoice | null; onChange: (value: ReviewChoice) => void; disabled?: boolean; compact?: boolean }) {
  const group = useId();
  return <fieldset className={`insight-choices ${compact ? 'is-compact' : ''}`} disabled={disabled}>
    <legend className="insight-sr-only">{m.question}</legend>
    {(Object.keys(m.reviews) as ReviewChoice[]).map(choice => <label key={choice} className={value === choice ? 'is-selected' : ''}>
      <input type="radio" name={group} value={choice} checked={value === choice} onChange={() => onChange(choice)} />
      {compact ? <svg viewBox="0 0 24 24" className="insight-face" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="12" cy="12" r="10"/>{choice === 'unsure' ? <path d="M9 8a3 3 0 1 1 5 3c-2 1-2 2-2 3M12 18h.01"/> : <><path d="M8 9h.01M16 9h.01"/>{choice === 'agree' ? <path d="M7 14q5 7 10 0"/> : <path d="M8 16h8"/>}</>}</svg> : <span className="insight-radio" />}
      <span>{m.reviews[choice]}</span>
    </label>)}
  </fieldset>;
}

export function RadarChart({ axes }: { axes: AxisView[] }) {
  const id = useId();
  const hasValues = axes.some(a => a.value !== null);
  const point = (index: number, radius: number) => {
    const angle = index * 2 * Math.PI / axes.length - Math.PI / 2;
    return [160 + Math.cos(angle) * radius, 118 + Math.sin(angle) * radius] as const;
  };
  const polygon = (radius: number) => axes.map((_, i) => point(i, radius).join(',')).join(' ');
  return <figure className="insight-radar">
    {axes.length >= 3 && hasValues ? <svg viewBox="0 0 320 240" role="img" aria-labelledby={id}>
      <title id={id}>{axes.map(a => `${a.label}：${a.value === null ? m.missing : `${a.numerator}/${a.denominator}`}`).join('、')}</title>
      {[1, 2, 3, 4].map(level => <polygon key={level} points={polygon(level * 22.5)} fill={level === 4 ? 'rgba(50,155,155,.025)' : 'none'} stroke="#d0e0e2" strokeWidth=".85" />)}
      {axes.map((axis, i) => <line key={axis.key} x1="160" y1="118" x2={point(i, 90)[0]} y2={point(i, 90)[1]} stroke="#d0e0e2" strokeWidth=".85" />)}
      {axes.every(a => a.value !== null) && <polygon points={axes.map((a, i) => point(i, 90 * a.value!).join(',')).join(' ')} fill="rgba(49,153,153,.24)" stroke="#329a9b" strokeWidth="2" />}
      {axes.map((axis, i) => {
        const [x, y] = point(i, 112);
        const [cx, cy] = point(i, 90 * (axis.value ?? 0));
        return <g key={axis.key}>{axis.value !== null && <circle cx={cx} cy={cy} r="4.7" fill="#329a9b"/>}<text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="16" fontWeight="650" fill="currentColor">{axis.label}</text></g>;
      })}
    </svg> : <p className="insight-empty">{m.noGraph}</p>}
    <figcaption className="insight-sr-only"><dl>{axes.map(axis => <div key={axis.key}><dt>{axis.label}</dt><dd>{axis.value === null ? m.missing : `${axis.numerator} / ${axis.denominator}日`}<small>{m.unknownDays}：{axis.unknownDays}日</small></dd></div>)}</dl></figcaption>
    {axes.some(axis => axis.value === null) && <p className="insight-chart-data">{axes.filter(axis => axis.value === null).map(axis => `${axis.label}：${m.missing}`).join('、')}</p>}
  </figure>;
}

function RecordCard({ record, onOpen, compact = false }: { record: EvidenceRecordView; onOpen: (id: string) => void; compact?: boolean }) {
  const unavailable = record.sourceState === 'unavailable';
  const current = record.sourceState === 'current';
  return <li className={`insight-record ${compact ? 'is-compact' : ''}`}>
    <button type="button" className="insight-record-main" disabled={unavailable} onClick={() => onOpen(record.id)}>
      <span className="insight-record-photo"><InsightPhoto src={current ? record.photoUrl : null} alt={record.title} /></span>
      <span className="insight-record-body">{compact && <span className="insight-record-date">{record.dateLabel}</span>}<strong>{compact && <InsightGlyph name={record.icon ?? 'leaf'} />}{record.title}</strong>
        {!compact && <span className="insight-record-date">{record.dateLabel}　{record.placeLabel}</span>}
        {compact ? <span className="insight-record-place"><InsightGlyph name="pin" />{record.placeLabel}</span> : current && record.quote && <span className="insight-record-quote">{record.quote}</span>}
      </span>{!compact && <InsightGlyph name="chevron" />}
    </button>
    {!compact && current && <dl className="insight-source-kinds">{record.quote && <div className="insight-sr-only"><dt>{m.selfWords}</dt><dd>{record.quote}</dd></div>}{record.observation && <div><dt>{m.observation}</dt><dd>{record.observation}</dd></div>}{record.inference && <div><dt>{m.inference}</dt><dd>{record.inference}</dd></div>}</dl>}
    {record.sourceState === 'changed' && <p className="insight-source-warning">{m.changed}</p>}
    {unavailable && <p className="insight-source-warning">{m.unavailable}</p>}
  </li>;
}

function TrendBox({ value, showPeriod = false }: { value: InsightView; showPeriod?: boolean }) {
  return <section className="insight-trend-box"><div className="insight-trend-head"><span className="insight-leaf-disc"><InsightGlyph name={value.icon ?? 'leaf'} /></span><div><small>{m.observedTrend}</small><h3>{value.title ?? m.noTitle}</h3></div></div><p>{value.summary || m.noSummary}</p>{showPeriod && <p className="insight-period-caption"><span>{m.period}</span> {value.periodLabel}</p>}{value.review && <p className="insight-review-state">{m.reviewState[value.review]}</p>}</section>;
}

export function DiagnosisView({ value, period, status = {}, onPeriod, onEvidence, onRecord, onReview, onExplore, onRetry }: {
  value: InsightView | null; period: Period; status?: ViewStatus; onPeriod: (period: Period) => void;
  onEvidence: () => void; onRecord: (id: string) => void; onReview: (choice: ReviewChoice) => void; onExplore: () => void; onRetry?: () => void;
}) {
  const [info, setInfo] = useState(false); const infoButton = useRef<HTMLButtonElement>(null);
  function closeInfo() { setInfo(false); infoButton.current?.focus(); }
  return <div className="insights-ui insight-diagnosis"><header className="insight-diagnosis-heading"><h1>{m.title}</h1><p>{m.subtitle}</p></header>
    <div className="insight-periods" role="group" aria-label={m.period}>{(Object.keys(m.periods) as Period[]).map(key => <button key={key} type="button" aria-pressed={period === key} onClick={() => onPeriod(key)}>{m.periods[key]}</button>)}</div>
    <InsightStatus {...status} onRetry={onRetry} />
    {!status.loading && value ? <><section className="insight-diagnosis-card"><div className="insight-provisional-row"><span>{m.periods[period]}の仮の呼び名</span><button ref={infoButton} type="button" aria-expanded={info} aria-label={m.provisional} onClick={() => setInfo(!info)}><span>{m.provisional}</span><InsightGlyph name="info" /></button></div>
      {info && <div className="insight-explanation" onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); closeInfo(); } }}><p>{m.graphInfo}</p><button type="button" onClick={closeInfo}>{m.close}</button></div>}
      <h2>{value.title ?? m.noTitle}</h2><p className="insight-diagnosis-description">{value.summary || m.noSummary}</p><RadarChart axes={value.axes} />
    </section><section className="insight-diagnosis-card insight-evidence-strip"><div className="insight-section-row"><h2>根拠になった記録</h2><button type="button" className="insight-pill" onClick={onEvidence}>{m.evidence}<InsightGlyph name="arrow" /></button></div>
      {value.records.length ? <ul>{value.records.map(record => <RecordCard key={record.id} record={record} onOpen={onRecord} compact />)}</ul> : <p className="insight-empty">{m.noEvidence}</p>}
    </section><section className="insight-diagnosis-card insight-diagnosis-review"><h2>{m.shortQuestion}</h2><ReviewOptions compact value={value.review} onChange={onReview} disabled={status.busy}/><button type="button" className="insight-primary" onClick={onExplore}>{m.explore}<InsightGlyph name="arrow"/></button></section></> : !status.loading && !status.error && <p className="insight-empty">{m.empty}</p>}
  </div>;
}

export function EvidenceView({ value, status = {}, onRecord, onReview, onRetry, onRefresh }: { value: InsightView | null; status?: ViewStatus; onRecord: (id: string) => void; onReview: () => void; onRetry?: () => void; onRefresh?: () => void }) {
  return <div className="insights-ui insight-detail"><h1>{m.evidenceTitle}</h1><p className="insight-intro">{m.evidenceIntro}</p><InsightStatus {...status} onRetry={onRetry}/>
    {value && <><TrendBox value={value}/><h2>{m.supportingRecords}</h2><ul className="insight-evidence-list">{value.records.filter(record => !record.counterexample).map(record => <RecordCard key={record.id} record={record} onOpen={onRecord} />)}</ul>{!value.records.length && <p className="insight-empty">{m.noEvidence}</p>}
      <h2>{m.otherView}</h2>{value.alternatives.length ? value.alternatives.map(item => <section key={item.id} className="insight-note is-alternative"><InsightGlyph name="bulb"/><div><h3>{item.title}</h3><p>{item.text}</p></div></section>) : <p className="insight-note">{m.noAlternative}</p>}
      {value.records.some(record => record.counterexample) && <><h3>{m.counterexample}</h3><ul className="insight-evidence-list">{value.records.filter(record => record.counterexample).map(record => <RecordCard key={record.id} record={record} onOpen={onRecord}/>)}</ul></>}
      <section className="insight-note"><InsightGlyph name="question"/><div><h3>{m.unknownTitle}</h3>{value.unknown.map((text, index) => <p key={index}>{text}</p>)}</div></section>
      {value.records.some(record => record.sourceState === 'changed') && onRefresh && <button type="button" className="insight-outline" onClick={onRefresh}>{m.refresh}</button>}
      <button type="button" className="insight-outline" disabled={!value.records.some(record => record.sourceState !== 'unavailable')} onClick={() => { const record = value.records.find(record => record.sourceState !== 'unavailable'); if (record) onRecord(record.id); }}><InsightGlyph name="book"/>{m.originals}<InsightGlyph name="chevron"/></button>
      <button type="button" className="insight-text-action" onClick={onReview}>{m.reviewAction}<InsightGlyph name="chevron"/></button>
    </>}
  </div>;
}

export function ReviewView({ value, draft, onChange, onSave, onOriginal, status = {}, onRetry }: { value: InsightView | null; draft: ReviewDraft; onChange: (draft: ReviewDraft) => void; onSave: () => void; onOriginal: () => void; status?: ViewStatus; onRetry?: () => void }) {
  const reasonId = useId(); const countId = useId(); const count = Array.from(draft.note).length;
  return <form className="insights-ui insight-detail insight-review" onSubmit={event => { event.preventDefault(); if (draft.choice && count <= 200 && !status.busy) onSave(); }}>
    <h1>{m.reviewTitle}</h1><p className="insight-intro">{m.reviewIntro}</p><InsightStatus {...status} onRetry={onRetry}/>
    {value && <><TrendBox value={value} showPeriod/><h2>{m.question}</h2><ReviewOptions value={draft.choice} onChange={choice => onChange({ ...draft, choice })} disabled={status.busy}/>
      <label className="insight-reason-label" htmlFor={reasonId}>{m.reason} <span>{m.optional}</span></label><textarea id={reasonId} value={draft.note} onChange={event => onChange({ ...draft, note: event.target.value })} aria-describedby={countId} aria-invalid={count > 200} disabled={status.busy} rows={3}/><output id={countId} className={`insight-counter ${count > 200 ? 'is-invalid' : ''}`}>{count} / 200</output>
      <button type="button" className="insight-original-box" onClick={onOriginal}><InsightGlyph name="document"/><span>{m.original}<q>{value.summary || m.noSummary}</q></span><InsightGlyph name="chevron"/></button>
      <div className="insight-review-footer"><button type="submit" className="insight-primary" disabled={!draft.choice || count > 200 || status.busy}>{status.busy ? m.saving : m.saveReview}</button></div></>}
  </form>;
}
