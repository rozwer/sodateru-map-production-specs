ALTER TABLE self_checkins ADD COLUMN timezone TEXT NOT NULL DEFAULT 'UTC';
ALTER TABLE suggestions ADD COLUMN details_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(details_json));
ALTER TABLE suggestions ADD COLUMN memo TEXT NOT NULL DEFAULT '';
CREATE TABLE suggestion_checkin_versions (
  checkin_id TEXT NOT NULL,
  person_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  snapshot_json TEXT NOT NULL CHECK(json_valid(snapshot_json)),
  PRIMARY KEY(checkin_id,version)
);
CREATE TABLE suggestion_batches (
  id TEXT PRIMARY KEY NOT NULL,
  person_id TEXT NOT NULL,
  input_json TEXT NOT NULL CHECK(json_valid(input_json)),
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  empty_reason TEXT
);
CREATE INDEX suggestions_batch_owner_order ON suggestions(person_id,batch_id,position);
CREATE INDEX suggestion_batches_owner ON suggestion_batches(person_id,created_at);
