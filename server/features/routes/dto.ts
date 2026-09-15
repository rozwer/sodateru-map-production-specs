import type { SavedRoute } from './types.ts';

export function savedRouteDto(row: any): SavedRoute {
    const points = JSON.parse(row.waypoints_json), route = JSON.parse(row.route_json);
    return { ...(route.segmentEvidence ? {segmentEvidence:route.segmentEvidence} : {}), ...(route.timing ? {timing:route.timing} : {}), ...(route.providerEvidence ? {providerEvidence:route.providerEvidence} : {}), ...(route.requestedConditions ? { requestedConditions: route.requestedConditions, conditionEvaluations: route.conditionEvaluations } : {}), id: row.id, personId: row.person_id, title: row.title, waypoints: points.map((p: any) => ({ coordinates: [p.lng, p.lat], name: p.name ?? p.placeId ?? `${p.lng},${p.lat}`, placeId: p.placeId ?? null })), mode: route.mode ?? route.legs[0].mode,
      legs: route.legs.map((l: any, i: number) => ({ fromIndex: l.fromIndex ?? i, toIndex: l.toIndex ?? i + 1, geometry: l.geometry, distanceM: l.distanceM, durationSec: l.durationSec, ...(l.steps ? { steps: l.steps } : {}) })), geometry: route.geometry, distanceM: row.distance_m, durationSec: row.duration_sec, provider: row.provider, sourceUrl: row.source_url, fetchedAt: row.fetched_at, status: row.status, currentLeg: row.current_leg, visibility: row.visibility, sharedWith: JSON.parse(row.shared_with_json), version: row.version, createdAt: row.created_at, updatedAt: row.updated_at };
  }
