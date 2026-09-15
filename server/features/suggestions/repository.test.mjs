import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {fixture} from './test-support.mjs';
const repository=await import('./repository.mjs').catch(()=>({}));
const now=Date.parse('2026-09-15T03:00:00Z');

test('same-day checkins are independent; corrections keep versions; unanswered never inherits',()=>{
  assert.equal(typeof repository.SuggestionsRepository,'function');
  const f=fixture();
  try {
    const store=new repository.SuggestionsRepository(f.db,'me',f.transaction);
    const input={id:'answer1',localDate:'2026-09-15',timezone:'Asia/Tokyo',answers:{state:'calm',wishes:['nature'],minutes:null,note:'',timeBudget:{kind:'atLeast',minutes:120}},validUntil:now+3600000};
    assert.equal(store.createCheckin(input,now).version,1);
    assert.equal(store.createCheckin({...input,id:'answer2'},now+10).version,1);
    const corrected=store.patchCheckin('answer1',{answers:{...input.answers,state:'tired'}},1,now+20);
    assert.equal(corrected.version,2);
    assert.equal(store.listCheckins({date:'2026-09-15'}).items.length,2);
    const page=store.listCheckins({date:'2026-09-15',limit:1});
    store.createCheckin({...input,id:'answer3'},now+15);
    assert.equal(store.listCheckins({date:'2026-09-15',limit:1,cursor:page.nextCursor}).items[0].id,'answer1');
    assert.throws(()=>store.listCheckins({date:'2026-09-16',cursor:page.nextCursor}),{code:'VALIDATION_FAILED'});
    assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM suggestion_checkin_versions WHERE checkin_id=?').get('answer1').n,2);
    assert.equal(store.resolveCheckin(null,now),null);
    assert.throws(()=>store.resolveCheckin({type:'checkin',id:'answer1',version:1},now),{code:'SOURCE_CHANGED'});
    assert.throws(()=>store.patchCheckin('answer1',{answers:input.answers},1,now+30),{code:'VERSION_CONFLICT'});
    assert.throws(()=>new repository.SuggestionsRepository(f.db,'other',f.transaction).getCheckin('answer1'),{code:'NOT_FOUND'});
  } finally {f.cleanup();}
});
test('batch order, selection and explicit completion cancellation survive SQLite reopen',()=>{
  assert.equal(typeof repository.SuggestionsRepository,'function');
  const f=fixture();
  try {
    let store=new repository.SuggestionsRepository(f.db,'me',f.transaction);
    const input={id:'batch',checkin:null,conditions:{timeBudget:{kind:'exact',minutes:60}},origin:{latitude:35,longitude:139},excludedActivities:[],excludedPlaceIds:[],expiresAt:now+3600000,localDate:'2026-09-15',timezone:'Asia/Tokyo'};
    const candidates=['b','a'].map((placeId,position)=>({placeId,position,title:placeId,activity:'walk',reason:'current wish',sourceRefs:[],travelMinutes:15,stayMinutes:30,totalMinutes:45,evaluations:[],expiresAt:input.expiresAt}));
    const batch=store.saveBatch(input,candidates,now);
    const viewed=store.patchSuggestion(batch.items[0].id,{viewed:true},1,now+5);
    const selected=store.patchSuggestion(viewed.id,{status:'selected',memo:'tomorrow'},viewed.version,now+10);
    const complete=store.patchSuggestion(selected.id,{status:'completed',completedVisitId:'visit'},selected.version,now+20,{id:'visit',personId:'me',placeId:'b',status:'confirmed'});
    assert.equal(complete.status,'completed');
    store.patchSuggestion(selected.id,{status:'selected'},complete.version,now+30);
    assert.equal(store.getSuggestion(selected.id).status,'selected');
    f.db.close();
    const reopened=new DatabaseSync(f.path);
    store=new repository.SuggestionsRepository(reopened,'me',f.transaction);
    assert.deepEqual(store.getBatch('batch').items.map(x=>x.placeId),['b','a']);
    assert.equal(store.getSuggestion(selected.id).memo,'tomorrow');
    assert.equal(store.getSuggestion(selected.id).completedVisitId,null);
    assert.equal(store.getSuggestion(selected.id).selectedAt,now+10);
    assert.equal(store.getSuggestion(selected.id).viewedAt,now+5);
    assert.equal(store.getSuggestion(selected.id).presentedAt,null);
    reopened.close();
  } finally {f.cleanup();}
});
test('external batch execution has durable running, failed and interrupted states',()=>{
  const f=fixture();try {
    const store=new repository.SuggestionsRepository(f.db,'me',f.transaction);
    assert.equal(typeof store.reserveBatch,'function');
    store.reserveBatch({id:'run',expiresAt:now+3600000},now);
    assert.throws(()=>store.getBatch('run'),{code:'BUSY'});
    store.failBatch('run',{code:'UPSTREAM_FAILED',message:'経路を取得できません。',status:502},now+1);
    assert.throws(()=>store.getBatch('run'),{code:'UPSTREAM_FAILED'});
    store.reserveBatch({id:'interrupted',expiresAt:now+3600000},now);
    store.interruptPending(now+2);
    assert.throws(()=>store.getBatch('interrupted'),{code:'INTERRUPTED'});
    assert.throws(()=>store.reserveBatch({id:'run',expiresAt:now+3600000},now+2),{code:'REQUEST_CONFLICT'});
  }finally{f.cleanup();}
});
