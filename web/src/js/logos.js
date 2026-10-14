// The newer marks, from /identity/ (Jonas, 2026-10-14: "can we try with a
// newer version of the logo? ... use the ones we have created"): Slant's best
// presets (../identity/slant-best.js), each drawn by the identity page's own
// code with its S level, as letter outlines. The landing and the heroes then
// show their pictures through the letters, in place of the site's slotted
// block, and the header carries the preset's S M. Loaded only when one is
// picked (?logo=<key>, main.js).
// It stretches as the block does (Jonas: "it should be a version of the logo
// that can stretch"), but by being drawn again, not scaled: as tall as the box
// asks, its width, stems, slots, slants and rounds as they are, so only the
// letters grow taller or shorter.

import { PRESETS, LEVEL, drawWith, wordmark, symbol } from '../identity/directions/slant.js';

// [key, name]: the site's own mark first, then the best-of's, in its order.
export const LOGOS = [
  ['original', 'Original (the site’s)'],
  ['start', 'Slant'],
  ['r1-locked-blade', 'Slant · Round 1'],
  ['r2-column-blade', 'Slant · Round 2'],
  ['r3-carved-column', 'Slant · Round 3'],
  ['r3-square', 'Round 3, square'],
  ['r4-apex', 'Slant · Round 3 + Apex'],
  ['wide', 'Slant · Wide'],
];

// Presets of our own, from Slant's: [the preset, what changes].
const VARIANTS = {
  // Round 3 without the slant (Jonas, 2026-10-14: "the r3 carved column but without the slant"): every cut
  // square (Slope 0), the A's and the H's crossbars level.
  'r3-square': ['r3-carved-column', { slope: 0, per: [{}, {}, {}, {}, { both: 1 }] }],
};
const preset = (key) => {
  const [base, own] = VARIANTS[key] ?? [key, {}];
  const set = PRESETS.find(([k]) => k === base)?.[2];
  return set ? { ...set, ...LEVEL, ...own } : null;
};

/** The x extents an absolute path's points reach, subpath by subpath (M L C A Z only, as Slant writes). */
function extents(d) {
  const out = [];
  let cur = null;
  for (const [, c, args] of d.matchAll(/([MLCAZ])([^MLCAZ]*)/g)) {
    const n = args.trim() ? args.trim().split(/[\s,]+/).map(Number) : [];
    if (c === 'M') { cur = [Infinity, -Infinity]; out.push(cur); }
    const xs = c === 'A' ? n.filter((_, i) => i % 7 === 5) : n.filter((_, i) => i % 2 === 0);
    for (const x of xs) { cur[0] = Math.min(cur[0], x); cur[1] = Math.max(cur[1], x); }
  }
  return out;
}

/**
 * The runs of columns the path fills from top to bottom, [x0, x1] in its own
 * units: a stem the picture shows through all the way up, for the dive to go
 * into. Found by drawing it small (a unit in four), in the browser.
 */
function stems(w, h, d) {
  if (typeof OffscreenCanvas === 'undefined') return [];
  const k = 0.25, cw = Math.ceil(w * k), ch = Math.ceil(h * k);
  const ctx = new OffscreenCanvas(cw, ch).getContext('2d');
  ctx.scale(k, k);
  ctx.fill(new Path2D(d), 'evenodd');
  const px = ctx.getImageData(0, 0, cw, ch).data;
  const full = (x) => { for (let y = 1; y < ch - 1; y++) if (px[(y * cw + x) * 4 + 3] < 128) return false; return true; };
  const runs = [];
  for (let x = 0, start = -1; x <= cw; x++) {
    if (x < cw && full(x)) { if (start < 0) start = x; } else if (start >= 0) { runs.push([start / k, x / k]); start = -1; }
  }
  return runs;
}

/**
 * Preset `key`'s wordmark drawn for a box `aspect` wide to 1 tall (its height
 * on the grid of 4), or at the preset's own height without one; drawn once per
 * height.
 */
const drawn = new Map();
const widths = new Map(); // a preset's width, the same at any height
export function outlineFor(key, aspect) {
  const set = preset(key);
  if (!set) return null;
  if (!widths.has(key)) widths.set(key, outline(key).w);
  const width = widths.get(key);
  const height = aspect ? Math.max(64, Math.round(width / aspect / 4) * 4) : set.height;
  const id = `${key}|${height}`;
  if (!drawn.has(id)) {
    if (drawn.size > 40) drawn.clear();
    drawn.set(id, outline(key, height));
  }
  return drawn.get(id);
}

/**
 * Preset `key`'s wordmark (at `height`, or its own) as { w, h, d, gaps, stems }: its path in its own
 * units (even-odd), the clear runs between its letters, left to right,
 * [x0, x1], and its full-height stems (above): the dive goes into the widest
 * stem nearest the gap between the M and the A, or, inverted, through that gap.
 */
export function outline(key, height) {
  const set = preset(key);
  if (!set) return null;
  if (height) set.height = height;
  const s = drawWith(set, wordmark);
  const [, , w, h] = s.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
  const d = [...s.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]).join('');
  // Subpaths whose reaches overlap are one letter (its counters and slots inside it).
  const letters = [];
  for (const [a, b] of extents(d).sort((p, q) => p[0] - q[0])) {
    const last = letters.at(-1);
    if (last && a <= last[1]) last[1] = Math.max(last[1], b);
    else letters.push([a, b]);
  }
  const gaps = letters.slice(1).map(([a], i) => [letters[i][1], a]);
  let found = null; // found once asked for
  return { w, h, d, gaps, get stems() { return (found ??= stems(w, h, d)); } };
}

/** Preset `key`'s S M, black, sized by CSS, for the header. */
export const symbolSVG = (key) => (preset(key) ? drawWith(preset(key), symbol) : null);
