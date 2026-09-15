// Controller checks use a test-only API response store, never the live database.
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MapBridge } from '../../app/map-bridge';
import { MapBridgeContext } from '../../app/useMapBridge';
import { ScreenKeyContext, ScreenStateContext } from '../../app/useScreenState';
import { screens } from './screens';

const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('../../app/api', () => ({ api: { request } }));
let host: HTMLDivElement;
let root: Root;
let bridge: MapBridge;
let stored: Record<string, unknown> | null;
let loseCreateResponse: boolean;
const navigate = vi.fn();

beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement('div'); document.body.append(host);
  root = createRoot(host); bridge = new MapBridge('controller-fixture');
  stored = null; loseCreateResponse = false; request.mockReset(); navigate.mockReset();
  request.mockImplementation(async (operation: string, input: { body?: Record<string, unknown> }) => {
    if (operation === 'getSelfCheckins') return { items: [], nextCursor: null };
    if (operation === 'postSelfCheckins') {
      stored = { ...input.body, personId: 'fixture-self', version: 1, createdAt: Date.now(), updatedAt: Date.now() };
      if (loseCreateResponse) { loseCreateResponse = false; throw new TypeError('保存後に応答が失われました'); }
      return { data: stored };
    }
    if (operation === 'getSelfCheckinsCheckinId' && stored) return { data: stored };
    throw new Error(`Unexpected fixture operation: ${operation}`);
  });
});
afterEach(async () => { await act(async () => root.unmount()); bridge.dispose(); host.remove(); });
async function renderCheckin() {
  const Component = screens.find(screen => screen.id === 'self-checkin')!.component;
  await act(async () => root.render(<MapBridgeContext.Provider value={bridge}><ScreenStateContext.Provider value={new Map()}><ScreenKeyContext.Provider value="self-checkin-fixture"><Component route={{pageId:'self-checkin',params:{timeZone:'Asia/Tokyo'}}} scopeKey="controller-fixture" active navigate={navigate} back={vi.fn()}/></ScreenKeyContext.Provider></ScreenStateContext.Provider></MapBridgeContext.Provider>));
}
function button(text: string) {
  const node = [...host.querySelectorAll('button')].find(item => item.textContent?.trim() === text);
  if (!node) throw new Error(`Missing button: ${text}`);
  return node;
}
describe('回答だけ保存の操作', () => {
  it('120分以上と同行者を保存し、GETを確認してから遷移する。候補や訪問は作らない', async () => {
    await renderCheckin();
    await act(async () => { (host.querySelector('input[value="120+"]') as HTMLInputElement).click(); (host.querySelector('input[value="children"]') as HTMLInputElement).click(); });
    await act(async () => button('回答だけ残す').click());
    expect(request.mock.calls.map(call => call[0])).toEqual(['getSelfCheckins', 'postSelfCheckins', 'getSelfCheckinsCheckinId']);
    const body = request.mock.calls[1][1].body;
    expect(body.answers).toMatchObject({ timeBudget:{kind:'atLeast',minutes:120}, minutes:null, companion:'children' });
    expect(navigate).toHaveBeenCalledWith('self-checkin', expect.objectContaining({checkinId:body.id,saved:'1'}));
    expect(host.textContent).toContain('回答を保存しました');
  });
  it('保存成功後に応答を失っても、再試行は同じIDをGETして確認し、POSTやPATCHを重ねない', async () => {
    await renderCheckin(); loseCreateResponse = true;
    await act(async () => { (host.querySelector('input[value="30"]') as HTMLInputElement).click(); });
    await act(async () => button('回答だけ残す').click());
    expect(host.textContent).toContain('応答が失われました');
    expect((host.querySelector('input[value="30"]') as HTMLInputElement).checked).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
    await act(async () => button('再試行').click());
    expect(request.mock.calls.filter(call => call[0] === 'postSelfCheckins')).toHaveLength(1);
    expect(request.mock.calls.filter(call => call[0] === 'patchSelfCheckinsCheckinId')).toHaveLength(0);
    const id = request.mock.calls.find(call => call[0] === 'postSelfCheckins')![1].body.id;
    expect(request.mock.calls.filter(call => call[0] === 'getSelfCheckinsCheckinId').every(call => call[1].path.checkinId === id)).toBe(true);
    expect(navigate).toHaveBeenCalledWith('self-checkin', expect.objectContaining({checkinId:id}));
  });
});
