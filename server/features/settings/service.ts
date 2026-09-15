import type { DatabaseSync } from 'node:sqlite';
import { createRequire } from 'node:module';
import { Ajv } from 'ajv';
import { CommonError } from '../../core/errors.ts';
import { getPerson } from '../../core/session.ts';
import { defaults, SettingsPatch, PersonPatch, type Preferences, type SavedSettings } from './schema.ts';

const ajv = new Ajv({ allErrors: true, strict: false });
const addFormats = createRequire(import.meta.url)('ajv-formats') as import('ajv-formats').FormatsPlugin;
addFormats(ajv);
const validateSettings = ajv.compile(SettingsPatch);
const validatePerson = ajv.compile(PersonPatch);

function invalid(message: string) { return new CommonError('VALIDATION_FAILED', message, false, undefined, 422); }
function match(actual: number, expected: number) {
  if (actual !== expected) throw new CommonError('VERSION_CONFLICT', '保存後に内容が変更されています。', false, { currentVersion: actual }, 412);
}

export function readPerson(db: DatabaseSync, personId: string) {
  return getPerson(db, personId);
}

export function readSettings(db: DatabaseSync, personId: string): SavedSettings {
  const person = readPerson(db, personId);
  const row = db.prepare('SELECT * FROM person_settings WHERE person_id = ?').get(personId);
  return row ? { ...JSON.parse(String(row.preferences_json)), id: personId, version: Number(row.version), createdAt: Number(row.created_at), updatedAt: Number(row.updated_at) } : { ...defaults(), id: personId, version: 1, createdAt: person.createdAt, updatedAt: person.createdAt };
}

/** Call within the CORE synchronous transaction when combining with other writes. */
export function patchSettings(db: DatabaseSync, personId: string, expected: number, input: unknown): SavedSettings {
  if (!validateSettings(input)) throw invalid('設定の項目・型・値を確認してください。');
  const patch = input as Partial<Preferences>;
  if (patch.notifications) {
    try { new Intl.DateTimeFormat('ja', { timeZone: patch.notifications.timeZone }); } catch { throw invalid('有効なタイムゾーンを指定してください。'); }
  }
  const current = readSettings(db, personId);
  match(current.version, expected);
  const { id: _id, version: _version, createdAt: _createdAt, updatedAt: _updatedAt, ...old } = current;
  const next = { ...old, ...patch };
  if (next.location.saveTrack && !next.location.enabled) throw invalid('軌跡の保存には位置情報の利用を有効にしてください。');
  if (next.suggestions.stopped.some((item, index, all) => all.findIndex(other => other.placeId === item.placeId && other.activity === item.activity) !== index)) throw invalid('提案停止対象が重複しています。');
  const now = Math.max(Date.now(), current.updatedAt);
  const result = db.prepare(`INSERT INTO person_settings(person_id, version, created_at, updated_at, preferences_json)
    VALUES (?, 2, ?, ?, ?) ON CONFLICT(person_id) DO UPDATE SET version=version+1, updated_at=excluded.updated_at,
    preferences_json=excluded.preferences_json WHERE person_settings.version=?`).run(personId, current.createdAt, now, JSON.stringify(next), expected);
  if (Number(result.changes) !== 1) match(readSettings(db, personId).version, expected);
  return readSettings(db, personId);
}

export function patchPerson(db: DatabaseSync, personId: string, expected: number, input: unknown) {
  if (!validatePerson(input)) throw invalid('表示名は1〜20文字、紹介は200文字以内で指定してください。');
  const patch = input as { name?: string; bio?: string; avatarUrl?: string | null };
  if (patch.name !== undefined && !patch.name.trim()) throw invalid('表示名を入力してください。');
  if (patch.avatarUrl !== undefined && patch.avatarUrl !== null) {
    const url = new URL(patch.avatarUrl);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw invalid('アイコンにはHTTP(S)のURLを指定してください。');
  }
  const current = readPerson(db, personId);
  match(current.version, expected);
  const result = db.prepare('UPDATE people SET name=?,bio=?,avatar_path=?,version=version+1,updated_at=? WHERE id=? AND version=?')
    .run(patch.name ?? current.name, patch.bio ?? current.bio, patch.avatarUrl === undefined ? current.avatarUrl : patch.avatarUrl, Math.max(Date.now(), current.updatedAt), personId, expected);
  if (Number(result.changes) !== 1) match(readPerson(db, personId).version, expected);
  if (patch.avatarUrl !== undefined) db.prepare('DELETE FROM profile_icons WHERE person_id=?').run(personId);
  return readPerson(db, personId);
}

export interface AiScope { records?: boolean; location?: boolean; media?: boolean; profile?: boolean }
/** Re-read immediately before external transmission; never trust a client-supplied allow flag. */
export function assertAiAllowed(db: DatabaseSync, personId: string, scope: AiScope = {}) {
  const settings = readSettings(db, personId);
  const ai = settings.ai;
  if (!ai.enabled || (scope.records && !ai.allowRecords) || (scope.location && !ai.allowLocation) || (scope.media && !ai.allowMedia) || (scope.profile && !ai.allowProfile)) {
    throw new CommonError('FORBIDDEN', 'AIへの送信が設定で許可されていません。送信内容と利用設定を確認してください。', false, { settingsVersion: settings.version }, 403);
  }
  return settings.version;
}

export function isSuggestionAllowed(db: DatabaseSync, personId: string, candidate: { placeId: string; activity: string }, trigger: 'onOpen' | 'continuous' = 'onOpen') {
  const { suggestions } = readSettings(db, personId);
  return suggestions.enabled && (trigger !== 'continuous' || suggestions.timing === 'continuous') && !suggestions.stopped.some(stop =>
    (stop.placeId === null || stop.placeId === candidate.placeId) && (stop.activity === null || stop.activity === candidate.activity));
}

export function resetSettings(db: DatabaseSync, personId: string, expected: number) {
  return patchSettings(db, personId, expected, defaults());
}
