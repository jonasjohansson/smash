// Slant (2026-10-11, after CM.SUPPLY's round 4, Jonas: "the slants instead of
// the uniform inner curves", and "the alternate a"): the original mark with
// every curve cut straight. Every cut falls to the right at one slope, 8 in a
// slot of 20 (p.drop; 0 to 20 in steps of 4), so every point stays on the grid of 4 and the S is the same
// upside down (unless its crossbar rises, p.rise). A closed slot's end is cut
// across, its high corner where the round tip was (a bar from the edge), its obtuse corner rounded 4; an S's
// bend is cut outside, 20 across and 8 down, and stays sharp inside. The
// letters' outer corners are rounded tight, as CM.SUPPLY's (p.outer, at
// p.tension); the stems' sides stay square. The A stays a capital (the
// single-storey a, tried 2026-10-11, read as an o).

import { W, H, PITCH, REST, smMeasures, quarterTurn, SYM_COLS, SYM_ROWS, SYM_H } from '../original/geometry.js';
import { flatten, inside, reach, strip, area, clearance } from './clip.js';

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
// A split S's blade (p.blade; the design panel, round 2, 2026-10-13): stepping a bar across its kerf, as it
// was, or along one line straight through it (sLetter).
export const BLADES = ['step', 'line'];
/**
 * The mark's parameters: the original's (its slots, stroke, 20), the slot ends
 * rounded, cut 8 in 20, the outer corners rounded; its stems a bar wide, the
 * block 472 tall; the S's crossbar level (tilt 0) and whole (split 0); the A a
 * capital (the a dips DIP).
 */
export const SLANT = { ...REST, round: 1, cut: CUT, drop: DROP, outer: OUTER, tension: TENSION, stem: BAR, height: H, tilt: 0, split: 0, a: 'A', dip: 0 };

/** How far a cut falls across a slot: drop of its width, on the grid (of 4) unless grid is 0 (the favicons' tiny slots; the letters' p.grid). */
const cutOf = (drop, slot, grid = 4) => (grid ? Math.round((drop * slot) / grid) * grid : drop * slot);

/** How far the mark reaches below its block: the a's dip, or the A's when it has one. */
export const depth = (p = SLANT) => ((p.a === 'a' || p.dip) && per(p, 2).dip !== 0 ? p.dip ?? DIP : 0);

/**
 * The block's measures (Jonas, 2026-10-12: stems wider, "to match a bit"
 * CM.SUPPLY's latest): eleven stems (p.stem, 32 or wider, in steps of 4) and
 * ten slots (p.stroke, 20, in steps of 4) across; down, the bars stay 32 and
 * the crossbars centred in p.height (in steps of 8; or risen, p.rise), so
 * every point stays on the grid of 4. At the original's, 552 × 472.
 */
export const GAPS = [1, 4, 6, 8]; // the columns between letters (the rest are slots in them): S | M M | A | S | H

export function block(p = SLANT) {
  const stem = p.stem ?? BAR, slot = p.stroke, s = slot / 2, gap = p.space ?? slot; // (p.gap is the original's crossbar gap, 52)
  // The ten columns, left to right, each after a stem: the letters' slots, or
  // the gaps between them (p.gap, Jonas 2026-10-12: "keep the height and stem
  // thickness, but change the gap"); as wide as the slots unless set.
  const widths = Array.from({ length: 10 }, (_, i) => (GAPS.includes(i) ? gap : slot));
  const lefts = widths.reduce((e, w, i) => [...e, e[i] + w + stem], [stem]);
  // The bars over the slots' top ends and under their bottom ends (p.ceil,
  // Jonas 2026-10-12: "lower the gaps, ie increase the ceiling"); the
  // crossbars stay a bar.
  const ceil = p.ceil ?? BAR;
  // The crossbars risen above the middle (p.rise; the design panel, round 1,
  // 2026-10-12: an optical crossbar, as type sets its E's and H's a little
  // high): their centre rise above h / 2, in steps of 4, so the upper half is
  // the shorter. Never below the middle.
  const rise = Math.max(0, p.rise ?? 0);
  // At least tall enough that a slot's top end stays half a slot above its bend, in the shorter, upper
  // half: 176 at the original's slots, and twice the rise more.
  const least = Math.ceil((2 * ceil + BAR + 3 * slot + 2 * cutOf(p.drop ?? DROP, slot, p.grid) + 2 * rise) / 8) * 8;
  const h = Math.max(p.height ?? H, least);
  const mid = h / 2 - rise; // the crossbars' centre: 236
  return {
    s, stem, slot, gap, ceil, rise, mid,
    c: (i) => lefts[i] + widths[i] / 2, // the columns' centres, left to right: 42, 94 …
    left: (i) => lefts[i], right: (i) => lefts[i] + widths[i], // and their edges
    columns: widths.map((w, i) => [lefts[i], w]),
    W: 11 * stem + 6 * slot + 4 * gap,
    H: h,
    up: mid - (BAR + slot) / 2, // the upper crossbar slot's centre: 210
    lo: mid + (BAR + slot) / 2, // the lower one's: 262
    bands: [0, ceil, mid - BAR / 2, mid + BAR / 2, h - ceil, h], // the bars down: 0 32 220 252 440 472
  };
}

/**
 * Each letter's own switches, S M A S H (Jonas, 2026-10-12: "maybe i can turn
 * off or on some of the tilts and other settings per letter"): its slot ends
 * cut (off: square), its outer corners rounded at the top (round) and at the
 * base (base; Jonas: "so the top and bottom border radius match"), the S's
 * tilt and split and its slot open at both ends (open; as the S M's: "the gaps
 * in the S goes all the way up"), the A's dip. A letter takes a setting only
 * where its switch is on. The H has no slot ends, and its round and base are
 * its right corners, the word's (Jonas: "can the right top and bottom of H
 * also be rounded"), and its left too with both ("setting also for both
 * corners of the H"). The A's and the H's tilt (off) carry the S's angle
 * through their crossbars (barFall). The A's apex and the H's bar step (off;
 * the design panel, round 3, 2026-10-13: the A and the H told apart) peak the
 * A's counter head and open a window under it, and step the H's lower slot
 * aside under a bar at least a slot thick (barOf).
 */
export const PER = [
  { cut: 1, round: 1, base: 1, tilt: 1, split: 1, open: 0 },
  { cut: 1, round: 1, base: 0 },
  { cut: 1, round: 1, base: 0, dip: 1, tilt: 0, apex: 0 },
  { cut: 1, round: 1, base: 1, tilt: 1, split: 1, open: 0 },
  { round: 1, base: 1, both: 0, tilt: 0, barStep: 0 },
];
const per = (p, i) => ({ ...PER[i], ...(p.per?.[i] ?? {}) });
/** Whether an S (its switches q) is split along one line (p.blade; sLetter). */
const lined = (p, q) => !!(q.split && p.split && p.blade === 'line');

/**
 * Two tiers of corners (p.corners; the design panel, round 2, 2026-10-13: a
 * machined slab, generous at the word's ends, tight break edges inside): on,
 * the mark's four extreme corners round p.endRound and every other corner
 * p.innerRound, each following p.outer where unset, at the one tension. Which
 * corners are the ends, by p.ends, a letter's clockwise from its top left (0:
 * none): the word's, the first S's left and the H's right; Down's, its top
 * S's top and its H's feet (both, whatever its Both switch says); the S M
 * from the wordmark's cells, its S's left and its M's right (its foot as its
 * Base switch says). A mark's ends round alike (markHeld), and its inner
 * corners never past them. Off, every corner rounds p.outer, as it was.
 */
export const ENDS = {
  word: [[1, 0, 0, 1], 0, 0, 0, [0, 1, 1, 0]],
  down: [[1, 1, 0, 0], 0, 0, 0, [0, 0, 1, 1]],
  cells: [[1, 0, 0, 1], [0, 1, 1, 0], 0, 0, 0],
};
/** The two tiers, { end, inner }, when p.corners has them; else null. */
const tiers = (p) => (p.corners ? { end: p.endRound ?? p.outer ?? 0, inner: p.innerRound ?? p.outer ?? 0 } : null);

/**
 * How far a corner can round past a point a across and b down from it (in its
 * own reckoning) and keep it: a round r cuts off what lies outside its circle,
 * whose centre is r in from both sides, so the point stays while
 * (r - a)² + (r - b)² ≤ r², or a or b is past r: r at most a + b + √(2ab). A
 * side's end (a 0) gives its length. keep, the material the round leaves there
 * at least that thick (the point as if keep further in). Along a straight side
 * the least is at one of its ends (the bound is concave), so its ends suffice.
 */
const clear = (a, b, keep = 0) => keep + Math.max(0, a - keep) + Math.max(0, b - keep) + Math.sqrt(2 * Math.max(0, a - keep) * Math.max(0, b - keep));

/**
 * A corner's round at tension k (poly's), as a cubic one unit across: in from
 * the corner u along the side it leaves and v down the side it meets, from
 * (1, 0) to (0, 1), its handles k of the way to the corner. bez a cubic's
 * point at t; tAt where its coordinate j (running one way) reaches c; piece
 * its part from t0 to t1, as its four points.
 */
const unitRound = (k) => [[1, 0], [1 - k, 0], [0, 1 - k], [0, 1]];
const bez = (Q, t) => { const u = 1 - t; return [0, 1].map((j) => u * u * u * Q[0][j] + 3 * u * u * t * Q[1][j] + 3 * u * t * t * Q[2][j] + t * t * t * Q[3][j]); };
function tAt(Q, j, c) {
  const up = Q[3][j] > Q[0][j];
  if (up ? c <= Q[0][j] : c >= Q[0][j]) return 0;
  if (up ? c >= Q[3][j] : c <= Q[3][j]) return 1;
  let lo = 0, hi = 1;
  for (let n = 0; n < 60; n++) { const m = (lo + hi) / 2; if ((bez(Q, m)[j] < c) === up) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const split = ([a, b, c, d], t) => { const ab = lerp(a, b, t), bc = lerp(b, c, t), cd = lerp(c, d, t), m = lerp(ab, bc, t), n = lerp(bc, cd, t), e = lerp(m, n, t); return [[a, ab, m, e], [e, n, cd, d]]; };
const piece = (Q, t0, t1) => { const R = t0 > 0 ? split(Q, t0)[1] : Q; return t1 < 1 ? split(R, (t1 - t0) / (1 - t0))[0] : R; };

/** How deep a round r at tension k cuts d in from the side it meets (0 past its reach). */
function cutAt(r, d, k) {
  if (d >= r) return 0;
  const Q = unitRound(k);
  return r * bez(Q, tAt(Q, 0, d / r))[1];
}

/**
 * The largest round at tension k that cuts at most deep, d in from the side
 * it meets (at least d, which cuts nothing there): the deeper the larger,
 * so found by halving.
 */
function reachTo(d, deep, k) {
  if (deep <= 0) return d;
  let lo = d, hi = 2 * d + 2 * deep;
  while (cutAt(hi, d, k) <= deep && hi < 1e6) hi *= 2;
  for (let n = 0; n < 60; n++) { const m = (lo + hi) / 2; if (cutAt(m, d, k) <= deep) lo = m; else hi = m; }
  return lo;
}

/**
 * End corner k (clockwise from the top left) of letter i: how far it rounds,
 * at most (two tiers). Unlike the inner corners' it may pass a stem: then it
 * sweeps across the letter's slot head, as far as the outline holds it
 * without crossing itself, a quarter of a bar of material kept over the slot's
 * end. An S's top and base are shared with the corner across them, its sides
 * run to its crossbar slots (the long one, beside the blade's end, room for it
 * level: the blade gives way, fallOf); the M's and the H's sides run the
 * height, shared with the corner along them. The H's slots are open at its
 * top and its base, so its end sweeps on over the slot onto its other stem
 * (the design panel's review, round 2, 2026-10-13: at one stem, the word's
 * right ends were half its left), trimming that stem's corner from the same
 * centre (Hh); it is shared with the corner across the H, and its own stem's
 * inner side keeps a quarter of a bar beside the crossbar. An open S's or
 * the M's foot stands on one stem. R the letter's other corners, E which are
 * ends.
 */
function endMost(p, i, k, R, E) {
  const { stem, slot, ceil, H, mid, rise, s, up, lo } = block(p), q = per(p, i);
  const h = holdOf(p, i), sv = h ? h.sv : s, keep = BAR / 4;
  const S = i === 0 || i === 3, open = S && !!q.open, w = i === 1 ? 3 * stem + 2 * slot : 2 * stem + slot;
  const d = !open && q.cut ? cutOf(p.drop ?? DROP, slot, p.grid) : 0;
  const across = [1, 0, 3, 2][k], along = [3, 2, 1, 0][k];
  const share = (n, length) => (E[n] ? length / 2 : length - R[n]); // a side two corners round
  const most = [];
  // (Its crossbar tilted, barFall, the room to its high edge, at either side of the slot. Its bar a slot thick
  // and its lower slot stepped aside, barOf: the room to the bar's edge, and at its base the stem beside the
  // slot, the step narrower at its right and wider at its left, the far corner the step's run lower.)
  if (i === 4) {
    const { h: bh, step } = barOf(p, 4), grow = (bh - BAR) / 2, f = barFall(p, 4, true);
    most.push(share(across, w), reachTo([stem, stem, stem - step, stem + step][k], (k < 2 ? up + s - grow : H - lo + s - grow) - keep - f * (k < 2 ? 1 : 1 + step / s), p.tension ?? TENSION));
  } else if (open || (i === 1 && k > 1)) most.push(stem); // on one stem (a foot): a slot runs out beside it
  else {
    most.push(share(across, w));
    // The slot head beside the corner, its ends ceil and ceil + d from the top or the base: its high corner
    // under the corner's own stem (an S's tl and br, the M's tl), or both, its cut end falling away from it.
    // The A's apex (apexOf) peaks on the slot's centre line, its ends both the peak's fall lower.
    const high = k === 0 || (S && k === 2);
    if (apexOf(p, i) && k < 2) most.push(Math.min(clear(stem, ceil + peak(p), keep), clear(stem + s, ceil, keep)));
    else most.push(high ? clear(stem, ceil, keep) : Math.min(clear(stem, ceil + d, keep), clear(stem + slot, ceil, keep)));
  }
  if (S) {
    // Its sides: beside the blade's high (tl) and low (br) end, at least room for it level (split along one
    // line, its pieces' sides end at its centre line, half a bar short: fallOf); the others to the crossbar
    // slots' far sides, the upper shorter when risen.
    const long = H / 2 - Math.abs(rise) + (lined(p, q) ? 0 : BAR / 2) - 4;
    most.push([long, mid - BAR / 2 - 2 * sv, long, H - mid - BAR / 2 - 2 * sv][k]);
    if (h) most.push(h.top); // held, its rounds give way rather than its angle
  } else most.push(share(along, H));
  return Math.max(0, Math.min(...most));
}

/**
 * Letter i's corners in one tier, or its inner corners in two, each at most
 * cap: Rr at its top, Rb at its base, radii all four (rounds); ends, which
 * of its corners are the mark's ends and drawn (ENDS: an H's left ones as its
 * right ones, whatever Both says, as they are the mark's extreme corners).
 */
function innerOf(p, i, cap = Infinity) {
  const { s, up, lo, H, stem, slot, ceil } = block(p);
  // Held (holdOf), an S's corners at most till its grown crossbar slots: its top one's top, the shorter side.
  const h = holdOf(p, i);
  const T = tiers(p);
  const R0 = Math.min(T ? T.inner : p.outer ?? 0, cap, stem + slot / 2, up - s, H - lo - s, h ? h.top : Infinity); // (risen, the upper side the shorter)
  const q = per(p, i);
  const legs = i === 1 || i === 2 || i === 4; // the M, the A and the H stand on stems
  // The M's top corners pass over its slots' tops only where the round stays above them: a round R over a stem t
  // is at R - sqrt(2Rt - t²) at the slot's side, at most the ceiling (less one, for the tension's curve) while R is
  // at most t + c + sqrt(2tc). A squeezed M's thin stems (the design panel's review, round 2, 2026-10-13: stems 32,
  // slots 60, ceiling 16) would otherwise take the round through its own slots.
  const c = ceil - 1, Rm = i === 1 ? stem + c + Math.sqrt(2 * stem * c) : Infinity;
  // (The H's lower slot stepped aside, barOf, its base's right stem the step narrower: its feet round at most a
  // stem still, the right one passing its stem over the slot's foot as an end does, hEdge, as far as it keeps a
  // quarter of a bar under the crossbar's edge: endMost.)
  const t = i === 4 ? barOf(p, 4).step : 0;
  const foot = t ? Math.min(stem, endMost(p, 4, 2, [0, 0, 0, 0], [0, 0, 0, 0])) : stem;
  const Rr = q.round ? (i === 4 || q.open ? Math.min(R0, stem) : Math.min(R0, Rm)) : 0, Rb = q.base ? (legs || q.open ? Math.min(R0, foot) : R0) : 0;
  const lower = i === 2 && p.a === 'a';
  // Down carved as one block (p.seam; down): a side that meets the next letter across a slot squares its corners,
  // and the H's feet, the column's foot, round as a pair whatever its Both switch says, as the top S's top does.
  const on = i === 4 ? [q.both && q.round, q.round, q.base, (q.both || p.seam) && q.base] : lower ? [q.round, 0, q.base, q.round] : [q.round, q.round, q.base, q.base];
  const [top, base] = p.seam ?? [false, false];
  const radii = on.map((o, k) => (o && !(k < 2 ? top : base) ? (k < 2 || (lower && k === 3) ? Rr : Rb) : 0));
  const E = T && !lower && ENDS[p.ends ?? 'word']?.[i];
  const drawn = (i === 4 ? [q.round, q.round, q.base, q.base] : on).map((o, k) => o && !(k < 2 ? top : base));
  return { Rr: top ? 0 : Rr, Rb: base ? 0 : Rb, radii, E, ends: E ? [0, 1, 2, 3].filter((k) => E[k] && drawn[k]) : [] };
}

/** How far letter i's ends round at most, the least any of them holds (endMost; Infinity with none). */
function endHeld(p, i) {
  const { radii, E, ends } = innerOf(p, i);
  return Math.min(...ends.map((k) => endMost(p, i, k, radii, E)));
}

/**
 * How far the mark's ends round at most, all alike (as one tier rounds an
 * S's four; the design panel's review, round 2, 2026-10-13: the word's left
 * ends 148 and its right 72, Down's top 56 and its feet 118): the least its
 * letters' ends hold. p.endCap where the mark sets it (Down, the S M from the
 * cells: their letters drawn each at its own measures).
 */
const markHeld = (p) => p.endCap ?? Math.min(...(ENDS[p.ends ?? 'word'] ?? []).map((E, j) => (E ? endHeld(p, j) : Infinity)));

/**
 * Letter i's outer corners' rounds, as its switches have them: Rr at its top,
 * Rb at its base. At most half a letter's width across the top (two rounds
 * share it) and the S's sides to its bends; where a corner stands on one stem
 * (a foot, the H, an open S's arms), at most a stem. radii, all four,
 * clockwise from the top left (the box a frame's cell follows): the H's right
 * corners, its left with both; the a's stem square at its top, its bowl's
 * corner with its top. In two tiers (tiers), Rr and Rb are the inner corners',
 * and the ends round on their own, the mark's all alike (markHeld). The inner
 * corners round at most what the ends hold, so the outline never makes the
 * ends the tighter (the design panel's review, round 2, 2026-10-13: thin
 * stems, wide slots, ends 59.6 against inner corners of 62); set lower by
 * hand, they are.
 */
export function rounds(p, i) {
  const T = tiers(p), held = T ? markHeld(p) : Infinity;
  const { Rr, Rb, radii, ends } = innerOf(p, i, held);
  for (const k of ends) radii[k] = Math.min(T.end, held);
  return { Rr, Rb, radii };
}

/** Letter i's four outer corners' rounds, clockwise from the top left (the box a frame's cell follows). */
export const letterRadii = (p, i) => rounds(p, i).radii;

/** The word's four outer corners' rounds, clockwise from the top left: the first S's left, the H's right. */
export function wordRadii(p = SLANT) {
  const S = letterRadii(p, 0), Hr = letterRadii(p, 4);
  return [S[0], Hr[1], Hr[2], S[3]];
}

/**
 * A frame round a box w × h (Jonas, 2026-10-12: "a border around SMASH and the
 * SM wordmark that follows the border"): gap from it, width thick, its
 * corners rounded from the same centres as the mark's (radii, clockwise from
 * the top left; a square corner stays square), at tension. Path data, two
 * subpaths, filled evenodd.
 */
export function ring(w, h, gap, width, radii, tension = TENSION) {
  return roundBox([0, 0, w, h], gap + width, radii, tension) + roundBox([0, 0, w, h], gap, radii, tension);
}

/** A box [x0, y0, x1, y1] grown by e, its corners rounded from the same centres as radii (clockwise from the top left; 0 stays square). */
export function roundBox([x0, y0, x1, y1], e, radii, tension = TENSION) {
  [x0, y0, x1, y1] = [x0 - e, y0 - e, x1 + e, y1 + e];
  const most = Math.min(x1 - x0, y1 - y0) / 2;
  const at = (x, y, r) => (r > 0 ? [x, y, Math.min(r + e, most), tension] : [x, y]);
  return poly([at(x0, y0, radii[0]), at(x1, y0, radii[1]), at(x1, y1, radii[2]), at(x0, y1, radii[3])]);
}

/**
 * Where two rounded corners meet across a gap, the frame fills the wedge they
 * leave under its inner edge (Jonas, 2026-10-12: "the frame goes into the
 * gaps", the red part in his drawing, but "shouldn't go between the gaps of
 * the letters"): it keeps gap from both corners, down to where their gaps
 * meet. boxes ({ box: [x0, y0, x1, y1], radii }) run left to right in a row
 * on y 0 to h; for a column (Down), down turns the reckoning a quarter. The
 * base's wedges sit between base's boxes, the same unless the letters' feet
 * moved (a slash's shift). Path data, a closed wedge for each meeting at the
 * top and at the base.
 */
export function wedges(boxes, h, gap, tension = TENSION, down = false, base = boxes) {
  const N = 24;
  const swap = ([x, y]) => [y, x];
  // As a row: a column's boxes turned onto their sides, its corners with them.
  const rowOf = (bs) => (down ? bs.map(({ box: [x0, y0, x1, y1], radii: [a, b, c, d] }) => ({ box: [y0, x0, y1, x1], radii: [a, d, c, b] })) : bs);
  const rows = [rowOf(boxes), rowOf(base)];
  const cubic = (p0, p1, p2, p3) => Array.from({ length: N + 1 }, (_, k) => {
    const t = k / N, u = 1 - t;
    return [0, 1].map((i) => u * u * u * p0[i] + 3 * u * u * t * p1[i] + 3 * u * t * t * p2[i] + t * t * t * p3[i]);
  });
  // A grown box's corner at (cx, top) bending down on side dir (-1: its left, 1: its right), r its round: points from the top edge down.
  const corner = (cx, r, dir, depth) => {
    const top = -gap, c = [cx + dir * gap, top];
    if (r <= 0) return [c, [c[0], depth]];
    const R = r + gap, a = [c[0] - dir * R, top], b = [c[0], top + R];
    const toward = (q) => [q[0] + (c[0] - q[0]) * tension, q[1] + (c[1] - q[1]) * tension];
    return [...cubic(a, toward(a), toward(b), b), [b[0], depth]];
  };
  const cross = (L1, L2) => { // where two polylines first meet: [i, j, point]
    for (let i = 0; i < L1.length - 1; i++) for (let j = 0; j < L2.length - 1; j++) {
      const [p, p2, q, q2] = [L1[i], L1[i + 1], L2[j], L2[j + 1]];
      const r = [p2[0] - p[0], p2[1] - p[1]], s = [q2[0] - q[0], q2[1] - q[1]];
      const den = r[0] * s[1] - r[1] * s[0];
      if (Math.abs(den) < 1e-12) continue;
      const t = ((q[0] - p[0]) * s[1] - (q[1] - p[1]) * s[0]) / den, u = ((q[0] - p[0]) * r[1] - (q[1] - p[1]) * r[0]) / den;
      if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return [i, j, [p[0] + t * r[0], p[1] + t * r[1]]];
    }
    return null;
  };
  const out = [];
  for (const [flip, ra, rb] of [[false, 1, 0], [true, 2, 3]]) { // the top (each box's top right, the next's top left), and the base
    const row = rows[+flip];
    for (let k = 0; k < row.length - 1; k++) {
      const A = row[k], B = row[k + 1];
      const edge = flip ? [A.box[3], B.box[3]].every((y) => Math.abs(y - h) < 1e-6) : [A.box[1], B.box[1]].every((y) => Math.abs(y) < 1e-6);
      if (!edge) continue; // a letter set in from the frame's edge (Down, the M wider; the A dipping) makes no wedge
      const depth = h / 2;
      const ca = corner(A.box[2], A.radii[ra], 1, depth), cb = corner(B.box[0], B.radii[rb], -1, depth);
      if (ca.length === 2 && cb.length === 2) continue; // two square corners leave no wedge
      const m = cross(ca, cb);
      if (!m) continue; // their gaps never meet: the frame stays out
      const [i, j, at] = m;
      let pts = [...ca.slice(0, i + 1), at, ...cb.slice(0, j + 1).reverse()];
      if (flip) pts = pts.map(([x, y]) => [x, h - y]);
      if (down) pts = pts.map(swap);
      out.push('M' + pts.map(([x, y]) => P(x, y)).join('L') + 'Z');
    }
  }
  return out.join('');
}

/**
 * How far an S's crossbar falls across it (tilt), at most till its ends meet its corners' rounds R, room to
 * spare: never up. Risen (rise above H / 2), its high end nears the top first: the fall loses twice the rise.
 */
const fallOf = (tilt, H, bar, R, room = 8, rise = 0) => Math.max(0, Math.min(tilt ?? 0, H - 2 * Math.abs(rise) + bar - 2 * R - room));

/**
 * v on the grid (unless grid is 0), a tie away from c: a split S's blade's ends along one line (sLetter), so
 * the S stays the same upside down about its centre c.
 */
const snapFrom = (v, c, grid) => (!grid ? v : v < c ? -Math.round(-v / grid) * grid : Math.round(v / grid) * grid);

/**
 * One governing angle (p.lock; the design panel, round 1, 2026-10-12): locked,
 * an S's crossbar falls at the slot ends' cut slope, the cut's fall over its
 * slot (on the grid, as the cuts are), across its own width w, so the blade
 * and the cuts are parallel whatever the S's width; the Tilt slider (p.tilt)
 * counts only when free. The slope is the mark's, not the letter's: an S
 * whose own cuts are off still falls at the others'. Where the S can't fall
 * that far (its corners' rounds, its slots: fallOf, sLetter, sPath), the
 * same clamps take its fall, and its blade falls at the steepest slope that
 * fits, less than the cuts', rather than break. At the page's start (stems 72,
 * slots 20, ceiling 44, Round 64) the wordmark's S's hold every slope; the
 * S M's S and the S alone to 0.4 (0.585 beyond: 96 across 164); filled, Down's
 * S's, 256 across and 200 tall, to 0.2 (0.375 at 0.4); the square S to 0.2.
 */
const tiltOf = (p, w, slot) => (p.lock ? (cutOf(p.drop ?? DROP, slot, p.grid) / slot) * w : p.tilt);

/**
 * The governing angle through the A and the H (their tilt switches, PER; the
 * design panel, round 2, 2026-10-13: one angle swept through S, A, S, H
 * without a slash): on, the H's crossbar, and the A's counter floor and its
 * notch's top, fall left to right as the S's blade does, the same drop for
 * each unit across: the blade as it is drawn, after its clamps (slashLine:
 * its corners' rounds, its slots), so where the S gives way the A and the H
 * give way with it (the design panel's review, round 2, 2026-10-13: a free
 * Tilt of 160 at stems 32 and slots 40 had the S at 0.6 and the A and the H
 * at 1.54). Locked and unclamped, that is the cuts' slope; free, the Tilt
 * slider's fall across the S; neither S tilted, level, as its blade is. Each
 * pivots at its slot's centre, at the crossbars' (risen) height, and stays a
 * bar thick measured down: the H's upper slot ends on the higher edge on the
 * left, its lower one starts on the lower edge on the right; the A's counter
 * keeps its height at the slot's centre. How far each falls across half its
 * slot (room): the H's at most till its high corner keeps a quarter of a bar
 * under the top, where its slot runs out; the A's till its counter's left
 * side, the shorter under its cut top, keeps a slot and the cut's fall and
 * round, as a lowered counter does (letterPaths: most.A). Both tilted, they
 * share the smaller room, so the two keep one angle where the A gives way
 * before the S (locked at 20 in 20, height 240, ceiling 160: the A and the H
 * at 0.64, the S at 1). Off, or the a (its slot has no crossbar to fall), 0.
 * most, the most it could fall (the H's end corners leave room for it, endMost:
 * the S's blade is not asked, as its rounds ask the H's ends in two tiers).
 */
const tilted = (p, i) => (i === 4 || (i === 2 && p.a !== 'a')) && !!per(p, i).tilt;
/**
 * The steepest the A's or the H's crossbar could fall, tilted (0 unless): the Tilt slider's (or the cuts')
 * fall across the S, and a step of the grid more for a blade split along one line (its ends snapped to it:
 * slashLine). The S's blade as drawn is never steeper (its clamps only lessen it), so a bar thick enough at
 * this slope is at the slope it falls (barOf), and it asks nothing of the S's rounds.
 */
function slopeMost(p, i) {
  if (!tilted(p, i)) return 0;
  const { stem, slot } = block(p), w = 2 * stem + slot;
  const snap = lined(p, per(p, [0, 3].find((k) => per(p, k).tilt) ?? 0)) ? p.grid ?? 4 : 0;
  return (Math.max(0, tiltOf(p, w, slot) ?? 0) + snap) / w;
}

/**
 * The A's apex: its counter's head (the top end of its upper slot, lowered or
 * not) cut as a chevron, two edges at the governing slope (p.drop, the mark's,
 * whatever the A's Cut switch says) meeting in a point on the slot's centre
 * line, each half a slot across and the cut's fall over half a slot up, on the
 * grid (e). The a's slot head peaks the same.
 */
const apexOf = (p, i) => i === 2 && !!per(p, i).apex;
const peak = (p) => cutOf(p.drop ?? DROP, block(p).slot / 2, p.grid);

/**
 * The A's and the H's crossbars told apart (the design panel, round 3,
 * 2026-10-13: an A and an H whose crossbars are the same bar at the same angle
 * read alike). The A's apex on (PER), its crossbar a window, the solid bridge
 * between its counter and its notch: at least a slot and a half or 6 in 100 of
 * the block's height tall at the slot's centre, about the crossbars' (risen)
 * centre; the H's bar step on, its crossbar no window (a bar, the A's alone
 * opening), and its lower slot stands aside, to the right where the bar falls, at least a slot or 3 in 10 of
 * a stem (step), so the two slots no longer line up. Either on, its bar is at
 * least a slot thick across it, square to its fall (slopeMost: the steepest it
 * could fall), so a tilted bar never thins to a sliver. Each on the grid: the
 * bar to the 8 (its halves to the 4), the step to the 4. At most what leaves
 * the A's counter a slot under its peak and room for its round (its fall, then,
 * none: barRoom), the H's upper slot a bar deep, and the H's lower right stem
 * half a stem (a slot wider than half a stem then steps less than its width:
 * the two slots overlap a little rather than leave the foot a sliver). Off, a
 * bar and no step, as it was. { h, step }.
 */
function barOf(p, i) {
  const q = per(p, i), on = i === 2 ? !!q.apex && p.a !== 'a' : i === 4 && !!q.barStep;
  if (!on) return { h: BAR, step: 0 };
  const { s, stem, slot, ceil, mid, H } = block(p), m = slopeMost(p, i);
  const want = Math.ceil(Math.max(BAR, slot * Math.sqrt(1 + m * m), i === 2 ? Math.max(1.5 * slot, 0.06 * H) : 0) / 8) * 8;
  const r = q.cut && p.round ? Math.min(p.cut ?? CUT, s) : 0;
  const room = i === 2 ? 2 * (mid - ceil - peak(p) - r - slot) : 2 * (mid - BAR);
  const h = Math.max(BAR, Math.min(want, Math.floor(room / 8) * 8));
  return { h, step: i === 4 ? Math.max(0, Math.min(Math.ceil(Math.max(slot, 0.3 * stem) / 4) * 4, Math.floor(stem / 8) * 4)) : 0 };
}

function barRoom(p, i) {
  const { s, slot, up, lo, H, ceil } = block(p), q = per(p, i), { h: bh, step } = barOf(p, i), grow = (bh - BAR) / 2;
  const d = apexOf(p, i) ? peak(p) : q.cut ? cutOf(p.drop ?? DROP, slot, p.grid) : 0, r = q.cut && p.round ? Math.min(p.cut ?? CUT, s) : 0;
  // (The H's lower slot stepped aside, its far corner falls the step's run more: it too keeps a quarter of a bar.)
  return Math.max(0, i === 4 ? Math.min(up + s - grow - BAR / 4, (H - lo + s - grow - BAR / 4) / (1 + step / s)) : up + s - grow - ceil - d - r - slot);
}
function barFall(p, i, most = false) {
  if (!tilted(p, i)) return 0;
  const { s } = block(p);
  // At most the Tilt slider's (or the cuts') fall (slopeMost).
  if (most) return Math.min(slopeMost(p, i) * s, barRoom(p, i));
  return Math.max(0, Math.min(slashLine(p).slope * s, ...[2, 4].filter((k) => tilted(p, k)).map((k) => barRoom(p, k))));
}

/**
 * An S held to the angle (p.hold; the design panel, round 2, 2026-10-13: the
 * symbol built from the wordmark's cells, and Down's squeezed S's): locked,
 * its blade falls exactly the cuts' slope across its run, D, never clamped.
 * Its blade band, the two crossbar slots and the crossbar between its
 * counters (a bar and two slots, level), holds that fall when it is at least
 * D and a slot tall: the blade's centre line keeps half a slot inside it at
 * both ends. Where it can't, the band grows to D and a slot, its crossbar
 * slots taller (sv, half of one), and the extra comes equally out of the top
 * and the bottom counters, each at least a bar (BAR; and its cut end, d and
 * half a slot); where they can't give that much, the S grows taller (least,
 * the height that holds it, to the 8). Its corners' rounds give way rather
 * than the angle (top: at most the top crossbar slot's top). Only the first
 * and the second S (i 0, 3) are held, only where their tilt is on.
 * { D, sv, top, least } or null.
 */
export function holdOf(p, i = 0) {
  if (!p.hold || !p.lock || (i !== 0 && i !== 3) || !per(p, i).tilt) return null;
  const { s, stem, slot, ceil, rise, mid } = block(p);
  const D = tiltOf(p, 2 * stem + slot, slot);
  const grow = Math.max(0, D + slot - (BAR + 2 * slot));
  const sv = s + grow / 4, floor = Math.max(BAR, cutOf(p.drop ?? DROP, slot, p.grid) + s);
  return { D, sv, top: mid - BAR / 2 - 2 * sv, least: grow ? Math.ceil((2 * (floor + ceil + rise) + D + slot) / 8) * 8 : 0 };
}

/** p with S i held (holdOf), as tall as that needs. */
export function held(p, i = 0) {
  const q = { ...p, hold: 1 }, h = holdOf(q, i);
  return h && h.least > block(q).H ? { ...q, height: h.least } : q;
}

/**
 * Through a slot, an S's crossbar is bar and d thick less its fall across the
 * slot; falling more, the slot's cut end above would pass the one below and
 * the S cross itself (the design panel's review, round 1, 2026-10-12: wide
 * slots, steep tilt). So it falls at most till a quarter of a bar is left
 * there, split or not, so both S's keep one angle. w the S's width, s half a slot,
 * d the fall of the slot ends at its bends. Held (holdOf), those ends fall the
 * blade's own fall across the slot, so it stays a bar thick there and this never holds it back.
 */
const fallThrough = (tilt, w, bar, d, s) => Math.min(tilt, (w * ((3 * bar) / 4 + d)) / (2 * s));

/**
 * An S as path data; the wordmark's, the S M's and the S alone are one
 * drawing. The slot from its closed top end turns right at the upper bend and
 * out; the slot in from the left turns down at the lower bend to its closed
 * bottom end. L and R its edges, H its height from y; x its top slot's centre
 * and xb its bottom one's (apart in the square S), s half a slot, sv half the
 * crossbar slots' height (as s unless the rows say otherwise). Its crossbar,
 * bar thick, falls tilt across the letter (CM.SUPPLY's long diagonal), so the
 * slots either side of it are wedges; split opens its slot straight through
 * it, the S in two pieces, as theirs (in the square S, both slots run through
 * and the crossbar between them is a third); line runs the blade along one
 * line across its kerf, its ends on the grid (unless grid is 0), where it
 * would step; kerf runs its crossbar slots out of its sides parallel to the
 * blade (Down's kerf: down). open runs its slots out of the
 * top and the bottom, as the S M's. d is its cuts' fall, r and r2 their two
 * corners' rounds (db the fall of its slots' ends at its bends, d unless
 * held); o and ob its outer corners at the top and the base; hi and low its
 * closed ends' corners. rise lifts its crossbar above its middle (the
 * block's, p.rise): the crossbar slots move up with it and the blade pivots
 * there, so its top counter is the shorter; risen, it is no longer the same
 * upside down.
 */
function sLetter({ L, x, xb = x, R, H, y = 0, s, sv = s, bar = BAR, d = 0, db = d, r = 0, r2 = 0, o = (X, Y) => [X, Y], ob = o, tilt = 0, split = false, line = false, kerf = false, grid = 4, open = false, hi = 0, low = H, rise = 0 }) {
  // At most till a quarter of a bar is left through a slot (fallThrough).
  tilt = fallThrough(tilt, R - L, bar, db, s);
  const cy = H / 2 - rise; // the crossbar's centre
  const up = cy - (bar + 2 * sv) / 2, lo = cy + (bar + 2 * sv) / 2; // the crossbar slots' centres
  const mid = (x + xb) / 2;
  const across = (X) => cy + (tilt * (X - mid)) / (R - L);
  // Split along one line (the design panel, round 2, 2026-10-13: the blade steps a bar where the kerf cuts
  // it): its centre line from its two ends, each on the grid (unless grid is 0, the favicons'; a tie away
  // from the centre, so the S stays the same upside down), the points at the kerf on that line between
  // them, not rounded, so the pieces' cut edges stay collinear.
  const y0 = snapFrom(across(L), cy, grid), y1 = snapFrom(across(R), cy, grid);
  const band = split && line ? (X) => y0 + ((y1 - y0) * (X - L)) / (R - L) : across; // the crossbar's centre line
  const top = (X) => band(X) - bar / 2, bot = (X) => band(X) + bar / 2;
  // The crossbar slots' far sides, where they run out of the S: level, or with kerf parallel to the blade, so
  // each slot is one straight kerf a slot tall (two half slots, sv) out through the side at the blade's slope.
  const ku = (X) => up - sv + (kerf ? band(X) - cy : 0), kl = (X) => lo + sv + (kerf ? band(X) - cy : 0);
  const tr = top(x + s), bl = bot(xb - s); // where the crossbar meets the slots
  const out = (...pieces) => pieces.map((pts) => poly(y ? pts.map(([X, Y, ...k]) => [X, Y + y, ...k]) : pts)).join('');
  // Split, the crossbar between the two slots, where they stand apart.
  const between = split && xb - s > x + s ? [[[x + s, top(x + s)], [xb - s, top(xb - s)], [xb - s, bot(xb - s)], [x + s, bot(x + s)]]] : [];
  // Where they don't, the kerf takes the whole crossbar: the left piece shows its bottom edge, the right its
  // top, a bar apart, so the blade steps across the kerf. Along one line, both on its centre line instead:
  // one straight cut through the S, the counters either side half a bar taller, the S the same upside down.
  // (Between the square S's slots its crossbar stands, its edges already running on across both kerfs.)
  const lb = line && !between.length ? band : bot, rt = line && !between.length ? band : top;
  if (open) {
    // Its slots run out of the top and the bottom: the two corner blocks
    // stand apart; split, the body comes apart too.
    const blocks = [[[x + s, 0], o(R, 0), [R, ku(R)], [x + s, ku(x + s)]], [[L, kl(L)], [xb - s, kl(xb - s)], [xb - s, H], ob(L, H)]];
    if (split) {
      return out([o(L, 0), [x - s, 0], [x - s, lb(x - s)], [L, lb(L)]], ...between, [[xb + s, rt(xb + s)], [R, rt(R)], ob(R, H), [xb + s, H]], ...blocks);
    }
    return out([o(L, 0), [x - s, 0], [x - s, tr - db, r], [x + s, tr, r2], [R, top(R)], ob(R, H), [xb + s, H], [xb + s, bl + db, r], [xb - s, bl, r2], [L, bot(L)]], ...blocks);
  }
  if (split) {
    return out([o(L, 0), o(R, 0), [R, ku(R)], [x + s, ku(x + s)], [x + s, hi + d, r], [x - s, hi, r2], [x - s, lb(x - s)], [L, lb(L)]], ...between,
      [[xb + s, rt(xb + s)], [R, rt(R)], ob(R, H), ob(L, H), [L, kl(L)], [xb - s, kl(xb - s)], [xb - s, low - d, r], [xb + s, low, r2]]);
  }
  return out([
    o(L, 0), o(R, 0), [R, ku(R)], [x + s, ku(x + s)],
    [x + s, hi + d, r], [x - s, hi, r2],
    [x - s, tr - db, r], [x + s, tr, r2],
    [R, top(R)], ob(R, H), ob(L, H), [L, kl(L)], [xb - s, kl(xb - s)],
    [xb - s, low - d, r], [xb + s, low, r2],
    [xb + s, bl + db, r], [xb - s, bl, r2],
    [L, bot(L)],
  ]);
}

/**
 * An H's top as poly's points, from its left side to its right (y down from
 * the top), where an end passes its stem (two tiers: endMost): its corners'
 * rounds rl (its left) and rr (its right) at tension k, each from its corner
 * as poly's, carried on over the slot (a to b, open down to the crossbar's
 * top, deepA at a and deepB at b: tilted, barFall, the one less and the other
 * more) onto the other stem where they reach, so the stem beyond
 * is trimmed from the same centre and the H keeps one round across its
 * width (the design panel's review, round 2, 2026-10-13). The two never
 * meet (endMost: they share the top). Its base is the same, turned
 * (turnAbout: a line falling left to right turned a half turn still does).
 */
function hEdge(L, R, a, b, rl, rr, k, deepA, deepB) {
  const U = unitRound(k);
  const CL = U.map(([u, v]) => [L + v * rl, u * rl]), CR = U.map(([u, v]) => [R - u * rr, v * rr]); // each from its side across to its top, left to right
  const at = (x) => (x < L + rl ? bez(CL, tAt(CL, 0, x))[1] : x > R - rr ? bez(CR, tAt(CR, 0, x))[1] : 0);
  const C = (Q, x0, x1) => ['C', ...piece(Q, tAt(Q, 0, x0), tAt(Q, 0, x1)).slice(1).flat()];
  // Along the top from x0 (drawn) to x1: the left round, the flat between them, the right round.
  const run = (x0, x1) => {
    const out = [];
    if (x0 < L + rl && x0 < x1) { const e = Math.min(x1, L + rl); out.push(C(CL, x0, e)); x0 = e; }
    if (x0 < R - rr && x0 < x1) { const e = Math.min(x1, R - rr); out.push([e, 0]); x0 = e; }
    if (x0 < x1) out.push(C(CR, x0, x1));
    return out;
  };
  return [[L, rl], ...run(L, a), [a, deepA], [b, deepB], [b, at(b)], ...run(b, R)];
}

/** poly's point q (a corner, or a curve's three) turned a half turn about the centre of w × h. */
const turnAbout = (q, w, h) => (q[0] === 'C' ? ['C', ...q.slice(1).map((v, j) => (j % 2 ? h - v : w - v))] : [w - q[0], h - q[1], ...q.slice(2)]);

/**
 * The letters as path data, one closed outline each (the A's counter a
 * second subpath): S, M, A, S, H. only, when given, draws that letter
 * alone (the others empty): Down draws each letter at its own stems, and a
 * squeezed M's are too thin for the other letters' rounds.
 */
export function letterPaths(p = SLANT, only = null) {
  const { s, c, left, right, up, lo, W, H, stem, slot, ceil, rise } = block(p);
  if (!CASES.includes(p.a ?? 'A')) throw new Error(`slant: no a called ${p.a}`);
  if (!BLADES.includes(p.blade ?? 'step')) throw new Error(`slant: no blade called ${p.blade}`);
  const bar = BAR;
  const hi = ceil; // 32: a top end's high corner, where the round tip was
  const low = H - ceil; // 440: a bottom end's low corner

  /**
   * Letter i's measures, as its switches have them: d its cuts' fall, r their round, o its outer corners at
   * its top and ob at its base, each its left or its right as it falls either side of cx, the letter's middle
   * (in two tiers, an end and an inner corner apart).
   */
  const own = (i, cx) => {
    const q = per(p, i);
    const { radii: R } = rounds(p, i), k = p.tension ?? TENSION;
    const corner = (r) => (x, y) => (r > 0 ? [x, y, r, k] : [x, y]);
    const h = holdOf(p, i); // held, an S's blade at the angle exactly, its crossbar slots grown to hold it
    return {
      d: q.cut ? cutOf(p.drop ?? DROP, slot, p.grid) : 0, // 8
      // Held, its slots' ends at its bends fall the cuts' fall, its cut off or not: parallel to the blade, so the
      // blade keeps a bar through its slots and falls the cuts' slope exactly, never clamped (fallThrough; the
      // design panel's review, round 2, 2026-10-13: its Cut switch off, a square end held the blade at 0.6 under 1).
      db: h || q.cut ? cutOf(p.drop ?? DROP, slot, p.grid) : 0,
      r: q.cut && p.round ? Math.min(p.cut ?? CUT, s) : 0, // 4: a cut's obtuse corner, at a slot's end and an S's bend
      // its other corner too, when the ends are rounded both sides (p.tips; Jonas 2026-10-12: "fully rounded also as
      // option ... so it's not just one corner in the gap of the m that is rounded"): at half a slot, a round tip
      r2: q.cut && p.round && p.tips ? Math.min(p.cut ?? CUT, s) : 0,
      radii: R,
      o: (x, y) => corner(x < cx ? R[0] : R[1])(x, y),
      ob: (x, y) => corner(x < cx ? R[3] : R[2])(x, y), // a corner at the base
      // the S's crossbar's fall across its two stems and a slot (locked, at the cuts' slope: tiltOf), at most till its ends meet the corners' rounds
      // (split along one line, its cut edges are its centre line's, half a bar further into its corners' rounds)
      // (its ends run toward its top left and its bottom right)
      tilt: h ? h.D : q.tilt ? fallOf(tiltOf(p, 2 * stem + slot, slot), H, lined(p, q) ? 0 : bar, Math.max(R[0], R[2]), 8, rise) : 0,
      sv: h ? h.sv : s,
      split: q.split && p.split,
      line: p.blade === 'line', // split, along one line (sLetter)
      kerf: !!p.kerf, // its crossbar slots run out parallel to its blade (Down's kerf: down, sLetter)
      open: !!q.open,
      both: !!q.both,
      dip: q.dip === 0 ? 0 : p.dip ?? DIP,
      lower: Math.max(0, p.lower?.[i] ?? 0),
      fall: barFall(p, i), // the A's and the H's crossbar's fall across half its slot, tilted (0 unless)
      apex: apexOf(p, i), e: peak(p), // the A's counter head (or the a's slot head) a chevron, its edges falling e across half a slot
      // the A's crossbar a window, the H's at least a slot thick, half the extra each side of its centre (barOf); the H's lower slot stepped aside
      grow: i === 2 || i === 4 ? (barOf(p, i).h - BAR) / 2 : 0,
      step: i === 4 ? barOf(p, 4).step : 0,
    };
  };
  /**
   * Letter i's measures with its slot ends lowered (p.lower, Jonas 2026-10-12:
   * "separate per letter setting to lower it only on them"): hi its top
   * ends' high corner, low its bottom ends' low corner; at most till a slot
   * would run into its bend or crossbar (most for its kind, here).
   */
  const ends = (k, most) => { const l = Math.min(k.lower, Math.max(0, most(k))); return { ...k, hi: hi + l, low: low - l }; };

  // An S (sLetter, below): its slots' ends at the letter's hi and low, its crossbar risen as the block's.
  const S = (L, x, R, k) => sLetter({ L, x, R, H, s, ...k, rise, grid: p.grid ?? 4 });

  // The M: two slots from the bottom, their top ends cut.
  const M = (L, R, { d, r, r2, o, ob, hi }) => poly([
    o(L, 0), o(R, 0), ob(R, H),
    ...[c(3), c(2)].flatMap((x) => [[x + s, H], [x + s, hi + d, r], [x - s, hi, r2], [x - s, H]]),
    ob(L, H),
  ]);

  // A foot that swoops (CM.SUPPLY's a): from a slot above the baseline on
  // the inside edge at x, down and left into the corner at L (rounded, if the
  // letter's corners are), dip under the baseline. Its handles are set by eye.
  const swoop = slot;
  const swoopTo = (x, L, { dip }, R, corner) => {
    const foot = H + dip, to = [L + R, foot], w = x - to[0];
    return [[x, H - swoop], ['C', x - w * 0.45, H - swoop * 0.3, to[0] + w * 0.35, foot, ...to], corner(L, foot)];
  };

  // The A, as the original's (Jonas, 2026-10-12: the a "should be an
  // uppercase, it's too illegible as lowercase"): a notch from the bottom up
  // to the crossbar, and the counter above it, its top end cut as the M's.
  // With a dip ("can it still have a dip?"), its left leg takes the a's
  // foot; the right leg stands square, as the a's stem.
  // Tilted (barFall), its counter's floor and its notch's top fall left to right, a bar apart down, the
  // counter's height at the slot's centre as it was: under a level cut top a trapezoid taller on the right;
  // under a cut at the same slope (locked) a parallelogram. (The design panel asked for one taller on the
  // left, which a floor falling left to right can't give under either: left open, for Jonas.)
  // Its apex (the design panel, round 3, 2026-10-13: apexOf, barOf), the counter's head a chevron, its two
  // obtuse corners rounded alike and its peak sharp, and its crossbar a window, the counter's floor and the
  // notch's top each grow further from the crossbars' centre.
  const head = (k, x) => (k.apex ? [[x + s, k.hi + k.e, k.r], [x, k.hi], [x - s, k.hi + k.e, k.r]] : [[x + s, k.hi + k.d, k.r], [x - s, k.hi, k.r2]]);
  const A = (L, x, R, k) => poly([k.o(L, 0), k.o(R, 0), k.ob(R, H), [x + s, H], [x + s, lo - s + k.grow + k.fall], [x - s, lo - s + k.grow - k.fall],
    ...(k.dip ? swoopTo(x - s, L, k, k.radii[3], k.ob) : [[x - s, H], k.ob(L, H)])])
    + poly([...head(k, x), [x - s, up + s - k.grow - k.fall], [x + s, up + s - k.grow + k.fall]]);

  // The a, as CM.SUPPLY's latest (Jonas, 2026-10-12: "lets explore having
  // both capital and lowercase a"): the stem square on the right, the bowl
  // rounded on the left; its slot closed and cut at both ends, a bar above
  // where the bowl meets the stem, and the foot swooping from there.
  const a = (L, x, R, k) => poly([k.o(L, 0), [R, 0], k.ob(R, H), [x + s, H], ...swoopTo(x + s, L, k, k.radii[3], k.o)]) // its bowl's corner rounds with its top
    + poly([...head(k, x), [x - s, H - swoop - bar - k.d, k.r], [x + s, H - swoop - bar, k.r2]]);

  // The H, as the original's; its right corners, the word's, rounded (its left square unless both: rounds).
  // An end past its stem (two tiers: endMost) sweeps on over its open slot: hEdge draws it.
  // Tilted (barFall), its crossbar falls left to right through the slot: the upper slot ends on its higher
  // edge, the lower starts on its lower.
  // Its bar step (barOf; the design panel, round 3, 2026-10-13), its crossbar at least a slot thick (grow each
  // side) and its lower slot stepped right by step, its top on the bar's lower edge where it stands: an end
  // passes its stem where it rounds past the stem beside it, its base's right the step narrower, its left wider.
  const Hh = (L, x, R, { o, ob, radii, fall: f, grow: g, step: t }) => (radii.some((r, j) => r > [stem, stem, stem - t, stem + t][j]) ? poly([
    ...hEdge(L, R, x - s, x + s, radii[0], radii[1], p.tension ?? TENSION, up + s - g - f, up + s - g + f),
    ...hEdge(L, R, x - t - s, x - t + s, radii[2], radii[3], p.tension ?? TENSION, H - lo + s - g - f * (1 + t / s), H - lo + s - g + f * (1 - t / s)).map((q) => turnAbout(q, L + R, H)),
  ]) : poly([
    o(L, 0), [x - s, 0], [x - s, up + s - g - f], [x + s, up + s - g + f], [x + s, 0], o(R, 0),
    ob(R, H), [x + t + s, H], [x + t + s, lo - s + g + f * (1 + t / s)], [x + t - s, lo - s + g - f * (1 - t / s)], [x + t - s, H], ob(L, H),
  ]));

  // How far each kind of letter's slot ends can come in: an S's to half a
  // slot from its bends (both ends come in alike, so as far as the shorter
  // half allows: the upper, when the crossbars rise; held, less what its crossbar slots grew); the M's
  // to two slots from the baseline; the A's counter to a slot tall (tilted, at its left, the shorter; its
  // floor raised by its window, under its apex's peak); the a's slot to a slot long.
  const most = {
    S: (k) => Math.min(up - s - hi, low - lo - s) - 2 * (k.sv - s) - k.d - k.r - slot / 2,
    M: (k) => H - hi - k.d - 2 * slot,
    A: (k) => up + s - k.grow - hi - (k.apex ? k.e : k.d) - k.r - slot - k.fall,
    a: (k) => H - swoop - bar - hi - (k.apex ? k.e + k.d : 2 * k.d) - 2 * k.r - slot,
  };
  return [
    () => S(0, c(0), left(1), ends(own(0, c(0)), most.S)),
    () => M(right(1), left(4), ends(own(1, (c(2) + c(3)) / 2), most.M)),
    () => (p.a === 'a' ? a : A)(right(4), c(5), left(6), ends(own(2, c(5)), p.a === 'a' ? most.a : most.A)),
    () => S(right(6), c(7), left(8), ends(own(3, c(7)), most.S)),
    () => Hh(right(8), c(9), W, own(4, c(9))),
  ].map((draw, i) => (only == null || only === i ? draw() : ''));
}

/** The letters as one path, filled evenodd. */
export const letters = (p = SLANT) => letterPaths(p).join('');

/**
 * The line the slash runs along (below): the S's blade's centre line, through
 * its middle (x, y) at its slope, its crossbar's fall across it (after the
 * same clamps as sLetter's). The first S whose tilt is on leads; with neither,
 * the first S, level. Through the middle (p.slashAt), the same slope through
 * the word's middle instead: through the S's blade, a sloped slash runs off
 * the base before the H; through the middle it crosses every letter, its
 * blades parallel to it but no longer on it. Either way at the crossbars'
 * height: risen (p.rise), the line rises with them.
 */
export function slashLine(p = SLANT) {
  const { s, c, left, right, H, W, stem, slot, rise, mid } = block(p);
  const i = [0, 3].find((k) => per(p, k).tilt) ?? 0;
  const q = per(p, i), [tl, , br] = rounds(p, i).radii;
  const L = i ? right(6) : 0, R = i ? left(8) : left(1);
  const d = q.cut ? cutOf(p.drop ?? DROP, slot, p.grid) : 0, h = holdOf(p, i);
  // Held (holdOf), the blade falls the cuts' slope exactly, never clamped (letterPaths: own).
  const tilt = h ? h.D : q.tilt ? fallThrough(fallOf(tiltOf(p, 2 * stem + slot, slot), H, lined(p, q) ? 0 : BAR, Math.max(tl, br), 8, rise), R - L, BAR, d, s) : 0;
  // Split along one line, its ends on the grid (sLetter): the slope between them.
  const g = p.grid ?? 4, slope = lined(p, q) ? (snapFrom(mid + tilt / 2, mid, g) - snapFrom(mid - tilt / 2, mid, g)) / (R - L) : tilt / (R - L);
  return { x: p.slashAt ? W / 2 : c(i ? 7 : 0), y: mid, slope };
}

/**
 * The slash (p.slash; the design panel, round 1, 2026-10-12: "one straight
 * kerf through the whole wordmark along the S blades' line"): a band
 * p.slashWidth tall (a slot unless set), measured down, centred on the S's
 * blade (slashLine; or the word's middle) and run on across the word, cut
 * out of every letter. The outlines are flattened (clip.js; curves and arcs
 * in pieces a unit long) and cut along the band's two sides (clip.js: strip)
 * into pieces above it, in it (the bites) and below it.
 *
 * A bite stays, the letter whole across the band there, where cutting it
 * would leave a sliver thinner than half a stem: where, along the band's top
 * or bottom, the letter beyond is that thin (an S's blade, the A's and the
 * H's crossbars when the band runs along them), or where a piece above or
 * below the band has no room for a disc half a stem across (clip.js:
 * clearance; a crumb off a corner, a wedge where the band runs off the
 * base). A bite that meets only one side of the band, where it runs off a
 * letter's top or its base, stays too: it would only chip the letter's edge.
 *
 * p.shift (the design panel: "everything below the band slides right by
 * that much") slides every part below the band right, level and rigid, never
 * sheared: a part a bite holds together across the band slides with the side
 * that holds most of it, or stays. Where the band falls to the right, the
 * part below closes on the part above as it slides: the shift stops where
 * the kerf keeps half its width. Where a part holds the band, it stops at
 * half a gap and half a slot, so that part keeps clear of its neighbours,
 * slid or not. { paths, shift, at }: the letters' path data, the shift as
 * drawn, and at(point), how far the part there slid (a frame's wedges
 * follow it).
 */
export function slash(p = SLANT, paths = letterPaths(p)) {
  if (!p.slash) return { paths, shift: 0, at: () => 0 };
  const { stem, slot, gap } = block(p);
  const { x: xs, y: ys, slope: m } = slashLine(p);
  const h = Math.max(1, p.slashWidth ?? slot) / 2, thin = stem / 2;
  // The reckoning turned so the band lies level, -h to h; down stays down, so widths measured down stay.
  const fwd = ([X, Y]) => [X, Y - m * (X - xs) - ys];
  const back = ([X, u]) => [X, u + m * (X - xs) + ys];
  const draw = (ring, dx) => {
    const pts = ring.map((q) => { const [X, Y] = back(q); return P(X + dx, Y); }).filter((q, i, a) => q !== a[(i + a.length - 1) % a.length]);
    return pts.length > 2 ? 'M' + pts.join('L') + 'Z' : '';
  };
  const onLine = (q, c) => Math.abs(q[1] - c) < 1e-6;
  // A side along the band's top or bottom, more than a point (a corner just on a line leaves one of none).
  const along = (a, b, c) => onLine(a, c) && onLine(b, c) && Math.abs(a[0] - b[0]) > 1e-6;
  const parts = []; // every part drawn, as { rings, slides, mixed }: its outline, whether it slides, whether it holds the band
  // Each letter, cut: its path data drawn at a shift.
  const drawAt = paths.map((d) => {
    if (!d) return () => d;
    const subs = d.split(/(?=M)/);
    const rings = subs.map((sub) => flatten(sub)[0].map(fwd));
    const hole = rings.map((r, i) => rings.filter((o, j) => j !== i && inside([o], r[0])).length % 2 === 1);
    const cuts = rings.map((r) => strip(r, -h, h));
    // A ring that won't cut (it crosses itself): the letter stays whole, sliding with most of it.
    if (cuts.some((q) => !q)) {
      const all = rings.flat(), u = all.reduce((t, [, v]) => t + v, 0) / all.length;
      const part = { rings: rings.filter((r, i) => !hole[i]), slides: u > 0, mixed: true };
      parts.push(part);
      return (shift) => (part.slides && shift ? move(d, shift, 0) : d);
    }
    // Every piece, a whole ring as one; the bites, a letter's pieces in the band.
    const pieces = (i) => (cuts[i].pieces ?? [{ zone: cuts[i].zone, ring: rings[i], chords: [] }]);
    cuts.forEach((q, i) => { q.all = pieces(i); });
    const bites = cuts.flatMap((q, i) => (hole[i] ? [] : q.all.filter((b) => b.zone === 1)));
    // A counter's pieces in the band go with the bite round them.
    cuts.forEach((q, i) => {
      if (!hole[i]) return;
      for (const piece of q.all.filter((b) => b.zone === 1)) {
        const r = piece.ring, k = r.findIndex((a, j) => Math.abs((a[1] + r[(j + 1) % r.length][1]) / 2) < h - 1e-6);
        const at = k < 0 ? r[0] : [(r[k][0] + r[(k + 1) % r.length][0]) / 2, (r[k][1] + r[(k + 1) % r.length][1]) / 2];
        piece.of = bites.find((b) => inside([b.ring], at)) ?? bites[0];
      }
    });
    // The bites that stay: one that meets one side of the band only (a chip), or where the letter
    // beyond the band's top or bottom is thinner than half a stem (a taper where a side meets the
    // band at a slant, half a stem from the bite's ends, doesn't count).
    for (const bite of bites) {
      const r = bite.ring;
      const sides = [-h, h].filter((c) => r.some((a, j) => along(a, r[(j + 1) % r.length], c)));
      bite.keep = sides.length < 2 || r.some((a, j) => {
        const b = r[(j + 1) % r.length];
        const c = [-h, h].find((y) => along(a, b, y));
        if (c == null) return false;
        const dir = Math.sign(c), [x0, x1] = [Math.min(a[0], b[0]), Math.max(a[0], b[0])];
        const samples = [(x0 + x1) / 2];
        for (let x = x0 + thin; x <= x1 - thin; x += 2) samples.push(x);
        return samples.some((x) => {
          const from = [x, c + dir * 1e-3];
          if (!inside(rings, from)) return false;
          return reach(rings, from, dir) < thin;
        });
      });
    }
    // And every bite next to a piece above or below the band with no room for a disc half a stem
    // across (its counters' pieces cut out of it): cut, it would be a crumb.
    cuts.forEach((q, i) => {
      if (hole[i] || !q.pieces) return;
      for (const piece of q.pieces) {
        if (piece.zone === 1 || Math.abs(area(piece.ring)) < 1) continue; // (a point where a corner meets a line: nothing)
        const counters = cuts.flatMap((o, j) => (hole[j] ? o.all.filter((c) => c.zone === piece.zone && inside([piece.ring], c.ring.find(([, u]) => Math.abs(Math.abs(u) - h) > 1e-6) ?? c.ring[0])) : []));
        if (clearance([piece.ring, ...counters.map((c) => c.ring)], thin / 2)) continue;
        for (const c of piece.chords) for (const k of q.chords[c].pieces) q.pieces[k].keep = true;
      }
    });
    for (const q of cuts) for (const b of q.all) if (b.zone === 1) b.out = !(b.of ?? b).keep;
    // What's left: each outline its kept pieces, cut apart only where a bite is out. Each part slides
    // with the side that holds most of it: its area above the band (a bite's half) against below.
    const drawn = cuts.map((q, i) => (q.pieces ? q.trace().map(({ ring, pieces: ks }) => ({ ring, ks: ks.map((k) => q.pieces[k]) })) : q.all[0].out ? [] : [{ ring: rings[i], ks: q.all }]));
    const outer = drawn.flatMap((rs, i) => (hole[i] ? [] : rs));
    for (const o of outer) o.weigh = [0, 0];
    const weigh = (o, ks, sign) => ks.forEach((k) => {
      const a = Math.abs(area(k.ring)) * sign;
      if (k.zone === 1) { o.weigh[0] += a / 2; o.weigh[1] += a / 2; } else o.weigh[k.zone / 2] += a;
    });
    for (const o of outer) weigh(o, o.ks, 1);
    drawn.forEach((rs, i) => {
      if (!hole[i]) return;
      for (const r of rs) {
        const pt = r.ring.find(([, u]) => Math.abs(Math.abs(u) - h) > 1e-6) ?? r.ring[0];
        r.in = outer.find((o) => inside([o.ring], pt)) ?? outer[0];
        if (r.in) weigh(r.in, r.ks, -1);
      }
    });
    // A counter cut open by the band (its slot run into the kerf) shares its cut side with its letter's: the
    // letter's outline goes round it instead, so no two sides lie on each other (a hairline, drawn).
    drawn.forEach((rs, i) => {
      if (!hole[i]) return;
      for (const r of rs) {
        const H = r.ring, n = H.length, ks = H.map((a, k) => k).filter((k) => [-h, h].some((c) => along(H[k], H[(k + 1) % n], c)));
        if (ks.length !== 1 || !r.in) continue;
        const k = ks[0], c = H[k], d = H[(k + 1) % n], O = r.in.ring;
        const j = O.findIndex((a, t) => {
          const b = O[(t + 1) % O.length];
          return Math.abs(a[1] - c[1]) < 1e-6 && Math.abs(b[1] - c[1]) < 1e-6 && [c, d].every(([x]) => (x - a[0]) * (x - b[0]) < 0);
        });
        if (j < 0) continue;
        const a = O[j], near = Math.abs(c[0] - a[0]) < Math.abs(d[0] - a[0]);
        // From the end nearer a, round the counter the other way from its cut side, to its other end.
        const round = near ? Array.from({ length: n }, (_, t) => H[(k - t + n) % n]) : Array.from({ length: n }, (_, t) => H[(k + 1 + t) % n]);
        r.in.ring = [...O.slice(0, j + 1), ...round, ...O.slice(j + 1)];
        r.merged = true;
      }
    });
    // (An even split, as an S's or an H's about its middle, stays.)
    for (const o of outer) {
      const [up, down] = o.weigh, zones = new Set(o.ks.map((k) => k.zone));
      o.part = { rings: [o.ring], slides: down - up > 0.02 * (up + down), mixed: zones.has(1) || zones.size > 1 };
      parts.push(o.part);
    }
    // A ring nothing was cut out of keeps its path data, moved with its part; the others, their pieces.
    return (shift) => subs.map((sub, i) => {
      const dxOf = (r) => ((hole[i] ? r.in?.part : r.part)?.slides ? shift : 0);
      if (cuts[i].all.every((b) => !b.out) && drawn[i].length === 1) {
        const dx = dxOf(drawn[i][0]);
        return dx ? move(sub, dx, 0) : sub;
      }
      return drawn[i].filter((r) => !r.merged).map((r) => draw(r.ring, dxOf(r))).join('');
    }).join('');
  });
  // The shift: where the band falls to the right, at most till the kerf keeps half its width; where
  // a part holds the band, at most half a gap and half a slot, so it keeps clear of its neighbours.
  const room = parts.some((o) => o.mixed) ? Math.min(gap, slot) / 2 : Infinity;
  const shift = Math.max(0, Math.min(p.shift ?? 0, room, m > 0 ? h / m : Infinity));
  const at = (pt) => { const q = fwd(pt), o = parts.find((r) => inside(r.rings, q)); return (o ? o.slides : q[1] > 0) ? shift : 0; };
  return { paths: drawAt.map((f) => f(shift)), shift, at };
}

/** Path data (M, L, C, A, Z, absolute) scaled by k (the favicons' cells), then moved by dx, dy. */
export function move(d, dx, dy, k = 1) {
  return [...d.matchAll(/([MLCAZ])([^MLCAZ]*)/g)].map(([, cmd, args]) => {
    if (cmd === 'Z') return 'Z';
    const n = args.trim().split(/[\s,]+/).map(Number);
    const from = cmd === 'A' ? 5 : 0; // an arc's flags stay, its radii scale
    return cmd + n.map((v, i) => (i < from ? f(i < 2 ? v * k : v) : f(v * k + ((i - from) % 2 ? dy : dx)))).join(' ');
  }).join('');
}

export const DOWN_FITS = ['wider', 'fill', 'squeeze'];
export const DOWN_JOINS = ['tiles', 'block'];
/**
 * SMASH written down (Jonas, 2026-10-12: of the recompositions, "the DOWN
 * looks pretty good, but lets assume no dip"): the five letters in a column,
 * each as short as its slots allow, a gap between; no dip. The M has three
 * stems to the others' two, so fit says what gives (p.downFit):
 * - wider: every letter has the wordmark's stems, the M stands out, the
 *   column centred on it (Jonas: "all characters uniformly thick", "2");
 * - fill: the M has the wordmark's stems, and the others' widen to its
 *   width ("the stem width increases of the other characters so they fit
 *   all in same width");
 * - squeeze: the others have the wordmark's stems, and the M's narrow to
 *   their width; its S's held to the angle (holdOf; the design panel, round
 *   2, 2026-10-13), as the symbol's cells: locked, their blades fall exactly
 *   the cuts' slope, and an S grows taller where its counters can't give.
 * How the letters join (p.downJoin; the design panel, round 2, 2026-10-13:
 * Down as one carved block): tiles, each letter its own, rounded all round,
 * the gap between them p.space; block, one stone with cuts in it, the gap a
 * slot (p.stroke) and every corner where a letter meets the next square (its
 * seams: the bottom corners of S, M, A, S and the top corners of M, A, S, H),
 * so only the column's four outer corners round (the ends, in two tiers).
 * Carved, each S's crossbar slots can run out through the column's side
 * parallel to its blade (p.downKerf: sLetter's kerf), one straight cut at the
 * governing angle, a slot tall; level, as they were.
 * { d, w, h, boxes }.
 */
const STEMS = [2, 3, 2, 2, 2]; // S M A S H: their stems, and one slot fewer

/**
 * The M squeezed into w (Down's squeeze, the symbol's cells): three stems and
 * two slots. Its stems at least a quarter of a bar (the design panel's review,
 * round 2, 2026-10-13: at stems 32 and slots 60 they were 1.33 wide,
 * hairlines), its slots narrower where w can't hold that. { stem, stroke }.
 */
export function squeezeM(w, slot) {
  const t = (w - 2 * slot) / 3;
  return t < BAR / 4 ? { stem: BAR / 4, stroke: (w - (3 * BAR) / 4) / 2 } : { stem: t, stroke: slot };
}
export function down(p = SLANT) {
  const fit = p.downFit ?? 'wider', join = p.downJoin ?? 'tiles';
  if (!DOWN_FITS.includes(fit)) throw new Error(`slant: no fit called ${fit}`);
  if (!DOWN_JOINS.includes(join)) throw new Error(`slant: no join called ${join}`);
  const carved = join === 'block';
  const q = { ...p, dip: 0, height: 0, ends: 'down', kerf: carved && !!p.downKerf }; // the least height its slots allow; in two tiers, its top and its feet the ends (ENDS)
  const slot = p.stroke, stem = p.stem ?? BAR, gap = carved ? slot : p.space ?? slot;
  // Carved as one block, a letter's seams: its top under the letter above, its base over the one below.
  const seam = (i) => (carved ? { seam: [i > 0, i < STEMS.length - 1] } : {});
  const width = (n, t, sl = slot) => n * t + (n - 1) * sl;
  const widths = STEMS.map((n) => width(n, fit === 'wider' ? stem : 0));
  const w = fit === 'wider' ? Math.max(...widths) : width(fit === 'squeeze' ? 2 : 3, stem);
  let y = 0, d = '';
  const boxes = [];
  const rs = STEMS.map((n, i) => {
    const t = fit === 'wider' ? stem : (w - (n - 1) * slot) / n; // this letter's stems
    // (Squeezed, the A and the H tilt as the held S's blade falls: slashLine, barFall.)
    const qi = { ...q, ...seam(i) };
    return fit === 'squeeze' && (i === 0 || i === 3) ? held({ ...qi, stem: t }, i) : fit === 'squeeze' && i === 1 ? { ...qi, ...squeezeM(w, slot) } : { ...qi, stem: t, ...(fit === 'squeeze' ? { hold: 1 } : {}) };
  });
  // In two tiers, its ends alike, each letter at its own measures: the least they hold (markHeld).
  const endCap = tiers(q) ? Math.min(...rs.map((r, i) => endHeld(r, i))) : undefined;
  STEMS.forEach((n, i) => {
    const r = { ...rs[i], endCap };
    const b = block(r), lw = width(n, r.stem, r.stroke), x = (w - lw) / 2;
    const x0 = [0, b.right(1), b.right(4), b.right(6), b.right(8)][i];
    d += move(letterPaths(r, i)[i], x - x0, y);
    boxes.push({ box: [x, y, x + lw, y + b.H], radii: letterRadii(r, i) });
    y += b.H + gap;
  });
  return { d, w, h: y - gap, boxes };
}

// The symbol, the S M, as the original's (read from the modular mark): 9
// columns by 5 rows of bars and slots, 240 × 136. The S's slots run out of
// the top and the bottom, so its only curves are its bends, cut; the M's
// two slots hang from its top bar, their ends cut.
export { SYM_COLS, SYM_ROWS, SYM_W, SYM_H } from '../original/geometry.js'; // 240 × 136
const { stop: SM_STOP } = smMeasures(); // where the M's slots end, from the top
const edges = (sizes, o) => sizes.reduce((a, n) => [...a, a.at(-1) + n], [o]);

/**
 * An S of the S M as path data: the wordmark's S (sLetter), open, its body and
 * the two blocks its slots cut off. L and R its edges; a and b the left edges
 * of its top slot and its bottom one; r its six row edges. The bends are cut
 * outside, sharp inside. Its crossbar carries the wordmark's blade (the
 * design panel, round 1, 2026-10-12): tilt is its fall across an S of two stems and a
 * slot, so a wider S falls at the same angle, at most till its ends meet its
 * corners' rounds (room to spare); split runs its slots through it (line: its
 * blade along one line across them, sLetter). Its slots
 * already run out of the top and the bottom, so it has no ends to lower.
 * The angle holds only so far, as these S's are short for their width: the
 * fall, at most its height and a bar less its rounds and room, is a lower
 * slope across a wider S. At the page's start (stems 72, slots 20, Round 64)
 * the S M's S and the S alone keep the wordmark S's angle to tilt 96 (slope
 * 0.585), the square S to about 61 (0.375), no steeper beyond. The square
 * S's crossbar also rises into its top slot, across half a stem, only till a
 * quarter of that slot stays open: slope 1.5 slot / stem at most, so a thin
 * slot under wide stems leaves it nearly level (slot 8, stem 200: 0.06, the
 * wordmark's 0.235 at tilt 96). And every S's crossbar keeps a quarter of a
 * bar through its slots (sLetter).
 */
function sPath({ L, R, a, b, r, slot, drop = DROP, o = (x, y) => [x, y], grid = 4, cut = 0, tips = 0, tilt = 0, lock = 0, split = 0, line = 0, round = 0, room = 8 }) {
  const k = Math.min(cut, slot / 2); // the bends' obtuse corners, and their others with tips
  const H = r[5] - r[0], bar = r[3] - r[2], s = slot / 2, sv = (r[2] - r[1]) / 2;
  const d = cutOf(drop, slot, grid);
  // Locked (tiltOf), it falls at its own cuts' slope, d in a slot: across two stems and a slot, scaled to its width below.
  if (lock) tilt = (d / slot) * (2 * (a - L) + slot);
  // The square S's top slot stands left of its middle (its bottom one as far
  // right), where the crossbar rises: at most till a quarter of the slot
  // under the top block stays open and the slot's cut end clear of the top.
  const rise = (b - a - slot) / 2, lift = Math.max(0, Math.min(1.5 * sv, H / 2 - bar / 2 - d - k - room / 2));
  // (Split along one line, the plain S's cut edges are its centre line's, half a bar further into its corners' rounds.)
  const fall = Math.min(fallOf((tilt * (R - L)) / (2 * (a - L) + slot), H, split && line && b === a ? 0 : bar, round, room), rise > 0 ? (lift * (R - L)) / rise : Infinity);
  return sLetter({ L, x: a + s, xb: b + s, R, H, y: r[0], s, sv, bar, d, r: k, r2: tips ? k : 0, o, tilt: fall, split: !!split, line: !!line, grid, open: true });
}

/** The S M's outer corners, rounded by outer at tension, at most a bar or a stem: the four of its S, the M's top two. */
/** The S M's four outer corners' rounds, clockwise from the top left: the S's and the M's top, the S's foot; the M's foot square. */
export const symRadii = (outer, cols = SYM_COLS, rows = SYM_ROWS) => { const R = Math.min(outer, cols[0], rows[0]); return [R, R, 0, R]; };

const rounder = (outer, tension, cols, rows) => {
  const R = Math.min(outer, cols[0], rows[0]);
  return Object.assign((x, y) => (R > 0 ? [x, y, R, tension] : [x, y]), { R });
};

/** The S M's columns with its stems widened, its slots, and the gap between the S and the M: bar, slot, bar, gap, bar … */
export const symCols = (stem = BAR, slot = SYM_COLS[1], gap = slot) => SYM_COLS.map((n, i) => (i === 3 ? gap : i % 2 ? slot : stem));
/** Its rows, its slots as the wordmark's: bar, slot, bar, slot, bar. */
export const symRows = (slot = SYM_ROWS[1]) => SYM_ROWS.map((n, i) => (i % 2 ? slot : n));

/**
 * The S M as path data; cols and rows its bands, x and y its top left, stop
 * where the M's slots end (from the top), drop its cuts' slope; its S's
 * crossbar falling tilt across it (or, locked, at its cuts' slope) and split
 * (along one line, line) as the wordmark's (sPath), room the least it leaves
 * its corners' rounds. Its outer corners round outer, its ends (its S's left,
 * its M's right) ends, as outer unless set (two tiers: ENDS).
 */
export function symbol({ cols = SYM_COLS, rows = SYM_ROWS, x = 0, y = 0, stop = SM_STOP, round = 1, cut = CUT, tips = 0, drop = DROP, outer = 0, ends = outer, tension = TENSION, grid = 4, tilt = 0, lock = 0, split = 0, line = 0, room = 8 } = {}) {
  const e = edges(cols, x);
  const r = edges(rows, y);
  const slot = cols[1];
  const d = cutOf(drop, slot, grid);
  const k = round ? Math.min(cut, slot / 2) : 0;
  const top = y + stop;
  const o = rounder(outer, tension, cols, rows), oe = rounder(ends, tension, cols, rows);
  const k2 = tips ? k : 0;
  const oS = (X, Y) => (X === e[0] ? oe : o)(X, Y); // its S's left corners the ends
  return sPath({ L: e[0], R: e[3], a: e[1], b: e[1], r, slot, drop, o: oS, grid, cut: k, tips, tilt, lock, split, line, round: Math.max(o.R, oe.R), room })
    + poly([o(e[4], r[0]), oe(e[9], r[0]), [e[9], r[5]],
      ...[[e[7], e[8]], [e[5], e[6]]].flatMap(([a, b]) => [[b, r[5]], [b, top + d, k], [a, top, k2], [a, r[5]]]),
      [e[4], r[5]]]);
}

/**
 * The S M from the wordmark's own cells (p.symbol 'cells'; the design panel,
 * round 2, 2026-10-13: the extended S M's S is open and nearly flat, it
 * ignores the height and the stems, and its blade is shallower than its M's
 * slot heads): the first S as the wordmark draws it (letterPaths), its height,
 * stems, slots, ceiling, corners, rise and its own switches, closed or open
 * as they say; the wordmark's gap; and the M squeezed to the S's width, as
 * Down's squeeze (squeezeM), so the two are equal cells and the symbol a crop
 * of the wordmark. Its S is held to the angle (holdOf): locked, its blade falls the
 * cuts' slope exactly, and the S M grows taller where the S needs it.
 * { d, w, h, bands, boxes, columns }: its boxes and their corners' rounds,
 * the S's then the M's, and its slots and its gap, as [left, width].
 */
export function symbolCells(p = SLANT) {
  const S0 = held({ ...p, ends: 'cells' }, 0), b = block(S0), { stem, slot, gap } = b, sw = 2 * stem + slot; // in two tiers, its S's left and its M's right the ends (ENDS)
  const M0 = { ...S0, ...squeezeM(sw, slot), height: b.H };
  // In two tiers, its ends alike, the M at its own stems: the least the two hold (markHeld).
  const endCap = tiers(S0) ? Math.min(endHeld(S0, 0), endHeld(M0, 1)) : undefined;
  const S = { ...S0, endCap }, M = { ...M0, endCap }, m = block(M), dx = sw + gap - m.right(1);
  const d = letterPaths(S, 0)[0] + move(letterPaths(M, 1)[1], dx, 0);
  return {
    d, w: 2 * sw + gap, h: b.H, bands: b.bands,
    boxes: [{ box: [0, 0, sw, b.H], radii: letterRadii(S, 0) }, { box: [sw + gap, 0, 2 * sw + gap, b.H], radii: letterRadii(M, 1) }],
    columns: [[stem, slot], [sw, gap], [m.left(2) + dx, m.slot], [m.left(3) + dx, m.slot]],
  };
}

/**
 * The S alone, as the original's: 84 × 136; wide draws it out by pitches (1:
 * a square); turn lays it on its side; drop its cuts' slope; stem its stems'
 * width; tilt and split (and line) its crossbar's, as the S M's (sPath: the square S's
 * falls at the same angle, across its width), lock its cuts' slope instead.
 */
export function letterS({ wide = 0, turn = false, drop = DROP, stem = BAR, slot = SYM_COLS[1], outer = 0, tension = TENSION, cut = CUT, tips = 0, tilt = 0, lock = 0, split = 0, line = 0 } = {}) {
  const [bar] = symCols(stem, slot);
  const rows = symRows(slot), h = rows.reduce((t, n) => t + n);
  const o = rounder(outer, tension, [bar], rows);
  const w = 2 * bar + slot + wide * (bar + slot);
  const d = sPath({ L: 0, R: w, a: bar, b: bar + wide * (bar + slot), r: edges(rows, 0), slot, drop, o, cut, tips, tilt, lock, split, line, round: o.R });
  return turn ? { d: quarterTurn(d, h), w: h, h: w } : { d, w, h };
}
