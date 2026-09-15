import test from 'node:test';
import assert from 'node:assert/strict';
const generation=await import('./generation.mjs').catch(()=>({}));
const now=Date.parse('2026-09-15T03:00:00Z');
test('stay estimates use confirmed same-place visits and retain their evidence',()=>{
  assert.equal(typeof generation.evidencedStay,'function');
  const record={place:{id:'p'},visitStatus:'confirmed',effectiveAt:now-3600000,endedAt:now-1800000,sourceRefs:[{type:'visit',id:'v',version:2}],useForSuggestions:true};
  const stay=generation.evidencedStay('p',{},[record,{...record,visitStatus:'rejected',endedAt:now}],now);
  assert.equal(stay.minutes,30);
  assert.deepEqual(stay.sourceRefs,record.sourceRefs);
  assert.equal(generation.evidencedStay('other',{},[record],now),null);
  assert.equal(generation.evidencedStay('p',{stayMinutes:20},[],now).kind,'user');
});
test('AI output cannot add a place, a wish, or fabricated source IDs',()=>{
  assert.equal(typeof generation.validateExplanation,'function');
  const input=[{placeId:'p',sourceRefs:[{type:'place',id:'p',version:1}]}];
  const output={candidates:[{placeId:'p',activity:'walk',reason:'A park',matchedWishes:['nature'],unknowns:[]}]};
  assert.equal(generation.validateExplanation(output,input,['nature']).candidates.length,1);
  assert.throws(()=>generation.validateExplanation({...output,candidates:[{...output.candidates[0],placeId:'invented'}]},input,['nature']),{code:'OUTPUT_INVALID'});
  assert.throws(()=>generation.validateExplanation({...output,candidates:[{...output.candidates[0],matchedWishes:['shopping']}]},input,['nature']),{code:'OUTPUT_INVALID'});
});
