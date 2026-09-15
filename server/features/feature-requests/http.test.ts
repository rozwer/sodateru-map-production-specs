import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { dirname, basename, resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { serve } from '@hono/node-server';
import { createApp } from '../../app/app.ts';
import { openDatabases, type Databases } from '../../db/connection.ts';
import { loadLocalIdentity, seedProfiles } from '../../core/session.ts';
import feature from './register.ts';

test('HTTP post/replay/empathy/edit/delete persist after restart and private drafts stay private', async () => {
  const root = mkdtempSync(join(tmpdir(), 'feature-requests-'));
  const identity = loadLocalIdentity(join(root, 'profiles.json'));
  identity.profiles.push({ key: 'other', id: randomUUID(), name: '別の本人' });
  const contract = JSON.parse(readFileSync(new URL('../../../docs/01_requirements/04_api/openapi.json', import.meta.url), 'utf8'));
  const fragment = JSON.parse(readFileSync(new URL('../../../docs/01_requirements/04_api/fragments/FEATURE-REQUESTS.json', import.meta.url), 'utf8'));
  Object.assign(contract.components.schemas, fragment.schemas);
  for (const { method, path, replaceOperation: _replace, ...operation } of fragment.operations) (contract.paths[path] ??= {})[method.toLowerCase()] = operation;
  let dbs: Databases;
  let server: Server | undefined;
  let origin = '';
  let cookie = '';
  async function boot() {
    dbs = openDatabases({ livePath: join(root, 'live.sqlite'), demoPath: join(root, 'demo.sqlite'), migrations: feature.migrations });
    seedProfiles(dbs, identity.profiles);
    const app = createApp({ databases: dbs, identity, features: [feature], contract });
    await new Promise<void>(done => { server = serve({ fetch: app.fetch, hostname: '127.0.0.1', port: 0 }, address => { origin = `http://127.0.0.1:${address.port}`; done(); }) as Server; });
  }
  async function stop() { if (server) { await new Promise<void>((done, reject) => server!.close(error => error ? reject(error) : done())); server = undefined; dbs.close(); } }
  async function request(path: string, method = 'GET', body?: unknown, version?: number, key = randomUUID()) {
    const headers = new Headers({ 'X-Request-Id': randomUUID(), 'X-Data-Mode': 'live', Cookie: cookie });
    if (body !== undefined) headers.set('Content-Type', 'application/json');
    if (version !== undefined) headers.set('If-Match', `"${version}"`);
    if (method === 'POST') headers.set('Idempotency-Key', key);
    const result = await fetch(origin + '/api/v1' + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    if (result.headers.getSetCookie()[0]) cookie = result.headers.getSetCookie()[0]!.split(';')[0]!;
    return result;
  }
  async function data(response: Response, status = 200) { const body = await response.json(); assert.equal(response.status, status, JSON.stringify(body)); return body.data; }
  try {
    await boot();
    await data(await request('/session', 'POST', { profileKey: 'self' }), 201);
    const input = { id: 'post-1', body: '駅にベンチがほしい\n雨の日も使いたい', displayName: '固定の投稿名', visibility: 'public', regionTags: ['本山'], purposeTags: ['休憩'] };
    const key = randomUUID();
    let post = await data(await request('/feature-requests', 'POST', input, undefined, key), 201);
    assert.equal(post.title, '駅にベンチがほしい');
    assert.deepEqual(await data(await request('/feature-requests', 'POST', input, undefined, key)), post);
    assert.equal((await request('/feature-requests', 'POST', { ...input, body: '異なる内容' }, undefined, key)).status, 409);
    await data(await request('/feature-requests', 'POST', { id: 'draft-1', displayName: '下書き名', body: '', visibility: 'private' }), 201);
    dbs!.live.prepare('UPDATE people SET name=? WHERE id=?').run('変更後の本人名', identity.profiles[0]!.id);
    assert.equal((await data(await request('/feature-requests/post-1'))).displayName, '固定の投稿名');
    await data(await request('/session', 'POST', { profileKey: 'other' }), 201);
    assert.equal((await request('/feature-requests/draft-1')).status, 404);
    assert.equal((await request('/feature-requests/post-1', 'PATCH', { body: '他人の編集' }, 1)).status, 403);
    post = await data(await request('/feature-requests/post-1/empathy', 'PATCH', { empathy: true }, 1));
    assert.equal(post.empathyCount, 1);
    assert.equal((await data(await request('/feature-requests/post-1/empathy', 'PATCH', { empathy: true }, 1))).empathyCount, 1);
    await stop(); await boot();
    post = await data(await request('/feature-requests/post-1'));
    assert.equal(post.myEmpathy, true);
    assert.equal(post.empathyCount, 1);
    post = await data(await request('/feature-requests/post-1/empathy', 'PATCH', { empathy: false }, post.version));
    assert.equal(post.empathyCount, 0);
    await data(await request('/session', 'POST', { profileKey: 'self' }), 201);
    post = await data(await request('/feature-requests/post-1', 'PATCH', { body: '休めるベンチがほしい', displayName: '明示編集した投稿名' }, post.version));
    assert.equal(post.title, '休めるベンチがほしい');
    assert.equal((await request('/feature-requests/post-1', 'PATCH', { body: '古い編集' }, 1)).status, 412);
    const list = await (await request('/feature-requests?limit=1')).json();
    assert.equal(list.items.length, 1);
    assert.ok(list.nextCursor);
    const next = await (await request('/feature-requests?limit=1&cursor=' + encodeURIComponent(list.nextCursor))).json();
    assert.equal(next.items.length, 1);
    assert.notEqual(next.items[0].id, list.items[0].id);
    const guide = await data(await request('/feature-requests/development-guide'));
    assert.match(guide.url, /sodateru-task\/SKILL.md$/);
    assert.equal((await request('/feature-requests/post-1', 'DELETE', undefined, post.version)).status, 204);
    await stop(); await boot();
    assert.equal((await request('/feature-requests/post-1')).status, 404);
    assert.equal((await request('/feature-requests', 'POST', input, undefined, key)).status, 404);
    assert.equal(dbs!.live.prepare('SELECT COUNT(*) n FROM feature_request_empathy').get()!.n, 0);
  } finally {
    await stop();
    assert.equal(dirname(resolve(root)), resolve(tmpdir())); assert.ok(basename(root).startsWith('feature-requests-'));
    rmSync(root, { recursive: true });
  }
});
