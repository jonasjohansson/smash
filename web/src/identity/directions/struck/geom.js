// Struck: the geometry. The SMASH labyrinth drawn letter by letter as outlines
// (not as a mask), so its slots can lean, and every still stays plain vector:
// closed outlines with true arcs, no two sharing an edge.
//
// The measures are the mark's own (web/src/js/mark.js): a block 550 x 471,
// ten slot columns on a 51.78 pitch, slots 20 wide, closed ends 42 from the
// edge with round caps, crossbar slots at 209.5 and 261.5, S bends filleted at
// 10 on the centre line (so 20 outside and sharp inside).
//
// The lean, towards a point I (the logo's: the middle of the A's crossbar):
// - Every slot leans towards I. The lean steps up by one angle per pitch away
//   from I and down by one per pitch towards the edge (3.5, 7, 10.5 degrees),
//   so each bar tapers by the same small amount and none is pinched.
// - Left of I the slots fold on the upper crossbar line, right of I on the
//   lower one: the crease steps down through the A, where I is. The S, A and H
//   slots, which stop at the crossbar, fold out of sight inside it.
// - Where each column sits is solved so every bar stays as close to its own
//   width as it can at the frame, the closed ends and the folds alike
//   (between 0.67 and 1.3 of it). The column under I is pinned.
// - Anywhere else I goes, the lean is scaled down until the logo's limits hold
//   again (leanScale): bars within 0.665 to 1.305 of their width, no slot
//   steeper than 10.5 degrees.
// k = 0 is today's mark; k = 1 is the logo. Nothing is cut: no cracks.

import { UNITS, DEFAULTS } from '/js/mark.js';

export const W = UNITS.w; // 550
export const H = UNITS.h; // 471
export const S = DEFAULTS.stroke / 2; // half a slot: 10
export const PITCH = 51.78; // as in mark.js
export const BAR = PITCH - 2 * S; // 31.78
const FIRST = 42;
const BEND = 2 * S; // outer radius of an S bend
const OVER = 80; // edges run on past the frame, so they can be read anywhere
export const col = (i) => FIRST + PITCH * i;
export { FIRST };

/** The mark's frame and crossbar: y0 and y1 its top and bottom, inset the closed ends, up and lo the crossbar slots. */
export const MARK = {
  y0: 0, y1: H,
  inset: DEFAULTS.inset,
  up: DEFAULTS.crossbar - DEFAULTS.gap / 2,
  lo: DEFAULTS.crossbar + DEFAULTS.gap / 2,
};

/**
 * The logo's lean: towards the A's crossbar, where the slots already break.
 * theta is the lean's step (degrees), step how far above and below I the
 * slots fold (the crossbar lines).
 */
export const CANON = { ix: col(5), iy: DEFAULTS.crossbar, k: 1, theta: 3.5, step: 26 };

// ---------------------------------------------------------------- columns

/** A column at c, pulled by d at height iy and held at the frame: its centre line and both edges. */
export function column(c, d, iy, fr = MARK, half = S) {
  return arms(c, c + d, iy, c, fr, half);
}

/**
 * A column as two straight arms: from xt on the frame's top, to the fold at
 * (xf, yf), to xb on the frame's bottom. Each arm runs on straight past the
 * frame, so its edges cross the frame cleanly (no stub, no extra point).
 */
export function arms(xt, xf, yf, xb, fr = MARK, half = S) {
  const su = (xf - xt) / (yf - fr.y0);
  const sl = (xb - xf) / (fr.y1 - yf);
  const ctr = [[xt - su * OVER, fr.y0 - OVER], [xf, yf], [xb + sl * OVER, fr.y1 + OVER]];
  return { c: xf, xt, xf, yf, xb, ctr, half, L: offset(ctr, -half), R: offset(ctr, half) };
}

/** A polyline offset sideways by o (o < 0: to the left of a line running down), mitred. */
function offset(pts, o) {
  const n = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    const l = Math.hypot(bx - ax, by - ay);
    n.push([-(by - ay) / l, (bx - ax) / l]); // to the left
  }
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    if (i === 0 || i === pts.length - 1) {
      const m = n[Math.min(i, n.length - 1)];
      out.push([pts[i][0] - m[0] * o, pts[i][1] - m[1] * o]);
      continue;
    }
    const m1 = n[i - 1];
    const m2 = n[i];
    const a1 = [pts[i - 1][0] - m1[0] * o, pts[i - 1][1] - m1[1] * o];
    const d1 = [pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]];
    const a2 = [pts[i][0] - m2[0] * o, pts[i][1] - m2[1] * o];
    const d2 = [pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]];
    const den = d1[0] * d2[1] - d1[1] * d2[0];
    if (Math.abs(den) < 1e-9) { out.push(a2); continue; }
    const t = ((a2[0] - a1[0]) * d2[1] - (a2[1] - a1[1]) * d2[0]) / den;
    out.push([a1[0] + d1[0] * t, a1[1] + d1[1] * t]);
  }
  return out;
}

function seg(pl, y) {
  for (let i = 0; i < pl.length - 2; i++) if (y <= pl[i + 1][1]) return i;
  return pl.length - 2;
}
/** x on a polyline (running down) at height y. */
export function xAt(pl, y) {
  const i = seg(pl, y);
  const [ax, ay] = pl[i];
  const [bx, by] = pl[i + 1];
  return ax + (bx - ax) * (by === ay ? 0 : (y - ay) / (by - ay));
}
/** The unit direction (running down) of a polyline at height y. */
function dirAt(pl, y) {
  const i = seg(pl, y);
  const [ax, ay] = pl[i];
  const [bx, by] = pl[i + 1];
  const l = Math.hypot(bx - ax, by - ay);
  return [(bx - ax) / l, (by - ay) / l];
}
const edge = (x) => [[x, -1e4], [x, 1e4]];

// ---------------------------------------------------------------- the lean

/** Where I may go: far enough from the frame that no fold lands near a closed end. */
export const clampI = (iy, f = MARK) => Math.min(f.y1 - 140, Math.max(f.y0 + 140, iy));

/** The columns whose own slot stops in the crossbar band (the S's, the A's, the H's): their fold hides there. */
const BROKEN = new Set([0, 5, 7, 9]);

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** Solve a small linear system (Gaussian elimination with pivoting). */
function solve(A, b) {
  const n = b.length;
  const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let m = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[m][c])) m = r;
    [M[c], M[m]] = [M[m], M[c]];
    for (let r = c + 1; r < n; r++) {
      const q = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= q * M[c][k];
    }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let v = M[r][n];
    for (let k = r + 1; k < n; k++) v -= M[r][k] * x[k];
    x[r] = v / M[r][r];
  }
  return x;
}

/**
 * The lean, column by column: where each column meets the top of the frame
 * (xt), where it folds (xf, yf) and where it meets the bottom (xb). p.k scales
 * the lean (p.kcol, if given, per column: the motion lets the lean ripple out
 * from I). The positions are solved so every bar keeps as close to its own
 * width as it can, at the frame, the closed ends and the folds alike: the lean
 * is shared between the frame and the fold instead of pinching the bars at I.
 */
export function layout(p, f = MARK) {
  // Wherever I goes, the lean is held to the logo's limits: bars
  // between 0.665 and 1.305 of their width, and no slot steeper than LEAN_MAX.
  return solveLayout(p, f, leanScale(p, f));
}

/** The logo's limits, which the lean towards any other point is normalised to. */
export const BAR_MIN = 0.665;
export const BAR_MAX = 1.305;
export const LEAN_MAX = 10.5;

const scales = new Map();
/** The largest share (0..1) of the lean towards p's point that keeps the logo's limits. Depends only on where the point is. */
export function leanScale(p, f = MARK) {
  const key = `${p.ix.toFixed(2)},${p.iy.toFixed(2)},${p.theta},${p.step},${f.y1},${f.x1 ?? W}`;
  let s = scales.get(key);
  if (s !== undefined) return s;
  const q = { ...p, k: 1, kcol: null };
  const ok = (v) => {
    const st = layoutStats(solveLayout(q, f, v), f);
    return st.lo >= BAR_MIN * BAR - 1e-6 && st.hi <= BAR_MAX * BAR + 1e-6 && st.max <= LEAN_MAX + 0.05;
  };
  if (ok(1)) s = 1;
  else {
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 14; i++) { const m = (lo + hi) / 2; if (ok(m)) lo = m; else hi = m; }
    s = lo;
  }
  if (scales.size > 800) scales.clear();
  scales.set(key, s);
  return s;
}

function solveLayout(p, f, scale = 1) {
  const iy = clampI(p.iy, f);
  const band = [f.up + S + 10, f.lo - S - 10];
  const mid = (f.up + f.lo) / 2;
  const step = p.step ?? 0;
  const cs = Array.from({ length: 10 }, (_, i) => col(i));
  const yf = cs.map((c, i) => {
    const side = Math.tanh((c - p.ix) / 6);
    const open = iy + side * step;
    if (!BROKEN.has(i)) return open;
    const hidden = Math.min(band[1], Math.max(band[0], iy));
    return hidden + (open - hidden) * smooth(30, 80, Math.abs(iy - mid));
  });
  // The lean of each column, as the tangent of its angle (towards I is positive):
  // one step per pitch away from I, and one step less per pitch towards the edge.
  const unit = Math.tan((p.theta * Math.PI) / 180);
  const tan = cs.map((c, i) => {
    const dx = c - p.ix;
    const toI = Math.abs(dx) / PITCH;
    const toEdge = (dx < 0 ? c + S - 0.22 : W - c + S - 0.22) / PITCH;
    return -Math.sign(dx) * scale * (p.kcol ? p.kcol[i] : p.k) * unit * Math.max(0, Math.min(toI, toEdge));
  });
  // How far each arm travels sideways between the frame and its fold (towards I).
  const d = cs.map((c, i) => tan[i] * (yf[i] - f.y0));
  const e = cs.map((c, i) => tan[i] * (f.y1 - yf[i]));
  // x of column i at height y is xf[i] + off(i, y).
  const off = (i, y) => (y <= yf[i] ? -d[i] * (yf[i] - y) / (yf[i] - f.y0) : -e[i] * (y - yf[i]) / (f.y1 - yf[i]));
  const Y = [...new Set([f.y0, f.y0 + f.inset, ...yf, f.y1 - f.inset, f.y1].map((v) => +v.toFixed(3)))];
  const n = 10;
  const A = Array.from({ length: n }, () => new Array(n).fill(0));
  const b = new Array(n).fill(0);
  const add = (coef, rhs, w) => {
    for (const [i, ci] of coef) {
      b[i] += w * ci * rhs;
      for (const [j, cj] of coef) A[i][j] += w * ci * cj;
    }
  };
  for (const y of Y) {
    const wy = y === f.y0 || y === f.y1 ? 0.5 : 1;
    for (let j = 0; j <= n; j++) {
      // bar j lies between boundary j-1 (the left edge, or a column) and boundary j (a column, or the right edge)
      const coef = [];
      let cst = 0;
      if (j < n) { coef.push([j, 1]); cst += off(j, y) - S; } else cst += W;
      if (j > 0) { coef.push([j - 1, -1]); cst -= off(j - 1, y) + S; }
      const target = j === 0 ? FIRST - S : j === n ? W - col(9) - S : BAR;
      add(coef, target - cst, wy);
    }
  }
  cs.forEach((c, i) => {
    // Columns near I hold their place; the one under I exactly is pinned there, so the lean is exact on it.
    const w = 0.05 + 6 * Math.exp(-(((c - p.ix) / 22) ** 2)) + 1e4 * Math.exp(-(((c - p.ix) / 0.5) ** 2));
    A[i][i] += w;
    b[i] += w * c;
  });
  const xf = solve(A, b);
  return cs.map((c, i) => ({ xt: xf[i] - d[i], xf: xf[i], yf: yf[i], xb: xf[i] - e[i] }));
}

/** Every column of the struck mark. */
export function columns(p, f = MARK) {
  return layout(p, f).map((q) => arms(q.xt, q.xf, q.yf, q.xb, f));
}

/** Bar widths (in units) at the frame, the closed ends and every fold height: [min, max], and each column's lean in degrees. */
export function stats(p, f = MARK) {
  return layoutStats(layout(p, f), f);
}

function layoutStats(L, f = MARK) {
  const c = L.map((q) => arms(q.xt, q.xf, q.yf, q.xb, f));
  const ys = [...new Set([f.y0, f.y0 + f.inset, ...c.map((k) => k.ctr[1][1]), f.y1 - f.inset, f.y1])];
  let lo = Infinity;
  let hi = -Infinity;
  for (let j = 0; j <= 10; j++) {
    const ws = ys.map((y) => (j < 10 ? xAt(c[j].ctr, y) - S : W) - (j > 0 ? xAt(c[j - 1].ctr, y) + S : 0));
    lo = Math.min(lo, ...ws);
    hi = Math.max(hi, ...ws);
  }
  const lean = c.map((k) => {
    const [a, m, z] = k.ctr;
    return [Math.atan2(m[0] - a[0], m[1] - a[1]), Math.atan2(z[0] - m[0], z[1] - m[1])].map((v) => +((v * 180) / Math.PI).toFixed(1));
  });
  return { lo, hi, lean, max: Math.max(...lean.flat().map(Math.abs)) };
}

// ---------------------------------------------------------------- outlines

/** A closed outline under construction: points, each with a fillet radius. */
class Loop {
  constructor() { this.pts = []; }
  at(x, y, r = 0) { this.pts.push({ x, y, r }); return this; }
  /** Along a polyline from height y0 to y1 (either way), both ends included. */
  run(pl, y0, y1) {
    this.at(xAt(pl, y0), y0);
    const inner = pl.filter(([, y]) => y > Math.min(y0, y1) + 1e-6 && y < Math.max(y0, y1) - 1e-6);
    if (y1 < y0) inner.reverse();
    for (const [x, y] of inner) this.at(x, y);
    return this.at(xAt(pl, y1), y1);
  }
  /**
   * A round slot end on column k, its cap centred at height ye (`top`: the slot
   * runs down from it). Runs along one edge from height y0 up to the cap, round
   * it, and back along the other edge to height y1 (fromRight: arrives on the
   * right edge). The cap is a square end with both corners filleted at half a
   * slot: a true half circle, whatever the lean.
   */
  end(k, ye, top, fromRight, y0, y1, r = k.half) {
    const h = k.half;
    const [ux, uy] = dirAt(k.ctr, ye);
    const out = top ? [-ux, -uy] : [ux, uy];
    const n = [-uy, ux];
    const e = [xAt(k.ctr, ye), ye];
    const side = (sg) => [e[0] + n[0] * h * sg, e[1] + n[1] * h * sg];
    const [a, b] = fromRight ? [side(-1), side(1)] : [side(1), side(-1)];
    const [ea, eb] = fromRight ? [k.R, k.L] : [k.L, k.R];
    this.run(ea, y0, a[1]);
    this.at(a[0] + out[0] * h, a[1] + out[1] * h, r);
    this.at(b[0] + out[0] * h, b[1] + out[1] * h, r);
    return this.run(eb, b[1], y1);
  }
  /** Mark the last point as a fillet of radius r. */
  round(r) { this.pts.at(-1).r = r; return this; }
}

const f2 = (v) => +v.toFixed(2);

/**
 * A closed outline as drawing steps: straight lines, and each marked corner
 * filleted with a true arc ({ x, y } lines; { x, y, r, sweep, cx, cy, a0, a1 } arcs, from the step before).
 */
export function loopSteps(pts) {
  const P = [];
  for (const q of pts) {
    const last = P.at(-1);
    if (last && Math.hypot(q.x - last.x, q.y - last.y) < 1e-4) { last.r = Math.max(last.r, q.r); continue; }
    P.push({ ...q });
  }
  if (P.length > 2 && Math.hypot(P[0].x - P.at(-1).x, P[0].y - P.at(-1).y) < 1e-4) P.pop();
  const n = P.length;
  const out = [];
  let last = null;
  const line = (x, y) => {
    if (last && Math.hypot(x - last[0], y - last[1]) < 1e-3) return;
    out.push({ x, y });
    last = [x, y];
  };
  for (let i = 0; i < n; i++) {
    const b = P[i];
    if (!b.r) { line(b.x, b.y); continue; }
    const a = P[(i - 1 + n) % n];
    const c = P[(i + 1) % n];
    const la = Math.hypot(a.x - b.x, a.y - b.y);
    const lc = Math.hypot(c.x - b.x, c.y - b.y);
    const u1 = [(a.x - b.x) / la, (a.y - b.y) / la];
    const u2 = [(c.x - b.x) / lc, (c.y - b.y) / lc];
    const ang = Math.acos(Math.max(-1, Math.min(1, u1[0] * u2[0] + u1[1] * u2[1])));
    if (ang > Math.PI - 1e-4) { line(b.x, b.y); continue; }
    let t = b.r / Math.tan(ang / 2);
    t = Math.min(t, la * (a.r ? 0.5 : 1), lc * (c.r ? 0.5 : 1));
    const r = t * Math.tan(ang / 2);
    const p1 = [b.x + u1[0] * t, b.y + u1[1] * t];
    const p2 = [b.x + u2[0] * t, b.y + u2[1] * t];
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    line(p1[0], p1[1]);
    const bis = [u1[0] + u2[0], u1[1] + u2[1]];
    const k = r / Math.sin(ang / 2) / Math.hypot(...bis);
    const cx = b.x + bis[0] * k;
    const cy = b.y + bis[1] * k;
    out.push({ x: p2[0], y: p2[1], r, sweep: cross > 0 ? 1 : 0, cx, cy, a0: Math.atan2(p1[1] - cy, p1[0] - cx), a1: Math.atan2(p2[1] - cy, p2[0] - cx) });
    last = p2;
  }
  return out;
}

/** A closed outline as SVG path data, in its own units or moved by tx (scaled by `scale`, for the arcs' radii). */
export function loopPath(pts, tx = (x, y) => [x, y], scale = 1) {
  let d = '';
  for (const s of loopSteps(pts)) {
    const [X, Y] = tx(s.x, s.y);
    if (s.r && d) d += `A${f2(s.r * scale)} ${f2(s.r * scale)} 0 0 ${s.sweep} ${f2(X)} ${f2(Y)}`;
    else d += `${d ? 'L' : 'M'}${f2(X)} ${f2(Y)}`;
  }
  return d + 'Z';
}

// ---------------------------------------------------------------- letters
// Each traces the ink between two boundaries (the edges of the columns either
// side, or the frame) round its own slots, clockwise.

/** An S, its slot on column j: down from the top, bent into the right boundary; in from the left, bent down. */
function letterS(BL, BR, j, f = MARK) {
  const { y0, y1, inset, up, lo } = f;
  const o = new Loop();
  o.run(BL, y0, y0).run(BR, y0, up - S);
  o.at(xAt(j.R, up - S), up - S); // inside of the bend: sharp
  o.end(j, y0 + inset, true, true, up - S, up + S).round(BEND);
  o.run(BR, up + S, y1).run(BL, y1, lo + S);
  o.at(xAt(j.L, lo + S), lo + S);
  o.end(j, y1 - inset, false, false, lo + S, lo - S).round(BEND);
  o.run(BL, lo - S, y0);
  return [o.pts];
}

/** An M: two slots closed at the top and open at the bottom. */
function letterM(BL, BR, a, b, f = MARK) {
  const o = new Loop();
  o.run(BL, f.y0, f.y0).run(BR, f.y0, f.y1);
  for (const k of [b, a]) o.end(k, f.y0 + f.inset, true, true, f.y1, f.y1);
  o.run(BL, f.y1, f.y0);
  return [o.pts];
}

/** An A: a counter closed at the top and flat on the crossbar, and a leg open below. */
function letterA(BL, BR, k, f = MARK) {
  const o = new Loop();
  o.run(BL, f.y0, f.y0).run(BR, f.y0, f.y1);
  o.run(k.R, f.y1, f.lo - S).run(k.L, f.lo - S, f.y1);
  o.run(BL, f.y1, f.y0);
  const hole = new Loop();
  hole.end(k, f.y0 + f.inset, true, true, f.up + S, f.up + S);
  return [o.pts, hole.pts];
}

/** An H: its slot open at both ends, broken by the crossbar. */
function letterH(BL, BR, k, f = MARK) {
  const o = new Loop();
  o.run(BL, f.y0, f.y0).run(k.L, f.y0, f.up + S).run(k.R, f.up + S, f.y0).run(BR, f.y0, f.y1);
  o.run(k.R, f.y1, f.lo - S).run(k.L, f.lo - S, f.y1);
  o.run(BL, f.y1, f.y0);
  return [o.pts];
}

/** The struck mark: its outlines, as loops of points, letter by letter ([outer, ...holes] each). */
export function markLoops(p, f = MARK) {
  const c = columns(p, f);
  return [
    letterS(edge(0), c[1].L, c[0], f),
    letterM(c[1].R, c[4].L, c[2], c[3], f),
    letterA(c[4].R, c[6].L, c[5], f),
    letterS(c[6].R, c[8].L, c[7], f),
    letterH(c[8].R, edge(W), c[9], f),
  ];
}

/** The mark, leaning, as one path: in its own units or moved by tx (scaled by `scale`, for the arcs). Fill evenodd: the A's counter is a hole. */
export function markPath(p, f = MARK, tx, scale) {
  return markLoops(p, f).flat().map((l) => loopPath(l, tx, scale)).join('');
}

// ---------------------------------------------------------------- symbol

/**
 * The symbol: the point the mark leans towards, lifted out of the block. A
 * square pane of the mark's own measures with three slots: the A's slot,
 * broken at the crossbar (its counter closed at the top, its leg out through
 * the bottom, as in the logo), and a slot either side, leaning in towards the
 * break as a chevron. The left one folds level with the counter's floor and
 * the right one level with the leg's top, so the crease steps down through the
 * break as in the logo. `fold` of each side slot's travel is taken at its fold
 * and the rest at its ends, so the A's stems keep their width. For the
 * favicons the same drawing is tuned to whole pixels (border, bar, slot, brk).
 */
export function symbolGeom({ border = 36, bar = BAR, slot = 2 * S, theta = 15, fold = 8, brk = BAR } = {}) {
  const half = slot / 2;
  const Q = 2 * border + 2 * bar + 3 * slot;
  const m = Q / 2;
  const f = { y0: 0, y1: Q, x0: 0, x1: Q, inset: border + half, up: m - brk / 2 - half, lo: m + brk / 2 + half };
  const x0 = border + half;
  const t = Math.tan((theta * Math.PI) / 180);
  // The side slots fold level with the crossbar's faces.
  const yfL = m - brk / 2;
  const yfR = m + brk / 2;
  const side = (x, yf, sg) => arms(x - sg * (t * yf - fold), x + sg * fold, yf, x - sg * (t * (Q - yf) - fold), f, half);
  const a = side(x0, yfL, 1);
  const b = column(x0 + slot + bar, 0, m, f, half);
  const c = side(x0 + 2 * (slot + bar), yfR, -1);
  const counter = new Loop().end(b, f.inset, true, true, m - brk / 2, m - brk / 2).pts;
  // As cropped from the logo: the side slots run out through the top and the bottom, so the pane is three pieces.
  const left = new Loop().at(0, 0).run(a.L, 0, Q).at(0, Q).pts;
  const right = new Loop().at(Q, Q).run(c.R, Q, 0).at(Q, 0).pts;
  const mid = new Loop();
  mid.run(a.R, 0, Q).run(b.L, Q, m + brk / 2).run(b.R, m + brk / 2, Q).run(c.L, Q, 0);
  return { Q, loops: [left, right, mid.pts, counter], cols: [a, b, c], f };
}
