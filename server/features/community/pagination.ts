import { createHash } from 'node:crypto';
import { CommonError } from '../../core/errors.ts';
const invalid = (message: string) => new CommonError('VALIDATION_FAILED', message, false, undefined, 422);

export function identity(value: unknown, name = 'id'): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 80) throw invalid(`${name}は1〜80文字です`);
  return value;
}

// Cursors belong to one viewer, mode and filter; they never change the visible set.
export function page<T extends { id: string }>(items: T[], query: URLSearchParams, binding: unknown) {
  const raw = query.get('limit') ?? '50';
  if (!/^\d+$/.test(raw) || +raw < 1 || +raw > 100) throw invalid('limitは1〜100です');
  const limit = +raw;
  const key = createHash('sha256').update(JSON.stringify(binding)).digest('hex');
  let start = 0;
  const cursor = query.get('cursor');
  if (cursor !== null) {
    try {
      const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString());
      const index = items.findIndex(item => item.id === parsed.after);
      if (parsed.key !== key || index < 0) throw Error('cursor');
      start = index + 1;
    } catch {
      throw new CommonError('VALIDATION_FAILED', '検索条件に対応しないcursorです', false, undefined, 400);
    }
  }
  const selected = items.slice(start, start + limit);
  return { items: selected, nextCursor: start + limit < items.length
    ? Buffer.from(JSON.stringify({ key, after: selected.at(-1)!.id })).toString('base64url') : null };
}
