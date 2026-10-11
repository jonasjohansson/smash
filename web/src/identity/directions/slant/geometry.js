// Slant (2026-10-11, after CM.SUPPLY's round 4, Jonas: "the slants instead of
// the uniform inner curves", and "the alternate a"): the original mark with
// every curve cut straight. Every cut falls to the right at one slope, 8 in a
// slot of 20, so every point stays on the grid of 4 and the S is the same
// upside down. A closed slot's end is cut across, its high corner where the
// round tip was (a bar from the edge), its obtuse corner rounded 4; an S's
// bend is cut outside, 20 across and 8 down, and stays sharp inside.

import { W, H, PITCH, REST, measures } from '../original/geometry.js';

const f = (n) => String(+n.toFixed(2));
const P = (x, y) => `${f(x)} ${f(y)}`;

/** The arc rounding corner c (from prev, on to next) by r: where it leaves each side, and its sweep. */
function fillet(prev, c, next, r) {
  const unit = (p) => { const dx = p[0] - c[0], dy = p[1] - c[1], l = Math.hypot(dx, dy); return [dx / l, dy / l]; };
  const u = unit(prev), v = unit(next);
  const t = r / Math.tan(Math.acos(u[0] * v[0] + u[1] * v[1]) / 2);
  const turn = (c[0] - prev[0]) * (next[1] - c[1]) - (c[1] - prev[1]) * (next[0] - c[0]);
  return { from: [c[0] + u[0] * t, c[1] + u[1] * t], to: [c[0] + v[0] * t, c[1] + v[1] * t], sweep: turn > 0 ? 1 : 0 };
}

/**
 * A closed outline as path data: corners [x, y], corners rounded by r [x, y, r],
 * or curves to (x, y) ['C', x1, y1, x2, y2, x, y]. The first is a corner.
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
export const ROUND = 0.2; // a slot end's obtuse corner, rounded by this much of the slot: 4 in 20
export const SWOOP = 20; // the a (inside, below): how far above the baseline its bowl meets the stem
export const DIP = 12; // the a (below): how far under the baseline its bowl dips
export const A_VERSIONS = ['inside', 'below', 'flat'];
/** The mark's parameters: the original's, the ends rounded, the a inside. */
export const SLANT = { ...REST, round: 1, a: 'inside' };

/** How far a version of the a reaches below the block. */
export const depth = (a) => (a === 'below' ? DIP : 0);

/** The letters as path data, one closed outline each (the a's slot a second subpath): S, M, a, S, H. */
export function letterPaths(p = SLANT) {
  const { s, c, top, bot, up, lo } = measures(p);
  const d = DROP * 2 * s; // 8
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

  // The a (CM.SUPPLY's, round 4): one slot, closed and cut at both ends. Inside,
  // the bowl's base swoops from the stem down to the block's corner; below, it
  // dips under the baseline; flat, the block stays square and the slot ends as
  // the S's. Either way a bar (32) stands under the slot where it meets the stem.
  const A = (L, x, R, kind) => {
    const end = kind === 'flat' ? low : H - SWOOP - bar; // the slot's low corner
    const base = {
      inside: [[x + s, H], [x + s, H - SWOOP], ['C', x - s, H - SWOOP + 8, L + 12, H, L, H]],
      below: [[x + s, H], [x + s, H - SWOOP], ['C', x - s, H - 4, L + 16, H + DIP, L, H + DIP]],
      flat: [[L, H]],
    }[kind];
    return poly([[L, 0], [R, 0], [R, H], ...base])
      + poly([[x + s, hi + d, r], [x - s, hi], [x - s, end - d, r], [x + s, end]]);
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
