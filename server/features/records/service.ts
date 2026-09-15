import type { DatabaseSync } from 'node:sqlite';
import { requestHash } from '../../core/idempotency.ts';
import { CommonError, requireVersion } from '../../core/errors.ts';
import { ownedRecord, recordFields, recordView, storedValues, validateRecordRelations, type Row } from './model.ts';
import { validateInput } from './validation.ts';
import { recordExtensions } from './extensions.ts';

// Called inside the CORE transaction/replay boundary.
export function createRecord(db: DatabaseSync, personId: string, input: Row): Row {
  validateInput('RecordCreate', input);
  const normalized = requestHash({ ...input, sharedWith: [...input.sharedWith].sort() });
  const receipt = db.prepare('SELECT original_input_hash FROM records_creation_inputs WHERE person_id = ? AND record_id = ?').get(personId, input.id) as Row | undefined;
  if (receipt) {
    if (receipt.original_input_hash !== normalized) throw new CommonError('IDEMPOTENCY_CONFLICT', '同じ記録IDに異なる作成内容が指定されています。', false, undefined, 409);
    return recordView(db, ownedRecord(db, personId, input.id));
  }
  if (db.prepare('SELECT id FROM records WHERE id = ?').get(input.id)) throw new CommonError('STATE_CONFLICT', '記録IDは使用済みです。', false, undefined, 409);
  validateRecordRelations(db, personId, input);
  const now = Date.now();
  const columns = ['id', 'person_id', 'version', 'created_at', 'updated_at', ...Object.values(recordFields)];
  db.prepare(`INSERT INTO records (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`).run(input.id, personId, 1, now, now, ...storedValues(input));
  db.prepare('INSERT INTO records_creation_inputs VALUES (?, ?, ?, ?)').run(personId, input.id, normalized, now);
  for (const extension of recordExtensions) extension.write(db, personId, input.id, input);
  return recordView(db, ownedRecord(db, personId, input.id));
}
export function patchRecord(db: DatabaseSync, personId: string, id: string, input: Row, version: number): Row {
  validateInput('RecordPatch', input);
  const row = ownedRecord(db, personId, id);
  requireVersion(row.version, version);
  const merged = { ...recordView(db, row), ...input };
  validateRecordRelations(db, personId, merged);
  db.prepare(`UPDATE records SET ${Object.values(recordFields).map(col => `${col} = ?`).join(',')}, version = version + 1, updated_at = ? WHERE id = ? AND person_id = ? AND version = ?`).run(...storedValues(merged), Date.now(), id, personId, version);
  for (const extension of recordExtensions) extension.write(db, personId, id, input);
  return recordView(db, ownedRecord(db, personId, id));
}
export function deletionPreview(db: DatabaseSync, personId: string, id: string): Row {
  const row = ownedRecord(db, personId, id);
  const media = db.prepare('SELECT id FROM media WHERE record_id = ? ORDER BY position, id').all(id) as Row[];
  const themes = db.prepare('SELECT id FROM themes WHERE EXISTS (SELECT 1 FROM json_each(record_ids_json) WHERE value = ?)').all(id) as Row[];
  return { recordId: id, version: row.version, deletes: { record: true, mediaIds: media.map(m => m.id), themeMembershipIds: themes.map(t => t.id) }, preserves: { visitId: row.visit_id, independentRecords: true }, dependentResults: 'unavailable', exportUrl: `/api/v1/records/${encodeURIComponent(id)}/export` };
}
export function deleteRecord(db: DatabaseSync, personId: string, id: string, version: number): string[] {
  const row = ownedRecord(db, personId, id);
  requireVersion(row.version, version);
  const media = db.prepare('SELECT storage_key FROM media WHERE record_id = ?').all(id) as Row[];
  const themes = db.prepare('SELECT id, record_ids_json FROM themes WHERE EXISTS (SELECT 1 FROM json_each(record_ids_json) WHERE value = ?)').all(id) as Row[];
  for (const theme of themes) db.prepare('UPDATE themes SET record_ids_json = ?, version = version + 1, updated_at = ? WHERE id = ?').run(JSON.stringify(JSON.parse(theme.record_ids_json).filter((value: string) => value !== id)), Date.now(), theme.id);
  db.prepare('DELETE FROM media WHERE record_id = ?').run(id);
  for (const extension of recordExtensions) extension.remove?.(db, personId, id);
  db.prepare('DELETE FROM records WHERE id = ? AND person_id = ? AND version = ?').run(id, personId, version);
  return media.map(m => m.storage_key);
}
