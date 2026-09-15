import mapboxgl, { type GeoJSONSource, type TargetFeature } from 'mapbox-gl';
import type { GrowthItem } from '../../packages/api-client/index';
import { aggregateBuildings, type Building, type BuildingGrowth } from './growth-rules';

export type GrowthDisplay = GrowthItem;
// Standard namespace identifies the underlying building source/layer; retain the shipped key format.
export const buildingIdentity = (feature: TargetFeature) => feature.id == null ? null : `mapbox:basemap:buildings:${feature.namespace ?? ''}:${feature.id}`;

/** Keep provider geometry across viewport changes. The API snapshot alone controls growth. */
export function attachGrowth(map: mapboxgl.Map, getItems: () => GrowthDisplay[], onSelect: (group: BuildingGrowth) => void, onBuildings: (buildings: Building[]) => void, interactive: boolean) {
  let markers: mapboxgl.Marker[] = [], previous = '', catalogSignature = '';
  const catalog = new Map<string, Building>();
  const update = () => {
    const source = map.getSource('sodateru-growth') as GeoJSONSource | undefined;
    if (!source || !map.isStyleLoaded()) return;
    const features = map.queryRenderedFeatures({ target: { featuresetId: 'buildings', importId: 'basemap' } });
    for (const feature of features) {
      const key = buildingIdentity(feature);
      if (!key || (feature.geometry.type !== 'Polygon' && feature.geometry.type !== 'MultiPolygon')) continue;
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
    const groups = aggregateBuildings(getItems(), buildings);
    const signature = JSON.stringify(groups);
    if (previous === signature) return; previous = signature;
    markers.forEach(marker => marker.remove()); markers = [];
    source.setData({ type: 'FeatureCollection', features: groups.map(group => ({ type: 'Feature', id: group.building.key, geometry: group.building.geometry, properties: { buildingKey: group.building.key, height: group.building.height, base: group.building.base, color: group.color, stage: group.stage, count: group.count } })) });
    for (const group of groups) {
      const item = group.items[0]!;
      const element = document.createElement('button'); element.type = 'button'; element.className = 'map-growth-badge'; element.dataset.stage = String(group.stage); element.dataset.buildingKey = group.building.key; element.dataset.buildingHeight = String(group.building.height); element.dataset.growthColor = group.color;
      element.setAttribute('aria-label', `${group.items.map(item => item.place.name).join('・')}、確認済み訪問${group.count}回、${group.purposes.join('・') || '用途不明'}`);
      const text = document.createElement('span'); text.textContent = `${group.count}回 · ${group.purposes.join('・') || '用途不明'}`; element.append(text);
      if (interactive) element.addEventListener('click', event => { event.stopPropagation(); onSelect(group); });
      const marker = new mapboxgl.Marker({ element, altitude: group.building.height, anchor: 'bottom', offset: [0, -3] }).setLngLat(item.place.coordinates).addTo(map);
      element.setAttribute('role', interactive ? 'button' : 'img'); element.disabled = !interactive; element.tabIndex = interactive ? 0 : -1; markers.push(marker);
    }
  };
  map.on('idle', update); update();
  return { update, dispose: () => { map.off('idle', update); markers.forEach(marker => marker.remove()); } };
}
