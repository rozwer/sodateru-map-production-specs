import { useSyncExternalStore } from 'react';
import type { MapBridge } from '../../../app/map-bridge';
import type { SceneImage, SceneOverlay } from '../../../map/MapScene';

export type DisasterMapDisplay = {
  ownerKey: string | null;
  images: (SceneImage & { clipBounds?: [number, number, number, number] })[];
  overlays: SceneOverlay[];
};
const empty: DisasterMapDisplay = { ownerKey: null, images: [], overlays: [] };
class DisasterDisplayStore {
  private snapshot = empty;
  private listeners = new Set<() => void>();
  constructor(bridge: MapBridge) {
    let scope = bridge.getSnapshot().scopeKey;
    bridge.subscribe(() => {
      if (scope !== bridge.getSnapshot().scopeKey) { scope = bridge.getSnapshot().scopeKey; this.set(empty); }
    });
  }
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  set = (value: DisasterMapDisplay) => { this.snapshot = value; this.listeners.forEach(listener => listener()); };
  clear = () => this.set(empty);
}
const stores = new WeakMap<MapBridge, DisasterDisplayStore>();
export function disasterMapDisplay(bridge: MapBridge) {
  let store = stores.get(bridge);
  if (!store) { store = new DisasterDisplayStore(bridge); stores.set(bridge, store); }
  return store;
}
export function useDisasterMapDisplay(bridge: MapBridge) {
  const store = disasterMapDisplay(bridge);
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}
