import { identity, page } from '../community/pagination.ts';
import type { DatabaseSync } from 'node:sqlite';
import type { RequestContext } from '../../core/context.ts';
import { CommonError, requireVersion } from '../../core/errors.ts';
import { readSettings } from '../settings/service.ts';

type Row = Record<string, any>;
export type SocialContext = RequestContext;
const missing = () => new CommonError('NOT_FOUND', '対象が見つかりません', false, undefined, 404);
const invalid = (message: string) => new CommonError('VALIDATION_FAILED', message, false, undefined, 422);


function base(row: Row) {
  return { id: row.id, version: row.version, createdAt: row.created_at, updatedAt: row.updated_at };
}
export function personView(row: Row) {
  return { ...base(row), name: row.name, bio: row.bio, avatarUrl: row.avatar_path ?? null };
}
export function friendshipView(row: Row) {
  return { ...base(row), requesterId: row.requester_id, recipientId: row.recipient_id, status: row.status };
}


function profileVisible(db: DatabaseSync, viewerId: string, personId: string) {
  if (viewerId === personId) return true;
  const visibility = readSettings(db, personId).profileVisibility;
  if (visibility === 'public') return true;
  return visibility === 'friends' && !!db.prepare("SELECT id FROM friendships WHERE status='accepted' AND ((requester_id=? AND recipient_id=?) OR (requester_id=? AND recipient_id=?))")
    .get(viewerId, personId, personId, viewerId);
}

export function getPerson(db: DatabaseSync, viewerId: string, personId: string) {
  const row = db.prepare('SELECT * FROM people WHERE id=?').get(identity(personId));
  if (!row || !profileVisible(db, viewerId, personId)) throw missing();
  return personView(row);
}

export function listPeople(db: DatabaseSync, context: SocialContext, query: URLSearchParams) {
  const q = query.get('q');
  if (q !== null && (!q.trim() || q.length > 200)) throw invalid('qは1〜200文字です');
  const text = q?.normalize('NFKC').toLocaleLowerCase() ?? '';
  const rows = db.prepare('SELECT * FROM people ORDER BY name ASC, id ASC').all()
    .filter(row => String(row.name).normalize('NFKC').toLocaleLowerCase().includes(text) && profileVisible(db, context.personId, String(row.id))).map(personView);
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
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw invalid('申請内容が不正です');
  const id = identity(input.id);
  const recipient = identity(input.recipientId, 'recipientId');
  if (recipient === personId) throw invalid('自分には友達申請できません');
  getPerson(db, personId, recipient);
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
  if (input?.status !== 'accepted') throw invalid('statusはacceptedです');
  requireVersion(current.version, version);
  if (current.status === 'accepted') return current;
  const result = db.prepare("UPDATE friendships SET status='accepted',version=version+1,updated_at=? WHERE id=? AND version=? AND recipient_id=?")
    .run(Date.now(), id, version, personId);
  if (!result.changes) throw new CommonError('VERSION_CONFLICT', '友達関係が変更されました', false, undefined, 412);
  return getFriendship(db, personId, id);
}

export function deleteFriendship(db: DatabaseSync, personId: string, id: string, version: number) {
  const current = getFriendship(db, personId, id);
  requireVersion(current.version, version);
  const result = db.prepare('DELETE FROM friendships WHERE id=? AND version=? AND (requester_id=? OR recipient_id=?)').run(id, version, personId, personId);
  if (!result.changes) throw new CommonError('VERSION_CONFLICT', '友達関係が変更されました', false, undefined, 412);
}
