// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { MapBridge } from '../../app/map-bridge';
import { MapBridgeContext } from '../../app/useMapBridge';
import { screens } from './screens';
import { ApiError } from '../../../packages/api-client/index';
import { emptyFilters } from './types';
const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('../../app/api', () => ({ api: { request } }));
vi.mock('../../map/MapPreview', () => ({ MapPreview: () => <div>map mock</div> }));
let root: Root, host: HTMLDivElement, bridge: MapBridge;
const navigate = vi.fn();
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  bridge = new MapBridge('test'); navigate.mockReset(); request.mockReset();
  request.mockImplementation(async operation => operation === 'getSharedRecordsMap' ? { data: { items: [], totalCount: 0 } } : { items: [], totalCount: 0, nextCursor: null });
});
afterEach(async () => { await act(async () => root.unmount()); bridge.dispose(); host.remove(); });
async function render(pageId: string, params: Record<string, string> = {}, active = true) {
  const Component = screens.find(screen => screen.id === pageId)!.component;
  await act(async () => root.render(<MapBridgeContext.Provider value={bridge}><Component key={pageId + JSON.stringify(params)} route={{ pageId, params }} scopeKey="person:live" active={active} navigate={navigate} back={vi.fn()}/></MapBridgeContext.Provider>));
}
async function click(selector: string) { await act(async () => host.querySelector<HTMLElement>(selector)!.click()); }
async function search(text: string) {
  const input = host.querySelector<HTMLInputElement>('input[type=search]')!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, text);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await act(async () => host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
}
it('search → map → list preserves submitted query, period, audience, place and result query', async () => {
  await render('knowledge-list', { placeId: 'place-a', filters: JSON.stringify({ ...emptyFilters, period: 'week', audience: 'public' }) });
  await search('港');
  const listQuery = request.mock.calls.at(-1)![1].query;
  expect(listQuery).toMatchObject({ q: '港', audience: 'public', placeId: 'place-a', includeUndated: false });
  await click('[data-testid="knowledge-list--map"]');
  const mapParams = navigate.mock.calls.at(-1)![1];
  await render('local-knowledge', mapParams);
  expect(request.mock.calls.findLast(call => call[0] === 'getSharedRecords')![1].query).toEqual(listQuery);
  const { limit: _limit, cursor: _cursor, ...mapQuery } = listQuery;
  expect(request.mock.calls.findLast(call => call[0] === 'getSharedRecordsMap')![1].query).toEqual(mapQuery);
  await click('.knowledge-voices-button');
  await render('knowledge-list', navigate.mock.calls.at(-1)![1]);
  expect(host.querySelector<HTMLInputElement>('input[type=search]')!.value).toBe('港');
  expect(request.mock.calls.at(-1)![1].query).toEqual(listQuery);
});
it('filter apply retains query, kind and place while changing period and audience', async () => {
  await render('knowledge-list', { query: '公園', placeId: 'park' });
  await click('[data-testid="knowledge-list--filter"]');
  await render('knowledge-filter', navigate.mock.calls.at(-1)![1]);
  await click('[data-testid="knowledge-filter--period"] label:nth-of-type(2) input');
  await click('[data-testid="knowledge-filter--audience"] label:nth-of-type(3) input');
  await click('[data-testid="knowledge-filter--apply"]');
  const params = navigate.mock.calls.at(-1)![1];
  expect(params).toMatchObject({ query: '公園', kind: 'experience', placeId: 'park' });
  await render('knowledge-list', params);
  expect(request.mock.calls.at(-1)![1].query).toMatchObject({ q: '公園', audience: 'public', includeUndated: false });
  expect(request.mock.calls.at(-1)![1].query.from).toBeTypeOf('number');
});
it('changing search after pagination never sends the previous cursor with new conditions', async () => {
  request.mockImplementation(async (_operation, input) => ({ items: [], totalCount: 101, nextCursor: input.query.cursor ? null : 'old-page-2' }));
  await render('knowledge-list');
  expect(request.mock.calls.at(-1)![1].query.includeUndated).toBe(true);
  await click('.knowledge-secondary');
  expect(request.mock.calls.at(-1)![1].query.cursor).toBe('old-page-2');
  request.mockClear();
  await search('新条件');
  expect(request.mock.calls).toHaveLength(1);
  expect(request.mock.calls[0]![1].query).toMatchObject({ q: '新条件', cursor: undefined });
});

it('returning A → B → A starts from page one instead of reviving an old A cursor', async () => {
  request.mockImplementation(async (_operation, input) => ({ items: [], totalCount: 101, nextCursor: input.query.cursor ? null : 'page-2' }));
  await render('knowledge-list');
  await search('A');
  await click('.knowledge-secondary');
  expect(request.mock.calls.at(-1)![1].query.cursor).toBe('page-2');
  await search('B');
  request.mockClear();
  await search('A');
  expect(request.mock.calls).toHaveLength(1);
  expect(request.mock.calls[0]![1].query).toMatchObject({ q: 'A', cursor: undefined });
});

it('map uses all located results beyond the first list page and reports missing places', async () => {
  const items = Array.from({ length: 150 }, (_, index) => ({ recordId: `record-${index}`, personId: 'person', placeId: `place-${index}`, coordinates: [139, 35], mediaId: null }));
  request.mockImplementation(async operation => operation === 'getSharedRecordsMap' ? { data: { items, totalCount: 155 } } : { items: [], totalCount: 155, nextCursor: 'page2' });
  await render('local-knowledge', { query: '港' });
  expect(bridge.getSnapshot().places.knowledge!.places).toHaveLength(150);
  expect(host.textContent).toContain('地図に表示できる投稿 150件・場所不明 5件');
  const query = request.mock.calls.find(call => call[0] === 'getSharedRecordsMap')![1].query;
  expect(query).not.toHaveProperty('cursor'); expect(query).not.toHaveProperty('limit');
  await act(async () => bridge.select({ ownerKey: 'knowledge', kind: 'place', id: 'record-149' }));
  expect(navigate).toHaveBeenCalledWith('knowledge-detail', { recordId: 'record-149' });
  await render('local-knowledge', { query: '港' }, false);
  expect(bridge.getSnapshot().places.knowledge).toBeUndefined();
});
it('map 413 is an actionable failure and never an empty result', async () => {
  request.mockImplementation(async operation => {
    if (operation === 'getSharedRecordsMap') throw new ApiError(413, 'INPUT_TOO_LARGE', 'too large', 'request');
    return { items: [], totalCount: 2100, nextCursor: 'page2' };
  });
  await render('local-knowledge');
  expect(host.textContent).toContain('地域や期間を絞ってください');
  expect(host.textContent).not.toContain('条件に合う投稿はありません');
  expect(host.textContent).not.toContain('場所不明');
  expect(bridge.getSnapshot().places.knowledge).toBeUndefined();
});
it('late map results cannot repopulate a hidden screen', async () => {
  let finish!: (value: unknown) => void;
  request.mockImplementation(operation => operation === 'getSharedRecordsMap' ? new Promise(resolve => { finish = resolve; }) : Promise.resolve({ items: [], totalCount: 0, nextCursor: null }));
  await render('local-knowledge');
  const signal = request.mock.calls.find(call => call[0] === 'getSharedRecordsMap')![1].signal;
  await render('local-knowledge', {}, false);
  expect(signal.aborted).toBe(true);
  await act(async () => finish({ data: { items: [{ recordId: 'late', placeId: 'place', coordinates: [139, 35] }], totalCount: 1 } }));
  expect(bridge.getSnapshot().places.knowledge).toBeUndefined();
});
it('detail reads a single record and clears its body after revocation on re-entry', async () => {
  const record = { id: 'record', person: { id: 'author', displayName: '作者', iconPath: null }, body: '公開本文', place: null, effectiveAt: null, visibility: 'public', media: [], purposes: [] };
  request.mockResolvedValue({ data: record });
  await render('knowledge-detail', { recordId: 'record' });
  expect(request.mock.calls).toHaveLength(1);
  expect(request.mock.calls[0]![0]).toBe('getSharedRecordsRecordId');
  expect(host.textContent).toContain('公開本文');
  await render('knowledge-detail', { recordId: 'record' }, false);
  expect(host.textContent).not.toContain('公開本文');
  request.mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'not found', 'request'));
  await render('knowledge-detail', { recordId: 'record' });
  expect(host.textContent).toContain('この投稿は現在閲覧できません');
  expect(host.textContent).not.toContain('公開本文');
});

it('list re-entry invalidates pages and re-reads first page after public records change', async () => {
  const revoked = { id: 'revoked', person: { id: 'author', displayName: '作者', iconPath: null }, body: '取消対象の本文', place: null, effectiveAt: null, visibility: 'public', media: [], purposes: [] };
  request.mockResolvedValue({ items: [revoked], totalCount: 101, nextCursor: 'page-2' });
  await render('knowledge-list');
  await click('.knowledge-secondary');
  await render('knowledge-list', {}, false);
  request.mockClear(); request.mockResolvedValue({ items: [], totalCount: 0, nextCursor: null });
  await render('knowledge-list');
  expect(request.mock.calls).toHaveLength(1);
  expect(request.mock.calls[0]![1].query.cursor).toBeUndefined();
  expect(host.textContent).not.toContain('取消対象の本文');
});
