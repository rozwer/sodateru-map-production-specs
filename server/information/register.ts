import { defineFeature } from '../core/features.ts';
import { createInformationService } from './service.ts';
import { queryFromUrl } from './query.ts';

export default defineFeature({
  id: 'information',
  register(api) {
    api.get('/records', c => c.json(createInformationService(c.get('db')).ownRecordsPage(c.get('context'), queryFromUrl(new URL(c.req.url), true))));
    api.get('/shared-records', c => c.json(createInformationService(c.get('db')).searchRecords(c.get('context'), queryFromUrl(new URL(c.req.url)))));
    api.get('/shared-records/map', c => c.json({data: createInformationService(c.get('db')).mapRecords(c.get('context'), queryFromUrl(new URL(c.req.url)))}));
    // Read-only source POST is connected to CORE's fresh-result receipt wrapper at integration.
    api.post('/source-checks', async c => c.json({data: createInformationService(c.get('db')).checkSources(c.get('context'), await c.req.json())}));
  },
});
