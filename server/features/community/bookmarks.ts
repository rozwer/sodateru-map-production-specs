import type { DatabaseSync } from 'node:sqlite';
import { CommonError, requireVersion } from '../../core/errors.ts';
import { identity, page } from './pagination.ts';
import type { RequestContext as SocialContext } from '../../core/context.ts';

export type BookmarkTarget = { type: 'record'; id: string } | { type: 'place'; id: string }
  | { type: 'candidate'; resultId: string; candidateId: string };
export type TargetResolution = { data: unknown; expiresAt: number | null };
// This callback must resolve the current owner/mode/visibility and original retention.
// No target body, media URL, or candidate snapshot is stored in a bookmark.
export type ResolveTarget = (target: BookmarkTarget) => TargetResolution;
const unavailable = () => new CommonError('NOT_FOUND', '対象は削除済み、または現在閲覧できません', false, undefined, 404);
const expired = () => new CommonError('RESULT_EXPIRED', '候補の有効期限が切れました。再検索してください', false, undefined, 410);

export function parseTarget(input: any): BookmarkTarget {
  if (input?.type === 'record' || input?.type === 'place') return { type: input.type, id: identity(input.id) };
  if (input?.type === 'candidate') return { type: 'candidate', resultId: identity(input.resultId, 'resultId'), candidateId: identity(input.candidateId, 'candidateId') };
  throw new CommonError('VALIDATION_FAILED', 'しおり対象はrecord/place/candidateです', false, undefined, 422);
}

function bookmarkView(row: Record<string, any>) {
  return { id: row.id as string, version: row.version as number, createdAt: row.created_at as number,
    updatedAt: row.updated_at as number, target: JSON.parse(row.target_json) as BookmarkTarget,
    expiresAt: row.expires_at as number | null };
}

function readRow(db: DatabaseSync, personId: string, id: string) {
  const row = db.prepare('SELECT * FROM community_bookmarks WHERE id=? AND person_id=?').get(identity(id), personId);
  if (!row) throw unavailable();
  return bookmarkView(row);
}

export function resolveBookmark(db: DatabaseSync, personId: string, id: string, resolve: ResolveTarget) {
  const bookmark = readRow(db, personId, id);
  if (bookmark.expiresAt !== null && bookmark.expiresAt <= Date.now()) throw expired();
  const resolved = resolve(bookmark.target);
  if (resolved.expiresAt !== null && resolved.expiresAt <= Date.now()) throw expired();
  return { ...bookmark, status: 'available' as const, resource: resolved.data };
}

export function createBookmark(db: DatabaseSync, personId: string, input: { id: string; target: BookmarkTarget }, resolve: ResolveTarget) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new CommonError('VALIDATION_FAILED', 'しおり内容が不正です', false, undefined, 422);
  const id = identity(input.id);
  const target = parseTarget(input.target);
  const key = JSON.stringify(target);
  const existing = db.prepare('SELECT id,target_json FROM community_bookmarks WHERE person_id=? AND (id=? OR (target_type=? AND target_key=?))')
    .get(personId, id, target.type, key);
  if (existing) {
    if (existing.target_json !== key) throw new CommonError('STATE_CONFLICT', 'このしおりIDは別の対象に使われています', false, undefined, 409);
    return { bookmark: resolveBookmark(db, personId, String(existing.id), resolve), created: false };
  }
  if (db.prepare('SELECT id FROM community_bookmarks WHERE id=?').get(id)) throw new CommonError('STATE_CONFLICT', 'このしおりIDは使用できません', false, undefined, 409);
  const resolution = resolve(target);
  if (target.type === 'candidate' && resolution.expiresAt === null) {
    throw new CommonError('OUTPUT_INVALID', '一時候補の期限が取得できません', false, undefined, 422);
  }
  if (resolution.expiresAt !== null && resolution.expiresAt <= Date.now()) throw expired();
  const now = Date.now();
  db.prepare('INSERT INTO community_bookmarks(id,person_id,target_type,target_key,target_json,expires_at,version,created_at,updated_at) VALUES(?,?,?,?,?,?,1,?,?)')
    .run(id, personId, target.type, key, key, resolution.expiresAt, now, now);
  return { bookmark: resolveBookmark(db, personId, id, resolve), created: true };
}

export function listBookmarks(db: DatabaseSync, context: SocialContext, query: URLSearchParams, resolve: ResolveTarget) {
  const rows = db.prepare('SELECT * FROM community_bookmarks WHERE person_id=? ORDER BY created_at DESC,id ASC').all(context.personId).map(bookmarkView);
  const selected = page(rows, query, ['bookmarks', context.personId, context.dataMode]);
  return { ...selected, items: selected.items.map(bookmark => {
    try { return resolveBookmark(db, context.personId, bookmark.id, resolve); }
    catch (error) {
      if (!(error instanceof CommonError)) throw error;
      // A revoked target is indistinguishable from a deleted target. Keep only the reference.
      if (error.code === 'NOT_FOUND') return { ...bookmark, status: 'unavailable', resource: null };
      if (error.code === 'RESULT_EXPIRED') return { ...bookmark, status: 'expired', resource: null };
      throw error;
    }
  }) };
}

export function deleteBookmark(db: DatabaseSync, personId: string, id: string, version: number) {
  const bookmark = readRow(db, personId, id);
  requireVersion(bookmark.version, version);
  const result = db.prepare('DELETE FROM community_bookmarks WHERE id=? AND person_id=? AND version=?').run(id, personId, version);
  if (!result.changes) throw new CommonError('VERSION_CONFLICT', 'しおりが変更されました', false, undefined, 412);
}
