"""Create an original procedural ZIP fixture; never use as production companion art.

Only validates package transport, cell addressing and import persistence. The simple
shapes do not prove authored animation quality or a real generation provider.
"""
from pathlib import Path
import json
import math
import struct
import zlib
import zipfile

WIDTH, HEIGHT, CW, CH = 1536, 2288, 192, 208
USED = [6, 8, 8, 4, 5, 8, 6, 6, 6, 8, 8]
pixels = bytearray(WIDTH * HEIGHT * 4)

def disc(cx, cy, radius, color):
    for y in range(max(0, int(cy-radius)), min(HEIGHT, int(cy+radius+1))):
        for x in range(max(0, int(cx-radius)), min(WIDTH, int(cx+radius+1))):
            if (x-cx)**2 + (y-cy)**2 <= radius**2:
                start = (y*WIDTH+x)*4
                pixels[start:start+4] = bytes(color)

for row, count in enumerate(USED):
    for column in range(count):
        cx, cy = column*CW+96, row*CH+85 + (column % 2)*3
        disc(cx, cy+60, 37, (208, 236, 235, 255))
        disc(cx, cy, 52, (44, 166, 167, 255))
        disc(cx, cy, 42, (238, 251, 248, 255))
        gaze = ((row-9)*8+column)*math.pi/8 if row >= 9 else 0
        dx, dy = (6*math.sin(gaze), -6*math.cos(gaze)) if row >= 9 else (0, 0)
        disc(cx-17+dx, cy+dy, 7, (7, 59, 70, 255))
        disc(cx+17+dx, cy+dy, 7, (7, 59, 70, 255))
        disc(cx, cy+19, 5, (44, 166, 167, 255))
        disc(cx-41, cy+66, 12, (44, 166, 167, 255))
        disc(cx+45, cy+(35-column*5 if row == 3 else 66), 12, (44, 166, 167, 255))
        disc(cx-20, cy+94, 13, (44, 166, 167, 255))
        disc(cx+20, cy+94, 13, (44, 166, 167, 255))

def chunk(kind, data):
    return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind+data))

raw = b''.join(b'\0' + pixels[y*WIDTH*4:(y+1)*WIDTH*4] for y in range(HEIGHT))
png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', WIDTH, HEIGHT, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b'')
directory = Path(__file__).parent / 'fixtures'
directory.mkdir(exist_ok=True)
manifest = dict(id='companion-ui-test', displayName='動作確認用テスト相棒', description='オリジナルの図形によるテスト専用データ。生成品質や実生成接続の証拠ではありません。', spriteVersionNumber=2, spritesheetPath='spritesheet.png')
with zipfile.ZipFile(directory / 'companion-ui-test.zip', 'w', zipfile.ZIP_DEFLATED) as archive:
    archive.writestr('pet.json', json.dumps(manifest, ensure_ascii=False))
    archive.writestr('spritesheet.png', png)
(directory / 'spritesheet.png').write_bytes(png)
print(directory / 'companion-ui-test.zip')
