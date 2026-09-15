import type { DatabaseSync } from 'node:sqlite';
import { CommonError } from '../../core/errors.ts';
import { recordExtensions } from './extensions.ts';

export type Row = Record<string, any>;
export const recordFields: Record<string, string> = {
  kind: 'kind', visitId: 'visit_id', placeId: 'place_id', occurredAt: 'occurred_at',
  endedAt: 'ended_at', timePrecision: 'time_precision', body: 'body', purposes: 'purposes_json',
  activities: 'activities_json', impression: 'impression', periodAnswers: 'period_answers_json',
  bookmarked: 'bookmarked', useForSuggestions: 'use_for_suggestions', topicKey: 'topic_key',
  visibility: 'visibility', sharedWith: 'shared_with_json',
};
export function invalid(message: string): never { throw new CommonError('VALIDATION_FAILED', message, false, undefined, 422); }
export function missing(): never { throw new CommonError('NOT_FOUND', '記録が見つかりません。', false, undefined, 404); }
export function recordRow(db: DatabaseSync, id: string): Row {
  return db.prepare('SELECT * FROM records WHERE id = ?').get(id) as Row || missing();
}
export function ownedRecord(db: DatabaseSync, personId: string, id: string): Row {
  const row = recordRow(db, id);
  if (row.person_id !== personId) missing();
  return row;
}
export function readableRecord(db: DatabaseSync, personId: string, id: string): Row {
  const row = recordRow(db, id);
  if (row.person_id !== personId && row.visibility !== 'public' &&
      !(row.visibility === 'selected' && JSON.parse(row.shared_with_json).includes(personId))) missing();
  return row;
}
export function recordView(db: DatabaseSync, row: Row): Row {
  const view: Row = { id: row.id, personId: row.person_id, version: row.version, createdAt: row.created_at, updatedAt: row.updated_at };
  for (const [key, column] of Object.entries(recordFields)) {
    view[key] = column.endsWith('_json') ? JSON.parse(row[column]) : ['bookmarked', 'useForSuggestions'].includes(key) ? !!row[column] : row[column];
  }
  const visit = row.visit_id ? db.prepare('SELECT * FROM visits WHERE id = ? AND person_id = ?').get(row.visit_id, row.person_id) as Row | undefined : undefined;
  view.effectivePlaceId = visit ? visit.place_id : row.place_id;
  view.effectiveStartedAt = visit ? visit.started_at : row.occurred_at;
  view.effectiveEndedAt = visit ? visit.ended_at : row.ended_at;
  view.effectiveTimePrecision = visit ? visit.time_precision : row.time_precision;
  for (const extension of recordExtensions) Object.assign(view, extension.read(db, row.person_id, row.id));
  return view;
}
export function validateRecordRelations(db: DatabaseSync, personId: string, input: Row): void {
  if (input.visitId !== null) {
    if (input.kind !== 'experience' || input.placeId !== null || input.occurredAt !== null || input.endedAt !== null || input.timePrecision !== 'unknown') invalid('訪問付き記録の場所と日時は訪問から取得します。');
    if (!db.prepare('SELECT id FROM visits WHERE id = ? AND person_id = ?').get(input.visitId, personId)) invalid('本人の訪問を指定してください。');
  }
  if (input.placeId !== null && !db.prepare('SELECT id FROM places WHERE id = ?').get(input.placeId)) invalid('場所が存在しません。');
  if (input.endedAt !== null && (input.occurredAt === null || input.endedAt < input.occurredAt)) invalid('終了日時は開始日時以降にしてください。');
  if (input.timePrecision === 'unknown' && (input.occurredAt !== null || input.endedAt !== null)) invalid('日時不明では開始と終了を未指定にしてください。');
  if (input.visibility === 'selected' ? input.sharedWith.length === 0 : input.sharedWith.length !== 0) invalid('公開範囲と共有先が一致しません。');
  for (const id of input.sharedWith) if (!db.prepare('SELECT id FROM people WHERE id = ?').get(id)) invalid('共有先が存在しません。');
  if (new Set(input.purposes).size !== input.purposes.length) invalid('用途が重複しています。');
  if (new Set(input.activities.map((a: Row) => a.id)).size !== input.activities.length) invalid('活動IDが重複しています。');
  if (input.activities.some((a: Row) => a.purpose === null && a.satisfaction !== null)) invalid('希望不明の活動は満足度を未指定にしてください。');
}
export function storedValues(input: Row): any[] {
  return Object.entries(recordFields).map(([key, col]) => col.endsWith('_json') ? JSON.stringify(input[key]) : typeof input[key] === 'boolean' ? Number(input[key]) : input[key]);
}
