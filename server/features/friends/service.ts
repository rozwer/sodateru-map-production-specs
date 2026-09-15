import { createHash } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { CommonError, requireVersion } from '../../core/errors.ts';

type Row = Record<string, any>;
export type SocialContext = { personId: string; dataMode: string };
const missing = () => new CommonError('NOT_FOUND', '対象が見つかりません', false, undefined, 404);
const invalid = (message: string) => new CommonError('VALIDATION_FAILED', message, false, undefined, 422);

export function identity(value: unknown, name = 'id'): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 80) throw invalid(`${name}は1〜80文字です`);
  return value;
}

function base(row: Row) {
  return { id: row.id, version: row.version, createdAt: row.created_at, updatedAt: row.updated_at };
}
export function personView(row: Row) {
  return { ...base(row), name: row.name, bio: row.bio, avatarUrl: row.avatar_path ?? null };
}
export function friendshipView(row: Row) {
  return { ...base(row), requesterId: row.requester_id, recipientId: row.recipient_id, status: row.status };
}

// Cursors belong to one viewer, mode and filter; they never change the visible set.
export function page<T extends { id: string }>(items: T[], query: URLSearchParams, binding: unknown) {
  const raw = query.get('limit') ?? '50';
  if (!/^\d+$/.test(raw) || +raw < 1 || +raw > 100) throw invalid('limitは1〜100です');
  const limit = +raw;
  const key = createHash('sha256').update(JSON.stringify(binding)).digest('hex');
  let start = 0;
  const cursor = query.get('cursor');
  if (cursor !== null) {
    try {
      const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString());
      const index = items.findIndex(item => item.id === parsed.after);
      if (parsed.key !== key || index < 0) throw Error('cursor');
      start = index + 1;
    } catch {
      throw new CommonError('VALIDATION_FAILED', '検索条件に対応しないcursorです', false, undefined, 400);
    }
  }
  const selected = items.slice(start, start + limit);
  return { items: selected, nextCursor: start + limit < items.length
    ? Buffer.from(JSON.stringify({ key, after: selected.at(-1)!.id })).toString('base64url') : null };
}

export function getPerson(db: DatabaseSync, personId: string) {
  const row = db.prepare('SELECT * FROM people WHERE id=?').get(identity(personId));
  if (!row) throw missing();
  return personView(row);
}

export function listPeople(db: DatabaseSync, context: SocialContext, query: URLSearchParams) {
  const q = query.get('q');
  if (q !== null && (!q.trim() || q.length > 200)) throw invalid('qは1〜200文字です');
  const text = q?.normalize('NFKC').toLocaleLowerCase() ?? '';
  const rows = db.prepare('SELECT * FROM people ORDER BY name ASC, id ASC').all()
    .filter(row => String(row.name).normalize('NFKC').toLocaleLowerCase().includes(text)).map(personView);
  return page(rows, query, ['people', context.personId, context.dataMode, text]);
}

export function listFriendships(db: DatabaseSync, context: SocialContext, query: URLSearchParams) {
  const status = query.get('status');
  if (status !== null && status !== 'pending' && status !== 'accepted') throw invalid('statusが不正です');
  const rows = db.prepare('SELECT * FROM friendships WHERE requester_id=? OR recipient_id=? ORDER BY updated_at DESC,id DESC')
    .all(context.personId, context.personId).filter(row => !status || row.status === status).map(friendshipView);
  return page(rows, query, ['friendships', context.personId, context.dataMode, status]);
}

export function getFriendship(db: DatabaseSync, personId: string, id: string) {
  const row = db.prepare('SELECT * FROM friendships WHERE id=? AND (requester_id=? OR recipient_id=?)')
    .get(identity(id), personId, personId);
  if (!row) throw missing();
  return friendshipView(row);
}

export function createFriendship(db: DatabaseSync, personId: string, input: { id: string; recipientId: string }) {
  const id = identity(input.id);
  const recipient = identity(input.recipientId, 'recipientId');
  if (recipient === personId) throw invalid('自分には友達申請できません');
  getPerson(db, recipient);
  const existing = db.prepare('SELECT id FROM friendships WHERE id=? OR (requester_id=? AND recipient_id=?) OR (requester_id=? AND recipient_id=?)')
    .get(id, personId, recipient, recipient, personId);
  if (existing) throw new CommonError('STATE_CONFLICT', 'この二人の申請または友達関係は既に存在します', false, undefined, 409);
  const now = Date.now();
  db.prepare('INSERT INTO friendships(id,version,created_at,updated_at,requester_id,recipient_id,status) VALUES(?,1,?,?,?,?,?)')
    .run(id, now, now, personId, recipient, 'pending');
  return getFriendship(db, personId, id);
}

export function acceptFriendship(db: DatabaseSync, personId: string, id: string, version: number, input: { status: string }) {
  const current = getFriendship(db, personId, id);
  if (current.recipientId !== personId) throw new CommonError('FORBIDDEN', '申請を受けた本人だけが承認できます', false, undefined, 403);
  if (input.status !== 'accepted') throw invalid('statusはacceptedです');
  requireVersion(current.version, version);
  if (current.status === 'accepted') return current;
  const result = db.prepare("UPDATE friendships SET status='accepted',version=version+1,updated_at=? WHERE id=? AND version=?")
    .run(Date.now(), id, version);
  if (!result.changes) throw new CommonError('VERSION_CONFLICT', '友達関係が変更されました', false, undefined, 412);
  return getFriendship(db, personId, id);
}

export function deleteFriendship(db: DatabaseSync, personId: string, id: string, version: number) {
  const current = getFriendship(db, personId, id);
  requireVersion(current.version, version);
  const result = db.prepare('DELETE FROM friendships WHERE id=? AND version=?').run(id, version);
  if (!result.changes) throw new CommonError('VERSION_CONFLICT', '友達関係が変更されました', false, undefined, 412);
}
