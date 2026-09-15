import test from 'node:test';
import assert from 'node:assert/strict';
const domain = await import('./domain.mjs').catch(() => ({}));
const now = Date.parse('2026-09-15T03:00:00Z');
const candidate = (id, travel, stay) => ({placeId:id, activity:'walk', wishes:['nature'], travelMinutes:travel, stay:{minutes:stay,kind:'user',checkedAt:now}, evaluations:[], expiresAt:now+3600000});

test('exact budgets use real travel plus evidenced stay; atLeast has no 120 minute ceiling', () => {
  assert.equal(typeof domain.rankCandidates, 'function', 'candidate evaluation is implemented');
  const items=[candidate('a',15,30),candidate('b',15,60),candidate('c',60,90)];
  const exact=domain.rankCandidates(items,{timeBudget:{kind:'exact',minutes:60},wishes:['nature']},now);
  assert.deepEqual(exact.map(x=>x.placeId),['a']);
  assert.equal(exact[0].totalMinutes,45);
  const atLeast=domain.rankCandidates(items,{timeBudget:{kind:'atLeast',minutes:120}},now);
  assert.equal(atLeast.length,3);
  assert.equal(atLeast[2].totalMinutes,150);
  assert.equal(atLeast[2].evaluations.find(e=>e.key==='timeBudget').status,'unknown');
});
test('missing evidence is unknown and current wishes rank ahead of habits', () => {
  assert.equal(typeof domain.rankCandidates,'function');
  const unknown={...candidate('unknown',15,30),stay:null};
  const desired={...candidate('desired',20,30),wishes:['nature']};
  const habit={...candidate('habit',5,10),wishes:['shopping'],habitScore:100};
  const result=domain.rankCandidates([habit,unknown,desired],{timeBudget:{kind:'exact',minutes:60},wishes:['nature']},now);
  assert.equal(result[0].placeId,'desired');
  assert.equal(result.find(x=>x.placeId==='unknown').totalMinutes,null);
  assert.equal(result.find(x=>x.placeId==='unknown').evaluations.find(e=>e.key==='timeBudget').status,'unknown');
});
test('conditions retain independent controls and reject contradictory legacy time', () => {
  assert.equal(typeof domain.normalizeConditions,'function');
  assert.deepEqual(domain.normalizeConditions({timeBudget:{kind:'atLeast',minutes:120},mode:'any',companion:'pet',effort:'easy'}).timeBudget,{kind:'atLeast',minutes:120});
  assert.throws(()=>domain.normalizeConditions({minutes:60,timeBudget:{kind:'atLeast',minutes:120}}),{code:'VALIDATION_FAILED'});
});
test('local midnight includes timezone DST and limits use the earliest expiry', () => {
  assert.equal(typeof domain.batchExpiry,'function');
  assert.equal(domain.batchExpiry({localDate:'2026-09-15',timezone:'Asia/Tokyo',expiresAt:now+86400000},now),Date.parse('2026-09-15T15:00:00Z'));
  assert.equal(domain.batchExpiry({localDate:'2026-03-08',timezone:'America/New_York',expiresAt:Date.parse('2026-03-10T00:00:00Z')},Date.parse('2026-03-08T06:00:00Z')),Date.parse('2026-03-09T04:00:00Z'));
});
test('expired selection fails while completion cancellation and first timestamps survive', () => {
  assert.equal(typeof domain.changeSuggestion,'function');
  const row={status:'offered',version:1,presentedAt:null,selectedAt:null,completedVisitId:null,expiresAt:now+1000,personId:'me',placeId:'a',feedback:'',memo:'',routeId:null};
  const selected=domain.changeSuggestion(row,{status:'selected',presented:true},now);
  assert.equal(selected.selectedAt,now);
  assert.equal(domain.changeSuggestion(selected,{status:'selected',presented:true},now+500).version,2);
  assert.throws(()=>domain.changeSuggestion(row,{status:'selected'},now+1001),{code:'EXPIRED'});
  const complete=domain.changeSuggestion(selected,{status:'completed',completedVisitId:'v'},now+500,{id:'v',personId:'me',placeId:'a',status:'confirmed'});
  assert.equal(domain.changeSuggestion(complete,{status:'selected'},now+2000).completedVisitId,null);
  assert.throws(()=>domain.changeSuggestion(selected,{status:'completed',completedVisitId:'v'},now+500,{id:'v',personId:'other',placeId:'a',status:'confirmed'}),{code:'VALIDATION_FAILED'});
});
