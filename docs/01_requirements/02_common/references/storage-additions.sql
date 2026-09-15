-- 既存のpeople/places/messages等を作成した後、一度だけ適用する。
-- JSON内容と対象所有者は本文の共通処理でも検査する。
PRAGMA foreign_keys = ON;
BEGIN IMMEDIATE;
ALTER TABLE places ADD COLUMN categories_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(categories_json) AND json_type(categories_json)='array');
ALTER TABLE messages ADD COLUMN task TEXT;
ALTER TABLE messages ADD COLUMN request_hash TEXT;
ALTER TABLE messages ADD COLUMN request_json TEXT CHECK(request_json IS NULL OR json_valid(request_json));
ALTER TABLE messages ADD COLUMN result_json TEXT CHECK(result_json IS NULL OR json_valid(result_json));
ALTER TABLE messages ADD COLUMN applied_refs_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(applied_refs_json) AND json_type(applied_refs_json)='array');
CREATE UNIQUE INDEX common_one_active_run ON messages(conversation_id) WHERE role='assistant' AND status IN ('pending','running');
CREATE TABLE creation_receipts (
 person_id TEXT NOT NULL REFERENCES people(id),
 operation TEXT NOT NULL CHECK(operation IN ('place-adopt','route-save')),
 target_id TEXT NOT NULL,
 input_hash TEXT NOT NULL,
 result_type TEXT NOT NULL CHECK(result_type IN ('place','route')),
 result_id TEXT NOT NULL,
 created_at INTEGER NOT NULL,
 PRIMARY KEY(person_id,operation,target_id),
 CHECK((operation='place-adopt' AND result_type='place') OR (operation='route-save' AND result_type='route'))
);
CREATE TABLE discovery_cards (
 id TEXT PRIMARY KEY NOT NULL,
 person_id TEXT NOT NULL REFERENCES people(id),
 anchor_json TEXT NOT NULL CHECK(json_valid(anchor_json)),
 bridge TEXT NOT NULL,
 knowledge TEXT NOT NULL,
 observation_prompt TEXT NOT NULL,
 concept_ids_json TEXT NOT NULL CHECK(json_valid(concept_ids_json)),
 sources_json TEXT NOT NULL CHECK(json_valid(sources_json)),
 source_refs_json TEXT NOT NULL CHECK(json_valid(source_refs_json)),
 version INTEGER NOT NULL DEFAULT 1 CHECK(version>=1),
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL CHECK(updated_at>=created_at)
);
CREATE INDEX discovery_cards_owner ON discovery_cards(person_id,updated_at);
CREATE TABLE discovery_reactions (
 id TEXT PRIMARY KEY NOT NULL,
 person_id TEXT NOT NULL REFERENCES people(id),
 card_id TEXT NOT NULL REFERENCES discovery_cards(id) ON DELETE CASCADE,
 reaction TEXT NOT NULL CHECK(reaction IN ('known','interested','saved','blocked','dismissed')),
 created_at INTEGER NOT NULL
);
CREATE INDEX discovery_reactions_latest ON discovery_reactions(card_id,created_at,id);
COMMIT;
