// Run against the real CORE server and a disposable verification DB containing a stored place.
// ACTIVITY_BASE_URL=http://localhost:.../api/v1 ACTIVITY_COOKIE=<session cookie>
// ACTIVITY_PLACE_ID=<stored place> ACTIVITY_STATE=.local/activity-acceptance.json
// node server/features/activity/acceptance.mjs [verify-after-restart]
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const base = process.env.ACTIVITY_BASE_URL;
const cookie = process.env.ACTIVITY_COOKIE;
const placeId = process.env.ACTIVITY_PLACE_ID;
const mode = process.env.ACTIVITY_MODE ?? 'live';
const stateFile = process.env.ACTIVITY_STATE ?? '.local/activity-acceptance.json';
if (!base || !cookie) throw new Error('Set ACTIVITY_BASE_URL and ACTIVITY_COOKIE for a real CORE session');
async function request(path, { method = 'GET', body, version, key, status = 200 } = {}) {
  const headers = { 'X-Request-Id': randomUUID(), 'X-Data-Mode': mode, Cookie: cookie };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (version !== undefined) headers['If-Match'] = `"${version}"`;
  if (method === 'POST') headers['Idempotency-Key'] = key ?? randomUUID();
  const response = await fetch(`${base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await response.text();
  assert.equal(response.status, status, `${method} ${path}: ${text}`);
  return text ? JSON.parse(text) : null;
}
if (process.argv.includes('verify-after-restart')) {
  const saved = JSON.parse(readFileSync(stateFile, 'utf8'));
  const visit = (await request(`/visits/${saved.visitId}`)).data;
  assert.equal(visit.status, 'confirmed');
  assert.equal(visit.placeId, saved.placeId);
  const points = await request(`/track-points?segmentId=${saved.segmentId}`);
  assert.deepEqual(points.items.map(p => p.id), [saved.pointIds[0], saved.pointIds[2]]);
  assert.equal(points.items[1].breakBefore, true);
  await request(`/track-points/${saved.pointIds[1]}`, { status: 404 });
  console.log(JSON.stringify({ result: 'passed', phase: 'real API reacquisition after restart', visitId: saved.visitId, retainedPoints: points.items.length }));
} else {
  if (!placeId) throw new Error('Set ACTIVITY_PLACE_ID to an existing place in the verification DB');
  const visitId = randomUUID(), segmentId = randomUUID(), pointIds = [randomUUID(), randomUUID(), randomUUID()];
  const startedAt = Date.parse('2026-09-15T00:00:00Z');
  const body = { id: visitId, placeId, startedAt, endedAt: null, timePrecision: 'exact', origin: 'manual' };
  const key = randomUUID();
  let visit = (await request('/visits', { method: 'POST', body, key, status: 201 })).data;
  assert.equal(visit.status, 'candidate');
  const replay = (await request('/visits', { method: 'POST', body, key, status: 201 })).data;
  assert.equal(replay.id, visitId);
  visit = (await request(`/visits/${visitId}`, { method: 'PATCH', body: { status: 'confirmed' }, version: visit.version })).data;
  assert.equal((await request(`/visits/${visitId}`)).data.status, 'confirmed');
  await request(`/visits/${visitId}`, { method: 'PATCH', body: { status: 'rejected' }, version: 1, status: 412 });
  visit = (await request(`/visits/${visitId}`, { method: 'PATCH', body: { status: 'rejected' }, version: visit.version })).data;
  assert.equal(visit.status, 'rejected');
  visit = (await request(`/visits/${visitId}`, { method: 'PATCH', body: { status: 'confirmed' }, version: visit.version })).data;
  const items = pointIds.map((id, i) => ({ id, segmentId, sourcePointId: id, observedAt: startedAt + i * 60000, longitude: 139.7 + i * 0.0001, latitude: 35.6, accuracyM: 10 }));
  assert.equal((await request('/track-points', { method: 'POST', body: { items } })).data.items.length, 3);
  const before = await request(`/track-points?segmentId=${segmentId}`);
  assert.equal(before.items[1].breakBefore, false);
  const deletion = { segmentId, from: startedAt, to: startedAt + 180000, targets: [{ id: pointIds[1], version: 1 }] };
  assert.equal((await request('/track-points/delete-range', { method: 'POST', body: deletion })).data.deletedCount, 1);
  const after = await request(`/track-points?segmentId=${segmentId}`);
  assert.deepEqual(after.items.map(p => p.id), [pointIds[0], pointIds[2]]);
  assert.equal(after.items[1].breakBefore, true);
  await request('/track-points', { method: 'POST', body: { items: [items[1]] }, status: 404 });
  const day = (await request('/reflection/days/2026-09-15?timeZone=Asia%2FTokyo')).data;
  assert.equal(day.from, Date.parse('2026-09-14T15:00:00Z'));
  assert.equal(day.to, Date.parse('2026-09-15T15:00:00Z'));
  assert.equal(day.visits.status, 'ready');
  assert.ok(day.visits.data.items.some(v => v.id === visitId));
  const shortDay = (await request('/reflection/days/2026-03-08?timeZone=America%2FNew_York')).data;
  assert.equal(shortDay.to - shortDay.from, 23 * 3600000);
  writeFileSync(stateFile, JSON.stringify({ visitId, placeId, segmentId, pointIds, mode }, null, 2));
  console.log(JSON.stringify({ result: 'passed', phase: 'real API create-confirm-cancel-confirm / observation-delete-read / Tokyo and DST day bounds', visitId, retainedPoints: 2, next: 'Restart CORE with the same DB, refresh session cookie if necessary, then run verify-after-restart.' }));
}
