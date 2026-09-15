import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './test-support.mjs';
import {SuggestionsRepository} from './repository.mjs';
const service=await import('./service.mjs').catch(()=>({}));
const now=Date.parse('2026-09-15T03:00:00Z');
const context={personId:'me',dataMode:'live',requestId:'r',signal:new AbortController().signal};
const input={id:'batch',checkin:null,origin:{longitude:139,latitude:35},conditions:{timeBudget:{kind:'exact',minutes:60},stayMinutes:30,wishes:['nature']},excludedActivities:[],excludedPlaceIds:[],localDate:'2026-09-15',timezone:'Asia/Tokyo',expiresAt:now+3600000};
function dependencies(store,override={}) {
  return {store,now:()=>now,settings:{read:()=>({suggestions:{enabled:true,timing:'onOpen'}}),allowed:()=>true,assertAiAllowed:()=>1},sources:{materials:()=>[],assertCurrent:()=>[]},places:{candidates:async()=>[{placeId:'p',name:'公園',coordinates:[139.001,35.001],sourceRefs:[{type:'place',id:'p',version:1}]}],revalidate:()=>{}},routes:{preview:async()=>({previewId:'route',durationSec:900,fetchedAt:now,expiresAt:now+900000,retention:'storable',mode:'walking',provider:'mapbox-directions'}),revalidate:()=>{}},ai:{configuration:()=>({model:'provider-test-double',promptVersion:'test',timeoutMs:1000}),explain:async()=>({candidates:[{placeId:'p',activity:'walk',reason:'自然を見る',matchedWishes:['nature'],unknowns:[]}]})},...override};
}
test('generation persists real-route seconds plus user stay without creating a checkin',async()=>{
  assert.equal(typeof service.generateBatch,'function');
  const f=fixture();try {
    const store=new SuggestionsRepository(f.db,'me',f.transaction);
    const result=await service.generateBatch(context,input,dependencies(store));
    assert.equal(result.items[0].totalMinutes,45);
    assert.equal(result.items[0].checkinId,null);
    assert.equal(result.items[0].routeEvidence.fetchedAt,now);
    assert.equal(store.listCheckins().items.length,0);
    assert.equal(store.getBatch('batch').items[0].reason,'自然を見る');
  }finally{f.cleanup();}
});
test('stopping during AI execution and provider errors do not become persisted empty success',async()=>{
  assert.equal(typeof service.generateBatch,'function');
  const f=fixture();try {
    const store=new SuggestionsRepository(f.db,'me',f.transaction);
    const deps=dependencies(store);let stopped=false;
    deps.settings.read=()=>({version:stopped?2:1,suggestions:{enabled:true,timing:'onOpen'}});
    const explain=deps.ai.explain;deps.ai.explain=async()=>{stopped=true;return explain();};
    deps.settings.allowed=()=>!stopped;
    await assert.rejects(service.generateBatch(context,input,deps),{code:'INPUT_CHANGED'});
    assert.throws(()=>store.getBatch('batch'),{code:'NOT_FOUND'});
    const broken=dependencies(store);broken.routes.preview=async()=>{throw Object.assign(new Error('upstream unavailable'),{code:'UPSTREAM_FAILED'});};
    await assert.rejects(service.generateBatch(context,input,broken),{code:'UPSTREAM_FAILED'});
    assert.throws(()=>store.getBatch('batch'),{code:'NOT_FOUND'});
  }finally{f.cleanup();}
});
