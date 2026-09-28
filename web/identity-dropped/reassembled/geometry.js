// Reassembled: the geometry. Letters drawn as convex tiles, a pane of fracture
// lines cut through the whole word, and the shards put back with a hairline gap.
// Units: cap height 100, y down, baseline at y = 100.

import { clipHalfPlane, polygonArea } from '../../lib.js';

export const CAP = 100;

// ---------------------------------------------------------------- polygons

const area = (p) => polygonArea(p);
const ccw = (p) => (area(p) > 0 ? p : [...p].reverse());
const rect = (x0, y0, x1, y1) => ccw([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]);
/** The convex region inside every half-plane [p, n] (keeps (q - p) · n >= 0), cut from a big box. */
function region(planes, box = [-2000, -2000, 4000, 4000]) {
  let poly = rect(...box);
  for (const [p, n] of planes) { poly = clipHalfPlane(poly, p, n); if (!poly.length) break; }
  return poly;
}
const translate = (poly, dx, dy = 0) => poly.map(([x, y]) => [x + dx, y + dy]);
const mirrorX = (poly, w) => ccw(poly.map(([x, y]) => [w - x, y]));

/** Signed area helpers and a thickness measure (twice the area over the perimeter). */
export function perimeter(poly) {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]; const b = poly[(i + 1) % poly.length];
    s += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return s;
}

/**
 * The union of convex tiles that meet edge to edge or along parts of edges (no overlaps):
 * shared edges cancel, what is left is chained into loops. Outer loops come out with
 * positive area, holes negative. Collinear points are dropped.
 */
export function union(polys) {
  const P = polys.filter((p) => p.length >= 3 && Math.abs(area(p)) > 1e-7).map(ccw);
  // Weld vertices that are the same point computed twice.
  const pts = [];
  const weld = (v) => {
    for (let i = 0; i < pts.length; i++) {
      const q = pts[i];
      if (Math.abs(q[0] - v[0]) < 1e-6 && Math.abs(q[1] - v[1]) < 1e-6) return i;
    }
    pts.push([v[0], v[1]]);
    return pts.length - 1;
  };
  const W = P.map((p) => {
    const out = [];
    for (const v of p) { const i = weld(v); if (out[out.length - 1] !== i) out.push(i); }
    if (out.length > 1 && out[0] === out[out.length - 1]) out.pop();
    return out;
  }).filter((p) => p.length >= 3);
  // Split edges at vertices lying on them (T-junctions).
  const edges = [];
  for (const p of W) {
    for (let e = 0; e < p.length; e++) {
      const ia = p[e]; const ib = p[(e + 1) % p.length];
      const a = pts[ia]; const b = pts[ib];
      const dx = b[0] - a[0]; const dy = b[1] - a[1]; const L2 = dx * dx + dy * dy;
      const on = [];
      for (let i = 0; i < pts.length; i++) {
        if (i === ia || i === ib) continue;
        const v = pts[i];
        const t = ((v[0] - a[0]) * dx + (v[1] - a[1]) * dy) / L2;
        if (t <= 1e-9 || t >= 1 - 1e-9) continue;
        const cx = a[0] + dx * t - v[0]; const cy = a[1] + dy * t - v[1];
        if (cx * cx + cy * cy < 1e-10) on.push([t, i]);
      }
      on.sort((u, w) => u[0] - w[0]);
      let prev = ia;
      for (const [, i] of on) { edges.push([prev, i]); prev = i; }
      edges.push([prev, ib]);
    }
  }
  // Cancel edges that run both ways.
  const count = new Map();
  const k = (a, b) => `${a}>${b}`;
  for (const [a, b] of edges) count.set(k(a, b), (count.get(k(a, b)) ?? 0) + 1);
  const left = [];
  for (const [a, b] of edges) {
    const back = count.get(k(b, a)) ?? 0;
    const fwd = count.get(k(a, b)) ?? 0;
    if (back > 0 && fwd > 0) { count.set(k(b, a), back - 1); count.set(k(a, b), fwd - 1); continue; }
    if (fwd > 0) { left.push([a, b]); count.set(k(a, b), fwd - 1); }
  }
  // Chain into loops; at a pinch point take the sharpest left turn so loops stay simple.
  const out = new Map();
  for (const e of left) { if (!out.has(e[0])) out.set(e[0], []); out.get(e[0]).push(e); }
  const used = new Set();
  const loops = [];
  for (const e0 of left) {
    if (used.has(e0)) continue;
    const loop = [];
    let e = e0;
    let guard = 0;
    while (e && !used.has(e) && guard++ < 10000) {
      used.add(e);
      loop.push(e[0]);
      const cand = (out.get(e[1]) ?? []).filter((c) => !used.has(c));
      if (cand.length <= 1) { e = cand[0]; continue; }
      const a = pts[e[0]]; const b = pts[e[1]];
      const din = Math.atan2(b[1] - a[1], b[0] - a[0]);
      let best = null; let bestTurn = Infinity;
      for (const c of cand) {
        const q = pts[c[1]];
        let turn = Math.atan2(q[1] - b[1], q[0] - b[0]) - din;
        while (turn <= -Math.PI) turn += 2 * Math.PI;
        while (turn > Math.PI) turn -= 2 * Math.PI;
        if (turn < bestTurn) { bestTurn = turn; best = c; }
      }
      e = best;
    }
    if (loop.length >= 3) loops.push(simplify(loop.map((i) => pts[i])));
  }
  return loops.filter((l) => l.length >= 3 && Math.abs(area(l)) > 1e-4);
}

/** Drop points that sit on a straight line between their neighbours. */
export function simplify(loop) {
  let pts = loop;
  let changed = true;
  while (changed && pts.length > 3) {
    changed = false;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[(i - 1 + pts.length) % pts.length]; const b = pts[i]; const c = pts[(i + 1) % pts.length];
      const cr = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]) * Math.hypot(c[0] - b[0], c[1] - b[1]);
      if (len === 0 || Math.abs(cr) / len < 1e-7) { pts = pts.filter((_, j) => j !== i); changed = true; break; }
    }
  }
  return pts;
}

export function inside(pt, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]; const [xj, yj] = poly[j];
    if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

/** Loops from union() grouped as outer loops with the holes inside them. */
export function components(loops) {
  const outers = loops.filter((l) => area(l) > 0).map((l) => ({ outer: l, holes: [] }));
  for (const h of loops.filter((l) => area(l) < 0)) {
    const home = outers.find((o) => inside(h[0], o.outer) || inside(mid(h), o.outer));
    if (home) home.holes.push(h);
  }
  return outers;
}
const mid = (poly) => {
  let x = 0; let y = 0;
  for (const p of poly) { x += p[0]; y += p[1]; }
  return [x / poly.length, y / poly.length];
};

/** The area-weighted centre of a component (outer minus holes). */
export function centreOf(comp) {
  let A = 0; let cx = 0; let cy = 0;
  for (const loop of [comp.outer, ...comp.holes]) {
    for (let i = 0; i < loop.length; i++) {
      const [x1, y1] = loop[i]; const [x2, y2] = loop[(i + 1) % loop.length];
      const c = x1 * y2 - x2 * y1;
      A += c; cx += (x1 + x2) * c; cy += (y1 + y2) * c;
    }
  }
  A /= 2;
  return [cx / (6 * A), cy / (6 * A), A];
}

// ---------------------------------------------------------------- letters

/**
 * The letters as convex tiles that meet edge to edge. The drawing's parameters:
 *   stem    vertical stem width
 *   bar     horizontal bar thickness (thinner than the stems, as the eye wants)
 *   slope   run over rise of every diagonal: 0.5 is one across for two up
 *   diag    a diagonal stroke's thickness, square to the stroke, as a share of the stem
 *   cut     the S's two turning corners (top left, bottom right), cut on the diagonals' own slope:
 *           [across, down]; the terminals stay square
 *   mV      where the M's V stops, cut flat: on the band of the S's spine and the H's bar, so the
 *           M stands over one wide opening, like the A over its feet
 * Each builder returns { w, tiles } with x from 0 to w.
 */
export const DEFAULT = {
  stem: 34,
  bar: 23,
  slope: 0.5,
  diag: 0.94,
  wS: 118, wM: 164, wA: 146, wH: 122, // about 7 : 1 overall: the widest, heaviest word in the round
  spine: 49, // centre of the S's spine: a hair above the middle, so the lower bowl is the larger
  cut: [11.5, 23], // one across for two down: the M's and A's slope, through the whole bar
  hBar: 49, // the H's crossbar on the same band as the S's spine and the M's vertex
  mStart: 0.81, // where the M's diagonals leave the top of its stems, as a share of the stem
  mV: 60.5, // the M's V stops here, flat, on the band of the S's spine: its notch reaches the band's top
  aBar: [60.5, 83.5], // the A's crossbar, stepping down from that band
  track: 12, // space between letters
  kern: { SM: 0, MA: -4, AS: -4, SH: 0 }, // the A's diagonals bring their own white; 8 at the closest
};

export function glyphS(p, w = p.wS) {
  const { stem: V, bar: B } = p;
  const s1 = p.spine - B / 2;
  const s2 = p.spine + B / 2;
  // The outer corners the S turns round (top left, bottom right) may be cut on the
  // diagonals' own slope; the terminals (top right, bottom left) stay square.
  const [cx, cy] = p.cut ?? [0, 0];
  const top = cx > 0 ? ccw([[cx, 0], [w, 0], [w, B], [0, B], [0, cy]]) : rect(0, 0, w, B);
  const bottom = cx > 0 ? ccw([[0, CAP - B], [w, CAP - B], [w, CAP - cy], [w - cx, CAP], [0, CAP]]) : rect(0, CAP - B, w, CAP);
  const tiles = [
    top,
    rect(0, B, V, s1), // upper left stem
    rect(0, s1, w, s2), // spine
    rect(w - V, s2, w, CAP - B), // lower right stem
    bottom,
  ];
  return { w, tiles };
}

export function glyphM(p, w = p.wM) {
  const { stem: V, slope: k } = p;
  const cos = 1 / Math.hypot(1, k);
  const wd = (p.diag * V) / cos; // horizontal width of a diagonal stroke
  // The left diagonal: a band leaning right as it falls, starting inside the stem's top,
  // cut off at the stem and at the centre line (the right one is its mirror).
  const x0 = V * p.mStart;
  const n = [1, -k]; // normal to the band, pointing up and right (y down)
  const diag = region([
    [[x0, 0], n], // right of the lower-left edge
    [[x0 + wd, 0], [-n[0], -n[1]]], // left of the upper-right edge
    [[V, 0], [1, 0]], [[w / 2, 0], [-1, 0]], [[0, 0], [0, 1]], [[0, p.mV ?? CAP], [0, -1]],
  ]);
  return { w, tiles: [rect(0, 0, V, CAP), diag, mirrorX(diag, w), rect(w - V, 0, w, CAP)] };
}

export function glyphA(p, w = p.wA) {
  const { stem: V, slope: k } = p;
  const cos = 1 / Math.hypot(1, k);
  const wd = (p.diag * V) / cos;
  const xo = (y) => (CAP - y) * k; // outer left edge
  const xi = (y) => wd + (CAP - y) * k; // inner left edge
  const yA = CAP - (w / 2 - wd) / k; // where the inner edges meet
  const top = ccw([[xo(0), 0], [w - xo(0), 0], [w - xo(yA), yA], [xo(yA), yA]]);
  const leg = ccw([[xo(yA), yA], [w / 2, yA], [wd, CAP], [0, CAP]]);
  const [c1, c2] = p.aBar;
  const bar = ccw([[xi(c1), c1], [w - xi(c1), c1], [w - xi(c2), c2], [xi(c2), c2]]);
  return { w, tiles: [top, leg, mirrorX(leg, w), bar], apex: yA };
}

export function glyphH(p, w = p.wH) {
  const { stem: V, bar: B } = p;
  const c = p.hBar;
  return { w, tiles: [rect(0, 0, V, CAP), rect(V, c - B / 2, w - V, c + B / 2), rect(w - V, 0, w, CAP)] };
}

const GLYPHS = { S: glyphS, M: glyphM, A: glyphA, H: glyphH };

/** SMASH set: [{ ch, x, w, tiles }] and the total width. */
export function setWord(p = DEFAULT, text = 'SMASH') {
  const letters = [];
  let x = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (i > 0) x += p.track + (p.kern[text[i - 1] + ch] ?? 0);
    const g = GLYPHS[ch](p);
    letters.push({ ch, x, w: g.w, tiles: g.tiles.map((t) => translate(t, x)) });
    x += g.w;
  }
  return { letters, width: x };
}

// ---------------------------------------------------------------- the break

/** A fracture line: through point p at angle a (radians, screen: 0 is to the right, positive turns down). */
export const line = (p, a) => ({ p, d: [Math.cos(a), Math.sin(a)], n: [-Math.sin(a), Math.cos(a)] });

/**
 * Cut every tile by every line, leaving a gap of `gap` along each line.
 * Returns shards: one per connected piece of one letter inside one cell of the pane.
 */
export function shatter(letters, lines, gap) {
  const h = gap / 2;
  const pieces = new Map(); // `${letter}|${signs}` -> tiles
  letters.forEach((L, li) => {
    for (const tile of L.tiles) {
      let parts = [{ poly: tile, sign: '' }];
      for (const ln of lines) {
        const next = [];
        for (const { poly, sign } of parts) {
          const plus = clipHalfPlane(poly, [ln.p[0] + ln.n[0] * h, ln.p[1] + ln.n[1] * h], ln.n);
          const minus = clipHalfPlane(poly, [ln.p[0] - ln.n[0] * h, ln.p[1] - ln.n[1] * h], [-ln.n[0], -ln.n[1]]);
          if (plus.length >= 3 && Math.abs(area(plus)) > 1e-6) next.push({ poly: plus, sign: sign + '+' });
          if (minus.length >= 3 && Math.abs(area(minus)) > 1e-6) next.push({ poly: minus, sign: sign + '-' });
        }
        parts = next;
      }
      for (const { poly, sign } of parts) {
        const key = `${li}|${sign}`;
        if (!pieces.has(key)) pieces.set(key, []);
        pieces.get(key).push(poly);
      }
    }
  });
  const shards = [];
  for (const [key, tiles] of pieces) {
    const [li, cell] = key.split('|');
    for (const comp of components(union(tiles))) {
      const [cx, cy, A] = centreOf(comp);
      const per = perimeter(comp.outer) + comp.holes.reduce((s, hh) => s + perimeter(hh), 0);
      shards.push({ letter: +li, ch: letters[+li].ch, cell, ...comp, c: [cx, cy], area: A, thick: (2 * A) / per });
    }
  }
  return shards;
}

/** Each letter as one outline, unbroken (for the light behind the gaps). */
export function outlines(letters) {
  return letters.map((L) => components(union(L.tiles)));
}

/**
 * One side of a line, pushed off it by |off|: off > 0 keeps where (q - p) · n >= off,
 * off < 0 keeps where (q - p) · n <= off. For cutting cells with a gap.
 */
export function cutHalf(poly, ln, off) {
  const p = [ln.p[0] + ln.n[0] * off, ln.p[1] + ln.n[1] * off];
  return off >= 0 ? clipHalfPlane(poly, p, ln.n) : clipHalfPlane(poly, p, [-ln.n[0], -ln.n[1]]);
}

/** The part of a convex polygon within h of a line: a band along a crack. */
export function band(poly, ln, h) {
  const a = clipHalfPlane(poly, [ln.p[0] - ln.n[0] * h, ln.p[1] - ln.n[1] * h], ln.n);
  return a.length > 2 ? clipHalfPlane(a, [ln.p[0] + ln.n[0] * h, ln.p[1] + ln.n[1] * h], [-ln.n[0], -ln.n[1]]) : [];
}
