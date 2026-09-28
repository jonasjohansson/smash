// 02 Reassembled: a new wordmark, broken as one pane of glass and put back.
// The letters are drawn as convex tiles (reassembled/geometry.js). A few straight
// cracks, each running exactly through one of two points of impact, cut the whole
// word; the shards are put back with a hairline gap, and two of them have slipped a
// fraction along their crack. In the dark the gaps carry the light.

import {
  svg, timeline, canvasStage, loadImage, drawCover, withCleanup, pointer, rng, ease, span, clamp, lerp, smoothstep, polyPath,
} from '../lib.js';
import * as G from './reassembled/geometry.js';

const FONTS = new URL('./reassembled/fonts.css', import.meta.url).href;
const INK = '#0e0c0b';
const PAPER = '#ecebe6';
const ACCENT = '#ffae6b'; // amber: the warm end of the light in the gaps
const WARM = '#ffd29a'; // the light, where it has to be one colour (the favicon)
const DISPLAY = '"R Gravity Extended", "Helvetica Neue", Arial, sans-serif';
const TEXT = '"R Theinhardt", "Helvetica Neue", Arial, sans-serif';

export const info = {
  n: 2,
  slug: 'reassembled',
  name: 'Reassembled',
  lane: 'New wordmark',
  idea: 'Letters cut into shards and put back; light comes through the gaps.',
  story: 'A new wordmark, drawn for SMASH: heavy, wide, square letters. Then it is broken like one pane of glass, struck once from above and once from below, and every shard is put back with a hairline gap. It reads at a glance; the break is the second look. In a dark room light comes through the cracks, warm where the word was hit. The break never changes. What shows through it can: a project’s light, its colour, its footage.',
  dynamism: 'Standing still, the letters are calm and the cracks do the moving. Two shards have slipped a fraction along their crack, so the word looks only just put back. In motion it is struck, flies apart and locks back together from the point of impact outward, each gap flashing as it closes. Then it breathes: every crack opens evenly, the light floods through, and it locks again.',
  keeps: 'The heavy, wide stance the last rounds were after, drawn from scratch rather than set in a font. Glass as a way of seeing, not a picture of glass: nothing is drawn on; the letters themselves are broken. In a dark room the wordmark becomes a source of light, which is what SMASH makes. The first S, lifted out with its break, is the symbol: the same object as in the word.',
  risk: 'CM also uses diagonals, a broken S and pictures inside letters. Here the letters are square and whole in outline, only the cracks are diagonal, the S is cut by a crack rather than built from wedges, and a picture fills at most one broken shard, never a letter. Beside partner logos (Nobel, IKEA, SVT) a broken mark can read as damage, so there the still is used as it is, gaps at a hairline, and the break opens only in SMASH’s own spaces. Square, wide capitals also sit near sport and tech display faces; the warm light and the quiet type around them have to keep it on the side of culture.',
  palette: { ink: INK, paper: PAPER, accent: ACCENT },
  interactive: 'Move the pointer over the word: the shards near it drift apart and let the light through. Tap to strike it.',
  keyframe: 0.4,
  application: { title: 'Exhibition poster', aspect: '4/5' },
  type: {
    fonts: [FONTS],
    display: {
      family: DISPLAY,
      css: 'font-weight: 400; letter-spacing: -0.005em; line-height: 1.04; text-transform: uppercase;',
      name: 'ABC Gravity Extended',
      note: 'Dinamo’s heavy extended grotesk, kept for a few short lines in capitals, where it matches the wordmark’s weight and width without copying it. Trial version; it would need a licence.',
    },
    text: {
      family: TEXT,
      css: 'font-weight: 400;',
      name: 'Theinhardt',
      note: 'Optimo’s plain, precise grotesk with a little warmth. It carries everything else, so the broken word is the only loud voice.',
    },
  },
};

// ------------------------------------------------------------------ the drawing

/** The letters (reassembled/geometry.js): stems 31, bars 21, every diagonal one across for two up. */
const P = G.DEFAULT;
const GAP = 3.5; // 3.5% of the cap height
const deg = Math.PI / 180;
/** The cracks' angles: the letters' own slope and its square, 26.6° and 63.4° either way. */
const A1 = Math.atan(0.5) / deg;
const ANG = [A1, 90 - A1, 90 + A1, 180 - A1];

/** The canonical break: two points of impact in the white space, each crack exactly through one. */
const HITS = [[110, -10], [530, 98]];
const CRACKS = [[0, 3], [0, 0], [1, 1], [1, 2]]; // [hit, angle]
/** Put back not quite perfectly: the shard under `at` has slipped `by` units along crack `crack`. */
const SLIPS = [
  { at: [88, 12], crack: 0, by: -1.2 }, // the first S's top terminal, up and out along its crack
  { at: [519, 55], crack: 2, by: -1.3 }, // the strip inside the second S's lower bowl, up along its crack
];
/** The symbol: this letter lifted out of the word with its break, one shard slipped further. */
const SYM = { letter: 0, slips: [{ at: [88, 12], crack: 0, by: -5 }] };

const CR = CRACKS.map(([h, a], i) => {
  const r = ANG[a] * deg;
  return { i, h, p: HITS[h], a: ANG[a], d: [Math.cos(r), Math.sin(r)], n: [-Math.sin(r), Math.cos(r)] };
});
const LINES = CR.map((c) => G.line(c.p, c.a * deg));

const shift = (loops, [dx, dy]) => loops.map((l) => l.map(([x, y]) => [x + dx, y + dy]));
const nearestHit = (x, y) => HITS.reduce((a, b) => (Math.hypot(x - a[0], y - a[1]) <= Math.hypot(x - b[0], y - b[1]) ? a : b));

function applySlips(shards, slips) {
  for (const s of shards) s.slip = [0, 0];
  for (const sl of slips) {
    const s = shards.find((q) => G.inside(sl.at, q.outer));
    if (!s) continue;
    const d = CR[sl.crack].d;
    s.slip = [d[0] * sl.by, d[1] * sl.by];
  }
  for (const s of shards) s.put = shift([s.outer, ...s.holes], s.slip);
  return shards;
}

let BUILT = null;
function build() {
  if (BUILT) return BUILT;
  const word = G.setWord(P);
  const shards = applySlips(G.shatter(word.letters, LINES, GAP), SLIPS);
  let dmax = 1;
  shards.forEach((s, i) => {
    s.i = i;
    s.hit = nearestHit(...s.c);
    s.dist = Math.hypot(s.c[0] - s.hit[0], s.c[1] - s.hit[1]);
    dmax = Math.max(dmax, s.dist);
  });
  shards.forEach((s) => { s.dn = s.dist / dmax; });
  const silhouettes = G.outlines(word.letters).flat().flatMap((c) => [c.outer, ...c.holes]);
  // The symbol: the letter's own shards, moved to x = 0.
  const L = word.letters[SYM.letter];
  const symShards = applySlips(shards.filter((s) => s.letter === SYM.letter).map((s) => ({
    ...s, outer: shift([s.outer], [-L.x, 0])[0], holes: shift(s.holes, [-L.x, 0]),
  })), SYM.slips.map((sl) => ({ ...sl, at: [sl.at[0] - L.x, sl.at[1]] })));
  BUILT = { word, shards, silhouettes, symShards, symX: L.x, dmax };
  return BUILT;
}

const d = (loops, digits = 2) => loops.map((l) => polyPath(l, digits)).join('');

function bounds(loopsList) {
  let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
  for (const loops of loopsList) for (const l of loops) for (const [x, y] of l) {
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
}

const tr = (loops, dx, dy, k) => loops.map((l) => l.map(([x, y]) => [dx + x * k, dy + y * k]));

/** The wordmark's paths, grouped by letter (S1, M2, A3, S4, H5), for Illustrator. */
function wordmarkPaths(dx = 0, dy = 0, k = 1) {
  const { shards, word } = build();
  return word.letters.map((L, li) => {
    const own = shards.filter((s) => s.letter === li);
    return `<g id="${L.ch}${li + 1}">${own.map((s) => `<path fill="currentColor" fill-rule="evenodd" d="${d(tr(s.put, dx, dy, k))}"/>`).join('')}</g>`;
  }).join('');
}

function symbolPaths(dx = 0, dy = 0, k = 1) {
  const { symShards } = build();
  return symShards.map((s) => `<path fill="currentColor" fill-rule="evenodd" d="${d(tr(s.put, dx, dy, k))}"/>`).join('');
}

export function wordmark() {
  const { shards } = build();
  const b = bounds(shards.map((s) => s.put));
  const pad = 2;
  return svg(+(b.w + 2 * pad).toFixed(2), +(b.h + 2 * pad).toFixed(2), wordmarkPaths(pad - b.x0, pad - b.y0));
}

export function symbol() {
  const { symShards } = build();
  const b = bounds(symShards.map((s) => s.put));
  const side = Math.max(b.w, b.h) + 12;
  return svg(+side.toFixed(2), +side.toFixed(2), symbolPaths((side - b.w) / 2 - b.x0, (side - b.h) / 2 - b.y0));
}

/** The symbol above the word, centred, at twice the cap height. */
export function lockup() {
  const { shards, symShards } = build();
  const wb = bounds(shards.map((s) => s.put));
  const sb = bounds(symShards.map((s) => s.put));
  const k = 2;
  const gapY = 50;
  const W = wb.w;
  const sx = (W - sb.w * k) / 2 - sb.x0 * k;
  const sy = -sb.y0 * k;
  const wy = sb.h * k + gapY - wb.y0;
  const H = sb.h * k + gapY + wb.h;
  const pad = 2;
  return svg(+(W + 2 * pad).toFixed(2), +(H + 2 * pad).toFixed(2),
    `<g id="symbol">${symbolPaths(pad + sx, pad + sy, k)}</g><g id="wordmark">${wordmarkPaths(pad - wb.x0, pad + wy)}</g>`);
}

/**
 * The favicon: the symbol's S drawn again on the pixel grid for each size (bars on whole
 * pixels), with the same cracks, opened up so they survive, and the warm light behind them.
 * At 16 px only the crack that carries the S's shape is kept.
 */
export function favicon({ size = 32 } = {}) {
  const spec = {
    16: { box: [1, 2, 14, 12], gap: 1.3, keep: 1, slip: [0, 0] },
    32: { box: [3, 4, 24, 24], gap: 2, keep: 1, slip: [2, -1] },
    64: { box: [7, 9, 48, 46], gap: 3, keep: 1, slip: [2, -1] },
  }[size] ?? { box: [size * 0.1, size * 0.13, size * 0.76, size * 0.74], gap: size * 0.05, keep: 1, slip: [0, 0] };
  const [bx, by, bw, bh] = spec.box;
  const u = 100 / bh; // units per pixel: the S is bh pixels tall
  const snap = (v) => Math.max(1, Math.round(v / u)) * u;
  const p = { ...P, wS: bw * u, stem: snap(P.stem), bar: snap(P.bar) };
  p.spine = Math.round((P.spine - p.bar / 2) / u) * u + p.bar / 2; // the spine's edges on whole pixels
  p.cut = [snap(P.cut[0]), 2 * snap(P.cut[0])];
  const S = G.glyphS(p);
  // The symbol's cracks, carried into this S's box (x scaled with the width).
  const sx = p.wS / P.wS;
  const { symX } = build();
  const own = symCracks().slice(0, spec.keep).map((c) => {
    const a = [(c.p[0] - symX) * sx, c.p[1]];
    const b = [(c.p[0] + c.d[0] * 100 - symX) * sx, c.p[1] + c.d[1] * 100];
    return G.line(a, Math.atan2(b[1] - a[1], b[0] - a[0]));
  });
  const shards = G.shatter([{ ch: 'S', x: 0, w: S.w, tiles: S.tiles }], own, spec.gap * u);
  // The top terminal slips out along its crack, as in the symbol, by whole pixels on the crack's 2:1.
  const tip = [(SYM.slips[0].at[0]) * sx, SYM.slips[0].at[1]];
  const t = (loops) => loops.map((l) => l.map(([x, y]) => [bx + x / u, by + y / u]));
  const paths = shards.map((s) => {
    const loops = t([s.outer, ...s.holes]);
    const moved = G.inside(tip, s.outer) ? loops.map((l) => l.map(([x, y]) => [x + spec.slip[0], y + spec.slip[1]])) : loops;
    return `<path fill="${PAPER}" fill-rule="evenodd" d="${d(moved, 3)}"/>`;
  }).join('');
  // The light only in the cracks: the S's tiles cut down to a band along each crack.
  const lit = own.flatMap((ln) => S.tiles.map((tile) => G.band(tile, ln, spec.gap * u * 0.6))).filter((q) => q.length > 2);
  const under = `<path fill="${WARM}" d="${d(t(lit), 3)}"/>`;
  return svg(size, size, `<rect width="${size}" height="${size}" fill="${INK}"/>${under}${paths}`);
}

/** The cracks that cut the symbol's letter, the most important first (by how much they cut). */
function symCracks() {
  const { word } = build();
  const L = word.letters[SYM.letter];
  const box = [L.x, 0, L.x + L.w, 100];
  const len = (c) => {
    // length of the crack inside the letter's box
    let t0 = -Infinity; let t1 = Infinity;
    for (const [k, lo, hi] of [[0, box[0], box[2]], [1, box[1], box[3]]]) {
      if (Math.abs(c.d[k]) < 1e-9) { if (c.p[k] < lo || c.p[k] > hi) return 0; continue; }
      const a = (lo - c.p[k]) / c.d[k]; const b = (hi - c.p[k]) / c.d[k];
      t0 = Math.max(t0, Math.min(a, b)); t1 = Math.min(t1, Math.max(a, b));
    }
    return Math.max(0, t1 - t0);
  };
  return CR.filter((c) => len(c) > 0).sort((a, b) => len(b) - len(a));
}

// ------------------------------------------------------------------ light

/**
 * The light in the gaps disperses along each crack with distance from its point of impact:
 * warm white at the hit, then amber, rose, violet and a cool blue at the far end. It is also
 * brightest near the hit and fades out along the crack.
 */
const SPECTRUM = [
  [0, [255, 244, 228]], [45, [255, 220, 170]], [100, [255, 178, 112]], [160, [255, 122, 136]],
  [215, [190, 112, 255]], [275, [116, 142, 255]],
];
function spectral(dist) {
  const x = Math.max(0, dist);
  for (let i = 1; i < SPECTRUM.length; i++) {
    if (x <= SPECTRUM[i][0]) {
      const [d0, a] = SPECTRUM[i - 1];
      const [d1, b] = SPECTRUM[i];
      const k = (x - d0) / (d1 - d0);
      return a.map((v, j) => v + (b[j] - v) * k);
    }
  }
  return SPECTRUM[SPECTRUM.length - 1][1];
}
const energy = (dist) => 0.5 + 0.5 * Math.exp(-dist / 240);
const rgba = (c, a) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${+clamp(a).toFixed(3)})`;

/**
 * The light as a soft field under the shards: every crack is a band, brightest on the crack
 * and falling off to either side, wider than the widest opening, so an opened gap shows light
 * from edge to edge. alphaAt(dist, crack) gives the intensity along the crack.
 */
const BAND = [[16, 0.26], [7, 0.34], [2.2, 0.5]];
const OPEN = 8; // how far each crack opens at the top of the breath, in word units
function crackLight(ctx, alphaAt, { width = GAP, reach = 720, n = 48, band = BAND } = {}) {
  for (const c of CR) {
    const [hx, hy] = c.p;
    const [dx, dy] = c.d;
    const x0 = hx - dx * reach; const y0 = hy - dy * reach;
    const x1 = hx + dx * reach; const y1 = hy + dy * reach;
    const al = [];
    for (let i = 0; i <= n; i++) { const dist = Math.abs(i / n - 0.5) * 2 * reach; al.push([dist, alphaAt(dist, c)]); }
    if (al.every(([, a]) => a <= 0.002)) continue;
    for (const [wk, ak] of band) {
      const g = ctx.createLinearGradient(x0, y0, x1, y1);
      al.forEach(([dist, a], i) => g.addColorStop(i / n, rgba(spectral(dist), a * ak * energy(dist))));
      ctx.strokeStyle = g;
      ctx.lineWidth = width * wk;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
  }
}

// ------------------------------------------------------------------ motion

/**
 * The loop, 6 seconds, as a function of t. It starts and ends on the whole word, held.
 *   0.00–0.065 held, the light in the gaps pulsing slowly outward from the hits
 *   0.065–0.10 a breath in: the gaps close, the light dims
 *   0.10–0.20  struck: the shards fly out from the two points of impact, turning, nearer the eye
 *   0.20–0.355 they come back, faster and faster, and lock from the hit outward; each gap
 *              flashes as its shards arrive
 *   0.40–0.53  held
 *   0.53–0.68  the breath: a pull in, a second hit that opens every crack (fully open at 0.60),
 *              the light flooding through, then back together with a lock
 *   0.68–1.00  held
 */
const T = { inhale: 0.065, burst: 0.1, apex: 0.2, lock0: 0.315, spread: 0.04, pre: 0.53, hit: 0.555, open: 0.6, close0: 0.615, relock: 0.68 };

const lockOf = (dn) => T.lock0 + T.spread * dn;
function outOf(t, dn) {
  const b0 = T.burst + 0.012 * dn;
  const lk = lockOf(dn);
  if (t < b0 || t >= lk) return 0;
  if (t < T.apex) return ease.outCubic(span(t, b0, T.apex));
  const k = span(t, T.apex, lk);
  return 1 - k * k * (0.35 + 0.65 * k); // eases out of the hang, arrives still moving
}
function inhaleOf(t) {
  if (t < T.inhale || t > T.burst + 0.02) return 0;
  if (t < T.burst) return -0.2 * ease.inOutQuad(span(t, T.inhale, T.burst));
  return -0.2 * (1 - span(t, T.burst, T.burst + 0.02));
}
function breathOf(t) {
  if (t < T.pre || t >= T.relock) return 0;
  if (t < T.hit) return -0.22 * ease.inOutQuad(span(t, T.pre, T.hit));
  if (t < T.open) return lerp(-0.22, 1, ease.outExpo(span(t, T.hit, T.open)));
  if (t < T.close0) return 1 - 0.04 * span(t, T.open, T.close0);
  return 0.96 * (1 - ease.inCubic(span(t, T.close0, T.relock)));
}
/** A damped bounce after a lock: out, back, out, settled. */
function recoil(t, t0, len = 0.045) {
  const k = (t - t0) / len;
  return k > 0 && k < 1 ? Math.sin(k * Math.PI * 3) * (1 - k) ** 2 : 0;
}
/** The light at distance dist along a crack. */
function lightAt(t, dist, dn) {
  const pulse = 0.86 + 0.14 * Math.cos(2 * Math.PI * (dist / 240 - 2 * t));
  const tl = lockOf(dn);
  let hold;
  if (t < T.burst) hold = 1 - 0.55 * smoothstep(T.inhale, T.burst, t);
  else hold = smoothstep(tl - 0.014, tl, t);
  let L = 1.08 * hold * pulse;
  if (t >= T.burst && t < tl) L += 1.1 * Math.exp(-(t - T.burst) / 0.012); // the strike itself
  if (t >= tl) L += 0.45 * Math.exp(-(t - tl) / 0.03); // the lock
  L += 0.3 * Math.max(0, breathOf(t));
  if (t >= T.relock) L += 0.25 * Math.exp(-(t - T.relock) / 0.025);
  return Math.min(1.25, L);
}

/**
 * Seeded scatter for each shard: where it is thrown, how it turns, how near the eye it comes.
 * It flies away from its point of impact and out from the word's middle at once, so the word
 * bursts rather than tilts.
 */
function scatterOf(s, i, centre) {
  const r = rng(2029 + i * 131);
  const hx = s.c[0] - s.hit[0]; const hy = s.c[1] - s.hit[1];
  const cx = s.c[0] - centre[0]; const cy = (s.c[1] - centre[1]) * 2.2;
  const hl = Math.hypot(hx, hy) || 1; const cl = Math.hypot(cx, cy) || 1;
  const dir = Math.atan2(0.4 * hy / hl + 0.6 * cy / cl, 0.4 * hx / hl + 0.6 * cx / cl) + (r() - 0.5) * 0.9;
  const dist = 45 + r() * 80 + cl * 0.12;
  return {
    dx: Math.cos(dir) * dist,
    dy: Math.sin(dir) * dist * 1.25,
    rot: (r() < 0.5 ? -1 : 1) * (22 + r() * 48) * deg,
    tilt: (r() < 0.5 ? -1 : 1) * (0.35 + r() * 0.75),
    axis: r() * Math.PI,
    z: 0.15 + r() * 0.6,
    br: (r() - 0.5) * 2,
    face: r(), // how squarely it faces the light while it flies
    rad: Math.max(...s.outer.map(([x, y]) => Math.hypot(x - s.c[0], y - s.c[1]))),
  };
}
const mix = (a, b, k) => a.map((v, j) => Math.round(v + (b[j] - v) * k));
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

export function motion(el, { ground = 'ink' } = {}) {
  const { shards, silhouettes, word } = build();
  const stage = canvasStage(el);
  el.style.touchAction = 'pan-y';
  const scat = shards.map((s, i) => scatterOf(s, i, [word.width / 2, 50]));
  // The breath opens every crack square to itself: in each letter a crack cuts, the shards on
  // either side move half the opening along its normal, so the gap widens evenly about the
  // crack and the light (drawn along the crack) fills it from edge to edge.
  const sideOf = (s, c) => Math.sign((s.c[0] - c.p[0]) * c.n[0] + (s.c[1] - c.p[1]) * c.n[1]) || 1;
  const cuts = word.letters.map((_, li) => CR.filter((c) => {
    const own = shards.filter((s) => s.letter === li).map((s) => sideOf(s, c));
    return own.includes(1) && own.includes(-1);
  }));
  const open = shards.map((s) => {
    let x = 0; let y = 0;
    for (const c of cuts[s.letter]) { const k = sideOf(s, c) * 0.5; x += c.n[0] * k; y += c.n[1] * k; }
    return [x, y];
  });
  const paths = shards.map((s) => new Path2D(d(s.put, 3)));
  const sil = new Path2D(d(silhouettes, 3));
  const onPaper = ground === 'paper';
  const bg = onPaper ? PAPER : INK;
  const fg = hex(onPaper ? INK : PAPER);
  const shade = onPaper ? [96, 92, 88] : [104, 100, 95];
  let kick = () => {};
  const ptr = pointer(el, { onMove: () => kick() });
  const pin = { x: 0.5, y: 0.5, on: 0 }; // the pointer, eased on its own clock
  const tap = { x: 0, y: 0, t0: -1e9, amp: 0 };
  const cx = word.width / 2;
  const cy = 50;
  let fit = { w: 0, h: 0, k: 1, fx: 1, fy: 1 };

  /** The scale, and how far the scatter may reach on each axis so the shards stay inside the frame. */
  const fitTo = (w, h) => {
    if (fit.w === w && fit.h === h) return fit;
    const k = Math.min((w * 0.74) / word.width, (h * 0.34) / 100);
    const lim = [(w * 0.46) / k, (h * 0.43) / k];
    const reach = (axis, f) => {
      let e = 0;
      shards.forEach((s, i) => {
        const sc = scat[i];
        const r = sc.rad * (1 + sc.z);
        e = Math.max(e, Math.abs(s.c[axis] - (axis ? cy : cx) + (axis ? sc.dy : sc.dx) * f) + r);
      });
      return e;
    };
    const solve = (axis) => {
      if (reach(axis, 1) <= lim[axis]) return 1;
      let lo = 0.1; let hi = 1;
      for (let it = 0; it < 24; it++) { const m = (lo + hi) / 2; if (reach(axis, m) <= lim[axis]) lo = m; else hi = m; }
      return lo;
    };
    fit = { w, h, k, fx: solve(0), fy: solve(1) };
    return fit;
  };

  const render = (t) => {
    const { ctx, width: w, height: h, dpr } = stage;
    const { k, fx, fy } = fitTo(w, h);
    const ox = w / 2 - cx * k;
    const oy = h / 2 - cy * k;
    const world = () => ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * ox, dpr * oy);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    const px = (pin.x * w - ox) / k;
    const py = (pin.y * h - oy) / k;
    const b = breathOf(t) + inhaleOf(t);
    const now = performance.now();
    const tapK = (now - tap.t0) / 650;
    const tapEnv = tapK > 0 && tapK < 1 ? tap.amp * (1 - Math.exp(-tapK * 18)) * (1 - tapK) ** 2 : 0;

    let outSum = 0;
    const pose = shards.map((s, i) => {
      const sc = scat[i];
      const o = outOf(t, s.dn);
      outSum += o;
      const ux = s.c[0] - s.hit[0];
      const uy = s.c[1] - s.hit[1];
      const len = Math.hypot(ux, uy) || 1;
      const lk = lockOf(s.dn);
      const kick = recoil(t, lk) * 1.1 + recoil(t, T.relock) * 0.7;
      let x = sc.dx * fx * o + open[i][0] * b * OPEN + (ux / len) * kick;
      let y = sc.dy * fy * o + open[i][1] * b * OPEN + (uy / len) * kick;
      let rot = sc.rot * o ** 1.7;
      // The pointer, and a tap: shards near it move apart and turn away.
      const pd = Math.hypot(s.c[0] - px, s.c[1] - py);
      const near = pin.on * (1 - smoothstep(0, 120, pd)) * (1 - clamp(o * 4));
      const td = Math.hypot(s.c[0] - tap.x, s.c[1] - tap.y);
      const struck = tapEnv * (1 - smoothstep(0, 170, td));
      if (near > 0) {
        x += ((s.c[0] - px) / (pd || 1)) * near * 16;
        y += ((s.c[1] - py) / (pd || 1)) * near * 16;
        rot += near * sc.br * 2.5 * deg;
      }
      if (struck > 0) {
        x += ((s.c[0] - tap.x) / (td || 1)) * struck * 14;
        y += ((s.c[1] - tap.y) / (td || 1)) * struck * 14;
        rot += struck * sc.br * 2 * deg;
      }
      return { i, x, y, rot, o, z: 1 + sc.z * o ** 1.4, tilt: sc.tilt * o ** 1.7, axis: sc.axis, near: Math.max(near, struck) };
    });
    const outMean = outSum / shards.length;

    // The light under the gaps: only inside the letters as they stand. A backlight field
    // from each hit, and a brighter line along each crack.
    const reachP = Math.max(0, ...pose.map((q) => q.near));
    ctx.save();
    world();
    ctx.globalCompositeOperation = onPaper ? 'source-over' : 'lighter';
    const gate = 1 - smoothstep(0.02, 0.3, outMean);
    const dmax = build().dmax;
    const at = (dist) => gate * lightAt(t, dist, clamp(dist / dmax)) * (onPaper ? 0.7 : 1);
    ctx.clip(sil, 'evenodd');
    // One flat band as wide as the widest opening right now: an opened gap is lit evenly
    // from edge to edge, not a bright line in a dark channel.
    const opening = GAP + 1.5 + OPEN * Math.max(0, b) + 26 * reachP + 3 * Math.abs(Math.min(0, b));
    crackLight(ctx, at, { band: [[opening / GAP, 1]] });
    if (reachP > 0.01) {
      const pts = [[px, py, pin.on], [tap.x, tap.y, tapEnv]];
      for (const [qx, qy, amt] of pts) {
        if (amt < 0.01) continue;
        const hh = nearestHit(qx, qy);
        const c = spectral(Math.hypot(qx - hh[0], qy - hh[1]));
        const g = ctx.createRadialGradient(qx, qy, 0, qx, qy, 100);
        g.addColorStop(0, rgba(c, 0.5 * amt));
        g.addColorStop(1, rgba(c, 0));
        ctx.fillStyle = g;
        ctx.fillRect(qx - 100, qy - 100, 200, 200);
      }
    }
    ctx.restore();

    // The shards, the farthest first. In flight a shard turned away from the eye catches less light.
    const order = [...pose].sort((a, q) => a.z - q.z || a.i - q.i);
    for (const q of order) {
      const s = shards[q.i];
      world();
      ctx.translate(s.c[0] + q.x, s.c[1] + q.y);
      ctx.rotate(q.rot);
      if (q.tilt) { ctx.rotate(q.axis); ctx.scale(Math.cos(q.tilt), 1); ctx.rotate(-q.axis); }
      if (q.z !== 1) ctx.scale(q.z, q.z);
      ctx.translate(-s.c[0], -s.c[1]);
      const c = q.o > 0 ? mix(fg, shade, clamp(q.o * (0.08 + 0.85 * scat[q.i].face ** 1.6) + Math.abs(Math.sin(q.tilt)) * 0.25)) : fg;
      ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
      ctx.fill(paths[q.i], 'evenodd');
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const tl = timeline({ duration: 6, render });
  // The pointer is eased on its own clock (by time, so it runs the same at any frame rate),
  // only while it moves, fades or a tap rings out; a paused timeline is drawn again.
  let raf = 0;
  let last = 0;
  const follow = (nowMs) => {
    const dt = last ? Math.min(0.1, (nowMs - last) / 1000) : 1 / 60;
    last = nowMs;
    const target = ptr.inside ? 1 : 0;
    const a = 1 - Math.exp(-dt * 7);
    pin.on += (target - pin.on) * a;
    if (ptr.inside) { const b = 1 - Math.exp(-dt * 12); pin.x += (ptr.x - pin.x) * b; pin.y += (ptr.y - pin.y) * b; }
    const ringing = (nowMs - tap.t0) < 700;
    const settled = !ringing && Math.abs(target - pin.on) < 0.002 && (!ptr.inside || Math.hypot(ptr.x - pin.x, ptr.y - pin.y) < 0.0005);
    if (settled) pin.on = target;
    if (!tl.playing) tl.redraw();
    if (settled) { raf = 0; last = 0; } else raf = requestAnimationFrame(follow);
  };
  kick = () => { if (!raf) raf = requestAnimationFrame(follow); };
  const down = (e) => {
    const r = el.getBoundingClientRect();
    const { k } = fit;
    tap.x = (e.clientX - r.left - (r.width / 2 - cx * k)) / k;
    tap.y = (e.clientY - r.top - (r.height / 2 - cy * k)) / k;
    tap.t0 = performance.now();
    tap.amp = 1;
    kick();
  };
  el.addEventListener('pointerdown', down);
  stage.onResize(() => tl.redraw());
  tl.seek(0);
  return withCleanup(tl, () => cancelAnimationFrame(raf), () => el.removeEventListener('pointerdown', down), ptr.destroy, stage.destroy);
}

// ------------------------------------------------------------------ application

/** The A, broken again across the poster's two lines: its shards cut by one more crack. */
const SPLIT = { y: 47, a: 0, kern: 16 }; // through the A's counter, level: the line break. Without its feet the A's top is kerned in.
function posterShards() {
  const { word } = build();
  const li = word.letters.findIndex((L) => L.ch === 'A');
  const A = word.letters[li];
  const split = G.line([A.x + A.w / 2, SPLIT.y], SPLIT.a * deg);
  const parts = G.shatter([A], [...LINES, split], GAP);
  for (const s of parts) s.letter = li;
  const top = []; const bottom = [];
  for (const s of parts) {
    const side = (s.c[0] - split.p[0]) * split.n[0] + (s.c[1] - split.p[1]) * split.n[1];
    (side < 0 ? top : bottom).push(s);
  }
  return { li, A, top, bottom, split };
}

/**
 * An exhibition poster, 4:5, shown as a sheet on a dark wall. The wordmark is set huge over
 * two lines and broken at the A: its top ends the first line, its bottom starts the second,
 * and the light is in the split. One shard holds a picture of the work.
 */
const WORKS = [
  'Balena Voladora', 'Harpa', 'Icehotel', 'Dome Dreaming', 'Lyra', 'Firestarter',
  'Svartljus', 'Resonance', 'Emerging Sensation', 'Transcend', 'Eastern City Portal', 'Vista',
];
export function application(el, { images }) {
  const stage = canvasStage(el);
  const { shards, word } = build();
  const ps = posterShards();
  const imgs = [];
  let dead = false;
  const pathOf = (s) => new Path2D(d(s.put ?? [s.outer, ...s.holes], 3));
  const kernA = (loops) => loops.map((l) => l.map(([x, y]) => [x - SPLIT.kern, y]));
  const topA = ps.top.map((s) => ({ ...s, put: kernA([s.outer, ...s.holes]) }));
  const r1 = [...shards.filter((s) => s.letter < ps.li), ...topA].map((s) => ({ s, p: pathOf(s) }));
  const r2 = [...ps.bottom, ...shards.filter((s) => s.letter > ps.li)].map((s) => ({ s, p: pathOf(s) }));
  const silOf = (lis) => new Path2D(d(G.outlines(lis.map((i) => word.letters[i])).flat().flatMap((c) => [c.outer, ...c.holes]), 3));
  const sil1 = silOf(word.letters.map((_, i) => i).filter((i) => i < ps.li));
  const sil2 = silOf(word.letters.map((_, i) => i).filter((i) => i > ps.li));
  const silA = silOf([ps.li]);
  const h2 = GAP / 2;
  // The one shard that holds a picture: the M's upper right, a window onto the whale.
  const picShard = shards.find((s) => word.letters[s.letter].ch === 'M' && G.inside([242, 27], s.outer));
  const glow = (dist) => 0.62 + 0.38 * Math.exp(-dist / 140);
  // As a venue screen the poster breathes every six seconds: each letter opens along the
  // crack that cuts it, and the work shows through the gaps, a different piece each time.
  const OPENP = 7;
  const sideOf = (s, c) => Math.sign((s.c[0] - c.p[0]) * c.n[0] + (s.c[1] - c.p[1]) * c.n[1]) || 1;
  const cutsOf = (li) => CR.filter((c) => { const own = shards.filter((s) => s.letter === li).map((s) => sideOf(s, c)); return own.includes(1) && own.includes(-1); });
  const cuts = word.letters.map((_, li) => cutsOf(li));
  const openOf = (s) => {
    let x = 0; let y = 0;
    for (const c of cuts[s.letter]) { const q = sideOf(s, c) * 0.5; x += c.n[0] * q; y += c.n[1] * q; }
    return [x, y];
  };
  for (const it of [...r1, ...r2]) it.open = openOf(it.s);
  // The A's halves are already apart at the split: they hold still; only its foot opens.
  const aMain = [...ps.bottom].sort((a, q) => q.area - a.area)[0];
  const o0 = openOf(aMain);
  for (const it of [...r1, ...r2]) {
    if (it.s.letter !== ps.li) continue;
    it.open = ps.top.some((q) => it.s.c === q.c) ? [0, 0] : [it.open[0] - o0[0], it.open[1] - o0[1]];
  }
  const bandPath = (wid) => {
    const path = new Path2D();
    for (const c of CR) {
      const [hx, hy] = c.p; const [dx, dy] = c.d; const [nx, ny] = c.n; const L = 800; const hw = wid / 2;
      path.moveTo(hx - dx * L + nx * hw, hy - dy * L + ny * hw);
      path.lineTo(hx + dx * L + nx * hw, hy + dy * L + ny * hw);
      path.lineTo(hx + dx * L - nx * hw, hy + dy * L - ny * hw);
      path.lineTo(hx - dx * L - nx * hw, hy - dy * L - ny * hw);
      path.closePath();
    }
    return path;
  };
  const SHOW = [0, 1, 5, 7]; // the whale, the harp, the tower of fire, the facade
  let breath = 0;
  let show = 0;

  const draw = () => {
    if (dead) return;
    const b = breath;
    const wide = GAP + 1.5 + OPENP * b;
    const slots = b > 0.001 ? bandPath(wide) : null;
    const lit = [[wide / GAP, 0.9 * (1 - 0.6 * b)]];
    const { ctx, width: W, height: H, dpr: D } = stage;
    ctx.setTransform(D, 0, 0, D, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#1b1816';
    ctx.fillRect(0, 0, W, H);
    // The sheet: 4:5, centred on the wall with room around it.
    const w = Math.round(Math.min(W * 0.86, (H * 0.88 * 4) / 5));
    const h = Math.round((w * 5) / 4);
    const px0 = Math.round((W - w) / 2);
    const py0 = Math.round((H - h) / 2);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(px0 + 3, py0 + 6, w, h);
    ctx.fillStyle = INK;
    ctx.fillRect(px0, py0, w, h);
    ctx.save();
    ctx.beginPath();
    ctx.rect(px0, py0, w, h);
    ctx.clip();
    const u = w / 100; // poster units: 100 across, 125 down
    const m = u * 6; // margin
    const k = (w - 2 * m) / (ps.A.x + ps.A.w - SPLIT.kern); // the first line fills the measure
    const cap = k * 100;
    const top = u * 15;
    const lead = cap + u * 2.4;

    const row = (items, oy, lx, silRow, above) => {
      const world = () => ctx.setTransform(D * k, 0, 0, D * k, D * (px0 + m - lx * k), D * (py0 + oy));
      const worldA = () => ctx.setTransform(D * k, 0, 0, D * k, D * (px0 + m - (lx + (above ? SPLIT.kern : 0)) * k), D * (py0 + oy));
      ctx.save();
      world();
      ctx.clip(silRow, 'evenodd');
      if (slots && imgs[SHOW[show]]) {
        ctx.save();
        ctx.clip(slots);
        ctx.globalAlpha = Math.min(1, b * 1.4);
        const x0 = lx - 10; const x1 = lx + (above ? ps.A.x + ps.A.w : word.width - ps.A.x) + 10;
        drawCover(ctx, imgs[SHOW[show]], x0, -10, x1 - x0, 120);
        ctx.restore();
      }
      ctx.globalCompositeOperation = 'lighter';
      crackLight(ctx, glow, { band: lit });
      ctx.restore();
      // the A's half: its own cracks, and the split lit along the cut
      ctx.save();
      worldA();
      ctx.clip(silA, 'evenodd');
      ctx.beginPath();
      if (above) ctx.rect(ps.A.x - 20, -20, ps.A.w + 40, SPLIT.y + h2 + 20);
      else ctx.rect(ps.A.x - 20, SPLIT.y - h2, ps.A.w + 40, 140);
      ctx.clip();
      ctx.globalCompositeOperation = 'lighter';
      crackLight(ctx, glow, { band: lit });
      const c = spectral(40);
      ctx.fillStyle = rgba(c, 0.95);
      ctx.fillRect(ps.A.x - 20, SPLIT.y - h2, ps.A.w + 40, GAP);
      ctx.restore();
      for (const { s, p, open } of items) {
        world();
        if (b > 0.001) ctx.translate(open[0] * b * OPENP, open[1] * b * OPENP);
        if (s === picShard && imgs[0]) {
          ctx.save();
          ctx.clip(p, 'evenodd');
          const b = bounds([s.put ?? [s.outer]]);
          drawCover(ctx, imgs[0], b.x0 - 2, b.y0 - 2, b.w + 4, b.h + 4);
          ctx.restore();
        } else {
          ctx.fillStyle = PAPER;
          ctx.fill(p, 'evenodd');
        }
      }
    };
    row(r1, top, 0, sil1, true);
    row(r2, top + lead, ps.A.x, sil2, false);

    ctx.setTransform(D, 0, 0, D, D * px0, D * py0);
    const text = (str, x, y, size, { weight = 400, align = 'left', color = PAPER } = {}) => {
      ctx.font = `${weight} ${size}px ${TEXT}`;
      ctx.textAlign = align;
      ctx.fillStyle = color;
      ctx.fillText(str, x, y);
    };
    const rule = (y) => { ctx.fillStyle = 'rgba(236,235,230,0.3)'; ctx.fillRect(m, y, w - 2 * m, Math.max(1, u * 0.1)); };
    const small = u * 2.3;
    text('SMASH', m, u * 8, small, { weight: 500 });
    text('Twelve Rooms', u * 50, u * 8, small, { weight: 500, align: 'center' });
    text('An exhibition', w - m, u * 8, small, { weight: 500, align: 'right' });
    rule(u * 10.4);

    const yH = top + lead + cap + u * 9.5;
    const hs = u * 5.4;
    text('Twelve works that', m, yH, hs, { weight: 500 });
    text('change a room.', m, yH + hs * 1.1, hs, { weight: 500 });
    // The works, as a list: number and name.
    const body = u * 2.3;
    const bl = body * 1.42;
    const yL = yH + hs * 1.1 + u * 7;
    rule(yL - body - u * 1.6);
    const col = (w - 2 * m) / 2;
    WORKS.forEach((name, i) => {
      const x = m + (i < 6 ? 0 : col);
      const y = yL + (i % 6) * bl;
      text(String(i + 1).padStart(2, '0'), x, y, body, { color: 'rgba(236,235,230,0.55)' });
      text(name, x + u * 5, y, body);
    });
    const yB = h - m - bl * 2;
    rule(yB - body - u * 1.6);
    text('Frihamnen, Stockholm', m, yB, body, { weight: 500 });
    text('14 Nov 2026 – 17 Jan 2027', m, yB + bl, body);
    text('Thursday to Sunday, 17–23', m, yB + bl * 2, body);
    text('Free entry', w - m, yB, body, { weight: 500, align: 'right' });
    ctx.restore();
    // the sheet's edge, catching a little light
    ctx.setTransform(D, 0, 0, D, 0, 0);
    ctx.strokeStyle = 'rgba(236,235,230,0.14)';
    ctx.lineWidth = 1;
    ctx.strokeRect(px0 + 0.5, py0 + 0.5, w - 1, h - 1);
  };

  const ready = Promise.all([
    ...SHOW.map((i) => loadImage(images[i]).then((img) => { imgs[i] = img; }).catch(() => null)),
    document.fonts ? Promise.all([`400 16px ${TEXT}`, `500 16px ${TEXT}`].map((f) => document.fonts.load(f))).catch(() => null) : null,
  ]).then(draw);
  stage.onResize(draw);
  draw();
  // The breath: rest for the first few seconds (the printed poster), then every 6 s the gaps
  // open for about a second and a half and show one of the works.
  const still = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let raf = 0;
  let t0 = 0;
  const tick = (now) => {
    if (dead) return;
    if (!t0) t0 = now;
    const sec = (now - t0) / 1000;
    const ph = sec % 6;
    let nb = 0;
    if (ph > 3.6 && ph < 5.6) {
      if (ph < 4.1) nb = ease.outCubic(span(ph, 3.6, 4.1));
      else if (ph < 5.0) nb = 1 - 0.05 * span(ph, 4.1, 5.0);
      else nb = 0.95 * (1 - ease.inCubic(span(ph, 5.0, 5.6)));
    }
    const ns = Math.floor(sec / 6) % SHOW.length;
    if (nb !== breath || ns !== show) { breath = nb; show = ns; draw(); }
    raf = requestAnimationFrame(tick);
  };
  if (!still) ready.then(() => { if (!dead) raf = requestAnimationFrame(tick); });
  return { ready, destroy: () => { dead = true; cancelAnimationFrame(raf); stage.destroy(); } };
}

// ------------------------------------------------------------------ specimen

const LINE = 'We turn rooms into light.';
const BODY = 'SMASH is a studio for immersive experiences in Stockholm. We make installations, projection mapping and whole environments that people walk into, from a public square to a museum room. The technology stays out of sight. What people remember is how the place felt.';
const esc = (s = '') => String(s).replace(/[<&"]/g, (c) => ({ '<': '&lt;', '&': '&amp;', '"': '&quot;' })[c]);

/** The headline broken by the wordmark's own cracks: copies of it, each clipped to one cell. */
export function specimen(el) {
  const t = info.type;
  el.innerHTML = `
    <div class="spec-display">
      <div class="r-break" role="img" aria-label="${esc(LINE)}" style="position:relative;">
        <p class="spec-headline r-ghost" style="font-family:${esc(t.display.family)};${esc(t.display.css)}visibility:hidden;margin:0;">${esc(LINE)}</p>
      </div>
      <p class="label" style="margin-top:16px">Display: ${esc(t.display.name)}</p>
      <p class="note">${esc(t.display.note)}</p>
    </div>
    <div class="spec-text">
      <p class="spec-body" style="font-family:${esc(t.text.family)};${esc(t.text.css)}">${esc(BODY)}</p>
      <p class="label">Text: ${esc(t.text.name)}</p>
      <p class="note">${esc(t.text.note)}</p>
    </div>`;
  const box = el.querySelector('.r-break');
  const ghost = el.querySelector('.r-ghost');
  let dead = false;
  const layout = () => {
    if (dead) return;
    box.querySelectorAll('.r-cell, .r-light').forEach((n) => n.remove());
    const r = box.getBoundingClientRect();
    const W = r.width;
    const H = r.height;
    if (!W || !H) return;
    const fs = parseFloat(getComputedStyle(ghost).fontSize) || 40;
    const lh = parseFloat(getComputedStyle(ghost).lineHeight) || fs;
    const gap = Math.max(2, fs * 0.035);
    // One point of impact, in the white space after the first line; three cracks on the
    // wordmark's angles, none shallower than 26.6°.
    const range = document.createRange();
    range.selectNodeContents(ghost);
    const lines = [...range.getClientRects()].filter((q) => q.width > 1);
    const first = lines[0];
    const endX = first ? first.right - r.left : W * 0.6;
    const midY = first ? (first.top + first.bottom) / 2 - r.top : lh * 0.5;
    const hit = [Math.min(W - fs * 0.3, endX + fs * 0.55), midY];
    const cracks = [ANG[2], ANG[3], ANG[1]].map((a) => G.line(hit, a * deg));
    let cells = [[[-4, -4], [W + 4, -4], [W + 4, H + 4], [-4, H + 4]]];
    for (const ln of cracks) {
      const next = [];
      for (const c of cells) {
        for (const sgn of [1, -1]) {
          const q = G.cutHalf(c, ln, sgn * gap / 2);
          if (q.length > 2) next.push(q);
        }
      }
      cells = next;
    }
    const light = document.createElement('p');
    light.className = 'spec-headline r-light';
    light.setAttribute('aria-hidden', 'true');
    light.textContent = LINE;
    light.style.cssText = `position:absolute;inset:0;margin:0;font-family:${t.display.family};${t.display.css}color:transparent;background:radial-gradient(circle at ${hit[0].toFixed(0)}px ${hit[1].toFixed(0)}px, rgba(255,244,228,.85) 0, rgba(255,200,140,.8) ${(W * 0.16).toFixed(0)}px, rgba(255,140,120,.72) ${(W * 0.34).toFixed(0)}px, rgba(190,112,255,.62) ${(W * 0.6).toFixed(0)}px);-webkit-background-clip:text;background-clip:text;`;
    box.appendChild(light);
    for (const c of cells) {
      const cell = document.createElement('p');
      cell.className = 'spec-headline r-cell';
      cell.setAttribute('aria-hidden', 'true');
      cell.textContent = LINE;
      cell.style.cssText = `position:absolute;inset:0;margin:0;font-family:${t.display.family};${t.display.css}color:var(--text,#efece6);clip-path:polygon(${c.map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(',')});`;
      box.appendChild(cell);
    }
  };
  const ro = new ResizeObserver(() => layout());
  ro.observe(box);
  (document.fonts?.ready ?? Promise.resolve()).then(layout);
  layout();
  return { destroy: () => { dead = true; ro.disconnect(); } };
}
