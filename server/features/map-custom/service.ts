import type { DatabaseSync } from 'node:sqlite';
import type { RequestContext } from '../../core/context.ts';
import { existsSync } from 'node:fs';
import { CommonError } from '../../core/errors.ts';
const plugins = existsSync(new URL('../plugins/index.ts', import.meta.url)) ? await import('../plugins/index.ts') : null;
import { validateObject, validateObjectPatch, validateSettingsPatch } from './domain.ts';
import { effectiveSettings } from './effective.ts';
import { MapCustomRepository } from './repository.ts';

/** Feature operations: HTTP/version/idempotency/transaction wrapping belongs to CORE. */
export function mapCustomService(db: DatabaseSync, context: RequestContext) {
  const repository = new MapCustomRepository(db,context);
  return {
    listObjects: () => ({items:repository.listObjects(),nextCursor:null}),
    getObject: (id: string) => repository.getObject(id),
    createObject: (input: unknown) => repository.createObject(validateObject(input)),
    patchObject: (id: string, version: number, input: unknown) =>
      repository.updateObject(id,version,validateObjectPatch(input,repository.getObject(id))),
    deleteObject: (id: string, version: number) => repository.deleteObject(id,version),
    getSettings() {
      if (!plugins) throw new CommonError('PROVIDER_UNAVAILABLE','拡張機能の現在状態を取得できません。',true,{},503);
      const state = plugins.getPluginState(db,context);
      return effectiveSettings(repository.getSettings(),state);
    },
    patchSettings(version: number, input: unknown) {
      if (!plugins) throw new CommonError('PROVIDER_UNAVAILABLE','拡張機能の現在状態を取得できません。',true,{},503);
      const state = plugins.getPluginState(db,context);
      const changed = validateSettingsPatch(input,repository.getSettings());
      return effectiveSettings(repository.saveSettings(version,changed),state);
    },
  };
}
