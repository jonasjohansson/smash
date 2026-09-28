// The fracture generator for 03 Impact: one hit, seeded.
//
// A hit travels one way. Three to five cracks fan out from where it lands, over part of a turn
// (the spread): the glass behind the hit has fallen away. The shard on the hit's own line is the
// longest and ends in a point; the ones beside it are shorter blades whose points splay away
// from that line, so the fracture reads as thrown one way, never as spinning. Every edge runs on
// a 15° grid, no crack runs level or plumb, and where two shards end on one crack their ends
// line up exactly or clearly miss. One seed is the logo; every place gets its own.
//
// It is one pure function of one rule object: fracture(seed, over) with over any of RULE's keys.
// RANGES says what each key can be, for a panel. The shards come back as closed convex polygons
// in reach units (the hit at 0, 0, the longest reach about 1, y down), ready to draw or extrude.

import { rng } from '../../lib.js';

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

/**
 * The rule. Where a value is [lo, hi], the seed chooses within it; a single number fixes it.
 * Angles are in degrees. Lengths are shares of the longest reach.
 */
export const RULE = {
  n: [3, 5], // shards (the seed leans to the middle of the range)
  spread: [195, 225], // the fan: the angle the shards cover at the hit (360: all round)
  skew: 0.12, // how far the fan may sit off the hit's line, as a share of the spread
  dir: null, // where the hit was going (0 right, 90 down); null: the seed's own
  slant: true, // the seed's own direction is 15° to 75° off level: a throw, not an emblem
  width: [30, 90], // a shard's angle at the hit
  lean: 0.6, // how much narrower the shards are where the hit was going
  vary: 0.5, // how unequal the shards are besides that
  ratio: [1.8, 2.4], // reach: the far shard's length over the near ones'
  falloff: 1, // how quickly the reach falls away from the hit's line, towards the fan's edges
  jitter: 0.06, // length variance: each shard's reach, give or take
  short: [0.36, 0.82], // a shard's shorter side, as a share of its reach
  blade: [30, 60], // a side shard's point
  sharp: 2, // at most this many blades with a 30° point
  point: [60, 90], // the lead shard's point
  points: 0.15, // the chance a broad side shard ends in a point too, not a blade
  away: 0.9, // the chance a blade's long side is the one away from the hit's line
  gap: 0.075, // the crack (in the lockup, exactly the space between S and M)
  hole: 0, // the void where the hit landed (0: the shards meet at the hit)
  open: 0.035, // how far every shard has moved out from the hit, in the still: the void it leaves
  burst: 0.09, // how far the far-side shards have flown besides, in the still
  lift: 0.26, // in motion: how far the far-side shards float apart after the hit
  turn: 6, // in motion: rotation jitter, degrees
  plumb: false, // true lets a crack run level or plumb (a stem with arms reads as a letter)
  grid: 15, // every edge runs on a multiple of this angle
  miss: 2, // two shards' ends on one crack line up, or miss by at least this many gaps
  thin: 1.5, // no shard thinner than this many gaps once its cracks are cut
};

/** Each variable's limits, for a panel: [min, max, step, what it does]. */
export const RANGES = {
  seed: [0, 4294967295, 1, 'the fracture; a place gives one (placeSeed(lat, lon))'],
  n: [2, 8, 1, 'shards; a number, or [lo, hi] for the seed to choose'],
  spread: [90, 360, 15, 'the fan’s angle at the hit, degrees; 360 is all round (a web, at 7 or more)'],
  skew: [0, 0.5, 0.01, 'how far the fan may sit off the hit’s line, share of the spread'],
  dir: [0, 345, 15, 'where the hit was going, degrees (0 right, 90 down); empty: the seed’s'],
  slant: [0, 1, 1, 'the seed’s own direction always on a slant (15° to 75° off level)'],
  width: [15, 180, 15, 'a shard’s angle at the hit, degrees: [narrowest, broadest]'],
  lean: [0, 0.9, 0.05, 'how much narrower the shards are on the far side'],
  vary: [0, 1.5, 0.05, 'how unequal the shards’ angles are'],
  ratio: [1, 4, 0.05, 'reach: far shard over near shards; [lo, hi]'],
  falloff: [0.5, 3, 0.1, 'how quickly the reach falls away from the hit’s line'],
  jitter: [0, 0.3, 0.01, 'length variance per shard'],
  short: [0.1, 1, 0.01, 'a shard’s shorter side over its reach: [lo, hi]'],
  blade: [15, 75, 15, 'a side blade’s point, degrees: [lo, hi]'],
  sharp: [0, 8, 1, 'at most this many 30° blades'],
  point: [30, 120, 15, 'the lead shard’s point, degrees: [lo, hi]'],
  points: [0, 1, 0.05, 'chance a broad side shard ends in a point'],
  away: [0, 1, 0.05, 'chance a blade’s long side is away from the hit’s line (0.5: some spin)'],
  gap: [0.02, 0.2, 0.005, 'the crack, share of the reach'],
  hole: [0, 0.3, 0.01, 'the void at the hit, share of the reach; 0 for none'],
  open: [0, 0.1, 0.005, 'how far every shard has moved out from the hit in the still (a void, with no cut)'],
  burst: [0, 0.2, 0.01, 'how far the far side has flown besides, in the still'],
  lift: [0, 0.5, 0.01, 'motion: how far the far side floats apart'],
  turn: [0, 15, 0.5, 'motion: rotation jitter, degrees'],
  plumb: [0, 1, 1, 'allow level and plumb cracks'],
  grid: [5, 45, 5, 'the angle every edge runs on, degrees'],
  miss: [0, 4, 0.5, 'crack ends line up or miss by this many gaps'],
  thin: [0, 3, 0.1, 'the thinnest shard, in gaps'],
};

/** Seed from a place: latitude and longitude to a 32-bit seed. */
export function placeSeed(lat, lon) {
  let h = 2166136261 >>> 0;
  const s = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h;
}

const unit = (a) => [Math.cos(a), Math.sin(a)];

/** Where the lines p + s·u and q + t·v meet: [point, s, t], or null if they are parallel. */
function meet(p, u, q, v) {
  const cr = u[0] * v[1] - u[1] * v[0];
  if (Math.abs(cr) < 1e-9) return null;
  const dx = q[0] - p[0];
  const dy = q[1] - p[1];
  const s = (dx * v[1] - dy * v[0]) / cr;
  const t = (dx * u[1] - dy * u[0]) / cr;
  return [[p[0] + u[0] * s, p[1] + u[1] * s], s, t];
}

/** Sector widths in grid steps (integers summing to `steps`), each within [lo, hi]. */
function quantise(w, steps, lo, hi) {
  const total = w.reduce((a, b) => a + b, 0);
  const raw = w.map((x) => (x / total) * steps);
  const q = raw.map((x) => Math.min(hi, Math.max(lo, Math.round(x))));
  for (let guard = 0; guard < 64; guard++) {
    const s = q.reduce((a, b) => a + b, 0);
    if (s === steps) break;
    const d = s > steps ? -1 : 1;
    let best = -1;
    let bestErr = -Infinity;
    q.forEach((x, i) => {
      if (x + d < lo || x + d > hi) return;
      const err = (raw[i] - x) * d;
      if (err > bestErr) { bestErr = err; best = i; }
    });
    if (best < 0) break;
    q[best] += d;
  }
  return q;
}

const range = (v, x) => (Array.isArray(v) ? v[0] + (v[1] - v[0]) * x : v);

/**
 * The fracture for a seed. Returns
 *   { seed, n, dir, spread, full, ratio, lines, cracks, shards, hull, rule }
 * lines: the angle of every radial line, in order (n + 1 of them for a fan, n all round).
 * cracks: the lines two shards share, { a, left, right (shard indices), crack: as far as both
 *   run, len: as far as the longer runs, end }.
 * shards: { base: its polygon before the crack opens (apex at the hit), free: the indices of its
 *   outer edges, a0, a1, bisector, reach, kind ('blade' | 'point'), side, tip, tipAngle, ra, rb:
 *   where it ends on its lines at a0 and a1, lead (the shard on the hit's line), hole: the
 *   half-plane the void cuts it with (or null), flyBy, fly: [dx, dy], rest: parted by the gap and
 *   cut by the hole, poly: rest, flown (the mark), c: base's centroid }.
 * hull: the convex hull of every shard as it rests, flown.
 * Seeds the rule cannot satisfy are drawn again from the next stream, so every seed has an answer.
 */
export function fracture(seed, over = {}) {
  const R = { ...RULE, ...over };
  for (let k = 0; k < 12; k++) {
    const f = attempt(seed, k, R);
    if (f) return f;
  }
  return attempt(seed, 12, { ...R, miss: 0, sharp: 99, thin: 0 }) ?? attempt(seed, 13, { ...R, miss: 0, sharp: 99, thin: 0, n: 3 });
}

function attempt(seed, k, R) {
  const r = rng((seed ^ Math.imul(k, 0x9e3779b9)) >>> 0);
  const u = (a = -1, b = 1) => a + (b - a) * r();
  const g = R.grid * DEG;
  const steps = Math.round(360 / R.grid);
  const onAxis = (step) => !R.plumb && (((step * R.grid) % 90) + 90) % 90 === 0;

  // Draws in a fixed order, used or not, so one variable changing leaves the others alone.
  const dN = (r() + r()) / 2;
  const dDir = r();
  const dSpread = r();
  const dSkew = u();
  const dRatio = r();
  const nLo = Array.isArray(R.n) ? R.n[0] : R.n;
  const nHi = Array.isArray(R.n) ? R.n[1] : R.n;
  let n = Math.min(nHi, nLo + Math.floor(dN * (nHi - nLo + 1)));
  // The seed's own direction is on a slant: a hit that travels level or plumb makes an emblem
  // (a crown, a bird face-on), not a throw.
  const slants = [];
  for (let i = 0; i < steps; i++) { const m90 = (i * R.grid) % 90; if (!R.slant || (m90 > 15 - 1e-9 && m90 < 75 + 1e-9)) slants.push(i); }
  const dirStep = R.dir == null ? slants[Math.floor(dDir * slants.length)] : Math.round(R.dir / R.grid);
  const dir = dirStep * g;
  const ratio = range(R.ratio, dRatio);
  const lo = Math.max(1, Math.ceil(range(R.width, 0) / R.grid - 1e-9));
  const hi = Math.max(lo, Math.floor(range(R.width, 1) / R.grid + 1e-9));
  let spreadSteps = Math.round(range(R.spread, dSpread) / R.grid);
  const full = spreadSteps >= steps;
  if (full) spreadSteps = steps;
  n = Math.max(full ? 2 : 1, Math.min(n, Math.floor(spreadSteps / lo)));
  if (!full) spreadSteps = Math.min(Math.max(spreadSteps, n * lo), n * hi);
  else if (n * hi < steps) n = Math.ceil(steps / hi);

  // The shards' angles: unequal, and narrower on the far side.
  const noise = Array.from({ length: n }, () => Math.exp(u() * R.vary));
  const startStep0 = full ? Math.floor(r() * steps) : Math.round(dirStep - spreadSteps / 2 + dSkew * R.skew * spreadSteps);
  let w = noise.slice();
  for (let it = 0; it < 4; it++) {
    const tot = w.reduce((a, b) => a + b, 0);
    let a = startStep0 * g;
    w = w.map((x, j) => {
      const wj = (x / tot) * spreadSteps * g;
      const bis = a + wj / 2;
      a += wj;
      return noise[j] * (1 - R.lean * Math.cos(bis - dir));
    });
  }
  const q0 = quantise(w, spreadSteps, lo, hi);
  if (q0.reduce((a, b) => a + b, 0) !== spreadSteps) return null;

  // No crack level or plumb: shift the fan a step, or move one crack a step, until none is.
  const m = full ? n : n + 1;
  const linesOf = (st, qq) => { const L = [st]; for (let i = 1; i < m; i++) L.push(L[i - 1] + qq[i - 1]); return L; };
  const sectorsOf = (L) => Array.from({ length: n }, (_, i) => (i + 1 < L.length ? L[i + 1] : L[0] + steps) - L[i]);
  let L = null;
  for (const off of [0, 1, -1, 2, -2]) {
    const cand = linesOf(startStep0 + off, q0);
    for (let guard = 0; guard < 6; guard++) {
      const i = cand.findIndex(onAxis);
      if (i < 0) break;
      if (!full && (i === 0 || i === m - 1)) break; // a fan's edges only move with the fan
      const fix = [1, -1].find((d) => {
        const c = cand.slice();
        c[i] += d;
        return !onAxis(c[i]) && sectorsOf(c).every((x) => x >= lo && x <= hi);
      });
      if (fix == null) break;
      cand[i] += fix;
    }
    if (!cand.some(onAxis)) { L = cand; break; }
  }
  if (!L) return null;
  const q = sectorsOf(L);
  const lines = L.map((s) => s * g);

  // Each shard's reach: long on the hit's line, short away from it.
  const sect = q.map((qs, j) => ({ a0: lines[j], a1: lines[j] + qs * g }));
  const bis = sect.map((s) => (s.a0 + s.a1) / 2);
  // How far round from the hit's line a shard sits, as a share of the half-spread: 0 on it, 1 at the edge.
  const half = (spreadSteps * g) / 2;
  const off = (b) => Math.min(1, Math.abs(Math.atan2(Math.sin(b - dir), Math.cos(b - dir))) / Math.max(half, 1e-9));
  const reach = bis.map((b) => {
    const s = ((1 + Math.cos(Math.PI * off(b))) / 2) ** R.falloff;
    return (1 / ratio + (1 - 1 / ratio) * s) * (1 + u() * R.jitter);
  });
  let lead = 0;
  bis.forEach((b, j) => { if (Math.cos(b - dir) > Math.cos(bis[lead] - dir)) lead = j; });

  // Each shard's options, best first: a blade (a triangle, its point the end of one line) or a
  // point (its end broken twice, to a tip between its lines). Every outer edge on the grid too.
  const opts = [];
  for (let j = 0; j < n; j++) {
    const { a0, a1 } = sect[j];
    const b = bis[j];
    const isLead = j === lead;
    const broad = a1 - a0 >= 74 * DEG;
    const wantPoint = isLead || (broad && r() < R.points);
    // A blade's long side: the side away from the hit's line, so the shards splay from it.
    const away = Math.sin(b - dir) >= 0 ? 1 : 0;
    const longSide = r() < R.away ? away : 1 - away;
    const wantTip = r() < 0.5 ? 30 : 45;
    const whim = r();
    let found = [];
    let level = 0;
    for (; level < LOOSER.length; level++) {
      found = shapes(a0, a1, reach[j], { ...R, ...LOOSER[level](R), tipRange: isLead ? R.point : [15, 120] });
      if (found.length) break;
    }
    const list = found.map((c) => {
      let score = c.cost;
      if ((c.kind === 'point') !== wantPoint) score += isLead ? 3 : 1;
      if (c.kind === 'blade') {
        if (c.side !== longSide) score += 0.8;
        if (c.tipAngle < range(R.blade, 0) - 1e-6 || c.tipAngle > range(R.blade, 1) + 1e-6) score += 2;
        score += Math.abs(c.tipAngle - wantTip) / 30;
      } else if (isLead) {
        score += Math.abs(c.tipAngle - (range(R.point, 0) + range(R.point, 1)) / 2) / 60;
      }
      return { ...c, score: score + whim * 0.001 };
    }).sort((x, y) => x.score - y.score).slice(0, 40);
    if (!list.length) return null;
    opts.push({ a0, a1, b, list, level, isLead });
  }

  // The first choice for every shard that keeps every crack clean: ends line up or clearly miss,
  // at most `sharp` 30° blades, and the blades don't all turn one way.
  const pick = new Array(n);
  let tries = 0;
  const sharpOf = (c) => (c.kind === 'blade' && c.tipAngle < 31 ? 1 : 0);
  const search = (j, sharp) => {
    if (j === n) {
      const blades = pick.filter((c) => c.kind === 'blade');
      const one = blades.filter((c) => c.side === 1).length;
      if (blades.length >= 2 && Math.max(one, blades.length - one) > Math.max(1, n - 2)) return false;
      return true;
    }
    for (const c of opts[j].list) {
      if (++tries > 20000) return false;
      if (sharp + sharpOf(c) > R.sharp) continue;
      if (j > 0 && nearMiss(pick[j - 1].rb, c.ra, R)) continue;
      if (full && j === n - 1 && nearMiss(c.rb, pick[0].ra, R)) continue;
      pick[j] = c;
      if (search(j + 1, sharp + sharpOf(c))) return true;
    }
    return false;
  };
  if (!search(0, 0)) return null;

  const shards = opts.map((o, j) => {
    const c = pick[j];
    const fly = R.open + R.burst * Math.max(0, Math.cos(o.b - dir)) ** 1.5;
    return { j, a0: o.a0, a1: o.a1, bisector: o.b, reach: reach[j], lead: o.isLead, kind: c.kind, side: c.side, tip: c.tip, tipAngle: c.tipAngle,
      ra: c.ra, rb: c.rb, base: c.base, free: c.free, loose: o.level, flyBy: fly, fly: [Math.cos(o.b) * fly, Math.sin(o.b) * fly] };
  });
  for (const s of shards) {
    s.c = centroidOf(s.base);
    s.hole = holeFor(s, R);
    s.rest = cutShard(s, R.gap);
    s.poly = s.rest.map(([x, y]) => [x + s.fly[0], y + s.fly[1]]);
    if (s.rest.length < 3) s.dropped = true;
  }
  const cracks = [];
  for (let i = full ? 0 : 1; i < (full ? n : n); i++) {
    const L = shards[(i - 1 + n) % n];
    const Rt = shards[i];
    const a = lines[i];
    cracks.push({ a, left: L.j, right: Rt.j, crack: Math.min(L.rb, Rt.ra), len: Math.max(L.rb, Rt.ra), end: [Math.cos(a) * Math.max(L.rb, Rt.ra), Math.sin(a) * Math.max(L.rb, Rt.ra)] });
  }
  const hull = hullOf(shards.filter((s) => !s.dropped).flatMap((s) => s.poly));
  return { seed, stream: k, n, dir, spread: spreadSteps * R.grid, full, ratio, lines, cracks, shards, hull, rule: R };
}

const LOOSER = [
  () => ({}),
  (R) => ({ thin: R.thin * 0.7 }),
  (R) => ({ thin: R.thin * 0.5, short: [0.25, 0.95] }),
  (R) => ({ thin: R.thin * 0.3, short: [0.2, 1] }),
];

const nearMiss = (r1, r2, R) => { const d = Math.abs(r1 - r2); return d > 1e-6 && d < R.miss * R.gap; };

/**
 * The void where the hit landed: the shard is cut on a grid line across it, `hole` out from the
 * hit. A shard too narrow there to leave a clear edge (1.5 gaps) keeps its inner point instead.
 */
function holeFor(s, R) {
  if (!(R.hole > 0)) return null;
  const g = R.grid * DEG;
  const ub = unit(s.bisector);
  const across = Math.round((s.bisector + Math.PI / 2) / g) * g;
  let nrm = [-Math.sin(across), Math.cos(across)];
  if (nrm[0] * ub[0] + nrm[1] * ub[1] < 0) nrm = [-nrm[0], -nrm[1]];
  const h = { p: [ub[0] * R.hole, ub[1] * R.hole], n: nrm };
  const p = inset(s.base, R.gap / 2, s.free);
  if (p.every(([x, y]) => (x - h.p[0]) * h.n[0] + (y - h.p[1]) * h.n[1] >= 0)) return null; // the hole misses it
  const cut = clipHalf(p, h.p, h.n);
  if (cut.length < 3 || Math.abs(area(cut)) < 0.6 * Math.abs(area(p))) return null; // a hole that takes most of a shard misses it
  // The new edge: the one along the cut line.
  let edge = 0;
  for (let i = 0; i < cut.length; i++) {
    const a = cut[i];
    const b = cut[(i + 1) % cut.length];
    const on = (q) => Math.abs((q[0] - h.p[0]) * h.n[0] + (q[1] - h.p[1]) * h.n[1]) < 1e-7;
    if (on(a) && on(b)) edge = Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  if (edge < 1.5 * R.gap) return null;
  return h;
}

/** A shard with its cracks cut to width g, and the hole cut from it. */
export function cutShard(s, g) {
  const p = inset(s.base, g / 2, s.free);
  return s.hole ? clean(clipHalf(p, s.hole.p, s.hole.n)) : p;
}

/** The part of a polygon on the side of the line through p where (q - p) · n >= 0. */
function clipHalf(poly, p, n) {
  const side = ([x, y]) => (x - p[0]) * n[0] + (y - p[1]) * n[1];
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const sa = side(a);
    const sb = side(b);
    if (sa >= 0) out.push(a);
    if ((sa >= 0) !== (sb >= 0)) {
      const t = sa / (sa - sb);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}

/**
 * The shapes a shard between the lines at a0 and a1 can take, with every edge on the grid:
 * blades (the point is one line's end, the outer edge cuts back to the other line) and points
 * (two outer edges meet at a tip between the lines). Each with a cost: 0 is ideal.
 */
function shapes(a0, a1, rho, R) {
  const g = R.grid * DEG;
  const O = [0, 0];
  const out = [];
  const w = a1 - a0;
  for (const side of [0, 1]) {
    const aL = side ? a1 : a0;
    const aS = side ? a0 : a1;
    const PL = [Math.cos(aL) * rho, Math.sin(aL) * rho];
    for (let k = 1; k <= 5; k++) {
      const tau = k * g;
      for (const sg of [1, -1]) {
        const m = meet(PL, unit(aL + Math.PI + sg * tau), O, unit(aS));
        if (!m) continue;
        const [PS, s, t] = m;
        if (s <= 1e-6 || t <= 1e-6) continue;
        if (t < R.short[0] * rho || t > R.short[1] * rho) continue;
        if (s < R.gap * 3) continue;
        const base = side ? [O, PS, PL] : [O, PL, PS];
        if (Math.abs(area(base)) < 1e-6) continue;
        const cost = Math.abs(t / rho - 0.55);
        if (!solid(base, new Set([1]), R)) continue;
        out.push({ kind: 'blade', side, base, free: new Set([1]), ra: side ? t : rho, rb: side ? rho : t, tip: PL, tipAngle: tau / DEG, cost });
      }
    }
  }
  const [tlo, thi] = R.tipRange;
  for (const f of [0.3, 0.4, 0.5, 0.6, 0.7]) {
    const phi = a0 + w * f;
    const T = [Math.cos(phi) * rho, Math.sin(phi) * rho];
    const turn = Math.round(TAU / g);
    for (let i = 0; i < turn; i++) {
      const da = i * g;
      const ma = meet(T, unit(da), O, unit(a0));
      if (!ma || ma[1] <= 1e-6 || ma[2] <= 1e-6) continue;
      const ra = ma[2];
      if (ra < R.short[0] * rho || ra > R.short[1] * rho || ma[1] < R.gap * 2) continue;
      for (let k = 0; k < turn; k++) {
        const db = k * g;
        const mb = meet(T, unit(db), O, unit(a1));
        if (!mb || mb[1] <= 1e-6 || mb[2] <= 1e-6) continue;
        const rb = mb[2];
        if (rb < R.short[0] * rho || rb > R.short[1] * rho || mb[1] < R.gap * 2) continue;
        const va = unit(da);
        const vb = unit(db);
        const ang = Math.acos(Math.max(-1, Math.min(1, va[0] * vb[0] + va[1] * vb[1]))) / DEG;
        if (ang < tlo - 1e-6 || ang > thi + 1e-6) continue;
        const base = [O, ma[0], T, mb[0]];
        if (!convex(base)) continue;
        // Lopsided, not a kite: the tip off-centre and the two ends at different lengths.
        const cost = Math.abs(Math.abs(f - 0.5) - 0.2) * 0.8 + Math.abs(Math.min(ra, rb) / rho - 0.5) * 0.5 + Math.max(0, 0.2 - Math.abs(ra - rb) / rho);
        if (!solid(base, new Set([1, 2]), R)) continue;
        out.push({ kind: 'point', side: -1, base, free: new Set([1, 2]), ra, rb, tip: T, tipAngle: ang, cost });
      }
    }
  }
  return out;
}

/** A shard that, once its cracks are cut, is still a shard: at least `thin` gaps across. */
function solid(base, free, R) {
  const p = inset(base, R.gap / 2, free);
  if (p.length < 3) return false;
  let per = 0;
  for (let i = 0; i < p.length; i++) per += Math.hypot(p[(i + 1) % p.length][0] - p[i][0], p[(i + 1) % p.length][1] - p[i][1]);
  return (2 * Math.abs(area(p))) / per >= (R.thin * R.gap) / 2;
}

function convex(poly) {
  let sign = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[(i - 1 + poly.length) % poly.length];
    const b = poly[i];
    const c = poly[(i + 1) % poly.length];
    const cr = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
    if (Math.abs(cr) < 1e-9) return false;
    // A corner that is almost straight is a near-miss: either a line or a clear corner.
    const la = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const lc = Math.hypot(c[0] - b[0], c[1] - b[1]);
    if (Math.abs(cr) / (la * lc) < Math.sin(14 * DEG)) return false;
    const s = Math.sign(cr);
    if (sign && s !== sign) return false;
    sign = s;
  }
  return true;
}

/** The convex hull of some points (monotone chain). */
export function hullOf(pts) {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  for (const q of p) { while (lower.length >= 2 && cr(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop(); lower.push(q); }
  const upper = [];
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (upper.length >= 2 && cr(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop(); upper.push(q); }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

/** The area centroid of a polygon. */
export function centroidOf(poly) {
  let a = 0, x = 0, y = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    const f = x1 * y2 - x2 * y1;
    a += f; x += (x1 + x2) * f; y += (y1 + y2) * f;
  }
  return Math.abs(a) < 1e-12 ? poly[0] : [x / (3 * a), y / (3 * a)];
}

/** Signed area. */
export function area(poly) {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    s += x1 * y2 - x2 * y1;
  }
  return s / 2;
}

/**
 * Move every edge of a convex polygon inward by d (the edges in `fixed` stay put) and meet the
 * neighbours at a mitre. An edge the offset turns inside out is dropped and its neighbours meet
 * instead; a shard thinner than the gap vanishes ([]).
 */
export function inset(poly, d, fixed = null) {
  const sgn = area(poly) > 0 ? 1 : -1;
  let lines = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l = Math.hypot(dx, dy);
    if (l < 1e-9) continue;
    const k = fixed?.has(i) ? 0 : d;
    const nx = (-dy / l) * sgn;
    const ny = (dx / l) * sgn;
    lines.push({ p: [a[0] + nx * k, a[1] + ny * k], v: [dx / l, dy / l] });
  }
  const cross = (l1, l2) => {
    const m = meet(l1.p, l1.v, l2.p, l2.v);
    return m ? m[0] : l2.p;
  };
  for (let guard = 0; guard < 16; guard++) {
    const m = lines.length;
    if (m < 3) return [];
    const out = lines.map((l, i) => cross(lines[(i - 1 + m) % m], l));
    let worst = -1;
    let worstDot = 0;
    for (let i = 0; i < m; i++) {
      const a = out[i];
      const b = out[(i + 1) % m];
      const dot = (b[0] - a[0]) * lines[i].v[0] + (b[1] - a[1]) * lines[i].v[1];
      if (dot < worstDot) { worstDot = dot; worst = i; }
    }
    if (worst < 0) return Math.sign(area(out)) === sgn ? clean(out) : [];
    lines = lines.filter((_, i) => i !== worst);
  }
  return [];
}

/** Merge corners closer than eps and drop points on a straight line: no stray anchors in Illustrator. */
export function clean(poly, eps = 1e-4) {
  let out = [];
  for (const p of poly) {
    const q = out[out.length - 1];
    if (!q || Math.hypot(p[0] - q[0], p[1] - q[1]) > eps) out.push(p);
  }
  if (out.length > 2 && Math.hypot(out[0][0] - out[out.length - 1][0], out[0][1] - out[out.length - 1][1]) <= eps) out.pop();
  for (let changed = true; changed && out.length > 3;) {
    changed = false;
    for (let i = 0; i < out.length; i++) {
      const a = out[(i - 1 + out.length) % out.length];
      const b = out[i];
      const c = out[(i + 1) % out.length];
      const cr = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
      if (Math.abs(cr) < 1e-9) { out.splice(i, 1); changed = true; break; }
    }
  }
  return out;
}

/** A polygon as SVG path data, scaled by s and moved by dx, dy. */
export function pathOf(poly, s = 1, dx = 0, dy = 0, digits = 2) {
  return `M${poly.map(([x, y]) => `${+(dx + x * s).toFixed(digits)} ${+(dy + y * s).toFixed(digits)}`).join('L')}Z`;
}
