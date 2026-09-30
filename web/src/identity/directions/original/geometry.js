// The SMASH mark as outlines: the five letters left standing when the ten
// slots are cut from the block, as one evenodd path. Same parameters and
// measures as web/src/js/mark.js (its DEFAULTS are the original), so the
// still and the moving mark are one drawing.
//
// Units are the mark's own, on a grid of 4 (2026-09-30): 552 × 472. Slots
// sit on a 52 pitch, 20 wide, so every bar is 32 (8 : 5). The closed slot ends
// are round and stop 42 from the edge (their centres one pitch in); the two
// crossbars (the S bends, the breaks in the A and the H) sit a pitch apart
// around the mark's exact middle, 236.
//
// The symbol, the S M, is read from the modular mark (modular.js), so the two
// are one drawing: see smMeasures() below.

import { geometry as modularGeometry, MODULAR_DEFAULTS } from '../../modular.js';

export const W = 552;
export const H = 472;
export const PITCH = 52;
const FIRST = 42;
const MID = FIRST + PITCH * 4.5;

export const REST = { stroke: 20, corner: 10, inset: 42, crossbar: 236, gap: 52, columns: 1 };

// The symbol: the S M, Jonas's crop through the whole M (sketch A), exactly
// as the modular mark draws it (modular.js: markSVG(MODULAR_DEFAULTS, 1)).
// 9 columns by 5 rows of its bars and slots. Across: bar 32, then slot 20
// and bar 32 in turn, ending on the M's right stem at 240. Down: bar, slot,
// bar, slot, bar: 136. The S's two slots run out of the top and the
// bottom and turn through its bends (sharp inside, radius 20 outside); the
// slot between the S and the M runs right through; the M's two slots hang
// from its top bar with round ends.

/**
 * The S M's measures, read from the modular mark's geometry for settings p:
 * the widths of its nine columns and five rows, the bend (on the slot's centre
 * line), the closed ends, and where the M's slots stop, from the top.
 */
export function smMeasures(p = MODULAR_DEFAULTS) {
  const g = modularGeometry(p, 1);
  const half = g.s / 2;
  const xs = [0, ...[0, 1, 2, 3].flatMap((i) => [g.c(i) - half, g.c(i) + half]), g.w];
  const steps = (a) => a.slice(1).map((v, i) => v - a[i]);
  const closed = g.slots.find((sl) => sl.start === 'end'); // the M's first slot, closed at the top
  return { cols: steps(xs), rows: steps(g.y), bend: p.bend, ends: p.ends, stop: closed.pts[0][1] - half };
}

const SM = smMeasures();
export const SYM_COLS = SM.cols;
export const SYM_ROWS = SM.rows;
export const SYM_W = SYM_COLS.reduce((a, b) => a + b); // 240
export const SYM_H = SYM_ROWS.reduce((a, b) => a + b); // 136

const edges = (sizes, o) => sizes.reduce((a, n) => [...a, a.at(-1) + n], [o]);
const f = (n) => String(+n.toFixed(2));
const P = (px, py) => `${f(px)} ${f(py)}`;
const arc = (rad, sweep, to) => `A${f(rad)} ${f(rad)} 0 0 ${sweep} ${P(...to)}`;

/**
 * An S as path data: three closed subpaths (its body, and the two blocks its
 * slots cut off), clockwise, none overlapping. L and R are its left and right
 * edges; a and b the left edges of its top slot and its bottom slot (both a
 * bar in, in the S M; in the square S the bottom one is a pitch further
 * right); r its six row edges (bar, slot, bar, slot, bar). The top slot runs
 * out of the top and turns right, out through R; the bottom one runs out of
 * the bottom and turns left, out through L. bend is the bends' radius on the
 * slot's centre line, as modular.js strokes a filleted centre line: outside
 * it is bend + half a slot, inside bend − half a slot (sharp at 10, the default).
 */
function sPath({ L, R, a, b, r, slot, bend }) {
  const half = slot / 2;
  const k1 = Math.max(0, Math.min(bend, (a - L + slot) / 2)); // the upper turn's run to the next slot is a pitch, so at most half that
  const k2 = Math.max(0, bend);
  const o1 = [a + half + k1, (r[1] + r[2]) / 2 - k1]; // the upper fillet's centre
  const o2 = [b + half - k2, (r[3] + r[4]) / 2 + k2]; // the lower one's
  const upper = `L${P(a, o1[1])}${arc(k1 + half, 0, [o1[0], r[2]])}`; // down the top slot's left edge, round its outer corner, onto the middle bar's top
  const lower = `L${P(b + slot, o2[1])}${arc(k2 + half, 0, [o2[0], r[3]])}`; // up the bottom slot's right edge, round, onto the middle bar's bottom
  const body = `M${P(L, r[0])}L${P(a, r[0])}${upper}L${P(R, r[2])}L${P(R, r[5])}L${P(b + slot, r[5])}${lower}L${P(L, r[3])}Z`;
  const tr = k1 - half > 0.01 // above the upper turn
    ? `M${P(a + slot, r[0])}L${P(R, r[0])}L${P(R, r[1])}L${P(o1[0], r[1])}${arc(k1 - half, 1, [a + slot, o1[1]])}Z`
    : `M${P(a + slot, r[0])}L${P(R, r[0])}L${P(R, r[1])}L${P(a + slot, r[1])}Z`;
  const bl = k2 - half > 0.01 // below the lower turn
    ? `M${P(L, r[4])}L${P(o2[0], r[4])}${arc(k2 - half, 1, [b, o2[1]])}L${P(b, r[5])}L${P(L, r[5])}Z`
    : `M${P(L, r[4])}L${P(b, r[4])}L${P(b, r[5])}L${P(L, r[5])}Z`;
  return body + tr + bl;
}

/**
 * The S M as path data: four closed subpaths (the S in three pieces, the M),
 * clockwise, none overlapping. cols and rows are the band widths (9 and 5);
 * x and y place its top left. bend, ends and stop are the modular mark's: the
 * bend's radius on the slot's centre line (outside it is bend + half a slot,
 * inside bend − half a slot, sharp at the default), round or square closed
 * ends, and how far below the top the M's slots stop. In pixels: pixelate()
 * (the favicons are the S M on whole pixels, their bends one slot round
 * outside and the M's slots stopping a bar down).
 */
export function symbolA({ cols = SYM_COLS, rows = SYM_ROWS, x = 0, y = 0, bend = SM.bend, ends: endKind = SM.ends, stop = SM.stop } = {}) {
  const e = edges(cols, x);
  const r = edges(rows, y);
  const slot = cols[1];
  const half = slot / 2;
  // The S: bar, slot, bar; both its slots a bar in.
  const s = sPath({ L: e[0], R: e[3], a: e[1], b: e[1], r, slot, bend });
  // The M: two slots up from the bottom, stopping under the top bar, round or square.
  const top = y + stop; // where a closed end's top is
  let m = `M${P(e[4], r[0])}L${P(e[9], r[0])}L${P(e[9], r[5])}`;
  for (const [a, b] of [[e[7], e[8]], [e[5], e[6]]]) {
    m += `L${P(b, r[5])}`;
    m += endKind === 'square' ? `L${P(b, top)}L${P(a, top)}` : `L${P(b, top + half)}A${f(half)} ${f(half)} 0 0 0 ${P(a, top + half)}`;
    m += `L${P(a, r[5])}`;
  }
  return s + m + `L${P(e[4], r[5])}Z`;
}

/**
 * The S alone (Jonas, 2026-09-30), as path data with its size: the S M's S,
 * 84 × 136. wide draws its middle out by that many pitches: at 1 a square,
 * 136 × 136, the top slot still a bar in from the left and the bottom one a
 * bar in from the right. turn lays it on its side, 136 × 84 (a quarter turn
 * either way: the S is the same upside down).
 */
export function letterS({ wide = 0, turn = false } = {}) {
  const [bar, slot] = SYM_COLS;
  const pitch = bar + slot;
  const w = SYM_COLS[0] + SYM_COLS[1] + SYM_COLS[2] + wide * pitch;
  const d = sPath({ L: 0, R: w, a: bar, b: bar + wide * pitch, r: edges(SYM_ROWS, 0), slot, bend: SM.bend });
  return turn ? { d: quarterTurn(d, SYM_H), w: SYM_H, h: w } : { d, w, h: SYM_H };
}

/** Path data (M, L, A, Z, absolute) turned a quarter clockwise in a box h high: (x, y) to (h − y, x). */
function quarterTurn(d, h) {
  return [...d.matchAll(/([MLAZ])([^MLAZ]*)/g)].map(([, cmd, args]) => {
    if (cmd === 'Z') return 'Z';
    const n = args.trim().split(/[\s,]+/).map(Number);
    const [x, y] = n.slice(-2);
    return cmd + [...n.slice(0, -2).map(f), f(h - y), f(x)].join(' ');
  }).join('');
}

/** The centre and the radius of a circle's arc (SVG A, rx = ry = r) from p to q, with its flags. */
export function arcCentre([x1, y1], [x2, y2], r, large, sweep) {
  const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
  const d2 = dx * dx + dy * dy;
  if (!d2) return null;
  const rr = Math.max(r * r, d2);
  const k = Math.sqrt(Math.max(0, (rr - d2) / d2)) * (large === sweep ? -1 : 1);
  return [k * dy + (x1 + x2) / 2, -k * dx + (y1 + y2) / 2, Math.sqrt(rr)];
}

/**
 * Path data with every curve in pixels of q (Jonas, 2026-09-30: "not rounded
 * corners but more pixelated"). Every arc in these marks is a slot's, the slot
 * inside its circle: a round end (a half circle) or the outside of a bend (a
 * quarter). Each becomes steps on pixels counted from its own square, so they
 * sit on the slot's edges, and a pixel is slot where its centre is inside the
 * circle. q 4, the grid: every point on it, the ends step in once, the bends
 * take three steps. q 10, half a slot: square ends, a pixel off each bend.
 * Where a slot is not a whole number of pixels (the motion, as its slots
 * open) the pixels stretch to fit. M, L, A, Z, absolute, in; M, L, Z out,
 * every point a corner.
 */
export function pixelate(d, q) {
  let cur = [0, 0];
  const out = [];
  for (const [, cmd, args] of d.matchAll(/([MLAZ])([^MLAZ]*)/g)) {
    if (cmd === 'Z') { out.push('Z'); continue; }
    const n = args.trim().split(/[\s,]+/).map(Number);
    const to = n.slice(-2);
    const pts = cmd === 'A' ? stepped(cur, to, n[0], n[3], n[4], q) : [to];
    out.push(pts.map(([x, y], i) => `${cmd === 'M' && !i ? 'M' : 'L'}${P(x, y)}`).join(''));
    cur = to;
  }
  return corners(out.join(''));
}

/**
 * An arc from p to q (radius r, its flags) as steps on pixels of about s: the
 * points after p. The marks' arcs are square to the page, so a round end's
 * centre is halfway between its ends and a bend's is a corner of their box
 * (the path's two decimals would put a computed one a little off).
 */
function stepped(p, to, r, large, sweep, s) {
  const chord = Math.hypot(to[0] - p[0], to[1] - p[1]);
  const pts = [];
  if (Math.abs(chord / r - 2) < 0.02) {
    // A round end: pixels across the slot, counted in from its tip.
    const R = chord / 2;
    const c = [(p[0] + to[0]) / 2, (p[1] + to[1]) / 2];
    const u = [(p[0] - c[0]) / R, (p[1] - c[1]) / R]; // from the centre to p
    const v = sweep ? [-u[1], u[0]] : [u[1], -u[0]]; // from the centre to the tip
    const at = (a, b) => [c[0] + a * u[0] + b * v[0], c[1] + a * u[1] + b * v[1]];
    const m = Math.max(1, Math.round((2 * R) / s)); // pixels across
    const k = (2 * R) / m, h = m / 2; // a pixel; the radius in pixels
    for (let i = 0; i < m; i++) {
      const x = h - i - 0.5; // the column's centre, from the slot's middle
      let n = 0; // solid pixels at the tip of this column
      while (h - n - 0.5 > 0 && x * x + (h - n - 0.5) ** 2 >= h * h) n++;
      pts.push(at(R - i * k, R - n * k), at(R - (i + 1) * k, R - n * k));
    }
  } else if (Math.abs(chord / r - Math.SQRT2) < 0.02) {
    // The outside of a bend: pixels in its square, counted from the centre (the slot's inside corner).
    const [ox, oy] = arcCentre(p, to, r, large, sweep);
    const c = [[p[0], to[1]], [to[0], p[1]]].sort((a, b) => Math.hypot(a[0] - ox, a[1] - oy) - Math.hypot(b[0] - ox, b[1] - oy))[0];
    const R = chord / Math.SQRT2;
    const u = [(p[0] - c[0]) / R, (p[1] - c[1]) / R]; // from the centre to p
    const v = [(to[0] - c[0]) / R, (to[1] - c[1]) / R]; // from the centre to q
    const at = (a, b) => [c[0] + a * u[0] + b * v[0], c[1] + a * u[1] + b * v[1]];
    const m = Math.max(1, Math.round(R / s));
    const k = R / m;
    for (let i = m - 1; i >= 0; i--) {
      let n = 0; // slot pixels in this column, out from the centre
      while (n < m && (i + 0.5) ** 2 + (n + 0.5) ** 2 < m * m) n++;
      pts.push(at((i + 1) * k, n * k), at(i * k, n * k));
    }
  } else throw new Error(`pixelate: an arc that is neither a round end nor a bend (${f(chord)} across, radius ${f(r)})`);
  return [...pts, to];
}

/** Path data of straight lines only (M, L, Z), with every point that is not a corner dropped. */
function corners(d) {
  return d.split('M').filter(Boolean).map((sub) => {
    const all = sub.replace('Z', '').split('L').map((p) => p.trim().split(/\s+/).map(Number));
    const pts = all.filter((p, i) => { const a = all.at(i - 1); return p[0] !== a[0] || p[1] !== a[1]; }); // no point twice in a row
    const keep = pts.filter((p, i) => {
      const a = pts.at(i - 1);
      const b = pts[(i + 1) % pts.length];
      return (b[0] - p[0]) * (p[1] - a[1]) - (b[1] - p[1]) * (p[0] - a[0]) !== 0; // turns here
    });
    return `M${keep.map(([px, py]) => P(px, py)).join('L')}Z`;
  }).join('');
}

/** The measures the letters are built from, for parameters p. */
export function measures(p = REST) {
  const s = p.stroke / 2;
  const c = (i) => MID + (FIRST + PITCH * i - MID) * p.columns;
  return {
    s, c,
    r: p.corner,
    top: p.inset,
    bot: H - p.inset,
    up: p.crossbar - p.gap / 2,
    lo: p.crossbar + p.gap / 2,
  };
}

let T = { sx: 1, sy: 1, dx: 0, dy: 0 }; // the placement of the letters being drawn
const pt = (x, y) => `${f(x * T.sx + T.dx)} ${f(y * T.sy + T.dy)}`;
const radii = (r) => `${f(r * T.sx)} ${f(r * T.sy)}`;

/**
 * The letters as path data, in mark units, or placed by t = { sx, sy, dx, dy }
 * (a scale, then a move: fitting the mark to a pixel grid). Each letter is one
 * closed subpath traced clockwise; the A's counter is a second subpath, so the
 * whole is filled with fill-rule evenodd.
 */
export function letters(p = REST, t) {
  return letterPaths(p, t).join('');
}

/** The same, one path per letter: S, M, A, S, H. */
export function letterPaths(p = REST, t = { sx: 1, sy: 1, dx: 0, dy: 0 }) {
  T = t;
  const { s, c, r, top, bot, up, lo } = measures(p);
  const ri = Math.max(0, r - s); // the inside of a bend: 0 at rest, a sharp corner
  const ro = r + s; // the outside of a bend
  const cap = (x, y, sweep, toX) => `A${radii(s)} 0 0 ${sweep} ${pt(toX, y)}`;

  // An S: the slot from the top turns right into the next full slot; the
  // slot from the left turns down. ax is its slot column, L and R its edges.
  const S = (L, ax, R) => {
    let d = `M${pt(L, 0)}L${pt(R, 0)}L${pt(R, up - s)}`;
    d += ri > 0.01 ? `L${pt(ax + r, up - s)}A${radii(ri)} 0 0 1 ${pt(ax + s, up - r)}` : `L${pt(ax + s, up - s)}`;
    d += `L${pt(ax + s, top)}${cap(ax, top, 0, ax - s)}`;
    d += `L${pt(ax - s, up - r)}A${radii(ro)} 0 0 0 ${pt(ax + r, up + s)}`;
    d += `L${pt(R, up + s)}L${pt(R, H)}L${pt(L, H)}L${pt(L, lo + s)}`;
    d += ri > 0.01 ? `L${pt(ax - r, lo + s)}A${radii(ri)} 0 0 1 ${pt(ax - s, lo + r)}` : `L${pt(ax - s, lo + s)}`;
    d += `L${pt(ax - s, bot)}${cap(ax, bot, 0, ax + s)}`;
    d += `L${pt(ax + s, lo + r)}A${radii(ro)} 0 0 0 ${pt(ax - r, lo - s)}`;
    d += `L${pt(L, lo - s)}Z`;
    return d;
  };

  // The M: two slots from the bottom, closed at the top.
  const M = (L, R) => {
    let d = `M${pt(L, 0)}L${pt(R, 0)}L${pt(R, H)}`;
    for (const x of [c(3), c(2)]) d += `L${pt(x + s, H)}L${pt(x + s, top)}${cap(x, top, 0, x - s)}L${pt(x - s, H)}`;
    return d + `L${pt(L, H)}Z`;
  };

  // The A: a notch from the bottom up to the crossbar, and the counter above it.
  const A = (L, x, R) =>
    `M${pt(L, 0)}L${pt(R, 0)}L${pt(R, H)}L${pt(x + s, H)}L${pt(x + s, lo - s)}L${pt(x - s, lo - s)}L${pt(x - s, H)}L${pt(L, H)}Z`
    + `M${pt(x - s, up + s)}L${pt(x - s, top)}${cap(x, top, 1, x + s)}L${pt(x + s, up + s)}Z`;

  // The H: a notch from the top and one from the bottom, the crossbar between.
  const Hh = (L, x, R) =>
    `M${pt(L, 0)}L${pt(x - s, 0)}L${pt(x - s, up + s)}L${pt(x + s, up + s)}L${pt(x + s, 0)}L${pt(R, 0)}`
    + `L${pt(R, H)}L${pt(x + s, H)}L${pt(x + s, lo - s)}L${pt(x - s, lo - s)}L${pt(x - s, H)}L${pt(L, H)}Z`;

  const out = [
    S(0, c(0), c(1) - s),
    M(c(1) + s, c(4) - s),
    A(c(4) + s, c(5), c(6) - s),
    S(c(6) + s, c(7), c(8) - s),
    Hh(c(8) + s, c(9), W),
  ];
  T = { sx: 1, sy: 1, dx: 0, dy: 0 };
  return out;
}
