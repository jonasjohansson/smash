// 02 Slant: the mark with every curve cut straight (2026-10-11, after
// CM.SUPPLY's round 4; Jonas: "i thought it was interesting with the slants
// instead of the uniform inner curves, i also thought the alternate a was
// interesting"). The block, the bars, the slots and the crossbars are the
// original's; the slot ends and the S bends are cut at one slope, 8 in 20, and
// the A is a single-storey a, three ways (inside, below, flat). The symbol,
// the S alone, the lockups and the favicons follow. No motion yet and no
// pixels: the stage holds the wordmark. Geometry: ./slant/geometry.js.

import { svg, timeline, canvasStage, withCleanup } from '../lib.js';
import { letters, letterS, symbol as symbolPath, depth, SLANT, W, H, PITCH, SYM_W, SYM_H, SYM_COLS, SYM_ROWS } from './slant/geometry.js';
import { lockPaths } from './original.js';

const BLACK = '#000000';
const WHITE = '#ffffff';

export const info = {
  n: 2,
  slug: 'slant',
  name: 'Slant',
  lane: 'Cut the curves',
  idea: 'The original mark with every curve cut straight at one slope, and a single-storey a.',
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

// The wordmark, with the a inside, and the a's three versions to compare (the
// page shows them in a row of their own). Below reaches 12 under the block,
// so its artboard does too.
const MARK = letters(SLANT);
const wordmarkWith = (a) => svg(W, H + depth(a), path(letters({ ...SLANT, a })));
export const wordmark = () => wordmarkWith(SLANT.a);
export const wordmarkInside = () => wordmarkWith('inside');
export const wordmarkBelow = () => wordmarkWith('below');
export const wordmarkFlat = () => wordmarkWith('flat');
export const VERSIONS = [['wordmarkInside', 'a, inside'], ['wordmarkBelow', 'a, below'], ['wordmarkFlat', 'a, flat']];

// The S M and the S alone, as the original's.
const SYM = symbolPath();
export const symbol = () => svg(SYM_W, SYM_H, path(SYM));
const S = letterS();
const S_TURNED = letterS({ turn: true });
const S_SQUARE = letterS({ wide: 1 });
export const s = () => svg(S.w, S.h, path(S.d));
export const sTurned = () => svg(S_TURNED.w, S_TURNED.h, path(S_TURNED.d));
export const sSquare = () => svg(S_SQUARE.w, S_SQUARE.h, path(S_SQUARE.d));

// The lockups, as the original's: three lines whose capitals fill the mark's
// three solid bands, a pitch after it.
const CAP = 32;
const FOOT = SLANT.crossbar + SLANT.gap / 2 - SLANT.stroke / 2;
const LOCK = lockPaths([['studio', CAP], ['middle', FOOT], ['stockholm', H]], CAP, W + PITCH);
export const lockup = () => svg(LOCK.width, H, path(MARK) + path(LOCK.d, 'nonzero'));
const SM_BARS = [SYM_ROWS[0], SYM_ROWS[0] + SYM_ROWS[1] + SYM_ROWS[2], SYM_H];
const LOCK_SM = lockPaths([['name', SM_BARS[0]], ['studio', SM_BARS[1]], ['stockholm', SM_BARS[2]]], SYM_ROWS[0], SYM_W + SYM_COLS[1] + SYM_COLS[2]);
export const lockupSM = () => svg(LOCK_SM.width, SYM_H, path(SYM) + path(LOCK_SM.d, 'nonzero'));

// Favicons: the S M at the original's measures (bars 8, 4 and 2 px; slots half
// that), centred. Its cuts are diagonals, so it is drawn smooth, not on pixels.
const FAV = { 64: 8, 32: 4, 16: 2 };
export function favicon({ size = 32 } = {}) {
  const n = FAV[size] ? size : 32;
  const bar = FAV[n];
  const sl = bar / 2;
  const cols = [bar, sl, bar, sl, bar, sl, bar, sl, bar];
  const rows = [bar, sl, bar, sl, bar];
  const d = symbolPath({ cols, rows, x: (n - (5 * bar + 4 * sl)) / 2, y: (n - (3 * bar + 2 * sl)) / 2, stop: bar });
  return svg(n, n, `<rect width="${n}" height="${n}" fill="${BLACK}"/><path fill="${WHITE}" fill-rule="evenodd" d="${d}"/>`);
}

// The stage: the wordmark, white on black, held (no motion yet).
function draw(ctx, w, h) {
  ctx.fillStyle = BLACK;
  ctx.fillRect(0, 0, w, h);
  const k = Math.min((h * 0.64) / H, (w * 0.8) / W);
  ctx.save();
  ctx.translate((w - W * k) / 2, (h - H * k) / 2);
  ctx.scale(k, k);
  ctx.fillStyle = WHITE;
  ctx.fill(new Path2D(MARK), 'evenodd');
  ctx.restore();
}

export function motion(el) {
  const stage = canvasStage(el);
  const tl = timeline({ duration: 10, render: () => draw(stage.ctx, stage.width, stage.height) });
  stage.onResize(() => tl.redraw());
  tl.ready = Promise.resolve();
  return withCleanup(tl, stage.destroy);
}
