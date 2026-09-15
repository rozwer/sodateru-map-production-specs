import { randomUUID } from 'node:crypto';
import { TransferStore } from './store.ts';
import { TransferError } from './types.ts';
import type { Recipe, PlanSet, SourceRef, Candidate, RoutePreview, Variant } from './types.ts';
import { planInput, recipeInput } from './validation.ts';
import { materializePlans, validateProposal } from './planning.ts';

export type Context = { personId: string; dataMode: 'live'|'demo'; requestId: string; signal: AbortSignal };
export type Evidence = { id: string; role: string; text: string; sourceRef: SourceRef };
export type PlanMaterials = Pick<PlanSet,'id'|'recipe'|'region'|'start'|'mode'|'timeBudgetMinutes'|'preferences'|'candidates'|'generatorVersion'>;
export type Materials = { context: { planSet: PlanMaterials }; evidence: Evidence[]; sourceRefs: SourceRef[] };
export type Dependencies = {
  assertSources(refs: SourceRef[]): Promise<unknown>;
  assertSourcesNow(refs: SourceRef[]): unknown;
  sourceMaterials(refs: SourceRef[]): Promise<{ evidence: Evidence[]; sourceRefs: SourceRef[] }>;
  candidates(recipe: Recipe, region: string): Promise<Candidate[]>;
  startRun(plan: PlanSet): Promise<{ id: string }>;
  getRun(id: string): Promise<{ status: string; attempt: number; result: unknown; error: PlanSet['error'] }>;
  preview(plan: PlanSet, placeIds: string[]): Promise<RoutePreview>;
  saveRoute(plan: PlanSet, variant: Variant, id: string): Promise<{ id: string }>;
  getRoute(id: string): Promise<{ id: string }>;
  appendApplied(plan: PlanSet): void;
  transaction<T>(fn: () => T): T;
};

const operations = new WeakMap<object, Map<string, Promise<unknown>>>();
export class TransferService {
  store: TransferStore; context: Context; deps: Dependencies;
  constructor(store: TransferStore, context: Context, deps: Dependencies) { this.store = store; this.context = context; this.deps = deps; }
  private async exclusive<T>(id: string, fn: () => Promise<T>): Promise<T> {
    let map = operations.get(this.store.db);
    if (!map) { map = new Map(); operations.set(this.store.db, map); }
    const key = `${this.context.personId}:${id}`;
    if (map.has(key)) throw new TransferError('BUSY', '計画を処理しています。少し待って再取得してください');
    const work = fn(); map.set(key, work);
    try { return await work; } finally { map.delete(key); }
  }
  private recipeCurrent(plan: PlanSet): void {
    if (this.store.getRecipe(this.context.personId, plan.recipeId).version !== plan.recipeVersion) throw new TransferError('SOURCE_CHANGED', 'レシピが変更されました。新しい計画を生成してください');
  }
  async createRecipe(raw: unknown): Promise<Recipe> {
    const input = recipeInput(raw);
    await this.deps.assertSources(input.sourceRefs);
    const materials = await this.deps.sourceMaterials(input.sourceRefs);
    await this.deps.assertSources(materials.sourceRefs);
    return this.store.createRecipe(this.context.personId, { ...input, sourceRefs: materials.sourceRefs });
  }
  async replaceRecipe(id: string, version: number, raw: unknown): Promise<Recipe> {
    const input = recipeInput(raw);
    await this.deps.assertSources(input.sourceRefs);
    const materials = await this.deps.sourceMaterials(input.sourceRefs);
    await this.deps.assertSources(materials.sourceRefs);
    return this.store.replaceRecipe(this.context.personId, id, version, { ...input, sourceRefs: materials.sourceRefs });
  }
  async getRecipe(id: string): Promise<Recipe> {
    const recipe = this.store.getRecipe(this.context.personId,id);
    await this.deps.assertSources(recipe.sourceRefs); return recipe;
  }
  async createPlan(raw: unknown): Promise<PlanSet> {
    const input = planInput(raw);
    return this.exclusive(input.id, async () => {
      const recipe = await this.getRecipe(input.recipeId);
      if (recipe.version !== input.recipeVersion) throw new TransferError('SOURCE_CHANGED', '表示していたレシピが変更されています');
      let plan = this.store.createPlan(this.context.personId,input,recipe);
      if (plan.status !== 'pending') { await this.deps.assertSources(plan.sourceRefs); return plan; }
      try {
        const candidates = plan.candidates.length ? plan.candidates : await this.deps.candidates(recipe,input.region);
        const refs = new Map(plan.sourceRefs.map(r => [`${r.type}:${r.id}`,r]));
        for (const c of candidates) refs.set(`place:${c.placeId}`, { type:'place',id:c.placeId,version:c.version });
        await this.deps.assertSources([...refs.values()]); this.recipeCurrent(plan);
        plan = this.store.updatePlan(this.context.personId,{ ...plan, candidates, sourceRefs:[...refs.values()] });
        const run = await this.deps.startRun(plan);
        plan = this.store.updatePlan(this.context.personId,{ ...plan, status:'running', assistantMessageId:run.id });
      } catch (error) {
        plan = this.store.updatePlan(this.context.personId,{ ...plan, status:'failed', error:errorDTO(error) });
        if (['SOURCE_CHANGED','NOT_FOUND'].includes((error as {code?:string}).code ?? '')) throw error;
      }
      return plan;
    });
  }
  async getPlan(id: string): Promise<PlanSet> {
    return this.exclusive(id, async () => {
      let plan = this.store.getPlan(this.context.personId,id);
      await this.deps.assertSources(plan.sourceRefs);
      if (plan.status === 'adopted' && plan.savedRouteId) await this.deps.getRoute(plan.savedRouteId);
      if (!plan.assistantMessageId || ['complete','incomplete','adopted'].includes(plan.status)) return plan;
      const run = await this.deps.getRun(plan.assistantMessageId);
      if (run.status === 'complete') {
        try {
          this.recipeCurrent(plan);
          const materials = await this.deps.sourceMaterials(plan.sourceRefs);
          const result = validateProposal(run.result,plan.recipe,plan.candidates,materials.evidence);
          const plans = await materializePlans(result,plan.recipe,plan.timeBudgetMinutes,ids => this.deps.preview(plan,ids));
          await this.deps.assertSources(plan.sourceRefs); this.recipeCurrent(plan);
          plan = this.store.updatePlan(this.context.personId,{ ...plan,plans,assistantAttempt:run.attempt,commonalities:result.commonalities,differences:result.differences,
            status:plans.every(p=>p.eligible)?'complete':'incomplete',error:null });
        } catch(error) {
          if (['SOURCE_CHANGED','NOT_FOUND'].includes((error as {code?:string}).code ?? '')) throw error;
          plan = this.store.updatePlan(this.context.personId,{ ...plan,status:'failed',error:errorDTO(error) });
        }
      } else if (run.status === 'failed' || run.status === 'cancelled') {
        if (plan.status !== run.status) plan = this.store.updatePlan(this.context.personId,{ ...plan,status:run.status,error:run.error });
      } else if (plan.status !== 'running') plan = this.store.updatePlan(this.context.personId,{ ...plan,status:'running',error:null });
      return plan;
    });
  }
  async adopt(id: string, variant: Variant, version: number, onSaved?: (plan: PlanSet) => void): Promise<PlanSet> {
    if (!['faithful','personalized'].includes(variant)) throw new TransferError('VALIDATION_FAILED','選択する案が不正です');
    return this.exclusive(id, async () => {
      let plan = this.store.getPlan(this.context.personId,id);
      await this.deps.assertSources(plan.sourceRefs);
      if (plan.selectedVariant !== null) {
        if (plan.selectedVariant !== variant) throw new TransferError('STATE_CONFLICT','採用済みの案は変更できません。新しい計画を作成してください');
        await this.deps.getRoute(plan.savedRouteId!);
        if (onSaved) this.deps.transaction(()=>onSaved(plan));
        return plan;
      }
      this.recipeCurrent(plan);
      if (plan.version !== version) throw new TransferError('VERSION_CONFLICT','計画が変更されています');
      const chosen = plan.plans.find(p=>p.variant===variant);
      if (plan.status !== 'complete' || !chosen?.eligible || !chosen.route || !plan.assistantMessageId) throw new TransferError('STATE_CONFLICT','二案の比較が成立し、条件を満たしてから採用してください');
      const run = await this.deps.getRun(plan.assistantMessageId);
      if (run.status !== 'complete' || run.attempt !== plan.assistantAttempt) throw new TransferError('STATE_CONFLICT','AI結果を再取得してください');
      const routeId = this.store.reserveAdoption(this.context.personId,id,version,variant,randomUUID());
      // Common saveRoute owns retention/expiry/version and its durable creation receipt.
      // Keep this stable ID even if the process stops after route save.
      const saved = await this.deps.saveRoute(plan,variant,routeId);
      if (saved.id !== routeId) throw new TransferError('OUTPUT_INVALID','共通経路の保存IDが一致しません');
      await this.deps.assertSources(plan.sourceRefs); this.recipeCurrent(plan);
      plan = this.deps.transaction(() => {
        const current = this.store.getPlan(this.context.personId,id);
        if (current.version !== version) throw new TransferError('VERSION_CONFLICT','計画が変更されています');
        const adopted = this.store.updatePlan(this.context.personId,{...current,status:'adopted',selectedVariant:variant,savedRouteId:saved.id});
        this.deps.appendApplied(adopted); onSaved?.(adopted); return adopted;
      });
      return plan;
    });
  }
}

function errorDTO(error: unknown): NonNullable<PlanSet['error']> {
  const e = error as { code?:string; message?:string; retryable?:boolean };
  return { code:e.code??'UPSTREAM_FAILED',message:e.message??'計画の生成に失敗しました',retryable:e.retryable??false };
}
