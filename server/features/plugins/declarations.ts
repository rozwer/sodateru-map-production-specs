import { createHash } from 'node:crypto';
import { PluginError, type AppliedDeclaration, type ConflictResolution, type Declaration, type Json, type PluginConflict, type PluginSetting } from './types.ts';

export function canonical(value: Json): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value !== null && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k]!)).join(',') + '}';
  return JSON.stringify(value);
}
export function validateDeclarations(declarations: Declaration[]): Declaration[] {
  const seen = new Set<string>();
  for (const d of declarations) {
    if (!d.targetKey || !d.property || d.targetKey.length > 200 || d.property.length > 100 || d.value === undefined) throw new PluginError(422, 'VALIDATION_FAILED', '適用宣言の対象・項目・値が必要です');
    const key = JSON.stringify([d.targetKey, d.property]);
    if (seen.has(key)) throw new PluginError(422, 'VALIDATION_FAILED', '一つの機能から同じ対象・項目へ複数の宣言はできません');
    seen.add(key);
  }
  return structuredClone(declarations);
}
export function resolveDeclarations(items: PluginSetting[], saved: ConflictResolution[] = []) {
  const groups = new Map<string, AppliedDeclaration[]>();
  for (const item of [...items].sort((a,b) => a.id.localeCompare(b.id))) {
    if (!item.enabled) continue;
    for (const d of item.declarations) {
      const key = JSON.stringify([d.targetKey, d.property]);
      const group = groups.get(key) ?? [];
      group.push({ ...d, pluginId: item.id, pluginVersion: item.pluginVersion });
      groups.set(key, group);
    }
  }
  const conflicts: PluginConflict[] = [], appliedDeclarations: AppliedDeclaration[] = [], resolutions: ConflictResolution[] = [];
  for (const declarations of groups.values()) {
    if (new Set(declarations.map(d => canonical(d.value))).size < 2) { appliedDeclarations.push(...declarations); continue; }
    const { targetKey, property } = declarations[0]!;
    // Bind a choice to exactly these declarations and release versions. An update must be reviewed again.
    const key = createHash('sha256').update(canonical(declarations as unknown as Json)).digest('hex');
    const resolution = saved.find(r => r.key === key);
    const ids = declarations.map(d => d.pluginId);
    if (resolution && resolution.pluginIds.length === new Set(resolution.pluginIds).size &&
      resolution.pluginIds.every(id => ids.includes(id)) &&
      ((resolution.strategy === 'prefer' && resolution.pluginIds.length === 1) ||
       (resolution.strategy === 'coexist' && resolution.pluginIds.length === ids.length))) {
      resolutions.push(resolution);
      for (const id of resolution.pluginIds) appliedDeclarations.push(declarations.find(d => d.pluginId === id)!);
    } else {
      conflicts.push({ key, targetKey, property, declarations });
    }
  }
  return { appliedDeclarations, conflicts, resolutions };
}

/** Carry only choices whose remaining release declarations are byte-for-byte unchanged. */
export function projectResolutions(before: PluginSetting[], after: PluginSetting[], saved: ConflictResolution[]): ConflictResolution[] {
  const prior=resolveDeclarations(before,[]).conflicts;
  const valid=resolveDeclarations(before,saved).resolutions;
  return resolveDeclarations(after,[]).conflicts.flatMap(next=>{
    const parent=prior.find(old=>next.declarations.every(d=>old.declarations.some(p=>canonical(p as unknown as Json)===canonical(d as unknown as Json))));
    const choice=parent && valid.find(r=>r.key===parent.key);
    if (!choice) return [];
    const ids=choice.pluginIds.filter(id=>next.declarations.some(d=>d.pluginId===id));
    if (!ids.length) return [];
    return [{...choice,key:next.key,pluginIds:ids}];
  });
}
