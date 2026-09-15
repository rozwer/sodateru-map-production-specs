import { readFileSync } from 'node:fs';
import { defineFeature } from '../../core/features.ts';
import { expectedVersion } from '../../core/errors.ts';
import { idempotencyKey, idempotentMutation } from '../../core/idempotency.ts';
import { createRequest, deleteRequest, listRequests, patchRequest, readRequest, setEmpathy, type RequestInput, type RequestPatch, type RequestQuery } from './service.ts';

export default defineFeature({
  id: 'feature-requests',
  migrations: [{ id: 'feature-requests/001', sql: readFileSync(new URL('../../db/migrations/feature-requests/001-posts.sql', import.meta.url), 'utf8') }],
  register(api, services) {
    api.get('/feature-requests/development-guide', c => c.json({ data: { title: '育てる地図の開発作業ガイド', url: 'https://github.com/rozwer/sodateru-map-production-specs/blob/develop/.agents/skills/sodateru-task/SKILL.md' } }));
    api.get('/feature-requests', c => c.json(listRequests(c.get('db'), c.get('context').personId, c.get('input').query as RequestQuery, services.identity.secret)));
    api.post('/feature-requests', c => {
      const db = c.get('db'), context = c.get('context'), input = c.get('input').body as RequestInput;
      const result = idempotentMutation(db, { context, operation: 'POST /api/v1/feature-requests', key: idempotencyKey(c.req.header('Idempotency-Key')), input }, {
        execute() { return { status: 201, body: { data: createRequest(db, context.personId, input) }, resource: { type: 'feature-request', id: input.id } }; },
        replay(saved) { return { status: 200, body: { data: readRequest(db, context.personId, saved.resource!.id) } }; },
      });
      const data = (result.body as { data: { version: number } }).data;
      c.header('ETag', `"${data.version}"`);
      c.header('Location', '/api/v1/feature-requests/' + encodeURIComponent(input.id));
      return c.body(JSON.stringify(result.body), result.status as 200 | 201, { 'Content-Type': 'application/json' });
    });
    api.get('/feature-requests/:requestId', c => {
      const data = readRequest(c.get('db'), c.get('context').personId, c.req.param('requestId'));
      c.header('ETag', `"${data.version}"`); return c.json({ data });
    });
    api.patch('/feature-requests/:requestId', c => {
      const db = c.get('db');
      const data = services.transaction(db, () => patchRequest(db, c.get('context').personId, c.req.param('requestId'), expectedVersion(c.req.header('If-Match')), c.get('input').body as RequestPatch));
      c.header('ETag', `"${data.version}"`); return c.json({ data });
    });
    api.patch('/feature-requests/:requestId/empathy', c => {
      const db = c.get('db');
      const data = services.transaction(db, () => setEmpathy(db, c.get('context').personId, c.req.param('requestId'), expectedVersion(c.req.header('If-Match')), c.get('input').body));
      c.header('ETag', `"${data.version}"`); return c.json({ data });
    });
    api.delete('/feature-requests/:requestId', c => {
      const db = c.get('db');
      services.transaction(db, () => deleteRequest(db, c.get('context').personId, c.req.param('requestId'), expectedVersion(c.req.header('If-Match'))));
      return c.body(null, 204);
    });
  },
});
