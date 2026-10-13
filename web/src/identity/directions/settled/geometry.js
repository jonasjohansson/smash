// Settled (2026-10-13): the original mark, its third letter the one place it
// gives. Jonas, 2026-10-13, on the slant: "not so timeless", "not sure what it
// communicates"; on CM.SUPPLY: "how the a dips a bit", which "makes it feel
// more custom"; then, of a lowercase a and a capital side by side: "capital A
// for sure". So the S, M, S and H are the original's exactly (its round slot
// caps, its quarter-circle S bends, its square outer corners, its grid of 4),
// read from ../original/geometry.js, and only the A changes, three ways:
//
// - back: its top-left corner a quarter circle concentric with its counter's
//   top cap (radius half a slot and a stem, 42, from the cap's centre), so its
//   left side is a stroke round the counter, 32 of ink all the way, the one
//   soft corner in the word;
// - heel: the outer corner of its left foot rounded by one stem (32);
// - dip: that foot settled dip under the baseline (0 to 20, on the grid of 4),
//   the right leg standing on the line, the notch between them square, a
//   vertical step where the foot meets the notch.
//
// Its reason, said about the letter: the A's back is round, so it settles
// under its own weight while its right leg stands. All of it from the
// system's measures (half a slot, a stem, the cap's centre), no free curve,
// nothing on the diagonal.

import { letterPaths, measures, REST, W, H } from '../original/geometry.js';
import { move } from '../slant/geometry.js';

export { W, H };
export const BACKS = ['square', 'round'];
export const HEELS = ['square', 'round'];
export const DIPS = [0, 4, 8, 12, 16, 20]; // on the grid of 4, never more than a slot
/** The original's A: back and heel square, standing on the line. */
export const SETTLED = { back: 'square', heel: 'square', dip: 0 };

const f = (n) => String(+n.toFixed(2));
const P = (x, y) => `${f(x)} ${f(y)}`;

/** The A's own measures: its left edge, its counter's centre line, its right edge, the slot's half, a stem. */
function aMeasures() {
  const { s, c } = measures(REST);
  const L = c(4) + s, x = c(5), R = c(6) - s;
  return { L, x, R, s, stem: x - s - L };
}

function check(p) {
  if (!BACKS.includes(p.back)) throw new Error(`settled: no back called ${p.back}`);
  if (!HEELS.includes(p.heel)) throw new Error(`settled: no heel called ${p.heel}`);
  if (!DIPS.includes(p.dip)) throw new Error(`settled: a dip of ${p.dip} is off the grid of 4 or past a slot`);
}

/**
 * The round back in pixels of q: the points after (L, top), up to the top
 * edge. Cells of q counted from the back's outer corner (L, 0), ink where the
 * cell's centre is inside the circle (centre (x, top), radius r). Its square
 * is 42 across, not a whole number of 4s, so pixelate() (original/geometry.js),
 * which counts from the centre and stretches its cells to fit, would put the
 * back's steps off the grid of 4; counted from the corner, which is on the
 * grid, every step is.
 */
function backSteps(L, x, top, r, q) {
  const pts = [];
  for (let i = 0; L + i * q < x; i++) {
    const cx = L + (i + 0.5) * q;
    let j = 0; // empty cells at the top of this column
    for (let cy = q / 2; cy < top && cx < x && Math.hypot(cx - x, cy - top) > r; cy += q) j++;
    const y = Math.min(j * q, top);
    pts.push([L + i * q, y], [Math.min(L + (i + 1) * q, x), y]);
  }
  return pts.map(([px, py]) => `L${P(px, py)}`).join('');
}

/**
 * The A as path data, in the wordmark's place: its outline clockwise, then its
 * counter, as the original's (filled evenodd). At SETTLED it is the original's
 * A to the character. pixel (4 or 10) draws a round back in pixels counted
 * from its corner (backSteps); pixelate() does the rest.
 */
export function letterA(p = SETTLED, pixel = 0) {
  const q = { ...SETTLED, ...p };
  check(q);
  const { s, top, lo, up } = measures(REST);
  const { L, x, R, stem } = aMeasures();
  const floor = H + q.dip; // where the left foot stands
  // Round, the back is a quarter circle round the counter's top cap: centre
  // (x, top), radius from the cap's centre to the top edge, 42, which is half
  // a slot and a stem, so it meets the top at the counter's centre line.
  const back = top; // 42
  if (q.back === 'round' && Math.abs(x - L - back) > 1e-9) throw new Error('settled: the back is not concentric with the counter');
  let d = q.back === 'round' ? `M${P(x, 0)}` : `M${P(L, 0)}`;
  d += `L${P(R, 0)}L${P(R, H)}L${P(x + s, H)}L${P(x + s, lo - s)}L${P(x - s, lo - s)}L${P(x - s, floor)}`;
  // The heel: a quarter circle a stem round, across the whole foot, from the notch's wall to the back.
  if (q.heel === 'round') d += `A${f(stem)} ${f(stem)} 0 0 1 ${P(L, floor - stem)}`;
  else d += `L${P(L, floor)}`;
  if (q.back === 'round') d += `L${P(L, top)}` + (pixel ? backSteps(L, x, top, back, pixel) : `A${f(back)} ${f(back)} 0 0 1 ${P(x, 0)}`);
  d += 'Z';
  // The counter, unchanged: from the crossbar up to its round top.
  return d + `M${P(x - s, up + s)}L${P(x - s, top)}A${f(s)} ${f(s)} 0 0 1 ${P(x + s, top)}L${P(x + s, up + s)}Z`;
}

/** How far the mark reaches under its baseline. */
export const depth = (p = SETTLED) => ({ ...SETTLED, ...p }).dip;

/** The five letters, one path each: S, M and the original's S and H, the A as set (its back in pixels, at pixel). */
export function letterPathsOf(p = SETTLED, pixel = 0) {
  const out = letterPaths(REST);
  out[2] = letterA(p, pixel);
  return out;
}

/** The wordmark as one evenodd path. */
export const letters = (p = SETTLED, pixel = 0) => letterPathsOf(p, pixel).join('');

/** Each letter's left and right edges in the wordmark. */
export function spans() {
  const { s, c } = measures(REST);
  return [[0, c(1) - s], [c(1) + s, c(4) - s], [c(4) + s, c(6) - s], [c(6) + s, c(8) - s], [c(8) + s, W]];
}

/**
 * SMASH written down: the five letters in a column, each the original's at
 * its own width (the M 136, the rest 84), centred on the M, so each narrow
 * letter's slot runs under the M's middle stem; a slot between letters, and
 * under the A a slot and its dip, so its lowest point stays a slot from the S
 * below. The narrow letters sit half a pitch (26) in, so each is on the grid
 * of 4 in its own place. pixel as letterA's. { d, w, h, lefts, tops }: where
 * each letter starts.
 */
export function down(p = SETTLED, pixel = 0) {
  const q = { ...SETTLED, ...p };
  const { s } = measures(REST);
  const gap = 2 * s; // a slot
  const paths = letterPathsOf(q, pixel), sp = spans();
  const w = Math.max(...sp.map(([a, b]) => b - a));
  let y = 0, d = '';
  const lefts = [], tops = [];
  sp.forEach(([a, b], i) => {
    lefts.push((w - (b - a)) / 2);
    tops.push(y);
    d += move(paths[i], lefts[i] - a, y);
    y += H + gap + (i === 2 ? q.dip : 0);
  });
  return { d, w, h: y - gap, lefts, tops };
}
