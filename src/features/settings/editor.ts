import { useEffect, useRef, useState } from 'react';
import { api } from '../../app/api';
import { useScreenState } from '../../app/useScreenState';
import type { Person, Settings, SettingsPatch } from '../../../packages/api-client/index';

export type EditorDraft = { person: Person; settings: Settings; photo: File | null; removePhoto: boolean };
type EditorState = { draft: EditorDraft | null; savedPerson: Person | null; savedSettings: Settings | null };
const settingKeys = ['display', 'location', 'media', 'ai', 'notifications', 'retention', 'suggestions', 'profileVisibility'] as const;
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
function isDirty(state: EditorState) {
  const draft = state.draft;
  return !!draft && (!!draft.photo || draft.removePhoto || ['name','bio'].some(key => draft.person[key as 'name' | 'bio'] !== state.savedPerson?.[key as 'name' | 'bio']) || settingKeys.some(key => !equal(draft.settings[key], state.savedSettings?.[key])));
}
function reconcile(state: EditorState, person: Person, settings: Settings): EditorState {
  if (!state.draft || !state.savedPerson || !state.savedSettings) return { savedPerson: person, savedSettings: settings, draft: { person, settings, photo: null, removePhoto: false } };
  const previous = state.draft;
  const retained = Object.fromEntries(settingKeys.map(key => [key, equal(previous.settings[key], state.savedSettings?.[key]) ? settings[key] : previous.settings[key]]));
  return { savedPerson: person, savedSettings: settings, draft: { ...previous, person: { ...person, name: previous.person.name === state.savedPerson.name ? person.name : previous.person.name, bio: previous.person.bio === state.savedPerson.bio ? person.bio : previous.person.bio }, settings: { ...settings, ...retained } } };
}
export function useSettingsEditor(scopeKey: string, active = true) {
  const [state, setState] = useScreenState<EditorState>({ draft: null, savedPerson: null, savedSettings: null });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [conflict, setConflict] = useState(false);
  const running = useRef(false);
  const abort = useRef<AbortController | null>(null);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (!active) return;
    const controller = new AbortController(); abort.current = controller;
    setBusy(true); setError('');
    Promise.all([api.request('getMe', { signal: controller.signal }), api.request('getMeSettings', { signal: controller.signal })]).then(([person, settings]) => {
      if (controller.signal.aborted) return;
      if (isDirty(state) && (state.savedPerson?.version !== person.data.version || state.savedSettings?.version !== settings.data.version)) setConflict(true);
      setState(previous => reconcile(previous, person.data, settings.data));
    }).catch(e => { if (!controller.signal.aborted) setError(errorText(e)); }).finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [scopeKey, reload, active]);
  const update = (change: (draft: EditorDraft) => EditorDraft) => { setState(previous => ({ ...previous, draft: previous.draft && change(previous.draft) })); setNotice(''); };
  const updateSettings = (patch: SettingsPatch) => update(draft => ({ ...draft, settings: { ...draft.settings, ...patch } }));
  const dirty = isDirty(state);
  async function save(patch: SettingsPatch, profile = false) {
    if (!active || running.current || !state.draft || !state.savedSettings || !state.savedPerson) return;
    running.current = true; setBusy(true); setError(''); setNotice('');
    let savedPerson = state.savedPerson;
    let savedSettings = state.savedSettings;
    let completed = '';
    let photoSaved = false;
    const signal = abort.current?.signal;
    try {
      if (profile) {
        const personPatch = { name: state.draft.person.name.trim(), bio: state.draft.person.bio };
        if (!personPatch.name || [...personPatch.name].length > 20 || [...personPatch.bio].length > 200) throw new Error('表示名は1〜20文字、紹介は200文字以内で入力してください。');
        if (personPatch.name !== savedPerson.name || personPatch.bio !== savedPerson.bio) {
          savedPerson = (await api.request('patchMe', { body: personPatch, version: savedPerson.version, signal })).data;
          completed = '名前と紹介は保存済みです。';
        }
        if (state.draft.photo) {
          const body = new FormData(); body.set('file', state.draft.photo);
          savedPerson = (await api.request('patchMeIcon', { body, version: savedPerson.version, signal })).data;
          completed = 'プロフィールは保存済みです。'; photoSaved = true;
        } else if (state.draft.removePhoto) {
          await api.request('deleteMeIcon', { version: savedPerson.version, signal });
          savedPerson = (await api.request('getMe', { signal })).data; photoSaved = true;
        }
      }
      const changed = Object.entries(patch).some(([key, value]) => JSON.stringify(value) !== JSON.stringify(savedSettings[key as keyof Settings]));
      if (changed) { savedSettings = (await api.request('patchMeSettings', { body: patch, version: savedSettings.version, signal })).data; completed += '設定は保存済みです。再取得を確認してください。'; }
      const [person, settings] = await Promise.all([api.request('getMe', { signal }), api.request('getMeSettings', { signal })]);
      setState({ savedPerson: person.data, savedSettings: settings.data, draft: { person: person.data, settings: settings.data, photo: null, removePhoto: false } });
      setConflict(false); setNotice('保存しました。保存済みの内容を再取得しました。');
      window.dispatchEvent(new Event('sodateru:settings-changed'));
    } catch (e) {
      if (signal?.aborted) return;
      setState(previous => ({ ...previous, savedPerson, savedSettings, draft: previous.draft ? { ...previous.draft, person: { ...previous.draft.person, version: savedPerson.version }, ...(photoSaved ? { photo: null, removePhoto: false } : {}) } : null }));
      setError(completed + errorText(e));
      setConflict(typeof e === 'object' && e !== null && 'status' in e && [409, 412].includes(Number(e.status)));
    } finally { running.current = false; if (!signal?.aborted) setBusy(false); }
  }
  return { ...state, busy, error, notice, conflict, dirty, update, updateSettings, save, refresh: () => setReload(v => v + 1), reloadSaved: () => { setState(p => ({ ...p, draft: null })); setReload(v => v + 1); }, discard: () => { setState(p => ({ ...p, draft: p.savedPerson && p.savedSettings ? { person: p.savedPerson, settings: p.savedSettings, photo: null, removePhoto: false } : null })); setConflict(false); setNotice('保存済みの内容に戻しました。'); } };
}
export function errorText(error: unknown): string { return error instanceof Error ? error.message : '通信に失敗しました。入力を保持しています。'; }
