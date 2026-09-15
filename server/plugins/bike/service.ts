import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type { RequestContext } from "../../core/context.ts";
import { CommonError } from "../../core/errors.ts";
import { transaction } from "../../db/migrate.ts";
import { geometryHash, inside, settingsHash, validateSettings, type Assessment, type BikeSettings, type Position } from "./domain.ts";
import { OverpassBikeProvider, type BikeData, type BikeProvider } from "./overpass.ts";

export interface Installation { installId: string; version: number; enabled: boolean; settings: unknown; visible: boolean }
export interface RouteSnapshot {
  previewId: string; mode: string; geometry: { type: "LineString"; coordinates: Position[] };
  expiresAt: number; fetchedAt: number; retention: "storable" | "temporary";
}
/** Implemented only by server-owned common ROUTES adapter, never accepted in an HTTP request. */
export interface RoutesBoundary {
  revalidatePreview(context: RequestContext, previewId: string, forSave?: boolean): RouteSnapshot;
  saveRoute(context: RequestContext, input: { id: string; previewId: string; title: string }): { data: { id: string }; created: boolean };
  getSavedRoute(context: RequestContext, id: string, own?: boolean): { id: string; geometry: unknown };
  assess?(context: RequestContext, route: RouteSnapshot, settings: BikeSettings): { vehicle: Assessment; highway: Assessment; geometryHash: string; settingsHash: string };
}
export interface Binding { installId: string; settingsVersion: number; settingsHash: string; settings: BikeSettings }
export interface SearchResult extends BikeData, Binding { id: string; kind: "search"; dataKind: "real"; fetchedAt: number; expiresAt: number }
export interface RouteAssessment extends Binding {
  id: string; kind: "assessment"; dataKind: "real"; previewId: string; searchId: string;
  geometryHash: string; geometry: RouteSnapshot["geometry"]; routeFetchedAt: number;
  vehicleAssessment: Assessment; highwayAssessment: Assessment; adoptable: boolean;
  checkedAt: number; expiresAt: number;
}
export interface Adoption extends Binding { id: string; kind: "adoption"; assessment: RouteAssessment; routeId: string; adoptedAt: number }
type Stored = SearchResult | RouteAssessment | Adoption;
export class BikeService {
  constructor(private db: DatabaseSync, private installation: (context: RequestContext) => Installation | null, private routes: RoutesBoundary, private provider: BikeProvider = new OverpassBikeProvider()) {}
  private binding(context: RequestContext, enabled = true): Binding {
    context.signal.throwIfAborted();
    const installation = this.installation(context);
    if (!installation || (enabled && !installation.enabled)) throw new CommonError("STATE_CONFLICT", "バイク機能を導入・有効化してから操作してください。");
    const settings = validateSettings(installation.settings);
    return { installId: installation.installId, settingsVersion: installation.version, settingsHash: settingsHash(settings), settings };
  }
  private recheck(context: RequestContext, saved: Binding) {
    const current = this.binding(context);
    if (current.installId !== saved.installId || current.settingsVersion !== saved.settingsVersion || current.settingsHash !== saved.settingsHash) throw new CommonError("INPUT_CHANGED", "車種・地域・高速道路設定が変わりました。再検索してください。");
  }
  private put(context: RequestContext, result: Stored) {
    this.db.prepare("INSERT INTO bike_results VALUES (?,?,?,?,?,?,?,?)").run(result.id, context.personId, context.dataMode, result.kind, result.installId, result.settingsHash, JSON.stringify(result), "fetchedAt" in result ? result.fetchedAt : "checkedAt" in result ? result.checkedAt : result.adoptedAt);
  }
  get(context: RequestContext, id: string): Stored {
    const row = this.db.prepare("SELECT snapshot_json FROM bike_results WHERE id=? AND person_id=? AND data_mode=?").get(id, context.personId, context.dataMode) as { snapshot_json: string } | undefined;
    if (!row) throw new CommonError("NOT_FOUND", "バイクの保存結果がありません。");
    return JSON.parse(row.snapshot_json) as Stored;
  }
  async search(context: RequestContext, onSaved?: (result: SearchResult) => void): Promise<SearchResult> {
    const binding = this.binding(context);
    const data = await this.provider.search(binding.settings, context.signal);
    const fetchedAt = Date.now();
    const result: SearchResult = { ...data, ...binding, id: randomUUID(), kind: "search", dataKind: "real", fetchedAt, expiresAt: fetchedAt + 900_000 };
    transaction(this.db, () => { this.recheck(context, binding); this.put(context, result); onSaved?.(result); });
    return result;
  }
  assessRoute(context: RequestContext, input: { previewId: string; searchId: string }): RouteAssessment {
    const binding = this.binding(context), search = this.get(context, input.searchId);
    if (search.kind !== "search") throw new CommonError("VALIDATION_FAILED", "地点・道路の検索結果を指定してください。");
    this.recheck(context, search);
    if (search.expiresAt <= Date.now()) throw new CommonError("RESULT_EXPIRED", "道路情報を再検索してください。");
    const route = this.routes.revalidatePreview(context, input.previewId, true);
    if (route.mode !== "driving") throw new CommonError("VALIDATION_FAILED", "バイク条件はdriving経路に適用してください。");
    if (route.retention !== "storable") throw new CommonError("STATE_CONFLICT", "保存できない一時経路は評価snapshotへ保存できません。");
    if (route.geometry.type !== "LineString" || route.geometry.coordinates.length < 2 || route.geometry.coordinates.some(p => !inside(p, binding.settings.region.bounds))) throw new CommonError("RANGE_NOT_SATISFIABLE", "経路全体が検索地域に収まるように設定してください。");
    const checkedAt = Date.now(), hash = geometryHash(route.geometry);
    const supplied = this.routes.assess?.(context, route, binding.settings);
    if (supplied && (supplied.geometryHash !== hash || supplied.settingsHash !== binding.settingsHash)) throw new CommonError("SOURCE_CHANGED", "経路・設定と通行根拠が一致しません。");
    // Nearby OSM roads are observations, not a verified match to Mapbox geometry.
    // Their absence or presence cannot certify every segment of this route.
    const unknown = (reason: string): Assessment => ({ status: "unknown", reason, checkedAt, sourceRefs: [search.source.id] });
    const vehicleAssessment = supplied?.vehicle ?? unknown("共通driving経路の全区間に対応する二輪車通行根拠がありません。周辺のOSM道路タグだけでは通行可能と判断しません。");
    const highwayAssessment = supplied?.highway ?? unknown("同じ経路形状の高速道路条件を確認する根拠がありません。");
    for (const a of [vehicleAssessment, highwayAssessment]) if (a.status === "verified" && (!a.sourceRefs.length || !Number.isFinite(a.checkedAt))) throw new CommonError("SOURCE_CHANGED", "通行確認の出典・時刻が不足しています。");
    const result: RouteAssessment = { ...binding, id: randomUUID(), kind: "assessment", dataKind: "real", previewId: route.previewId, searchId: search.id, geometryHash: hash, geometry: route.geometry, routeFetchedAt: route.fetchedAt, vehicleAssessment, highwayAssessment, adoptable: vehicleAssessment.status === "verified" && highwayAssessment.status === "verified", checkedAt, expiresAt: Math.min(route.expiresAt, search.expiresAt) };
    transaction(this.db, () => { this.recheck(context, binding); this.put(context, result); });
    return result;
  }
  adopt(context: RequestContext, input: { id: string; assessmentId: string; title: string }): Adoption {
    return transaction(this.db, () => {
      const assessment = this.get(context, input.assessmentId);
      if (assessment.kind !== "assessment") throw new CommonError("VALIDATION_FAILED", "経路評価結果を指定してください。");
      this.recheck(context, assessment);
      if (assessment.expiresAt <= Date.now()) throw new CommonError("RESULT_EXPIRED", "通行条件を再確認してください。");
      if (!assessment.adoptable || assessment.vehicleAssessment.status !== "verified" || assessment.highwayAssessment.status !== "verified") throw new CommonError("STATE_CONFLICT", "未確認・条件不適合の経路は採用できません。", false, { vehicleAssessment: assessment.vehicleAssessment, highwayAssessment: assessment.highwayAssessment });
      const route = this.routes.revalidatePreview(context, assessment.previewId, true);
      if (geometryHash(route.geometry) !== assessment.geometryHash) throw new CommonError("SOURCE_CHANGED", "評価した経路形状が変わりました。");
      const saved = this.routes.saveRoute(context, { id: input.id, previewId: assessment.previewId, title: input.title });
      const result: Adoption = { id: randomUUID(), kind: "adoption", installId: assessment.installId, settingsVersion: assessment.settingsVersion, settingsHash: assessment.settingsHash, settings: assessment.settings, assessment, routeId: saved.data.id, adoptedAt: Date.now() };
      this.put(context, result);
      return result;
    });
  }
  state(context: RequestContext) {
    const installation = this.installation(context);
    const rows = this.db.prepare("SELECT snapshot_json FROM bike_results WHERE person_id=? AND data_mode=? ORDER BY created_at DESC,rowid DESC LIMIT 50").all(context.personId, context.dataMode) as { snapshot_json: string }[];
    const results = rows.map(r => JSON.parse(r.snapshot_json) as Stored);
    const ownerKeys = [...new Set(results.map(r => `plugin:${r.installId}`))];
    const ownerKey = installation ? `plugin:${installation.installId}` : null;
    if (ownerKey && !ownerKeys.includes(ownerKey)) ownerKeys.push(ownerKey);
    const visible = Boolean(installation?.enabled && installation.visible);
    const hash = installation ? settingsHash(validateSettings(installation.settings)) : null;
    const current = results.filter(r => r.installId === installation?.installId && r.settingsHash === hash);
    const search = current.find((r): r is SearchResult => r.kind === "search");
    const adoption = current.find((r): r is Adoption => r.kind === "adoption");
    const features: unknown[] = [];
    if (visible && search) for (const place of search.places) features.push({ type: "Feature", id: place.id, geometry: { type: "Point", coordinates: [place.position.longitude, place.position.latitude] }, properties: { ownerKey, name: place.name, category: place.category, assessmentStatus: place.vehicleAssessment.status, source: place.source, stale: search.expiresAt <= Date.now() } });
    if (visible && adoption) {
      try {
        const route = this.routes.getSavedRoute(context, adoption.routeId, true);
        if (geometryHash(route.geometry) === adoption.assessment.geometryHash) features.push({ type: "Feature", id: route.id, geometry: route.geometry, properties: { ownerKey, assessmentStatus: "verified", checkedAt: adoption.assessment.checkedAt, stale: adoption.assessment.expiresAt <= Date.now() } });
      } catch (error) { if (!(error instanceof CommonError) || error.code !== "NOT_FOUND") throw error; }
    }
    return { installation, results, display: { ownerKey, visible, clearOwnerKeys: ownerKeys.filter(k => !visible || k !== ownerKey), geojson: { type: "FeatureCollection", features } } };
  }
}
