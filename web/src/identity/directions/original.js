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
// until the typeface is chosen. The S alone comes three ways: as in the S M,
// on its side, and drawn out to a square. Every still takes { pixel }: its
// curves in pixels of 4 (the grid) or 10 (half a slot) instead of round
// (geometry.js: pixelate). Stills are plain vector in currentColor.

import { svg, timeline, canvasStage, withCleanup, ease, span } from '../lib.js';
import { letterPaths, letters, letterS, pixelate, W, H, PITCH, REST, symbolA, SYM_W, SYM_H, SYM_COLS, SYM_ROWS } from './original/geometry.js';
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
/** A mark's path data, round, or with its curves in pixels of `pixel` mark units. */
const px = (d, pixel) => (pixel ? pixelate(d, pixel) : d);

// The wordmark on its own artboard, tight: 552 × 472 on the grid. (The page
// widens it for its 16 : 9 panels, identity.js; the exports add a pitch of
// clear space round it on a ground.)
export function wordmark({ pixel = 0 } = {}) {
  return svg(W, H, path(px(MARK, pixel)));
}

// The symbol: the S M, 240 × 136, exactly the modular mark's
// (geometry.js reads it from modular.js). It keeps what Jonas liked in his
// crop: the S's slots running out through its two bends, and the M's slots
// with round ends. On its own artboard, nothing around it.
const SYM = symbolA();
export function symbol({ pixel = 0 } = {}) {
  return svg(SYM_W, SYM_H, path(px(SYM, pixel)));
}

// The S alone (Jonas, 2026-09-30): the S M's S, 84 × 136; on its side, 136 ×
// 84; and drawn out by a pitch to a square, 136 × 136, its slots still a bar
// in from either side.
const S = letterS();
const S_TURNED = letterS({ turn: true });
const S_SQUARE = letterS({ wide: 1 });
export function s({ pixel = 0 } = {}) {
  return svg(S.w, S.h, path(px(S.d, pixel)));
}
export function sTurned({ pixel = 0 } = {}) {
  return svg(S_TURNED.w, S_TURNED.h, path(px(S_TURNED.d, pixel)));
}
export function sSquare({ pixel = 0 } = {}) {
  return svg(S_SQUARE.w, S_SQUARE.h, path(px(S_SQUARE.d, pixel)));
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

// The lockup: the mark, one pitch (52), then three lines whose capitals
// exactly fill the mark's three solid bands: the top bar (0 to 32), the
// crossbar (220 to 252) and the bottom bar (440 to 472). Set in Neue Montreal,
// the site's own.
const CAP = 32;
const FOOT = REST.crossbar + REST.gap / 2 - REST.stroke / 2; // 251.5: the crossbar's foot
const LOCK = lockPaths([['studio', CAP], ['middle', FOOT], ['stockholm', H]], CAP, W + PITCH);
export function lockup({ pixel = 0 } = {}) {
  return svg(LOCK.width, H, path(px(MARK, pixel)) + path(LOCK.d, 'nonzero'));
}

// The S M's lockup, for where the mark is too tall: the same rule on the
// symbol's three bars, the name in the top one.
const SM_BARS = [SYM_ROWS[0], SYM_ROWS[0] + SYM_ROWS[1] + SYM_ROWS[2], SYM_H]; // 32, 84, 136
const SM_PITCH = SYM_COLS[1] + SYM_COLS[2]; // a slot and a bar: 52
const LOCK_SM = lockPaths([['name', SM_BARS[0]], ['studio', SM_BARS[1]], ['stockholm', SM_BARS[2]]], SYM_ROWS[0], SYM_W + SM_PITCH);
export function lockupSM({ pixel = 0 } = {}) {
  return svg(LOCK_SM.width, SYM_H, path(px(SYM, pixel)) + path(LOCK_SM.d, 'nonzero'));
}

// Favicons: the S M on the pixel grid, white on black. Its nine columns at
// 2 : 1 (bars 8, 4 and 2 px; slots 4, 2 and 1) and its five rows the same
// (8/4/8/4/8 at 64), centred with a one-sixteenth margin either side. The
// bends and the round slot ends are the mark's curves sampled at pixel
// centres (pixelate, on pixels of 1), so every edge is a whole pixel: at 64
// the slot ends step in and the bends take a stair, at 32 the bends lose one
// corner pixel, at 16 all is square.
const FAV = { 64: 8, 32: 4, 16: 2 };

export function favicon({ size = 32 } = {}) {
  const n = FAV[size] ? size : 32;
  const bar = FAV[n];
  const sl = bar / 2;
  const cols = [bar, sl, bar, sl, bar, sl, bar, sl, bar];
  const rows = [bar, sl, bar, sl, bar];
  const x = (n - (5 * bar + 4 * sl)) / 2;
  const y = (n - (3 * bar + 2 * sl)) / 2;
  const d = pixelate(symbolA({ cols, rows, x, y, bend: sl / 2, stop: bar }), 1); // bends one slot round outside, the M's slots a bar down
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
const REACH = 72; // mark units, either way of the middle (236)
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

/**
 * The motion at t (0 to 1) on any canvas, w × h in its current units: the
 * ground and the mark. For the stage and the MP4. With grid, the mark's grid
 * over it (as grid.js draws the stills'): a slot after every bar on across the
 * stage, the three bands, the block's box. With pixel, its curves in pixels
 * of that many units, as the stills'.
 */
export function frame(ctx, w, h, t, { grid = false, pixel = 0 } = {}) {
  const s = (t % 1) * DURATION; // t 1 draws the same frame as t 0
  ctx.fillStyle = BLACK;
  ctx.fillRect(0, 0, w, h);
  const k = Math.min((h * 0.64) / H, (w * 0.8) / W);
  const x = (w - W * k) / 2, y = (h - H * k) / 2;
  if (grid) {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 41, 184, 0.16)';
    for (let cx = x + (32 - PITCH * Math.ceil(x / (PITCH * k))) * k; cx < w; cx += PITCH * k) ctx.fillRect(cx, 0, 20 * k, h);
    ctx.strokeStyle = 'rgba(255, 41, 184, 0.9)';
    ctx.lineWidth = 1 / (ctx.getTransform?.().a || 1); // one device pixel
    ctx.beginPath();
    for (const by of [0, 32, 220, 252, 440, 472]) { const yy = Math.round(y + by * k) + 0.5; ctx.moveTo(0, yy); ctx.lineTo(w, yy); }
    ctx.rect(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.round(W * k), Math.round(H * k));
    ctx.stroke();
    ctx.restore();
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  ctx.fillStyle = WHITE;
  ctx.fill(new Path2D(px(markAt(s), pixel)), 'evenodd');
  ctx.restore();
}
export const duration = DURATION;

export function motion(el) {
  const stage = canvasStage(el);
  let dead = false;

  const render = (t) => {
    if (dead) return;
    frame(stage.ctx, stage.width, stage.height, t, { grid: document.body.classList.contains('show-grid'), pixel: Number(document.body.dataset.pixel) || 0 });
  };

  const tl = timeline({ duration: DURATION, render });
  stage.onResize(() => tl.redraw());
  tl.ready = Promise.resolve();
  return withCleanup(tl, () => { dead = true; }, stage.destroy);
}
