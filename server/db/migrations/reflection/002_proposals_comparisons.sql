CREATE TABLE IF NOT EXISTS reflection_proposals (
 message_id TEXT PRIMARY KEY, person_id TEXT NOT NULL, task TEXT NOT NULL,
 input_json TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS reflection_comparisons (
 id TEXT PRIMARY KEY, person_id TEXT NOT NULL, left_json TEXT NOT NULL, right_json TEXT NOT NULL,
 common_text TEXT NOT NULL, differences_text TEXT NOT NULL, timezone TEXT NOT NULL,
 insight_id TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1,
 created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS reflection_comparisons_person ON reflection_comparisons(person_id,created_at DESC,id DESC);
