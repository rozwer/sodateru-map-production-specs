import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { CompanionRepository } from './repository.ts';

test('reference image ownership is checked and exported instructions preserve the saved draft', () => {
  const db=new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../../db/migrations/companion/001-companion.sql',import.meta.url),'utf8'));
  try {
    const alice=new CompanionRepository(db,'alice'),bob=new CompanionRepository(db,'bob');
    const media=alice.saveReferenceImage(Buffer.from('decoded-image-fixture'),'image/png');
    assert.throws(() => bob.createDraft({name:'猫',appearance:'帽子',referenceImageId:media.id}), /NOT_FOUND/);
    const draft=alice.createDraft({name:'旅猫',appearance:'青い帽子\n小さな猫',referenceImageId:media.id});
    const exported=alice.exportInstructions(draft.id);
    assert.equal(exported.draft.id,draft.id);
    assert.ok(exported.instructions.includes('青い帽子\n小さな猫'));
    assert.equal(exported.referenceImageUrl,`/api/v1/companion/reference-images/${media.id}`);
    assert.equal(alice.getReferenceImage(media.id).bytes.toString(),'decoded-image-fixture');
    assert.throws(() => bob.getReferenceImage(media.id),/NOT_FOUND/);
  } finally { db.close(); }
});
