import { useEffect, useSyncExternalStore } from 'react';
import { api } from '../../../app/api';
import { createDisasterDataAdapter, toDisasterMapData, clipDisasterRaster, type DisasterView } from '../data';
import type { MapBridge } from '../../../app/map-bridge';
import type { SceneImage, SceneOverlay } from '../../../map/MapScene';

export type DisasterMapDisplay = {
  ownerKey: string | null;
  images: (SceneImage & { clipBounds?: [number, number, number, number] })[];
  overlays: SceneOverlay[];
};
const empty: DisasterMapDisplay = { ownerKey: null, images: [], overlays: [] };
export async function buildDisasterMapDisplay(view: DisasterView, opacity = .65): Promise<DisasterMapDisplay> {
  const materials = toDisasterMapData(view);
  if (materials.action !== 'apply' || !materials.ownerKey) return empty;
  const ownerKey = materials.ownerKey;
  const images = await Promise.all(materials.rasters.map(async raster => {
    const cropped = await clipDisasterRaster(raster);
    return {id:raster.id,ownerKey,url:cropped.imageDataUrl,coordinates:cropped.coordinates,opacity};
  }));
  const overlays: SceneOverlay[] = materials.masks.flatMap(({layerId,mask}) => mask.geojson.features.map((feature,index) => ({id:`${layerId}-missing-${index}`,ownerKey,geometry:feature.geometry as SceneOverlay['geometry'],color:'#66717a',opacity:.45,label:'欠測・未確認'})));
  return {ownerKey,images,overlays};
}
class DisasterDisplayStore {
  private snapshot = empty;
  private revision = 0;
  private loading: Promise<void> | null = null;
  private listeners = new Set<() => void>();
  constructor(bridge: MapBridge) {
    let scope = bridge.getSnapshot().scopeKey;
    bridge.subscribe(() => {
      if (scope !== bridge.getSnapshot().scopeKey) { scope = bridge.getSnapshot().scopeKey; this.set(empty); }
    });
  }
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  set = (value: DisasterMapDisplay) => { this.revision++; this.snapshot = value; this.listeners.forEach(listener => listener()); };
  clear = () => this.set(empty);
  /** Restore once for the main map. Any subsequent stop/settings write wins over a late response. */
  load = () => {
    if (this.loading) return this.loading;
    const revision = this.revision;
    this.loading = createDisasterDataAdapter(api).read().then(buildDisasterMapDisplay).then(value => {
      if (revision === this.revision) this.set(value);
    }).catch(() => { if (revision === this.revision) this.clear(); }).finally(() => { this.loading = null; });
    return this.loading;
  };
}
const stores = new WeakMap<MapBridge, DisasterDisplayStore>();
export function disasterMapDisplay(bridge: MapBridge) {
  let store = stores.get(bridge);
  if (!store) { store = new DisasterDisplayStore(bridge); stores.set(bridge, store); }
  return store;
}
export function useDisasterMapDisplay(bridge: MapBridge, hydrate = false) {
  const store = disasterMapDisplay(bridge);
  const scopeKey = useSyncExternalStore(bridge.subscribe, bridge.getSnapshot).scopeKey;
  useEffect(() => { if (hydrate) void store.load(); }, [store,hydrate,scopeKey]);
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}
