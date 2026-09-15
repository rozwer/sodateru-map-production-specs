CREATE TABLE IF NOT EXISTS companion_reference_images (
 id TEXT PRIMARY KEY, person_id TEXT NOT NULL, bytes BLOB NOT NULL,
 mime TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS companion_cursors (
 id TEXT PRIMARY KEY, person_id TEXT NOT NULL, list_kind TEXT NOT NULL,
 last_time INTEGER NOT NULL, last_id TEXT NOT NULL,
 UNIQUE(person_id,list_kind,last_time,last_id)
);
CREATE TABLE IF NOT EXISTS companion_drafts (
 id TEXT PRIMARY KEY, person_id TEXT NOT NULL, name TEXT NOT NULL,
 appearance TEXT NOT NULL, reference_image_id TEXT,
 version INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS companion_drafts_owner ON companion_drafts(person_id);
CREATE TABLE IF NOT EXISTS companion_imports (
 id TEXT PRIMARY KEY, person_id TEXT NOT NULL, name TEXT NOT NULL,
 manifest_json TEXT NOT NULL, required_actions_json TEXT NOT NULL,
 confirmed_actions_json TEXT NOT NULL DEFAULT '[]',
 zip BLOB NOT NULL, atlas BLOB NOT NULL, mime TEXT NOT NULL,
 version INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS companions (
 id TEXT PRIMARY KEY, person_id TEXT NOT NULL, import_id TEXT NOT NULL UNIQUE,
 name TEXT NOT NULL, source TEXT NOT NULL DEFAULT 'import',
 version INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL,
 FOREIGN KEY(import_id) REFERENCES companion_imports(id)
);
CREATE INDEX IF NOT EXISTS companions_owner ON companions(person_id);
CREATE TABLE IF NOT EXISTS companion_settings (
 person_id TEXT PRIMARY KEY, selected_companion_id TEXT,
 visible INTEGER NOT NULL DEFAULT 1, size TEXT NOT NULL DEFAULT 'medium',
 reduced_motion INTEGER NOT NULL DEFAULT 0, version INTEGER NOT NULL DEFAULT 1,
 FOREIGN KEY(selected_companion_id) REFERENCES companions(id)
);
CREATE TABLE IF NOT EXISTS companion_generations (
 id TEXT PRIMARY KEY, person_id TEXT NOT NULL, draft_id TEXT NOT NULL,
 input_json TEXT NOT NULL, provider TEXT NOT NULL, upstream_job_id TEXT,
 status TEXT NOT NULL DEFAULT 'queued', progress INTEGER NOT NULL DEFAULT 0,
 result_import_id TEXT, failure_code TEXT, version INTEGER NOT NULL DEFAULT 1,
 created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
 FOREIGN KEY(draft_id) REFERENCES companion_drafts(id),
 FOREIGN KEY(result_import_id) REFERENCES companion_imports(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS companion_one_active_generation
 ON companion_generations(person_id,draft_id) WHERE status IN ('queued','running');
-- The adoption receipt and the generation's version change commit in one write.
CREATE TRIGGER IF NOT EXISTS companion_adoption_version AFTER INSERT ON companions
 WHEN NEW.source = 'generation'
 BEGIN
  UPDATE companion_generations SET version=version+1,updated_at=NEW.created_at
   WHERE person_id=NEW.person_id AND result_import_id=NEW.import_id;
 END;
