// Slant (2026-10-11, after CM.SUPPLY's round 4, Jonas: "the slants instead of
// the uniform inner curves", and "the alternate a"): the original mark with
// every curve cut straight. Every cut falls to the right at one slope, 8 in a
// slot of 20 (p.drop; 0 to 20 in steps of 4), so every point stays on the grid of 4 and the S is the same
// upside down. A closed slot's end is cut across, its high corner where the
// round tip was (a bar from the edge), its obtuse corner rounded 4; an S's
// bend is cut outside, 20 across and 8 down, and stays sharp inside.

import { W, H, PITCH, REST, measures, smMeasures, quarterTurn, SYM_COLS, SYM_ROWS, SYM_H } from '../original/geometry.js';

const f = (n) => String(+n.toFixed(2));
const P = (x, y) => `${f(x)} ${f(y)}`;

/** The arc rounding corner c (from prev, on to next) by r: where it leaves each side, and its sweep. */
function fillet(prev, c, next, r) {
  const unit = (p) => { const dx = p[0] - c[0], dy = p[1] - c[1], l = Math.hypot(dx, dy); return [dx / l, dy / l]; };
  const u = unit(prev), v = unit(next);
  const t = r / Math.tan(Math.acos(Math.max(-1, Math.min(1, u[0] * v[0] + u[1] * v[1]))) / 2);
  // A corner that turns right back (or a side of no length) can't be rounded, and a round longer than a side would overrun it.
  if (!Number.isFinite(t) || t > Math.min(Math.hypot(prev[0] - c[0], prev[1] - c[1]), Math.hypot(next[0] - c[0], next[1] - c[1]))) {
    throw new Error(`poly: corner ${c[0]} ${c[1]} can't be rounded by ${r}`);
  }
  const turn = (c[0] - prev[0]) * (next[1] - c[1]) - (c[1] - prev[1]) * (next[0] - c[0]);
  return { from: [c[0] + u[0] * t, c[1] + u[1] * t], to: [c[0] + v[0] * t, c[1] + v[1] * t], sweep: turn > 0 ? 1 : 0 };
}

/**
 * A closed outline as path data: corners [x, y], corners rounded by r [x, y, r],
 * or curves to (x, y) ['C', x1, y1, x2, y2, x, y]. The first is a corner.
 * A rounded corner's neighbours are corners, not curves: the round is cut
 * along the straight lines to them.
 */
export function poly(pts) {
  const end = (p) => (p[0] === 'C' ? p.slice(5, 7) : p.slice(0, 2));
  const at = (i) => end(pts[(i + pts.length) % pts.length]);
  return pts.map((p, i) => {
    if (p[0] === 'C') return `C${P(p[1], p[2])} ${P(p[3], p[4])} ${P(p[5], p[6])}`;
    if (!p[2]) return `L${P(p[0], p[1])}`;
    const { from, to, sweep } = fillet(at(i - 1), p, at(i + 1), p[2]);
    return `L${P(...from)}A${f(p[2])} ${f(p[2])} 0 0 ${sweep} ${P(...to)}`;
  }).join('').replace(/^L/, 'M') + 'Z';
}

export { W, H, PITCH };
export const DROP = 0.4; // a cut falls this much of a slot's width across it: 8 in 20
export const DROPS = [0, 0.2, 0.4, 0.6, 0.8, 1]; // the slopes that keep every point on the grid of 4: 0, 4 … 20 in 20
export const ROUND = 0.2; // a slot end's obtuse corner, rounded by this much of the slot: 4 in 20
export const SWOOP = 20; // the a: how far above the baseline its bowl meets the stem
export const DIP = 12; // the a (below): how far under the baseline its bowl dips
export const SHOULDER = 40; // the a: how far below the stem's top its bowl's top starts, at the left
export const A_VERSIONS = ['inside', 'below'];
/** The mark's parameters: the original's, the ends rounded, cut 8 in 20, the a inside. */
export const SLANT = { ...REST, round: 1, drop: DROP, a: 'inside' };

/** How far a version of the a reaches below the block. */
export const depth = (a) => (a === 'below' ? DIP : 0);

/** The letters as path data, one closed outline each (the a's slot a second subpath): S, M, a, S, H. */
export function letterPaths(p = SLANT) {
  if (!A_VERSIONS.includes(p.a)) throw new Error(`slant: no a called ${p.a}`);
  const { s, c, top, bot, up, lo } = measures(p);
  const d = (p.drop ?? DROP) * 2 * s; // 8
  const r = p.round ? ROUND * 2 * s : 0; // 4
  const hi = top - s; // 32: a top end's high corner, where the round tip was
  const low = bot + s; // 440: a bottom end's low corner
  const bar = PITCH - 2 * s; // 32

  // An S: the slot from its closed top end turns right at the upper bend and
  // out; the slot in from the left turns down at the lower bend to its closed
  // bottom end. x is its slot's centre, L and R its edges.
  const S = (L, x, R) => poly([
    [L, 0], [R, 0], [R, up - s], [x + s, up - s],
    [x + s, hi + d, r], [x - s, hi],
    [x - s, up + s - d], [x + s, up + s],
    [R, up + s], [R, H], [L, H], [L, lo + s], [x - s, lo + s],
    [x - s, low - d, r], [x + s, low],
    [x + s, lo - s + d], [x - s, lo - s],
    [L, lo - s],
  ]);

  // The M: two slots from the bottom, their top ends cut.
  const M = (L, R) => poly([
    [L, 0], [R, 0], [R, H],
    ...[c(3), c(2)].flatMap((x) => [[x + s, H], [x + s, hi + d, r], [x - s, hi], [x - s, H]]),
    [L, H],
  ]);

  // The a (CM.SUPPLY's, round 4; the shoulder, Jonas 2026-10-12: "5 looks
  // best"): one slot, closed and cut at both ends. The stem stands to the
  // block's top; the bowl's top falls away from it, SHOULDER lower at the left,
  // so it reads as an a, not an o. At the foot, inside, the bowl's base swoops
  // from the stem down to the block's corner; below, it dips under the
  // baseline. A bar (32) under the shoulder and above where the bowl meets the
  // stem holds the slot. The curves' control points are set by eye, to
  // CM.SUPPLY's drawing.
  const A = (L, x, R, kind) => {
    const base = {
      inside: ['C', x - s, H - SWOOP + 8, L + 12, H, L, H],
      below: ['C', x - s, H - 4, L + 16, H + DIP, L, H + DIP],
    }[kind];
    return poly([[L, SHOULDER], [x + s, 0], [R, 0], [R, H], [x + s, H], [x + s, H - SWOOP], base])
      + poly([[x + s, SHOULDER + bar + d, r], [x - s, SHOULDER + bar], [x - s, H - SWOOP - bar - d, r], [x + s, H - SWOOP - bar]]);
  };

  // The H, as the original's: no curves.
  const Hh = (L, x, R) => poly([
    [L, 0], [x - s, 0], [x - s, up + s], [x + s, up + s], [x + s, 0], [R, 0],
    [R, H], [x + s, H], [x + s, lo - s], [x - s, lo - s], [x - s, H], [L, H],
  ]);

  return [
    S(0, c(0), c(1) - s),
    M(c(1) + s, c(4) - s),
    A(c(4) + s, c(5), c(6) - s, p.a),
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
function sPath({ L, R, a, b, r, slot, drop = DROP }) {
  const d = drop * slot;
  return poly([[L, r[0]], [a, r[0]], [a, r[2] - d], [a + slot, r[2]], [R, r[2]], [R, r[5]],
    [b + slot, r[5]], [b + slot, r[3] + d], [b, r[3]], [L, r[3]]])
    + poly([[a + slot, r[0]], [R, r[0]], [R, r[1]], [a + slot, r[1]]])
    + poly([[L, r[4]], [b, r[4]], [b, r[5]], [L, r[5]]]);
}

/** The S M as path data; cols and rows its bands, x and y its top left, stop where the M's slots end (from the top), drop its cuts' slope. */
export function symbol({ cols = SYM_COLS, rows = SYM_ROWS, x = 0, y = 0, stop = SM_STOP, round = 1, drop = DROP } = {}) {
  const e = edges(cols, x);
  const r = edges(rows, y);
  const slot = cols[1];
  const d = drop * slot;
  const k = round ? ROUND * slot : 0;
  const top = y + stop;
  return sPath({ L: e[0], R: e[3], a: e[1], b: e[1], r, slot, drop })
    + poly([[e[4], r[0]], [e[9], r[0]], [e[9], r[5]],
      ...[[e[7], e[8]], [e[5], e[6]]].flatMap(([a, b]) => [[b, r[5]], [b, top + d, k], [a, top], [a, r[5]]]),
      [e[4], r[5]]]);
}

/** The S alone, as the original's: 84 × 136; wide draws it out by pitches (1: a square); turn lays it on its side; drop its cuts' slope. */
export function letterS({ wide = 0, turn = false, drop = DROP } = {}) {
  const [bar, slot] = SYM_COLS;
  const w = 2 * bar + slot + wide * (bar + slot);
  const d = sPath({ L: 0, R: w, a: bar, b: bar + wide * (bar + slot), r: edges(SYM_ROWS, 0), slot, drop });
  return turn ? { d: quarterTurn(d, SYM_H), w: SYM_H, h: w } : { d, w, h: SYM_H };
}
