import type { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { mediaPath, removeMedia } from './content.ts';

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
