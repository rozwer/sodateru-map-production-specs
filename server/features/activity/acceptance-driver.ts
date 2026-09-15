import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { openDatabases } from '../../db/connection.ts';
import { loadLocalIdentity, seedProfiles } from '../../core/session.ts';
import activity from './register.ts';

const directory = resolve('.local', `activity-proof-${randomUUID()}`);
mkdirSync(directory, { recursive: true });
const env = { ...process.env, SODATERU_PORT: '0', SODATERU_HOST: '127.0.0.1', SODATERU_DB_PATH: `${directory}/live.sqlite`, SODATERU_DEMO_DB_PATH: `${directory}/demo.sqlite`, SODATERU_PROFILES_PATH: `${directory}/profiles.json` };
const identity = loadLocalIdentity(env.SODATERU_PROFILES_PATH);
const dbs = openDatabases({ livePath: env.SODATERU_DB_PATH, demoPath: env.SODATERU_DEMO_DB_PATH, migrations: activity.migrations });
seedProfiles(dbs, identity.profiles);
for (const db of [dbs.live, dbs.demo]) db.prepare(`INSERT INTO places(id,name,longitude,latitude,provider,attribution,created_at,updated_at)
  VALUES ('activity-verification-place','検証用手動地点',139.7,35.6,'manual','verification fixture',?,?)`).run(Date.now(), Date.now());
dbs.close();

async function launch() {
  const process = spawn(globalThis.process.execPath, ['--experimental-transform-types', 'server/app/main.ts'], { env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  const origin = await new Promise<string>((done, fail) => {
    let buffer = '', error = '';
    const timer = setTimeout(() => { process.kill(); fail(Error(`CORE startup timeout: ${error}`)); }, 30000);
    process.stderr.on('data', value => { error += String(value); });
    process.once('exit', code => { clearTimeout(timer); fail(Error(`CORE exited ${code}: ${error}`)); });
    process.stdout.on('data', value => {
      buffer += String(value);
      for (const line of buffer.split('\n')) {
        try { const message = JSON.parse(line); if (message.event === 'ready') { clearTimeout(timer); done(message.origin); } } catch {}
      }
    });
  });
  return { origin, async stop() { process.kill(); await once(process, 'exit'); } };
}
for (const phase of ['initial', 'restart']) {
  const server = await launch();
  try {
    for (const mode of ['live', 'demo']) {
      const session = await fetch(`${server.origin}/api/v1/session`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Request-Id': randomUUID(), 'X-Data-Mode': mode, 'Idempotency-Key': randomUUID() }, body: JSON.stringify({ profileKey: 'self' }) });
      if (session.status !== 201) throw Error(`Session failed: ${await session.text()}`);
      const cookie = session.headers.get('set-cookie')!.split(';')[0]!;
      const output = execFileSync(process.execPath, ['server/features/activity/acceptance.mjs', ...(phase === 'restart' ? ['verify-after-restart'] : [])], {
        env: { ...env, ACTIVITY_BASE_URL: `${server.origin}/api/v1`, ACTIVITY_COOKIE: cookie, ACTIVITY_PLACE_ID: 'activity-verification-place', ACTIVITY_MODE: mode, ACTIVITY_STATE: `${directory}/${mode}-state.json` }, encoding: 'utf8', windowsHide: true,
      });
      console.log(JSON.stringify({ mode, phase, output: JSON.parse(output) }));
    }
  } finally { await server.stop(); }
}
console.log(JSON.stringify({ evidenceDirectory: directory, result: 'live/demo real CORE processes and SQLite reacquisition passed' }));
