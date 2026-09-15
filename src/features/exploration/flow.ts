import type { ApiClient, CommonAIDialogueResult, CommonAIMessage, CommonAIOrigin, Message, Settings } from '../../../packages/api-client/index';
import { cancelMessage, consultMessage, errorText, newId, readMessages, waitMessage } from './api';
import type { PlacePresentation } from './view-types';

export interface ConsentDraft {
  text: string;
  place: PlacePresentation | null;
  origin: CommonAIOrigin | null;
  returnPage: string;
  settings: Settings;
  recordsRequired?: boolean;
  textLimit?: number;
  sourceSummary?: string[];
  cancel?: (confirmed: Pick<ConsentDraft, 'text' | 'place' | 'origin'>) => void;
  send: (confirmed: Pick<ConsentDraft, 'text' | 'place' | 'origin'>, signal: AbortSignal) => Promise<void>;
}
interface ConsultationOperation {
  text: string; origin: CommonAIOrigin; conversationId: string;
  requestId: string; dialogueKey: string; conversationKey: string; messageKey: string; historyKey: string;
  userMessageId: string; assistantMessageId: string;
  result?: CommonAIDialogueResult;
  conversationCreated: boolean;
  message?: Message;
}
export interface ExplorationState {
  draft: string;
  origin: CommonAIOrigin | null;
  selectedPlace: PlacePresentation | null;
  conversationId: string | null;
  messages: CommonAIMessage[];
  result: CommonAIDialogueResult | null;
  selectedId: string | null;
  busy: boolean;
  error: string | null;
  notice: string | null;
  consent: ConsentDraft | null;
}
const empty = (): ExplorationState => ({ draft: '', origin: null, selectedPlace: null, conversationId: null, messages: [], result: null, selectedId: null, busy: false, error: null, notice: null, consent: null });

/** One consultation journey per shell. Candidate data is memory-only and bounded by server expiry. */
export class ExplorationFlow {
  private state = empty();
  private listeners = new Set<() => void>();
  private controller: AbortController | null = null;
  private epoch = 0;
  private operation: ConsultationOperation | null = null;
  private expiry: ReturnType<typeof setTimeout> | null = null;
  constructor(private api: ApiClient) {}
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  getSnapshot = () => this.state;
  private update(patch: Partial<ExplorationState>) { this.state = { ...this.state, ...patch }; this.listeners.forEach(listener => listener()); }
  setDraft = (draft: string) => this.update({ draft: draft.slice(0, 300) });
  setOrigin = (origin: CommonAIOrigin) => this.update({ origin: { ...origin, coordinates: [...origin.coordinates] } });
  setSelectedPlace = (selectedPlace: PlacePresentation | null) => this.update({ selectedPlace });
  setConsent = (consent: ConsentDraft | null) => this.update({ consent });
  updateConsent = (patch: Partial<Pick<ConsentDraft, 'text' | 'place' | 'origin'>>) => {
    if (this.state.consent) this.update({ consent: { ...this.state.consent, ...patch }, ...(patch.text !== undefined && ['ai-explore', 'voice-consultation'].includes(this.state.consent.returnPage) ? { draft: patch.text } : {}) });
  };
  private begin() {
    this.controller?.abort();
    const controller = new AbortController(), epoch = ++this.epoch;
    this.controller = controller;
    this.update({ busy: true, error: null, notice: null });
    return { signal: controller.signal, current: () => this.epoch === epoch && !controller.signal.aborted };
  }
  private result(result: CommonAIDialogueResult | null) {
    if (this.expiry) clearTimeout(this.expiry);
    const valid = result && result.expiresAt > Date.now() ? result : null;
    this.update({ result: valid, selectedId: valid?.places[0]?.candidateId ?? null });
    if (valid) this.expiry = setTimeout(() => this.update({ result: null, selectedId: null, notice: '候補の期限が切れました。同じ相談文でもう一度探せます。' }), valid.expiresAt - Date.now());
  }
  prepare = async (origin: CommonAIOrigin, signal?: AbortSignal) => {
    this.setOrigin(origin);
    const { data } = await this.api.request('getMeSettings', { signal });
    return data;
  };
  beginNew = () => {
    this.controller?.abort(); this.epoch++; this.operation = null;
    if (this.expiry) clearTimeout(this.expiry);
    this.state = empty(); this.listeners.forEach(listener => listener());
  };
  send = async () => {
    if (this.state.busy || !this.state.draft.trim() || !this.state.origin) return;
    const text = this.state.draft.trim(), origin = this.state.origin;
    const old = this.operation;
    const reusable = old && old.text === text && JSON.stringify(old.origin) === JSON.stringify(origin) && (!old.result || old.result.expiresAt > Date.now());
    const operation: ConsultationOperation = reusable ? old : {
      text, origin, conversationId: this.state.conversationId ?? newId(), requestId: newId(), dialogueKey: newId(), conversationKey: newId(), messageKey: newId(), historyKey: newId(), userMessageId: newId(), assistantMessageId: newId(), conversationCreated: this.state.conversationId !== null,
    };
    this.operation = operation;
    const work = this.begin();
    try {
      if (!operation.result) {
        this.result(null);
        const { data } = await this.api.request('postMapDialogues', { body: { text, origin }, idempotencyKey: operation.dialogueKey, requestId: operation.requestId, signal: work.signal });
        if (!work.current()) return;
        operation.result = data;
      }
      this.result(operation.result);
      if (!operation.conversationCreated) {
        await this.api.request('postConversations', { body: { id: operation.conversationId, purpose: 'consult', title: text.slice(0, 80), recordId: null }, idempotencyKey: operation.conversationKey, signal: work.signal });
        operation.conversationCreated = true;
      }
      if (!work.current()) return;
      this.update({ conversationId: operation.conversationId });
      if (!operation.message) {
        const body = await consultMessage(this.api, operation.result, text, operation, work.signal);
        const { data } = await this.api.request('postConversationsConversationIdMessages', { path: { conversationId: operation.conversationId }, body, idempotencyKey: operation.messageKey, signal: work.signal });
        operation.message = data.assistantMessage;
      }
      await this.api.request('postMapDialoguesResultsResultIdHistory', { path: { resultId: operation.result.resultId }, body: { conversationId: operation.conversationId }, idempotencyKey: operation.historyKey, signal: work.signal });
      const messages = await readMessages(this.api, operation.conversationId, work.signal);
      if (!work.current()) return;
      this.update({ messages });
      const completed = await waitMessage(this.api, operation.assistantMessageId, work.signal, message => { operation.message = message; });
      const saved = await readMessages(this.api, operation.conversationId, work.signal);
      if (!work.current()) return;
      this.update({ messages: saved, busy: false, draft: completed.message.status === 'complete' ? '' : text, error: completed.message.status === 'failed' ? completed.run?.error?.message ?? '相談の保存応答を作成できませんでした。' : null, notice: completed.message.status === 'cancelled' ? '相談を取り消しました。本文は残しています。' : null });
      if (completed.message.status === 'complete') this.operation = null;
    } catch (error) {
      if (work.current()) this.update({ busy: false, error: errorText(error) });
    }
  };
  retry = async () => {
    const operation = this.operation;
    if (operation?.message?.status === 'failed') {
      const work = this.begin();
      try {
        const { data } = await this.api.request('postMessagesMessageIdRetry', { path: { messageId: operation.message.id }, body: { attempt: operation.message.attempt }, version: operation.message.version, idempotencyKey: newId(), signal: work.signal });
        operation.message = data.message;
        if (work.current()) this.update({ busy: false });
      } catch (error) { if (work.current()) this.update({ busy: false, error: errorText(error) }); return; }
    }
    await this.send();
  };
  open = async (conversationId: string) => {
    const work = this.begin(); this.operation = null; this.result(null);
    this.update({ conversationId, draft: '', messages: [] });
    try {
      const [messages, resume] = await Promise.all([
        readMessages(this.api, conversationId, work.signal),
        this.api.request('getConversationsConversationIdMapDialogue', { path: { conversationId }, signal: work.signal }).catch(error => ({ error })),
      ]);
      if (!work.current()) return;
      if ('error' in resume) { this.update({ messages, busy: false, error: `会話は読み込みましたが、候補の復元に失敗しました。${errorText(resume.error)}` }); return; }
      this.result(resume.data.result);
      this.update({ messages, busy: false, origin: resume.data.result?.origin ?? null, notice: resume.data.resumeAction === 'search' ? '保存した会話です。候補は再検索してください。' : null });
    } catch (error) { if (work.current()) this.update({ busy: false, error: errorText(error) }); }
  };
  select = async (candidateId: string) => {
    const result = this.state.result;
    if (!result || result.expiresAt <= Date.now()) { this.result(null); return; }
    const work = this.begin();
    try {
      const { data } = await this.api.request('postMapDialoguesSelect', { body: { resultId: result.resultId, candidateId }, idempotencyKey: newId(), signal: work.signal });
      if (!work.current()) return;
      this.result(data); this.update({ selectedId: candidateId, busy: false });
    } catch (error) { if (work.current()) this.update({ busy: false, error: errorText(error) }); }
  };
  cancel = async () => {
    const operation = this.operation;
    this.controller?.abort(); const epoch = ++this.epoch;
    this.update({ busy: false, notice: '取り消しています…' });
    try {
      if (operation) {
        if (!operation.result) await this.api.request('postMapDialoguesCancel', { body: { requestId: operation.requestId }, idempotencyKey: `cancel-${operation.requestId}` });
        if (operation.conversationCreated) await cancelMessage(this.api, operation.assistantMessageId, `cancel-${operation.assistantMessageId}`);
      }
      if (this.epoch !== epoch) return;
      this.operation = null;
      this.update({ notice: '相談を取り消しました。本文は残しています。' });
    } catch (error) { if (this.epoch === epoch) this.update({ error: `取消の確認に失敗しました。${errorText(error)}`, notice: null }); }
  };
  pause = () => { this.controller?.abort(); ++this.epoch; this.update({ busy: false }); };
  dispose = () => { this.controller?.abort(); ++this.epoch; if (this.expiry) clearTimeout(this.expiry); this.listeners.clear(); this.state = empty(); };
}
