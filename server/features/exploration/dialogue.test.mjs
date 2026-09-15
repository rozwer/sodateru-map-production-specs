import test from 'node:test';
import assert from 'node:assert/strict';
import { DialogueService } from './dialogue.mjs';

const origin = {coordinates:[136.96,35.16],kind:'map-center',label:'地図の中心'};
const person = (id='p1',mode='live',requestId=crypto.randomUUID()) => ({personId:id,dataMode:mode,requestId,signal:new AbortController().signal});
const places = [1,2].map(n=>({candidateId:'candidate-'+n,name:'カフェ'+n,coordinates:[136.96+n/1000,35.16],retention:'temporary'}));
function fixture(actions) {
 let now=1000, version='v1'; const calls=[];
 const dependencies={
  now:()=>now, settings:async()=>({version,enabled:true}),
  decide:async(c,p)=>{calls.push(['ai',structuredClone(p)]);return actions.shift();},
  search:async(c,input)=>{calls.push(['search',input]);return {resultId:'search-1',items:places,expiresAt:901000};},
  route:async(c,input)=>{calls.push(['route',structuredClone(input)]);return {previewId:'route-'+input.candidate.candidateId,distanceM:123.5,durationSec:90};}
 };
 return {service:new DialogueService(dependencies),dependencies,calls,setNow:v=>now=v,setVersion:v=>version=v};
}
test('second candidate preserves ID, provider result and fixed origin across continuation and select',async()=>{
 const f=fixture([{action:'search_nearby',category:'coffee',destinationId:'',text:''},{action:'finish',category:'',destinationId:'',text:'2件あります。'},{action:'walking_route',category:'',destinationId:'candidate-2',text:''},{action:'finish',category:'',destinationId:'',text:'2番目への経路です。'}]);
 const first=await f.service.run(person(),{text:'近くのカフェ',origin});
 const second=await f.service.run(person(),{text:'2番目まで',origin});
 assert.equal(second.routes[0].previewId,'route-candidate-2');
 assert.equal('destinationId' in second.routes[0],false);
 assert.deepEqual(f.calls.find(x=>x[0]==='route')[1],{origin,candidate:places[1],searchResultId:'search-1'});
 assert.equal(f.calls.filter(x=>x[0]==='ai')[2][1].history.length,2);
 const selected=await f.service.select(person(),{resultId:first.resultId,candidateId:'candidate-2'});
 assert.deepEqual(selected.places,[places[1]]);
 assert.match(selected.text,/徒歩約2分・124m/);
 assert.equal((await f.service.get(person(),first.resultId)).resultId,first.resultId);
 await assert.rejects(f.service.get(person('other'),first.resultId),{code:'RESULT_EXPIRED'});
 await assert.rejects(f.service.get(person('p1','demo'),first.resultId),{code:'RESULT_EXPIRED'});
 f.setVersion('v2');
 await assert.rejects(f.service.get(person(),first.resultId),{code:'RESULT_EXPIRED'});
});
test('expiry is exclusive and origin changes clear prior candidates/history',async()=>{
 const f=fixture([{action:'search_nearby',category:'coffee',destinationId:'',text:''},{action:'finish',category:'',destinationId:'',text:'候補'},{action:'finish',category:'',destinationId:'',text:'新起点'}]);
 const first=await f.service.run(person(),{text:'カフェ',origin});
 await f.service.run(person(),{text:'続き',origin:{...origin,coordinates:[137,35]}});
 const payload=f.calls.filter(x=>x[0]==='ai').at(-1)[1];
 assert.deepEqual(payload.history,[]);assert.deepEqual(payload.places,[]);
 f.setNow(first.expiresAt);
 await assert.rejects(f.service.get(person(),first.resultId),{code:'RESULT_EXPIRED'});
});
test('cancel ignores other request/owner, rejects late completion without storing, and returns retry input',async()=>{
 const f=fixture([]);let resolve,started;
 const ready=new Promise(r=>started=r);
 f.dependencies.decide=()=>new Promise(r=>{resolve=r;started();});
 const ctx=person();const pending=f.service.run(ctx,{text:'入力を残す',origin});
 await ready;
 assert.equal(f.service.cancel(person('other'),{requestId:ctx.requestId}).cancelled,false);
 assert.equal(f.service.cancel(person(),{requestId:'old'}).cancelled,false);
 await assert.rejects(f.service.run(person(),{text:'二重送信',origin}),{code:'BUSY'});
 assert.equal(f.service.cancel(person(),{requestId:ctx.requestId}).cancelled,true);
 resolve({action:'finish',category:'',destinationId:'',text:'遅着'});
 await assert.rejects(pending,e=>e.code==='CANCELLED'&&e.details.input.text==='入力を残す'&&e.details.retryable===true);
 assert.equal(f.service.resultCount,0);
});
test('search loop enforces two searches, malformed action fails, and setting change cannot save',async()=>{
 const f=fixture(Array(3).fill({action:'search_nearby',category:'coffee',destinationId:'',text:''}));
 await assert.rejects(f.service.run(person(),{text:'探して',origin}),{code:'OUTPUT_INVALID'});
 assert.equal(f.calls.filter(x=>x[0]==='search').length,2);
 const g=fixture([{action:'finish',category:'',destinationId:'',text:'完了'}]);
 g.dependencies.decide=async()=>{g.setVersion('v2');return {action:'finish',category:'',destinationId:'',text:'完了'};};
 await assert.rejects(g.service.run(person(),{text:'探して',origin}),{code:'RESULT_EXPIRED'});
 assert.equal(g.service.resultCount,0);
});
