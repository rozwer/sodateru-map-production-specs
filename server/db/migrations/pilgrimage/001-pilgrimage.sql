CREATE TABLE pilgrimage_searches (
 id TEXT PRIMARY KEY, person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
 data_mode TEXT NOT NULL CHECK(data_mode IN ('live','demo')), input_hash TEXT NOT NULL,
 result_json TEXT NOT NULL CHECK(json_valid(result_json)), created_at INTEGER NOT NULL
) STRICT;
CREATE TABLE pilgrimage_plans (
 id TEXT PRIMARY KEY, person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
 data_mode TEXT NOT NULL CHECK(data_mode IN ('live','demo')), plan_json TEXT NOT NULL CHECK(json_valid(plan_json)),
 version INTEGER NOT NULL CHECK(version>0), created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
) STRICT;
CREATE INDEX pilgrimage_plans_owner ON pilgrimage_plans(person_id,data_mode,updated_at);
