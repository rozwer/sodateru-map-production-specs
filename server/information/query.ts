import { CommonError } from '../core/errors.ts';
import { requestHash } from '../core/idempotency.ts';

export type Audience = 'own' | 'visible' | 'public' | 'selected' | 'friends';
export type RecordQuery = {
  text?: string; audience?: Audience; placeId?: string | null;
  personIds?: string[]; purposes?: string[];
  range?: { startAt: number; endAt: number; timezone: string } | null;
  center?: [number, number] | null; radiusM?: number | null;
  topicKey?: string | null; includeUndated?: boolean;
  cursor?: string | null; limit?: number;
  // Internal extension used by GET /records. These only narrow the result.
  kind?: 'experience' | 'diary' | 'memo'; themeId?: string;
  bbox?: [number, number, number, number];
  rangeMatch?: 'overlap' | 'startsWithin';
};
export const invalid = (message: string): never => { throw new CommonError('INVALID_INPUT', message); };
export const normalizeText = (value: string) => value.normalize('NFKC').trim().toLowerCase();
export function validId(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 80 && /\S/u.test(value);
}
function strings(value: unknown, max: number, length: number, name: string): string[] {
  if (!Array.isArray(value) || value.length > max || value.some(v => typeof v !== 'string' || !v.trim() || v.length > length)) invalid(`Invalid ${name}`);
  return [...new Set(value as string[])].sort();
}
export function normalizeQuery(input: RecordQuery = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) invalid('RecordQuery must be an object');
  const q = {
    text: '', audience: 'visible' as Audience, placeId: null as string | null,
    personIds: [] as string[], purposes: [] as string[], range: null as RecordQuery['range'],
    center: null as RecordQuery['center'], radiusM: null as number | null,
    topicKey: null as string | null, includeUndated: false, cursor: null as string | null, limit: 50,
    rangeMatch: 'overlap' as 'overlap' | 'startsWithin',
    ...input,
  };
  if (typeof q.text !== 'string' || q.text.length > 200) invalid('text must be at most 200 characters');
  q.text = normalizeText(q.text);
  if (!['own', 'visible', 'public', 'selected', 'friends'].includes(q.audience)) invalid('Invalid audience');
  if (q.placeId !== null && !validId(q.placeId)) invalid('Invalid placeId');
  q.personIds = strings(q.personIds, 100, 80, 'personIds');
  q.purposes = strings(q.purposes, 20, 500, 'purposes');
  if (q.topicKey !== null && (typeof q.topicKey !== 'string' || !q.topicKey.length || q.topicKey.length > 200)) invalid('Invalid topicKey');
  if (typeof q.includeUndated !== 'boolean') invalid('Invalid includeUndated');
  if (!Number.isInteger(q.limit) || q.limit < 1 || q.limit > 100) invalid('limit must be 1..100');
  if (q.cursor !== null && (typeof q.cursor !== 'string' || !q.cursor.length || q.cursor.length > 4096)) invalid('Invalid cursor');
  if (q.range != null) {
    const { startAt, endAt, timezone } = q.range;
    if (!Number.isSafeInteger(startAt) || !Number.isSafeInteger(endAt) || startAt < 0 || startAt >= endAt) invalid('Invalid time range');
    if (typeof timezone !== 'string' || !timezone || timezone.length > 100) invalid('Invalid timezone');
    try { new Intl.DateTimeFormat('en', { timeZone: timezone }); } catch { invalid('Invalid IANA timezone'); }
    q.range = { startAt, endAt, timezone };
  }
  if ((q.center == null) !== (q.radiusM == null)) invalid('center and radiusM must be supplied together');
  if (q.center != null) {
    if (!Array.isArray(q.center) || q.center.length !== 2 || !q.center.every(Number.isFinite) || Math.abs(q.center[0]) > 180 || Math.abs(q.center[1]) > 90) invalid('Invalid center');
    if (typeof q.radiusM !== 'number' || !Number.isFinite(q.radiusM) || q.radiusM < 1 || q.radiusM > 100000) invalid('Invalid radiusM');
  }
  if (q.kind !== undefined && !['experience', 'diary', 'memo'].includes(q.kind)) invalid('Invalid kind');
  if (q.rangeMatch !== undefined && !['overlap', 'startsWithin'].includes(q.rangeMatch)) invalid('Invalid rangeMatch');
  if (q.themeId !== undefined && !validId(q.themeId)) invalid('Invalid themeId');
  if (q.bbox !== undefined && (!Array.isArray(q.bbox) || q.bbox.length !== 4 || !q.bbox.every(Number.isFinite)
    || Math.abs(q.bbox[0]) > 180 || Math.abs(q.bbox[2]) > 180 || Math.abs(q.bbox[1]) > 90 || Math.abs(q.bbox[3]) > 90
    || q.bbox[0] > q.bbox[2] || q.bbox[1] > q.bbox[3])) invalid('Invalid bbox [minLon,minLat,maxLon,maxLat]');
  return q;
}
export type NormalQuery = ReturnType<typeof normalizeQuery>;
export function overlaps(start: number | null, end: number | null, q: NormalQuery) {
  if (!q.range) return true;
  if (start === null) return q.includeUndated;
  if (q.rangeMatch === 'startsWithin') return start >= q.range.startAt && start < q.range.endAt;
  return end !== null && end > start
    ? start < q.range.endAt && end > q.range.startAt
    : start >= q.range.startAt && start < q.range.endAt;
}
export function distanceM(a: [number, number], b: [number, number]) {
  const rad = Math.PI / 180;
  const h = Math.sin((b[1] - a[1]) * rad / 2) ** 2 + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin((b[0] - a[0]) * rad / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}
export type Position = { id: string; effectiveAt: number | null };
export function comparePosition(a: Position, b: Position) {
  if (a.effectiveAt === null && b.effectiveAt !== null) return 1;
  if (a.effectiveAt !== null && b.effectiveAt === null) return -1;
  if (a.effectiveAt !== b.effectiveAt) return (b.effectiveAt as number) - (a.effectiveAt as number);
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}
export function queryKey(context: {personId: string; dataMode: string}, q: NormalQuery) {
  const { cursor: _cursor, limit: _limit, ...conditions } = q;
  // Omit absent optional fields, then use CORE's canonical JSON/hash implementation.
  return requestHash({personId: context.personId, dataMode: context.dataMode, conditions: JSON.parse(JSON.stringify(conditions))});
}
export function pageRows<T extends Position>(rows: T[], q: NormalQuery, key: string) {
  let remaining = rows;
  if (q.cursor) {
    let cursor: any;
    try { cursor = JSON.parse(Buffer.from(q.cursor, 'base64url').toString('utf8')); } catch { invalid('Invalid cursor'); }
    if (cursor?.v !== 1 || cursor.key !== key || !validId(cursor.id) || !(cursor.effectiveAt === null || (Number.isSafeInteger(cursor.effectiveAt) && cursor.effectiveAt >= 0))) invalid('Cursor belongs to another query or person');
    remaining = rows.filter(row => comparePosition(row, cursor) > 0);
  }
  const items = remaining.slice(0, q.limit);
  const last = items.at(-1);
  const nextCursor = remaining.length > q.limit && last
    ? Buffer.from(JSON.stringify({ v: 1, key, id: last.id, effectiveAt: last.effectiveAt })).toString('base64url') : null;
  return { items, nextCursor, totalCount: rows.length };
}

export function queryFromUrl(url: URL, own = false): RecordQuery {
  const p = url.searchParams;
  const scalar = (name: string) => { if (p.getAll(name).length > 1) invalid(`Repeated ${name}`); return p.get(name); };
  const number = (name: string) => { const v = scalar(name); if (v === null) return null; if (!v.trim() || !Number.isFinite(Number(v))) invalid(`Invalid ${name}`); return Number(v); };
  const from = number('from'), to = number('to'), timeZone = scalar('timeZone');
  if ([from, to, timeZone].some(v => v !== null) && [from, to, timeZone].some(v => v === null)) invalid('from/to/timeZone must be supplied together');
  const lon = number('longitude'), lat = number('latitude'), radius = number('radiusM');
  if ([lon, lat, radius].some(v => v !== null) && [lon, lat, radius].some(v => v === null)) invalid('longitude/latitude/radiusM must be supplied together');
  const undated = scalar('includeUndated');
  if (undated !== null && undated !== 'true' && undated !== 'false') invalid('Invalid includeUndated');
  return normalizeQuery({
    text: scalar('q') ?? '', audience: own ? 'own' : (scalar('audience') ?? 'visible') as Audience,
    placeId: scalar('placeId'), personIds: p.getAll('personIds'), purposes: p.getAll('purposes'),
    range: from !== null ? { startAt: from, endAt: to!, timezone: timeZone! } : null,
    center: lon !== null ? [lon, lat!] : null, radiusM: radius, topicKey: scalar('topicKey'),
    includeUndated: undated === 'true', cursor: scalar('cursor'), limit: number('limit') ?? 50,
    ...(own && p.has('kind') ? {kind: scalar('kind') as RecordQuery['kind']} : {}),
    ...(own && p.has('themeId') ? {themeId: scalar('themeId')!} : {}),
    ...(own && p.has('rangeMatch') ? {rangeMatch: scalar('rangeMatch') as RecordQuery['rangeMatch']} : {}),
  });
}
