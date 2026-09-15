import { operations } from './operations.generated.ts';
import type { DataMode, OperationId, OperationInput, OperationOutput } from './types.generated.ts';
export type * from './types.generated.ts';

export class ApiError extends Error {
  status: number;
  code: string;
  requestId: string;
  details: Record<string, unknown>;
  constructor(status: number, code: string, message: string, requestId: string, details: Record<string, unknown> = {}) {
    super(message); this.name = 'ApiError';
    this.status = status; this.code = code; this.requestId = requestId; this.details = details;
  }
}
export interface ApiClient {
  request<T extends OperationId>(operation: T, input: OperationInput<T>): Promise<OperationOutput<T>>;
  setDataMode(mode: DataMode): void;
  cancelPending(): void;
}
export function createApiClient(options: { baseUrl?: string; fetch?: typeof globalThis.fetch } = {}): ApiClient {
  const fetcher = options.fetch ?? globalThis.fetch.bind(globalThis);
  const baseUrl = (options.baseUrl ?? '/api/v1').replace(/\/$/, '');
  let dataMode: DataMode = 'live', generation = 0;
  const pending = new Set<AbortController>();
  function cancelPending() {
    generation++;
    for (const controller of pending) controller.abort();
    pending.clear();
  }
  return {
    setDataMode(mode) {
      if (mode !== 'live' && mode !== 'demo') throw new TypeError('Unknown dataMode');
      if (mode !== dataMode) { cancelPending(); dataMode = mode; }
    },
    cancelPending,
    async request<T extends OperationId>(operation: T, input: OperationInput<T>): Promise<OperationOutput<T>> {
      if (operation === 'postSession' || operation === 'deleteSession') cancelPending();
      const meta = operations[operation];
      if (!meta) throw new TypeError(`Unknown operation: ${operation}`);
      const values = input as { path?: Record<string, string>; query?: Record<string, unknown>; body?: unknown; version?: number; idempotencyKey?: string; signal?: AbortSignal };
      const requestId = globalThis.crypto.randomUUID();
      const headers = new Headers({ 'X-Request-Id': requestId, 'X-Data-Mode': dataMode });
      const path = meta.path.replace(/\{([^}]+)\}/g, (_, name: string) => {
        if (values.path?.[name] === undefined) throw new TypeError(`Missing path parameter ${name}`);
        return encodeURIComponent(values.path[name]);
      });
      const query = new URLSearchParams();
      for (const [key, value] of Object.entries(values.query ?? {})) {
        if (value === undefined) continue;
        for (const item of Array.isArray(value) ? value : [value]) query.append(key, String(item));
      }
      if (meta.requiresVersion) {
        if (!Number.isSafeInteger(values.version) || values.version! < 1) throw new TypeError('A positive version is required');
        headers.set('If-Match', `"${values.version}"`);
      }
      if (meta.requiresKey) {
        if (!values.idempotencyKey?.trim() || Array.from(values.idempotencyKey).length > 128) throw new TypeError('A fixed Idempotency-Key is required');
        headers.set('Idempotency-Key', values.idempotencyKey);
      }
      let body: BodyInit | undefined;
      if (meta.multipart) body = values.body as FormData;
      else if (values.body !== undefined) { headers.set('Content-Type', 'application/json'); body = JSON.stringify(values.body); }
      const controller = new AbortController(), started = generation;
      const abort = () => controller.abort(values.signal?.reason);
      if (values.signal?.aborted) abort();
      else values.signal?.addEventListener('abort', abort, { once: true });
      pending.add(controller);
      try {
        const response = await fetcher(baseUrl + path + (query.size ? '?' + query : ''), { method: meta.method, headers, body, signal: controller.signal, credentials: 'same-origin' });
        const assertCurrent = () => {
          if (started !== generation || controller.signal.aborted) throw new DOMException('本人またはモードが変更されました。', 'AbortError');
        };
        assertCurrent();
        if (!response.ok) {
          let payload: { error?: { code?: string; message?: string; requestId?: string; details?: Record<string, unknown> } } = {};
          try { payload = await response.json() as typeof payload; } catch { /* HTTP status remains available for a non-JSON upstream failure. */ }
          assertCurrent();
          throw new ApiError(response.status, payload.error?.code ?? 'HTTP_ERROR', payload.error?.message ?? '通信に失敗しました。', payload.error?.requestId ?? response.headers.get('X-Request-Id') ?? requestId, payload.error?.details);
        }
        if (response.status === 204) return undefined as OperationOutput<T>;
        const value = response.headers.get('Content-Type')?.includes('application/json') ? await response.json() : await response.blob();
        assertCurrent();
        return value as OperationOutput<T>;
      } finally {
        pending.delete(controller); values.signal?.removeEventListener('abort', abort);
      }
    },
  };
}
