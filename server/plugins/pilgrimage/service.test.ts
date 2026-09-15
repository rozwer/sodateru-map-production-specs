import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PilgrimageService } from './service.ts';
import { coreMigration } from '../../core/migration.ts';
import { requestPreview } from './http.ts';
import { pilgrimageTask } from './ai.ts';
import type { Dependencies, Relation, Selection } from './types.ts';
const context={personId:'owner',dataMode:'live' as const,requestId:'test',signal:new AbortController().signal};
const relations:Relation[]=[0,1,2].map(i=>({id:`r${i}`,workId:'Q1',name:`場所${i}`,address:null,coordinates:[137.18+i*.003,36.23],relationType:'model-location',description:'テスト用の関係。実データではありません。',sourceRefs:[{url:'https://example.test/source',title:'テスト資料',fetchedAt:1,claimScope:'relation',attribution:'test double'}],verificationStatus:i===2?'unverified':'confirmed',unknowns:i===2?['未確認']:[]}));
function setup() {
 const dir=mkdtempSync(join(tmpdir(),'pilgrimage-test-')),path=join(dir,'db.sqlite');
 const db=new DatabaseSync(path);db.exec("PRAGMA foreign_keys=ON; CREATE TABLE people(id TEXT PRIMARY KEY); INSERT INTO people VALUES('owner'),('other'); CREATE TABLE test_saved_routes(id TEXT PRIMARY KEY,json TEXT); CREATE TABLE test_records(id TEXT PRIMARY KEY); INSERT INTO test_records VALUES('keep');");db.exec(readFileSync(new URL('../../db/migrations/pilgrimage/001-pilgrimage.sql',import.meta.url),'utf8'));
 db.exec(coreMigration.sql);
 const setting={id:'pilgrimage',enabled:true,version:1,settings:{mode:'walking'}},state=()=>({revision:`v${setting.version}-${setting.enabled}`,items:[setting],appliedDeclarations:setting.enabled?[{pluginId:'pilgrimage',targetKey:'layer:pilgrimage',property:'visibility',value:true}]:[]});
 let lastRoute:any;
 const deps:Dependencies={pluginState:state,search:async()=>({works:[{id:'Q1',title:'模擬作品',aliases:[]}],relations,fetchedAt:1,warnings:[],dataKind:'live'}),places:{search:async(_c,_db,input)=>({resultId:input.q,items:[{candidateId:input.q,name:input.q,coordinates:relations.find(r=>r.name===input.q)!.coordinates,retention:'storable'}]}),resolveCandidate:()=>({})},routes:db=>({previewRoute:async(_c,input)=>{lastRoute={previewId:'route-preview',waypoints:input.waypoints.map((w:any)=>({coordinates:relations.find(r=>r.name===w.candidateId)!.coordinates,name:w.candidateId,placeId:null})),geometry:{type:'LineString',coordinates:[[137.18,36.23],[137.183,36.23]]},legs:[{fromIndex:0,toIndex:1,geometry:{type:'LineString',coordinates:[[137.18,36.23],[137.183,36.23]]},distanceM:200,durationSec:150}],mode:input.mode,provider:'mapbox-directions',fetchedAt:1,expiresAt:Date.now()+900000,retention:'storable',distanceM:200,durationSec:150};return lastRoute;},revalidatePreview:()=>structuredClone(lastRoute),saveRoute:(_c,input)=>{const data={...lastRoute,id:input.id,title:input.title,waypoints:lastRoute.waypoints.map((w:any)=>({...w,placeId:`saved-${w.name}`})),sourceUrl:'https://example.test/route'};db.prepare('INSERT INTO test_saved_routes VALUES(?,?)').run(input.id,JSON.stringify(data));return {data,created:true};},getSavedRoute:(_c,id)=>JSON.parse((db.prepare('SELECT json FROM test_saved_routes WHERE id=?').get(id) as any).json)})};
 const service=new PilgrimageService(db,deps),selection:Selection={searchId:'search',orderedRelationIds:['r1','r0'],mode:'walking',title:'順序確認',settingsVersion:1,acknowledgeUnverified:false};
 const seed=()=>service.search(context,{id:'search',workQuery:'模擬作品',region:{id:'test',bounds:[137,36,138,37]}});
 return {db,path,dir,deps,service,selection,setting,seed,close:()=>{db.close();rmSync(dir,{recursive:true,force:true});}};
}
test('保存順・形状をSQLite再open後に復元し、停止は表示だけ解除する',async()=>{
 const f=setup();try{await f.seed();const preview=await f.service.preview(context,f.selection),plan=f.service.savePlan(context,'plan',preview.id);assert.deepEqual(plan.orderedRelationIds,['r1','r0']);assert.deepEqual(plan.orderedPlaceIds,['saved-場所1','saved-場所0']);assert.equal(f.service.overlay(context).features.length,3);
 const reopened=new DatabaseSync(f.path);try{assert.deepEqual(new PilgrimageService(reopened,f.deps).getPlan(context,'plan'),plan);}finally{reopened.close();}
 f.setting.enabled=false;assert.deepEqual(f.service.overlay(context).features,[]);assert.deepEqual(f.service.getPlan(context,'plan'),plan);assert.equal((f.db.prepare('SELECT count(*) n FROM test_saved_routes').get() as any).n,1);assert.equal((f.db.prepare('SELECT count(*) n FROM test_records').get() as any).n,1);
 assert.throws(()=>f.service.getPlan({...context,personId:'other'},'plan'),{code:'NOT_FOUND'});assert.throws(()=>f.service.getPlan({...context,dataMode:'demo'},'plan'),{code:'NOT_FOUND'});
 }finally{f.close();}
});
test('設定競合・未確認・候補外の採用を拒否し、更新は明示版と新previewを使う',async()=>{
 const f=setup();try{await f.seed();await assert.rejects(f.service.preview(context,{...f.selection,orderedRelationIds:['r0','r2']}),{code:'REQUEST_CONFLICT'});await assert.rejects(f.service.preview(context,{...f.selection,orderedRelationIds:['r0','unknown']}),{code:'INVALID_INPUT'});
 const preview=await f.service.preview(context,f.selection);f.setting.version=2;assert.throws(()=>f.service.savePlan(context,'plan',preview.id),{code:'SOURCE_CHANGED'});assert.equal(f.service.listPlans(context).items.length,0);
 const fresh=await f.service.preview(context,{...f.selection,settingsVersion:2});const plan=f.service.savePlan(context,'plan',fresh.id);const update=await f.service.preview(context,{...f.selection,settingsVersion:2,orderedRelationIds:['r0','r1']});assert.throws(()=>f.service.savePlan(context,'plan',update.id,2),{code:'VERSION_CONFLICT'});const next=f.service.savePlan(context,'plan',update.id,1);assert.equal(next.version,2);assert.deepEqual(next.orderedRelationIds,['r0','r1']);assert.notEqual(plan.routeId,next.routeId);
 }finally{f.close();}
});
test('AI採用参照追記が失敗すると計画と経路の保存を一緒にrollbackする',async()=>{
 const f=setup();try{await f.seed();const selection={...f.selection,ai:{runId:'run',attempt:1}};f.deps.ai={assertRunAdoptable:()=>({task:'pilgrimage',result:{searchId:'search',settingsVersion:1,orderedRelationIds:['r1','r0']}}),appendAppliedRef:()=>{throw new Error('simulated adoption failure');}};
 const preview=await f.service.preview(context,selection);assert.throws(()=>f.service.savePlan(context,'plan',preview.id),/simulated/);assert.equal(f.service.listPlans(context).items.length,0);assert.equal((f.db.prepare('SELECT count(*) n FROM test_saved_routes').get() as any).n,0);
 }finally{f.close();}
});
test('固有AIは確認済み候補の完全な並べ替えだけを受け入れる',async()=>{
 const f=setup();try{await f.seed();const task=pilgrimageTask(f.deps.pluginState);const input={searchId:'search',relationIds:['r0','r1'],settingsVersion:1},request={conversationId:'c',userMessageId:'u',assistantMessageId:'a',text:'並べて',task:'pilgrimage',input,expectedRefs:[]};const materials=await task.readMaterials(f.db,context,input,request);
 task.validateResult({searchId:'search',settingsVersion:1,orderedRelationIds:['r1','r0']},materials,request);assert.throws(()=>task.validateResult({searchId:'search',settingsVersion:1,orderedRelationIds:['r0','r0']},materials,request),{code:'OUTPUT_INVALID'});assert.throws(()=>task.readMaterials(f.db,context,{...input,relationIds:['r0','r2']},request),{code:'INVALID_INPUT'});
 }finally{f.close();}
});

test('preview再送は外部APIを呼ばず復元し、異入力と再起動後の期限切れも外部取得前に拒否する',async()=>{
 const f=setup();try{await f.seed();let calls=0;const original=f.deps.routes;f.deps.routes=db=>{const routes=original(db);return {...routes,previewRoute:async(context,input)=>{calls++;return routes.previewRoute(context,input);}};};
 const first=await requestPreview(f.db,context,f.service,f.selection,'key');const second=await requestPreview(f.db,context,f.service,f.selection,'key');assert.equal(first.status,201);assert.equal(second.status,200);assert.deepEqual(first.body,second.body);assert.equal(calls,1);
 await assert.rejects(requestPreview(f.db,context,f.service,{...f.selection,title:'異入力'},'key'),{code:'IDEMPOTENCY_CONFLICT'});assert.equal(calls,1);
 const reopened=new DatabaseSync(f.path);try{await assert.rejects(requestPreview(reopened,context,new PilgrimageService(reopened,f.deps),f.selection,'key'),{code:'RESULT_EXPIRED'});assert.equal(calls,1);}finally{reopened.close();}
 }finally{f.close();}
});
