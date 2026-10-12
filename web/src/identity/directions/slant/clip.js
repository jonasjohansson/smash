// Outlines as polygons, for the slash (the design panel, round 1,
// 2026-10-12: "one straight kerf through the whole wordmark"): path data
// flattened to rings of points, its curves and arcs in short pieces, and a
// ring cut by a straight line into the pieces either side of it. No
// dependencies. The slash itself is in ./geometry.js.

const num = (args) => (args.trim() ? args.trim().split(/[\s,]+/).map(Number) : []);

/** A cubic from p0 by its handles to p3, as points about step apart (p0 left out). */
function cubic(p0, [x1, y1, x2, y2, x3, y3], step) {
  const reach = Math.hypot(x1 - p0[0], y1 - p0[1]) + Math.hypot(x2 - x1, y2 - y1) + Math.hypot(x3 - x2, y3 - y2);
  const n = Math.max(4, Math.ceil(reach / step));
  return Array.from({ length: n }, (_, k) => {
    const t = (k + 1) / n, u = 1 - t;
    if (k === n - 1) return [x3, y3];
    return [u * u * u * p0[0] + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3, u * u * u * p0[1] + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3];
  });
}

/** An SVG arc from p1 (rx ry turn large sweep x y), as points about step apart (p1 left out); the spec's centre form. */
function arc(p1, [rx, ry, turn, large, sweep, x2, y2], step) {
  rx = Math.abs(rx); ry = Math.abs(ry);
  if (!rx || !ry) return [[x2, y2]];
  const phi = (turn * Math.PI) / 180, cos = Math.cos(phi), sin = Math.sin(phi);
  const dx = (p1[0] - x2) / 2, dy = (p1[1] - y2) / 2;
  const x1p = cos * dx + sin * dy, y1p = -sin * dx + cos * dy;
  const grow = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (grow > 1) { rx *= Math.sqrt(grow); ry *= Math.sqrt(grow); }
  const num2 = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p, den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  const k = (large !== sweep ? 1 : -1) * Math.sqrt(Math.max(0, num2 / (den || 1)));
  const cxp = (k * rx * y1p) / ry, cyp = (-k * ry * x1p) / rx;
  const cx = cos * cxp - sin * cyp + (p1[0] + x2) / 2, cy = sin * cxp + cos * cyp + (p1[1] + y2) / 2;
  const angle = (u, v) => Math.atan2(u[0] * v[1] - u[1] * v[0], u[0] * v[0] + u[1] * v[1]);
  const a = [(x1p - cxp) / rx, (y1p - cyp) / ry], b = [(-x1p - cxp) / rx, (-y1p - cyp) / ry];
  const t0 = angle([1, 0], a);
  let dt = angle(a, b);
  if (!sweep && dt > 0) dt -= 2 * Math.PI;
  if (sweep && dt < 0) dt += 2 * Math.PI;
  const n = Math.max(4, Math.ceil((Math.abs(dt) * Math.max(rx, ry)) / step));
  return Array.from({ length: n }, (_, i) => {
    if (i === n - 1) return [x2, y2];
    const t = t0 + (dt * (i + 1)) / n;
    return [cx + rx * cos * Math.cos(t) - ry * sin * Math.sin(t), cy + rx * sin * Math.cos(t) + ry * cos * Math.sin(t)];
  });
}

/**
 * Path data (M, L, C, A, Z, absolute, as poly and move write it) as closed
 * rings of points, one a subpath; its curves and arcs in pieces about step
 * long, so they stay smooth. A ring doesn't repeat its first point.
 */
export function flatten(d, step = 1) {
  const rings = [];
  let ring = null, cur = null;
  const add = (q) => { if (Math.abs(q[0] - cur[0]) > 1e-9 || Math.abs(q[1] - cur[1]) > 1e-9) ring.push(q); cur = q; };
  for (const [, k, args] of d.matchAll(/([MLCAZ])([^MLCAZ]*)/g)) {
    const n = num(args);
    if (k === 'M') { cur = n.slice(0, 2); ring = [cur]; rings.push(ring); }
    else if (k === 'Z') cur = ring[0];
    else if (k === 'L') add(n.slice(0, 2));
    else if (k === 'C') cubic(cur, n, step).forEach(add);
    else arc(cur, n, step).forEach(add);
  }
  for (const r of rings) {
    const [a, b] = [r[0], r.at(-1)];
    if (r.length > 1 && Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9) r.pop();
  }
  return rings.filter((r) => r.length > 2);
}

/** Path data's box, [x0, y0, x1, y1], from its flattened outline. */
export function extent(d) {
  const pts = flatten(d).flat();
  if (!pts.length) return [0, 0, 0, 0];
  const xs = pts.map(([x]) => x), ys = pts.map(([, y]) => y);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

/** Whether a point is inside rings, filled evenodd. */
export function inside(rings, [x, y]) {
  let odd = false;
  for (const r of rings) for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [ax, ay] = r[i], [bx, by] = r[j];
    if ((ay > y) !== (by > y) && x < ax + ((y - ay) * (bx - ax)) / (by - ay)) odd = !odd;
  }
  return odd;
}

/** How far from (x, y) straight up (dir -1) or down (dir 1) the rings' nearest side is; Infinity if none. */
export function reach(rings, [x, y], dir) {
  let best = Infinity;
  for (const r of rings) for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [ax, ay] = r[i], [bx, by] = r[j];
    if ((ax > x) === (bx > x)) continue;
    const t = ay + ((x - ax) * (by - ay)) / (bx - ax), far = (t - y) * dir;
    if (far > 0 && far < best) best = far;
  }
  return best;
}

/**
 * A closed ring (simple, as a letter's outline is) cut by the line y = c:
 * { lo, hi }, its pieces above the line (y less than c) and below it, each a
 * closed ring turning as the ring does, the line along their cut sides. The
 * line is taken a hair (1e-7) above c, so a corner or a side on it falls
 * below and every crossing is clean. null where the crossings won't pair up
 * (a ring that crosses itself), so the caller can leave that ring whole.
 */
export function cutRing(ring, c) {
  const at = c - 1e-7;
  const n = ring.length, up = ring.map(([, y]) => y < at);
  const cross = [];
  for (let i = 0; i < n; i++) {
    const a = ring[i], b = ring[(i + 1) % n];
    if (up[i] === up[(i + 1) % n]) continue;
    const t = (at - a[1]) / (b[1] - a[1]);
    cross.push({ i, out: up[i], pt: [a[0] + t * (b[0] - a[0]), at] }); // out: from above the line to below
  }
  if (!cross.length) return up[0] ? { lo: [ring], hi: [] } : { lo: [], hi: [ring] };
  // Along the line, the crossings pair off: the ring's inside runs between each pair.
  const order = cross.map((_, k) => k).sort((a, b) => cross[a].pt[0] - cross[b].pt[0]);
  const partner = [];
  for (let k = 0; k < order.length; k += 2) {
    const [a, b] = [order[k], order[k + 1]];
    if (b == null || cross[a].out === cross[b].out) return null;
    partner[a] = b; partner[b] = a;
  }
  const K = cross.length;
  // The ring from crossing k to the next, the corners between.
  const chain = (k) => {
    const from = cross[k], to = cross[(k + 1) % K], pts = [from.pt];
    for (let i = (from.i + 1) % n; ; i = (i + 1) % n) { pts.push(ring[i]); if (i === to.i) break; }
    pts.push(to.pt);
    return pts;
  };
  // Each piece: a run of the ring, along the line to its partner, the next run, until it closes.
  const trace = (out) => {
    const pieces = [], seen = new Set();
    for (let k = 0; k < K; k++) {
      if (cross[k].out === out || seen.has(k)) continue; // a piece above starts where the ring comes up through the line
      const pts = [];
      let j = k, guard = 0;
      do {
        seen.add(j);
        pts.push(...chain(j));
        j = partner[(j + 1) % K];
        if (++guard > K) return null;
      } while (j !== k);
      pieces.push(pts.filter((q, i) => i === 0 || q[0] !== pts[i - 1][0] || q[1] !== pts[i - 1][1]));
    }
    return pieces;
  };
  const lo = trace(true), hi = trace(false);
  return lo && hi ? { lo, hi } : null;
}

/** A ring's area, signed by the way it turns. */
export const area = (r) => r.reduce((t, [x, y], i) => { const [x2, y2] = r[(i + 1) % r.length]; return t + x * y2 - x2 * y; }, 0) / 2;

/**
 * A closed ring (simple) cut along a strip, the lines y = lo and y = hi (lo
 * above): its zones are 0 above the strip, 1 in it, 2 below it, each line
 * taken a hair (1e-7) above, as cutRing's. Without a crossing, { zone }.
 * Otherwise { pieces, chords, trace }: the pieces the two lines cut it into,
 * each { zone, ring, chords } (the chords along its cut sides); the chords,
 * each { line, pieces } (the two pieces either side); and trace(), the ring
 * without the pieces marked out (piece.out), as closed rings, each
 * { ring, pieces }: cut only along the chords next to a piece left out, so
 * the pieces kept either side of any other chord stay one. null where the
 * crossings won't pair up.
 */
export function strip(ring, lo, hi) {
  const lines = [lo - 1e-7, hi - 1e-7];
  const zone = ([, y]) => (y < lines[0] ? 0 : y < lines[1] ? 1 : 2);
  const n = ring.length, z = ring.map(zone);
  // The ring with a point put in where it crosses a line, each crossing noted.
  const pts = [], cross = [];
  for (let i = 0; i < n; i++) {
    const a = ring[i], b = ring[(i + 1) % n], za = z[i], zb = z[(i + 1) % n];
    pts.push(a);
    for (let k = za; k !== zb; k += Math.sign(zb - za)) {
      const to = k + Math.sign(zb - za), line = Math.min(k, to), t = (lines[line] - a[1]) / (b[1] - a[1]);
      cross.push({ at: pts.length, line, to, pt: [a[0] + t * (b[0] - a[0]), lines[line]] });
      pts.push(cross.at(-1).pt);
    }
  }
  const K = cross.length;
  if (!K) return { zone: z[0] };
  // Along each line, the crossings pair off into chords: the ring's inside runs between each pair.
  const partner = [], chordOf = [], chords = [];
  for (const line of [0, 1]) {
    const on = cross.map((c, k) => k).filter((k) => cross[k].line === line).sort((a, b) => cross[a].pt[0] - cross[b].pt[0]);
    for (let j = 0; j < on.length; j += 2) {
      const [a, b] = [on[j], on[j + 1]];
      if (b == null || cross[a].to === cross[b].to) return null;
      partner[a] = b; partner[b] = a;
      chordOf[a] = chordOf[b] = chords.length;
      chords.push({ line, pieces: [] });
    }
  }
  // The arcs: the ring from each crossing to the next, in the zone it crosses into.
  const arc = (k) => {
    const out = [], end = cross[(k + 1) % K].at;
    for (let i = cross[k].at; ; i = (i + 1) % pts.length) { out.push(pts[i]); if (i === end) break; }
    return out;
  };
  // Every arc runs on to the next, or along a chord cut to its partner's: closed rings, each its arcs.
  const cycles = (cut, use) => {
    const seen = new Set(), out = [];
    for (let k = 0; k < K; k++) {
      if (seen.has(k) || !use(k)) continue;
      const arcs = [];
      let j = k;
      do {
        seen.add(j); arcs.push(j);
        const e = (j + 1) % K;
        j = cut(chordOf[e]) ? partner[e] : e;
        if (arcs.length > K) return null;
      } while (j !== k);
      out.push(arcs);
    }
    return out;
  };
  // Its ends are corners where the ring turns along a chord cut; on a chord not cut, only points along a side.
  const ringOf = (arcs, cut) => arcs.flatMap((k) => arc(k).filter((q, i, a) => (i === 0 ? cut(chordOf[k]) : i < a.length - 1 || cut(chordOf[(k + 1) % K]))));
  const all = () => true;
  const pieces = cycles(all, all).map((arcs) => ({ zone: cross[arcs[0]].to, arcs, ring: ringOf(arcs, all), chords: [] }));
  const pieceOf = [];
  pieces.forEach((q, i) => q.arcs.forEach((k) => { pieceOf[k] = i; }));
  // Each chord: the pieces either side, the arcs that leave from its ends.
  partner.forEach((b, a) => { const c = chords[chordOf[a]]; if (!c.pieces.includes(pieceOf[a])) c.pieces.push(pieceOf[a]); });
  chords.forEach((c, i) => c.pieces.forEach((q) => pieces[q].chords.push(i)));
  const trace = () => {
    const cut = (c) => chords[c].pieces.some((q) => pieces[q].out), kept = (k) => !pieces[pieceOf[k]].out;
    return (cycles(cut, kept) ?? []).map((arcs) => ({ ring: ringOf(arcs, cut), pieces: [...new Set(arcs.map((k) => pieceOf[k]))] }));
  };
  pieces.forEach((q) => delete q.arcs);
  return { pieces, chords, trace };
}

/** The distance from q to the segment a b. */
const toSegment = ([x, y], [ax, ay], [bx, by]) => {
  const dx = bx - ax, dy = by - ay, len = dx * dx + dy * dy;
  const t = len ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len)) : 0;
  return Math.hypot(x - ax - t * dx, y - ay - t * dy);
};

/**
 * Whether some point inside rings (evenodd) stands at least need from every
 * side: whether a disc need in radius fits in them. Probed on a grid, coarse
 * to fine (down to 2 apart), so it is need less a unit and a half.
 */
export function clearance(rings, need) {
  const pts = rings.flat();
  if (!pts.length) return false;
  const xs = pts.map(([x]) => x), ys = pts.map(([, y]) => y);
  const [x0, y0, x1, y1] = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  const sides = rings.flatMap((r) => r.map((a, i) => [a, r[(i + 1) % r.length]]));
  const far = need - 1.5;
  const fits = (q) => sides.every(([a, b]) => toSegment(q, a, b) >= far) && inside(rings, q);
  for (let g = Math.max(2, 2 ** Math.ceil(Math.log2(Math.max(2, need)))); g >= 2; g /= 2) {
    for (let y = y0 + g / 2; y < y1; y += g) for (let x = x0 + g / 2; x < x1; x += g) if (fits([x, y])) return true;
  }
  return false;
}
