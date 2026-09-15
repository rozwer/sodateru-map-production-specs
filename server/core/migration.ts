import type { Migration } from '../db/migrate.ts';

export const coreMigration: Migration = {
  id: 'core/001-session-receipts',
  sql: `
CREATE TABLE core_local_profiles (
  profile_key TEXT PRIMARY KEY,
  person_id TEXT NOT NULL UNIQUE
) STRICT;
CREATE TABLE core_sessions (
  token_hash TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  profile_key TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK(version >= 1),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
) STRICT;
CREATE TABLE core_requests (
  person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  operation TEXT NOT NULL,
  request_key TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  state TEXT NOT NULL CHECK(state IN ('pending','complete')),
  result_json TEXT CHECK(result_json IS NULL OR json_valid(result_json)),
  created_at INTEGER NOT NULL,
  expires_at INTEGER,
  PRIMARY KEY(person_id, operation, request_key)
) STRICT;
`,
};
