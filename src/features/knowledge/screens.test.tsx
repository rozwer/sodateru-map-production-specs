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
vi.mock('../../app/api', () => ({ api: { request: (operation: string, ...args: unknown[]) => operation === 'getBookmarks' ? Promise.resolve({ items: [], nextCursor: null }) : request(operation, ...args) } }));
vi.mock('../../map/MapPreview', () => ({ MapPreview: () => <div>map mock</div> }));
let root: Root, host: HTMLDivElement, bridge: MapBridge;
const navigate = vi.fn();
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  bridge = new MapBridge('test'); navigate.mockReset(); request.mockReset();
  request.mockImplementation(async operation => operation === 'getKnowledgeMap' ? { data: { items: [], totalCount: 0 } } : { items: [], totalCount: 0, nextCursor: null });
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
  expect(request.mock.calls.findLast(call => call[0] === 'getKnowledge')![1].query).toEqual(listQuery);
  const { limit: _limit, cursor: _cursor, ...mapQuery } = listQuery;
  expect(request.mock.calls.findLast(call => call[0] === 'getKnowledgeMap')![1].query).toEqual(mapQuery);
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
  request.mockImplementation(async operation => operation === 'getKnowledgeMap' ? { data: { items, totalCount: 155 } } : { items: [], totalCount: 155, nextCursor: 'page2' });
  await render('local-knowledge', { query: '港' });
  expect(bridge.getSnapshot().places.knowledge!.places).toHaveLength(150);
  expect(host.textContent).toContain('地図に表示できる投稿 150件・場所不明 5件');
  const query = request.mock.calls.find(call => call[0] === 'getKnowledgeMap')![1].query;
  expect(query).not.toHaveProperty('cursor'); expect(query).not.toHaveProperty('limit');
  await act(async () => bridge.select({ ownerKey: 'knowledge', kind: 'place', id: 'record-149' }));
  expect(navigate).toHaveBeenCalledWith('knowledge-detail', { recordId: 'record-149' });
  await render('local-knowledge', { query: '港' }, false);
  expect(bridge.getSnapshot().places.knowledge).toBeUndefined();
});
it('map 413 is an actionable failure and never an empty result', async () => {
  request.mockImplementation(async operation => {
    if (operation === 'getKnowledgeMap') throw new ApiError(413, 'INPUT_TOO_LARGE', 'too large', 'request');
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
  request.mockImplementation(operation => operation === 'getKnowledgeMap' ? new Promise(resolve => { finish = resolve; }) : Promise.resolve({ items: [], totalCount: 0, nextCursor: null }));
  await render('local-knowledge');
  const signal = request.mock.calls.find(call => call[0] === 'getKnowledgeMap')![1].signal;
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

it('rest-tip selection uses tips for list and map, then returns to experiences', async () => {
  const tip = { id: 'tip', person: { id: 'author', displayName: '作者', iconPath: null }, body: '日陰のベンチで休憩', place: null, effectiveAt: null, visibility: 'public', media: [], purposes: ['休憩'] };
  const experience = { ...tip, id: 'experience', body: '公園を歩いた体験', purposes: ['散歩'] };
  request.mockImplementation(async (operation, input) => operation === 'getKnowledgeTopics' ? { items: [{ topicKey: 'rest', purposes: ['休憩'] }] } : operation === 'getKnowledgeMap' ? { data: { items: [], totalCount: 1 } } : { items: [input.query.category === 'tips' ? tip : experience], totalCount: 1, nextCursor: null });
  await render('knowledge-list', { query: '公園' });
  await click('[data-testid="knowledge-list--kind"] label:nth-of-type(1) input');
  expect(request.mock.calls.at(-1)![0]).toBe('getKnowledge');
  expect(request.mock.calls.at(-1)![1].query).toMatchObject({ category: 'tips', q: '公園' });
  expect(host.textContent).toContain('日陰のベンチで休憩');
  expect(host.textContent).not.toContain('公園を歩いた体験');
  await click('[data-testid="knowledge-list--map"]');
  const params = navigate.mock.calls.at(-1)![1];
  await render('local-knowledge', params);
  expect(request.mock.calls.findLast(call => call[0] === 'getKnowledgeMap')![1].query).toMatchObject({ category: 'tips', q: '公園' });
  await render('knowledge-list', params);
  await click('[data-testid="knowledge-list--kind"] label:nth-of-type(2) input');
  expect(request.mock.calls.at(-1)![1].query.category).toBe('experiences');
  expect(host.textContent).toContain('公園を歩いた体験');
  expect(host.textContent).not.toContain('日陰のベンチで休憩');
});

it('purpose dictionary and bbox stay identical across list and map', async () => {
  request.mockImplementation(async operation => operation === 'getKnowledgeTopics' ? { items: [{ topicKey: 'rest', purposes: ['休憩', 'ひと休み'] }] } : operation === 'getKnowledgeMap' ? { data: { items: [], totalCount: 0 } } : { items: [], totalCount: 0, nextCursor: null });
  const filters = { ...emptyFilters, purpose: 'rest', bounds: [139, 35, 140, 36] };
  await render('knowledge-list', { filters: JSON.stringify(filters) });
  const query = request.mock.calls.findLast(call => call[0] === 'getKnowledge')![1].query;
  expect(query).toMatchObject({ purposes: ['休憩', 'ひと休み'], bbox: '139,35,140,36' });
  await click('[data-testid="knowledge-list--map"]');
  await render('local-knowledge', navigate.mock.calls.at(-1)![1]);
  const { limit: _limit, cursor: _cursor, ...mapQuery } = query;
  expect(request.mock.calls.findLast(call => call[0] === 'getKnowledgeMap')![1].query).toEqual(mapQuery);
});
it('area selection applies coordinates while cancel leaves route conditions untouched', async () => {
  request.mockResolvedValue({ data: { items: [{ candidateId: 'area', placeId: null, name: '港公園', position: { longitude: 139.64, latitude: 35.45 } }] } });
  await render('knowledge-filter');
  await search('港');
  expect(navigate).not.toHaveBeenCalled();
  await click('.knowledge-area-results button');
  await click('[data-testid="knowledge-filter--apply"]');
  expect(JSON.parse(navigate.mock.calls.at(-1)![1].filters)).toMatchObject({ areaText: '港公園', center: [139.64, 35.45], radiusM: 1000, bounds: null });
  navigate.mockClear();
  await click('[data-testid="knowledge-filter--purpose"] label:nth-of-type(1) input');
  await act(async () => host.querySelector('section')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  expect(navigate).not.toHaveBeenCalled();
});

it('author conditions reach both list and map and author link opens that shared map', async () => {
  await render('knowledge-list', { personId: 'author' });
  expect(request.mock.calls.findLast(call => call[0] === 'getKnowledge')![1].query.personIds).toEqual(['author']);
  await click('[data-testid="knowledge-list--map"]');
  await render('local-knowledge', navigate.mock.calls.at(-1)![1]);
  expect(request.mock.calls.findLast(call => call[0] === 'getKnowledgeMap')![1].query.personIds).toEqual(['author']);
  request.mockResolvedValue({ data: { id: 'r', person: { id: 'author', displayName: '作者', iconPath: null }, body: '投稿原文', place: null, effectiveAt: null, visibility: 'public', media: [], purposes: [] } });
  await render('knowledge-detail', { recordId: 'r' });
  await click('.knowledge-related button:nth-child(2)');
  expect(navigate).toHaveBeenLastCalledWith('friends-map', { personId: 'author' });
  await click('.knowledge-related button:nth-child(3)');
  expect(host.textContent).toContain('作者さんが投稿した原文');
});
it('selected place details clear on a failed change while a closed sheet keeps the map', async () => {
  request.mockImplementation(async (operation, input) => {
    if (operation === 'getPlacesPlaceId') {
      if (input.path.placeId === 'missing') throw new ApiError(404, 'NOT_FOUND', '場所はありません', 'request');
      return { data: { place: { id: 'park', name: '選択した公園', coordinates: [139, 35], address: '住所', attribution: '手動登録', fetchedAt: null }, openingHours: null } };
    }
    if (operation === 'getKnowledgeMap') return { data: { items: [], totalCount: 0 } };
    return { items: [], totalCount: 0, nextCursor: null };
  });
  await render('local-knowledge', { placeId: 'park' });
  expect(host.textContent).toContain('選択した公園');
  expect(host.textContent).toContain('場所の現在情報');
  await click('[aria-label="場所シートを閉じる"]');
  expect(navigate).not.toHaveBeenCalled();
  expect(host.textContent).toContain('地域の声を開く');
  await render('local-knowledge', { placeId: 'missing' });
  expect(host.textContent).not.toContain('選択した公園');
  expect(host.textContent).toContain('場所はありません');
});
it('rest tips at a selected place use voices with the same dictionary and place', async () => {
  request.mockImplementation(async operation => operation === 'getKnowledgeTopics' ? { items: [{ topicKey: 'rest', purposes: ['休憩'] }] } : { items: [], totalCount: 0, nextCursor: null });
  await render('knowledge-list', { placeId: 'park', kind: 'rest-tip' });
  const input = request.mock.calls.find(call => call[0] === 'getPlacesPlaceIdVoices')![1];
  expect(input.path).toEqual({ placeId: 'park' });
  expect(input.query).toMatchObject({ topicKey: 'rest', purposes: ['休憩'] });
  expect(input.query).not.toHaveProperty('category');
});
it('people name search uses its contract without pretending region filtering exists', async () => {
  request.mockResolvedValue({ items: [{ id: 'author', name: '作者', bio: '散歩好き', avatarUrl: null }], nextCursor: null });
  await render('knowledge-list', { kind: 'people', query: '作者' });
  expect(request.mock.calls.at(-1)![0]).toBe('getPeople');
  expect(host.textContent).toContain('散歩好き');
  await render('knowledge-list', { kind: 'people', query: '作者', filters: JSON.stringify({ ...emptyFilters, purpose: 'rest' }) });
  expect(host.textContent).toContain('人物検索は未提供');
  expect(host.textContent).not.toContain('散歩好き');
});
