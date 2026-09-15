/** Stable icon IDs; symbol is the exact text glyph used by menu and map markers. */
export const pluginIcons = [
  {id:'pin',label:'ピン',symbol:'📍'},
  {id:'motorcycle',label:'バイク',symbol:'🏍️'},
  {id:'shield',label:'防災',symbol:'🛡️'},
  {id:'book',label:'作品',symbol:'📖'},
  {id:'star',label:'星',symbol:'⭐'},
  {id:'map',label:'地図',symbol:'🗺️'},
] as const;
export type PluginIconId = typeof pluginIcons[number]['id'];
export function isPluginIcon(value:unknown):value is PluginIconId {
  return pluginIcons.some(icon=>icon.id===value);
}
