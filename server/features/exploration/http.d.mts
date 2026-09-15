import type { DatabaseSync } from 'node:sqlite';
import type { CoreServices, Feature } from '../../core/features.ts';
export function createExplorationFeature(runtimeFor: (db: DatabaseSync, dataMode: 'live' | 'demo', services?: CoreServices) => unknown): Feature;
