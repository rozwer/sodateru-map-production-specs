import { StrictMode, act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { CreateRecordScreen } from './CreateRecordScreen';
import { stageRecordCapture, takeRecordCapture } from './capture-handoff';
import { MapBridge } from '../../app/map-bridge';
import { MapBridgeContext } from '../../app/useMapBridge';
import { ScreenKeyContext, ScreenStateContext } from '../../app/useScreenState';
import type { RecordDraft } from './form-types';

vi.mock('../../app/api', () => ({ api: { request: vi.fn() } }));

it('keeps the original camera file once through StrictMode, confirmation, editor and remount', async () => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const previousCreateUrl = URL.createObjectURL;
  const createUrl = vi.fn().mockReturnValue('blob:camera-file');
  URL.createObjectURL = createUrl;
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host), bridge = new MapBridge('capture-test'), saved = new Map<string, unknown>();
  const file = new File(['camera-photo'], 'camera.jpg', { type: 'image/jpeg' });
  const captureId = stageRecordCapture([file], 'capture-test')!;
  const render = () => <StrictMode><MapBridgeContext.Provider value={bridge}><ScreenStateContext.Provider value={saved}><ScreenKeyContext.Provider value="capture"><CreateRecordScreen route={{pageId:'record-create',params:{captureId}}} scopeKey="capture-test" navigate={vi.fn()} back={vi.fn()}/></ScreenKeyContext.Provider></ScreenStateContext.Provider></MapBridgeContext.Provider></StrictMode>;
  const draft = () => (saved.get('capture') as {draft:RecordDraft}).draft;
  try {
    await act(async () => root.render(render()));
    expect(draft().media).toHaveLength(1); expect(draft().media[0]?.file).toBe(file);
    expect(createUrl).toHaveBeenCalledTimes(1);
    const click = async (text:string) => {
      const button = [...host.querySelectorAll('button')].find(button => button.textContent?.trim() === text)!;
      expect(button).toBeTruthy(); await act(async () => button.click());
    };
    await click('確認へ'); expect(host.textContent).toContain('記録の確認');
    await click('戻って編集'); expect(draft().media[0]?.file).toBe(file);
    await act(async () => root.render(null));
    await act(async () => root.render(render()));
    expect(draft().media).toHaveLength(1); expect(host.textContent).not.toContain('引き継げません');
  } finally {
    await act(async () => root.unmount()); bridge.dispose(); host.remove(); URL.createObjectURL = previousCreateUrl;
  }
});

it('leaves empty/cancelled input alone and prevents a different person from consuming a capture', () => {
  expect(stageRecordCapture([], 'a')).toBeNull();
  const file = new File(['photo'], 'photo.jpg', { type:'image/jpeg' });
  const id = stageRecordCapture([file], 'a')!;
  expect(takeRecordCapture(id, 'b')).toBeNull();
  expect(takeRecordCapture(id, 'a')).toEqual([file]);
  expect(takeRecordCapture(id, 'a')).toBeNull();
});
