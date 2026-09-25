import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { Theme } from '../../../packages/api-client/index';
import { ScreenKeyContext, ScreenStateContext } from '../../app/useScreenState';
import { screens } from './screens';

const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('../../app/api', () => ({ api: { request } }));

const theme = (name: string, version: number): Theme => ({
  id: 'theme-1', personId: 'person-1', version, createdAt: 1, updatedAt: version,
  name, description: '説明', recordIds: [], colorKey: 'teal', coverMediaId: null,
});

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement('div'); document.body.append(host);
  root = createRoot(host); request.mockReset();
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });

it('編集を離れて同じテーマへ戻ると、未編集フォームを最新の保存内容に更新する', async () => {
  let latest = theme('最初の名前', 1);
  request.mockImplementation(async (operation: string) => {
    if (operation === 'getThemesThemeId') return { data: latest };
    if (operation === 'getRecords') return { items: [], nextCursor: null };
    throw new Error(`Unexpected operation: ${operation}`);
  });
  const state = new Map<string, unknown>();
  const Component = screens.find(screen => screen.id === 'theme-edit')!.component;
  const view = (active: boolean) => <ScreenStateContext.Provider value={state}>
    <ScreenKeyContext.Provider value="theme-edit?themeId=theme-1">
      <Component route={{ pageId: 'theme-edit', params: { themeId: 'theme-1' } }}
        scopeKey="test:person-1" active={active} navigate={vi.fn()} back={vi.fn()} />
    </ScreenKeyContext.Provider>
  </ScreenStateContext.Provider>;

  await act(async () => root.render(view(true)));
  expect((host.querySelector('input[required]') as HTMLInputElement).value).toBe('最初の名前');

  await act(async () => root.render(view(false)));
  latest = theme('別画面で更新した名前', 2);
  await act(async () => root.render(view(true)));
  expect((host.querySelector('input[required]') as HTMLInputElement).value).toBe('別画面で更新した名前');
});
