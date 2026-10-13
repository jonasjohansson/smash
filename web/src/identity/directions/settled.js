// 03 Settled: the original mark with one drawn decision, on its capital A
// (2026-10-13). Jonas, that day: the slant is "not so timeless", he was "not
// sure what it communicates"; what he likes in CM.SUPPLY is "how the a dips a
// bit", which "makes it feel more custom"; the lowercase a "was hard to
// read", so "try both lower and uppercase"; and, seeing both: "capital A for
// sure". So the S, M, S and H are the original's exactly, and the A can give:
// its back round about its counter, its heel round, its left foot settled
// under the baseline (the switches and the slider on the page, KNOBS). At
// START it is the original's A, so the chapter opens on the original; the row
// under the wordmark shows the A three ways at once. The symbol and the
// favicons are the original's (the S M has no A). No motion and no pixels
// of its own: the stage holds the wordmark. Geometry: ./settled/geometry.js.

import { svg, timeline, canvasStage, withCleanup } from '../lib.js';
import { pixelate, W, H, PITCH, REST } from './original/geometry.js';
import { lockPaths } from './original.js';
import { letters, down as downPath, depth, SETTLED, DIPS } from './settled/geometry.js';

export { symbol, favicon } from './original.js';

const BLACK = '#000000';
const WHITE = '#ffffff';

export const info = {
  n: 3,
  slug: 'settled',
  name: 'Settled',
  lane: 'One letter gives',
  idea: 'The original mark, its A the one letter that gives: its back round about its counter, its foot settled under the line.',
  story: '',
  dynamism: '',
  keeps: 'The S, the M, the S and the H, exactly; the block, the slots, the caps and the bends.',
  risk: 'Too deep, the settled foot reads as a melt or a misprint.',
  palette: { ink: BLACK, paper: WHITE, accent: WHITE },
  interactive: '',
  motion: false, // the export takes no frames
};

const path = (d, rule = 'evenodd') => `<path fill="currentColor" fill-rule="${rule}" d="${d}"/>`;
const px = (d, pixel) => (pixel ? pixelate(d, pixel) : d);
// The wordmark for p, round or in pixels (its round back counted from its corner, geometry.js: letterA).
const drawn = (p, pixel) => px(letters(p, pixel), pixel);

// The controls: the A's back and heel, square or round, and how far its foot
// settles. Where they start, and what the files are made at: the original's A.
export const START = { ...SETTLED };
const at = { ...START };
/** A switch between a few options (the page draws a button for each): [label, value]. */
const choice = (key, label, options, value) => ({ key, label, options, value, set: (v) => { at[key] = options.find(([, o]) => String(o) === String(v))?.[1] ?? value; } });
export const KNOBS = [
  choice('back', 'Back', [['Square', 'square'], ['Round', 'round']], START.back),
  choice('heel', 'Heel', [['Square', 'square'], ['Round', 'round']], START.heel),
  { key: 'dip', label: 'Dip', min: DIPS[0], max: DIPS.at(-1), step: 4, value: START.dip, text: (v) => `${v}`, set: (v) => { at.dip = Number(v); } },
];

// The wordmark, its artboard as deep as the foot settles.
const wordmarkOf = (p, pixel) => svg(W, H + depth(p), path(drawn(p, pixel)));
export const wordmark = ({ pixel = 0 } = {}) => wordmarkOf(at, pixel);

// The A three ways, side by side, whatever the controls say: the original's,
// its back round, and its back and heel round with the foot settled 8 (the
// brief's: 8 is the one step of the grid between a quarter and half a slot).
export const wordmarkOriginal = ({ pixel = 0 } = {}) => wordmarkOf(SETTLED, pixel);
export const wordmarkBack = ({ pixel = 0 } = {}) => wordmarkOf({ ...SETTLED, back: 'round' }, pixel);
export const wordmarkSettled = ({ pixel = 0 } = {}) => wordmarkOf({ back: 'round', heel: 'round', dip: 8 }, pixel);
export const VERSIONS = [['wordmarkOriginal', 'The original A'], ['wordmarkBack', 'Its back round'], ['wordmarkSettled', 'Back and heel round, settled 8']];

// The lockup, as the original's: three lines whose capitals fill the mark's
// three solid bands, a pitch after it; the artboard as deep as the foot.
const CAP = 32;
const FOOT = REST.crossbar + REST.gap / 2 - REST.stroke / 2; // the crossbar's foot
const LOCK = lockPaths([['studio', CAP], ['middle', FOOT], ['stockholm', H]], CAP, W + PITCH);
export function lockup({ pixel = 0 } = {}) {
  return svg(LOCK.width, H + depth(at), path(drawn(at, pixel)) + path(LOCK.d, 'nonzero'));
}

// SMASH written down: the letters in a column, a slot apart, a slot and the dip under the A.
export function down({ pixel = 0 } = {}) {
  const D = downPath(at, pixel);
  return svg(D.w, D.h, path(px(D.d, pixel)));
}

// The stage: the wordmark, white on black, held (no motion).
function draw(ctx, w, h) {
  ctx.fillStyle = BLACK;
  ctx.fillRect(0, 0, w, h);
  const mh = H + depth(at);
  const k = Math.min((h * 0.64) / mh, (w * 0.8) / W);
  ctx.save();
  ctx.translate((w - W * k) / 2, (h - mh * k) / 2);
  ctx.scale(k, k);
  ctx.fillStyle = WHITE;
  ctx.fill(new Path2D(drawn(at, Number(document.body.dataset.pixel) || 0)), 'evenodd');
  ctx.restore();
}

export function motion(el) {
  const stage = canvasStage(el);
  const tl = timeline({ duration: 10, render: () => draw(stage.ctx, stage.width, stage.height) });
  stage.onResize(() => tl.redraw());
  tl.ready = Promise.resolve();
  return withCleanup(tl, stage.destroy);
}
