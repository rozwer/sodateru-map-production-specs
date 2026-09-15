import { crc32, inflateSync } from 'node:zlib';
/** Reject truncated/corrupt upstream images before saving a successful map result. */
export function validatePng(bytes: Buffer): void {
  if(bytes.length>2_000_000 || bytes.length<45 || !bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw new Error('Invalid PNG tile');
  const data:Buffer[]=[];let ended=false,channels=0,depth=0;
  for(let offset=8;offset<bytes.length;){
    if(offset+12>bytes.length)throw new Error('Truncated PNG chunk');
    const size=bytes.readUInt32BE(offset),end=offset+12+size;
    if(end>bytes.length)throw new Error('Truncated PNG data');
    const kind=bytes.toString('ascii',offset+4,offset+8);
    if(crc32(bytes.subarray(offset+4,end-4))!==bytes.readUInt32BE(end-4))throw new Error('Corrupt PNG checksum');
    if(offset===8){
      if(kind!=='IHDR'||size!==13||bytes.readUInt32BE(offset+8)!==256||bytes.readUInt32BE(offset+12)!==256)throw new Error('Invalid PNG dimensions');
      depth=bytes[offset+16];const color=bytes[offset+17];
      channels=({0:1,2:3,3:1,4:2,6:4} as Record<number,number>)[color];
      if(!channels||![1,2,4,8,16].includes(depth)||bytes[offset+18]!==0||bytes[offset+19]!==0||bytes[offset+20]!==0)throw new Error('Unsupported PNG encoding');
    }
    if(kind==='IDAT')data.push(bytes.subarray(offset+8,end-4));
    if(kind==='IEND'){ended=true;if(size!==0||end!==bytes.length)throw new Error('Invalid PNG ending');}
    offset=end;
  }
  if(!ended||!data.length)throw new Error('Incomplete PNG');
  const rowBytes=Math.ceil(256*channels*depth/8)+1;
  const decoded=inflateSync(Buffer.concat(data),{maxOutputLength:2_100_000});
  if(decoded.length!==rowBytes*256)throw new Error('Invalid PNG pixels');
  for(let y=0;y<256;y++)if(decoded[y*rowBytes]>4)throw new Error('Invalid PNG row filter');
}
