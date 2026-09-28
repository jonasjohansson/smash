// Crack Line: the geometry. SMASH written by one running crack.
//
// The letters are a clean monoline skeleton on a cap height of 100 (y down: 0 is the cap line,
// 100 the baseline), drawn from three angles: upright stems and horizontal bars, diagonals at
// 70°, and the S's spine at 28°. One rule for every end: whatever touches the cap line or the
// baseline is cut flat on it, and the S's terminals are cut flat too. Every corner is a sharp,
// true mitre.
//
// The crack is what runs between the letters. It enters the box at its left edge, arrives at
// the S's lower spike, leaves each letter from an outer corner, runs along the cap line or the
// baseline to the next (breaking once on the way), and leaves the H from its top right corner to
// the right edge. Only the hairlines are seeded; the letters are exact.
//
// Everything is one graph of strokes with a width at each end. outline() walks round the
// graph and returns its outline as closed polygons (one outer outline, plus a hole for the A),
// so the still is a single clean shape, ready to edit in Illustrator.

import { rng } from '../../lib.js';

const RAD = Math.PI / 180;
const T70 = 1 / Math.tan(70 * RAD); // run of a 70° line per unit of height
const S70 = Math.sin(70 * RAD);

// ---------- a graph of strokes ----------

export class Graph {
  constructor() { this.nodes = []; this.edges = []; }
  /** A node; o may carry cut (a direction: a free end is cut along it), clip ({ p, d, n }: an outer mitre is cut on this line, n pointing to the side kept), tip. */
  node(x, y, o = {}) { this.nodes.push({ x, y, ...o }); return this.nodes.length - 1; }
  /** A stroke from a to b, with half widths wa and wb. zero: a width-0 link to an attach point (attach: 'b'). */
  edge(a, b, wa, wb = wa, o = {}) { const e = { a, b, wa, wb, ...o }; this.edges.push(e); return e; }
}

const isect = (p, d, q, e) => {
  const den = d[0] * e[1] - d[1] * e[0];
  if (Math.abs(den) < 1e-12) return null;
  const t = ((q[0] - p[0]) * e[1] - (q[1] - p[1]) * e[0]) / den;
  return [p[0] + d[0] * t, p[1] + d[1] * t];
};

/**
 * The outline of a graph of strokes: { faces, pieces }. faces are closed polygons (the outer
 * outline and any holes, wound oppositely, so nonzero and evenodd both fill them right);
 * pieces[i] is the part of the outline that belongs to edge i (null for zero-width links),
 * for colouring runs one by one. Corners are true mitres; an outer mitre longer than
 * `limit` half widths is bevelled, or cut on the node's clip line.
 */
export function outline(G, { limit = 4.5, clean: doClean = true } = {}) {
  const { nodes, edges } = G;
  const adj = nodes.map(() => []);
  edges.forEach((e, i) => {
    const A = nodes[e.a];
    const B = nodes[e.b];
    const dx = B.x - A.x;
    const dy = B.y - A.y;
    const L = Math.hypot(dx, dy);
    if (L < 1e-7) return;
    const d = [dx / L, dy / L];
    const ha = { e: i, v: e.a, to: e.b, d, w: e.wa, wf: e.wb, ang: Math.atan2(d[1], d[0]), zero: !!e.zero, attach: e.attach === 'a' };
    const hb = { e: i, v: e.b, to: e.a, d: [-d[0], -d[1]], w: e.wb, wf: e.wa, ang: Math.atan2(-d[1], -d[0]), zero: !!e.zero, attach: e.attach === 'b' };
    ha.twin = hb;
    hb.twin = ha;
    adj[e.a].push(ha);
    adj[e.b].push(hb);
  });
  for (const list of adj) {
    list.sort((p, q) => p.ang - q.ang);
    list.forEach((h, i) => { h.i = i; h.list = list; });
  }
  const next = (h) => h.list[(h.i + 1) % h.list.length];
  const prev = (h) => h.list[(h.i - 1 + h.list.length) % h.list.length];

  // the offset line of a half-edge on its + side (s = 1) or − side (s = −1), as a point at its node and a direction
  const own = (h, s) => {
    const V = nodes[h.v];
    const T = nodes[h.to];
    const n = [-h.d[1], h.d[0]];
    const p = [V.x + n[0] * h.w * s, V.y + n[1] * h.w * s];
    const q = [T.x + n[0] * h.wf * s, T.y + n[1] * h.wf * s];
    const dx = q[0] - p[0];
    const dy = q[1] - p[1];
    const l = Math.hypot(dx, dy) || 1;
    return { p, d: [dx / l, dy / l] };
  };
  const cache = new Map();
  // at an attach point, a zero-width link takes the edges of the strokes it hangs from, where they meet there
  const line = (h, s) => {
    if (h.zero && h.attach) {
      const z = h.twin;
      const P = nodes[h.v];
      const c = s === 1 ? corner(prev(z), z) : corner(z, next(z));
      if (c.length === 1 && Math.hypot(c[0][0] - P.x, c[0][1] - P.y) < 1e-6) return s === 1 ? own(prev(z), 1) : own(next(z), -1);
    }
    return own(h, s);
  };
  const cap = (h) => {
    const V = nodes[h.v];
    if (h.w < 1e-9) return [[V.x, V.y]];
    const A = line(h, 1);
    const B = line(h, -1);
    if (V.cut) {
      const P = [V.x, V.y];
      return [isect(A.p, A.d, P, V.cut) ?? A.p, isect(B.p, B.d, P, V.cut) ?? B.p];
    }
    if (V.tip) return [A.p, [V.x - h.d[0] * V.tip, V.y - h.d[1] * V.tip], B.p];
    return [A.p, B.p];
  };
  // the corner after h1 at its node, between h1's + side and h2's − side
  function corner(h1, h2) {
    const key = `${h1.v}:${h1.i}`;
    if (cache.has(key)) return cache.get(key);
    const V = nodes[h1.v];
    let pts;
    if (h1 === h2) pts = cap(h1);
    else {
      const A = line(h1, 1);
      const B = line(h2, -1);
      let g = h2.ang - h1.ang;
      if (g <= 0) g += 2 * Math.PI;
      const X = Math.abs(g - Math.PI) < 1e-5 ? null : isect(A.p, A.d, B.p, B.d);
      if (!X) pts = [A.p, B.p];
      else if (g < Math.PI) pts = [X];
      else {
        const wm = Math.max(h1.w, h2.w);
        const far = Math.hypot(X[0] - V.x, X[1] - V.y);
        const clip = V.clip;
        if (clip && (X[0] - clip.p[0]) * clip.n[0] + (X[1] - clip.p[1]) * clip.n[1] < -1e-9) {
          pts = [isect(A.p, A.d, clip.p, clip.d), isect(B.p, B.d, clip.p, clip.d)];
        } else if (wm > 0 && far > (V.limit ?? limit) * wm) {
          const u = [(X[0] - V.x) / far, (X[1] - V.y) / far];
          const c = [V.x + u[0] * (V.limit ?? limit) * wm, V.y + u[1] * (V.limit ?? limit) * wm];
          const cd = [-u[1], u[0]];
          pts = [isect(A.p, A.d, c, cd), isect(B.p, B.d, c, cd)];
        } else pts = [X];
      }
    }
    pts = pts.filter(Boolean);
    cache.set(key, pts);
    return pts;
  }

  // walk round every face
  const faces = [];
  const seen = new Set();
  for (const list of adj) {
    for (const h0 of list) {
      if (seen.has(h0)) continue;
      const pts = [];
      let h = h0;
      let guard = 0;
      do {
        seen.add(h);
        const r = h.twin;
        const n2 = next(r);
        pts.push(...corner(r, n2));
        h = n2;
      } while (h !== h0 && ++guard < 200000);
      const f = doClean ? clean(pts) : pts;
      if (f.length > 2) faces.push(f);
    }
  }
  // each edge's own piece of the outline: its sides, and at each end its share of the corner
  const end = (h) => {
    if (h.list.length === 1) return [...corner(h, h)].reverse();
    const V = nodes[h.v];
    return [...[...corner(prev(h), h)].reverse(), [V.x, V.y], ...[...corner(h, next(h))].reverse()];
  };
  const pieces = edges.map(() => null);
  for (const list of adj) {
    for (const h of list) {
      if (h.zero || pieces[h.e] || h.v !== edges[h.e].a) continue;
      pieces[h.e] = [...end(h), ...end(h.twin)];
    }
  }
  return { faces, pieces };
}

/** Drop repeated points and points on a straight line (including a line that doubles back on itself). */
export function clean(pts) {
  let p = pts.filter(Boolean);
  for (let pass = 0; pass < 12 && p.length > 3; pass++) {
    const out = [];
    let changed = false;
    for (let i = 0; i < p.length; i++) {
      const a = out.length ? out[out.length - 1] : p[p.length - 1];
      const b = p[i];
      const c = p[(i + 1) % p.length];
      const lab = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const lbc = Math.hypot(c[0] - b[0], c[1] - b[1]);
      if (lab < 1e-4) { changed = true; continue; }
      const cross = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
      if (lbc > 1e-4 && Math.abs(cross) < 1e-7 * lab * lbc) { changed = true; continue; }
      out.push(b);
    }
    p = out;
    if (!changed) break;
  }
  return p;
}

// ---------- the letters ----------

export const DEF = {
  seed: 5,
  half: 6, // half the stroke
  hair: 0.9, // half the hairline, at its widest
  hairEnd: 0.3, // and where it meets a letter: it runs out almost to a point, into the letter's corner
  leadHair: 1.15, // the leads, at their widest
  sWidth: 60,
  spine: 28, // the S's spine, in degrees
  sTerminal: 17, // how far the S's terminals reach, in height
  aBar: 65,
  hWidth: 58,
  hBar: 48,
  join: 10, // the visible hairline between letters
  kink: [1.3, 2.3], // how far the hairline between letters breaks off its line
  lead: 44, // hairline from the box's edge to the first letter, and after the last
  leadAngles: [14, 3, 9], // the leads' three runs, from the letter outwards: they climb about 8° in all
  leadIn: true,
  leadOut: true,
  forks: true,
  word: 'SMASH',
};

/** The outer mitre point of a corner at node c between strokes towards a and towards b. */
function spike(G, c, a, b, w) {
  const C = G.nodes[c];
  const A = G.nodes[a];
  const B = G.nodes[b];
  const u = [A.x - C.x, A.y - C.y];
  const v = [B.x - C.x, B.y - C.y];
  const lu = Math.hypot(...u);
  const lv = Math.hypot(...v);
  const s = [u[0] / lu + v[0] / lv, u[1] / lu + v[1] / lv];
  const ls = Math.hypot(...s);
  const cos = (u[0] * v[0] + u[1] * v[1]) / (lu * lv);
  const half = Math.acos(Math.max(-1, Math.min(1, cos))) / 2;
  const m = w / Math.sin(half);
  return [C.x - (s[0] / ls) * m, C.y - (s[1] / ls) * m];
}

/**
 * Build the word into a graph. Returns { G, main, branches, legs, box, width }:
 * main is the running line as node ids in order, branches are [junction, ...ids] that split off
 * it, legs are the letters' spans of main (for the rhythm of the run).
 */
export function build(opts = {}) {
  const o = { ...DEF, ...opts };
  const R = rng(o.seed);
  const r = (a, b) => a + (b - a) * R();
  const G = new Graph();
  const w = o.half;
  const main = [];
  const branches = [];
  const legs = [];
  const push = (...ids) => { for (const id of ids) if (main[main.length - 1] !== id) main.push(id); };
  const E = (a, b, wa = w, wb = wa, x = {}) => G.edge(a, b, wa, wb, x);
  const Z = (a, b) => G.edge(a, b, 0, 0, { zero: true, attach: 'b' });
  const cutH = [1, 0];
  // outer mitres at the cap line and the baseline are cut flat on them (n points to the side kept)
  const clipAt = (y) => ({ p: [0, y], d: [1, 0], n: [0, y < 50 ? 1 : -1] });

  const letters = {
    S(ox) {
      const sw = o.sWidth;
      const drop = sw * Math.tan(o.spine * RAD);
      const yU = 50 - drop / 2;
      const yL = 50 + drop / 2;
      const top = w;
      const bot = 100 - w;
      const run = (yU - top) * T70;
      const BL = G.node(ox, bot);
      const BR = G.node(ox + sw - run, bot);
      const SR = G.node(ox + sw, yL);
      const SL = G.node(ox, yU);
      const TL = G.node(ox + run, top);
      const TR = G.node(ox + sw, top);
      const t = o.sTerminal;
      const TB = G.node(ox + (t - w) * T70, 100 - t, { cut: cutH });
      const TT = G.node(ox + sw - (t - w) * T70, t, { cut: cutH });
      E(BL, BR); E(BR, SR); E(SR, SL); E(SL, TL); E(TL, TR);
      E(BL, TB); E(TR, TT);
      const pIn = spike(G, BL, BR, TB, w);
      const pOut = spike(G, TR, TL, TT, w);
      const IN = G.node(pIn[0], pIn[1]);
      const OUT = G.node(pOut[0], pOut[1]);
      Z(BL, IN);
      Z(TR, OUT);
      branches.push([BL, TB], [TR, TT]);
      return { in: IN, out: OUT, path: [IN, BL, BR, SR, SL, TL, TR, OUT], xIn: pIn[0], xOut: pOut[0], line: 'cap', inLine: 'base' };
    },
    M(ox) {
      const mw = 200 * T70;
      const C1 = G.node(ox, 0, { clip: clipAt(0) });
      const F0 = G.node(ox, 100, { cut: cutH });
      const V = G.node(ox + mw / 2, 100, { clip: clipAt(100) });
      const C2 = G.node(ox + mw, 0, { clip: clipAt(0) });
      const F1 = G.node(ox + mw, 100);
      const IN = G.node(ox - w, 0);
      const OUT = G.node(ox + mw + w, 100);
      E(C1, F0); E(C1, V); E(V, C2); E(C2, F1);
      Z(C1, IN);
      Z(F1, OUT);
      branches.push([C1, F0]);
      return { in: IN, out: OUT, path: [IN, C1, V, C2, F1, OUT], xIn: ox - w, xOut: ox + mw + w, line: 'base', inLine: 'cap' };
    },
    A(ox) {
      const aw = 200 * T70;
      const foot = w / S70;
      const FL = G.node(ox, 100);
      const JL = G.node(ox + (100 - o.aBar) * T70, o.aBar);
      const AP = G.node(ox + aw / 2, 0, { clip: clipAt(0) });
      const JR = G.node(ox + aw - (100 - o.aBar) * T70, o.aBar);
      const FR = G.node(ox + aw, 100);
      const IN = G.node(ox - foot, 100);
      const OUT = G.node(ox + aw + foot, 100);
      E(FL, JL); E(JL, AP); E(AP, JR); E(JR, FR); E(JR, JL);
      Z(FL, IN);
      Z(FR, OUT);
      branches.push([JR, JL]);
      return { in: IN, out: OUT, path: [IN, FL, JL, AP, JR, FR, OUT], xIn: ox - foot, xOut: ox + aw + foot, line: 'base', inLine: 'base' };
    },
    H(ox) {
      const hw = o.hWidth;
      const T1 = G.node(ox, 0);
      const J1 = G.node(ox, o.hBar);
      const F1 = G.node(ox, 100, { cut: cutH });
      const T2 = G.node(ox + hw, 0);
      const J2 = G.node(ox + hw, o.hBar);
      const F2 = G.node(ox + hw, 100, { cut: cutH });
      const IN = G.node(ox - w, 0);
      const OUT = G.node(ox + hw + w, 0);
      E(T1, J1); E(J1, F1); E(J1, J2); E(J2, T2); E(J2, F2);
      Z(T1, IN);
      Z(T2, OUT);
      branches.push([J1, F1], [J2, F2]);
      return { in: IN, out: OUT, path: [IN, T1, J1, J2, T2, OUT], xIn: ox - w, xOut: ox + hw + w, line: 'cap', inLine: 'cap' };
    },
  };
  // where each letter's entry sits relative to its origin, so the hairlines come out the same length
  const entryOffset = { S: -spike0(o), M: -w, A: -w / S70, H: -w };

  const word = o.word.split('');
  let prevOut = null;
  let x = 0;
  const placed = [];
  word.forEach((ch, i) => {
    const ox = i === 0 ? 0 : x - entryOffset[ch];
    const L = letters[ch](ox);
    placed.push(L);
    if (prevOut) {
      // the hairline between letters: along the cap line or the baseline, breaking once into the gap
      const a = G.nodes[prevOut.out];
      const b = G.nodes[L.in];
      const u = r(0.36, 0.64);
      const dip = r(o.kink[0], o.kink[1]) * (prevOut.line === 'cap' ? 1 : -1);
      const K = G.node(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u + dip);
      E(prevOut.out, K, o.hairEnd, o.hair); E(K, L.in, o.hair, o.hairEnd);
      push(prevOut.out, K);
    }
    push(...L.path);
    prevOut = L;
    x = L.xOut + o.join;
  });
  const first = placed[0];
  const last = placed[placed.length - 1];
  const x0 = G.nodes[first.in].x;
  const x1 = G.nodes[last.out].x;
  const leadLine = (from, len, dir) => {
    // a lead: from the letter's corner out to the box's edge, in three straight runs at set angles
    // (steep where it leaves the letter, nearly level, then climbing again), forking once
    const P = G.nodes[from];
    const angs = o.leadAngles.map((a) => (a + r(-1.2, 1.2)) * RAD);
    const fr = [r(0.27, 0.33), r(0.3, 0.38)];
    fr.push(1 - fr[0] - fr[1]);
    const ids = [from];
    let x = P.x;
    let y = P.y;
    angs.forEach((a, i) => {
      const l = (len * fr[i]) / Math.cos(a);
      x += dir * Math.cos(a) * l;
      y -= dir * Math.sin(a) * l;
      ids.push(G.node(x, y));
    });
    // widths: nearly nothing at the letter, widest in the middle, a point at the edge
    const ws = [o.hairEnd, o.leadHair, o.leadHair * 0.8, 0];
    for (let i = 0; i < ids.length - 1; i++) E(ids[i], ids[i + 1], ws[i], ws[i + 1]);
    if (o.forks) {
      // one fork, leaving forward (in the reading direction) at 30°, straight, running out to a point:
      // above the lead going out, below the lead coming in, so both open away from the letters
      const k = dir > 0 ? 1 : 2;
      const K = G.nodes[ids[k]];
      const N = G.nodes[ids[k + 1]];
      const fwd = dir > 0 ? Math.atan2(N.y - K.y, N.x - K.x) : Math.atan2(K.y - N.y, K.x - N.x);
      const ang = fwd + (dir > 0 ? -1 : 1) * 30 * RAD;
      const len2 = r(12, 14);
      const T = G.node(K.x + Math.cos(ang) * len2, K.y + Math.sin(ang) * len2);
      E(ids[k], T, ws[k] * 0.9, 0);
      branches.push([ids[k], T]);
    }
    return ids;
  };
  if (o.leadIn) {
    const ids = leadLine(first.in, o.lead + (o.leadInExtra ?? 0), -1, -1);
    main.unshift(...ids.slice(1).reverse());
  }
  if (o.leadOut) {
    const ids = leadLine(last.out, o.lead + (o.leadOutExtra ?? 0), 1, 1);
    main.push(...ids.slice(1));
  }
  // where each letter starts and ends on the running line: the run bursts letter by letter
  for (const L of placed) legs.push({ in: main.indexOf(L.in), out: main.indexOf(L.out) });
  const box = { x0: o.leadIn ? x0 - o.lead - (o.leadInExtra ?? 0) : x0, x1: o.leadOut ? x1 + o.lead + (o.leadOutExtra ?? 0) : x1 };
  return { G, main, branches, legs, box, width: x1 - x0, x0, x1, o, letters: placed };
}

function spike0(o) {
  // how far the S's lower spike reaches left of its origin
  const w = o.half;
  const t = o.sTerminal;
  const sw = o.sWidth;
  const drop = sw * Math.tan(o.spine * RAD);
  const yU = 50 - drop / 2;
  const run = (yU - w) * T70;
  const G = new Graph();
  const BL = G.node(0, 100 - w);
  const BR = G.node(sw - run, 100 - w);
  const TB = G.node((t - w) * T70, 100 - t);
  return -spike(G, BL, BR, TB, w)[0];
}

// ---------- the S in its pane ----------

/**
 * The symbol: the S as a crack across a square pane, entering at the left edge and leaving at
 * the right. The S sits on cap height `cap`, centred; its leads run level from the S's spikes
 * out to the edges, where they are cut flat, widest at the edge and running out into the spike.
 */
export function paneS({ side = 100, cap = 58, half = 7, lead = 1.3, leadEnd = 0.3, leads = true, dy = 0, dx = 0, sTerminal = 17, spine = 28, sWidth = 60, node = null } = {}) {
  const k = cap / 100;
  const C = build({ word: 'S', leadIn: false, leadOut: false, half, sTerminal, spine, sWidth });
  const G = C.G;
  const S = C.letters[0];
  // centre the S's body in the square
  const bx0 = G.nodes[S.path[1]].x - half;
  const bx1 = G.nodes[S.path[6]].x + half;
  const ox = side / 2 - ((bx0 + bx1) / 2) * k + dx;
  const oy = side / 2 - 50 * k + dy;
  for (const n of G.nodes) { n.x = ox + n.x * k; n.y = oy + n.y * k; }
  for (const e of G.edges) { e.wa *= k; e.wb *= k; }
  for (const n of G.nodes) if (n.clip) n.clip = { ...n.clip, p: [n.clip.p[0] * k + ox, n.clip.p[1] * k + oy] };
  const IN = G.nodes[S.in];
  const OUT = G.nodes[S.out];
  const L = G.node(0, IN.y, { cut: [0, 1] });
  const Rr = G.node(side, OUT.y, { cut: [0, 1] });
  if (leads) {
    G.edge(L, S.in, lead, leadEnd);
    G.edge(S.out, Rr, leadEnd, lead);
  }
  const branches = [...C.branches];
  if (node) {
    // the impact: a few short rays from where the crack enters the S, all to one side
    for (const ray of node.rays) {
      const a = ray.deg * RAD;
      const T = G.node(IN.x + Math.cos(a) * ray.len, IN.y + Math.sin(a) * ray.len);
      G.edge(S.in, T, ray.w, 0);
      branches.push([S.in, T]);
    }
  }
  return { G, main: [L, ...S.path, Rr], branches, in: S.in, out: S.out, k, left: L, right: Rr };
}

// ---------- measuring the running line ----------

/**
 * The crack as data for motion: every stroke cut into short steps. Each node carries its base
 * half width and where it sits: s along the running line, or (b, d) along branch b. Each step
 * (edge) carries the same for both of its ends, since a branch's end can sit on the line.
 */
export function fine(C, step = 5) {
  const { G, main, branches } = C;
  const key = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);
  const len = (a, b) => Math.hypot(G.nodes[b].x - G.nodes[a].x, G.nodes[b].y - G.nodes[a].y);
  const on = new Map();
  const ms = [0];
  for (let i = 1; i < main.length; i++) {
    ms.push(ms[i - 1] + len(main[i - 1], main[i]));
    on.set(key(main[i - 1], main[i]), { a: main[i - 1], pa: { s: ms[i - 1] }, pb: { s: ms[i] } });
  }
  const mainLen = ms[ms.length - 1];
  const mainS = new Map(main.map((id, i) => [id, ms[i]]));
  const branchLen = branches.map((br, bi) => {
    let d = 0;
    for (let i = 1; i < br.length; i++) {
      const d1 = d + len(br[i - 1], br[i]);
      on.set(key(br[i - 1], br[i]), { a: br[i - 1], pa: { b: bi, d }, pb: { b: bi, d: d1 } });
      d = d1;
    }
    return d;
  });
  const nodes = G.nodes.map((n, id) => ({ ...n, id, w: 0, at: mainS.has(id) ? { s: mainS.get(id) } : null }));
  const edges = [];
  const mid = (p, q, u) => (p.s !== undefined ? { s: p.s + (q.s - p.s) * u } : { b: p.b, d: p.d + (q.d - p.d) * u });
  for (const e of G.edges) {
    const A = G.nodes[e.a];
    const B = G.nodes[e.b];
    const k = on.get(key(e.a, e.b));
    if (!k) continue;
    const fwd = k.a === e.a;
    const pa = fwd ? k.pa : k.pb;
    const pb = fwd ? k.pb : k.pa;
    if (!nodes[e.a].at) nodes[e.a].at = pa;
    if (!nodes[e.b].at) nodes[e.b].at = pb;
    nodes[e.a].w = Math.max(nodes[e.a].w, e.wa);
    nodes[e.b].w = Math.max(nodes[e.b].w, e.wb);
    const L = Math.hypot(B.x - A.x, B.y - A.y);
    const n = e.zero ? 1 : Math.max(1, Math.ceil(L / step));
    const dir = [(B.x - A.x) / (L || 1), (B.y - A.y) / (L || 1)];
    let prevId = e.a;
    let prevP = pa;
    for (let j = 1; j <= n; j++) {
      const u = j / n;
      let id;
      let p;
      if (j === n) { id = e.b; p = pb; }
      else {
        p = mid(pa, pb, u);
        id = nodes.length;
        nodes.push({ x: A.x + (B.x - A.x) * u, y: A.y + (B.y - A.y) * u, w: e.wa + (e.wb - e.wa) * u, at: p, sub: true });
      }
      edges.push({ a: prevId, b: id, wa: e.wa + (e.wb - e.wa) * ((j - 1) / n), wb: e.wa + (e.wb - e.wa) * u, pa: prevP, pb: p, zero: !!e.zero, attach: e.attach, dir, parent: e });
      prevId = id;
      prevP = p;
    }
  }
  return { nodes, edges, mainLen, branchLen, mainS };
}

// ---------- SVG ----------

const f = (v) => +v.toFixed(2);
/** One path for many polygons. */
export const pathOf = (list) => list.filter((p) => p && p.length > 2).map((poly) => `M${poly.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}Z`).join('');

/** The bounds of a list of polygons. */
export function bounds(list) {
  let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
  for (const p of list) for (const [x, y] of p) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
}
