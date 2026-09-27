// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useKnowledgeBookmarks } from './useKnowledgeBookmarks';
import { ApiError } from '../../../packages/api-client/index';
const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('../../app/api', () => ({ api: { request } }));
let root: Root, host: HTMLDivElement, state: ReturnType<typeof useKnowledgeBookmarks>;
function Harness({ scope = 'reader', active = true }) { state = useKnowledgeBookmarks(scope, active); return null; }
beforeEach(() => { Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); host = document.createElement('div'); root = createRoot(host); request.mockReset(); });
afterEach(async () => { await act(async () => root.unmount()); });
const saved = (version = 1) => ({ id: 'bookmark', version, target: { type: 'record', id: 'record' } });
it('uncertain create response retries the same id and idempotency key', async () => {
  let attempts = 0;
  request.mockImplementation(async op => { if (op === 'getBookmarks') return { items: [], nextCursor: null }; if (++attempts === 1) throw new Error('response lost'); return { data: saved() }; });
  await act(async () => root.render(<Harness/>));
  await act(async () => state.toggle('record'));
  expect(state.error).toBe('response lost');
  await act(async () => state.toggle('record'));
  const calls = request.mock.calls.filter(call => call[0] === 'postBookmarks');
  expect(calls).toHaveLength(2);
  expect(calls[1]![1].body.id).toBe(calls[0]![1].body.id);
  expect(calls[1]![1].idempotencyKey).toBe(calls[0]![1].body.id);
  expect(state.bookmarks.has('record')).toBe(true);
});
it('delete conflict reloads current version before next explicit attempt', async () => {
  let reads = 0, deletes = 0;
  request.mockImplementation(async op => {
    if (op === 'getBookmarks') return { items: [saved(++reads)], nextCursor: null };
    if (++deletes === 1) throw new ApiError(412, 'VERSION_CONFLICT', 'changed', 'request');
  });
  await act(async () => root.render(<Harness/>));
  await act(async () => state.toggle('record'));
  expect(deletes).toBe(1); expect(reads).toBe(2);
  await act(async () => state.toggle('record'));
  expect(request.mock.calls.filter(call => call[0] === 'deleteBookmarksBookmarkId').map(call => call[1].version)).toEqual([1, 2]);
  expect(state.bookmarks.has('record')).toBe(false);
});
it('identity change aborts old mutation and excludes its late response', async () => {
  let finish!: (value: unknown) => void;
  request.mockImplementation(op => op === 'getBookmarks' ? Promise.resolve({ items: [], nextCursor: null }) : new Promise(resolve => { finish = resolve; }));
  await act(async () => root.render(<Harness/>));
  let pending!: Promise<void>;
  await act(async () => { pending = state.toggle('record'); });
  const signal = request.mock.calls.find(call => call[0] === 'postBookmarks')![1].signal;
  await act(async () => root.render(<Harness scope="other"/>));
  expect(signal.aborted).toBe(true);
  await act(async () => { finish({ data: saved() }); await pending; });
  expect(state.bookmarks.size).toBe(0); expect(state.busy.size).toBe(0);
});
