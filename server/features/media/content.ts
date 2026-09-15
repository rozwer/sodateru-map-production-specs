import { realpathSync, readFileSync, existsSync, unlinkSync } from 'node:fs';
import { resolve, relative, isAbsolute } from 'node:path';
import { CommonError } from '../../core/errors.ts';

export const MEDIA_MAX_BYTES = 50 * 1024 * 1024;
function mp4Handlers(bytes: Buffer, start = 0, end = bytes.length, depth = 0): Set<string> {
  const result = new Set<string>();
  if (depth > 5) return result;
  for (let offset = start; offset + 8 <= end;) {
    let size = bytes.readUInt32BE(offset), header = 8;
    if (size === 1) { if (offset + 16 > end) break; const wide = bytes.readBigUInt64BE(offset + 8); if (wide > BigInt(Number.MAX_SAFE_INTEGER)) break; size = Number(wide); header = 16; }
    if (size === 0) size = end - offset;
    if (size < header || offset + size > end) break;
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    if (['moov', 'trak', 'mdia'].includes(type)) for (const kind of mp4Handlers(bytes, offset + header, offset + size, depth + 1)) result.add(kind);
    if (type === 'hdlr' && size >= header + 12) result.add(bytes.toString('ascii', offset + header + 8, offset + header + 12));
    offset += size;
  }
  return result;
}
export function inspectMedia(bytes: Uint8Array, declaredMime: string): { mimeType: string; kind: 'photo' | 'video' | 'audio' } {
  const b = Buffer.from(bytes);
  if (!b.length || b.length > MEDIA_MAX_BYTES) throw new CommonError('PAYLOAD_TOO_LARGE', '媒体は1バイトから50MiBまでです。', false, undefined, 413);
  let mimeType = '';
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) mimeType = 'image/jpeg';
  else if (b.length >= 24 && b.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && b.toString('ascii', 12, 16) === 'IHDR') mimeType = 'image/png';
  else if (b.length >= 16 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') mimeType = 'image/webp';
  else if (b.length >= 16 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WAVE') mimeType = 'audio/wav';
  else if (b.length >= 10 && (b.toString('ascii', 0, 3) === 'ID3' || (b[0] === 0xff && (b[1]! & 0xe0) === 0xe0))) mimeType = 'audio/mpeg';
  else if (b.length >= 16 && b.toString('ascii', 4, 8) === 'ftyp' && b.readUInt32BE(0) >= 16 && b.readUInt32BE(0) <= b.length) {
    const brands = b.toString('ascii', 8, Math.min(b.readUInt32BE(0), 80));
    if (/isom|iso2|mp41|mp42|avc1|M4A |M4V /.test(brands)) {
      const handlers = mp4Handlers(b);
      mimeType = handlers.has('vide') ? 'video/mp4' : handlers.has('soun') ? 'audio/mp4' : '';
    }
  }
  if (!mimeType || mimeType !== declaredMime) throw new CommonError('UNSUPPORTED_MEDIA_TYPE', '媒体の内容とMIMEが一致しないか、未対応の形式です。', false, undefined, 415);
  return { mimeType, kind: mimeType.startsWith('image/') ? 'photo' : mimeType.startsWith('video/') ? 'video' : 'audio' };
}
export function mediaPath(root: string, key: string): string {
  const base = realpathSync(root);
  const candidate = resolve(base, key);
  const rel = relative(base, candidate);
  if (!rel || rel.startsWith('..') || isAbsolute(rel) || isAbsolute(key)) throw new CommonError('NOT_FOUND', '媒体が見つかりません。', false, undefined, 404);
  if (existsSync(candidate)) {
    const actual = relative(base, realpathSync(candidate));
    if (actual.startsWith('..') || isAbsolute(actual)) throw new CommonError('NOT_FOUND', '媒体が見つかりません。', false, undefined, 404);
  }
  return candidate;
}
export function readMedia(root: string, key: string): Buffer {
  const path = mediaPath(root, key);
  try { return readFileSync(path); } catch { throw new CommonError('PROVIDER_UNAVAILABLE', '媒体ファイルを読み込めません。', true, undefined, 503); }
}
export function removeMedia(root: string, keys: string[]): void {
  for (const key of keys) {
    try { unlinkSync(mediaPath(root, key)); } catch { /* Startup cleanup retries unreferenced objects. */ }
  }
}
export function byteRange(header: string | undefined, length: number): { start: number; end: number } | null {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  const fail = (): never => { throw new CommonError('RANGE_NOT_SATISFIABLE', '指定された範囲は配信できません。', false, undefined, 416); };
  if (!match || (!match[1] && !match[2])) return fail();
  let start: number, end: number;
  if (!match[1]) { const suffix = Number(match[2]); if (!suffix) return fail(); start = Math.max(0, length - suffix); end = length - 1; }
  else { start = Number(match[1]); end = match[2] ? Math.min(Number(match[2]), length - 1) : length - 1; }
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= length || end < start) return fail();
  return { start, end };
}
