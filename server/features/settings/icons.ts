import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { CommonError } from '../../core/errors.ts';
import { readPerson } from './service.ts';

export const MAX_ICON_BYTES = 50 * 1024 * 1024;
export function iconRow(db: DatabaseSync, personId: string) {
  return db.prepare('SELECT file_path,mime_type FROM profile_icons WHERE person_id=?').get(personId);
}
export function iconBytes(db: DatabaseSync, personId: string) {
  readPerson(db, personId);
  const row = iconRow(db, personId);
  if (!row) throw new CommonError('NOT_FOUND', '保存されたアイコンはありません。', false, undefined, 404);
  return { bytes: readFileSync(String(row.file_path)), mimeType: String(row.mime_type) };
}
export function removeIconFile(path: string | undefined) {
  if (!path) return;
  try { unlinkSync(path); } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') console.warn('settings: unused icon cleanup pending');
  }
}
export function prepareIcon(db: DatabaseSync, bytes: Uint8Array, mimeType: string) {
  if (!bytes.length || bytes.length > MAX_ICON_BYTES) throw new CommonError('PAYLOAD_TOO_LARGE', '画像は空でない50MiB以内のファイルを選んでください。', false, undefined, 413);
  const data = Buffer.from(bytes);
  const actual = data.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'image/png'
    : data[0] === 255 && data[1] === 216 && data[2] === 255 ? 'image/jpeg'
    : data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP' ? 'image/webp' : null;
  if (!actual || actual !== mimeType) throw new CommonError('UNSUPPORTED_MEDIA_TYPE', 'JPEG・PNG・WebP画像を選んでください。', false, undefined, 415);
  const database = db.prepare('PRAGMA database_list').all().find(row => row.name === 'main');
  if (!database?.file) throw new CommonError('UNAVAILABLE', 'アイコン保存にはファイルDBが必要です。', true, undefined, 503);
  const directory = join(dirname(String(database.file)), `${basename(String(database.file))}.media`, 'profile-icons');
  mkdirSync(directory, { recursive: true });
  const path = join(directory, randomUUID());
  writeFileSync(path, data, { flag: 'wx' });
  return { path, mimeType: actual };
}
/** Caller wraps the two database changes in CORE.transaction, then cleans the old file. */
export function setIcon(db: DatabaseSync, personId: string, expected: number, file: { path: string; mimeType: string } | null, avatarUrl: string | null) {
  const person = readPerson(db, personId);
  if (person.version !== expected) throw new CommonError('VERSION_CONFLICT', '保存後にプロフィールが変更されています。', false, { currentVersion: person.version }, 412);
  const now = Math.max(Date.now(), person.updatedAt);
  const changed = db.prepare('UPDATE people SET avatar_path=?,version=version+1,updated_at=? WHERE id=? AND version=?').run(avatarUrl, now, personId, expected);
  if (Number(changed.changes) !== 1) throw new CommonError('VERSION_CONFLICT', 'プロフィールを再取得してください。', false, undefined, 412);
  if (file) db.prepare(`INSERT INTO profile_icons(person_id,mime_type,file_path,updated_at) VALUES(?,?,?,?)
    ON CONFLICT(person_id) DO UPDATE SET mime_type=excluded.mime_type,file_path=excluded.file_path,updated_at=excluded.updated_at`).run(personId, file.mimeType, file.path, now);
  else db.prepare('DELETE FROM profile_icons WHERE person_id=?').run(personId);
  return readPerson(db, personId);
}
