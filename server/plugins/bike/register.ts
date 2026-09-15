import type { DatabaseSync } from "node:sqlite";
import { CommonError } from "../../core/errors.ts";
import { getPluginState, registerPlugin } from "../../features/plugins/index.ts";
import { createRoutesService } from "../../features/routes/index.ts";
import { BikeService, type RoutesBoundary } from "./service.ts";
import { bikeRelease } from "./release.ts";
import { createBikeFeature } from "./feature.ts";

registerPlugin(bikeRelease);
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
    revalidatePreview: (...args) => common(() => routes.revalidatePreview(...args)),
    saveRoute: (...args) => common(() => routes.saveRoute(...args)),
    getSavedRoute: (...args) => common(() => routes.getSavedRoute(...args)),
  };
  return new BikeService(db, context => common(() => {
    const state = getPluginState(db, context), item = state.items.find(i => i.id === "bike"), applied = state.plugins.find(p => p.pluginId === "bike");
    return item && applied ? { installId: item.installId, version: item.version, enabled: item.enabled, settings: item.settings, visible: applied.resolvedDeclarations.some(d => d.targetKey === "layer:bike" && d.property === "visibility" && d.value === true) } : null;
  }), boundary);
}
export default createBikeFeature(createBikeService);
