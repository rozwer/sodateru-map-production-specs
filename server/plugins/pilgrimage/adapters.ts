import type { DatabaseSync } from 'node:sqlite';
import { getPluginState } from '../../features/plugins/index.ts';
import { placesService } from '../../features/places/service.ts';
import { createRoutesService } from '../../features/routes/index.ts';
import type { Dependencies } from './types.ts';
import { PilgrimageService } from './service.ts';
import { searchSources } from './sources.ts';
export function createPilgrimageService(db:DatabaseSync,ai?:Dependencies['ai']) {
 return new PilgrimageService(db,{search:searchSources,pluginState:getPluginState,places:placesService,
  routes:createRoutesService,
  ai});
}
