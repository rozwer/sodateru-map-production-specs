import { decodePetZip } from './archive.ts';
import { ATLAS,USED_FRAMES,REQUIRED_ACTIONS,PetPackageDecodeError } from './package-format.ts';
import type { InspectedPackage } from './repository.ts';

export async function decodeReferenceImage(bytes:Uint8Array) {
  const {default:sharp}=await import('sharp');
  try {
    const decoder=sharp(bytes,{limitInputPixels:40_000_000,failOn:'error'});
    const info=await decoder.metadata();
    if (!['png','jpeg','webp'].includes(info.format??'') || (info.pages??1)!==1) throw Error('format');
    await decoder.raw().toBuffer();
    return {mime:`image/${info.format}` as 'image/png'|'image/jpeg'|'image/webp'};
  } catch { throw new PetPackageDecodeError('INVALID_IMAGE','PNG/JPEG/WebPの静止画像を選択してください。'); }
}
export async function inspectPetZip(zip:Uint8Array):Promise<InspectedPackage> {
  const archive=decodePetZip(zip);
  const {default:sharp}=await import('sharp');
  let rgba:Buffer;
  try {
    const decoder=sharp(archive.atlasBytes,{limitInputPixels:ATLAS.width*ATLAS.height,failOn:'error'});
    const metadata=await decoder.metadata();
    if (`image/${metadata.format}`!==archive.contentType || (metadata.pages??1)!==1) throw new PetPackageDecodeError('CONTENT_TYPE_MISMATCH','指定形式の静止atlasが必要です。');
    if (metadata.width!==ATLAS.width || metadata.height!==ATLAS.height) throw new PetPackageDecodeError('ATLAS_DIMENSIONS_INVALID','atlasは1536×2288 pixelsです。');
    rgba=await decoder.ensureAlpha().raw().toBuffer();
  } catch(error) {
    if (error instanceof PetPackageDecodeError) throw error;
    throw new PetPackageDecodeError('IMAGE_DECODE_FAILED','atlas画像を展開できません。');
  }
  if(rgba.length!==ATLAS.width*ATLAS.height*4)throw new PetPackageDecodeError('PIXEL_DATA_INVALID','8-bit RGBA atlasが必要です。');
  for(let row=0;row<11;row++)for(let col=0;col<8;col++){
    let populated=false;
    cell: for(let y=row*208;y<(row+1)*208;y++)for(let x=col*192;x<(col+1)*192;x++)if(rgba[(y*1536+x)*4+3]!==0){populated=true;break cell;}
    if(col<USED_FRAMES[row]! && !populated)throw new PetPackageDecodeError('USED_CELL_EMPTY',`必要コマ ${row}/${col} が空です。`);
    if(col>=USED_FRAMES[row]! && populated)throw new PetPackageDecodeError('UNUSED_CELL_NOT_TRANSPARENT',`未使用コマ ${row}/${col} を透明にしてください。`);
  }
  return {name:archive.manifest.displayName,manifest:archive.manifest,requiredActions:[...REQUIRED_ACTIONS],zip,atlas:archive.atlasBytes,mime:archive.contentType};
}
