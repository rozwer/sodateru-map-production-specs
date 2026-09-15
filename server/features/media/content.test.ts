import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectMedia, byteRange } from './content.ts';
import { CommonError } from '../../core/errors.ts';

test('MP4 classification uses the stored track handler, not the claimed MIME', () => {
  const box = (name: string, body: Buffer): Buffer => { const header = Buffer.alloc(8); header.writeUInt32BE(body.length + 8); header.write(name, 4); return Buffer.concat([header, body]); };
  const fixture = (handler: string): Buffer => Buffer.concat([
    box('ftyp', Buffer.from('isom\0\0\0\0isom')),
    box('moov', box('trak', box('mdia', box('hdlr', Buffer.concat([Buffer.alloc(8), Buffer.from(handler)]))))),
  ]);
  assert.equal(inspectMedia(fixture('vide'), 'video/mp4').kind, 'video');
  assert.equal(inspectMedia(fixture('soun'), 'audio/mp4').kind, 'audio');
  assert.throws(() => inspectMedia(fixture('vide'), 'audio/mp4'), (e: unknown) => e instanceof CommonError && e.code === 'UNSUPPORTED_MEDIA_TYPE');
  assert.throws(() => inspectMedia(fixture('text'), 'video/mp4'), (e: unknown) => e instanceof CommonError && e.code === 'UNSUPPORTED_MEDIA_TYPE');
});

test('single suffix/open ranges work and multi-range or reversed ranges fail', () => {
  assert.deepEqual(byteRange('bytes=-3', 10), { start: 7, end: 9 });
  assert.deepEqual(byteRange('bytes=5-', 10), { start: 5, end: 9 });
  for (const range of ['bytes=0-1,5-6', 'bytes=8-2', 'bytes=-0']) assert.throws(() => byteRange(range, 10), (e: unknown) => e instanceof CommonError && e.code === 'RANGE_NOT_SATISFIABLE');
});
