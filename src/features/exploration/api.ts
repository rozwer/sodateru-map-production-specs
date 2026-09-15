import { ApiError, type ApiClient, type CommonAIDialogueResult, type CommonAIMessage, type CommonMapPlace, type CommonMapPlaceCandidate, type Conversation, type Message, type MessageResult, type MessageSend, type PlaceDetail } from '../../../packages/api-client/index';
import type { HistoryPresentation, PlacePresentation } from './view-types';

export const newId = () => crypto.randomUUID();
export function errorText(error: unknown): string {
  if (error instanceof ApiError) return `${error.message}（${error.code}）`;
  return error instanceof Error ? error.message : '読み込みに失敗しました。入力を残したまま再試行できます。';
}
export function placePresentation(place: CommonMapPlace | CommonMapPlaceCandidate, detail?: PlaceDetail): PlacePresentation {
  const records = detail ? [...detail.ownRecords.items, ...detail.sharedRecords.items] : [];
  const photos = records.flatMap(record => record.media.filter(media => media.kind === 'photo' && media.status === 'ready' && media.contentUrl).map(media => ({ url: media.contentUrl!, alt: `${place.name}の記録写真` })));
  return { id: 'candidateId' in place ? place.candidateId : place.id, name: place.name, address: place.address, coordinates: place.coordinates, photos, category: place.categories.join('・'), source: { title: place.attribution || place.provider, url: place.sourceUrl } };
}
export async function readPlace(api: ApiClient, placeId: string, signal?: AbortSignal) {
  const { data } = await api.request('getPlacesPlaceId', { path: { placeId }, signal });
  return placePresentation(data.place, data);
}
export async function readMessages(api: ApiClient, conversationId: string, signal?: AbortSignal): Promise<CommonAIMessage[]> {
  const messages: CommonAIMessage[] = [];
  let cursor: string | undefined;
  do {
    const page = await api.request('getConversationsConversationIdMessages', { path: { conversationId }, query: { limit: 100, cursor }, signal });
    messages.push(...page.items); cursor = page.nextCursor ?? undefined;
  } while (cursor);
  return messages.sort((a, b) => a.position - b.position);
}
export function historyPresentation(conversation: Conversation, messages: CommonAIMessage[] = []): HistoryPresentation {
  return { id: conversation.id, title: conversation.title, updatedAt: conversation.updatedAt, preview: messages.at(-1)?.body ?? '', tags: [] };
}
export async function waitMessage(api: ApiClient, messageId: string, signal: AbortSignal, onMessage?: (message: Message) => void): Promise<MessageResult> {
  for (;;) {
    signal.throwIfAborted();
    const { data } = await api.request('getMessagesMessageId', { path: { messageId }, signal });
    onMessage?.(data.message);
    if (!['pending', 'running'].includes(data.message.status)) return data;
    await new Promise<void>((resolve, reject) => {
      const abort = () => { clearTimeout(timer); reject(new DOMException('取り消しました。', 'AbortError')); };
      const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, 1200);
      signal.addEventListener('abort', abort, { once: true });
    });
  }
}
export async function cancelMessage(api: ApiClient, messageId: string, idempotencyKey: string): Promise<void> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { data } = await api.request('getMessagesMessageId', { path: { messageId } });
      if (!['pending', 'running'].includes(data.message.status)) return;
      await api.request('postMessagesMessageIdCancel', { path: { messageId }, body: { attempt: data.message.attempt }, version: data.message.version, idempotencyKey });
      return;
    } catch (error) {
      if (error instanceof ApiError && error.code === 'NOT_FOUND') return;
      if (attempt === 0 && error instanceof ApiError && ['VERSION_CONFLICT', 'STATE_CONFLICT', 'REQUEST_CONFLICT'].includes(error.code)) continue;
      throw error;
    }
  }
}
/** Only permanent place IDs enter the saved AI conversation. Temporary candidate copies remain in memory. */
export async function consultMessage(api: ApiClient, result: CommonAIDialogueResult, text: string, ids: { userMessageId: string; assistantMessageId: string }, signal?: AbortSignal): Promise<MessageSend> {
  const placeIds = [...new Set(result.places.flatMap(place => place.placeId && place.retention === 'storable' ? [place.placeId] : []))];
  const places = await Promise.all(placeIds.map(placeId => api.request('getPlacesPlaceId', { path: { placeId }, signal })));
  return { userMessageId: ids.userMessageId, assistantMessageId: ids.assistantMessageId, body: text, use: 'consult', context: { placeIds, recordIds: [], conditions: text }, expectedRefs: places.map(({ data }) => ({ type: 'place', id: data.place.id, version: data.place.version })) };
}
