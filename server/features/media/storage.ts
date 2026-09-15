import type { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { mediaPath, removeMedia } from './content.ts';
import { CommonError } from '../../core/errors.ts';

/** The mode's DB file is the stable namespace; never share live/demo media roots. */
export function mediaRootFor(db: DatabaseSync): string {
  const main = db.prepare('PRAGMA database_list').all().find(row => row.name === 'main');
  if (!main || !main.file) throw new CommonError('PROVIDER_UNAVAILABLE', '媒体には永続DBの保存先が必要です。', false, undefined, 503);
  const root = `${String(main.file)}.media`;
  mkdirSync(root, { recursive: true });
  return root;
}

export function storeMedia(root: string, bytes: Uint8Array): string {
  mkdirSync(root, { recursive: true });
  const key = `${randomUUID()}.bin`;
  writeFileSync(mediaPath(root, key), bytes, { flag: 'wx' });
  return key;
}
/** Skip recently staged files so another running upload cannot lose its bytes. */
export function cleanupUnreferencedMedia(db: DatabaseSync, root: string, now = Date.now()): void {
  mkdirSync(root, { recursive: true });
  const referenced = new Set(db.prepare('SELECT storage_key FROM media').all().map(row => row.storage_key));
  for (const name of readdirSync(root)) {
    if (!/^[0-9a-f-]{36}\.bin$/.test(name) || referenced.has(name)) continue;
    const stat = statSync(mediaPath(root, name));
    if (stat.isFile() && now - stat.mtimeMs >= 60 * 60 * 1000) removeMedia(root, [name]);
  }
}
