import { CompanionFailure } from './repository.ts';

// Compatibility source: sodateru-map-rehearsal 4699303, pet-package and codex-v2 renderer.
export const ATLAS={width:1536,height:2288,columns:8,rows:11,cellWidth:192,cellHeight:208} as const;
export const USED_FRAMES=[6,8,8,4,5,8,6,6,6,8,8] as const;
export const REQUIRED_ACTIONS=['idle','running-right','running-left','waving','jumping','failed','waiting','running','review',...Array.from({length:16},(_,i)=>`gaze-${i*22.5}`)];
export const MAX_ZIP_BYTES=50_000_000;
export const MAX_EXPANDED_BYTES=100_000_000;
export type PetManifestV2={id:string;displayName:string;description:string;spriteVersionNumber:2;spritesheetPath:'spritesheet.png'|'spritesheet.webp'};
export class PetPackageDecodeError extends CompanionFailure {
  constructor(code:string,message:string,options?:ErrorOptions) { super(code); this.message=`${code}: ${message}`; this.cause=options?.cause; }
}
export function decodePetManifest(bytes:Uint8Array):PetManifestV2 {
  if (bytes.length<1 || bytes.length>65_536) throw new PetPackageDecodeError('MANIFEST_SIZE_INVALID','pet.jsonは1〜65,536 bytesです。');
  let value:Record<string,unknown>;
  try { value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)); }
  catch { throw new PetPackageDecodeError('MANIFEST_INVALID','pet.jsonをUTF-8 JSONとして読み取れません。'); }
  if (!value || typeof value!=='object' || Array.isArray(value)) throw new PetPackageDecodeError('MANIFEST_INVALID','pet.jsonはオブジェクトです。');
  if (value.spriteVersionNumber!==2) throw new PetPackageDecodeError('UNSUPPORTED_VERSION','spriteVersionNumberは2が必要です。');
  const keys=['description','displayName','id','spriteVersionNumber','spritesheetPath'];
  if (JSON.stringify(Object.keys(value).sort())!==JSON.stringify(keys)) throw new PetPackageDecodeError('MANIFEST_INVALID','pet.jsonの必須5項目を確認してください。');
  if (typeof value.id!=='string' || !/^[a-z0-9][a-z0-9_-]{0,79}$/.test(value.id)) throw new PetPackageDecodeError('MANIFEST_INVALID','相棒のidが不正です。');
  if (typeof value.displayName!=='string' || [...value.displayName].length<1 || [...value.displayName].length>120 || typeof value.description!=='string' || [...value.description].length<1 || [...value.description].length>2000) throw new PetPackageDecodeError('MANIFEST_INVALID','名前または紹介の長さが不正です。');
  if (value.spritesheetPath!=='spritesheet.webp' && value.spritesheetPath!=='spritesheet.png') throw new PetPackageDecodeError('ZIP_PATH_INVALID','spritesheetPathは直下のPNGまたはWebPを指定します。');
  return value as PetManifestV2;
}
