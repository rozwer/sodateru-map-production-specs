import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../app/api';
import { ApiError, type CommonInfoRecordMap, type PlaceDetail } from '../../../packages/api-client/index';
import { Icon } from '../../ui/Icon';
import type { ScreenDefinition, ScreenProps } from '../../app/contracts';
import { useMapBridge } from '../../app/useMapBridge';
import { useScreenState } from '../../app/useScreenState';
import { MapBridge } from '../../app/map-bridge';
import { MapPreview } from '../../map/MapPreview';
import { KnowledgeDetailView, KnowledgeFilterView, KnowledgeListView, KnowledgePlaceView, KnowledgeStatus } from './views';
import { emptyFilters, type KnowledgeFilters, type KnowledgeKind, type KnowledgeRecord, type KnowledgeAreaOption, type KnowledgePerson } from './types';
import { knowledgeQuery } from './query';
import { useKnowledgeBookmarks } from './useKnowledgeBookmarks';
const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const message = (error: unknown) => error instanceof Error ? error.message : '地域の声を読み込めませんでした。';
function filtersOf(value?: string): KnowledgeFilters { try { return value ? { ...emptyFilters, ...JSON.parse(value) } : emptyFilters; } catch { return emptyFilters; } }
function kindOf(value?: string): KnowledgeKind { return value === 'rest-tip' || value === 'people' ? value : 'experience'; }
const loadMedia = (media: { id: string }, signal: AbortSignal) => api.request('getMediaMediaIdContent', { path: { mediaId: media.id }, signal });
async function searchQuery(query: string, filters: KnowledgeFilters, kind: KnowledgeKind, signal: AbortSignal, placeId?: string, personId?: string) {
  const topicKey = filters.purpose ? { meal: 'food', rest: 'rest', walk: 'walk' }[filters.purpose] : kind === 'rest-tip' ? 'rest' : undefined;
  const topics = topicKey ? await api.request('getKnowledgeTopics', { signal }) : null;
  const purposes = topics?.items.find(topic => topic.topicKey === topicKey)?.purposes;
  return knowledgeQuery({ query, filters, timeZone, placeId, personIds: personId ? [personId] : undefined, purposes, category: kind === 'rest-tip' ? 'tips' : 'experiences' });
}
function useRecords(props: ScreenProps, query: string, filters: KnowledgeFilters, kind: KnowledgeKind) {
  const [state, set] = useState<{ items: KnowledgeRecord[]; people?: KnowledgePerson[]; total: number; cursor: string | null; loading: boolean; error: string }>({ items: [], total: 0, cursor: null, loading: true, error: '' });
  const [revision, refresh] = useState(0);
  const [pagination, setPagination] = useState<{ key: string; cursor: string } | null>(null);
  const key = JSON.stringify([props.scopeKey, query, filters, kind, props.route.params.placeId, props.route.params.personId, props.route.params.recordId]);
  const cursor = pagination?.key === key ? pagination.cursor : undefined;
  useEffect(() => { setPagination(null); }, [key, props.active]);
  useEffect(() => {
    if (props.active === false) { set({ items: [], total: 0, cursor: null, loading: true, error: '' }); return; }
    const abort = new AbortController(); set(old => ({ ...old, items: cursor ? old.items : [], people: cursor ? old.people : [], total: cursor ? old.total : 0, loading: true, error: '' }));
    void (async () => {
      if (kind === 'people') {
        if (filters.center || filters.bounds || filters.purpose || filters.period || filters.audience !== 'visible' || props.route.params.placeId || props.route.params.personId) throw new Error('人物は名前で検索できます。地域・目的・期間・共有範囲での人物検索は未提供です。条件をクリアして検索してください。');
        const page = await api.request('getPeople', { query: { q: query.trim() || undefined, cursor, limit: 100 }, signal: abort.signal });
        if (!abort.signal.aborted) set(old => ({ items: [], people: [...(cursor ? old.people ?? [] : []), ...page.items], total: 0, cursor: page.nextCursor, loading: false, error: '' }));
        return;
      }
      const filter = await searchQuery(query, filters, kind, abort.signal, props.route.params.placeId, props.route.params.personId);
      const { category: _category, bbox: _bbox, placeId: _placeId, ...voiceQuery } = filter;
      const page = props.route.params.placeId && kind === 'rest-tip' && !filters.bounds && !filters.purpose && Boolean(filter.purposes?.length)
        ? await api.request('getPlacesPlaceIdVoices', { path: { placeId: props.route.params.placeId }, query: { ...voiceQuery, topicKey: 'rest', limit: 100, cursor }, signal: abort.signal })
        : await api.request('getKnowledge', { query: { ...filter, limit: 100, cursor }, signal: abort.signal });
      if (!abort.signal.aborted) set(old => ({ items: cursor ? [...old.items, ...page.items.filter(item => !old.items.some(previous => previous.id === item.id))] : page.items, total: page.totalCount, cursor: page.nextCursor, loading: false, error: '' }));
    })().catch(error => { if (!abort.signal.aborted) set({ items: [], total: 0, cursor: null, loading: false, error: message(error) }); });
    return () => abort.abort();
  }, [key, props.active, cursor, revision]);
  return { ...state, retry: () => refresh(v => v + 1), more: () => { if (state.cursor) setPagination({ key, cursor: state.cursor }); } };
}
function List(props: ScreenProps) {
  const [draft, set] = useScreenState({ query: props.route.params.query ?? '', submitted: props.route.params.query ?? '', kind: kindOf(props.route.params.kind) });
  const filters = filtersOf(props.route.params.filters), data = useRecords(props, draft.submitted, filters, draft.kind);
  const conditions = { ...props.route.params, query: draft.submitted, kind: draft.kind, filters: JSON.stringify(filters) };
  const bookmarks = useKnowledgeBookmarks(props.scopeKey, props.active !== false);
  const open = (id: string) => props.navigate('knowledge-detail', { recordId: id });
  return <><KnowledgeStatus error={bookmarks.error} retry={bookmarks.retry}/><KnowledgeListView bookmarks={bookmarks.bookmarks} bookmarkBusy={bookmarks.ready ? bookmarks.busy : new Set(data.items.map(item => item.id))} onBookmark={bookmarks.toggle} query={draft.query} onQuery={query => set(old => ({ ...old, query }))} onSearch={() => set(old => ({ ...old, submitted: old.query }))} onClear={() => set(old => ({ ...old, query: '', submitted: '' }))} kind={draft.kind} onKind={kind => set(old => ({ ...old, kind }))} records={data.items} people={data.people} totalCount={data.total} heading={draft.kind === 'people' ? '人物検索（名前）' : draft.kind === 'rest-tip' ? '地域の休憩チップ' : '地域の共有体験'} timeZone={timeZone} center={filters.center} loading={data.loading} error={data.error} nextCursor={data.cursor} onLoadMore={data.more} onRetry={data.retry} onBack={props.back} onFilter={() => props.navigate('knowledge-filter', conditions)} onMap={() => props.navigate('local-knowledge', conditions)} onOpen={open} onPerson={personId => props.navigate('friend-profile', { personId })} onPost={() => props.navigate('record-create', { returnPage: 'knowledge-list', ...(props.route.params.placeId ? { placeId: props.route.params.placeId } : {}), ...(draft.kind === 'rest-tip' ? { topicKey: 'rest' } : {}) })} active={props.active} loadMedia={loadMedia}/></>;
}
function FilterMap({ bridge, draft }: { bridge: MapBridge; draft: KnowledgeFilters }) {
  useEffect(() => {
    if (draft.bounds) bridge.focus('knowledge', { bounds: [[draft.bounds[0], draft.bounds[1]], [draft.bounds[2], draft.bounds[3]]] });
    else if (draft.center) bridge.focus('knowledge', { center: draft.center, zoom: draft.radiusM === 3000 ? 12 : draft.radiusM === 500 ? 15 : 14 });
  }, [bridge, JSON.stringify(draft.center), JSON.stringify(draft.bounds), draft.radiusM]);
  return <MapPreview bridge={bridge} label="検索地域の地図" interactive center={draft.center ?? undefined} radiusM={draft.radiusM ?? undefined}/>;
}
function Filter(props: ScreenProps) {
  const bridge = useMemo(() => new MapBridge(`${props.scopeKey}:knowledge-filter`), [props.scopeKey]);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [areas, setAreas] = useState<KnowledgeAreaOption[]>([]), [areaLoading, setAreaLoading] = useState(false), [areaError, setAreaError] = useState('');
  const areaRequest = useRef<AbortController | null>(null), applyRequest = useRef<AbortController | null>(null);
  useEffect(() => () => bridge.dispose(), [bridge]);
  useEffect(() => {
    setBusy(false); setAreaLoading(false); setAreas([]); setAreaError(''); setError('');
    return () => { areaRequest.current?.abort(); applyRequest.current?.abort(); };
  }, [props.active, props.scopeKey]);
  const searchArea = async (query: string) => {
    areaRequest.current?.abort(); const abort = new AbortController(); areaRequest.current = abort;
    setAreas([]); setAreaError(''); setAreaLoading(true);
    try {
      const result = await api.request('getPlaceCandidates', { query: { q: query, limit: 10 }, signal: abort.signal });
      if (!abort.signal.aborted) setAreas(result.data.items.map(item => ({ id: item.placeId ?? item.candidateId, name: item.name, coordinates: [item.position.longitude, item.position.latitude] })));
    } catch (error) { if (!abort.signal.aborted) setAreaError(message(error)); }
    finally { if (!abort.signal.aborted) setAreaLoading(false); }
  };
  return <KnowledgeFilterView initial={filtersOf(props.route.params.filters)} onClose={props.back} busy={busy} onApply={async filters => {
    applyRequest.current?.abort(); const abort = new AbortController(); applyRequest.current = abort; setBusy(true); setError('');
    try { await searchQuery(props.route.params.query ?? '', filters, kindOf(props.route.params.kind), abort.signal); if (!abort.signal.aborted) props.navigate('knowledge-list', { ...props.route.params, filters: JSON.stringify(filters) }); }
    catch (error) { if (!abort.signal.aborted) setError(message(error)); }
    finally { if (!abort.signal.aborted) setBusy(false); }
  }} onAreaSearch={searchArea} areas={areas} areaLoading={areaLoading} areaError={areaError} error={error} onUseMapBounds={() => {
    const bounds = bridge.getSnapshot().camera.bounds;
    if (!bounds) { setError('地図の範囲を取得できません。地図の読込み後に選び直してください。'); return null; }
    setError(''); return [bounds[0][0], bounds[0][1], bounds[1][0], bounds[1][1]];
  }} map={draft => props.active === false ? null : <FilterMap bridge={bridge} draft={draft}/>}/>;
}
function Detail(props: ScreenProps) {
  const [data, setData] = useState<{ key: string; record: KnowledgeRecord | null; loading: boolean; error: string }>({ key: '', record: null, loading: true, error: '' });
  const [revision, refresh] = useState(0);
  const key = JSON.stringify([props.scopeKey, props.route.params.recordId]);
  useEffect(() => {
    setData({ key, record: null, loading: true, error: '' });
    if (props.active === false) return;
    const abort = new AbortController();
    const recordId = props.route.params.recordId;
    if (!recordId) { setData({ key, record: null, loading: false, error: '投稿が指定されていません。' }); return; }
    void api.request('getSharedRecordsRecordId', { path: { recordId }, signal: abort.signal }).then(result => {
      if (!abort.signal.aborted) setData({ key, record: result.data, loading: false, error: '' });
    }).catch(error => {
      if (!abort.signal.aborted) setData({ key, record: null, loading: false, error: error instanceof ApiError && error.status === 404 ? 'この投稿は現在閲覧できません。' : message(error) });
    });
    return () => abort.abort();
  }, [key, props.active, revision]);
  // Hidden cached screens must discard their body/media before becoming active again.
  if (props.active === false) return null;
  const record = data.key === key ? data.record : null;
  if (!record || data.loading || data.error) return <div className="knowledge-panel"><button onClick={props.back}>戻る</button><KnowledgeStatus loading={data.key !== key || data.loading} error={data.key === key ? data.error : ''} retry={() => refresh(value => value + 1)}/></div>;
  return <KnowledgeDetailView record={record} timeZone={timeZone} onBack={props.back} onPlace={placeId => props.navigate('local-knowledge', { placeId })} onAuthor={personId => props.navigate('friends-map', { personId })} active={props.active} loadMedia={loadMedia}/>;
}
function Local(props: ScreenProps) {
  const filters = filtersOf(props.route.params.filters), query = props.route.params.query ?? '', kind = kindOf(props.route.params.kind);
  const data = useRecords(props, query, filters, kind), bridge = useMapBridge();
  const [map, setMap] = useState<{ key: string; data: CommonInfoRecordMap | null; loading: boolean; error: string }>({ key: '', data: null, loading: true, error: '' });
  const [revision, refresh] = useState(0);
  const [place, setPlace] = useState<{ key: string; data: PlaceDetail | null; error: string; loading: boolean }>({ key: '', data: null, error: '', loading: false });
  const [closed, setClosed] = useState(false);
  const placeId = props.route.params.placeId;
  const placeKey = JSON.stringify([props.scopeKey, placeId]);
  useEffect(() => {
    setClosed(false); setPlace({ key: placeKey, data: null, error: '', loading: Boolean(placeId) });
    if (props.active === false || !placeId) return;
    const abort = new AbortController();
    void api.request('getPlacesPlaceId', { path: { placeId }, signal: abort.signal }).then(result => {
      if (!abort.signal.aborted) { setPlace({ key: placeKey, data: result.data, error: '', loading: false }); bridge.focus('knowledge', { center: result.data.place.coordinates, zoom: 15 }); }
    }).catch(error => { if (!abort.signal.aborted) setPlace({ key: placeKey, data: null, error: message(error), loading: false }); });
    return () => abort.abort();
  }, [placeKey, props.active, revision, bridge]);
  const currentPlace = place.key === placeKey ? place.data : null;
  const placeUnavailable = Boolean(placeId) && (!currentPlace || place.loading || Boolean(place.error));
  const key = JSON.stringify([props.scopeKey, query, filters, kind, props.route.params.placeId, props.route.params.personId]);
  useEffect(() => {
    bridge.clear('knowledge');
    setMap({ key, data: null, loading: true, error: '' });
    if (props.active === false) return;
    const abort = new AbortController();
    void (async () => {
      if (kind === 'people') throw new Error('この分類の地図表示は接続確認中です。');
      const filter = await searchQuery(query, filters, kind, abort.signal, props.route.params.placeId, props.route.params.personId);
      const result = await api.request('getKnowledgeMap', { query: { ...filter, category: kind === 'rest-tip' ? 'tips' : 'experiences' }, signal: abort.signal });
      if (abort.signal.aborted) return;
      if (filters.bounds) bridge.focus('knowledge', { bounds: [[filters.bounds[0], filters.bounds[1]], [filters.bounds[2], filters.bounds[3]]] });
      else if (filters.center) bridge.focus('knowledge', { center: filters.center, zoom: filters.radiusM === 3000 ? 12 : filters.radiusM === 500 ? 15 : 14 });
      bridge.showPlaces('knowledge', { places: result.data.items.map(item => ({ id: item.recordId, placeId: item.placeId, recordIds: [item.recordId], coordinates: item.coordinates })) });
      setMap({ key, data: result.data, loading: false, error: '' });
    })().catch(error => {
      if (!abort.signal.aborted) setMap({ key, data: null, loading: false, error: error instanceof ApiError && error.status === 413 ? '地図に表示する投稿が多すぎます。地域や期間を絞ってください。' : message(error) });
    });
    return () => { abort.abort(); bridge.clear('knowledge'); };
  }, [key, props.active, bridge, revision]);
  useEffect(() => {
    if (props.active === false) return;
    const record = bridge.onSelect('knowledge', selection => props.navigate('knowledge-detail', { recordId: selection.id }));
    const place = bridge.onSelect('personal-map', selection => props.navigate('local-knowledge', { ...props.route.params, placeId: selection.id }));
    return () => { record(); place(); };
  }, [props.active, bridge, props.navigate, JSON.stringify(props.route.params)]);
  const currentMap = map.key === key ? map.data : null;
  if (props.active === false) return null;
  if (closed) return <button className="knowledge-voices-button" onClick={() => setClosed(false)}>地域の声を開く</button>;
  return <>
    {currentMap && <p className="knowledge-status" role="status">地図に表示できる投稿 {currentMap.items.length}件・場所不明 {currentMap.totalCount - currentMap.items.length}件</p>}
    <KnowledgePlaceView name={currentPlace?.place.name ?? '地域の知'} place={currentPlace ?? undefined} records={placeUnavailable ? [] : data.items} totalCount={currentMap?.totalCount ?? data.total} timeZone={timeZone} onClose={() => setClosed(true)} onRegion={() => props.navigate('knowledge-filter', props.route.params)} onVoices={() => props.navigate('knowledge-list', props.route.params)} onOpen={recordId => props.navigate('knowledge-detail', { recordId })} error={(place.key === placeKey ? place.error : '') || data.error || (map.key === key ? map.error : '')} loading={data.loading || map.loading || (Boolean(placeId) && (place.key !== placeKey || place.loading))} onRetry={() => { data.retry(); refresh(value => value + 1); }} active={props.active} loadMedia={loadMedia}/></>;
}
function Toolbar(props: ScreenProps) { return <header className="knowledge-map-toolbar"><button type="button" aria-label="戻る" onClick={props.back}><Icon name="back"/></button><h2>地域の知</h2><button type="button" aria-label="メニュー" onClick={() => props.navigate('navigation', { mode: 'main' })}><Icon name="menu"/></button></header>; }
export const screens: ScreenDefinition[] = [
  { id: 'knowledge-list', title: '地域の声', component: List, layout: { header: 'none', contentPadding: 'none', bottomNav: false } },
  { id: 'knowledge-filter', title: '検索条件', component: Filter, layout: { header: 'none', contentPadding: 'none', bottomNav: false } },
  { id: 'knowledge-detail', title: '地域の声の詳細', component: Detail, layout: { header: 'none', contentPadding: 'none', bottomNav: false } },
  { id: 'local-knowledge', title: '地域の知', component: Local, toolbar: Toolbar, layout: { header: 'none', contentPadding: 'none', mobileHeight: 58, mapControls: true, bottomNav: true } },
];
