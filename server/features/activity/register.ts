import { readFileSync } from 'node:fs';
import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { CoreEnv } from '../../core/context.ts';
import { defineFeature } from '../../core/features.ts';
import { expectedVersion } from '../../core/errors.ts';
import { idempotencyKey, idempotentMutation, type StoredResult } from '../../core/idempotency.ts';
import { createVisit, patchVisit, deleteVisit, createPoints, deletePoints, getVisit, getPoint } from './service.ts';
import { listVisits, listPoints, getGrowth, type ListQuery } from './queries.ts';
import { getDailyReflection } from './daily.ts';

function send(c: Context<CoreEnv>, result: StoredResult) {
  return c.body(JSON.stringify(result.body), result.status as ContentfulStatusCode, { 'Content-Type': 'application/json', ...result.headers });
}
export default defineFeature({
  id: 'activity',
  migrations: [{ id: 'activity/001', sql: readFileSync(new URL('../../db/migrations/activity/001-activity.sql', import.meta.url), 'utf8') }],
  register(api, services) {
    api.get('/visits', c => c.json(listVisits(c.get('db'), c.get('context'), c.get('input').query as ListQuery)));
    api.get('/visits/:visitId', c => {
      const data = getVisit(c.get('db'), c.get('context'), c.req.param('visitId'));
      c.header('ETag', `"${data.version}"`); return c.json({ data });
    });
    api.post('/visits', c => {
      const db = c.get('db'), context = c.get('context');
      const output = (data: ReturnType<typeof getVisit>): StoredResult => ({ status: 201, body: { data }, headers: { ETag: `"${data.version}"`, Location: `/api/v1/visits/${encodeURIComponent(data.id)}` }, resource: { type: 'visit', id: data.id } });
      return send(c, idempotentMutation(db, { context, operation: `POST ${c.req.path}`, key: idempotencyKey(c.req.header('Idempotency-Key')), input: c.get('input').body }, {
        execute: () => output(createVisit(db, context, c.get('input').body)),
        replay: result => output(getVisit(db, context, result.resource!.id)),
      }));
    });
    api.patch('/visits/:visitId', c => {
      const data = services.transaction(c.get('db'), () => patchVisit(c.get('db'), c.get('context'), c.req.param('visitId'), c.get('input').body, expectedVersion(c.req.header('If-Match'))));
      c.header('ETag', `"${data.version}"`); return c.json({ data });
    });
    api.delete('/visits/:visitId', c => {
      services.transaction(c.get('db'), () => deleteVisit(c.get('db'), c.get('context'), c.req.param('visitId'), expectedVersion(c.req.header('If-Match'))));
      return c.body(null, 204);
    });
    api.get('/map/growth', c => c.json(getGrowth(c.get('db'), c.get('context'), c.get('input').query as ListQuery)));
    api.get('/track-points', c => c.json(listPoints(c.get('db'), c.get('context'), c.get('input').query as ListQuery)));
    api.get('/track-points/:pointId', c => {
      const data = getPoint(c.get('db'), c.get('context'), c.req.param('pointId'));
      c.header('ETag', `"${data.version}"`); return c.json({ data });
    });
    api.post('/track-points', c => {
      const db = c.get('db'), context = c.get('context');
      const output = (data: ReturnType<typeof createPoints>): StoredResult => ({ status: 200, body: { data }, resource: { type: 'activity-points', id: JSON.stringify(data.items.map(p => p.id)) } });
      return send(c, idempotentMutation(db, { context, operation: `POST ${c.req.path}`, key: idempotencyKey(c.req.header('Idempotency-Key')), input: c.get('input').body }, {
        execute: () => output(createPoints(db, context, c.get('input').body)),
        replay: result => output({ items: (JSON.parse(result.resource!.id) as string[]).map(id => getPoint(db, context, id)) }),
      }));
    });
    api.post('/track-points/delete-range', c => {
      const db = c.get('db'), context = c.get('context');
      const input = c.get('input').body as { targets: { id: string; version: number }[] };
      const normalized = { ...input, targets: [...input.targets].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0) };
      return send(c, idempotentMutation(db, { context, operation: `POST ${c.req.path}`, key: idempotencyKey(c.req.header('Idempotency-Key')), input: normalized }, {
        execute: () => ({ status: 200, body: { data: deletePoints(db, context, normalized) } }),
      }));
    });
    api.get('/reflection/days/:date', async c => {
      const db = c.get('db'), context = c.get('context');
      const data = await getDailyReflection(db, context, c.req.param('date'), String(c.get('input').query.timeZone), {
        async records(_context, query) {
          const module = await import(new URL('../../information/service.ts', import.meta.url).href);
          return module.createInformationService(db).ownRecordsPage(context, query);
        },
        async checkins(_context, query) {
          const module = await import(new URL('../suggestions/repository.mjs', import.meta.url).href);
          return module.listSelfCheckins(db, context, query);
        },
      });
      return c.json({ data });
    });
  },
});
