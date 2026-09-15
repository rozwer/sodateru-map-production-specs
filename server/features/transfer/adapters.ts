import type { DatabaseSync } from 'node:sqlite';
import type { RequestContext } from '../../core/context.ts';
import { transaction } from '../../db/migrate.ts';
import { createInformationService } from '../../information/service.ts';
import { createRoutesService } from '../routes/index.ts';
import { createConversation, startRun, getRun, assertRunAdoptable, appendAppliedRef, canonicalHash } from '../../ai/index.ts';
import { findCandidates, sourceMaterials } from './materials.ts';
import type { Dependencies } from './service.ts';

const routeServices = new WeakMap<DatabaseSync, ReturnType<typeof createRoutesService>>();
export function createTransferDependencies(db: DatabaseSync, context: RequestContext): Dependencies {
  const info = createInformationService(db);
  let routes = routeServices.get(db);
  if (!routes) { routes = createRoutesService(db); routeServices.set(db,routes); }
  const routeService = routes;
  return {
    async assertSources(refs) { return info.assertSourcesCurrent(context,{refs}); },
    assertSourcesNow(refs) { return info.assertSourcesCurrent(context,{refs}); },
    async sourceMaterials(refs) { return sourceMaterials(db,context,refs); },
    candidates(recipe,region) { return findCandidates(db,context,recipe,region); },
    async startRun(plan) {
      // Stable request IDs recover an accepted AI run if the response was lost.
      const stem = canonicalHash({personId:context.personId,planSetId:plan.id});
      const conversationId = `transfer-c-${stem.slice(0,48)}`;
      await createConversation(db,context,{id:conversationId,purpose:'comparison',title:plan.recipe.title.slice(0,100),recordId:null});
      return startRun(db,context,{conversationId,userMessageId:`transfer-u-${stem.slice(0,48)}`,assistantMessageId:`transfer-a-${stem.slice(0,48)}`,
        text:`${plan.region}で「${plan.recipe.meaning}」を再現する忠実案と本人向け案を比較する。${plan.preferences}`,
        task:'transfer',input:{planSetId:plan.id},expectedRefs:plan.sourceRefs});
    },
    async getRun(id) { return getRun(db,context,id); },
    async preview(plan,placeIds) {
      const result = await routeService.previewRoute(context,{waypoints:[{kind:'point',coordinates:[plan.start.longitude,plan.start.latitude],label:'出発点'},...placeIds.map(placeId=>({kind:'stored' as const,placeId}))],mode:plan.mode,title:plan.recipe.title.slice(0,100)});
      return {id:result.previewId,durationSeconds:result.durationSec,distanceMeters:result.distanceM,expiresAt:result.expiresAt,
        sourceRefs:plan.candidates.filter(c=>placeIds.includes(c.placeId)).map(c=>({type:'place' as const,id:c.placeId,version:c.version}))};
    },
    async saveRoute(plan,variant,id) {
      const proposal = plan.plans.find(p=>p.variant===variant)!;
      // saveRoute reads its durable receipt before preview expiry, allowing crash recovery.
      return routeService.saveRoute(context,{id,previewId:proposal.route!.id,title:plan.recipe.title.slice(0,100)}).data;
    },
    async getRoute(id) { return routeService.getSavedRoute(context,id,true); },
    appendApplied(plan) {
      info.assertSourcesCurrent(context,{refs:plan.sourceRefs});
      assertRunAdoptable(db,context,plan.assistantMessageId!,{expectedAttempt:plan.assistantAttempt!});
      appendAppliedRef(db,context,plan.assistantMessageId!,{type:'transfer-plan-set',id:plan.id,version:plan.version,
        contentHash:canonicalHash({selectedVariant:plan.selectedVariant,savedRouteId:plan.savedRouteId,plans:plan.plans})});
    },
    transaction(fn) { return transaction(db,fn); },
  };
}
