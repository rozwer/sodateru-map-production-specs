import { readFileSync } from "node:fs";
import type { Migration } from "../../db/migrate.ts";
export const bikeMigration: Migration = { id: "bike/001-bike", sql: readFileSync(new URL("../../db/migrations/bike/001-bike.sql", import.meta.url), "utf8") };
