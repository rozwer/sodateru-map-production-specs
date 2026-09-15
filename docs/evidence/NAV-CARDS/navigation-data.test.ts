import { expect, it, vi } from 'vitest';
import { api } from '../../../src/app/api';
import { readNavigationPhotos } from '../../../src/app/navigation-card-data';
vi.mock('../../../src/app/api', () => ({ api: { request: vi.fn() } }));
it('carries the reflection day timezone into the records range, as required by the information contract', async () => {
  const request = vi.mocked(api.request);
  request.mockImplementation(async (operation: string) => operation === 'getReflectionDaysDate' ? {data: {from: 10, to: 20}} : {items: []});
  await readNavigationPhotos('self', new AbortController().signal);
  const dayInput = request.mock.calls[0]![1] as {query: {timeZone: string}};
  expect(request.mock.calls[1]![1]).toMatchObject({query: {from:10, to:20, timeZone:dayInput.query.timeZone}});
});
