import type { DatabaseSync } from 'node:sqlite';
export function installDiscoverTask(): void;
export function runtimeFor(db: DatabaseSync, dataMode: 'live' | 'demo'): unknown;
