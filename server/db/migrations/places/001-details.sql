CREATE TABLE place_details (
  place_id TEXT PRIMARY KEY REFERENCES places(id) ON DELETE CASCADE,
  created_by TEXT REFERENCES people(id) ON DELETE SET NULL,
  opening_hours_json TEXT CHECK(opening_hours_json IS NULL OR json_valid(opening_hours_json)),
  entrances_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(entrances_json)),
  corrections_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(corrections_json)),
  external_values_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(external_values_json))
);
CREATE INDEX places_building_key_idx ON places(building_key,name,id);
