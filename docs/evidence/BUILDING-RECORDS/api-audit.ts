import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { createApiClient, ApiError, type GrowthItem } from '../../../packages/api-client/index.ts';
const origin = process.env.RECORDS_AUDIT_ORIGIN || 'http://127.0.0.1:3002';
let cookie = '';
const calls: { operation: string; status: number }[] = [];
const client = createApiClient({ baseUrl: `${origin}/api/v1`, fetch: async (input, init) => {
  const headers = new Headers(init?.headers); if(cookie) headers.set('Cookie', cookie);
  const response = await fetch(input, { ...init, headers });
  cookie = response.headers.get('set-cookie')?.split(';')[0] || cookie;
  calls.push({ operation: `${init?.method || 'GET'} ${new URL(String(input)).pathname}`, status: response.status });
  return response;
}});
client.setDataMode('demo');
await client.request('postSession', { body: { profileKey: 'self' }, idempotencyKey: crypto.randomUUID() });
const places = await client.request('getPlaces', { query: { limit: 100 } });
const qaPlaces = [];
for (const [name,longitude,latitude] of [['BUILDING-RECORDS 検証場所A（デモ）',136.9640,35.1669],['BUILDING-RECORDS 検証場所B（デモ）',136.9650,35.1670]] as const) {
 const existing = places.items.find(item=>item.name===name);
 if(existing) { qaPlaces.push(existing); continue; }
 const id=crypto.randomUUID();
 qaPlaces.push((await client.request('postPlaces',{body:{id,mode:'manual',name,position:{longitude,latitude},address:null,buildingKey:null},idempotencyKey:id})).data);
}
const [a,b]=qaPlaces; assert.ok(a && b);
// Clear only this audit's previously interrupted, explicitly labelled demo records.
const prior=await client.request('getRecords',{query:{limit:100,includeUndated:true}});
const priorVisits=new Set<string>();
for(const row of prior.items.filter(item=>item.body==='BUILDING-RECORDS API検証：本人の原文を保持' && [a.id,b.id].includes(item.effectivePlaceId || ''))) {
 if(row.visitId)priorVisits.add(row.visitId);
 await client.request('deleteRecordsRecordId',{path:{recordId:row.id},version:row.version});
}
for(const visitId of priorVisits) { const row=(await client.request('getVisitsVisitId',{path:{visitId}})).data;await client.request('deleteVisitsVisitId',{path:{visitId},version:row.version}); }

async function growth() { const items: GrowthItem[] = []; let cursor: string | undefined; do { const page = await client.request('getMapGrowth',{query:{limit:100,cursor}}); items.push(...page.items); cursor=page.nextCursor || undefined; } while(cursor); return items; }
const count = (items:GrowthItem[],id:string) => items.find(item=>item.place.id===id)?.confirmedVisitCount || 0;
const baseline = await growth(), beforeA=count(baseline,a.id), beforeB=count(baseline,b.id);
const id = crypto.randomUUID(), recordId=crypto.randomUUID(), secondRecordId=crypto.randomUUID();
let visit=(await client.request('postVisits',{body:{id,placeId:a.id,startedAt:Date.now(),endedAt:null,timePrecision:'exact',origin:'manual'},idempotencyKey:id})).data;
assert.equal(visit.status,'candidate'); assert.equal(count(await growth(),a.id),beforeA);
const candidateVersion=visit.version;
visit=(await client.request('patchVisitsVisitId',{path:{visitId:id},version:visit.version,body:{status:'confirmed'}})).data;
assert.equal(count(await growth(),a.id),beforeA+1);
const makeRecord=(recordId:string,purposes:string[])=>client.request('postRecords',{body:{id:recordId,kind:'experience',visitId:id,placeId:null,occurredAt:null,endedAt:null,timePrecision:'unknown',body:'BUILDING-RECORDS API検証：本人の原文を保持',purposes,activities:[],impression:'',periodAnswers:{},bookmarked:false,useForSuggestions:false,topicKey:null,visibility:'private',sharedWith:[]},idempotencyKey:recordId});
let record=(await makeRecord(recordId,['カフェ'])).data;
await makeRecord(secondRecordId,['分類しない自由入力']);
assert.equal(count(await growth(),a.id),beforeA+1);
const originalBody=record.body, originalVersion=record.version;
record=(await client.request('patchRecordsRecordId',{path:{recordId},version:record.version,body:{purposes:['休憩']}})).data;
assert.equal(record.body,originalBody); assert.equal(count(await growth(),a.id),beforeA+1);
assert.ok((await growth()).find(item=>item.place.id===a.id)?.purposes.includes('分類しない自由入力'));
await assert.rejects(client.request('patchRecordsRecordId',{path:{recordId},version:originalVersion,body:{purposes:['失敗の用途']}}),error=>error instanceof ApiError&&[409,412].includes(error.status));
record=(await client.request('getRecordsRecordId',{path:{recordId}})).data.record;
assert.deepEqual(record.purposes,['休憩']);assert.equal(record.body,originalBody);
visit=(await client.request('patchVisitsVisitId',{path:{visitId:id},version:visit.version,body:{status:'candidate'}})).data;
assert.equal(count(await growth(),a.id),beforeA);
visit=(await client.request('patchVisitsVisitId',{path:{visitId:id},version:visit.version,body:{status:'rejected'}})).data;
assert.equal(count(await growth(),a.id),beforeA);
visit=(await client.request('patchVisitsVisitId',{path:{visitId:id},version:visit.version,body:{status:'confirmed',placeId:b.id}})).data;
const moved=await growth();assert.equal(count(moved,a.id),beforeA);assert.equal(count(moved,b.id),beforeB+1);
record=(await client.request('getRecordsRecordId',{path:{recordId}})).data.record;
await client.request('deleteRecordsRecordId',{path:{recordId},version:record.version});
assert.equal(count(await growth(),b.id),beforeB+1);
await client.request('deleteVisitsVisitId',{path:{visitId:id},version:visit.version});
const retained=(await client.request('getRecordsRecordId',{path:{recordId:secondRecordId}})).data.record;
assert.equal(retained.body,originalBody);assert.equal(retained.visitId,null);assert.equal(count(await growth(),b.id),beforeB);
// Retain a new candidate and associated record solely for subsequent browser verification.
const browserVisitId=crypto.randomUUID(),browserRecordId=crypto.randomUUID();
const browserVisit=(await client.request('postVisits',{body:{id:browserVisitId,placeId:a.id,startedAt:Date.now(),endedAt:null,timePrecision:'exact',origin:'manual'},idempotencyKey:browserVisitId})).data;
const browserRecord=(await client.request('postRecords',{body:{id:browserRecordId,kind:'experience',visitId:browserVisitId,placeId:null,occurredAt:null,endedAt:null,timePrecision:'unknown',body:'BUILDING-RECORDS ブラウザ確認用の原文',purposes:['カフェ'],activities:[],impression:'',periodAnswers:{},bookmarked:false,useForSuggestions:false,topicKey:null,visibility:'private',sharedWith:[]},idempotencyKey:browserRecordId})).data;
client.setDataMode('live');await client.request('postSession',{body:{profileKey:'self'},idempotencyKey:crypto.randomUUID()});
await assert.rejects(client.request('getVisitsVisitId',{path:{visitId:browserVisitId}}),error=>error instanceof ApiError&&error.status===404);
const result={checkedAt:new Date().toISOString(),origin,mode:'demo',api:'real HTTP + generated client',placeA:{id:a.id,name:a.name,coordinates:a.coordinates},placeB:{id:b.id,name:b.name,coordinates:b.coordinates},baseline:{a:beforeA,b:beforeB},candidateVersion,tests:['candidate non-growth','confirmed +1','multiple records same visit count','purpose-only patch preserves body','unknown purpose preserved','412 VERSION_CONFLICT preserves saved values','cancel/reject remove visit from count','place correction old/new counts','record deletion preserves visit','visit deletion preserves/unlinks record','live/demo separation'],deletedVisitId:id,deletedRecordId:recordId,retainedRecordId:secondRecordId,browserVisit,browserRecord,calls};
writeFileSync(new URL('./api-audit.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({tests:result.tests,browserVisitId,browserRecordId,placeA:result.placeA,placeB:result.placeB}));
