import { requireVersion } from '../../core/errors.ts';
import { savedRouteDto } from './dto.ts';
import { createHash, randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import type { RequestContext } from '../../core/context.ts';
import { MapboxRoadProvider } from './mapbox.ts';
import { RouteFault, coordinate, type RouteInput, type Waypoint, type ResolvedWaypoint, type RoutePreview, type SavedRoute } from './types.ts';

export type ResolvedSource = { waypoint: ResolvedWaypoint; retention: 'storable' | 'temporary'; reference: unknown };
export interface PlacesBoundary {
  resolve(context: RequestContext, waypoint: Exclude<Waypoint, { kind: 'point' }>): ResolvedSource;
  revalidate(context: RequestContext, references: unknown[]): void;
  adoptWaypoints(context: RequestContext, preview: RoutePreview, references: unknown[]): RoutePreview;
}
type Atomic = <T>(work: () => T) => T;
const previewsByDb = new WeakMap<DatabaseSync, Map<string, { personId: string; dataMode: string; preview: RoutePreview; references: unknown[] }>>();
const sourceUrl = 'https://www.mapbox.com/about/maps/';
const allowed = (input: any, keys: string[]) => {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(k => !keys.includes(k))) throw new RouteFault('INVALID_INPUT', '入力項目が不正です');
};
const text = (v: unknown, max: number, empty = false): v is string => typeof v === 'string' && v.length <= max && (empty || v.trim().length > 0);
const requireId = (id: unknown) => { if (!text(id, 80)) throw new RouteFault('INVALID_INPUT', 'IDが不正です'); };
function cancelled(context: RequestContext) { if (context.signal.aborted) throw new RouteFault('CANCELLED', '操作を取り消しました', 409); }

export function validateRouteInput(input: RouteInput) {
  allowed(input, ['waypoints', 'mode', 'title', 'conditions']);
  if (!Array.isArray(input.waypoints) || input.waypoints.length < 2 || input.waypoints.length > 10 || !text(input.title, 100, true) || !['walking', 'driving', 'cycling', 'transit'].includes(input.mode)) throw new RouteFault('INVALID_INPUT', '経路入力が不正です');
  for (const w of input.waypoints) {
    if (w?.kind === 'point') { allowed(w, ['kind', 'coordinates', 'label']); if (!coordinate(w.coordinates) || !text(w.label, 500)) throw new RouteFault('INVALID_INPUT', '地点の座標・名前が不正です'); }
    else if (w?.kind === 'stored') { allowed(w, ['kind', 'placeId']); requireId(w.placeId); }
    else if (w?.kind === 'candidate') { allowed(w, ['kind', 'resultId', 'candidateId']); requireId(w.resultId); requireId(w.candidateId); }
    else throw new RouteFault('INVALID_INPUT', '地点の種類が不正です');
  }
  if (input.conditions !== undefined) {
    allowed(input.conditions, ['avoidMotorways', 'departAt', 'returnBy', 'avoidStairs', 'preferCovered', 'transitPassIds', 'stayDurationSec']);
    const c = input.conditions;
    if ((c.avoidMotorways !== undefined && typeof c.avoidMotorways !== 'boolean') || (c.avoidStairs !== undefined && typeof c.avoidStairs !== 'boolean') || (c.preferCovered !== undefined && typeof c.preferCovered !== 'boolean') || (c.transitPassIds !== undefined && (!Array.isArray(c.transitPassIds) || c.transitPassIds.length > 100 || c.transitPassIds.some(id => !text(id, 80))))) throw new RouteFault('INVALID_INPUT', '経路条件が不正です');
    for (const key of ['departAt', 'returnBy', 'stayDurationSec'] as const) if (c[key] !== undefined && (!Number.isSafeInteger(c[key]) || c[key]! < 0)) throw new RouteFault('INVALID_INPUT', '時刻・滞在時間が不正です');
    const requested = Object.entries(c).filter(([k,v]) => k !== 'avoidMotorways' && (Array.isArray(v) ? v.length > 0 : v !== false)).map(([k]) => k);
    if (requested.length) throw new RouteFault('MODE_UNSUPPORTED', '指定条件の取得根拠を返せるproviderが未接続です', 501, { unsupportedConditions: requested, applied: false });
  }
}

export class RoutesService {
  private previews;
  constructor(private db: DatabaseSync, private atomic: Atomic, private provider: MapboxRoadProvider, private places?: PlacesBoundary) {
    if (!previewsByDb.has(db)) previewsByDb.set(db, new Map());
    this.previews = previewsByDb.get(db)!;
  }
  async previewRoute(context: RequestContext, input: RouteInput): Promise<RoutePreview> {
    return (await this.calculate(context, input, false))[0]!;
  }
  async compareRoutes(context: RequestContext, input: RouteInput): Promise<RoutePreview[]> {
    return this.calculate(context, input, true);
  }
  private async calculate(context: RequestContext, input: RouteInput, compare: boolean): Promise<RoutePreview[]> {
    validateRouteInput(input); cancelled(context);
    if (input.mode !== 'walking' && input.mode !== 'driving') throw new RouteFault('MODE_UNSUPPORTED', 'この道路契約で未対応の移動手段です', 501);
    const references: unknown[] = [];
    let retention: 'storable' | 'temporary' = 'storable';
    const waypoints = input.waypoints.map(w => {
      if (w.kind === 'point') { references.push(null); return { coordinates: w.coordinates, name: w.label, placeId: null }; }
      if (!this.places) throw new RouteFault('PROVIDER_UNAVAILABLE', '場所の解決サービスが未接続です', 503);
      const resolved = this.places.resolve(context, w);
      references.push(resolved.reference);
      if (resolved.retention === 'temporary') retention = 'temporary';
      return resolved.waypoint;
    });
    const points = waypoints.map(w => w.coordinates);
    const routes = compare ? await this.provider.compare(points, input.mode, context.signal, input.conditions) : [await this.provider.route(points, input.mode, context.signal, true, undefined, input.conditions)];
    cancelled(context);
    this.places?.revalidate(context, references.filter(r => r !== null));
    const previews = routes.map(route => ({ ...route, previewId: randomUUID(), waypoints, mode: input.mode, expiresAt: route.fetchedAt + 900_000, retention } satisfies RoutePreview));
    for (const [key, value] of this.previews) if (value.preview.expiresAt <= Date.now()) this.previews.delete(key);
    for (const preview of previews) this.previews.set(preview.previewId, { personId: context.personId, dataMode: context.dataMode, preview: structuredClone(preview), references });
    return previews;
  }
  revalidatePreview(context: RequestContext, previewId: string, forSave = false): RoutePreview {
    requireId(previewId); cancelled(context);
    const row = this.previews.get(previewId);
    if (!row || row.preview.expiresAt <= Date.now()) throw new RouteFault('RESULT_EXPIRED', '経路候補の期限が切れました。再検索してください', 410);
    if (row.personId !== context.personId || row.dataMode !== context.dataMode) throw new RouteFault('NOT_FOUND', '経路候補がありません', 404);
    const preview = structuredClone(row.preview);
    if (forSave && preview.retention !== 'storable') throw new RouteFault('REQUEST_CONFLICT', '一時候補を含む経路は保存できません。場所を選び直してください', 409);
    const refs = row.references.filter(r => r !== null);
    if (refs.length && !this.places) throw new RouteFault('PROVIDER_UNAVAILABLE', '場所の再照合サービスが未接続です', 503);
    this.places?.revalidate(context, refs);
    return preview;
  }
  saveRoute(context: RequestContext, input: { id: string; previewId: string; title: string }): { data: SavedRoute; created: boolean } {
    allowed(input, ['id', 'previewId', 'title']); requireId(input.id); requireId(input.previewId);
    if (!text(input.title, 100)) throw new RouteFault('INVALID_INPUT', 'ルート名が不正です');
    const hash = createHash('sha256').update(JSON.stringify([input.previewId, input.title])).digest('hex');
    return this.atomic(() => {
      cancelled(context);
      const receipt = this.db.prepare("SELECT * FROM creation_receipts WHERE person_id=? AND operation='route-save' AND target_id=?").get(context.personId, input.id) as any;
      if (receipt) {
        if (receipt.input_hash !== hash) throw new RouteFault('REQUEST_CONFLICT', '同じ保存IDに異なる内容が指定されました', 409);
        return { data: this.getSavedRoute(context, receipt.result_id, true), created: false };
      }
      if (this.db.prepare('SELECT id FROM saved_routes WHERE id=?').get(input.id)) throw new RouteFault('REQUEST_CONFLICT', '保存IDはすでに使用されています', 409);
      let preview = this.revalidatePreview(context, input.previewId, true);
      if (this.places) preview = this.places.adoptWaypoints(context, preview, this.previews.get(input.previewId)!.references);
      const now = Date.now();
      const values = this.storedValues(preview);
      this.db.prepare("INSERT INTO saved_routes(id,person_id,title,waypoints_json,route_json,distance_m,duration_sec,provider,source_url,fetched_at,status,current_leg,visibility,shared_with_json,version,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,'saved',0,'private','[]',1,?,?)").run(input.id, context.personId, input.title, ...values, now, now);
      this.db.prepare("INSERT INTO creation_receipts(person_id,operation,target_id,input_hash,result_type,result_id,created_at) VALUES(?,'route-save',?,?,'route',?,?)").run(context.personId, input.id, hash, input.id, now);
      return { data: this.getSavedRoute(context, input.id, true), created: true };
    });
  }
  private storedValues(p: RoutePreview) {
    const points = p.waypoints.map(w => ({ lng: w.coordinates[0], lat: w.coordinates[1], name: w.name, ...(w.placeId ? { placeId: w.placeId } : {}) }));
    const route = { ...(p.requestedConditions ? { requestedConditions: p.requestedConditions, conditionEvaluations: p.conditionEvaluations } : {}), mode: p.mode, geometry: p.geometry, legs: p.legs.map(l => ({ ...l, mode: p.mode, from: points[l.fromIndex], to: points[l.toIndex] })) };
    return [JSON.stringify(points), JSON.stringify(route), p.distanceM, p.durationSec, p.provider, sourceUrl, p.fetchedAt] as const;
  }
  getSavedRoute(context: RequestContext, id: string, own = false): SavedRoute {
    requireId(id);
    const row = this.db.prepare('SELECT * FROM saved_routes WHERE id=?').get(id) as any;
    if (!row) throw new RouteFault('NOT_FOUND', '保存ルートがありません', 404);
    const owned = row.person_id === context.personId;
    if (!owned && (own || (row.visibility !== 'public' && !(row.visibility === 'selected' && JSON.parse(row.shared_with_json).includes(context.personId))))) throw new RouteFault('NOT_FOUND', '保存ルートがありません', 404);
    return savedRouteDto(row);
  }
  listSavedRoutes(context: RequestContext, input: { limit?: number; cursor?: string } = {}) {
    const limit = input.limit ?? 50;
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new RouteFault('INVALID_INPUT', '取得件数が不正です');
    let boundary: [number, string] | null = null;
    if (input.cursor) {
      try {
        const c = JSON.parse(Buffer.from(input.cursor, 'base64url').toString());
        if (c.personId !== context.personId || c.dataMode !== context.dataMode || c.limit !== limit || !Number.isSafeInteger(c.updatedAt) || !text(c.id, 80)) throw Error();
        boundary = [c.updatedAt, c.id];
      } catch { throw new RouteFault('INVALID_INPUT', 'ページの継続条件が不正です', 400); }
    }
    const rows = (boundary ? this.db.prepare('SELECT * FROM saved_routes WHERE person_id=? AND (updated_at < ? OR (updated_at=? AND id < ?)) ORDER BY updated_at DESC,id DESC LIMIT ?').all(context.personId, boundary[0], boundary[0], boundary[1], limit + 1) : this.db.prepare('SELECT * FROM saved_routes WHERE person_id=? ORDER BY updated_at DESC,id DESC LIMIT ?').all(context.personId, limit + 1)) as any[];
    const items = rows.slice(0, limit).map(r => savedRouteDto(r));
    const last = items.at(-1);
    return { items, nextCursor: rows.length > limit && last ? Buffer.from(JSON.stringify({ personId: context.personId, dataMode: context.dataMode, limit, updatedAt: last.updatedAt, id: last.id })).toString('base64url') : null };
  }
  updateRoute(context: RequestContext, id: string, patch: { title?: string; previewId?: string; status?: SavedRoute['status']; currentLeg?: number; visibility?: SavedRoute['visibility']; sharedWith?: string[] }, expectedVersion: number): SavedRoute {
    allowed(patch, ['title', 'previewId', 'status', 'currentLeg', 'visibility', 'sharedWith']);
    if (!Object.keys(patch).length) throw new RouteFault('INVALID_INPUT', '変更項目を指定してください');
    if (patch.title !== undefined && !text(patch.title, 100)) throw new RouteFault('INVALID_INPUT', 'ルート名が不正です');
    if (patch.previewId !== undefined && (patch.status !== undefined || patch.currentLeg !== undefined)) throw new RouteFault('INVALID_INPUT', '経路置換と案内状態の更新は分けてください');
    return this.atomic(() => {
      cancelled(context);
      const current = this.getSavedRoute(context, id, true);
      requireVersion(current.version, expectedVersion);
      const next = { ...current, ...patch };
      if (!['private', 'selected', 'public'].includes(next.visibility) || !Array.isArray(next.sharedWith) || next.sharedWith.length > 100 || next.sharedWith.some(p => !text(p, 80)) || new Set(next.sharedWith).size !== next.sharedWith.length || (next.visibility === 'selected' ? next.sharedWith.length === 0 : next.sharedWith.length !== 0)) throw new RouteFault('INVALID_INPUT', '共有範囲と共有先が一致しません');
      for (const person of next.sharedWith) if (!this.db.prepare('SELECT id FROM people WHERE id=?').get(person)) throw new RouteFault('INVALID_INPUT', '共有先の人物が存在しません');
      let preview = patch.previewId !== undefined ? this.revalidatePreview(context, patch.previewId, true) : null;
      if (preview && this.places) preview = this.places.adoptWaypoints(context, preview, this.previews.get(patch.previewId!)!.references);
      if (preview) { next.status = 'saved'; next.currentLeg = 0; }
      if (!Number.isInteger(next.currentLeg) || next.currentLeg < 0 || next.currentLeg >= (preview?.legs ?? next.legs).length) throw new RouteFault('INVALID_INPUT', '案内区間が範囲外です');
      const transitions = { saved: ['navigating'], navigating: ['saved', 'finished'], finished: ['saved', 'navigating'] };
      if (!preview && next.status !== current.status && !transitions[current.status].includes(next.status)) throw new RouteFault('STATE_CONFLICT', '案内状態を変更できません', 409);
      if (!preview && next.status === 'navigating' && current.status !== 'navigating' && Date.now() - current.fetchedAt >= 900_000) throw new RouteFault('STATE_CONFLICT', '案内開始前に経路を再取得してください', 409);
      if (!preview && next.title === current.title && next.status === current.status && next.currentLeg === current.currentLeg && next.visibility === current.visibility && JSON.stringify(next.sharedWith) === JSON.stringify(current.sharedWith)) return current;
      if (preview) {
        this.db.prepare('UPDATE saved_routes SET waypoints_json=?,route_json=?,distance_m=?,duration_sec=?,provider=?,source_url=?,fetched_at=? WHERE id=? AND person_id=? AND version=?').run(...this.storedValues(preview), id, context.personId, expectedVersion);
      }
      const updated = this.db.prepare('UPDATE saved_routes SET title=?,status=?,current_leg=?,visibility=?,shared_with_json=?,version=version+1,updated_at=? WHERE id=? AND person_id=? AND version=?').run(next.title, next.status, next.currentLeg, next.visibility, JSON.stringify(next.sharedWith), Date.now(), id, context.personId, expectedVersion);
      if (!updated.changes) throw new RouteFault('VERSION_CONFLICT', '保存ルートが更新されています', 412);
      return this.getSavedRoute(context, id, true);
    });
  }
  deleteRoute(context: RequestContext, id: string, expectedVersion: number) {
    return this.atomic(() => {
      cancelled(context);
      const current = this.getSavedRoute(context, id, true); requireVersion(current.version, expectedVersion);
      this.db.prepare('UPDATE suggestions SET route_id=NULL,version=version+1,updated_at=? WHERE route_id=?').run(Date.now(), id);
      const deleted = this.db.prepare('DELETE FROM saved_routes WHERE id=? AND person_id=? AND version=?').run(id, context.personId, expectedVersion);
      if (!deleted.changes) throw new RouteFault('VERSION_CONFLICT', '保存ルートが更新されています', 412);
    });
  }
}
