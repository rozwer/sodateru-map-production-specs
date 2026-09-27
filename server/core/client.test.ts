import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApiClient } from '../../packages/api-client/index.ts';

test('client preserves caller request ID and generates one only when omitted', async () => {
  const captured: Headers[] = [];
  const client = createApiClient({ fetch: async (_url, options) => {
    captured.push(new Headers(options?.headers));
    return Response.json({ data: {} });
  } });
  const requestId = '11111111-1111-4111-8111-111111111111';
  await client.request('getMe', { requestId });
  await client.request('getMe', {});
  assert.equal(captured[0]!.get('X-Request-Id'), requestId);
  assert.match(captured[1]!.get('X-Request-Id')!, /^[0-9a-f-]{36}$/);
  assert.notEqual(captured[1]!.get('X-Request-Id'), requestId);
  await assert.rejects(client.request('getMe', { requestId: 'invalid' }), TypeError);
  assert.equal(captured.length, 2);
});

test('optional If-Match is omitted for creation and retained for updates', async () => {
  const captured: Headers[] = [];
  const client = createApiClient({ fetch: async (_url, options) => {
    captured.push(new Headers(options?.headers));
    return Response.json({ data: {} });
  } });
  const input = { body: { assistantMessageId: 'message', expectedAttempt: 1, recordId: 'record', body: 'diary', create: true }, idempotencyKey: 'adopt' };
  await client.request('postReflectionAdoptions', input);
  await client.request('postReflectionAdoptions', { ...input, version: 2 });
  assert.equal(captured[0]!.get('If-Match'), null);
  assert.equal(captured[1]!.get('If-Match'), '\"2\"');
  await assert.rejects(client.request('postReflectionAdoptions', { ...input, version: 0 }), TypeError);
  await assert.rejects(client.request('patchFeatureRequestsRequestId', { path: { requestId: 'id' }, body: { title: 'test' }, version: 0 }), TypeError);
});
