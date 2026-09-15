// Preserved original-scope implementation. Not registered or compiled into the current product.
import { useEffect, useRef, useState } from 'react';
import type { ScreenProps } from '../../../src/app/contracts';
import { useScreenState } from '../../../src/app/useScreenState';
import { api } from '../../../src/app/api';
import type { CompanionDraft, CompanionGeneration, CompanionProviderStatus } from '../../../packages/api-client/index';
import { CreationView, Message, type CreationForm } from '../../../src/features/companion/views';
import { downloadInstructions, useCompanionRequests } from '../../../src/features/companion/requests';
function uploadBody(file: File) { const body = new FormData(); body.set('file', file); return body; }

/** Preserved work from the original scope. Creation is not registered for this competition. */
export function PreservedCreateScreen({ active = true, navigate, route }: ScreenProps) {
  const [state, setState] = useScreenState<{ form: CreationForm; draft: CompanionDraft | null; dirty: boolean; referenceImageId: string | null; generation: CompanionGeneration | null }>({ form: { name: '', appearance: '', image: null }, draft: null, dirty: false, referenceImageId: null, generation: null });
  const [drafts, setDrafts] = useState<CompanionDraft[]>([]);
  const [generations, setGenerations] = useState<CompanionGeneration[]>([]);
  const [provider, setProvider] = useState<CompanionProviderStatus | null>(null);
  const [showProvider, setShowProvider] = useState(false);
  const [referenceUrl, setReferenceUrl] = useState<string>();
  const request = useCompanionRequests(active);
  const imageIdentity = useRef<string | undefined>(undefined);
  const openDraft = async (draftId: string, signal: AbortSignal) => {
    const { data: draft } = await api.request('getCompanionDraft', { path: { draftId }, signal });
    if (signal.aborted) return;
    setState(previous => ({ ...previous, draft, form: { name: draft.name, appearance: draft.appearance, image: null }, referenceImageId: draft.referenceImageId, dirty: false, generation: null }));
  };
  useEffect(() => {
    if (!active) return;
    void request.run(async signal => {
      const results = await Promise.allSettled([api.request('listCompanionDrafts', { signal }), api.request('getCompanionProvider', { signal }), api.request('listCompanionGenerations', { signal })]);
      if (signal.aborted) return;
      if (results[0].status === 'fulfilled') setDrafts(results[0].value.items);
      if (results[1].status === 'fulfilled') setProvider(results[1].value.data);
      if (results[2].status === 'fulfilled') setGenerations(results[2].value.items);
      if (route.params.draftId && !state.dirty && state.draft?.id !== route.params.draftId) await openDraft(route.params.draftId, signal);
      const failure = results.find(result => result.status === 'rejected');
      if (failure?.status === 'rejected') throw failure.reason;
    });
  }, [active, route.params.draftId]);
  useEffect(() => {
    if (!active || !state.referenceImageId || state.form.image) { setReferenceUrl(undefined); return; }
    const controller = new AbortController(); let url: string | undefined;
    void api.request('getCompanionReferenceImage', { path: { mediaId: state.referenceImageId }, signal: controller.signal }).then(blob => {
      if (!controller.signal.aborted) { url = URL.createObjectURL(blob); setReferenceUrl(url); }
    }).catch(error => { if (!controller.signal.aborted) request.setNotice({ kind: 'error', text: `参考画像を読み込めませんでした。${error instanceof Error ? error.message : ''}` }); });
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url); };
  }, [active, state.referenceImageId, state.form.image]);

  const saveDraft = async (signal: AbortSignal) => {
    let referenceImageId = state.referenceImageId;
    if (state.form.image) {
      const media = await request.mutate('uploadCompanionReferenceImage', { body: uploadBody(state.form.image) }, imageIdentity.current);
      referenceImageId = media.id;
      setState(previous => ({ ...previous, referenceImageId, form: { ...previous.form, image: null } }));
    }
    const body = { name: state.form.name, appearance: state.form.appearance, referenceImageId };
    const draft = state.draft
      ? await request.mutate('updateCompanionDraft', { path: { draftId: state.draft.id }, version: state.draft.version, body })
      : await request.mutate('createCompanionDraft', { body });
    if (signal.aborted) return draft;
    setState(previous => ({ ...previous, draft, referenceImageId, dirty: false, form: { ...previous.form, image: null } }));
    const { data: saved } = await api.request('getCompanionDraft', { path: { draftId: draft.id }, signal });
    if (!signal.aborted) setDrafts(previous => [saved, ...previous.filter(item => item.id !== saved.id)]);
    return saved;
  };
  const onImage = (image: File | null) => {
    if (image && (image.size > 5_000_000 || !['image/png', 'image/jpeg'].includes(image.type))) {
      request.setNotice({ kind: 'error', text: '参考画像は5MB以下のJPG・PNGを選んでください。前の画像は残しています。' }); return;
    }
    imageIdentity.current = crypto.randomUUID();
    setState(previous => ({ ...previous, form: { ...previous.form, image }, referenceImageId: null, dirty: true }));
    request.setNotice(undefined);
  };
  const generation = state.generation;
  return <CreationView form={state.form} onChange={form => setState(previous => ({ ...previous, form, dirty: true }))} onImage={onImage} imageUrl={referenceUrl}
    busy={request.busy} connected={Boolean(provider?.connected)} providerLabel={provider?.provider ?? undefined} notice={request.notice}
    onProvider={() => setShowProvider(value => !value)}
    onDraft={() => void request.run(async signal => { await saveDraft(signal); if (!signal.aborted) request.setNotice({ kind: 'success', text: '下書きを保存しました。あとで再開できます。' }); })}
    onExport={() => void request.run(async signal => {
      const draft = await saveDraft(signal);
      const { data: result } = await api.request('exportCompanionInstructions', { path: { draftId: draft.id }, signal });
      if (!signal.aborted) { downloadInstructions(result.instructions); request.setNotice({ kind: 'success', text: '現在の入力から制作指示を書き出しました。' }); }
    })}
    onGenerate={() => void request.run(async signal => {
      if (!provider?.connected) return;
      const draft = await saveDraft(signal);
      const generation = await request.mutate('createCompanionGeneration', { body: { draftId: draft.id, draftVersion: draft.version } });
      if (!signal.aborted) { setState(previous => ({ ...previous, generation })); setGenerations(previous => [generation, ...previous.filter(item => item.id !== generation.id)]); }
    })}
    extra={<>
      {state.dirty && <small role="status">未保存の変更があります。</small>}
      {state.dirty && state.draft && <details><summary>保存済みの下書きと比較</summary><p>{state.draft.name || '名前未入力'}</p><p>{state.draft.appearance || '外見未入力'}</p><button className="companion-button" disabled={request.busy} onClick={() => void request.run(async signal => { const { data: draft } = await api.request('getCompanionDraft', { path: { draftId: state.draft!.id }, signal }); if (!signal.aborted) setState(previous => ({ ...previous, draft })); })}>入力を残して最新の下書きを確認</button></details>}
      {showProvider && <section className="companion-card"><h3>接続先の設定</h3><p>{provider?.reason || '接続先の状態を確認してください。'}</p><button className="companion-button" onClick={() => void request.run(async signal => { const { data: result } = await api.request('getCompanionProvider', { signal }); if (!signal.aborted) setProvider(result); })}>接続状態を再確認</button><button className="companion-button" onClick={() => setShowProvider(false)}>閉じる</button></section>}
      <details><summary>保存した下書きから再開（{drafts.length}）</summary>{drafts.length ? drafts.map(draft => <button key={draft.id} className="companion-button" disabled={request.busy} onClick={() => navigate('companion-create', { draftId: draft.id })}>{draft.name || '名前未入力'} · {new Date(draft.updatedAt).toLocaleDateString('ja-JP')}</button>) : <p>保存した下書きはありません。</p>}</details>
      <details open={Boolean(generation)}><summary>制作の進捗・候補（{generations.length}）</summary>{generations.map(item => <button key={item.id} className="companion-button" onClick={() => void request.run(async signal => { const { data: result } = await api.request('getCompanionGeneration', { path: { generationId: item.id }, signal }); if (!signal.aborted) setState(previous => ({ ...previous, generation: result })); })}>{item.input.name || '名前未入力'} · {item.progress}%</button>)}</details>
      {generation && <section className="companion-card"><h3>{generation.input.name}の制作</h3><p role="status">{{ queued: '生成を待っています', running: '生成しています', succeeded: '候補ができました', failed: '生成できませんでした', cancelled: '生成を取り消しました' }[generation.status]} · {generation.progress}%</p><progress max={100} value={generation.progress} aria-label="生成の進捗"/>
        {generation.failureCode && <Message notice={{ kind: 'error', text: `生成できませんでした（${generation.failureCode}）。下書きから再試行できます。` }}/>}<button className="companion-button" disabled={request.busy} onClick={() => void request.run(async signal => { const result = await request.mutate('refreshCompanionGeneration', { path: { generationId: generation.id }, version: generation.version }); if (!signal.aborted) setState(previous => ({ ...previous, generation: result })); })}>進捗を再確認</button>
        {['queued', 'running'].includes(generation.status) && <button className="companion-button" disabled={request.busy} onClick={() => void request.run(async signal => { const result = await request.mutate('cancelCompanionGeneration', { path: { generationId: generation.id }, version: generation.version }); if (!signal.aborted) setState(previous => ({ ...previous, generation: result })); })}>生成を取り消す</button>}
        {generation.status === 'succeeded' && !generation.adoptedCompanionId && generation.resultImportId && <button className="companion-button" onClick={() => navigate('companion-import', { importId: generation.resultImportId!, generationId: generation.id })}>候補の動作を確認する</button>}
        {generation.adoptedCompanionId && <button className="companion-button" onClick={() => navigate('companion-settings', { companionId: generation.adoptedCompanionId! })}>採用した相棒を選ぶ</button>}
      </section>}
    </>}/>;
}

