import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { serve } from '@hono/node-server';
import type { Server } from 'node:http';
import { createApp } from '../app/app.ts';
import { openDatabases, type Databases } from '../db/connection.ts';
import { loadLocalIdentity, seedProfiles } from '../core/session.ts';
import { createApiClient, ApiError } from '../../packages/api-client/index.ts';
import information from './register.ts';
import { createInformationService, canReadShared, type SourceRef } from './service.ts';
import { queryFromUrl } from './query.ts';
import type { RequestContext } from '../core/context.ts';

const context = (personId: string, dataMode: 'live' | 'demo' = 'live') => ({personId, dataMode, requestId: 'test-request', signal: new AbortController().signal}) as RequestContext;
const a = context('person-a'), b = context('person-b');
function insert(db: DatabaseSync, table: string, values: Record<string, SQLInputValue>) {
  const row = {version: 1, created_at: 1000, updated_at: 1000, ...values};
  const keys = Object.keys(row);
  db.prepare(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`).run(...Object.values(row));
}
function seed(db: DatabaseSync) {
  // Use CORE's actual base schema; there is no second schema generator or mock database.
  db.exec(readFileSync(new URL('../db/migrations/000-base.sql', import.meta.url), 'utf8'));
  for (const id of ['person-a', 'person-b']) insert(db, 'people', {id, name: id === 'person-a' ? 'ＡＬＩＣＥ' : 'Bob', bio: '', avatar_path: null});
  insert(db, 'places', {id: 'place', name: 'ＣＡＦＥ 公園', longitude: 139, latitude: 35, address: '東京都', provider: 'manual', external_id: null, building_key: null, source_url: null, attribution: 'Test fixture', fetched_at: null});
}
function record(db: DatabaseSync, id: string, changes: Record<string, SQLInputValue> = {}) {
  insert(db, 'records', {id, person_id: 'person-a', kind: 'experience', visit_id: null, place_id: 'place',
    occurred_at: 1000, ended_at: null, time_precision: 'exact', body: 'ordinary', purposes_json: '[]', activities_json: '[]',
    impression: '', period_answers_json: '{}', bookmarked: 0, use_for_suggestions: 1, topic_key: null,
    visibility: 'private', shared_with_json: '[]', ...changes});
}
function fixture() { const db = new DatabaseSync(':memory:'); seed(db); return db; }

test('all filters precede pagination: matching record after 101, NFKC, map and totals', () => {
  const db = fixture();
  try {
    for (let i = 0; i < 130; i++) record(db, `record-${String(i).padStart(3, '0')}`, {occurred_at: 2000 - i, body: i >= 120 ? '  ＳＰＥＣＩＡＬ　体験' : 'ordinary', purposes_json: i >= 120 ? '["休憩"]' : '[]'});
    record(db, 'unknown-location', {place_id: null, body: 'special 体験', purposes_json: '["休憩"]'});
    const info = createInformationService(db);
    const query = {text: 'ＳＰＥＣＩＡＬ', purposes: ['休憩'], audience: 'own' as const, limit: 3};
    const first = info.searchRecords(a, query);
    assert.equal(first.totalCount, 11);
    const ids = first.items.map(item => item.id);
    let cursor = first.nextCursor;
    while (cursor) { const page = info.searchRecords(a, {...query, cursor}); ids.push(...page.items.map(item => item.id)); cursor = page.nextCursor; }
    assert.equal(new Set(ids).size, 11);
    assert.equal(ids.length, 11);
    const map = info.mapRecords(a, query);
    assert.equal(map.totalCount, 11); assert.equal(map.items.length, 10);
    assert.ok(map.items.every(item => ids.includes(item.recordId)));
    assert.equal(info.searchRecords(a, {text: 'cafe'}).totalCount, 130);
    assert.equal(info.searchRecords(a, {text: 'alice'}).totalCount, 131);
    assert.equal(info.searchRecords(a, {center: [139, 35], radiusM: 1}).totalCount, 130);
    assert.equal(info.searchRecords(a, {bbox: [139, 35, 139, 35]}).totalCount, 130);
    assert.throws(() => info.searchRecords(a, {...query, text: 'other', cursor: first.nextCursor}));
    assert.throws(() => info.searchRecords(b, {...query, cursor: first.nextCursor}));
    assert.throws(() => info.searchRecords(context('person-a', 'demo'), {...query, cursor: first.nextCursor}));
  } finally { db.close(); }
});

test('equal timestamps, unknown dates, effective visit fields and interval boundaries', () => {
  const db = fixture();
  try {
    insert(db, 'visits', {id: 'visit', person_id: 'person-a', place_id: 'place', started_at: 1000, ended_at: 2000, time_precision: 'approximate', origin: 'manual', status: 'rejected'});
    record(db, 'a', {visit_id: 'visit', place_id: null, occurred_at: null, time_precision: 'unknown'});
    record(db, 'b'); record(db, 'c', {occurred_at: null, time_precision: 'unknown'});
    record(db, 'd', {occurred_at: 2000, ended_at: 2000});
    const info = createInformationService(db);
    const ids: string[] = []; let cursor: string | null = null;
    do { const page = info.searchRecords(a, {limit: 1, cursor}); ids.push(...page.items.map(r => r.id)); cursor = page.nextCursor; } while (cursor);
    assert.deepEqual(ids, ['d', 'a', 'b', 'c']);
    const range = {startAt: 2000, endAt: 3000, timezone: 'Asia/Tokyo'};
    assert.deepEqual(info.allRecords(a, {range}).map(r => r.id), ['d']);
    assert.deepEqual(info.allRecords(a, {range, includeUndated: true}).map(r => r.id), ['d', 'c']);
    assert.deepEqual(info.ownRecordsPage(a, {range: {startAt: 1500, endAt: 2500, timezone: 'Asia/Tokyo'}, rangeMatch: 'startsWithin'}).items.map(r => r.id), ['d']);
    assert.deepEqual(info.ownMaterials(a, {range: {startAt: 1500, endAt: 2500, timezone: 'Asia/Tokyo'}}).map(r => r.id), ['d', 'a']);
    const view = info.getRecord(a, 'a');
    assert.equal(view.place?.id, 'place'); assert.equal(view.effectiveAt, 1000); assert.equal(view.endedAt, 2000);
    assert.equal(view.timePrecision, 'approximate'); assert.equal(view.visitStatus, 'rejected'); assert.equal(view.body, 'ordinary');
    assert.deepEqual(view.sourceRefs.map(r => r.type), ['place', 'record', 'visit']);
    assert.equal(info.ownVisits(b, 'place').length, 0);
    const edit = info.getOwnRecord(a, 'a'); assert.equal(edit.placeId, null); assert.equal(edit.effectivePlaceId, 'place');
    assert.throws(() => info.getOwnRecord(b, 'a'));
    assert.throws(() => queryFromUrl(new URL('http://local/?from=1&to=2')));
    assert.throws(() => info.searchRecords(a, {range: {...range, timezone: 'Invalid/Zone'}}));
    assert.throws(() => info.mapRecords(a, {cursor: 'partial'}));
  } finally { db.close(); }
});

test('two-person sharing matrix and media permissions follow current records', () => {
  const db = fixture();
  try {
    record(db, 'private'); record(db, 'public', {visibility: 'public'});
    record(db, 'selected', {visibility: 'selected', shared_with_json: '["person-b"]'});
    for (const id of ['private', 'public', 'selected']) insert(db, 'media', {id: `media-${id}`, record_id: id, storage_key: `${id}.png`, kind: 'photo', mime_type: 'image/png', byte_size: 100, position: 0, status: 'ready'});
    const info = createInformationService(db);
    assert.equal(info.allRecords(a).length, 3); assert.equal(info.allRecords(b).length, 2);
    assert.equal(info.searchRecords(b, {audience: 'selected'}).totalCount, 1);
    assert.equal(info.searchRecords(a, {audience: 'selected'}).totalCount, 0);
    assert.equal(info.searchRecords(b, {audience: 'friends'}).totalCount, 0);
    insert(db, 'friendships', {id: 'friend', requester_id: 'person-b', recipient_id: 'person-a', status: 'pending'});
    assert.equal(info.searchRecords(b, {audience: 'friends'}).totalCount, 0);
    db.exec("UPDATE friendships SET status='accepted',version=2");
    assert.equal(info.searchRecords(b, {audience: 'friends'}).totalCount, 2);
    db.exec('DELETE FROM friendships');
    assert.equal(info.searchRecords(b, {audience: 'friends'}).totalCount, 0);
    assert.equal(info.getRecord(b, 'selected').id, 'selected');
    assert.equal(info.requireReadableMedia(b, 'media-selected').id, 'media-selected');
    assert.throws(() => info.requireReadableMedia(b, 'media-private'));
    assert.throws(() => info.getRecord(b, 'private'));
    db.exec("UPDATE records SET visibility='private',shared_with_json='[]',version=2 WHERE id='selected'");
    assert.throws(() => info.getRecord(b, 'selected'));
    assert.throws(() => info.requireReadableMedia(b, 'media-selected'));
    assert.equal(info.getRecord(a, 'selected').media[0]?.contentUrl, '/api/v1/media/media-selected/content');
    assert.equal(JSON.stringify(info.getRecord(a, 'selected')).includes('storage_key'), false);
    assert.equal(canReadShared(b, {personId: 'person-a', visibility: 'selected', sharedWith: ['person-b']}), true);
  } finally { db.close(); }
});

test('source checks distinguish change from unavailable and survive reopening SQLite', () => {
  const directory = mkdtempSync(join(tmpdir(), 'information-'));
  const path = join(directory, 'live.sqlite');
  let db = new DatabaseSync(path);
  try {
    seed(db);
    insert(db, 'visits', {id: 'visit', person_id: 'person-a', place_id: 'place', started_at: 1000, ended_at: null, time_precision: 'exact', origin: 'manual', status: 'confirmed'});
    record(db, 'shared', {visit_id: 'visit', place_id: null, occurred_at: null, time_precision: 'unknown', visibility: 'selected', shared_with_json: '["person-b"]'});
    insert(db, 'self_checkins', {id: 'checkin', person_id: 'person-a', local_date: '2026-09-15', answers_json: '{"state":"","wishes":[],"minutes":null,"note":""}', valid_until: 100000});
    insert(db, 'saved_routes', {id: 'route', person_id: 'person-a', title: 'Test route', waypoints_json: '[{"lng":139,"lat":35},{"lng":139.1,"lat":35.1}]', route_json: '{"geometry":null,"legs":[]}', distance_m: null, duration_sec: null, provider: null, source_url: null, fetched_at: null, status: 'saved', current_leg: 0, visibility: 'public', shared_with_json: '[]'});
    let info = createInformationService(db);
    const refs = info.getRecord(b, 'shared').sourceRefs;
    assert.ok(info.checkSources(b, {refs}).every(r => r.state === 'current'));
    const visitRef: SourceRef = {type: 'visit', id: 'visit', version: 1};
    assert.equal(info.checkSources(b, {refs: [visitRef]})[0]?.state, 'unavailable');
    const otherRefs: SourceRef[] = [{type: 'checkin', id: 'checkin', version: 1}, {type: 'route', id: 'route', version: 1}];
    assert.deepEqual(info.checkSources(a, {refs: otherRefs}).map(r => r.state), ['current', 'current']);
    assert.deepEqual(info.checkSources(b, {refs: otherRefs}).map(r => r.state), ['unavailable', 'current']);
    db.exec("UPDATE visits SET version=2,ended_at=2000 WHERE id='visit'");
    assert.equal(info.checkSources(b, {refs}).find(r => r.ref.type === 'visit')?.state, 'changed');
    db.exec("UPDATE records SET body='corrected',version=2 WHERE id='shared'");
    assert.equal(info.checkSources(b, {refs}).find(r => r.ref.type === 'record')?.currentVersion, 2);
    assert.throws(() => info.assertSourcesCurrent(b, {refs}));
    db.close(); db = new DatabaseSync(path); info = createInformationService(db);
    assert.deepEqual(info.checkSources(b, {refs}).map(r => r.state), ['current', 'changed', 'changed']);
    db.exec("UPDATE records SET visibility='private',shared_with_json='[]',version=3 WHERE id='shared'");
    const revoked = info.checkSources(b, {refs});
    assert.deepEqual(revoked.map(r => r.state), ['current', 'unavailable', 'unavailable']);
    assert.ok(revoked.filter(r => r.state === 'unavailable').every(r => r.currentVersion === null));
    db.close(); db = new DatabaseSync(path); info = createInformationService(db);
    assert.deepEqual(info.checkSources(b, {refs}), revoked);
    db.exec("DELETE FROM records WHERE id='shared'");
    assert.equal(info.checkSources(a, {refs}).find(r => r.ref.type === 'record')?.state, 'unavailable');
    assert.throws(() => info.checkSources(a, {refs: [visitRef, {...visitRef, version: 2}]}));
  } finally { db.close(); rmSync(directory, {recursive: true, force: true}); }
});

test('real HTTP and generated client: persisted search, fresh replay, two people, live/demo and restart', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'information-http-'));
  const identity = loadLocalIdentity(join(directory, 'profiles.json'));
  identity.profiles.push({key: 'other', id: 'person-b', name: 'Bob'});
  const owner = identity.profiles[0]!.id;
  let databases: Databases | undefined;
  let server: Server | undefined;
  let origin = '';
  async function boot() {
    databases = openDatabases({livePath: join(directory, 'live.sqlite'), demoPath: join(directory, 'demo.sqlite')});
    seedProfiles(databases, identity.profiles);
    const app = createApp({databases, identity, features: [information]});
    await new Promise<void>(resolve => { server = serve({fetch: app.fetch, hostname: '127.0.0.1', port: 0}, address => {origin = `http://127.0.0.1:${address.port}`; resolve();}) as Server; });
  }
  async function stop() {
    if (server) await new Promise<void>((resolve, reject) => server!.close(error => error ? reject(error) : resolve()));
    server = undefined; databases?.close(); databases = undefined;
  }
  function browser() {
    const cookies = new Map<string, string>();
    return createApiClient({baseUrl: 'http://fixture/api/v1', fetch: async (url, init) => {
      const headers = new Headers(init?.headers);
      headers.set('Cookie', [...cookies].map(([k, v]) => `${k}=${v}`).join('; '));
      const path = new URL(String(url));
      const response = await fetch(origin + path.pathname + path.search, {...init, headers});
      for (const cookie of response.headers.getSetCookie()) { const pair = cookie.split(';')[0]!; const index = pair.indexOf('='); cookies.set(pair.slice(0, index), pair.slice(index + 1)); }
      return response;
    }});
  }
  try {
    await boot();
    insert(databases!.live, 'places', {id: 'place', name: 'HTTP検証場所', longitude: 139, latitude: 35, address: null, provider: 'manual', external_id: null, building_key: null, source_url: null, attribution: 'Test fixture', fetched_at: null});
    for (let i = 0; i < 125; i++) record(databases!.live, `http-${i}`, {person_id: owner, body: i >= 120 ? 'ＳＰＥＣＩＡＬ' : 'ordinary', visibility: 'selected', shared_with_json: '["person-b"]'});
    const self = browser(), other = browser();
    await self.request('postSession', {body: {profileKey: 'self'}, idempotencyKey: 'self-login'});
    await other.request('postSession', {body: {profileKey: 'other'}, idempotencyKey: 'other-login'});
    const page = await other.request('getSharedRecords', {query: {q: 'special', limit: 2}});
    assert.equal(page.totalCount, 5); assert.equal(page.items.length, 2); assert.ok(page.nextCursor);
    const map = await other.request('getSharedRecordsMap', {query: {q: 'special'}});
    assert.equal(map.data.totalCount, 5); assert.equal(map.data.items.length, 5);
    const refs = page.items[0]!.sourceRefs;
    const first = await other.request('postSourceChecks', {body: {refs}, idempotencyKey: 'check-current'});
    assert.ok(first.data.every(r => r.state === 'current'));
    const target = page.items[0]!.id;
    databases!.live.prepare('UPDATE records SET body=?,version=version+1 WHERE id=?').run('corrected', target);
    const changed = await other.request('postSourceChecks', {body: {refs}, idempotencyKey: 'check-current'});
    assert.equal(changed.data.find(r => r.ref.type === 'record')?.state, 'changed');
    const receipt = databases!.live.prepare('SELECT result_json FROM core_requests WHERE request_key=?').get('check-current');
    assert.equal(String(receipt?.result_json).includes('currentVersion'), false);
    await assert.rejects(other.request('postSourceChecks', {body: {refs: []}, idempotencyKey: 'check-current'}), error => error instanceof ApiError && error.code === 'IDEMPOTENCY_CONFLICT');
    databases!.live.prepare("UPDATE records SET visibility='private',shared_with_json='[]',version=version+1 WHERE id=?").run(target);
    const revoked = await other.request('postSourceChecks', {body: {refs}, idempotencyKey: 'check-current'});
    assert.equal(revoked.data.find(r => r.ref.type === 'record')?.state, 'unavailable');
    await stop(); await boot();
    assert.deepEqual(await other.request('postSourceChecks', {body: {refs}, idempotencyKey: 'check-current'}), revoked);
    const own = await self.request('getRecords', {query: {limit: 1}});
    assert.equal(own.items[0]!.personId, owner); assert.ok(own.nextCursor);
    other.setDataMode('demo');
    await other.request('postSession', {body: {profileKey: 'other'}, idempotencyKey: 'other-demo-login'});
    assert.equal((await other.request('getSharedRecords', {})).totalCount, 0);
    assert.ok((await other.request('postSourceChecks', {body: {refs}, idempotencyKey: 'check-current'})).data.every(r => r.state === 'unavailable'));
    const unauthenticated = await fetch(origin + '/api/v1/shared-records', {headers: {'X-Data-Mode': 'live', 'X-Request-Id': randomUUID()}});
    assert.equal(unauthenticated.status, 401);
  } finally { await stop(); rmSync(directory, {recursive: true, force: true}); }
});
