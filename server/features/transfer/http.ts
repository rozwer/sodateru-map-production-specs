import type { DatabaseSync } from 'node:sqlite';
import type { Context as HonoContext } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { CoreEnv, RequestContext } from '../../core/context.ts';
import { defineFeature } from '../../core/features.ts';
import { CommonError, expectedVersion } from '../../core/errors.ts';
import { beginRequest, completeRequest, idempotencyKey, idempotentMutation, requestHash } from '../../core/idempotency.ts';
import type { Receipt, StoredResult } from '../../core/idempotency.ts';
import { transferMigration } from '../../db/migrations/transfer/migration.ts';
import { TransferStore } from './store.ts';
import { TransferService } from './service.ts';
import type { Dependencies } from './service.ts';
import { TransferError } from './types.ts';
import type { Recipe, PlanSet, Variant } from './types.ts';
import { recipeInput, planInput } from './validation.ts';

type Factory = (db:DatabaseSync,context:RequestContext)=>Dependencies;
async function guarded<T>(fn:()=>Promise<T>): Promise<T> {
  try { return await fn(); }
  catch(error) {
    if (error instanceof TransferError) throw new CommonError(error.code,error.message,error.code==='BUSY',error.details ? {cause:error.details} : {});
    throw error;
  }
}
function response(c:HonoContext<CoreEnv>, value:Recipe|PlanSet, status:ContentfulStatusCode=200) {
  c.header('ETag',`"${value.version}"`);
  return c.json({data:value},status);
}
function saved(value:Recipe|PlanSet,status=200):StoredResult {
  return {status,body:{data:value},headers:{ETag:`"${value.version}"`},resource:{type:'recipeId' in value?'transfer-plan-set':'transfer-recipe',id:value.id}};
}

export function createTransferFeature(factory:Factory,onRegister?:()=>void) {
  return defineFeature({id:'transfer',migrations:[transferMigration],register(api,services) {
    onRegister?.();
    const bindings=(c:HonoContext<CoreEnv>)=>{
      const db=c.get('db'),context=c.get('context'),store=new TransferStore(db),deps=factory(db,context);
      return {db,context,store,deps,service:new TransferService(store,context,deps)};
    };
    api.post('/transfer/recipes',c=>guarded(async()=>{
      const {db,context,store,deps}=bindings(c);
      const input=recipeInput(c.get('input').body);
      await deps.assertSources(input.sourceRefs);
      const materials=await deps.sourceMaterials(input.sourceRefs);
      const result=idempotentMutation(db,{context,operation:'POST /api/v1/transfer/recipes',key:idempotencyKey(c.req.header('Idempotency-Key')),input},{
        execute(){deps.assertSourcesNow(materials.sourceRefs);return saved(store.createRecipe(context.personId,{...input,sourceRefs:materials.sourceRefs}),201);},
        replay(result){const recipe=store.getRecipe(context.personId,result.resource!.id);deps.assertSourcesNow(recipe.sourceRefs);return saved(recipe);},
      });
      return response(c,(result.body as {data:Recipe}).data,result.status as ContentfulStatusCode);
    }));
    api.get('/transfer/recipes',c=>guarded(async()=>{
      const {store,context,deps}=bindings(c);
      const items=store.listRecipes(context.personId);
      for(const item of items)await deps.assertSources(item.sourceRefs);
      return c.json({data:{items}});
    }));
    api.get('/transfer/recipes/:recipeId',c=>guarded(async()=>response(c,await bindings(c).service.getRecipe(c.req.param('recipeId')))));
    api.patch('/transfer/recipes/:recipeId',c=>guarded(async()=>{
      const {db,context,store,deps}=bindings(c),input=recipeInput(c.get('input').body);
      await deps.assertSources(input.sourceRefs);const materials=await deps.sourceMaterials(input.sourceRefs);
      return response(c,services.transaction(db,()=>{
        deps.assertSourcesNow(materials.sourceRefs);
        return store.replaceRecipe(context.personId,c.req.param('recipeId'),expectedVersion(c.req.header('If-Match')),{...input,sourceRefs:materials.sourceRefs});
      }));
    }));
    api.post('/transfer/plan-sets',c=>guarded(async()=>{
      const {db,context,store,deps,service}=bindings(c),input=planInput(c.get('input').body);
      const recipe=await service.getRecipe(input.recipeId);
      const result=idempotentMutation(db,{context,operation:'POST /api/v1/transfer/plan-sets',key:idempotencyKey(c.req.header('Idempotency-Key')),input},{
        execute(){
          deps.assertSourcesNow(recipe.sourceRefs);
          if(recipe.version!==input.recipeVersion)throw new TransferError('SOURCE_CHANGED','レシピが変更されています');
          return saved(store.createPlan(context.personId,input,recipe),202);
        },
        replay(result){const plan=store.getPlan(context.personId,result.resource!.id);deps.assertSourcesNow(plan.sourceRefs);return saved(plan,202);},
      });
      let plan=(result.body as {data:PlanSet}).data;
      if(plan.status==='pending')plan=await service.createPlan(input);
      return response(c,plan,202);
    }));
    api.get('/transfer/plan-sets',c=>guarded(async()=>{
      const {store,context,deps}=bindings(c),items=store.listPlans(context.personId);
      for(const item of items)await deps.assertSources(item.sourceRefs);
      return c.json({data:{items}});
    }));
    api.get('/transfer/plan-sets/:planSetId',c=>guarded(async()=>{
      const {store,context,service}=bindings(c),id=c.req.param('planSetId');
      const plan=store.getPlan(context.personId,id);
      if(plan.status==='pending')await service.createPlan(planInput(plan));
      return response(c,await service.getPlan(id));
    }));
    api.post('/transfer/plan-sets/:planSetId/adoption',c=>guarded(async()=>{
      const {db,context,service}=bindings(c),id=c.req.param('planSetId');
      const variant=(c.get('input').body as {variant:Variant}).variant;
      const version=expectedVersion(c.req.header('If-Match'));
      await service.getPlan(id);
      const identity={context,operation:`POST /api/v1/transfer/plan-sets/${id}/adoption`,key:idempotencyKey(c.req.header('Idempotency-Key')),input:{variant,version}};
      let receipt:Receipt;
      try {
        const reservation=beginRequest(db,identity);
        if(reservation.existing)return response(c,await service.getPlan(id));
        receipt=reservation.receipt;
      } catch(error) {
        if(!(error instanceof CommonError)||error.code!=='BUSY')throw error;
        // beginRequest already checked identical key/hash. Resume the feature's durable route reservation.
        // A live concurrent operation is still rejected by TransferService's per-plan lock.
        receipt={...identity,hash:requestHash(identity.input)};
      }
      return response(c,await service.adopt(id,variant,version,plan=>completeRequest(db,receipt,saved(plan))));
    }));
  }});
}
