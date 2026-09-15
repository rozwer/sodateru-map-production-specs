CREATE TABLE IF NOT EXISTS exploration_discovery_adoptions (
 person_id TEXT NOT NULL REFERENCES people(id),
 card_id TEXT NOT NULL,
 assistant_message_id TEXT NOT NULL,
 attempt INTEGER NOT NULL CHECK(attempt>=1),
 created_at INTEGER NOT NULL,
 PRIMARY KEY(person_id,card_id)
);
CREATE INDEX IF NOT EXISTS exploration_discovery_adoptions_run ON exploration_discovery_adoptions(person_id,assistant_message_id,attempt);
