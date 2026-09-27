import { useEffect, useRef, useState } from 'react';
import { ApiError, type CommonAIRun, type MessageSend, type Theme } from '../../../packages/api-client/index';
import { api } from '../../app/api';
import { readReflectionAi, cancelReflectionAi } from '../reflection/ai';

type Proposal = Extract<CommonAIRun, { task: 'theme' }>;
type Job = { conversationId: string; send: MessageSend; themeVersion: number };

/** Naming stays separate from the manual draft; only explicit adoption writes. */
export function ThemeNaming({ theme, dirty, disabled, active, onAdopted, onSettings, onBusy }: {
  theme: Theme; dirty: boolean; disabled: boolean; active: boolean;
  onAdopted: (theme: Theme) => void; onSettings: () => void; onBusy: (busy: boolean) => void;
}) {
  const [prompt, setPrompt] = useState('このテーマの記録をまとめる短い名前と説明を提案してください。');
  const [job, setJob] = useState<Job | null>(null), [proposal, setProposal] = useState<Proposal | null>(null);
  const [name, setName] = useState(''), [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null), [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stale, setStale] = useState(false), [saved, setSaved] = useState(false);
  const control = useRef<AbortController | null>(null), locked = useRef(false);
  const adoption = useRef<{ signature: string; key: string } | null>(null);
  const currentRun = useRef<CommonAIRun | null>(null);
  useEffect(() => {
    if (!active) { control.current?.abort(); setBusy(false); }
    return () => { control.current?.abort(); };
  }, [active]);
  useEffect(() => { onBusy(busy); return () => onBusy(false); }, [busy, onBusy]);
  const blocked = dirty || disabled || !active;
  const message = (e: unknown) => e instanceof Error ? e.message : '通信に失敗しました。入力は保持しています。';
  async function generate() {
    if (locked.current || blocked || !theme.recordIds.length || !prompt.trim()) return;
    const c = new AbortController(); control.current = c; locked.current = true; setBusy(true); setError(null); setConsent(false);
    try {
      const settings = (await api.request('getMeSettings', { signal: c.signal })).data;
      if (!settings.ai.enabled || !settings.ai.allowRecords) { setConsent(true); return; }
      let pending = job;
      // Retry uncertain requests with the same IDs/payload; terminal runs start a new request.
      if (!pending || currentRun.current && ['complete', 'failed', 'cancelled'].includes(currentRun.current.status)) {
        const records = await Promise.all(theme.recordIds.map(recordId => api.request('getRecordsRecordId', { path: { recordId }, signal: c.signal })));
        pending = { conversationId: crypto.randomUUID(), themeVersion: theme.version, send: {
          userMessageId: crypto.randomUUID(), assistantMessageId: crypto.randomUUID(), body: prompt.trim(), use: 'theme-name',
          context: { recordIds: theme.recordIds, currentName: theme.name },
          expectedRefs: records.map(r => ({ type: 'record', id: r.data.record.id, version: r.data.record.version })),
        } };
        setJob(pending); setProposal(null); currentRun.current = null; setStale(false); setSaved(false); adoption.current = null;
      }
      await api.request('postConversations', { body: { id: pending.conversationId, purpose: 'consult', title: 'テーマの名前を相談', recordId: null }, idempotencyKey: pending.conversationId, signal: c.signal });
      await api.request('postConversationsConversationIdMessages', { path: { conversationId: pending.conversationId }, body: pending.send, idempotencyKey: pending.send.assistantMessageId, signal: c.signal });
      const run = await readReflectionAi(pending.send.assistantMessageId, value => { currentRun.current = value; }, c.signal);
      if (c.signal.aborted) return;
      if (run.task !== 'theme' || !run.result) throw new Error('命名候補を取得できませんでした。');
      setProposal(run); setName(run.result.name); setDescription(run.result.description);
    } catch (e) { if (!c.signal.aborted) setError(message(e)); }
    finally { locked.current = false; if (!c.signal.aborted) setBusy(false); }
  }
  async function cancel() {
    control.current?.abort(); setBusy(false);
    try {
      // Obtain current version even when cancellation happens during the initial send.
      const run = job ? (await api.request('getMessagesMessageId', { path: { messageId: job.send.assistantMessageId } })).data.run : null;
      if (run && ['pending', 'running'].includes(run.status)) currentRun.current = await cancelReflectionAi(run);
      setError('生成を取り消しました。保存したテーマは変更していません。');
    } catch (e) { setError(`取消を確認できませんでした。${message(e)}`); }
  }
  async function adopt() {
    if (locked.current || blocked || stale || saved || !job || !proposal || !name.trim() || Array.from(name).length > 20 || Array.from(description).length > 100) return;
    const c = new AbortController(); control.current = c; locked.current = true; setBusy(true); setSaving(true); setError(null);
    const body = { runId: proposal.id, expectedAttempt: proposal.attempt, expectedRunVersion: proposal.version, name: name.trim(), description };
    const signature = JSON.stringify({ body, version: job.themeVersion });
    if (adoption.current?.signature !== signature) adoption.current = { signature, key: crypto.randomUUID() };
    try {
      const accepted = (await api.request('postThemesThemeIdAdoptName', { path: { themeId: theme.id }, body, version: job.themeVersion, idempotencyKey: adoption.current.key, signal: c.signal })).data;
      if (c.signal.aborted) return;
      onAdopted(accepted); setSaved(true);
      const loaded = (await api.request('getThemesThemeId', { path: { themeId: theme.id }, signal: c.signal })).data;
      if (!c.signal.aborted) {
        onAdopted(loaded);
        if (loaded.name !== accepted.name || loaded.description !== accepted.description) setError('採用後にテーマが更新されました。現在の保存内容を表示しています。');
      }
    } catch (e) {
      if (!c.signal.aborted) {
        if (e instanceof ApiError && [409, 412].includes(e.status)) setStale(true);
        setError(message(e));
      }
    } finally { locked.current = false; setSaving(false); if (!c.signal.aborted) setBusy(false); }
  }
  return <details className="theme-record-section"><summary>Codexに名前を相談</summary>
    <p className="theme-helper">保存済みの所属記録{theme.recordIds.length}件をCodexへ送り、名前と説明の候補を作ります。採用するまではテーマを変更しません。</p>
    {dirty && <p className="theme-helper">編集中の内容を保存してから相談・採用してください。</p>}
    {!theme.recordIds.length && <p className="theme-helper">名前の材料にする記録を選び、テーマを保存してください。</p>}
    <label className="theme-field">相談内容<textarea value={prompt} onChange={e => setPrompt(e.target.value)} disabled={busy} rows={2}/></label>
    <button type="button" className="theme-more" disabled={busy || blocked || !theme.recordIds.length || !prompt.trim()} onClick={() => void generate()}>名前の候補を作る</button>
    {busy && <><p role="status">{saving ? '採用して保存しています。' : '候補を生成しています。'}</p>{!saving && <button type="button" onClick={() => void cancel()}>生成を取り消す</button>}</>}
    {consent && <p role="status">AIの利用と記録の利用許可を設定してください。<button type="button" onClick={onSettings}>AI設定を開く</button></p>}
    {error && <p role="alert" className="theme-validation">{error}</p>}
    {proposal && <section aria-label="名前の候補"><p className="theme-helper">候補を編集してから採用できます。元のテーマ名は上の欄に残っています。</p>
      <label className="theme-field">候補の名前<input value={name} onChange={e => setName(e.target.value)} disabled={busy || saved}/><output>{Array.from(name).length}/20</output></label>
      <label className="theme-field">候補の説明<textarea value={description} onChange={e => setDescription(e.target.value)} disabled={busy || saved} rows={2}/><output>{Array.from(description).length}/100</output></label>
      {stale && <p role="status">テーマや根拠が変わりました。画面を開き直して内容を確認し、新しい候補を作ってください。</p>}
      <button type="button" className="insight-primary" disabled={busy || blocked || stale || saved || !name.trim() || Array.from(name).length > 20 || Array.from(description).length > 100} onClick={() => void adopt()}>この名前と説明を採用して保存</button>
      {saved && <p role="status">採用して保存しました。</p>}
    </section>}
  </details>;
}
