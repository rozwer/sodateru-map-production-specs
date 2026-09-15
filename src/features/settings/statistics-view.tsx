import { Card, Entry, Note } from './ui';

/** Display-only values. The controller must supply totals from the statistics API. */
export interface StatisticsView {
  fromLabel: string;
  toLabel: string;
  updatedLabel: string;
  confirmedPlaces: number | null;
  newPlaces: number | null;
  distanceLabel: string | null;
  coverageLabel: string;
  missingLabel: string;
  activities: { id: string; label: string; count: number; records: { id: string; label: string }[] }[];
  sources: { id: string; label: string; description: string; status: string }[];
}
export type StatsPeriod = 'today' | 'week' | 'month' | 'year';
export function ActivityStatsView({ data, period, onPeriod, onSources, onHistory, onRecord }: { data: StatisticsView | null; period: StatsPeriod; onPeriod: (period: StatsPeriod) => void; onSources: () => void; onHistory: () => void; onRecord: (id: string) => void }) {
  return <>
    <p className="settings-intro settings-centered">日々の積み重ねを見てみましょう</p>
    <div className="settings-segments settings-period" aria-label="集計期間">{(['today','week','month','year'] as const).map((value, i) => <button type="button" key={value} aria-pressed={period === value} onClick={() => onPeriod(value)}>{['今日','週','月','年'][i]}</button>)}</div>
    {data && <>
      <p className="settings-centered settings-period-label">{data.fromLabel}〜{data.toLabel}</p>
      <Card title="街での活動" icon="pin"><div className="settings-stat-values"><div><small>確認した訪問</small><strong>{data.confirmedPlaces ?? '—'} <span>か所</span></strong></div><div><small>新しい場所</small><strong>{data.newPlaces ?? '—'} <span>か所</span></strong></div></div><button type="button" className="settings-detail-link" onClick={onHistory}>活動の詳細を見る<span aria-hidden="true">›</span></button></Card>
      <Card title="移動距離" icon="map"><p className="settings-distance">{data.distanceLabel ?? '未取得'}</p><small>{data.coverageLabel}</small><Note>{data.missingLabel}</Note></Card>
      <Card title="活動の内訳" icon="chart">{data.activities.length ? data.activities.map(activity => <details key={activity.id} className="settings-activity"><summary><strong>{activity.label}</strong><span>{activity.count}件</span></summary>{activity.records.map(record => <Entry key={record.id} icon="history" label={record.label} onClick={() => onRecord(record.id)}/>)}</details>) : <Note>この期間の活動の記録はありません。</Note>}</Card>
      <Note>訪問場所は本人が確認した記録から集計しています。GPSの移動距離を歩数には換算しません。</Note>
      <button type="button" className="settings-detail-link" onClick={onSources}>データの取得元を確認する<span aria-hidden="true">›</span></button>
    </>}
  </>;
}
export function SourcesView({ data, onHistory }: { data: StatisticsView; onHistory: () => void }) {
  return <>
    <p className="settings-intro settings-centered">この記録は、次の情報から集計しています</p>
    {data.sources.map(source => <Card key={source.id} title={source.label} icon={source.id === 'visits' ? 'pin' : 'map'}><strong>{source.description}</strong><small>{source.status}</small></Card>)}
    <Card title="集計の設定" icon="history"><dl><div className="settings-row"><dt>集計期間</dt><dd>{data.fromLabel}〜{data.toLabel}</dd></div><div className="settings-row"><dt>最終更新</dt><dd>{data.updatedLabel}</dd></div><div className="settings-row"><dt>取得できた範囲</dt><dd>{data.coverageLabel}</dd></div></dl><Note>{data.missingLabel}</Note></Card>
    <Card className="settings-menu"><Entry label="訪問履歴を見る" icon="history" onClick={onHistory}/></Card>
  </>;
}
