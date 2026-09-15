import { ApiError, type Media, type Theme } from '../../../packages/api-client/index';
import { api } from '../../app/api';
import type { ThemeDraft, ThemeView } from './types';

/** THEMES.json 1.0.0; shared generated types are supplied by CORE. */
export async function themeView(theme: Theme, signal: AbortSignal): Promise<ThemeView> {
  let photoUrl: string | null = null;
  if (theme.coverMediaId) {
    try {
      const media = (await api.request('getMediaMediaId', { path: { mediaId: theme.coverMediaId }, signal })).data;
      if (media.kind === 'photo' && media.status === 'ready') photoUrl = media.contentUrl;
    } catch (error) {
      if (!(error instanceof ApiError) || ![403, 404].includes(error.status)) throw error;
    }
  }
  return { ...theme, color: theme.colorKey, photoUrl };
}

export const themeBody = (draft: ThemeDraft) => ({ name: draft.name.trim(), description: draft.description, colorKey: draft.color, recordIds: draft.recordIds, coverMediaId: draft.coverMediaId });
export const sameTheme = (theme: Theme, draft: ThemeDraft) => theme.name === draft.name.trim() && theme.description === draft.description && theme.colorKey === draft.color && theme.coverMediaId === draft.coverMediaId && [...theme.recordIds].sort().join('\n') === [...draft.recordIds].sort().join('\n');

export type PhotoAttempt = { file: File; recordId: string; id: string; key: string; version?: number; position?: number; media?: Media };
/** Keep the exact upload request for uncertain retries; no upload occurs on selection. */
export async function savePhoto(attempt: PhotoAttempt, signal: AbortSignal): Promise<Media> {
  if (attempt.version === undefined) {
    const detail = (await api.request('getRecordsRecordId', { path: { recordId: attempt.recordId }, signal })).data;
    if (detail.media.status !== 'ready') throw new Error('写真の一覧を取得できません。入力を残しています。');
    attempt.version = detail.record.version;
    attempt.position = Math.max(-1, ...detail.media.data.items.map(media => media.position)) + 1;
  }
  if (!attempt.media) {
    const body = new FormData(); body.set('id', attempt.id); body.set('file', attempt.file); body.set('position', String(attempt.position));
    try {
      attempt.media = (await api.request('postRecordsRecordIdMedia', { path: { recordId: attempt.recordId }, body, version: attempt.version, idempotencyKey: attempt.key, signal })).data;
    } catch (error) {
      // A confirmed version rejection did not attach the photo. The next explicit
      // save may read the current parent and choose an unused position again.
      // Network uncertainty keeps the exact request, as above.
      if (error instanceof ApiError && error.status === 412) {
        attempt.version = undefined; attempt.position = undefined; attempt.key = crypto.randomUUID();
      }
      throw error;
    }
  }
  if (attempt.media.status === 'pending') attempt.media = (await api.request('getMediaMediaId', { path: { mediaId: attempt.media.id }, signal })).data;
  if (attempt.media.status !== 'ready') throw new Error(attempt.media.status === 'pending' ? '写真を処理しています。入力を残しています。少し待って保存を再試行してください。' : '写真を保存できませんでした。別の写真を選んでください。');
  return attempt.media;
}
