CREATE TABLE activity_deleted_points (
  person_id TEXT NOT NULL,
  source_point_id TEXT NOT NULL,
  segment_id TEXT NOT NULL,
  observed_at INTEGER NOT NULL,
  PRIMARY KEY (person_id, source_point_id)
);
CREATE TABLE activity_cursor_key (id INTEGER PRIMARY KEY CHECK (id = 1), secret TEXT NOT NULL);
