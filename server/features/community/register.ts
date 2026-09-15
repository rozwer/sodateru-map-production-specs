import { readFileSync } from 'node:fs';
import { defineFeature } from '../../core/features.ts';
import { expectedVersion } from '../../core/errors.ts';
import { idempotencyKey, idempotentMutation } from '../../core/idempotency.ts';
import { createInformationService } from '../../information/service.ts';
import { savedRouteDto } from '../routes/dto.ts';
import { createBookmark, deleteBookmark, listBookmarks, resolveBookmark } from './bookmarks.ts';
import { getSharedTheme, getThemeSharing, listSharedThemes, patchThemeSharing } from './themes.ts';
import { searchKnowledge, mapKnowledge, placeVoices } from './knowledge.ts';
import { topics, knowledgeCategories } from './topics.ts';
import { targetResolver } from './targets.ts';
import { listSharedRoutes } from './routes.ts';

export default defineFeature({
  id: 'community',
  migrations: [{ id: 'community/001-bookmarks', sql: readFileSync(new URL('../../db/migrations/community/001_bookmarks.sql', import.meta.url), 'utf8') }],
  register(api, services) {
    api.get('/knowledge/topics', c => c.json({ items: topics, categories: knowledgeCategories }));
    api.get('/knowledge', c => c.json(searchKnowledge(c.get('db'), c.get('context'), new URL(c.req.url))));
    api.get('/knowledge/map', c => c.json({ data: mapKnowledge(c.get('db'), c.get('context'), new URL(c.req.url)) }));
    api.get('/shared-records/:recordId', async (c, next) => {
      if (c.req.param('recordId') === 'map') return next();
      return c.json({ data: createInformationService(c.get('db')).getRecord(c.get('context'), c.req.param('recordId')) });
    });
    api.get('/places/:placeId/voices', c => c.json(placeVoices(c.get('db'), c.get('context'), c.req.param('placeId'), new URL(c.req.url))));
    api.get('/shared-routes', c => c.json(listSharedRoutes(c.get('db'), c.get('context'), new URL(c.req.url).searchParams, savedRouteDto)));
    api.get('/bookmarks', c => c.json(listBookmarks(c.get('db'), c.get('context'), new URL(c.req.url).searchParams, targetResolver(c.get('db'), c.get('context')))));
    api.get('/bookmarks/:bookmarkId', c => {
      const data = resolveBookmark(c.get('db'), c.get('context').personId, c.req.param('bookmarkId'), targetResolver(c.get('db'), c.get('context')));
      c.header('ETag', `"${data.version}"`);
      return c.json({ data });
    });
    api.post('/bookmarks', async c => {
      const db = c.get('db'), context = c.get('context'), input = await c.req.json();
      const resolve = targetResolver(db, context);
      const response = idempotentMutation(db, { context, operation: 'POST /api/v1/bookmarks', key: idempotencyKey(c.req.header('Idempotency-Key')), input }, {
        execute() {
          const { bookmark: data, created } = createBookmark(db, context.personId, input, resolve);
          return { status: created ? 201 : 200, body: { data }, resource: { type: 'bookmark', id: data.id } };
        },
        replay(result) { return { status: 200, body: { data: resolveBookmark(db, context.personId, result.resource!.id, resolve) } }; },
      });
      const { data } = response.body as { data: ReturnType<typeof resolveBookmark> };
      c.header('ETag', `"${data.version}"`);
      c.header('Location', `/api/v1/bookmarks/${encodeURIComponent(data.id)}`);
      return c.json({ data }, response.status as 200 | 201);
    });
    api.delete('/bookmarks/:bookmarkId', c => {
      services.transaction(c.get('db'), () => deleteBookmark(c.get('db'), c.get('context').personId, c.req.param('bookmarkId'), expectedVersion(c.req.header('If-Match'))));
      return c.body(null, 204);
    });
    api.get('/shared-themes', c => c.json(listSharedThemes(c.get('db'), c.get('context'), new URL(c.req.url).searchParams, createInformationService(c.get('db')))));
    api.get('/shared-themes/:themeId', c => c.json({ data: getSharedTheme(c.get('db'), c.get('context'), c.req.param('themeId'), createInformationService(c.get('db'))) }));
    api.get('/themes/:themeId/sharing', c => {
      const data = getThemeSharing(c.get('db'), c.get('context').personId, c.req.param('themeId'));
      c.header('ETag', `"${data.version}"`);
      return c.json({ data });
    });
    api.patch('/themes/:themeId/sharing', async c => {
      const input = await c.req.json();
      const data = services.transaction(c.get('db'), () => patchThemeSharing(c.get('db'), c.get('context').personId, c.req.param('themeId'), expectedVersion(c.req.header('If-Match')), input));
      c.header('ETag', `"${data.version}"`);
      return c.json({ data });
    });
  },
});
