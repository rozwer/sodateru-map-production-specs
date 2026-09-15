import { useEffect, useState } from 'react';
import type { Place } from '../../../packages/api-client/index';
import { api } from '../../app/api';
import { useScreenRequest } from './screen-support';
import { readPlace } from './api';
import { ExploreStatus } from './views';
import type { PlacePresentation } from './view-types';

export function ConsentPlacePicker({ onSelect, onCenter, onClose }: { onSelect: (place: PlacePresentation) => void; onCenter: () => void; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<Place[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const request = useScreenRequest();
  const load = (more = false) => request.run(signal => api.request('getPlaces', { query: { q: query || undefined, cursor: more ? cursor ?? undefined : undefined, limit: 30 }, signal }), page => { setItems(previous => more ? [...previous, ...page.items] : page.items); setCursor(page.nextCursor); });
  useEffect(() => { const timer = setTimeout(() => void load(), 200); return () => clearTimeout(timer); }, [query]);
  return <section className="explore-place-picker" aria-label="送信する場所を選ぶ">
    <label>保存した場所を検索<input type="search" value={query} onChange={event => setQuery(event.target.value)}/></label>
    <ExploreStatus busy={request.busy} error={request.error} onRetry={() => void load()}/>
    {!request.busy && !items.length && <p>保存した場所が見つかりません。</p>}
    <ul>{items.map(place => <li key={place.id}><button type="button" disabled={request.busy} className="explore-button explore-button--outline" onClick={() => void request.run(signal => readPlace(api, place.id, signal), onSelect)}>{place.name}{place.address && <small>{place.address}</small>}</button></li>)}</ul>
    {cursor && <button type="button" disabled={request.busy} className="explore-text-action" onClick={() => void load(true)}>続きを読み込む</button>}
    <button type="button" className="explore-button explore-button--soft" onClick={onCenter}>地図の中心を使う</button><button type="button" className="explore-text-action" onClick={onClose}>場所選択を閉じる</button>
  </section>;
}
