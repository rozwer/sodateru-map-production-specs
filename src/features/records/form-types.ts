export type MediaDraft = {
  id: string;
  file?: File;
  url: string | null;
  kind: 'photo' | 'video' | 'audio';
  name: string;
  position: number;
  version?: number;
  state: 'draft' | 'pending' | 'ready' | 'failed';
  error?: string;
};

/** Local input state. It is never sent as an API DTO. */
export type RecordDraft = {
  body: string;
  impression: string;
  purposes: string[];
  date: string;
  startTime: string;
  endTime: string;
  timePrecision: 'exact' | 'approximate' | 'unknown';
  bookmarked: boolean;
  visibility: 'private' | 'selected' | 'public';
  sharedWith: string[];
  visited: boolean;
  media: MediaDraft[];
  removedMedia: { id: string; version: number }[];
};

/** Display values preserve provider IDs; no provider/business fields are inferred. */
export type PlaceChoice = {
  id: string;
  name: string;
  address: string | null;
  photoUrl?: string | null;
  longitude: number;
  latitude: number;
  source: 'saved' | 'candidate';
  resultId?: string;
};

export const blankDraft = (): RecordDraft => ({
  body: '', impression: '', purposes: [], date: '', startTime: '', endTime: '',
  timePrecision: 'unknown', bookmarked: false, visibility: 'private', sharedWith: [],
  visited: false, media: [], removedMedia: [],
});
