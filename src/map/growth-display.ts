import mapboxgl, { type GeoJSONSource, type TargetFeature } from 'mapbox-gl';
import type { GrowthItem } from '../../packages/api-client/index';
import { aggregateBuildings, type Building, type BuildingGrowth } from './growth-rules';

export type GrowthDisplay = GrowthItem;
// Standard namespace identifies the underlying building source/layer; retain the shipped key format.
export const buildingIdentity = (feature: TargetFeature) => feature.id == null ? null : `mapbox:basemap:buildings:${feature.namespace ?? ''}:${feature.id}`;

const AMBIENT_COLORS = ['#ff9d66', '#63d4bd', '#f47fa8', '#9294ef', '#f4cf58', '#65b9ee', '#b88ae0'];
function buildingCenter(building: Building): [number, number] {
  const ring = building.geometry.type === 'Polygon' ? building.geometry.coordinates[0] : building.geometry.coordinates[0]?.[0];
  if (!ring?.length) return [0, 0];
  let longitude = 0, latitude = 0;
  for (const point of ring) { longitude += point[0] ?? 0; latitude += point[1] ?? 0; }
  return [longitude / ring.length, latitude / ring.length];
}
function distance(a: [number, number], b: [number, number]) {
  const x = (a[0] - b[0]) * Math.cos((a[1] + b[1]) * Math.PI / 360);
  const y = a[1] - b[1];
  return Math.hypot(x, y) * 111_320;
}
function ambientColor(key: string) {
  let hash = 0;
  for (const character of key) hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0;
  return AMBIENT_COLORS[Math.abs(hash) % AMBIENT_COLORS.length]!;
}

/** Keep provider geometry across viewport changes. The API snapshot alone controls growth. */
export function attachGrowth(map: mapboxgl.Map, getItems: () => GrowthDisplay[], onSelect: (group: BuildingGrowth) => void, onBuildings: (buildings: Building[]) => void, interactive: boolean) {
  let markers: mapboxgl.Marker[] = [], previous = '', catalogSignature = '', playbackTimers: ReturnType<typeof setTimeout>[] = [], revealed: Set<string> | null = null;
  const catalog = new Map<string, Building>();
  const targets = new Map<string, TargetFeature>();
  const applied = new Map<string, string | null>();
  const render = () => {
    const source = map.getSource('sodateru-growth') as GeoJSONSource | undefined;
    if (!source || !map.isStyleLoaded()) return;
    const center: [number, number] = [map.getCenter().lng, map.getCenter().lat];
    const buildings = [...catalog.values()].sort((a, b) => distance(buildingCenter(a), center) - distance(buildingCenter(b), center));
    const groups = aggregateBuildings(getItems(), [...catalog.values()]);
    const confirmed = new Map(groups.map(group => [group.building.key, group]));
    const visibleBuildings = revealed ? buildings.filter(building => revealed!.has(building.key)) : buildings;
    const visibleGroups = revealed ? groups.filter(group => revealed!.has(group.building.key)) : groups;
    const features = visibleBuildings.map(building => {
      const group = confirmed.get(building.key);
      return { type: 'Feature' as const, id: building.key, geometry: building.geometry, properties: { buildingKey: building.key, height: building.height, base: building.base, color: group?.color ?? ambientColor(building.key), opacity: group ? 1 : 0.72, stage: group?.stage ?? 0, count: group?.count ?? 0, ambient: !group } };
    });
    // A confirmed building can be just outside the nearest ambient catalog slice; never hide it.
    for (const group of visibleGroups) if (!features.some(feature => feature.id === group.building.key)) features.push({ type: 'Feature', id: group.building.key, geometry: group.building.geometry, properties: { buildingKey: group.building.key, height: group.building.height, base: group.building.base, color: group.color, opacity: 1, stage: group.stage, count: group.count, ambient: false } });
    const colors = new Map(features.map(feature => [String(feature.id), feature.properties.color]));
    for (const [key, target] of targets) {
      const color = colors.get(key) ?? (revealed ? null : ambientColor(key));
      if (applied.get(key) !== color) { map.setFeatureState(target, { sodateruColor: color }); applied.set(key, color); }
    }
    const signature = JSON.stringify(features.map(feature => feature.properties));
    if (previous === signature) return; previous = signature;
    source.setData({ type: 'FeatureCollection', features });
    markers.forEach(marker => marker.remove()); markers = [];
    for (const group of visibleGroups) {
      const item = group.items[0]!;
      const element = document.createElement('button'); element.type = 'button'; element.className = 'map-growth-badge'; element.dataset.stage = String(group.stage); element.dataset.buildingKey = group.building.key; element.dataset.buildingHeight = String(group.building.height); element.dataset.growthColor = group.color;
      element.setAttribute('aria-label', `${group.items.map(item => item.place.name).join('・')}、確認済み訪問${group.count}回、${group.purposes.join('・') || '用途不明'}`);
      const text = document.createElement('span'); text.textContent = `${group.count}回 · ${group.purposes.join('・') || '用途不明'}`; element.append(text);
      if (interactive) element.addEventListener('click', event => { event.stopPropagation(); onSelect(group); });
      const marker = new mapboxgl.Marker({ element, altitude: group.building.height, anchor: 'bottom', offset: [0, -3] }).setLngLat(item.place.coordinates).addTo(map);
      element.setAttribute('role', interactive ? 'button' : 'img'); element.disabled = !interactive; element.tabIndex = interactive ? 0 : -1; markers.push(marker);
    }
  };
  const update = () => {
    const source = map.getSource('sodateru-growth') as GeoJSONSource | undefined;
    if (!source || !map.isStyleLoaded()) return;
    const features = map.queryRenderedFeatures({ target: { featuresetId: 'buildings', importId: 'basemap' } });
    for (const feature of features) {
      const key = buildingIdentity(feature);
      if (!key || (feature.geometry.type !== 'Polygon' && feature.geometry.type !== 'MultiPolygon')) continue;
      targets.set(key, feature);
      const height = feature.properties.height;
      if (typeof height !== 'number' || !Number.isFinite(height)) continue;
      const candidate: Building = { key, geometry: feature.geometry, height, base: typeof feature.properties.min_height === 'number' ? feature.properties.min_height : 0 };
      // A zoomed tile can clip a polygon; never replace already observed full geometry with a smaller fragment.
      const old = catalog.get(key);
      catalog.set(key, { ...candidate, geometry: old && JSON.stringify(old.geometry).length > JSON.stringify(candidate.geometry).length ? old.geometry : candidate.geometry, height: Math.max(old?.height ?? 0, candidate.height), base: candidate.height >= (old?.height ?? 0) ? candidate.base : old!.base });
    }
    const buildings = [...catalog.values()];
    const catalogKey = JSON.stringify(buildings);
    if (catalogKey !== catalogSignature) { catalogSignature = catalogKey; onBuildings(buildings); }
    render();
  };
  const play = (requested: [number, number][]) => {
    playbackTimers.forEach(clearTimeout); playbackTimers = [];
    const fallback = getItems().map(item => item.place.coordinates);
    const raw = requested.length ? requested : fallback;
    if (!raw.length) return;
    const step = Math.max(1, Math.floor(raw.length / 12));
    const path = raw.filter((_, index) => index % step === 0).slice(0, 12);
    if (path[path.length - 1] !== raw[raw.length - 1]) path.push(raw[raw.length - 1]!);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { revealed = null; previous = ''; render(); return; }
    revealed = new Set(); previous = ''; render();
    path.forEach((point, index) => playbackTimers.push(setTimeout(() => {
      const nearest = [...catalog.values()].sort((a, b) => distance(buildingCenter(a), point) - distance(buildingCenter(b), point)).slice(0, 18);
      nearest.forEach(building => revealed?.add(building.key));
      map.easeTo({ center: point, zoom: Math.max(map.getZoom(), 16), pitch: 55, duration: 620 });
      previous = ''; render();
      if (index === path.length - 1) playbackTimers.push(setTimeout(() => { revealed = null; previous = ''; render(); }, 700));
    }, index * 620)));
  };
  map.on('idle', update); update();
  return { update, play, dispose: () => { map.off('idle', update); playbackTimers.forEach(clearTimeout); markers.forEach(marker => marker.remove()); } };
}
