CREATE TABLE community_bookmarks (
 id TEXT PRIMARY KEY NOT NULL,
 person_id TEXT NOT NULL REFERENCES people(id),
 target_type TEXT NOT NULL CHECK(target_type IN ('record','place','candidate')),
 target_key TEXT NOT NULL,
 target_json TEXT NOT NULL CHECK(json_valid(target_json)),
 expires_at INTEGER,
 version INTEGER NOT NULL DEFAULT 1,
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL,
 UNIQUE(person_id,target_type,target_key)
);
CREATE INDEX community_bookmarks_owner ON community_bookmarks(person_id,created_at DESC,id);
CREATE TABLE community_theme_shares (
 id TEXT PRIMARY KEY NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
 visibility TEXT NOT NULL CHECK(visibility IN ('private','public','selected')),
 shared_with_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(shared_with_json)),
 version INTEGER NOT NULL DEFAULT 1,
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL
);
