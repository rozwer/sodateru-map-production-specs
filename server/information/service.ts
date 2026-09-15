import type { DatabaseSync, SQLInputValue } from 'node:sqlite';
import type { RequestContext } from '../core/context.ts';
import { CommonError } from '../core/errors.ts';
import { comparePosition, distanceM, invalid, normalizeQuery, normalizeText, overlaps, pageRows, queryKey, validId, type NormalQuery, type RecordQuery } from './query.ts';

export type SourceRef = { type: 'record' | 'visit' | 'place' | 'checkin' | 'route'; id: string; version: number };
export type SourceCheck = { ref: SourceRef; state: 'current' | 'changed' | 'unavailable'; currentVersion: number | null };
export type Activity = {id: string; name: string; purpose: string | null; outcome: string | null; satisfaction: 'met' | 'partial' | 'not_met' | null; repeatIntent: boolean | null};
export type PeriodAnswers = Partial<Record<'detour' | 'newPlace' | 'rest' | 'alone' | 'longStay' | 'farTrip', boolean | null>>;
type Row = Record<string, any>;
const notFound = (): never => { throw new CommonError('NOT_FOUND', 'The requested item is not available'); };
const parse = <T>(value: string): T => JSON.parse(value) as T;

/** For feature-owned sharing tables. Pass current DB values, never request input. */
export function canReadShared(context: Pick<RequestContext, 'personId'>, resource: {personId: string; visibility: string; sharedWith: string[]}) {
  if (!validId(context?.personId)) return false;
  return resource.personId === context.personId || resource.visibility === 'public'
    || (resource.visibility === 'selected' && resource.sharedWith.includes(context.personId));
}

/** One SQL predicate for records, media, and source resolution. selected is independent of friendship. */
export function readableSql(alias: string) {
  if (!/^[a-z]+$/i.test(alias)) throw new Error('Invalid SQL alias');
  return `(${alias}.person_id = ? OR ${alias}.visibility = 'public' OR (${alias}.visibility = 'selected' AND EXISTS (SELECT 1 FROM json_each(${alias}.shared_with_json) share WHERE share.value = ?)))`;
}
const selectRecords = `SELECT r.*, p.name AS person_name, p.avatar_path AS person_icon,
  v.version AS visit_version, v.status AS visit_status,
  CASE WHEN r.visit_id IS NOT NULL THEN v.place_id ELSE r.place_id END AS effective_place_id,
  CASE WHEN r.visit_id IS NOT NULL THEN v.started_at ELSE r.occurred_at END AS effective_at,
  CASE WHEN r.visit_id IS NOT NULL THEN v.ended_at ELSE r.ended_at END AS effective_ended_at,
  CASE WHEN r.visit_id IS NOT NULL THEN v.time_precision ELSE r.time_precision END AS effective_precision,
  pl.id AS joined_place_id, pl.name AS place_name, pl.address AS place_address,
  pl.longitude, pl.latitude, pl.version AS place_version
 FROM records r JOIN people p ON p.id = r.person_id
 LEFT JOIN visits v ON v.id = r.visit_id AND v.person_id = r.person_id
 LEFT JOIN places pl ON pl.id = CASE WHEN r.visit_id IS NOT NULL THEN v.place_id ELSE r.place_id END`;

export function mediaView(row: Row) {
  return { id: row.id as string, kind: row.kind as 'photo' | 'video' | 'audio', mimeType: row.mime_type as string,
    byteSize: row.byte_size as number, position: row.position as number, status: row.status as 'pending' | 'ready' | 'failed',
    contentUrl: row.status === 'ready' ? `/api/v1/media/${encodeURIComponent(row.id)}/content` : null };
}
export function recordView(row: Row, media: ReturnType<typeof mediaView>[] = []) {
  const sourceRefs: SourceRef[] = [{type: 'record', id: row.id, version: row.version}];
  if (row.visit_id && row.visit_version) sourceRefs.push({type: 'visit', id: row.visit_id, version: row.visit_version});
  if (row.joined_place_id) sourceRefs.push({type: 'place', id: row.joined_place_id, version: row.place_version});
  sourceRefs.sort((a, b) => a.type < b.type ? -1 : a.type > b.type ? 1 : a.id < b.id ? -1 : 1);
  return {
    id: row.id as string, person: {id: row.person_id as string, displayName: row.person_name as string, iconPath: row.person_icon as string | null},
    kind: row.kind as 'experience' | 'diary' | 'memo', body: row.body as string,
    place: row.joined_place_id ? {id: row.joined_place_id as string, name: row.place_name as string, address: row.place_address as string | null, coordinates: [row.longitude, row.latitude] as [number, number]} : null,
    effectiveAt: row.effective_at as number | null, endedAt: row.effective_ended_at as number | null,
    timePrecision: row.effective_precision as 'exact' | 'approximate' | 'unknown', visitStatus: row.visit_status as 'candidate' | 'confirmed' | 'rejected' | null,
    purposes: parse<string[]>(row.purposes_json), impression: row.impression as string, topicKey: row.topic_key as string | null,
    visibility: row.visibility as 'private' | 'selected' | 'public', version: row.version as number, sourceRefs, media,
  };
}
export type InformationRecordView = ReturnType<typeof recordView>;
export function editableRecordView(row: Row) {
  return {
    id: row.id, version: row.version, createdAt: row.created_at, updatedAt: row.updated_at,
    personId: row.person_id, kind: row.kind, visitId: row.visit_id, placeId: row.place_id,
    occurredAt: row.occurred_at, endedAt: row.ended_at, timePrecision: row.time_precision,
    body: row.body, purposes: parse<string[]>(row.purposes_json), activities: parse<Activity[]>(row.activities_json),
    impression: row.impression, periodAnswers: parse<PeriodAnswers>(row.period_answers_json),
    bookmarked: row.bookmarked === 1, useForSuggestions: row.use_for_suggestions === 1,
    topicKey: row.topic_key, visibility: row.visibility, sharedWith: parse<string[]>(row.shared_with_json),
    effectivePlaceId: row.effective_place_id, effectiveStartedAt: row.effective_at,
    effectiveEndedAt: row.effective_ended_at, effectiveTimePrecision: row.effective_precision,
  };
}

export function createInformationService(db: DatabaseSync) {
  function requireContext(context: RequestContext) {
    if (!validId(context?.personId) || !['live', 'demo'].includes(context.dataMode)) throw new CommonError('UNAUTHENTICATED', 'A resolved person and data mode are required');
    if (context.signal?.aborted) throw new CommonError('CANCELLED', 'Request cancelled');
  }
  function readableRow(context: RequestContext, id: string) {
    requireContext(context);
    if (!validId(id)) invalid('Invalid record ID');
    return db.prepare(`${selectRecords} WHERE r.id = ? AND ${readableSql('r')}`).get(id, context.personId, context.personId) as Row | undefined;
  }
  function canReadRecord(context: RequestContext, id: string) { return !!readableRow(context, id); }
  function requireReadableMedia(context: RequestContext, id: string) {
    requireContext(context);
    if (!validId(id)) invalid('Invalid media ID');
    const row = db.prepare(`SELECT m.* FROM media m JOIN records r ON r.id = m.record_id WHERE m.id = ? AND ${readableSql('r')}`).get(id, context.personId, context.personId) as Row | undefined;
    return row ?? notFound();
  }
  function withMedia(context: RequestContext, rows: Row[]) {
    const media = new Map<string, ReturnType<typeof mediaView>[]>();
    // Chunk bind variables and reapply visibility even for callers using the single-record path.
    for (let i = 0; i < rows.length; i += 400) {
      const ids = rows.slice(i, i + 400).map(row => row.id);
      const attachments = db.prepare(`SELECT m.* FROM media m JOIN records r ON r.id = m.record_id
        WHERE m.record_id IN (${ids.map(() => '?').join(',')}) AND ${readableSql('r')}
        ORDER BY m.record_id, m.position, m.id`).all(...ids, context.personId, context.personId) as Row[];
      for (const item of attachments) {
        const list = media.get(item.record_id) ?? [];
        if (list.at(-1)?.position === item.position) throw new CommonError('INTERNAL_ERROR', 'Duplicate media position');
        list.push(mediaView(item)); media.set(item.record_id, list);
      }
    }
    return rows.map(row => recordView(row, media.get(row.id) ?? []));
  }
  function matchingRows(context: RequestContext, q: NormalQuery) {
    requireContext(context);
    const conditions = [readableSql('r')];
    const args: SQLInputValue[] = [context.personId, context.personId];
    if (q.audience === 'own') { conditions.push('r.person_id = ?'); args.push(context.personId); }
    if (q.audience === 'public') conditions.push("r.visibility = 'public'");
    if (q.audience === 'selected') { conditions.push("r.visibility = 'selected' AND EXISTS (SELECT 1 FROM json_each(r.shared_with_json) recipient WHERE recipient.value = ?)"); args.push(context.personId); }
    if (q.audience === 'friends') {
      conditions.push(`EXISTS (SELECT 1 FROM friendships f WHERE f.status = 'accepted'
        AND ((f.requester_id = ? AND f.recipient_id = r.person_id) OR (f.recipient_id = ? AND f.requester_id = r.person_id)))`);
      args.push(context.personId, context.personId);
    }
    if (q.kind) { conditions.push('r.kind = ?'); args.push(q.kind); }
    if (q.themeId) {
      conditions.push('EXISTS (SELECT 1 FROM themes t, json_each(t.record_ids_json) member WHERE t.id = ? AND t.person_id = ? AND member.value = r.id)');
      args.push(q.themeId, context.personId);
    }
    // Do not LIMIT here. Unicode, interval, and distance filtering must see the full authorized set.
    const rows = db.prepare(`${selectRecords} WHERE ${conditions.join(' AND ')}`).all(...args) as Row[];
    return rows.filter(row => {
      if (q.placeId && row.effective_place_id !== q.placeId) return false;
      if (q.personIds.length && !q.personIds.includes(row.person_id)) return false;
      if (q.topicKey !== null && row.topic_key !== q.topicKey) return false;
      if (!overlaps(row.effective_at, row.effective_ended_at, q)) return false;
      if (q.text && ![row.body, row.person_name, row.place_name, row.place_address].some(v => typeof v === 'string' && normalizeText(v).includes(q.text))) return false;
      if (q.purposes.length && !parse<string[]>(row.purposes_json).some(p => q.purposes.includes(p))) return false;
      if (q.center && (!row.joined_place_id || distanceM(q.center, [row.longitude, row.latitude]) > q.radiusM!)) return false;
      if (q.bbox && (!row.joined_place_id || row.longitude < q.bbox[0] || row.latitude < q.bbox[1] || row.longitude > q.bbox[2] || row.latitude > q.bbox[3])) return false;
      return true;
    }).map((row): Row & {effectiveAt: number | null; id: string} => ({...row, effectiveAt: row.effective_at, id: row.id})).sort(comparePosition);
  }
  function searchRecords(context: RequestContext, query: RecordQuery = {}) {
    const q = normalizeQuery(query);
    const page = pageRows(matchingRows(context, q), q, queryKey(context, q));
    return {...page, items: withMedia(context, page.items)};
  }
  function allRecords(context: RequestContext, query: RecordQuery = {}) {
    const q = normalizeQuery(query);
    if (q.cursor) invalid('allRecords does not accept a cursor');
    return withMedia(context, matchingRows(context, q));
  }
  function ownRecordsPage(context: RequestContext, query: RecordQuery = {}) {
    const q = normalizeQuery({...query, audience: 'own'});
    const page = pageRows(matchingRows(context, q), q, queryKey(context, q));
    // GET /records has the existing editable RecordViewPage shape (no totalCount field).
    return {items: page.items.map(editableRecordView), nextCursor: page.nextCursor};
  }
  function ownMaterials(context: RequestContext, query: RecordQuery = {}) {
    const q = normalizeQuery({...query, audience: 'own'});
    if (q.cursor) invalid('ownMaterials does not accept a cursor');
    const rows = matchingRows(context, q);
    const views = withMedia(context, rows);
    return rows.map((row, index) => ({...views[index]!, activities: parse<Activity[]>(row.activities_json),
      periodAnswers: parse<PeriodAnswers>(row.period_answers_json),
      useForSuggestions: row.use_for_suggestions === 1, bookmarked: row.bookmarked === 1}));
  }
  function searchTopics(context: RequestContext, query: RecordQuery & {topicKey: string}) {
    if (!query.topicKey) invalid('topicKey is required');
    return searchRecords(context, query);
  }
  function mapRecords(context: RequestContext, query: RecordQuery = {}) {
    const q = normalizeQuery(query);
    if (q.cursor) invalid('Map queries do not accept a cursor');
    const rows = matchingRows(context, q);
    const located = rows.filter(row => row.joined_place_id);
    if (located.length > 2000) throw new CommonError('INPUT_TOO_LARGE', 'Narrow the map area or period to at most 2000 located records');
    return { items: withMedia(context, located).map(row => ({recordId: row.id, personId: row.person.id,
      placeId: row.place!.id, coordinates: row.place!.coordinates, mediaId: row.media.find(m => m.status === 'ready')?.id ?? null})), totalCount: rows.length };
  }
  function getRecord(context: RequestContext, id: string) {
    return withMedia(context, [readableRow(context, id) ?? notFound()])[0]!;
  }
  function getOwnRecord(context: RequestContext, id: string) {
    const row = readableRow(context, id);
    if (!row || row.person_id !== context.personId) notFound();
    return editableRecordView(row!);
  }
  function ownVisits(context: RequestContext, placeId: string) {
    requireContext(context);
    if (!validId(placeId)) invalid('Invalid placeId');
    return (db.prepare('SELECT * FROM visits WHERE person_id = ? AND place_id = ? ORDER BY started_at DESC NULLS LAST, id ASC').all(context.personId, placeId) as Row[]).map(row => ({
      id: row.id, placeId: row.place_id, startedAt: row.started_at, endedAt: row.ended_at, timePrecision: row.time_precision,
      origin: row.origin, status: row.status, version: row.version, createdAt: row.created_at, updatedAt: row.updated_at,
    }));
  }
  function validateRefs(input: {refs: SourceRef[]}) {
    if (!input || !Array.isArray(input.refs) || input.refs.length > 1000) invalid('refs must be an array of at most 1000 items');
    const seen = new Set<string>();
    for (const ref of input.refs) {
      if (!ref || !['record', 'visit', 'place', 'checkin', 'route'].includes(ref.type) || !validId(ref.id) || !Number.isSafeInteger(ref.version) || ref.version < 1) invalid('Invalid SourceRef');
      const key = `${ref.type}:${ref.id}`;
      if (seen.has(key)) invalid('SourceRef type/id must be unique');
      seen.add(key);
    }
    return input.refs;
  }
  function sourceRows(context: RequestContext, input: {refs: SourceRef[]}) {
    requireContext(context);
    const refs = validateRefs(input);
    const records = new Map<string, Row | undefined>();
    for (const ref of refs) if (ref.type === 'record') records.set(ref.id, readableRow(context, ref.id));
    const projectedVisits = new Set([...records.values()].filter(row => row?.visit_version != null).map(row => row!.visit_id).filter(Boolean));
    return refs.map(ref => {
      let row: Row | undefined;
      if (ref.type === 'record') row = records.get(ref.id);
      if (ref.type === 'place') row = db.prepare('SELECT * FROM places WHERE id = ?').get(ref.id) as Row | undefined;
      if (ref.type === 'checkin') row = db.prepare('SELECT * FROM self_checkins WHERE id = ? AND person_id = ?').get(ref.id, context.personId) as Row | undefined;
      if (ref.type === 'route') row = db.prepare(`SELECT s.* FROM saved_routes s WHERE s.id = ? AND ${readableSql('s')}`).get(ref.id, context.personId, context.personId) as Row | undefined;
      if (ref.type === 'visit') {
        row = db.prepare('SELECT * FROM visits WHERE id = ? AND person_id = ?').get(ref.id, context.personId) as Row | undefined;
        if (!row && projectedVisits.has(ref.id)) {
          // A shared record permits only its public location/time projection and version check.
          row = db.prepare('SELECT id, version, place_id, started_at, ended_at, time_precision FROM visits WHERE id = ?').get(ref.id) as Row | undefined;
        }
      }
      return {ref, row};
    });
  }
  function checkSources(context: RequestContext, input: {refs: SourceRef[]}): SourceCheck[] {
    return sourceRows(context, input).map(({ref, row}) => ({ref, state: !row ? 'unavailable' : row.version === ref.version ? 'current' : 'changed', currentVersion: row ? row.version as number : null}));
  }
  function assertSourcesCurrent(context: RequestContext, input: {refs: SourceRef[]}) {
    const checks = checkSources(context, input);
    if (checks.some(check => check.state === 'unavailable')) notFound();
    if (checks.some(check => check.state === 'changed')) throw new CommonError('SOURCE_CHANGED', 'Source information has changed');
    return checks;
  }
  return {searchRecords, searchTopics, allRecords, ownRecordsPage, ownMaterials, mapRecords, getRecord, getOwnRecord, ownVisits,
    canReadRecord, canReadShared, requireReadableMedia, checkSources, assertSourcesCurrent};
}
