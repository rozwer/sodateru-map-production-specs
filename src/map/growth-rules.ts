import type { GrowthItem, Place, SourceRef } from '../../packages/api-client/index';

export const UNVISITED_COLOR = '#D8D8D6';
export const PURPOSE_COLORS = [
  { label: '食事・カフェ', color: '#E8AE79', values: ['食事・カフェ', '食事', 'カフェ', '飲食', '喫茶'] },
  { label: '休憩', color: '#9CBD9A', values: ['休憩', '休息'] },
  { label: '散歩・運動', color: '#82BDB4', values: ['散歩・運動', '散歩', '運動'] },
  { label: '学び・読書', color: '#92AED1', values: ['学び・読書', '学び', '読書', '学習'] },
  { label: '買い物', color: '#D9A0B6', values: ['買い物'] },
  { label: '交流', color: '#B3A0CE', values: ['交流', '会話'] },
] as const;
export function representativePurpose(purposes: readonly string[]) {
  return PURPOSE_COLORS.find(category => category.values.some(value => purposes.includes(value))) ?? { label: '用途不明', color: '#ADB9C7' };
}
export const growthStage = (count: number) => count >= 5 ? 3 : count >= 2 ? 2 : count > 0 ? 1 : 0;
export function growthColor(purposes: readonly string[], count: number) {
  const ratio = [0, .4, .65, .85][growthStage(count)]!;
  const color = representativePurpose(purposes).color;
  return '#' + [1, 3, 5].map(start => Math.round(parseInt(UNVISITED_COLOR.slice(start, start + 2), 16) * (1 - ratio) + parseInt(color.slice(start, start + 2), 16) * ratio).toString(16).padStart(2, '0')).join('');
}
export type BuildingPolygon = { type: 'Polygon'; coordinates: number[][][] } | { type: 'MultiPolygon'; coordinates: number[][][][] };
export type Building = { key: string; geometry: BuildingPolygon; height: number; base: number };
function insideRing(point: [number, number], ring: number[][]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j]; if (!a || !b) continue;
    const [ax, ay] = a, [bx, by] = b;
    if (ax === undefined || ay === undefined || bx === undefined || by === undefined) continue;
    if ((ay > point[1]) !== (by > point[1]) && point[0] < (bx - ax) * (point[1] - ay) / (by - ay) + ax) inside = !inside;
  }
  return inside;
}
export function contains(point: [number, number], geometry: BuildingPolygon) {
  return (geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates).some(rings => !!rings[0] && insideRing(point, rings[0]) && !rings.slice(1).some(ring => insideRing(point, ring)));
}
export function buildingCandidates(place: Pick<Place, 'coordinates' | 'buildingKey'>, buildings: readonly Building[]) {
  return place.buildingKey ? buildings.filter(building => building.key === place.buildingKey) : buildings.filter(building => contains(place.coordinates, building.geometry));
}
export type BuildingGrowth = { building: Building; items: GrowthItem[]; visits: SourceRef[]; purposes: string[]; count: number; stage: number; color: string };
export function aggregateBuildings(items: readonly GrowthItem[], buildings: readonly Building[]): BuildingGrowth[] {
  const grouped = new Map<string, { building: Building; items: GrowthItem[] }>();
  for (const item of items) {
    if (item.confirmedVisitCount <= 0) continue;
    const candidates = buildingCandidates(item.place, buildings);
    // Explicit missing keys never fall back; overlapping candidates need a person's choice.
    if (candidates.length !== 1) continue;
    const building = candidates[0]!;
    const group = grouped.get(building.key) ?? { building, items: [] };
    if (!group.items.some(existing => existing.place.id === item.place.id)) group.items.push(item);
    grouped.set(building.key, group);
  }
  return [...grouped.values()].map(group => {
    const refs = new Map<string, SourceRef>();
    for (const item of group.items) for (const ref of item.sourceRefs) if (ref.type === 'visit') {
      const prior = refs.get(ref.id); if (!prior || prior.version < ref.version) refs.set(ref.id, ref);
    }
    const visits = [...refs.values()].sort((a, b) => a.id.localeCompare(b.id));
    const purposes = [...new Set(group.items.flatMap(item => item.purposes))].sort();
    const count = visits.length;
    return { ...group, items: group.items.sort((a, b) => a.place.id.localeCompare(b.place.id)), visits, purposes, count, stage: growthStage(count), color: growthColor(purposes, count) };
  }).filter(group => group.count > 0).sort((a, b) => a.building.key.localeCompare(b.building.key));
}
