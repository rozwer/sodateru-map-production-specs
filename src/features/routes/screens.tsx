import { useEffect, useState, useSyncExternalStore } from 'react';
import type { SavedRoute, RouteSearchResult } from '../../../packages/api-client/index';
import { api } from '../../app/api';
import type { ScreenDefinition, ScreenProps } from '../../app/contracts';
import type { MapBridge } from '../../app/map-bridge';
import { useMapBridge } from '../../app/useMapBridge';
import { RouteMapPreview as MapPreview } from './RouteMapPreview';
import { RouteConditionsPage } from './RouteConditionsPage';
import { RouteNavigationPage } from './RouteNavigationPage';
import { RouteResultsPage } from './RouteResultsPage';
import { RouteNotice } from './components';
import { routeMessages as m } from './messages';
import { RouteFlow } from './route-flow';
import { createRouteDraft, type RouteCandidateView, type RouteMode } from './types';

type FlowEntry = { flow: RouteFlow; users: number };
const flows = new WeakMap<MapBridge, FlowEntry>();
function useRouteFlow(scopeKey: string) {
  const bridge = useMapBridge();
  const [entry] = useState(() => {
    const existing = flows.get(bridge);
    if (existing) return existing;
    let storage: Storage | undefined;
    try { storage = localStorage; } catch { /* Input still works when preference storage is unavailable. */ }
    const created = { flow: new RouteFlow(api, scopeKey, storage), users: 0 };
    flows.set(bridge, created); return created;
  });
  useEffect(() => {
    entry.users++;
    return () => { entry.users--; queueMicrotask(() => { if (entry.users === 0) { entry.flow.dispose(); flows.delete(bridge); } }); };
  }, [entry, bridge]);
  const state = useSyncExternalStore(entry.flow.subscribe, entry.flow.getSnapshot);
  return { flow: entry.flow, state, bridge };
}

function routePoints(route: SavedRoute | RouteSearchResult) {
  return route.waypoints.map((point, index) => ({ id: point.placeId || `waypoint-${index}`, coordinates: point.coordinates, label: point.name, number: index + 1 }));
}
function focusRoute(bridge: MapBridge, route: SavedRoute | RouteSearchResult, owner: 'route-planner' | 'route-navigation') {
  const points = route.geometry.coordinates;
  if (!points.length) return;
  bridge.focus(owner, { bounds: [[Math.min(...points.map(p => p[0])), Math.min(...points.map(p => p[1]))], [Math.max(...points.map(p => p[0])), Math.max(...points.map(p => p[1]))]] });
}
function basicCandidate(route: SavedRoute | RouteSearchResult): RouteCandidateView {
  const temporary = 'retention' in route && route.retention === 'temporary';
  return {
    id: 'resultId' in route ? route.resultId : route.id,
    name: 'title' in route ? route.title : m.basicRoute,
    distanceM: route.distanceM, travelDurationSec: route.durationSec,
    stayDurationSec: null, totalDurationSec: null, evaluations: [],
    adoptable: !temporary, adoptionReason: temporary ? m.temporaryRoute : undefined,
  };
}

function ConditionsScreen({ route, navigate, back, scopeKey, active = true }: ScreenProps) {
  const { flow, state, bridge } = useRouteFlow(scopeKey);
  const destinationPlaceId = route.params.destinationPlaceId || route.params.placeId;
  const sharedRouteId = route.params.sharedRouteId;
  const dialogueResultId = route.params.dialogueResultId;
  const candidateId = route.params.candidateId;
  const incomingMode = ['walking', 'cycling', 'driving', 'transit'].includes(route.params.mode || '') ? route.params.mode as RouteMode : undefined;
  useEffect(() => {
    if (!active) return;
    if (dialogueResultId && candidateId) void flow.loadDialogueDestination(dialogueResultId, candidateId);
    else if (sharedRouteId) void flow.copySharedRoute(sharedRouteId);
    else if (destinationPlaceId) void flow.loadDestination(destinationPlaceId, incomingMode);
  }, [flow, sharedRouteId, destinationPlaceId, incomingMode, dialogueResultId, candidateId]);
  const runSearch = async () => { if (await flow.search()) navigate('route-results'); };
  return <RouteConditionsPage draft={state.draft} onChange={draft => { flow.setDraft(draft); bridge.clear('route-planner'); }} onBack={() => { flow.leavePanel(); back(); }} onSearch={() => { void runSearch(); }} onSearchPlaces={(key, query) => { const camera = bridge.getSnapshot().camera; void flow.searchPlaces(key, query, [camera.longitude, camera.latitude]); }} onOpenPasses={flow.showPassEntryPending} placeSearch={state.placeSearch} state={state.state} notice={state.message ? { message: state.message, retry: () => { void runSearch(); } } : undefined}/>;
}

function ResultsScreen({ route, navigate, back, scopeKey, active = true }: ScreenProps) {
  const { flow, state, bridge } = useRouteFlow(scopeKey);
  const routeId = route.params.routeId;
  const saved = routeId && state.saved?.id === routeId ? state.saved : null;
  const result = saved || (!routeId ? state.preview : null);
  useEffect(() => { if (active && routeId) void flow.loadSaved(routeId); }, [flow, routeId, active]);
  useEffect(() => {
    if (!active || !result) return;
    bridge.showRoute('route-planner', { geometry: result.geometry, waypoints: routePoints(result), ...('resultId' in result ? { previewId: result.resultId } : { routeId: result.id }) });
    focusRoute(bridge, result, 'route-planner');
  }, [bridge, result, active]);
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => bridge.onSelect('route-planner', selection => { if (selection.kind === 'route') setSelected(selection.id); }), [bridge]);
  const candidate = result ? basicCandidate(result) : null;
  const displayedDraft = saved ? { ...createRouteDraft(), title: saved.title, mode: saved.mode, stops: saved.waypoints.map((point, index) => ({ key: `saved-${index}`, query: point.name, place: { id: point.placeId || `saved-point-${index}`, name: point.name, coordinates: point.coordinates, selection: { kind: 'point' as const, coordinates: point.coordinates, label: point.name } } })) } : state.searchedDraft || state.draft;
  const adopt = async (id: string) => {
    if (saved) { const started = saved.status === 'saved' ? await flow.startSaved() : saved; if (started) navigate('route-navigation', { routeId: started.id }); return; }
    const next = await flow.adoptAndStart(id);
    if (next) { bridge.clear('route-planner'); navigate('route-navigation', { routeId: next.id }); }
  };
  const retry = () => {
    if (state.message === m.expiredRoute) { void flow.search(); return; }
    if (state.state === 'conflict' && state.saved) { void flow.loadSaved(state.saved.id); return; }
    if (routeId) { void flow.loadSaved(routeId); return; }
    if (candidate) void adopt(candidate.id); else void flow.search();
  };
  return <RouteResultsPage draft={displayedDraft} candidates={candidate ? [candidate] : []} selectedId={selected === candidate?.id ? selected : candidate?.id || null} onSelect={id => { setSelected(id); bridge.select({ ownerKey: 'route-planner', kind: 'route', id }); }} onBack={() => { flow.leavePanel(); back(); }} onChangeConditions={() => { flow.leavePanel(); navigate('route-conditions'); }} onAdopt={id => { void adopt(id); }} state={state.state} notice={state.message ? { message: state.message, retry } : undefined} map={{ content: active ? <MapPreview bridge={bridge} interactive padding={{ top: 24, right: 24, bottom: 28, left: 24 }} label={m.results}/> : null, summary: result?.waypoints.map(p => p.name).join(' → ') || m.results }}/>
}

function NavigationScreen({ route, navigate, back, scopeKey, active = true }: ScreenProps) {
  const { flow, state, bridge } = useRouteFlow(scopeKey);
  const routeId = route.params.routeId;
  const saved = routeId && state.saved?.id === routeId ? state.saved : null;
  useEffect(() => { if (active && routeId) void flow.loadSaved(routeId); }, [flow, routeId, active]);
  useEffect(() => {
    if (!active || !saved) return;
    if (saved.status === 'finished') { bridge.clear('route-navigation'); return; }
    bridge.showRoute('route-navigation', { routeId: saved.id, geometry: saved.geometry, waypoints: routePoints(saved) });
    focusRoute(bridge, saved, 'route-navigation');
  }, [bridge, saved, active]);
  if (!saved) return <RouteNotice role={state.state === 'loading' ? 'status' : 'alert'} notice={{ message: state.message || (state.state === 'loading' ? m.searching : m.routeMissing), retry: routeId ? () => { void flow.loadSaved(routeId); } : back }}/>;
  return <RouteNavigationPage navigation={{ routeId: saved.id, title: saved.title, status: saved.status, instruction: null, direction: null, turnDistanceM: null, remainingDistanceM: null, remainingDurationSec: null, accuracyM: null, locationStatus: 'idle', fetchedAt: saved.fetchedAt }} map={{ content: active ? <MapPreview bridge={bridge} interactive padding={{ top: 150, right: 24, bottom: 64, left: 24 }} label={m.walkingNavigation}/> : null, summary: saved.waypoints.map(p => p.name).join(' → ') }} onClose={() => { flow.leavePanel(); navigate('map'); }} onWholeRoute={() => focusRoute(bridge, saved, 'route-navigation')} onList={() => navigate('route-results', { routeId: saved.id })} onLocate={() => { bridge.setView({ following: true }); }} onStart={() => { void flow.startSaved(); }} onFinish={() => { void flow.finish().then(finished => { if (finished) { bridge.clear('route-navigation'); navigate('map'); } }); }} ending={state.state === 'saving'} notice={state.message ? { message: state.message, retry: () => { if (state.state === 'conflict') void flow.loadSaved(saved.id); else void flow.finish(); } } : { message: m.navigationPending }}/>
}

export const screens: ScreenDefinition[] = [
  { id: 'route-conditions', title: m.conditions, component: ConditionsScreen, layout: { header: 'none', contentPadding: 'none', bottomNav: false, background: 'soft' } },
  { id: 'route-results', title: m.results, component: ResultsScreen, layout: { header: 'none', contentPadding: 'none', bottomNav: false, background: 'soft' } },
  { id: 'route-navigation', title: m.walkingNavigation, component: NavigationScreen, layout: { header: 'none', contentPadding: 'none', bottomNav: false, background: 'soft' } },
];
