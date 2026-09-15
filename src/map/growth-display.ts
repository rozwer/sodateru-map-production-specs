import mapboxgl, { type GeoJSONSource, type TargetFeature } from 'mapbox-gl';
import type { GrowthItem } from '../../packages/api-client/index';

export type GrowthDisplay = GrowthItem;
type Polygon = { type: 'Polygon'; coordinates: number[][][] } | { type: 'MultiPolygon'; coordinates: number[][][][] };
const colors = ['#6cae9c', '#c6a365', '#759bbd', '#ad92bd', '#d39b9d'];
export const buildingIdentity = (feature: TargetFeature) => feature.id == null ? null : `mapbox:basemap:buildings:${feature.namespace ?? ''}:${feature.id}`;
function insideRing(point: [number, number], ring: number[][]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j]; if (!a || !b) continue;
    const [ax, ay] = a, [bx, by] = b; if (ax === undefined || ay === undefined || bx === undefined || by === undefined) continue;
    if ((ay > point[1]) !== (by > point[1]) && point[0] < (bx - ax) * (point[1] - ay) / (by - ay) + ax) inside = !inside;
  }
  return inside;
}
function contains(point: [number, number], geometry: Polygon) {
  return (geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates).some(rings => !!rings[0] && insideRing(point, rings[0]) && !rings.slice(1).some(ring => insideRing(point, ring)));
}

/** Draw only provider building geometry. Missing geometry never becomes an invented building. */
export function attachGrowth(map: mapboxgl.Map, items: GrowthDisplay[], onSelect: (item: GrowthDisplay) => void, interactive: boolean) {
  let markers: mapboxgl.Marker[] = [], previous = '';
  const update = () => {
    const source = map.getSource('sodateru-growth') as GeoJSONSource | undefined;
    if (!source || !map.isStyleLoaded()) return;
    const buildings = map.queryRenderedFeatures({ target: { featuresetId: 'buildings', importId: 'basemap' } });
    const resolved = items.flatMap(item => {
      // stage belongs to ACTIVITY's current response. The UI never derives visit thresholds.
      const stage = 'stage' in item && typeof item.stage === 'number' ? item.stage : null;
      if (stage === null || stage < 1 || stage > 3 || !item.confirmedVisitCount) return [];
      const feature = buildings.find(feature => item.place.buildingKey && buildingIdentity(feature) === item.place.buildingKey) || buildings.find(feature => (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') && contains(item.place.coordinates, feature.geometry as Polygon));
      if (!feature || (feature.geometry.type !== 'Polygon' && feature.geometry.type !== 'MultiPolygon')) return [];
      const height = typeof feature.properties.height === 'number' ? feature.properties.height : null;
      if (height === null) return [];
      return [{ item, stage, feature, height, base: typeof feature.properties.min_height === 'number' ? feature.properties.min_height : 0 }];
    });
    const signature = JSON.stringify(resolved.map(({ item, stage, feature, height }) => [item.place.id, buildingIdentity(feature), feature.geometry, stage, height, item.purposes]));
    if (previous === signature) return; previous = signature;
    markers.forEach(marker => marker.remove()); markers = [];
    source.setData({ type: 'FeatureCollection', features: resolved.map(({ item, stage, feature, height, base }) => {
      const hash = Array.from(item.purposes.join('|')).reduce((value, char) => (value + (char.codePointAt(0) || 0)) % colors.length, 0);
      return { type: 'Feature', id: item.place.id, geometry: feature.geometry as Polygon, properties: { height, base, color: colors[hash], stage } };
    }) });
    for (const { item, stage, height } of resolved) {
      const element = document.createElement('button'); element.type = 'button'; element.className = 'map-growth-badge'; element.dataset.stage = String(stage);
      element.setAttribute('aria-label', `${item.place.name}、成長${stage}、${item.purposes.join('・') || '用途未記入'}、確認済み訪問${item.confirmedVisitCount}回`);
      const stages = document.createElement('span'); stages.className = 'map-growth-stage'; stages.textContent = '▰'.repeat(stage); stages.setAttribute('aria-hidden', 'true'); element.append(stages);
      if (item.purposes.length) { const label = document.createElement('span'); label.textContent = item.purposes.join('・'); element.append(label); }
      if (interactive) element.addEventListener('click', event => { event.stopPropagation(); onSelect(item); });
      const marker = new mapboxgl.Marker({ element, altitude: height, anchor: 'bottom', offset: [0, -3] }).setLngLat(item.place.coordinates).addTo(map);
      element.setAttribute('role', interactive ? 'button' : 'img'); element.disabled = !interactive; element.tabIndex = interactive ? 0 : -1; markers.push(marker);
    }
  };
  map.on('idle', update); update();
  return () => { map.off('idle', update); markers.forEach(marker => marker.remove()); const source = map.getSource('sodateru-growth') as GeoJSONSource | undefined; source?.setData({ type: 'FeatureCollection', features: [] }); };
}
