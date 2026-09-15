import { serve } from '@hono/node-server';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDatabases } from '../db/connection.ts';
import { loadFeatures } from '../core/features.ts';
import { loadLocalIdentity, seedProfiles } from '../core/session.ts';
import { pruneExpiredResults } from '../core/idempotency.ts';
import { createApp } from './app.ts';

const root = fileURLToPath(new URL('../../', import.meta.url));
const features = await loadFeatures(resolve(root, 'server'));
const databases = openDatabases({
  livePath: process.env.SODATERU_DB_PATH ?? resolve(root, '.local/app.sqlite'),
  demoPath: process.env.SODATERU_DEMO_DB_PATH ?? resolve(root, '.local/demo.sqlite'),
  migrations: features.flatMap(feature => feature.migrations ?? []),
});
const identity = loadLocalIdentity(process.env.SODATERU_PROFILES_PATH ?? resolve(root, '.local/profiles.json'));
seedProfiles(databases, identity.profiles);
const app = createApp({ databases, identity, features, staticRoot: process.env.SODATERU_STATIC_ROOT ?? resolve(root, 'dist') });
const host = process.env.SODATERU_HOST ?? '127.0.0.1';
const port = Number(process.env.SODATERU_PORT ?? '3001');
if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid SODATERU_PORT');
const server = serve({ fetch: app.fetch, hostname: host, port }, info => {
  console.log(JSON.stringify({ event: 'ready', origin: `http://${host}:${info.port}`, db: databases.paths, features: features.map(feature => feature.id), contractVersion: '0.3.0' }));
});
const cleanup = setInterval(() => { for (const db of [databases.live, databases.demo]) pruneExpiredResults(db); }, 1000);
cleanup.unref();
function stop() {
  clearInterval(cleanup);
  server.close(() => { databases.close(); process.exit(0); });
}
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
