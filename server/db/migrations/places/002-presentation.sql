ALTER TABLE place_details ADD COLUMN description_json TEXT CHECK(description_json IS NULL OR json_valid(description_json));
ALTER TABLE place_details ADD COLUMN photos_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(photos_json));
