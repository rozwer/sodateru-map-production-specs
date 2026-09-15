CREATE TABLE IF NOT EXISTS person_settings (
  person_id TEXT PRIMARY KEY REFERENCES people(id) ON DELETE CASCADE,
  version INTEGER NOT NULL CHECK(version >= 1),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  preferences_json TEXT NOT NULL CHECK(json_valid(preferences_json))
);

CREATE TABLE IF NOT EXISTS profile_icons (
  person_id TEXT PRIMARY KEY REFERENCES people(id) ON DELETE CASCADE,
  mime_type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
