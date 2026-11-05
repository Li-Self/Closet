import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const outDir = fileURLToPath(new URL('../icons/', import.meta.url));
mkdirSync(outDir, { recursive: true });

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(size, pixels) {
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * (stride + 1)] = 0;
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function drawIcon(size, paddingRatio = 0) {
  const pixels = Buffer.alloc(size * size * 4);
  const paper = [253, 242, 244];
  const rust = [226, 109, 135];
  const cream = [255, 253, 249];
  const set = (x, y, color) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    pixels[i] = color[0];
    pixels[i + 1] = color[1];
    pixels[i + 2] = color[2];
    pixels[i + 3] = 255;
  };
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) set(x, y, paper);

  const cx = size / 2;
  const cy = size / 2;
  const radius = size * (0.36 - paddingRatio);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2) set(x, y, rust);
    }
  }

  const scale = size / 512;
  const line = (x1, y1, x2, y2, width) => {
    x1 *= scale; y1 *= scale; x2 *= scale; y2 *= scale; width *= scale;
    const minX = Math.max(0, Math.min(x1, x2) - width);
    const maxX = Math.min(size, Math.max(x1, x2) + width);
    const minY = Math.max(0, Math.min(y1, y2) - width);
    const maxY = Math.min(size, Math.max(y1, y2) + width);
    const vx = x2 - x1;
    const vy = y2 - y1;
    const len2 = vx * vx + vy * vy || 1;
    for (let y = Math.floor(minY); y < maxY; y += 1) {
      for (let x = Math.floor(minX); x < maxX; x += 1) {
        const t = Math.max(0, Math.min(1, ((x - x1) * vx + (y - y1) * vy) / len2));
        const px = x1 + t * vx;
        const py = y1 + t * vy;
        if ((x - px) ** 2 + (y - py) ** 2 <= (width / 2) ** 2) set(x, y, cream);
      }
    }
  };
  const hookRadius = 30 * scale;
  const hookX = 256 * scale;
  const hookY = 190 * scale;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const distance = Math.hypot(x - hookX, y - hookY);
      if (Math.abs(distance - hookRadius) < 5 * scale && y <= hookY + 6 * scale) set(x, y, cream);
    }
  }
  line(256, 220, 256, 270, 10);
  line(150, 330, 256, 270, 10);
  line(362, 330, 256, 270, 10);
  line(150, 330, 362, 330, 10);
  return pixels;
}

for (const size of [192, 512]) {
  writeFileSync(join(outDir, `icon-${size}.png`), encodePng(size, drawIcon(size)));
}
writeFileSync(join(outDir, 'icon-maskable-512.png'), encodePng(512, drawIcon(512, 0.1)));
console.log('icons generated');
