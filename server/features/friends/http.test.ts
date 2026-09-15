import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { serve } from '@hono/node-server';
import { createApp } from '../../app/app.ts';
import { openDatabases } from '../../db/connection.ts';
import { loadLocalIdentity, seedProfiles } from '../../core/session.ts';
import { loadContract } from '../../core/validation.ts';
import friends from './register.ts';
import settings from '../settings/register.ts';

test('real HTTP profile search -> request -> recipient approval -> restart -> removal', async () => {
  const root = mkdtempSync(join(tmpdir(), 'community-social-'));
  const identity = loadLocalIdentity(join(root, 'profiles.json'));
  identity.profiles.push({ key: 'other', id: randomUUID(), name: '友達候補' });
  const contract = loadContract();
  const fragment = JSON.parse(readFileSync(new URL('../../../docs/01_requirements/04_api/fragments/SETTINGS.json', import.meta.url), 'utf8'));
  Object.assign((contract.components as any).schemas, fragment.schemas);
  for (const { method, path, ...op } of fragment.operations) (contract.paths[path] ??= {})[method] = op;
  let dbs: ReturnType<typeof openDatabases>, server: ReturnType<typeof serve>, origin: string;
  async function boot() {
    dbs = openDatabases({ livePath: join(root, 'live.sqlite'), demoPath: join(root, 'demo.sqlite'), migrations: settings.migrations });
    seedProfiles(dbs, identity.profiles);
    const app = createApp({ databases: dbs, identity, features: [friends, settings], contract });
    await new Promise<void>(resolve => { server = serve({ fetch: app.fetch, hostname: '127.0.0.1', port: 0 }, info => { origin = `http://127.0.0.1:${info.port}`; resolve(); }); });
  }
  async function stop() { await new Promise<void>(resolve => server.close(() => { dbs.close(); resolve(); })); }
  async function req(cookie: string, method: string, path: string, body?: any, version?: number, key = randomUUID()) {
    const response = await fetch(origin + '/api/v1' + path, { method, headers: { 'X-Data-Mode': 'live', 'X-Request-Id': randomUUID(), ...(cookie ? { Cookie: cookie } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}), ...(version ? { 'If-Match': `"${version}"` } : {}), ...(method === 'POST' ? { 'Idempotency-Key': key } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const raw = await response.text(); return { response, data: raw ? JSON.parse(raw) : null };
  }
  await boot();
  try {
    const a = await req('', 'POST', '/session', { profileKey: 'self' });
    const b = await req('', 'POST', '/session', { profileKey: 'other' });
    assert.equal(a.response.status, 201); assert.equal(b.response.status, 201);
    const ca = a.response.headers.getSetCookie()[0]!.split(';')[0]!, cb = b.response.headers.getSetCookie()[0]!.split(';')[0]!;
    assert.equal((await req(cb, 'PATCH', '/me/settings', { profileVisibility: 'public' }, 1)).response.status, 200);
    const people = await req(ca, 'GET', '/people?q=' + encodeURIComponent('友達候補'));
    assert.equal(people.response.status, 200, JSON.stringify(people.data));
    assert.equal(people.data.items[0].id, identity.profiles[1]!.id);
    const id = randomUUID(), key = randomUUID(), input = { id, recipientId: identity.profiles[1]!.id };
    const created = await req(ca, 'POST', '/friendships', input, undefined, key);
    assert.equal(created.response.status, 201, JSON.stringify(created.data));
    assert.equal((await req(ca, 'POST', '/friendships', input, undefined, key)).response.status, 200);
    assert.equal((await req(cb, 'PATCH', '/friendships/' + id, { status: 'accepted' }, 1)).response.status, 200);
    await stop(); await boot();
    const persisted = await req(cb, 'GET', '/friendships/' + id);
    assert.equal(persisted.data.data.status, 'accepted'); assert.equal(persisted.data.data.version, 2);
    assert.equal((await req(ca, 'DELETE', '/friendships/' + id, undefined, 2)).response.status, 204);
    assert.equal((await req(cb, 'GET', '/friendships')).data.items.length, 0);
    assert.equal((await req(ca, 'POST', '/friendships', input, undefined, key)).response.status, 404);
  } finally { await stop(); }
});
