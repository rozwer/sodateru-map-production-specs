import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { serve } from '@hono/node-server';
import type { Server } from 'node:http';
import { createApp } from '../app/app.ts';
import { openDatabases, type Databases } from '../db/connection.ts';
import { migrate, transaction } from '../db/migrate.ts';
import { createApiClient, ApiError, type FeatureRequest, type FeatureRequestCreate, type FeatureRequestPatch } from '../../packages/api-client/index.ts';
import { loadLocalIdentity, seedProfiles } from './session.ts';
import { CommonError, expectedVersion, requireVersion } from './errors.ts';
import { canonicalJson, requestHash, idempotentMutation, beginRequest, completeRequest, pruneExpiredResults } from './idempotency.ts';
import { defineFeature, loadFeatures } from './features.ts';

/** Test-only extension exercising the existing FeatureRequest wire schema. Not production FEATURE-REQUESTS. */
const fixture = defineFeature({
  id: 'core-acceptance-fixture',
  migrations: [{ id: 'core-acceptance-fixture/001', sql: 'CREATE TABLE core_test_documents(id TEXT PRIMARY KEY, person_id TEXT NOT NULL REFERENCES people(id), version INTEGER NOT NULL, value_json TEXT NOT NULL) STRICT;' }],
  register(api) {
    api.post('/feature-requests', c => {
      const db = c.get('db'), context = c.get('context'), body = c.get('input').body as FeatureRequestCreate;
      const read = (id: string) => {
        const row = db.prepare('SELECT value_json FROM core_test_documents WHERE id=? AND person_id=?').get(id, context.personId);
        if (!row) throw new CommonError('NOT_FOUND', '対象がありません。');
        return JSON.parse(String(row.value_json)) as FeatureRequest;
      };
      const result = idempotentMutation(db, { context, operation: 'POST /api/v1/feature-requests', key: c.req.header('Idempotency-Key')!, input: body }, {
        execute() {
          const now = Date.now();
          const data = { ...body, personId: context.personId, version: 1, createdAt: now, updatedAt: now };
          db.prepare('INSERT INTO core_test_documents VALUES (?,?,?,?)').run(body.id, context.personId, 1, JSON.stringify(data));
          return { status: 201, body: { data }, resource: { type: 'fixture', id: body.id } };
        },
        replay(result) { return { status: 200, body: { data: read(result.resource!.id) } }; },
      });
      return c.body(JSON.stringify(result.body), result.status as 200 | 201, { 'Content-Type': 'application/json', Location: '/api/v1/feature-requests/' + body.id });
    });
    api.get('/feature-requests/:requestId', c => {
      const row = c.get('db').prepare('SELECT value_json FROM core_test_documents WHERE id=? AND person_id=?').get(c.req.param('requestId'), c.get('context').personId);
      if (!row) throw new CommonError('NOT_FOUND', '対象がありません。');
      const data = JSON.parse(String(row.value_json)) as FeatureRequest;
      c.header('ETag', `"${data.version}"`);
      return c.json({ data });
    });
    api.patch('/feature-requests/:requestId', c => {
      const db = c.get('db'), id = c.req.param('requestId'), owner = c.get('context').personId;
      const data = transaction(db, () => {
        const row = db.prepare('SELECT value_json FROM core_test_documents WHERE id=? AND person_id=?').get(id, owner);
        if (!row) throw new CommonError('NOT_FOUND', '対象がありません。');
        const current = JSON.parse(String(row.value_json)) as FeatureRequest;
        const expected = expectedVersion(c.req.header('If-Match'));
        requireVersion(current.version, expected);
        const updated = { ...current, ...c.get('input').body as FeatureRequestPatch, version: current.version + 1, updatedAt: Date.now() };
        const result = db.prepare('UPDATE core_test_documents SET value_json=?,version=? WHERE id=? AND person_id=? AND version=?').run(JSON.stringify(updated), updated.version, id, owner, expected);
        if (result.changes !== 1) throw new CommonError('VERSION_CONFLICT', '版が変更されました。');
        return updated;
      });
      c.header('ETag', `"${data.version}"`);
      return c.json({ data });
    });
    api.delete('/feature-requests/:requestId', c => {
      const result = c.get('db').prepare('DELETE FROM core_test_documents WHERE id=? AND person_id=? AND version=?').run(c.req.param('requestId'), c.get('context').personId, expectedVersion(c.req.header('If-Match')));
      if (result.changes !== 1) throw new CommonError('VERSION_CONFLICT', '版が変更されました。');
      return c.body(null, 204);
    });
  },
});

test('real HTTP: empty DB, local identity, live/demo isolation, replay, restart, versions and registered extension', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'sodateru-core-'));
  const paths = { livePath: join(directory, 'live.sqlite'), demoPath: join(directory, 'demo.sqlite') };
  const identity = loadLocalIdentity(join(directory, 'profiles.json'));
  identity.profiles.push({ key: 'other', id: randomUUID(), name: '別の本人' });
  let dbs: Databases;
  let server: Server;
  let origin = '';
  async function boot() {
    dbs = openDatabases({ ...paths, migrations: fixture.migrations });
    seedProfiles(dbs, identity.profiles);
    await mkdir(join(directory, 'dist'), { recursive: true });
    await writeFile(join(directory, 'dist/index.html'), '<!doctype html><title>CORE static serving fixture</title>');
    const app = createApp({ databases: dbs, identity, features: [fixture], staticRoot: join(directory, 'dist') });
    await new Promise<void>(resolve => {
      server = serve({ fetch: app.fetch, hostname: '127.0.0.1', port: 0 }, address => { origin = `http://127.0.0.1:${address.port}`; resolve(); }) as Server;
    });
  }
  async function stop() { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); dbs.close(); }
  function browser() {
    const cookies = new Map<string, string>();
    const fetcher: typeof fetch = async (url, init) => {
      const headers = new Headers(init?.headers);
      headers.set('Cookie', [...cookies].map(([key, value]) => key + '=' + value).join('; '));
      const path = new URL(String(url)).pathname + new URL(String(url)).search;
      const response = await fetch(origin + path, { ...init, headers });
      for (const cookie of response.headers.getSetCookie()) {
        const pair = cookie.split(';')[0]!, at = pair.indexOf('=');
        cookies.set(pair.slice(0, at), pair.slice(at + 1));
      }
      return response;
    };
    return { client: createApiClient({ baseUrl: 'http://fixture/api/v1', fetch: fetcher }), fetcher, cookies };
  }
  try {
    await boot();
    const { client, fetcher } = browser();
    const expectError = (status: number, code: string) => (error: unknown) => error instanceof ApiError && error.status === status && error.code === code;
    assert.match(await (await fetch(origin + '/some-screen')).text(), /CORE static serving fixture/);
    await assert.rejects(client.request('getMe', {}), expectError(401, 'UNAUTHENTICATED'));
    assert.deepEqual((await client.request('getSessionProfiles', {})).items.map(x => x.profileKey), ['self', 'other']);
    const session = await client.request('postSession', { body: { profileKey: 'self' }, idempotencyKey: 'login-live' });
    assert.equal(session.data.person.id, identity.profiles[0]!.id);
    assert.equal((await client.request('getMe', {})).data.id, session.data.person.id);
    const input = { id: 'fixture-live', title: '再起動で保持', body: 'live保存', visibility: 'private' as const };
    const [saved, replay] = await Promise.all([
      client.request('postFeatureRequests', { body: input, idempotencyKey: 'save-1' }),
      client.request('postFeatureRequests', { body: { visibility: 'private', body: input.body, title: input.title, id: input.id }, idempotencyKey: 'save-1' }),
    ]);
    assert.deepEqual(saved, replay);
    assert.equal(dbs!.live.prepare('SELECT count(*) AS n FROM core_test_documents').get()!.n, 1);
    await assert.rejects(client.request('postFeatureRequests', { body: { ...input, body: 'different' }, idempotencyKey: 'save-1' }), expectError(409, 'IDEMPOTENCY_CONFLICT'));
    client.setDataMode('demo');
    await assert.rejects(client.request('getMe', {}), expectError(401, 'UNAUTHENTICATED'));
    await client.request('postSession', { body: { profileKey: 'self' }, idempotencyKey: 'login-demo' });
    await assert.rejects(client.request('getFeatureRequestsRequestId', { path: { requestId: input.id } }), expectError(404, 'NOT_FOUND'));
    const demo = await client.request('postFeatureRequests', { body: { ...input, body: 'demo保存' }, idempotencyKey: 'save-1' });
    assert.equal(demo.data.body, 'demo保存');
    await stop();
    await boot();
    assert.equal((await client.request('getFeatureRequestsRequestId', { path: { requestId: input.id } })).data.body, 'demo保存');
    client.setDataMode('live');
    assert.equal((await client.request('getFeatureRequestsRequestId', { path: { requestId: input.id } })).data.body, 'live保存');
    assert.deepEqual(await client.request('postFeatureRequests', { body: input, idempotencyKey: 'save-1' }), saved);
    assert.equal(dbs!.live.prepare("SELECT count(*) AS n FROM core_migrations WHERE id='core-acceptance-fixture/001'").get()!.n, 1);
    const updated = await client.request('patchFeatureRequestsRequestId', { path: { requestId: input.id }, body: { title: '訂正' }, version: 1 });
    assert.equal(updated.data.version, 2);
    await assert.rejects(client.request('patchFeatureRequestsRequestId', { path: { requestId: input.id }, body: { title: '古い版' }, version: 1 }), expectError(412, 'VERSION_CONFLICT'));
    const missingVersion = await fetcher('http://fixture/api/v1/feature-requests/' + input.id, { method: 'PATCH', headers: { 'X-Request-Id': randomUUID(), 'X-Data-Mode': 'live', 'Content-Type': 'application/json' }, body: '{"title":"版なし"}' });
    assert.equal(missingVersion.status, 428);
    const unknownField = await fetcher('http://fixture/api/v1/session', { method: 'POST', headers: { 'X-Request-Id': randomUUID(), 'X-Data-Mode': 'live', 'Content-Type': 'application/json', 'Idempotency-Key': 'unknown' }, body: '{"profileKey":"self","personId":"other"}' });
    assert.equal(unknownField.status, 422);
    const unknownQuery = await fetcher('http://fixture/api/v1/me?personId=other', { headers: { 'X-Request-Id': randomUUID(), 'X-Data-Mode': 'live' } });
    assert.equal(unknownQuery.status, 400);
    const other = browser();
    await other.client.request('postSession', { body: { profileKey: 'other' }, idempotencyKey: 'login-other' });
    await assert.rejects(other.client.request('getFeatureRequestsRequestId', { path: { requestId: input.id } }), expectError(404, 'NOT_FOUND'));
    await client.request('deleteFeatureRequestsRequestId', { path: { requestId: input.id }, version: 2 });
    await assert.rejects(client.request('postFeatureRequests', { body: input, idempotencyKey: 'save-1' }), expectError(404, 'NOT_FOUND'));
    await client.request('deleteSession', { version: 1 });
    await assert.rejects(client.request('getMe', {}), expectError(401, 'UNAUTHENTICATED'));
    await assert.rejects(client.request('postSession', { body: { profileKey: 'self' }, idempotencyKey: 'login-live' }), expectError(404, 'NOT_FOUND'));
    assert.equal(dbs!.live.prepare('PRAGMA foreign_key_check').all().length, 0);
    await stop();
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('canonical input preserves ordered arrays and sorts object keys by Unicode code point', () => {
  assert.equal(requestHash({ b: 2, a: [2, 1] }), requestHash({ a: [2, 1], b: 2 }));
  assert.notEqual(requestHash([1, 2]), requestHash([2, 1]));
  assert.equal(canonicalJson({ '\u{10000}': 1, '\uE000': 2 }), '{"\uE000":2,"\u{10000}":1}');
  assert.throws(() => requestHash({ invalid: NaN }), CommonError);
});

test('migration rollback, changed migration rejection, and pending external receipts survive restart', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'sodateru-core-db-'));
  const paths = { livePath: join(directory, 'live.sqlite'), demoPath: join(directory, 'demo.sqlite') };
  let dbs = openDatabases(paths);
  try {
    const identity = loadLocalIdentity(join(directory, 'profiles.json')); seedProfiles(dbs, identity.profiles);
    assert.throws(() => migrate(dbs.live, [{ id: 'broken', sql: 'CREATE TABLE should_rollback(id TEXT); INVALID SQL;' }]));
    assert.equal(dbs.live.prepare("SELECT name FROM sqlite_master WHERE name='should_rollback'").get(), undefined);
    assert.throws(() => migrate(dbs.live, [{ id: '000-base', sql: 'SELECT 1;' }]), /Applied migration changed/);
    assert.throws(() => openDatabases({ livePath: paths.livePath, demoPath: paths.livePath }), /separate/);
    const request = { context: { personId: identity.profiles[0]!.id, dataMode: 'live' as const, requestId: randomUUID(), signal: new AbortController().signal }, operation: 'POST /api/v1/test-external', key: 'external-1', input: { value: 1 } };
    const started = beginRequest(dbs.live, request);
    dbs.close(); dbs = openDatabases(paths);
    assert.throws(() => beginRequest(dbs.live, request), (error: unknown) => error instanceof CommonError && error.code === 'BUSY');
    completeRequest(dbs.live, started.receipt, { status: 200, body: { data: 1 }, expiresAt: Date.now() - 1 });
    pruneExpiredResults(dbs.live);
    assert.equal(dbs.live.prepare('SELECT result_json FROM core_requests WHERE request_key=?').get('external-1')!.result_json, null);
    assert.throws(() => beginRequest(dbs.live, request), (error: unknown) => error instanceof CommonError && error.code === 'RESULT_EXPIRED');
  } finally { dbs.close(); await rm(directory, { recursive: true, force: true }); }
});

test('feature discovery needs only the feature registration file', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'sodateru-core-feature-'));
  try {
    await mkdir(join(directory, 'independent'));
    await writeFile(join(directory, 'independent/register.ts'), 'export default {id:"independent", migrations:[{id:"independent/001",sql:"CREATE TABLE independent(id TEXT);"}], register(api) { api.get("/independent", c => c.json({data:1})); }}');
    const features = await loadFeatures(directory);
    assert.equal(features[0]!.id, 'independent');
    assert.equal(features[0]!.migrations![0]!.id, 'independent/001');
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('client rejects late success after mode switch even when transport ignores abort', async () => {
  let finish!: (response: Response) => void;
  const client = createApiClient({ fetch: () => new Promise<Response>(resolve => { finish = resolve; }) });
  const request = client.request('getMe', {});
  client.setDataMode('demo');
  finish(new Response('{"data":{"id":"old-person"}}', { headers: { 'Content-Type': 'application/json' } }));
  await assert.rejects(request, (error: unknown) => error instanceof DOMException && error.name === 'AbortError');
});
