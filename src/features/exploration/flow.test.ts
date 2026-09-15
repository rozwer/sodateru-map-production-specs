import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient, type CommonAIDialogueResult, type Message } from '../../../packages/api-client/index';
import { ExplorationFlow } from './flow';

const origin = { coordinates: [136.965, 35.169] as [number, number], label: '地図の中心', kind: 'map-center' as const };
function dialogue(text = '候補が見つかりました'): CommonAIDialogueResult {
  const place = { name: '図書館', address: null, coordinates: [136.966, 35.17] as [number, number], categories: ['図書館'], provider: 'nominatim', externalId: null, buildingKey: null, sourceUrl: null, attribution: 'OpenStreetMap', fetchedAt: Date.now() };
  return { resultId: 'result-1', text, origin, expiresAt: Date.now() + 900_000, routes: [], places: [{ ...place, candidateId: 'candidate-stored', placeId: 'place-1', retention: 'storable' }, { ...place, candidateId: 'candidate-temporary', placeId: null, retention: 'temporary' }] };
}
function message(id: string, role: 'user' | 'assistant', body: string): Message {
  return { id, conversationId: 'conversation-1', position: role === 'user' ? 0 : 1, role, body, status: 'complete', attempt: 1, version: 3, model: role === 'assistant' ? 'test-provider' : null, errorCode: null, insightId: null, sourceRefs: [], createdAt: 1, updatedAt: 2 };
}
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(yes => { resolve = yes; }); return { promise, resolve }; }

describe('consultation request and history boundaries', () => {
  const flows: ExplorationFlow[] = [];
  afterEach(() => { flows.splice(0).forEach(flow => flow.dispose()); });
  function setup(override?: (operation: string, input: any) => unknown) {
    let sentText = '', assistantId = '', userId = '';
    const request = vi.fn(async (operation: string, input: any): Promise<any> => {
      const replacement = override?.(operation, input);
      if (replacement !== undefined) return replacement;
      if (operation === 'postMapDialogues') return { data: dialogue() };
      if (operation === 'postConversations') return { data: { ...input.body, version: 1, personId: 'person-1', createdAt: 1, updatedAt: 1 } };
      if (operation === 'getPlacesPlaceId') return { data: { place: { id: 'place-1', version: 4 }, ownRecords: { status: 'ready', items: [], error: null }, sharedRecords: { status: 'ready', items: [], error: null }, visits: { status: 'ready', items: [], error: null }, colocated: [] } };
      if (operation === 'postConversationsConversationIdMessages') {
        sentText = input.body.body; assistantId = input.body.assistantMessageId; userId = input.body.userMessageId;
        return { data: { userMessage: message(userId, 'user', sentText), assistantMessage: message(assistantId, 'assistant', '保存した相談応答'), statusUrl: '/messages/test' } };
      }
      if (operation === 'postMapDialoguesResultsResultIdHistory') return { data: { conversationId: input.body.conversationId, resultId: input.path.resultId, result: dialogue(), expiresAt: Date.now() + 900_000, resumeAction: 'continue' } };
      if (operation === 'getConversationsConversationIdMessages') return { items: [message(userId, 'user', sentText), message(assistantId, 'assistant', '保存した相談応答')], nextCursor: null };
      if (operation === 'getMessagesMessageId') return { data: { message: message(assistantId, 'assistant', '保存した相談応答'), run: null, output: null } };
      if (operation === 'postMapDialoguesCancel') return null;
      throw new Error(`Unexpected test operation: ${operation}`);
    });
    const client: ApiClient = { request: request as ApiClient['request'], cancelPending() {}, setDataMode() {} };
    const flow = new ExplorationFlow(client); flows.push(flow); flow.setOrigin(origin); flow.setDraft('静かな場所を歩きたい');
    return { flow, request };
  }

  it('saves confirmed text and permanent references without copying temporary candidates into history', async () => {
    const { flow, request } = setup();
    await flow.send();
    expect(flow.getSnapshot().messages.map(message => message.body)).toEqual(['静かな場所を歩きたい', '保存した相談応答']);
    const send = request.mock.calls.find(([operation]) => operation === 'postConversationsConversationIdMessages')![1];
    expect(Object.keys(send.body).sort()).toEqual(['assistantMessageId', 'body', 'context', 'expectedRefs', 'use', 'userMessageId']);
    expect(send.body.context).toEqual({ placeIds: ['place-1'], recordIds: [], conditions: '静かな場所を歩きたい' });
    expect(send.body.expectedRefs).toEqual([{ type: 'place', id: 'place-1', version: 4 }]);
    const link = request.mock.calls.find(([operation]) => operation === 'postMapDialoguesResultsResultIdHistory')![1];
    expect(link.path.resultId).toBe('result-1');
    expect(link.body.conversationId).toBe(flow.getSnapshot().conversationId);
    expect(flow.getSnapshot().draft).toBe('');
  });

  it('reuses message identities and keys after a lost save response', async () => {
    let failures = 1;
    const { flow, request } = setup(operation => { if (operation === 'postConversationsConversationIdMessages' && failures-- > 0) throw new ApiError(503, 'UNAVAILABLE', '一時的な通信失敗', 'test'); });
    await flow.send();
    expect(flow.getSnapshot().draft).toBe('静かな場所を歩きたい');
    await flow.retry();
    const sends = request.mock.calls.filter(([operation]) => operation === 'postConversationsConversationIdMessages');
    expect(sends).toHaveLength(2);
    expect(sends[0]![1].body).toEqual(sends[1]![1].body);
    expect(sends[0]![1].idempotencyKey).toBe(sends[1]![1].idempotencyKey);
    expect(request.mock.calls.filter(([operation]) => operation === 'postMapDialogues')).toHaveLength(1);
    expect(request.mock.calls.filter(([operation]) => operation === 'postConversations')).toHaveLength(1);
  });

  it('cancels the actual dialogue request and discards its late result', async () => {
    const delayed = deferred<{ data: CommonAIDialogueResult }>();
    const { flow, request } = setup(operation => operation === 'postMapDialogues' ? delayed.promise : undefined);
    const pending = flow.send();
    await flow.cancel();
    delayed.resolve({ data: dialogue() }); await pending;
    const send = request.mock.calls.find(([operation]) => operation === 'postMapDialogues')![1];
    const cancel = request.mock.calls.find(([operation]) => operation === 'postMapDialoguesCancel')![1];
    expect(cancel.body.requestId).toBe(send.requestId);
    expect(send.signal.aborted).toBe(true);
    expect(flow.getSnapshot().result).toBeNull();
    expect(flow.getSnapshot().draft).toBe('静かな場所を歩きたい');
    expect(request.mock.calls.some(([operation]) => operation === 'postConversations')).toBe(false);
  });

  it('reopens saved text after candidate expiry without reviving old pins', async () => {
    const saved = [message('user', 'user', '昨日の相談'), message('assistant', 'assistant', '昨日の応答')];
    const { flow, request } = setup(operation => {
      if (operation === 'getConversationsConversationIdMessages') return { items: saved, nextCursor: null };
      if (operation === 'getConversationsConversationIdMapDialogue') return { data: { conversationId: 'history-1', resultId: null, result: null, expiresAt: null, resumeAction: 'search' } };
    });
    await flow.open('history-1');
    expect(flow.getSnapshot().messages).toEqual(saved);
    expect(flow.getSnapshot().result).toBeNull();
    expect(flow.getSnapshot().notice).toContain('再検索');
    expect(request.mock.calls.some(([operation]) => operation === 'postMapDialogues')).toBe(false);
  });
});
