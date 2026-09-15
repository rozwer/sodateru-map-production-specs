import { useSyncExternalStore } from 'react';
import type { MapBridge } from '../app/map-bridge';
import type { ObjectPreviewProps } from './ObjectPreview';
import type { GrowthItem } from '../../packages/api-client/index';

export type MapDecoration = { id: string; coordinates: [number, number]; name: string; color: string; size: ObjectPreviewProps['size'] };

type DisplayState = { placement: Pick<ObjectPreviewProps, 'color' | 'size'> | null; decorations: MapDecoration[]; growth: GrowthItem[] };
class DisplayStore {
  private state: DisplayState = { placement: null, decorations: [], growth: [] };
  private listeners = new Set<() => void>();
  constructor(bridge: MapBridge) {
    let scope = bridge.getSnapshot().scopeKey;
    bridge.subscribe(() => { if (scope !== bridge.getSnapshot().scopeKey) { scope = bridge.getSnapshot().scopeKey; this.state = { placement: null, decorations: [], growth: [] }; this.listeners.forEach(listener => listener()); } });
  }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  setPlacement = (placement: DisplayState['placement']) => { this.state = { ...this.state, placement }; this.listeners.forEach(listener => listener()); };
  setDecorations = (decorations: MapDecoration[]) => { this.state = { ...this.state, decorations }; this.listeners.forEach(listener => listener()); };
  setGrowth = (growth: GrowthItem[]) => { this.state = { ...this.state, growth }; this.listeners.forEach(listener => listener()); };
}
const stores = new WeakMap<MapBridge, DisplayStore>();
export function mapDisplay(bridge: MapBridge) { let store = stores.get(bridge); if (!store) { store = new DisplayStore(bridge); stores.set(bridge, store); } return store; }
export function useMapDisplay(bridge: MapBridge) { const store = mapDisplay(bridge); return useSyncExternalStore(store.subscribe, store.getSnapshot); }
export function showGrowth(bridge: MapBridge, items: GrowthItem[]) { mapDisplay(bridge).setGrowth(items); }
