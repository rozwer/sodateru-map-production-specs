import { TransferError } from './types.ts';
import type { RecipeInput, PlanInput, SourceRef } from './types.ts';

export function invalid(message: string): never { throw new TransferError('VALIDATION_FAILED', message); }
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid('オブジェクトを指定してください');
  return value as Record<string, unknown>;
}
export function string(value: unknown, name: string, max = 2000, min = 1): string {
  if (typeof value !== 'string' || value.trim().length < min || value.length > max) invalid(`${name}の文字数が不正です`);
  return value;
}
export function integer(value: unknown, name: string, min: number, max: number): number {
  if (!Number.isSafeInteger(value) || (value as number) < min || (value as number) > max) invalid(`${name}の範囲が不正です`);
  return value as number;
}
export function array(value: unknown, name: string, max: number, min = 0): unknown[] {
  if (!Array.isArray(value) || value.length < min || value.length > max) invalid(`${name}の件数が不正です`);
  return value;
}
export function texts(value: unknown, name: string, max = 20): string[] {
  return array(value, name, max).map(v => string(v, name));
}
export function unique(values: string[], name: string): void {
  if (new Set(values).size !== values.length) invalid(`${name}が重複しています`);
}
export function refs(value: unknown): SourceRef[] {
  const result = array(value, 'sourceRefs', 200, 1).map(v => {
    const r = object(v);
    if (!['record','visit','place','checkin','route'].includes(r.type as string)) invalid('sourceRef.typeが不正です');
    return { type: r.type as SourceRef['type'], id: string(r.id, 'sourceRef.id', 200), version: integer(r.version, 'sourceRef.version', 1, Number.MAX_SAFE_INTEGER) };
  });
  unique(result.map(r => `${r.type}:${r.id}`), 'sourceRefs');
  return result.sort((a,b) => a.type.localeCompare(b.type) || a.id.localeCompare(b.id));
}
export function recipeInput(value: unknown): RecipeInput {
  const v = object(value);
  const sourceRefs = refs(v.sourceRefs);
  const recordIds = new Set(sourceRefs.filter(r => r.type === 'record').map(r => r.id));
  if (!recordIds.size) invalid('元記録の根拠が必要です');
  const steps = array(v.steps, 'steps', 9, 1).map(raw => {
    const s = object(raw);
    const ids = array(s.sourceRecordIds, 'sourceRecordIds', 20, 1).map(id => string(id, 'recordId', 200));
    unique(ids, 'sourceRecordIds');
    if (ids.some(id => !recordIds.has(id))) invalid('stepの元記録がsourceRefsにありません');
    if (typeof s.required !== 'boolean') invalid('step.requiredは真偽値です');
    return { id: string(s.id, 'step.id', 200), meaning: string(s.meaning, 'step.meaning'), sourceRecordIds: ids,
      stayMinutes: integer(s.stayMinutes, 'stayMinutes', 0, 1440), required: s.required };
  });
  unique(steps.map(s => s.id), 'step.id');
  return { id: string(v.id, 'id', 200), title: string(v.title, 'title', 200), meaning: string(v.meaning, 'meaning'), sourceRefs, steps,
    requiredConditions: texts(v.requiredConditions, 'requiredConditions'), allowedChanges: texts(v.allowedChanges, 'allowedChanges') };
}
export function planInput(value: unknown): PlanInput {
  const v = object(value), p = object(v.start);
  if (typeof p.longitude !== 'number' || !Number.isFinite(p.longitude) || Math.abs(p.longitude) > 180 || typeof p.latitude !== 'number' || !Number.isFinite(p.latitude) || Math.abs(p.latitude) > 90) invalid('出発点の座標が不正です');
  if (!['walking', 'driving'].includes(v.mode as string)) invalid('移動方法が不正です');
  return { id: string(v.id, 'id', 80), recipeId: string(v.recipeId, 'recipeId', 200), recipeVersion: integer(v.recipeVersion, 'recipeVersion', 1, Number.MAX_SAFE_INTEGER),
    region: string(v.region, 'region', 300), start: { longitude: p.longitude, latitude: p.latitude }, mode: v.mode as PlanInput['mode'],
    timeBudgetMinutes: integer(v.timeBudgetMinutes, 'timeBudgetMinutes', 1, 1440), preferences: string(v.preferences, 'preferences', 4000, 0) };
}
