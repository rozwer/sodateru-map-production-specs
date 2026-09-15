import type { DatabaseSync } from 'node:sqlite';
import { CommonError, requireVersion } from '../../core/errors.ts';
import { id, invalid, object, oneOf, visitTimes, timestamp, numberIn, range } from './validation.ts';

export type ActivityContext = { personId: string; dataMode: string };
type Row = Record<string, any>;
const visitFields = ['placeId', 'startedAt', 'endedAt', 'timePrecision', 'status'];
export function visitDto(row: Row) {
  return { id: row.id, personId: row.person_id, placeId: row.place_id, startedAt: row.started_at,
    endedAt: row.ended_at, timePrecision: row.time_precision, origin: row.origin, status: row.status,
    version: row.version, createdAt: row.created_at, updatedAt: row.updated_at };
}
export function pointDto(row: Row, breakBefore: boolean) {
  return { id: row.id, personId: row.person_id, segmentId: row.segment_id, sourcePointId: row.source_point_id,
    observedAt: row.observed_at, longitude: row.longitude, latitude: row.latitude, accuracyM: row.accuracy_m,
    version: row.version, createdAt: row.created_at, updatedAt: row.updated_at, breakBefore };
}
export function pointBreak(db: DatabaseSync, row: Row): boolean {
  const previous = db.prepare(`SELECT observed_at FROM track_points WHERE person_id = ? AND segment_id = ?
    AND (observed_at < ? OR (observed_at = ? AND id < ?)) ORDER BY observed_at DESC, id DESC LIMIT 1`)
    .get(row.person_id, row.segment_id, row.observed_at, row.observed_at, row.id);
  if (!previous) return true;
  return !!db.prepare(`SELECT 1 FROM activity_deleted_points WHERE person_id = ? AND segment_id = ?
    AND observed_at >= ? AND observed_at <= ? LIMIT 1`).get(row.person_id, row.segment_id, previous.observed_at!, row.observed_at);
}
function notFound(): never { throw new CommonError('NOT_FOUND', 'Resource not found', false, undefined, 404); }
function conflict(): never { throw new CommonError('IDEMPOTENCY_CONFLICT', 'The observation or ID already has different content', false, undefined, 409); }
export function getVisit(db: DatabaseSync, context: ActivityContext, visitId: string) {
  const row = db.prepare('SELECT * FROM visits WHERE id = ? AND person_id = ?').get(id(visitId), context.personId);
  return row ? visitDto(row) : notFound();
}
export function getPoint(db: DatabaseSync, context: ActivityContext, pointId: string) {
  const row = db.prepare('SELECT * FROM track_points WHERE id = ? AND person_id = ?').get(id(pointId), context.personId);
  return row ? pointDto(row, pointBreak(db, row)) : notFound();
}
function existingPlace(db: DatabaseSync, placeId: string) {
  if (!db.prepare('SELECT id FROM places WHERE id = ?').get(id(placeId))) invalid('Stored placeId does not exist');
}

/** All mutation functions run inside the CORE transaction / persistent replay boundary. */
export function createVisit(db: DatabaseSync, context: ActivityContext, input: unknown) {
  const v = object(input, ['id', 'placeId', 'startedAt', 'endedAt', 'timePrecision', 'origin'], ['id', 'placeId', 'startedAt', 'endedAt', 'timePrecision', 'origin']);
  id(v.id); existingPlace(db, v.placeId); visitTimes(v as any); oneOf(v.origin, ['manual', 'gps']);
  if (db.prepare('SELECT id FROM visits WHERE id = ?').get(v.id)) conflict();
  const now = Date.now();
  db.prepare(`INSERT INTO visits (id, person_id, place_id, started_at, ended_at, time_precision, origin, status, version, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'candidate', 1, ?, ?)`).run(v.id, context.personId, v.placeId, v.startedAt, v.endedAt, v.timePrecision, v.origin, now, now);
  return getVisit(db, context, v.id);
}
function resetSuggestions(db: DatabaseSync, context: ActivityContext, visitId: string, placeId: string | null, confirmed: boolean) {
  db.prepare(`UPDATE suggestions SET status = 'selected', completed_visit_id = NULL, version = version + 1, updated_at = ?
    WHERE person_id = ? AND completed_visit_id = ? AND (? = 0 OR place_id <> ?)`)
    .run(Date.now(), context.personId, visitId, confirmed ? 1 : 0, placeId);
}
export function patchVisit(db: DatabaseSync, context: ActivityContext, visitId: string, input: unknown, version: number) {
  const patch = object(input, visitFields);
  if (!Object.keys(patch).length) invalid('At least one changed field is required');
  const current = getVisit(db, context, visitId);
  requireVersion(current.version, version);
  const next = { ...current, ...patch };
  existingPlace(db, next.placeId); visitTimes(next); oneOf(next.status, ['candidate', 'confirmed', 'rejected']);
  if (visitFields.every(key => (current as Row)[key] === (next as Row)[key])) return current;
  const updated = db.prepare(`UPDATE visits SET place_id = ?, started_at = ?, ended_at = ?, time_precision = ?, status = ?, version = version + 1, updated_at = ?
    WHERE id = ? AND person_id = ? AND version = ?`).run(next.placeId, next.startedAt, next.endedAt, next.timePrecision, next.status, Date.now(), visitId, context.personId, version);
  if (!updated.changes) requireVersion(getVisit(db, context, visitId).version, version);
  resetSuggestions(db, context, visitId, next.placeId, next.status === 'confirmed');
  return getVisit(db, context, visitId);
}
export function deleteVisit(db: DatabaseSync, context: ActivityContext, visitId: string, version: number) {
  requireVersion(getVisit(db, context, visitId).version, version);
  resetSuggestions(db, context, visitId, null, false);
  db.prepare(`UPDATE records SET visit_id = NULL, place_id = NULL, occurred_at = NULL, ended_at = NULL, time_precision = 'unknown',
    version = version + 1, updated_at = ? WHERE visit_id = ? AND person_id = ?`).run(Date.now(), visitId, context.personId);
  db.prepare('DELETE FROM visits WHERE id = ? AND person_id = ? AND version = ?').run(visitId, context.personId, version);
}
const pointFields = ['id', 'segmentId', 'sourcePointId', 'observedAt', 'longitude', 'latitude', 'accuracyM'];
export function createPoints(db: DatabaseSync, context: ActivityContext, input: unknown) {
  const body = object(input, ['items'], ['items']);
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 1000) invalid('Expected 1–1000 observations');
  const items = body.items.map((input: unknown) => {
    const p = object(input, pointFields, pointFields);
    id(p.id); id(p.segmentId); id(p.sourcePointId); timestamp(p.observedAt);
    numberIn(p.longitude, -180, 180); numberIn(p.latitude, -90, 90); numberIn(p.accuracyM, 0, 100000);
    const existing = db.prepare('SELECT * FROM track_points WHERE person_id = ? AND source_point_id = ?').get(context.personId, p.sourcePointId);
    if (existing) {
      const dto = pointDto(existing, pointBreak(db, existing));
      if (pointFields.filter(f => f !== 'id').some(f => (dto as Row)[f] !== p[f])) conflict();
      return dto;
    }
    if (db.prepare('SELECT id FROM track_points WHERE id = ?').get(p.id)) conflict();
    // Deleted source IDs remain tombstoned so delayed uploads cannot restore erased observations.
    if (db.prepare('SELECT 1 FROM activity_deleted_points WHERE person_id = ? AND source_point_id = ?').get(context.personId, p.sourcePointId)) notFound();
    const now = Date.now();
    db.prepare(`INSERT INTO track_points (id, person_id, segment_id, source_point_id, observed_at, longitude, latitude, accuracy_m, version, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`).run(p.id, context.personId, p.segmentId, p.sourcePointId, p.observedAt, p.longitude, p.latitude, p.accuracyM, now, now);
    return getPoint(db, context, p.id);
  });
  return { items };
}
export function deletePoints(db: DatabaseSync, context: ActivityContext, input: unknown) {
  const body = object(input, ['segmentId', 'from', 'to', 'targets'], ['segmentId', 'from', 'to', 'targets']);
  range(body.from, body.to); if (body.segmentId !== null) id(body.segmentId);
  if (!Array.isArray(body.targets) || body.targets.length < 1 || body.targets.length > 1000) invalid('Expected 1–1000 targets');
  const seen = new Set<string>();
  const points = body.targets.map((input: unknown) => {
    const target = object(input, ['id', 'version'], ['id', 'version']);
    id(target.id);
    if (!Number.isSafeInteger(target.version) || target.version < 1 || seen.has(target.id)) invalid('Invalid or duplicate versioned target');
    seen.add(target.id);
    const row = db.prepare('SELECT * FROM track_points WHERE id = ? AND person_id = ?').get(target.id, context.personId);
    if (!row) throw new CommonError('VERSION_CONFLICT', 'Selected point is missing or changed', false, undefined, 412);
    const point = pointDto(row, pointBreak(db, row));
    requireVersion(point.version, target.version);
    if (point.observedAt < body.from || point.observedAt >= body.to || (body.segmentId !== null && point.segmentId !== body.segmentId)) invalid('Target does not belong to the selected interval');
    return point;
  });
  for (const p of points) {
    db.prepare('INSERT INTO activity_deleted_points(person_id, source_point_id, segment_id, observed_at) VALUES (?, ?, ?, ?)').run(context.personId, p.sourcePointId, p.segmentId, p.observedAt);
    db.prepare('DELETE FROM track_points WHERE id = ? AND person_id = ? AND version = ?').run(p.id, context.personId, p.version);
  }
  return { deletedCount: points.length };
}
