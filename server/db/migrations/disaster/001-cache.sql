CREATE TABLE disaster_cache (
  person_id TEXT NOT NULL REFERENCES people(id),
  data_mode TEXT NOT NULL CHECK(data_mode IN ('live','demo')),
  snapshot_json TEXT,
  attempt_json TEXT,
  PRIMARY KEY(person_id, data_mode)
) STRICT;
