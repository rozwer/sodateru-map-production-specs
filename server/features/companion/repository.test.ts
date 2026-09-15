import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CompanionRepository } from './repository.ts';

const sql = () => readFileSync(new URL('../../db/migrations/companion/001-companion.sql', import.meta.url), 'utf8');
test('draft edits survive reopening and stale versions preserve inputs', () => {
  const dir = mkdtempSync(join(tmpdir(), 'companion-'));
  let db = new DatabaseSync(join(dir, 'live.sqlite'));
  try {
    db.exec(sql());
    let repo = new CompanionRepository(db, 'alice');
    const draft = repo.createDraft({name: '旅猫', appearance: '青い帽子', referenceImageId: null});
    assert.equal(draft.version, 1);
    assert.throws(() => repo.updateDraft(draft.id, 9, {name: '失う入力', appearance: '', referenceImageId: null}), /VERSION_CONFLICT/);
    assert.equal(repo.updateDraft(draft.id, 1, {name: '旅猫', appearance: '赤い帽子', referenceImageId: null}).version, 2);
    db.close(); db = new DatabaseSync(join(dir, 'live.sqlite'));
    repo = new CompanionRepository(db, 'alice');
    assert.equal(repo.getDraft(draft.id).appearance, '赤い帽子');
    assert.throws(() => new CompanionRepository(db, 'bob').getDraft(draft.id), /NOT_FOUND/);
  } finally { db.close(); rmSync(dir, {recursive:true,force:true}); }
});

test('registration requires all preview confirmations and selection stays explicit', () => {
  const db = new DatabaseSync(':memory:'); db.exec(sql());
  try {
    const repo = new CompanionRepository(db, 'alice');
    // Storage-boundary fixture only; this is not ZIP compatibility evidence.
    const item = repo.saveInspectedImport({name:'猫', manifest:{id:'cat'}, requiredActions:['idle','wave'], zip:Buffer.from('zip'), atlas:Buffer.from('atlas'), mime:'image/png'});
    assert.throws(() => repo.registerImport(item.id), /PREVIEW_REQUIRED/);
    assert.equal(repo.confirmImport(item.id, 1, ['idle','wave']).version, 2);
    const pet = repo.registerImport(item.id);
    assert.equal(repo.registerImport(item.id).id, pet.id);
    assert.equal(repo.getSettings().selectedCompanionId, null);
    assert.equal(repo.listCompanions().length, 1);
    assert.equal(repo.updateSettings(1, {selectedCompanionId:pet.id,visible:true,size:'medium',reducedMotion:false}).selectedCompanionId, pet.id);
    assert.throws(() => repo.updateSettings(2, {selectedCompanionId:'unknown',visible:true,size:'medium',reducedMotion:false}), /NOT_FOUND/);
    assert.equal(repo.getSettings().selectedCompanionId, pet.id);
    assert.equal(new CompanionRepository(db,'bob').listCompanions().length, 0);
  } finally { db.close(); }
});
