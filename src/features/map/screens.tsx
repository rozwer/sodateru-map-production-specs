import { useEffect, useRef, useState } from 'react';
import type { ScreenDefinition, ScreenProps } from '../../app/contracts';
import { useMapBridge, useMapSnapshot } from '../../app/useMapBridge';
import { useScreenState } from '../../app/useScreenState';
import { Status } from '../../ui/Status';
import { Icon } from '../../ui/Icon';
import { MapIcon } from './MapIcon';
import { mapDisplay, useMapDisplay } from '../../map/display-state';
import { mapMessages as m } from './messages';
import { candidatePresentation, detailPresentation, useMapSession } from './map-state';
import { PlaceDetailPanel, PlacePhoto, NearbyCards, ObjectEditPanel, type DecorationDraft } from './MapPanels';
import { subscribeGrowthChanges } from '../activity/growth-refresh';
import { BuildingGrowthPanel } from './BuildingGrowthPanel';
import './map-feature.css';

type Props = ScreenProps & { active?: boolean };
export function MapToolbar({ route, navigate, scopeKey }: ScreenProps) {
  const bridge = useMapBridge();
  const [state, session] = useMapSession(scopeKey);
  const [playback, setPlayback] = useState<'idle' | 'playing' | 'done'>('idle');
  const playbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (playbackTimer.current) clearTimeout(playbackTimer.current); }, []);
  useEffect(() => subscribeGrowthChanges(changedScope => { if (changedScope === scopeKey) void session.loadGrowth(bridge); }), [bridge, session, scopeKey]);
  useEffect(() => { if (route.pageId === 'map' || route.pageId === 'personal-map') void session.loadGrowth(bridge); }, [route.pageId, scopeKey, bridge, session]);
  if (!['map', 'personal-map', 'map-layers', 'object-place'].includes(route.pageId)) return null;
  if (route.pageId === 'personal-map') return <div className="map-personal-toolbar"><div className="map-personal-toolbar__title"><div><h1>{m.personalTitle}</h1><p>{m.personalLead}</p></div><button type="button" className="map-track-replay" disabled={playback === 'playing' || (!state.personalLoading && !state.records.length && !state.growth.length)} onClick={() => { window.dispatchEvent(new CustomEvent('sodateru:play-growth')); setPlayback('playing'); if (playbackTimer.current) clearTimeout(playbackTimer.current); playbackTimer.current = setTimeout(() => setPlayback('done'), window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 300 : 7600); }}><span aria-hidden="true">▶</span>{playback === 'playing' ? '軌跡を再生中…' : playback === 'done' ? 'もう一度再生' : '軌跡を再生'}</button></div>{!state.personalLoading && !state.records.length && !state.growth.length && <p className="map-track-empty">再生できる軌跡はまだありません。体験を記録すると、ここから街の変化を再生できます。</p>}<button type="button" className="map-track-replay" onClick={() => window.dispatchEvent(new Event('sodateru:record-growth'))}>横浜の軌跡を動画保存</button><div className="map-theme-filters"><button type="button" aria-pressed={!state.themeId} onClick={() => void session.loadPersonal(bridge, null)}>{m.all}</button>{state.themes.map(theme => <button type="button" key={theme.id} aria-pressed={state.themeId === theme.id} onClick={() => void session.loadPersonal(bridge, theme.id)}><MapIcon name="cup"/>{theme.name}</button>)}</div></div>;
  if (route.pageId === 'object-place') return <div className="map-placement-help"><Icon name="pin"/><p>{m.placeHelp}</p></div>;
  return <div className="map-search-toolbar"><form onSubmit={event => { event.preventDefault(); if (!state.query.trim()) return; void session.search(bridge); navigate('map', { state: 'search-place-selected' }); }}><MapIcon name="search"/><input type="search" value={state.query} placeholder={m.searchPlaceholder} aria-label="場所・お店を検索" onChange={event => session.setQuery(event.target.value)} /><button type="submit" disabled={state.loading || !state.query.trim()}>{m.search}</button></form><button type="button" className="map-ai-button" aria-label={m.ai} onClick={() => navigate('ai-explore')}><MapIcon name="robot"/></button></div>;
}

function MapScreen({ route, navigate, scopeKey, active = true }: Props) {
  const bridge = useMapBridge(); const [state, session] = useMapSession(scopeKey);
  const display = useMapDisplay(bridge);
  const focusedPlace = useRef<string | null>(null);
  const [ui, setUi] = useScreenState({ tab: 'results' as 'results' | 'place', more: false });
  const [now, setNow] = useState(Date.now());
  useEffect(() => { if (!active) return; const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, [active]);
  useEffect(() => {
    if (!active) return;
    if (route.params.placeId) { void session.loadDetail(route.params.placeId); setUi(value => ({ ...value, tab: 'place' })); }
    else if (route.params.q && route.params.q !== state.searchedQuery) { session.setQuery(route.params.q); void session.search(bridge); }
    else if (!state.result && !state.places.length && !state.loading) void session.loadPlaces(bridge);
  }, [route.params.placeId, route.params.q, active]);
  useEffect(() => {
    if (!active || !state.detail) return;
    const place = state.detail.place;
    bridge.showPlaces('map-search', { places: [{ id: place.id, placeId: place.id, coordinates: place.coordinates, label: place.name }], selectedPlaceId: place.id });
    if (focusedPlace.current !== place.id) { focusedPlace.current = place.id; bridge.focus('map-search', { center: place.coordinates, zoom: 16 }); }
    void session.loadNearby(place.coordinates);
  }, [active, state.detail?.place.id]);
  useEffect(() => {
    if (!active) return;
    const candidate = bridge.onSelect('map-search', selection => { if (selection.kind === 'candidate') { session.selectCandidate(selection.id, bridge); setUi(value => ({ ...value, tab: 'place' })); } });
    const place = bridge.onSelect('personal-map', selection => { void session.loadDetail(selection.id); setUi(value => ({ ...value, tab: 'place' })); navigate('map', { placeId: selection.id }); });
    const object = bridge.onSelect('map-objects', selection => navigate('object-edit', { objectId: selection.id }));
    const poi = bridge.onSelect('map-poi', selection => { const label = (selection as { label?: string }).label; if (label) { session.setQuery(label); void session.search(bridge); } });
    const building = bridge.onSelect('map-building', selection => navigate('map', { buildingKey: selection.buildingKey || selection.id }));
    return () => { candidate(); place(); object(); poi(); building(); };
  }, [active, bridge, session, navigate]);
  const candidate = state.result?.items.find(item => item.candidateId === state.selectedCandidateId);
  const place = state.detail ? detailPresentation(state.detail) : candidate ? candidatePresentation(candidate) : null;
  const expired = !!state.result && state.result.expiresAt <= now;
  const routeTo = () => navigate('route-conditions', state.selectedPlaceId ? { placeId: state.selectedPlaceId, destinationPlaceId: state.selectedPlaceId } : candidate && state.result ? { resultId: state.result.resultId, candidateId: candidate.candidateId } : {});
  const save = async () => { const saved = await session.saveSelected(); if (saved) navigate('map', { placeId: saved.id }); };
  const retry = () => { if (state.failedOperation === 'save') void save(); else if (state.failedOperation === 'places') void session.loadPlaces(bridge); else void session.search(bridge); };
  const selected = (id: string) => { session.selectCandidate(id, bridge); setUi(value => ({ ...value, tab: 'place' })); };
  const nearby = () => { void session.search(bridge, 'coffee'); setUi(value => ({ ...value, tab: 'results' })); };
  const nearbySelected = (id: string) => { session.selectNearby(id, bridge); setUi(value => ({ ...value, tab: 'place' })); };
  return <div className="map-feature" data-testid="map-screen">
    {state.growthError && <Status kind="error" onRetry={() => void session.loadGrowth(bridge)}>成長の取得に失敗しました。直前の表示を保持しています。{state.growthError}</Status>}
    {(route.params.buildingKey || state.detail) && <BuildingGrowthPanel buildingKey={route.params.buildingKey} buildings={display.buildings} growth={state.growth} growthLoaded={state.growthLoaded} places={state.places} place={state.detail?.place || null} onSaved={async () => { if (state.detail) await session.loadDetail(state.detail.place.id, true); await session.loadGrowth(bridge); }} openPlace={id => navigate('map', { placeId: id })} openRecord={id => navigate('record-detail', { recordId: id })} reloadMap={() => mapDisplay(bridge).reloadStyle()}/>}

    {(state.result || state.loading || route.params.state === 'search-place-selected') && <div className="map-result-tabs" role="tablist" aria-label="検索結果の表示"><button type="button" role="tab" aria-selected={ui.tab === 'results'} onClick={() => setUi(value => ({ ...value, tab: 'results' }))}>{m.searchResults}{state.result ? ` ${state.result.items.length}件` : ''}</button><button type="button" role="tab" aria-selected={ui.tab === 'place'} disabled={!place} onClick={() => setUi(value => ({ ...value, tab: 'place' }))}>{m.placeInfo}</button></div>}
    {state.loading && <Status kind="loading">場所を検索中…</Status>}
    {state.error && <Status kind="error" onRetry={retry}>{state.error}</Status>}
    {expired && <Status kind="unavailable" onRetry={() => void session.search(bridge)}>{m.expired}</Status>}
    {!state.loading && state.result && ui.tab === 'results' && !expired && <><ul className="map-result-list">{state.result.items.map(item => <li key={item.candidateId}><button type="button" onClick={() => selected(item.candidateId)}><MapIcon name="cup"/><div><strong>{item.name}</strong><p>{item.address || m.addressMissing}</p><small>{item.categories.join('・')}</small></div><span aria-hidden="true">›</span></button></li>)}</ul>{state.result.items.length === 0 && <Status>{m.searchEmpty}</Status>}</>}
    {state.detailLoading && <Status kind="loading">場所の情報を読み込み中…</Status>}
    {state.detailError && <Status kind="error" onRetry={session.retryDetail}>{state.detailError}</Status>}
    {place && ui.tab === 'place' && <><PlaceDetailPanel place={place} variant={state.result ? 'search' : 'place'} saved={!!state.selectedPlaceId} saving={state.saving} canSave={!expired && candidate?.retention !== 'temporary'} onSave={() => void save()} onRoute={routeTo} onShare={() => navigate('sharing', state.selectedPlaceId ? { placeId: state.selectedPlaceId } : {})} onMore={() => setUi(value => ({ ...value, more: !value.more }))} />
      {state.selectedPlaceId && <button type="button" className="map-primary map-wide" onClick={() => navigate('visit-confirm', { placeId: state.selectedPlaceId! })}>行ったを確認する</button>}
      {candidate?.retention === 'temporary' && <p className="map-muted map-small">{m.temporary}</p>}
      {state.detail?.ownRecords.status === 'failed' && <Status kind="error" onRetry={session.retryDetail}>本人の記録を取得できませんでした。</Status>}
      {state.detail?.ownRecords.items.length ? <section className="map-own-records"><h3>この場所での体験</h3>{state.detail.ownRecords.items.map(record => <button type="button" className="map-inline-place" key={record.id} onClick={() => navigate('record-detail', { recordId: record.id })}>{record.body || record.purposes.join('・') || '体験の記録'} ›</button>)}</section> : null}
      {state.detail?.visits.status === 'failed' && <Status kind="error" onRetry={session.retryDetail}>訪問の確認状態を取得できませんでした。</Status>}
      {state.detail?.visits.items.length ? <section><h3>この場所の訪問</h3>{state.detail.visits.items.map(visit => <button type="button" className="map-inline-place" key={visit.id} onClick={() => navigate('visit-confirm', { visitId: visit.id })}>{visit.status === 'confirmed' ? '確認済みの訪問' : visit.status === 'candidate' ? '未確認の訪問候補' : '取り消した訪問'}{visit.startedAt === null ? '（日時未指定）' : `（${new Date(visit.startedAt).toLocaleDateString('ja-JP')}）`} ›</button>)}</section> : null}
      {state.detail?.colocated.length ? <section><h3>同じ建物の場所</h3>{state.detail.colocated.map(item => <button className="map-inline-place" type="button" key={item.id} onClick={() => navigate('map', { placeId: item.id })}>{item.name} ›</button>)}</section> : null}
      {ui.more && <div className="map-inline-menu" onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setUi(value => ({ ...value, more: false })); } }}><button type="button" onClick={routeTo}><MapIcon name="locate"/>{m.route}</button><button type="button" onClick={() => navigate('record-create', state.selectedPlaceId ? { placeId: state.selectedPlaceId } : {})}><MapIcon name="pen"/>この場所の体験を記録</button><button type="button" onClick={() => navigate('object-edit', { longitude: String(state.detail?.place.coordinates[0] ?? candidate?.position.longitude ?? bridge.getSnapshot().camera.longitude), latitude: String(state.detail?.place.coordinates[1] ?? candidate?.position.latitude ?? bridge.getSnapshot().camera.latitude) })}><MapIcon name="cube"/>目印を追加</button><button type="button" onClick={() => setUi(value => ({ ...value, more: false }))}>閉じる</button></div>}
      {state.nearbyLoading && <Status kind="loading">周辺の候補を読み込み中…</Status>}
      {state.nearbyError && <Status kind="error" onRetry={() => void session.loadNearby(state.detail?.place.coordinates || [bridge.getSnapshot().camera.longitude, bridge.getSnapshot().camera.latitude])}>{state.nearbyError}</Status>}
      {state.detail && !state.nearbyLoading && <NearbyCards places={(state.nearby?.items || []).slice(0, 3).map(candidatePresentation)} onSelect={nearbySelected} onMore={nearby}/>}
    </>}
    {!state.result && !place && !state.loading && <><div className="map-section-heading"><h2>{m.area}</h2><p className="map-muted map-small">暮らしやスポットを見つけて、あなたの地図を育てていきましょう。</p></div><button type="button" className="map-area-card" onClick={nearby}><Icon name="pin"/><div><h3>{m.placeInfo}</h3><p>地図を動かして、気になる場所を選んでください。</p></div><span aria-hidden="true">›</span></button><NearbyCards places={[]} onSelect={selected} onMore={nearby}/>{state.places.length > 0 && <section><h3>保存した場所</h3><ul className="map-saved-list">{state.places.map(item => <li key={item.id}><button type="button" onClick={() => navigate('map', { placeId: item.id })}><MapIcon name="bookmark"/><span>{item.name}</span>›</button></li>)}</ul>{state.nextPlaceCursor && <button className="map-outline" type="button" onClick={() => void session.loadPlaces(bridge, true)}>さらに表示</button>}</section>}</>}
  </div>;
}

function PersonalMapScreen({ route, navigate, scopeKey, active = true }: Props) {
  const bridge = useMapBridge(); const [state, session] = useMapSession(scopeKey);
  useEffect(() => { if (active) { void session.loadThemes(); void session.loadPersonal(bridge, route.params.themeId || state.themeId); } }, [active, route.params.themeId]);
  useEffect(() => active ? bridge.onSelect('personal-map', selection => { void session.loadDetail(selection.id); }) : undefined, [active, bridge, session]);
  const detail = state.detail;
  const record = state.records.find(item => item.effectivePlaceId === state.selectedPlaceId);
  const detailedRecord = detail?.ownRecords.items.find(item => item.id === record?.id);
  const theme = state.themes.find(item => item.id === state.themeId) || state.themes.find(item => record && item.recordIds.includes(record.id));
  return <div className={`map-feature map-personal-panel${!detail ? ' map-personal-panel--empty' : ''}`}>
    {state.growthError && <Status kind="error" onRetry={() => void session.loadGrowth(bridge)}>地図の成長を取得できませんでした。{state.growthError}</Status>}
    {state.personalLoading && <Status kind="loading">体験のある場所を読み込み中…</Status>}
    {state.personalError && <Status kind="error" onRetry={() => void session.loadPersonal(bridge, state.themeId)}>{state.personalError}</Status>}
    {state.detailError && <Status kind="error" onRetry={session.retryDetail}>{state.detailError}</Status>}
    {detail ? <><div className="map-personal-detail"><PlacePhoto place={{ ...detailPresentation(detail), photoUrl: detailedRecord?.media.find(media => media.kind === 'photo' && media.status === 'ready')?.contentUrl || detailPresentation(detail).photoUrl }}/><div><h2 className="map-icon-line"><MapIcon name="cup"/>{detail.place.name}</h2><button type="button" className="map-address-link" onClick={() => navigate('map', { placeId: detail.place.id })}><Icon name="pin"/>{detail.place.address || m.addressMissing}</button><p className="map-muted">{record?.impression}</p><blockquote>{record?.body || 'この場所の記録を選んでください。'}</blockquote></div></div>
      <div className="map-personal-theme"><span>{m.theme}</span>{theme && <button type="button" className="map-theme-chip" onClick={() => void session.loadPersonal(bridge, theme.id)}><MapIcon name="cup"/>{theme.name}</button>}</div>
      <button type="button" className="map-primary map-wide" onClick={() => navigate('daily-track', { placeId: detail.place.id, ...(record?.effectiveStartedAt != null ? { date: new Date(record.effectiveStartedAt).toLocaleDateString('sv-SE'), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone } : {}) })}><MapIcon name="book"/>{m.records}<span aria-hidden="true">›</span></button>
      {theme && <button type="button" className="map-outline map-wide" onClick={() => navigate('theme-edit', { themeId: theme.id })}><MapIcon name="pen"/>{m.editTheme}</button>}
    </> : !state.personalLoading && <><p className="map-muted">{state.records.length ? '地図の場所を選んで、記憶を見返しましょう。' : m.personalEmpty}</p><button type="button" className="map-outline" onClick={() => navigate('record-create')}>体験を記録する</button></>}
    {state.nextRecordCursor && <button type="button" className="map-outline" onClick={() => void session.loadPersonal(bridge, state.themeId, true)}>さらに表示</button>}
  </div>;
}

function LayersScreen({ back }: Props) {
  const [values, setValues] = useScreenState({ themes: true, suggestions: true, friends: false, motorcycle: true });
  return <div className="map-feature"><div className="map-layer-list">{([
    ['themes', m.themes, m.themesHelp, <MapIcon name="book"/>], ['suggestions', m.suggestions, m.suggestionsHelp, <MapIcon name="search"/>], ['friends', m.friends, m.friendsHelp, <Icon name="people"/>], ['motorcycle', m.motorcycle, m.motorcycleHelp, <MapIcon name="motorcycle"/>],
  ] as const).map(([key, title, help, icon]) => <label className="map-layer-row" key={key}><span className="map-layer-icon">{icon}</span><span><strong>{title}</strong><p>{help}</p></span><input type="checkbox" role="switch" checked={values[key]} onChange={event => setValues(previous => ({ ...previous, [key]: event.target.checked }))} aria-label={title}/></label>)}</div><Status kind="unavailable">表示設定を現在取得できません。保存機能の接続後に再試行できます。</Status><button type="button" className="map-primary map-wide" onClick={back}>{m.backMap}</button></div>;
}

const drafts = new Map<string, DecorationDraft>();
function ObjectEditScreen({ route, navigate, back, scopeKey }: Props) {
  const bridge = useMapBridge(); const key = `${scopeKey}:${route.params.objectId || 'new'}`;
  const [draft, setDraft] = useScreenState<DecorationDraft>(() => drafts.get(key) || { name: '', memo: '', color: m.colors[0].value, size: 'medium', coordinates: [Number(route.params.longitude) || bridge.getSnapshot().camera.longitude, Number(route.params.latitude) || bridge.getSnapshot().camera.latitude] });
  const [error, setError] = useState<string | null>(route.params.objectId ? '目印を現在取得できません。' : null);
  const update = (value: DecorationDraft) => { drafts.set(key, value); setDraft(value); };
  useEffect(() => { if (route.params.placedLongitude && route.params.placedLatitude) update({ ...draft, coordinates: [Number(route.params.placedLongitude), Number(route.params.placedLatitude)] }); }, [route.params.placedLongitude, route.params.placedLatitude]);
  return <div className="map-feature"><ObjectEditPanel draft={draft} onChange={update} onRelocate={() => { drafts.set(key, draft); bridge.focus('map-objects', { center: draft.coordinates, zoom: 16 }); navigate('object-place', { objectId: route.params.objectId || 'new' }); }} onCancel={() => { drafts.delete(key); setDraft({ name: '', memo: '', color: m.colors[0].value, size: 'medium', coordinates: [bridge.getSnapshot().camera.longitude, bridge.getSnapshot().camera.latitude] }); back(); }} onSave={() => setError('目印の保存は現在利用できません。入力は保持されています。')} onDelete={route.params.objectId ? () => setError('目印の削除は現在利用できません。') : undefined} saving={false} error={error}/></div>;
}
function ObjectPlaceScreen({ route, navigate, back, scopeKey, active = true }: Props) {
  const bridge = useMapBridge(); const snapshot = useMapSnapshot();
  useEffect(() => {
    if (!active) return;
    const draft = drafts.get(`${scopeKey}:${route.params.objectId || 'new'}`);
    mapDisplay(bridge).setPlacement({ color: draft?.color || m.colors[0].value, size: draft?.size || 'medium' });
    return () => mapDisplay(bridge).setPlacement(null);
  }, [active, scopeKey, route.params.objectId, bridge]);
  return <div className="map-feature"><div className="map-placement-address"><Icon name="pin"/><div><strong>選択している場所</strong><p>{snapshot.camera.latitude.toFixed(5)}, {snapshot.camera.longitude.toFixed(5)}</p></div></div><div className="map-two-actions"><button type="button" className="map-secondary" onClick={back}>{m.cancel}</button><button type="button" className="map-primary" onClick={() => { const objectId = route.params.objectId || 'new'; const key = `${scopeKey}:${objectId}`; const draft = drafts.get(key); if (draft) drafts.set(key, { ...draft, coordinates: [snapshot.camera.longitude, snapshot.camera.latitude] }); navigate('object-edit', { ...(objectId === 'new' ? {} : { objectId }), placedLongitude: String(snapshot.camera.longitude), placedLatitude: String(snapshot.camera.latitude) }); }}>{m.placeHere}</button></div></div>;
}

export const screens: ScreenDefinition[] = [
  { id: 'map', title: '地図', component: MapScreen, layout: { header: 'none', contentPadding: 'none', mapControls: true, mobileHeight: 47 } }, { id: 'personal-map', title: m.personalTitle, component: PersonalMapScreen, layout: { header: 'none', contentPadding: 'none', mapControls: true, mobileHeight: 40 } },
  { id: 'map-layers', title: m.layersTitle, component: LayersScreen, layout: { header: 'close', mapControls: true, mobileHeight: 65 } }, { id: 'object-edit', title: m.objectTitle, component: ObjectEditScreen, layout: { header: 'back', bottomNav: false, background: 'soft' } }, { id: 'object-place', title: m.placeTitle, component: ObjectPlaceScreen, layout: { header: 'back', bottomNav: false, mapControls: true, mobileHeight: 25 } },
];
