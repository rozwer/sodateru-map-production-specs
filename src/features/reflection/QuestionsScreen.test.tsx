import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ScreenKeyContext, ScreenStateContext } from '../../app/useScreenState';
import { QuestionsScreen, HistoryScreen } from './QuestionsScreen';

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

it.each(['changed', 'deleted'])('回答訂正後は%sの根拠の古い質問引用を消し、回答を保つ', async evidenceState => {
  let saved = false;
  const question = {
    id: 'q1', targetRecordId: 'r1', questionText: '古い公園の質問', createdAt: 1,
    status: 'answered', version: 4, answerRecordId: 'a1', answerVersion: 1,
    answerText: '保存済み回答', answerUnavailable: false,
  };
  request.mockImplementation(async (operation: string) => {
    if (operation === 'getReflectionQuestionsQuestionId') return { data: saved
      ? { ...question, questionText: null, evidenceState, version: 5, answerVersion: 2, answerText: '訂正した回答' }
      : question };
    if (operation === 'getRecordsRecordId') {
      if (saved && evidenceState === 'deleted') throw new Error('NOT_FOUND');
      return { data: { record: { id: 'r1', kind: 'experience', body: saved ? '訂正済みの根拠' : '古い公園の根拠', effectiveStartedAt: null, effectivePlaceId: null, purposes: [], impression: '' } } };
    }
    if (operation === 'getRecordsRecordIdMedia') return { items: [] };
    if (operation === 'patchReflectionQuestionsQuestionId') { saved = true; return {}; }
    throw new Error(`Unexpected operation: ${operation}`);
  });
  const state = new Map<string, unknown>([['question-fixture', {
    answer: '訂正した回答', edited: true, showAi: false, fields: ['purpose', 'reason'],
  }]]);
  await act(async () => root.render(
    <ScreenStateContext.Provider value={state}><ScreenKeyContext.Provider value="question-fixture">
      <QuestionsScreen route={{ pageId: 'reflection-question', params: { questionId: 'q1', timeZone: 'Asia/Tokyo' } }}
        scopeKey="test:person" active navigate={vi.fn()} back={vi.fn()} />
    </ScreenKeyContext.Provider></ScreenStateContext.Provider>,
  ));
  expect(host.textContent).toContain('古い公園の質問');
  const save = [...host.querySelectorAll('button')].find(button => button.textContent === '回答を保存')!;
  await act(async () => save.click());
  expect(host.textContent).not.toContain('古い公園の質問');
  expect(host.textContent).not.toContain('古い公園の根拠');
  expect(host.textContent).toContain('元の質問を表示できません。');
  expect(host.textContent).toContain(evidenceState === 'deleted' ? '元の記録を表示できません' : '訂正済みの根拠');
  expect(host.querySelector('textarea')?.value).toBe('訂正した回答');
  expect(request).toHaveBeenCalledWith('patchReflectionQuestionsQuestionId', expect.objectContaining({
    path: { questionId: 'q1' }, version: 4,
    body: { status: 'answered', answerText: '訂正した回答', answerVersion: 1 },
  }));
});

it('再取得に失敗しても旧根拠を復活させず、未保存回答を保持して再試行できる', async () => {
  let failed = false;
  const question = { id: 'q1', targetRecordId: 'r1', questionText: '再表示してはいけない質問', createdAt: 1, status: 'pending', version: 1, answerText: '' };
  request.mockImplementation(async (operation: string) => {
    if (operation === 'getReflectionQuestionsQuestionId') {
      if (failed) throw new Error('質問の再取得に失敗');
      return { data: question };
    }
    if (operation === 'getRecordsRecordId') return { data: { record: { id: 'r1', kind: 'experience', body: '古い引用本文', effectiveStartedAt: null, effectivePlaceId: null, purposes: [], impression: '' } } };
    if (operation === 'getRecordsRecordIdMedia') return { items: [] };
    throw new Error(operation);
  });
  const state = new Map<string, unknown>([['question-fixture', { answer: '未保存の本人回答', edited: true, showAi: false, fields: [] }]]);
  const render = (active: boolean) => act(async () => root.render(
    <ScreenStateContext.Provider value={state}><ScreenKeyContext.Provider value="question-fixture">
      <QuestionsScreen route={{ pageId: 'reflection-question', params: { questionId: 'q1' } }} scopeKey="test:person" active={active} navigate={vi.fn()} back={vi.fn()} />
    </ScreenKeyContext.Provider></ScreenStateContext.Provider>,
  ));
  await render(true);
  expect(host.textContent).toContain('再表示してはいけない質問');
  await render(false); failed = true; await render(true);
  expect(host.textContent).not.toContain('再表示してはいけない質問');
  expect(host.textContent).not.toContain('古い引用本文');
  expect(host.querySelector('textarea')?.value).toBe('未保存の本人回答');
  const button = (text: string) => [...host.querySelectorAll('button')].find(item => item.textContent === text)!;
  for (const name of ['回答を保存', 'あとで', 'スキップ']) expect(button(name).disabled).toBe(true);
  failed = false;
  await act(async () => button('再試行').click());
  expect(host.textContent).toContain('再表示してはいけない質問');
  expect(host.querySelector('textarea')?.value).toBe('未保存の本人回答');
  expect(button('回答を保存').disabled).toBe(false);
});

it('履歴の再取得失敗時は古い質問・根拠カードを表示しない', async () => {
  let failed = false;
  request.mockImplementation(async (operation: string) => {
    if (operation === 'getReflectionQuestions') {
      if (failed) throw new Error('履歴の再取得に失敗');
      return { items: [{ id: 'q1', targetRecordId: 'r1', questionText: '履歴の古い質問', createdAt: 1, status: 'answered', answerText: '独立回答' }], nextCursor: null };
    }
    if (operation === 'getRecordsRecordId') return { data: { record: { id: 'r1', kind: 'experience', body: '履歴の古い根拠', effectiveStartedAt: null, effectivePlaceId: null, purposes: [], impression: '' } } };
    if (operation === 'getRecordsRecordIdMedia') return { items: [] };
    throw new Error(operation);
  });
  const state = new Map<string, unknown>([['history-fixture', { filter: 'all', expanded: ['q1'], questions: [], cards: [], cursor: null }]]);
  const render = (active: boolean) => act(async () => root.render(
    <ScreenStateContext.Provider value={state}><ScreenKeyContext.Provider value="history-fixture">
      <HistoryScreen route={{ pageId: 'reflection-history', params: {} }} scopeKey="test:person" active={active} navigate={vi.fn()} back={vi.fn()} />
    </ScreenKeyContext.Provider></ScreenStateContext.Provider>,
  ));
  await render(true);
  expect(host.textContent).toContain('履歴の古い質問');
  await render(false); failed = true; await render(true);
  expect(host.textContent).not.toContain('履歴の古い質問');
  expect(host.textContent).not.toContain('履歴の古い根拠');
  expect(host.textContent).toContain('履歴の再取得に失敗');
  expect(host.textContent).not.toContain('この状態の振り返りはまだありません。');
});

it.each([true, false])('通常のrecordId入口から質問生成を明示開始する（質問あり=%s）', async hasQuestion => {
  const navigate = vi.fn();
  request.mockImplementation(async (operation: string) => {
    if (operation === 'getReflectionQuestions') return { items: [], nextCursor: null };
    if (operation === 'getRecordsRecordId') return { data: { record: { id: 'r1', version: 2 } } };
    if (operation === 'postConversations' || operation === 'postConversationsConversationIdMessages') return {};
    if (operation === 'getMessagesMessageId') return { data: { run: { task: 'extract', status: 'complete', attempt: 1, result: { question: hasQuestion ? { topic: 'reason', text: 'なぜ？' } : null } } } };
    if (operation === 'postReflectionQuestions') return { data: { id: 'generated-q' } };
    throw new Error(operation);
  });
  await act(async () => root.render(
    <ScreenStateContext.Provider value={new Map()}><ScreenKeyContext.Provider value="initial-question">
      <QuestionsScreen route={{ pageId: 'reflection-question', params: { recordId: 'r1', timeZone: 'Asia/Tokyo' } }} scopeKey="test:person" active navigate={navigate} back={vi.fn()} />
    </ScreenKeyContext.Provider></ScreenStateContext.Provider>,
  ));
  expect(request.mock.calls.some(call => call[0] === 'postConversations')).toBe(false);
  const start = [...host.querySelectorAll('button')].find(button => button.textContent === 'この記録から振り返りを始める')!;
  await act(async () => start.click());
  expect(request).toHaveBeenCalledWith('postConversationsConversationIdMessages', expect.objectContaining({body: expect.objectContaining({
    use: 'extract', context: { recordId: 'r1', answers: [] }, expectedRefs: [{ type: 'record', id: 'r1', version: 2 }],
  })}));
  if (hasQuestion) expect(navigate).toHaveBeenCalledWith('reflection-question', { recordId: 'r1', timeZone: 'Asia/Tokyo', questionId: 'generated-q' });
  else {
    expect(navigate).not.toHaveBeenCalled();
    expect(host.textContent).toContain('この記録について追加の質問はありません。');
    expect(request.mock.calls.some(call => call[0] === 'postReflectionQuestions')).toBe(false);
  }
});

it('根拠更新で質問引用が無効になっても保存済み回答から再整理できる', async () => {
  request.mockImplementation(async (operation: string) => {
    if (operation === 'getReflectionQuestionsQuestionId') return { data: {
      id: 'q1', targetRecordId: 'r1', questionText: null, evidenceState: 'changed', createdAt: 1,
      status: 'answered', answerText: '保存した回答原文', answerRef: { type: 'record', id: 'a1', version: 1 },
    } };
    if (operation === 'getRecordsRecordId') return { data: { record: { id: 'r1', version: 2, kind: 'experience', body: '更新済みの根拠', purposes: [] } } };
    if (operation === 'getRecordsRecordIdMedia') return { items: [] };
    if (operation === 'postConversations' || operation === 'postConversationsConversationIdMessages') return {};
    if (operation === 'getMessagesMessageId') return { data: { run: { task: 'extract', status: 'complete', result: { purpose: '休憩', reason: '落ち着いた', question: null } } } };
    throw new Error(operation);
  });
  await act(async () => root.render(
    <ScreenStateContext.Provider value={new Map()}><ScreenKeyContext.Provider value="changed-question">
      <QuestionsScreen route={{ pageId: 'reflection-question', params: { questionId: 'q1', interpret: 'true' } }} scopeKey="test:person" active navigate={vi.fn()} back={vi.fn()} />
    </ScreenKeyContext.Provider></ScreenStateContext.Provider>,
  ));
  const generate = [...host.querySelectorAll('button')].find(button => button.textContent === 'AIで整理する')!;
  expect(generate.disabled).toBe(false);
  await act(async () => generate.click());
  expect(request).toHaveBeenCalledWith('postConversationsConversationIdMessages', expect.objectContaining({ body: expect.objectContaining({
    context: { recordId: 'r1', answers: [] }, expectedRefs: [{ type: 'record', id: 'r1', version: 2 }, { type: 'record', id: 'a1', version: 1 }],
  }) }));
  expect(host.querySelector('textarea')?.value).toBe('保存した回答原文');
  expect(host.textContent).toContain('休憩');
});
