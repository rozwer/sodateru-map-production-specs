import { useState } from 'react';
import type { GrowthItem, Place } from '../../../packages/api-client/index';
import { api } from '../../app/api';
import { aggregateBuildings, buildingCandidates, representativePurpose, type Building } from '../../map/growth-rules';
import { Status } from '../../ui/Status';

type Props = { buildingKey?: string; buildings: Building[]; growth: GrowthItem[]; places: Place[]; place: Place | null; onSaved: () => Promise<void>; openPlace: (id: string) => void; openRecord: (id: string) => void };
export function BuildingGrowthPanel({ buildingKey, buildings, growth, places, place, onSaved, openPlace, openRecord }: Props) {
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
  return <section className="map-building-growth" aria-label="建物と体験">
    {buildingKey && <><h2>この建物の体験</h2><p>{group ? `確認済み訪問 ${group.count}回・段階${group.stage}` : '確認済みの訪問はありません'}</p>
      {group && <><p>代表色：{representativePurpose(group.purposes).label}（固定の優先順）</p><p>すべての用途：{group.purposes.join('・') || '用途不明'}</p></>}
      {related.map(item => <div key={item.id}><button className="map-inline-place" type="button" onClick={() => openPlace(item.id)}>{item.name} ›</button>{group?.items.find(growth => growth.place.id === item.id)?.sourceRefs.filter(ref => ref.type === 'record').map(ref => <button className="map-inline-place" key={ref.id} type="button" onClick={() => openRecord(ref.id)}>根拠の記録を開く（版{ref.version}） ›</button>)}</div>)}
      {related.length === 0 && <p className="map-muted">対応する保存場所はありません。</p>}</>}
    {place && <><h3>{place.name}の建物</h3>
      <p className="map-muted">{place.buildingKey ? '保存済みの対応を使用しています。' : candidates.length === 1 ? '地点を含む建物が見つかりました。対応を保存できます。' : candidates.length > 1 ? '地点を含む建物が複数あります。地図で建物を選んでください。' : '建物は未対応です。街区まで拡大して建物を選べます。訪問は建物未対応でも保存できます。'}</p>
      {buildingKey && buildingKey !== place.buildingKey && <button className="map-primary map-wide" type="button" disabled={busy} onClick={() => void save(buildingKey)}>選択した建物を「{place.name}」に対応付ける</button>}
      {!buildingKey && candidates.length === 1 && !place.buildingKey && <button className="map-outline" type="button" disabled={busy} onClick={() => void save(candidates[0]!.key)}>地点を含む建物との対応を保存</button>}
      {place.buildingKey && !buildings.some(building => building.key === place.buildingKey) && <p>保存先の建物をまだ取得できていません。場所へ移動して拡大するか、地図から対応を選び直してください。</p>}
    </>}
    {error && <Status kind="error" onRetry={() => void onSaved()}>保存できませんでした。選択は保持しています。最新内容を再取得してから保存できます。{error}</Status>}
    {notice && <Status>{notice}</Status>}
  </section>;
}
