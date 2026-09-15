import type { RequestContext } from "../../core/context.ts";
import { geometryHash, settingsHash, type Assessment, type BikeSettings } from "./domain.ts";
import type { DatabaseSync } from "node:sqlite";
import { CommonError } from "../../core/errors.ts";
import { getPluginState, registerPlugin } from "../../features/plugins/index.ts";
import { placesService } from "../../features/places/service.ts";
import { createRoutesService } from "../../features/routes/index.ts";
import { BikeService, type RouteSnapshot, type RoutesBoundary } from "./service.ts";
import { assessCommonRoute } from "./route-evidence.ts";
import { bikeRelease, bikeSegmentRelease } from "./release.ts";
import { createBikeFeature } from "./feature.ts";

registerPlugin(bikeRelease);
registerPlugin(bikeSegmentRelease);
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
/** Only new assessments use the installed release capability. Existing snapshots remain readable. */
export function assessBikeReleaseRoute(db: DatabaseSync, context: RequestContext, route: RouteSnapshot, settings: BikeSettings): ReturnType<NonNullable<RoutesBoundary["assess"]>> {
  if (route.segmentEvidence) {
    const applied = common(() => getPluginState(db, context)).plugins.find(p => p.pluginId === "bike");
    const enabled = applied?.enabled && applied.resolvedDeclarations.some(d => d.targetKey === "feature:bike:segment-evidence" && d.property === "enabled" && d.value === true);
    if (!enabled) {
      const unknown: Assessment = { status: "unknown", reason: "同一経路の区間根拠評価はバイク1.1.0で提供します。旧版では通行可能と判断しません。", sourceRefs: [route.segmentEvidence.sourceUrl], checkedAt: route.fetchedAt };
      return { vehicle: unknown, highway: { ...unknown }, geometryHash: geometryHash(route.geometry), settingsHash: settingsHash(settings) };
    }
  }
  return assessCommonRoute(context, route, settings);
}
export function createBikeService(db: DatabaseSync) {
  const routes = createRoutesService(db);
  const boundary: RoutesBoundary = {
    assess: (context, route, settings) => assessBikeReleaseRoute(db, context, route, settings),
    revalidatePreview: (...args) => common(() => routes.revalidatePreview(...args)),
    saveRoute: (...args) => common(() => routes.saveRoute(...args)),
    getSavedRoute: (...args) => common(() => routes.getSavedRoute(...args)),
  };
  return new BikeService(db, context => common(() => {
    const state = getPluginState(db, context), item = state.items.find(i => i.id === "bike"), applied = state.plugins.find(p => p.pluginId === "bike");
    return item && applied ? { installId: item.installId, version: item.version, enabled: item.enabled, settings: item.settings, visible: applied.resolvedDeclarations.some(d => d.targetKey === "layer:bike" && d.property === "visibility" && d.value === true) } : null;
  }), boundary, undefined, placesService);
}
export default createBikeFeature(createBikeService);
