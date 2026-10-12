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
import { letters, letterS, down as downPath, symbol as symbolPath, symCols, symRows, block, depth, SLANT, DROP, DROPS, BAR, DIP, PER, H, PITCH } from './slant/geometry.js';
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
// Where they start, and what the files are made at: Jonas's, 2026-10-12
// ("these default settings look fine"), the A a capital that dips.
export const START = { cut: 20, drop: DROP, stem: 72, stroke: 24, space: 24, ceil: BAR, height: H, outer: 36, tension: 0.6, tilt: 0, split: 0, a: 'A', dip: DIP, downFit: 'wider' };
const at = { ...START, per: PER.map((q) => ({ ...q })), lower: [0, 0, 0, 0, 0] };
const knob = (key, label, min, max, step, value, text, set) => ({ key, label, min, max, step, value, text, set: (v) => set(Number(v)) });
/** A switch between a few options (the page draws a button for each): [label, value]. */
const choice = (key, label, options, value) => ({ key, label, options, value, set: (v) => { at[key] = options.find(([, o]) => String(o) === String(v))?.[1] ?? value; } });
// More to get closer to CM.SUPPLY's latest (Jonas, 2026-10-12): the slots'
// width, the S's crossbar tilted into their long diagonal and its slot run
// through it, and the A or their a ("lets explore having both capital and
// lowercase a"), the a dipping under the baseline.
export const KNOBS = [
  knob('slope', 'Slope', 0, 20, 4, DROP * 20, (v) => `${v} in 20`, (v) => { at.drop = DROPS.find((k) => Math.abs(k - v / 20) < 1e-9) ?? DROP; }),
  knob('cut', 'Cut round', 0, 20, 1, START.cut, (v) => `${v}`, (v) => { at.cut = v; }),
  knob('stem', 'Stem', BAR, 200, 4, START.stem, (v) => `${v}`, (v) => { at.stem = v; }),
  knob('slot', 'Slot', 8, 60, 4, START.stroke, (v) => `${v}`, (v) => { at.stroke = v; }),
  knob('space', 'Gap', 8, 80, 4, START.space, (v) => `${v}`, (v) => { at.space = v; }),
  knob('ceil', 'Ceiling', 16, 160, 4, START.ceil, (v) => `${v}`, (v) => { at.ceil = v; }),
  knob('height', 'Height', 240, 720, 8, START.height, (v) => `${v}`, (v) => { at.height = v; }),
  knob('outer', 'Round', 0, 64, 4, START.outer, (v) => `${v}`, (v) => { at.outer = v; }),
  knob('tension', 'Tension', 55, 100, 5, START.tension * 100, (v) => `${v}%`, (v) => { at.tension = v / 100; }),
  knob('tilt', 'Tilt', 0, 160, 4, START.tilt, (v) => `${v}`, (v) => { at.tilt = v; }),
  knob('dip', 'Dip', 0, 24, 4, START.dip, (v) => `${v}`, (v) => { at.dip = v; }),
  choice('split', 'S', [['Whole', 0], ['Split', 1]], START.split),
  choice('a', 'A', [['A', 'A'], ['a', 'a']], START.a),
  choice('downFit', 'Down', [['M wider', 'wider'], ['Fill', 'fill'], ['Squeeze', 'squeeze']], START.downFit),
  // Each letter's own switches (geometry.js: PER): a button where the letter has the setting.
  {
    key: 'per', label: 'Letters', letters: ['S', 'M', 'A', 'S', 'H'],
    rows: [['cut', 'Cut'], ['round', 'Round'], ['base', 'Base'], ['tilt', 'Tilt'], ['split', 'Split'], ['dip', 'Dip']],
    has: (row, i) => row in PER[i],
    on: (row, i) => !!at.per[i][row],
    set: (row, i, v) => { at.per[i][row] = v ? 1 : 0; },
    reset() { at.per = PER.map((q) => ({ ...q })); },
  },
  // Each letter's slot ends lowered past the ceiling (geometry.js: p.lower): a slider a letter, the H has none.
  {
    key: 'lower', label: 'Lower', each: ['S', 'M', 'A', 'S', 'H'], min: 0, max: 200, step: 4,
    has: (i) => i < 4,
    get: (i) => at.lower[i],
    set: (i, v) => { at.lower[i] = Number(v); },
    reset() { at.lower = [0, 0, 0, 0, 0]; },
  },
];

/** The marks' measures, as the sliders have them. */
const now = () => ({ ...SLANT, ...at });
const box = () => block(now());

// The wordmark, with the A or the a as switched; and both, side by side (the
// page shows them in a row of their own). Either dips under the block, so its
// artboard does too.
const wordmarkWith = (a) => { const p = { ...now(), a: a ?? at.a }, b = block(p); return svg(b.W, b.H + depth(p), path(letters(p))); };
const mark = () => letters(now());
export const wordmark = () => wordmarkWith();
export const wordmarkCapital = () => wordmarkWith('A');
export const wordmarkLower = () => wordmarkWith('a');
export const VERSIONS = [['wordmarkCapital', 'Capital A'], ['wordmarkLower', 'Lowercase a']];

// SMASH written down (Jonas, 2026-10-12: "the DOWN looks pretty good, but
// lets assume no dip"): the letters in a column, each as wide as an S.
export const down = () => { const D = downPath(now()); return svg(D.w, D.h, path(D.d)); };

// The S M and the S alone, as the original's, their stems and slots as the wordmark's.
const cols = () => symCols(at.stem, at.stroke, at.space);
const rows = () => symRows(at.stroke);
const symW = () => cols().reduce((t, n) => t + n);
const symH = () => rows().reduce((t, n) => t + n);
const sym = () => symbolPath({ cols: cols(), rows: rows(), cut: at.cut, drop: at.drop, outer: at.outer, tension: at.tension });
export const symbol = () => svg(symW(), symH(), path(sym()));
const alone = (o) => { const S = letterS({ ...o, cut: at.cut, drop: at.drop, stem: at.stem, slot: at.stroke, outer: at.outer, tension: at.tension }); return svg(S.w, S.h, path(S.d)); };
export const s = () => alone({});
export const sTurned = () => alone({ turn: true });
export const sSquare = () => alone({ wide: 1 });

// The lockups, as the original's: three lines whose capitals fill the mark's
// three solid bands, a pitch after it.
const CAP = 32;
export function lockup() {
  const b = box();
  const L = lockPaths([['studio', b.bands[1]], ['middle', b.bands[3]], ['stockholm', b.H]], CAP, b.W + PITCH);
  return svg(L.width, b.H + depth(now()), path(mark()) + path(L.d, 'nonzero'));
}
export function lockupSM() {
  const r = rows(), bars = [r[0], r[0] + r[1] + r[2], symH()];
  const L = lockPaths([['name', bars[0]], ['studio', bars[1]], ['stockholm', bars[2]]], r[0], symW() + PITCH);
  return svg(L.width, symH(), path(sym()) + path(L.d, 'nonzero'));
}

/** The S M's slots and its gap, as [left, width]. */
const symColumns = () => cols().reduce((o, n, i, a) => (i % 2 ? [...o, [a.slice(0, i).reduce((t, m) => t + m, 0), n]] : o), []);

/** Each still's grid (grid.js), at the sliders' measures: its box, bands, stems and slots, and where its type starts. */
export function gridOf(kind) {
  const b = box(), w = symW(), h = symH(), bar = at.stem, slot = at.stroke;
  const bands5 = rows().reduce((e, n) => [...e, e.at(-1) + n], [0]);
  const sw = 2 * bar + slot;
  return {
    wordmark: { w: b.W, h: b.H, bands: b.bands, bar, slot, columns: b.columns },
    lockup: { w: b.W, h: b.H, bands: b.bands, type: b.W + PITCH, bar, slot, columns: b.columns },
    symbol: { w, h, bands: bands5, bar, slot, columns: symColumns() },
    lockupSM: { w, h, bands: bands5, type: w + PITCH, bar, slot, columns: symColumns() },
    s: { w: sw, h, bands: bands5, bar, slot },
    sTurned: { w: h, h: sw, bands: bands5, turn: true, bar, slot },
    sSquare: { w: sw + bar + slot, h, bands: bands5, bar, slot },
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
  const d = symbolPath({ cols, rows, x: (n - (5 * bar + 4 * sl)) / 2, y: (n - (3 * bar + 2 * sl)) / 2, stop: bar, cut: (at.cut * bar) / BAR, drop: at.drop, outer: (at.outer * bar) / BAR, tension: at.tension, grid: 0 });
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
