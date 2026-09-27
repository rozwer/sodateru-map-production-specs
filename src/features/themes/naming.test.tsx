import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ApiError, type Theme } from '../../../packages/api-client/index';
import { ThemeNaming } from './ThemeNaming';
const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('../../app/api', () => ({ api: { request } }));
const theme: Theme = { id: 'theme', personId: 'person', version: 2, name: '本人の名前', description: '', recordIds: ['record'], colorKey: 'blue', coverMediaId: null, createdAt: 1, updatedAt: 2 };
const run = { id: 'run', task: 'theme', status: 'complete', attempt: 1, version: 4, result: { name: '候補名', description: '候補説明', evidenceIds: ['record'] } };
let host: HTMLDivElement, root: Root;
const onAdopted = vi.fn(), onBusy = vi.fn();
const button = (text: string) => [...host.querySelectorAll('button')].find(x => x.textContent === text)!;
beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement('div'); document.body.append(host); root = createRoot(host); request.mockReset(); onAdopted.mockReset();
  request.mockImplementation(async (operation: string) => {
    if (operation === 'getMeSettings') return { data: { ai: { enabled: true, allowRecords: true } } };
    if (operation === 'getRecordsRecordId') return { data: { record: { id: 'record', version: 3 } } };
    if (operation === 'getMessagesMessageId') return { data: { run } };
    if (operation === 'getThemesThemeId' || operation === 'postThemesThemeIdAdoptName') return { data: { ...theme, name: '候補名', description: '候補説明', version: 3 } };
    return { data: {} };
  });
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });
const view = (dirty = false) => <ThemeNaming theme={theme} dirty={dirty} disabled={false} active onAdopted={onAdopted} onBusy={onBusy} onSettings={vi.fn()}/>;
it('候補では保存せず、未保存の本人編集を保護し、明示採用だけ正式operationを呼ぶ', async () => {
  await act(async () => root.render(view()));
  await act(async () => button('名前の候補を作る').click());
  expect(host.textContent).toContain('候補を編集');
  expect(request.mock.calls.some(([op]) => op === 'postThemesThemeIdAdoptName')).toBe(false);
  expect(onAdopted).not.toHaveBeenCalled();
  await act(async () => root.render(view(true)));
  expect(button('この名前と説明を採用して保存').disabled).toBe(true);
  await act(async () => root.render(view()));
  await act(async () => button('この名前と説明を採用して保存').click());
  expect(request).toHaveBeenCalledWith('postThemesThemeIdAdoptName', expect.objectContaining({ path: { themeId: 'theme' }, version: 2, body: { runId: 'run', expectedAttempt: 1, expectedRunVersion: 4, name: '候補名', description: '候補説明' } }));
  expect(onAdopted).toHaveBeenCalledWith(expect.objectContaining({ name: '候補名', version: 3 }));
});
it('412後は候補を保持し、版を勝手に進めて再採用しない', async () => {
  await act(async () => root.render(view()));
  await act(async () => button('名前の候補を作る').click());
  request.mockImplementation(async () => { throw new ApiError(412, 'VERSION_CONFLICT', '変更されています', 'request'); });
  await act(async () => button('この名前と説明を採用して保存').click());
  expect(host.textContent).toContain('テーマや根拠が変わりました');
  expect((host.querySelector('input') as HTMLInputElement).value).toBe('候補名');
  expect(button('この名前と説明を採用して保存').disabled).toBe(true);
  expect(onAdopted).not.toHaveBeenCalled();
});
