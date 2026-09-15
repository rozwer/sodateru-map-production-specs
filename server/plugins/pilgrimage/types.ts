import type { RequestContext } from '../../core/context.ts';
import type { DatabaseSync } from 'node:sqlite';
export type Coordinates = [number, number];
export type Region = { id: string; bounds: [number, number, number, number] };
export type Source = { url: string; title: string; fetchedAt: number; claimScope: 'relation' | 'coordinates'; attribution: string };
export type Work = { id: string; title: string; aliases: string[] };
export type Relation = { id: string; workId: string; name: string; address: string | null; coordinates: Coordinates; relationType: 'model-location' | 'filming-location' | 'narrative-location' | 'related-facility'; description: string; sourceRefs: Source[]; verificationStatus: 'confirmed' | 'unverified'; unknowns: string[] };
export type SearchInput = { id: string; workQuery: string; workId?: string; region: Region };
export type SearchResult = { id: string; input: SearchInput; works: Work[]; relations: Relation[]; fetchedAt: number; warnings: string[]; dataKind: 'live' };
export type Selection = { searchId: string; orderedRelationIds: string[]; mode: 'walking' | 'driving'; title: string; settingsVersion: number; acknowledgeUnverified: boolean; ai?: { runId: string; attempt: number } };
export type Preview = { id: string; selection: Selection; relations: Relation[]; route: any; pluginRevision: string; expiresAt: number };
export type Plan = { id: string; personId: string; dataMode: string; title: string; workIds: string[]; region: Region; orderedRelationIds: string[]; orderedPlaceIds: string[]; routeId: string; route: any; sourceSnapshot: Relation[]; settingsSnapshot: Record<string, unknown>; settingsVersion: number; ai: Selection['ai'] | null; version: number; createdAt: number; updatedAt: number };
export interface Dependencies {
 search(input: SearchInput, signal: AbortSignal): Promise<Omit<SearchResult, 'id' | 'input'>>;
 pluginState(db: DatabaseSync, context: RequestContext): any;
 places: { search(context: RequestContext, db: DatabaseSync, input: {q: string; limit: number}): Promise<any>; resolveCandidate(context: RequestContext, resultId: string, candidateId: string): any };
 routes(db: DatabaseSync): { previewRoute(context: RequestContext, input: any): Promise<any>; revalidatePreview(context: RequestContext, id: string, save?: boolean): any; saveRoute(context: RequestContext, input: {id: string; previewId: string; title: string}): {data: any; created: boolean}; getSavedRoute(context: RequestContext, id: string, own?: boolean): any };
 ai?: { assertRunAdoptable(db: DatabaseSync, context: RequestContext, id: string, expected: {expectedAttempt: number}): any; appendAppliedRef(db: DatabaseSync, context: RequestContext, id: string, ref: any): any };
}
