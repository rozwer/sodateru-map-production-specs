import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { api } from '../../app/api';
import type { CandidateResult, Candidate, Place, PlaceDetail, Theme, RecordView, GrowthItem } from '../../../packages/api-client/index';
import type { MapBridge } from '../../app/map-bridge';
import type { PlacePresentation } from './MapPanels';
import { showGrowth } from '../../map/display-state';

type SearchState = {
  query: string; searchedQuery: string; result: CandidateResult | null; selectedCandidateId: string | null; selectedPlaceId: string | null;
  detail: PlaceDetail | null; places: Place[]; themes: Theme[]; records: RecordView[]; growth: GrowthItem[];
  themeId: string | null; loading: boolean; placesLoading: boolean; detailLoading: boolean; saving: boolean; error: string | null; detailError: string | null;
  personalError: string | null; personalLoading: boolean; nextPlaceCursor: string | null; nextRecordCursor: string | null;
  failedOperation: 'search' | 'save' | 'places' | null;
  nearby: CandidateResult | null; nearbyLoading: boolean; nearbyError: string | null;
  growthError: string | null; growthLoaded: boolean;
};
function message(error: unknown) { return error instanceof Error ? error.message : '通信に失敗しました。'; }
function aborted(error: unknown) { return error instanceof DOMException && error.name === 'AbortError'; }
const sessions = new Map<string, MapSession>();

/** Page state is temporary; saved places and records are always read from the API. */
export class MapSession {
  private listeners = new Set<() => void>();
  private searchAbort: AbortController | null = null;
  private detailAbort: AbortController | null = null;
  private placesAbort: AbortController | null = null;
  private personalAbort: AbortController | null = null;
  private nearbyAbort: AbortController | null = null;
  private growthAbort: AbortController | null = null;
  private lifetime = new AbortController();
  consumers = 0;
  private generation = 0;
  private creates = new Map<string, string>();
  private savedCandidates = new Map<string, string>();
  private state: SearchState;
  constructor(readonly scopeKey: string) {
    let query = ''; try { query = localStorage.getItem(`sodateru.map-query:${scopeKey}`) || ''; } catch { /* The input remains editable. */ }
    this.state = { query, searchedQuery: '', result: null, selectedCandidateId: null, selectedPlaceId: null, detail: null, places: [], themes: [], records: [], growth: [], themeId: null, loading: false, placesLoading: false, detailLoading: false, saving: false, error: null, detailError: null, personalError: null, personalLoading: false, nextPlaceCursor: null, nextRecordCursor: null, failedOperation: null, nearby: null, nearbyLoading: false, nearbyError: null, growthError: null, growthLoaded: false };
  }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private update(patch: Partial<SearchState>) { if (this.lifetime.signal.aborted) return; this.state = { ...this.state, ...patch }; this.listeners.forEach(listener => listener()); }
  setQuery = (query: string) => { this.searchAbort?.abort(); this.generation++; this.update({ query, loading: false }); try { localStorage.setItem(`sodateru.map-query:${this.scopeKey}`, query); } catch { /* Only a draft. */ } };
  async search(bridge: MapBridge, category?: 'coffee' | 'restaurant' | 'bakery' | 'park') {
    const query = this.state.query.trim(); if (!category && !query) return;
    this.searchAbort?.abort(); const signal = (this.searchAbort = new AbortController()).signal;
    const generation = ++this.generation;
    const camera = bridge.getSnapshot().camera;
    this.update({ loading: true, error: null, failedOperation: null, result: null, selectedCandidateId: null, selectedPlaceId: null, detail: null, searchedQuery: query });
    bridge.clear('map-search');
    try {
      const { data } = await api.request('getPlaceCandidates', { query: category ? { category, longitude: camera.longitude, latitude: camera.latitude } : { q: query, limit: 10 }, signal });
      if (signal.aborted || generation !== this.generation) return;
      this.update({ result: data, loading: false });
      bridge.showCandidates('map-search', { resultId: data.resultId, expiresAt: data.expiresAt, candidates: data.items.map((candidate, i) => ({ id: candidate.candidateId, coordinates: [candidate.position.longitude, candidate.position.latitude], label: candidate.name, number: i + 1 })) });
      const first = data.items[0];
      if (data.items.length === 1 && first) bridge.focus('map-search', { center: [first.position.longitude, first.position.latitude], zoom: 16 });
      else if (data.items.length > 1) bridge.focus('map-search', { bounds: [[Math.min(...data.items.map(c => c.position.longitude)), Math.min(...data.items.map(c => c.position.latitude))], [Math.max(...data.items.map(c => c.position.longitude)), Math.max(...data.items.map(c => c.position.latitude))]] });
    } catch (error) { if (!signal.aborted && !aborted(error)) this.update({ loading: false, error: message(error), failedOperation: 'search' }); }
  }
  selectCandidate = (id: string, bridge: MapBridge) => {
    if (this.state.selectedCandidateId === id) return;
    const candidate = this.state.result?.items.find(item => item.candidateId === id); if (!candidate) return;
    this.detailAbort?.abort();
    this.update({ selectedCandidateId: id, selectedPlaceId: candidate.placeId, detail: null, detailError: null, detailLoading: false });
    bridge.selectCandidate('map-search', id);
    bridge.focus('map-search', { center: [candidate.position.longitude, candidate.position.latitude], zoom: 16 });
    if (candidate.placeId) void this.loadDetail(candidate.placeId);
  };
  async loadDetail(placeId: string, force = false) {
    if (!force && this.state.selectedPlaceId === placeId && (this.state.detail?.place.id === placeId || this.state.detailLoading)) return;
    this.detailAbort?.abort(); const signal = (this.detailAbort = new AbortController()).signal;
    this.update({ selectedPlaceId: placeId, detail: null, detailLoading: true, detailError: null });
    try { const { data } = await api.request('getPlacesPlaceId', { path: { placeId }, signal }); if (!signal.aborted) this.update({ detail: data, detailLoading: false }); }
    catch (error) { if (!signal.aborted && !aborted(error)) this.update({ detailLoading: false, detailError: message(error) }); }
  }
  retryDetail = () => { const id = this.state.selectedPlaceId; if (id) void this.loadDetail(id, true); };
  async loadNearby(center: [number, number]) {
    this.nearbyAbort?.abort(); const signal = (this.nearbyAbort = new AbortController()).signal;
    this.update({ nearby: null, nearbyLoading: true, nearbyError: null });
    try { const { data } = await api.request('getPlaceCandidates', { query: { category: 'coffee', longitude: center[0], latitude: center[1] }, signal }); if (!signal.aborted) this.update({ nearby: data, nearbyLoading: false }); }
    catch (error) { if (!signal.aborted && !aborted(error)) this.update({ nearbyLoading: false, nearbyError: message(error) }); }
  }
  selectNearby(id: string, bridge: MapBridge) {
    const result = this.state.nearby;
    if (!result || result.expiresAt <= Date.now() || !result.items.some(item => item.candidateId === id)) return;
    this.searchAbort?.abort(); this.generation++;
    this.update({ result, selectedCandidateId: null, selectedPlaceId: null, detail: null, loading: false, error: null });
    bridge.showCandidates('map-search', { resultId: result.resultId, expiresAt: result.expiresAt, candidates: result.items.map((item, index) => ({ id: item.candidateId, coordinates: [item.position.longitude, item.position.latitude], label: item.name, number: index + 1 })) });
    this.selectCandidate(id, bridge);
  }
  async saveSelected(): Promise<Place | null> {
    const { result, selectedCandidateId } = this.state;
    const candidate = result?.items.find(item => item.candidateId === selectedCandidateId);
    if (!candidate || !result || this.state.saving) return null;
    if (candidate.placeId) { await this.loadDetail(candidate.placeId); return this.state.detail?.place || null; }
    const key = `${result.resultId}:${candidate.candidateId}`;
    const prior = this.savedCandidates.get(key);
    if (prior) { await this.loadDetail(prior); return this.state.detail?.place || null; }
    if (result.expiresAt <= Date.now()) { this.update({ error: '候補の有効期限が切れました。もう一度検索してください。', failedOperation: 'search' }); return null; }
    if (candidate.retention !== 'storable') { this.update({ error: 'この候補は一時表示のため保存できません。名前から検索してください。' }); return null; }
    if (!this.creates.has(key)) this.creates.set(key, crypto.randomUUID());
    const id = this.creates.get(key)!;
    const generation = this.generation;
    this.update({ saving: true, error: null, failedOperation: null });
    try {
      const { data } = await api.request('postPlaces', { body: { id, mode: 'candidate', resultId: result.resultId, candidateId: candidate.candidateId }, idempotencyKey: id, signal: this.lifetime.signal });
      if (this.lifetime.signal.aborted) return null;
      this.savedCandidates.set(key, data.id);
      if (generation !== this.generation || this.state.selectedCandidateId !== candidate.candidateId) { this.update({ saving: false }); return null; }
      this.update({ saving: false, selectedPlaceId: data.id, places: [...this.state.places.filter(place => place.id !== data.id), data] });
      await this.loadDetail(data.id);
      return data;
    } catch (error) { if (!aborted(error)) this.update({ saving: false, error: message(error), failedOperation: 'save' }); return null; }
  }
  async loadPlaces(bridge: MapBridge, next = false) {
    this.placesAbort?.abort();
    const signal = (this.placesAbort = new AbortController()).signal;
    this.update({ placesLoading: true, error: null, failedOperation: null });
    try {
      const data = await api.request('getPlaces', { query: { limit: 100, cursor: next ? this.state.nextPlaceCursor || undefined : undefined }, signal });
      if (signal.aborted) return;
      const places = next ? [...this.state.places, ...data.items.filter(place => !this.state.places.some(old => old.id === place.id))] : data.items;
      this.update({ places, nextPlaceCursor: data.nextCursor, placesLoading: false });
      bridge.showPlaces('personal-map', { places: places.map(place => ({ id: place.id, placeId: place.id, coordinates: place.coordinates, label: place.name })), selectedPlaceId: this.state.selectedPlaceId || undefined });
    } catch (error) { if (!signal.aborted && !aborted(error)) this.update({ placesLoading: false, error: message(error), failedOperation: 'places' }); }
  }
  async loadPersonal(bridge: MapBridge, themeId: string | null, next = false) {
    this.personalAbort?.abort(); const signal = (this.personalAbort = new AbortController()).signal;
    this.update({ themeId, personalLoading: true, personalError: null, records: next ? this.state.records : [] });
    try {
      const data = await api.request('getRecords', { query: { themeId: themeId || undefined, includeUndated: true, limit: 100, cursor: next ? this.state.nextRecordCursor || undefined : undefined }, signal });
      if (signal.aborted) return;
      const records = next ? [...this.state.records, ...data.items.filter(record => !this.state.records.some(old => old.id === record.id))] : data.items;
      this.update({ records, nextRecordCursor: data.nextCursor, personalLoading: false });
      const ids = [...new Set(records.map(record => record.effectivePlaceId).filter((id): id is string => id !== null))];
      const places = new Map(this.state.places.filter(place => ids.includes(place.id)).map(place => [place.id, place]));
      const missing = await Promise.allSettled(ids.filter(id => !places.has(id)).map(async placeId => (await api.request('getPlacesPlaceId', { path: { placeId }, signal })).data.place));
      if (signal.aborted) return;
      for (const result of missing) if (result.status === 'fulfilled') places.set(result.value.id, result.value);
      this.update({ places: [...new Map([...this.state.places, ...places.values()].map(place => [place.id, place])).values()], personalError: missing.some(result => result.status === 'rejected') ? '一部の場所を取得できませんでした。記録は表示できます。' : null });
      bridge.showPlaces('personal-map', { places: [...places.values()].map(place => ({ id: place.id, placeId: place.id, coordinates: place.coordinates, label: place.name, recordIds: records.filter(record => record.effectivePlaceId === place.id).map(record => record.id) })), selectedPlaceId: this.state.selectedPlaceId || undefined });
      const camera = bridge.getSnapshot().camera;
      const timeline = records.filter(record => {
        if (!record.effectivePlaceId || record.effectiveStartedAt === null) return false;
        const place = places.get(record.effectivePlaceId); if (!place) return false;
        return Math.abs(place.coordinates[0] - camera.longitude) < 0.3 && Math.abs(place.coordinates[1] - camera.latitude) < 0.3;
      }).sort((a, b) => (a.effectiveStartedAt ?? 0) - (b.effectiveStartedAt ?? 0));
      const points = timeline.map((record, index) => { const place = places.get(record.effectivePlaceId!)!; return { id: record.id, coordinates: place.coordinates, label: place.name, number: index + 1 }; });
      bridge.showTrack('personal-map', { points, segments: points.length > 1 ? [{ id: 'personal-timeline', coordinates: points.map(point => point.coordinates) }] : [] });
    } catch (error) { if (!signal.aborted && !aborted(error)) this.update({ personalLoading: false, personalError: message(error) }); }
  }
  async loadThemes() { try { const data = await api.request('getThemes', { query: { limit: 100 }, signal: this.lifetime.signal }); this.update({ themes: data.items }); } catch (error) { if (!aborted(error)) this.update({ personalError: message(error) }); } }
  async loadGrowth(bridge: MapBridge) {
    this.growthAbort?.abort(); const signal = (this.growthAbort = new AbortController()).signal;
    this.update({ growthError: null });
    try {
      const items: GrowthItem[] = []; let cursor: string | undefined;
      do { const page = await api.request('getMapGrowth', { query: { limit: 100, cursor }, signal }); if (signal.aborted) return; items.push(...page.items); cursor = page.nextCursor || undefined; } while (cursor);
      this.update({ growth: items, growthLoaded: true }); showGrowth(bridge, items);
    } catch (error) { if (!signal.aborted && !aborted(error)) this.update({ growthError: message(error) }); }
  }
  closeSearch(bridge: MapBridge) { this.searchAbort?.abort(); this.generation++; bridge.clear('map-search'); this.update({ result: null, loading: false, selectedCandidateId: null }); }
  dispose() { this.lifetime.abort(); this.searchAbort?.abort(); this.detailAbort?.abort(); this.placesAbort?.abort(); this.personalAbort?.abort(); this.nearbyAbort?.abort(); this.growthAbort?.abort(); this.listeners.clear(); }
}

export function useMapSession(scopeKey: string) {
  const session = useMemo(() => { let value = sessions.get(scopeKey); if (!value) { value = new MapSession(scopeKey); sessions.set(scopeKey, value); } return value; }, [scopeKey]);
  useEffect(() => { session.consumers++; return () => { session.consumers--; queueMicrotask(() => { if (session.consumers === 0) { session.dispose(); sessions.delete(scopeKey); } }); }; }, [session, scopeKey]);
  return [useSyncExternalStore(session.subscribe, session.getSnapshot), session] as const;
}
export function candidatePresentation(candidate: Candidate): PlacePresentation { return { id: candidate.candidateId, name: candidate.name, address: candidate.address, categories: candidate.categories, attribution: candidate.attribution, sourceUrl: candidate.sourceUrl }; }
export function detailPresentation(detail: PlaceDetail): PlacePresentation {
  return { ...detail.place };
}
