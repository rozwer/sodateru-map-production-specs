import type { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { canonical, resolveDeclarations } from './declarations.ts';
import { PluginError, type ConflictResolution, type Json, type PluginContext, type PluginSetting, type PluginSnapshot, type PluginState } from './types.ts';

type Row = Record<string, any>;
const decode = (r: Row): PluginSetting => ({
  id: r.id, installId: r.install_id, version: r.version, createdAt: r.created_at, updatedAt: r.updated_at,
  enabled: r.enabled === 1, settings: JSON.parse(r.settings_json), pluginVersion: r.plugin_version,
  icon: r.icon, declarations: JSON.parse(r.declarations_json), manifest: JSON.parse(r.manifest_json),
  previousVersion: r.previous_json ? JSON.parse(r.previous_json).pluginVersion : null,
});
export class PluginStore {
  constructor(public db: DatabaseSync, public context: PluginContext) {
    if (!context.personId || !['live','demo'].includes(context.dataMode)) throw new PluginError(401, 'UNAUTHENTICATED', '本人の開始が必要です');
  }
  list(): PluginSetting[] {
    return this.db.prepare('SELECT * FROM plugin_settings WHERE person_id=? AND installed=1 ORDER BY id').all(this.context.personId).map(decode);
  }
  get(id: string): PluginSetting {
    const row = this.db.prepare('SELECT * FROM plugin_settings WHERE person_id=? AND id=? AND installed=1').get(this.context.personId,id);
    if (!row) throw new PluginError(404,'NOT_FOUND','導入済みの機能がありません');
    return decode(row);
  }
  retained(id: string): PluginSetting | null {
    const row = this.db.prepare('SELECT * FROM plugin_settings WHERE person_id=? AND id=?').get(this.context.personId,id);
    return row ? decode(row) : null;
  }
  previous(id: string): PluginSnapshot {
    const row = this.db.prepare('SELECT previous_json FROM plugin_settings WHERE person_id=? AND id=? AND installed=1').get(this.context.personId,id);
    if (!row?.previous_json) throw new PluginError(409,'STATE_CONFLICT','戻せる前の版がありません');
    return JSON.parse(String(row.previous_json));
  }
  resolutions(): ConflictResolution[] {
    return this.db.prepare('SELECT resolution_json FROM plugin_conflict_resolutions WHERE person_id=? ORDER BY conflict_key').all(this.context.personId).map(r => JSON.parse(String(r.resolution_json)));
  }
  /** Feature savepoint composes with CORE's outer idempotency transaction. */
  atomic<T>(fn: () => T): T {
    this.context.signal.throwIfAborted();
    this.db.exec('SAVEPOINT plugins_mutation');
    try { const result = fn(); this.db.exec('RELEASE plugins_mutation'); return result; }
    catch (error) { this.db.exec('ROLLBACK TO plugins_mutation; RELEASE plugins_mutation'); throw error; }
  }
  save(item: PluginSetting, expected: number | null, previous?: PluginSnapshot) {
    const params = [item.version,item.updatedAt,item.enabled ? 1 : 0,JSON.stringify(item.settings),item.pluginVersion,item.icon,JSON.stringify(item.declarations),JSON.stringify(item.manifest)];
    if (expected === null) {
      this.db.prepare(`INSERT INTO plugin_settings(person_id,id,install_id,version,created_at,updated_at,enabled,installed,settings_json,plugin_version,icon,declarations_json,manifest_json)
        VALUES(?,?,?,?,?,?,?,1,?,?,?,?,?)`).run(this.context.personId,item.id,item.installId,item.version,item.createdAt,item.updatedAt,item.enabled ? 1 : 0,JSON.stringify(item.settings),item.pluginVersion,item.icon,JSON.stringify(item.declarations),JSON.stringify(item.manifest));
    } else {
      const sql = `UPDATE plugin_settings SET version=?,updated_at=?,enabled=?,installed=1,settings_json=?,plugin_version=?,icon=?,declarations_json=?,manifest_json=?${previous ? ',previous_json=?' : ''} WHERE person_id=? AND id=? AND version=?`;
      const result = this.db.prepare(sql).run(...params,...(previous ? [JSON.stringify(previous)] : []),this.context.personId,item.id,expected);
      if (Number(result.changes) !== 1) throw new PluginError(412,'VERSION_CONFLICT','別の操作で設定が変更されました');
    }
    this.db.prepare('INSERT INTO plugin_version_history(install_id,revision,snapshot_json,created_at) VALUES(?,?,?,?)').run(item.installId,item.version,JSON.stringify(item),item.updatedAt);
  }
  remove(id: string, expected: number) {
    const result = this.db.prepare('UPDATE plugin_settings SET installed=0,enabled=0,version=version+1,updated_at=? WHERE person_id=? AND id=? AND version=? AND installed=1').run(Date.now(),this.context.personId,id,expected);
    if (Number(result.changes) !== 1) throw new PluginError(412,'VERSION_CONFLICT','別の操作で設定が変更されました');
  }
  saveResolutions(resolutions: ConflictResolution[]) {
    for (const resolution of resolutions) this.db.prepare('INSERT INTO plugin_conflict_resolutions(person_id,conflict_key,resolution_json) VALUES(?,?,?) ON CONFLICT(person_id,conflict_key) DO UPDATE SET resolution_json=excluded.resolution_json').run(this.context.personId,resolution.key,JSON.stringify(resolution));
  }
}
/** Synchronous: MAP-CUSTOM can call this inside the same CORE SQLite transaction. */
export function getPluginState(db: DatabaseSync, context: PluginContext): PluginState {
  const store = new PluginStore(db,context), items = store.list();
  const effective = resolveDeclarations(items,store.resolutions());
  const revision = createHash('sha256').update(canonical({ personId: context.personId, dataMode: context.dataMode, items, resolutions: effective.resolutions } as unknown as Json)).digest('hex');
  return { personId: context.personId, dataMode: context.dataMode, revision, items, ...effective,
    plugins: items.map(item => ({ pluginId: item.id, installId: item.installId, ownerKey: `plugin:${item.installId}`, installedVersion: item.pluginVersion, version: item.version, enabled: item.enabled, resolvedDeclarations: effective.appliedDeclarations.filter(d => d.pluginId === item.id) })) };
}
