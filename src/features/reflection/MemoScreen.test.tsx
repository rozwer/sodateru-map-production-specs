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

it('キャンセル後に未確定キーワードと削除確認を残さない', async () => {
  const record = {
    id: 'memo-1', kind: 'memo', body: '保存済みの本文', version: 1,
    useForSuggestions: true,
    memo: { name: '保存済みのメモ', originRefs: [], keywords: [] },
  };
  request.mockImplementation(async (operation: string) => {
    if (operation === 'getRecordsRecordId') return { data: { record } };
    if (operation === 'getRecords' || operation === 'getSuggestions') return { items: [], nextCursor: null };
    throw new Error(`Unexpected operation: ${operation}`);
  });
  const state = new Map<string, unknown>([['memo-fixture', {
    id: 'memo-1', record, form: { name: '保存済みのメモ', body: '保存済みの本文', origins: [], keywords: [], useForSuggestions: true },
    edited: false, keyword: '未確定', options: [], loaded: true, createKey: 'create-1',
  }]]);
  const back = vi.fn();
  await act(async () => root.render(
    <ScreenStateContext.Provider value={state}>
      <ScreenKeyContext.Provider value="memo-fixture">
        <MemoScreen route={{ pageId: 'memo-edit', params: { recordId: 'memo-1' } }} scopeKey="test:person-1"
          active navigate={navigate} back={back} />
      </ScreenKeyContext.Provider>
    </ScreenStateContext.Provider>,
  ));
  const button = (label: string) => [...host.querySelectorAll('button')].find(item => item.textContent?.trim() === label)!;
  await act(async () => button('＋ 追加する').click());
  expect(host.querySelector<HTMLInputElement>('input[aria-label="追加するキーワード"]')?.value).toBe('未確定');
  await act(async () => button('このメモを削除する').click());
  expect(host.textContent).toContain('このメモの名前・本文・キーワードを削除します。');
  await act(async () => button('キャンセル').click());
  expect(back).toHaveBeenCalledOnce();
  expect((state.get('memo-fixture') as { keyword: string }).keyword).toBe('');
  expect(host.querySelector('input[aria-label="追加するキーワード"]')).toBeNull();
  expect(host.textContent).not.toContain('このメモの名前・本文・キーワードを削除します。');
});

it('新規メモをキャンセルすると失敗した作成要求も破棄する', async () => {
  request.mockImplementation(async (operation: string) => {
    if (operation === 'getRecords' || operation === 'getSuggestions') return { items: [], nextCursor: null };
    throw new Error(`Unexpected operation: ${operation}`);
  });
  const state = new Map<string, unknown>([['memo-fixture', {
    id: 'old-id', form: { name: '破棄するメモ', body: '下書き', origins: [], keywords: [], useForSuggestions: true },
    edited: true, keyword: '未確定', options: [], loaded: true, createKey: 'old-key',
    pendingCreate: { id: 'old-id', body: '下書き' },
  }]]);
  await act(async () => root.render(
    <ScreenStateContext.Provider value={state}>
      <ScreenKeyContext.Provider value="memo-fixture">
        <MemoScreen route={{ pageId: 'memo-edit', params: {} }} scopeKey="test:person-1"
          active navigate={navigate} back={vi.fn()} />
      </ScreenKeyContext.Provider>
    </ScreenStateContext.Provider>,
  ));
  const cancel = [...host.querySelectorAll('button')].find(button => button.textContent?.trim() === 'キャンセル');
  await act(async () => cancel!.click());
  const next = state.get('memo-fixture') as { id: string; createKey: string; pendingCreate?: unknown; keyword: string };
  expect(next.id).not.toBe('old-id');
  expect(next.createKey).not.toBe('old-key');
  expect(next.pendingCreate).toBeUndefined();
  expect(next.keyword).toBe('');
});

it('削除済みメモへ戻っても削除前の本文や操作を表示しない', async () => {
  const record = {
    id: 'memo-1', kind: 'memo', body: '削除前の本文', version: 1,
    useForSuggestions: true,
    memo: { name: '削除するメモ', originRefs: [], keywords: [] },
  };
  let deleted = false;
  request.mockImplementation(async (operation: string) => {
    if (operation === 'getRecordsRecordId') {
      if (deleted) throw new Error('このメモは見つかりません');
      return { data: { record } };
    }
    if (operation === 'getRecords' || operation === 'getSuggestions') return { items: [], nextCursor: null };
    if (operation === 'deleteRecordsRecordId') { deleted = true; return {}; }
    throw new Error(`Unexpected operation: ${operation}`);
  });
  const state = new Map<string, unknown>([['memo-fixture', {
    id: 'memo-1', record, form: { name: '削除するメモ', body: '削除前の本文', origins: [], keywords: [], useForSuggestions: true },
    edited: false, keyword: '', options: [], loaded: true, createKey: 'create-1',
  }]]);
  const route = { pageId: 'memo-edit', params: { recordId: 'memo-1' } };
  const render = async (active: boolean) => act(async () => root.render(
    <ScreenStateContext.Provider value={state}>
      <ScreenKeyContext.Provider value="memo-fixture">
        <MemoScreen route={route} scopeKey="test:person-1" active={active} navigate={navigate} back={vi.fn()} />
      </ScreenKeyContext.Provider>
    </ScreenStateContext.Provider>,
  ));
  await render(true);
  const button = (label: string) => [...host.querySelectorAll('button')].find(item => item.textContent?.trim() === label)!;
  await act(async () => button('このメモを削除する').click());
  await act(async () => button('このメモを削除').click());
  expect(navigate).toHaveBeenCalledWith('personal-map');
  await render(false);
  await render(true);
  expect((host.querySelector('textarea') as HTMLTextAreaElement).value).toBe('');
  expect(host.textContent).not.toContain('このメモを削除する');
  expect((button('保存') as HTMLButtonElement).disabled).toBe(true);
});
