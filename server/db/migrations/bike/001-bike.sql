CREATE TABLE bike_results (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  data_mode TEXT NOT NULL CHECK (data_mode IN ('live','demo')),
  kind TEXT NOT NULL CHECK (kind IN ('search','assessment','adoption')),
  install_id TEXT NOT NULL,
  settings_hash TEXT NOT NULL,
  snapshot_json TEXT NOT NULL CHECK (json_valid(snapshot_json)),
  created_at INTEGER NOT NULL
) STRICT;
CREATE INDEX bike_results_person ON bike_results(person_id, data_mode, kind, created_at DESC);

CREATE TABLE bike_search_jobs (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  data_mode TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('pending','complete','failed')),
  result_id TEXT REFERENCES bike_results(id),
  error_json TEXT CHECK (error_json IS NULL OR json_valid(error_json)),
  created_at INTEGER NOT NULL
) STRICT;
