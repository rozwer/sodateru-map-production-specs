import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename } from 'node:path';
import { openDatabases } from '../../db/connection.ts';
import { CommonError } from '../../core/errors.ts';
import { idempotentMutation } from '../../core/idempotency.ts';
import { createBookmark, deleteBookmark, listBookmarks, resolveBookmark, type ResolveTarget } from './bookmarks.ts';

test('bookmark references persist, replay resolves current state, expiry and deletion never restore a snapshot', () => {
  const root = mkdtempSync(join(tmpdir(), 'community-bookmarks-'));
  const options = { livePath: join(root, 'live.sqlite'), demoPath: join(root, 'demo.sqlite'), migrations: [{ id: 'community/001-bookmarks', sql: readFileSync(new URL('../../db/migrations/community/001_bookmarks.sql', import.meta.url), 'utf8') }] };
  let databases = openDatabases(options);
  const context = { personId: 'reader', dataMode: 'live' as const, requestId: 'test-request', signal: new AbortController().signal };
  // This controlled target resolver tests bookmark persistence only; HTTP E2E uses INFORMATION/PLACES.
  let available = true;
  const target: ResolveTarget = () => {
    if (!available) throw new CommonError('NOT_FOUND', 'gone');
    return { data: { id: 'source', body: 'Never store this body in a bookmark' }, expiresAt: null };
  };
  try {
    for (const db of [databases.live, databases.demo]) db.prepare("INSERT INTO people(id,version,created_at,updated_at,name,bio,avatar_path) VALUES('reader',1,1,1,'本人','',NULL)").run();
    const input = { id: 'bookmark', target: { type: 'record' as const, id: 'source' } };
    const save = () => idempotentMutation(databases.live, { context, operation: 'POST /api/v1/bookmarks', key: 'one-operation', input }, {
      execute() { const { bookmark: data } = createBookmark(databases.live, context.personId, input, target); return { status: 201, body: data, resource: { type: 'bookmark', id: data.id } }; },
      replay(result) { return { status: 201, body: resolveBookmark(databases.live, context.personId, result.resource!.id, target) }; },
    });
    save(); save();
    assert.equal(createBookmark(databases.live, context.personId, { ...input, id: 'another-id' }, target).bookmark.id, 'bookmark');
    assert.equal(databases.live.prepare('SELECT COUNT(*) AS n FROM community_bookmarks').get()!.n, 1);
    assert.ok(!JSON.stringify(databases.live.prepare('SELECT * FROM community_bookmarks').all()).includes('Never store'));
    assert.ok(!JSON.stringify(databases.live.prepare('SELECT * FROM core_requests').all()).includes('Never store'));
    databases.close(); databases = openDatabases(options);
    assert.equal(resolveBookmark(databases.live, context.personId, 'bookmark', target).id, 'bookmark');
    assert.equal(listBookmarks(databases.demo, { ...context, dataMode: 'demo' }, new URLSearchParams(), target).items.length, 0);
    available = false;
    assert.throws(save, (error: any) => error.code === 'NOT_FOUND');
    const unavailable = listBookmarks(databases.live, context, new URLSearchParams(), target).items[0]!;
    assert.equal(unavailable.status, 'unavailable'); assert.equal(unavailable.resource, null);
    deleteBookmark(databases.live, context.personId, 'bookmark', 1);
    available = true;
    assert.throws(save, (error: any) => error.code === 'NOT_FOUND');
    const candidate: ResolveTarget = () => ({ data: { candidateId: 'candidate-1' }, expiresAt: Date.now() + 60_000 });
    createBookmark(databases.live, context.personId, { id: 'candidate-bookmark', target: { type: 'candidate', resultId: 'result', candidateId: 'candidate-1' } }, candidate);
    databases.live.prepare("UPDATE community_bookmarks SET expires_at=0 WHERE id='candidate-bookmark'").run();
    assert.throws(() => resolveBookmark(databases.live, context.personId, 'candidate-bookmark', candidate), (error: any) => error.code === 'RESULT_EXPIRED');
    const expired = listBookmarks(databases.live, context, new URLSearchParams(), candidate).items[0]!;
    assert.equal(expired.status, 'expired'); assert.equal(expired.resource, null);
    deleteBookmark(databases.live, context.personId, 'candidate-bookmark', 1);
    assert.equal(databases.live.prepare('SELECT COUNT(*) AS n FROM community_bookmarks').get()!.n, 0);
  } finally {
    databases.close();
    const targetPath = resolve(root);
    assert.equal(dirname(targetPath), resolve(tmpdir()));
    assert.ok(basename(targetPath).startsWith('community-bookmarks-'));
    rmSync(targetPath, { recursive: true });
  }
});
