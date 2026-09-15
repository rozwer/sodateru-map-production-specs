import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { api } from '../../app/api';
import type { MapBridge } from '../../app/map-bridge';
import { useMapBridge } from '../../app/useMapBridge';
import { ExplorationFlow } from './flow';
import { errorText, placePresentation, readPlace } from './api';
import type { ScreenProps } from '../../app/contracts';
import type { PlacePresentation } from './view-types';
import type { Suggestion } from '../../../packages/api-client/index';

const flows = new WeakMap<MapBridge, { flow: ExplorationFlow; users: number }>();
export function useExplorationFlow() {
  const bridge = useMapBridge();
  const [entry] = useState(() => {
    const existing = flows.get(bridge);
    if (existing) return existing;
    const created = { flow: new ExplorationFlow(api), users: 0 }; flows.set(bridge, created); return created;
  });
  useEffect(() => {
    entry.users++;
    return () => { entry.users--; queueMicrotask(() => { if (!entry.users) { entry.flow.dispose(); flows.delete(bridge); } }); };
  }, [bridge, entry]);
  return { flow: entry.flow, state: useSyncExternalStore(entry.flow.subscribe, entry.flow.getSnapshot), bridge };
}

export function useScreenRequest(active = true) {
  const controller = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (!active) { controller.current?.abort(); setBusy(false); } return () => { controller.current?.abort(); }; }, [active]);
  const run = async <T,>(action: (signal: AbortSignal) => Promise<T>, accept: (value: T) => void, parentSignal?: AbortSignal) => {
    controller.current?.abort();
    const work = new AbortController(); controller.current = work;
    const abort = () => work.abort();
    if (parentSignal?.aborted) return;
    parentSignal?.addEventListener('abort', abort, { once: true });
    setBusy(true); setError(null);
    try { const value = await action(work.signal); if (!work.signal.aborted) accept(value); }
    catch (error) { if (!work.signal.aborted) setError(errorText(error)); }
    finally { parentSignal?.removeEventListener('abort', abort); if (controller.current === work) setBusy(false); }
  };
  return { busy, error, setError, run };
}

export function useExplorationTarget({ route, active = true }: ScreenProps) {
  const { state, bridge } = useExplorationFlow();
  const [place, setPlace] = useState<PlacePresentation | null>(null);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const request = useScreenRequest(active);
  const { placeId, suggestionId, resultId, candidateId } = route.params;
  const load = () => request.run(async signal => {
    if (suggestionId) {
      const { data } = await api.request('getSuggestionsSuggestionId', { path: { suggestionId }, signal });
      return { place: { ...await readPlace(api, data.placeId, signal), reason: data.reason }, suggestion: data };
    }
    if (placeId) return { place: await readPlace(api, placeId, signal), suggestion: null };
    if (resultId && candidateId) {
      const result = state.result?.resultId === resultId ? state.result : (await api.request('getMapDialoguesResultsResultId', { path: { resultId }, signal })).data;
      if (result.expiresAt <= Date.now()) throw new Error('候補の期限が切れました。相談からもう一度探してください。');
      const candidate = result.places.find(candidate => candidate.candidateId === candidateId);
      if (!candidate) throw new Error('この候補は見つかりません。相談からもう一度探してください。');
      return { place: candidate.placeId ? { ...await readPlace(api, candidate.placeId, signal), id: candidate.candidateId } : placePresentation(candidate), suggestion: null };
    }
    throw new Error('場所を選んでから開いてください。');
  }, result => { setPlace(result.place); setSuggestion(result.suggestion); bridge.focus('suggestion', { center: result.place.coordinates, zoom: 16 }); });
  useEffect(() => { if (active) void load(); }, [active, placeId, suggestionId, resultId, candidateId]);
  return { place, suggestion, ...request, reload: load, bridge };
}
