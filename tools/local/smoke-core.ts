/** Exercise the real entry point across two OS processes; never uses an existing user DB. */
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApiClient } from '../../packages/api-client/index.ts';

const root = fileURLToPath(new URL('../../', import.meta.url));
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
  const saved = new Map<string, string>();
  for (const mode of ['live', 'demo'] as const) {
    client.setDataMode(mode);
    const session = await client.request('postSession', { body: { profileKey: 'self' }, idempotencyKey: 'process-smoke-' + mode });
    saved.set(mode, JSON.stringify(session.data));
  }
  await stop();
  await start();
  for (const mode of ['live', 'demo'] as const) {
    client.setDataMode(mode);
    const restored = await client.request('getSession', {});
    if (JSON.stringify(restored.data) !== saved.get(mode)) throw new Error(mode + ' session changed across process restart');
    const me = await client.request('getMe', {});
    if (me.data.id !== restored.data.person.id) throw new Error('Person resolution mismatch');
  }
  console.log(JSON.stringify({ result: 'PASS', entry: 'server/app/main.ts', processStarts: 2, modes: ['live', 'demo'], persisted: ['people', 'core_sessions', 'core_requests', 'core_migrations'], fixture: 'temporary empty databases; local self profile; no product UI claimed' }, null, 2));
} finally { await stop(); await rm(directory, { recursive: true, force: true }); }
