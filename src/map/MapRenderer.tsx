import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { MapBridge, MapOwnerKey, MapSelection } from '../app/map-bridge';
import { MapScene, type ScenePoint, type SceneLine, type SceneCamera, type SceneSelection, type ScenePadding, type SceneRadius, type SceneImage, type SceneOverlay } from './MapScene';
import { MapIcon } from '../features/map/MapIcon';
import { mapMessages as m } from '../features/map/messages';
import { useDisasterMapDisplay } from '../features/disaster/ui/map-state';
import { mapDisplay, useMapDisplay } from './display-state';

const previewPadding = { top: 10, bottom: 28, left: 10, right: 10 };

export function BridgeMap({ bridge, interactive = true, label, preview = false, padding, radius, images, overlays }: { bridge: MapBridge; interactive?: boolean; label?: string; preview?: boolean; padding?: ScenePadding; radius?: SceneRadius; images?: SceneImage[]; overlays?: SceneOverlay[] }) {
  const snapshot = useSyncExternalStore(bridge.subscribe, bridge.getSnapshot);
  const disaster = useDisasterMapDisplay(bridge);
  const display = useMapDisplay(bridge);
  const points = useMemo<ScenePoint[]>(() => [
    ...Object.entries(snapshot.candidates).flatMap(([ownerKey, display]) => display?.candidates.map(point => ({ ...point, ownerKey, selected: point.id === display.selectedCandidateId, kind: ownerKey === 'map-objects' ? 'object' : ownerKey === 'personal-map' ? 'place' : 'candidate' })) || []),
    ...Object.entries(snapshot.places).flatMap(([ownerKey, display]) => display?.places.map(point => ({ ...point, ownerKey, selected: point.id === display.selectedPlaceId, kind: ownerKey === 'map-objects' ? 'object' : 'place', color: ownerKey === 'friends-map' ? '#c9782e' : '#389fa0' })) || []),
    ...Object.entries(snapshot.tracks).flatMap(([ownerKey, display]) => display?.points.map(point => ({ ...point, ownerKey, kind: 'place', color: '#389fa0' })) || []),
    ...Object.entries(snapshot.routes).flatMap(([ownerKey, display]) => display?.waypoints.map(point => ({ ...point, ownerKey, color: '#319d9e', kind: 'place' })) || []),
  ], [snapshot.candidates, snapshot.places, snapshot.routes, snapshot.tracks]);
  const lines = useMemo<SceneLine[]>(() => [...Object.entries(snapshot.routes).flatMap(([ownerKey, display]) => display ? [
    { id: display.routeId || display.previewId || ownerKey, ownerKey, coordinates: display.geometry.coordinates, selected: true },
    ...(display.alternatives || []).filter(route => route.id !== display.selectedRouteId && route.id !== display.routeId).map(route => ({ id: route.id, ownerKey, coordinates: route.geometry.coordinates, selected: false, color: '#a0b6be' })),
  ] : []), ...Object.entries(snapshot.tracks).flatMap(([ownerKey, display]) => display?.segments.map(segment => ({ id: segment.id, ownerKey, coordinates: segment.coordinates, selected: true })) || [])], [snapshot.routes, snapshot.tracks]);
  const camera = useMemo<SceneCamera>(() => ({ ...snapshot.camera, bounds: snapshot.camera.bounds ? [...snapshot.camera.bounds[0], ...snapshot.camera.bounds[1]] : undefined }), [snapshot.camera]);
  const scenePadding = padding ?? (preview ? previewPadding : snapshot.padding);
  const focus = useMemo(() => snapshot.focus && preview ? { ...snapshot.focus, padding: scenePadding } : snapshot.focus, [snapshot.focus, preview, scenePadding]);
  const select = (selection: SceneSelection) => {
    const ownerKey = selection.ownerKey as MapOwnerKey;
    if (selection.kind === 'candidate') bridge.selectCandidate(ownerKey, selection.id);
    else bridge.select({ ...selection, ownerKey, kind: selection.kind as MapSelection['kind'] });
  };
  return <MapScene camera={camera} view={snapshot.view} padding={scenePadding} points={points} lines={lines} focus={focus} radius={radius} placement={preview ? null : display.placement} decorations={display.decorations} growth={display.growth} styleRevision={display.styleRevision} images={images ?? (preview ? undefined : disaster.images)} overlays={overlays ?? (preview ? undefined : disaster.overlays)} onBuildings={preview ? undefined : buildings => mapDisplay(bridge).setBuildings(buildings)}
    interactive={interactive} label={label} onSelect={select} onManualMove={() => bridge.setView({ following: false })}
    onCamera={interactive ? value => bridge.setCamera({ ...value, pitch: snapshot.view.dimension === '2d' ? snapshot.camera.pitch : value.pitch, bounds: value.bounds ? [[value.bounds[0], value.bounds[1]], [value.bounds[2], value.bounds[3]]] : undefined }) : undefined} />;
}

export function MapRenderer({ bridge }: { bridge: MapBridge }) {
  useDisasterMapDisplay(bridge, true);
  const snapshot = useSyncExternalStore(bridge.subscribe, bridge.getSnapshot);
  const display = useMapDisplay(bridge);
  useEffect(() => {
    const camera = bridge.getSnapshot().camera;
    // The bridge persists its country-scale default before this effect runs.
    // Inspect that camera instead of treating the storage key as a valid saved view.
    if (!Number.isFinite(camera.zoom) || camera.zoom < 7 || !Number.isFinite(camera.longitude) || !Number.isFinite(camera.latitude)) {
      bridge.setCamera({ longitude: 139.6368, latitude: 35.4548, pitch: 55, zoom: 16, bearing: 0, bounds: undefined });
      bridge.setView({ dimension: '3d' });
    }
  }, [bridge, snapshot.scopeKey]);
  const [locationError, setLocationError] = useState<string | null>(null);
  useEffect(() => {
    if (!snapshot.view.following) return;
    if (!navigator.geolocation) { setLocationError(m.locationDenied); bridge.setView({ following: false }); return; }
    const watch = navigator.geolocation.watchPosition(position => {
      setLocationError(null);
      bridge.setCamera({ longitude: position.coords.longitude, latitude: position.coords.latitude });
    }, () => { setLocationError(m.locationDenied); bridge.setView({ following: false }); }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 3000 });
    return () => navigator.geolocation.clearWatch(watch);
  }, [bridge, snapshot.view.following, snapshot.scopeKey]);
  const controlsBottom = Math.max(48, snapshot.padding.bottom + 8);
  return <div className="map-renderer"><BridgeMap bridge={bridge}/>
    <div className="map-camera-controls" style={{ bottom: controlsBottom }}>
      <button type="button" aria-label={m.dimensions} onClick={() => { const dimension = snapshot.view.dimension === '2d' ? '3d' : '2d'; if (dimension === '3d' && snapshot.camera.pitch < 10) bridge.setCamera({ pitch: 52 }); bridge.setView({ dimension }); }}>{snapshot.view.dimension === '2d' ? '3D' : '2D'}</button>
      <button type="button" aria-label={m.compass} onClick={() => bridge.setCamera({ bearing: 0 })}><small>N</small><MapIcon name="compass" style={{ transform: `rotate(${-snapshot.camera.bearing}deg)` }}/></button>
      <button type="button" aria-label={m.locate} aria-pressed={snapshot.view.following} onClick={() => { setLocationError(null); bridge.setView({ following: !snapshot.view.following }); }}><MapIcon name="locate"/></button>
      {display.placement && <><button type="button" aria-label="拡大" onClick={() => bridge.setCamera({ zoom: Math.min(snapshot.camera.zoom + 1, 22) })}>＋</button><button type="button" aria-label="縮小" onClick={() => bridge.setCamera({ zoom: Math.max(snapshot.camera.zoom - 1, 0) })}>−</button></>}
    </div>
    {locationError && <div className="map-location-error" role="alert" style={{ bottom: controlsBottom }}>{locationError}<button type="button" onClick={() => { setLocationError(null); bridge.setView({ following: true }); }}>{m.retry}</button></div>}
  </div>;
}
export default MapRenderer;
