-- Resource identity survives edits and deletion. HTTP replay remains CORE-owned.
CREATE TABLE records_creation_inputs (
  person_id TEXT NOT NULL REFERENCES people(id),
  record_id TEXT NOT NULL,
  original_input_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY(person_id, record_id)
);
