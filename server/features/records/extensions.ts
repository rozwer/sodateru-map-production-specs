import type { DatabaseSync } from 'node:sqlite';
import type { Row } from './model.ts';

export interface RecordExtension {
  read(db: DatabaseSync, personId: string, recordId: string): Row;
  write(db: DatabaseSync, personId: string, recordId: string, input: Row): void;
  remove?(db: DatabaseSync, personId: string, recordId: string): void;
}
export const recordExtensions = new Set<RecordExtension>();
export function registerRecordExtension(extension: RecordExtension): void { recordExtensions.add(extension); }
