import type { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export const migrationSql = readFileSync(new URL('../../db/migrations/reflection/001_questions.sql', import.meta.url), 'utf8');
export type QuestionStatus = 'pending' | 'later' | 'skipped' | 'answered';
export type QuestionTopic = 'purpose' | 'reason' | 'context' | 'alternative';
export type Ref = { type: string; id: string; version: number };
export type QuestionInput = { id: string; targetRecordId: string; topic: string; questionText: string; sourceRefs: Ref[]; generatorVersion: string };
export type Question = QuestionInput & { personId: string; status: QuestionStatus; answerRecordId: string | null; version: number; createdAt: number; updatedAt: number };

export function questionIdentity(input: QuestionInput): string {
  // A new model/prompt alone is not new evidence for repeating an already discussed reason.
  const refs = [...input.sourceRefs].sort((a,b) => a.type.localeCompare(b.type) || a.id.localeCompare(b.id) || a.version-b.version);
  return createHash('sha256').update(JSON.stringify([input.targetRecordId, input.topic, refs])).digest('hex');
}
function decode(row: any): Question | null {
  if (!row) return null;
  return { id: row.id, personId: row.person_id, targetRecordId: row.target_record_id, topic: row.topic,
    questionText: row.question_text, sourceRefs: JSON.parse(row.source_refs_json), generatorVersion: row.generator_version,
    status: row.status, answerRecordId: row.answer_record_id, version: row.version, createdAt: row.created_at, updatedAt: row.updated_at };
}
export class QuestionStore {
  db: DatabaseSync;
  constructor(db: DatabaseSync) { this.db = db; }
  get(personId: string, id: string): Question | null {
    return decode(this.db.prepare('SELECT * FROM reflection_questions WHERE person_id=? AND id=?').get(personId,id));
  }
  create(personId: string, input: QuestionInput): Question {
    const key = questionIdentity(input);
    const existing = decode(this.db.prepare('SELECT * FROM reflection_questions WHERE person_id=? AND identity_key=?').get(personId,key));
    if (existing) return existing;
    const now = Date.now();
    this.db.prepare('INSERT INTO reflection_questions (id,person_id,target_record_id,topic,question_text,source_refs_json,generator_version,identity_key,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
      .run(input.id,personId,input.targetRecordId,input.topic,input.questionText,JSON.stringify(input.sourceRefs),input.generatorVersion,key,now,now);
    return this.get(personId,input.id)!;
  }
  update(personId: string, id: string, version: number, patch: {status: QuestionStatus; answerRecordId?: string}): Question | null {
    const result = this.db.prepare('UPDATE reflection_questions SET status=?,answer_record_id=COALESCE(?,answer_record_id),version=version+1,updated_at=? WHERE id=? AND person_id=? AND version=?')
      .run(patch.status,patch.answerRecordId ?? null,Date.now(),id,personId,version);
    return result.changes ? this.get(personId,id) : null;
  }
  list(personId: string, options: {status?: string; targetRecordId?: string; limit?: number; before?: {createdAt: number; id: string}}) {
    const clauses = ['person_id=?']; const args: (string|number)[] = [personId];
    if (options.status) { clauses.push('status=?'); args.push(options.status); }
    if (options.targetRecordId) { clauses.push('target_record_id=?'); args.push(options.targetRecordId); }
    if (options.before) { clauses.push('(created_at < ? OR (created_at=? AND id < ?))'); args.push(options.before.createdAt,options.before.createdAt,options.before.id); }
    const limit = options.limit ?? 50;
    args.push(limit+1);
    const rows = this.db.prepare('SELECT * FROM reflection_questions WHERE '+clauses.join(' AND ')+' ORDER BY created_at DESC,id DESC LIMIT ?').all(...args).map(decode) as Question[];
    return { items: rows.slice(0,limit), hasMore: rows.length > limit };
  }
}
