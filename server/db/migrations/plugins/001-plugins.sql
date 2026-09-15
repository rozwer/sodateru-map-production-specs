-- CORE applies this after its base plugin_settings table, within its migration transaction.
-- Keep old ownerless rows intact; never silently assign them to the current person.
ALTER TABLE plugin_settings RENAME TO plugin_settings_legacy;
CREATE TABLE plugin_settings (
  person_id TEXT NOT NULL,
  id TEXT NOT NULL,
  install_id TEXT NOT NULL UNIQUE,
  version INTEGER NOT NULL CHECK(version >= 1),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  enabled INTEGER NOT NULL CHECK(enabled IN (0,1)),
  installed INTEGER NOT NULL CHECK(installed IN (0,1)),
  settings_json TEXT NOT NULL,
  plugin_version TEXT NOT NULL,
  icon TEXT NOT NULL,
  declarations_json TEXT NOT NULL,
  manifest_json TEXT NOT NULL,
  previous_json TEXT,
  PRIMARY KEY(person_id,id)
);
CREATE TABLE plugin_conflict_resolutions (
  person_id TEXT NOT NULL,
  conflict_key TEXT NOT NULL,
  resolution_json TEXT NOT NULL,
  PRIMARY KEY(person_id,conflict_key)
);
CREATE TABLE plugin_version_history (
  install_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  snapshot_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY(install_id,revision)
);
