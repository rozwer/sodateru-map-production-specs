// Read-only view of the existing CommonInfoRecordView schema. No extra wire fields.
export type KnowledgeMedia = {
  id: string; kind: 'photo' | 'video' | 'audio'; mimeType: string;
  byteSize: number; position: number; status: 'pending' | 'ready' | 'failed'; contentUrl: string | null;
};
export type KnowledgeRecord = {
  id: string; person: { id: string; displayName: string; iconPath: string | null };
  kind: 'experience' | 'diary' | 'memo'; body: string;
  place: { id: string; name: string; address: string | null; coordinates: [number, number] } | null;
  effectiveAt: number | null; endedAt: number | null;
  timePrecision: 'exact' | 'approximate' | 'unknown'; visitStatus: 'candidate' | 'confirmed' | 'rejected' | null;
  purposes: string[]; impression: string; topicKey: string | null;
  visibility: 'private' | 'selected' | 'public'; version: number;
  sourceRefs: { type: 'record' | 'visit' | 'place' | 'checkin' | 'route'; id: string; version: number }[]; media: KnowledgeMedia[];
};
export type KnowledgeKind = 'rest-tip' | 'experience' | 'people';
// UI draft values. Mapping to topicKey/purposes/bbox is supplied by COMMUNITY's dictionary.
export type KnowledgeFilters = {
  areaText: string; center: [number, number] | null; radiusM: 500 | 1000 | 3000 | null;
  bounds: [number, number, number, number] | null;
  purpose: 'meal' | 'rest' | 'walk' | null; period: 'week' | 'month' | null;
  audience: 'visible' | 'friends' | 'public';
};
export const emptyFilters: KnowledgeFilters = {
  areaText: '', center: null, radiusM: null, bounds: null, purpose: null, period: null, audience: 'visible',
};
export type KnowledgePerson = { id: string; name: string; bio: string; avatarUrl: string | null };
/** Display options resolved by the place search API; never sent back as a wire DTO. */
export type KnowledgeAreaOption = { id: string; name: string; coordinates: [number, number] };
