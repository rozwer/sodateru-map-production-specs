import type { DatabaseSync } from 'node:sqlite';
import type { RequestContext } from '../../core/context.ts';
import { getPluginState } from '../plugins/index.ts';
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
      const state = getPluginState(db,context);
      return effectiveSettings(repository.getSettings(),state);
    },
    patchSettings(version: number, input: unknown) {
      const state = getPluginState(db,context);
      const changed = validateSettingsPatch(input,repository.getSettings());
      return effectiveSettings(repository.saveSettings(version,changed),state);
    },
  };
}
