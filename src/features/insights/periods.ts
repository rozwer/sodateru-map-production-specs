import type { Period } from './types';

export interface InsightRange { from: number; to: number; timeZone: string }
type CalendarDate = { year: number; month: number; day: number };
function calendarDate(at: number, timeZone: string): CalendarDate {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(at);
  const value = (type: string) => Number(parts.find(part => part.type === type)!.value);
  return { year: value('year'), month: value('month'), day: value('day') };
}
function shiftDate(date: CalendarDate, days: number): CalendarDate {
  const shifted = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() };
}
/** Resolve the calendar boundary in its IANA zone, including a 23/25-hour DST day. */
function startOfDate(date: CalendarDate, timeZone: string): number {
  const target = Date.UTC(date.year, date.month - 1, date.day);
  const formatter = new Intl.DateTimeFormat('en-GB', { timeZone, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23' });
  let result = target;
  for (let attempt = 0; attempt < 4; attempt++) {
    const parts = formatter.formatToParts(result);
    const get = (type: string) => Number(parts.find(part => part.type === type)!.value);
    const represented = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
    const delta = target - represented;
    if (delta === 0) return result;
    result += delta;
  }
  return result;
}
export function periodRange(period: Period, timeZone: string, now = Date.now(), earliest = now): InsightRange {
  const today = calendarDate(now, timeZone);
  let from = today;
  if (period === 'week') {
    const weekday = new Date(Date.UTC(today.year, today.month - 1, today.day)).getUTCDay();
    from = shiftDate(today, -(weekday + 6) % 7);
  } else if (period === 'month') from = { ...today, day: 1 };
  else if (period === 'all') from = calendarDate(Math.min(earliest, now), timeZone);
  return { from: startOfDate(from, timeZone), to: startOfDate(shiftDate(today, 1), timeZone), timeZone };
}
export function rangeLabel(range: InsightRange): string {
  const date = new Intl.DateTimeFormat('ja-JP', { timeZone: range.timeZone, year: 'numeric', month: 'numeric', day: 'numeric' });
  return `${date.format(range.from)}〜${date.format(range.to - 1)}`;
}
export function rangeParams(range: InsightRange): Record<string, string> {
  return { from: String(range.from), to: String(range.to), timeZone: range.timeZone };
}
export function rangeFromParams(params: Record<string, string>): InsightRange | null {
  const from = Number(params.from), to = Number(params.to);
  if (!Number.isSafeInteger(from) || !Number.isSafeInteger(to) || from < 0 || to <= from || !params.timeZone) return null;
  try { new Intl.DateTimeFormat('ja-JP', { timeZone: params.timeZone }).format(from); }
  catch { return null; }
  return { from, to, timeZone: params.timeZone };
}
