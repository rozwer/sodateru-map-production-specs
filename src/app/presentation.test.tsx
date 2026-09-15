// @vitest-environment jsdom
import { act, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { App } from './App';
import type { ScreenDefinition } from './contracts';
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
it('retains the map instance while a full page opens and restores panel navigation', async () => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('requestAnimationFrame', () => 0); vi.stubGlobal('cancelAnimationFrame', () => {});
  history.replaceState(null, '', '#/full');
  let mounts = 0;
  function Map() { useEffect(() => { mounts++; }, []); return <div data-map-instance/>; }
  const screens: ScreenDefinition[] = [{ id: 'full', title: 'Full page', layout: { presentation: 'fullscreen' }, component: ({navigate}) => <button onClick={() => navigate('navigation', {mode: 'self'})}>menu</button> }];
  const container = document.createElement('div'); document.body.append(container); const root = createRoot(container);
  await act(async () => root.render(<App screens={screens} MapRenderer={Map}/>));
  const map = container.querySelector('[data-map-instance]');
  expect(container.querySelector<HTMLElement>('.sm-map-host')!.hidden).toBe(true);
  expect(container.querySelector('.sm-sheet--fullscreen')).not.toBeNull();
  await act(async () => [...container.querySelectorAll('button')].find(button => button.textContent === 'menu')!.click());
  expect(container.querySelector<HTMLElement>('.sm-map-host')!.hidden).toBe(false);
  expect(container.querySelector('.sm-sheet--navigation.sm-sheet--panel')).not.toBeNull();
  expect(container.querySelector('[data-map-instance]')).toBe(map); expect(mounts).toBe(1);
  await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals();
});
