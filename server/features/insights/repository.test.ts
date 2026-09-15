import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInsightsRepository } from "./repository.ts";

const ddl = `CREATE TABLE insights (
 id TEXT PRIMARY KEY, person_id TEXT NOT NULL, kind TEXT NOT NULL, input_key TEXT NOT NULL,
 source_refs_json TEXT NOT NULL, range_start INTEGER, range_end INTEGER, timezone TEXT NOT NULL,
 generator_version TEXT NOT NULL, model TEXT, summary TEXT NOT NULL, result_json TEXT NOT NULL,
 review TEXT, review_note TEXT, reviewed_at INTEGER, version INTEGER NOT NULL,
 created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
 UNIQUE(person_id,kind,input_key)
); CREATE TABLE messages (id TEXT PRIMARY KEY, insight_id TEXT);`;
const item = {
 id:"i1", personId:"p", kind:"comparison" as const, inputKey:"hash", sourceRefs:[{type:"record" as const,id:"r",version:1}],
 rangeStart:null, rangeEnd:null, timeZone:"Asia/Tokyo", generatorVersion:"manual-v1", model:null, summary:"",
 result:{common:["本人の共通点"],differences:["本人の違い"],unknown:["2体験からの仮説"]},
 review:null,reviewNote:null,reviewedAt:null,version:1,createdAt:100,updatedAt:100
};
test("SQLiteへ原文・本人評価を保存し再起動後に取得、版競合と他本人更新を拒否", () => {
 const dir=mkdtempSync(join(tmpdir(),"insights-")); const path=join(dir,"live.sqlite");
 try {
 let db=new DatabaseSync(path); db.exec(ddl); let repo=createInsightsRepository(db);
 repo.insert(item);
 assert.equal(repo.findByInput("p","comparison","hash")?.id,"i1");
 assert.equal(repo.get("other","i1"),null);
 assert.equal(repo.review("p","i1",1,{review:"disagree",reviewNote:"違います",reviewedAt:200},200)?.version,2);
 assert.equal(repo.review("p","i1",1,{review:"agree",reviewNote:null,reviewedAt:201},201),null);
 assert.equal(repo.review("other","i1",2,{review:"agree",reviewNote:null,reviewedAt:201},201),null);
 db.close(); db=new DatabaseSync(path); repo=createInsightsRepository(db);
 assert.equal(repo.get("p","i1")?.reviewNote,"違います");
 assert.deepEqual(repo.get("p","i1")?.result,item.result);
 db.prepare("INSERT INTO messages VALUES (?,?)").run("m1","i1");
 assert.equal(repo.remove("p","i1",1),false);
 assert.equal(repo.remove("p","i1",2),true);
 assert.equal(repo.get("p","i1"),null);
 assert.equal(db.prepare("SELECT insight_id FROM messages").get()?.insight_id,null);
 db.close();
 } finally { rmSync(dir,{recursive:true,force:true}); }
});
