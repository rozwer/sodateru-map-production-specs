// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { NavigationCards } from '../../../src/app/NavigationCards';
import { ScreenKeyContext, ScreenStateContext } from '../../../src/app/useScreenState';
vi.mock('../../../src/app/navigation-card-data', () => ({
  readNavigationPhotos: vi.fn(async () => []), navigationExamples: [{ title: '見本カフェ', detail: 'サンプル', photoUrl: '/example.jpg' }],
}));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
it('keeps all destinations, keyboard selection and position across remounts, and excludes demo samples in live mode', async () => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  const host = document.createElement('div'); document.body.append(host);
  const saved = new Map<string, unknown>(); const navigate = vi.fn(); let root = createRoot(host);
  const render = (mode: 'self' | 'community', dataMode: 'live' | 'demo') => <ScreenStateContext.Provider value={saved}><ScreenKeyContext.Provider value={`cards:${mode}`}><NavigationCards mode={mode} dataMode={dataMode} navigate={navigate}/></ScreenKeyContext.Provider></ScreenStateContext.Provider>;
  await act(async () => root.render(render('self', 'live')));
  expect([...host.querySelectorAll('.sm-nav-card')].map(node => node.getAttribute('aria-label'))).toEqual(['今日の軌跡を開く','タイプ診断を開く','わたしの地図を開く']);
  expect(host.textContent).not.toContain('見本カフェ');
  expect(host.textContent).toContain('今日の記録はまだありません');
  await act(async () => host.querySelector('.sm-nav-cards__rail')!.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight', bubbles:true})));
  expect(host.querySelector('[aria-current=true]')?.getAttribute('aria-label')).toBe('2枚目：タイプ診断');
  await act(async () => host.querySelector<HTMLButtonElement>('#nav-card-type-diagnosis')!.click());
  expect(navigate).toHaveBeenCalledWith('type-diagnosis');
  await act(async () => root.unmount()); root = createRoot(host);
  await act(async () => root.render(render('self', 'demo')));
  expect(host.querySelector('[aria-current=true]')?.getAttribute('aria-label')).toBe('2枚目：タイプ診断');
  expect(host.textContent).toContain('表示例・サンプル');
  await act(async () => root.unmount()); root = createRoot(host);
  await act(async () => root.render(render('community', 'live')));
  expect([...host.querySelectorAll('.sm-nav-card')].map(node => node.getAttribute('aria-label'))).toEqual(['地域の知を開く','友達の地図を開く']);
  expect(host.querySelector('[aria-current=true]')?.getAttribute('aria-label')).toBe('1枚目：地域の知');
  for (const button of host.querySelectorAll<HTMLButtonElement>('.sm-nav-card')) await act(async () => button.click());
  expect(navigate.mock.calls.slice(-2)).toEqual([['local-knowledge'],['friends-map']]);
  await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals();
});
