import { describe, expect, it } from 'vitest';
import type { ApiClient, RouteSearchResult, SavedRoute } from '../../../packages/api-client/index';
import { RouteFlow } from './route-flow';
import { createRouteDraft } from './types';

const preview: RouteSearchResult = {
  resultId: 'test-result', waypoints: [{ name: '出発', placeId: 'p1', coordinates: [136.96, 35.16] }, { name: '目的', placeId: 'p2', coordinates: [136.97, 35.17] }],
  mode: 'walking', geometry: { type: 'LineString', coordinates: [[136.96, 35.16], [136.97, 35.17]] },
  legs: [{ fromIndex: 0, toIndex: 1, geometry: { type: 'LineString', coordinates: [[136.96, 35.16], [136.97, 35.17]] }, distanceM: 1000, durationSec: 800 }],
  distanceM: 1000, durationSec: 800, provider: 'mapbox-directions', fetchedAt: 1, expiresAt: Date.now() + 600000, retention: 'storable',
};
function saved(id: string, status: SavedRoute['status'], version = 1): SavedRoute {
  return { id, personId: 'test-person', title: '道順', waypoints: preview.waypoints, mode: 'walking', geometry: preview.geometry, legs: preview.legs, distanceM: 1000, durationSec: 800, provider: 'mapbox-directions', fetchedAt: 1, sourceUrl: null, status, currentLeg: 0, visibility: 'private', sharedWith: [], version, createdAt: 1, updatedAt: 1 };
}
function setup(handler: (operation: string, input: any) => Promise<any>) {
  const calls: { operation: string; input: any }[] = [];
  const api = { request: async (operation: string, input: any) => { calls.push({ operation, input }); return handler(operation, input); }, setDataMode() {}, cancelPending() {} } as ApiClient;
  const flow = new RouteFlow(api, 'test-person:demo');
  flow.setDraft({ ...createRouteDraft(), stops: ['p1', 'p2'].map((id, index) => ({ key: id, query: id, place: { id, name: id, selection: { kind: 'stored' as const, placeId: id } } })) });
  return { flow, calls };
}

describe('route screen request sequencing', () => {
  it('retries navigation start on the same saved route without another create, and does not finish on panel close', async () => {
    let fail = true;
    const { flow, calls } = setup(async (operation, input) => {
      if (operation === 'postRouteComparisons') return { data: { items: [preview] } };
      if (operation === 'postSavedRoutes') return { data: saved(input.body.id, 'saved') };
      if (operation === 'patchSavedRoutesRouteId') {
        if (fail) { fail = false; throw new Error('response lost'); }
        return { data: saved(input.path.routeId, input.body.status, 2) };
      }
      throw new Error(operation);
    });
    expect(await flow.search()).toBe(true);
    expect(await flow.adoptAndStart(preview.resultId)).toBeNull();
    expect(flow.getSnapshot().saved?.status).toBe('saved');
    const result = await flow.adoptAndStart(preview.resultId);
    expect(result?.status).toBe('navigating');
    expect(calls.filter(c => c.operation === 'postSavedRoutes')).toHaveLength(1);
    const patches = calls.filter(c => c.operation === 'patchSavedRoutesRouteId');
    expect(patches[0]!.input.path.routeId).toBe(patches[1]!.input.path.routeId);
    const beforeClose = calls.length;
    flow.leavePanel();
    expect(calls).toHaveLength(beforeClose);
    expect(flow.getSnapshot().saved?.status).toBe('navigating');
    flow.dispose();
  });
  it('confirms an uncertain create by its fixed ID before sending another create', async () => {
    let accepted: SavedRoute | null = null;
    const { flow, calls } = setup(async (operation, input) => {
      if (operation === 'postRouteComparisons') return { data: { items: [preview] } };
      if (operation === 'postSavedRoutes') { accepted = saved(input.body.id, 'saved'); throw new Error('connection lost after save'); }
      if (operation === 'getSavedRoutesRouteId') return { data: accepted };
      if (operation === 'patchSavedRoutesRouteId') return { data: saved(input.path.routeId, 'navigating', 2) };
      throw new Error(operation);
    });
    await flow.search();
    expect(await flow.adoptAndStart(preview.resultId)).toBeNull();
    const result = await flow.adoptAndStart(preview.resultId);
    expect(result?.status).toBe('navigating');
    expect(calls.filter(c => c.operation === 'postSavedRoutes')).toHaveLength(1);
    expect(calls.map(c => c.operation)).toEqual(['postRouteComparisons', 'postSavedRoutes', 'getSavedRoutesRouteId', 'patchSavedRoutesRouteId']);
    flow.dispose();
  });
  it('keeps navigation active after a failed finish and never writes a visit', async () => {
    const { flow, calls } = setup(async (operation) => {
      if (operation === 'getSavedRoutesRouteId') return { data: saved('saved-id', 'navigating', 4) };
      throw { status: 412, code: 'VERSION_CONFLICT' };
    });
    await flow.loadSaved('saved-id');
    expect(await flow.finish()).toBe(false);
    expect(flow.getSnapshot().saved?.status).toBe('navigating');
    expect(flow.getSnapshot().state).toBe('conflict');
    expect(calls.map(c => c.operation)).toEqual(['getSavedRoutesRouteId', 'patchSavedRoutesRouteId']);
    expect(calls[1]!.input).toMatchObject({ path: { routeId: 'saved-id' }, body: { status: 'finished' }, version: 4 });
    flow.dispose();
  });
  it('does not drop unsupported additional conditions from a request', async () => {
    const { flow, calls } = setup(async () => ({ data: preview }));
    flow.setDraft({ ...flow.getSnapshot().draft, avoidStairs: true, departure: '10:30' });
    expect(await flow.search()).toBe(false);
    expect(calls).toHaveLength(0);
    expect(flow.getSnapshot().draft).toMatchObject({ avoidStairs: true, departure: '10:30' });
    expect(flow.getSnapshot().state).toBe('unavailable');
    flow.dispose();
  });
});


describe('route entry boundaries', () => {
  it('copies every shared waypoint in order after the own origin and never mutates the source', async () => {
    const { flow, calls } = setup(async () => ({ data: saved('friend-route', 'navigating') }));
    await flow.copySharedRoute('friend-route');
    expect(flow.getSnapshot().saved).toBeNull();
    expect(flow.getSnapshot().draft.stops.map(stop => stop.query)).toEqual(['p1', '出発', '目的']);
    expect(calls.map(call => call.operation)).toEqual(['getSavedRoutesRouteId']);
    expect(await flow.finish()).toBe(false);
    flow.dispose();
  });
  it('uses select preview identity with the fixed origin and refuses temporary route storage', async () => {
    const result = {
      resultId: 'dialogue', expiresAt: Date.now() + 60000,
      origin: { kind: 'selected', label: '相談を送った地点', coordinates: [136.9, 35.1] },
      places: [{ candidateId: 'candidate', placeId: null, name: '候補', coordinates: [137, 35.2], retention: 'temporary' }],
      routes: [{ ...preview, previewId: 'selected-route-preview', retention: 'temporary' }],
    };
    const { flow, calls } = setup(async () => ({ data: result }));
    await flow.loadDialogueDestination('dialogue', 'candidate');
    expect(flow.getSnapshot().draft.stops[0]?.place?.selection).toEqual({ kind: 'point', coordinates: [136.9, 35.1], label: '相談を送った地点' });
    expect(await flow.search()).toBe(true);
    expect(flow.getSnapshot().preview?.resultId).toBe('selected-route-preview');
    expect(await flow.adoptAndStart('selected-route-preview')).toBeNull();
    expect(calls.map(call => call.operation)).toEqual(['getMapDialoguesResultsResultId', 'postMapDialoguesSelect']);
    expect(calls[1]?.input.body).toEqual({ resultId: 'dialogue', candidateId: 'candidate' });
    flow.dispose();
  });
  it('rechecks saved state when start succeeded but its response was lost', async () => {
    let serverSaved = saved('route', 'saved', 1);
    const { flow, calls } = setup(async operation => {
      if (operation === 'getSavedRoutesRouteId') return { data: serverSaved };
      if (operation === 'patchSavedRoutesRouteId') { serverSaved = saved('route', 'navigating', 2); throw new Error('response lost'); }
      throw new Error(operation);
    });
    await flow.loadSaved('route');
    expect(await flow.startSaved()).toBeNull();
    expect((await flow.startSaved())?.status).toBe('navigating');
    expect(calls.filter(call => call.operation === 'patchSavedRoutesRouteId')).toHaveLength(1);
    expect(calls.filter(call => call.operation === 'postSavedRoutes')).toHaveLength(0);
    flow.dispose();
  });
});


describe('route comparison selection', () => {
  it('keeps both candidates, selects the second geometry, and saves the selected result only', async () => {
    const second = { ...preview, resultId: 'second-result', distanceM: 1400, durationSec: 1100 };
    const { flow, calls } = setup(async (operation, input) => {
      if (operation === 'postRouteComparisons') return { data: { items: [preview, second] } };
      if (operation === 'postSavedRoutes') return { data: saved(input.body.id, 'saved') };
      if (operation === 'patchSavedRoutesRouteId') return { data: saved(input.path.routeId, 'navigating', 2) };
      throw new Error(operation);
    });
    expect(await flow.search()).toBe(true);
    expect(flow.getSnapshot().previews).toHaveLength(2);
    flow.selectPreview(second.resultId);
    expect(flow.getSnapshot().preview).toEqual(second);
    expect(await flow.adoptAndStart(preview.resultId)).toBeNull();
    expect(await flow.adoptAndStart(second.resultId)).not.toBeNull();
    expect(calls.filter(call => call.operation === 'postSavedRoutes').map(call => call.input.body.resultId)).toEqual(['second-result']);
    flow.dispose();
  });
  it('reconciles an uncertain save after switching to another candidate and back', async () => {
    let accepted: SavedRoute | null = null;
    const second = { ...preview, resultId: 'second-result' };
    const { flow, calls } = setup(async (operation, input) => {
      if (operation === 'postRouteComparisons') return { data: { items: [preview, second] } };
      if (operation === 'postSavedRoutes') { accepted = saved(input.body.id, 'saved'); throw new Error('response lost'); }
      if (operation === 'getSavedRoutesRouteId') return { data: accepted };
      if (operation === 'patchSavedRoutesRouteId') return { data: saved(input.path.routeId, 'navigating', 2) };
      throw new Error(operation);
    });
    await flow.search();
    await flow.adoptAndStart(preview.resultId);
    flow.selectPreview(second.resultId);
    flow.selectPreview(preview.resultId);
    expect((await flow.adoptAndStart(preview.resultId))?.status).toBe('navigating');
    expect(calls.filter(call => call.operation === 'postSavedRoutes')).toHaveLength(1);
    flow.dispose();
  });
});
