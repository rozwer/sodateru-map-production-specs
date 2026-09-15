import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { openDatabases } from '../../db/connection.ts';
import { transaction } from '../../db/migrate.ts';
import { loadLocalIdentity, seedProfiles } from '../../core/session.ts';
import activity from './register.ts';
import { createVisit, patchVisit, deleteVisit, createPoints } from './service.ts';
import { getGrowth, listVisits, listPoints } from './queries.ts';

test('current purposes, confirmed counts, suggestion cancellation, retained record body, cursor ownership and atomic observation failure', () => {
  const directory = resolve('.local', `activity-lifecycle-${randomUUID()}`);
  const dbs = openDatabases({ livePath: `${directory}/live.sqlite`, demoPath: `${directory}/demo.sqlite`, migrations: activity.migrations });
  try {
    const identity = loadLocalIdentity(`${directory}/profiles.json`); seedProfiles(dbs, identity.profiles);
    const context = { personId: identity.profiles[0]!.id, dataMode: 'live' }, db = dbs.live, now = Date.now();
    for (const id of ['place-a', 'place-b']) db.prepare(`INSERT INTO places(id,name,longitude,latitude,provider,attribution,created_at,updated_at) VALUES (?,?,139,35,'manual','fixture',?,?)`).run(id, id, now, now);
    let v = transaction(db, () => createVisit(db, context, { id: 'visit-a', placeId: 'place-a', startedAt: now, endedAt: null, timePrecision: 'exact', origin: 'manual' }));
    assert.equal(getGrowth(db, context).items.length, 0);
    v = transaction(db, () => patchVisit(db, context, v.id, { status: 'confirmed' }, v.version));
    db.prepare(`INSERT INTO records(id,created_at,updated_at,person_id,kind,visit_id,time_precision,body,purposes_json,activities_json,impression,period_answers_json,bookmarked,use_for_suggestions,visibility,shared_with_json)
      VALUES ('record-a',?,?,?,'experience','visit-a','unknown','残す本文','["カフェ"]','[]','','{}',0,1,'private','[]')`).run(now, now, context.personId);
    db.prepare(`INSERT INTO suggestions(id,created_at,updated_at,person_id,place_id,batch_id,position,title,activity,reason,conditions_json,source_refs_json,status,expires_at,completed_visit_id,feedback)
      VALUES ('suggestion-a',?,?,?,'place-a','batch-a',0,'fixture','fixture','','{}','[]','completed',?,'visit-a','')`).run(now, now, context.personId, now + 1000000);
    assert.deepEqual(getGrowth(db, context).items[0]!.purposes, ['カフェ']);
    db.prepare(`UPDATE records SET purposes_json='["散歩"]',version=version+1 WHERE id='record-a'`).run();
    const growth = getGrowth(db, context).items[0]!;
    assert.equal(growth.confirmedVisitCount, 1); assert.deepEqual(growth.purposes, ['散歩']);
    v = transaction(db, () => patchVisit(db, context, v.id, { placeId: 'place-b' }, v.version));
    assert.deepEqual(db.prepare('SELECT status,completed_visit_id,version FROM suggestions WHERE id=?').get('suggestion-a'), Object.assign(Object.create(null), { status: 'selected', completed_visit_id: null, version: 2 }));
    transaction(db, () => deleteVisit(db, context, v.id, v.version));
    const record = db.prepare('SELECT * FROM records WHERE id=?').get('record-a')!;
    assert.equal(record.body, '残す本文'); assert.equal(record.visit_id, null); assert.equal(record.place_id, null); assert.equal(record.occurred_at, null); assert.equal(record.time_precision, 'unknown');
    assert.equal(getGrowth(db, context).items.length, 0);
    for (const [id, startedAt] of [['dated-a', now], ['dated-b', now - 1], ['undated', null]] as const) transaction(db, () => createVisit(db, context, { id, placeId: 'place-a', startedAt, endedAt: null, timePrecision: startedAt === null ? 'unknown' : 'exact', origin: 'manual' }));
    const first = listVisits(db, context, { limit: 1 });
    assert.ok(first.nextCursor); assert.equal(listVisits(db, context, { cursor: first.nextCursor, limit: 1 }).items[0]!.id, 'dated-b');
    assert.throws(() => listVisits(db, { ...context, personId: 'other' }, { cursor: first.nextCursor! }), /cursor/);
    assert.equal(listVisits(db, context, { from: now - 10, to: now + 10 }).items.length, 2);
    const point = { id: 'point-a', segmentId: 'segment', sourcePointId: 'source-a', observedAt: now, longitude: 139, latitude: 35, accuracyM: 5 };
    transaction(db, () => createPoints(db, context, { items: [point] }));
    assert.throws(() => transaction(db, () => createPoints(db, context, { items: [{ ...point, id: 'point-b', sourcePointId: 'source-b' }, { ...point, latitude: 36 }] })), /different content/);
    assert.equal(listPoints(db, context).items.length, 1);
  } finally { dbs.close(); }
});
