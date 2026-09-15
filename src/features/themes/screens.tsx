import { useEffect, useRef, useState } from 'react';
import { ApiError, type Theme } from '../../../packages/api-client/index';
import { api } from '../../app/api';
import type { ScreenDefinition, ScreenProps } from '../../app/contracts';
import { useScreenState } from '../../app/useScreenState';
import { InsightStatus } from '../insights/InsightViews';
import { isCancelled, recordWithPhoto, requestError } from '../insights/data';
import { ThemesView, ThemeEditView } from './ThemeViews';
import { themesMessages as m } from './messages';
import type { ThemeDraft, ThemeRecordView, ThemeView } from './types';
import { notifyThemeSaved, useThemeRevision } from './revisions';
import { savePhoto, sameTheme, themeBody, themeView, type PhotoAttempt } from './data';

function ThemesScreen({ navigate, route, scopeKey, active = true }: ScreenProps) {
  const [model, setModel] = useScreenState<{ selectedId: string | null }>({ selectedId: route.params.themeId ?? null });
  const [items, setItems] = useState<ThemeView[]>([]), [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null), [loading, setLoading] = useState(true), [reload, setReload] = useState(0);
  const revision = useThemeRevision(scopeKey), moreController = useRef<AbortController | null>(null), fetchingMore = useRef(false);
  useEffect(() => {
    if (!active) return;
    const controller = new AbortController(); setLoading(true); setError(null);
    void api.request('getThemes', { query: { limit: 100 }, signal: controller.signal }).then(async result => {
      const views = await Promise.all(result.items.map(theme => themeView(theme, controller.signal)));
      if (!controller.signal.aborted) { setItems(views); setCursor(result.nextCursor); }
    }).catch(error => { if (!controller.signal.aborted && !isCancelled(error)) setError(requestError(error)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { controller.abort(); moreController.current?.abort(); };
  }, [scopeKey, reload, revision, active]);
  async function more() {
    if (!cursor || fetchingMore.current) return;
    const controller = new AbortController(); moreController.current = controller; fetchingMore.current = true; setLoading(true);
    try { const result = await api.request('getThemes', { query: { limit: 100, cursor }, signal: controller.signal }); const views = await Promise.all(result.items.map(theme => themeView(theme, controller.signal))); if (!controller.signal.aborted) { setItems(previous => [...previous, ...views.filter(item => !previous.some(old => old.id === item.id))]); setCursor(result.nextCursor); } }
    catch (error) { if (!controller.signal.aborted && !isCancelled(error)) setError(requestError(error)); }
    finally { fetchingMore.current = false; if (!controller.signal.aborted) setLoading(false); }
  }
  return <ThemesView themes={items} selectedId={model.selectedId} onSelect={selectedId => setModel({ selectedId })} onCreate={() => navigate('theme-edit')}
    onEdit={themeId => navigate('theme-edit', { themeId })} onMap={themeId => navigate('personal-map', { themeId })}
    status={{ loading, error }} onRetry={() => setReload(value => value + 1)} onMore={cursor ? () => void more() : undefined}/>;
}

function ThemeEditScreen({ route, navigate, back, scopeKey, active = true }: ScreenProps) {
  const [model, setModel] = useScreenState<{ draft: ThemeDraft | null; baseline: Theme | null; dirty: boolean }>({ draft: null, baseline: null, dirty: false });
  const [records, setRecords] = useState<ThemeRecordView[]>([]), [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null), [unavailable, setUnavailable] = useState(false), [reload, setReload] = useState(0);
  const mutation = useRef<AbortController | null>(null), mutationBusy = useRef(false), moreBusy = useRef(false), moreController = useRef<AbortController | null>(null);
  const photoAttempt = useRef<PhotoAttempt | null>(null);
  const creation = useRef<{ id: string; key: string; signature: string } | null>(null);
  const [conflict, setConflict] = useState<ThemeView | null>(null);
  const timeZone = route.params.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  useEffect(() => { if (!active) { mutation.current?.abort(); setBusy(false); } return () => { mutation.current?.abort(); moreController.current?.abort(); }; }, [scopeKey, active]);
  useEffect(() => {
    if (!active) return;
    const controller = new AbortController(); setLoading(true); setError(null); setUnavailable(false);
    void (async () => {
      const [theme, page] = await Promise.all([
        route.params.themeId ? api.request('getThemesThemeId', { path: { themeId: route.params.themeId }, signal: controller.signal }).then(result => result.data) : Promise.resolve(null),
        api.request('getRecords', { query: { limit: 100, includeUndated: true }, signal: controller.signal }),
      ]);
      const recordViews = await Promise.all(page.items.map(record => recordWithPhoto(record, timeZone, controller.signal)));
      const view = theme ? await themeView(theme, controller.signal) : null;
      if (controller.signal.aborted) return;
      setRecords(recordViews); setCursor(page.nextCursor);
      setModel(previous => previous.draft ? previous : { draft: { name: theme?.name ?? '', description: theme?.description ?? '', color: theme?.colorKey ?? 'teal', recordIds: theme?.recordIds ?? [], photoFile: null, photoUrl: view?.photoUrl ?? null, coverMediaId: theme?.coverMediaId ?? null, photoRecordId: null }, baseline: theme, dirty: false });
    })().catch(error => {
      if (!controller.signal.aborted && !isCancelled(error)) { setError(requestError(error)); if (error instanceof ApiError && [403, 404].includes(error.status)) setUnavailable(true); }
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [route.params.themeId, scopeKey, timeZone, reload, active]);
  async function moreRecords() {
    if (!cursor || moreBusy.current) return;
    const controller = new AbortController(); moreController.current = controller; moreBusy.current = true; setLoading(true);
    try {
      const page = await api.request('getRecords', { query: { limit: 100, includeUndated: true, cursor }, signal: controller.signal });
      const views = await Promise.all(page.items.map(record => recordWithPhoto(record, timeZone, controller.signal)));
      if (!controller.signal.aborted) { setRecords(previous => [...previous, ...views.filter(item => !previous.some(old => old.id === item.id))]); setCursor(page.nextCursor); }
    } catch (error) { if (!controller.signal.aborted && !isCancelled(error)) setError(requestError(error)); }
    finally { moreBusy.current = false; if (!controller.signal.aborted) setLoading(false); }
  }
  async function save() {
    if (!model.draft || mutationBusy.current) return;
    let draft = model.draft;
    if (!draft.name.trim() || Array.from(draft.name).length > 20 || Array.from(draft.description).length > 100 || (draft.photoFile && !draft.photoRecordId)) return;
    const controller = new AbortController(); mutation.current = controller; mutationBusy.current = true; setBusy(true); setError(null); setConflict(null);
    let baseline = model.baseline;
    try {
      if (draft.photoFile && draft.photoRecordId) {
        if (!photoAttempt.current || photoAttempt.current.file !== draft.photoFile || photoAttempt.current.recordId !== draft.photoRecordId) photoAttempt.current = { file: draft.photoFile, recordId: draft.photoRecordId, id: crypto.randomUUID(), key: crypto.randomUUID() };
        const media = await savePhoto(photoAttempt.current, controller.signal);
        draft = { ...draft, photoFile: null, coverMediaId: media.id, photoUrl: media.contentUrl };
        if (controller.signal.aborted) return;
        setModel(previous => ({ ...previous, draft }));
      }
      const body = themeBody(draft);
      if (baseline) {
        baseline = (await api.request('patchThemesThemeId', { path: { themeId: baseline.id }, body, version: baseline.version, signal: controller.signal })).data;
      } else {
        const signature = JSON.stringify(body);
        if (!creation.current || creation.current.signature !== signature) creation.current = { id: creation.current?.id ?? crypto.randomUUID(), key: crypto.randomUUID(), signature };
        baseline = (await api.request('postThemes', { body: { id: creation.current.id, ...body }, idempotencyKey: creation.current.key, signal: controller.signal })).data;
      }
      if (controller.signal.aborted) return;
      // Preserve the returned version if the verification GET fails, avoiding another creation.
      setModel(previous => ({ ...previous, baseline }));
      const saved = (await api.request('getThemesThemeId', { path: { themeId: baseline.id }, signal: controller.signal })).data;
      if (!sameTheme(saved, draft)) {
        setModel(previous => ({ ...previous, baseline: saved })); setConflict(await themeView(saved, controller.signal));
        setError('保存後にテーマが更新されました。入力内容と現在の内容を確認してください。'); return;
      }
      if (controller.signal.aborted) return;
      setModel({ draft: null, baseline: null, dirty: false }); photoAttempt.current = null; creation.current = null;
      notifyThemeSaved(scopeKey); navigate('themes', { themeId: saved.id });
    } catch (error) {
      if (controller.signal.aborted || isCancelled(error)) return;
      if (baseline && error instanceof ApiError && [409, 412].includes(error.status)) {
        try {
          const latest = (await api.request('getThemesThemeId', { path: { themeId: baseline.id }, signal: controller.signal })).data;
          if (controller.signal.aborted) return;
          setModel(previous => ({ ...previous, baseline: latest })); setConflict(await themeView(latest, controller.signal));
        } catch (readError) { if (isCancelled(readError)) return; }
      }
      const message = error instanceof ApiError ? requestError(error) : error instanceof Error && error.message.startsWith('写真') ? error.message : requestError(error);
      setError(photoAttempt.current?.media?.status === 'ready' ? `写真は選んだ記録に追加済みです。テーマの保存はまだ確認できていません。${message}` : message);
    } finally { mutationBusy.current = false; if (!controller.signal.aborted) setBusy(false); }
  }
  async function remove() {
    if (!model.baseline || mutationBusy.current) return;
    const controller = new AbortController(); mutation.current = controller; mutationBusy.current = true; setBusy(true); setError(null);
    try {
      await api.request('deleteThemesThemeId', { path: { themeId: model.baseline.id }, version: model.baseline.version, signal: controller.signal });
      if (!controller.signal.aborted) { setModel({ draft: null, baseline: null, dirty: false }); notifyThemeSaved(scopeKey); navigate('themes'); }
    } catch (error) {
      if (!controller.signal.aborted && !isCancelled(error)) {
        if (error instanceof ApiError && [409, 412].includes(error.status)) {
          try { const latest = (await api.request('getThemesThemeId', { path: { themeId: model.baseline.id }, signal: controller.signal })).data; if (!controller.signal.aborted) { setModel(previous => ({ ...previous, baseline: latest })); setConflict(await themeView(latest, controller.signal)); } } catch (readError) { if (isCancelled(readError)) return; }
        }
        setError(requestError(error));
      }
    }
    finally { mutationBusy.current = false; if (!controller.signal.aborted) setBusy(false); }
  }
  if (unavailable || !model.draft) return <div className="themes-ui theme-editor"><InsightStatus loading={loading} error={error} onRetry={() => setReload(value => value + 1)}/>{unavailable && <button type="button" onClick={back}>{m.back}</button>}</div>;
  return <>
    {conflict && <section className="themes-ui insight-conflict"><h2>現在保存されているテーマ</h2><p>{conflict.name}</p><p>{conflict.description}</p><p>{conflict.color ? m.colors[conflict.color] : ''}・{conflict.recordIds.length}件の記録</p><p>入力中の内容と比べて、保存する内容を確認してください。</p></section>}
    <ThemeEditView title={route.params.themeId ? m.edit : m.createTitle} draft={model.draft} records={records} dirty={model.dirty} onChange={draft => setModel({ ...model, draft, dirty: true })}
    status={{ loading, busy, error }} onSave={() => void save()}
    onCancel={() => { setModel({ draft: null, baseline: null, dirty: false }); photoAttempt.current = null; creation.current = null; setConflict(null); back(); }} onDelete={model.baseline ? () => void remove() : undefined}
    onRecord={recordId => navigate('record-edit', { recordId })} onMoreRecords={cursor ? () => void moreRecords() : undefined} onRetry={() => setReload(value => value + 1)}/></>;
}

export const screens: ScreenDefinition[] = [
  { id: 'themes', title: 'わたしの地図', component: ThemesScreen, layout: { header: 'back', contentPadding: 'none', bottomNav: false, background: 'surface' } },
  { id: 'theme-edit', title: m.edit, component: ThemeEditScreen, layout: { header: 'back', contentPadding: 'none', bottomNav: false, background: 'surface' } },
];
