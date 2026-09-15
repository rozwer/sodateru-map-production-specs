import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { DatabaseSync } from 'node:sqlite';

export interface Migration { id: string; sql: string }
export const baseMigration: Migration = {
  id: '000-base',
  sql: readFileSync(new URL('./migrations/000-base.sql', import.meta.url), 'utf8'),
};

/** Synchronous only: never hold a SQLite transaction across external I/O. */
export function transaction<T>(db: DatabaseSync, run: () => T): T {
  const name = `tx_${crypto.randomUUID().replaceAll('-', '')}`;
  const nested = db.isTransaction;
  db.exec(nested ? `SAVEPOINT ${name}` : 'BEGIN IMMEDIATE');
  try {
    const result = run();
    if (result && typeof (result as { then?: unknown }).then === 'function') {
      throw new TypeError('transaction callback must be synchronous');
    }
    db.exec(nested ? `RELEASE ${name}` : 'COMMIT');
    return result;
  } catch (error) {
    db.exec(nested ? `ROLLBACK TO ${name}; RELEASE ${name}` : 'ROLLBACK');
    throw error;
  }
}

export function migrate(db: DatabaseSync, migrations: readonly Migration[]): string[] {
  db.exec(`CREATE TABLE IF NOT EXISTS core_migrations (
    id TEXT PRIMARY KEY, hash TEXT NOT NULL, applied_at INTEGER NOT NULL
  ) STRICT`);
  const ids = new Set<string>();
  const applied: string[] = [];
  for (const migration of migrations) {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(migration.id) || ids.has(migration.id)) {
      throw new Error(`Invalid or duplicate migration id: ${migration.id}`);
    }
    ids.add(migration.id);
    const hash = createHash('sha256').update(migration.sql).digest('hex');
    transaction(db, () => {
      const existing = db.prepare('SELECT hash FROM core_migrations WHERE id=?').get(migration.id);
      if (existing) {
        if (existing.hash !== hash) throw new Error(`Applied migration changed: ${migration.id}`);
        return;
      }
      db.exec(migration.sql);
      db.prepare('INSERT INTO core_migrations VALUES (?, ?, ?)').run(migration.id, hash, Date.now());
      applied.push(migration.id);
    });
  }
  return applied;
}
