import { CommonError } from '../../core/errors.ts';

export function invalid(message: string): never {
  throw new CommonError('VALIDATION_FAILED', message, false, undefined, 422);
}
export function object(value: unknown, allowed: string[], required: string[] = []): Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid('JSON object required');
  const result = value as Record<string, any>;
  if (Object.keys(result).some(key => !allowed.includes(key))) invalid('Unknown field');
  if (required.some(key => !(key in result))) invalid('Required field missing');
  return result;
}
export function id(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 80) invalid('ID must contain 1–80 characters');
  return value;
}
export function timestamp(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || Math.abs(value) > 8640000000000000) invalid('Invalid UTC millisecond timestamp');
  return value;
}
export function oneOf<T extends string>(value: unknown, values: readonly T[]): T {
  if (!values.includes(value as T)) invalid(`Expected ${values.join(', ')}`);
  return value as T;
}
export function visitTimes(value: { startedAt: unknown; endedAt: unknown; timePrecision: unknown }) {
  oneOf(value.timePrecision, ['exact', 'approximate', 'unknown']);
  if (value.startedAt !== null) timestamp(value.startedAt);
  if (value.endedAt !== null) timestamp(value.endedAt);
  if (value.endedAt !== null && (value.startedAt === null || Number(value.endedAt) < Number(value.startedAt))) invalid('End must be at or after start');
  if (value.timePrecision === 'unknown' && (value.startedAt !== null || value.endedAt !== null)) invalid('Unknown time requires null timestamps');
}
export function range(from: unknown, to: unknown) {
  timestamp(from); timestamp(to);
  if (Number(from) >= Number(to)) invalid('from must precede to');
}
export function numberIn(value: unknown, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) invalid(`Number must be between ${min} and ${max}`);
  return value;
}

/** Find the first instant whose local date is date, including DST midnight gaps. */
export function dayBounds(date: string, timeZone: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) invalid('Invalid date');
  const nominal = Date.parse(`${date}T00:00:00.000Z`);
  if (!Number.isFinite(nominal) || new Date(nominal).toISOString().slice(0, 10) !== date) invalid('Invalid date');
  let formatter: Intl.DateTimeFormat;
  try { formatter = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }); }
  catch { invalid('Invalid IANA timeZone'); }
  const localDate = (t: number) => {
    const parts = Object.fromEntries(formatter.formatToParts(t).map(p => [p.type, p.value]));
    return `${parts.year.padStart(4, '0')}-${parts.month}-${parts.day}`;
  };
  const boundary = (target: string, around: number) => {
    let lo = around - 2 * 86400000, hi = around + 2 * 86400000;
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (localDate(mid) < target) lo = mid + 1; else hi = mid;
    }
    return lo;
  };
  const nextDate = new Date(nominal + 86400000).toISOString().slice(0, 10);
  const from = boundary(date, nominal), to = boundary(nextDate, nominal + 86400000);
  if (from === to || localDate(from) !== date) invalid('This local date does not exist in this timeZone');
  return { date, timeZone, from, to };
}
