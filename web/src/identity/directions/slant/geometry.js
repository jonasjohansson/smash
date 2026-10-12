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
export const SLANT = { ...REST, round: 1, cut: CUT, drop: DROP, outer: OUTER, tension: TENSION, stem: BAR, height: H, tilt: 0, split: 0, a: 'A', dip: 0 };

/** How far a cut falls across a slot: drop of its width, on the grid (of 4) unless grid is 0 (the favicons' tiny slots). */
const cutOf = (drop, slot, grid = 4) => (grid ? Math.round((drop * slot) / grid) * grid : drop * slot);

/** How far the mark reaches below its block: the a's dip, or the A's when it has one. */
export const depth = (p = SLANT) => ((p.a === 'a' || p.dip) && per(p, 2).dip !== 0 ? p.dip ?? DIP : 0);

/**
 * The block's measures (Jonas, 2026-10-12: stems wider, "to match a bit"
 * CM.SUPPLY's latest): eleven stems (p.stem, 32 or wider, in steps of 4) and
 * ten slots (p.stroke, 20, in steps of 4) across; down, the bars stay 32 and
 * the crossbars centred in p.height (in steps of 8), so every point stays on
 * the grid of 4. At the original's, 552 × 472.
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
  // At least tall enough that a slot's top end stays half a slot above its bend: 176 at the original's slots.
  const least = Math.ceil((2 * ceil + BAR + 3 * slot + 2 * cutOf(p.drop ?? DROP, slot)) / 8) * 8;
  const h = Math.max(p.height ?? H, least);
  return {
    s, stem, slot, gap, ceil,
    c: (i) => lefts[i] + widths[i] / 2, // the columns' centres, left to right: 42, 94 …
    left: (i) => lefts[i], right: (i) => lefts[i] + widths[i], // and their edges
    columns: widths.map((w, i) => [lefts[i], w]),
    W: 11 * stem + 6 * slot + 4 * gap,
    H: h,
    up: h / 2 - (BAR + slot) / 2, // the upper crossbar slot's centre: 210
    lo: h / 2 + (BAR + slot) / 2, // the lower one's: 262
    bands: [0, ceil, h / 2 - BAR / 2, h / 2 + BAR / 2, h - ceil, h], // the bars down: 0 32 220 252 440 472
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
 * corners of the H").
 */
export const PER = [
  { cut: 1, round: 1, base: 1, tilt: 1, split: 1, open: 0 },
  { cut: 1, round: 1, base: 0 },
  { cut: 1, round: 1, base: 0, dip: 1 },
  { cut: 1, round: 1, base: 1, tilt: 1, split: 1, open: 0 },
  { round: 1, base: 1, both: 0 },
];
const per = (p, i) => ({ ...PER[i], ...(p.per?.[i] ?? {}) });

/**
 * Letter i's outer corners' rounds, as its switches have them: Rr at its top,
 * Rb at its base. At most half a letter's width across the top (two rounds
 * share it) and the S's sides to its bends; where a corner stands on one stem
 * (a foot, the H, an open S's arms), at most a stem.
 */
export function rounds(p, i) {
  const { s, up, stem, slot } = block(p);
  const R0 = Math.min(p.outer ?? 0, stem + slot / 2, up - s);
  const q = per(p, i);
  const legs = i === 1 || i === 2 || i === 4; // the M, the A and the H stand on stems
  return { Rr: q.round ? (i === 4 || q.open ? Math.min(R0, stem) : R0) : 0, Rb: q.base ? (legs || q.open ? Math.min(R0, stem) : R0) : 0 };
}

/** Letter i's four outer corners' rounds, clockwise from the top left (the box a frame's cell follows). */
export function letterRadii(p, i) {
  const { Rr, Rb } = rounds(p, i), q = per(p, i);
  if (i === 4) return [q.both ? Rr : 0, Rr, Rb, q.both ? Rb : 0]; // the H: its right corners, its left with both
  if (i === 2 && p.a === 'a') return [Rr, 0, Rb, Rr]; // the a: its stem square at the top, its bowl's corner with its top
  return [Rr, Rr, Rb, Rb];
}

/** The word's four outer corners' rounds, clockwise from the top left: the first S's left, the H's right. */
export function wordRadii(p = SLANT) {
  const S = rounds(p, 0), Hr = rounds(p, 4);
  return [S.Rr, Hr.Rr, Hr.Rb, S.Rb];
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
 * on y 0 to h; for a column (Down), down turns the reckoning a quarter. Path
 * data, a closed wedge for each meeting at the top and at the base.
 */
export function wedges(boxes, h, gap, tension = TENSION, down = false) {
  const N = 24;
  const swap = ([x, y]) => [y, x];
  // As a row: a column's boxes turned onto their sides, its corners with them.
  const row = down ? boxes.map(({ box: [x0, y0, x1, y1], radii: [a, b, c, d] }) => ({ box: [y0, x0, y1, x1], radii: [a, d, c, b] })) : boxes;
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

/** How far an S's crossbar falls across it (tilt), at most till its ends meet its corners' rounds R, room to spare: never up. */
const fallOf = (tilt, H, bar, R, room = 8) => Math.max(0, Math.min(tilt ?? 0, H + bar - 2 * R - room));

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
const tiltOf = (p, w, slot) => (p.lock ? (cutOf(p.drop ?? DROP, slot) / slot) * w : p.tilt);

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
 * and the crossbar between them is a third). open runs its slots out of the
 * top and the bottom, as the S M's. d is its cuts' fall, r and r2 their two
 * corners' rounds; o and ob its outer corners at the top and the base; hi and
 * low its closed ends' corners.
 */
function sLetter({ L, x, xb = x, R, H, y = 0, s, sv = s, bar = BAR, d = 0, r = 0, r2 = 0, o = (X, Y) => [X, Y], ob = o, tilt = 0, split = false, open = false, hi = 0, low = H }) {
  // Through a slot, the crossbar is bar and d thick less its fall across the
  // slot; falling more, the slot's cut end above would pass the one below and
  // the S cross itself (the design panel's review, round 1, 2026-10-12: wide
  // slots, steep tilt). So it falls at most till a quarter of a bar is left
  // there, split or not, so both S's keep one angle.
  tilt = Math.min(tilt, ((R - L) * ((3 * bar) / 4 + d)) / (2 * s));
  const up = H / 2 - (bar + 2 * sv) / 2, lo = H / 2 + (bar + 2 * sv) / 2; // the crossbar slots' centres
  const mid = (x + xb) / 2;
  const band = (X) => H / 2 + (tilt * (X - mid)) / (R - L); // the crossbar's centre line
  const top = (X) => band(X) - bar / 2, bot = (X) => band(X) + bar / 2;
  const tr = top(x + s), bl = bot(xb - s); // where the crossbar meets the slots
  const out = (...pieces) => pieces.map((pts) => poly(y ? pts.map(([X, Y, ...k]) => [X, Y + y, ...k]) : pts)).join('');
  // Split, the crossbar between the two slots, where they stand apart.
  const between = split && xb - s > x + s ? [[[x + s, top(x + s)], [xb - s, top(xb - s)], [xb - s, bot(xb - s)], [x + s, bot(x + s)]]] : [];
  if (open) {
    // Its slots run out of the top and the bottom: the two corner blocks
    // stand apart; split, the body comes apart too.
    const blocks = [[[x + s, 0], o(R, 0), [R, up - sv], [x + s, up - sv]], [[L, lo + sv], [xb - s, lo + sv], [xb - s, H], ob(L, H)]];
    if (split) {
      return out([o(L, 0), [x - s, 0], [x - s, bot(x - s)], [L, bot(L)]], ...between, [[xb + s, top(xb + s)], [R, top(R)], ob(R, H), [xb + s, H]], ...blocks);
    }
    return out([o(L, 0), [x - s, 0], [x - s, tr - d, r], [x + s, tr, r2], [R, top(R)], ob(R, H), [xb + s, H], [xb + s, bl + d, r], [xb - s, bl, r2], [L, bot(L)]], ...blocks);
  }
  if (split) {
    return out([o(L, 0), o(R, 0), [R, up - sv], [x + s, up - sv], [x + s, hi + d, r], [x - s, hi, r2], [x - s, bot(x - s)], [L, bot(L)]], ...between,
      [[xb + s, top(xb + s)], [R, top(R)], ob(R, H), ob(L, H), [L, lo + sv], [xb - s, lo + sv], [xb - s, low - d, r], [xb + s, low, r2]]);
  }
  return out([
    o(L, 0), o(R, 0), [R, up - sv], [x + s, up - sv],
    [x + s, hi + d, r], [x - s, hi, r2],
    [x - s, tr - d, r], [x + s, tr, r2],
    [R, top(R)], ob(R, H), ob(L, H), [L, lo + sv], [xb - s, lo + sv],
    [xb - s, low - d, r], [xb + s, low, r2],
    [xb + s, bl + d, r], [xb - s, bl, r2],
    [L, bot(L)],
  ]);
}

/**
 * The letters as path data, one closed outline each (the A's counter a
 * second subpath): S, M, A, S, H. only, when given, draws that letter
 * alone (the others empty): Down draws each letter at its own stems, and a
 * squeezed M's are too thin for the other letters' rounds.
 */
export function letterPaths(p = SLANT, only = null) {
  const { s, c, left, right, up, lo, W, H, stem, slot, ceil } = block(p);
  if (!CASES.includes(p.a ?? 'A')) throw new Error(`slant: no a called ${p.a}`);
  const bar = BAR;
  const hi = ceil; // 32: a top end's high corner, where the round tip was
  const low = H - ceil; // 440: a bottom end's low corner

  /** Letter i's measures, as its switches have them: d its cuts' fall, r their round, o its outer corners. */
  const own = (i) => {
    const q = per(p, i);
    const { Rr, Rb } = rounds(p, i);
    return {
      d: q.cut ? cutOf(p.drop ?? DROP, slot) : 0, // 8
      r: q.cut && p.round ? Math.min(p.cut ?? CUT, s) : 0, // 4: a cut's obtuse corner, at a slot's end and an S's bend
      // its other corner too, when the ends are rounded both sides (p.tips; Jonas 2026-10-12: "fully rounded also as
      // option ... so it's not just one corner in the gap of the m that is rounded"): at half a slot, a round tip
      r2: q.cut && p.round && p.tips ? Math.min(p.cut ?? CUT, s) : 0,
      Rr,
      o: (x, y) => (Rr > 0 ? [x, y, Rr, p.tension ?? TENSION] : [x, y]),
      Rb,
      ob: (x, y) => (Rb > 0 ? [x, y, Rb, p.tension ?? TENSION] : [x, y]), // a corner at the base
      // the S's crossbar's fall across its two stems and a slot (locked, at the cuts' slope: tiltOf), at most till its ends meet the corners' rounds
      tilt: q.tilt ? fallOf(tiltOf(p, 2 * stem + slot, slot), H, bar, Math.max(Rr, Rb)) : 0,
      split: q.split && p.split,
      open: !!q.open,
      both: !!q.both,
      dip: q.dip === 0 ? 0 : p.dip ?? DIP,
      lower: Math.max(0, p.lower?.[i] ?? 0),
    };
  };
  /**
   * Letter i's measures with its slot ends lowered (p.lower, Jonas 2026-10-12:
   * "separate per letter setting to lower it only on them"): hi its top
   * ends' high corner, low its bottom ends' low corner; at most till a slot
   * would run into its bend or crossbar (most for its kind, here).
   */
  const ends = (k, most) => { const l = Math.min(k.lower, Math.max(0, most(k))); return { ...k, hi: hi + l, low: low - l }; };

  // An S (sLetter, below): its slots' ends at the letter's hi and low.
  const S = (L, x, R, k) => sLetter({ L, x, R, H, s, ...k });

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
  const A = (L, x, R, k) => poly([k.o(L, 0), k.o(R, 0), k.ob(R, H), [x + s, H], [x + s, lo - s], [x - s, lo - s],
    ...(k.dip ? swoopTo(x - s, L, k, k.Rb, k.ob) : [[x - s, H], k.ob(L, H)])])
    + poly([[x + s, k.hi + k.d, k.r], [x - s, k.hi, k.r2], [x - s, up + s], [x + s, up + s]]);

  // The a, as CM.SUPPLY's latest (Jonas, 2026-10-12: "lets explore having
  // both capital and lowercase a"): the stem square on the right, the bowl
  // rounded on the left; its slot closed and cut at both ends, a bar above
  // where the bowl meets the stem, and the foot swooping from there.
  const a = (L, x, R, k) => poly([k.o(L, 0), [R, 0], k.ob(R, H), [x + s, H], ...swoopTo(x + s, L, k, k.Rr, k.o)]) // its bowl's corner rounds with its top
    + poly([[x + s, k.hi + k.d, k.r], [x - s, k.hi, k.r2], [x - s, H - swoop - bar - k.d, k.r], [x + s, H - swoop - bar, k.r2]]);

  // The H, as the original's; its right corners, the word's, rounded.
  const Hh = (L, x, R, { o, ob, both }) => poly([
    both ? o(L, 0) : [L, 0], [x - s, 0], [x - s, up + s], [x + s, up + s], [x + s, 0], o(R, 0),
    ob(R, H), [x + s, H], [x + s, lo - s], [x - s, lo - s], [x - s, H], both ? ob(L, H) : [L, H],
  ]);

  // How far each kind of letter's slot ends can come in: an S's to half a
  // slot from its bends; the M's to two slots from the baseline; the A's
  // counter to a slot tall; the a's slot to a slot long.
  const most = {
    S: (k) => up - s - hi - k.d - k.r - slot / 2,
    M: (k) => H - hi - k.d - 2 * slot,
    A: (k) => up + s - hi - k.d - k.r - slot,
    a: (k) => H - swoop - bar - hi - 2 * k.d - 2 * k.r - slot,
  };
  return [
    () => S(0, c(0), left(1), ends(own(0), most.S)),
    () => M(right(1), left(4), ends(own(1), most.M)),
    () => (p.a === 'a' ? a : A)(right(4), c(5), left(6), ends(own(2), p.a === 'a' ? most.a : most.A)),
    () => S(right(6), c(7), left(8), ends(own(3), most.S)),
    () => Hh(right(8), c(9), W, own(4)),
  ].map((draw, i) => (only == null || only === i ? draw() : ''));
}

/** The letters as one path, filled evenodd. */
export const letters = (p = SLANT) => letterPaths(p).join('');

/** Path data (M, L, C, A, Z, absolute) moved by dx, dy. */
export function move(d, dx, dy) {
  return [...d.matchAll(/([MLCAZ])([^MLCAZ]*)/g)].map(([, cmd, args]) => {
    if (cmd === 'Z') return 'Z';
    const n = args.trim().split(/[\s,]+/).map(Number);
    const from = cmd === 'A' ? 5 : 0; // an arc's radii and flags stay
    return cmd + n.map((v, i) => (i < from ? f(v) : f(v + ((i - from) % 2 ? dy : dx)))).join(' ');
  }).join('');
}

export const DOWN_FITS = ['wider', 'fill', 'squeeze'];
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
 *   their width.
 * { d, w, h }.
 */
const STEMS = [2, 3, 2, 2, 2]; // S M A S H: their stems, and one slot fewer
export function down(p = SLANT) {
  const fit = p.downFit ?? 'wider';
  if (!DOWN_FITS.includes(fit)) throw new Error(`slant: no fit called ${fit}`);
  const q = { ...p, dip: 0, height: 0 }; // the least height its slots allow
  const slot = p.stroke, stem = p.stem ?? BAR, gap = p.space ?? slot;
  const width = (n, t) => n * t + (n - 1) * slot;
  const widths = STEMS.map((n) => width(n, fit === 'wider' ? stem : 0));
  const w = fit === 'wider' ? Math.max(...widths) : width(fit === 'squeeze' ? 2 : 3, stem);
  let y = 0, d = '';
  const boxes = [];
  STEMS.forEach((n, i) => {
    const t = fit === 'wider' ? stem : (w - (n - 1) * slot) / n; // this letter's stems
    const r = { ...q, stem: t }, b = block(r), lw = width(n, t), x = (w - lw) / 2;
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
 * corners' rounds (room to spare); split runs its slots through it. Its slots
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
function sPath({ L, R, a, b, r, slot, drop = DROP, o = (x, y) => [x, y], grid = 4, cut = 0, tips = 0, tilt = 0, lock = 0, split = 0, round = 0, room = 8 }) {
  const k = Math.min(cut, slot / 2); // the bends' obtuse corners, and their others with tips
  const H = r[5] - r[0], bar = r[3] - r[2], s = slot / 2, sv = (r[2] - r[1]) / 2;
  const d = cutOf(drop, slot, grid);
  // Locked (tiltOf), it falls at its own cuts' slope, d in a slot: across two stems and a slot, scaled to its width below.
  if (lock) tilt = (d / slot) * (2 * (a - L) + slot);
  // The square S's top slot stands left of its middle (its bottom one as far
  // right), where the crossbar rises: at most till a quarter of the slot
  // under the top block stays open and the slot's cut end clear of the top.
  const rise = (b - a - slot) / 2, lift = Math.max(0, Math.min(1.5 * sv, H / 2 - bar / 2 - d - k - room / 2));
  const fall = Math.min(fallOf((tilt * (R - L)) / (2 * (a - L) + slot), H, bar, round, room), rise > 0 ? (lift * (R - L)) / rise : Infinity);
  return sLetter({ L, x: a + s, xb: b + s, R, H, y: r[0], s, sv, bar, d, r: k, r2: tips ? k : 0, o, tilt: fall, split: !!split, open: true });
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
 * as the wordmark's (sPath), room the least it leaves its corners' rounds.
 */
export function symbol({ cols = SYM_COLS, rows = SYM_ROWS, x = 0, y = 0, stop = SM_STOP, round = 1, cut = CUT, tips = 0, drop = DROP, outer = 0, tension = TENSION, grid = 4, tilt = 0, lock = 0, split = 0, room = 8 } = {}) {
  const e = edges(cols, x);
  const r = edges(rows, y);
  const slot = cols[1];
  const d = cutOf(drop, slot, grid);
  const k = round ? Math.min(cut, slot / 2) : 0;
  const top = y + stop;
  const o = rounder(outer, tension, cols, rows);
  const k2 = tips ? k : 0;
  return sPath({ L: e[0], R: e[3], a: e[1], b: e[1], r, slot, drop, o, grid, cut: k, tips, tilt, lock, split, round: o.R, room })
    + poly([o(e[4], r[0]), o(e[9], r[0]), [e[9], r[5]],
      ...[[e[7], e[8]], [e[5], e[6]]].flatMap(([a, b]) => [[b, r[5]], [b, top + d, k], [a, top, k2], [a, r[5]]]),
      [e[4], r[5]]]);
}

/**
 * The S alone, as the original's: 84 × 136; wide draws it out by pitches (1:
 * a square); turn lays it on its side; drop its cuts' slope; stem its stems'
 * width; tilt and split its crossbar's, as the S M's (sPath: the square S's
 * falls at the same angle, across its width), lock its cuts' slope instead.
 */
export function letterS({ wide = 0, turn = false, drop = DROP, stem = BAR, slot = SYM_COLS[1], outer = 0, tension = TENSION, cut = CUT, tips = 0, tilt = 0, lock = 0, split = 0 } = {}) {
  const [bar] = symCols(stem, slot);
  const rows = symRows(slot), h = rows.reduce((t, n) => t + n);
  const o = rounder(outer, tension, [bar], rows);
  const w = 2 * bar + slot + wide * (bar + slot);
  const d = sPath({ L: 0, R: w, a: bar, b: bar + wide * (bar + slot), r: edges(rows, 0), slot, drop, o, cut, tips, tilt, lock, split, round: o.R });
  return turn ? { d: quarterTurn(d, h), w: h, h: w } : { d, w, h };
}
