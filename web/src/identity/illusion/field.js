// The mark as a field: its signed distance, in mark units, everywhere around
// it. Every illusion (../illusion.js) reads the mark through this one field:
// negative inside the letters, positive outside, zero on the edge. With it a
// shader can fill the mark, stripe inside and out of it, swell over it or send
// rings out of it, without a single path in the shader.
//
// The mark is filled on a canvas at K pixels a unit, with PAD units of room
// round it, and the distance is found both ways (to the nearest filled pixel
// and to the nearest empty one) by Felzenszwalb and Huttenlocher's exact
// distance transform.

import { letters, REST, W as OW, H as OH } from '../directions/original/geometry.js';
import { markSVG, geometry as modularGeometry, MODULAR_DEFAULTS } from '../modular.js';

const K = 2; // pixels a unit
const PAD = 120; // units of room round the mark

const INF = 1e20;

/** The squared distance transform of f along one line of n samples (in place into d). */
function line(f, n, d, v, z) {
  let k = 0;
  v[0] = 0;
  z[0] = -INF;
  z[1] = INF;
  for (let q = 1; q < n; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) { k--; s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = INF;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    const r = q - v[k];
    d[q] = r * r + f[v[k]];
  }
}

/** Squared distances to the nearest pixel where `on` is true, for a w × h grid. */
function transform(on, w, h) {
  const g = new Float64Array(w * h);
  for (let i = 0; i < g.length; i++) g[i] = on[i] ? 0 : INF;
  const n = Math.max(w, h);
  const f = new Float64Array(n), d = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = g[y * w + x];
    line(f, h, d, v, z);
    for (let y = 0; y < h; y++) g[y * w + x] = d[y];
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) f[x] = g[y * w + x];
    line(f, w, d, v, z);
    for (let x = 0; x < w; x++) g[y * w + x] = d[x];
  }
  return g;
}

/**
 * The field for a mark drawn by `paint(ctx)` in its own units (w × h):
 * { w, h, sdf: Float32Array (tw × th, units), tw, th, box: [x0, y0, bw, bh]
 * in units (where the texture sits), letters: [[x0, x1], …] in units }.
 */
function build(w, h, paint) {
  const tw = Math.ceil((w + 2 * PAD) * K);
  const th = Math.ceil((h + 2 * PAD) * K);
  const canvas = document.createElement('canvas');
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.setTransform(K, 0, 0, K, PAD * K, PAD * K);
  ctx.fillStyle = '#000';
  paint(ctx);
  const alpha = ctx.getImageData(0, 0, tw, th).data;
  const inside = new Uint8Array(tw * th);
  for (let i = 0; i < inside.length; i++) inside[i] = alpha[i * 4 + 3] >= 128 ? 1 : 0;
  const outside = inside.map((b) => 1 - b);
  const toIn = transform(inside, tw, th); // for pixels outside: how far to the mark
  const toOut = transform(outside, tw, th); // for pixels inside: how far to the ground
  const sdf = new Float32Array(tw * th);
  for (let i = 0; i < sdf.length; i++) {
    sdf[i] = (inside[i] ? -(Math.sqrt(toOut[i]) - 0.5) : Math.sqrt(toIn[i]) - 0.5) / K;
  }
  // The letters, as runs of columns with something in them (the slots between
  // letters run the whole height, so they are the only empty columns).
  const cols = [];
  for (let x = Math.floor(PAD * K); x < Math.ceil((PAD + w) * K); x++) {
    let any = 0;
    for (let y = Math.floor(PAD * K); y < Math.ceil((PAD + h) * K) && !any; y++) any = inside[y * tw + x];
    cols.push(any);
  }
  const runs = [];
  cols.forEach((on, i) => {
    const x = i / K;
    if (on && (!runs.length || runs.at(-1)[1] !== null)) runs.push([x, null]);
    if (!on && runs.length && runs.at(-1)[1] === null) runs.at(-1)[1] = x;
  });
  if (runs.length && runs.at(-1)[1] === null) runs.at(-1)[1] = w;
  return { w, h, sdf, tw, th, box: [-PAD, -PAD, tw / K, th / K], letters: runs };
}

// The two marks: the original (550 × 471, as the logo) and the modular one.
// `stripes` is where the mark's slots fall: the first slot's centre, the
// pitch and the slot's width, so a field of stripes can run on out of them.

export function originalField() {
  const path = new Path2D(letters(REST));
  const f = build(OW, OH, (ctx) => ctx.fill(path, 'evenodd'));
  return { ...f, name: 'original', stripes: [42, 51.78, 20] };
}

export async function modularField() {
  const g = modularGeometry(MODULAR_DEFAULTS, 4);
  const img = new Image();
  img.src = `data:image/svg+xml,${encodeURIComponent(markSVG(MODULAR_DEFAULTS, 4, '#000', 'ill'))}`;
  await img.decode();
  const p = MODULAR_DEFAULTS;
  const f = build(g.w, g.h, (ctx) => ctx.drawImage(img, 0, 0, g.w, g.h));
  return { ...f, name: 'modular', stripes: [p.bar + p.slot / 2, p.bar + p.slot, p.slot] };
}
