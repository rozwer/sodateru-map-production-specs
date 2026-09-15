import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { assertAiAllowed, isSuggestionAllowed, patchPerson, patchSettings, readPerson, readSettings, resetSettings } from './service.ts';
import { iconBytes, iconRow, prepareIcon, removeIconFile, setIcon } from './icons.ts';
import { exportSettingsHtml, ownDataSummary } from './data.ts';

const migration = readFileSync(new URL('../../db/migrations/settings/001-settings.sql', import.meta.url), 'utf8');
function fixture(file: string) {
  const db = new DatabaseSync(file);
  // Minimal foreign-owned fixture tables; production uses CORE's base migration.
  db.exec(`PRAGMA foreign_keys=ON;
    CREATE TABLE people(id TEXT PRIMARY KEY,version INTEGER,created_at INTEGER,updated_at INTEGER,name TEXT,bio TEXT,avatar_path TEXT);
    CREATE TABLE records(id TEXT PRIMARY KEY,person_id TEXT,body TEXT);
    CREATE TABLE media(id TEXT PRIMARY KEY,person_id TEXT,file_path TEXT);
    INSERT INTO people VALUES('a',1,1,1,'本人A','紹介',NULL),('b',1,1,1,'本人B','紹介B',NULL);
    INSERT INTO records VALUES('record-a','a','消さない記録'),('record-b','b','別本人の記録');
    INSERT INTO media VALUES('media-a','a','untouched-file');`);
  db.exec(migration);
  return db;
}
const code = (expected: string) => (error: unknown) => (error as { code: string }).code === expected;
function cleanup(root: string) {
  const target = resolve(root);
  assert.equal(dirname(target), resolve(tmpdir()));
  assert.ok(basename(target).startsWith('settings-'));
  rmSync(target, { recursive: true });
}

test('settings survive restart, remain isolated, enforce AI and suggestion changes, and reject stale versions', () => {
  const root = mkdtempSync(join(tmpdir(), 'settings-'));
  let db = fixture(join(root, 'live.sqlite'));
  const demo = fixture(join(root, 'demo.sqlite'));
  try {
    assert.equal(readSettings(db, 'a').version, 1);
    assert.throws(() => assertAiAllowed(db, 'a'), code('FORBIDDEN'));
    let saved = patchSettings(db, 'a', 1, {
      ai: { enabled: true, allowRecords: true, allowLocation: false, allowMedia: false, allowProfile: false },
      display: { fontSize: 'large', reduceMotion: true },
      suggestions: { enabled: true, timing: 'onOpen', summaryDays: 7, stopped: [{ placeId: 'park', activity: 'walking' }, { placeId: null, activity: 'driving' }] },
    });
    assert.equal(saved.version, 2);
    assert.equal(assertAiAllowed(db, 'a', { records: true }), 2);
    assert.throws(() => assertAiAllowed(db, 'a', { location: true }), code('FORBIDDEN'));
    assert.equal(isSuggestionAllowed(db, 'a', { placeId: 'park', activity: 'walking' }), false);
    assert.equal(isSuggestionAllowed(db, 'a', { placeId: 'park', activity: 'reading' }), true);
    assert.equal(isSuggestionAllowed(db, 'a', { placeId: 'other', activity: 'driving' }), false);
    assert.equal(isSuggestionAllowed(db, 'a', { placeId: 'other', activity: 'reading' }, 'continuous'), false);
    assert.throws(() => patchSettings(db, 'a', 1, { display: { fontSize: 'standard', reduceMotion: false } }), code('VERSION_CONFLICT'));
    assert.throws(() => patchSettings(db, 'a', 2, { display: { fontSize: 'large' } }), code('VALIDATION_FAILED'));
    assert.throws(() => patchSettings(db, 'a', 2, { suggestions: { enabled: true, timing: 'onOpen', summaryDays: 7, stopped: [{ placeId: null, activity: null }] } }), code('VALIDATION_FAILED'));
    db.close();
    db = new DatabaseSync(join(root, 'live.sqlite'));
    assert.deepEqual(readSettings(db, 'a'), saved);
    assert.equal(readSettings(db, 'b').display.fontSize, 'standard');
    assert.equal(readSettings(demo, 'a').display.fontSize, 'standard');
    saved = patchSettings(db, 'a', 2, { suggestions: { ...saved.suggestions, stopped: [] } });
    assert.equal(isSuggestionAllowed(db, 'a', { placeId: 'park', activity: 'walking' }), true);
    resetSettings(db, 'a', saved.version);
    assert.throws(() => assertAiAllowed(db, 'a'), code('FORBIDDEN'));
    assert.equal(readSettings(db, 'a').version, 4);
    assert.throws(() => patchSettings(db, 'a', 1, { profileVisibility: 'public' }), code('VERSION_CONFLICT'));
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM records').get()?.count, 2);
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM media').get()?.count, 1);
  } finally { db.close(); demo.close(); cleanup(root); }
});

test('profile/icon changes retain other records/media and export a readable escaped document', () => {
  const root = mkdtempSync(join(tmpdir(), 'settings-icons-'));
  const db = fixture(join(root, 'live.sqlite'));
  try {
    assert.throws(() => patchPerson(db, 'a', 1, { name: 'あ'.repeat(21) }), code('VALIDATION_FAILED'));
    assert.throws(() => patchPerson(db, 'a', 1, { avatarUrl: 'file:///private/file' }), code('VALIDATION_FAILED'));
    const person = patchPerson(db, 'a', 1, { name: '<本人>', bio: '次回にも残る' });
    assert.equal(person.version, 2);
    assert.throws(() => patchPerson(db, 'a', 1, { bio: '古い編集' }), code('VERSION_CONFLICT'));
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9l8AAAAASUVORK5CYII=', 'base64');
    const file = prepareIcon(db, png, 'image/png');
    setIcon(db, 'a', 2, file, 'http://localhost/api/v1/me/icon');
    assert.deepEqual(iconBytes(db, 'a').bytes, png);
    assert.throws(() => iconBytes(db, 'b'), code('NOT_FOUND'));
    assert.throws(() => setIcon(db, 'a', 2, null, null), code('VERSION_CONFLICT'));
    assert.equal(existsSync(file.path), true);
    setIcon(db, 'a', 3, null, null);
    removeIconFile(file.path);
    assert.equal(existsSync(file.path), false);
    assert.equal(iconRow(db, 'a'), undefined);
    assert.equal(readPerson(db, 'a').name, '<本人>');
    assert.equal(db.prepare('SELECT body FROM records WHERE id=?').get('record-a')?.body, '消さない記録');
    assert.equal(db.prepare('SELECT file_path FROM media WHERE id=?').get('media-a')?.file_path, 'untouched-file');
    assert.equal(ownDataSummary(db, 'a').categories[2].count, 1);
    const html = exportSettingsHtml(db, 'a');
    assert.match(html, /&lt;本人&gt;/);
    assert.match(html, /次回にも残る/);
    assert.match(html, /AIの利用/);
    assert.doesNotMatch(html, /別本人の記録/);
  } finally { db.close(); cleanup(root); }
});
