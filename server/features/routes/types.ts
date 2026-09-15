import type { SegmentEvidence } from '../../plugins/bike/segment-evidence.ts';
import { CommonError } from '../../core/errors.ts';
export type Coordinates = [number, number];
export type Geometry = { type: 'LineString'; coordinates: Coordinates[] };
export type Mode = 'walking' | 'driving' | 'cycling' | 'transit';
export type Waypoint = { kind: 'point'; coordinates: Coordinates; label: string } | { kind: 'stored'; placeId: string } | { kind: 'candidate'; resultId: string; candidateId: string };
export type ResolvedWaypoint = { coordinates: Coordinates; name: string; placeId: string | null };
export type Conditions = { timeZone?: string; avoidMotorways?: boolean; departAt?: number; returnBy?: number; avoidStairs?: boolean; preferCovered?: boolean; transitPassIds?: string[]; stayDurationSec?: number };
export type RouteInput = { waypoints: Waypoint[]; mode: Mode; title: string; conditions?: Conditions };
export type RouteStep = { geometry: Geometry; distanceM: number; durationSec: number; location: Coordinates; type: string; modifier: string | null; instruction: string; name: string };
export type RouteLeg = { fromIndex: number; toIndex: number; geometry: Geometry; distanceM: number; durationSec: number; steps?: RouteStep[] };
export type ConditionEvaluation = { key: 'avoidMotorways' | 'departAt' | 'returnBy'; status: 'applied' | 'ignored' | 'unknown'; reason: string; provider: string; sourceUrl: string; fetchedAt: number };
export type RouteTiming = { departureAt: number; arrivalAt: number; timeZone: string; providerTimePrecisionSec: 60; locations: { waypointIndex: number; localDateTime: string; timeZone: string; utcOffset: string }[] };
export type RouteProviderEvidence = { profile?: 'motorcycle' | 'motor_scooter'; traceVehicleTypes?: (string | null)[]; endpoint: string; attribution: string; geometryHash: string; strategy: 'balanced' | 'shortest'; warnings: { code: number; text: string }[] };
export type RoutePreview = { segmentEvidence?: SegmentEvidence; sourceUrl?: string; timing?: RouteTiming; providerEvidence?: RouteProviderEvidence; requestedConditions?: Conditions; conditionEvaluations?: ConditionEvaluation[]; previewId: string; waypoints: ResolvedWaypoint[]; mode: Mode; legs: RouteLeg[]; geometry: Geometry; distanceM: number; durationSec: number; provider: 'mapbox-directions' | 'valhalla'; fetchedAt: number; expiresAt: number; retention: 'storable' | 'temporary' };
export type SavedRoute = Omit<RoutePreview, 'previewId' | 'expiresAt' | 'retention'> & { id: string; personId: string; title: string; sourceUrl: string; status: 'saved' | 'navigating' | 'finished'; currentLeg: number; visibility: 'private' | 'selected' | 'public'; sharedWith: string[]; version: number; createdAt: number; updatedAt: number };
// Domain faults also use CORE CommonError for direct calls from other features.
export class RouteFault extends CommonError {
  constructor(code: string, message: string, status = 422, details: Record<string, unknown> = {}) { super(code === 'INVALID_INPUT' ? 'VALIDATION_FAILED' : code, message, [429,503,504].includes(status), details, status); this.name = 'RouteFault'; }
}
export function coordinate(value: unknown): value is Coordinates {
  return Array.isArray(value) && value.length === 2 && value.every(Number.isFinite) && Math.abs(value[0]) <= 180 && Math.abs(value[1]) <= 90;
}
export function samePoint(a: Coordinates, b: Coordinates) { return a[0] === b[0] && a[1] === b[1]; }

export type RoadResult = Omit<RoutePreview, 'previewId' | 'waypoints' | 'mode' | 'expiresAt' | 'retention'>;
export interface RoadProvider { readonly drivingTimeConditions?: boolean; route(points: Coordinates[], mode: Mode, signal?: AbortSignal, navigation?: boolean, comparisonPick?: number, conditions?: Conditions): Promise<RoadResult>; compare(points: Coordinates[], mode: Mode, signal?: AbortSignal, conditions?: Conditions): Promise<RoadResult[]>; }
