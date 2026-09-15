import type { ComponentType } from 'react';

export type LngLat = [longitude: number, latitude: number];
export type MapOwnerKey = 'map-search' | 'map-dialogue' | 'record-place-picker' |
  'suggestion' | 'route-planner' | 'route-navigation' | 'daily-track' | 'knowledge' |
  'personal-map' | 'map-objects' | 'map-building' | 'map-poi' | `plugin:${string}`;
export interface MapPadding { top: number; right: number; bottom: number; left: number }
export interface MapCamera {
  longitude: number;
  latitude: number;
  zoom: number;
  bearing: number;
  pitch: number;
  bounds?: [LngLat, LngLat];
}
export interface MapView {
  dimension: '2d' | '3d';
  lens: 'personal' | 'physical';
  lightPreset: 'dawn' | 'day' | 'dusk' | 'night';
  following: boolean;
}
export interface MapCandidate {
  id: string;
  coordinates: LngLat;
  label?: string;
  number?: number;
}
export interface CandidateDisplay {
  resultId: string;
  candidates: MapCandidate[];
  selectedCandidateId?: string;
  expiresAt?: number;
}
export interface MapPlace extends MapCandidate { placeId?: string; recordIds?: string[] }
export interface PlaceDisplay { places: MapPlace[]; selectedPlaceId?: string }
export interface TrackDisplay { segments: { id: string; coordinates: LngLat[] }[]; points: MapCandidate[] }
export interface RouteGeometry { type: 'LineString'; coordinates: LngLat[] }
export interface MapRoute {
  id: string;
  geometry: RouteGeometry;
  waypoints: MapCandidate[];
}
export type RouteDisplay = {
  geometry: RouteGeometry;
  waypoints: MapCandidate[];
  alternatives?: MapRoute[];
  selectedRouteId?: string;
} & ({ previewId: string; routeId?: string } | { routeId: string; previewId?: string });
export interface MapSelection {
  ownerKey: MapOwnerKey;
  kind: 'candidate' | 'route' | 'place' | 'building' | 'object' | 'poi';
  id: string;
  coordinates?: LngLat;
  buildingKey?: string;
  height?: number;
}
export interface MapFocus {
  bounds?: [LngLat, LngLat];
  center?: LngLat;
  zoom?: number;
  padding?: MapPadding;
}
export interface MapSnapshot {
  scopeKey: string;
  camera: MapCamera;
  view: MapView;
  padding: MapPadding;
  candidates: Partial<Record<MapOwnerKey, CandidateDisplay>>;
  places: Partial<Record<MapOwnerKey, PlaceDisplay>>;
  tracks: Partial<Record<MapOwnerKey, TrackDisplay>>;
  routes: Partial<Record<MapOwnerKey, RouteDisplay>>;
  selection: MapSelection | null;
  focus: (MapFocus & { ownerKey: MapOwnerKey; revision: number }) | null;
}
export interface MapRendererProps { bridge: MapBridge }
export type MapRendererComponent = ComponentType<MapRendererProps>;

const initialCamera: MapCamera = { longitude: 136.9638, latitude: 35.1668, zoom: 14, bearing: 0, pitch: 0 };
const initialView: MapView = { dimension: '2d', lens: 'personal', lightPreset: 'day', following: false };

/** One in-memory bridge, one renderer. Temporary results never enter browser storage. */
export class MapBridge {
  private listeners = new Set<() => void>();
  private selections = new Set<(selection: MapSelection) => void>();
  private expiry = new Map<MapOwnerKey, ReturnType<typeof setTimeout>>();
  private state: MapSnapshot;
  constructor(scopeKey = 'unresolved') {
    this.state = {
      scopeKey, camera: { ...initialCamera }, view: { ...initialView },
      padding: { top: 24, right: 24, bottom: 104, left: 24 },
      candidates: {}, places: {}, tracks: {}, routes: {}, selection: null, focus: null,
    };
    this.restorePreferences();
  }
  getSnapshot = (): MapSnapshot => this.state;
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  private update(patch: Partial<MapSnapshot>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach(listener => listener());
  }
  private restorePreferences() {
    try {
      const saved = JSON.parse(localStorage.getItem(`sodateru.map:${this.state.scopeKey}`) ?? 'null');
      if (saved && Number.isFinite(saved.camera?.longitude) && Number.isFinite(saved.camera?.latitude)) {
        this.state = { ...this.state, camera: { ...initialCamera, ...saved.camera }, view: { ...initialView, ...saved.view } };
      }
    } catch { /* Private browsing may disable preference storage. */ }
  }
  private savePreferences() {
    try { localStorage.setItem(`sodateru.map:${this.state.scopeKey}`, JSON.stringify({ camera: this.state.camera, view: this.state.view })); } catch { /* UI remains usable. */ }
  }
  setCamera = (camera: Partial<MapCamera>) => {
    this.update({ camera: { ...this.state.camera, ...camera } });
    this.savePreferences();
  };
  setView = (view: Partial<MapView>) => {
    this.update({ view: { ...this.state.view, ...view } });
    this.savePreferences();
  };
  setPadding = (padding: MapPadding) => {
    if (Object.keys(padding).every(key => padding[key as keyof MapPadding] === this.state.padding[key as keyof MapPadding])) return;
    this.update({ padding });
  };
  showCandidates = (ownerKey: MapOwnerKey, display: CandidateDisplay) => {
    clearTimeout(this.expiry.get(ownerKey));
    if (display.expiresAt !== undefined && display.expiresAt <= Date.now()) {
      this.clear(ownerKey);
      return;
    }
    this.update({ candidates: { ...this.state.candidates, [ownerKey]: display } });
    if (display.expiresAt !== undefined) {
      this.expiry.set(ownerKey, setTimeout(() => this.clear(ownerKey), Math.min(display.expiresAt - Date.now(), 2_147_483_647)));
    }
  };
  selectCandidate = (ownerKey: MapOwnerKey, candidateId: string) => {
    const display = this.state.candidates[ownerKey];
    const candidate = display?.candidates.find(item => item.id === candidateId);
    if (!display || !candidate) return;
    this.update({ candidates: { ...this.state.candidates, [ownerKey]: { ...display, selectedCandidateId: candidateId } } });
    this.select({ ownerKey, kind: 'candidate', id: candidateId, coordinates: candidate.coordinates });
  };
  showRoute = (ownerKey: MapOwnerKey, display: RouteDisplay) => {
    this.update({ routes: { ...this.state.routes, [ownerKey]: display } });
  };
  showPlaces = (ownerKey: MapOwnerKey, display: PlaceDisplay) => {
    this.update({ places: { ...this.state.places, [ownerKey]: display } });
  };
  showTrack = (ownerKey: MapOwnerKey, display: TrackDisplay) => {
    this.update({ tracks: { ...this.state.tracks, [ownerKey]: display } });
  };
  focus = (ownerKey: MapOwnerKey, target: MapFocus) => {
    this.update({ focus: { ...target, ownerKey, padding: target.padding ?? this.state.padding, revision: (this.state.focus?.revision ?? 0) + 1 } });
  };
  select = (selection: MapSelection) => {
    this.update({ selection });
    this.selections.forEach(listener => listener(selection));
  };
  onSelect = (ownerKey: MapOwnerKey, listener: (selection: MapSelection) => void): (() => void) => {
    const receive = (selection: MapSelection) => { if (selection.ownerKey === ownerKey) listener(selection); };
    this.selections.add(receive);
    return () => { this.selections.delete(receive); };
  };
  clear = (ownerKey: MapOwnerKey) => {
    clearTimeout(this.expiry.get(ownerKey));
    this.expiry.delete(ownerKey);
    const candidates = { ...this.state.candidates };
    const routes = { ...this.state.routes };
    const places = { ...this.state.places };
    const tracks = { ...this.state.tracks };
    delete candidates[ownerKey]; delete routes[ownerKey]; delete places[ownerKey]; delete tracks[ownerKey];
    this.update({ candidates, routes, places, tracks, selection: this.state.selection?.ownerKey === ownerKey ? null : this.state.selection });
  };
  resetScope = (scopeKey: string) => {
    this.expiry.forEach(clearTimeout); this.expiry.clear();
    this.state = { ...this.state, scopeKey, camera: { ...initialCamera }, view: { ...initialView }, candidates: {}, places: {}, tracks: {}, routes: {}, selection: null, focus: null };
    this.restorePreferences();
    this.update({});
  };
  dispose = () => { this.expiry.forEach(clearTimeout); this.expiry.clear(); this.listeners.clear(); this.selections.clear(); };
}
