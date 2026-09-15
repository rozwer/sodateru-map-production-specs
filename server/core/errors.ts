export class CommonError extends Error {
  constructor(
    public code: string,
    message: string,
    public retryable = false,
    public details: Record<string, unknown> = {},
    public status?: number,
  ) { super(message); this.name = 'CommonError'; }
}

const statuses: Record<string, number> = {
  INVALID_INPUT: 400, INVALID_REQUEST: 400, VALIDATION_FAILED: 422,
  PERSON_REQUIRED: 401, UNAUTHENTICATED: 401, FORBIDDEN: 403, NOT_FOUND: 404,
  VERSION_CONFLICT: 412, VERSION_REQUIRED: 428,
  REQUEST_CONFLICT: 409, IDEMPOTENCY_CONFLICT: 409, BUSY: 409,
  STATE_CONFLICT: 409, SOURCE_CHANGED: 409, INPUT_CHANGED: 409,
  RESULT_EXPIRED: 410, INPUT_TOO_LARGE: 413, PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415, RANGE_NOT_SATISFIABLE: 416,
  OUTPUT_INVALID: 422, ROUTE_NOT_FOUND: 422, RATE_LIMITED: 429,
  MODE_UNSUPPORTED: 501, UPSTREAM_FAILED: 502,
  PROVIDER_UNAVAILABLE: 503, UNAVAILABLE: 503, TIMEOUT: 504,
};
export function errorResponse(error: unknown, requestId: string): { status: number; body: unknown } {
  if (!(error instanceof CommonError)) {
    return { status: 500, body: { error: { code: 'INTERNAL_ERROR', message: '処理に失敗しました。', requestId } } };
  }
  const code = error.code === 'INVALID_INPUT' ? 'INVALID_REQUEST' : error.code === 'PERSON_REQUIRED' ? 'UNAUTHENTICATED' : error.code;
  return {
    status: error.status ?? statuses[code] ?? 500,
    body: { error: { code, message: error.message, requestId, details: { ...error.details, retryable: error.retryable } } },
  };
}

export function expectedVersion(header: string | undefined): number {
  if (!header) throw new CommonError('VERSION_REQUIRED', '保存時の版を指定してください。');
  if (!/^"[1-9][0-9]*"$/.test(header)) throw new CommonError('INVALID_REQUEST', 'If-Matchの形式が不正です。');
  const version = Number(header.slice(1, -1));
  if (!Number.isSafeInteger(version)) throw new CommonError('INVALID_REQUEST', '版が範囲外です。');
  return version;
}

export function requireVersion(actual: number, expected: number): void {
  if (actual !== expected) throw new CommonError('VERSION_CONFLICT', '保存後に内容が変更されています。', false, { currentVersion: actual });
}
