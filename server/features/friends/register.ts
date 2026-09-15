import { defineFeature } from '../../core/features.ts';
import { expectedVersion } from '../../core/errors.ts';
import { idempotencyKey, idempotentMutation } from '../../core/idempotency.ts';
import { acceptFriendship, createFriendship, deleteFriendship, getFriendship, getPerson, listFriendships, listPeople } from './service.ts';

export default defineFeature({
  id: 'friends',
  register(api, services) {
    api.get('/people', c => c.json(listPeople(c.get('db'), c.get('context'), new URL(c.req.url).searchParams)));
    api.get('/people/:personId', c => c.json({ data: getPerson(c.get('db'), c.get('context').personId, c.req.param('personId')) }));
    api.get('/friendships', c => c.json(listFriendships(c.get('db'), c.get('context'), new URL(c.req.url).searchParams)));
    api.get('/friendships/:friendshipId', c => {
      const data = getFriendship(c.get('db'), c.get('context').personId, c.req.param('friendshipId'));
      c.header('ETag', `"${data.version}"`);
      return c.json({ data });
    });
    api.post('/friendships', async c => {
      const db = c.get('db'), context = c.get('context'), input = await c.req.json();
      const response = idempotentMutation(db, { context, operation: 'POST /api/v1/friendships', key: idempotencyKey(c.req.header('Idempotency-Key')), input }, {
        execute: () => {
          const data = createFriendship(db, context.personId, input);
          return { status: 201, body: { data }, resource: { type: 'friendship', id: data.id } };
        },
        replay: result => ({ status: 200, body: { data: getFriendship(db, context.personId, result.resource!.id) } }),
      });
      const { data } = response.body as { data: ReturnType<typeof getFriendship> };
      c.header('ETag', `"${data.version}"`);
      return c.json({ data }, response.status as 200 | 201);
    });
    api.patch('/friendships/:friendshipId', async c => {
      const input = await c.req.json();
      const data = services.transaction(c.get('db'), () => acceptFriendship(c.get('db'), c.get('context').personId, c.req.param('friendshipId'), expectedVersion(c.req.header('If-Match')), input));
      c.header('ETag', `"${data.version}"`);
      return c.json({ data });
    });
    api.delete('/friendships/:friendshipId', c => {
      services.transaction(c.get('db'), () => deleteFriendship(c.get('db'), c.get('context').personId, c.req.param('friendshipId'), expectedVersion(c.req.header('If-Match'))));
      return c.body(null, 204);
    });
  },
});
