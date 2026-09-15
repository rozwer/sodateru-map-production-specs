import type { ReactNode } from 'react';

/** UI input only. Map/API binding is supplied by the shared application. */
export type Coordinates = [longitude: number, latitude: number];
export type RouteMode = 'walking' | 'cycling' | 'driving' | 'transit';
export type WaypointSelection =
  | { kind: 'stored'; placeId: string }
  | { kind: 'candidate'; resultId: string; candidateId: string }
  | { kind: 'point'; coordinates: Coordinates; label: string };

export interface PlaceOption {
  id: string;
  name: string;
  address?: string;
  imageUrl?: string;
  coordinates?: Coordinates;
  selection: WaypointSelection;
}

export interface StopDraft {
  /** Stable UI identity, unrelated to the place or route API IDs. */
  key: string;
  query: string;
  place: PlaceOption | null;
}

export interface RouteDraft {
  title: string;
  stops: StopDraft[];
  mode: RouteMode;
  departure: string;
  returnBy: string;
  avoidStairs: boolean;
  preferCovered: boolean;
}

export function createRouteDraft(): RouteDraft {
  return {
    title: '',
    stops: [
      { key: 'origin', query: '', place: null },
      { key: 'destination', query: '', place: null },
    ],
    mode: 'walking', departure: '', returnBy: '', avoidStairs: false, preferCovered: false,
  };
}

export type RequestState = 'idle' | 'loading' | 'saving' | 'error' | 'unavailable' | 'conflict';
export interface Notice { message: string; retry?: () => void }
export interface PlaceSearchView {
  stopKey: string | null;
  state: RequestState;
  options: PlaceOption[];
  error?: Notice;
}

export interface ConditionEvaluation {
  label: string;
  status: 'satisfied' | 'violated' | 'unknown' | 'unsupported';
  detail?: string;
}

/** Display material supplied by ROUTES, never a substitute for its evaluation. */
export interface RouteCandidateView {
  id: string;
  name: string;
  description?: string;
  badge?: string;
  distanceM: number;
  travelDurationSec: number;
  stayDurationSec: number | null;
  totalDurationSec: number | null;
  imageUrl?: string;
  evaluations: ConditionEvaluation[];
  adoptable: boolean;
  adoptionReason?: string;
}

export interface RouteMapView {
  /** Shared Mapbox host/viewport supplied by UI-MAP; never a reference raster. */
  content?: ReactNode;
  summary: string;
  unavailable?: Notice;
}

export type TurnDirection = 'left' | 'right' | 'straight' | 'uturn' | 'arrive';
export interface NavigationView {
  routeId: string;
  title: string;
  status: 'saved' | 'navigating' | 'finished';
  instruction: string | null;
  roadName?: string;
  direction: TurnDirection | null;
  turnDistanceM: number | null;
  remainingDistanceM: number | null;
  remainingDurationSec: number | null;
  accuracyM: number | null;
  locationStatus: 'idle' | 'locating' | 'available' | 'denied' | 'unavailable';
  fetchedAt?: number;
}
