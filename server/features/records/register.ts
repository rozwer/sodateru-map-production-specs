import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { defineFeature } from '../../core/features.ts';
import { CommonError, expectedVersion } from '../../core/errors.ts';
import { idempotentMutation } from '../../core/idempotency.ts';
import { stream } from 'hono/streaming';
import { recordView, readableRecord, ownedRecord, invalid, type Row } from './model.ts';
import { createRecord, patchRecord, deleteRecord, deletionPreview } from './service.ts';
import { exportRecordHtmlChunks } from './export.ts';
import { attachMedia, reorderMedia, deleteAttachment, mediaPage, mediaView, readableMedia } from '../media/service.ts';
import { byteRange, readMedia, inspectMedia, removeMedia, MEDIA_MAX_BYTES } from '../media/content.ts';
import { cleanupUnreferencedMedia, mediaRootFor, storeMedia } from '../media/storage.ts';

export default defineFeature({
  id: 'records',
  migrations: [{ id: 'records-001-creation-inputs', sql: readFileSync(new URL('../../db/migrations/records/001-record-inputs.sql', import.meta.url), 'utf8') }],
  register(api, services) {
    for (const db of [services.databases.live, services.databases.demo]) cleanupUnreferencedMedia(db, mediaRootFor(db));
    api.post('/records', c => {
      const db = c.get('db'), context = c.get('context'), input = c.get('input').body as Row;
      const result = idempotentMutation(db, { context, operation: 'POST /api/v1/records', key: c.req.header('Idempotency-Key')!, input: { ...input, sharedWith: [...input.sharedWith].sort() } }, {
        execute() { const data = createRecord(db, context.personId, input); return { status: 201, body: { data }, resource: { type: 'record', id: data.id } }; },
        replay(receipt) { return { status: 201, body: { data: recordView(db, ownedRecord(db, context.personId, receipt.resource!.id)) } }; },
      });
      const data = (result.body as { data: Row }).data;
      c.header('ETag', `"${data.version}"`);
      c.header('Location', `/api/v1/records/${encodeURIComponent(data.id)}`);
      return c.body(JSON.stringify(result.body), 201, { 'Content-Type': 'application/json' });
    });
    api.patch('/records/:recordId', c => {
      const data = services.transaction(c.get('db'), () => patchRecord(c.get('db'), c.get('context').personId, c.req.param('recordId'), c.get('input').body as Row, expectedVersion(c.req.header('If-Match'))));
      c.header('ETag', `"${data.version}"`);
      return c.json({ data });
    });
    api.delete('/records/:recordId', c => {
      const db = c.get('db');
      const keys = services.transaction(db, () => deleteRecord(db, c.get('context').personId, c.req.param('recordId'), expectedVersion(c.req.header('If-Match'))));
      removeMedia(mediaRootFor(db), keys);
      return c.body(null, 204);
    });
    api.post('/records/:recordId/media', async c => {
      const db = c.get('db'), context = c.get('context'), recordId = c.req.param('recordId');
      ownedRecord(db, context.personId, recordId);
      if (!/^multipart\/form-data(?:;|$)/i.test(c.req.header('Content-Type') ?? '')) throw new CommonError('UNSUPPORTED_MEDIA_TYPE', '媒体はmultipart/form-dataで送信してください。');
      if (Number(c.req.header('Content-Length') ?? 0) > MEDIA_MAX_BYTES + 64 * 1024) throw new CommonError('PAYLOAD_TOO_LARGE', '媒体は50MiBまでです。');
      let form: FormData;
      try { form = await c.req.formData(); } catch { throw new CommonError('INVALID_REQUEST', '媒体の送信内容を読み取れません。'); }
      if ([...form.keys()].some(key => !['id', 'position', 'file'].includes(key)) || ['id', 'position', 'file'].some(key => form.getAll(key).length !== 1)) invalid('id/file/positionを一つずつ指定してください。');
      const id = form.get('id'), file = form.get('file'), rawPosition = form.get('position');
      if (typeof id !== 'string' || !id.trim() || [...id].length > 80 || typeof rawPosition !== 'string' || !/^\d+$/.test(rawPosition) || !(file instanceof File)) invalid('媒体の入力が不正です。');
      const position = Number(rawPosition);
      if (!Number.isInteger(position) || position < 0 || position > 99) invalid('表示位置は0から99です。');
      if (file.size > MEDIA_MAX_BYTES) throw new CommonError('PAYLOAD_TOO_LARGE', '媒体は50MiBまでです。');
      const bytes = new Uint8Array(await file.arrayBuffer()), inspected = inspectMedia(bytes, file.type);
      const root = mediaRootFor(db);
      let stagedKey: string | undefined;
      try {
        const result = idempotentMutation(db, { context, operation: `POST /api/v1/records/${recordId}/media`, key: c.req.header('Idempotency-Key')!, input: { id, position, mimeType: inspected.mimeType, byteSize: bytes.length, contentHash: createHash('sha256').update(bytes).digest('hex') } }, {
          execute() {
            stagedKey = storeMedia(root, bytes);
            const data = attachMedia(db, context.personId, recordId, { id, position, ...inspected, byteSize: bytes.length, storageKey: stagedKey }, expectedVersion(c.req.header('If-Match')));
            return { status: 201, body: { data }, resource: { type: 'media', id } };
          },
          replay(receipt) { return { status: 201, body: { data: mediaView(readableMedia(db, context.personId, receipt.resource!.id)) } }; },
        });
        c.header('ETag', `"${ownedRecord(db, context.personId, recordId).version}"`);
        return c.body(JSON.stringify(result.body), 201, { 'Content-Type': 'application/json' });
      } catch (error) { if (stagedKey) removeMedia(root, [stagedKey]); throw error; }
    });
    api.post('/records/:recordId/media/reorder', c => {
      const db = c.get('db'), context = c.get('context'), id = c.req.param('recordId'), input = c.get('input').body as Row;
      const result = idempotentMutation(db, { context, operation: `POST /api/v1/records/${id}/media/reorder`, key: c.req.header('Idempotency-Key')!, input }, {
        execute() { return { status: 200, body: reorderMedia(db, context.personId, id, input, expectedVersion(c.req.header('If-Match'))), resource: { type: 'record-media', id } }; },
        replay() { ownedRecord(db, context.personId, id); return { status: 200, body: mediaPage(db, context.personId, id) }; },
      });
      c.header('ETag', `"${ownedRecord(db, context.personId, id).version}"`);
      return c.body(JSON.stringify(result.body), 200, { 'Content-Type': 'application/json' });
    });
    api.delete('/media/:mediaId', c => {
      const db = c.get('db');
      const key = services.transaction(db, () => deleteAttachment(db, c.get('context').personId, c.req.param('mediaId'), expectedVersion(c.req.header('If-Match'))));
      removeMedia(mediaRootFor(db), [key]);
      return c.body(null, 204);
    });
    api.get('/records/:recordId/deletion-preview', c => {
      const preview = deletionPreview(c.get('db'), c.get('context').personId, c.req.param('recordId'));
      c.header('ETag', `"${preview.version}"`);
      return c.json({ data: preview });
    });
    api.get('/records/:recordId/export', c => {
      const db = c.get('db');
      const parts = exportRecordHtmlChunks(db, c.get('context').personId, c.req.param('recordId'), mediaRootFor(db));
      c.header('Content-Type', 'text/html; charset=utf-8');
      c.header('Content-Disposition', `attachment; filename="record.html"; filename*=UTF-8''${encodeURIComponent(c.req.param('recordId'))}.html`);
      c.header('Cache-Control', 'private, no-store');
      return stream(c, async output => { for (const part of parts) { if (output.aborted) break; await output.write(part); } });
    });
    api.get('/records/:recordId/media', c => {
      const limit = Number(c.req.query('limit') ?? 50);
      if (!Number.isInteger(limit) || limit < 1 || limit > 100) invalid('limitは1から100です。');
      return c.json(mediaPage(c.get('db'), c.get('context').personId, c.req.param('recordId'), limit, c.req.query('cursor')));
    });
    api.get('/records/:recordId', c => {
      const db = c.get('db'), personId = c.get('context').personId, id = c.req.param('recordId');
      const record = recordView(db, readableRecord(db, personId, id));
      c.header('ETag', `"${record.version}"`);
      return c.json({ data: { record, media: { status: 'ready', data: mediaPage(db, personId, id) } } });
    });
    api.get('/media/:mediaId', c => {
      const media = readableMedia(c.get('db'), c.get('context').personId, c.req.param('mediaId'));
      c.header('ETag', `"${media.version}"`);
      return c.json({ data: mediaView(media) });
    });
    api.get('/media/:mediaId/content', c => {
      const db = c.get('db'), media = readableMedia(db, c.get('context').personId, c.req.param('mediaId'));
      if (media.status === 'pending') throw new CommonError('NOT_READY', '媒体は保存中です。', true, undefined, 409);
      if (media.status !== 'ready') throw new CommonError('PROVIDER_UNAVAILABLE', '媒体を再送してください。', true, undefined, 503);
      const bytes = readMedia(mediaRootFor(db), media.storage_key);
      if (bytes.length !== media.byte_size) throw new CommonError('PROVIDER_UNAVAILABLE', '媒体ファイルが保存時と一致しません。', true, undefined, 503);
      c.header('Content-Range', `bytes */${bytes.length}`);
      const range = byteRange(c.req.header('Range'), bytes.length);
      c.header('Content-Range', range ? `bytes ${range.start}-${range.end}/${bytes.length}` : undefined);
      c.header('Accept-Ranges', 'bytes');
      c.header('Content-Type', media.mime_type);
      c.header('Cache-Control', 'private, no-store');
      c.header('Content-Disposition', 'inline');
      const data = range ? bytes.subarray(range.start, range.end + 1) : bytes;
      // The Node adapter supplies Content-Length for this byte body.
      return c.body(new Uint8Array(data), range ? 206 : 200);
    });
  },
});
