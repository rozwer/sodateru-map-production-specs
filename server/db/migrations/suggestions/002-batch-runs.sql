CREATE TABLE suggestion_batch_runs (
  id TEXT PRIMARY KEY NOT NULL,
  person_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('running','complete','failed')),
  request_json TEXT NOT NULL CHECK(json_valid(request_json)),
  error_json TEXT CHECK(error_json IS NULL OR json_valid(error_json)),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX suggestion_batch_runs_owner ON suggestion_batch_runs(person_id,status);
