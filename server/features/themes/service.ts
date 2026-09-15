import type { DatabaseSync } from 'node:sqlite';
import { CommonError, requireVersion } from '../../core/errors.ts';

export const colorKeys = ['teal', 'pink', 'orange', 'yellow', 'green', 'blue', 'purple'] as const;
export type ColorKey = typeof colorKeys[number];
export interface Theme {
  id: string; personId: string; name: string; description: string; recordIds: string[];
  colorKey: ColorKey; coverMediaId: string | null; version: number; createdAt: number; updatedAt: number;
}
export interface ThemeInput {
  id: string; name: string; description: string; recordIds: string[];
  colorKey?: ColorKey; coverMediaId?: string | null;
}
export interface MemoOrigin { type: 'record' | 'suggestion'; id: string; version: number }
export interface MemoPresentation { name: string; originRefs: MemoOrigin[]; keywords: string[] }
type Row = Record<string, any>;
function invalid(message: string): never { throw new CommonError('VALIDATION_FAILED', message, false, undefined, 422); }
function text(value: unknown, field: string, max: number, min = 0): string {
  if (typeof value !== 'string' || [...value].length < min || [...value].length > max) invalid(`${field}は${min}〜${max}文字で指定してください。`);
  return value as string;
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid('オブジェクトを指定してください。');
  return value as Record<string, unknown>;
}
function fields(value: Record<string, unknown>, keys: string[]) {
  if (Object.keys(value).some(key => !keys.includes(key))) invalid('未定義の項目が含まれています。');
}
function ids(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > 1000) invalid('recordIdsは1000件以内の配列で指定してください。');
  return [...new Set((value as unknown[]).map(id => text(id, 'recordId', 80, 1)))];
}
export function normalizeTheme(input: unknown, previous?: Theme): ThemeInput {
  const raw = object(input);
  fields(raw, previous ? ['name','description','recordIds','colorKey','coverMediaId'] : ['id','name','description','recordIds','colorKey','coverMediaId']);
  if (previous && !Object.keys(raw).length) invalid('更新する項目を指定してください。');
  const merged = { ...previous, ...raw };
  const colorKey = merged.colorKey ?? 'teal';
  if (!colorKeys.includes(colorKey as ColorKey)) invalid('7色から選択してください。');
  return {
    id: text(merged.id, 'id', 80, 1), name: text(merged.name, 'name', 20, 1),
    description: text(merged.description, 'description', 100), recordIds: ids(merged.recordIds),
    colorKey: colorKey as ColorKey,
    coverMediaId: merged.coverMediaId == null ? null : text(merged.coverMediaId, 'coverMediaId', 80, 1),
  };
}
function dto(row: Row): Theme {
  return { id: row.id, personId: row.person_id, name: row.name, description: row.description,
    recordIds: JSON.parse(row.record_ids_json), colorKey: row.color_key, coverMediaId: row.cover_media_id,
    version: row.version, createdAt: row.created_at, updatedAt: row.updated_at };
}
export function getTheme(db: DatabaseSync, personId: string, themeId: string): Theme {
  const row = db.prepare('SELECT * FROM themes WHERE id=? AND person_id=?').get(themeId, personId);
  if (!row) throw new CommonError('NOT_FOUND', 'テーマが見つかりません。', false, undefined, 404);
  return dto(row);
}
function validateLinks(db: DatabaseSync, personId: string, value: ThemeInput) {
  const own = db.prepare('SELECT id FROM records WHERE id=? AND person_id=?');
  for (const id of value.recordIds) if (!own.get(id, personId)) invalid('所属記録は本人の記録から選択してください。');
  if (value.coverMediaId && !db.prepare(`SELECT m.id FROM media m JOIN records r ON r.id=m.record_id
    WHERE m.id=? AND r.person_id=? AND m.kind='photo' AND m.status='ready'`).get(value.coverMediaId,personId))
    invalid('代表写真は保存済みの本人の写真から選択してください。');
}
// Mutations run inside the CORE synchronous transaction/idempotency boundary.
export function createTheme(db: DatabaseSync, personId: string, input: unknown): Theme {
  const value = normalizeTheme(input);
  validateLinks(db, personId, value);
  if (db.prepare('SELECT id FROM themes WHERE id=?').get(value.id))
    throw new CommonError('STATE_CONFLICT','このテーマIDは既に使われています。',false,undefined,409);
  const now = Date.now();
  db.prepare(`INSERT INTO themes(id,person_id,name,description,record_ids_json,color_key,cover_media_id,version,created_at,updated_at)
    VALUES(?,?,?,?,?,?,?,1,?,?)`).run(value.id,personId,value.name,value.description,JSON.stringify(value.recordIds),value.colorKey!,value.coverMediaId!,now,now);
  return getTheme(db,personId,value.id);
}
export function patchTheme(db: DatabaseSync, personId: string, themeId: string, expected: number, input: unknown): Theme {
  const current = getTheme(db,personId,themeId);
  requireVersion(current.version,expected);
  const value = normalizeTheme(input,current);
  validateLinks(db,personId,value);
  const result = db.prepare(`UPDATE themes SET name=?,description=?,record_ids_json=?,color_key=?,cover_media_id=?,
    version=version+1,updated_at=MAX(updated_at,?) WHERE id=? AND person_id=? AND version=?`)
    .run(value.name,value.description,JSON.stringify(value.recordIds),value.colorKey!,value.coverMediaId!,Date.now(),themeId,personId,expected);
  if (!result.changes) throw new CommonError('VERSION_CONFLICT','テーマが更新されています。',false,undefined,412);
  return getTheme(db,personId,themeId);
}
export function deleteTheme(db: DatabaseSync, personId: string, themeId: string, expected: number) {
  const current = getTheme(db,personId,themeId);
  requireVersion(current.version,expected);
  const result = db.prepare('DELETE FROM themes WHERE id=? AND person_id=? AND version=?').run(themeId,personId,expected);
  if (!result.changes) throw new CommonError('VERSION_CONFLICT','テーマが更新されています。',false,undefined,412);
}
export function listThemes(db: DatabaseSync, personId: string, dataMode: string, limit = 50, cursor?: string) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new CommonError('INVALID_REQUEST','limitは1〜100です。',false,undefined,400);
  let after: { updatedAt: number; id: string } | undefined;
  if (cursor) {
    try {
      const parsed = JSON.parse(Buffer.from(cursor,'base64url').toString());
      if (parsed.personId!==personId || parsed.dataMode!==dataMode || parsed.sort!=='updatedAt:id:desc' || !Number.isSafeInteger(parsed.updatedAt) || typeof parsed.id!=='string') throw Error();
      after=parsed;
    } catch { throw new CommonError('INVALID_REQUEST','この一覧では使用できないcursorです。',false,undefined,400); }
  }
  const rows = after
    ? db.prepare('SELECT * FROM themes WHERE person_id=? AND (updated_at<? OR (updated_at=? AND id<?)) ORDER BY updated_at DESC,id DESC LIMIT ?').all(personId,after.updatedAt,after.updatedAt,after.id,limit+1)
    : db.prepare('SELECT * FROM themes WHERE person_id=? ORDER BY updated_at DESC,id DESC LIMIT ?').all(personId,limit+1);
  const items=rows.slice(0,limit).map(dto), last=items.at(-1);
  const nextCursor=rows.length>limit && last ? Buffer.from(JSON.stringify({personId,dataMode,sort:'updatedAt:id:desc',updatedAt:last.updatedAt,id:last.id})).toString('base64url') : null;
  return {items,nextCursor};
}

export function normalizeMemoPresentation(input: unknown): MemoPresentation {
  const raw=object(input); fields(raw,['name','originRefs','keywords']);
  const name=text(raw.name,'name',20,1);
  if (!Array.isArray(raw.originRefs) || raw.originRefs.length>100) invalid('originRefsは100件以内の配列です。');
  if (!Array.isArray(raw.keywords) || raw.keywords.length>50) invalid('keywordsは50件以内の配列です。');
  const seen=new Set<string>();
  const originRefs: MemoOrigin[]=[];
  for (const item of raw.originRefs as unknown[]) {
    const ref=object(item); fields(ref,['type','id','version']);
    if (ref.type!=='record' && ref.type!=='suggestion') invalid('由来はrecordまたはsuggestionです。');
    if (!Number.isSafeInteger(ref.version) || (ref.version as number)<1) invalid('由来の版が不正です。');
    const id=text(ref.id,'originId',80,1), key=`${ref.type}:${id}`;
    if (seen.has(key)) invalid('同じ由来は一度だけ指定してください。');
    seen.add(key); originRefs.push({type:ref.type as MemoOrigin['type'],id,version:ref.version as number});
  }
  return {name,originRefs,keywords:[...new Set((raw.keywords as unknown[]).map(value=>text(value,'keyword',80,1)))]};
}
export function readMemoPresentation(db: DatabaseSync, personId: string, recordId: string): MemoPresentation | null {
  const row=db.prepare(`SELECT p.name FROM memo_presentations p JOIN records r ON r.id=p.record_id
    WHERE p.record_id=? AND r.person_id=? AND r.kind='memo'`).get(recordId,personId);
  if (!row) return null;
  return {name:row.name as string,
    originRefs:db.prepare('SELECT origin_type AS type,origin_id AS id,origin_version AS version FROM memo_origins WHERE record_id=? ORDER BY position').all(recordId)
      .map(ref=>({type:ref.type as MemoOrigin['type'],id:ref.id as string,version:ref.version as number})),
    keywords:db.prepare('SELECT keyword FROM memo_keywords WHERE record_id=? ORDER BY position').all(recordId).map(row=>row.keyword as string)};
}
// RECORDS calls this after its row mutation, in the SAME transaction. It owns record version/body/useForSuggestions.
export function writeMemoPresentation(db: DatabaseSync, personId: string, recordId: string, input: unknown): MemoPresentation {
  const value=normalizeMemoPresentation(input);
  const memo=db.prepare('SELECT kind,body FROM records WHERE id=? AND person_id=?').get(recordId,personId);
  if (!memo || memo.kind!=='memo') invalid('メモ記録にだけpresentationを保存できます。');
  text(memo.body,'body',200);
  for (const ref of value.originRefs) {
    if (ref.type==='record' && ref.id===recordId) invalid('メモ自身を由来にはできません。');
    const source=db.prepare(`SELECT version FROM ${ref.type==='record'?'records':'suggestions'} WHERE id=? AND person_id=?`).get(ref.id,personId);
    if (!source) invalid('由来は本人の保存済み記録・候補から指定してください。');
    if (source.version!==ref.version) throw new CommonError('INPUT_CHANGED','由来が変更されています。再確認してください。',false,undefined,409);
  }
  db.prepare('INSERT INTO memo_presentations(record_id,name) VALUES(?,?) ON CONFLICT(record_id) DO UPDATE SET name=excluded.name').run(recordId,value.name);
  db.prepare('DELETE FROM memo_origins WHERE record_id=?').run(recordId);
  db.prepare('DELETE FROM memo_keywords WHERE record_id=?').run(recordId);
  value.originRefs.forEach((ref,i)=>db.prepare('INSERT INTO memo_origins VALUES(?,?,?,?,?)').run(recordId,i,ref.type,ref.id,ref.version));
  value.keywords.forEach((keyword,i)=>db.prepare('INSERT INTO memo_keywords VALUES(?,?,?)').run(recordId,i,keyword));
  return value;
}
