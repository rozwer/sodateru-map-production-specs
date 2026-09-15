import { readFileSync } from 'node:fs';
import { defineFeature } from '../../core/features.ts';
import { CommonError } from '../../core/errors.ts';
import { PluginService } from './service.ts';
import { PluginStore } from './store.ts';
import { PluginError } from './types.ts';
import { pluginSettingPage } from './pagination.ts';

// Mutation handlers connect to CORE's durable replay wrapper when it is provided.
export default defineFeature({
  id:'PLUGINS',
  migrations:[{id:'plugins-001',sql:readFileSync(new URL('../../db/migrations/plugins/001-plugins.sql',import.meta.url),'utf8')}],
  register(api) {
    const run = (fn: () => unknown) => {
      try { return fn(); }
      catch (e) { if (e instanceof PluginError) throw new CommonError(e.code,e.message,false,e.details,e.status); throw e; }
    };
    api.get('/plugins', c => c.json(run(() => new PluginService(new PluginStore(c.get('db'),c.get('context'))).catalog())));
    api.get('/plugin-state', c => c.json(run(() => ({data:new PluginService(new PluginStore(c.get('db'),c.get('context'))).state()}))));
    api.get('/plugin-settings', c => c.json(run(() => pluginSettingPage(new PluginStore(c.get('db'),c.get('context')).list(),c.get('context'),c.req.query()))));
    api.get('/plugin-settings/:pluginId', c => c.json(run(() => ({data:new PluginStore(c.get('db'),c.get('context')).get(c.req.param('pluginId'))}))));
    api.get('/plugins/:pluginId/versions', c => c.json(run(() => ({items:new PluginService(new PluginStore(c.get('db'),c.get('context'))).registry.versions(c.req.param('pluginId'))}))));
  },
});
