export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type Settings = Record<string, Json>;
/** The actual CORE context is structurally compatible; callers must use its resolved identity. */
export interface PluginContext { personId: string; dataMode: 'live' | 'demo'; requestId: string; signal: AbortSignal }
export interface Declaration { targetKey: string; property: string; value: Json }
export interface AppliedDeclaration extends Declaration { pluginId: string; pluginVersion: string }
export interface PluginSource { name: string; url: string; attribution: string }
export interface PluginManifest {
  id: string; name: string; description: string; category: string; author: string;
  pluginVersion: string; updatedAt: number; changeLog: string; icon: string;
  usageInfo: string[]; sources: PluginSource[]; settingsSchema: Record<string, unknown>;
  defaultSettings: Settings; trialConditions: string[]; order?: number;
}
export interface TrialPreview {
  dataKind: 'mock'; label: string; declarations: Declaration[];
  features: Json[]; warnings: string[];
}
export interface PluginRelease {
  manifest: PluginManifest;
  /** Only feature-owned code supplies declarations; never run client-supplied code. */
  declarations(settings: Settings): Declaration[];
  trial(settings: Settings): TrialPreview;
  /** Validate/load update prerequisites before committing any installed state. No writes here. */
  prepare?(settings: Settings, context: PluginContext): Promise<void>;
}
export interface PluginSnapshot {
  pluginVersion: string; settings: Settings; icon: string; declarations: Declaration[]; manifest: PluginManifest;
}
export interface PluginSetting extends PluginSnapshot {
  id: string; installId: string; version: number; createdAt: number; updatedAt: number; enabled: boolean;
  previousVersion: string | null;
}
export interface PluginConflict { key: string; targetKey: string; property: string; declarations: AppliedDeclaration[] }
export interface ConflictResolution { key: string; strategy: 'prefer' | 'coexist'; pluginIds: string[] }
export interface PluginState {
  personId: string; dataMode: 'live' | 'demo'; revision: string; items: PluginSetting[];
  appliedDeclarations: AppliedDeclaration[]; conflicts: PluginConflict[]; resolutions: ConflictResolution[];
  plugins: { pluginId: string; installId: string; ownerKey: string; installedVersion: string; version: number; enabled: boolean; resolvedDeclarations: AppliedDeclaration[] }[];
}
export class PluginError extends Error {
  constructor(public status: number, public code: string, message: string, public details: unknown = undefined) { super(message); }
}
