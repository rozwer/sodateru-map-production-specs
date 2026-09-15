import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { serve } from '@hono/node-server';
import { createApp } from '../../../server/app/app.ts';
import { openDatabases } from '../../../server/db/connection.ts';
import { loadLocalIdentity, seedProfiles } from '../../../server/core/session.ts';
import { loadContract } from '../../../server/core/validation.ts';
import records from '../../../server/features/records/register.ts';
import { exerciseRecords } from './acceptance.mjs';

// The feature-owned fragment is applied to this isolated test server until CORE
// publishes the same operations into the generated shared contract.
function contract() {
  const result = loadContract();
  const fragment = JSON.parse(readFileSync(new URL('../../01_requirements/04_api/fragments/RECORDS.json', import.meta.url), 'utf8'));
  Object.assign(result.components.schemas, fragment.schemas);
  for (const { method, path, ...operation } of fragment.operations) (result.paths[path] ??= {})[method] = operation;
  return result;
}

if (process.argv[2] === 'serve') {
  const directory = process.argv[3];
  const databases = openDatabases({ livePath: join(directory, 'live.sqlite'), demoPath: join(directory, 'demo.sqlite'), migrations: records.migrations });
  const identity = loadLocalIdentity(join(directory, 'profiles.json'));
  identity.profiles.push({ key: 'other', id: 'acceptance-other', name: '別の本人' });
  seedProfiles(databases, identity.profiles);
  const app = createApp({ databases, identity, features: [records], contract: contract() });
  const server = serve({ fetch: app.fetch, hostname: '127.0.0.1', port: 0 }, address => process.stdout.write(JSON.stringify({ origin: `http://127.0.0.1:${address.port}` }) + '\n'));
  process.stdin.once('data', () => server.close(() => { databases.close(); process.exit(0); }));
} else {
  const directory = mkdtempSync(join(tmpdir(), 'sodateru-records-'));
  let child, origin;
  async function boot() {
    child = spawn(process.execPath, ['--experimental-transform-types', fileURLToPath(import.meta.url), 'serve', directory], { stdio: ['pipe', 'pipe', 'inherit'], windowsHide: true });
    origin = await new Promise((resolve, reject) => { const lines = createInterface({ input: child.stdout }); lines.once('line', line => { try { resolve(JSON.parse(line).origin); } catch (e) { reject(e); } }); child.once('exit', code => { if (code) reject(new Error(`Server exited ${code}`)); }); });
  }
  async function stop() { await new Promise(resolve => { child.once('exit', resolve); child.stdin.write('stop\n'); }); }
  const headers = mode => ({ 'X-Request-Id': randomUUID(), 'X-Data-Mode': mode });
  async function login(profileKey, mode) {
    const response = await fetch(`${origin}/api/v1/session`, { method: 'POST', headers: { ...headers(mode), 'Content-Type': 'application/json', 'Idempotency-Key': randomUUID() }, body: JSON.stringify({ profileKey }) });
    assert.equal(response.status, 201, await response.text());
    return response.headers.getSetCookie()[0].split(';')[0];
  }
  async function request(path, cookie, mode, options = {}) { return fetch(`${origin}/api/v1${path}`, { ...options, headers: { ...headers(mode), Cookie: cookie, ...(options.headers ?? {}) } }); }
  try {
    await boot();
    const cookie = await login('self', 'live'), otherCookie = await login('other', 'live'), demoCookie = await login('self', 'demo');
    const result = await exerciseRecords(origin, cookie);
    const id = `restart-${randomUUID()}`;
    const input = { id, kind: 'experience', visitId: null, placeId: null, occurredAt: null, endedAt: null, timePrecision: 'unknown', body: '再起動しても保持する原文 🍵\n', purposes: [], activities: [], impression: '', periodAnswers: {}, bookmarked: false, useForSuggestions: true, topicKey: null, visibility: 'private', sharedWith: [] };
    const saved = await request('/records', cookie, 'live', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': id }, body: JSON.stringify(input) });
    assert.equal(saved.status, 201, await saved.text());
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
    for (let position = 0; position < 2; position++) {
      const form = new FormData(); form.set('id', `${id}-${position}`); form.set('position', String(position)); form.set('file', new Blob([png], { type: 'image/png' }), 'photo.png');
      const response = await request(`/records/${id}/media`, cookie, 'live', { method: 'POST', headers: { 'Idempotency-Key': `${id}-${position}`, 'If-Match': `"${position + 1}"` }, body: form });
      assert.equal(response.status, 201, await response.text());
    }
    const reordered = await request(`/records/${id}/media/reorder`, cookie, 'live', { method: 'POST', headers: { 'Idempotency-Key': `${id}-order`, 'If-Match': '"3"', 'Content-Type': 'application/json' }, body: JSON.stringify({ items: [{ id: `${id}-1`, version: 1 }, { id: `${id}-0`, version: 1 }] }) });
    assert.equal(reordered.status, 200, await reordered.text());
    assert.equal((await request(`/records/${id}`, otherCookie, 'live')).status, 404);
    assert.equal((await request(`/records/${id}`, demoCookie, 'demo')).status, 404);
    await stop();
    await boot();
    const restored = await request(`/records/${id}`, cookie, 'live');
    assert.equal(restored.status, 200);
    const restoredData = (await restored.json()).data;
    assert.equal(restoredData.record.body, input.body);
    assert.deepEqual(restoredData.media.data.items.map(m => m.id), [`${id}-1`, `${id}-0`]);
    assert.deepEqual(Buffer.from(await (await request(`/media/${id}-0/content`, cookie, 'live')).arrayBuffer()), png);
    assert.equal((await request(`/media/${id}-0/content`, otherCookie, 'live')).status, 404);
    const shared = await request(`/records/${id}`, cookie, 'live', { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'If-Match': '"4"' }, body: JSON.stringify({ visibility: 'selected', sharedWith: ['acceptance-other'] }) });
    assert.equal(shared.status, 200, await shared.text());
    assert.equal((await request(`/records/${id}`, otherCookie, 'live')).status, 200);
    assert.equal((await request(`/media/${id}-0/content`, otherCookie, 'live')).status, 200);
    const privateAgain = await request(`/records/${id}`, cookie, 'live', { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'If-Match': '"5"' }, body: JSON.stringify({ visibility: 'private', sharedWith: [] }) });
    assert.equal(privateAgain.status, 200, await privateAgain.text());
    assert.equal((await request(`/records/${id}`, otherCookie, 'live')).status, 404);
    assert.equal((await request(`/media/${id}-0/content`, otherCookie, 'live')).status, 404);
    await stop();
    console.log(JSON.stringify({ status: 'PASS', ...result, restart: 'separate OS process', sharing: 'private -> selected -> private', isolation: 'other owner and demo denied', databaseDirectory: directory }));
  } finally { if (child && child.exitCode === null) await stop(); }
}
