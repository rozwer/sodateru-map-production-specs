import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

// Runs only against an explicitly supplied isolated real server/session.
export async function exerciseRecords(baseUrl, cookie, mode = 'live') {
  const id = `records-acceptance-${randomUUID()}`;
  const request = async (path, { method = 'GET', body, version, key, status = 200, raw = false, headers = {} } = {}) => {
    const response = await fetch(`${baseUrl}/api/v1${path}`, { method, headers: {
      Cookie: cookie, 'X-Request-Id': randomUUID(), 'X-Data-Mode': mode,
      ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...(version !== undefined ? { 'If-Match': `"${version}"` } : {}),
      ...(key ? { 'Idempotency-Key': key } : {}), ...headers,
    }, body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body) });
    assert.equal(response.status, status, `${method} ${path}: ${response.status} ${response.status !== status ? await response.text() : ''}`);
    return raw ? response : response.status === 204 ? null : response.json();
  };
  const input = { id, kind: 'experience', visitId: null, placeId: null, occurredAt: null, endedAt: null, timePrecision: 'unknown', body: '  元の記録\n<script>実行しない</script> 🍵\n', purposes: ['ひと休み'], activities: [], impression: '静かだった。', periodAnswers: { rest: true }, bookmarked: false, useForSuggestions: true, topicKey: null, visibility: 'private', sharedWith: [] };
  const memoInput = { ...input, id: `${id}-memo`, kind: 'memo', body: '独立メモを保持する。' };
  await request('/records', { method: 'POST', body: memoInput, key: memoInput.id, status: 201 });
  const created = (await request('/records', { method: 'POST', body: input, key: id, status: 201 })).data;
  assert.equal(created.id, id); assert.equal(created.body, input.body); assert.equal(created.version, 1);
  assert.equal((await request('/records', { method: 'POST', body: input, key: id, status: 201 })).data.id, id);
  await request('/records', { method: 'POST', body: { ...input, body: '別の内容' }, key: id, status: 409 });
  assert.equal((await request(`/records/${id}`)).data.record.body, input.body);
  await request(`/records/${id}`, { method: 'PATCH', body: { body: '訂正' }, status: 428 });
  const edited = (await request(`/records/${id}`, { method: 'PATCH', body: { body: '訂正した原文\n末尾 ' }, version: 1 })).data;
  assert.equal(edited.version, 2); assert.deepEqual(edited.purposes, input.purposes);
  await request(`/records/${id}`, { method: 'PATCH', body: { body: '古い版' }, version: 1, status: 412 });

  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
  const form = (mediaId, position, bytes = png, mime = 'image/png') => { const value = new FormData(); value.set('id', mediaId); value.set('position', String(position)); value.set('file', new Blob([bytes], { type: mime }), 'photo.png'); return value; };
  const mediaId = `${id}-media`;
  await request(`/records/${id}/media`, { method: 'POST', body: { id: mediaId }, key: mediaId, version: 2, status: 415 });
  const media = (await request(`/records/${id}/media`, { method: 'POST', body: form(mediaId, 0), key: mediaId, version: 2, status: 201 })).data;
  assert.equal(media.status, 'ready');
  assert.equal((await request(`/records/${id}/media`, { method: 'POST', body: form(mediaId, 0), key: mediaId, version: 2, status: 201 })).data.id, mediaId);
  await request(`/records/${id}/media`, { method: 'POST', body: form(`${id}-bad`, 1, Buffer.from('not a photo')), key: `${id}-bad`, version: 3, status: 415 });
  assert.equal((await request(`/records/${id}`)).data.record.body, edited.body);
  const range = await request(`/media/${mediaId}/content`, { raw: true, headers: { Range: 'bytes=0-7' }, status: 206 });
  assert.equal(range.headers.get('content-range'), `bytes 0-7/${png.length}`);
  assert.deepEqual(Buffer.from(await range.arrayBuffer()), png.subarray(0, 8));
  await request(`/media/${mediaId}/content`, { headers: { Range: 'bytes=999999-' }, status: 416 });
  const secondId = `${id}-bad`; // Retry only the failed file with its original identity/key.
  await request(`/records/${id}/media`, { method: 'POST', body: form(secondId, 1), key: secondId, version: 3, status: 201 });
  const firstPage = await request(`/records/${id}/media?limit=1`);
  assert.equal(firstPage.items.length, 1); assert.ok(firstPage.nextCursor);
  assert.equal((await request(`/records/${id}/media?limit=1&cursor=${encodeURIComponent(firstPage.nextCursor)}`)).items[0].id, secondId);
  const reordered = await request(`/records/${id}/media/reorder`, { method: 'POST', body: { items: [{ id: secondId, version: 1 }, { id: mediaId, version: 1 }] }, key: `${id}-reorder`, version: 4 });
  assert.deepEqual(reordered.items.map(m => m.id), [secondId, mediaId]);
  await request(`/records/${id}/media?limit=1&cursor=${encodeURIComponent(firstPage.nextCursor)}`, { status: 400 });
  const preview = (await request(`/records/${id}/deletion-preview`)).data;
  assert.equal(preview.version, 5); assert.equal(preview.preserves.independentRecords, true);
  const document = await (await request(`/records/${id}/export`, { raw: true })).text();
  assert.ok(document.includes(edited.body)); assert.ok(document.includes(`data:image/png;base64,${png.toString('base64')}`));
  assert.ok(document.indexOf(secondId) < document.indexOf(mediaId));
  await request(`/records/${id}`, { method: 'DELETE', version: 4, status: 412 });
  await request(`/records/${id}`, { method: 'DELETE', version: preview.version, status: 204 });
  await request(`/records/${id}`, { status: 404 });
  await request(`/media/${mediaId}/content`, { status: 404 });
  await request('/records', { method: 'POST', body: input, key: id, status: 404 });
  assert.equal((await request(`/records/${memoInput.id}`)).data.record.body, memoInput.body);
  await request(`/records/${memoInput.id}`, { method: 'DELETE', version: 1, status: 204 });
  return { id, checks: ['original text', 'same-key replay', 'conflicting replay', 'patch preserves omitted values', 'version required/conflict', 'media save/replay', 'partial failure retains body', 'range', 'media order', 'readable embedded export', 'preview version', 'delete and no resurrection'] };
}
