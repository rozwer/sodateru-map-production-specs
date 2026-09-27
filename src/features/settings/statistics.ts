import type { ActivityStatistics } from '../../../packages/api-client/index';
import { localDay } from '../activity/activity-data';
import type { StatisticsView, StatsPeriod } from './statistics-view';

export type StatisticsRange = Pick<ActivityStatistics, 'from' | 'to' | 'timeZone'>;
export function statisticsRange(period: StatsPeriod, timeZone: string, now = Date.now()): StatisticsRange {
  const date = new Intl.DateTimeFormat('sv-SE', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const start = new Date(`${date}T12:00:00Z`);
  if (period === 'week') start.setUTCDate(start.getUTCDate() - (start.getUTCDay() + 6) % 7);
  if (period === 'month') start.setUTCDate(1);
  if (period === 'year') { start.setUTCMonth(0); start.setUTCDate(1); }
  return { from: localDay(start.toISOString().slice(0, 10), timeZone).from, to: localDay(date, timeZone).to, timeZone };
}
export function rangeFromRoute(params: Record<string, string>): StatisticsRange | null {
  if (!params.from && !params.to) return null;
  const from = Number(params.from), to = Number(params.to), timeZone = params.timeZone || '';
  if (!Number.isSafeInteger(from) || !Number.isSafeInteger(to) || from < 0 || to <= from) throw new Error('集計期間が正しくありません。活動の統計から開き直してください。');
  new Intl.DateTimeFormat('ja-JP', { timeZone }).format(from);
  return { from, to, timeZone };
}
export function statisticsView(data: ActivityStatistics): StatisticsView {
  const date = new Intl.DateTimeFormat('ja-JP', { timeZone: data.timeZone, year: 'numeric', month: 'numeric', day: 'numeric' });
  const timestamp = (at: number | null) => at === null ? '未取得' : new Intl.DateTimeFormat('ja-JP', { timeZone: data.timeZone, dateStyle: 'short', timeStyle: 'short' }).format(at);
  const gps = data.gpsDistanceMeters;
  const status = { observed: '取得済み', empty: '記録なし', insufficient: '有効な観測線が不足', unavailable: '取得できません' };
  return {
    fromLabel: date.format(data.from), toLabel: date.format(data.to - 1), updatedLabel: timestamp(data.lastUpdatedAt),
    confirmedPlaces: data.confirmedPlaces.value, confirmedVisits: data.confirmedVisits.value, newPlaces: data.newPlaces.value,
    dailyVisits: data.daily.map(day => ({ date: day.date, count: day.confirmedVisits })),
    distanceLabel: gps.value === null ? null : `${new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 1 }).format(gps.value)} m`,
    coverageLabel: `${data.confirmedVisits.value}回の訪問・${data.confirmedPlaces.value}か所・記録${data.recordCount}件・GPS観測${gps.pointCount}点`,
    missingLabel: `${gps.description} 日時不明の訪問${data.undatedVisits}件・記録${data.undatedRecords}件は期間内件数に含めません。初回日時不明の場所${data.newPlaces.unknownPlaceIds.length}か所は新しい場所の判定から除きます。`,
    activities: data.activities.map(activity => ({ id: activity.name, label: activity.name, count: activity.count, records: activity.recordIds.map(id => ({ id, label: `元の記録 ${id}` })) })),
    sources: data.sources.map(source => ({ id: source.id, label: source.label, description: source.description,
      status: `${status[source.status]}・${source.itemCount}件／取得範囲 ${timestamp(source.firstObservedAt)}〜${timestamp(source.lastObservedAt)}／最終更新 ${timestamp(source.lastUpdatedAt)}` })),
    days: data.daily.filter(day => day.confirmedVisits > 0 || day.recordIds.length > 0).map(day => ({ date: day.date, label: `${day.date}：訪問${day.confirmedVisits}回・記録${day.recordIds.length}件` })),
  };
}
