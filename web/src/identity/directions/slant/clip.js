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
