import { describe, expect, it } from 'vitest';
import { periodRange, rangeFromParams, rangeParams } from './periods';

describe('screen calendar periods', () => {
  it('sends Japanese midnight boundaries for the displayed day and week', () => {
    const now = Date.parse('2026-09-15T02:00:00Z');
    expect(periodRange('today', 'Asia/Tokyo', now)).toEqual({ from: Date.parse('2026-09-14T15:00:00Z'), to: Date.parse('2026-09-15T15:00:00Z'), timeZone: 'Asia/Tokyo' });
    expect(periodRange('week', 'Asia/Tokyo', now).from).toBe(Date.parse('2026-09-13T15:00:00Z'));
  });
  it('uses calendar boundaries through a daylight-saving transition', () => {
    const range = periodRange('today', 'America/New_York', Date.parse('2026-03-08T16:00:00Z'));
    expect(range.to - range.from).toBe(23 * 60 * 60 * 1000);
    expect(new Date(range.from).toISOString()).toBe('2026-03-08T05:00:00.000Z');
    const autumn = periodRange('today', 'America/New_York', Date.parse('2026-11-01T16:00:00Z'));
    expect(autumn.to - autumn.from).toBe(25 * 60 * 60 * 1000);
  });
  it('starts all-time at the earliest dated record and preserves a range in navigation', () => {
    const range = periodRange('all', 'Asia/Tokyo', Date.parse('2026-09-15T02:00:00Z'), Date.parse('2024-12-31T16:00:00Z'));
    expect(range.from).toBe(Date.parse('2024-12-31T15:00:00Z'));
    expect(rangeFromParams(rangeParams(range))).toEqual(range);
    expect(rangeFromParams({ from: '1', to: '1', timeZone: 'Asia/Tokyo' })).toBeNull();
  });
});
