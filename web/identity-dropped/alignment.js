// 05 Alignment: fragments in space that only read SMASH from one viewpoint.
//
// SMASH is drawn as flat polygons: cap height 100, one letter diagonal at 20° off the
// vertical (M, A) and one cut angle at 20° off the horizontal (every cut, and the ends of
// the S's spurs). The word is cut into 16 panels and each is hung in space: at its own
// depth, leaning its own way, and shaped so that from one point (the eye, where the
// projector stands) it covers exactly its place in the word. From anywhere else it is a
// cloud of panels. The wordmark is the view from the eye; the symbol is the view from a
// step beside it, SMASH almost assembled, and it is the motion's first frame. One seed and
// one camera make the symbol, the motion and the installation.

import { svg, clipHalfPlane, polygonArea, rng, ease, clamp, lerp, smoothstep, timeline, canvasStage, withCleanup, loadImage } from '../lib.js';

const DEG = Math.PI / 180;

// ---------------------------------------------------------------------------
// Letters. Units: cap height 100, y down. Every letter is a set of convex parts that
// tile it exactly, so it can be cut with half-plane clipping.

const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

const LETTER = {
  diag: 20, // the one letter diagonal, off the vertical (M, A); also the S's cut terminals
  stem: 22, // vertical stems
  bar: 19, // horizontal bars (lighter than stems, so they look the same)
  diagT: 20, // diagonal strokes, measured square to the stroke (lighter again: they cross)
  flat: 16, // the A's apex and the M's vertex: one flat, top and bottom
  mid: 48.5, // the H bar and the S spine share one centre, a hair above the middle
  cut: 20, // the fragments' cut angle, off the horizontal; also the ends of the S's spurs
  mCounter: 32, // where the M's outer counters close, beside the V
  gaps: [12, 6, 6, 12], // S|M, M|A, A|S, S|H: a diagonal against an upright tucks in, never touches
};

function glyphs(o = LETTER) {
  const K = Math.tan(o.diag * DEG);
  const V = o.stem;
  const B = o.bar;
  const WH = o.diagT / Math.cos(o.diag * DEG); // the diagonal stroke, measured across
  const F = o.flat;

  // H: crossbar on the shared middle
  const hW = 78;
  const H = { w: hW, parts: [rect(0, 0, V, 100), rect(hW - V, 0, hW, 100), rect(V, o.mid - B / 2, hW - V, o.mid + B / 2)] };

  // A: legs on the diagonal, a flat apex, the crossbar low enough to keep the counter open
  const aW = 200 * K + F;
  const xl = (y) => (100 - y) * K;
  const xil = (y) => WH + (100 - y) * K;
  const ya = 100 - (aW / 2 - WH) / K;
  const b0 = 63;
  const b1 = 80;
  const A = {
    w: aW,
    parts: [
      [[xl(0), 0], [aW - xl(0), 0], [aW - xl(ya), ya], [xl(ya), ya]],
      [[xl(ya), ya], [aW / 2, ya], [WH, 100], [0, 100]],
      [[aW / 2, ya], [aW - xl(ya), ya], [aW, 100], [aW - WH, 100]],
      [[xil(b0), b0], [aW - xil(b0), b0], [aW - xil(b1), b1], [xil(b1), b1]],
    ],
  };

  // M: upright stems, diagonals meeting on the baseline in the same flat as the A's apex. Its
  // width follows from where the counters beside the V close: at y = o.mCounter, high enough
  // that the outer counters open as far up as the A's.
  const fv = F;
  const mW = 2 * (V + fv / 2 + (100 - o.mCounter) * K);
  const cx = mW / 2;
  const xlo = (y) => cx - fv / 2 - (100 - y) * K;
  const yn = 100 - (WH - fv / 2) / K;
  const y1 = 100 - (cx - fv / 2 - V) / K;
  const xt = xlo(0) + WH;
  const left = [[V, 0], [xt, 0], [cx, yn], [cx, 100], [cx - fv / 2, 100], [V, y1]];
  const M = { w: mW, parts: [rect(0, 0, V, 100), rect(mW - V, 0, mW, 100), left, left.map(([x, y]) => [mW - x, y]).reverse()] };

  // S: square bowls, a level spine on the H's middle, and two spurs at the open ends (so it
  // is an S, not a 5). Each spur is one clean triangle: cut on the fragments' own angle, 20°
  // off the horizontal, from exactly the bar's inner corner, so both drop the same depth.
  const sW = 72;
  const sV = 21;
  const sp = 18; // the spine: a touch lighter, it sits between two counters
  const t0 = o.mid - sp / 2;
  const t1 = o.mid + sp / 2;
  const drop = sV * Math.tan(o.cut * DEG);
  const S = {
    w: sW,
    parts: [
      rect(0, 0, sW, B),
      rect(0, B, sV, t0),
      [[sW - sV, B], [sW, B], [sW, B + drop]],
      rect(0, t0, sW, t1),
      rect(sW - sV, t1, sW, 100 - B),
      [[0, 100 - B - drop], [sV, 100 - B], [0, 100 - B]],
      rect(0, 100 - B, sW, 100),
    ],
  };
  return { S, M, A, H };
}

/** SMASH set: { width, letters: [{ ch, x, w, parts }] }. */
function word(o = LETTER) {
  const g = glyphs(o);
  const letters = [];
  let x = 0;
  [...'SMASH'].forEach((ch, i) => {
    const gl = g[ch];
    letters.push({ ch, x, w: gl.w, parts: gl.parts.map((p) => p.map(([px, py]) => [px + x, py])) });
    x += gl.w + (o.gaps[i] ?? 0);
  });
  return { width: x, height: 100, letters };
}

// ---------------------------------------------------------------------------
// Polygons

const clean = (poly, eps = 1e-7) => {
  const out = [];
  for (const p of poly) {
    const q = out.at(-1);
    if (!q || Math.abs(q[0] - p[0]) > eps || Math.abs(q[1] - p[1]) > eps) out.push(p);
  }
  while (out.length > 1 && Math.abs(out[0][0] - out.at(-1)[0]) < eps && Math.abs(out[0][1] - out.at(-1)[1]) < eps) out.pop();
  return out;
};
const area = (p) => (p.length < 3 ? 0 : Math.abs(polygonArea(p)));

/** 2 × area / perimeter of a set of loops: about half the width of a piece, small for slivers. */
function fatness(loops) {
  let A = 0;
  let P = 0;
  for (const l of loops) {
    A += polygonArea(l);
    for (let i = 0; i < l.length; i++) { const a = l[i]; const b = l[(i + 1) % l.length]; P += Math.hypot(b[0] - a[0], b[1] - a[1]); }
  }
  return P ? (2 * Math.abs(A)) / P : 0;
}

/** Do two convex polygons share a stretch of edge? */
function touching(P, Q, eps = 1e-5) {
  for (let i = 0; i < P.length; i++) {
    const a = P[i];
    const b = P[(i + 1) % P.length];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (L < eps) continue;
    const ux = (b[0] - a[0]) / L;
    const uy = (b[1] - a[1]) / L;
    for (let j = 0; j < Q.length; j++) {
      const c = Q[j];
      const d = Q[(j + 1) % Q.length];
      if (Math.abs((c[0] - a[0]) * uy - (c[1] - a[1]) * ux) > eps || Math.abs((d[0] - a[0]) * uy - (d[1] - a[1]) * ux) > eps) continue;
      const tc = (c[0] - a[0]) * ux + (c[1] - a[1]) * uy;
      const td = (d[0] - a[0]) * ux + (d[1] - a[1]) * uy;
      if (Math.min(L, Math.max(tc, td)) - Math.max(0, Math.min(tc, td)) > eps * 10) return true;
    }
  }
  return false;
}

/** Drop points that sit on a straight line between their neighbours, or on top of one another. */
function simplify(loop, eps = 1e-3) {
  let pts = loop.filter((p, i) => { const q = loop[(i + loop.length - 1) % loop.length]; return Math.hypot(p[0] - q[0], p[1] - q[1]) > eps * 20; });
  for (let changed = true; changed && pts.length > 3;) {
    changed = false;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[(i + pts.length - 1) % pts.length];
      const b = pts[i];
      const c = pts[(i + 1) % pts.length];
      const L = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1;
      if (Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) / L < eps) { pts = pts.filter((_, j) => j !== i); changed = true; break; }
    }
  }
  return pts;
}

/**
 * The outline of convex polygons that tile a shape: shared edges cancel (after splitting
 * edges where another polygon's corner sits on them), what is left is chained into loops.
 */
function outline(polys, q = 1e3) {
  const P = polys.filter((p) => p.length >= 3).map((p) => (polygonArea(p) < 0 ? [...p].reverse() : p));
  const verts = P.flat();
  const key = ([x, y]) => `${Math.round(x * q)},${Math.round(y * q)}`;
  const tol = 2 / q;
  const edges = [];
  for (const p of P) {
    for (let i = 0; i < p.length; i++) {
      const a = p[i];
      const b = p[(i + 1) % p.length];
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const L2 = dx * dx + dy * dy;
      if (L2 < 1e-12) continue;
      const on = [];
      for (const v of verts) {
        const t = ((v[0] - a[0]) * dx + (v[1] - a[1]) * dy) / L2;
        if (t <= 1e-6 || t >= 1 - 1e-6) continue;
        if (Math.hypot(v[0] - (a[0] + dx * t), v[1] - (a[1] + dy * t)) < tol) on.push([t, v]);
      }
      on.sort((u, w) => u[0] - w[0]);
      let prev = a;
      for (const [, v] of on) if (key(v) !== key(prev)) { edges.push([prev, v]); prev = v; }
      if (key(b) !== key(prev)) edges.push([prev, b]);
    }
  }
  const has = new Set(edges.map(([a, b]) => `${key(a)}>${key(b)}`));
  const keep = edges.filter(([a, b]) => !has.has(`${key(b)}>${key(a)}`));
  const from = new Map();
  for (const e of keep) { const k = key(e[0]); if (!from.has(k)) from.set(k, []); from.get(k).push(e); }
  const used = new Set();
  const loops = [];
  for (const e of keep) {
    if (used.has(e)) continue;
    const loop = [];
    for (let cur = e, guard = 0; cur && !used.has(cur) && guard < 10000; guard++) {
      used.add(cur);
      loop.push(cur[0]);
      cur = (from.get(key(cur[1])) ?? []).find((x) => !used.has(x));
    }
    if (loop.length >= 3) loops.push(simplify(loop));
  }
  return loops.filter((l) => l.length >= 3 && area(l) > 1e-6);
}

function centre(p) {
  let x = 0;
  let y = 0;
  let A = 0;
  for (let i = 0; i < p.length; i++) {
    const [x0, y0] = p[i];
    const [x1, y1] = p[(i + 1) % p.length];
    const cr = x0 * y1 - x1 * y0;
    A += cr; x += (x0 + x1) * cr; y += (y0 + y1) * cr;
  }
  return Math.abs(A) < 1e-9 ? p[0] : [x / (3 * A), y / (3 * A)];
}

const bbox = (p) => {
  let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
  for (const [x, y] of p) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return [x0, y0, x1, y1];
};

const loopsPath = (loops, digits = 2) =>
  loops.map((l) => `M${l.map(([x, y]) => `${+x.toFixed(digits)} ${+y.toFixed(digits)}`).join('L')}Z`).join('');

// ---------------------------------------------------------------------------
// The cuts. Per letter one or two straight cuts, all at 20° off the horizontal: -1 falls to
// the right, 1 rises. Each is [family, x where it crosses y = 50, from the letter's left].
// Sixteen pieces in all, three or four a letter: few and large, so each one reads as a panel
// and the word still reads when they are out of line. Chosen by eye from a search that kept
// every piece at least 10 units thick and 10% of its letter, every cut 5 units clear of the
// letter's corners or exactly through one, and the slashes alternating across the word.

const CUT = LETTER.cut;
const CUTS = [
  [[1, 43.2], [-1, 121]], // S: up through the spine's end from the spur's corner; the top bar's corner
  [[1, 23]], // M
  [[-1, -1], [1, -12]], // A
  [[1, 43.2], [-1, -49]], // S
  [[-1, 34]], // H
];
const SEAM = 0.6; // the hairline between fragments, in word units

const cutLine = (s, x0) => ({ p: [x0, 50], d: [Math.cos(CUT * DEG), -s * Math.sin(CUT * DEG)] });

/** Cut one letter: every part split by every cut, a seam of gap along each cut; parts on the same side of every cut that touch make one fragment. */
function cutLetter(letter, lines, gap) {
  const groups = new Map();
  for (const part of letter.parts) {
    let pieces = [{ poly: part, sig: '' }];
    for (const ln of lines) {
      const len = Math.hypot(...ln.d);
      const n = [-ln.d[1] / len, ln.d[0] / len];
      const next = [];
      for (const pc of pieces) {
        const a = clean(clipHalfPlane(pc.poly, [ln.p[0] + (n[0] * gap) / 2, ln.p[1] + (n[1] * gap) / 2], n));
        const b = clean(clipHalfPlane(pc.poly, [ln.p[0] - (n[0] * gap) / 2, ln.p[1] - (n[1] * gap) / 2], [-n[0], -n[1]]));
        if (area(a) > 1e-3) next.push({ poly: a, sig: `${pc.sig}+` });
        if (area(b) > 1e-3) next.push({ poly: b, sig: `${pc.sig}-` });
      }
      pieces = next;
    }
    for (const pc of pieces) {
      if (!groups.has(pc.sig)) groups.set(pc.sig, []);
      groups.get(pc.sig).push(pc.poly);
    }
  }
  const frags = [];
  for (const polys of groups.values()) {
    const root = polys.map((_, i) => i);
    const find = (i) => (root[i] === i ? i : (root[i] = find(root[i])));
    for (let i = 0; i < polys.length; i++) for (let j = i + 1; j < polys.length; j++) if (touching(polys[i], polys[j])) root[find(i)] = find(j);
    const islands = new Map();
    polys.forEach((p, i) => { const r = find(i); if (!islands.has(r)) islands.set(r, []); islands.get(r).push(p); });
    for (const parts of islands.values()) {
      const a = parts.reduce((s, p) => s + area(p), 0);
      let cx = 0;
      let cy = 0;
      for (const p of parts) { const w = area(p); const c = centre(p); cx += c[0] * w; cy += c[1] * w; }
      frags.push({ parts, loops: outline(parts), area: a, c: [cx / a, cy / a], lines, gap });
    }
  }
  return frags;
}

/** The word cut into its fragments, each { letter, parts, loops, area, c }. */
function fragments(wd = word(), gap = SEAM, cuts = CUTS) {
  return wd.letters.flatMap((L, li) => cutLetter(L, cuts[li].map(([s, x]) => cutLine(s, L.x + x)), gap).map((f) => ({ ...f, letter: li })));
}

// ---------------------------------------------------------------------------
// Space. The eye sits at the origin looking down +z. The word, seen from the eye, spans
// SPAN × its width / 100 at depth Z0: wide, as a room-sized piece seen from close by.

const Z0 = 10;
const SPAN = 3;
/** The canonical hang: the seed that places the pieces, and how far they lean back and turn (degrees). */
const PLACE = { seed: 17, lean: 35, tilt: 12, turn: 14 };

/**
 * Fragments placed in space from a seed. Each gets a depth z along the ray through its
 * centre (even in log depth, stratified so the depths spread) and a lean: its plane tips
 * back by about `lean` (it faces up a little, as if hung to catch a light from above) and
 * turns a little. Its corners are where the eye's rays through its place in the word
 * meet that plane, so from the eye it covers exactly that place, however it leans.
 */
function place(frags, wd, { seed = PLACE.seed, near = 0.42, far = 1.7, lean = PLACE.lean, tilt = PLACE.tilt, turn = PLACE.turn } = {}) {
  const R = rng(seed);
  const order = frags.map((_, i) => [R(), i]).sort((a, b) => a[0] - b[0]).map(([, i]) => i);
  const n = frags.length;
  return frags.map((f, i) => {
    const k = (order.indexOf(i) + 0.15 + R() * 0.7) / n;
    return {
      ...f,
      uc: wd.width / 2,
      z: Z0 * near * (far / near) ** k,
      ax: (lean + (R() * 2 - 1) * tilt) * DEG,
      ay: (R() * 2 - 1) * turn * DEG,
      ph: [R(), R(), R(), R(), R()].map((x) => x * Math.PI * 2),
    };
  });
}

/** The eye's ray through the word point (u, v), scaled to reach depth Z0. */
const ray = (u, v, uc) => [((u - uc) / 100) * SPAN, (-(v - 50) / 100) * SPAN, Z0];

/** The normal of a plane leaning by ax (about x) and ay (about y) from square to the eye. */
const normal = (ax, ay) => [-Math.sin(ay) * Math.cos(ax), Math.sin(ax), -Math.cos(ay) * Math.cos(ax)];

/**
 * A fragment's corners in space. o may move its plane ({ z, ax, ay }: from the eye the word
 * stays whole) or draw its outline in by `inset` word units (the seams open).
 */
function solid(fr, o = {}, withParts = false) {
  const z = o.z ?? fr.z;
  const nrm = normal(o.ax ?? fr.ax, o.ay ?? fr.ay);
  const g = o.inset ?? 0;
  const c = ray(fr.c[0], fr.c[1], fr.uc);
  const k0 = (nrm[0] * c[0] + nrm[1] * c[1] + nrm[2] * c[2]) * (z / Z0);
  const at = ([u, v]) => {
    const d = ray(u, v, fr.uc);
    const t = k0 / (nrm[0] * d[0] + nrm[1] * d[1] + nrm[2] * d[2]);
    return [d[0] * t, d[1] * t, d[2] * t];
  };
  const loops = fr.loops.map((l, li) => l.map((p, i) => at(g && fr.miters ? [p[0] + fr.miters[li][i][0] * g, p[1] + fr.miters[li][i][1] * g] : p)));
  return { loops, parts: withParts ? fr.parts.map((p) => p.map(at)) : null, centre: at(fr.c), normal: nrm };
}

/**
 * For every corner of a fragment's outline, where it goes when the edges that lie along a cut
 * are drawn in by one unit and the letter's own edges stay put: so the seams open like
 * cracks and the letter's silhouette does not move.
 */
function miters(fr) {
  const inside = (q) => fr.parts.some((p) => { const sg = polygonArea(p) > 0 ? 1 : -1; return p.every((a, i) => { const b = p[(i + 1) % p.length]; return ((b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0])) * sg >= 0; }); });
  // an edge is on a cut when both its ends sit half a seam from the same cut line
  const onCut = (a, b) => (fr.lines ?? []).some((ln) => {
    const len = Math.hypot(...ln.d);
    const nx = -ln.d[1] / len;
    const ny = ln.d[0] / len;
    const da = (a[0] - ln.p[0]) * nx + (a[1] - ln.p[1]) * ny;
    const db = (b[0] - ln.p[0]) * nx + (b[1] - ln.p[1]) * ny;
    return Math.abs(Math.abs(da) - fr.gap / 2) < 1e-3 && Math.abs(Math.abs(db) - fr.gap / 2) < 1e-3 && Math.hypot(b[0] - a[0], b[1] - a[1]) > 1e-3;
  });
  return fr.loops.map((l) => {
    const n = l.length;
    const a = l[0];
    const b = l[1];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const probe = [(a[0] + b[0]) / 2 - ((b[1] - a[1]) / L) * 0.05, (a[1] + b[1]) / 2 + ((b[0] - a[0]) / L) * 0.05];
    const s = inside(probe) ? 1 : -1; // is the left of the outline the inside?
    const nl = (p, q) => { const d = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1; return [(-(q[1] - p[1]) / d) * s, ((q[0] - p[0]) / d) * s]; };
    const cut = l.map((p, i) => (onCut(p, l[(i + 1) % n]) ? 1 : 0)); // edge i runs from corner i to i + 1
    return l.map((p, i) => {
      const s1 = cut[(i + n - 1) % n];
      const s2 = cut[i];
      if (!s1 && !s2) return [0, 0];
      const n1 = nl(l[(i + n - 1) % n], p);
      const n2 = nl(p, l[(i + 1) % n]);
      // m · n1 = s1 and m · n2 = s2: the corner slides along an edge that stays
      const det = n1[0] * n2[1] - n1[1] * n2[0];
      let m = Math.abs(det) > 1e-3 ? [(s1 * n2[1] - s2 * n1[1]) / det, (n1[0] * s2 - n2[0] * s1) / det] : s1 ? n1 : n2;
      const ml = Math.hypot(...m);
      if (ml > 3) m = m.map((x) => (x * 3) / ml);
      return m;
    });
  });
}

/**
 * A camera on a sphere round the pivot (0, 0, pivot): yaw th, pitch ph (radians), at dist.
 * At th = ph = 0 with dist = pivot it is exactly the eye. f is the focal length in px.
 */
function camera({ th = 0, ph = 0, dist = Z0, pivot = Z0, f = 1000, cx = 0, cy = 0, roll = 0 }) {
  const C = [dist * Math.sin(th) * Math.cos(ph), dist * Math.sin(ph), pivot - dist * Math.cos(th) * Math.cos(ph)];
  let w = [-C[0], -C[1], pivot - C[2]];
  const wl = Math.hypot(...w);
  w = w.map((x) => x / wl);
  let r = [w[2], 0, -w[0]];
  const rl = Math.hypot(...r) || 1;
  r = r.map((x) => x / rl);
  let u = [w[1] * r[2] - w[2] * r[1], w[2] * r[0] - w[0] * r[2], w[0] * r[1] - w[1] * r[0]];
  if (roll) {
    const c = Math.cos(roll);
    const s = Math.sin(roll);
    [r, u] = [r.map((x, i) => x * c + u[i] * s), u.map((x, i) => x * c - r[i] * s)];
  }
  return { C, r, u, w, f, cx, cy };
}

const view = (cam, P) => {
  const d = [P[0] - cam.C[0], P[1] - cam.C[1], P[2] - cam.C[2]];
  return [d[0] * cam.r[0] + d[1] * cam.r[1] + d[2] * cam.r[2], d[0] * cam.u[0] + d[1] * cam.u[1] + d[2] * cam.u[2], d[0] * cam.w[0] + d[1] * cam.w[1] + d[2] * cam.w[2]];
};

/** Project a point to the screen, or null behind the camera. */
const project = (cam, P) => {
  const [x, y, z] = view(cam, P);
  return z > 0.05 ? [cam.cx + (cam.f * x) / z, cam.cy - (cam.f * y) / z] : null;
};

/** Clip a polygon to the space in front of the camera, then project it. */
function projectPoly(cam, pts, near = 0.05) {
  const v = pts.map((P) => view(cam, P));
  const out = [];
  for (let i = 0; i < v.length; i++) {
    const a = v[i];
    const b = v[(i + 1) % v.length];
    if (a[2] >= near) out.push(a);
    if ((a[2] >= near) !== (b[2] >= near)) { const k = (near - a[2]) / (b[2] - a[2]); out.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, near]); }
  }
  return out.map(([x, y, z]) => [cam.cx + (cam.f * x) / z, cam.cy - (cam.f * y) / z]);
}

/**
 * The fragments as cam sees them, far to near: screen loops (and parts), which side it
 * sees (facing > 0: the side the eye sees) and the light on it. move(fr) may return
 * options for solid().
 */
function look(placed, cam, move, withParts = false) {
  return placed.map((fr) => {
    const sd = solid(fr, move ? move(fr) ?? {} : {}, withParts);
    const toC = [cam.C[0] - sd.centre[0], cam.C[1] - sd.centre[1], cam.C[2] - sd.centre[2]];
    const dist = Math.hypot(...toC);
    const n = sd.normal;
    return {
      fr,
      sd,
      loops: sd.loops.map((l) => projectPoly(cam, l)).filter((l) => l.length >= 3),
      parts: withParts ? sd.parts.map((p) => projectPoly(cam, p)).filter((l) => l.length >= 3) : null,
      facing: (n[0] * toC[0] + n[1] * toC[1] + n[2] * toC[2]) / dist,
      depth: dist,
    };
  }).sort((a, b) => b.depth - a.depth);
}

// ---------------------------------------------------------------------------
// The piece drawn flat: one colour, no light. Every plane is solid; where a nearer plane
// covers a farther one, the farther one is cut back by a gap, so the overlap reads as depth.

/** Orient a convex polygon so its signed area is positive. */
const ccw = (p) => (polygonArea(p) < 0 ? [...p].reverse() : p);

/** A convex polygon grown by g on every side (mitred, with a bevel on sharp corners). */
function dilate(P, g) {
  const p = ccw(P);
  const n = p.length;
  const off = [];
  for (let i = 0; i < n; i++) {
    const a = p[i];
    const b = p[(i + 1) % n];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    off.push([(b[1] - a[1]) / L, -(b[0] - a[0]) / L]); // outward normal of edge i
  }
  const out = [];
  for (let i = 0; i < n; i++) {
    const n0 = off[(i + n - 1) % n];
    const n1 = off[i];
    const den = 1 + n0[0] * n1[0] + n0[1] * n1[1];
    const m = den > 1e-6 ? [(n0[0] + n1[0]) / den, (n0[1] + n1[1]) / den] : n1;
    if (Math.hypot(...m) > 2.5) out.push([p[i][0] + n0[0] * g, p[i][1] + n0[1] * g], [p[i][0] + n1[0] * g, p[i][1] + n1[1] * g]);
    else out.push([p[i][0] + m[0] * g, p[i][1] + m[1] * g]);
  }
  return out;
}

/** A convex polygon minus a convex polygon: the rest, as convex pieces. */
function subtract(A, B) {
  const [a0, a1, a2, a3] = bbox(A);
  const [b0, b1, b2, b3] = bbox(B);
  if (a2 <= b0 || b2 <= a0 || a3 <= b1 || b3 <= a1) return [A];
  const q = ccw(B);
  const out = [];
  let rest = A;
  for (let i = 0; i < q.length && rest.length >= 3; i++) {
    const a = q[i];
    const b = q[(i + 1) % q.length];
    const nIn = [-(b[1] - a[1]), b[0] - a[0]];
    const piece = clean(clipHalfPlane(rest, a, [-nIn[0], -nIn[1]]));
    if (area(piece) > 1e-4) out.push(piece);
    rest = clean(clipHalfPlane(rest, a, nIn));
  }
  return out;
}

/**
 * The fragments as cam sees them, drawn flat: for each, its outline loops on the screen with
 * everything nearer (grown by gap) cut out of it. Far to near. move as for look().
 */
function flatView(placed, cam, gap, move) {
  const items = look(placed, cam, move, true);
  return items.map((it, i) => {
    let pieces = it.parts.map(ccw);
    for (let j = i + 1; j < items.length; j++) {
      for (const q of items[j].parts) {
        const D = dilate(q, gap);
        pieces = pieces.flatMap((p) => subtract(p, D));
      }
    }
    return { fr: it.fr, loops: pieces.length ? outline(pieces) : [], facing: it.facing };
  }).filter((f) => f.loops.length);
}

// A cool key light from above and to the left, and the projector at the eye.
const KEY = (() => { const v = [-0.35, 0.85, -0.4]; const l = Math.hypot(...v); return v.map((x) => x / l); })();

/**
 * How bright the lit side of a plane looks from a camera, 0..1: the projector at the eye,
 * the key light, and a broad glint when the key light glances off it towards the camera.
 */
function shade(it, cam) {
  const n = it.sd.normal;
  const P = it.sd.centre;
  const eye = Math.max(0, -(n[0] * P[0] + n[1] * P[1] + n[2] * P[2]) / Math.hypot(...P));
  const nk = n[0] * KEY[0] + n[1] * KEY[1] + n[2] * KEY[2];
  const R = n.map((x, i) => 2 * nk * x - KEY[i]);
  const V = cam.C.map((x, i) => x - P[i]);
  const glint = Math.max(0, (R[0] * V[0] + R[1] * V[1] + R[2] * V[2]) / Math.hypot(...V)) ** 6;
  return Math.min(1, 0.1 + 0.42 * eye + 0.3 * Math.max(0, nk) + 0.8 * glint);
}

/** How bright a fragment is, 0..1: lit by the projector at the eye and the key light. */
function light(it) {
  const n = it.sd.normal;
  const P = it.sd.centre;
  const eye = Math.max(0, -(n[0] * P[0] + n[1] * P[1] + n[2] * P[2]) / Math.hypot(...P));
  const key = Math.max(0, n[0] * KEY[0] + n[1] * KEY[1] + n[2] * KEY[2]);
  return it.facing > 0 ? Math.min(1, 0.26 + 0.52 * eye + 0.34 * key) : 0.1 + 0.16 * key;
}

// ---------------------------------------------------------------------------
// The canonical object: one word, one cut, one seed.

let MODEL = null;
function model() {
  if (MODEL) return MODEL;
  const wd = word();
  const frags = fragments(wd).map((f) => ({ ...f, miters: miters(f) }));
  const placed = place(frags, wd);
  const letters = wd.letters.map((L) => outline(L.parts));
  MODEL = { wd, frags, placed, letters };
  return MODEL;
}

// ---------------------------------------------------------------------------
// Stills

const INK = '#0e0c0b';
const PAPER = '#ecebe6';
const LIGHT = '#ffffff'; // the light itself: the one accent, and it is not a colour

/**
 * The wordmark: the view from the eye, where the word is whole. The letters are clean, one
 * shape each; the seams exist in space (the motion, the room).
 */
export function wordmark() {
  const { wd, letters } = model();
  return svg(+wd.width.toFixed(2), 100, `<g fill="currentColor">${letters.map((ls) => `<path d="${loopsPath(ls)}"/>`).join('')}</g>`);
}

/**
 * The symbol is the piece itself, seen from a step beside the one place: SMASH, almost
 * assembled. It is the first frame of the motion. Drawn flat in one colour: every panel is
 * solid, and where a nearer panel crosses a farther one the farther one is cut back by a gap,
 * so the overlaps read as depth. The panels are cut with a wider seam than in the room, so
 * each one holds its own edge when it is drawn small.
 */
const SYMBOL_VIEW = { th: -1.6 * DEG, ph: 0.8 * DEG };
const FLAT = { seam: 1.6, gap: 1.6 };

let FLATM = null;
function flatModel() {
  if (FLATM) return FLATM;
  const { wd } = model();
  FLATM = { placed: place(fragments(wd, FLAT.seam), wd) };
  return FLATM;
}

/** A camera in word units: from the eye it draws the word at its own size, cap height 100. */
function wordCam(view) {
  const { wd } = model();
  const ang = offAxis(view.th, view.ph);
  return camera({ th: view.th, ph: view.ph, dist: distAt(ang), f: (100 * Z0) / SPAN, cx: wd.width / 2, cy: 50 });
}

/** The flat drawing from a view: [{ fr, loops }], far to near; only some letters, if asked. */
function flatShapes(view, letters = null, gap = FLAT.gap) {
  const placed = flatModel().placed.filter((fr) => !letters || letters.includes(fr.letter));
  return flatView(placed, wordCam(view), gap);
}

const shapesBox = (shapes) => bbox(shapes.flatMap((f) => f.loops.flat()));
const shapesSvg = (shapes, T = (q) => q, digits = 2) => shapes.map((f) => `<path fill-rule="evenodd" d="${loopsPath(f.loops.map((l) => l.map(T)), digits)}"/>`).join('');

export function symbol() {
  const sh = flatShapes(SYMBOL_VIEW);
  const [x0, y0, x1, y1] = shapesBox(sh);
  const pad = 6;
  const T = ([x, y]) => [x - x0 + pad, y - y0 + pad];
  return svg(+(x1 - x0 + 2 * pad).toFixed(2), +(y1 - y0 + 2 * pad).toFixed(2), `<g fill="currentColor">${shapesSvg(sh, T)}</g>`);
}

/**
 * The avatar: the word is 4.5 to 1, so the square takes its M. It is the M because it is
 * nearly square (110 × 100) and sits at the word's heart; the other chapters own the S and
 * the H. It is seen from the same distance off the spot as the symbol, from the other side:
 * there its panels step outwards (the left stem's foot out to the left, the right stem's
 * top up and out), so they stay clear of one another down to 16 px. From the symbol's own
 * side they step inwards and close up at small sizes.
 */
const AVATAR_VIEW = { th: -SYMBOL_VIEW.th, ph: SYMBOL_VIEW.ph };

/** The M's panels fitted into a box: height h, top at y, left at x; returns shapes and width. */
function avatar(h, view = AVATAR_VIEW, gap = FLAT.gap) {
  const sh = flatShapes(view, [1], gap);
  const [x0, y0, x1, y1] = shapesBox(sh);
  const k = h / (y1 - y0);
  return { sh, w: (x1 - x0) * k, T: (x, y) => ([u, v]) => [x + (u - x0) * k, y + (v - y0) * k] };
}

/**
 * Favicons: the avatar, its gaps widened as it gets smaller so they stay open. At 16 px it is
 * three panels, hinted by hand on the pixel grid: the left stem and its diagonal, the V and
 * the right stem below the cut, and the right stem's top, lifted a pixel up and out.
 */
const FAV = {
  64: { margin: 8, gap: 3.2 },
  32: { margin: 4, gap: 6.5 },
};
const FAV16 = [
  '................',
  '...........####.',
  '..###......####.',
  '..####.....##...',
  '..#####.........',
  '..#####....###..',
  '..###.#..#####..',
  '..###...######..',
  '..###.########..',
  '..###.####.###..',
  '..###.####.###..',
  '..###..##..###..',
  '..###..##..###..',
  '................',
  '................',
  '................',
];
export function favicon({ size = 32 } = {}) {
  if (size <= 16) {
    // the hinted grid, one path per panel (its runs joined into one outline)
    const rects = [];
    FAV16.forEach((row, y) => { for (const m of row.matchAll(/#+/g)) rects.push(rect(m.index, y, m.index + m[0].length, y + 1)); });
    const groups = [];
    for (const r of rects) {
      const hit = groups.filter((g) => g.some((q) => touching(q, r)));
      const merged = [r, ...hit.flat()];
      for (const h of hit) groups.splice(groups.indexOf(h), 1);
      groups.push(merged);
    }
    const body = groups.map((g) => `<path d="${loopsPath(outline(g), 0)}"/>`).join('');
    return svg(16, 16, `<rect width="16" height="16" fill="${INK}"/><g fill="${PAPER}">${body}</g>`);
  }
  const f = FAV[size <= 32 ? 32 : 64];
  const h = size - 2 * f.margin;
  const av = avatar(h, AVATAR_VIEW, f.gap);
  const x = (size - av.w) / 2;
  return svg(size, size, `<rect width="${size}" height="${size}" fill="${INK}"/><g fill="${PAPER}">${shapesSvg(av.sh, av.T(x, f.margin))}</g>`);
}

/**
 * The lockup: a signature. The symbol large, and the clean word under it at two fifths of
 * its width, flush left: the piece, and its name once it has come together.
 */
const LOCK = { ratio: 2.5, gap: 0.34 }; // the word's width is the symbol's / ratio; gap in symbol cap heights
export function lockup() {
  const { wd, letters } = model();
  const sh = flatShapes(SYMBOL_VIEW);
  const [x0, y0, x1, y1] = shapesBox(sh);
  const W = x1 - x0;
  const k = W / LOCK.ratio / wd.width;
  const top = y1 - y0 + LOCK.gap * 100;
  const word = letters.map((ls) => `<path d="${loopsPath(ls.map((l) => l.map(([x, y]) => [x * k, top + y * k])))}"/>`).join('');
  return svg(+W.toFixed(2), +(top + 100 * k).toFixed(2), `<g fill="currentColor">${shapesSvg(sh, ([x, y]) => [x - x0, y - y0])}${word}</g>`);
}

// ---------------------------------------------------------------------------
// Motion: eight seconds in beats. It opens on the symbol: the piece a step beside the one
// place, SMASH almost assembled, and holds. The camera swings out round the side, and the
// word comes apart into panels in depth; it turns, swings back in, stalls a hair short, and a
// spring clicks it onto the spot. Light runs through the cracks, the word comes up to full
// white and holds while a light crosses it. Then the A cracks first, light in its seams, and
// a kick knocks the camera off to the other side: the parallax breaks the word. The camera
// arcs back over the top to the symbol. Nothing moves in the picture plane: the word only
// forms and breaks because of where the camera is.

const LOOP = 8; // seconds
const T_TOP = 0.045; // the symbol holds until here
const T_OUT = 0.2; // the widest point of the swing
const T_LAND = 0.405; // the approach ends; the spring takes the camera in
const T_BREAK = 0.665; // the kick
const T_RISE = 0.725; // the kick has spent itself; the camera arcs back
const WIDE = { th: -22 * DEG, ph: 14 * DEG }; // the swing's far end, on the symbol's side: the cloud at its most spatial
const KICK = { th: 11 * DEG, ph: -1 * DEG }; // where the kick knocks the camera: the other side
const WIND = -0.25 * DEG; // the wind-up before the kick: a quarter of a degree the other way
const ARC = 14 * DEG; // how high the way back arcs over the eye (so it never passes through it)
const SPRING = { a: 2 * DEG, decay: 0.1, period: 0.28 }; // the landing, in seconds
const T_CLICK = T_LAND + SPRING.period / 4 / LOOP; // the first moment the word is whole
const T_CRACK = T_BREAK - 0.22 / LOOP; // the A cracks first, then its neighbours, then the kick
const CRACK_STEP = 0.05; // seconds between one letter cracking and the next, outwards from the A
const SEAM_OPEN = 0.3; // how far each side of a crack draws back when the light comes through
const RUN = 0.08; // seconds for the light to run the length of the word
const SWEEP = { from: 0.3, dur: 1.0, width: 60 }; // the light across the hold: seconds after the click, and its band in word units

const LIT = [236, 240, 245]; // the planes in full light: cool white
const SHADE = [20, 24, 32]; // the lit side at its darkest: the light is cool
const BACK = [44, 50, 60]; // the backs of the planes
const INK_RGB = [14, 12, 11];
const WHITE = [255, 255, 255];

const TAU = Math.PI * 2;

/** The approach direction, in (yaw, pitch): the spring comes in along it. */
const APPROACH = (() => { const l = Math.hypot(WIDE.th, WIDE.ph); return [WIDE.th / l, WIDE.ph / l]; })();

/**
 * The camera's pose at t: yaw, pitch, how far the panels are pushed out in depth (from the
 * eye that changes nothing), and which framing keys to read (keyed, never refitted per frame).
 */
function pose(t) {
  const S = SYMBOL_VIEW;
  if (t < T_TOP) return { th: S.th, ph: S.ph, roll: 0, depth: 1, frame: ['hold', 'hold', 0] };
  if (t < T_OUT) {
    const u = ease.inOutCubic((t - T_TOP) / (T_OUT - T_TOP));
    return { th: lerp(S.th, WIDE.th, u), ph: lerp(S.ph, WIDE.ph, u), roll: 0, depth: 1, frame: ['out', (t - T_TOP) / (T_OUT - T_TOP)] };
  }
  if (t < T_LAND) {
    const u = ease.inOutCubic((t - T_OUT) / (T_LAND - T_OUT));
    return { th: lerp(WIDE.th, SPRING.a * APPROACH[0], u), ph: lerp(WIDE.ph, SPRING.a * APPROACH[1], u), roll: 0, depth: 1, frame: ['in', (t - T_OUT) / (T_LAND - T_OUT)] };
  }
  if (t < T_BREAK) {
    const s = (t - T_LAND) * LOOP;
    const off = SPRING.a * Math.exp(-s / SPRING.decay) * Math.cos((TAU * s) / SPRING.period);
    // anticipation: as the A cracks, the camera leans a quarter of a degree away from the kick
    const w = smoothstep(T_CRACK, T_BREAK, t) * WIND;
    return { th: off * APPROACH[0] + w, ph: off * APPROACH[1], roll: 0, depth: 1, frame: ['eye', 'eye', 0] };
  }
  if (t < T_RISE) {
    const u = ease.outExpo((t - T_BREAK) / (T_RISE - T_BREAK));
    return { th: lerp(WIND, KICK.th, u), ph: KICK.ph * u, roll: 0, depth: 1 + 0.12 * u, frame: ['eye', 'kick', u] };
  }
  const u = ease.inOutCubic((t - T_RISE) / (1 - T_RISE));
  return { th: lerp(KICK.th, S.th, u), ph: lerp(KICK.ph, S.ph, u) + ARC * Math.sin(Math.PI * u), roll: 0, depth: lerp(1.12, 1, u), frame: ['up', (t - T_RISE) / (1 - T_RISE)] };
}

/** The angle between the camera's direction and the eye's. */
const offAxis = (th, ph) => Math.acos(clamp(Math.cos(th) * Math.cos(ph), -1, 1));

/** How far the camera stands from the pivot: it backs off as it goes round. */
const distAt = (ang) => Z0 * (1 + 0.55 * (1 - Math.cos(ang)));

/** A camera for a pose with a framing { f, cx, cy } (f per unit of stage width). */
function cameraFor(p, fr, W) {
  const ang = offAxis(p.th, p.ph);
  const cam = camera({ th: p.th, ph: p.ph, dist: distAt(ang), f: fr.f * W, roll: p.roll });
  return { ...cam, cx: fr.cx * W, cy: fr.cy * W, ang };
}

/** Fit the piece into a W × H frame from a pose. */
function fit(p, W, H) {
  const { placed } = model();
  const ang = offAxis(p.th, p.ph);
  const cam = camera({ th: p.th, ph: p.ph, dist: distAt(ang), f: 1, roll: p.roll ?? 0 });
  const pts = [];
  for (const fr of placed) for (const l of solid(fr, { z: fr.z * (p.depth ?? 1) }).loops) for (const P of l) { const q = project(cam, P); if (q) pts.push(q); }
  const [x0, y0, x1, y1] = bbox(pts);
  const k = smoothstep(0, 40 * DEG, ang);
  const f = Math.min((W * lerp(0.66, 0.72, k)) / (x1 - x0), (H * lerp(0.62, 0.8, k)) / (y1 - y0));
  return { f: f / W, cx: (W / 2 - ((x0 + x1) / 2) * f) / W, cy: (H / 2 - ((y0 + y1) / 2) * f) / W };
}

/**
 * The lens, keyed: for each move the framing is fitted at a few poses along it, once per stage
 * size, and read back on a smooth curve (Catmull-Rom) with the move's own easing. It never
 * refits per frame, so the zoom does not breathe with the content. Where two moves meet they
 * share a key, so the lens never jumps.
 */
const FRAMES = new Map();
const KEYS = 8;
function framings(W, H) {
  const key = `${W}x${H}`;
  if (!FRAMES.has(key)) {
    const eye = fit({ th: 0, ph: 0, roll: 0 }, W, H);
    const along = (a, b) => Array.from({ length: KEYS + 1 }, (_, i) => fit(pose(lerp(a, b, i / KEYS) - (i === KEYS ? 1e-7 : 0)), W, H));
    const hold = fit(pose(0), W, H);
    const out = along(T_TOP, T_OUT);
    const inn = along(T_OUT, T_LAND);
    out[0] = hold;
    inn[0] = out[KEYS];
    inn[KEYS] = eye;
    const up = along(T_RISE, 1);
    up[KEYS] = hold;
    FRAMES.set(key, { hold, out, in: inn, eye, kick: up[0], up });
    if (FRAMES.size > 12) FRAMES.delete(FRAMES.keys().next().value);
  }
  return FRAMES.get(key);
}
const mixFrame = (a, b, u) => ({ f: lerp(a.f, b.f, u), cx: lerp(a.cx, b.cx, u), cy: lerp(a.cy, b.cy, u) });
/** A framing read from keys at 0..1 (Catmull-Rom through them). */
function readKeys(keys, u) {
  const n = keys.length - 1;
  const x = clamp(u) * n;
  const i = Math.min(n - 1, Math.floor(x));
  const s = x - i;
  const k = (j) => keys[clamp(j, 0, n)];
  const cr = (p0, p1, p2, p3) => 0.5 * (2 * p1 + (-p0 + p2) * s + (2 * p0 - 5 * p1 + 4 * p2 - p3) * s * s + (-p0 + 3 * p1 - 3 * p2 + p3) * s * s * s);
  const out = {};
  for (const c of ['f', 'cx', 'cy']) out[c] = cr(k(i - 1)[c], k(i)[c], k(i + 1)[c], k(i + 2)[c]);
  return out;
}

const mix = (a, b, k) => a.map((x, i) => Math.round(x + (b[i] - x) * k));
const rgba = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${+a.toFixed(3)})`;

function pathOf(ctx, loops) {
  ctx.beginPath();
  for (const l of loops) { ctx.moveTo(l[0][0], l[0][1]); for (let i = 1; i < l.length; i++) ctx.lineTo(l[i][0], l[i][1]); ctx.closePath(); }
}

/** The cracks' light, 0..1, sec seconds after it starts: in fast, out slow. */
const seamEnv = (sec) => (sec < 0 ? 0 : Math.min(1, sec / 0.05) * Math.exp(-Math.max(0, sec - 0.05) / 0.32));
const glowEnv = (sec) => (sec < 0 ? 0 : Math.min(1, sec / 0.04) * Math.exp(-Math.max(0, sec - 0.12) / 0.22)); // gone with the cracks, so the hold's seams are dark

/**
 * Draw the scene. st: t (for the drift), depth, aligned (0..1: how whole the word is from
 * this camera), click (seconds since the word came together, or < 0), crack (seconds since
 * the A began to crack, or < 0), ghost (0..1: the picture plane, faint, as a target).
 */
function drawScene(ctx, W, H, cam, st) {
  const { placed, wd, letters } = model();
  const { t = 0, depth = 1, aligned = 0, click = -1, crack = -1, ghost = 0 } = st;
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, W, H);
  const uc = wd.width / 2;
  const onPlane = (ls) => ls.map((l) => l.map(([u, v]) => project(cam, ray(u, v, uc)))).filter((l) => l.every(Boolean));

  // The picture plane: where the word will close, drawn faint when the pointer is looking for it.
  if (ghost > 0.01) {
    ctx.strokeStyle = rgba(LIT, 0.07 * ghost);
    ctx.lineWidth = 1;
    pathOf(ctx, letters.flatMap(onPlane));
    ctx.stroke();
  }

  // The light behind the word: only ever seen through the cracks, when they open.
  const crackOf = (li) => (crack < 0 ? 0 : smoothstep(0, 0.06, crack - CRACK_STEP * Math.abs(li - 2)));
  const glow = Math.max(glowEnv(click), crack < 0 ? 0 : smoothstep(0, 0.06, crack)) * aligned * aligned;
  if (glow > 0.005) {
    ctx.fillStyle = rgba(WHITE, glow);
    pathOf(ctx, letters.flatMap(onPlane));
    ctx.fill('nonzero');
  }

  // The planes: drifting in depth and lean, which the eye never sees (the drift is nothing at
  // t = 0, so the first frame is the symbol). At the click each one's cracks open in turn, left
  // to right, and close again; before the kick the A cracks first, then its neighbours.
  const move = (fr) => {
    const p = fr.ph;
    const d = (i) => Math.sin(TAU * t + p[i]) - Math.sin(p[i]);
    const sec = click - RUN * (fr.c[0] / wd.width);
    return {
      z: fr.z * depth * (1 + 0.05 * d(0)),
      ax: fr.ax + 5 * DEG * d(1),
      ay: fr.ay + 6 * DEG * d(2),
      inset: (SEAM_OPEN * seamEnv(sec) + 0.45 * crackOf(fr.letter)) * aligned,
    };
  };
  const items = look(placed, cam, move);
  let dn = Infinity;
  let df = -Infinity;
  for (const it of items) { dn = Math.min(dn, it.depth); df = Math.max(df, it.depth); }
  // Once the sweep has passed, the key light swings slowly from side to side, so the planes
  // breathe: those turned one way brighten a few per cent as the others dim. The word never
  // goes quite still, and it shows, gently, that it is built of planes.
  const sweepEnd = SWEEP.from + SWEEP.dur;
  const breath = aligned > 0.5 && click > 0 ? 0.035 * aligned * smoothstep(sweepEnd - 0.2, sweepEnd + 0.4, click) : 0;
  const swing = Math.sin((TAU * (click - sweepEnd)) / 2.4);
  const kd = [-0.55, -0.83]; // the key light, on the screen: from the upper left
  for (const it of items) {
    const fog = ((it.depth - dn) / Math.max(1e-6, df - dn)) * (1 - aligned);
    let c;
    if (it.facing > 0) {
      const b = shade(it, cam) * (1 - 0.6 * fog);
      let lit = lerp(b, 1, aligned);
      if (breath) lit += breath * swing * clamp(-it.sd.normal[0] / 0.25, -1, 1) - breath;
      c = mix(SHADE, LIT, lit);
      const sec = click - RUN * (it.fr.c[0] / wd.width);
      c = c.map((x) => x * (1 - 0.07 * seamEnv(sec) * aligned));
    } else {
      c = mix(INK_RGB, BACK, (0.35 + 0.65 * light(it)) * (1 - 0.7 * fog));
    }
    ctx.fillStyle = rgba(c, lerp(0.93, 1, aligned));
    pathOf(ctx, it.loops);
    ctx.fill('evenodd');
    // The edge that faces the key light catches it: a hairline a step lighter.
    if (aligned < 0.99 && it.facing > 0) {
      ctx.beginPath();
      for (const l of it.loops) {
        let a2 = 0;
        for (let i = 0; i < l.length; i++) { const p = l[i]; const q = l[(i + 1) % l.length]; a2 += p[0] * q[1] - q[0] * p[1]; }
        const sg = a2 > 0 ? 1 : -1;
        for (let i = 0; i < l.length; i++) {
          const p = l[i];
          const q = l[(i + 1) % l.length];
          const dx = q[0] - p[0];
          const dy = q[1] - p[1];
          const L = Math.hypot(dx, dy) || 1;
          if (((dy * sg) / L) * kd[0] + ((-dx * sg) / L) * kd[1] > 0.3) { ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); }
        }
      }
      ctx.strokeStyle = rgba(mix(c, WHITE, 0.45), 0.9 * (1 - aligned));
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  // The hold's light: one soft band crossing the whole word, on the letters' diagonal, laid
  // over the lit faces (each face takes it a touch differently, so the planes still show).
  const hs = click - SWEEP.from;
  if (aligned > 0.01 && hs >= 0 && hs <= SWEEP.dur) {
    const u = ease.inOutQuad(hs / SWEEP.dur);
    const env = Math.sin(Math.PI * u);
    const a = project(cam, ray(0, 50, uc));
    const b = project(cam, ray(wd.width, 50, uc));
    if (a && b) {
      const px = (b[0] - a[0]) / wd.width; // px per word unit
      const cx = lerp(a[0] - SWEEP.width * px, b[0] + SWEEP.width * px, u);
      const cy = (a[1] + b[1]) / 2;
      const dir = [Math.cos(LETTER.diag * DEG), Math.sin(LETTER.diag * DEG)]; // across the band
      const half = SWEEP.width * px * 0.5;
      const g = ctx.createLinearGradient(cx - dir[0] * half * 2, cy - dir[1] * half * 2, cx + dir[0] * half * 2, cy + dir[1] * half * 2);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.5, `rgba(255,255,255,${(0.55 * env * aligned).toFixed(3)})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.save();
      for (const it of items) {
        if (it.facing <= 0) continue;
        ctx.globalAlpha = 0.8 + 0.2 * ((Math.sin(it.fr.ph[3]) + 1) / 2);
        ctx.fillStyle = g;
        pathOf(ctx, it.loops);
        ctx.fill('evenodd');
      }
      ctx.restore();
    }
  }
}

/**
 * The pointer's camera. Across is yaw; up lifts the camera, down only a little (below the
 * planes you would see their backs). Near the eye it pulls in, like a detent.
 */
function pointerAngles(x, y) {
  let th = (x - 0.5) * 2 * 50 * DEG;
  let ph = y < 0.5 ? ((0.5 - y) / 0.5) * 40 * DEG : -((y - 0.5) / 0.5) * 8 * DEG;
  const a = Math.hypot(th, ph);
  const k = smoothstep(1.2 * DEG, 6 * DEG, a);
  th *= k; ph *= k;
  return { th, ph };
}

export function motion(el) {
  const stage = canvasStage(el);
  const ac = new AbortController();
  const on = { signal: ac.signal };
  let destroyed = false;
  let raf = 0;
  // The pointer: its aim (angles), how much it has the camera (inf), and when it found the eye.
  const P = { want: 0, inf: 0, th: 0, ph: 0, aimTh: 0, aimPh: 0, last: 0, at: -1e9, was: false, until: 0, drag: null, walk: null, cur: { th: 0, ph: 0 } };
  el.style.touchAction = 'pan-y';
  const WALK = 0.6; // seconds: a tap walks the camera to the spot

  const step = () => {
    const now = performance.now();
    const dt = P.last ? Math.min(0.1, (now - P.last) / 1000) : 0.016;
    P.last = now;
    if (P.until && now > P.until && !P.drag && !P.walk) { P.until = 0; P.want = 0; }
    const k = 1 - Math.exp(-dt / 0.16);
    P.inf += (P.want - P.inf) * k;
    if (P.walk) {
      // a shaped walk to the spot, then it holds there for a while after it arrives
      const u = clamp((now - P.walk.t0) / 1000 / WALK);
      const e = ease.inOutCubic(u);
      P.th = lerp(P.walk.th, 0, e);
      P.ph = lerp(P.walk.ph, 0, e);
      P.aimTh = 0; P.aimPh = 0;
      if (u >= 1) { P.walk = null; P.until = now + 1800; }
    } else {
      P.th += (P.aimTh - P.th) * k;
      P.ph += (P.aimPh - P.ph) * k;
    }
    const at = P.want > 0.5 && Math.hypot(P.th, P.ph) < 0.4 * DEG;
    if (at && !P.was) P.at = now;
    P.was = at;
    if (P.inf < 0.001 && !P.want) P.inf = 0;
    return P.inf > 0 && (Math.abs(P.want - P.inf) > 0.002 || Math.abs(P.aimTh - P.th) + Math.abs(P.aimPh - P.ph) > 0.0005 || now - P.at < 1600 || P.until > 0 || !!P.walk);
  };

  const render = (t, dt) => {
    if (dt > 0) step();
    const { width: W, height: H, ctx } = stage;
    const p = pose(t);
    const F = framings(W, H);
    let fr = p.frame.length === 2 ? readKeys(F[p.frame[0]], p.frame[1]) : mixFrame(F[p.frame[0]], F[p.frame[1]], p.frame[2]);
    // The click lands with a small push of the lens (a zoom keeps the word whole).
    const sc = (t - T_CLICK) * LOOP;
    if (t >= T_CLICK && t < T_BREAK) fr = { ...fr, f: fr.f * (1 + 0.012 * Math.exp(-sc / 0.12) * Math.cos((sc * TAU) / 0.24)) };
    const pi = P.inf;
    let q = { th: p.th, ph: p.ph, roll: 0, depth: p.depth };
    if (pi > 0) {
      q = { th: lerp(p.th, P.th, pi), ph: lerp(p.ph, P.ph, pi), roll: 0, depth: lerp(p.depth, 1, pi) };
      const ang = offAxis(q.th, q.ph);
      const own = ang < 0.5 * DEG ? F.eye : mixFrame(F.eye, fit(q, W, H), smoothstep(0, 30 * DEG, ang));
      fr = mixFrame(fr, own, pi);
    }
    const cam = cameraFor(q, fr, W);
    P.cur = q;
    const aligned = 1 - smoothstep(0.25 * DEG, 3.5 * DEG, cam.ang);
    // seconds since the word came together: from the loop, or from the pointer finding the eye
    let click = t >= T_CLICK && t < T_BREAK ? sc : -1;
    let crack = t >= T_CRACK && t < T_RISE ? (t - T_CRACK) * LOOP : -1;
    if (pi > 0.5) { click = P.was ? (performance.now() - P.at) / 1000 : -1; crack = -1; }
    const ghost = pi * (1 - smoothstep(8 * DEG, 12 * DEG, cam.ang)) * (1 - aligned);
    drawScene(ctx, W, H, cam, { t, depth: q.depth, aligned, click, crack, ghost });
  };
  const tl = timeline({ duration: LOOP, render });
  const loop = () => {
    raf = 0;
    if (destroyed) return;
    const busy = step();
    if (!tl.playing) tl.redraw();
    if (busy && !tl.playing) raf = requestAnimationFrame(loop);
  };
  const wake = () => { if (!destroyed && !tl.playing && !raf) raf = requestAnimationFrame(loop); };
  const local = (e) => { const r = el.getBoundingClientRect(); return [clamp((e.clientX - r.left) / r.width), clamp((e.clientY - r.top) / r.height), r.width]; };
  // take the camera from wherever the loop has it, so the first move never sags
  const seed = () => { if (!P.want && P.inf < 0.01) { P.th = P.cur.th; P.ph = P.cur.ph; } };

  // A mouse or a pen: the pointer is the camera.
  el.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') {
      if (!P.drag || P.drag.id !== e.pointerId) return;
      const [x, , w] = local(e);
      if (Math.abs((x - P.drag.x) * w) > 6) P.drag.moved = true;
      P.aimTh = clamp(P.drag.th + (x - P.drag.x) * 110 * DEG, -50 * DEG, 50 * DEG);
      // the detent, as with a mouse: near the spot the drag pulls in
      P.aimTh *= smoothstep(1.2 * DEG, 6 * DEG, Math.abs(P.aimTh));
      wake();
      return;
    }
    const [x, y] = local(e);
    const a = pointerAngles(x, y);
    seed();
    P.aimTh = a.th; P.aimPh = a.ph; P.want = 1; P.until = 0; P.walk = null;
    wake();
  }, on);
  el.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'touch') { P.want = 0; wake(); } }, on);
  // A finger: drag across to swing the camera at eye height; a tap walks it to the spot.
  el.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return;
    const [x] = local(e);
    seed();
    P.drag = { id: e.pointerId, x, th: P.want ? P.aimTh : P.cur.th, t0: performance.now(), moved: false };
    P.aimTh = P.drag.th; P.aimPh = 0; P.want = 1; P.until = 0; P.walk = null;
    try { el.setPointerCapture(e.pointerId); } catch { /* no capture: the drag still works while over el */ }
    wake();
  }, on);
  const up = (e) => {
    if (!P.drag || P.drag.id !== e.pointerId) return;
    const tap = !P.drag.moved && performance.now() - P.drag.t0 < 350;
    P.drag = null;
    if (tap) P.walk = { th: P.th, ph: P.ph, t0: performance.now() };
    else P.until = performance.now() + 1500;
    wake();
  };
  el.addEventListener('pointerup', up, on);
  el.addEventListener('pointercancel', up, on);
  stage.onResize(() => tl.redraw());
  tl.seek(0);
  return withCleanup(tl, () => { destroyed = true; cancelAnimationFrame(raf); ac.abort(); }, stage.destroy);
}

// ---------------------------------------------------------------------------
// Application: the piece built. An atrium, 22 × 26 m and 13 m high. The 16 panels hang on
// wire; a spike mark on the floor is the one place they close into the name; a projector
// over the mark fills them with the studio's work. A: the room, drawn. B: walking onto the
// mark, and the work it shows. Under it, the same piece carrying four other works. C: a step
// off the mark.

const ROOM = { s: 0.8, eye: [0, 1.6, 0], pitch: 20 * DEG, x: 11, z0: -4, z1: 22, h: 13, levels: [4.4, 8.8] };

/** Canonical space (the eye at the origin) to the room, in metres. */
function toRoom(P) {
  const x = P[0] * ROOM.s;
  const y = P[1] * ROOM.s;
  const z = P[2] * ROOM.s;
  const c = Math.cos(ROOM.pitch);
  const sn = Math.sin(ROOM.pitch);
  return [ROOM.eye[0] + x, ROOM.eye[1] + y * c + z * sn, ROOM.eye[2] - y * sn + z * c];
}

/** A camera at pos looking at target (world up is y), in the shape project() takes. */
function lookAt(pos, target, f, cx, cy) {
  let w = [target[0] - pos[0], target[1] - pos[1], target[2] - pos[2]];
  const wl = Math.hypot(...w);
  w = w.map((v) => v / wl);
  let r = [w[2], 0, -w[0]];
  const rl = Math.hypot(...r) || 1;
  r = r.map((v) => v / rl);
  const u = [w[1] * r[2] - w[2] * r[1], w[2] * r[0] - w[0] * r[2], w[0] * r[1] - w[1] * r[0]];
  return { C: pos, r, u, w, f, cx, cy };
}

/** A segment clipped to the space in front of the camera, projected; or null. */
function segment(cam, A, B, near = 0.1) {
  let a = view(cam, A);
  let b = view(cam, B);
  if (a[2] < near && b[2] < near) return null;
  if (a[2] < near) { const k = (near - a[2]) / (b[2] - a[2]); a = a.map((v, i) => v + (b[i] - v) * k); }
  if (b[2] < near) { const k = (near - b[2]) / (a[2] - b[2]); b = b.map((v, i) => v + (a[i] - v) * k); }
  const P = ([x, y, z]) => [cam.cx + (cam.f * x) / z, cam.cy - (cam.f * y) / z];
  return [P(a), P(b)];
}

/** The room as lines, cut away: the floor's grid, the back and right walls, the galleries' edges. */
function roomLines() {
  const { x, z0, z1, h, levels } = ROOM;
  const grid = [];
  for (let gx = -x; gx <= x + 1e-6; gx += 2) grid.push([[gx, 0, z0], [gx, 0, z1]]);
  for (let gz = z0; gz <= z1 + 1e-6; gz += 2) grid.push([[-x, 0, gz], [x, 0, gz]]);
  const walls = [];
  for (const y of [0, h, ...levels]) walls.push([[-x, y, z1], [x, y, z1]], [[x, y, z0], [x, y, z1]]);
  walls.push([[-x, 0, z0], [-x, 0, z1]], [[-x, 0, z0], [x, 0, z0]]);
  walls.push([[x, 0, z1], [x, h, z1]], [[-x, 0, z1], [-x, h, z1]], [[x, 0, z0], [x, h, z0]]);
  // the galleries: a slab edge set in from the walls
  for (const y of levels) walls.push([[x - 2.4, y, z0], [x - 2.4, y, z1 - 2.4]], [[-x, y, z1 - 2.4], [x - 2.4, y, z1 - 2.4]]);
  return { grid, walls };
}

/** An affine map sending three points a, b, c to A, B, C: [a, b, c, d, e, f] for ctx.transform. */
function affine(src, dst) {
  const [[x0, y0], [x1, y1], [x2, y2]] = src;
  const [[X0, Y0], [X1, Y1], [X2, Y2]] = dst;
  const det = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
  if (Math.abs(det) < 1e-9) return null;
  const a = ((X1 - X0) * (y2 - y0) - (X2 - X0) * (y1 - y0)) / det;
  const c = ((X2 - X0) * (x1 - x0) - (X1 - X0) * (x2 - x0)) / det;
  const b = ((Y1 - Y0) * (y2 - y0) - (Y2 - Y0) * (y1 - y0)) / det;
  const d = ((Y2 - Y0) * (x1 - x0) - (Y1 - Y0) * (x2 - x0)) / det;
  return [a, b, c, d, X0 - a * x0 - c * y0, Y0 - b * x0 - d * y0];
}

/** Three well-spread corners of a loop (for the texture's affine map). */
function spread3(loop) {
  let best = [0, 1];
  let dm = -1;
  for (let i = 0; i < loop.length; i++) for (let j = i + 1; j < loop.length; j++) {
    const d = Math.hypot(loop[i][0] - loop[j][0], loop[i][1] - loop[j][1]);
    if (d > dm) { dm = d; best = [i, j]; }
  }
  const [i, j] = best;
  let k = 0;
  let hm = -1;
  for (let m = 0; m < loop.length; m++) {
    const hgt = Math.abs((loop[j][0] - loop[i][0]) * (loop[m][1] - loop[i][1]) - (loop[j][1] - loop[i][1]) * (loop[m][0] - loop[i][0]));
    if (hgt > hm) { hm = hgt; k = m; }
  }
  return [i, j, k];
}

/** A scale figure, 1.75 m, as a flat silhouette (metres, feet at 0, facing us). */
const FIGURE = [
  [[-0.2, 1.46], [0.2, 1.46], [0.23, 1.38], [0.22, 0.86], [0.17, 0.86], [0.15, 0.02], [0.05, 0.02], [0.02, 0.84], [-0.02, 0.84], [-0.05, 0.02], [-0.15, 0.02], [-0.17, 0.86], [-0.22, 0.86], [-0.23, 1.38]],
];

/** The panels in the room, far to near from a camera: outlines in metres, the side it sees, its light. */
function panels(cam) {
  const { placed } = model();
  const cc = Math.cos(ROOM.pitch);
  const sn = Math.sin(ROOM.pitch);
  return placed.map((fr) => {
    const sd = solid(fr);
    const loops = sd.loops.map((l) => l.map(toRoom));
    const c = toRoom(sd.centre);
    const n = sd.normal;
    const nr = [n[0], n[1] * cc + n[2] * sn, -n[1] * sn + n[2] * cc];
    const toC = cam.C.map((v, i) => v - c[i]);
    return { fr, sd, loops, c, facing: nr[0] * toC[0] + nr[1] * toC[1] + nr[2] * toC[2], depth: Math.hypot(...toC) };
  }).sort((p, q) => q.depth - p.depth);
}

/** Where a panel hangs from: its two highest corners and its lowest (which holds the lean). */
function hangs(loop) {
  const byY = [...loop].sort((a, b) => b[1] - a[1]);
  const top = byY[0];
  const second = byY.find((p) => Math.hypot(p[0] - top[0], p[2] - top[2]) > 0.35) ?? byY[1];
  return [top, second, byY.at(-1)];
}

/**
 * Draw the room and the piece for a camera. As a drawing (A): white lines, flat panels in
 * projection white, their wires, the spike mark, the projector and the figure. As a view
 * (B, C): the room faint, and the work projected on the panels from the mark.
 */
function drawRoom(ctx, w, h, cam, { img = null, crop = null, drawing = true, floor = 46, dim = 0.3 } = {}) {
  const { wd } = model();
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, w, h);
  const { grid, walls } = roomLines();
  const line = (segs, style, width) => {
    ctx.strokeStyle = style;
    ctx.lineWidth = width;
    ctx.beginPath();
    for (const [A, B] of segs) { const sg = segment(cam, A, B); if (sg) { ctx.moveTo(...sg[0]); ctx.lineTo(...sg[1]); } }
    ctx.stroke();
  };
  if (drawing) {
    line(grid, 'rgba(236,240,245,0.08)', 1);
    line(walls, 'rgba(236,240,245,0.3)', 1);
  } else {
    // in a view the room stays back: its lines stop short of the piece, so none of them runs
    // along a letter's edge or through its counters
    const pts = model().placed.flatMap((fr) => solid(fr).loops.flat().map(toRoom)).map((P) => project(cam, P)).filter(Boolean);
    const [x0, y0, x1, y1] = bbox(pts);
    const m = (x1 - x0) * 0.05;
    const hits = ([a, b]) => {
      // does the segment a-b enter the box? (sampled: the segments are long and straight)
      for (let i = 0; i <= 40; i++) { const x = lerp(a[0], b[0], i / 40); const y = lerp(a[1], b[1], i / 40); if (x > x0 - m && x < x1 + m && y > y0 - m && y < y1 + m) return true; }
      return false;
    };
    ctx.strokeStyle = 'rgba(236,240,245,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const [A, B] of [...grid, ...walls]) { const sg = segment(cam, A, B); if (sg && !hits(sg)) { ctx.moveTo(...sg[0]); ctx.lineTo(...sg[1]); } }
    ctx.stroke();
  }

  if (drawing) {
    // the spot: a spike mark taped on the floor, as on a stage, and the projector over it on its stand
    line([[[-0.35, 0, 0], [0.35, 0, 0]], [[0, 0, -0.35], [0, 0, 0.35]]], LIGHT, Math.max(1.2, w * 0.0018));
    const proj = [0, 3.1, -0.7];
    line([[[0, 0, -0.7], proj]], 'rgba(236,240,245,0.5)', 1.2);
    const pr = project(cam, proj);
    if (pr) {
      const sz = Math.max(2.5, (cam.f * 0.2) / Math.max(0.5, view(cam, proj)[2]));
      ctx.fillStyle = 'rgba(236,240,245,0.9)';
      ctx.fillRect(pr[0] - sz, pr[1] - sz * 0.6, sz * 2, sz * 1.2);
    }
  }

  const items = panels(cam);
  if (drawing) {
    const wires = [];
    for (const it of items) for (const P of hangs(it.loops.flat())) wires.push([P, [P[0], ROOM.h, P[2]]]);
    line(wires, 'rgba(236,240,245,0.16)', 1);
  }

  for (const it of items) {
    const sl = it.loops.map((l) => projectPoly(cam, l)).filter((l) => l.length >= 3);
    if (!sl.length) continue;
    ctx.save();
    pathOf(ctx, sl);
    if (!drawing && it.facing > 0 && img) {
      ctx.clip('evenodd');
      // the work, as the projector at the mark puts it on this panel: word units to the screen, by three corners
      const src = it.fr.loops[0];
      const [i, j, k] = spread3(src);
      const P = it.loops[0];
      const scr = [P[i], P[j], P[k]].map((q) => project(cam, q));
      const m = scr.every(Boolean) ? affine([src[i], src[j], src[k]], scr) : null;
      if (m) {
        ctx.save();
        ctx.transform(...m);
        ctx.drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, wd.width, 100);
        ctx.restore();
      }
      // lift the darks (the projector's light never falls below a floor), then the panel's own angle to it
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = `rgb(${floor},${floor - 4},${floor - 8})`;
      ctx.fill('evenodd');
      ctx.globalCompositeOperation = 'source-over';
      const b = light({ sd: it.sd, facing: 1 });
      ctx.fillStyle = `rgba(14,12,11,${(dim * (1 - b)).toFixed(3)})`;
      ctx.fill('evenodd');
    } else if (it.facing > 0) {
      const g = Math.round(lerp(198, 236, light({ sd: it.sd, facing: 1 })));
      ctx.fillStyle = `rgb(${g},${g + 3},${g + 7})`;
      ctx.fill('evenodd');
    } else {
      ctx.fillStyle = 'rgb(62,67,76)';
      ctx.fill('evenodd');
    }
    ctx.restore();
    ctx.strokeStyle = drawing ? 'rgba(14,12,11,0.95)' : 'rgba(14,12,11,0.7)';
    ctx.lineWidth = 1;
    pathOf(ctx, sl);
    ctx.stroke();
  }

  if (drawing) {
    const foot = [0.18, 0, 0.2];
    const fv = view(cam, foot);
    if (fv[2] > 0.3) {
      const base = project(cam, foot);
      const k = cam.f / fv[2];
      ctx.fillStyle = LIGHT;
      ctx.beginPath();
      for (const l of FIGURE) { l.forEach(([x, y], n) => (n ? ctx.lineTo(base[0] + x * k, base[1] - y * k) : ctx.moveTo(base[0] + x * k, base[1] - y * k))); ctx.closePath(); }
      ctx.fill();
      ctx.beginPath();
      ctx.arc(base[0], base[1] - 1.6 * k, 0.11 * k, 0, TAU);
      ctx.fill();
    }
  }
}

/** Where the first and the last panel hang, in metres: for the drawing's notes. */
function spec() {
  const { placed } = model();
  let lo = Infinity;
  let hi = -Infinity;
  let near = Infinity;
  for (const fr of placed) for (const l of solid(fr).loops) for (const P of l) { const R = toRoom(P); lo = Math.min(lo, R[1]); hi = Math.max(hi, R[1]); near = Math.min(near, Math.hypot(R[0], R[2])); }
  return { lo, hi, near, n: placed.length };
}

/** The view from a point at eye height (from the mark, or a step off it), the word at `span` of the width. */
function eyeCam(w, h, dx, span) {
  const { wd } = model();
  const c = Math.cos(ROOM.pitch);
  const sn = Math.sin(ROOM.pitch);
  const pos = [ROOM.eye[0] + dx, ROOM.eye[1], ROOM.eye[2]];
  // off the mark you still look at the piece: the camera turns to its centre (on the mark
  // that is exactly the eye's own axis)
  const T = dx ? toRoom([0, 0, Z0]) : [pos[0], pos[1] + sn, pos[2] + c];
  return lookAt(pos, T, (w * span * 100 * Z0) / (SPAN * wd.width), w * 0.5, h * 0.52);
}

/**
 * The works the projector carries, and the band of each picture it puts on the word's box
 * (the box is 4.6 to 1): x, w as fractions of the picture's width, cy of its height.
 */
const WORKS = [
  { i: 3, name: 'Dome Dreaming', x: 0.21, w: 0.78, sy: 0.235 }, // a band through the bright swirl, clear of the dark water
  { i: 0, name: 'Balena Voladora', x: 0, w: 1, cy: 0.36 },
  { i: 2, name: 'Icehotel', x: 0, w: 1, cy: 0.6 },
  { i: 6, name: 'Svartljus', x: 0, w: 1, cy: 0.4 },
  { i: 4, name: 'Lyra', x: 0.3, w: 0.7, cy: 0.42 }, // the grid of lights, clear of the faces
];
function cropOf(work, img) {
  const { wd } = model();
  const sw = img.width * work.w;
  const sh = (sw * 100) / wd.width;
  const sy = work.sy != null ? img.height * work.sy : img.height * work.cy - sh / 2;
  return { sx: img.width * work.x, sy: clamp(sy, 0, img.height - sh), sw, sh };
}

/**
 * B's walk, in seconds: on the mark, a step off to the left, the projector cuts to the next
 * work, and the walk back onto the mark (the name closes as you arrive).
 */
const WALK = { hold: 2.5, off: 1.2, wait: 0.8, back: 3, rest: 1, dx: -1.4 };
const WALK_T = WALK.hold + WALK.off + WALK.wait + WALK.back + WALK.rest;
function walkAt(sec) {
  const k = Math.floor(sec / WALK_T);
  let s = sec - k * WALK_T;
  if ((s -= WALK.hold) < 0) return { dx: 0, work: k };
  if ((s -= WALK.off) < 0) return { dx: WALK.dx * ease.inOutCubic(1 + s / WALK.off), work: k };
  if ((s -= WALK.wait) < 0) return { dx: WALK.dx, work: s > -WALK.wait / 2 ? k + 1 : k };
  if ((s -= WALK.back) < 0) return { dx: WALK.dx * (1 - ease.inOutCubic(1 + s / WALK.back)), work: k + 1 };
  return { dx: 0, work: k + 1 };
}

export function application(el, { images }) {
  let destroyed = false;
  // The page frozen for pictures (?t=): B stays on the mark.
  const still = typeof location !== 'undefined' && new URLSearchParams(location.search).has('t');
  const sp = spec();
  const fmt = (v) => v.toFixed(1);
  el.style.containerType = 'inline-size';
  el.style.background = INK;
  el.style.color = PAPER;
  const mono = "'Alignment Drawing', ui-monospace, monospace";
  const sans = "'Alignment Sans', 'Helvetica Neue', Arial, sans-serif";
  // ISOCP is a single hairline weight, drawn for pens: a touch of stroke gives it a pen's weight on screen
  const pen = '-webkit-text-stroke:0.4px currentColor';
  const lab = `font:400 max(9px, 1.02cqw)/1.3 ${mono};letter-spacing:0.07em;text-transform:uppercase;${pen}`;
  const quads = [1, 2, 3, 4];
  el.innerHTML = `
    <style>@container (max-width: 700px) { .al-small-hide { display: none !important; } .al-title { font-size: 6cqw !important; } .al-b { top: 10% !important; height: 40% !important; } .al-t { top: 60% !important; } }</style>
    <div style="position:absolute;inset:0;font-family:${sans}">
      <div class="al-small-hide" style="position:absolute;left:2.5%;right:2.5%;top:3%;display:flex;justify-content:space-between;${lab};color:#aaa49a"><span>SMASH · Alignment · Atrium installation</span><span>Proposal · Sheet 1 of 3 · 2026-09-28</span></div>
      <div data-a style="position:absolute;left:2.5%;top:8%;width:50%;height:88%"></div>
      <div class="al-small-hide" style="position:absolute;left:3.5%;top:9.8%;${lab};color:${PAPER}">A&nbsp;&nbsp;The atrium, cut away</div>
      <div data-mark class="al-small-hide" style="position:absolute;${lab};color:${PAPER};white-space:nowrap;pointer-events:none">Stand here<br><span style="color:#aaa49a">Eye 1.60 m</span></div>
      <div data-b class="al-b" style="position:absolute;left:55%;top:8%;width:42.5%;height:30%"></div>
      <div class="al-small-hide" style="position:absolute;left:56%;right:3.5%;top:9.8%;display:flex;justify-content:space-between;${lab};color:${PAPER}"><span>B&nbsp;&nbsp;Walking onto the mark</span><span data-where style="color:#aaa49a">On the mark</span></div>
      <div class="al-small-hide" style="position:absolute;left:55%;top:39.4%;${lab};color:#aaa49a">The same piece, four more works</div>
      ${quads.map((q, i) => `<div data-q="${q}" class="al-small-hide" style="position:absolute;left:${55 + i * 10.85}%;top:42.2%;width:10%;height:7.4%"></div>`).join('')}
      <div data-c class="al-small-hide" style="position:absolute;left:55%;top:52.5%;width:20.5%;height:14%"></div>
      <div class="al-small-hide" style="position:absolute;left:56%;top:54%;${lab};color:${PAPER}">C&nbsp;&nbsp;One step left</div>
      <p class="al-small-hide" style="position:absolute;left:77.5%;right:2.5%;top:52.5%;margin:0;font:400 max(9px, 1.02cqw)/1.42 ${sans};color:#cfcac2">A step off the mark and the name comes apart. One place in the room holds it, and anyone can walk there.</p>
      <div class="al-t" style="position:absolute;left:55%;right:2.5%;top:70%;bottom:4%;display:flex;flex-direction:column;justify-content:space-between">
        <div>
          <p class="al-title" style="margin:0;font:600 3.2cqw/0.95 ${sans};letter-spacing:-0.02em">Stand here.</p>
          <p class="al-small-hide" style="margin:0.9cqw 0 0;font:400 max(9px, 1.05cqw)/1.42 ${sans};color:#cfcac2;max-width:36em">Sixteen panels hang through the atrium. From anywhere in the room they are loose planes in the air. From one spot on the floor they close into the name, and the projector over that spot fills it with the work.</p>
        </div>
        <div class="al-small-hide" style="display:grid;grid-template-columns:1fr 1fr;column-gap:2cqw;font:400 max(9px, 1.05cqw)/1.6 ${mono};letter-spacing:0.04em;color:#d6d1c8;${pen};border-top:1px solid #2a2622;padding-top:0.7cqw">
          <div>${sp.n} panels, aluminium composite</div><div>Projection white, matt</div>
          <div>Hung ${fmt(sp.lo)} to ${fmt(sp.hi)} m, 3 wires each</div><div>1 mm steel wire</div>
          <div>Eye 1.60 m · first panel ${fmt(sp.near)} m</div><div>Projector over the mark, 20,000 lm</div>
        </div>
      </div>
    </div>`;
  const boxA = el.querySelector('[data-a]');
  const A = canvasStage(boxA);
  const B = canvasStage(el.querySelector('[data-b]'));
  const C = canvasStage(el.querySelector('[data-c]'));
  const Q = quads.map((q) => canvasStage(el.querySelector(`[data-q="${q}"]`)));
  const where = el.querySelector('[data-where]');
  const pics = new Map(); // work index → { img, crop }
  const pic = (k) => pics.get(WORKS[k % WORKS.length].i) ?? pics.get(WORKS[0].i) ?? { img: null, crop: null };
  let bState = { dx: 0, work: 0 };

  const drawA = () => {
    const { ctx, width: w, height: h } = A;
    // near-parallel (an axonometric): the camera far back on a long lens
    const T = [0.6, 4.1, 7.2];
    const far = 9;
    const camA = lookAt([-17, 12.5, -12].map((v, i) => T[i] + (v - T[i]) * far), T, Math.min(w * 1.12, h * 1.08) * far, w * 0.5, h * 0.575);
    drawRoom(ctx, w, h, camA);
    const m = project(camA, [0.55, 0, 0]);
    const lb = el.querySelector('[data-mark]');
    if (m && lb) {
      const r = boxA.getBoundingClientRect();
      const R = el.getBoundingClientRect();
      lb.style.left = `${((r.left - R.left + m[0] + w * 0.02) / R.width) * 100}%`;
      lb.style.top = `${((r.top - R.top + m[1] - w * 0.012) / R.height) * 100}%`;
    }
  };
  const drawB = () => {
    const { ctx, width: w, height: h } = B;
    const { img, crop } = pic(bState.work);
    drawRoom(ctx, w, h, eyeCam(w, h, bState.dx, 0.8), { img, crop, drawing: false });
    if (where) where.textContent = Math.abs(bState.dx) < 0.02 ? 'On the mark' : `${fmt(-bState.dx)} m left of the mark`;
  };
  const drawC = () => {
    const { ctx, width: w, height: h } = C;
    const { img, crop } = pic(0);
    drawRoom(ctx, w, h, eyeCam(w, h, -0.8, 0.74), { img, crop, drawing: false });
  };
  const drawQ = () => Q.forEach((S, i) => {
    const { ctx, width: w, height: h } = S;
    const { img, crop } = pic(i + 1);
    drawRoom(ctx, w, h, eyeCam(w, h, 0, 0.86), { img, crop, drawing: false, floor: 30, dim: 0 });
  });
  const draw = () => { if (!destroyed) { drawA(); drawB(); drawC(); drawQ(); } };
  A.onResize(draw);
  B.onResize(draw);
  C.onResize(draw);
  Q.forEach((S) => S.onResize(draw));
  draw();

  // B walks, only while it is on screen (and never in a frozen page)
  let raf = 0;
  let t0 = 0;
  let visible = false;
  const tick = (now) => {
    raf = 0;
    if (destroyed || !visible) return;
    if (!t0) t0 = now;
    const st = walkAt((now - t0) / 1000);
    if (st.dx !== bState.dx || st.work !== bState.work) { bState = st; drawB(); }
    raf = requestAnimationFrame(tick);
  };
  const io = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !raf && !still && !destroyed && pics.size) raf = requestAnimationFrame(tick);
  }) : null;
  const ready = Promise.all(WORKS.map((wk) => loadImage(images[wk.i]).then((im) => { pics.set(wk.i, { img: im, crop: cropOf(wk, im) }); }).catch(() => {}))).then(() => {
    if (destroyed) return;
    draw();
    io?.observe(el);
  });
  return { ready, destroy: () => { destroyed = true; cancelAnimationFrame(raf); io?.disconnect(); A.destroy(); B.destroy(); C.destroy(); Q.forEach((S) => S.destroy()); } };
}


export const info = {
  n: 5,
  slug: 'alignment',
  name: 'Alignment',
  lane: 'Spatial',
  idea: 'Fragments in space that only read SMASH from one viewpoint.',
  story: 'The name is cut into sixteen pieces and hung in space, each at its own depth. Walk around it and it is a cloud of panels. Step onto one spot and they close into SMASH. That is what the studio does with a room: it finds the one place where everything comes together, and brings you there.',
  dynamism: 'Standing still, the symbol is the piece seen from a step beside the spot: SMASH almost assembled, each panel a little out of line with the next, so you can see the name is built in depth. The wordmark is the view from the spot, whole. In motion the camera swings out round the side and the word comes apart into panels. It swings back, stalls a hair short and clicks into place. Light shows in the cracks and the word holds. Then the A cracks, and a knock sends the name apart again.',
  keeps: 'SMASH in capitals, heavy and clear. The break is the idea and the light is the payoff. It lets go of the labyrinth block, though its S keeps the block\'s square counters and narrow openings.',
  risk: 'Only one person at a time sees the word whole, so the name also lives in motion and on screens, where the camera finds the spot for you. Anamorphic lettering is an established genre (Felice Varini, among others); this one is SMASH\'s because you line it up yourself and the projector fills it with the work. The wordmark alone is a plain, heavy, square SMASH, in CM\'s heavy-and-wide territory: the difference lives in the symbol and the motion. The symbol comes close to 02 Reassembled, which also breaks the letters; here the break is in depth and moves as you move, not a crack in a flat word. No blue: the only accent is white light.',
  palette: { ink: INK, paper: PAPER, accent: '#eef1f6' },
  interactive: 'Move the pointer, or drag across on a phone: you are the camera. Find the one spot and the name clicks into place. A tap walks you there.',
  keyframe: 0.39,
  application: { title: 'Atrium installation', aspect: '16/9' },
  type: {
    fonts: [new URL('./alignment/fonts.css', import.meta.url).href],
    display: { family: '"Alignment Sans", sans-serif', css: 'font-weight: 600; letter-spacing: -0.02em;', name: 'Fakt Pro SemiBold', note: 'OurType\'s grotesk: its strokes end square or cut at an angle, like panels, and it stays calm at display size, so the mark does the moving. Set tight, for the voice.' },
    text: { family: '"Alignment Sans", sans-serif', css: 'font-weight: 400;', name: 'Fakt Pro Normal, with ISOCP', note: 'The same family, for reading. ISOCP is the ISO 3098 lettering of technical drawings. It takes the measurements (heights, distances, the mark on the floor), in the language of the drawings the piece is built from.' },
  },
};

/** The type: the voice, the text, and the measurements. */
export function specimen(el) {
  const esc = (t) => String(t).replace(/[<&"]/g, (c) => ({ '<': '&lt;', '&': '&amp;', '"': '&quot;' })[c]);
  const t = info.type;
  const sp = spec();
  const fmt = (v) => v.toFixed(1);
  el.innerHTML = `
    <div class="spec-display">
      <p class="spec-headline" style="font-family:${esc(t.display.family)};${esc(t.display.css)}">It only comes together from here.</p>
      <p class="label">Display: ${esc(t.display.name)}</p>
      <p class="note">${esc(t.display.note)}</p>
    </div>
    <div class="spec-text">
      <p class="spec-body" style="font-family:${esc(t.text.family)};${esc(t.text.css)}">Smash is an immersive experience studio creating physical and digital experiences that make people feel. They combine art, technology, storytelling and spatial experiences to create memorable moments, from large-scale public installations to intimate museum experiences.</p>
      <p style="font-family:'Alignment Drawing', ui-monospace, monospace;font-size:17px;line-height:1.6;letter-spacing:0.07em;color:#d6d1c8;-webkit-text-stroke:0.45px currentColor;margin:0 0 16px;border-top:1px solid #2a2622;padding-top:10px">
        VIEWPOINT&nbsp;&nbsp;EYE 1.60 M<br>${sp.n} PANELS&nbsp;&nbsp;HUNG ${fmt(sp.lo)} TO ${fmt(sp.hi)} M<br>CUT&nbsp;&nbsp;20°&nbsp;&nbsp;LEAN ${PLACE.lean}°
      </p>
      <p class="label">Text: ${esc(t.text.name)}</p>
      <p class="note">${esc(t.text.note)}</p>
    </div>`;
}
