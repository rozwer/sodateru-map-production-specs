import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { CompanionRepository } from './repository.ts';
import { GenerationRepository } from './generations.ts';

test('cancellation is terminal and old input snapshots never overwrite the edited draft', () => {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../../db/migrations/companion/001-companion.sql', import.meta.url),'utf8'));
  try {
    const pets = new CompanionRepository(db,'alice'), jobs = new GenerationRepository(db,'alice');
    const draft = pets.createDraft({name:'旅猫',appearance:'青い帽子',referenceImageId:null});
    const job = jobs.create(draft.id,1,'configured-provider');
    jobs.recordProgress(job.id,{jobId:'upstream-123',status:'running',progress:25});
    pets.updateDraft(draft.id,1,{name:'旅猫',appearance:'赤い帽子',referenceImageId:null});
    const cancelled = jobs.cancel(job.id,2);
    assert.equal(cancelled.status,'cancelled');
    assert.equal(jobs.recordProgress(job.id,{jobId:'upstream-123',status:'running',progress:100}).status,'cancelled');
    assert.throws(() => jobs.complete(job.id,'late-result'), /GENERATION_TERMINAL/);
    assert.equal(jobs.get(job.id).input.appearance,'青い帽子');
    assert.equal(pets.getDraft(draft.id).appearance,'赤い帽子');
    assert.throws(() => new GenerationRepository(db,'bob').get(job.id), /NOT_FOUND/);
  } finally { db.close(); }
});

test('generation completion neither adopts nor selects and adoption requires preview confirmation', () => {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../../db/migrations/companion/001-companion.sql', import.meta.url),'utf8'));
  try {
    const pets = new CompanionRepository(db,'alice'), jobs = new GenerationRepository(db,'alice');
    const draft = pets.createDraft({name:'猫',appearance:'帽子',referenceImageId:null});
    const job = jobs.create(draft.id,1,'configured-provider');
    const result = pets.saveInspectedImport({name:'猫',manifest:{},requiredActions:['idle'],zip:Buffer.from('zip'),atlas:Buffer.from('atlas'),mime:'image/png'});
    jobs.complete(job.id,result.id);
    assert.equal(pets.listCompanions().length,0);
    assert.throws(() => jobs.adopt(job.id,2), /PREVIEW_REQUIRED/);
    pets.confirmImport(result.id,1,['idle']);
    const pet = jobs.adopt(job.id,2);
    assert.equal(pet.source,'generation');
    assert.equal(jobs.get(job.id).adoptedCompanionId,pet.id);
    assert.equal(jobs.get(job.id).version,3);
    assert.equal(pets.getSettings().selectedCompanionId,null);
  } finally { db.close(); }
});
