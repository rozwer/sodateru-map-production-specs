import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { configureAi, createConversation, startRun, getRun, readAppliedRefs } from '../../ai/index.ts';
import { createApp } from '../../app/app.ts';
import { openDatabases } from '../../db/connection.ts';
import { transaction } from '../../db/migrate.ts';
import { seedProfiles } from '../../core/session.ts';
import { loadContract } from '../../core/validation.ts';
import { createInformationService } from '../../information/service.ts';
import { createRecord, patchRecord } from '../records/service.ts';
import records from '../records/register.ts';
import themes from './register.ts';
import { registerThemeAi } from './ai.ts';
import { createTheme, getTheme, patchTheme } from './service.ts';

test('AI proposals do not save; explicit adoption protects edits and replays after source changes', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'themes-ai-'));
  const options = { livePath: join(dir, 'live.sqlite'), demoPath: join(dir, 'demo.sqlite'), migrations: [...(records.migrations ?? []), ...(themes.migrations ?? [])] };
  let databases = openDatabases(options);
  const identity = { version: 1 as const, secret: 'themes-unit-test-only-secret', profiles: [{ key: 'self', id: 'p', name: '本人' }, { key: 'other', id: 'q', name: '別人' }] };
  seedProfiles(databases, identity.profiles);
  const context = { personId: 'p', dataMode: 'live' as const, requestId: randomUUID(), signal: new AbortController().signal };
  // A deterministic provider isolates adoption behavior; this is not live-model evidence.
  let output = { name: 'AIの候補', description: '記録からの提案', evidenceIds: ['source'] };
  registerThemeAi();
  configureAi({ provider: async () => structuredClone(output), model: () => 'unit-test-provider', assertAllowed: () => {},
    assertSourceRefs: (db, ctx, refs) => { createInformationService(db).assertSourcesCurrent(ctx, { refs }); },
    assertConversationRecord: (db, ctx, id) => { createInformationService(db).getOwnRecord(ctx, id); } });
  const contract: any = loadContract();
  const fragment = JSON.parse(readFileSync(new URL('../../../docs/01_requirements/04_api/fragments/THEMES.json', import.meta.url), 'utf8'));
  Object.assign(contract.components.schemas, fragment.schemas);
  for (const { method, path, ...operation } of fragment.operations) (contract.paths[path] ??= {})[method] = operation;
  let app = createApp({ databases, identity, features: [themes], contract });
  let cookie = '';
  async function request(method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
    const response = await app.request(`/api/v1${path}`, { method, headers: { 'X-Request-Id': randomUUID(), 'X-Data-Mode': 'live', Cookie: cookie, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, body: response.status === 204 ? null : await response.json(), response };
  }
  async function proposal(id: string) {
    const source = createInformationService(databases.live).getOwnRecord(context, 'source');
    let run = await startRun(databases.live, context, { conversationId: 'conversation', userMessageId: `u-${id}`, assistantMessageId: id, text: '名前を提案してください', task: 'theme', input: { recordIds: ['source'], currentName: getTheme(databases.live, 'p', 'theme').name }, expectedRefs: [{ type: 'record', id: 'source', version: source.version }] });
    for (let i = 0; ['pending', 'running'].includes(run.status) && i < 100; i++) { await delay(10); run = await getRun(databases.live, context, id); }
    return run;
  }
  const adopt = (run: Awaited<ReturnType<typeof proposal>>, version: number, key: string, extra: Record<string, unknown> = {}) => request('POST', '/themes/theme/adopt-name', { runId: run.id, expectedAttempt: run.attempt, expectedRunVersion: run.version, ...extra }, { 'If-Match': `"${version}"`, 'Idempotency-Key': key });
  try {
    const session = await request('POST', '/session', { profileKey: 'self' }, { 'Idempotency-Key': randomUUID() });
    assert.equal(session.status, 201); cookie = session.response.headers.get('set-cookie')!.split(';')[0]!;
    transaction(databases.live, () => createRecord(databases.live, 'p', { id: 'source', kind: 'experience', visitId: null, placeId: null, occurredAt: null, endedAt: null, timePrecision: 'unknown', body: '公園で静かな道を歩いた', purposes: [], activities: [], impression: '', periodAnswers: {}, bookmarked: false, useForSuggestions: true, topicKey: null, visibility: 'private', sharedWith: [] }));
    createTheme(databases.live, 'p', { id: 'theme', name: '本人の名前', description: '', recordIds: ['source'], colorKey: 'blue' });
    createConversation(databases.live, context, { id: 'conversation', purpose: 'consult', title: 'テーマ命名', recordId: null });
    const run = await proposal('run'); assert.equal(run.status, 'complete');
    assert.equal(getTheme(databases.live, 'p', 'theme').name, '本人の名前');
    assert.equal(getTheme(databases.live, 'p', 'theme').version, 1);
    assert.equal((await adopt(run, 1, 'stale-run-version', { expectedRunVersion: run.version + 1 })).status, 409);
    assert.equal((await adopt(run, 1, 'stale-run-attempt', { expectedAttempt: run.attempt + 1 })).status, 409);
    patchTheme(databases.live, 'p', 'theme', 1, { name: '本人が編集中に更新' });
    assert.equal((await adopt(run, 1, 'stale-theme')).status, 412);
    assert.equal(getTheme(databases.live, 'p', 'theme').name, '本人が編集中に更新');
    const accepted = await adopt(run, 2, 'accept', { name: '本人の採用名', description: '本人が整えた説明' });
    assert.equal(accepted.status, 200, JSON.stringify(accepted.body));
    assert.equal(accepted.body.data.name, '本人の採用名'); assert.equal(accepted.body.data.colorKey, 'blue');
    assert.equal(accepted.body.data.version, 3); assert.equal(readAppliedRefs(databases.live, context, run.id).length, 1);
    // A repeated successful request must not reapply the old proposal, even after the source changes.
    transaction(databases.live, () => patchRecord(databases.live, 'p', 'source', { body: '元記録を更新' }, 1));
    const replay = await adopt(run, 2, 'accept', { name: '本人の採用名', description: '本人が整えた説明' });
    assert.equal(replay.status, 200, JSON.stringify(replay.body)); assert.equal(replay.body.data.version, 3);
    assert.equal((await adopt(run, 2, 'accept', { name: '異なる入力' })).status, 409);
    assert.equal(readAppliedRefs(databases.live, context, run.id).length, 1);
    const changed = await proposal('changed');
    transaction(databases.live, () => patchRecord(databases.live, 'p', 'source', { body: '再度変更' }, 2));
    assert.equal((await adopt(changed, 3, 'source-changed')).status, 409);
    const membership = await proposal('membership');
    patchTheme(databases.live, 'p', 'theme', 3, { recordIds: [] });
    assert.equal((await adopt(membership, 4, 'membership-changed')).status, 409);
    patchTheme(databases.live, 'p', 'theme', 4, { recordIds: ['source'] });
    output = { ...output, name: '長'.repeat(21) };
    assert.equal((await proposal('oversize')).status, 'failed');
    output = { name: '候補', description: '', evidenceIds: ['unknown'] };
    assert.equal((await proposal('unknown-evidence')).status, 'failed');
    databases.close(); databases = openDatabases(options); seedProfiles(databases, identity.profiles);
    app = createApp({ databases, identity, features: [themes], contract });
    const restored = await request('GET', '/themes/theme');
    assert.equal(restored.status, 200); assert.equal(restored.body.data.name, '本人の採用名');
    assert.equal(readAppliedRefs(databases.live, context, run.id).length, 1);
  } finally { databases.close(); rmSync(dir, { recursive: true, force: true }); }
});
