import { mkdirSync, realpathSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { baseMigration, migrate, type Migration } from './migrate.ts';
import { coreMigration } from '../core/migration.ts';

export type DataMode = 'live' | 'demo';
export interface Databases {
  live: DatabaseSync;
  demo: DatabaseSync;
  paths: Record<DataMode, string>;
  close(): void;
}
export function openDatabases(options: {
  livePath: string; demoPath: string; migrations?: readonly Migration[];
}): Databases {
  const paths = { live: resolve(options.livePath), demo: resolve(options.demoPath) };
  if (paths.live === paths.demo) throw new Error('live and demo require separate database files');
  const opened: DatabaseSync[] = [];
  try {
    for (const path of Object.values(paths)) {
      mkdirSync(dirname(path), { recursive: true });
      const db = new DatabaseSync(path);
      opened.push(db);
      db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
    }
    const [live, demo] = opened as [DatabaseSync, DatabaseSync];
    const liveStat = statSync(paths.live), demoStat = statSync(paths.demo);
    if (realpathSync(paths.live) === realpathSync(paths.demo) ||
        (liveStat.dev === demoStat.dev && liveStat.ino === demoStat.ino)) {
      throw new Error('live and demo must not alias the same database');
    }
    const migrations = [baseMigration, coreMigration, ...(options.migrations ?? [])];
    migrate(live, migrations);
    migrate(demo, migrations);
    return { live, demo, paths, close() { for (const db of opened) db.close(); } };
  } catch (error) {
    for (const db of opened) db.close();
    throw error;
  }
}
