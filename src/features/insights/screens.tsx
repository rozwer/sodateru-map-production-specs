import { useEffect, useRef, useState } from 'react';
import { ApiError, type Insight, type Summary } from '../../../packages/api-client/index';
import { api } from '../../app/api';
import type { ScreenDefinition, ScreenProps } from '../../app/contracts';
import { useScreenState } from '../../app/useScreenState';
import { DiagnosisView, EvidenceView, ReviewView } from './InsightViews';
import { earliestRecordTime, evidenceRecords, findPeriodInsight, insightPresentation, isCancelled, requestError } from './data';
import { periodRange, rangeFromParams, rangeParams, type InsightRange } from './periods';
import { notifyInsightSaved, useInsightRevision } from './revisions';
import type { InsightView, Period, ReviewChoice, ReviewDraft } from './types';
import { insightsMessages as m } from './messages';

type Loaded = { raw: Insight | null; summary: Summary | null; view: InsightView; range: InsightRange };
async function loadInsight(params: Record<string, string>, signal: AbortSignal): Promise<Loaded> {
  let raw: Insight | null = null, summary: Summary | null = null;
  let range = rangeFromParams(params);
  if (params.insightId) {
    raw = (await api.request('getInsightsInsightId', { path: { insightId: params.insightId }, signal })).data;
    if (raw.rangeStart === null || raw.rangeEnd === null) throw new Error('対象期間が取得できません。');
    range = { from: raw.rangeStart, to: raw.rangeEnd, timeZone: raw.timeZone };
  } else {
    if (!range) throw new Error('タイプ診断から対象の傾向を選んでください。');
    const results = await Promise.all([api.request('getReflectionSummary', { query: range, signal }), findPeriodInsight(range, signal)]);
    summary = results[0].data; raw = results[1];
  }
  const evidence = await evidenceRecords(raw?.sourceRefs ?? summary!.sourceRefs, range!.timeZone, signal);
  return { raw, summary, range: range!, view: insightPresentation(raw, summary, evidence.records, evidence.changed) };
}

function DiagnosisScreen({ route, navigate, scopeKey, active = true }: ScreenProps) {
  const [model, setModel] = useScreenState<{ period: Period; anchor: number }>({ period: 'week', anchor: Date.now() });
  const [loaded, setLoaded] = useState<(Loaded & { period: Period }) | null>(null), [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true), [reload, setReload] = useState(0);
  const revision = useInsightRevision(scopeKey);
  const timeZone = route.params.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  useEffect(() => {
    if (!active) return;
    const controller = new AbortController(); setLoading(true); setError(null);
    void (async () => {
      const earliest = model.period === 'all' ? await earliestRecordTime(controller.signal) : undefined;
      const range = periodRange(model.period, timeZone, model.anchor, earliest);
      const result = await loadInsight(rangeParams(range), controller.signal);
      if (!controller.signal.aborted) setLoaded({ ...result, period: model.period });
    })().catch(error => { if (!controller.signal.aborted && !isCancelled(error)) setError(requestError(error)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [model.period, model.anchor, timeZone, scopeKey, reload, revision, active]);
  const current = loaded?.period === model.period ? loaded : null;
  const params = current ? { ...rangeParams(current.range), ...(current.raw ? { insightId: current.raw.id } : {}) } : {};
  return <DiagnosisView value={current?.view ?? null} period={model.period} onPeriod={period => setModel({ ...model, period })}
    status={{ loading: loading || (!current && !error), error }} onRetry={() => setReload(value => value + 1)}
    onEvidence={() => navigate('trend-evidence', params)} onRecord={recordId => navigate('record-edit', { ...params, recordId })}
    onReview={choice => navigate('trend-review', { ...params, choice })} onExplore={() => navigate('self-checkin', params)}/>;
}

function EvidenceScreen({ route, navigate, scopeKey, active = true }: ScreenProps) {
  const [loaded, setLoaded] = useState<Loaded | null>(null), [error, setError] = useState<string | null>(null), [loading, setLoading] = useState(true), [reload, setReload] = useState(0);
  const revision = useInsightRevision(scopeKey);
  useEffect(() => {
    if (!active) return;
    const controller = new AbortController(); setLoading(true); setError(null);
    void loadInsight(route.params, controller.signal).then(result => { if (!controller.signal.aborted) setLoaded(result); }).catch(error => {
      if (!controller.signal.aborted && !isCancelled(error)) { setLoaded(null); setError(requestError(error)); }
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [route.params, scopeKey, reload, revision, active]);
  return <EvidenceView value={loaded?.view ?? null} status={{ loading, error }} onRecord={recordId => navigate('record-edit', { ...route.params, recordId })}
    onReview={() => navigate('trend-review', route.params)} onRetry={() => setReload(value => value + 1)} onRefresh={() => setReload(value => value + 1)}/>;
}

function ReviewScreen({ route, navigate, scopeKey, active = true }: ScreenProps) {
  const initialChoice = route.params.choice as ReviewChoice | undefined;
  const [model, setModel] = useScreenState<{ draft: ReviewDraft | null; creation: { id: string; key: string } | null }>({ draft: initialChoice && ['agree', 'disagree', 'unsure'].includes(initialChoice) ? { choice: initialChoice, note: '' } : null, creation: null });
  const [loaded, setLoaded] = useState<Loaded | null>(null), [loading, setLoading] = useState(true), [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null), [notice, setNotice] = useState<string | null>(null);
  const [currentReview, setCurrentReview] = useState<ReviewDraft | null>(null);
  const saving = useRef(false), mutation = useRef<AbortController | null>(null);
  useEffect(() => { if (!active) { mutation.current?.abort(); setBusy(false); } return () => mutation.current?.abort(); }, [scopeKey, active]);
  useEffect(() => {
    if (!active) return;
    const controller = new AbortController(); setLoading(true); setError(null);
    void loadInsight(route.params, controller.signal).then(result => {
      if (controller.signal.aborted) return;
      setLoaded(result); setModel(previous => ({ ...previous, draft: previous.draft ?? { choice: result.view.review, note: result.view.reviewNote } }));
    }).catch(error => { if (!controller.signal.aborted && !isCancelled(error)) { setLoaded(null); setError(requestError(error)); } }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [route.params, scopeKey, reload, active]);

  async function save() {
    const draft = model.draft;
    if (!loaded || !draft?.choice || Array.from(draft.note).length > 200 || saving.current) return;
    saving.current = true; setBusy(true); setError(null); setNotice(null); setCurrentReview(null);
    const controller = new AbortController(); mutation.current = controller;
    let raw = loaded.raw;
    try {
      if (!raw) {
        const creation = model.creation ?? { id: crypto.randomUUID(), key: crypto.randomUUID() };
        setModel(previous => ({ ...previous, creation }));
        raw = (await api.request('postInsights', { body: { id: creation.id, ...loaded.range }, idempotencyKey: creation.key, signal: controller.signal })).data;
        setLoaded(previous => previous ? { ...previous, raw } : previous);
      }
      const result = await api.request('patchInsightsInsightId', { path: { insightId: raw.id }, body: { review: draft.choice, reviewNote: draft.note }, version: raw.version, signal: controller.signal });
      if (controller.signal.aborted) return;
      setLoaded({ ...loaded, raw: result.data, view: { ...loaded.view, id: result.data.id, version: result.data.version, review: draft.choice, reviewNote: draft.note } });
      setNotice(m.saved); notifyInsightSaved(scopeKey);
    } catch (error) {
      if (controller.signal.aborted || isCancelled(error)) return;
      if (raw && error instanceof ApiError && (error.status === 409 || error.status === 412)) {
        try {
          const latest = (await api.request('getInsightsInsightId', { path: { insightId: raw.id }, signal: controller.signal })).data;
          if (controller.signal.aborted) return;
          setLoaded(previous => previous ? { ...previous, raw: latest } : previous);
          if (latest.review === draft.choice && (latest.reviewNote ?? '') === draft.note) { setNotice(m.saved); notifyInsightSaved(scopeKey); return; }
          const latestChoice = latest.review === 'agree' || latest.review === 'disagree' || latest.review === 'unsure' ? latest.review : null;
          setCurrentReview({ choice: latestChoice, note: latest.reviewNote ?? '' });
        } catch (readError) { if (isCancelled(readError)) return; }
      }
      setError(requestError(error));
    } finally { saving.current = false; if (!controller.signal.aborted) setBusy(false); }
  }
  return <>
    {currentReview && <section className="insights-ui insight-conflict"><h2>現在保存されている判断</h2><p>{currentReview.choice ? m.reviews[currentReview.choice] : 'まだ判断はありません'}</p><p>{currentReview.note}</p><p>入力中の判断と比べて、保存する内容を確認してください。</p></section>}
    <ReviewView value={loaded?.view ?? null} draft={model.draft ?? { choice: null, note: '' }} onChange={draft => setModel({ ...model, draft })} status={{ busy, loading, error, notice }} onSave={() => void save()} onOriginal={() => navigate('trend-evidence', route.params)} onRetry={() => setReload(value => value + 1)}/>
  </>;
}

export const screens: ScreenDefinition[] = [
  { id: 'type-diagnosis', title: m.title, component: DiagnosisScreen, layout: { header: 'back', bottomNav: true, background: 'surface' } },
  { id: 'trend-evidence', title: m.title, component: EvidenceScreen, layout: { header: 'back', bottomNav: false, background: 'surface' } },
  { id: 'trend-review', title: m.title, component: ReviewScreen, layout: { header: 'back', bottomNav: false, background: 'surface' } },
];
