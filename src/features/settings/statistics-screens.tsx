import { useEffect, useState } from 'react';
import type { ActivityStatistics } from '../../../packages/api-client/index';
import { api } from '../../app/api';
import type { ScreenProps } from '../../app/contracts';
import { useScreenState } from '../../app/useScreenState';
import { errorText } from './editor';
import { ActivityStatsView, SourcesView, type StatsPeriod } from './statistics-view';
import { rangeFromRoute, statisticsRange, statisticsView, type StatisticsRange } from './statistics';

function initialSelection(params: Record<string, string>) {
  const period: StatsPeriod = ['today', 'week', 'month', 'year'].includes(params.period || '') ? params.period as StatsPeriod : 'week';
  try {
    const range = rangeFromRoute(params) || statisticsRange(period, params.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone);
    return { period, range, error: '' };
  } catch { return { period, range: null, error: '期間またはタイムゾーンが正しくありません。活動の統計から開き直してください。' }; }
}
function useStatistics(scopeKey: string, active: boolean, range: StatisticsRange | null) {
  const [revision, setRevision] = useState(0);
  const key = JSON.stringify([scopeKey, range, revision]);
  const [result, setResult] = useState<{ key: string; data: ActivityStatistics | null; error: string }>({ key: '', data: null, error: '' });
  useEffect(() => {
    if (!active || !range) return;
    const controller = new AbortController();
    setResult({ key, data: null, error: '' });
    api.request('getReflectionActivityStatistics', { query: range, signal: controller.signal }).then(({ data }) => {
      if (!controller.signal.aborted) setResult({ key, data, error: '' });
    }).catch(error => {
      if (!controller.signal.aborted) setResult({ key, data: null, error: errorText(error) });
    });
    return () => controller.abort();
  }, [key, active]);
  const current = result.key === key ? result : { data: null, error: '' };
  return { ...current, retry: () => setRevision(value => value + 1) };
}
function Feedback({ error, loading, retry }: { error: string; loading: boolean; retry: () => void }) {
  return error ? <div className="settings-status" role="alert">{error}<br/><button type="button" className="settings-pill" onClick={retry}>再取得</button></div>
    : loading ? <p className="settings-status" role="status">活動の統計を読み込んでいます…</p> : null;
}
function historyParams(data: ActivityStatistics, date?: string) {
  return { date: date || data.daily.at(-1)?.date || new Intl.DateTimeFormat('sv-SE', { timeZone: data.timeZone }).format(data.to - 1), timeZone: data.timeZone, from: String(data.from), to: String(data.to) };
}
export function ActivityStatsScreen({ route, scopeKey, navigate, active = true }: ScreenProps) {
  const [selection, setSelection] = useScreenState(() => initialSelection(route.params));
  const request = useStatistics(scopeKey, active, selection.range);
  const data = request.data;
  const view = data ? statisticsView(data) : null;
  const history = (date?: string) => { if (data) navigate('daily-track', historyParams(data, date)); };
  return <div className="settings-screen">
    <Feedback error={selection.error || request.error} loading={!!selection.range && !data && !request.error} retry={request.retry}/>
    <ActivityStatsView data={view} period={selection.period} onPeriod={period => {
      setSelection({ period, range: statisticsRange(period, selection.range?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone), error: '' });
    }} onSources={() => { if (data) navigate('data-sources', { from: String(data.from), to: String(data.to), timeZone: data.timeZone, period: selection.period }); }}
    onHistory={history} onRecord={recordId => {
      if (!data) return;
      const date = data.daily.find(day => day.recordIds.includes(recordId))?.date;
      navigate('daily-track', { ...historyParams(data, date), recordId });
    }}/>
  </div>;
}
export function DataSourcesScreen({ route, scopeKey, navigate, active = true }: ScreenProps) {
  const selection = initialSelection(route.params);
  const request = useStatistics(scopeKey, active, selection.range);
  const data = request.data;
  return <div className="settings-screen">
    <Feedback error={selection.error || request.error} loading={!!selection.range && !data && !request.error} retry={request.retry}/>
    {data && <SourcesView data={statisticsView(data)} onHistory={date => navigate('daily-track', historyParams(data, date))}/>}
  </div>;
}
