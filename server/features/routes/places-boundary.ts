import { createHash } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { placesService } from '../places/service.ts';
import { getPlace } from '../places/repository.ts';
import { RouteFault, samePoint, type Waypoint, type ResolvedWaypoint } from './types.ts';
import type { PlacesBoundary } from './service.ts';

type Reference = { input: Exclude<Waypoint, { kind: 'point' }>; waypoint: ResolvedWaypoint; version: number | null };
export function placesBoundary(db: DatabaseSync): PlacesBoundary {
  return {
    resolve(context, input) {
      if (input.kind === 'stored') {
        const place = getPlace(db, input.placeId);
        const waypoint = { coordinates: place.coordinates, name: place.name, placeId: place.id };
        return { waypoint, retention: 'storable', reference: { input, waypoint, version: place.version } satisfies Reference };
      }
      const candidate = placesService.resolveCandidate(context, input.resultId, input.candidateId);
      const place = candidate.placeId ? getPlace(db, candidate.placeId) : null;
      if (place && (!samePoint(place.coordinates, candidate.coordinates) || place.name !== candidate.name)) throw new RouteFault('INPUT_CHANGED', '場所が更新されました。候補を検索し直してください', 409);
      const waypoint = { coordinates: candidate.coordinates, name: candidate.name, placeId: candidate.placeId };
      return { waypoint, retention: candidate.retention, reference: { input, waypoint, version: place?.version ?? null } satisfies Reference };
    },
    revalidate(context, references) {
      for (const raw of references) {
        const ref = raw as Reference;
        if (ref.input.kind === 'candidate') {
          const candidate = placesService.resolveCandidate(context, ref.input.resultId, ref.input.candidateId);
          if (!samePoint(candidate.coordinates, ref.waypoint.coordinates) || candidate.name !== ref.waypoint.name || candidate.placeId !== ref.waypoint.placeId) throw new RouteFault('INPUT_CHANGED', '経路の場所候補が変更されています', 409);
        }
        if (ref.waypoint.placeId) {
          const current = getPlace(db, ref.waypoint.placeId);
          if (current.version !== ref.version || !samePoint(current.coordinates, ref.waypoint.coordinates)) throw new RouteFault('INPUT_CHANGED', '経路の場所が更新されています', 409);
        }
      }
    },
    adoptWaypoints(context, preview, references) {
      const result = structuredClone(preview);
      references.forEach((raw, i) => {
        const ref = raw as Reference | null;
        if (!ref || ref.input.kind !== 'candidate' || ref.waypoint.placeId) return;
        const input = ref.input;
        const id = `route-place-${createHash('sha256').update(JSON.stringify([context.personId, context.dataMode, input.resultId, input.candidateId])).digest('hex').slice(0, 48)}`;
        const { place } = placesService.adopt(context, db, { id, mode: 'candidate', resultId: input.resultId, candidateId: input.candidateId });
        if (!samePoint(place.coordinates, ref.waypoint.coordinates) || place.name !== ref.waypoint.name) throw new RouteFault('INPUT_CHANGED', '採用する場所が変更されています', 409);
        result.waypoints[i]!.placeId = place.id;
      });
      return result;
    },
  };
}
