// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { MapBridge } from '../../app/map-bridge';
import { MapBridgeContext } from '../../app/useMapBridge';
import { screens } from './screens';
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
  request.mockResolvedValue({ items: [], totalCount: 0, nextCursor: null });
});
afterEach(async () => { await act(async () => root.unmount()); bridge.dispose(); host.remove(); });
async function render(pageId: string, params: Record<string, string> = {}) {
  const Component = screens.find(screen => screen.id === pageId)!.component;
  await act(async () => root.render(<MapBridgeContext.Provider value={bridge}><Component key={pageId + JSON.stringify(params)} route={{ pageId, params }} scopeKey="person:live" active navigate={navigate} back={vi.fn()}/></MapBridgeContext.Provider>));
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
  expect(request.mock.calls.at(-1)![1].query).toEqual(listQuery);
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
