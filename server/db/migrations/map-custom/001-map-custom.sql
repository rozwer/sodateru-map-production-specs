CREATE TABLE map_custom_objects (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  data_mode TEXT NOT NULL CHECK (data_mode IN ('live','demo')),
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 20),
  memo TEXT NOT NULL CHECK (length(memo) <= 200),
  color TEXT NOT NULL CHECK (color IN ('teal','pink','orange','yellow','green','blue')),
  size TEXT NOT NULL CHECK (size IN ('small','medium','large')),
  longitude REAL NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  latitude REAL NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX map_custom_objects_owner ON map_custom_objects(person_id,data_mode,created_at,id);
CREATE TABLE map_custom_settings (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  data_mode TEXT NOT NULL CHECK (data_mode IN ('live','demo')),
  style_json TEXT NOT NULL CHECK (json_valid(style_json)),
  layers_json TEXT NOT NULL CHECK (json_valid(layers_json)),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(person_id,data_mode)
);
-- Only a server-verified AI result can create this preview. Cancelling never updates settings.
CREATE TABLE map_custom_previews (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  data_mode TEXT NOT NULL CHECK (data_mode IN ('live','demo')),
  message_id TEXT NOT NULL,
  settings_id TEXT NOT NULL REFERENCES map_custom_settings(id) ON DELETE CASCADE,
  settings_version INTEGER NOT NULL,
  plugin_snapshot TEXT NOT NULL,
  proposal_json TEXT NOT NULL CHECK (json_valid(proposal_json)),
  content_hash TEXT NOT NULL,
  explanation TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'ready' CHECK (state IN ('ready','cancelled','applied')),
  version INTEGER NOT NULL DEFAULT 1,
  applied_version INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(person_id,data_mode,message_id)
);
CREATE TABLE map_custom_ai_inputs (
  message_id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  data_mode TEXT NOT NULL CHECK (data_mode IN ('live','demo')),
  settings_id TEXT NOT NULL REFERENCES map_custom_settings(id) ON DELETE CASCADE,
  settings_version INTEGER NOT NULL,
  plugin_snapshot TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
