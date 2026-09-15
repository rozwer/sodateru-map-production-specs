import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import type { RequestContext } from '../../core/context.ts';
import { CommonError } from '../../core/errors.ts';
import { getRun, readAppliedRefs, appendAppliedRef, canonicalHash } from '../../ai/index.ts';
import { getPluginState } from '../plugins/index.ts';
import { MapCustomRepository } from './repository.ts';
import { effectiveSettings } from './effective.ts';
import { validateMapstyleResult } from './domain.ts';

type Row = Record<string, any>;
function error(code: string, message: string, status: number): never {
  throw new CommonError(code, message, false, undefined, status);
}
function previewDto(row: Row) {
  return { id: row.id, messageId: row.message_id, settingsId: row.settings_id,
    settingsVersion: row.settings_version, pluginSnapshot: row.plugin_snapshot,
    proposal: JSON.parse(row.proposal_json), contentHash: row.content_hash, explanation: row.explanation,
    state: row.state, version: row.version, appliedVersion: row.applied_version,
    createdAt: row.created_at, updatedAt: row.updated_at };
}
/** Calls below ending in Sync must run inside CORE's synchronous transaction. */
export class MapCustomAdoption {
  private repository: MapCustomRepository;
  constructor(readonly db: DatabaseSync, readonly context: RequestContext) {
    this.repository = new MapCustomRepository(db, context);
  }
  private row(id: string): Row {
    return this.db.prepare('SELECT * FROM map_custom_previews WHERE id=? AND person_id=? AND data_mode=?')
      .get(id,this.context.personId,this.context.dataMode) ?? error('NOT_FOUND','プレビューが見つかりません。',404);
  }
  getPreview(id: string) { return previewDto(this.row(id)); }
  async verifiedResult(messageId: string) {
    const run = await getRun(this.db, this.context, messageId);
    if (run.task !== 'mapstyle' || run.status !== 'complete' || !run.result) error('STATE_CONFLICT','完了した地図設定案だけをプレビューできます。',409);
    return validateMapstyleResult(run.result);
  }
  createPreviewSync(messageId: string, result: ReturnType<typeof validateMapstyleResult>) {
    const existing = this.db.prepare('SELECT * FROM map_custom_previews WHERE message_id=? AND person_id=? AND data_mode=?')
      .get(messageId,this.context.personId,this.context.dataMode);
    if (existing) return previewDto(existing);
    const source = this.db.prepare('SELECT * FROM map_custom_ai_inputs WHERE message_id=? AND person_id=? AND data_mode=?')
      .get(messageId,this.context.personId,this.context.dataMode);
    if (!source) error('INPUT_CHANGED','元の設定を確認できません。地図設定を読み直して相談してください。',409);
    const saved = this.repository.getSettings();
    if (source.settings_id !== saved.id || source.settings_version !== saved.version) error('VERSION_CONFLICT','提案後に地図設定が変更されています。',412);
    if (source.plugin_snapshot !== getPluginState(this.db,this.context).revision) error('INPUT_CHANGED','拡張機能が変更されています。再確認してください。',409);
    // Confirms ownership/complete in the same DB transaction after the awaited result check.
    readAppliedRefs(this.db,this.context,messageId);
    const now = Date.now(), id = randomUUID();
    this.db.prepare(`INSERT INTO map_custom_previews(id,person_id,data_mode,message_id,settings_id,settings_version,plugin_snapshot,proposal_json,content_hash,explanation,created_at,updated_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).run(id,this.context.personId,this.context.dataMode,messageId,saved.id,saved.version,source.plugin_snapshot,JSON.stringify(result.proposal),canonicalHash(result.proposal),result.explanation,now,now);
    return this.getPreview(id);
  }
  cancelSync(id: string, expectedVersion: number) {
    const row = this.row(id);
    if (row.state === 'applied') error('STATE_CONFLICT','採用済みの設定案は取り消せません。',409);
    if (row.version !== expectedVersion) error('VERSION_CONFLICT','プレビューが変更されています。',412);
    if (row.state !== 'cancelled') this.db.prepare("UPDATE map_custom_previews SET state='cancelled',version=version+1,updated_at=? WHERE id=? AND version=?").run(Date.now(),id,expectedVersion);
    return this.getPreview(id);
  }
  adoptSync(id: string, expectedSettingsVersion: number, verified: ReturnType<typeof validateMapstyleResult>) {
    const row = this.row(id);
    if (row.state === 'cancelled') error('STATE_CONFLICT','取り消した設定案は採用できません。',409);
    if (canonicalHash(verified.proposal) !== row.content_hash) error('INPUT_CHANGED','AI結果が変更されています。',409);
    const state = getPluginState(this.db,this.context);
    const saved = this.repository.getSettings();
    const refs = readAppliedRefs(this.db,this.context,row.message_id);
    const applied = refs.find(ref => ref.type === 'map-settings' && ref.id === saved.id && ref.contentHash === row.content_hash);
    if (applied) return { settings: effectiveSettings(saved,state), preview: this.getPreview(id), appliedRef: applied, alreadyApplied: true };
    if (saved.version !== expectedSettingsVersion || saved.version !== row.settings_version || saved.id !== row.settings_id) error('VERSION_CONFLICT','地図設定が変更されています。編集値を残して再確認してください。',412);
    if (state.revision !== row.plugin_snapshot) error('INPUT_CHANGED','拡張機能が変更されています。再確認してください。',409);
    const updated = this.repository.saveSettings(expectedSettingsVersion, { style: verified.proposal, layers: saved.layers });
    const ref = { type: 'map-settings' as const, id: updated.id, version: updated.version, contentHash: row.content_hash };
    appendAppliedRef(this.db,this.context,row.message_id,ref);
    this.db.prepare("UPDATE map_custom_previews SET state='applied',version=version+1,applied_version=?,updated_at=? WHERE id=?").run(updated.version,Date.now(),id);
    return { settings: effectiveSettings(updated,state), preview: this.getPreview(id), appliedRef: ref, alreadyApplied: false };
  }
}
