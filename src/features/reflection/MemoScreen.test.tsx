import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ScreenKeyContext, ScreenStateContext } from '../../app/useScreenState';
import { MemoScreen } from './MemoScreen';

const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('../../app/api', () => ({ api: { request } }));
let host: HTMLDivElement;
let root: Root;
const navigate = vi.fn();

beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement('div'); document.body.append(host);
  root = createRoot(host); request.mockReset(); navigate.mockReset();
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });

it('新規メモの保存後、再読込できる recordId 付き経路へ移る', async () => {
  let saved: Record<string, unknown> | null = null;
  request.mockImplementation(async (operation: string, input: { body?: Record<string, unknown> }) => {
    if (operation === 'getRecords' || operation === 'getSuggestions') return { items: [], nextCursor: null };
    if (operation === 'postRecords') {
      saved = { ...input.body, version: 1 };
      return { data: saved };
    }
    if (operation === 'getRecordsRecordId') return { data: { record: saved } };
    throw new Error(`Unexpected operation: ${operation}`);
  });
  const state = new Map<string, unknown>([['memo-fixture', {
    id: 'memo-1', form: { name: '散歩のメモ', body: 'また訪れたい', origins: [], keywords: [], useForSuggestions: true },
    edited: true, keyword: '', options: [], loaded: false, createKey: 'create-1',
  }]]);
  await act(async () => root.render(
    <ScreenStateContext.Provider value={state}>
      <ScreenKeyContext.Provider value="memo-fixture">
        <MemoScreen route={{ pageId: 'memo-edit', params: {} }} scopeKey="test:person-1"
          active navigate={navigate} back={vi.fn()} />
      </ScreenKeyContext.Provider>
    </ScreenStateContext.Provider>,
  ));
  const save = [...host.querySelectorAll('button')].find(button => button.textContent?.trim() === '保存');
  expect(save).toBeTruthy();
  await act(async () => save!.click());
  expect(request.mock.calls.map(call => call[0])).toContain('getRecordsRecordId');
  expect(navigate).toHaveBeenCalledWith('memo-edit', { recordId: 'memo-1' });
});
