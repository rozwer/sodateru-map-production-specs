import type { DatabaseSync } from 'node:sqlite';
import type { RequestContext } from '../../core/context.ts';
import { createInformationService } from '../../information/service.ts';
import { getPlace } from '../places/repository.ts';
import { placesService } from '../places/service.ts';
import type { BookmarkTarget, TargetResolution } from './bookmarks.ts';

export function targetResolver(db: DatabaseSync, context: RequestContext) {
  return (target: BookmarkTarget): TargetResolution => {
    if (target.type === 'record') return { data: createInformationService(db).getRecord(context, target.id), expiresAt: null };
    if (target.type === 'place') return { data: getPlace(db, target.id), expiresAt: null };
    const resolved = placesService.resolveCandidateReference(context, target.resultId, target.candidateId);
    if (resolved.candidate.placeId) getPlace(db, resolved.candidate.placeId);
    return { data: resolved.candidate, expiresAt: resolved.expiresAt };
  };
}
