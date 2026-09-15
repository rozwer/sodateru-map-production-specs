import { CommonError } from '../../core/errors.ts';
export type Coordinates = [number, number];
export type Geometry = { type: 'LineString'; coordinates: Coordinates[] };
export type Mode = 'walking' | 'driving' | 'cycling' | 'transit';
export type Waypoint = { kind: 'point'; coordinates: Coordinates; label: string } | { kind: 'stored'; placeId: string } | { kind: 'candidate'; resultId: string; candidateId: string };
export type ResolvedWaypoint = { coordinates: Coordinates; name: string; placeId: string | null };
export type Conditions = { avoidMotorways?: boolean; departAt?: number; returnBy?: number; avoidStairs?: boolean; preferCovered?: boolean; transitPassIds?: string[]; stayDurationSec?: number };
export type RouteInput = { waypoints: Waypoint[]; mode: Mode; title: string; conditions?: Conditions };
export type RouteStep = { geometry: Geometry; distanceM: number; durationSec: number; location: Coordinates; type: string; modifier: string | null; instruction: string; name: string };
export type RouteLeg = { fromIndex: number; toIndex: number; geometry: Geometry; distanceM: number; durationSec: number; steps?: RouteStep[] };
export type ConditionEvaluation = { key: 'avoidMotorways'; status: 'applied'; reason: string; provider: string; sourceUrl: string; fetchedAt: number };
export type RoutePreview = { requestedConditions?: Conditions; conditionEvaluations?: ConditionEvaluation[]; previewId: string; waypoints: ResolvedWaypoint[]; mode: Mode; legs: RouteLeg[]; geometry: Geometry; distanceM: number; durationSec: number; provider: 'mapbox-directions'; fetchedAt: number; expiresAt: number; retention: 'storable' | 'temporary' };
export type SavedRoute = Omit<RoutePreview, 'previewId' | 'expiresAt' | 'retention'> & { id: string; personId: string; title: string; sourceUrl: string; status: 'saved' | 'navigating' | 'finished'; currentLeg: number; visibility: 'private' | 'selected' | 'public'; sharedWith: string[]; version: number; createdAt: number; updatedAt: number };
// Domain faults also use CORE CommonError for direct calls from other features.
export class RouteFault extends CommonError {
  constructor(code: string, message: string, status = 422, details: Record<string, unknown> = {}) { super(code === 'INVALID_INPUT' ? 'VALIDATION_FAILED' : code, message, [429,503,504].includes(status), details, status); this.name = 'RouteFault'; }
}
export function coordinate(value: unknown): value is Coordinates {
  return Array.isArray(value) && value.length === 2 && value.every(Number.isFinite) && Math.abs(value[0]) <= 180 && Math.abs(value[1]) <= 90;
}
export function samePoint(a: Coordinates, b: Coordinates) { return a[0] === b[0] && a[1] === b[1]; }
