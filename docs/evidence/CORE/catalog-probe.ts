/** Exercise the real entry point across two OS processes; never uses an existing user DB. */
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApiClient } from '../../../packages/api-client/index.ts';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const directory = await mkdtemp(join(tmpdir(), 'sodateru-core-process-'));
let child: ChildProcess | undefined;
let origin = '';
const cookies = new Map<string, string>();
const client = createApiClient({ baseUrl: 'http://fixture/api/v1', fetch: async (url, options) => {
  const headers = new Headers(options?.headers);
  headers.set('Cookie', [...cookies].map(([key, value]) => key + '=' + value).join('; '));
  const response = await fetch(origin + new URL(String(url)).pathname, { ...options, headers });
  for (const header of response.headers.getSetCookie()) {
    const cookie = header.split(';')[0]!, separator = cookie.indexOf('=');
    cookies.set(cookie.slice(0, separator), cookie.slice(separator + 1));
  }
  return response;
} });
async function start() {
  const processChild = spawn(process.execPath, ['--experimental-transform-types', 'server/app/main.ts'], {
    cwd: root,
    env: { ...process.env, SODATERU_PORT: '0', SODATERU_HOST: '127.0.0.1', SODATERU_DB_PATH: join(directory, 'live.sqlite'), SODATERU_DEMO_DB_PATH: join(directory, 'demo.sqlite'), SODATERU_PROFILES_PATH: join(directory, 'profiles.json') },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child = processChild;
  await new Promise<void>((resolve, reject) => {
    let output = '', errors = '';
    const timer = setTimeout(() => { processChild.kill('SIGTERM'); reject(new Error('Server startup timed out')); }, 20000);
    processChild.stderr!.on('data', data => { errors += String(data); });
    processChild.on('error', error => { clearTimeout(timer); reject(error); });
    processChild.on('exit', code => { clearTimeout(timer); if (!origin) reject(new Error(`Server exited ${code}: ${errors}`)); });
    processChild.stdout!.on('data', data => {
      output += String(data);
      for (const line of output.split('\n')) {
        if (!line.startsWith('{')) continue;
        try {
          const event = JSON.parse(line) as { event?: string; origin?: string };
          if (event.event === 'ready' && event.origin) { origin = event.origin; clearTimeout(timer); resolve(); }
        } catch { /* Wait for a complete line. */ }
      }
    });
  });
}
async function stop() {
  if (!child || child.exitCode !== null) return;
  const current = child;
  await new Promise<void>(resolve => { current.once('exit', () => resolve()); current.kill('SIGTERM'); });
  origin = '';
}
try {
  await start();
  await client.request('postSession', { body: { profileKey: 'self' }, idempotencyKey: 'catalog-probe-session' });
  const companions = await client.request('listCompanions', {});
  console.log(JSON.stringify({ operation: 'listCompanions', result: companions }));
  const themes = await client.request('getSharedThemes', {});
  console.log(JSON.stringify({ operation: 'getSharedThemes', result: themes }));
  const now = Date.now();
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const body = { id: crypto.randomUUID(), localDate: date, timezone: 'Asia/Tokyo', validUntil: now + 3600000, answers: { state: '気分転換したい', wishes: ['散歩'], minutes: 30, note: '', timeBudget: { kind: 'exact' as const, minutes: 30 }, companion: 'solo' as const, effort: 'easy' as const, mode: 'walking' as const, stayMinutes: 15 } };
  const created = await client.request('postSelfCheckins', { body, idempotencyKey: 'catalog-probe-checkin' });
  const loaded = await client.request('getSelfCheckinsCheckinId', { path: { checkinId: body.id } });
  if (loaded.data.id !== created.data.id || loaded.data.timezone !== body.timezone || loaded.data.answers.timeBudget?.minutes !== 30) throw new Error('Checkin reload mismatch');
  console.log(JSON.stringify({ operation: 'postSelfCheckins/getSelfCheckinsCheckinId', saved: true, reloaded: true, timezone: loaded.data.timezone }));
} finally { await stop(); await rm(directory, { recursive: true, force: true }); }
