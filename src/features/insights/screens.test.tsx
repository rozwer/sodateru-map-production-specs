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

it('未編集で戻ったレビューは最新の保存内容に更新する', async () => {
  let review = { choice: 'agree', note: '最初の理由', version: 1 };
  request.mockImplementation(async (operation: string) => {
    if (operation === 'getInsightsInsightId') return { data: {
      id: 'insight-1', version: review.version, rangeStart: 1000, rangeEnd: 2000,
      timeZone: 'Asia/Tokyo', sourceRefs: [], result: { axes: [], unknown: [] },
      summary: '', review: review.choice, reviewNote: review.note,
    } };
    throw new Error(`Unexpected operation: ${operation}`);
  });
  const Component = screens.find(screen => screen.id === 'trend-review')!.component;
  const route = { pageId: 'trend-review', params: { insightId: 'insight-1' } };
  const state = new Map<string, unknown>();
  const render = async (active: boolean) => act(async () => root.render(
    <ScreenStateContext.Provider value={state}>
      <ScreenKeyContext.Provider value="trend-review-fixture">
        <Component route={route} scopeKey="test:person-1" active={active} navigate={vi.fn()} back={vi.fn()} />
      </ScreenKeyContext.Provider>
    </ScreenStateContext.Provider>,
  ));
  await render(true);
  expect((host.querySelector('textarea') as HTMLTextAreaElement).value).toBe('最初の理由');
  review = { choice: 'disagree', note: '更新後の理由', version: 2 };
  await render(false);
  await render(true);
  expect((host.querySelector('textarea') as HTMLTextAreaElement).value).toBe('更新後の理由');
  expect((state.get('trend-review-fixture') as { draft: { choice: string } }).draft.choice).toBe('disagree');
  const textarea = host.querySelector('textarea') as HTMLTextAreaElement;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(textarea, '入力中の理由');
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  });
  expect((state.get('trend-review-fixture') as { dirty: boolean }).dirty).toBe(true);
  review = { choice: 'agree', note: 'さらに更新された理由', version: 3 };
  await render(false);
  await render(true);
  expect((host.querySelector('textarea') as HTMLTextAreaElement).value).toBe('入力中の理由');
});

it('理由の保存後に戻ると再取得した判断へ更新する', async () => {
  let review = { choice: 'agree', note: '最初の理由', version: 1 };
  request.mockImplementation(async (operation: string, input: { body?: { review: string; reviewNote: string } }) => {
    if (operation === 'getInsightsInsightId' || operation === 'patchInsightsInsightId') {
      if (operation === 'patchInsightsInsightId') review = { choice: input.body!.review, note: input.body!.reviewNote, version: review.version + 1 };
      return { data: {
        id: 'insight-1', version: review.version, rangeStart: 1000, rangeEnd: 2000,
        timeZone: 'Asia/Tokyo', sourceRefs: [], result: { axes: [], unknown: [] },
        summary: '', review: review.choice, reviewNote: review.note,
      } };
    }
    throw new Error(`Unexpected operation: ${operation}`);
  });
  const Component = screens.find(screen => screen.id === 'trend-review')!.component;
  const route = { pageId: 'trend-review', params: { insightId: 'insight-1' } };
  const state = new Map<string, unknown>();
  const render = async (active: boolean) => act(async () => root.render(
    <ScreenStateContext.Provider value={state}>
      <ScreenKeyContext.Provider value="trend-review-fixture">
        <Component route={route} scopeKey="test:person-1" active={active} navigate={vi.fn()} back={vi.fn()} />
      </ScreenKeyContext.Provider>
    </ScreenStateContext.Provider>,
  ));
  await render(true);
  const textarea = host.querySelector('textarea') as HTMLTextAreaElement;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(textarea, '本人が変更した理由');
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await act(async () => (host.querySelector('button[type=submit]') as HTMLButtonElement).click());
  expect(review.note).toBe('本人が変更した理由');
  expect((state.get('trend-review-fixture') as { dirty: boolean }).dirty).toBe(false);
  review = { choice: 'disagree', note: '別経路で更新された理由', version: review.version + 1 };
  await render(false);
  await render(true);
  expect((host.querySelector('textarea') as HTMLTextAreaElement).value).toBe('別経路で更新された理由');
});
