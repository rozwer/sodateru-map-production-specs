import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { ScreenDefinition, ScreenProps } from '../../app/contracts';
import { useScreenState } from '../../app/useScreenState';
import { api } from '../../app/api';
import type { Companion, CompanionImport, CompanionSettings } from '../../../packages/api-client/index';
import { ImportView, SettingsView, type CompanionCard, type ImportForm, type PreviewAction, type SettingsForm } from './views';
import { companionRevision, notifyCompanionSaved, subscribeCompanion, useCompanionRequests } from './requests';
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
    let cursor = list.nextCursor;
    while (cursor) {
      const next = await api.request('listCompanions', { query: { cursor }, signal });
      list.items.push(...next.items); cursor = next.nextCursor;
      if (signal.aborted) return;
      setPets(list.items.map((pet: Companion) => ({ id: pet.id, name: pet.name })));
    }
    const previews = await Promise.allSettled(list.items.map(async (pet: Companion) => ({ pet, atlas: await loadAtlas(pet.importId, signal) })));
    const nextUrls = previews.flatMap(result => result.status === 'fulfilled' ? [result.value.atlas.url] : []);
    if (signal.aborted) { nextUrls.forEach(url => URL.revokeObjectURL(url)); return; }
    atlasUrls.current.forEach(url => URL.revokeObjectURL(url)); atlasUrls.current = nextUrls;
    setPets(list.items.map((pet: Companion, index: number) => {
      const result = previews[index];
      if (result?.status !== 'fulfilled') return { id: pet.id, name: pet.name };
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
    onImport={() => navigate('companion-import')}
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

const layout = { header: 'back', contentPadding: 'none', bottomNav: false, background: 'soft' } as const;
export const screens: ScreenDefinition[] = [
  { id: 'companion-settings', title: '相棒の管理', component: SettingsScreen, layout },
  { id: 'companion-import', title: 'ファイルから追加', component: ImportScreen, layout },
];
