// Run against a disposable CORE server with two configured profiles.
// seed -> restart that server with the same DB files -> verify.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const base = process.env.COMMUNITY_API_BASE;
if (!base) throw new Error('COMMUNITY_API_BASE must identify the disposable test server');
const mode = process.env.COMMUNITY_DATA_MODE ?? 'live';
const profileA = process.env.COMMUNITY_PROFILE_A ?? 'alice';
const profileB = process.env.COMMUNITY_PROFILE_B ?? 'bob';
const statePath = '.local/community-e2e-state.json';
const phase = process.argv[2] ?? 'seed';
const result = [];

async function request(cookie, method, path, body, expected = 200, extra = {}) {
  const headers = { 'X-Data-Mode': mode, 'X-Request-Id': randomUUID(), ...extra };
  if (cookie) headers.Cookie = cookie;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (method === 'POST' && !headers['Idempotency-Key']) headers['Idempotency-Key'] = randomUUID();
  const response = await fetch(`${base}/api/v1${path}`, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  assert.equal(response.status, expected, `${method} ${path}: ${text}`);
  return { response, body: data, data: data?.data ?? data };
}
async function session(profileKey) {
  const response = await request(null, 'POST', '/session', { profileKey }, 201);
  const cookie = response.response.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
  assert.ok(cookie);
  const person = await request(cookie, 'GET', '/me');
  return { cookie, person: person.data };
}
const a = await session(profileA), b = await session(profileB);
assert.notEqual(a.person.id, b.person.id);

if (phase === 'seed') {
  for (const actor of [a, b]) {
    const setting = await request(actor.cookie, 'GET', '/me/settings');
    await request(actor.cookie, 'PATCH', '/me/settings', { profileVisibility: 'public' }, 200, { 'If-Match': `"${setting.data.version}"` });
  }
  const people = await request(a.cookie, 'GET', `/people?q=${encodeURIComponent(b.person.name)}`);
  assert.ok(people.data.items.some(person => person.id === b.person.id));
  const id = randomUUID(), key = randomUUID();
  const input = { id, recipientId: b.person.id };
  const first = await request(a.cookie, 'POST', '/friendships', input, 201, { 'Idempotency-Key': key });
  const replay = await request(a.cookie, 'POST', '/friendships', input, 200, { 'Idempotency-Key': key });
  assert.equal(first.data.id, replay.data.id);
  await request(a.cookie, 'PATCH', `/friendships/${id}`, { status: 'accepted' }, 403, { 'If-Match': '"1"' });
  await request(b.cookie, 'PATCH', `/friendships/${id}`, { status: 'accepted' }, 428);
  await request(b.cookie, 'PATCH', `/friendships/${id}`, { status: 'accepted' }, 200, { 'If-Match': '"1"' });
  const placeId = randomUUID();
  await request(a.cookie, 'POST', '/places', { id: placeId, mode: 'manual', name: 'COMMUNITY 検証公園', position: { longitude: 136.97, latitude: 35.16 }, address: null, buildingKey: null }, 201);
  const recordId = randomUUID();
  await request(a.cookie, 'POST', '/records', { id: recordId, kind: 'experience', visitId: null, placeId, occurredAt: Date.now(), endedAt: null,
    timePrecision: 'exact', body: '木陰で休憩できました。保存した原文です。', purposes: ['休憩'], activities: [], impression: '', periodAnswers: {},
    bookmarked: false, useForSuggestions: false, topicKey: 'rest', visibility: 'selected', sharedWith: [b.person.id] }, 201);
  const mediaId = randomUUID();
  const photo = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
  const form = new FormData();
  form.set('id', mediaId); form.set('position', '0'); form.set('file', new Blob([photo], { type: 'image/png' }), 'photo.png');
  const uploaded = await fetch(`${base}/api/v1/records/${recordId}/media`, { method: 'POST', headers: { 'X-Data-Mode': mode, 'X-Request-Id': randomUUID(), Cookie: a.cookie, 'Idempotency-Key': randomUUID(), 'If-Match': '"1"' }, body: form });
  assert.equal(uploaded.status, 201, await uploaded.text());
  const bookmarkId = randomUUID(), bookmarkKey = randomUUID();
  await request(b.cookie, 'POST', '/bookmarks', { id: bookmarkId, target: { type: 'record', id: recordId } }, 201, { 'Idempotency-Key': bookmarkKey });
  const duplicate = await request(b.cookie, 'POST', '/bookmarks', { id: randomUUID(), target: { type: 'record', id: recordId } }, 200);
  assert.equal(duplicate.data.id, bookmarkId);
  const themeId = randomUUID();
  await request(a.cookie, 'POST', '/themes', { id: themeId, name: '休憩の場所', description: '共有テーマの検証', recordIds: [recordId], colorKey: 'teal', coverMediaId: mediaId }, 201);
  await request(b.cookie, 'GET', `/shared-themes/${themeId}`, undefined, 404);
  await request(a.cookie, 'PATCH', `/themes/${themeId}/sharing`, { visibility: 'selected', sharedWith: [b.person.id] }, 200, { 'If-Match': '"1"' });
  const sharedTheme = await request(b.cookie, 'GET', `/shared-themes/${themeId}`);
  assert.deepEqual(sharedTheme.data.recordIds, [recordId]);
  mkdirSync('.local', { recursive: true });
  writeFileSync(statePath, JSON.stringify({ id, placeId, recordId, mediaId, bookmarkId, bookmarkKey, themeId, input, key, personA: a.person.id, personB: b.person.id }));
  result.push('two profiles, request/replay, recipient approval, real place/record/bookmark saved');
} else if (phase === 'verify') {
  const state = JSON.parse(readFileSync(statePath, 'utf8'));
  assert.equal(a.person.id, state.personA); assert.equal(b.person.id, state.personB);
  const { id, recordId, placeId, mediaId, bookmarkId, themeId } = state;
  const friendship = await request(b.cookie, 'GET', `/friendships/${id}`);
  assert.equal(friendship.data.status, 'accepted');
  const saved = await request(b.cookie, 'GET', `/bookmarks/${bookmarkId}`);
  assert.equal(saved.data.resource.body, '木陰で休憩できました。保存した原文です。');
  const media = await fetch(`${base}/api/v1/media/${mediaId}/content`, { headers: { 'X-Data-Mode': mode, 'X-Request-Id': randomUUID(), Cookie: b.cookie } });
  assert.equal(media.status, 200); assert.equal(media.headers.get('Content-Type'), 'image/png');
  assert.ok((await media.arrayBuffer()).byteLength > 0);
  const query = 'category=rest&bbox=136.96,35.15,136.98,35.17';
  const list = await request(b.cookie, 'GET', `/knowledge?${query}`);
  assert.ok(list.data.items.some(record => record.id === recordId));
  const voices = await request(b.cookie, 'GET', `/places/${placeId}/voices?topicKey=rest`);
  assert.ok(voices.data.items.some(record => record.id === recordId));
  const map = await request(b.cookie, 'GET', `/knowledge/map?${query}`);
  assert.ok(JSON.stringify(map.data).includes(recordId));
  await request(b.cookie, 'GET', `/shared-records/${recordId}`);
  await request(a.cookie, 'DELETE', `/friendships/${id}`, undefined, 204, { 'If-Match': `"${friendship.data.version}"` });
  const friends = await request(b.cookie, 'GET', '/knowledge?audience=friends');
  assert.ok(!friends.data.items.some(record => record.id === recordId));
  // Friendship removal and selected-share revocation are independent.
  await request(b.cookie, 'GET', `/shared-records/${recordId}`);
  const own = await request(a.cookie, 'GET', `/records/${recordId}`);
  await request(a.cookie, 'PATCH', `/records/${recordId}`, { visibility: 'private', sharedWith: [] }, 200, { 'If-Match': `"${own.data.record.version}"` });
  await request(b.cookie, 'GET', `/shared-records/${recordId}`, undefined, 404);
  await request(b.cookie, 'GET', `/bookmarks/${bookmarkId}`, undefined, 404);
  await request(b.cookie, 'GET', `/media/${mediaId}/content`, undefined, 404);
  const bookmarks = await request(b.cookie, 'GET', '/bookmarks');
  const revoked = bookmarks.data.items.find(bookmark => bookmark.id === bookmarkId);
  assert.equal(revoked.status, 'unavailable'); assert.equal(revoked.resource, null);
  const hidden = await request(b.cookie, 'GET', `/knowledge?${query}`);
  assert.ok(!hidden.data.items.some(record => record.id === recordId));
  const sharedTheme = await request(b.cookie, 'GET', `/shared-themes/${themeId}`);
  assert.deepEqual(sharedTheme.data.recordIds, []);
  assert.deepEqual(sharedTheme.data.records, []);
  assert.equal(sharedTheme.data.coverMedia, null);
  await request(a.cookie, 'PATCH', `/themes/${themeId}/sharing`, { visibility: 'private', sharedWith: [] }, 200, { 'If-Match': '"2"' });
  await request(b.cookie, 'GET', `/shared-themes/${themeId}`, undefined, 404);
  await request(b.cookie, 'DELETE', `/bookmarks/${bookmarkId}`, undefined, 204, { 'If-Match': `"${revoked.version}"` });
  result.push('restart persisted IDs/body, common list/map/voices, friend removal, independent selected revocation, unavailable bookmark');
} else throw new Error('phase must be seed or verify');
console.log(JSON.stringify({ phase, mode, checks: result }, null, 2));
