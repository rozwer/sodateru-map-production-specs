import { defineFeature } from '../core/features.ts';
import { idempotentMutation, type StoredResult } from '../core/idempotency.ts';
import { createInformationService, type SourceRef } from './service.ts';
import { queryFromUrl } from './query.ts';

export default defineFeature({
  id: 'information',
  register(api) {
    api.get('/records', c => c.json(createInformationService(c.get('db')).ownRecordsPage(c.get('context'), queryFromUrl(new URL(c.req.url), true))));
    api.get('/shared-records', c => c.json(createInformationService(c.get('db')).searchRecords(c.get('context'), queryFromUrl(new URL(c.req.url)))));
    api.get('/shared-records/map', c => c.json({data: createInformationService(c.get('db')).mapRecords(c.get('context'), queryFromUrl(new URL(c.req.url)))}));
    api.post('/source-checks', c => {
      const db = c.get('db'), context = c.get('context');
      const input = c.get('input').body as {refs: SourceRef[]};
      const read = (): StoredResult => ({status: 200, body: {data: createInformationService(db).checkSources(context, input)}});
      const result = idempotentMutation(db, {
        context, operation: 'POST /api/v1/source-checks', key: c.req.header('Idempotency-Key')!, input,
      }, {
        // Persist only the request hash and a marker, never a stale permission/version verdict.
        execute: () => ({...read(), resource: {type: 'source-checks', id: context.requestId}}),
        replay: read,
      });
      return c.body(JSON.stringify(result.body), 200, {'Content-Type': 'application/json'});
    });
  },
});
