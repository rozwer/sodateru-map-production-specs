import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { DatabaseSync, SQLInputValue } from 'node:sqlite';
import { CommonError } from '../../core/errors.ts';
import { visitDto, pointDto, pointBreak, type ActivityContext } from './service.ts';
import { id, range, oneOf } from './validation.ts';

export type ListQuery = { from?: number | string; to?: number | string; cursor?: string; limit?: number | string; placeId?: string; status?: string; segmentId?: string; bbox?: string };
function badQuery(message: string): never { throw new CommonError('VALIDATION_FAILED', message, false, undefined, 400); }
export function normalizeQuery(query: ListQuery, allowed: string[]) {
  if (Object.keys(query).some(k => !allowed.includes(k))) badQuery('Unknown query');
  const q: Record<string, any> = { ...query };
  for (const key of ['from', 'to', 'limit']) {
    if (q[key] !== undefined) {
      if (typeof q[key] === 'string' && !/^-?\d+$/.test(q[key])) badQuery(`Invalid ${key}`);
      q[key] = Number(q[key]);
      if (!Number.isSafeInteger(q[key])) badQuery(`Invalid ${key}`);
    }
  }
  if (q.from !== undefined || q.to !== undefined) range(q.from, q.to);
  q.limit ??= 50;
  if (q.limit < 1 || q.limit > 100) badQuery('limit must be 1–100');
  if (q.placeId !== undefined) id(q.placeId);
  if (q.segmentId !== undefined) id(q.segmentId);
  if (q.status !== undefined) oneOf(q.status, ['candidate', 'confirmed', 'rejected']);
  return q;
}
function cursorSecret(db: DatabaseSync) {
  db.prepare('INSERT OR IGNORE INTO activity_cursor_key (id, secret) VALUES (1, ?)').run(randomBytes(32).toString('hex'));
  return db.prepare('SELECT secret FROM activity_cursor_key WHERE id = 1').get()!.secret as string;
}
/** Signed, condition-bound keyset cursor; key survives process restarts in the mode's DB. */
function pagination(db: DatabaseSync, context: ActivityContext, kind: string, q: Record<string, any>) {
  const secret = cursorSecret(db);
  const { cursor, limit, ...filters } = q;
  const binding = JSON.stringify([context.personId, context.dataMode, kind, Object.entries(filters).sort(([a], [b]) => a.localeCompare(b))]);
  const sign = (payload: string) => createHmac('sha256', secret).update(payload).digest();
  let after: { id: string; time: number | null } | undefined;
  if (cursor !== undefined) {
    try {
      const [payload, signature, extra] = cursor.split('.');
      const supplied = Buffer.from(signature, 'base64url'), expected = sign(payload);
      if (extra || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) throw Error();
      const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString());
      if (parsed.binding !== binding || !parsed.after || typeof parsed.after.id !== 'string') throw Error();
      after = parsed.after;
    } catch { badQuery('Invalid cursor or changed search conditions'); }
  }
  return { after, finish<T>(rows: T[], key: (row: T) => { id: string; time: number | null }) {
    const items = rows.slice(0, limit);
    let nextCursor: string | null = null;
    if (rows.length > limit) {
      const payload = Buffer.from(JSON.stringify({ binding, after: key(items.at(-1)!) })).toString('base64url');
      nextCursor = `${payload}.${sign(payload).toString('base64url')}`;
    }
    return { items, nextCursor };
  } };
}
export function listVisits(db: DatabaseSync, context: ActivityContext, query: ListQuery = {}) {
  const q = normalizeQuery(query, ['placeId', 'from', 'to', 'status', 'cursor', 'limit']);
  const page = pagination(db, context, 'visits', q);
  const conditions = ['person_id = ?']; const values: SQLInputValue[] = [context.personId];
  if (q.placeId !== undefined) { conditions.push('place_id = ?'); values.push(q.placeId); }
  if (q.status !== undefined) { conditions.push('status = ?'); values.push(q.status); }
  if (q.from !== undefined) { conditions.push('started_at >= ? AND started_at < ?'); values.push(q.from, q.to); }
  if (page.after) {
    if (page.after.time === null) { conditions.push('started_at IS NULL AND id < ?'); values.push(page.after.id); }
    else { conditions.push('(started_at < ? OR (started_at = ? AND id < ?) OR started_at IS NULL)'); values.push(page.after.time, page.after.time, page.after.id); }
  }
  const rows = db.prepare(`SELECT * FROM visits WHERE ${conditions.join(' AND ')} ORDER BY started_at DESC NULLS LAST, id DESC LIMIT ?`).all(...values, q.limit + 1).map(visitDto);
  return page.finish(rows, row => ({ id: row.id, time: row.startedAt }));
}
export function listPoints(db: DatabaseSync, context: ActivityContext, query: ListQuery = {}) {
  const q = normalizeQuery(query, ['segmentId', 'from', 'to', 'cursor', 'limit']);
  const page = pagination(db, context, 'track-points', q);
  const conditions = ['person_id = ?']; const values: SQLInputValue[] = [context.personId];
  if (q.segmentId !== undefined) { conditions.push('segment_id = ?'); values.push(q.segmentId); }
  if (q.from !== undefined) { conditions.push('observed_at >= ? AND observed_at < ?'); values.push(q.from, q.to); }
  if (page.after) { conditions.push('(observed_at > ? OR (observed_at = ? AND id > ?))'); values.push(page.after.time, page.after.time, page.after.id); }
  const rows = db.prepare(`SELECT * FROM track_points WHERE ${conditions.join(' AND ')} ORDER BY observed_at ASC, id ASC LIMIT ?`).all(...values, q.limit + 1).map(row => pointDto(row, pointBreak(db, row)));
  return page.finish(rows, row => ({ id: row.id, time: row.observedAt }));
}
export function placeDto(row: Record<string, any>) {
  return { id: row.id, name: row.name, address: row.address, coordinates: [row.longitude, row.latitude], categories: JSON.parse(row.categories_json),
    provider: row.provider, externalId: row.external_id, buildingKey: row.building_key, sourceUrl: row.source_url,
    attribution: row.attribution, fetchedAt: row.fetched_at, version: row.version, createdAt: row.created_at, updatedAt: row.updated_at };
}
export function getGrowth(db: DatabaseSync, context: ActivityContext, query: ListQuery = {}) {
  const q = normalizeQuery(query, ['bbox', 'cursor', 'limit']);
  const page = pagination(db, context, 'growth', q);
  const conditions = ["EXISTS (SELECT 1 FROM visits v WHERE v.place_id = p.id AND v.person_id = ? AND v.status = 'confirmed')"];
  const values: SQLInputValue[] = [context.personId];
  if (q.bbox !== undefined) {
    const box = typeof q.bbox === 'string' ? q.bbox.split(',').map(Number) : [];
    if (box.length !== 4 || !box.every(Number.isFinite) || box[0]! < -180 || box[2]! > 180 || box[1]! < -90 || box[3]! > 90 || box[0]! >= box[2]! || box[1]! >= box[3]!) badQuery('Invalid bbox');
    conditions.push('p.longitude >= ? AND p.latitude >= ? AND p.longitude <= ? AND p.latitude <= ?'); values.push(...box);
  }
  if (page.after) { conditions.push('p.id > ?'); values.push(page.after.id); }
  const places = db.prepare(`SELECT p.* FROM places p WHERE ${conditions.join(' AND ')} ORDER BY p.id ASC LIMIT ?`).all(...values, q.limit + 1);
  const rows = places.map(p => {
    const visits = db.prepare("SELECT id, version FROM visits WHERE person_id = ? AND place_id = ? AND status = 'confirmed' ORDER BY id").all(context.personId, p.id!);
    const records = db.prepare(`SELECT r.id, r.version, r.purposes_json FROM records r JOIN visits v ON v.id = r.visit_id AND v.person_id = r.person_id
      WHERE v.person_id = ? AND v.place_id = ? AND v.status = 'confirmed' ORDER BY r.id`).all(context.personId, p.id!);
    const purposes = [...new Set<string>(records.flatMap(r => JSON.parse(r.purposes_json as string)))].sort();
    const sourceRefs = [{ type: 'place', id: p.id, version: p.version }, ...visits.map(v => ({ type: 'visit', id: v.id, version: v.version })), ...records.map(r => ({ type: 'record', id: r.id, version: r.version }))];
    // Contract limits must never silently discard evidence or valid purpose text.
    if (sourceRefs.length > 1000 || purposes.length > 100) throw new CommonError('PAYLOAD_TOO_LARGE', 'Growth evidence exceeds response limit', false, undefined, 413);
    return { place: placeDto(p), confirmedVisitCount: visits.length, stage: visits.length >= 5 ? 3 : visits.length >= 2 ? 2 : 1, purposes, sourceRefs };
  });
  return page.finish(rows, row => ({ id: row.place.id, time: null }));
}
