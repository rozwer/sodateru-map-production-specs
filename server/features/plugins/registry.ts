import { isPluginIcon } from './icons.ts';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { PluginError, type PluginContext, type PluginRelease, type Settings } from './types.ts';
import { validateDeclarations } from './declarations.ts';

/** BIKE/DISASTER/PILGRIMAGE register releases here from their feature registration. */
export class PluginRegistry {
  private releases = new Map<string, PluginRelease[]>();
  private validators = new Map<string, ReturnType<Ajv2020['compile']>>();
  private ajv = new Ajv2020({ allErrors: true, strict: false });
  constructor() { addFormats(this.ajv); }
  register(release: PluginRelease) {
    const m = release.manifest;
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(m.id) || !m.pluginVersion || !m.name || !m.author || !isPluginIcon(m.icon) || !Number.isFinite(m.updatedAt)) throw new Error('Invalid plugin manifest');
    const versions = this.releases.get(m.id) ?? [];
    if (versions.some(r => r.manifest.pluginVersion === m.pluginVersion)) throw new Error(`Duplicate plugin release: ${m.id}@${m.pluginVersion}`);
    const validate = this.ajv.compile(m.settingsSchema);
    if (!validate(m.defaultSettings)) throw new Error(`Invalid default settings: ${m.id}`);
    validateDeclarations(release.declarations(structuredClone(m.defaultSettings)));
    const frozen = { ...release, manifest: structuredClone(m) };
    versions.push(frozen);
    this.releases.set(m.id, versions);
    this.validators.set(`${m.id}@${m.pluginVersion}`, validate);
  }
  get(id: string, pluginVersion?: string): PluginRelease {
    const versions = this.releases.get(id);
    const release = pluginVersion ? versions?.find(r => r.manifest.pluginVersion === pluginVersion) : versions?.at(-1);
    if (!release) throw new PluginError(404, 'NOT_FOUND', '指定した拡張機能の版がありません');
    return release;
  }
  list() { return [...this.releases.values()].map(r => r.at(-1)!).sort((a,b) => (a.manifest.order ?? 0) - (b.manifest.order ?? 0) || a.manifest.id.localeCompare(b.manifest.id)); }
  versions(id: string) { this.get(id); return this.releases.get(id)!.map(r => structuredClone(r.manifest)); }
  validate(id: string, pluginVersion: string, settings: Settings) {
    this.get(id, pluginVersion);
    const validate = this.validators.get(`${id}@${pluginVersion}`)!;
    if (!validate(settings)) throw new PluginError(422, 'VALIDATION_FAILED', '機能の設定項目を確認してください', { fields: validate.errors });
  }
  snapshot(id: string, pluginVersion: string | undefined, settings?: Settings, icon?: string) {
    const release = this.get(id, pluginVersion), manifest = structuredClone(release.manifest);
    const values = structuredClone(settings ?? manifest.defaultSettings);
    this.validate(id, manifest.pluginVersion, values);
    if (icon !== undefined && !isPluginIcon(icon)) throw new PluginError(422, 'VALIDATION_FAILED', 'カタログのアイコン候補から選んでください');
    return { pluginVersion: manifest.pluginVersion, settings: values, icon: icon ?? manifest.icon, manifest, declarations: validateDeclarations(release.declarations(structuredClone(values))) };
  }
  async prepare(id: string, version: string, settings: Settings, context: PluginContext) {
    context.signal.throwIfAborted();
    try { await this.get(id, version).prepare?.(structuredClone(settings), context); }
    catch (error) { if (context.signal.aborted) throw error; throw new PluginError(502, 'PLUGIN_PREPARATION_FAILED', '準備に失敗しました。導入済みの版と設定は変更していません'); }
    context.signal.throwIfAborted();
  }
}
export const pluginRegistry = new PluginRegistry();
export const registerPlugin = (release: PluginRelease) => pluginRegistry.register(release);
