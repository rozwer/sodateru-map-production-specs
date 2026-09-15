import type { DatabaseSync } from 'node:sqlite';
import type { DataMode } from '../db/connection.ts';

export interface RequestContext {
  personId: string;
  dataMode: DataMode;
  requestId: string;
  signal: AbortSignal;
}
export interface CoreEnv {
  Variables: {
    context: RequestContext;
    db: DatabaseSync;
    requestId: string;
    dataMode: DataMode;
    input: { body?: unknown; query: Record<string, unknown>; path: Record<string, unknown> };
  };
}
