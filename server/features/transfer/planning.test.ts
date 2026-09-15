import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateProposal, materializePlans } from './planning.ts';
import type { Candidate, Recipe, ModelResult } from './types.ts';

const recipe: Recipe = { id: 'r', title: '散策と休憩', meaning: '緑の後に休む',
  sourceRefs: [{ type: 'record', id: 'rec', version: 1 }],
  steps: [{ id: 'walk', meaning: '散策', sourceRecordIds: ['rec'], required: true, stayMinutes: 20 }, { id: 'rest', meaning: '休憩', sourceRecordIds: ['rec'], required: true, stayMinutes: 30 }],
  requiredConditions: [], allowedChanges: ['飲み物'], version: 1, createdAt: 1, updatedAt: 1 };
const candidates: Candidate[] = [
  { placeId: 'park', name: '公園', version: 1, position: { longitude: 139, latitude: 35 }, stepIds: ['walk'] },
  { placeId: 'cafe', name: '喫茶店', version: 1, position: { longitude: 139.01, latitude: 35 }, stepIds: ['rest'] },
];
const result: ModelResult = { plans: ['faithful','personalized'].map(variant => ({ variant: variant as 'faithful'|'personalized',
  steps: [{ stepId: 'walk', placeId: 'park', explanation: '緑を歩く', evidenceIds: ['src_1'] }, { stepId: 'rest', placeId: 'cafe', explanation: '静かに休む', evidenceIds: ['src_1'] }],
  explanation: '元体験の順序を維持', conditionChecks: [], unmetConditions: [], unknowns: [] })), commonalities: ['散策の後に休憩'], differences: ['今回の候補では同じ地点列'] };
const evidence = [{ id: 'src_1', sourceRef: recipe.sourceRefs[0]! }];

test('model cannot introduce a place, reorder source steps, invent evidence or omit a variant', () => {
  assert.deepEqual(validateProposal(result, recipe, candidates, evidence), result);
  for (const change of [
    (r: ModelResult) => { r.plans[0]!.steps[0]!.placeId = 'invented'; },
    (r: ModelResult) => { r.plans[0]!.steps.reverse(); },
    (r: ModelResult) => { r.plans[0]!.steps[0]!.evidenceIds = ['fabricated']; },
    (r: ModelResult) => { r.plans.pop(); },
  ]) {
    const bad = structuredClone(result); change(bad);
    assert.throws(() => validateProposal(bad, recipe, candidates, evidence), { code: 'OUTPUT_INVALID' });
  }
});

test('route time plus stay determines budget, and an unavailable required step stays incomplete', async () => {
  const route = { id: 'preview', durationSeconds: 1200, distanceMeters: 1300, expiresAt: Date.now()+60000, sourceRefs: [] };
  const plans = await materializePlans(result, recipe, 60, async () => route);
  assert.equal(plans[0]!.totalMinutes, 70);
  assert.equal(plans[0]!.eligible, false);
  assert.ok(plans[0]!.unmetConditions.some(s => s.includes('60')));
  const missing = structuredClone(result); missing.plans[0]!.steps[0]!.placeId = null;
  const partial = await materializePlans(missing, recipe, 100, async () => route);
  assert.equal(partial[0]!.eligible, false);
  assert.equal(partial[0]!.route, null);
  assert.equal(partial[1]!.eligible, true);
});

test('an unchecked required condition cannot become an adoptable plan', () => {
  const required = { ...recipe, requiredConditions:['静かな場所'] };
  assert.throws(() => validateProposal(result, required, candidates, evidence), { code:'OUTPUT_INVALID' });
  const fabricated=structuredClone(result);
  for(const plan of fabricated.plans)plan.conditionChecks=[{condition:'静かな場所',status:'satisfied',explanation:'静か',evidenceIds:['src_1']}];
  assert.throws(() => validateProposal(fabricated, required, candidates, evidence), { code:'OUTPUT_INVALID' });
  for(const plan of fabricated.plans)plan.conditionChecks[0]!.evidenceIds=['old_place'];
  assert.throws(() => validateProposal(fabricated, required, candidates, [...evidence,{id:'old_place',sourceRef:{type:'place',id:'original-place',version:1}}]), { code:'OUTPUT_INVALID' });
});
