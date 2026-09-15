import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { serve } from '@hono/node-server';
import { createApp } from '../../app/app.ts';
import { openDatabases, type Databases } from '../../db/connection.ts';
import { loadLocalIdentity, seedProfiles } from '../../core/session.ts';
import type { ApiContract } from '../../core/validation.ts';

test('real HTTP saves profile/settings/icon and restores them after server restart in isolated person/mode', async () => {
  const feature = (await import('./register.ts')).default;
  const root = mkdtempSync(join(tmpdir(), 'settings-http-'));
  const identity = loadLocalIdentity(join(root, 'profiles.json'));
  identity.profiles.push({ key: 'other', id: randomUUID(), name: '別の本人' });
  // Compose this feature's authoritative fragment in memory; CORE owns generated shared files.
  const contract = JSON.parse(readFileSync(new URL('../../../docs/01_requirements/04_api/openapi.json', import.meta.url), 'utf8'));
  const fragment = JSON.parse(readFileSync(new URL('../../../docs/01_requirements/04_api/fragments/SETTINGS.json', import.meta.url), 'utf8'));
  Object.assign(contract.components.schemas, fragment.schemas);
  for (const { method, path, replaceOperation: _replace, ...operation } of fragment.operations) {
    (contract.paths[path] ??= {})[method.toLowerCase()] = operation;
  }
  let dbs: Databases;
  let server: Server | undefined;
  let origin: string;
  const cookies = new Map<string, string>();
  async function start() {
    dbs = openDatabases({ livePath: join(root, 'live.sqlite'), demoPath: join(root, 'demo.sqlite'), migrations: feature.migrations });
    seedProfiles(dbs, identity.profiles);
    const app = createApp({ databases: dbs, identity, features: [feature], contract: contract as ApiContract });
    await new Promise<void>(done => { server = serve({ fetch: app.fetch, hostname: '127.0.0.1', port: 0 }, address => { origin = `http://127.0.0.1:${address.port}`; done(); }) as Server; });
  }
  async function stop() {
    if (!server) return;
    await new Promise<void>((done, reject) => server!.close(error => error ? reject(error) : done()));
    server = undefined;
    dbs.close();
  }
  async function request(path: string, method = 'GET', body?: unknown, version?: number, mode = 'live') {
    const headers = new Headers({ 'X-Request-Id': randomUUID(), 'X-Data-Mode': mode, Cookie: cookies.get(mode) ?? '' });
    if (method === 'POST') headers.set('Idempotency-Key', randomUUID());
    if (version !== undefined) headers.set('If-Match', `"${version}"`);
    if (body !== undefined && !(body instanceof FormData)) headers.set('Content-Type', 'application/json');
    const response = await fetch(`${origin}/api/v1${path}`, { method, headers, body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body) });
    const cookie = response.headers.getSetCookie()[0];
    if (cookie) cookies.set(mode, cookie.split(';')[0]!);
    return response;
  }
  async function json(response: Response, status = 200) {
    const data = await response.json();
    assert.equal(response.status, status, JSON.stringify(data));
    return data.data;
  }
  try {
    await start();
    assert.equal((await request('/me/settings')).status, 401);
    await json(await request('/session', 'POST', { profileKey: 'self' }), 201);
    const original = await json(await request('/me/settings'));
    assert.equal(original.version, 1);
    const profile = await json(await request('/me', 'PATCH', { name: '再起動で残る', bio: '本人Aのプロフィール' }, 1));
    assert.equal(profile.version, 2);
    const settings = await json(await request('/me/settings', 'PATCH', { display: { fontSize: 'large', reduceMotion: true }, ai: { enabled: true, allowRecords: true, allowLocation: false, allowMedia: false, allowProfile: false } }, 1));
    assert.equal(settings.version, 2);
    assert.equal((await request('/me/settings', 'PATCH', { profileVisibility: 'public' })).status, 428);
    assert.equal((await request('/me/settings', 'PATCH', { profileVisibility: 'public' }, 1)).status, 412);
    const form = new FormData();
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9l8AAAAASUVORK5CYII=', 'base64');
    form.set('file', new Blob([png], { type: 'image/png' }), 'icon.png');
    const icon = await json(await request('/me/icon', 'PATCH', form, 2));
    assert.equal(icon.version, 3);
    assert.deepEqual(Buffer.from(await (await request('/me/icon')).arrayBuffer()), png);
    await json(await request('/session', 'POST', { profileKey: 'other' }), 201);
    assert.equal((await json(await request('/me/settings'))).version, 1);
    assert.equal((await request('/me/icon')).status, 404);
    await json(await request('/session', 'POST', { profileKey: 'self' }), 201);
    await json(await request('/session', 'POST', { profileKey: 'self' }, undefined, 'demo'), 201);
    assert.equal((await json(await request('/me/settings', 'GET', undefined, undefined, 'demo'))).version, 1);
    await stop();
    await start();
    assert.equal((await json(await request('/me'))).name, '再起動で残る');
    assert.deepEqual(await json(await request('/me/settings')), settings);
    assert.deepEqual(Buffer.from(await (await request('/me/icon')).arrayBuffer()), png);
    const exported = await request('/me/settings/export');
    assert.equal(exported.status, 200);
    assert.match(await exported.text(), /再起動で残る/);
    assert.equal((await request('/me/icon', 'DELETE', undefined, 2)).status, 412);
    assert.equal((await request('/me/icon', 'DELETE', undefined, 3)).status, 204);
    assert.equal((await request('/me/icon')).status, 404);
    assert.equal((await request('/me/settings', 'DELETE', undefined, 2)).status, 204);
    assert.equal((await json(await request('/me/settings'))).ai.enabled, false);
    assert.equal((await json(await request('/me'))).name, '再起動で残る');
    assert.equal((await json(await request('/me/data'))).categories.length, 3);
  } finally {
    await stop();
    assert.equal(dirname(resolve(root)), resolve(tmpdir()));
    assert.ok(basename(root).startsWith('settings-http-'));
    rmSync(root, { recursive: true });
  }
});
