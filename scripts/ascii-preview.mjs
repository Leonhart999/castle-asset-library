// Prints a downsampled ASCII luminance map of a PNG (8-bit RGB or RGBA, non-interlaced).
// Useful for a rough look at a preview when images cannot be displayed (terminal, CI).
// Dark pixels are drawn dense (@), light pixels sparse.
//
// Usage: node scripts/ascii-preview.mjs <file.png> [cols] [rows]

import fs from 'node:fs';
import zlib from 'node:zlib';

const [file, colsArg = '110', rowsArg = '44'] = process.argv.slice(2);
if (!file) {
  console.error('usage: node scripts/ascii-preview.mjs <file.png> [cols] [rows]');
  process.exit(1);
}

const buf = fs.readFileSync(file);
let pos = 8; // skip the PNG signature
let width = 0;
let height = 0;
let colorType = 0;
const idat = [];
while (pos < buf.length) {
  const len = buf.readUInt32BE(pos);
  const type = buf.toString('ascii', pos + 4, pos + 8);
  const data = buf.subarray(pos + 8, pos + 8 + len);
  if (type === 'IHDR') {
    width = data.readUInt32BE(0);
    height = data.readUInt32BE(4);
    if (data[8] !== 8 || data[12] !== 0) throw new Error('only 8-bit, non-interlaced PNG is supported');
    colorType = data[9];
  } else if (type === 'IDAT') {
    idat.push(data);
  } else if (type === 'IEND') {
    break;
  }
  pos += 12 + len;
}
const bpp = colorType === 2 ? 3 : colorType === 6 ? 4 : 0;
if (!bpp) throw new Error('only RGB / RGBA PNG is supported (colour type ' + colorType + ')');

const raw = zlib.inflateSync(Buffer.concat(idat));
const stride = width * bpp;
const px = Buffer.alloc(stride * height);
for (let y = 0; y < height; y++) {
  const filter = raw[y * (stride + 1)];
  const src = y * (stride + 1) + 1;
  for (let i = 0; i < stride; i++) {
    const x = raw[src + i];
    const a = i >= bpp ? px[y * stride + i - bpp] : 0;
    const b = y > 0 ? px[(y - 1) * stride + i] : 0;
    const c = i >= bpp && y > 0 ? px[(y - 1) * stride + i - bpp] : 0;
    let v;
    if (filter === 0) v = x;
    else if (filter === 1) v = x + a;
    else if (filter === 2) v = x + b;
    else if (filter === 3) v = x + ((a + b) >> 1);
    else {
      const p = a + b - c;
      const pa = Math.abs(p - a);
      const pb = Math.abs(p - b);
      const pc = Math.abs(p - c);
      v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
    }
    px[y * stride + i] = v & 255;
  }
}

// Optional 4th argument: "x,y;x,y" prints the exact RGB value at those pixels.
for (const p of (process.argv[5] || '').split(';').filter(Boolean)) {
  const [x, y] = p.split(',').map(Number);
  const o = y * stride + x * bpp;
  console.log('px(' + x + ',' + y + ') = rgb(' + px[o] + ',' + px[o + 1] + ',' + px[o + 2] + ')');
}

const cols = Number(colsArg);
const rows = Number(rowsArg);
const ramp = '@%#*+=-:. ';
const lines = [];
for (let r = 0; r < rows; r++) {
  let line = '';
  const y0 = Math.floor((r * height) / rows);
  const y1 = Math.max(y0 + 1, Math.floor(((r + 1) * height) / rows));
  for (let c = 0; c < cols; c++) {
    const x0 = Math.floor((c * width) / cols);
    const x1 = Math.max(x0 + 1, Math.floor(((c + 1) * width) / cols));
    let sum = 0;
    let n = 0;
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const o = y * stride + x * bpp;
        // 6th argument "diff": measure colour distance from the top-left background pixel instead of luminance,
        // so a piece whose brightness is close to the background still shows up in the map.
        sum += process.argv[6] === 'diff'
          ? 255 - Math.min(255, 3 * Math.hypot(px[o] - px[5 * stride + 5 * bpp], px[o + 1] - px[5 * stride + 5 * bpp + 1], px[o + 2] - px[5 * stride + 5 * bpp + 2]))
          : 0.2126 * px[o] + 0.7152 * px[o + 1] + 0.0722 * px[o + 2];
        n++;
      }
    }
    const lum = sum / n;
    line += ramp[Math.min(ramp.length - 1, Math.floor((lum / 256) * ramp.length))];
  }
  lines.push(line);
}
console.log(file + ' (' + width + 'x' + height + ')');
console.log(lines.join('\n'));
