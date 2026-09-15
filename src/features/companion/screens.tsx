import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { ScreenDefinition, ScreenProps } from '../../app/contracts';
import { useScreenState } from '../../app/useScreenState';
import { api } from '../../app/api';
import type { Companion, CompanionDraft, CompanionGeneration, CompanionImport, CompanionProviderStatus, CompanionSettings } from '../../../packages/api-client/index';
import { CreationView, ImportView, Message, SettingsView, type CompanionCard, type CreationForm, type ImportForm, type PreviewAction, type SettingsForm } from './views';
import { companionRevision, downloadInstructions, notifyCompanionSaved, subscribeCompanion, useCompanionRequests } from './requests';
import { loadAtlas, v2Actions, v2Clip } from './atlas';

const emptySettings: SettingsForm = { selectedId: null, visible: true, size: 'medium', reducedMotion: false };
function settingsForm(saved: CompanionSettings): SettingsForm {
  return { selectedId: saved.selectedCompanionId, visible: saved.visible, size: saved.size, reducedMotion: saved.reducedMotion };
}
function uploadBody(file: File) { const body = new FormData(); body.set('file', file); return body; }

function SettingsScreen({ active = true, navigate }: ScreenProps) {
  const [state, setState] = useScreenState<{ form: SettingsForm; saved: CompanionSettings | null; dirty: boolean }>({ form: emptySettings, saved: null, dirty: false });
  const [pets, setPets] = useState<CompanionCard[]>([]);
  const [loading, setLoading] = useState(true);
  const request = useCompanionRequests(active);
  const revision = useSyncExternalStore(subscribeCompanion, companionRevision);
  const atlasUrls = useRef<string[]>([]);
  const load = async (signal: AbortSignal) => {
    const [list, response] = await Promise.all([api.request('listCompanions', { signal }), api.request('getCompanionSettings', { signal })]);
    const saved = response.data;
    if (signal.aborted) return;
    setPets(list.items.map((pet: Companion) => ({ id: pet.id, name: pet.name })));
    setState(previous => ({ ...previous, saved, form: previous.dirty ? previous.form : settingsForm(saved) }));
    const previews = await Promise.allSettled(list.items.map(async (pet: Companion) => ({ pet, atlas: await loadAtlas(pet.importId, signal) })));
    const nextUrls = previews.flatMap(result => result.status === 'fulfilled' ? [result.value.atlas.url] : []);
    if (signal.aborted) { nextUrls.forEach(url => URL.revokeObjectURL(url)); return; }
    atlasUrls.current.forEach(url => URL.revokeObjectURL(url)); atlasUrls.current = nextUrls;
    setPets(list.items.map((pet: Companion, index: number) => {
      const result = previews[index];
      if (result.status !== 'fulfilled') return { id: pet.id, name: pet.name };
      const description = result.value.atlas.imported.manifest.description;
      return { id: pet.id, name: pet.name, clip: v2Clip(result.value.atlas.url, 'idle'), ...(typeof description === 'string' ? { description } : {}) };
    }));
    if (previews.some(result => result.status === 'rejected')) request.setNotice({ kind: 'error', text: '一部の相棒の画像を読み込めませんでした。名前と保存設定は確認できます。', retry: () => void request.run(load) });
  };
  useEffect(() => {
    if (!active) return;
    setLoading(true);
    void request.run(async signal => { try { await load(signal); } finally { if (!signal.aborted) setLoading(false); } });
  }, [active, revision]);
  useEffect(() => () => { atlasUrls.current.forEach(url => URL.revokeObjectURL(url)); atlasUrls.current = []; }, [active]);
  return <SettingsView pets={active ? pets : []} currentId={state.saved?.selectedCompanionId ?? null} currentVisible={state.saved?.visible} form={state.form} loading={loading} busy={request.busy} dirty={state.dirty} notice={request.notice}
    extra={(request.notice?.kind === 'error' || state.dirty) && <details><summary>保存済みの設定を確認</summary><p>{state.saved ? `表示：${state.saved.visible ? 'ON' : 'OFF'}、サイズ：${state.saved.size === 'small' ? '小' : '中'}、動きを減らす：${state.saved.reducedMotion ? 'ON' : 'OFF'}` : '設定を取得できていません。'}</p><button className="companion-button" disabled={request.busy} onClick={() => void request.run(load)}>最新の保存値を確認</button></details>}
    onChange={form => setState(previous => ({ ...previous, form, dirty: true }))}
    onImport={() => navigate('companion-import')} onCreate={() => navigate('companion-create')}
    onSave={() => void request.run(async signal => {
      if (!state.saved) throw new Error('保存する前に相棒の設定を読み込んでください。');
      await request.mutate('updateCompanionSettings', { version: state.saved.version, body: { selectedCompanionId: state.form.selectedId, visible: state.form.visible, size: state.form.size, reducedMotion: state.form.reducedMotion } });
      const { data: saved } = await api.request('getCompanionSettings', { signal });
      if (signal.aborted) return;
      setState({ form: settingsForm(saved), saved, dirty: false });
      request.setNotice({ kind: 'success', text: '相棒と表示設定を保存しました。' }); notifyCompanionSaved();
    })}/>;
}

function ImportScreen({ active = true, navigate, back, route }: ScreenProps) {
  const [state, setState] = useScreenState<{ form: ImportForm; inspected: CompanionImport | null; confirmed: boolean; viewed: string[] }>({ form: { file: null, register: true, makeCurrent: false }, inspected: null, confirmed: false, viewed: [] });
  const [actions, setActions] = useState<PreviewAction[]>([]);
  const [previewAttempt, setPreviewAttempt] = useState(0);
  const request = useCompanionRequests(active);
  const uploadIdentity = useRef<string | undefined>(undefined);
  const selectFile = (file: File | null) => {
    setState(previous => ({ ...previous, form: { ...previous.form, file }, inspected: null, confirmed: false, viewed: [] }));
    request.setNotice(undefined);
    uploadIdentity.current = crypto.randomUUID();
    if (!file) return;
    if (file.size > 50_000_000) { request.setNotice({ kind: 'error', text: 'ZIPは50MB以下にしてください。現在の相棒は変更していません。' }); return; }
    void request.run(async signal => {
      const inspected = await request.mutate('importCompanionZip', { body: uploadBody(file) }, uploadIdentity.current);
      if (signal.aborted) return;
      setState(previous => ({ ...previous, inspected }));
    });
  };
  useEffect(() => {
    if (!active || !route.params.importId || state.inspected) return;
    void request.run(async signal => {
      const { data: inspected } = await api.request('getCompanionImport', { path: { importId: route.params.importId }, signal });
      if (!signal.aborted) setState(previous => ({ ...previous, inspected, confirmed: false, viewed: [] }));
    });
  }, [active, route.params.importId]);
  useEffect(() => {
    setActions([]);
    if (!active || !state.inspected) return;
    const controller = new AbortController(); let url: string | undefined;
    void loadAtlas(state.inspected.id, controller.signal).then(atlas => {
      url = atlas.url;
      if (controller.signal.aborted) { URL.revokeObjectURL(url); return; }
      setActions(v2Actions(url, atlas.imported.requiredActions));
    }).catch(error => {
      if (!controller.signal.aborted) request.setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'プレビューを読み込めませんでした。', retry: () => setPreviewAttempt(value => value + 1) });
    });
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url); };
  }, [active, state.inspected?.id, previewAttempt]);
  const confirm = () => {
    if (state.confirmed) { setState(previous => ({ ...previous, confirmed: false })); return; }
    if (!state.inspected || !state.inspected.requiredActions.length || !state.inspected.requiredActions.every(action => state.viewed.includes(action))) {
      request.setNotice({ kind: 'error', text: 'すべての動作プレビューを確認してから登録してください。' }); return;
    }
    void request.run(async signal => {
      const inspected = await request.mutate('confirmCompanionImport', { path: { importId: state.inspected!.id }, version: state.inspected!.version, body: { actions: state.inspected!.requiredActions } });
      if (!signal.aborted) setState(previous => ({ ...previous, inspected, confirmed: true }));
    });
  };
  return <ImportView form={state.form} onChange={form => setState(previous => ({ ...previous, form }))} onFile={selectFile} actions={active ? actions : []} confirmed={state.confirmed} viewedCount={state.viewed.length}
    onViewed={id => setState(previous => previous.viewed.includes(id) ? previous : { ...previous, viewed: [...previous.viewed, id] })} onConfirm={confirm}
    inspected={Boolean(state.inspected)} candidate={Boolean(route.params.generationId)} busy={request.busy} notice={request.notice} onCancel={back}
    onRegister={() => void request.run(async signal => {
      if (!state.inspected || !state.confirmed || !state.form.register) return;
      if (route.params.generationId) {
        const { data: generation } = await api.request('getCompanionGeneration', { path: { generationId: route.params.generationId }, signal });
        if (generation.resultImportId !== state.inspected.id) throw new Error('候補が更新されています。制作画面から最新の候補を確認してください。');
        const companion = await request.mutate('adoptCompanionGeneration', { path: { generationId: generation.id }, version: generation.version });
        await api.request('getCompanion', { path: { companionId: companion.id }, signal });
        if (!signal.aborted) { notifyCompanionSaved(); navigate('companion-settings', { companionId: companion.id }); }
        return;
      }
      const settings = state.form.makeCurrent ? (await api.request('getCompanionSettings', { signal })).data : null;
      const result = await request.mutate('registerCompanionImport', { path: { importId: state.inspected.id }, version: state.inspected.version, body: { selectCurrent: state.form.makeCurrent, ...(settings ? { settingsVersion: settings.version } : {}) } });
      await api.request('getCompanion', { path: { companionId: result.companion.id }, signal });
      if (signal.aborted) return;
      setState({ form: { file: null, register: true, makeCurrent: false }, inspected: null, confirmed: false, viewed: [] });
      notifyCompanionSaved(); navigate('companion-settings', { companionId: result.companion.id });
    })}/>;
}

function CreateScreen({ active = true, navigate, route }: ScreenProps) {
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

const layout = { header: 'back', contentPadding: 'none', bottomNav: false, background: 'soft' } as const;
export const screens: ScreenDefinition[] = [
  { id: 'companion-settings', title: '相棒の管理', component: SettingsScreen, layout },
  { id: 'companion-import', title: 'ファイルから追加', component: ImportScreen, layout },
  { id: 'companion-create', title: '相棒の制作', component: CreateScreen, layout },
];
