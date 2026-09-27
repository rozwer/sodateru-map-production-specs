import { describe, expect, it } from 'vitest';
import type { ActivityStatistics } from '../../../packages/api-client/index';
import { rangeFromRoute, statisticsRange, statisticsView } from './statistics';

const sample: ActivityStatistics = {
  from: Date.parse('2026-09-26T15:00:00Z'), to: Date.parse('2026-09-27T15:00:00Z'), timeZone: 'Asia/Tokyo',
  confirmedVisits: { value: 3, unit: 'visits', source: 'visits.confirmed', visitIds: ['v1', 'v2', 'v3'] },
  confirmedPlaces: { value: 2, unit: 'places', source: 'visits.confirmed', placeIds: ['p1', 'p2'] },
  newPlaces: { value: 1, unit: 'places', source: 'visits.confirmed.firstStartedAt', placeIds: ['p2'], unknownPlaceIds: ['p1'] },
  undatedVisits: 1, recordCount: 1, undatedRecords: 2, lastUpdatedAt: null, sourceRefs: [],
  activities: [{ name: '読書', count: 1, recordIds: ['r1'], source: 'records.activities' }],
  daily: [{ date: '2026-09-27', confirmedVisits: 3, recordIds: ['r1'] }],
  sources: [{ id: 'gps', label: '保存されたGPS観測', itemCount: 0, firstObservedAt: null, lastObservedAt: null, lastUpdatedAt: null, status: 'unavailable', description: '観測なし' }],
  gpsDistanceMeters: { value: null, unit: 'm', source: 'track_points', status: 'unavailable', pointCount: 0, edgeCount: 0, disconnectedEdges: 0, maxAccuracyM: null, firstObservedAt: null, lastObservedAt: null, lastUpdatedAt: null, sourcePointIds: [], description: '有効な観測線なし' },
};
describe('formal statistics presentation', () => {
  it('keeps visits distinct from places, missing distance distinct from zero, and source record/date identity', () => {
    const view = statisticsView(sample);
    expect(view.confirmedPlaces).toBe(2); expect(view.confirmedVisits).toBe(3);
    expect(view.distanceLabel).toBeNull(); expect(view.updatedLabel).toBe('未取得');
    expect(view.activities[0]?.records[0]?.id).toBe('r1');
    expect(view.days?.[0]?.date).toBe('2026-09-27');
    expect(view.dailyVisits).toEqual([{date:'2026-09-27',count:3}]);
    expect(view.sources[0]?.status).toContain('取得できません');
    expect(view.missingLabel).toContain('日時不明の訪問1件・記録2件');
    expect(statisticsView({ ...sample, gpsDistanceMeters: { ...sample.gpsDistanceMeters, value: 0, status: 'observed', pointCount: 2, edgeCount: 1 } }).distanceLabel).toBe('0 m');
  });
  it('uses local calendar boundaries including DST, week Monday, and year start', () => {
    const spring = statisticsRange('today', 'America/New_York', Date.parse('2026-03-08T16:00:00Z'));
    expect(spring.to - spring.from).toBe(23 * 3600000);
    const fall = statisticsRange('today', 'America/New_York', Date.parse('2026-11-01T16:00:00Z'));
    expect(fall.to - fall.from).toBe(25 * 3600000);
    expect(statisticsRange('week', 'Asia/Tokyo', sample.from + 3600000).from).toBe(Date.parse('2026-09-20T15:00:00Z'));
    expect(statisticsRange('year', 'Asia/Tokyo', sample.from).from).toBe(Date.parse('2025-12-31T15:00:00Z'));
  });
  it('preserves the exact range passed to sources and rejects malformed ranges', () => {
    expect(rangeFromRoute({ from: String(sample.from), to: String(sample.to), timeZone: sample.timeZone })).toEqual({ from: sample.from, to: sample.to, timeZone: sample.timeZone });
    expect(() => rangeFromRoute({ from: '9', to: '1', timeZone: 'Asia/Tokyo' })).toThrow();
    expect(() => rangeFromRoute({ from: '1', to: '2', timeZone: 'invalid' })).toThrow();
  });
});
