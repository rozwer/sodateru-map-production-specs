import type { DatabaseSync } from 'node:sqlite';
import { CommonError, requireVersion } from '../../core/errors.ts';
import { requestHash } from '../../core/idempotency.ts';
import { missing, ownedRecord, readableRecord, invalid, type Row } from '../records/model.ts';
import { validateInput } from '../records/validation.ts';

export function mediaView(row: Row): Row {
  return { id: row.id, recordId: row.record_id, version: row.version, createdAt: row.created_at, updatedAt: row.updated_at, kind: row.kind, mimeType: row.mime_type, byteSize: row.byte_size, position: row.position, status: row.status, contentUrl: row.status === 'ready' ? `/api/v1/media/${encodeURIComponent(row.id)}/content` : null };
}
export function readableMedia(db: DatabaseSync, personId: string, id: string): Row {
  const row = db.prepare('SELECT * FROM media WHERE id = ?').get(id) as Row | undefined;
  if (!row) missing();
  readableRecord(db, personId, row.record_id);
  return row;
}
export function mediaPage(db: DatabaseSync, personId: string, recordId: string, limit = 100, cursor?: string): Row {
  const parent = readableRecord(db, personId, recordId);
  const database = db.prepare('PRAGMA database_list').all().find(row => row.name === 'main')?.file ?? '';
  const scope = requestHash({ personId, recordId, version: parent.version, database });
  let offset = 0;
  if (cursor) {
    try { const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString()); if (decoded.scope !== scope || !Number.isInteger(decoded.offset) || decoded.offset < 0) throw new Error('scope'); offset = decoded.offset; } catch { throw new CommonError('INVALID_REQUEST', '添付一覧が変わったため最初から取得してください。'); }
  }
  const rows = db.prepare('SELECT * FROM media WHERE record_id = ? ORDER BY position, id LIMIT ? OFFSET ?').all(recordId, limit + 1, offset) as Row[];
  return { items: rows.slice(0, limit).map(mediaView), nextCursor: rows.length > limit ? Buffer.from(JSON.stringify({ scope, offset: offset + limit })).toString('base64url') : null };
}
export function attachMedia(db: DatabaseSync, personId: string, recordId: string, input: Row, version: number): Row {
  const parent = ownedRecord(db, personId, recordId);
  requireVersion(parent.version, version);
  if (db.prepare('SELECT id FROM media WHERE id = ? OR (record_id = ? AND position = ?)').get(input.id, recordId, input.position)) throw new CommonError('STATE_CONFLICT', '媒体IDまたは表示位置が使用済みです。', false, undefined, 409);
  if (Number((db.prepare('SELECT count(*) AS n FROM media WHERE record_id = ?').get(recordId) as Row).n) >= 100) invalid('媒体は記録あたり100件までです。');
  const now = Date.now();
  db.prepare('INSERT INTO media (id,record_id,storage_key,kind,mime_type,byte_size,position,status,version,created_at,updated_at) VALUES (?,?,?,?,?,?,?,\'ready\',1,?,?)').run(input.id, recordId, input.storageKey, input.kind, input.mimeType, input.byteSize, input.position, now, now);
  db.prepare('UPDATE records SET version = version + 1, updated_at = ? WHERE id = ? AND version = ?').run(now, recordId, version);
  return mediaView(db.prepare('SELECT * FROM media WHERE id = ?').get(input.id) as Row);
}
export function reorderMedia(db: DatabaseSync, personId: string, id: string, input: Row, version: number): Row {
  validateInput('MediaOrderInput', input);
  requireVersion(ownedRecord(db, personId, id).version, version);
  const rows = db.prepare('SELECT * FROM media WHERE record_id = ?').all(id) as Row[];
  if (rows.length !== input.items.length || new Set(input.items.map((i: Row) => i.id)).size !== rows.length) invalid('現在の全媒体を一度ずつ指定してください。');
  for (const item of input.items) { const row = rows.find(r => r.id === item.id); if (!row) invalid('媒体一覧が一致しません。'); requireVersion(row.version, item.version); }
  // Temporarily move to the unused upper half of the schema position range.
  db.prepare('UPDATE media SET position = position + 500 WHERE record_id = ?').run(id);
  const now = Date.now();
  input.items.forEach((item: Row, position: number) => db.prepare('UPDATE media SET position = ?, version = version + 1, updated_at = ? WHERE id = ? AND record_id = ?').run(position, now, item.id, id));
  db.prepare('UPDATE records SET version = version + 1, updated_at = ? WHERE id = ? AND version = ?').run(now, id, version);
  return mediaPage(db, personId, id);
}
export function deleteAttachment(db: DatabaseSync, personId: string, id: string, version: number): string {
  const row = readableMedia(db, personId, id);
  ownedRecord(db, personId, row.record_id);
  requireVersion(row.version, version);
  db.prepare('DELETE FROM media WHERE id = ? AND version = ?').run(id, version);
  db.prepare('UPDATE records SET version = version + 1, updated_at = ? WHERE id = ?').run(Date.now(), row.record_id);
  return row.storage_key;
}
