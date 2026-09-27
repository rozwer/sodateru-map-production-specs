import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ScreenKeyContext, ScreenStateContext } from '../../app/useScreenState';
import { QuestionsScreen } from './QuestionsScreen';

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
