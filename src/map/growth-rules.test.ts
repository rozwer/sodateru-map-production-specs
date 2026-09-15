import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aggregateBuildings, buildingCandidates, growthColor, growthStage, representativePurpose, type Building } from './growth-rules.ts';
import type { GrowthItem } from '../../packages/api-client/index.ts';
const building: Building = { key: 'mapbox:basemap:buildings:source-layer:123', geometry: { type: 'Polygon', coordinates: [[[0,0],[2,0],[2,2],[0,2],[0,0]]] }, height: 12, base: 0 };
const item = (id: string, visitId = id): GrowthItem => ({ place: { id, name: id, address: null, coordinates: [1,1], categories: [], provider: 'manual', externalId: null, buildingKey: null, sourceUrl: null, attribution: '', fetchedAt: null, version: 1, createdAt: 0, updatedAt: 0 }, confirmedVisitCount: 1, purposes: ['読書'], sourceRefs: [{type:'visit',id:visitId,version:1}], stage: 1 });
test('fixed purpose priority, exact text matching and the specified intensity thresholds', () => {
  assert.equal(representativePurpose(['読書','食事']).label, '食事・カフェ');
  assert.equal(representativePurpose(['食事について考えた']).label, '用途不明');
  assert.equal(growthColor(['食事'],0), '#d8d8d6');
  assert.equal(growthColor(['食事'],1), '#dec7b1');
  assert.deepEqual([0,1,2,4,5].map(growthStage),[0,1,2,2,3]);
  assert.equal(growthColor(['読書','食事'],2), growthColor(['食事','読書'],2));
});
test('confirmed evidence aggregates tenants once per visit and rollback removes old color', () => {
  const a=item('a','same'), b=item('b','same'); b.purposes=['食事'];
  const group=aggregateBuildings([a,b], [building])[0]!;
  assert.equal(group.count,1); assert.equal(group.items.length,2); assert.deepEqual(group.purposes,['読書','食事']);
  assert.equal(aggregateBuildings([{...a,confirmedVisitCount:0}], [building]).length,0);
  assert.equal(aggregateBuildings([], [building]).length,0);
  assert.equal(group.building.height,12);
});
test('explicit missing key cannot snap to a different containing polygon; ambiguity and holes remain unmapped', () => {
  const a=item('a'); a.place.buildingKey='missing';
  assert.equal(buildingCandidates(a.place,[building]).length,0);
  a.place.buildingKey=null;
  assert.equal(aggregateBuildings([a], [building,{...building,key:'other'}]).length,0);
  assert.equal(aggregateBuildings([a], [{...building,geometry:{type:'Polygon',coordinates:[building.geometry.coordinates[0] as number[][],[[.5,.5],[1.5,.5],[1.5,1.5],[.5,1.5],[.5,.5]]]}}]).length,0);
  a.place.buildingKey=building.key;
  assert.equal(aggregateBuildings([a], [building,{...building,key:'other'}]).length,1);
  a.place.buildingKey='other';
  assert.equal(aggregateBuildings([a], [building,{...building,key:'other'}])[0]!.building.key,'other');
});
