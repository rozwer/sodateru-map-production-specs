import type { DatabaseSync } from "node:sqlite";
import { CommonError } from "../../core/errors.ts";
import { getPluginState, registerPlugin } from "../../features/plugins/index.ts";
import { placesService } from "../../features/places/service.ts";
import { createRoutesService } from "../../features/routes/index.ts";
import { BikeService, type PlacesBoundary, type RoutesBoundary } from "./service.ts";
import { assessCommonRoute } from "./route-evidence.ts";
import { bikeRelease, bikePlacesRelease } from "./release.ts";
import { createBikeFeature } from "./feature.ts";

registerPlugin(bikeRelease);
registerPlugin(bikePlacesRelease);
function common<T>(work: () => T): T {
  try { return work(); }
  catch (error) {
    if (error instanceof Error && "code" in error && "status" in error) {
      const e = error as Error & { code: string; status: number; details?: Record<string, unknown> };
      throw new CommonError(e.code, e.message, [429, 502, 503, 504].includes(e.status), e.details, e.status);
    }
    throw error;
  }
}
export function createBikeService(db: DatabaseSync) {
  const routes = createRoutesService(db);
  const boundary: RoutesBoundary = {
    assess: assessCommonRoute,
    revalidatePreview: (...args) => common(() => routes.revalidatePreview(...args)),
    saveRoute: (...args) => common(() => routes.saveRoute(...args)),
    getSavedRoute: (...args) => common(() => routes.getSavedRoute(...args)),
  };
  // Read the current, resolved release capability on every registration/replay.
  // Version changes never delete BIKE snapshots or common adopted places.
  const requirePlaceCandidates = (context: Parameters<PlacesBoundary["registerCandidates"]>[0]) => {
    const applied = getPluginState(db, context).plugins.find(p => p.pluginId === "bike");
    if (!applied?.enabled || !applied.resolvedDeclarations.some(d => d.targetKey === "feature:bike:place-candidates" && d.property === "enabled" && d.value === true)) {
      throw new CommonError("STATE_CONFLICT", "共通地点候補を開くにはバイク1.1.0以降を導入・有効化してください。");
    }
  };
  const places: PlacesBoundary = {
    registerCandidates: (context, input) => common(() => { requirePlaceCandidates(context); return placesService.registerCandidates(context, input); }),
    resolveCandidate: (context, resultId, candidateId) => common(() => { requirePlaceCandidates(context); return placesService.resolveCandidate(context, resultId, candidateId); }),
  };
  return new BikeService(db, context => common(() => {
    const state = getPluginState(db, context), item = state.items.find(i => i.id === "bike"), applied = state.plugins.find(p => p.pluginId === "bike");
    return item && applied ? { installId: item.installId, version: item.version, enabled: item.enabled, settings: item.settings, visible: applied.resolvedDeclarations.some(d => d.targetKey === "layer:bike" && d.property === "visibility" && d.value === true) } : null;
  }), boundary, undefined, places);
}
export default createBikeFeature(createBikeService);
