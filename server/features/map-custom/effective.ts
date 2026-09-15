import type { MapSettings, MapLayers } from './domain.ts';
import type { PluginState } from '../plugins/types.ts';

export function effectiveSettings(settings: MapSettings, state: PluginState) {
  const effectiveLayers: MapLayers = { ...settings.layers, plugins: { ...settings.layers.plugins }, bike: false };
  for (const key of Object.keys(effectiveLayers.plugins)) effectiveLayers.plugins[key] = false;
  const pluginDisplays = state.plugins.map(plugin => {
    const bike = plugin.resolvedDeclarations.some(d => d.targetKey === 'layer:bike' && d.property === 'visibility' && d.value === true);
    const requested = Object.hasOwn(settings.layers.plugins, plugin.pluginId)
      ? settings.layers.plugins[plugin.pluginId] === true : (bike && settings.layers.bike);
    const visible = requested && plugin.enabled && plugin.resolvedDeclarations.length > 0;
    effectiveLayers.plugins[plugin.pluginId] = visible;
    if (visible && bike && settings.layers.bike) effectiveLayers.bike = true;
    return { pluginId: plugin.pluginId, ownerKey: plugin.ownerKey, visible,
      resolvedDeclarations: visible ? plugin.resolvedDeclarations : [] };
  });
  return { ...settings, effectiveLayers, pluginSnapshot: state.revision, pluginDisplays };
}
