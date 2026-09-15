import {inflateRawSync} from 'node:zlib';

// Adapted from sodateru-map-rehearsal 4699303 (same project v2 package contract).
import type {PetManifestV2} from './package-format.ts';
import {decodePetManifest, PetPackageDecodeError, MAX_ZIP_BYTES, MAX_EXPANDED_BYTES} from './package-format.ts';

const MAX_FILES = 2;

export interface DecodedPetArchive {
  readonly manifest: PetManifestV2;
  readonly atlasBytes: Uint8Array;
  readonly contentType: 'image/png' | 'image/webp';
}

export function decodePetZip(bytes: Uint8Array): DecodedPetArchive {
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_ZIP_BYTES) {
    throw new PetPackageDecodeError('ZIP_SIZE_INVALID', 'ZIP must be between 1 and 50,000,000 bytes');
  }
  const entries = readCentralDirectory(bytes);
  if (entries.length !== MAX_FILES) {
    throw new PetPackageDecodeError('ZIP_FILE_COUNT_INVALID', 'ZIP must contain exactly pet.json and one atlas image');
  }
  const expandedTotal = entries.reduce((total, entry) => total + entry.uncompressedSize, 0);
  if (expandedTotal > MAX_EXPANDED_BYTES) {
    throw new PetPackageDecodeError('ZIP_EXPANDED_SIZE_INVALID', 'Expanded ZIP content exceeds 100,000,000 bytes');
  }
  const files = new Map(entries.map((entry) => [entry.name, extractEntry(bytes, entry)]));
  const manifestBytes = files.get('pet.json');
  if (!manifestBytes) throw new PetPackageDecodeError('ZIP_LAYOUT_INVALID', 'ZIP must contain root pet.json');
  const manifest = decodePetManifest(manifestBytes);
  const atlasBytes = files.get(manifest.spritesheetPath);
  if (!atlasBytes || files.size !== 2) {
    throw new PetPackageDecodeError('ZIP_LAYOUT_INVALID', `ZIP must contain only pet.json and ${manifest.spritesheetPath}`);
  }
  if (looksLikeZip(atlasBytes)) throw new PetPackageDecodeError('NESTED_ZIP_UNSUPPORTED', 'Nested ZIP content is not supported');
  return {
    manifest,
    atlasBytes,
    contentType: manifest.spritesheetPath.endsWith('.png') ? 'image/png' : 'image/webp',
  };
}

interface ZipEntry {
  readonly name: string;
  readonly flags: number;
  readonly method: number;
  readonly crc32: number;
  readonly compressedSize: number;
  readonly uncompressedSize: number;
  readonly localOffset: number;
  readonly directoryOffset: number;
}

function readCentralDirectory(bytes: Uint8Array): ZipEntry[] {
  const eocd = findEocd(bytes);
  const view = dataView(bytes);
  if (view.getUint16(eocd + 4, true) !== 0 || view.getUint16(eocd + 6, true) !== 0) {
    throw new PetPackageDecodeError('ZIP_UNSUPPORTED', 'Multi-disk ZIP is not supported');
  }
  const count = view.getUint16(eocd + 10, true);
  const centralSize = view.getUint32(eocd + 12, true);
  const centralOffset = view.getUint32(eocd + 16, true);
  if (count !== view.getUint16(eocd + 8, true) || count > MAX_FILES || centralOffset + centralSize > eocd) {
    throw new PetPackageDecodeError('ZIP_FILE_COUNT_INVALID', 'ZIP contains too many files or an invalid directory');
  }
  const decoder = new TextDecoder('utf-8', {fatal: true});
  const entries: ZipEntry[] = [];
  let offset = centralOffset;
  for (let index = 0; index < count; index += 1) {
    if (offset + 46 > bytes.length || view.getUint32(offset, true) !== 0x02014b50) corruptZip();
    const flags = view.getUint16(offset + 8, true);
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const uncompressedSize = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const externalAttributes = view.getUint32(offset + 38, true);
    const localOffset = view.getUint32(offset + 42, true);
    const end = offset + 46 + nameLength + extraLength + commentLength;
    if (end > centralOffset + centralSize || compressedSize === 0xffffffff || uncompressedSize === 0xffffffff || localOffset === 0xffffffff) corruptZip();
    let name: string;
    try { name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength)); }
    catch (error) { throw new PetPackageDecodeError('ZIP_PATH_INVALID', 'ZIP filenames must be UTF-8', {cause: error}); }
    assertSafeRootPath(name);
    const unixMode = externalAttributes >>> 16;
    if ((unixMode & 0o170000) === 0o120000) {
      throw new PetPackageDecodeError('ZIP_SYMLINK_UNSUPPORTED', 'ZIP symlinks are not supported');
    }
    if ((flags & 1) !== 0 || (method !== 0 && method !== 8)) {
      throw new PetPackageDecodeError('ZIP_UNSUPPORTED', 'Encrypted or unsupported-compression ZIP is not supported');
    }
    entries.push({name, flags, method, crc32: view.getUint32(offset + 16, true), compressedSize, uncompressedSize, localOffset, directoryOffset: centralOffset});
    offset = end;
  }
  if (offset !== centralOffset + centralSize || new Set(entries.map((entry) => entry.name)).size !== entries.length) corruptZip();
  return entries;
}

function extractEntry(zip: Uint8Array, entry: ZipEntry): Uint8Array {
  const view = dataView(zip);
  const offset = entry.localOffset;
  if (offset + 30 > zip.length || view.getUint32(offset, true) !== 0x04034b50) corruptZip();
  if (view.getUint16(offset + 6, true) !== entry.flags || view.getUint16(offset + 8, true) !== entry.method) corruptZip();
  const nameLength = view.getUint16(offset + 26, true);
  const extraLength = view.getUint16(offset + 28, true);
  const dataOffset = offset + 30 + nameLength + extraLength;
  if (dataOffset + entry.compressedSize > entry.directoryOffset) corruptZip();
  let localName: string;
  try { localName = new TextDecoder('utf-8', {fatal: true}).decode(zip.subarray(offset + 30, offset + 30 + nameLength)); }
  catch (error) { throw new PetPackageDecodeError('ZIP_PATH_INVALID', 'ZIP filenames must be UTF-8', {cause: error}); }
  if (localName !== entry.name) corruptZip();
  const compressed = zip.subarray(dataOffset, dataOffset + entry.compressedSize);
  let output: Uint8Array;
  try {
    output = entry.method === 0 ? compressed.slice()
      : inflateRawSync(compressed, {maxOutputLength: Math.min(entry.uncompressedSize, MAX_EXPANDED_BYTES)});
  } catch (error) {
    throw new PetPackageDecodeError('ZIP_CORRUPT', `ZIP entry ${entry.name} could not be decompressed`, {cause: error});
  }
  if (output.byteLength !== entry.uncompressedSize || crc32(output) !== entry.crc32) corruptZip();
  return output;
}

function findEocd(bytes: Uint8Array): number {
  const minimum = Math.max(0, bytes.length - 65_557);
  const view = dataView(bytes);
  for (let offset = bytes.length - 22; offset >= minimum; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50 && offset + 22 + view.getUint16(offset + 20, true) === bytes.length) return offset;
  }
  throw new PetPackageDecodeError('ZIP_CORRUPT', 'ZIP end record is missing');
}

function assertSafeRootPath(name: string): void {
  if (!name || name.includes('\0') || name.includes('\\') || name.startsWith('/') || /^[A-Za-z]:/.test(name)
    || name.split('/').some((part) => part === '' || part === '.' || part === '..') || name.includes('/')) {
    throw new PetPackageDecodeError('ZIP_PATH_INVALID', 'ZIP entries must be safe root filenames');
  }
  if (name.toLowerCase().endsWith('.zip')) {
    throw new PetPackageDecodeError('NESTED_ZIP_UNSUPPORTED', 'Nested ZIP entries are not supported');
  }
}

function looksLikeZip(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && (bytes[2] === 3 || bytes[2] === 5 || bytes[2] === 7);
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dataView(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

function corruptZip(): never {
  throw new PetPackageDecodeError('ZIP_CORRUPT', 'ZIP structure is corrupt');
}
