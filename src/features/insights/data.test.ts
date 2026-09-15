import { describe, it, expect } from 'vitest';
import { insightPresentation } from './data';
import type { Summary } from '../../../packages/api-client/index';

describe('experience diagnosis presentation', () => {
  const result = { provisionalName: 'この期間に記録された体験（暫定）', unknown: [], axes: [
    { key: 'nature', numerator: 1, denominator: 2, value: .5, unknownDays: 3 },
    { key: 'books', numerator: 0, denominator: 0, value: null, unknownDays: 5 },
    { key: 'detour', numerator: 1, denominator: 1, value: 1, unknownDays: 0 },
  ] };
  const summary = { from: 1, to: 86400000, timeZone: 'UTC', result, sourceRefs: [] } as unknown as Summary;
  it('shows supported experience data without relabeling legacy axes or filling unknown days', () => {
    const view = insightPresentation(null, summary, []);
    expect(view.title).toBe(result.provisionalName);
    expect(view.axes.map(a => [a.label, a.value, a.unknownDays])).toEqual([['自然', .5, 3], ['本', null, 5]]);
    expect(view.review).toBe(null);
  });
  it('removes the old graph and title after evidence changes', () => {
    const view = insightPresentation(null, summary, [], true);
    expect(view.axes).toEqual([]);
    expect(view.title).toBe(null);
  });
});
