import { useEffect, useMemo, useState } from 'react';
import { api } from '../../app/api';
import type { ScreenDefinition, ScreenProps } from '../../app/contracts';
import { useMapBridge } from '../../app/useMapBridge';
import { useScreenState } from '../../app/useScreenState';
import { MapBridge } from '../../app/map-bridge';
import { MapPreview } from '../../map/MapPreview';
import { KnowledgeDetailView, KnowledgeFilterView, KnowledgeListView, KnowledgePlaceView, KnowledgeStatus } from './views';
import { emptyFilters, type KnowledgeFilters, type KnowledgeKind, type KnowledgeRecord } from './types';
import { sharedKnowledgeQuery } from './query';
const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const message = (error: unknown) => error instanceof Error ? error.message : '地域の声を読み込めませんでした。';
function filtersOf(value?: string): KnowledgeFilters { try { return value ? { ...emptyFilters, ...JSON.parse(value) } : emptyFilters; } catch { return emptyFilters; } }
const loadMedia = (media: { id: string }, signal: AbortSignal) => api.request('getMediaMediaIdContent', { path: { mediaId: media.id }, signal });
function useRecords(props: ScreenProps, query: string, filters: KnowledgeFilters, kind: KnowledgeKind) {
  const [state, set] = useState<{ items: KnowledgeRecord[]; total: number; cursor: string | null; loading: boolean; error: string }>({ items: [], total: 0, cursor: null, loading: true, error: '' });
  const [revision, refresh] = useState(0), [cursor, setCursor] = useState<string | undefined>();
  const key = JSON.stringify([props.scopeKey, query, filters, kind, props.route.params.placeId, props.route.params.recordId]);
  useEffect(() => { setCursor(undefined); }, [key]);
  useEffect(() => {
    if (props.active === false) return;
    const abort = new AbortController(); set(old => ({ ...old, items: cursor ? old.items : [], total: cursor ? old.total : 0, loading: true, error: '' }));
    void (async () => {
      if (kind === 'rest-tip') throw new Error('休憩チップの分類は接続確認中です。体験タブでは共有記録を取得できます。');
      if (kind === 'people') throw new Error('地域から人物を絞り込む機能は接続確認中です。友達はメニューから開けます。');
      const filter = sharedKnowledgeQuery({ query, filters, timeZone, placeId: props.route.params.placeId });
      let page = await api.request('getSharedRecords', { query: { ...filter, includeUndated: true, limit: 100, cursor }, signal: abort.signal });
      const target = props.route.params.recordId;
      while (target && !page.items.some(item => item.id === target) && page.nextCursor) page = await api.request('getSharedRecords', { query: { ...filter, includeUndated: true, limit: 100, cursor: page.nextCursor }, signal: abort.signal });
      if (!abort.signal.aborted) set(old => ({ items: cursor ? [...old.items, ...page.items.filter(item => !old.items.some(previous => previous.id === item.id))] : page.items, total: page.totalCount, cursor: page.nextCursor, loading: false, error: target && !page.items.some(item => item.id === target) ? 'この投稿は現在閲覧できません。' : '' }));
    })().catch(error => { if (!abort.signal.aborted) set({ items: [], total: 0, cursor: null, loading: false, error: message(error) }); });
    return () => abort.abort();
  }, [key, props.active, cursor, revision]);
  return { ...state, retry: () => refresh(v => v + 1), more: () => setCursor(state.cursor ?? undefined) };
}
function List(props: ScreenProps) {
  const [draft, set] = useScreenState({ query: '', submitted: '', kind: 'experience' as KnowledgeKind });
  const filters = filtersOf(props.route.params.filters), data = useRecords(props, draft.submitted, filters, draft.kind);
  const open = (id: string) => props.navigate('knowledge-detail', { recordId: id });
  return <KnowledgeListView query={draft.query} onQuery={query => set(old => ({ ...old, query }))} onSearch={() => set(old => ({ ...old, submitted: old.query }))} onClear={() => set(old => ({ ...old, query: '', submitted: '' }))} kind={draft.kind} onKind={kind => set(old => ({ ...old, kind }))} records={data.items} totalCount={data.total} heading="地域の共有体験" timeZone={timeZone} center={filters.center} loading={data.loading} error={data.error} nextCursor={data.cursor} onLoadMore={data.more} onRetry={data.retry} onBack={props.back} onFilter={() => props.navigate('knowledge-filter', { filters: JSON.stringify(filters) })} onMap={() => props.navigate('local-knowledge', props.route.params)} onOpen={open} onPerson={personId => props.navigate('friend-profile', { personId })} onPost={() => props.navigate('record-create')} active={props.active} loadMedia={loadMedia}/>;
}
function Filter(props: ScreenProps) {
  const bridge = useMemo(() => new MapBridge(`${props.scopeKey}:knowledge-filter`), [props.scopeKey]);
  const [error, setError] = useState('');
  useEffect(() => () => bridge.dispose(), [bridge]);
  return <KnowledgeFilterView initial={filtersOf(props.route.params.filters)} onClose={props.back} onApply={filters => { try { sharedKnowledgeQuery({ query: '', filters, timeZone }); props.navigate('knowledge-list', { filters: JSON.stringify(filters) }); } catch (error) { setError(message(error)); } }} onAreaSearch={() => setError('地域検索の候補選択は接続確認中です。')} error={error} map={props.active === false ? null : <MapPreview bridge={bridge} label="検索地域の地図" interactive/>}/>;
}
function Detail(props: ScreenProps) {
  const data = useRecords(props, '', emptyFilters, 'experience');
  const [sourceNotice, setSourceNotice] = useState('');
  const record = data.items.find(item => item.id === props.route.params.recordId);
  if (!record || data.loading || data.error) return <div className="knowledge-panel"><button onClick={props.back}>戻る</button><KnowledgeStatus loading={data.loading} error={data.error} retry={data.retry}/></div>;
  return <><KnowledgeStatus error={sourceNotice}/><KnowledgeDetailView record={record} timeZone={timeZone} onBack={props.back} onPlace={placeId => props.navigate('local-knowledge', { placeId })} onAuthor={personId => props.navigate('friend-profile', { personId })} onSource={() => setSourceNotice('原文の出典確認は接続確認中です。この表示は現在閲覧できる共有投稿です。')} active={props.active} loadMedia={loadMedia}/></>;
}
function Local(props: ScreenProps) {
  const data = useRecords(props, '', emptyFilters, 'experience'), bridge = useMapBridge();
  useEffect(() => {
    if (props.active === false) return;
    bridge.showPlaces('knowledge', { places: data.items.flatMap(record => record.place ? [{ id: record.id, placeId: record.place.id, coordinates: record.place.coordinates, label: record.place.name }] : []) });
    return () => bridge.clear('knowledge');
  }, [data.items, props.active, bridge]);
  return <><KnowledgeStatus loading={data.loading}/><KnowledgePlaceView name={data.items[0]?.place?.name ?? '地域の知'} records={data.items} totalCount={data.total} timeZone={timeZone} onClose={props.back} onVoices={() => props.navigate('knowledge-list', props.route.params)} onOpen={recordId => props.navigate('knowledge-detail', { recordId })} error={data.error} active={props.active} loadMedia={loadMedia}/></>;
}
function Toolbar(props: ScreenProps) { return <header className="knowledge-header"><button onClick={props.back}>戻る</button><h2>地域の知</h2><button onClick={() => props.navigate('navigation', { mode: 'main' })}>メニュー</button></header>; }
export const screens: ScreenDefinition[] = [
  { id: 'knowledge-list', title: '地域の声', component: List, layout: { header: 'none', contentPadding: 'none', bottomNav: false } },
  { id: 'knowledge-filter', title: '検索条件', component: Filter, layout: { header: 'none', contentPadding: 'none', bottomNav: false } },
  { id: 'knowledge-detail', title: '地域の声の詳細', component: Detail, layout: { header: 'none', contentPadding: 'none', bottomNav: false } },
  { id: 'local-knowledge', title: '地域の知', component: Local, toolbar: Toolbar, layout: { header: 'none', contentPadding: 'none', mobileHeight: 58, mapControls: true, bottomNav: true } },
];
