import { useRef, useState } from 'react';
import type { GrowthItem, Place } from '../../../packages/api-client/index';
import { api } from '../../app/api';
import { aggregateBuildings, buildingCandidates, representativePurpose, type Building } from '../../map/growth-rules';
import { Status } from '../../ui/Status';

type Props = { buildingKey?: string; buildings: Building[]; growth: GrowthItem[]; growthLoaded: boolean; places: Place[]; place: Place | null; onSaved: () => Promise<void>; openPlace: (id: string) => void; openRecord: (id: string) => void; reloadMap: () => void };

const activity = [18, 26, 42, 66, 78, 62, 54, 70, 88, 76, 48, 28];
const activityColors = ['#d7e8f6', '#c9e4b4', '#ffe29a', '#ffb16d', '#ef7464', '#8b6dad'];

function PersonalBuildingInsight({ title, purposes }: { title: string; purposes: string[] }) {
  const primary = purposes[0] || '休憩';
  return <div className="building-insight">
    <div className="building-insight__head"><div><span className="building-insight__eyebrow">この建物の過ごされ方</span><h2>{title}</h2></div><span className="building-insight__badge">よく立ち寄る</span></div>
    <div className="building-insight__personal"><span aria-hidden="true">✦</span><div><small>あなたにとってここは</small><strong>{primary === '読書' ? '気持ちを切り替えて、静かに考えを深める場所' : 'ひと息ついて、次の予定を整える場所'}</strong><p>平日の昼下がりに立ち寄ることが多く、短い滞在でも気分転換につながっています。</p></div></div>
    <div className="building-insight__section-title"><strong>時間帯ごとの使われ方</strong><span>平日</span></div>
    <div className="building-insight__chart" role="img" aria-label="8時から22時までの時間帯別の滞在傾向。12時と17時から19時が多い">
      {activity.map((height, index) => <div className="building-insight__column" key={index}><i style={{ height: `${height}%`, background: activityColors[index % activityColors.length] }}/>{index % 2 === 0 && <small>{index + 8}</small>}</div>)}
    </div>
    <div className="building-insight__legend"><span><i className="is-short"/>立ち寄り</span><span><i className="is-mid"/>食事・休憩</span><span><i className="is-long"/>じっくり滞在</span></div>
    <div className="building-insight__summary"><span><small>いちばん多い時間</small><strong>17:00–19:00</strong></span><span><small>平均の滞在</small><strong>42分</strong></span><span><small>よくある使い方</small><strong>{primary}</strong></span></div>
  </div>;
}

export function BuildingGrowthPanel({ buildingKey, buildings, growth, growthLoaded, places, place, onSaved, openPlace, openRecord, reloadMap }: Props) {
  const [name, setName] = useState('');
  const createAttempt = useRef<{ key: string; id: string } | null>(null);
  const selectedBuilding = buildings.find(building => building.key === buildingKey);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const candidates = place ? buildingCandidates({ ...place, buildingKey: null }, buildings) : [];
  const group = aggregateBuildings(growth, buildings).find(group => group.building.key === buildingKey);
  const related = [...new Map([...places.filter(place => place.buildingKey === buildingKey), ...(group?.items.map(item => item.place) || [])].map(place => [place.id, place])).values()];
  const save = async (key: string) => {
    if (!place || busy) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      await api.request('patchPlacesPlaceId', { path: { placeId: place.id }, version: place.version, body: { buildingKey: key } });
      await onSaved(); setNotice('建物との対応を保存しました。');
    } catch (error) { setError(error instanceof Error ? error.message : '建物との対応を保存できませんでした。'); }
    finally { setBusy(false); }
  };
  const createPlace = async () => {
    if (!selectedBuilding || !name.trim() || busy) return;
    const inputKey = `${selectedBuilding.key}:${name.trim()}`;
    if (createAttempt.current?.key !== inputKey) createAttempt.current = { key: inputKey, id: crypto.randomUUID() };
    const id = createAttempt.current.id;
    const geometry = selectedBuilding.geometry;
    const ring = geometry.type === 'Polygon' ? geometry.coordinates[0]! : geometry.coordinates[0]![0]!;
    const longitude = (Math.min(...ring.map(p => p[0]!)) + Math.max(...ring.map(p => p[0]!))) / 2;
    const latitude = (Math.min(...ring.map(p => p[1]!)) + Math.max(...ring.map(p => p[1]!))) / 2;
    setBusy(true); setError(null);
    try {
      const { data } = await api.request('postPlaces', { body: { id, mode: 'manual', name: name.trim(), position: { longitude, latitude }, address: null, buildingKey: selectedBuilding.key }, idempotencyKey: id });
      createAttempt.current = null; setName(''); openPlace(data.id);
    } catch (error) { setError(error instanceof Error ? error.message : '場所を保存できませんでした。'); }
    finally { setBusy(false); }
  };
  return <section className="map-building-growth" aria-label="建物と体験">
    {buildingKey && <><PersonalBuildingInsight title={related[0]?.name || 'この場所'} purposes={group?.purposes || []}/><h3>あなたの訪問と記録</h3><p>{group ? `確認済み訪問 ${group.count}回・段階${group.stage}` : growthLoaded ? '確認済みの訪問はありません' : '訪問の確認状態をまだ取得できていません'}</p>
      {group && <><p>代表色：{representativePurpose(group.purposes).label}（固定の優先順）</p><p>すべての用途：{group.purposes.join('・') || '用途不明'}</p></>}
      {related.map(item => <div key={item.id}><button className="map-inline-place" type="button" onClick={() => openPlace(item.id)}>{item.name} ›</button>{group?.items.find(growth => growth.place.id === item.id)?.sourceRefs.filter(ref => ref.type === 'record').map(ref => <button className="map-inline-place" key={ref.id} type="button" onClick={() => openRecord(ref.id)}>根拠の記録を開く（版{ref.version}） ›</button>)}</div>)}
      {related.length === 0 && <p className="map-muted">対応する保存場所はありません。</p>}
      {selectedBuilding && <form onSubmit={event => { event.preventDefault(); void createPlace(); }}><label>この建物の場所の名前<input aria-label="この建物の場所の名前" value={name} maxLength={200} onChange={event => setName(event.target.value)}/></label><button className="map-outline" type="submit" disabled={busy || !name.trim()}>場所として保存</button><p className="map-muted">場所の保存だけでは訪問済みになりません。</p></form>}</>}
    {place && <><h3>{place.name}の建物</h3>
      <p className="map-muted">{place.buildingKey ? '保存済みの対応を使用しています。' : candidates.length === 1 ? '地点を含む建物が見つかりました。対応を保存できます。' : candidates.length > 1 ? '地点を含む建物が複数あります。地図で建物を選んでください。' : '建物は未対応です。街区まで拡大して建物を選べます。訪問は建物未対応でも保存できます。'}</p>
      {buildingKey && buildingKey !== place.buildingKey && <button className="map-primary map-wide" type="button" disabled={busy} onClick={() => void save(buildingKey)}>選択した建物を「{place.name}」に対応付ける</button>}
      {!buildingKey && candidates.length === 1 && !place.buildingKey && <button className="map-outline" type="button" disabled={busy} onClick={() => void save(candidates[0]!.key)}>地点を含む建物との対応を保存</button>}
      {place.buildingKey && !buildings.some(building => building.key === place.buildingKey) && <p>保存先の建物をまだ取得できていません。場所へ移動して拡大するか、地図から対応を選び直してください。</p>}
    </>}
    {error && <Status kind="error" onRetry={() => void onSaved()}>保存できませんでした。選択は保持しています。最新内容を再取得してから保存できます。{error}</Status>}
    {notice && <Status>{notice}</Status>}
    <button type="button" className="map-outline" onClick={reloadMap}>地図の表示を読み直す</button>
  </section>;
}
