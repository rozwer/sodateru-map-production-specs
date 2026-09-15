import type { RequestContext } from "../../core/context.ts";
import { geometryHash, settingsHash, type Assessment, type BikeSettings } from "./domain.ts";
import type { RouteSnapshot } from "./service.ts";

/** Uses condition evidence attached to this exact common preview, without recalculation. */
export function assessCommonRoute(_context: RequestContext, route: RouteSnapshot, settings: BikeSettings) {
  const checkedAt = Date.now();
  const vehicle: Assessment = { status: "unknown", reason: "Mapbox drivingは二輪車の車種・排気量別通行規制を確認していません。", sourceRefs: ["https://docs.mapbox.com/api/navigation/directions/"], checkedAt };
  const evidence = route.conditionEvaluations?.find(e => e.key === "avoidMotorways" && e.status === "applied" && e.provider === "mapbox-directions" && e.fetchedAt === route.fetchedAt && e.sourceUrl.startsWith("https://"));
  let highway: Assessment;
  if (settings.highwayPolicy === "allow") highway = { status: "verified", reason: "設定は高速利用を許容しています。車種の通行適合を示すものではありません。", sourceRefs: ["https://docs.mapbox.com/api/navigation/directions/"], checkedAt };
  else if (route.requestedConditions?.avoidMotorways === true && evidence) highway = { status: "verified", reason: evidence.reason, sourceRefs: [evidence.sourceUrl], checkedAt: evidence.fetchedAt };
  else highway = { status: "unknown", reason: "この経路に高速回避の取得根拠がありません。avoidMotorways=trueで共通経路を再検索してください。", sourceRefs: ["https://docs.mapbox.com/api/navigation/directions/"], checkedAt };
  return { vehicle, highway, geometryHash: geometryHash(route.geometry), settingsHash: settingsHash(settings) };
}
