import type { DatabaseSync } from 'node:sqlite';
import { transaction } from '../../db/migrate.ts';
import { ValhallaCyclingProvider } from './valhalla.ts';
import { MapboxRoadProvider } from './mapbox.ts';
import { RoutesService } from './service.ts';
import { placesBoundary } from './places-boundary.ts';
export { savedRouteDto } from './dto.ts';
export type { RouteInput, RoutePreview, SavedRoute } from './types.ts';
export function createRoutesService(db: DatabaseSync): RoutesService {
  const mapbox = new MapboxRoadProvider(process.env.MAPBOX_ACCESS_TOKEN ?? '');
  const cycling = new ValhallaCyclingProvider(process.env.ROUTES_VALHALLA_URL ?? 'https://valhalla1.openstreetmap.de/route');
  return new RoutesService(db, run => transaction(db, run), {
    route: (points,mode,...args) => (mode === 'cycling' ? cycling : mapbox).route(points,mode,...args),
    compare: (points,mode,...args) => (mode === 'cycling' ? cycling : mapbox).compare(points,mode,...args),
  }, placesBoundary(db));
}
