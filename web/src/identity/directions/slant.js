// 02 Slant: the mark with every curve cut straight (2026-10-11, after
// CM.SUPPLY's round 4; Jonas: "i thought it was interesting with the slants
// instead of the uniform inner curves, i also thought the alternate a was
// interesting"). The block, the bars, the slots and the crossbars are the
// original's; the slot ends and the S bends are cut at one slope, 8 in 20
// (the slope, the stems, the height and the outer corners are sliders on the
// page, KNOBS). The A stays a capital: the single-storey a read as an o. The
// letters' outer corners are rounded, tight. The symbol, the S alone, the
// lockups and the favicons follow. No motion yet and no pixels: the stage
// holds the wordmark. Geometry: ./slant/geometry.js.

import { svg, timeline, canvasStage, withCleanup } from '../lib.js';
import { letters, letterS, symbol as symbolPath, symCols, block, SLANT, DROP, DROPS, BAR, OUTER, TENSION, H, PITCH, SYM_H, SYM_ROWS } from './slant/geometry.js';
import { BANDS5 } from '../grid.js';
import { lockPaths } from './original.js';

const BLACK = '#000000';
const WHITE = '#ffffff';

export const info = {
  n: 2,
  slug: 'slant',
  name: 'Slant',
  lane: 'Cut the curves',
  idea: 'The original mark with every curve cut straight at one slope, its outer corners rounded tight.',
  story: '',
  dynamism: '',
  keeps: 'The block, the bars, the slots and the crossbars.',
  risk: 'The cuts read as speed or as italic if the slope gets steeper.',
  palette: { ink: BLACK, paper: WHITE, accent: WHITE },
  interactive: '',
  motion: false, // the export takes no frames
  pixel: false, // nor pixel versions
};

const path = (d, rule = 'evenodd') => `<path fill="currentColor" fill-rule="${rule}" d="${d}"/>`;

// The sliders (Jonas, 2026-10-12): the slope of every cut, in a slot of 20
// ("maybe this can be a parameter i can slide to choose"); the stems' width
// and the block's height ("to match a bit the cm latest iteration"). The page
// sets them and draws the chapter again; the files are made at the defaults.
// And the outer corners' round and tension ("i also like the roundness how
// there's a bit of edge and drama to these corners").
const at = { drop: DROP, stem: BAR, height: H, outer: OUTER, tension: TENSION };
const knob = (key, label, min, max, step, value, text, set) => ({ key, label, min, max, step, value, text, set });
export const KNOBS = [
  knob('slope', 'Slope', 0, 20, 4, DROP * 20, (v) => `${v} in 20`, (v) => { at.drop = DROPS.find((k) => Math.abs(k - v / 20) < 1e-9) ?? DROP; }),
  knob('stem', 'Stem', BAR, 160, 4, BAR, (v) => `${v}`, (v) => { at.stem = v; }),
  knob('height', 'Height', 240, 720, 8, H, (v) => `${v}`, (v) => { at.height = v; }),
  knob('outer', 'Round', 0, 64, 4, OUTER, (v) => `${v}`, (v) => { at.outer = v; }),
  knob('tension', 'Tension', 55, 100, 5, TENSION * 100, (v) => `${v}%`, (v) => { at.tension = v / 100; }),
];
for (const k of KNOBS) { const set = k.set; k.set = (v) => set(Number(v)); }

/** The marks' measures, as the sliders have them. */
const now = () => ({ ...SLANT, ...at });
const box = () => block(now());

// The wordmark.
const mark = () => letters(now());
export const wordmark = () => { const b = box(); return svg(b.W, b.H, path(mark())); };

// The S M and the S alone, as the original's, their stems as the wordmark's.
const cols = () => symCols(at.stem);
const symW = () => cols().reduce((a, n) => a + n);
const sym = () => symbolPath({ cols: cols(), drop: at.drop, outer: at.outer, tension: at.tension });
export const symbol = () => svg(symW(), SYM_H, path(sym()));
const alone = (o) => { const S = letterS({ ...o, drop: at.drop, stem: at.stem, outer: at.outer, tension: at.tension }); return svg(S.w, S.h, path(S.d)); };
export const s = () => alone({});
export const sTurned = () => alone({ turn: true });
export const sSquare = () => alone({ wide: 1 });

// The lockups, as the original's: three lines whose capitals fill the mark's
// three solid bands, a pitch after it.
const CAP = 32;
export function lockup() {
  const b = box();
  const L = lockPaths([['studio', CAP], ['middle', b.bands[3]], ['stockholm', b.H]], CAP, b.W + PITCH);
  return svg(L.width, b.H, path(mark()) + path(L.d, 'nonzero'));
}
const SM_BARS = [SYM_ROWS[0], SYM_ROWS[0] + SYM_ROWS[1] + SYM_ROWS[2], SYM_H];
export function lockupSM() {
  const L = lockPaths([['name', SM_BARS[0]], ['studio', SM_BARS[1]], ['stockholm', SM_BARS[2]]], SYM_ROWS[0], symW() + PITCH);
  return svg(L.width, SYM_H, path(sym()) + path(L.d, 'nonzero'));
}

/** Each still's grid (grid.js), at the sliders' measures: its box, bands, stems and slots, and where its type starts. */
export function gridOf(kind) {
  const b = box(), w = symW(), bar = at.stem, slot = SLANT.stroke;
  const sw = 2 * bar + slot;
  return {
    wordmark: { w: b.W, h: b.H, bands: b.bands, bar, slot },
    lockup: { w: b.W, h: b.H, bands: b.bands, type: b.W + PITCH, bar, slot },
    symbol: { w, h: SYM_H, bands: BANDS5, bar, slot },
    lockupSM: { w, h: SYM_H, bands: BANDS5, type: w + PITCH, bar, slot },
    s: { w: sw, h: SYM_H, bands: BANDS5, bar, slot },
    sTurned: { w: SYM_H, h: sw, bands: BANDS5, turn: true, bar, slot },
    sSquare: { w: sw + bar + slot, h: SYM_H, bands: BANDS5, bar, slot },
  }[kind];
}

// Favicons: the S M at the original's measures (bars 8, 4 and 2 px; slots half
// that), centred. Its cuts are diagonals, so it is drawn smooth, not on pixels.
const FAV = { 64: 8, 32: 4, 16: 2 };
export function favicon({ size = 32 } = {}) {
  const n = FAV[size] ? size : 32;
  const bar = FAV[n];
  const sl = bar / 2;
  const cols = [bar, sl, bar, sl, bar, sl, bar, sl, bar];
  const rows = [bar, sl, bar, sl, bar];
  const d = symbolPath({ cols, rows, x: (n - (5 * bar + 4 * sl)) / 2, y: (n - (3 * bar + 2 * sl)) / 2, stop: bar, drop: at.drop, outer: (at.outer * bar) / BAR, tension: at.tension });
  return svg(n, n, `<rect width="${n}" height="${n}" fill="${BLACK}"/><path fill="${WHITE}" fill-rule="evenodd" d="${d}"/>`);
}

// The stage: the wordmark, white on black, held (no motion yet).
function draw(ctx, w, h) {
  ctx.fillStyle = BLACK;
  ctx.fillRect(0, 0, w, h);
  const { W, H } = box();
  const k = Math.min((h * 0.64) / H, (w * 0.8) / W);
  ctx.save();
  ctx.translate((w - W * k) / 2, (h - H * k) / 2);
  ctx.scale(k, k);
  ctx.fillStyle = WHITE;
  ctx.fill(new Path2D(mark()), 'evenodd');
  ctx.restore();
}

export function motion(el) {
  const stage = canvasStage(el);
  const tl = timeline({ duration: 10, render: () => draw(stage.ctx, stage.width, stage.height) });
  stage.onResize(() => tl.redraw());
  tl.ready = Promise.resolve();
  return withCleanup(tl, stage.destroy);
}
