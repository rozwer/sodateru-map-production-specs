import { createContext, useContext, useSyncExternalStore } from 'react';
import type { MapBridge } from './map-bridge';

export const MapBridgeContext = createContext<MapBridge | null>(null);
export function useMapBridge(): MapBridge {
  const bridge = useContext(MapBridgeContext);
  if (!bridge) throw new Error('A screen must be mounted inside the shared app shell.');
  return bridge;
}
export function useMapSnapshot() {
  const bridge = useMapBridge();
  return useSyncExternalStore(bridge.subscribe, bridge.getSnapshot);
}
