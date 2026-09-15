import { spawn, type ChildProcess } from 'node:child_process';
import { createInterface } from 'node:readline';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const directory = mkdtempSync(join(tmpdir(), 'themes-live-naming-'));
const model = process.env.CODEX_AI_MODEL;
assert.equal(model, 'gpt-5.6-luna');
let child: ChildProcess | undefined, origin = '', cookie = '', stage = 'startup';
async function start() {
  origin = '';
  child = spawn(process.execPath, ['--experimental-transform-types', 'server/app/main.ts'], { cwd: root,
    env: { ...process.env, SODATERU_PORT: '0', SODATERU_DB_PATH: join(directory, 'live.sqlite'), SODATERU_DEMO_DB_PATH: join(directory, 'demo.sqlite'), SODATERU_PROFILES_PATH: join(directory, 'profiles.json') }, stdio: ['ignore', 'pipe', 'pipe'] });
  const running = child;
  let stderr = '';
  running.stderr!.on('data', chunk => { stderr = (stderr + String(chunk)).slice(-2500); });
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Isolated main startup timed out')), 20000);
    running.once('exit', code => { clearTimeout(timer); if (!origin) reject(new Error(`main exited ${code}: ${stderr}`)); });
    createInterface({ input: running.stdout! }).on('line', line => { try { const event = JSON.parse(line); if (event.event === 'ready') { origin = event.origin; clearTimeout(timer); resolve(); } } catch {} });
  });
}
async function stop() {
  const running = child;
  if (!running || running.exitCode !== null) return;
  await new Promise<void>(resolve => { const timer = setTimeout(() => running.kill('SIGKILL'), 10000); running.once('exit', () => { clearTimeout(timer); resolve(); }); running.kill('SIGTERM'); });
  child = undefined;
}
async function request(path: string, method = 'GET', body?: unknown, headers: Record<string, string> = {}, expected?: number) {
  const response = await fetch(origin + '/api/v1' + path, { method, headers: { 'X-Request-Id': randomUUID(), 'X-Data-Mode': 'live', Cookie: cookie, 'Content-Type': 'application/json', ...(method === 'POST' ? { 'Idempotency-Key': randomUUID() } : {}), ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
  const value: any = response.status === 204 ? null : await response.json();
  if (expected !== undefined) assert.equal(response.status, expected, `${path}: ${JSON.stringify(value)}`);
  else assert.ok(response.ok, `${path} HTTP ${response.status}: ${JSON.stringify(value?.error)}`);
  return { response, value };
}
let evidence: Record<string, unknown> = { model, databaseDirectory: directory, fixture: 'Explicit synthetic naming acceptance records; no user demo DB used' };
try {
  await start();
  const session = await request('/session', 'POST', { profileKey: 'self' });
  cookie = session.response.headers.get('set-cookie')!.split(';')[0]!;
  stage = 'enable-records-permission';
  const settings = (await request('/me/settings')).value.data;
  await request('/me/settings', 'PATCH', { ai: { ...settings.ai, enabled: true, allowRecords: true } }, { 'If-Match': `"${settings.version}"` });
  stage = 'create-synthetic-records';
  const bodies = ['AI命名受入の合成記録：静かな公園の小道で散歩したという設定。', 'AI命名受入の合成記録：小さな書店で本を選び、窓辺で読書したという設定。'];
  const sources = [];
  for (const body of bodies) sources.push((await request('/records', 'POST', { id: randomUUID(), kind: 'experience', visitId: null, placeId: null, occurredAt: null, endedAt: null, timePrecision: 'unknown', body, purposes: [], activities: [], impression: '合成データ。本人の実体験ではない。', periodAnswers: {}, bookmarked: false, useForSuggestions: true, topicKey: null, visibility: 'private', sharedWith: [] })).value.data);
  const themeId = randomUUID();
  const initial = (await request('/themes', 'POST', { id: themeId, name: 'まだ本人の仮名', description: '', recordIds: sources.map(r => r.id), colorKey: 'blue', coverMediaId: null })).value.data;
  const conversationId = randomUUID(), assistantMessageId = randomUUID();
  await request('/conversations', 'POST', { id: conversationId, purpose: 'consult', title: 'AIテーマ命名の合成データ受入', recordId: null });
  stage = 'real-luna-proposal';
  const beganAt = Date.now();
  await request(`/conversations/${conversationId}/messages`, 'POST', { userMessageId: randomUUID(), assistantMessageId, body: 'この2件の合成記録をまとめる短いテーマ名と説明を提案してください。', use: 'theme-name', context: { recordIds: sources.map(r => r.id), currentName: initial.name }, expectedRefs: sources.map(r => ({ type: 'record', id: r.id, version: r.version })) });
  let result: any;
  do { result = (await request(`/messages/${assistantMessageId}`)).value.data; if (!['pending', 'running'].includes(result.run.status)) break; await new Promise(resolve => setTimeout(resolve, 800)); } while (Date.now() - beganAt < 210000);
  assert.equal(result.run.status, 'complete', JSON.stringify(result.run.error)); assert.equal(result.run.model, model);
  assert.equal((await request(`/themes/${themeId}`)).value.data.name, initial.name);
  assert.equal((await request(`/themes/${themeId}`)).value.data.version, 1);
  evidence = { ...evidence, themeId, conversationId, runId: assistantMessageId, proposal: result.run.result, sourceRefs: result.run.sourceRefs, candidateDidNotSave: true };
  stage = 'protect-concurrent-edit';
  const personal = (await request(`/themes/${themeId}`, 'PATCH', { name: '本人が先に更新' }, { 'If-Match': '"1"' })).value.data;
  const body = { runId: assistantMessageId, expectedAttempt: result.run.attempt, expectedRunVersion: result.run.version, name: '本人の静かな寄り道', description: result.run.result.description };
  await request(`/themes/${themeId}/adopt-name`, 'POST', body, { 'If-Match': '"1"' }, 412);
  assert.equal((await request(`/themes/${themeId}`)).value.data.name, personal.name);
  stage = 'explicit-adoption';
  const adoptionHeaders = { 'If-Match': `"${personal.version}"`, 'Idempotency-Key': randomUUID() };
  const accepted = (await request(`/themes/${themeId}/adopt-name`, 'POST', body, adoptionHeaders, 200)).value.data;
  assert.equal(accepted.name, body.name); assert.equal(accepted.colorKey, 'blue'); assert.equal(accepted.version, 3);
  const replay = (await request(`/themes/${themeId}/adopt-name`, 'POST', body, adoptionHeaders, 200)).value.data;
  assert.equal(replay.version, accepted.version);
  const before = (await request(`/messages/${assistantMessageId}`)).value.data;
  assert.equal(before.appliedRefs.filter((r: any) => r.type === 'theme' && r.id === themeId).length, 1);
  stage = 'restart-own-main';
  await stop(); await start();
  const restored = (await request(`/themes/${themeId}`)).value.data;
  const restoredRun = (await request(`/messages/${assistantMessageId}`)).value.data;
  assert.deepEqual(restored, accepted); assert.deepEqual(restoredRun.run.result, result.run.result); assert.deepEqual(restoredRun.appliedRefs, before.appliedRefs);
  const afterRestartReplay = (await request(`/themes/${themeId}/adopt-name`, 'POST', body, adoptionHeaders, 200)).value.data;
  assert.equal(afterRestartReplay.version, 3);
  evidence = { ...evidence, status: 'complete', elapsedMs: Date.now() - beganAt, editedName: accepted.name, themeVersion: restored.version, runAttempt: restoredRun.run.attempt, runVersion: restoredRun.run.version, appliedRefs: restoredRun.appliedRefs, staleThemeStatus: 412, replayStatus: 200, restartEqual: true, sameReceiptAfterRestart: true };
} catch (error) { evidence = { ...evidence, status: 'failed', stage, error: String(error).slice(0, 3000) }; process.exitCode = 1; }
finally { await stop(); writeFileSync(new URL('./live-naming.json', import.meta.url), JSON.stringify(evidence, null, 2) + '\n'); console.log(JSON.stringify(evidence)); }
