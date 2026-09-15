import type { ApiClient, RouteSearchResult, SavedRoute, SavedRouteCreate } from '../../../packages/api-client/index';
import { createRouteDraft, type PlaceSearchView, type RequestState, type RouteDraft, type RouteMode, type WaypointSelection } from './types';
import { routeMessages as m } from './messages';

export interface RouteFlowSnapshot {
  draft: RouteDraft;
  searchedDraft: RouteDraft | null;
  placeSearch: PlaceSearchView;
  preview: RouteSearchResult | null;
  previews: RouteSearchResult[];
  saved: SavedRoute | null;
  state: RequestState;
  message: string | null;
}

type SaveIntent = { body: SavedRouteCreate; key: string; attempted: boolean };
type StoragePort = Pick<Storage, 'getItem' | 'setItem'>;
function failureStatus(error: unknown): number | undefined {
  return error && typeof error === 'object' && 'status' in error && typeof error.status === 'number' ? error.status : undefined;
}
function failureCode(error: unknown): string | undefined {
  return error && typeof error === 'object' && 'code' in error && typeof error.code === 'string' ? error.code : undefined;
}
function isAbort(error: unknown) { return error instanceof Error && error.name === 'AbortError'; }

/** Route-screen orchestration only. Transport, evaluation, and persistence belong to shared/API modules. */
export class RouteFlow {
  private value: RouteFlowSnapshot;
  private listeners = new Set<() => void>();
  private searchAbort?: AbortController;
  private mutationAbort?: AbortController;
  private placeAbort?: AbortController;
  private placeGeneration = 0;
  private generation = 0;
  private searchKey: string | null = null;
  private saveIntents = new Map<string, SaveIntent>();
  private disposed = false;
  constructor(private api: ApiClient, private scopeKey: string, private storage?: StoragePort) {
    this.value = {
      draft: this.readDraft(), searchedDraft: null,
      placeSearch: { stopKey: null, state: 'idle', options: [] },
      preview: null, previews: [], saved: null, state: 'idle', message: null,
    };
  }
  getSnapshot = () => this.value;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private update(patch: Partial<RouteFlowSnapshot>) {
    if (this.disposed) return;
    this.value = { ...this.value, ...patch };
    this.listeners.forEach(listener => listener());
  }
  private readDraft(): RouteDraft {
    const initial = createRouteDraft();
    try {
      const saved = JSON.parse(this.storage?.getItem(`sodateru.routes.draft:${this.scopeKey}`) || 'null');
      if (!saved || !Array.isArray(saved.stops) || saved.stops.length < 2 || saved.stops.length > 10) return initial;
      return {
        ...initial,
        title: typeof saved.title === 'string' ? saved.title : '',
        departure: typeof saved.departure === 'string' ? saved.departure : '',
        returnBy: typeof saved.returnBy === 'string' ? saved.returnBy : '',
        mode: ['walking', 'cycling', 'driving', 'transit'].includes(saved.mode) ? saved.mode : 'walking',
        avoidStairs: saved.avoidStairs === true, preferCovered: saved.preferCovered === true,
        stops: saved.stops.map((stop: { query?: unknown }, index: number) => ({ key: `restored-${index}`, query: typeof stop.query === 'string' ? stop.query : '', place: null })),
      };
    } catch { return initial; }
  }
  setDraft = (draft: RouteDraft) => {
    this.searchAbort?.abort(); this.placeAbort?.abort(); this.placeGeneration++; this.generation++; this.searchKey = null; this.saveIntents.clear();
    this.update({ draft, preview: null, previews: [], placeSearch: { stopKey: null, state: 'idle', options: [] }, state: 'idle', message: null });
    try {
      // Only text and conditions survive reload; no candidate IDs, coordinates, or route truth.
      this.storage?.setItem(`sodateru.routes.draft:${this.scopeKey}`, JSON.stringify({ ...draft, stops: draft.stops.map(stop => ({ query: stop.query })) }));
    } catch { /* The editable in-memory draft remains usable. */ }
  };
  loadDestination = async (placeId: string, mode?: RouteMode) => {
    this.searchAbort?.abort();
    const abort = this.searchAbort = new AbortController();
    const generation = ++this.generation;
    this.update({ state: 'loading', message: null });
    try {
      const response = await this.api.request('getPlacesPlaceId', { path: { placeId }, signal: abort.signal });
      if (abort.signal.aborted || generation !== this.generation) return;
      const place = response.data.place;
      const draft = this.value.draft;
      const stops = draft.stops.map((stop, index) => index === draft.stops.length - 1 ? {
        ...stop, query: place.name, place: { id: place.id, name: place.name, address: place.address ?? undefined, coordinates: place.coordinates, selection: { kind: 'stored' as const, placeId: place.id } },
      } : stop);
      this.setDraft({ ...draft, stops, mode: mode ?? draft.mode });
    } catch (error) {
      if (abort.signal.aborted || generation !== this.generation || isAbort(error)) return;
      this.update({ state: 'error', message: m.failedPlaces });
    }
  };
  copySharedRoute = async (routeId: string) => {
    this.searchAbort?.abort();
    const abort = this.searchAbort = new AbortController();
    const generation = ++this.generation;
    this.update({ state: 'loading', message: null });
    try {
      const response = await this.api.request('getSavedRoutesRouteId', { path: { routeId }, signal: abort.signal });
      if (abort.signal.aborted || generation !== this.generation) return;
      const shared = response.data;
      // Copy selected display points into a new draft; never assign the source route as the user's saved route.
      this.setDraft({ ...createRouteDraft(), title: shared.title, mode: shared.mode, stops: [
        this.value.draft.stops[0]!,
        ...shared.waypoints.map((point, index) => ({ key: `shared-${index}`, query: point.name, place: { id: `shared-point-${index}`, name: point.name, coordinates: point.coordinates, selection: { kind: 'point' as const, coordinates: point.coordinates, label: point.name } } })),
      ] });
      if (this.value.draft.stops.length > 10) this.update({ state: 'error', message: m.tooManyStops });
    } catch (error) {
      if (abort.signal.aborted || generation !== this.generation || isAbort(error)) return;
      this.update({ state: 'error', message: m.sharedRouteLoadFailed });
    }
  };
  loadDialogueDestination = async (resultId: string, candidateId: string) => {
    this.searchAbort?.abort();
    const abort = this.searchAbort = new AbortController();
    const generation = ++this.generation;
    this.update({ state: 'loading', message: null });
    try {
      const result = (await this.api.request('getMapDialoguesResultsResultId', { path: { resultId }, signal: abort.signal })).data;
      if (abort.signal.aborted || generation !== this.generation) return;
      const candidate = result.places.find(place => place.candidateId === candidateId);
      if (result.resultId !== resultId || result.expiresAt <= Date.now() || !candidate) {
        this.update({ state: 'error', message: m.expiredPlace }); return;
      }
      const origin = result.origin;
      this.setDraft({ ...createRouteDraft(), stops: [
        { key: 'origin', query: origin.label, place: { id: 'dialogue-origin', name: origin.label, coordinates: origin.coordinates, selection: { kind: 'point', coordinates: origin.coordinates, label: origin.label } } },
        { key: 'destination', query: candidate.name, place: { id: candidate.candidateId, name: candidate.name, coordinates: candidate.coordinates, expiresAt: result.expiresAt, retention: candidate.retention, selection: { kind: 'dialogue', resultId, candidateId } } },
      ] });
      // Selection retains dialogue identity; search uses its dedicated select operation.
    } catch (error) {
      if (abort.signal.aborted || generation !== this.generation || isAbort(error)) return;
      this.update({ state: 'error', message: m.failedPlaces });
    }
  };
  startSaved = async (): Promise<SavedRoute | null> => {
    const current = this.value.saved;
    if (!current || this.value.state === 'saving' || current.status === 'finished') return null;
    const abort = this.mutationAbort = new AbortController();
    this.update({ state: 'saving', message: null });
    try {
      // Re-read before retrying a PATCH whose response could have been lost.
      let saved = (await this.api.request('getSavedRoutesRouteId', { path: { routeId: current.id }, signal: abort.signal })).data;
      if (abort.signal.aborted) return null;
      this.update({ saved });
      if (saved.status === 'saved') saved = (await this.api.request('patchSavedRoutesRouteId', { path: { routeId: saved.id }, body: { status: 'navigating' }, version: saved.version, signal: abort.signal })).data;
      if (abort.signal.aborted) return null;
      this.update({ saved, state: 'idle' });
      return saved.status === 'navigating' ? saved : null;
    } catch (error) {
      if (abort.signal.aborted || isAbort(error)) return null;
      this.update({ state: failureStatus(error) === 412 ? 'conflict' : 'error', message: failureStatus(error) === 412 ? m.changedVersion : m.failedStart }); return null;
    }
  };
  searchPlaces = async (stopKey: string, query: string, center?: [number, number]) => {
    this.placeAbort?.abort();
    const generation = ++this.placeGeneration;
    if (!query.trim()) { this.update({ placeSearch: { stopKey, state: 'idle', options: [] } }); return; }
    const abort = this.placeAbort = new AbortController();
    this.update({ placeSearch: { stopKey, state: 'loading', options: [] } });
    try {
      const response = await this.api.request('getPlaceCandidates', { query: { q: query, limit: 8, ...(center ? { longitude: center[0], latitude: center[1] } : {}) }, signal: abort.signal });
      if (generation !== this.placeGeneration || abort.signal.aborted) return;
      this.update({ placeSearch: { stopKey, state: 'idle', options: response.data.items.map(candidate => ({
        id: candidate.candidateId, name: candidate.name, address: candidate.address ?? undefined,
        coordinates: [candidate.position.longitude, candidate.position.latitude], expiresAt: response.data.expiresAt, retention: candidate.retention,
        selection: candidate.placeId ? { kind: 'stored', placeId: candidate.placeId } : { kind: 'candidate', resultId: response.data.resultId, candidateId: candidate.candidateId },
      })) } });
    } catch (error) {
      if (generation !== this.placeGeneration || abort.signal.aborted || isAbort(error)) return;
      this.update({ placeSearch: { stopKey, state: 'error', options: [], error: { message: m.failedPlaces, retry: () => { void this.searchPlaces(stopKey, query, center); } } } });
    }
  };
  search = async (): Promise<boolean> => {
    if (this.value.state === 'loading' || this.value.state === 'saving') return false;
    const draft = this.value.draft;
    if (draft.stops.length > 10 || draft.stops.length < 2) { this.update({ state: 'error', message: m.tooManyStops }); return false; }
    if (draft.stops.some(stop => !stop.place)) { this.update({ state: 'error', message: m.requiredPlaces }); return false; }
    if (draft.stops.some(stop => (stop.place?.selection.kind === 'candidate' || stop.place?.selection.kind === 'dialogue') && (stop.place.expiresAt ?? Infinity) <= Date.now())) { this.update({ state: 'error', message: m.expiredPlace }); return false; }
    // Never silently drop conditions that the current HTTP Schema cannot carry.
    if (draft.departure || draft.returnBy || draft.avoidStairs || draft.preferCovered) {
      this.update({ state: 'unavailable', message: m.missingConditionsContract }); return false;
    }
    this.searchAbort?.abort();
    const abort = this.searchAbort = new AbortController();
    const generation = ++this.generation;
    this.searchKey ??= crypto.randomUUID();
    this.update({ state: 'loading', message: null, preview: null, previews: [] });
    try {
      const selections = draft.stops.map(stop => stop.place!.selection);
      const dialogue = selections.find(point => point.kind === 'dialogue');
      let previews: RouteSearchResult[];
      if (dialogue?.kind === 'dialogue') {
        const origin = selections[0];
        if (selections.length !== 2 || selections[1] !== dialogue || origin?.kind !== 'point') {
          this.update({ state: 'unavailable', message: m.dialogueConditionsPending }); return false;
        }
        const response = await this.api.request('postMapDialoguesSelect', { body: { resultId: dialogue.resultId, candidateId: dialogue.candidateId }, idempotencyKey: this.searchKey, signal: abort.signal });
        if (generation !== this.generation || abort.signal.aborted) return false;
        const result = response.data;
        const selectedRoute = result.routes[0];
        if (result.resultId !== dialogue.resultId || result.expiresAt <= Date.now() || result.places.length !== 1 || result.places[0]?.candidateId !== dialogue.candidateId || result.routes.length !== 1 || !selectedRoute) {
          this.update({ state: 'error', message: m.expiredRoute }); return false;
        }
        if (selectedRoute.mode !== draft.mode || result.origin.coordinates.some((coordinate, index) => coordinate !== origin.coordinates[index])) {
          this.update({ state: 'unavailable', message: m.dialogueConditionsPending }); return false;
        }
        // EXPLORATION/ROUTES contract: select's one route previewId is saved-create resultId.
        previews = [{ ...selectedRoute, resultId: selectedRoute.previewId }];
      } else {
        const waypoints = selections.filter((point): point is Exclude<WaypointSelection, { kind: 'dialogue' }> => point.kind !== 'dialogue');
        previews = (await this.api.request('postRouteComparisons', { body: { waypoints, mode: draft.mode, title: draft.title }, idempotencyKey: this.searchKey, signal: abort.signal })).data.items;
      }
      if (generation !== this.generation || abort.signal.aborted) return false;
      this.saveIntents.clear();
      if (!previews.length) { this.update({ state: 'error', message: m.emptyRoutes }); return false; }
      this.update({ preview: previews[0], previews, searchedDraft: draft, state: 'idle' });
      return true;
    } catch (error) {
      if (generation !== this.generation || abort.signal.aborted || isAbort(error)) return false;
      const code = failureCode(error);
      this.update({ state: code === 'MODE_UNSUPPORTED' ? 'unavailable' : 'error', message: code === 'MODE_UNSUPPORTED' ? m.unsupportedMode : code === 'ROUTE_NOT_FOUND' ? m.emptyRoutes : m.failedSearch });
      return false;
    }
  };
  selectPreview = (resultId: string) => {
    if (this.value.state === 'loading' || this.value.state === 'saving') return;
    const preview = this.value.previews.find(item => item.resultId === resultId);
    if (preview) this.update({ preview, message: null, state: 'idle' });
  };
  /** Stable IDs/keys survive response loss. A saved route is retained if starting navigation fails. */
  adoptAndStart = async (resultId: string): Promise<SavedRoute | null> => {
    if (this.value.state === 'saving') return null;
    const preview = this.value.preview;
    if (!preview || preview.resultId !== resultId) return null;
    const previousIntent = this.saveIntents.get(resultId);
    const savedFromIntent = previousIntent && this.value.saved?.id === previousIntent.body.id ? this.value.saved : null;
    if (!savedFromIntent && preview.expiresAt <= Date.now()) { this.update({ state: 'error', message: m.expiredRoute }); return null; }
    if (preview.retention !== 'storable') { this.update({ state: 'unavailable', message: m.temporaryRoute }); return null; }
    const intent = previousIntent ?? { body: { id: crypto.randomUUID(), resultId, title: this.value.searchedDraft?.title.trim() || m.defaultTitle }, key: crypto.randomUUID(), attempted: false };
    this.saveIntents.set(resultId, intent);
    const abort = this.mutationAbort = new AbortController();
    this.update({ state: 'saving', message: null });
    let saved = savedFromIntent;
    try {
      if (!saved && intent.attempted) {
        try { saved = (await this.api.request('getSavedRoutesRouteId', { path: { routeId: intent.body.id }, signal: abort.signal })).data; }
        catch (error) { if (failureStatus(error) !== 404) throw error; }
      }
      if (!saved) {
        intent.attempted = true;
        saved = (await this.api.request('postSavedRoutes', { body: intent.body, idempotencyKey: intent.key, signal: abort.signal })).data;
      }
      if (abort.signal.aborted) return null;
      this.update({ saved });
      if (saved.status === 'saved') {
        saved = (await this.api.request('patchSavedRoutesRouteId', { path: { routeId: saved.id }, body: { status: 'navigating' }, version: saved.version, signal: abort.signal })).data;
      }
      if (abort.signal.aborted) return null;
      this.update({ saved, state: 'idle' });
      return saved;
    } catch (error) {
      if (abort.signal.aborted || isAbort(error)) return null;
      this.update({ state: failureStatus(error) === 412 || failureStatus(error) === 409 ? 'conflict' : 'error', message: failureStatus(error) === 412 || failureStatus(error) === 409 ? m.changedVersion : saved ? m.failedStart : m.failedSave });
      return null;
    }
  };
  loadSaved = async (routeId: string): Promise<SavedRoute | null> => {
    if (this.value.state === 'saving') return null;
    this.searchAbort?.abort();
    const abort = this.searchAbort = new AbortController();
    const generation = ++this.generation;
    this.update({ state: 'loading', message: null });
    try {
      const saved = (await this.api.request('getSavedRoutesRouteId', { path: { routeId }, signal: abort.signal })).data;
      if (abort.signal.aborted || generation !== this.generation) return null;
      this.update({ saved, state: 'idle' });
      return saved;
    } catch (error) {
      if (abort.signal.aborted || generation !== this.generation || isAbort(error)) return null;
      this.update({ state: 'error', message: m.routeMissing }); return null;
    }
  };
  finish = async (): Promise<boolean> => {
    const saved = this.value.saved;
    if (!saved || this.value.state === 'saving' || saved.status !== 'navigating') return false;
    const abort = this.mutationAbort = new AbortController();
    this.update({ state: 'saving', message: null });
    try {
      const response = await this.api.request('patchSavedRoutesRouteId', { path: { routeId: saved.id }, body: { status: 'finished' }, version: saved.version, signal: abort.signal });
      if (abort.signal.aborted) return false;
      this.update({ saved: response.data, state: 'idle' });
      return true;
    } catch (error) {
      if (abort.signal.aborted || isAbort(error)) return false;
      this.update({ state: failureStatus(error) === 412 ? 'conflict' : 'error', message: failureStatus(error) === 412 ? m.changedVersion : m.failedFinish });
      return false;
    }
  };
  cancelSearch = () => { this.searchAbort?.abort(); this.generation++; if (this.value.state === 'loading') this.update({ state: 'idle' }); };
  showPassEntryPending = () => { this.update({ message: m.passEntryPending, state: 'unavailable' }); };
  leavePanel = () => {
    this.cancelSearch(); this.mutationAbort?.abort();
    if (this.value.state === 'saving') this.update({ state: 'idle' });
    // Keep saved-route identity and the fixed save intent; a sent request may already have succeeded.
  };
  dispose = () => { this.disposed = true; this.searchAbort?.abort(); this.placeAbort?.abort(); this.mutationAbort?.abort(); this.listeners.clear(); };
}
