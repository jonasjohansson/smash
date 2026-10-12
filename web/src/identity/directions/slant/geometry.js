// Slant (2026-10-11, after CM.SUPPLY's round 4, Jonas: "the slants instead of
// the uniform inner curves", and "the alternate a"): the original mark with
// every curve cut straight. Every cut falls to the right at one slope, 8 in a
// slot of 20 (p.drop; 0 to 20 in steps of 4), so every point stays on the grid of 4 and the S is the same
// upside down. A closed slot's end is cut across, its high corner where the
// round tip was (a bar from the edge), its obtuse corner rounded 4; an S's
// bend is cut outside, 20 across and 8 down, and stays sharp inside. The
// letters' outer corners are rounded tight, as CM.SUPPLY's (p.outer, at
// p.tension); the stems' sides stay square. The A stays a capital (the
// single-storey a, tried 2026-10-11, read as an o).

import { W, H, PITCH, REST, smMeasures, quarterTurn, SYM_COLS, SYM_ROWS, SYM_H } from '../original/geometry.js';

const f = (n) => String(+n.toFixed(2));
const P = (x, y) => `${f(x)} ${f(y)}`;

/** The arc rounding corner c (from prev, on to next) by r: where it leaves each side, and its sweep. */
function fillet(prev, c, next, r) {
  const unit = (p) => { const dx = p[0] - c[0], dy = p[1] - c[1], l = Math.hypot(dx, dy); return [dx / l, dy / l]; };
  const u = unit(prev), v = unit(next);
  const t = r / Math.tan(Math.acos(Math.max(-1, Math.min(1, u[0] * v[0] + u[1] * v[1]))) / 2);
  // A corner that turns right back (or a side of no length) can't be rounded, and a round longer than a side would overrun it.
  if (!Number.isFinite(t) || t - 1e-9 > Math.min(Math.hypot(prev[0] - c[0], prev[1] - c[1]), Math.hypot(next[0] - c[0], next[1] - c[1]))) {
    throw new Error(`poly: corner ${c[0]} ${c[1]} can't be rounded by ${r}`);
  }
  const turn = (c[0] - prev[0]) * (next[1] - c[1]) - (c[1] - prev[1]) * (next[0] - c[0]);
  return { from: [c[0] + u[0] * t, c[1] + u[1] * t], to: [c[0] + v[0] * t, c[1] + v[1] * t], sweep: turn > 0 ? 1 : 0 };
}

/**
 * A closed outline as path data: corners [x, y], corners rounded by r [x, y, r]
 * (a circle's arc), corners rounded by r at a tension k [x, y, r, k] (a curve
 * whose handles reach k of the way to the corner: 0.55 near a circle, 1 tight
 * into it), or curves to (x, y) ['C', x1, y1, x2, y2, x, y]. The first is a
 * corner. A rounded corner's neighbours are corners, not curves: the round is
 * cut along the straight lines to them.
 */
export function poly(pts) {
  const end = (p) => (p[0] === 'C' ? p.slice(5, 7) : p.slice(0, 2));
  const at = (i) => end(pts[(i + pts.length) % pts.length]);
  return pts.map((p, i) => {
    if (p[0] === 'C') return `C${P(p[1], p[2])} ${P(p[3], p[4])} ${P(p[5], p[6])}`;
    if (!p[2]) return `L${P(p[0], p[1])}`;
    const { from, to, sweep } = fillet(at(i - 1), p, at(i + 1), p[2]);
    if (p[3] == null) return `L${P(...from)}A${f(p[2])} ${f(p[2])} 0 0 ${sweep} ${P(...to)}`;
    const k = p[3], toward = (q) => [q[0] + (p[0] - q[0]) * k, q[1] + (p[1] - q[1]) * k];
    return `L${P(...from)}C${P(...toward(from))} ${P(...toward(to))} ${P(...to)}`;
  }).join('').replace(/^L/, 'M') + 'Z';
}

export { W, H, PITCH };
export const DROP = 0.4; // a cut falls this much of a slot's width across it: 8 in 20
export const DROPS = [0, 0.2, 0.4, 0.6, 0.8, 1]; // the slopes that keep every point on the grid of 4: 0, 4 … 20 in 20
export const ROUND = 0.2; // a cut's obtuse corner (a slot's end, an S's bend), rounded by this much of the slot: 4 in 20
export const CUT = 4; // that round, as the page's slider sets it (Jonas, 2026-10-12: "a slider for the roundedness in the slants"); at most half a slot
export const BAR = 32; // a bar, across and down
export const OUTER = 16; // the letters' outer corners (CM.SUPPLY's round 4; Jonas: "a bit of edge and drama"), rounded this much
export const TENSION = 0.8; // and this tight: their curves' handles reach this far to the corner
export const DIP = 8; // the a: how far its bowl dips under the baseline, as CM.SUPPLY's latest
export const CASES = ['A', 'a'];
/**
 * The mark's parameters: the original's (its slots, stroke, 20), the slot ends
 * rounded, cut 8 in 20, the outer corners rounded; its stems a bar wide, the
 * block 472 tall; the S's crossbar level (tilt 0) and whole (split 0); the A a
 * capital (the a dips DIP).
 */
export const SLANT = { ...REST, round: 1, cut: CUT, drop: DROP, outer: OUTER, tension: TENSION, stem: BAR, height: H, tilt: 0, split: 0, a: 'A', dip: DIP };

/** How far a cut falls across a slot: drop of its width, on the grid (of 4) unless grid is 0 (the favicons' tiny slots). */
const cutOf = (drop, slot, grid = 4) => (grid ? Math.round((drop * slot) / grid) * grid : drop * slot);

/** How far the mark reaches below its block: the a's dip. */
export const depth = (p = SLANT) => (p.a === 'a' ? p.dip ?? DIP : 0);

/**
 * The block's measures (Jonas, 2026-10-12: stems wider, "to match a bit"
 * CM.SUPPLY's latest): eleven stems (p.stem, 32 or wider, in steps of 4) and
 * ten slots (p.stroke, 20, in steps of 4) across; down, the bars stay 32 and
 * the crossbars centred in p.height (in steps of 8), so every point stays on
 * the grid of 4. At the original's, 552 × 472.
 */
export function block(p = SLANT) {
  const stem = p.stem ?? BAR, slot = p.stroke, s = slot / 2;
  // At least tall enough that a slot's top end stays half a slot above its bend: 172 at the original's slots.
  const least = Math.ceil((3 * BAR + 3 * slot + 2 * cutOf(p.drop ?? DROP, slot)) / 8) * 8;
  const h = Math.max(p.height ?? H, least);
  return {
    s, stem, slot,
    c: (i) => stem + s + (stem + slot) * i, // the slots' centres, left to right: 42, 94 …
    W: 11 * stem + 10 * slot,
    H: h,
    up: h / 2 - (BAR + slot) / 2, // the upper crossbar slot's centre: 210
    lo: h / 2 + (BAR + slot) / 2, // the lower one's: 262
    bands: [0, BAR, h / 2 - BAR / 2, h / 2 + BAR / 2, h - BAR, h], // the bars down: 0 32 220 252 440 472
  };
}

/** The letters as path data, one closed outline each (the A's counter a second subpath): S, M, A, S, H. */
export function letterPaths(p = SLANT) {
  const { s, c, up, lo, W, H, stem, slot } = block(p);
  if (!CASES.includes(p.a ?? 'A')) throw new Error(`slant: no a called ${p.a}`);
  const d = cutOf(p.drop ?? DROP, slot); // 8
  const r = p.round ? Math.min(p.cut ?? CUT, s) : 0; // 4: a cut's obtuse corner, at a slot's end and an S's bend
  const bar = BAR;
  const hi = bar; // 32: a top end's high corner, where the round tip was
  const low = H - bar; // 440: a bottom end's low corner
  // An outer corner, rounded at the tension; at most half a letter's width
  // across the top (two rounds share it), and the S's sides, to its bends.
  const Rr = Math.min(p.outer ?? 0, stem + slot / 2, up - s);
  const o = (x, y) => (Rr > 0 ? [x, y, Rr, p.tension ?? TENSION] : [x, y]);

  // An S: the slot from its closed top end turns right at the upper bend and
  // out; the slot in from the left turns down at the lower bend to its closed
  // bottom end. x is its slot's centre, L and R its edges. Its crossbar, the
  // bar between the two, falls tilt across the letter (CM.SUPPLY's long
  // diagonal), so the slots either side of it are wedges; split opens its slot
  // straight through it, the S in two pieces, as theirs.
  const tilt = p.tilt ?? 0;
  const S = (L, x, R) => {
    const band = (X) => H / 2 + (tilt * (X - x)) / (R - L); // the crossbar's centre line
    const top = (X) => band(X) - bar / 2, bot = (X) => band(X) + bar / 2;
    const tr = top(x + s), bl = bot(x - s); // where the crossbar meets the slot
    if (p.split) {
      return poly([o(L, 0), o(R, 0), [R, up - s], [x + s, up - s], [x + s, hi + d, r], [x - s, hi], [x - s, bl], [L, bot(L)]])
        + poly([[x + s, tr], [R, top(R)], o(R, H), o(L, H), [L, lo + s], [x - s, lo + s], [x - s, low - d, r], [x + s, low]]);
    }
    return poly([
      o(L, 0), o(R, 0), [R, up - s], [x + s, up - s],
      [x + s, hi + d, r], [x - s, hi],
      [x - s, tr - d, r], [x + s, tr],
      [R, top(R)], o(R, H), o(L, H), [L, lo + s], [x - s, lo + s],
      [x - s, low - d, r], [x + s, low],
      [x + s, bl + d, r], [x - s, bl],
      [L, bot(L)],
    ]);
  };

  // The M: two slots from the bottom, their top ends cut.
  const M = (L, R) => poly([
    o(L, 0), o(R, 0), [R, H],
    ...[c(3), c(2)].flatMap((x) => [[x + s, H], [x + s, hi + d, r], [x - s, hi], [x - s, H]]),
    [L, H],
  ]);

  // The A, as the original's (Jonas, 2026-10-12: the a "should be an
  // uppercase, it's too illegible as lowercase"): a notch from the bottom up
  // to the crossbar, and the counter above it, its top end cut as the M's.
  const A = (L, x, R) => poly([o(L, 0), o(R, 0), [R, H], [x + s, H], [x + s, lo - s], [x - s, lo - s], [x - s, H], [L, H]])
    + poly([[x + s, hi + d, r], [x - s, hi], [x - s, up + s], [x + s, up + s]]);

  // The a, as CM.SUPPLY's latest (Jonas, 2026-10-12: "lets explore having
  // both capital and lowercase a"): the stem square on the right, the bowl
  // rounded on the left; its slot closed and cut at both ends, a bar above
  // where the bowl meets the stem, a slot (swoop) up from the foot; from there
  // the bowl's base swoops down and left into its corner, dipping p.dip under
  // the baseline. The swoop's handles are set by eye.
  const a = (L, x, R) => {
    const swoop = slot, foot = H + (p.dip ?? DIP);
    const from = [x + s, H - swoop], to = [L + (Rr > 0 ? Rr : 0), foot];
    const w = from[0] - to[0];
    return poly([o(L, 0), [R, 0], [R, H], [x + s, H], from,
      ['C', from[0] - w * 0.45, H - swoop * 0.3, to[0] + w * 0.35, foot, ...to], o(L, foot)])
      + poly([[x + s, hi + d, r], [x - s, hi], [x - s, H - swoop - bar - d, r], [x + s, H - swoop - bar]]);
  };

  // The H, as the original's: no curves.
  const Hh = (L, x, R) => poly([
    [L, 0], [x - s, 0], [x - s, up + s], [x + s, up + s], [x + s, 0], [R, 0],
    [R, H], [x + s, H], [x + s, lo - s], [x - s, lo - s], [x - s, H], [L, H],
  ]);

  return [
    S(0, c(0), c(1) - s),
    M(c(1) + s, c(4) - s),
    (p.a === 'a' ? a : A)(c(4) + s, c(5), c(6) - s),
    S(c(6) + s, c(7), c(8) - s),
    Hh(c(8) + s, c(9), W),
  ];
}

/** The letters as one path, filled evenodd. */
export const letters = (p = SLANT) => letterPaths(p).join('');

// The symbol, the S M, as the original's (read from the modular mark): 9
// columns by 5 rows of bars and slots, 240 × 136. The S's slots run out of
// the top and the bottom, so its only curves are its bends, cut; the M's
// two slots hang from its top bar, their ends cut.
export { SYM_COLS, SYM_ROWS, SYM_W, SYM_H } from '../original/geometry.js'; // 240 × 136
const { stop: SM_STOP } = smMeasures(); // where the M's slots end, from the top
const edges = (sizes, o) => sizes.reduce((a, n) => [...a, a.at(-1) + n], [o]);

/**
 * An S of the S M as path data: its body and the two blocks its slots cut off.
 * L and R its edges; a and b the left edges of its top slot and its bottom
 * one; r its six row edges. The bends are cut outside, sharp inside.
 */
function sPath({ L, R, a, b, r, slot, drop = DROP, o = (x, y) => [x, y], grid = 4, cut = 0 }) {
  const d = cutOf(drop, slot, grid);
  const k = Math.min(cut, slot / 2); // the bends' obtuse corners
  return poly([o(L, r[0]), [a, r[0]], [a, r[2] - d, k], [a + slot, r[2]], [R, r[2]], o(R, r[5]),
    [b + slot, r[5]], [b + slot, r[3] + d, k], [b, r[3]], [L, r[3]]])
    + poly([[a + slot, r[0]], o(R, r[0]), [R, r[1]], [a + slot, r[1]]])
    + poly([[L, r[4]], [b, r[4]], [b, r[5]], o(L, r[5])]);
}

/** The S M's outer corners, rounded by outer at tension, at most a bar or a stem: the four of its S, the M's top two. */
const rounder = (outer, tension, cols, rows) => {
  const R = Math.min(outer, cols[0], rows[0]);
  return (x, y) => (R > 0 ? [x, y, R, tension] : [x, y]);
};

/** The S M's columns with its stems widened, and its slots: bar, slot, bar … */
export const symCols = (stem = BAR, slot = SYM_COLS[1]) => SYM_COLS.map((n, i) => (i % 2 ? slot : stem));
/** Its rows, its slots as the wordmark's: bar, slot, bar, slot, bar. */
export const symRows = (slot = SYM_ROWS[1]) => SYM_ROWS.map((n, i) => (i % 2 ? slot : n));

/** The S M as path data; cols and rows its bands, x and y its top left, stop where the M's slots end (from the top), drop its cuts' slope. */
export function symbol({ cols = SYM_COLS, rows = SYM_ROWS, x = 0, y = 0, stop = SM_STOP, round = 1, cut = CUT, drop = DROP, outer = 0, tension = TENSION, grid = 4 } = {}) {
  const e = edges(cols, x);
  const r = edges(rows, y);
  const slot = cols[1];
  const d = cutOf(drop, slot, grid);
  const k = round ? Math.min(cut, slot / 2) : 0;
  const top = y + stop;
  const o = rounder(outer, tension, cols, rows);
  return sPath({ L: e[0], R: e[3], a: e[1], b: e[1], r, slot, drop, o, grid, cut: k })
    + poly([o(e[4], r[0]), o(e[9], r[0]), [e[9], r[5]],
      ...[[e[7], e[8]], [e[5], e[6]]].flatMap(([a, b]) => [[b, r[5]], [b, top + d, k], [a, top], [a, r[5]]]),
      [e[4], r[5]]]);
}

/** The S alone, as the original's: 84 × 136; wide draws it out by pitches (1: a square); turn lays it on its side; drop its cuts' slope; stem its stems' width. */
export function letterS({ wide = 0, turn = false, drop = DROP, stem = BAR, slot = SYM_COLS[1], outer = 0, tension = TENSION, cut = CUT } = {}) {
  const [bar] = symCols(stem, slot);
  const rows = symRows(slot), h = rows.reduce((t, n) => t + n);
  const o = rounder(outer, tension, [bar], rows);
  const w = 2 * bar + slot + wide * (bar + slot);
  const d = sPath({ L: 0, R: w, a: bar, b: bar + wide * (bar + slot), r: edges(rows, 0), slot, drop, o, cut });
  return turn ? { d: quarterTurn(d, h), w: h, h: w } : { d, w, h };
}
