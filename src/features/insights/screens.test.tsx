import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ScreenKeyContext, ScreenStateContext } from '../../app/useScreenState';
import { screens } from './screens';

const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('../../app/api', () => ({ api: { request } }));

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement('div'); document.body.append(host);
  root = createRoot(host); request.mockReset();
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });

it('choice=unsure の再読込で保存済みの理由を表示する', async () => {
  request.mockImplementation(async (operation: string) => {
    if (operation === 'getInsightsInsightId') return { data: {
      id: 'insight-1', version: 2, rangeStart: 1000, rangeEnd: 2000,
      timeZone: 'Asia/Tokyo', sourceRefs: [], result: { axes: [], unknown: [] },
      summary: '', review: 'unsure', reviewNote: 'まだ判断するには記録が足りません',
    } };
    throw new Error(`Unexpected operation: ${operation}`);
  });
  const Component = screens.find(screen => screen.id === 'trend-review')!.component;
  await act(async () => root.render(
    <ScreenStateContext.Provider value={new Map()}>
      <ScreenKeyContext.Provider value="trend-review-fixture">
        <Component route={{ pageId: 'trend-review', params: { insightId: 'insight-1', choice: 'unsure' } }}
          scopeKey="test:person-1" active navigate={vi.fn()} back={vi.fn()} />
      </ScreenKeyContext.Provider>
    </ScreenStateContext.Provider>,
  ));
  expect((host.querySelector('textarea') as HTMLTextAreaElement).value).toBe('まだ判断するには記録が足りません');
});
