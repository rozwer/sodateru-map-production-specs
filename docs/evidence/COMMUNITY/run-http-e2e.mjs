import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { serve } from '@hono/node-server';
import { createApp } from '../../../server/app/app.ts';
import { openDatabases } from '../../../server/db/connection.ts';
import { loadLocalIdentity, seedProfiles } from '../../../server/core/session.ts';
import { loadContract } from '../../../server/core/validation.ts';
import friends from '../../../server/features/friends/register.ts';
import community from '../../../server/features/community/register.ts';
import information from '../../../server/information/register.ts';
import settings from '../../../server/features/settings/register.ts';
import records from '../../../server/features/records/register.ts';
import places from '../../../server/features/places/register.ts';
import themes from '../../../server/features/themes/register.ts';

// Only the contract is composed for this test server. All handlers, migrations,
// authentication, read checks and storage are the actual production modules.
function contract() {
  const spec = loadContract();
  for (const id of ['SETTINGS', 'RECORDS', 'PLACES', 'THEMES', 'INFORMATION', 'COMMUNITY']) {
    const fragment = JSON.parse(readFileSync(new URL(`../../01_requirements/04_api/fragments/${id}.json`, import.meta.url), 'utf8'));
    Object.assign(spec.components.schemas, fragment.schemas);
    for (const { method, path, ...operation } of fragment.operations ?? []) (spec.paths[path] ??= {})[method] = operation;
  }
  return spec;
}

if (process.argv[2] === 'serve') {
  const directory = process.argv[3];
  const features = [friends, community, information, settings, records, places, themes];
  const databases = openDatabases({ livePath: join(directory, 'live.sqlite'), demoPath: join(directory, 'demo.sqlite'), migrations: features.flatMap(feature => feature.migrations ?? []) });
  const profilePath = join(directory, 'profiles.json');
  const identity = loadLocalIdentity(profilePath);
  if (!identity.profiles.some(profile => profile.key === 'alice')) {
    identity.profiles.push({ key: 'alice', id: randomUUID(), name: '本人A' }, { key: 'bob', id: randomUUID(), name: '本人B' });
    writeFileSync(profilePath, JSON.stringify(identity));
  }
  seedProfiles(databases, identity.profiles);
  const app = createApp({ databases, identity, features, contract: contract() });
  const server = serve({ fetch: app.fetch, hostname: '127.0.0.1', port: 0 }, info => console.log(JSON.stringify({ origin: `http://127.0.0.1:${info.port}` })));
  process.stdin.once('data', () => server.close(() => { databases.close(); process.exit(0); }));
} else {
  const directory = mkdtempSync(join(tmpdir(), 'community-http-'));
  let child;
  const checks = [];
  async function boot() {
    child = spawn(process.execPath, ['--experimental-transform-types', fileURLToPath(import.meta.url), 'serve', directory], {
      env: { ...process.env, SODATERU_ASSET_ROOT: join(directory, 'assets') }, stdio: ['pipe', 'pipe', 'inherit'], windowsHide: true,
    });
    return await new Promise((resolve, reject) => {
      const lines = createInterface({ input: child.stdout });
      lines.once('line', line => { try { resolve(JSON.parse(line).origin); } catch (error) { reject(error); } });
      child.once('exit', code => { if (code) reject(new Error(`Server exited ${code}`)); });
    });
  }
  async function stop() {
    if (child && child.exitCode === null) await new Promise(resolve => { child.once('exit', resolve); child.stdin.write('stop\n'); });
  }
  async function run(phase, origin) {
    const process_ = spawn(process.execPath, [fileURLToPath(new URL('./http-e2e.mjs', import.meta.url)), phase], {
      env: { ...process.env, COMMUNITY_API_BASE: origin }, stdio: ['ignore', 'pipe', 'inherit'], windowsHide: true,
    });
    let output = '';
    process_.stdout.on('data', value => { output += value.toString(); });
    await new Promise((resolve, reject) => process_.once('exit', code => code === 0 ? resolve() : reject(new Error(`${phase} failed (${code})`))));
    checks.push(JSON.parse(output));
  }
  let evidence;
  try {
    await run('seed', await boot());
    await stop();
    await run('verify', await boot());
    evidence = { status: 'PASS', timestamp: new Date().toISOString(), restart: 'separate OS process', checks };
  } catch (error) {
    evidence = { status: 'FAIL', timestamp: new Date().toISOString(), checks, error: String(error) };
    process.exitCode = 1;
  } finally {
    await stop();
    writeFileSync(new URL('./http-result.json', import.meta.url), JSON.stringify(evidence, null, 2) + '\n');
    console.log(JSON.stringify(evidence, null, 2));
  }
}
