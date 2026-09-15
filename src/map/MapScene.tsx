import { useEffect, useRef, useState } from 'react';
import mapboxgl, { type GeoJSONSource, type TargetFeature } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './map.css';

export type SceneCamera = { longitude: number; latitude: number; zoom: number; bearing: number; pitch: number; bounds?: [number, number, number, number] };
export type SceneView = { dimension: '2d' | '3d'; lens: 'personal' | 'physical'; lightPreset: 'dawn' | 'day' | 'dusk' | 'night'; following: boolean };
export type ScenePadding = { top: number; right: number; bottom: number; left: number };
export type SceneRadius = { center: [number, number]; meters: number };
export type ScenePoint = { id: string; ownerKey: string; coordinates: [number, number]; label?: string; number?: number; selected?: boolean; color?: string; kind?: string };
export type SceneLine = { id: string; ownerKey: string; coordinates: [number, number][]; selected?: boolean; color?: string };
export type SceneSelection = { ownerKey: string; kind: string; id: string; coordinates: [number, number]; buildingKey?: string; height?: number; label?: string };
type Props = {
  camera: SceneCamera;
  view: SceneView;
  padding: ScenePadding;
  points: ScenePoint[];
  lines: SceneLine[];
  onCamera?: (camera: SceneCamera) => void;
  onSelect?: (selection: SceneSelection) => void;
  onManualMove?: () => void;
  interactive?: boolean;
  label?: string;
  placement?: boolean;
  radius?: SceneRadius;
  focus?: { bounds?: [[number, number], [number, number]]; center?: [number, number]; zoom?: number; padding?: ScenePadding; revision: number } | null;
};

function featureCenter(feature: TargetFeature, fallback: [number, number]): [number, number] {
  const geometry = feature.geometry;
  if (geometry.type === 'Point') return [geometry.coordinates[0], geometry.coordinates[1]];
  const rings: number[][][] = geometry.type === 'Polygon' ? [geometry.coordinates[0]] : geometry.type === 'MultiPolygon' ? geometry.coordinates.map((p: number[][][]) => p[0]) : [];
  let largest = 0;
  let center = fallback;
  for (const ring of rings) {
    let area = 0, x = 0, y = 0;
    for (let i = 0; i < ring.length - 1; i++) {
      const a = ring[i], b = ring[i + 1];
      if (!a || !b) continue;
      const [ax, ay] = a, [bx, by] = b;
      if (ax === undefined || ay === undefined || bx === undefined || by === undefined) continue;
      const cross = ax * by - bx * ay;
      area += cross; x += (ax + bx) * cross; y += (ay + by) * cross;
    }
    if (Math.abs(area) > largest) { largest = Math.abs(area); center = [x / (3 * area), y / (3 * area)]; }
  }
  return center;
}

function readCamera(map: mapboxgl.Map): SceneCamera {
  const center = map.getCenter(); const bounds = map.getBounds();
  return { longitude: center.lng, latitude: center.lat, zoom: map.getZoom(), bearing: map.getBearing(), pitch: map.getPitch(), bounds: bounds ? [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()] : undefined };
}

function pointElement(point: ScenePoint) {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = `map-scene-pin${point.selected ? ' is-selected' : ''}`;
  element.style.setProperty('--pin-color', point.color || (point.selected ? '#349d9f' : '#c6782d'));
  element.setAttribute('aria-label', point.label || `地点 ${point.number ?? point.id}`);
  element.setAttribute('aria-pressed', String(!!point.selected));
  element.dataset.pointId = point.id;
  element.dataset.ownerKey = point.ownerKey;
  const head = document.createElement('span'); head.className = 'map-scene-pin-head';
  if (point.number !== undefined) head.textContent = String(point.number);
  else {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', point.kind === 'object' ? 'M4 7 12 3l8 4v10l-8 4-8-4V7Zm0 0 8 4 8-4M12 11v10' : 'M5 4h12v8a6 6 0 0 1-12 0V4Zm12 1h2a3 3 0 0 1 0 6h-2M3 21h17');
    path.setAttribute('fill', 'none'); path.setAttribute('stroke', 'currentColor'); path.setAttribute('stroke-width', '2'); path.setAttribute('stroke-linejoin', 'round');
    svg.append(path); head.append(svg);
  }
  element.append(head);
  if (point.label) { const label = document.createElement('span'); label.className = 'map-scene-pin-label'; label.textContent = point.label; element.append(label); }
  return element;
}

/** A real Mapbox canvas. Product chrome stays in DOM and belongs to the calling screen. */
export function MapScene(props: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const suppressCamera = useRef(false);
  const latest = useRef(props); latest.current = props;
  const [ready, setReady] = useState(0);
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!container.current) return;
    const accessToken = (import.meta as ImportMeta & { env: { VITE_MAPBOX_ACCESS_TOKEN?: string } }).env.VITE_MAPBOX_ACCESS_TOKEN;
    if (!accessToken) { setLoading(false); setError('地図の接続設定がありません'); return; }
    let map: mapboxgl.Map;
    setLoading(true); setError(null);
    const current = latest.current;
    try {
      map = new mapboxgl.Map({ container: container.current, accessToken, style: 'mapbox://styles/mapbox/standard', center: [current.camera.longitude, current.camera.latitude], zoom: current.camera.zoom, pitch: current.view.dimension === '2d' ? 0 : current.camera.pitch, bearing: current.camera.bearing,
        antialias: true, interactive: current.interactive !== false, attributionControl: true, language: 'ja',
        config: { basemap: { theme: current.view.lens === 'personal' ? 'faded' : 'default', lightPreset: current.view.lightPreset, show3dObjects: current.view.dimension === '3d', show3dLandmarks: false, colorBuildingSelect: '#62b5b3', colorBuildingHighlight: '#a8d6d1' } } });
    } catch { setLoading(false); setError('この端末で地図を表示できません'); return; }
    mapRef.current = map;
    map.addControl(new mapboxgl.ScaleControl({ maxWidth: 90, unit: 'metric' }), 'bottom-left');
    let selectedBuilding: TargetFeature | null = null;
    const cameraChanged = () => { if (!suppressCamera.current) latest.current.onCamera?.(readCamera(map)); };
    map.on('moveend', cameraChanged);
    map.on('dragstart', () => latest.current.onManualMove?.());
    map.on('rotatestart', event => { if (event.originalEvent) latest.current.onManualMove?.(); });
    map.on('error', event => { setLoading(false); setError(event.error?.message?.includes('401') ? '地図の接続設定を確認してください' : '地図を取得できませんでした'); });
    map.on('load', () => {
      setLoading(false); setError(null); setReady(value => value + 1); cameraChanged();
      map.addSource('sodateru-routes', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addSource('sodateru-radius', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({ id: 'sodateru-radius-fill', type: 'fill', source: 'sodateru-radius', slot: 'middle', paint: { 'fill-color': '#349fa0', 'fill-opacity': 0.13 } });
      map.addLayer({ id: 'sodateru-radius-line', type: 'line', source: 'sodateru-radius', slot: 'top', paint: { 'line-color': '#349fa0', 'line-width': 2, 'line-dasharray': [3, 2] } });
      map.addLayer({ id: 'sodateru-route-casing', type: 'line', source: 'sodateru-routes', slot: 'top', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': 9, 'line-opacity': 0.95 } });
      map.addLayer({ id: 'sodateru-route-line', type: 'line', source: 'sodateru-routes', slot: 'top', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['get', 'color'], 'line-width': ['case', ['get', 'selected'], 6, 4], 'line-opacity': ['case', ['get', 'selected'], 1, 0.65] } });
      if (current.interactive === false) return;
      map.on('click', 'sodateru-route-line', event => {
        const line = (event.features?.[0] as unknown as { properties?: Record<string, unknown> } | undefined)?.properties;
        if (line && typeof line.ownerKey === 'string' && typeof line.lineId === 'string') latest.current.onSelect?.({ ownerKey: line.ownerKey, kind: 'route', id: line.lineId, coordinates: [event.lngLat.lng, event.lngLat.lat] });
      });
      map.addInteraction('sodateru-building', { type: 'click', target: { featuresetId: 'buildings', importId: 'basemap' }, handler: event => {
        if (latest.current.placement || !event.feature) return;
        if (selectedBuilding) map.setFeatureState(selectedBuilding, { select: false });
        selectedBuilding = event.feature; map.setFeatureState(event.feature, { select: true });
        const coordinates = featureCenter(event.feature, [event.lngLat.lng, event.lngLat.lat]);
        const featureId = String(event.feature.id ?? '');
        const buildingKey = featureId ? `mapbox:basemap:buildings:${event.feature.namespace ?? ''}:${featureId}` : undefined;
        latest.current.onSelect?.({ ownerKey: 'map-building', kind: 'building', id: buildingKey || coordinates.join(','), coordinates, buildingKey, height: typeof event.feature.properties.height === 'number' ? event.feature.properties.height : undefined });
      } });
      map.addInteraction('sodateru-poi', { type: 'click', target: { featuresetId: 'poi', importId: 'basemap' }, handler: event => {
        if (latest.current.placement || !event.feature) return;
        latest.current.onSelect?.({ ownerKey: 'map-poi', kind: 'poi', id: String(event.feature.id ?? ''), coordinates: featureCenter(event.feature, [event.lngLat.lng, event.lngLat.lat]), label: String(event.feature.properties.name ?? '') });
      } });
    });
    const observer = new ResizeObserver(() => map.resize()); observer.observe(container.current);
    return () => { observer.disconnect(); map.remove(); mapRef.current = null; };
  }, [retry]);

  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    const camera = props.camera;
    const current = readCamera(map);
    const pitch = props.view.dimension === '2d' ? 0 : camera.pitch;
    if (Math.abs(current.longitude - camera.longitude) > 0.000001 || Math.abs(current.latitude - camera.latitude) > 0.000001 || Math.abs(current.zoom - camera.zoom) > 0.001 || Math.abs(current.bearing - camera.bearing) > 0.01 || Math.abs(current.pitch - pitch) > 0.01) {
      suppressCamera.current = true;
      try { map.easeTo({ center: [camera.longitude, camera.latitude], zoom: camera.zoom, bearing: camera.bearing, pitch, duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 420 }); }
      finally { suppressCamera.current = false; }
    }
  }, [props.camera, props.view.dimension, ready]);

  useEffect(() => {
    const map = mapRef.current; if (!map || !ready) return;
    const current = map.getPadding();
    if (current.top !== props.padding.top || current.right !== props.padding.right || current.bottom !== props.padding.bottom || current.left !== props.padding.left) map.setPadding(props.padding);
  }, [props.padding.top, props.padding.right, props.padding.bottom, props.padding.left, ready]);
  useEffect(() => {
    const map = mapRef.current, focus = props.focus;
    if (!map || !ready || !focus) return;
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 450;
    const pitch = latest.current.view.dimension === '2d' ? 0 : latest.current.camera.pitch, bearing = latest.current.camera.bearing;
    suppressCamera.current = true;
    try {
      if (focus.bounds) map.fitBounds(focus.bounds, { padding: focus.padding || props.padding, maxZoom: focus.zoom ?? 16, pitch, bearing, duration });
      else if (focus.center) map.easeTo({ center: focus.center, zoom: focus.zoom ?? Math.min(16, Math.max(map.getZoom(), 14)), padding: focus.padding || props.padding, pitch, bearing, duration });
    } finally { suppressCamera.current = false; }
  }, [props.focus?.revision, ready]);
  useEffect(() => {
    const map = mapRef.current; if (!map || !ready) return;
    map.setConfigProperty('basemap', 'show3dObjects', props.view.dimension === '3d');
    map.setConfigProperty('basemap', 'theme', props.view.lens === 'personal' ? 'faded' : 'default');
    map.setConfigProperty('basemap', 'lightPreset', props.view.lightPreset);
  }, [props.view.dimension, props.view.lens, props.view.lightPreset, ready]);

  useEffect(() => {
    const map = mapRef.current; if (!map || !ready) return;
    const markers = props.points.map(point => {
      const element = pointElement(point);
      if (props.interactive !== false) element.addEventListener('click', event => { event.stopPropagation(); latest.current.onSelect?.({ ownerKey: point.ownerKey, kind: point.kind || 'candidate', id: point.id, coordinates: point.coordinates, label: point.label }); });
      const marker = new mapboxgl.Marker({ element, anchor: 'bottom', offset: [0, -3] }).setLngLat(point.coordinates).addTo(map);
      element.setAttribute('role', props.interactive === false ? 'img' : 'button');
      element.disabled = props.interactive === false;
      element.tabIndex = props.interactive === false ? -1 : 0;
      return marker;
    });
    return () => markers.forEach(marker => marker.remove());
  }, [props.points, ready]);

  useEffect(() => {
    const source = mapRef.current?.getSource('sodateru-radius') as GeoJSONSource | undefined;
    if (!source || !ready) return;
    const radius = props.radius;
    if (!radius || !Number.isFinite(radius.meters) || radius.meters <= 0) { source.setData({ type: 'FeatureCollection', features: [] }); return; }
    const rad = Math.PI / 180, lat = radius.center[1] * rad, lng = radius.center[0] * rad, distance = radius.meters / 6371008.8;
    const ring = Array.from({ length: 97 }, (_, i) => {
      const bearing = i / 96 * Math.PI * 2;
      const latitude = Math.asin(Math.sin(lat) * Math.cos(distance) + Math.cos(lat) * Math.sin(distance) * Math.cos(bearing));
      const longitude = lng + Math.atan2(Math.sin(bearing) * Math.sin(distance) * Math.cos(lat), Math.cos(distance) - Math.sin(lat) * Math.sin(latitude));
      return [longitude / rad, latitude / rad];
    });
    source.setData({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } });
  }, [props.radius?.center[0], props.radius?.center[1], props.radius?.meters, ready]);

  useEffect(() => {
    const source = mapRef.current?.getSource('sodateru-routes') as GeoJSONSource | undefined;
    if (!source || !ready) return;
    source.setData({ type: 'FeatureCollection', features: props.lines.filter(line => line.coordinates.length >= 2).map(line => ({ type: 'Feature', id: `${line.ownerKey}:${line.id}`, properties: { ownerKey: line.ownerKey, lineId: line.id, color: line.color || '#319d9e', selected: !!line.selected }, geometry: { type: 'LineString', coordinates: line.coordinates } })) });
  }, [props.lines, ready]);

  return <div className="map-scene" aria-label={props.label || '地図'}>
    <div ref={container} className="map-scene-canvas" />
    {loading && <div className="map-scene-message" role="status">地図を読み込み中…</div>}
    {error && <div className="map-scene-message is-error" role="alert"><span>{error}</span><button type="button" onClick={() => setRetry(value => value + 1)}>地図を再読み込み</button></div>}
    {props.placement && <div className="map-placement-target" aria-label="中央の配置点"><span>この場所に置きます</span><i aria-hidden="true" /></div>}
    <div className="map-scene-summary" aria-live="polite">{props.points.find(point => point.selected)?.label || `${props.points.length}件の地点`}{props.lines.length > 0 ? `、${props.lines.length}件の経路` : ''}</div>
  </div>;
}
