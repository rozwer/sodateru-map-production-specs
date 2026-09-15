import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../../app/api.ts';
import type { DisasterSettings, DisasterView, PluginSettingPatch } from '../../../../packages/api-client/index.ts';
import { createDisasterDataAdapter } from './adapter.ts';

const adapter = createDisasterDataAdapter(api);
const message = (error: unknown) => error instanceof Error ? error.message : '防災情報を読み込めませんでした。';
interface State { scopeKey: string; view: DisasterView | null; busy: boolean; error: string | null }

/** Uses the existing app client/session mode. Scope changes abort requests and discard old-person results. */
export function useDisasterData(scopeKey: string) {
  const [state, setState] = useState<State>({ scopeKey, view: null, busy: true, error: null });
  const pending = useRef<AbortController | null>(null);
  const currentView = state.scopeKey === scopeKey ? state.view : null;
  const run = useCallback(async (operation: (signal: AbortSignal) => Promise<{ view: DisasterView | null; error?: unknown }>) => {
    pending.current?.abort();
    const controller = new AbortController(); pending.current = controller;
    setState(old => ({ scopeKey, view: old.scopeKey === scopeKey ? old.view : null, busy: true, error: null }));
    try {
      const result = await operation(controller.signal);
      if (!controller.signal.aborted) setState({ scopeKey, view: result.view, busy: false, error: result.error ? message(result.error) : null });
    } catch (error) {
      if (!controller.signal.aborted) setState(old => ({ ...old, busy: false, error: message(error) }));
    }
  }, [scopeKey]);
  const load = useCallback(() => run(async signal => ({ view: await adapter.read(signal) })), [run]);
  useEffect(() => { void load(); return () => pending.current?.abort(); }, [load]);

  const refresh = useCallback(() => run(async signal => {
    const version = currentView?.settings?.version;
    if (!version) throw new Error('防災機能を導入してから更新してください。');
    return adapter.refresh({ version, idempotencyKey: crypto.randomUUID(), signal });
  }), [run, currentView]);
  const patch = useCallback((body: PluginSettingPatch) => run(async signal => {
    const version = currentView?.settings?.version;
    if (!version) throw new Error('防災機能を導入してから設定してください。');
    try {
      await api.request('patchPluginSettingsPluginId', { path: { pluginId: 'disaster' }, body, version, signal });
      return { view: await adapter.read(signal) };
    } catch (error) {
      if (signal.aborted) throw error;
      // A setting can be saved even if the follow-up read fails. Clear local material, keep the error visible.
      return { view: null, error };
    }
  }), [run, currentView]);
  return {
    view: currentView, busy: state.scopeKey !== scopeKey || state.busy,
    error: state.scopeKey === scopeKey ? state.error : null, load, refresh,
    saveSettings: (settings: DisasterSettings) => patch({ settings }),
    setEnabled: (enabled: boolean) => patch({ enabled }),
  };
}
