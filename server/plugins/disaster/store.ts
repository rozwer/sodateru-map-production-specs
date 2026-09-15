import type { DatabaseSync } from 'node:sqlite';
import type { RequestContext } from '../../core/context.ts';
import type { Snapshot, Attempt } from './types.ts';
export class DisasterStore {
  constructor(readonly db: DatabaseSync, readonly context: RequestContext) {}
  read(): { result: Snapshot | null; lastAttempt: Attempt | null } {
    const row=this.db.prepare('SELECT snapshot_json,attempt_json FROM disaster_cache WHERE person_id=? AND data_mode=?')
      .get(this.context.personId,this.context.dataMode) as {snapshot_json:string|null;attempt_json:string|null}|undefined;
    return {result:row?.snapshot_json ? JSON.parse(row.snapshot_json) : null,lastAttempt:row?.attempt_json ? JSON.parse(row.attempt_json) : null};
  }
  save(result: Snapshot | null, attempt: Attempt) {
    // Attempt diagnostics retain timestamps/checksums, without duplicating cached image bytes.
    const diagnostic={...attempt,layers:attempt.layers.map(l=>({...l,tiles:l.tiles.map(t=>({...t,imageDataUrl:null}))}))};
    this.db.prepare(`INSERT INTO disaster_cache(person_id,data_mode,snapshot_json,attempt_json) VALUES (?,?,?,?)
      ON CONFLICT(person_id,data_mode) DO UPDATE SET snapshot_json=excluded.snapshot_json,attempt_json=excluded.attempt_json`)
      .run(this.context.personId,this.context.dataMode,result ? JSON.stringify(result) : null,JSON.stringify(diagnostic));
  }
}
