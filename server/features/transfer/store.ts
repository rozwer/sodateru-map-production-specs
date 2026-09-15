import type { DatabaseSync } from 'node:sqlite';
import { TransferError } from './types.ts';
import type { Recipe, PlanSet, PlanInput, Variant } from './types.ts';
import { recipeInput } from './validation.ts';

type Row = { [key: string]: string | number | null };
export class TransferStore {
  db: DatabaseSync;
  constructor(db: DatabaseSync) { this.db = db; }
  createRecipe(personId: string, raw: unknown): Recipe {
    const input = recipeInput(raw);
    const old = this.db.prepare('SELECT * FROM transfer_recipes WHERE id=?').get(input.id) as Row | undefined;
    if (old) {
      if (old.person_id !== personId || old.input_json !== JSON.stringify(input)) throw new TransferError('REQUEST_CONFLICT', '同じIDに異なるレシピが指定されています');
      return JSON.parse(old.recipe_json as string);
    }
    const now = Date.now();
    const recipe: Recipe = { ...input, version: 1, createdAt: now, updatedAt: now };
    this.db.prepare('INSERT INTO transfer_recipes VALUES(?,?,?,?,?,?,?)').run(input.id, personId, 1, JSON.stringify(input), JSON.stringify(recipe), now, now);
    return recipe;
  }
  getRecipe(personId: string, id: string): Recipe {
    const row = this.db.prepare('SELECT recipe_json FROM transfer_recipes WHERE id=? AND person_id=?').get(id, personId);
    if (!row) throw new TransferError('NOT_FOUND', 'レシピが見つかりません');
    return JSON.parse(row.recipe_json as string);
  }
  listRecipes(personId: string): Recipe[] {
    return this.db.prepare('SELECT recipe_json FROM transfer_recipes WHERE person_id=? ORDER BY updated_at DESC,id LIMIT 100').all(personId).map(r => JSON.parse(r.recipe_json as string));
  }
  replaceRecipe(personId: string, id: string, version: number, raw: unknown): Recipe {
    const input = recipeInput(raw), old = this.getRecipe(personId, id);
    if (input.id !== id) throw new TransferError('VALIDATION_FAILED', 'レシピIDを変更できません');
    const recipe = { ...input, version: old.version + 1, createdAt: old.createdAt, updatedAt: Date.now() };
    const result = this.db.prepare('UPDATE transfer_recipes SET version=?,recipe_json=?,updated_at=? WHERE id=? AND person_id=? AND version=?').run(recipe.version, JSON.stringify(recipe), recipe.updatedAt, id, personId, version);
    if (!result.changes) throw new TransferError('VERSION_CONFLICT', 'レシピが更新されています');
    return recipe;
  }
  createPlan(personId: string, input: PlanInput, recipe: Recipe): PlanSet {
    const old = this.db.prepare('SELECT * FROM transfer_plan_sets WHERE id=?').get(input.id) as Row | undefined;
    if (old) {
      if (old.person_id !== personId || old.input_json !== JSON.stringify(input)) throw new TransferError('REQUEST_CONFLICT', '同じIDに異なる計画が指定されています');
      return JSON.parse(old.plan_json as string);
    }
    const now = Date.now();
    const plan: PlanSet = { ...input, recipe, sourceRefs: recipe.sourceRefs, candidates: [], generatorVersion: 'transfer-v1',
      status: 'pending', assistantMessageId: null, plans: [], commonalities: [], differences: [], selectedVariant: null, savedRouteId: null,
      error: null, version: 1, createdAt: now, updatedAt: now };
    this.db.prepare('INSERT INTO transfer_plan_sets(id,person_id,recipe_id,version,input_json,plan_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)').run(input.id, personId, recipe.id, 1, JSON.stringify(input), JSON.stringify(plan), now, now);
    return plan;
  }
  getPlan(personId: string, id: string): PlanSet {
    const row = this.db.prepare('SELECT plan_json FROM transfer_plan_sets WHERE id=? AND person_id=?').get(id, personId);
    if (!row) throw new TransferError('NOT_FOUND', '計画が見つかりません');
    return JSON.parse(row.plan_json as string);
  }
  listPlans(personId: string): PlanSet[] {
    return this.db.prepare('SELECT plan_json FROM transfer_plan_sets WHERE person_id=? ORDER BY updated_at DESC,id LIMIT 100').all(personId).map(r => JSON.parse(r.plan_json as string));
  }
  updatePlan(personId: string, plan: PlanSet): PlanSet {
    const next = { ...plan, version: plan.version + 1, updatedAt: Date.now() };
    const result = this.db.prepare('UPDATE transfer_plan_sets SET version=?,plan_json=?,updated_at=? WHERE id=? AND person_id=? AND version=?').run(next.version, JSON.stringify(next), next.updatedAt, next.id, personId, plan.version);
    if (!result.changes) throw new TransferError('VERSION_CONFLICT', '計画が更新されています');
    return next;
  }
  reserveAdoption(personId: string, id: string, version: number, variant: Variant, routeId: string): string {
    const row = this.db.prepare('SELECT version,adoption_variant,adoption_route_id FROM transfer_plan_sets WHERE id=? AND person_id=?').get(id, personId) as Row | undefined;
    if (!row) throw new TransferError('NOT_FOUND', '計画が見つかりません');
    if (row.adoption_variant) {
      if (row.adoption_variant !== variant) throw new TransferError('STATE_CONFLICT', '別の案の採用処理が始まっています');
      return row.adoption_route_id as string;
    }
    if (row.version !== version) throw new TransferError('VERSION_CONFLICT', '計画が更新されています');
    this.db.prepare('UPDATE transfer_plan_sets SET adoption_variant=?,adoption_route_id=? WHERE id=? AND person_id=? AND version=? AND adoption_variant IS NULL').run(variant, routeId, id, personId, version);
    return routeId;
  }
}
