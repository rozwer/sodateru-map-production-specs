import type { DatabaseSync } from 'node:sqlite';
import { getPluginState } from '../../features/plugins/index.ts';
import { placesService } from '../../features/places/service.ts';
import { createRoutesService } from '../../features/routes/index.ts';
import { assertRunAdoptable, appendAppliedRef } from '../../ai/index.ts';
import { PilgrimageService } from './service.ts';
import { searchSources } from './sources.ts';
export function createPilgrimageService(db:DatabaseSync) {
 return new PilgrimageService(db,{search:searchSources,pluginState:getPluginState,places:placesService,
  routes:createRoutesService,
  ai:{assertRunAdoptable,appendAppliedRef}});
}
