import type { DatabaseSync } from 'node:sqlite';
import { transaction } from '../../db/migrate.ts';
import { MapboxRoadProvider } from './mapbox.ts';
import { RoutesService } from './service.ts';
import { placesBoundary } from './places-boundary.ts';
export { savedRouteDto } from './dto.ts';
export type { RouteInput, RoutePreview, SavedRoute } from './types.ts';
export function createRoutesService(db: DatabaseSync): RoutesService {
  return new RoutesService(db, run => transaction(db, run), new MapboxRoadProvider(process.env.MAPBOX_ACCESS_TOKEN ?? ''), placesBoundary(db));
}
