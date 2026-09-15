import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const repository=await import('./repository.mjs').catch(()=>({}));
const now=Date.parse('2026-09-15T03:00:00Z');

function fixture() {
  const dir=mkdtempSync(join(tmpdir(),'suggestions-test-'));
  const path=join(dir,'live.sqlite');
  const db=new DatabaseSync(path);
  const common=JSON.parse(readFileSync(new URL('../../../docs/01_requirements/01_DB/common.json',import.meta.url).pathname.replace('/server/docs/','/docs/'),'utf8')).columns;
  for (const name of ['11_self_checkins','12_suggestions','15_visits']) {
    const spec=JSON.parse(readFileSync(new URL(`../../../docs/01_requirements/01_DB/${name}.json`,import.meta.url).pathname.replace('/server/docs/','/docs/'),'utf8'));
    db.exec(`CREATE TABLE ${spec.table} (${Object.entries({...common,...spec.columns}).map(([key,value])=>`${key} ${value.type}${key==='id'?' PRIMARY KEY':''}${value.nullable===false?' NOT NULL':''}`).join(',')})`);
  }
  db.exec(readFileSync(new URL('../../db/migrations/suggestions/001-suggestions.sql',import.meta.url).pathname.replace('/server/features/db/','/server/db/'),'utf8'));
  const transaction=(connection,fn)=>{connection.exec('BEGIN');try{const value=fn();connection.exec('COMMIT');return value;}catch(error){connection.exec('ROLLBACK');throw error;}};
  return {db,path,transaction,cleanup(){try{db.close();}catch{}rmSync(dir,{recursive:true,force:true});}};
}
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
    const selected=store.patchSuggestion(batch.items[0].id,{status:'selected',memo:'tomorrow'},1,now+10);
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
    reopened.close();
  } finally {f.cleanup();}
});
