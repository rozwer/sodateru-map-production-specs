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

test('long real-route geometry does not exhaust explanation input while measured evidence survives',()=>{
  const geometry={type:'LineString',coordinates:Array.from({length:12000},(_,i)=>[136+i/100000,35+i/100000])};
  const routeEvidence={previewId:'preview',provider:'mapbox-directions',mode:'walking',durationSec:1200,distanceM:1500,fetchedAt:now,expiresAt:now+900000,retention:'storable',geometry,legs:[{geometry,steps:[{geometry}]}]};
  const candidate={placeId:'park',name:'白川公園',travelMinutes:20,stay:null,sourceRefs:[{type:'place',id:'park',version:3}],routeEvidence};
  const before=JSON.stringify(candidate);
  assert.ok(Buffer.byteLength(before)>128*1024);
  const prompt=generation.explanationPrompt({wishes:['公園']},[candidate],[]);
  assert.ok(Buffer.byteLength(prompt)<8000);
  const payload=JSON.parse(prompt.split('source_payload=')[1]);
  assert.equal(payload.candidates[0].routeEvidence.durationSec,1200);
  assert.equal(payload.candidates[0].routeEvidence.provider,'mapbox-directions');
  assert.deepEqual(payload.candidates[0].sourceRefs,candidate.sourceRefs);
  assert.equal(payload.candidates[0].stay,null);
  assert.equal(JSON.stringify(candidate),before);
});
