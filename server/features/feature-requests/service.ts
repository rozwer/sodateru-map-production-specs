import { createHmac } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { CommonError, requireVersion } from '../../core/errors.ts';

export interface RequestInput { id: string; body: string; visibility: 'private' | 'public'; displayName: string; title?: string; regionTags?: string[]; purposeTags?: string[] }
export type RequestPatch = Partial<Omit<RequestInput, 'id'>>;
const invalid = (message: string) => new CommonError('VALIDATION_FAILED', message, false, {}, 422);
const missing = () => new CommonError('NOT_FOUND', '投稿が見つかりません。', false, {}, 404);
function string(value: unknown, name: string, max: number, min = 0): asserts value is string {
  if (typeof value !== 'string' || Array.from(value).length < min || Array.from(value).length > max) throw invalid(`${name}の文字数を確認してください。`);
}
export function validateInput(input: unknown, create: boolean): asserts input is RequestInput | RequestPatch {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw invalid('投稿内容を指定してください。');
  const body = input as Record<string, unknown>;
  const allowed = ['body', 'visibility', 'displayName', 'title', 'regionTags', 'purposeTags', ...(create ? ['id'] : [])];
  if (!Object.keys(body).length || Object.keys(body).some(key => !allowed.includes(key))) throw invalid('未定義の投稿項目です。');
  if (create) for (const key of ['id', 'body', 'visibility', 'displayName']) if (!(key in body)) throw invalid(`${key}が必要です。`);
  if ('id' in body) string(body.id, 'ID', 80, 1);
  if ('body' in body) string(body.body, '本文', 200);
  if ('title' in body) string(body.title, 'タイトル', 200, 1);
  if ('displayName' in body) { string(body.displayName, '表示名', 20, 1); if (!body.displayName.trim()) throw invalid('表示名を入力してください。'); }
  if ('visibility' in body && body.visibility !== 'private' && body.visibility !== 'public') throw invalid('公開範囲を確認してください。');
  for (const key of ['regionTags', 'purposeTags']) if (key in body) {
    const tags = body[key];
    if (!Array.isArray(tags) || tags.length > 5 || new Set(tags).size !== tags.length) throw invalid('タグは重複のない5件以内で指定してください。');
    for (const tag of tags) { string(tag, 'タグ', 20, 1); if (!tag.trim()) throw invalid('空のタグは指定できません。'); }
  }
}
const titleFor = (body: string) => Array.from(body.split(/\r?\n/).map(line => line.trim()).find(Boolean) ?? '下書き').slice(0, 200).join('');

export function readRequest(db: DatabaseSync, personId: string, id: string) {
  const row = db.prepare(`SELECT f.*,(SELECT COUNT(*) FROM feature_request_empathy e WHERE e.request_id=f.id) empathy_count,
    EXISTS(SELECT 1 FROM feature_request_empathy e WHERE e.request_id=f.id AND e.person_id=?) my_empathy
    FROM feature_requests f WHERE f.id=? AND (f.visibility='public' OR f.person_id=?)`).get(personId, id, personId);
  if (!row) throw missing();
  return { id: String(row.id), personId: String(row.person_id), version: Number(row.version), createdAt: Number(row.created_at), updatedAt: Number(row.updated_at), title: String(row.title), body: String(row.body), visibility: row.visibility as 'private' | 'public', displayName: String(row.display_name), regionTags: JSON.parse(String(row.region_tags_json)) as string[], purposeTags: JSON.parse(String(row.purpose_tags_json)) as string[], empathyCount: Number(row.empathy_count), myEmpathy: Boolean(row.my_empathy) };
}
export function createRequest(db: DatabaseSync, personId: string, input: RequestInput) {
  validateInput(input, true);
  if (input.visibility === 'public' && !input.body.trim()) throw invalid('公開投稿には本文を入力してください。');
  if (db.prepare('SELECT 1 FROM feature_requests WHERE id=?').get(input.id)) throw new CommonError('REQUEST_CONFLICT', '投稿IDが既に使われています。同じ操作の再送キーを確認してください。', false, {}, 409);
  const now = Date.now();
  db.prepare(`INSERT INTO feature_requests(id,person_id,version,created_at,updated_at,title,body,visibility,display_name,region_tags_json,purpose_tags_json)
    VALUES(?,?,1,?,?,?,?,?,?,?,?)`).run(input.id, personId, now, now, titleFor(input.body), input.body, input.visibility, input.displayName, JSON.stringify(input.regionTags ?? []), JSON.stringify(input.purposeTags ?? []));
  return readRequest(db, personId, input.id);
}
export function patchRequest(db: DatabaseSync, personId: string, id: string, version: number, patch: RequestPatch) {
  validateInput(patch, false);
  const old = readRequest(db, personId, id);
  if (old.personId !== personId) throw new CommonError('FORBIDDEN', '本人の投稿だけ編集できます。', false, {}, 403);
  requireVersion(old.version, version);
  const next = { ...old, ...patch };
  if (next.visibility === 'public' && !next.body.trim()) throw invalid('公開投稿には本文を入力してください。');
  db.prepare(`UPDATE feature_requests SET title=?,body=?,visibility=?,display_name=?,region_tags_json=?,purpose_tags_json=?,version=version+1,updated_at=? WHERE id=? AND person_id=? AND version=?`)
    .run(titleFor(next.body), next.body, next.visibility, next.displayName, JSON.stringify(next.regionTags), JSON.stringify(next.purposeTags), Math.max(Date.now(), old.updatedAt), id, personId, version);
  return readRequest(db, personId, id);
}
export function deleteRequest(db: DatabaseSync, personId: string, id: string, version: number) {
  const old = readRequest(db, personId, id);
  if (old.personId !== personId) throw new CommonError('FORBIDDEN', '本人の投稿だけ削除できます。', false, {}, 403);
  requireVersion(old.version, version);
  db.prepare('DELETE FROM feature_requests WHERE id=? AND person_id=? AND version=?').run(id, personId, version);
}
export function setEmpathy(db: DatabaseSync, personId: string, id: string, version: number, input: unknown) {
  if (!input || typeof input !== 'object' || Object.keys(input).length !== 1 || typeof (input as { empathy?: unknown }).empathy !== 'boolean') throw invalid('共感するかどうかを指定してください。');
  const wanted = (input as { empathy: boolean }).empathy;
  const old = readRequest(db, personId, id);
  // Desired-state replay does not increment counts or versions, including a lost response.
  if (old.myEmpathy === wanted) return old;
  requireVersion(old.version, version);
  if (wanted) db.prepare('INSERT INTO feature_request_empathy(request_id,person_id,created_at) VALUES(?,?,?)').run(id, personId, Date.now());
  else db.prepare('DELETE FROM feature_request_empathy WHERE request_id=? AND person_id=?').run(id, personId);
  db.prepare('UPDATE feature_requests SET version=version+1,updated_at=? WHERE id=? AND version=?').run(Math.max(Date.now(), old.updatedAt), id, version);
  return readRequest(db, personId, id);
}
export interface RequestQuery { personId?: string; visibility?: 'private' | 'public'; limit?: number; cursor?: string }
export function listRequests(db: DatabaseSync, personId: string, query: RequestQuery, secret: string) {
  const limit = query.limit ?? 50;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw invalid('件数は1〜100です。');
  const binding = JSON.stringify([personId, query.personId ?? null, query.visibility ?? null, limit]);
  const where = ["(visibility='public' OR person_id=?)"];
  const args: (string | number)[] = [personId];
  if (query.personId) { where.push('person_id=?'); args.push(query.personId); }
  if (query.visibility) { where.push('visibility=?'); args.push(query.visibility); }
  const signature = (value: string) => createHmac('sha256', secret).update(value).digest('base64url');
  if (query.cursor) {
    try {
      const [payload, sig, extra] = query.cursor.split('.');
      if (!payload || sig !== signature(payload) || extra) throw new Error('cursor');
      const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());
      if (decoded.binding !== binding || !Number.isSafeInteger(decoded.time) || typeof decoded.id !== 'string') throw new Error('cursor');
      where.push('(created_at < ? OR (created_at = ? AND id < ?))'); args.push(decoded.time, decoded.time, decoded.id);
    } catch { throw new CommonError('INVALID_REQUEST', '一覧の条件が変わりました。先頭から読み直してください。', false, {}, 400); }
  }
  const rows = db.prepare(`SELECT id,created_at FROM feature_requests WHERE ${where.join(' AND ')} ORDER BY created_at DESC,id DESC LIMIT ?`).all(...args, limit + 1);
  const items = rows.slice(0, limit).map(row => readRequest(db, personId, String(row.id)));
  let nextCursor: string | null = null;
  if (rows.length > limit) {
    const last = rows[limit - 1]!;
    const payload = Buffer.from(JSON.stringify({ binding, time: Number(last.created_at), id: String(last.id) })).toString('base64url');
    nextCursor = payload + '.' + signature(payload);
  }
  return { items, nextCursor };
}
