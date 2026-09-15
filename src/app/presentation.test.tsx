// @vitest-environment jsdom
import { act, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { App } from './App';
import { takeRecordCapture } from '../features/records/capture-handoff';
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

it('opens the map camera, cancels without navigation, and hands selected photos to the composer', async () => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('requestAnimationFrame', () => 0); vi.stubGlobal('cancelAnimationFrame', () => {});
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  history.replaceState(null, '', '#/map');
  let captureId = '';
  const screens: ScreenDefinition[] = [{ id: 'record-create', title: '記録', component: ({route}) => { captureId = route.params.captureId; return <p>記録入力</p>; } }];
  const host = document.createElement('div'); document.body.append(host); const root = createRoot(host);
  await act(async () => root.render(<App screens={screens} scopeKey="camera-owner"/>));
  const captureButton = () => host.querySelector<HTMLButtonElement>('[aria-label="写真を記録する"]')!;
  await act(async () => captureButton().click());
  expect(host.querySelector('dialog')?.open).toBe(true);
  await act(async () => [...host.querySelectorAll('button')].find(button => button.textContent === 'キャンセル')!.click());
  expect(location.hash).toBe('#/map'); expect(host.querySelector('dialog')).toBeNull();
  await act(async () => captureButton().click());
  const file = new File(['photo'], 'photo.jpg', {type: 'image/jpeg'});
  const input = host.querySelector<HTMLInputElement>('[aria-label="選択した写真"]')!;
  Object.defineProperty(input, 'files', {value: [file]});
  await act(async () => input.dispatchEvent(new Event('change', {bubbles: true})));
  expect(location.hash).toContain('#/record-create?captureId=');
  expect(takeRecordCapture(captureId, 'camera-owner')?.[0]).toBe(file);
  expect(host.querySelector('dialog')).toBeNull();
  await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals();
});
