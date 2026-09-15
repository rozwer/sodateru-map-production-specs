const object = (properties: Record<string, unknown>, required = Object.keys(properties)) => ({
  type: 'object', properties, required, additionalProperties: false,
});
const boolean = { type: 'boolean' };
const choice = (...values: string[]) => ({ type: 'string', enum: values });
const id = { type: 'string', minLength: 1, maxLength: 80 };
const nullable = (schema: unknown) => ({ anyOf: [schema, { type: 'null' }] });

export const preferenceProperties = {
  display: object({ fontSize: choice('standard', 'large', 'extraLarge'), reduceMotion: boolean }),
  location: object({ enabled: boolean, saveTrack: boolean }),
  media: object({ photosEnabled: boolean, microphoneEnabled: boolean }),
  ai: object({ enabled: boolean, allowRecords: boolean, allowLocation: boolean, allowMedia: boolean, allowProfile: boolean }),
  notifications: object({ enabled: boolean, timing: choice('immediate', 'daily'), dailyAt: { type: 'string', pattern: '^([01][0-9]|2[0-3]):[0-5][0-9]$' }, timeZone: { type: 'string', minLength: 1, maxLength: 80 } }),
  retention: object({ recordsDays: nullable({ type: 'integer', minimum: 1, maximum: 36500 }), trackDays: nullable({ type: 'integer', minimum: 1, maximum: 36500 }) }),
  suggestions: object({ enabled: boolean, timing: choice('onOpen', 'continuous'), summaryDays: { type: 'integer', minimum: 1, maximum: 36500 }, stopped: { type: 'array', maxItems: 1000, uniqueItems: true, items: { ...object({ placeId: nullable(id), activity: nullable({ type: 'string', minLength: 1, maxLength: 200 }) }), anyOf: [{ properties: { placeId: id } }, { properties: { activity: { type: 'string' } } }] } } }),
  profileVisibility: choice('private', 'friends', 'public'),
};

export const SettingsPatch = { ...object(preferenceProperties, []), minProperties: 1 };
export const Settings = object({
  id, version: { type: 'integer', minimum: 1 }, createdAt: { type: 'integer', minimum: 0 }, updatedAt: { type: 'integer', minimum: 0 }, ...preferenceProperties,
});
export const PersonPatch = { ...object({ name: { type: 'string', minLength: 1, maxLength: 20 }, bio: { type: 'string', maxLength: 200 }, avatarUrl: nullable({ type: 'string', format: 'uri', maxLength: 2048 }) }, []), minProperties: 1 };

export interface Preferences {
  display: { fontSize: 'standard' | 'large' | 'extraLarge'; reduceMotion: boolean };
  location: { enabled: boolean; saveTrack: boolean };
  media: { photosEnabled: boolean; microphoneEnabled: boolean };
  ai: { enabled: boolean; allowRecords: boolean; allowLocation: boolean; allowMedia: boolean; allowProfile: boolean };
  notifications: { enabled: boolean; timing: 'immediate' | 'daily'; dailyAt: string; timeZone: string };
  retention: { recordsDays: number | null; trackDays: number | null };
  suggestions: { enabled: boolean; timing: 'onOpen' | 'continuous'; summaryDays: number; stopped: { placeId: string | null; activity: string | null }[] };
  profileVisibility: 'private' | 'friends' | 'public';
}
export type SavedSettings = Preferences & { id: string; version: number; createdAt: number; updatedAt: number };

export function defaults(): Preferences {
  return {
    display: { fontSize: 'standard', reduceMotion: false },
    location: { enabled: false, saveTrack: false },
    media: { photosEnabled: false, microphoneEnabled: false },
    ai: { enabled: false, allowRecords: false, allowLocation: false, allowMedia: false, allowProfile: false },
    notifications: { enabled: false, timing: 'daily', dailyAt: '18:00', timeZone: 'Asia/Tokyo' },
    retention: { recordsDays: null, trackDays: null },
    suggestions: { enabled: true, timing: 'onOpen', summaryDays: 30, stopped: [] },
    profileVisibility: 'private',
  };
}
