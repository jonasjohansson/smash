// The SMASH mark as outlines: the five letters left standing when the ten
// slots are cut from the block, as one evenodd path. Same parameters and
// measures as web/src/js/mark.js (its DEFAULTS are the original), so the
// still and the moving mark are one drawing.
//
// Units are the mark's own: 550 × 471. Slots sit on a 51.78 pitch, 20 wide,
// so every stem is 31.78 and both outer edges 32. The closed slot ends are
// round and stop 42 from the edge; the two crossbars (the S bends, the breaks
// in the A and the H) sit 52 apart around the mark's exact middle, 235.5.
//
// The symbol, the S M, is read from the modular mark (modular.js), so the two
// are one drawing: see smMeasures() below.

import { geometry as modularGeometry, MODULAR_DEFAULTS } from '../../modular.js';

export const W = 550;
export const H = 471;
export const PITCH = 51.78;
const FIRST = 42;
const MID = FIRST + PITCH * 4.5;

export const REST = { stroke: 20, corner: 10, inset: 42, crossbar: 235.5, gap: 52, columns: 1 };

// The symbol: the S M, Jonas's crop through the whole M (sketch A), exactly
// as the modular mark draws it (modular.js: markSVG(MODULAR_DEFAULTS, 1)).
// 9 columns by 5 rows of its bars and slots. Across: bar 31.78, then slot 20
// and bar 31.78 in turn, ending on the M's right stem at 238.9. Down: bar,
// slot, bar, slot, bar: 135.34. The S's two slots run out of the top and the
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
export const SYM_W = SYM_COLS.reduce((a, b) => a + b); // 238.9
export const SYM_H = SYM_ROWS.reduce((a, b) => a + b); // 135.34

const edges = (sizes, o) => sizes.reduce((a, n) => [...a, a.at(-1) + n], [o]);

/**
 * How many whole pixels of a slot's n × n corner square stay solid, row by
 * row, when the curve (radius rad, centred at (cx, cy) in pixels from the
 * square's top left) is sampled at pixel centres: counted from the side
 * `from` ('left' or 'right'). The mark's own curves on the pixel grid.
 */
function solidRuns(n, rad, cx, cy, from) {
  return Array.from({ length: n }, (_, j) => {
    let k = 0;
    for (let i = 0; i < n; i++) {
      const px = from === 'left' ? i + 0.5 : n - i - 0.5;
      if (Math.hypot(px - cx, j + 0.5 - cy) > rad) k++;
      else break;
    }
    return k;
  });
}

/**
 * The S M as path data: four closed subpaths (the S in three pieces, the M),
 * clockwise, none overlapping. cols and rows are the band widths (9 and 5);
 * x and y place its top left. bend, ends and stop are the modular mark's: the
 * bend's radius on the slot's centre line (outside it is bend + half a slot,
 * inside bend − half a slot, sharp at the default), round or square closed
 * ends, and how far below the top the M's slots stop.
 *
 * With pixel true (whole-pixel bands, for the favicons) the bends and the
 * slot ends are the mark's curves sampled at pixel centres, as steps: a stair
 * where the grid can show one, square where it can't. There the bend is the
 * default's (radius one slot outside) and the M's slots stop one bar down.
 */
export function symbolA({ cols = SYM_COLS, rows = SYM_ROWS, x = 0, y = 0, pixel = false, bend = SM.bend, ends: endKind = SM.ends, stop = SM.stop } = {}) {
  const e = edges(cols, x);
  const r = edges(rows, y);
  const P = (px, py) => `${f(px)} ${f(py)}`;
  const L = (pts) => pts.map((p) => `L${P(...p)}`).join('');
  const slot = cols[1];
  const half = slot / 2;
  // The S's two turns and the corners inside them.
  let upper; // from the top slot's left edge, round its outer corner, onto the middle bar's top
  let lower; // from the bottom slot's right edge, round its outer corner, onto the middle bar's bottom
  let tr = `M${P(e[2], r[0])}L${P(e[3], r[0])}L${P(e[3], r[1])}L${P(e[2], r[1])}Z`; // above the upper turn
  let bl = `M${P(e[0], r[4])}L${P(e[1], r[4])}L${P(e[1], r[5])}L${P(e[0], r[5])}Z`; // below the lower turn
  if (pixel) {
    const up = solidRuns(slot, slot, slot, 0, 'left'); // the corner square e1..e2 × r1..r2; the curve's centre at its top right
    upper = L([[e[1], r[1]], ...up.flatMap((n, j) => [[e[1] + n, r[1] + j], [e[1] + n, r[1] + j + 1]])]);
    const lo = solidRuns(slot, slot, 0, slot, 'right'); // e1..e2 × r3..r4; the centre at its bottom left
    lower = L([[e[2], r[4]], ...lo.map((n, j) => [n, j]).reverse().flatMap(([n, j]) => [[e[2] - n, r[3] + j + 1], [e[2] - n, r[3] + j]])]);
  } else {
    // As modular.js strokes a filleted centre line: the fillet is k (the
    // upper turn's run to the next slot is one pitch, so at most half that),
    // the outside edge k + half, the inside edge k − half (sharp at 0).
    const k1 = Math.max(0, Math.min(bend, (cols[1] + cols[2]) / 2));
    const k2 = Math.max(0, bend);
    const c0 = (e[1] + e[2]) / 2; // the S's slot column
    const up = (r[1] + r[2]) / 2; // the upper turn's centre line
    const lo = (r[3] + r[4]) / 2; // the lower one's
    const o1 = [c0 + k1, up - k1]; // the upper fillet's centre
    const o2 = [c0 - k2, lo + k2]; // the lower one's
    const arc = (rad, sweep, to) => `A${f(rad)} ${f(rad)} 0 0 ${sweep} ${P(...to)}`;
    upper = `L${P(e[1], o1[1])}${arc(k1 + half, 0, [o1[0], r[2]])}`;
    lower = `L${P(e[2], o2[1])}${arc(k2 + half, 0, [o2[0], r[3]])}`;
    if (k1 - half > 0.01) tr = `M${P(e[2], r[0])}L${P(e[3], r[0])}L${P(e[3], r[1])}L${P(o1[0], r[1])}${arc(k1 - half, 1, [e[2], o1[1]])}Z`;
    if (k2 - half > 0.01) bl = `M${P(e[0], r[4])}L${P(o2[0], r[4])}${arc(k2 - half, 1, [e[1], o2[1]])}L${P(e[1], r[5])}L${P(e[0], r[5])}Z`;
  }
  // The S: its body runs from the top left down, across the middle bar and down to the bottom right.
  const body = `M${P(e[0], r[0])}L${P(e[1], r[0])}${upper}L${P(e[3], r[2])}L${P(e[3], r[5])}L${P(e[2], r[5])}${lower}L${P(e[0], r[3])}Z`;
  // The M: two slots up from the bottom, stopping under the top bar, round or square.
  const ends = pixel ? solidRuns(slot, half, half, half, 'left').slice(0, Math.ceil(half)) : null; // symmetric, so one side serves both
  const top = y + stop; // where a closed end's top is
  let m = `M${P(e[4], r[0])}L${P(e[9], r[0])}L${P(e[9], r[5])}`;
  for (const [a, b] of [[e[7], e[8]], [e[5], e[6]]]) {
    m += `L${P(b, r[5])}`;
    if (pixel) {
      m += L(ends.map((n, j) => [n, j]).reverse().flatMap(([n, j]) => [[b - n, r[1] + j + 1], [b - n, r[1] + j]]));
      m += L(ends.flatMap((n, j) => [[a + n, r[1] + j], [a + n, r[1] + j + 1]]));
    } else if (endKind === 'square') {
      m += `L${P(b, top)}L${P(a, top)}`;
    } else {
      m += `L${P(b, top + half)}A${f(half)} ${f(half)} 0 0 0 ${P(a, top + half)}`;
    }
    m += `L${P(a, r[5])}`;
  }
  m += `L${P(e[4], r[5])}Z`;
  const d = body + tr + bl + m;
  return pixel ? corners(d) : d;
}

/** Path data of straight lines only (M, L, Z), with every point that is not a corner dropped. */
function corners(d) {
  return d.split('M').filter(Boolean).map((sub) => {
    const pts = sub.replace('Z', '').split('L').map((p) => p.trim().split(/\s+/).map(Number));
    const keep = pts.filter((p, i) => {
      const a = pts.at(i - 1);
      const b = pts[(i + 1) % pts.length];
      return (b[0] - p[0]) * (p[1] - a[1]) - (b[1] - p[1]) * (p[0] - a[0]) !== 0; // turns here
    });
    return `M${keep.map(([px, py]) => `${f(px)} ${f(py)}`).join('L')}Z`;
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

const f = (n) => String(+n.toFixed(2));
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
