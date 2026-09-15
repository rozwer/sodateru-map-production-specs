import type { DatabaseSync } from 'node:sqlite';
import type { RequestContext } from '../../core/context.ts';
import { CommonError } from '../../core/errors.ts';
import { canReadShared } from '../../information/service.ts';
import { page } from './pagination.ts';

export function listSharedRoutes<T extends { id: string }>(db: DatabaseSync, context: RequestContext, query: URLSearchParams, routeView: (row: Record<string, any>) => T) {
  const personId = query.get('personId');
  const visibility = query.get('visibility');
  if (visibility !== null && !['private', 'selected', 'public'].includes(visibility)) throw new CommonError('VALIDATION_FAILED', 'visibilityが不正です', false, undefined, 422);
  const rows = db.prepare('SELECT * FROM saved_routes ORDER BY updated_at DESC,id DESC').all().filter(row =>
    (!personId || row.person_id === personId) && (!visibility || row.visibility === visibility) &&
    canReadShared(context, { personId: String(row.person_id), visibility: String(row.visibility), sharedWith: JSON.parse(String(row.shared_with_json)) })
  );
  return page(rows.map(routeView), query, ['shared-routes', context.personId, context.dataMode, personId, visibility]);
}
