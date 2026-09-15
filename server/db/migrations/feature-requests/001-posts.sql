ALTER TABLE feature_requests ADD COLUMN display_name TEXT NOT NULL DEFAULT '';
ALTER TABLE feature_requests ADD COLUMN region_tags_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE feature_requests ADD COLUMN purpose_tags_json TEXT NOT NULL DEFAULT '[]';
UPDATE feature_requests SET display_name=COALESCE((SELECT name FROM people WHERE people.id=feature_requests.person_id),'自分') WHERE display_name='';
CREATE TABLE feature_request_empathy (
  request_id TEXT NOT NULL REFERENCES feature_requests(id) ON DELETE CASCADE,
  person_id TEXT NOT NULL REFERENCES people(id),
  created_at INTEGER NOT NULL,
  PRIMARY KEY(request_id,person_id)
);
