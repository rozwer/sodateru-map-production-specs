ALTER TABLE themes ADD COLUMN color_key TEXT NOT NULL DEFAULT 'teal'
 CHECK(color_key IN ('teal','pink','orange','yellow','green','blue','purple'));
ALTER TABLE themes ADD COLUMN cover_media_id TEXT REFERENCES media(id) ON DELETE SET NULL;

CREATE TABLE memo_presentations (
 record_id TEXT PRIMARY KEY REFERENCES records(id) ON DELETE CASCADE,
 name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 20)
);
CREATE TABLE memo_origins (
 record_id TEXT NOT NULL REFERENCES records(id) ON DELETE CASCADE,
 position INTEGER NOT NULL CHECK(position>=0),
 origin_type TEXT NOT NULL CHECK(origin_type IN ('record','suggestion')),
 origin_id TEXT NOT NULL,
 origin_version INTEGER NOT NULL CHECK(origin_version>=1),
 PRIMARY KEY(record_id,position),
 UNIQUE(record_id,origin_type,origin_id)
);
CREATE INDEX memo_origins_source ON memo_origins(origin_type,origin_id);
CREATE TABLE memo_keywords (
 record_id TEXT NOT NULL REFERENCES records(id) ON DELETE CASCADE,
 position INTEGER NOT NULL CHECK(position>=0),
 keyword TEXT NOT NULL CHECK(length(keyword) BETWEEN 1 AND 80),
 PRIMARY KEY(record_id,position),
 UNIQUE(record_id,keyword)
);

-- Keep the stored membership current even when deletion enters through RECORDS.
CREATE TRIGGER themes_record_deleted BEFORE DELETE ON records BEGIN
 UPDATE themes SET record_ids_json=(SELECT json_group_array(value) FROM json_each(record_ids_json) WHERE value<>OLD.id),
 version=version+1, updated_at=MAX(updated_at,CAST(unixepoch('subsec')*1000 AS INTEGER))
 WHERE EXISTS(SELECT 1 FROM json_each(record_ids_json) WHERE value=OLD.id);
 UPDATE records SET version=version+1,updated_at=MAX(updated_at,CAST(unixepoch('subsec')*1000 AS INTEGER))
 WHERE id IN (SELECT record_id FROM memo_origins WHERE origin_type='record' AND origin_id=OLD.id) AND id<>OLD.id;
 DELETE FROM memo_origins WHERE origin_type='record' AND origin_id=OLD.id;
END;
CREATE TRIGGER themes_media_deleted BEFORE DELETE ON media BEGIN
 UPDATE themes SET cover_media_id=NULL,version=version+1,
 updated_at=MAX(updated_at,CAST(unixepoch('subsec')*1000 AS INTEGER)) WHERE cover_media_id=OLD.id;
END;
CREATE TRIGGER themes_suggestion_deleted BEFORE DELETE ON suggestions BEGIN
 UPDATE records SET version=version+1,updated_at=MAX(updated_at,CAST(unixepoch('subsec')*1000 AS INTEGER))
 WHERE id IN (SELECT record_id FROM memo_origins WHERE origin_type='suggestion' AND origin_id=OLD.id);
 DELETE FROM memo_origins WHERE origin_type='suggestion' AND origin_id=OLD.id;
END;
