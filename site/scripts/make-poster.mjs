/**
 * Generates public/hero-poster.png — the LCP element for the home hero.
 *
 * WIREFRAME ASSET. This is a flat greyscale field with a soft vignette: enough
 * to hold the layout and prove the poster-first boot chain, and deliberately not
 * a design. Replace with a real hero still (or a video poster frame) once the
 * brand direction lands; nothing in the code needs to change but the file.
 *
 * Hand-rolled PNG encoder (node:zlib only) so the repo needs no image tooling.
 * Run: node scripts/make-poster.mjs
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const W = 1600;
const H = 900;

// --- CRC32 -------------------------------------------------------------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

// --- deterministic value noise, so the field does not band -------------
function hash2(x, y) {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
const smooth = (t) => t * t * (3 - 2 * t);
function valueNoise(x, y) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = smooth(x - xi);
  const yf = smooth(y - yi);
  const a = hash2(xi, yi);
  const b = hash2(xi + 1, yi);
  const c = hash2(xi, yi + 1);
  const d = hash2(xi + 1, yi + 1);
  return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
}
function fbm(x, y) {
  let v = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < 5; i++) {
    v += amp * valueNoise(x * freq, y * freq);
    freq *= 2;
    amp *= 0.5;
  }
  return v;
}

const raw = Buffer.alloc((W * 3 + 1) * H);
let p = 0;
for (let y = 0; y < H; y++) {
  raw[p++] = 0; // filter type 0 (None)
  for (let x = 0; x < W; x++) {
    const u = x / W;
    const v = y / H;

    // Light greyscale field, brighter top-left, settling darker at the bottom
    // so oversized hero type stays legible over it.
    let l = 236 - 26 * Math.pow(u * 0.35 + v * 0.65, 1.4);

    // soft vignette
    const dx = (u - 0.5) * 1.15;
    const dy = v - 0.45;
    l -= Math.pow(dx * dx + dy * dy, 0.85) * 44;

    // fbm haze
    l += (fbm(u * 5, v * 5) - 0.5) * 14;

    const g = Math.max(0, Math.min(255, l | 0));
    raw[p++] = g;
    raw[p++] = g;
    raw[p++] = g;
  }
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 2; // colour type: truecolour
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

const out = resolve(__dirname, '..', 'public', 'hero-poster.png');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, png);
console.log(`[SMASH] wrote ${out} (${W}x${H}, ${(png.length / 1024).toFixed(1)} KB)`);
