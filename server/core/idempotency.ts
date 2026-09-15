import { createHash } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { transaction } from '../db/migrate.ts';
import { CommonError } from './errors.ts';
import type { RequestContext } from './context.ts';

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
const codepointOrder = (left: string, right: string): number => {
  const a = Array.from(left, char => char.codePointAt(0)!);
  const b = Array.from(right, char => char.codePointAt(0)!);
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) return a[i]! - b[i]!;
  return a.length - b.length;
};
export function canonicalJson(input: unknown): string {
  if (input === null || typeof input === 'boolean' || typeof input === 'string') return JSON.stringify(input);
  if (typeof input === 'number' && Number.isFinite(input)) return JSON.stringify(input);
  if (Array.isArray(input)) return '[' + input.map(canonicalJson).join(',') + ']';
  if (typeof input === 'object' && input && Object.getPrototypeOf(input) === Object.prototype) {
    return '{' + Object.keys(input).sort(codepointOrder).map(key => JSON.stringify(key) + ':' + canonicalJson((input as Record<string, unknown>)[key])).join(',') + '}';
  }
  throw new CommonError('INVALID_REQUEST', 'JSONとして保存できない値です。');
}
export function requestHash(input: unknown): string {
  return createHash('sha256').update(canonicalJson(input)).digest('hex');
}
export function idempotencyKey(value: string | undefined): string {
  if (!value || Array.from(value).length > 128 || !value.trim()) {
    throw new CommonError('INVALID_REQUEST', 'Idempotency-Keyを1〜128文字で指定してください。');
  }
  return value;
}

export interface StoredResult {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
  /** Save only a resource reference when replay must recheck existence/permissions. */
  resource?: { type: string; id: string };
  /** Required for temporary provider results. Payload is erased when expired. */
  expiresAt?: number;
}
export interface RequestIdentity {
  context: RequestContext;
  /** HTTP method + normalized concrete path, e.g. POST /api/v1/records. */
  operation: string;
  key: string;
  input: unknown;
}
export interface Receipt extends RequestIdentity { hash: string }
type Existing = { input_hash: string; state: string; result_json: string | null; expires_at: number | null };

function read(db: DatabaseSync, request: Receipt): Existing | undefined {
  return db.prepare('SELECT input_hash,state,result_json,expires_at FROM core_requests WHERE person_id=? AND operation=? AND request_key=?')
    .get(request.context.personId, request.operation, request.key) as Existing | undefined;
}

/** Atomic reservation for external work. The feature must reconcile a pending receipt after restart. */
export function beginRequest(db: DatabaseSync, identity: RequestIdentity): { receipt: Receipt; existing?: StoredResult } {
  const receipt = { ...identity, key: idempotencyKey(identity.key), hash: requestHash(identity.input) };
  return transaction(db, () => {
    const existing = read(db, receipt);
    if (existing) {
      if (existing.input_hash !== receipt.hash) throw new CommonError('IDEMPOTENCY_CONFLICT', '同じ操作IDが異なる入力に使われています。');
      if (existing.expires_at !== null && existing.expires_at <= Date.now()) {
        // Erasure is performed by pruneExpiredResults before entering this transaction.
        throw new CommonError('RESULT_EXPIRED', '保存期間が終了しました。新しい操作で取得してください。');
      }
      if (existing.state === 'pending') throw new CommonError('BUSY', '同じ操作を処理中です。状態を確認してください。', true);
      return { receipt, existing: JSON.parse(existing.result_json!) as StoredResult };
    }
    db.prepare(`INSERT INTO core_requests(person_id,operation,request_key,input_hash,state,created_at)
      VALUES (?,?,?,?,'pending',?)`).run(receipt.context.personId, receipt.operation, receipt.key, receipt.hash, Date.now());
    return { receipt };
  });
}

/** Call in the same transaction as the final business write. */
export function completeRequest(db: DatabaseSync, receipt: Receipt, result: StoredResult): void {
  if (result.status < 200 || result.status >= 300) throw new TypeError('Store successful operation results only');
  const stored = result.resource ? { ...result, body: undefined } : result;
  const changed = db.prepare(`UPDATE core_requests SET state='complete',result_json=?,expires_at=?
    WHERE person_id=? AND operation=? AND request_key=? AND input_hash=? AND state='pending'`)
    .run(JSON.stringify(stored), result.expiresAt ?? null, receipt.context.personId, receipt.operation, receipt.key, receipt.hash);
  if (changed.changes !== 1) throw new CommonError('STATE_CONFLICT', '操作の受付状態が変更されました。');
}

export function pruneExpiredResults(db: DatabaseSync, now = Date.now()): void {
  db.prepare('UPDATE core_requests SET result_json=NULL WHERE expires_at<=? AND result_json IS NOT NULL').run(now);
}

/** Database-only POST: reservation, business write and result commit together. */
export function idempotentMutation(db: DatabaseSync, identity: RequestIdentity, options: {
  execute: () => StoredResult;
  replay?: (result: StoredResult) => StoredResult;
}): StoredResult {
  pruneExpiredResults(db);
  return transaction(db, () => {
    const { receipt, existing } = beginRequest(db, identity);
    if (existing) {
      if (existing.resource && !options.replay) throw new TypeError('Resource receipt requires a current-resource replay handler');
      return options.replay ? options.replay(existing) : existing;
    }
    const result = options.execute();
    completeRequest(db, receipt, result);
    return result;
  });
}
