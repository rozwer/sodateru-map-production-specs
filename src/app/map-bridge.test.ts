import { afterEach, describe, expect, it, vi } from 'vitest';
import { MapBridge } from './map-bridge';

afterEach(() => vi.useRealTimers());
describe('shared map context and display lifetime', () => {
  it('expires temporary search results without clearing a saved navigation route', () => {
    vi.useFakeTimers();
    const bridge = new MapBridge('person-a:live');
    bridge.showCandidates('map-search', { resultId: 'result-1', candidates: [{ id: 'candidate-1', coordinates: [136.9, 35.1] }], expiresAt: Date.now() + 1000 });
    bridge.showRoute('route-navigation', { routeId: 'saved-route-1', geometry: { type: 'LineString', coordinates: [[136.9, 35.1], [137, 35.2]] }, waypoints: [] });
    vi.advanceTimersByTime(1001);
    expect(bridge.getSnapshot().candidates['map-search']).toBeUndefined();
    expect(bridge.getSnapshot().routes['route-navigation']?.routeId).toBe('saved-route-1');
    bridge.dispose();
  });
  it('clears old person candidates, saved display, track, route and selection on scope switch', () => {
    const bridge = new MapBridge('person-a:live');
    const point = { id: 'place-a', coordinates: [136.9, 35.1] as [number, number] };
    bridge.showPlaces('knowledge', { places: [point] });
    bridge.showTrack('daily-track', { segments: [{ id: 'segment-1', coordinates: [[136.9, 35.1], [137, 35.2]] }], points: [point] });
    bridge.showRoute('route-navigation', { routeId: 'route-a', geometry: { type: 'LineString', coordinates: [[136.9, 35.1], [137, 35.2]] }, waypoints: [point] });
    bridge.select({ ownerKey: 'knowledge', kind: 'place', id: 'place-a' });
    bridge.resetScope('person-b:demo');
    expect(bridge.getSnapshot()).toMatchObject({ scopeKey: 'person-b:demo', places: {}, tracks: {}, routes: {}, candidates: {}, selection: null });
    bridge.dispose();
  });
  it('sends selection only to the requesting owner and respects unsubscribe', () => {
    const bridge = new MapBridge();
    const own = vi.fn(), other = vi.fn();
    const unsubscribe = bridge.onSelect('route-planner', own);
    bridge.onSelect('map-dialogue', other);
    bridge.select({ ownerKey: 'route-planner', kind: 'route', id: 'route-option-1' });
    expect(own).toHaveBeenCalledTimes(1);
    expect(other).not.toHaveBeenCalled();
    unsubscribe();
    bridge.select({ ownerKey: 'route-planner', kind: 'route', id: 'route-option-2' });
    expect(own).toHaveBeenCalledTimes(1);
    bridge.dispose();
  });
});
