import { validateTrialPreview } from './preview.ts';
import { randomUUID } from 'node:crypto';
import { projectResolutions, resolveDeclarations } from './declarations.ts';
import { PluginRegistry, pluginRegistry } from './registry.ts';
import { getPluginState, PluginStore } from './store.ts';
import { PluginError, type ConflictResolution, type PluginSetting, type PluginSnapshot, type Settings } from './types.ts';

type Confirmation = { confirmed: true; stateRevision: string; resolutions?: ConflictResolution[] };
export type InstallInput = Confirmation & { id: string; pluginVersion: string; enabled: boolean; settings: Settings; icon?: string };
export type PatchInput = { enabled?: boolean; settings?: Settings; icon?: string; resolutions?: ConflictResolution[] };
export class PluginService {
  constructor(public store: PluginStore, public registry: PluginRegistry = pluginRegistry) {}
  state() { return getPluginState(this.store.db,this.store.context); }
  catalog() { return { items: this.registry.list().map(r => ({ ...structuredClone(r.manifest), installed: this.store.list().find(s => s.id === r.manifest.id) ?? null, versions: this.registry.versions(r.manifest.id) })) }; }
  trial(id: string, version: string | undefined, settings?: Settings, icon?: string) {
    const snapshot = this.registry.snapshot(id,version,settings,icon);
    const state = this.state(), retained = this.store.retained(id);
    const candidate: PluginSetting = { ...snapshot,id,installId: retained?.installId ?? 'trial', version: retained?.version ?? 1, createdAt: retained?.createdAt ?? Date.now(), updatedAt: Date.now(), enabled: true, previousVersion: retained?.pluginVersion ?? null };
    const preview = validateTrialPreview(this.registry.get(id,snapshot.pluginVersion).trial(structuredClone(snapshot.settings)));
    return { snapshot, stateRevision: state.revision, preview, conflicts: resolveDeclarations([...state.items.filter(p => p.id !== id),candidate],this.store.resolutions()).conflicts };
  }
  private confirm(input: Confirmation) {
    if (input.confirmed !== true) throw new PluginError(422,'CONFIRMATION_REQUIRED','変更内容を確認してから導入してください');
    if (!input.stateRevision || input.stateRevision !== this.state().revision) throw new PluginError(409,'INPUT_CHANGED','導入状態が変わりました。変更内容を確認し直してください');
  }
  private checkVersion(item: PluginSetting, expected: number) {
    if (!Number.isSafeInteger(expected) || expected < 1) throw new PluginError(428,'VERSION_REQUIRED','現在の保存版が必要です');
    if (item.version !== expected) throw new PluginError(412,'VERSION_CONFLICT','別の操作で設定が変更されました');
  }
  private apply(candidate: PluginSetting, expected: number | null, choices: ConflictResolution[] = [], previous?: PluginSnapshot) {
    const state = this.state(), proposed = [...state.items.filter(i => i.id !== candidate.id),candidate];
    const saved=this.store.resolutions();
    const effective = resolveDeclarations(proposed,[...choices,...projectResolutions(state.items,proposed,saved),...saved]);
    if (effective.conflicts.length) throw new PluginError(409,'PLUGIN_CONFLICT','同じ対象への表示を選んでください',{conflicts: effective.conflicts});
    // Reject stale/malformed submitted choices, including misspelled strategies or unknown hashes.
    if (choices.some(c => !effective.resolutions.some(r => JSON.stringify(r) === JSON.stringify(c)))) throw new PluginError(409,'INPUT_CHANGED','競合対象が変わりました。選び直してください');
    this.store.save(candidate,expected,previous);
    this.store.saveResolutions(effective.resolutions);
    return this.store.get(candidate.id);
  }
  async prepareInstall(input: InstallInput) {
    const snapshot=this.registry.snapshot(input.id,input.pluginVersion,input.settings,input.icon);
    await this.registry.prepare(input.id,snapshot.pluginVersion,snapshot.settings,this.store.context);
    return snapshot;
  }
  installPrepared(input: InstallInput, snapshot: PluginSnapshot) {
    return this.store.atomic(() => {
      this.confirm(input);
      if (this.state().items.some(p => p.id === input.id)) throw new PluginError(409,'STATE_CONFLICT','この機能は導入済みです');
      const retained = this.store.retained(input.id), now = Date.now();
      return this.apply({ ...snapshot,id: input.id,installId: retained?.installId ?? randomUUID(),version: (retained?.version ?? 0)+1,createdAt: retained?.createdAt ?? now,updatedAt: now,enabled: input.enabled,previousVersion: retained?.previousVersion ?? null },retained?.version ?? null,input.resolutions);
    });
  }
  async install(input: InstallInput) {
    this.confirm(input);
    return this.installPrepared(input,await this.prepareInstall(input));
  }
  patch(id: string, expected: number, input: PatchInput) {
    return this.store.atomic(() => {
      const current = this.store.get(id); this.checkVersion(current,expected);
      if (input.enabled === undefined && input.settings === undefined && input.icon === undefined && input.resolutions === undefined) throw new PluginError(422,'VALIDATION_FAILED','変更する設定が必要です');
      const snapshot = this.registry.snapshot(id,current.pluginVersion,input.settings ?? current.settings,input.icon ?? current.icon);
      return this.apply({ ...current,...snapshot,version: expected+1,updatedAt: Date.now(),enabled: input.enabled ?? current.enabled },expected,input.resolutions);
    });
  }
  async prepareUpdate(id: string, input: {pluginVersion:string}) {
    const current=this.store.get(id);
    const snapshot=this.registry.snapshot(id,input.pluginVersion,current.settings,current.icon);
    await this.registry.prepare(id,snapshot.pluginVersion,snapshot.settings,this.store.context);
    return snapshot;
  }
  updatePrepared(id: string, expected: number, input: Confirmation & {pluginVersion:string}, snapshot: PluginSnapshot) {
    return this.store.atomic(() => {
      const current=this.store.get(id);
      this.checkVersion(current,expected); this.confirm(input);
      if (current.pluginVersion===input.pluginVersion) throw new PluginError(409,'STATE_CONFLICT','同じ版が導入されています');
      return this.apply({ ...current,...snapshot,previousVersion: current.pluginVersion,version: expected+1,updatedAt: Date.now() },expected,input.resolutions,current);
    });
  }
  async update(id: string, expected: number, input: Confirmation & { pluginVersion: string }) {
    this.checkVersion(this.store.get(id),expected);this.confirm(input);
    return this.updatePrepared(id,expected,input,await this.prepareUpdate(id,input));
  }
  rollback(id: string, expected: number, input: Confirmation) {
    return this.store.atomic(() => {
      const current = this.store.get(id); this.checkVersion(current,expected); this.confirm(input);
      const previous = this.store.previous(id);
      return this.apply({ ...current,...previous,enabled: current.enabled,previousVersion: current.pluginVersion,version: expected+1,updatedAt: Date.now() },expected,input.resolutions,current);
    });
  }
  remove(id: string, expected: number) {
    this.store.atomic(() => {
      this.checkVersion(this.store.get(id),expected);
      const before=this.store.list(), after=before.filter(item=>item.id!==id), saved=this.store.resolutions();
      const effective=resolveDeclarations(after,[...projectResolutions(before,after,saved),...saved]);
      if (effective.conflicts.length) throw new PluginError(409,'PLUGIN_CONFLICT','削除後に残す表示を選んでください',{conflicts:effective.conflicts});
      this.store.remove(id,expected);
      this.store.saveResolutions(effective.resolutions);
    });
  }
}
