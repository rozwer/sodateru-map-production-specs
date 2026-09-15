import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectPetZip } from './package.ts';
import { atlasFixture,zipFixture,manifest } from './fixture.ts';

test('actual PNG decode verifies all 73 populated cells and 25 required preview actions',async()=>{
  const atlas=atlasFixture();
  const zip=zipFixture({'pet.json':Buffer.from(JSON.stringify(manifest)),'spritesheet.png':atlas});
  const result=await inspectPetZip(zip);
  assert.equal(result.requiredActions.length,25);
  assert.equal(result.requiredActions[9],'gaze-0');
  assert.equal(result.requiredActions[24],'gaze-337.5');
  assert.deepEqual(Buffer.from(result.atlas),atlas);
  await assert.rejects(inspectPetZip(zipFixture({'pet.json':Buffer.from(JSON.stringify(manifest)),'spritesheet.png':atlasFixture(true)})),/UNUSED_CELL_NOT_TRANSPARENT/);
  await assert.rejects(inspectPetZip(zipFixture({'pet.json':Buffer.from(JSON.stringify(manifest)),'spritesheet.png':Buffer.from('not an image')})),/IMAGE_DECODE_FAILED/);
});
