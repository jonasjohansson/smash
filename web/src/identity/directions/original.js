// 00 Original: the mark as it is, in black and white (the focus round,
// 2026-09-28).
//
// The mark is drawn from the same parameters as web/src/js/mark.js (its
// DEFAULTS are the original; these outlines match the traced logo to 0.6 %),
// as one evenodd path: the five letters left standing when the ten slots are
// cut from the block. The symbol is the S M, Jonas's crop through the whole M,
// exactly as the modular mark (modular.js) draws it; the favicons follow it on
// the pixel grid. The lockups set three lines on the three solid bands of the
// drawing beside them, the middle one on the crossbar. Their type is a
// placeholder (Neue Montreal, as outlines set by original/outline-text.py)
// until the typeface is chosen. Stills are plain vector in currentColor.

import { svg, timeline, canvasStage, withCleanup, ease, span } from '../lib.js';
import { letterPaths, letters, W, H, PITCH, REST, symbolA, SYM_W, SYM_H, SYM_COLS, SYM_ROWS } from './original/geometry.js';
import { OUTLINES } from './original/outlines.js';

const BLACK = '#000000';
const WHITE = '#ffffff';

export const info = {
  n: 0,
  slug: 'original',
  name: 'Original',
  lane: 'Keep the mark',
  idea: 'The mark as it is, with the S M as its symbol; the lockup\'s type is a placeholder until the typeface is chosen.',
  story: '',
  dynamism: 'The crossbars move, letter by letter, and the slots open as they go.',
  keeps: 'The mark, unchanged.',
  risk: 'The S M says SMASH only to people who know the mark.',
  palette: { ink: BLACK, paper: WHITE, accent: WHITE },
  interactive: '',
  keyframe: 0.2,
};

// Stills ---------------------------------------------------------------------

const MARK = letters(REST);
const path = (d, rule = 'evenodd') => `<path fill="currentColor" fill-rule="${rule}" d="${d}"/>`;

// The wordmark's clear space: half the mark's width on either side. (The page
// sizes a still by its width: identity.css's `.mark svg { height: 100% }`
// does not resolve inside the aspect-ratio panels, so a tight 550 × 471
// artboard overflows the 16 : 9 wordmark panels. The artboard has to carry
// the width; the height is the mark's own. A tight artboard needs that CSS
// fixed first.)
const CLEAR = W / 2;
export function wordmark() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-CLEAR} 0 ${W + 2 * CLEAR} ${H}">${path(MARK)}</svg>`;
}

// The symbol: the S M, 238.9 × 135.34, exactly the modular mark's
// (geometry.js reads it from modular.js). It keeps what Jonas liked in his
// crop: the S's slots running out through its two bends, and the M's slots
// with round ends. On its own artboard, nothing around it.
const SYM = symbolA();
export function symbol() {
  return svg(SYM_W, SYM_H, path(SYM));
}

/** Move and scale path data made of (x, y) pairs only (M, L, Q, C, Z). */
function place(d, k, dx, dy) {
  let i = 0;
  return d.replace(/-?\d+(?:\.\d+)?/g, (n) => String(+(+n * k + (i++ % 2 === 0 ? dx : dy)).toFixed(2)));
}

/** Lines of type as outlines: [key, baseline] pairs, capitals `cap` tall, starting at x. */
function lockPaths(lines, cap, x) {
  const k = cap / OUTLINES.studio.cap;
  const d = lines.map(([key, base]) => place(OUTLINES[key].d, k, x, base)).join('');
  return { d, width: +(x + Math.max(...lines.map(([key]) => OUTLINES[key].advance)) * k).toFixed(2) };
}

// The lockup: the mark, one slot pitch (51.78), then three lines whose
// capitals exactly fill the mark's three solid bands: the top bar (0 to 32),
// the crossbar (219.5 to 251.5) and the bottom bar (439 to 471). The type is
// a placeholder.
const CAP = 32;
const FOOT = REST.crossbar + REST.gap / 2 - REST.stroke / 2; // 251.5: the crossbar's foot
const LOCK = lockPaths([['studio', CAP], ['middle', FOOT], ['stockholm', H]], CAP, W + PITCH);
export function lockup() {
  return svg(LOCK.width, H, path(MARK) + path(LOCK.d, 'nonzero'));
}

// The S M's lockup, for where the mark is too tall: the same rule on the
// symbol's three bars, the name in the top one.
const SM_BARS = [SYM_ROWS[0], SYM_ROWS[0] + SYM_ROWS[1] + SYM_ROWS[2], SYM_H]; // 31.78, 83.56, 135.34
const SM_PITCH = SYM_COLS[1] + SYM_COLS[2]; // a slot and a bar: 51.78
const LOCK_SM = lockPaths([['name', SM_BARS[0]], ['studio', SM_BARS[1]], ['stockholm', SM_BARS[2]]], SYM_ROWS[0], SYM_W + SM_PITCH);
export function lockupSM() {
  return svg(LOCK_SM.width, SYM_H, path(SYM) + path(LOCK_SM.d, 'nonzero'));
}

// Favicons: the S M on the pixel grid, white on black. Its nine columns at
// 2 : 1 (bars 8, 4 and 2 px; slots 4, 2 and 1) and its five rows the same
// (8/4/8/4/8 at 64), centred with a one-sixteenth margin either side. The
// bends and the round slot ends are the mark's curves sampled at pixel
// centres, so every edge is a whole pixel: at 64 the slot ends step in and the
// bends take a stair, at 32 the bends lose one corner pixel, at 16 all is
// square.
const FAV = { 64: 8, 32: 4, 16: 2 };

export function favicon({ size = 32 } = {}) {
  const n = FAV[size] ? size : 32;
  const bar = FAV[n];
  const sl = bar / 2;
  const cols = [bar, sl, bar, sl, bar, sl, bar, sl, bar];
  const rows = [bar, sl, bar, sl, bar];
  const x = (n - (5 * bar + 4 * sl)) / 2;
  const y = (n - (3 * bar + 2 * sl)) / 2;
  const d = symbolA({ cols, rows, x, y, pixel: true });
  return svg(n, n, `<rect width="${n}" height="${n}" fill="${BLACK}"/><path fill="${WHITE}" fill-rule="evenodd" d="${d}"/>`, 'shape-rendering="crispEdges"');
}

// Motion ---------------------------------------------------------------------
//
// The mark itself, white on black: nothing but its own parameters move. One
// loop, 10 s, a pure function of t. The crossbars (the S bends, the A's bar,
// the H's) travel one letter after another, S, A, S, H, a beat apart; the M
// has none, so its beat is a rest. They rise, hold, fall through the middle to
// below it, hold, and come home. While they move the slots open a little, and
// close again as they settle.
//
//   0.0 s  at rest
//   1.0    the crossbars rise, 72 units, each 0.12 s after the letter before
//   3.6    from high to low, 144 units, slower
//   6.6    home
//   8.4    at rest again until the loop; t 1 draws the same frame as t 0

const DURATION = 10; // seconds
const REACH = 72; // mark units, either way of the middle (235.5)
const LAG = 0.12; // seconds, from one letter to the next (by position, so the M is a rest)
const OPEN = 4; // how much wider the slots get at full speed, from 20
const MOVES = [ // [start, duration] in seconds, from and to in reaches (−1 high, 1 low)
  [1.0, 1.3, 0, -1],
  [3.6, 2.0, -1, 1],
  [6.6, 1.4, 1, 0],
];
const CROSSBARS = [0, 2, 3, 4]; // the letters with crossbars: S, A, S, H

/** Where a letter's crossbar is, in reaches from the middle, at its own second s. */
function level(s) {
  let v = 0;
  for (const [a, d, from, to] of MOVES) if (s >= a) v = from + (to - from) * ease.inOutCubic(span(s, a, a + d));
  return v;
}

/** The crossbar of letter i at second s, in mark units. */
const crossbarAt = (i, s) => REST.crossbar + REACH * level(s - i * LAG);

/** The slots' width at second s: open by how fast the fastest crossbar moves. */
function strokeAt(s) {
  const e = 0.01;
  const speed = Math.max(...CROSSBARS.map((i) => Math.abs(crossbarAt(i, s + e) - crossbarAt(i, s - e)) / (2 * e)));
  return REST.stroke + OPEN * ease.inOutQuad(Math.min(1, speed / 170));
}

/** The mark at second s, as path data: each letter drawn with its own crossbar. */
function markAt(s) {
  const stroke = strokeAt(s);
  return [0, 1, 2, 3, 4].map((i) => letterPaths({ ...REST, stroke, crossbar: i === 1 ? REST.crossbar : crossbarAt(i, s) })[i]).join('');
}

export function motion(el) {
  const stage = canvasStage(el);
  let dead = false;

  const render = (t) => {
    if (dead) return;
    const { ctx, width: w, height: h } = stage;
    const s = (t % 1) * DURATION; // t 1 draws the same frame as t 0
    ctx.fillStyle = BLACK;
    ctx.fillRect(0, 0, w, h);
    const k = Math.min((h * 0.64) / H, (w * 0.8) / W);
    ctx.save();
    ctx.translate((w - W * k) / 2, (h - H * k) / 2);
    ctx.scale(k, k);
    ctx.fillStyle = WHITE;
    ctx.fill(new Path2D(markAt(s)), 'evenodd');
    ctx.restore();
  };

  const tl = timeline({ duration: DURATION, render });
  stage.onResize(() => tl.redraw());
  tl.ready = Promise.resolve();
  return withCleanup(tl, () => { dead = true; }, stage.destroy);
}
