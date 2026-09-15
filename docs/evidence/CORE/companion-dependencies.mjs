// Dependency smoke only. This does not validate the COMPANION ZIP manifest or v2 animations.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import sharp from 'sharp';

const pixels = Buffer.from([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 0, 255]);
const image = sharp(pixels, { raw: { width: 2, height: 2, channels: 4 } });
const png = await image.clone().png().toBuffer();
const webp = await image.clone().webp({ lossless: true }).toBuffer();
for (const encoded of [png, webp]) {
  const { data, info } = await sharp(encoded).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.width, 2); assert.equal(info.height, 2); assert.equal(info.channels, 4);
  assert.deepEqual(data, pixels);
}
await assert.rejects(sharp(Buffer.from('invalid image')).raw().toBuffer());
const pkg = JSON.parse(readFileSync(new URL('../../../package.json', import.meta.url), 'utf8'));
console.log(JSON.stringify({
  result: 'PASS', node: process.version, platform: process.platform, arch: process.arch,
  versions: { sharp: pkg.dependencies.sharp },
  checks: ['PNG actual pixel decode', 'WebP lossless actual pixel decode', 'invalid image rejection'],
  scope: 'dependencies only; COMPANION format, limits, persistence and UI acceptance remain feature-owned',
}, null, 2));
