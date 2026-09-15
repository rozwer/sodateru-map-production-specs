import { ApiError, type Insight, type RecordDetail, type RecordView, type SourceRef, type Summary } from '../../../packages/api-client/index';
import { api } from '../../app/api';
import type { EvidenceRecordView, InsightView } from './types';
import { rangeLabel, type InsightRange } from './periods';

export function requestError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 409 || error.status === 412) return '保存済みの内容または根拠が更新されています。入力を残したまま、最新の内容を確認してください。';
    if (error.status === 404 || error.status === 403) return 'このデータは削除されたか、現在は表示できません。';
    return error.message;
  }
  return '通信に失敗しました。入力を保持しています。接続を確かめて再試行してください。';
}
export const isCancelled = (error: unknown) => error instanceof DOMException && error.name === 'AbortError';

export async function earliestRecordTime(signal: AbortSignal): Promise<number | undefined> {
  let earliest: number | undefined; let cursor: string | undefined;
  do {
    const page = await api.request('getRecords', { query: { limit: 100, cursor, includeUndated: true }, signal });
    for (const record of page.items) if (record.effectiveStartedAt !== null && (earliest === undefined || record.effectiveStartedAt < earliest)) earliest = record.effectiveStartedAt;
    cursor = page.nextCursor ?? undefined;
  } while (cursor);
  return earliest;
}
export async function findPeriodInsight(range: InsightRange, signal: AbortSignal): Promise<Insight | null> {
  // from/to on getInsights are creation timestamps, not the analysis range.
  let cursor: string | undefined;
  do {
    const page = await api.request('getInsights', { query: { kind: 'analysis', cursor, limit: 100 }, signal });
    const match = page.items.find(item => item.rangeStart === range.from && item.rangeEnd === range.to && item.timeZone === range.timeZone);
    if (match) return match;
    cursor = page.nextCursor ?? undefined;
  } while (cursor);
  return null;
}
export function recordPresentation(record: RecordView, detail: RecordDetail | null, placeLabel: string, timeZone: string): EvidenceRecordView {
  const photo = detail?.media.status === 'ready' ? detail.media.data.items.find(media => media.kind === 'photo' && media.status === 'ready') : null;
  return {
    id: record.id, version: record.version, title: record.activities[0]?.name || record.body.split('\n')[0] || '記録',
    dateLabel: record.effectiveStartedAt === null ? '日時不明' : new Intl.DateTimeFormat('ja-JP', { timeZone, month: 'numeric', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' }).format(record.effectiveStartedAt),
    placeLabel, quote: record.body, photoUrl: photo?.contentUrl ?? null, photoMediaId: photo?.id ?? null,
    photos: detail?.media.status === 'ready' ? detail.media.data.items.filter(media => media.kind === 'photo' && media.status === 'ready' && media.contentUrl).map(media => ({ id: media.id, url: media.contentUrl! })) : [], sourceState: 'current',
  };
}
export async function recordWithPhoto(record: RecordView, timeZone: string, signal: AbortSignal): Promise<EvidenceRecordView> {
  const [detail, place] = await Promise.allSettled([
    api.request('getRecordsRecordId', { path: { recordId: record.id }, signal }),
    record.effectivePlaceId ? api.request('getPlacesPlaceId', { path: { placeId: record.effectivePlaceId }, signal }) : Promise.resolve(null),
  ]);
  if (signal.aborted) throw new DOMException('cancelled', 'AbortError');
  if (detail.status === 'rejected' && detail.reason instanceof ApiError && [403, 404].includes(detail.reason.status)) return { id: record.id, version: record.version, title: '表示できない記録', dateLabel: '', placeLabel: '', sourceState: 'unavailable' };
  return recordPresentation(record, detail.status === 'fulfilled' ? detail.value.data : null, place.status === 'fulfilled' ? place.value?.data.place.name ?? '場所未設定' : '場所を取得できません', timeZone);
}

export async function evidenceRecords(refs: SourceRef[], timeZone: string, signal: AbortSignal): Promise<{ records: EvidenceRecordView[]; changed: boolean }> {
  if (!refs.length) return { records: [], changed: false };
  const checks = await api.request('postSourceChecks', { body: { refs }, idempotencyKey: crypto.randomUUID(), signal });
  const changed = checks.data.some(check => check.state !== 'current');
  const records = await Promise.all(refs.filter(ref => ref.type === 'record').map(async ref => {
    const state = checks.data.find(check => check.ref.type === 'record' && check.ref.id === ref.id)?.state ?? 'unavailable';
    if (state !== 'current') return { id: ref.id, version: ref.version, title: state === 'changed' ? '更新された記録' : '表示できない記録', dateLabel: '', placeLabel: '', sourceState: state } satisfies EvidenceRecordView;
    const detail = await api.request('getRecordsRecordId', { path: { recordId: ref.id }, signal });
    let placeLabel = '場所未設定';
    if (detail.data.record.effectivePlaceId) {
      try { placeLabel = (await api.request('getPlacesPlaceId', { path: { placeId: detail.data.record.effectivePlaceId }, signal })).data.place.name; }
      catch (error) { if (isCancelled(error)) throw error; placeLabel = '場所を取得できません'; }
    }
    if (detail.data.record.version !== ref.version) return { id: ref.id, version: ref.version, title: '更新された記録', dateLabel: '', placeLabel, sourceState: 'changed' } satisfies EvidenceRecordView;
    return recordPresentation(detail.data.record, detail.data, placeLabel, timeZone);
  }));
  return { records, changed: changed || records.some(record => record.sourceState !== 'current') };
}

/** INSIGHTS fragment defines the five experience axes; the generated client still
 * carries the older six-axis union. Validate the fragment fields at this boundary. */
const experienceLabels: Record<string, string> = { nature: '自然', books: '本', cafe: 'カフェ', walk: '散歩', social: '人との時間' };
function experiencePresentation(result: unknown) {
  const value = result as { provisionalName?: unknown; axes?: unknown[] } | undefined;
  const axes = (value?.axes ?? []).flatMap(item => {
    const axis = item as { key?: unknown; numerator?: unknown; denominator?: unknown; value?: unknown; unknownDays?: unknown };
    if (typeof axis.key !== 'string' || !experienceLabels[axis.key] ||
      typeof axis.numerator !== 'number' || typeof axis.denominator !== 'number' ||
      typeof axis.unknownDays !== 'number' || !(axis.value === null || typeof axis.value === 'number')) return [];
    return [{ key: axis.key, label: experienceLabels[axis.key]!, numerator: axis.numerator,
      denominator: axis.denominator, value: axis.value, unknownDays: axis.unknownDays }];
  });
  return { axes, title: typeof value?.provisionalName === 'string' ? value.provisionalName : null };
}
export function insightPresentation(raw: Insight | null, summary: Summary | null, records: EvidenceRecordView[], changed = false): InsightView {
  if (raw && (raw.rangeStart === null || raw.rangeEnd === null)) throw new Error('対象期間のない結果はタイプ診断に表示できません。');
  const range = raw ? { from: raw.rangeStart!, to: raw.rangeEnd!, timeZone: raw.timeZone } : summary!;
  const result = raw?.result ?? summary?.result;
  const review = raw?.review;
  const presentation = experiencePresentation(changed ? undefined : result);
  return {
    id: raw?.id ?? '', version: raw?.version ?? 0, title: presentation.title,
    summary: changed ? '' : raw?.summary ?? '', periodLabel: rangeLabel(range), provisional: true, axes: presentation.axes, records,
    alternatives: [], unknown: changed ? ['元の根拠が変わったため、古い説明と引用を外しています。'] : result?.unknown ?? [],
    review: review === 'agree' || review === 'disagree' || review === 'unsure' ? review : null,
    reviewNote: raw?.reviewNote ?? '',
  };
}
