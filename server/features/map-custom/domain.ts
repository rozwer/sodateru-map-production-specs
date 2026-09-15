import { CommonError } from '../../core/errors.ts';

export const OBJECT_COLORS = ['teal', 'pink', 'orange', 'yellow', 'green', 'blue'] as const;
export type ObjectColor = typeof OBJECT_COLORS[number];
export interface MapObjectInput {
  name: string; memo: string; color: ObjectColor; size: 'small' | 'medium' | 'large';
  position: { longitude: number; latitude: number };
}
export interface MapObject extends MapObjectInput {
  id: string; version: number; createdAt: number; updatedAt: number;
}
export interface MapStyle {
  theme: 'default' | 'faded' | 'monochrome'; lightPreset: 'dawn' | 'day' | 'dusk' | 'night';
  showPedestrianRoads: boolean; showAdminBoundaries: boolean; showIndoor: boolean;
  colors: null | { water: string; greenspace: string; roads: string; buildings: string };
}
export interface MapLayers {
  themes: boolean; exploration: boolean; friends: boolean; bike: boolean;
  plugins: Record<string, boolean>;
}
export interface MapSettings {
  id: string; version: number; style: MapStyle; layers: MapLayers; createdAt: number; updatedAt: number;
}
export const DEFAULT_STYLE: MapStyle = {
  theme: 'default', lightPreset: 'day', showPedestrianRoads: true,
  showAdminBoundaries: false, showIndoor: false, colors: null,
};
export const DEFAULT_LAYERS: MapLayers = { themes: true, exploration: true, friends: true, bike: false, plugins: {} };

function invalid(field: string): never {
  throw new CommonError('VALIDATION_FAILED', `地図設定の入力が不正です: ${field}`, false, { field }, 422);
}
export function object(value: unknown, allowed: readonly string[], required: readonly string[] = allowed): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid('body');
  const result = value as Record<string, unknown>;
  for (const key of Object.keys(result)) if (!allowed.includes(key)) invalid(key);
  for (const key of required) if (!Object.hasOwn(result, key)) invalid(key);
  return result;
}
function string(value: unknown, field: string, min: number, max: number): string {
  if (typeof value !== 'string' || [...value].length < min || [...value].length > max) invalid(field);
  return value;
}
function choice<T extends string>(value: unknown, field: string, choices: readonly T[]): T {
  if (typeof value !== 'string' || !choices.includes(value as T)) invalid(field);
  return value as T;
}
function bool(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') invalid(field);
  return value;
}
export function validateObject(value: unknown): MapObjectInput {
  const input = object(value, ['name', 'memo', 'color', 'size', 'position']);
  const pos = object(input.position, ['longitude', 'latitude']);
  const longitude = pos.longitude, latitude = pos.latitude;
  if (typeof longitude !== 'number' || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) invalid('longitude');
  if (typeof latitude !== 'number' || !Number.isFinite(latitude) || latitude < -90 || latitude > 90) invalid('latitude');
  return { name: string(input.name, 'name', 1, 20), memo: string(input.memo, 'memo', 0, 200),
    color: choice(input.color, 'color', OBJECT_COLORS), size: choice(input.size, 'size', ['small','medium','large']),
    position: { longitude, latitude } };
}
export function validateObjectPatch(value: unknown, current: MapObject): MapObjectInput {
  const patch = object(value, ['name', 'memo', 'color', 'size', 'position'], []);
  if (!Object.keys(patch).length) invalid('body');
  const { name, memo, color, size, position } = current;
  return validateObject({ name, memo, color, size, position, ...patch });
}
export function validateStyle(value: unknown): MapStyle {
  const v = object(value, ['theme','lightPreset','showPedestrianRoads','showAdminBoundaries','showIndoor','colors']);
  let colors: MapStyle['colors'] = null;
  if (v.colors !== null) {
    const c = object(v.colors, ['water','greenspace','roads','buildings']);
    for (const key of Object.keys(c)) if (typeof c[key] !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(c[key] as string)) invalid(`colors.${key}`);
    colors = c as MapStyle['colors'];
  }
  return { theme: choice(v.theme, 'theme', ['default','faded','monochrome']),
    lightPreset: choice(v.lightPreset, 'lightPreset', ['dawn','day','dusk','night']),
    showPedestrianRoads: bool(v.showPedestrianRoads, 'showPedestrianRoads'),
    showAdminBoundaries: bool(v.showAdminBoundaries, 'showAdminBoundaries'),
    showIndoor: bool(v.showIndoor, 'showIndoor'), colors };
}
export function validateLayers(value: unknown): MapLayers {
  const v = object(value, ['themes','exploration','friends','bike','plugins']);
  if (!v.plugins || typeof v.plugins !== 'object' || Array.isArray(v.plugins)) invalid('plugins');
  const plugins: Record<string, boolean> = Object.create(null);
  for (const [key, val] of Object.entries(v.plugins)) {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,79}$/.test(key)) invalid('pluginId');
    plugins[key] = bool(val, `plugins.${key}`);
  }
  return { themes: bool(v.themes, 'themes'), exploration: bool(v.exploration, 'exploration'),
    friends: bool(v.friends, 'friends'), bike: bool(v.bike, 'bike'), plugins };
}
export function validateSettingsPatch(value: unknown, current: MapSettings): { style: MapStyle; layers: MapLayers } {
  const patch = object(value, ['style','layers'], []);
  if (!Object.keys(patch).length) invalid('body');
  return { style: Object.hasOwn(patch, 'style') ? validateStyle(patch.style) : current.style,
    layers: Object.hasOwn(patch, 'layers') ? validateLayers(patch.layers) : current.layers };
}
export function validateMapstyleResult(value: unknown): { proposal: MapStyle; explanation: string } {
  const v = object(value, ['proposal','explanation']);
  return { proposal: validateStyle(v.proposal), explanation: string(v.explanation, 'explanation', 1, 1000) };
}
