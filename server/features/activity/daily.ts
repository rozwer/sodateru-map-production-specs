import type { DatabaseSync } from 'node:sqlite';
import { CommonError } from '../../core/errors.ts';
import { dayBounds } from './validation.ts';
import { listVisits } from './queries.ts';
import type { ActivityContext } from './service.ts';

type Page = { items: unknown[]; nextCursor: string | null };
type DailyContext = ActivityContext & { requestId: string };
export type DaySources = {
  records: (context: DailyContext, query: { range: { startAt: number; endAt: number; timezone: string }; rangeMatch: 'startsWithin'; limit: number }) => Page | Promise<Page>;
  checkins: (context: DailyContext, query: { date: string; limit: number }) => Page | Promise<Page>;
};
export async function getDailyReflection(db: DatabaseSync, context: DailyContext, date: string, timeZone: string, sources: DaySources) {
  const bounds = dayBounds(date, timeZone);
  async function section(read: () => Page | Promise<Page>) {
    try { return { status: 'ready' as const, data: await read() }; }
    catch (error) {
      // A failed contributor is not an empty day. Do not expose SQL or internal exception text.
      return { status: 'failed' as const, error: { code: error instanceof CommonError ? error.code : 'INTERNAL_ERROR',
        message: error instanceof CommonError ? error.message : 'Daily source could not be read', requestId: context.requestId } };
    }
  }
  const visits = await section(() => listVisits(db, context, { from: bounds.from, to: bounds.to, limit: 50 }));
  const records = await section(() => sources.records(context, { range: { startAt: bounds.from, endAt: bounds.to, timezone: timeZone }, rangeMatch: 'startsWithin', limit: 50 }));
  const checkins = await section(() => sources.checkins(context, { date, limit: 50 }));
  return { ...bounds, visits, records, checkins };
}
