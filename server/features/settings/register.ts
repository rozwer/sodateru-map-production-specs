import { readFileSync } from 'node:fs';
import { defineFeature } from '../../core/features.ts';
import { CommonError, expectedVersion } from '../../core/errors.ts';
import { transaction } from '../../db/migrate.ts';
import { patchPerson, patchSettings, readSettings, resetSettings } from './service.ts';
import { iconBytes, iconRow, MAX_ICON_BYTES, prepareIcon, removeIconFile, setIcon } from './icons.ts';
import { exportSettingsHtml, ownDataSummary } from './data.ts';

export default defineFeature({
  id: 'settings',
  migrations: [{ id: 'settings-001', sql: readFileSync(new URL('../../db/migrations/settings/001-settings.sql', import.meta.url), 'utf8') }],
  register(api) {
    api.get('/me/data', c => c.json({ data: ownDataSummary(c.get('db'), c.get('context').personId) }));
    api.get('/me/settings/export', c => {
      c.header('Content-Type', 'text/html; charset=utf-8');
      c.header('Content-Disposition', 'attachment; filename="profile-settings.html"');
      return c.body(exportSettingsHtml(c.get('db'), c.get('context').personId));
    });
    api.delete('/me/settings', c => {
      const db = c.get('db');
      const expected = expectedVersion(c.req.header('If-Match'));
      transaction(db, () => resetSettings(db, c.get('context').personId, expected));
      return c.body(null, 204);
    });
    api.get('/me/settings', c => {
      if ([...new URL(c.req.url).searchParams].length) throw new CommonError('INVALID_REQUEST', '未定義の検索条件です。', false, undefined, 400);
      const data = readSettings(c.get('db'), c.get('context').personId);
      c.header('ETag', `"${data.version}"`);
      return c.json({ data });
    });
    api.patch('/me/settings', async c => {
      const expected = expectedVersion(c.req.header('If-Match'));
      let input: unknown;
      try { input = await c.req.json(); } catch { throw new CommonError('INVALID_REQUEST', 'JSONの形式を確認してください。', false, undefined, 400); }
      const db = c.get('db');
      const data = transaction(db, () => patchSettings(db, c.get('context').personId, expected, input));
      c.header('ETag', `"${data.version}"`);
      return c.json({ data });
    });
    api.patch('/me', async c => {
      const expected = expectedVersion(c.req.header('If-Match'));
      let input: unknown;
      try { input = await c.req.json(); } catch { throw new CommonError('INVALID_REQUEST', 'JSONの形式を確認してください。', false, undefined, 400); }
      const db = c.get('db');
      const oldIcon = iconRow(db, c.get('context').personId);
      const data = transaction(db, () => patchPerson(db, c.get('context').personId, expected, input));
      if (oldIcon && !iconRow(db, c.get('context').personId)) removeIconFile(String(oldIcon.file_path));
      c.header('ETag', `"${data.version}"`);
      return c.json({ data });
    });
    api.get('/me/icon', c => {
      const { bytes, mimeType } = iconBytes(c.get('db'), c.get('context').personId);
      c.header('Content-Type', mimeType);
      c.header('X-Content-Type-Options', 'nosniff');
      return c.body(bytes);
    });
    api.patch('/me/icon', async c => {
      const expected = expectedVersion(c.req.header('If-Match'));
      const length = Number(c.req.header('Content-Length') ?? 0);
      if (length > MAX_ICON_BYTES + 65536) throw new CommonError('PAYLOAD_TOO_LARGE', '画像は50MiB以内で指定してください。', false, undefined, 413);
      let form: FormData;
      try { form = await c.req.formData(); } catch { throw new CommonError('INVALID_REQUEST', '画像ファイルをmultipartで送ってください。', false, undefined, 400); }
      const file = form.get('file');
      if (!(file instanceof File) || [...form.keys()].length !== 1) throw new CommonError('VALIDATION_FAILED', 'fileに画像を1つ指定してください。', false, undefined, 422);
      if (file.size > MAX_ICON_BYTES) throw new CommonError('PAYLOAD_TOO_LARGE', '画像は50MiB以内で指定してください。', false, undefined, 413);
      const bytes = new Uint8Array(await file.arrayBuffer());
      const db = c.get('db');
      const personId = c.get('context').personId;
      const oldIcon = iconRow(db, personId);
      const saved = prepareIcon(db, bytes, file.type);
      let data;
      try { data = transaction(db, () => setIcon(db, personId, expected, saved, new URL('/api/v1/me/icon', c.req.url).href)); }
      catch (error) { removeIconFile(saved.path); throw error; }
      if (oldIcon) removeIconFile(String(oldIcon.file_path));
      c.header('ETag', `"${data.version}"`);
      return c.json({ data });
    });
    api.delete('/me/icon', c => {
      const db = c.get('db');
      const personId = c.get('context').personId;
      const expected = expectedVersion(c.req.header('If-Match'));
      const oldIcon = iconRow(db, personId);
      transaction(db, () => setIcon(db, personId, expected, null, null));
      if (oldIcon) removeIconFile(String(oldIcon.file_path));
      return c.body(null, 204);
    });
  },
});
