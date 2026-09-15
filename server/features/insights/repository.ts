import type { DatabaseSync } from "node:sqlite";
import type { SourceRef } from "./identity.ts";

export type AnalysisAxis = { key: string; numerator: number; denominator: number; value: number | null; unknownDays: number };
export type AnalysisResult = { axes: AnalysisAxis[]; unknown: string[] };
export type ComparisonResult = { common: string[]; differences: string[]; unknown: string[] };
export type Review = "agree" | "disagree" | "unsure" | "edit" | null;
export type Insight = {
 id: string; personId: string; kind: "analysis" | "comparison"; inputKey: string;
 sourceRefs: SourceRef[]; rangeStart: number | null; rangeEnd: number | null;
 timeZone: string; generatorVersion: string; model: string | null; summary: string;
 result: AnalysisResult | ComparisonResult; review: Review; reviewNote: string | null;
 reviewedAt: number | null; version: number; createdAt: number; updatedAt: number;
};
type Row = Record<string, any>;

function fromRow(row: Row | undefined): Insight | null {
 if (!row) return null;
 return {
 id:row.id, personId:row.person_id, kind:row.kind, inputKey:row.input_key,
 sourceRefs:JSON.parse(row.source_refs_json), rangeStart:row.range_start, rangeEnd:row.range_end,
 timeZone:row.timezone, generatorVersion:row.generator_version, model:row.model, summary:row.summary,
 result:JSON.parse(row.result_json), review:row.review, reviewNote:row.review_note, reviewedAt:row.reviewed_at,
 version:row.version, createdAt:row.created_at, updatedAt:row.updated_at
 };
}

/** Only insights SQL/DTO conversion. Callers enforce source visibility using INFORMATION. */
export function createInsightsRepository(db: DatabaseSync) {
 const get = (personId: string, id: string) => fromRow(db.prepare("SELECT * FROM insights WHERE id=? AND person_id=?").get(id,personId));
 return {
 get,
 findByInput(personId: string, kind: string, key: string) {
   return fromRow(db.prepare("SELECT * FROM insights WHERE person_id=? AND kind=? AND input_key=?").get(personId,kind,key));
 },
 insert(i: Insight) {
   db.prepare(`INSERT INTO insights
   (id,person_id,kind,input_key,source_refs_json,range_start,range_end,timezone,generator_version,model,summary,result_json,review,review_note,reviewed_at,version,created_at,updated_at)
   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(i.id,i.personId,i.kind,i.inputKey,JSON.stringify(i.sourceRefs),i.rangeStart,i.rangeEnd,i.timeZone,i.generatorVersion,i.model,i.summary,JSON.stringify(i.result),i.review,i.reviewNote,i.reviewedAt,i.version,i.createdAt,i.updatedAt);
   return get(i.personId,i.id)!;
 },
 list(personId: string) {
   return db.prepare("SELECT * FROM insights WHERE person_id=? ORDER BY created_at DESC,id DESC").all(personId).map(row => fromRow(row)!);
 },
 review(personId: string,id: string,expectedVersion: number, patch: {review:Review;reviewNote:string|null;reviewedAt:number|null},now:number) {
   const r=db.prepare("UPDATE insights SET review=?,review_note=?,reviewed_at=?,updated_at=?,version=version+1 WHERE person_id=? AND id=? AND version=?").run(patch.review,patch.reviewNote,patch.reviewedAt,now,personId,id,expectedVersion);
   return r.changes ? get(personId,id) : null;
 },
 remove(personId:string,id:string,expectedVersion:number) {
   db.exec("SAVEPOINT insights_remove");
   try {
     const row=get(personId,id);
     if (!row || row.version!==expectedVersion) { db.exec("RELEASE insights_remove"); return false; }
     db.prepare("UPDATE messages SET insight_id=NULL WHERE insight_id=?").run(id);
     db.prepare("DELETE FROM insights WHERE id=? AND person_id=? AND version=?").run(id,personId,expectedVersion);
     db.exec("RELEASE insights_remove");
     return true;
   } catch (error) {
     db.exec("ROLLBACK TO insights_remove"); db.exec("RELEASE insights_remove"); throw error;
   }
 }
 };
}
