// Test-only: Python's ZIP/PNG standard library implementation makes independent byte fixtures.
import { execFileSync } from 'node:child_process';
export const manifest = {id:'test-cat',displayName:'検証用相棒',description:'自動テスト専用のv2 atlas',spriteVersionNumber:2,spritesheetPath:'spritesheet.png'};
export function zipFixture(files:Record<string,Uint8Array>):Buffer {
  const code='import sys,json,base64,io,zipfile\nb=io.BytesIO()\nwith zipfile.ZipFile(b,"w",zipfile.ZIP_DEFLATED) as z:\n for k,v in json.load(sys.stdin).items(): z.writestr(k,base64.b64decode(v))\nsys.stdout.buffer.write(b.getvalue())';
  return execFileSync('python3',['-c',code],{input:JSON.stringify(Object.fromEntries(Object.entries(files).map(([k,v])=>[k,Buffer.from(v).toString('base64')]))),maxBuffer:60_000_000});
}
export function atlasFixture(unusedPixel=false):Buffer {
  const code='import sys,struct,zlib,binascii\nw,h=1536,2288\nb=bytearray(w*h*4)\nfor row,count in enumerate([6,8,8,4,5,8,6,6,6,8,8]):\n for col in range(count):\n  for y in range(row*208+100,row*208+108):\n   for x in range(col*192+92,col*192+100): b[(y*w+x)*4:(y*w+x)*4+4]=bytes([20,180,140,255])\nif sys.argv[1]=="1": b[(7*192)*4+3]=255\ndef chunk(t,d): return struct.pack(">I",len(d))+t+d+struct.pack(">I",binascii.crc32(t+d)&0xffffffff)\nraw=b"".join(b"\\x00"+b[y*w*4:(y+1)*w*4] for y in range(h))\npng=b"\\x89PNG\\r\\n\\x1a\\n"+chunk(b"IHDR",struct.pack(">IIBBBBB",w,h,8,6,0,0,0))+chunk(b"IDAT",zlib.compress(raw))+chunk(b"IEND",b"")\nsys.stdout.buffer.write(png)';
  return execFileSync('python3',['-c',code,unusedPixel?'1':'0'],{maxBuffer:20_000_000});
}
