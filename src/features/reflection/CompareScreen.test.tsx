import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { RecordView, ReflectionComparison } from '../../../packages/api-client/index';
import { ScreenKeyContext, ScreenStateContext } from '../../app/useScreenState';
import { CompareScreen } from './CompareScreen';

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

it('異なる2件の比較を保存後、再読込できる comparisonId 付き経路へ移る', async () => {
  const left = { id: 'record-a', version: 2, kind: 'experience', body: '海辺を歩いた', purposes: [], impression: '', effectiveStartedAt: null, effectivePlaceId: null } as unknown as RecordView;
  const right = { id: 'record-b', version: 3, kind: 'experience', body: '図書館で読んだ', purposes: [], impression: '', effectiveStartedAt: null, effectivePlaceId: null } as unknown as RecordView;
  let saved: ReflectionComparison | undefined;
  request.mockImplementation(async (operation: string, input: { body?: Record<string, unknown>; path?: { recordId?: string } }) => {
    if (operation === 'getRecords') return { items: [left, right], nextCursor: null };
    if (operation === 'getRecordsRecordId') return { data: { record: input.path?.recordId === left.id ? left : right } };
    if (operation === 'getRecordsRecordIdMedia') return { items: [], nextCursor: null };
    if (operation === 'postReflectionComparisons') {
      saved = { ...input.body, version: 1, evidenceState: 'current' } as ReflectionComparison;
      return { data: saved };
    }
    if (operation === 'getReflectionComparisonsComparisonId') return { data: saved };
    throw new Error(`Unexpected operation: ${operation}`);
  });
  const state = new Map<string, unknown>([['compare-fixture', {
    id: 'comparison-1', key: 'create-1', left: left.id, right: right.id,
    common: '落ち着いた', difference: '景色と本', edited: true,
    records: [left, right], cards: {},
  }]]);
  await act(async () => root.render(
    <ScreenStateContext.Provider value={state}>
      <ScreenKeyContext.Provider value="compare-fixture">
        <CompareScreen route={{ pageId: 'experience-compare', params: {} }} scopeKey="test:person-1"
          active navigate={navigate} back={vi.fn()} />
      </ScreenKeyContext.Provider>
    </ScreenStateContext.Provider>,
  ));
  const save = [...host.querySelectorAll('button')].find(button => button.textContent?.trim() === '比較を保存');
  expect(save).toBeTruthy();
  await act(async () => save!.click());
  expect(request.mock.calls.map(call => call[0])).toContain('getReflectionComparisonsComparisonId');
  expect(navigate).toHaveBeenCalledWith('experience-compare', { comparisonId: 'comparison-1' });
});
