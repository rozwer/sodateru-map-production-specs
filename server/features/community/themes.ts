import type { DatabaseSync } from 'node:sqlite';
import { CommonError, requireVersion } from '../../core/errors.ts';
import { identity, page } from './pagination.ts';
import type { RequestContext as SocialContext } from '../../core/context.ts';
import { getTheme } from '../themes/service.ts';
import { mediaView } from '../../information/service.ts';

type SharedAccess = { personId: string; visibility: string; sharedWith: string[] };
export type CommunityReads = {
  canReadShared: (context: SocialContext, resource: SharedAccess) => boolean;
  getRecord: (context: SocialContext, id: string) => any;
  requireReadableMedia: (context: SocialContext, id: string) => any;
};
const missing = () => new CommonError('NOT_FOUND', '共有テーマが見つかりません', false, undefined, 404);
const invalid = (message: string) => new CommonError('VALIDATION_FAILED', message, false, undefined, 422);

function themeRow(db: DatabaseSync, id: string) {
  const row = db.prepare('SELECT * FROM themes WHERE id=?').get(identity(id));
  if (!row) throw missing();
  return row;
}

function sharingRow(db: DatabaseSync, theme: Record<string, any>) {
  const row = db.prepare('SELECT * FROM community_theme_shares WHERE id=?').get(theme.id);
  return row ? { id: String(row.id), version: Number(row.version), createdAt: Number(row.created_at), updatedAt: Number(row.updated_at),
    visibility: String(row.visibility), sharedWith: JSON.parse(String(row.shared_with_json)) as string[] }
    : { id: String(theme.id), version: 1, createdAt: Number(theme.created_at), updatedAt: Number(theme.updated_at), visibility: 'private', sharedWith: [] as string[] };
}

export function getThemeSharing(db: DatabaseSync, personId: string, id: string) {
  const theme = themeRow(db, id);
  if (theme.person_id !== personId) throw missing();
  return sharingRow(db, theme);
}

export function patchThemeSharing(db: DatabaseSync, personId: string, id: string, version: number, input: { visibility: string; sharedWith: string[] }) {
  const current = getThemeSharing(db, personId, id);
  requireVersion(current.version, version);
  if (!input || !['private', 'public', 'selected'].includes(input.visibility) || !Array.isArray(input.sharedWith) || input.sharedWith.length > 100) throw invalid('共有設定が不正です');
  const sharedWith = input.sharedWith.map(value => identity(value, 'sharedWith'));
  if (new Set(sharedWith).size !== sharedWith.length) throw invalid('共有先が重複しています');
  if (input.visibility !== 'selected' && sharedWith.length) throw invalid('共有先はselectedの場合だけ指定できます');
  if (input.visibility === 'selected' && !sharedWith.length) throw invalid('共有先を1人以上指定してください');
  for (const target of sharedWith) {
    if (!db.prepare('SELECT id FROM people WHERE id=?').get(target)) throw invalid('共有先の人物が存在しません');
  }
  const result = db.prepare(`INSERT INTO community_theme_shares(id,visibility,shared_with_json,version,created_at,updated_at)
    VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET visibility=excluded.visibility,shared_with_json=excluded.shared_with_json,
    version=excluded.version,updated_at=excluded.updated_at WHERE community_theme_shares.version=?`)
    .run(id, input.visibility, JSON.stringify(sharedWith), version + 1, current.createdAt, Date.now(), version);
  if (!result.changes) throw new CommonError('VERSION_CONFLICT', '共有設定が変更されました', false, undefined, 412);
  return getThemeSharing(db, personId, id);
}

export function getSharedTheme(db: DatabaseSync, context: SocialContext, id: string, reads: CommunityReads) {
  const theme = themeRow(db, id);
  const sharing = sharingRow(db, theme);
  if (!reads.canReadShared(context, { personId: String(theme.person_id), ...sharing })) throw missing();
  const canonical = getTheme(db, String(theme.person_id), id);
  const records: any[] = [];
  for (const recordId of canonical.recordIds) {
    try { records.push(reads.getRecord(context, recordId)); }
    catch (error) { if (!(error instanceof CommonError) || error.code !== 'NOT_FOUND') throw error; }
  }
  let coverMedia = null;
  if (canonical.coverMediaId) {
    try {
      const media = reads.requireReadableMedia(context, canonical.coverMediaId);
      if (media.status === 'ready') coverMedia = mediaView(media);
    } catch (error) { if (!(error instanceof CommonError) || error.code !== 'NOT_FOUND') throw error; }
  }
  return { id: String(theme.id), personId: String(theme.person_id), version: Number(theme.version), createdAt: Number(theme.created_at), updatedAt: Number(theme.updated_at),
    name: String(theme.name), description: String(theme.description), recordIds: records.map(record => record.id), records,
    colorKey: canonical.colorKey, coverMedia,
    // Recipient IDs are not disclosed to other viewers.
    sharing: { ...sharing, sharedWith: theme.person_id === context.personId ? sharing.sharedWith : [] } };
}

export function matchesAudience(db: DatabaseSync, context: SocialContext, resource: SharedAccess, audience: string) {
  if (!['visible', 'own', 'public', 'selected', 'friends'].includes(audience)) throw invalid('audienceが不正です');
  if (audience === 'own') return resource.personId === context.personId;
  if (audience === 'public') return resource.visibility === 'public';
  if (audience === 'selected') return resource.visibility === 'selected' && resource.sharedWith.includes(context.personId);
  if (audience === 'friends') return !!db.prepare("SELECT id FROM friendships WHERE status='accepted' AND ((requester_id=? AND recipient_id=?) OR (requester_id=? AND recipient_id=?))")
    .get(context.personId, resource.personId, resource.personId, context.personId);
  return true;
}

export function listSharedThemes(db: DatabaseSync, context: SocialContext, query: URLSearchParams, reads: CommunityReads) {
  const personId = query.get('personId');
  const audience = query.get('audience') ?? 'visible';
  const rows = db.prepare('SELECT * FROM themes ORDER BY updated_at DESC,id ASC').all();
  const visible = rows.filter(theme => {
    const sharing = sharingRow(db, theme);
    const resource = { personId: String(theme.person_id), ...sharing };
    return (!personId || theme.person_id === personId) && reads.canReadShared(context, resource) && matchesAudience(db, context, resource, audience);
  });
  const selected = page(visible.map(theme => ({ id: String(theme.id) })), query, ['shared-themes', context.personId, context.dataMode, personId, audience]);
  return { ...selected, items: selected.items.map(theme => getSharedTheme(db, context, theme.id, reads)) };
}
