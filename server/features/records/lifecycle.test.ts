import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabases } from '../../db/connection.ts';
import { transaction } from '../../db/migrate.ts';
import { seedProfiles } from '../../core/session.ts';
import records from './register.ts';
import { createRecord, deleteRecord } from './service.ts';

test('deleting an experience preserves its visit and independent memo while removing memberships and origins', () => {
  const directory = mkdtempSync(join(tmpdir(), 'records-lifecycle-'));
  const databases = openDatabases({ livePath: join(directory, 'live.sqlite'), demoPath: join(directory, 'demo.sqlite'), migrations: [
    ...records.migrations!,
    { id: 'themes-acceptance', sql: readFileSync(new URL('../../db/migrations/themes/001-presentation.sql', import.meta.url), 'utf8') },
  ] });
  try {
    seedProfiles(databases, [{ key: 'self', id: 'self', name: '本人' }]);
    const db = databases.live;
    db.prepare("INSERT INTO places(id,created_at,updated_at,name,longitude,latitude,provider,attribution) VALUES ('test-place',1,1,'テスト用の場所',139,35,'test-fixture','test-fixture')").run();
    db.prepare("INSERT INTO visits(id,created_at,updated_at,person_id,place_id,started_at,ended_at,time_precision,origin,status) VALUES ('test-visit',1,1,'self','test-place',NULL,NULL,'unknown','manual','confirmed')").run();
    const input = { id: 'experience', kind: 'experience', visitId: 'test-visit', placeId: null, occurredAt: null, endedAt: null, timePrecision: 'unknown', body: '', purposes: [], activities: [], impression: '', periodAnswers: {}, bookmarked: false, useForSuggestions: true, topicKey: null, visibility: 'private', sharedWith: [] };
    const mediaOnly = transaction(db, () => createRecord(db, 'self', input));
    assert.equal(mediaOnly.body, ''); assert.equal(mediaOnly.effectivePlaceId, 'test-place');
    transaction(db, () => createRecord(db, 'self', { ...input, id: 'independent-memo', kind: 'memo', visitId: null, body: '由来が消えても残す本人の原文' }));
    db.prepare("INSERT INTO themes(id,created_at,updated_at,person_id,name,description,record_ids_json) VALUES ('theme',1,1,'self','テーマ','',?)").run(JSON.stringify(['experience', 'independent-memo']));
    db.prepare("INSERT INTO memo_origins(record_id,position,origin_type,origin_id,origin_version) VALUES ('independent-memo',0,'record','experience',1)").run();
    transaction(db, () => deleteRecord(db, 'self', 'experience', 1));
    assert.equal(db.prepare("SELECT status FROM visits WHERE id='test-visit'").get()!.status, 'confirmed');
    assert.equal(db.prepare("SELECT body FROM records WHERE id='independent-memo'").get()!.body, '由来が消えても残す本人の原文');
    assert.deepEqual(JSON.parse(String(db.prepare("SELECT record_ids_json FROM themes WHERE id='theme'").get()!.record_ids_json)), ['independent-memo']);
    assert.equal(db.prepare("SELECT count(*) AS n FROM memo_origins").get()!.n, 0);
    assert.equal(db.prepare('PRAGMA foreign_key_check').all().length, 0);
  } finally { databases.close(); }
});
