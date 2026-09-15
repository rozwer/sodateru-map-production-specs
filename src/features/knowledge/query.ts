import type { KnowledgeFilters, KnowledgeRecord } from './types';

export interface SharedKnowledgeQuery {
  q?: string; placeId?: string; longitude?: number; latitude?: number; radiusM?: number;
  from?: number; to?: number; timeZone?: string; cursor?: string; limit?: number;
  audience?: 'visible' | 'public' | 'friends' | 'own' | 'selected';
  personIds?: string[]; purposes?: string[]; topicKey?: string; includeUndated?: boolean;
}
export interface KnowledgePage { items: KnowledgeRecord[]; totalCount: number; nextCursor: string | null }
export interface KnowledgeMap {
  items: { recordId: string; personId: string; placeId: string; coordinates: [number, number]; mediaId: string | null }[];
  totalCount: number;
}

function partsAt(time: number, timeZone: string) {
  const values = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(time).filter(part => part.type !== 'literal').map(part => [part.type, Number(part.value)]));
  return { year: values.year, month: values.month, day: values.day, hour: values.hour, minute: values.minute, second: values.second };
}
function midnight(date: Date, timeZone: string) {
  const wall = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  let value = wall;
  for (let attempt = 0; attempt < 4; attempt++) {
    const p = partsAt(value, timeZone);
    const difference = wall - Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    value += difference;
    if (!difference) return value;
  }
  throw new Error('この時間帯の期間を解決できませんでした。');
}

/** Calendar week starts on Monday. Both bounds use the selected IANA time zone. */
export function knowledgePeriod(period: 'week' | 'month', timeZone: string, now = Date.now()) {
  const today = partsAt(now, timeZone);
  const start = new Date(Date.UTC(today.year, today.month - 1, today.day));
  const end = new Date(start);
  if (period === 'week') {
    start.setUTCDate(start.getUTCDate() - (start.getUTCDay() + 6) % 7);
    end.setTime(start.getTime()); end.setUTCDate(end.getUTCDate() + 7);
  } else {
    start.setUTCDate(1); end.setUTCDate(1); end.setUTCMonth(end.getUTCMonth() + 1);
  }
  return { from: midnight(start, timeZone), to: midnight(end, timeZone), timeZone };
}

/** UI labels are not sent as invented topic keys. The authoritative dictionary supplies them. */
export function sharedKnowledgeQuery({ query, filters, timeZone, topicKey, purposes, placeId, personIds, now }: {
  query: string; filters: KnowledgeFilters; timeZone: string; topicKey?: string;
  purposes?: string[]; placeId?: string; personIds?: string[]; now?: number;
}): SharedKnowledgeQuery {
  if (filters.bounds) throw new Error('地図範囲検索の接続を確認できません。');
  if (filters.radiusM !== null && !filters.center) throw new Error('検索する地域を選んでください。');
  if (filters.purpose && !purposes?.length) throw new Error('目的の検索条件を確認できません。');
  const result: SharedKnowledgeQuery = { audience: filters.audience, includeUndated: false };
  if (query.trim()) result.q = query.trim();
  if (filters.center && filters.radiusM !== null) {
    result.longitude = filters.center[0]; result.latitude = filters.center[1]; result.radiusM = filters.radiusM;
  }
  if (filters.period) Object.assign(result, knowledgePeriod(filters.period, timeZone, now));
  if (topicKey) result.topicKey = topicKey;
  if (purposes?.length) result.purposes = purposes;
  if (placeId) result.placeId = placeId;
  if (personIds?.length) result.personIds = personIds;
  return result;
}

export function appendKnowledgePage(previous: KnowledgePage, next: KnowledgePage): KnowledgePage {
  const items = new Map(previous.items.map(item => [item.id, item]));
  for (const item of next.items) items.set(item.id, item);
  return { items: [...items.values()], totalCount: next.totalCount, nextCursor: next.nextCursor };
}

export function knowledgeMapQuery(query: SharedKnowledgeQuery): Omit<SharedKnowledgeQuery, 'cursor' | 'limit'> {
  const { cursor: _cursor, limit: _limit, ...filters } = query;
  return filters;
}
