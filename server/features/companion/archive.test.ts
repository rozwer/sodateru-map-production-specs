import test from 'node:test';
import assert from 'node:assert/strict';
import { decodePetZip } from './archive.ts';
import { zipFixture,manifest } from './fixture.ts';

test('ZIP container accepts data beyond the old 6 MiB cap while enforcing the new limits',()=>{
  const zip=zipFixture({'pet.json':Buffer.from(JSON.stringify(manifest)),'spritesheet.png':Buffer.alloc(7_000_000,1)});
  assert.equal(decodePetZip(zip).atlasBytes.length,7_000_000);
  assert.throws(()=>decodePetZip(Buffer.alloc(50_000_001)),/ZIP_SIZE_INVALID/);
  const bomb=Buffer.from(zip),central=bomb.lastIndexOf(Buffer.from([0x50,0x4b,0x01,0x02]));
  bomb.writeUInt32LE(100_000_001,central+24);
  assert.throws(()=>decodePetZip(bomb),/ZIP_EXPANDED_SIZE_INVALID/);
});
test('ZIP rejects corrupt data, paths, wrong manifest, and an extra file',()=>{
  const file=Buffer.from('atlas-container-only');
  assert.throws(()=>decodePetZip(Buffer.from('bad')),/ZIP_CORRUPT/);
  assert.throws(()=>decodePetZip(zipFixture({'../pet.json':Buffer.from('{}'),'spritesheet.png':file})),/ZIP_PATH_INVALID/);
  assert.throws(()=>decodePetZip(zipFixture({'pet.json':Buffer.from(JSON.stringify({...manifest,spriteVersionNumber:1})),'spritesheet.png':file})),/UNSUPPORTED_VERSION/);
  assert.throws(()=>decodePetZip(zipFixture({'pet.json':Buffer.from(JSON.stringify(manifest)),'spritesheet.png':file,'extra.txt':file})),/ZIP_FILE_COUNT_INVALID/);
});
