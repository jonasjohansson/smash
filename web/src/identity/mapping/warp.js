// The mapping grid's maths: a grid of points, the four ways to fill in
// between them, the presets, and the motion.
//
// A grid is { n, m, p }: n columns by m rows of points, p a Float64Array of
// (s, t) pairs, row by row. s and t are in the frame's own units: 0..1 across
// the frame, so the rest position of point (i, j) is (i/(n-1), j/(m-1)).
// Everything here is a pure function, so the mesh, the overlay, the SVG export
// and the 3D walls all bend through the same numbers.

export const PRESETS = ['flat', 'keystone', 'bulge', 'pinch', 'wave', 'twist', 'fold', 'cylinder', 'struck', 'random'];
export const MORPH = ['flat', 'keystone', 'wave', 'bulge', 'fold', 'cylinder', 'twist', 'struck', 'pinch', 'random'];

/**
 * The ways to fill in between the points.
 * - smooth: a curved surface through every point that never overshoots them
 *   (monotone cubic), so a pulled point pulls its neighbours only its own way;
 * - spline: Catmull-Rom, the textbook spline (curvier, and it overshoots);
 * - linear: straight cells, bilinear in each (MadMapper's plain mesh);
 * - corner: a true perspective corner pin, from the four corners only.
 */
export const INTERPS = ['smooth', 'spline', 'linear', 'corner'];

/** How a preset is best filled in between, when the user has not said: a crease wants straight cells. */
export const PRESET_INTERP = { fold: 'linear', struck: 'linear' };

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** A seeded random number generator (mulberry32, as in lib.js). */
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function restGrid(n, m) {
  const p = new Float64Array(n * m * 2);
  for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) {
    p[(j * n + i) * 2] = i / (n - 1);
    p[(j * n + i) * 2 + 1] = j / (m - 1);
  }
  return { n, m, p };
}

export const copyGrid = (g) => ({ n: g.n, m: g.m, p: Float64Array.from(g.p) });

export function mixGrids(a, b, k, out = copyGrid(a)) {
  for (let i = 0; i < out.p.length; i++) out.p[i] = a.p[i] + (b.p[i] - a.p[i]) * k;
  return out;
}

/**
 * How big a cell of an n × m grid is next to one of the 5 × 4 default, at most 1:
 * the random throw and the drift scale by it, so at 12 × 12 the points still
 * wander within their own cells instead of crossing their neighbours.
 */
export function density(n, m, A = 1) {
  const cell = Math.min(A / (n - 1), 1 / (m - 1));
  const ref = Math.min(A / 4, 1 / 3);
  return clamp(cell / ref, 0.2, 1);
}

// ------------------------------------------------------------ corner pin

/**
 * The projective map of the unit square onto a quad (Heckbert): corners
 * (0,0) (1,0) (1,1) (0,1) go to q = [x0,y0, x1,y1, x2,y2, x3,y3].
 * Returns null when the quad is not convex (the map would pass through infinity).
 */
export function squareToQuad(q) {
  const [x0, y0, x1, y1, x2, y2, x3, y3] = q;
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  let g = 0, h = 0;
  if (Math.abs(dx3) > 1e-12 || Math.abs(dy3) > 1e-12) {
    const den = dx1 * dy2 - dx2 * dy1;
    if (Math.abs(den) < 1e-12) return null;
    g = (dx3 * dy2 - dx2 * dy3) / den;
    h = (dx1 * dy3 - dx3 * dy1) / den;
  }
  // w = g u + h v + 1 must stay positive over the square: check its corners.
  if (1 + g <= 1e-6 || 1 + h <= 1e-6 || 1 + g + h <= 1e-6) return null;
  const m = {
    a: x1 - x0 + g * x1, b: x3 - x0 + h * x3, c: x0,
    d: y1 - y0 + g * y1, e: y3 - y0 + h * y3, f: y0, g, h,
  };
  // A quad that is folded (a bow tie) or turned inside out has no projective map either.
  const turn = (ax, ay, bx, by, cx, cy) => (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  const s = [turn(x0, y0, x1, y1, x2, y2), turn(x1, y1, x2, y2, x3, y3), turn(x2, y2, x3, y3, x0, y0), turn(x3, y3, x0, y0, x1, y1)];
  if (!(s.every((v) => v > 0) || s.every((v) => v < 0))) return null;
  return m;
}

/** A quad [[x, y] × 4] (TL TR BR BL) as a function of the unit square, (s, t) to (x, y). */
export function homography(quad) {
  const H = squareToQuad(quad.flat());
  return (s, t, out = [0, 0]) => {
    const w = H.g * s + H.h * t + 1;
    out[0] = (H.a * s + H.b * t + H.c) / w;
    out[1] = (H.d * s + H.e * t + H.f) / w;
    return out;
  };
}

const corners = ({ n, m, p }) => {
  const at = (i, j) => [p[(j * n + i) * 2], p[(j * n + i) * 2 + 1]];
  return [...at(0, 0), ...at(n - 1, 0), ...at(n - 1, m - 1), ...at(0, m - 1)];
};

/** Can the grid's four corners take a true corner pin? (No, when they make a bow tie or a dart.) */
export const cornerPinOk = (grid) => !!squareToQuad(corners(grid));

// ------------------------------------------------------------ the warp

/** Catmull-Rom through four taps, between the middle two, at u. */
function catmull(p0, p1, p2, p3, u) {
  const u2 = u * u, u3 = u2 * u;
  return ((-u3 + 2 * u2 - u) * p0 + (3 * u3 - 5 * u2 + 2) * p1 + (-3 * u3 + 4 * u2 + u) * p2 + (u3 - u2) * p3) / 2;
}

/**
 * A monotone cubic through four taps, between the middle two, at u: the
 * tangents are the harmonic mean of the slopes either side (Fritsch and
 * Butland), and flat wherever the slope turns, so the curve never goes past a
 * point. Straight runs stay exactly straight.
 */
function monotone(p0, p1, p2, p3, u) {
  const d0 = p1 - p0, d1 = p2 - p1, d2 = p3 - p2;
  const m1 = d0 * d1 > 0 ? (2 * d0 * d1) / (d0 + d1) : 0;
  const m2 = d1 * d2 > 0 ? (2 * d1 * d2) / (d1 + d2) : 0;
  const u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * p1 + (u3 - 2 * u2 + u) * m1 + (3 * u2 - 2 * u3) * p2 + (u3 - u2) * m2;
}

const linear = (p0, p1, p2, p3, u) => p1 + (p2 - p1) * u;
const KERNELS = { smooth: monotone, spline: catmull, linear };

/**
 * The grid with a ring of phantom points round it, each continuing the line of
 * its two neighbours, so the curved surfaces run straight off their edges
 * instead of curling.
 */
function extend({ n, m, p }) {
  const N = n + 2, M = m + 2;
  const e = new Float64Array(N * M * 2);
  const set = (I, J, x, y) => { e[(J * N + I) * 2] = x; e[(J * N + I) * 2 + 1] = y; };
  const get = (I, J) => [e[(J * N + I) * 2], e[(J * N + I) * 2 + 1]];
  for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) set(i + 1, j + 1, p[(j * n + i) * 2], p[(j * n + i) * 2 + 1]);
  for (let J = 1; J <= m; J++) {
    const [ax, ay] = get(1, J), [bx, by] = get(2, J);
    set(0, J, 2 * ax - bx, 2 * ay - by);
    const [cx, cy] = get(n, J), [dx, dy] = get(n - 1, J);
    set(n + 1, J, 2 * cx - dx, 2 * cy - dy);
  }
  for (let I = 0; I < N; I++) {
    const [ax, ay] = get(I, 1), [bx, by] = get(I, 2);
    set(I, 0, 2 * ax - bx, 2 * ay - by);
    const [cx, cy] = get(I, m), [dx, dy] = get(I, m - 1);
    set(I, m + 1, 2 * cx - dx, 2 * cy - dy);
  }
  return e;
}

/** Where x (0..1) falls on an axis of `count` points: the first of the four taps round its span (in the extended grid), and how far along the span. */
function span(x, count, out) {
  const f = clamp(x) * (count - 1);
  const c = Math.min(Math.floor(f), count - 2);
  out[0] = c;
  out[1] = f - c;
  return out;
}

/**
 * The warp as a function: (s, t) in the frame's rest square to (s', t').
 * interp: one of INTERPS. Along s first, then along t, the same order as sampleMesh.
 * A corner pin whose corners are not convex falls back to the plain bilinear
 * map; the function then carries fallback = true.
 */
export function warper(grid, interp = 'smooth') {
  const { n, m } = grid;
  if (interp === 'corner') {
    const q = corners(grid);
    const H = squareToQuad(q);
    if (H) {
      return (s, t, out = [0, 0]) => {
        const w = H.g * s + H.h * t + 1;
        out[0] = (H.a * s + H.b * t + H.c) / w;
        out[1] = (H.d * s + H.e * t + H.f) / w;
        return out;
      };
    }
    const f = warper({ n: 2, m: 2, p: Float64Array.from([q[0], q[1], q[2], q[3], q[6], q[7], q[4], q[5]]) }, 'linear');
    f.fallback = true;
    return f;
  }
  const K = KERNELS[interp] ?? monotone;
  const e = extend(grid);
  const N = n + 2;
  const su = [0, 0], sv = [0, 0];
  const rx = [0, 0, 0, 0], ry = [0, 0, 0, 0];
  return (s, t, out = [0, 0]) => {
    const [i0, u] = span(s, n, su);
    const [j0, v] = span(t, m, sv);
    for (let b = 0; b < 4; b++) {
      const o = ((j0 + b) * N + i0) * 2;
      rx[b] = K(e[o], e[o + 2], e[o + 4], e[o + 6], u);
      ry[b] = K(e[o + 1], e[o + 3], e[o + 5], e[o + 7], u);
    }
    out[0] = K(rx[0], rx[1], rx[2], rx[3], v);
    out[1] = K(ry[0], ry[1], ry[2], ry[3], v);
    return out;
  };
}

/**
 * The warp sampled on an (S+1) × (S+1) lattice over the frame, row by row,
 * into out (length (S+1)² × 2): the mesh the stage draws. The same numbers as
 * warper(), done a row of taps at a time so a 129 × 129 mesh stays cheap.
 */
export function sampleMesh(grid, interp, S, out) {
  const { n, m } = grid;
  if (interp === 'corner') {
    const f = warper(grid, 'corner');
    const o = [0, 0];
    for (let j = 0, k = 0; j <= S; j++) for (let i = 0; i <= S; i++, k += 2) { f(i / S, j / S, o); out[k] = o[0]; out[k + 1] = o[1]; }
    return out;
  }
  const K = KERNELS[interp] ?? monotone;
  const e = extend(grid);
  const N = n + 2, M = m + 2;
  // Along s, for every column of the mesh and every row of the extended grid.
  const U = new Float64Array((S + 1) * M * 2);
  const sp = [0, 0];
  for (let i = 0; i <= S; i++) {
    const [c, u] = span(i / S, n, sp);
    for (let J = 0; J < M; J++) {
      const o = (J * N + c) * 2;
      const w = (i * M + J) * 2;
      U[w] = K(e[o], e[o + 2], e[o + 4], e[o + 6], u);
      U[w + 1] = K(e[o + 1], e[o + 3], e[o + 5], e[o + 7], u);
    }
  }
  // Then along t.
  for (let j = 0; j <= S; j++) {
    const [r, v] = span(j / S, m, sp);
    for (let i = 0; i <= S; i++) {
      const w = (i * M + r) * 2;
      const k = (j * (S + 1) + i) * 2;
      out[k] = K(U[w], U[w + 2], U[w + 4], U[w + 6], v);
      out[k + 1] = K(U[w + 1], U[w + 3], U[w + 5], U[w + 7], v);
    }
  }
  return out;
}

/** The same warp sampled at a new grid's rest points: how a grid changes size and keeps its shape. */
export function resample(grid, interp, n, m) {
  const f = warper(grid, interp);
  const g = restGrid(n, m);
  const o = [0, 0];
  for (let k = 0; k < n * m; k++) {
    f(g.p[k * 2], g.p[k * 2 + 1], o);
    g.p[k * 2] = o[0];
    g.p[k * 2 + 1] = o[1];
  }
  return g;
}

/**
 * Does a sampled mesh (css px, (S+1)² points, y down) fold over itself? True
 * when any of its little triangles is turned over or flat, within the part of
 * the frame [s0, t0, s1, t1] (the whole frame by default).
 */
export function folds(v, S, [s0, t0, s1, t1] = [0, 0, 1, 1]) {
  const i0 = Math.max(0, Math.floor(s0 * S)), i1 = Math.min(S, Math.ceil(s1 * S));
  const j0 = Math.max(0, Math.floor(t0 * S)), j1 = Math.min(S, Math.ceil(t1 * S));
  const R = S + 1;
  for (let j = j0; j < j1; j++) {
    for (let i = i0; i < i1; i++) {
      const a = (j * R + i) * 2, b = a + 2, c = a + R * 2, d = c + 2;
      const t1a = (v[b] - v[a]) * (v[c + 1] - v[a + 1]) - (v[b + 1] - v[a + 1]) * (v[c] - v[a]);
      const t2a = (v[d] - v[b]) * (v[c + 1] - v[b + 1]) - (v[d + 1] - v[b + 1]) * (v[c] - v[b]);
      if (t1a <= 1e-9 || t2a <= 1e-9) return true;
    }
  }
  return false;
}

// ------------------------------------------------------------ presets

/**
 * A preset's pose for an n × m grid. A is the frame's aspect (width over
 * height): the shapes are made in square units (X across, Y down, both in
 * frame heights, 0 at the centre), so a bulge is round on any frame.
 * impact: where the struck preset lands, in (s, t).
 */
export function pose(name, n, m, { A = 1, seed = 7, impact = [0.5, 0.5] } = {}) {
  const g = restGrid(n, m);
  const R = Math.hypot(A, 1) / 2;
  const to = (s, t) => [(s - 0.5) * A, t - 0.5];
  const from = (X, Y) => [X / A + 0.5, Y + 0.5];
  let fn = null;
  switch (name) {
    case 'keystone': {
      // A projector on the ground, aimed up: the far top edge spreads wider and taller.
      const H = homography([[-0.13, -0.08], [1.13, -0.08], [0.94, 1.03], [0.06, 1.03]]);
      fn = (s, t) => H(s, t, [0, 0]);
      break;
    }
    case 'bulge':
    case 'pinch': {
      const k = name === 'bulge' ? 0.42 : -0.34;
      fn = (s, t) => {
        const [X, Y] = to(s, t);
        const q = 1 - (X * X + Y * Y) / (R * R);
        const f = 1 + k * q * q;
        return from(X * f, Y * f);
      };
      break;
    }
    case 'wave':
      fn = (s, t) => {
        const [X, Y] = to(s, t);
        return from(X + 0.035 * Math.sin(Math.PI * 2 * t + 0.4), Y + 0.1 * Math.sin(Math.PI * 2 * s + 0.2));
      };
      break;
    case 'twist':
      fn = (s, t) => {
        const [X, Y] = to(s, t);
        const r = Math.hypot(X, Y) / R;
        const a = 0.95 * (1 - r) ** 2;
        const c = Math.cos(a), sn = Math.sin(a);
        return from(X * c - Y * sn, X * sn + Y * c);
      };
      break;
    case 'fold': {
      // The corner of a building, seen from across the street: two walls meet
      // at a crease (on the grid column nearest the middle, so it stays sharp),
      // each running away from it in perspective.
      const c = Math.round((n - 1) / 2) / (n - 1);
      const al = 0.9, D = 1.9, sx = 1.3;
      const Xc = (c - 0.5) * A;
      fn = (s, t) => {
        const [X, Y] = to(s, t);
        const dx = X - Xc;
        const z = -Math.abs(dx) * Math.sin(al);
        const k = D / (D - z);
        return from(Xc + dx * Math.cos(al) * k * sx, (Y + 0.06) * k - 0.06);
      };
      break;
    }
    case 'cylinder': {
      // Wrapped round a column: the middle comes towards you, the sides turn away.
      // The mark wraps the same part of the column whatever its proportions: 64° either side.
      const r = A / 2 / 1.12, D = 2.1, sx = 1.2;
      fn = (s, t) => {
        const [X, Y] = to(s, t);
        const z = r * Math.cos(X / r) - r;
        const k = D / (D - z);
        return from(r * Math.sin(X / r) * k * sx, Y * k);
      };
      break;
    }
    case 'struck': {
      // Chapter 01's hit, on the grid. Every inner column leans in towards the
      // impact and folds on a crease row: above the hit to its left, below it to
      // its right, so the crease steps down through it. The lean rises one step
      // for each column away from the hit and eases off towards the frame; the
      // frame holds and the rows stay level, as the chapter's rules have it.
      const [is, it] = impact;
      let up = -1, down = -1;
      for (let j = 1; j < m - 1; j++) {
        const t = j / (m - 1);
        if (t < it - 1e-3) up = j;
        if (down < 0 && t > it + 1e-3) down = j;
      }
      if (up < 0) up = down;
      if (down < 0) down = up;
      if (up < 0) return g; // two rows: nothing to fold on
      const cell = 1 / (n - 1);
      const STEP = (6.5 * Math.PI) / 180;
      for (let i = 1; i < n - 1; i++) {
        const s = i / (n - 1);
        const toward = s < is ? 1 : -1;
        const steps = 1 + Math.floor(Math.abs(s - is) / cell + 0.35);
        const ease = Math.sin(Math.PI * s) ** 0.5;
        const jc = s < is ? up : down;
        const tc = jc / (m - 1);
        const lean = Math.tan(STEP * steps) * Math.min(tc, 1 - tc) * ease; // in frame heights
        for (let j = 1; j < m - 1; j++) {
          const t = j / (m - 1);
          const k = t <= tc ? t / tc : (1 - t) / (1 - tc); // straight from the frame to the crease and back
          g.p[(j * n + i) * 2] += (toward * lean * k) / A;
        }
      }
      return g;
    }
    case 'random': {
      const r = rng(seed * 7919 + 13);
      const k = density(n, m, A);
      for (let q = 0; q < n * m; q++) {
        const a = r() * Math.PI * 2, d = (0.03 + r() * 0.06) * k;
        g.p[q * 2] += (Math.cos(a) * d) / A;
        g.p[q * 2 + 1] += Math.sin(a) * d;
      }
      return g;
    }
    default:
      return g;
  }
  for (let k = 0; k < n * m; k++) {
    const [s, t] = fn(g.p[k * 2], g.p[k * 2 + 1]);
    g.p[k * 2] = s;
    g.p[k * 2 + 1] = t;
  }
  return g;
}

// ------------------------------------------------------------ motion

/** Smooth, seeded wandering for point k: a few slow sines with their own phases. */
function wander(seed, k, t) {
  const r = rng(seed * 104729 + k * 31 + 5);
  let x = 0, y = 0;
  const F = [0.23, 0.37, 0.61];
  const W = [0.62, 0.28, 0.12];
  for (let o = 0; o < 3; o++) {
    const fx = F[o] * (0.8 + 0.4 * r()), fy = F[o] * (0.8 + 0.4 * r());
    x += W[o] * Math.sin(Math.PI * 2 * (fx * t + r()));
    y += W[o] * Math.sin(Math.PI * 2 * (fy * t + r()));
  }
  return [x, y];
}

/**
 * The points as they are at time t (seconds): the grid, plus the motion.
 * A pure function of its arguments, so any frame can be drawn again.
 * - drift: every point wanders on its own, a slow seeded noise (within its cell, at any density);
 * - breathe: the grid swells and settles, the swell running out from the middle;
 * - morph: the presets one after another (with the user's own edits on top).
 * posed(name) gives a preset's pose for the morph.
 */
export function animate(grid, { mode = 'off', amount = 0.5, speed = 1, seed = 7, A = 1, t = 0, edits = null, posed } = {}) {
  if (mode === 'off' || (!amount && mode !== 'morph')) return grid;
  const { n, m } = grid;
  const out = copyGrid(grid);
  const p = out.p;
  if (mode === 'drift') {
    const a = amount * 0.055 * density(n, m, A);
    for (let k = 0; k < n * m; k++) {
      const [x, y] = wander(seed, k, t * speed);
      p[k * 2] += (x * a) / A;
      p[k * 2 + 1] += y * a;
    }
  } else if (mode === 'breathe') {
    const R = Math.hypot(A, 1) / 2;
    for (let k = 0; k < n * m; k++) {
      const X = (p[k * 2] - 0.5) * A, Y = p[k * 2 + 1] - 0.5;
      const r = Math.hypot(X, Y) / R;
      const f = 1 + amount * 0.09 * Math.sin(Math.PI * 2 * (t * speed * 0.22) - r * 2.2) * (1 - 0.35 * r);
      p[k * 2] = (X * f) / A + 0.5;
      p[k * 2 + 1] = Y * f + 0.5;
    }
  } else if (mode === 'morph') {
    const { a, b, e } = morphAt(t, speed);
    const pa = posed(a), pb = posed(b);
    for (let k = 0; k < p.length; k++) p[k] = pa.p[k] + (pb.p[k] - pa.p[k]) * e + (edits ? edits[k] : 0);
  }
  return out;
}

/** Where the morph is at time t: from preset a to preset b, eased by e (each holds, then eases into the next). */
export function morphAt(t, speed = 1) {
  const dwell = 2.8 / Math.max(0.05, speed);
  const ph = Math.max(0, t) / dwell;
  const i = Math.floor(ph);
  const e = easeInOut(clamp((ph - i - 0.4) / 0.6));
  return { a: MORPH[i % MORPH.length], b: MORPH[(i + 1) % MORPH.length], e };
}

// ------------------------------------------------------------ 3 × 3 maps

/** The projective map of the unit square onto a quad [[x, y] × 4] (TL TR BR BL) as a 3 × 3 matrix, row by row. */
export function quadMatrix(quad) {
  const h = squareToQuad(quad.flat());
  return h ? [h.a, h.b, h.c, h.d, h.e, h.f, h.g, h.h, 1] : null;
}

export const mul3 = (A, B) => [
  A[0] * B[0] + A[1] * B[3] + A[2] * B[6], A[0] * B[1] + A[1] * B[4] + A[2] * B[7], A[0] * B[2] + A[1] * B[5] + A[2] * B[8],
  A[3] * B[0] + A[4] * B[3] + A[5] * B[6], A[3] * B[1] + A[4] * B[4] + A[5] * B[7], A[3] * B[2] + A[4] * B[5] + A[5] * B[8],
  A[6] * B[0] + A[7] * B[3] + A[8] * B[6], A[6] * B[1] + A[7] * B[4] + A[8] * B[7], A[6] * B[2] + A[7] * B[5] + A[8] * B[8],
];

export function inv3(M) {
  const [a, b, c, d, e, f, g, h, i] = M;
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
  const det = a * A + b * B + c * C;
  const k = 1 / det;
  return [
    A * k, -(b * i - c * h) * k, (b * f - c * e) * k,
    B * k, (a * i - c * g) * k, -(a * f - c * d) * k,
    C * k, -(a * h - b * g) * k, (a * e - b * d) * k,
  ];
}

export function apply3(M, x, y, out = [0, 0]) {
  const w = M[6] * x + M[7] * y + M[8];
  out[0] = (M[0] * x + M[1] * y + M[2]) / w;
  out[1] = (M[3] * x + M[4] * y + M[5]) / w;
  return out;
}
