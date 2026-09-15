export const migration = {
 id: "insights-001-creation-receipts",
 sql: `CREATE TABLE IF NOT EXISTS insights_creation_receipts (
 person_id TEXT NOT NULL, id TEXT NOT NULL, input_key TEXT NOT NULL, insight_id TEXT NOT NULL,
 PRIMARY KEY(person_id,id)
 );
 CREATE INDEX IF NOT EXISTS insights_person_range ON insights(person_id,kind,range_start,range_end,timezone);`
};
