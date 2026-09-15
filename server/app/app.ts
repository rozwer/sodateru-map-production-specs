import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { serveStatic } from '@hono/node-server/serve-static';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { Databases, DataMode } from '../db/connection.ts';
import { transaction } from '../db/migrate.ts';
import { CommonError, errorResponse, expectedVersion, requireVersion } from '../core/errors.ts';
import type { CoreEnv, RequestContext } from '../core/context.ts';
import type { Feature } from '../core/features.ts';
import { cookieName, getPerson, hashToken, resolveSession, sessionToken, type LocalIdentity } from '../core/session.ts';
import { idempotencyKey, idempotentMutation, type StoredResult } from '../core/idempotency.ts';
import { contractValidation, type ApiContract } from '../core/validation.ts';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const sessionAgeMs = 30 * 24 * 60 * 60 * 1000;

export function createApp(options: {
  databases: Databases;
  identity: LocalIdentity;
  features?: readonly Feature[];
  staticRoot?: string;
  contract?: ApiContract;
}): Hono<CoreEnv> {
  const { databases, identity } = options;
  const app = new Hono<CoreEnv>();
  app.onError((error, c) => {
    const response = errorResponse(error, c.get('requestId') ?? randomUUID());
    return c.body(JSON.stringify(response.body), response.status as ContentfulStatusCode, { 'Content-Type': 'application/json' });
  });
  app.use('/api/*', async (c, next) => {
    const supplied = c.req.header('X-Request-Id');
    const requestId = supplied && uuid.test(supplied) ? supplied : randomUUID();
    c.set('requestId', requestId);
    c.header('X-Request-Id', requestId);
    c.header('Cache-Control', 'private, no-store');
    if (!supplied || !uuid.test(supplied)) throw new CommonError('INVALID_REQUEST', 'X-Request-IdにUUIDを指定してください。');
    const mode = c.req.header('X-Data-Mode');
    if (mode !== 'live' && mode !== 'demo') throw new CommonError('INVALID_REQUEST', 'X-Data-Modeにliveまたはdemoを指定してください。');
    c.set('dataMode', mode);
    c.set('db', databases[mode]);
    c.header('X-Data-Mode', mode);
    await next();
  });

  const api = new Hono<CoreEnv>();
  api.use('*', contractValidation(options.contract));
  api.get('/session/profiles', c => c.json({ items: identity.profiles.map(({ key, name }) => ({ profileKey: key, name })) }));
  api.post('/session', async c => {
    if (!c.req.header('Content-Type')?.toLowerCase().startsWith('application/json')) {
      throw new CommonError('UNSUPPORTED_MEDIA_TYPE', 'JSONで本人を指定してください。');
    }
    let input: unknown;
    try { input = await c.req.json(); } catch { throw new CommonError('INVALID_REQUEST', 'JSONを読み取れません。'); }
    if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length !== 1 || typeof (input as { profileKey?: unknown }).profileKey !== 'string') {
      throw new CommonError('VALIDATION_FAILED', 'profileKeyだけを指定してください。');
    }
    const profile = identity.profiles.find(item => item.key === (input as { profileKey: string }).profileKey);
    if (!profile) throw new CommonError('FORBIDDEN', '選択できる本人ではありません。');
    const mode = c.get('dataMode'), db = c.get('db');
    const person = getPerson(db, profile.id);
    const key = idempotencyKey(c.req.header('Idempotency-Key'));
    const token = sessionToken(identity, mode, profile.key, key), hash = hashToken(token);
    const context: RequestContext = { personId: profile.id, dataMode: mode, requestId: c.get('requestId'), signal: c.req.raw.signal };
    const read = (): StoredResult => {
      const session = resolveSession(db, token);
      return { status: 200, body: { data: { person: getPerson(db, session.person_id), dataMode: mode, version: session.version, expiresAt: session.expires_at } }, headers: { ETag: `"${session.version}"` } };
    };
    const result = idempotentMutation(db, { context, operation: 'POST /api/v1/session', key, input }, {
      execute() {
        const now = Date.now();
        db.prepare('INSERT INTO core_sessions(token_hash,person_id,profile_key,created_at,expires_at) VALUES (?,?,?,?,?)')
          .run(hash, person.id, profile.key, now, now + sessionAgeMs);
        return { ...read(), status: 201, resource: { type: 'session', id: hash } };
      },
      replay() {
        const exists = db.prepare('SELECT 1 FROM core_sessions WHERE token_hash=?').get(hash);
        if (!exists) throw new CommonError('NOT_FOUND', '終了した本人セッションです。新しい操作で開始してください。');
        return read();
      },
    });
    const session = resolveSession(db, token);
    setCookie(c, cookieName(mode), token, { httpOnly: true, sameSite: 'Lax', path: '/api/v1', secure: new URL(c.req.url).protocol === 'https:', maxAge: Math.max(0, Math.floor((session.expires_at - Date.now()) / 1000)) });
    c.header('ETag', '"1"');
    c.header('Location', '/api/v1/session');
    return c.body(JSON.stringify(result.body), result.status as ContentfulStatusCode, { 'Content-Type': 'application/json' });
  });
  api.use('*', async (c, next) => {
    const mode: DataMode = c.get('dataMode');
    const session = resolveSession(c.get('db'), getCookie(c, cookieName(mode)));
    c.set('context', { personId: session.person_id, dataMode: mode, requestId: c.get('requestId'), signal: c.req.raw.signal });
    await next();
  });
  api.get('/session', c => {
    const session = resolveSession(c.get('db'), getCookie(c, cookieName(c.get('dataMode'))));
    c.header('ETag', `"${session.version}"`);
    return c.json({ data: { person: getPerson(c.get('db'), session.person_id), dataMode: c.get('dataMode'), version: session.version, expiresAt: session.expires_at } });
  });
  api.delete('/session', c => {
    const db = c.get('db'), mode = c.get('dataMode');
    const version = expectedVersion(c.req.header('If-Match'));
    transaction(db, () => {
      const session = resolveSession(db, getCookie(c, cookieName(mode)));
      requireVersion(session.version, version);
      const changed = db.prepare('DELETE FROM core_sessions WHERE token_hash=? AND version=?').run(session.token_hash, version);
      if (changed.changes !== 1) throw new CommonError('VERSION_CONFLICT', '本人セッションが変更されました。');
    });
    deleteCookie(c, cookieName(mode), { path: '/api/v1' });
    return c.body(null, 204);
  });
  api.get('/me', c => {
    const person = getPerson(c.get('db'), c.get('context').personId);
    c.header('ETag', `"${person.version}"`);
    return c.json({ data: person });
  });
  const services = { databases, identity, transaction };
  for (const feature of options.features ?? []) feature.register(api, services);
  app.route('/api/v1', api);
  app.all('/api/*', () => { throw new CommonError('NOT_FOUND', 'APIが見つかりません。'); });
  if (options.staticRoot) {
    app.use('*', serveStatic({ root: options.staticRoot }));
    app.get('*', c => {
      const index = join(options.staticRoot!, 'index.html');
      if (!existsSync(index)) return c.text('UI build is not available. Run the UI build command.', 503);
      return c.html(readFileSync(index, 'utf8'));
    });
  }
  return app;
}
