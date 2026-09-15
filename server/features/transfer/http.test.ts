import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createApp } from '../../app/app.ts';
import { openDatabases } from '../../db/connection.ts';
import { loadLocalIdentity, seedProfiles } from '../../core/session.ts';
import { loadContract } from '../../core/validation.ts';
import { transaction } from '../../db/migrate.ts';
import { createTransferFeature } from './http.ts';
import { transferFragment } from './schemas.ts';
import { TransferStore } from './store.ts';
import type { Dependencies } from './service.ts';
import type { PlanSet } from './types.ts';

test('HTTP receipt and adoption commit together; same selection is returned after SQLite reopen', async () => {
  const directory=mkdtempSync(join(tmpdir(),'transfer-http-'));
  const identity=loadLocalIdentity(join(directory,'profiles.json'));
  const contract=loadContract();
  Object.assign(contract.components.schemas as object,transferFragment.schemas);
  for(const {method,path,...operation} of transferFragment.operations) {
    contract.paths[path]??={}; Object.assign(contract.paths[path]!,{[method]:operation});
  }
  let dbs:ReturnType<typeof openDatabases>;
  let app:ReturnType<typeof createApp>;
  let receiptFailure=true;
  // External/common feature ports are controlled test doubles. This is HTTP/receipt evidence only.
  const feature=createTransferFeature((db)=>({
    assertSources:async()=>{},assertSourcesNow:()=>{},sourceMaterials:async(refs)=>({sourceRefs:refs,evidence:[]}),
    candidates:async()=>{throw new Error('unused test port');},startRun:async()=>{throw new Error('unused test port');},preview:async()=>{throw new Error('unused test port');},
    getRun:async()=>({status:'complete',attempt:1,result:{},error:null}),
    getRoute:async(id)=>({id}),saveRoute:async(_plan,_variant,id)=>({id}),
    appendApplied:()=>{if(receiptFailure){receiptFailure=false;throw new Error('test interruption before adoption receipt');}},
    transaction:fn=>transaction(db,fn),
  } satisfies Dependencies));
  const boot=()=>{
    dbs=openDatabases({livePath:join(directory,'live.sqlite'),demoPath:join(directory,'demo.sqlite'),migrations:feature.migrations});
    seedProfiles(dbs,identity.profiles);app=createApp({databases:dbs,identity,features:[feature],contract});
  };
  let cookie='';
  async function request(path:string,method='GET',body?:unknown,key?:string,version?:number,mode='live') {
    const response=await app.request('/api/v1'+path,{method,headers:{'X-Request-Id':randomUUID(),'X-Data-Mode':mode,Cookie:cookie,
      ...(body?{'Content-Type':'application/json'}:{}),...(key?{'Idempotency-Key':key}:{}),...(version?{'If-Match':`"${version}"`}:{})},...(body?{body:JSON.stringify(body)}:{})});
    return {response,body:await response.json() as any};
  }
  try {
    boot();
    const login=await request('/session','POST',{profileKey:'self'},'login');
    assert.equal(login.response.status,201);cookie=login.response.headers.get('set-cookie')!.split(';')[0]!;
    const input={id:'r',title:'公園',meaning:'緑を歩く',sourceRefs:[{type:'record',id:'rec',version:1}],steps:[{id:'walk',meaning:'公園',sourceRecordIds:['rec'],stayMinutes:10,required:true}],requiredConditions:[],allowedChanges:[]};
    assert.equal((await request('/transfer/recipes','POST',input,'recipe')).response.status,201);
    assert.equal((await request('/transfer/recipes','POST',{...input,title:'異入力'},'recipe')).response.status,409);
    const store=new TransferStore(dbs!.live),personId=identity.profiles[0]!.id;
    let plan=store.createPlan(personId,{id:'p',recipeId:'r',recipeVersion:1,region:'東京',start:{longitude:139,latitude:35},mode:'walking',timeBudgetMinutes:60,preferences:''},store.getRecipe(personId,'r'));
    plan=store.updatePlan(personId,{...plan,status:'complete',assistantMessageId:'ai',assistantAttempt:1,plans:['faithful','personalized'].map(variant=>({variant:variant as 'faithful'|'personalized',steps:[{stepId:'walk',placeId:'park',explanation:'散歩',evidenceIds:['src_rec']}],explanation:'公園',conditionChecks:[],unmetConditions:[],unknowns:[],eligible:true,stayMinutes:10,travelMinutes:10,totalMinutes:20,route:{id:'preview',durationSeconds:600,distanceMeters:500,expiresAt:Date.now()+60000,sourceRefs:[]}}))});
    const failed=await request('/transfer/plan-sets/p/adoption','POST',{variant:'faithful'},'adoption',plan.version);
    assert.equal(failed.response.status,500);
    assert.equal(store.getPlan(personId,'p').selectedVariant,null);
    assert.equal(dbs!.live.prepare("SELECT state FROM core_requests WHERE request_key='adoption'").get()!.state,'pending');
    const accepted=await request('/transfer/plan-sets/p/adoption','POST',{variant:'faithful'},'adoption',plan.version);
    assert.equal(accepted.response.status,200,JSON.stringify(accepted.body));
    const saved=accepted.body.data as PlanSet;
    assert.equal(saved.status,'adopted');
    assert.equal(dbs!.live.prepare("SELECT state FROM core_requests WHERE request_key='adoption'").get()!.state,'complete');
    dbs!.close();boot();
    const restored=await request('/transfer/plan-sets/p');
    assert.deepEqual(restored.body.data,saved);
    assert.equal((await request('/transfer/plan-sets/p/adoption','POST',{variant:'faithful'},'adoption',plan.version)).body.data.savedRouteId,saved.savedRouteId);
    assert.equal((await request('/transfer/plan-sets/p/adoption','POST',{variant:'personalized'},'adoption',plan.version)).response.status,409);
    assert.equal((await request('/transfer/plan-sets/p','GET',undefined,undefined,undefined,'demo')).response.status,401);
  } finally { dbs!.close();rmSync(directory,{recursive:true,force:true}); }
});
