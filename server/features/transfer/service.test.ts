import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { TransferService } from './service.ts';
import type { Dependencies } from './service.ts';
import { TransferStore } from './store.ts';
import { transferMigration } from '../../db/migrations/transfer/migration.ts';

test('adoption retries the same common route after an interrupted save and preserves the selection', async () => {
  const db = new DatabaseSync(':memory:'); db.exec(transferMigration.sql);
  const store = new TransferStore(db);
  const recipe = store.createRecipe('p', { id:'r',title:'公園',meaning:'緑を歩く',sourceRefs:[{type:'record',id:'rec',version:1}],steps:[{id:'walk',meaning:'公園を歩く',sourceRecordIds:['rec'],stayMinutes:10,required:true}],requiredConditions:[],allowedChanges:[] });
  const input = { id:'plan',recipeId:'r',recipeVersion:1,region:'東京',start:{longitude:139,latitude:35},mode:'walking' as const,timeBudgetMinutes:60,preferences:'' };
  let plan=store.createPlan('p',input,recipe);
  plan=store.updatePlan('p',{...plan,status:'complete',assistantMessageId:'ai',assistantAttempt:1,plans:['faithful','personalized'].map(variant=>({variant:variant as 'faithful'|'personalized',steps:[{stepId:'walk',placeId:'park',explanation:'公園',evidenceIds:['src_1']}],explanation:'公園',conditionChecks:[],unmetConditions:[],unknowns:[],route:{id:'preview',durationSeconds:600,distanceMeters:500,expiresAt:Date.now()+60000,sourceRefs:[]},travelMinutes:10,stayMinutes:10,totalMinutes:20,eligible:true}))});
  const routes=new Set<string>(); let interrupted=true; let sourceCurrent=true;
  const deps = {
    assertSources:async()=>{if(!sourceCurrent)throw Object.assign(new Error('changed'),{code:'SOURCE_CHANGED'});},
    getRun:async()=>({status:'complete',attempt:1,result:{},error:null}),
    saveRoute:async(_p:any,_variant:any,id:string)=>{routes.add(id);if(interrupted){interrupted=false;throw new Error('connection lost after route save');}return {id};},
    getRoute:async(id:string)=>({id}), appendApplied:()=>{}, transaction:(fn:()=>unknown)=>fn(),
  } as unknown as Dependencies;
  const service=new TransferService(store,{personId:'p',dataMode:'live',requestId:'req',signal:new AbortController().signal},deps);
  await assert.rejects(service.adopt('plan','faithful',plan.version));
  const adopted=await service.adopt('plan','faithful',plan.version);
  assert.equal(routes.size,1);
  assert.equal(adopted.status,'adopted');
  assert.equal(store.getPlan('p','plan').savedRouteId,adopted.savedRouteId);
  assert.equal((await service.adopt('plan','faithful',plan.version)).savedRouteId,adopted.savedRouteId);
  await assert.rejects(service.adopt('plan','personalized',plan.version),{code:'STATE_CONFLICT'});
  sourceCurrent=false;
  await assert.rejects(service.getPlan('plan'),{code:'SOURCE_CHANGED'});
  db.close();
});
