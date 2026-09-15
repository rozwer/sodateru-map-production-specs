CREATE TABLE IF NOT EXISTS reflection_questions (
 id TEXT PRIMARY KEY, person_id TEXT NOT NULL, target_record_id TEXT NOT NULL,
 topic TEXT NOT NULL CHECK(topic IN ('purpose','reason','context','alternative')),
 question_text TEXT NOT NULL, source_refs_json TEXT NOT NULL, generator_version TEXT NOT NULL,
 identity_key TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','later','skipped','answered')),
 answer_record_id TEXT, version INTEGER NOT NULL DEFAULT 1,
 created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
 UNIQUE(person_id, identity_key)
);
CREATE INDEX IF NOT EXISTS reflection_questions_person ON reflection_questions(person_id, created_at DESC, id DESC);
