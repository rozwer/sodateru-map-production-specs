export const transferMigration = {
  id: 'transfer-001-recipes-and-plan-sets',
  sql: `
CREATE TABLE IF NOT EXISTS transfer_recipes (
 id TEXT PRIMARY KEY, person_id TEXT NOT NULL, version INTEGER NOT NULL CHECK(version > 0),
 input_json TEXT NOT NULL, recipe_json TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS transfer_recipes_owner ON transfer_recipes(person_id, updated_at DESC);
CREATE TABLE IF NOT EXISTS transfer_plan_sets (
 id TEXT PRIMARY KEY, person_id TEXT NOT NULL, recipe_id TEXT NOT NULL REFERENCES transfer_recipes(id),
 version INTEGER NOT NULL CHECK(version > 0), input_json TEXT NOT NULL, plan_json TEXT NOT NULL,
 adoption_variant TEXT CHECK(adoption_variant IN ('faithful','personalized')),
 adoption_route_id TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS transfer_plan_sets_owner ON transfer_plan_sets(person_id, updated_at DESC);
`,
};
