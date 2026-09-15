import { CommonError } from "../../core/errors.ts";
import { geometryHash, settingsHash, type Assessment, type BikeSettings } from "./domain.ts";
import type { RouteSnapshot } from "./service.ts";

/** Server-owned evidence for this exact route; never accepted from an HTTP client. */
export interface SegmentEvidence {
  provider: "valhalla";
  profile: "motorcycle" | "motor_scooter";
  geometryHash: string;
  routeFetchedAt: number;
  fetchedAt: number;
  sourceUrl: string;
  osmChangeset: string | null;
  options: { excludeHighways: boolean; useHighways: number; topSpeed: number | null; departureLocal: string };
  warnings: { code: number; text: string }[];
  edges: {
    wayId: number | null; forward: boolean | null;
    beginShapeIndex: number; endShapeIndex: number;
    roadClass: string | null; use: string | null;
    /** Explicit same-edge motorroad classification. Missing is null, never false. */
    motorroad: boolean | null;
  }[];
}
export interface RouteResultEvaluation {
  evidence: SegmentEvidence;
  requestedExclusion: { status: "not_requested" | "ignored" | "unknown"; reason: string };
  coverage: { complete: boolean; segmentCount: number; coveredSegmentCount: number; edgeCount: number };
  motorwayAssessment: Assessment;
}

/** Separates provider option application from observation of the returned geometry. */
export function assessSegmentRoute(route: RouteSnapshot, settings: BikeSettings) {
  const evidence = route.segmentEvidence!;
  const hash = geometryHash(route.geometry);
  if (evidence.provider !== "valhalla" || !["motorcycle", "motor_scooter"].includes(evidence.profile)
    || evidence.geometryHash !== hash || evidence.routeFetchedAt !== route.fetchedAt
    || !Number.isFinite(evidence.fetchedAt) || evidence.fetchedAt < evidence.routeFetchedAt
    || !evidence.sourceUrl.startsWith("https://")) {
    throw new CommonError("SOURCE_CHANGED", "区間根拠の形状・取得時刻・出典が経路と一致しません。");
  }
  const checkedAt = evidence.fetchedAt;
  const assessment = (status: Assessment["status"], reason: string): Assessment => ({ status, reason, sourceRefs: [evidence.sourceUrl], checkedAt });
  const segmentCount = route.geometry.coordinates.length - 1;
  const covered = new Set<number>();
  let next = 0, ordered = true;
  for (const edge of evidence.edges) {
    const { beginShapeIndex: begin, endShapeIndex: end } = edge;
    if (!Number.isInteger(begin) || !Number.isInteger(end) || begin < 0 || end <= begin || end > segmentCount) {
      throw new CommonError("SOURCE_CHANGED", "区間根拠の形状インデックスが不正です。");
    }
    if (begin !== next) ordered = false;
    next = end;
    for (let i = begin; i < end; i++) covered.add(i);
  }
  const complete = ordered && next === segmentCount && covered.size === segmentCount
    && evidence.edges.every(e => Number.isSafeInteger(e.wayId) && e.wayId! > 0 && typeof e.forward === "boolean");
  const classes = new Set(["motorway", "trunk", "primary", "secondary", "tertiary", "unclassified", "residential", "service_other"]);
  // Other uses (e.g. ferries) do not establish a road-only itinerary from road_class alone.
  const classified = complete && evidence.edges.every(e => classes.has(e.roadClass ?? "") && ["road", "ramp", "turn_channel", "service_road"].includes(e.use ?? ""));
  const motorwayAssessment = !classified
    ? assessment("unknown", "同一形状の全区間に対応する道路クラス・用途・ID・方向が揃っていません。")
    : evidence.edges.some(e => e.roadClass === "motorway")
      ? assessment("ineligible", "返された経路にmotorwayクラスの区間があります。")
      : assessment("verified", "同一形状の全区間を検査し、Valhallaのmotorwayクラスを含まないことを確認しました。日本の自動車専用道路全般や車種適合の証明ではありません。");
  const requestedExclusion: RouteResultEvaluation["requestedExclusion"] = !evidence.options.excludeHighways
    ? { status: "not_requested", reason: "強制高速除外は要求していません。" }
    : evidence.warnings.some(w => w.code === 208)
      ? { status: "ignored", reason: "providerがwarning 208で強制除外を無視しました。経路結果の区間検査とは別の状態です。" }
      : { status: "unknown", reason: "要求オプションの適用確認がありません。警告がないことだけでは適用済みにしません。" };
  const vehicle = assessment("unknown", "二輪profile名と方向付きway IDだけでは、日本の排気量・出力・時刻別の全区間通行規制を確認できません。");
  const highway = settings.highwayPolicy === "allow"
    ? assessment("verified", "設定は高速利用を許容しています。車種の通行適合を示しません。")
    : motorwayAssessment.status === "ineligible" || (complete && evidence.edges.some(e => e.motorroad === true))
      ? assessment("ineligible", "高速回避設定に対しmotorwayまたは自動車専用区間があります。")
      : motorwayAssessment.status === "verified" && evidence.edges.every(e => e.motorroad === false)
        ? assessment("verified", "同一形状の全区間でmotorway・自動車専用区分を除外できました。車種適合は別評価です。")
        : assessment("unknown", "motorwayクラスの検査結果は保存しましたが、日本の自動車専用道路区分を含む全区間の高速条件根拠が不足しています。");
  const resultEvaluation: RouteResultEvaluation = {
    evidence: structuredClone(evidence), requestedExclusion,
    coverage: { complete, segmentCount, coveredSegmentCount: covered.size, edgeCount: evidence.edges.length }, motorwayAssessment,
  };
  return { vehicle, highway, geometryHash: hash, settingsHash: settingsHash(settings), resultEvaluation };
}
