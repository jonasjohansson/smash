// The warped outlines as an SVG for Illustrator: every point of every outline
// pushed through the same warp as the screen, the points a straight run
// doesn't need taken out again, one plain even-odd path, in white on a black
// ground or black on a white one (the ground its own rectangle, to delete). Where the surface
// folds over itself, one path can't hold it (the overlaps would cancel into
// holes), so the mark is cut along the grid's cells, finer where the fold runs,
// one path each, and the overlaps paint as they do on screen.

/** A closed polygon with the points that lie within tol of a straight run left out (Ramer-Douglas-Peucker). */
export function simplify(pts, tol) {
  if (pts.length < 4) return pts;
  const keep = new Uint8Array(pts.length);
  // Split the loop at its first point and the point farthest from it.
  let far = 0, fd = -1;
  for (let i = 1; i < pts.length; i++) { const d = (pts[i][0] - pts[0][0]) ** 2 + (pts[i][1] - pts[0][1]) ** 2; if (d > fd) { fd = d; far = i; } }
  keep[0] = keep[far] = 1;
  const stack = [[0, far], [far, pts.length]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const A = pts[a], B = pts[b % pts.length];
    const dx = B[0] - A[0], dy = B[1] - A[1], len = Math.hypot(dx, dy) || 1e-9;
    let best = -1, bd = tol;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((pts[i][0] - A[0]) * dy - (pts[i][1] - A[1]) * dx) / len;
      if (d > bd) { bd = d; best = i; }
    }
    if (best >= 0) { keep[best] = 1; stack.push([a, best], [best, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

/** A polygon clipped to an axis-aligned box [x0, y0, x1, y1] (Sutherland-Hodgman); its long edges cut to at most `step`. */
export function clipBox(poly, [x0, y0, x1, y1], step) {
  let out = poly;
  for (const [ax, v, sg] of [[0, x0, 1], [0, x1, -1], [1, y0, 1], [1, y1, -1]]) {
    const inp = out;
    out = [];
    for (let i = 0; i < inp.length; i++) {
      const P = inp[i], Q = inp[(i + 1) % inp.length];
      const pin = sg * (P[ax] - v) >= 0, qin = sg * (Q[ax] - v) >= 0;
      if (pin) out.push(P);
      if (pin !== qin) { const t = (v - P[ax]) / (Q[ax] - P[ax]); out.push([P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t]); }
    }
    if (out.length < 3) return [];
  }
  const dense = [];
  for (let i = 0; i < out.length; i++) {
    const P = out[i], Q = out[(i + 1) % out.length];
    const k = Math.max(1, Math.ceil(Math.hypot(Q[0] - P[0], Q[1] - P[1]) / step));
    for (let q = 0; q < k; q++) dense.push([P[0] + ((Q[0] - P[0]) * q) / k, P[1] + ((Q[1] - P[1]) * q) / k]);
  }
  return dense;
}

/**
 * The SVG. o: {
 *   contours (polygons in the grid's frame units), toOut(s, t) (frame units to output px),
 *   size [w, h], fill (the mark), ground (the rectangle behind it, or null), about (a line for the comment),
 *   content [x, y, w, h] (where the mark is),
 *   n, m (the grid), folds(box) (does the surface fold within a box of frame units?)
 * }
 */
export function warpedSVG({ contours, toOut, size, fill, ground = null, about, content, n, m, folds }) {
  const [cx, cy, cw, ch] = content;
  const f = (v) => +v.toFixed(2);
  const pathOf = (polys) => polys.map((c) => `M${simplify(c.map(([s, t]) => toOut(s, t)), 0.05).map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}Z`).join('');
  const back = ground ? `\n  <rect id="ground" width="${size[0]}" height="${size[1]}" fill="${ground}"/>` : '';
  const head = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size[0]} ${size[1]}" width="${size[0]}" height="${size[1]}">`;
  if (!folds([cx, cy, cx + cw, cy + ch])) {
    return `${head}\n  <!-- ${about} -->${back}\n  <path id="mark" fill="${fill}" fill-rule="evenodd" d="${pathOf(contours)}"/>\n</svg>\n`;
  }
  const step = Math.min(cw, ch) / 420;
  const pieces = [];
  for (let j = 0; j < m - 1; j++) {
    for (let i = 0; i < n - 1; i++) {
      const box = [Math.max(i / (n - 1), cx), Math.max(j / (m - 1), cy), Math.min((i + 1) / (n - 1), cx + cw), Math.min((j + 1) / (m - 1), cy + ch)];
      if (box[0] >= box[2] || box[1] >= box[3]) continue;
      const sub = folds(box) ? 8 : 1;
      const bw = (box[2] - box[0]) / sub, bh = (box[3] - box[1]) / sub;
      for (let b = 0; b < sub; b++) for (let a = 0; a < sub; a++) {
        const bx = [box[0] + bw * a, box[1] + bh * b, box[0] + bw * (a + 1), box[1] + bh * (b + 1)];
        const polys = contours.map((c) => clipBox(c, bx, step)).filter((c) => c.length >= 3);
        if (polys.length) pieces.push(`    <path d="${pathOf(polys)}"/>`);
      }
    }
  }
  return `${head}\n  <!-- ${about} The surface folds over itself, so the mark is cut into ${pieces.length} pieces along the grid, which overlap as they do on screen; Pathfinder > Unite makes them one shape. -->${back}\n  <g id="mark" fill="${fill}" fill-rule="evenodd">\n${pieces.join('\n')}\n  </g>\n</svg>\n`;
}
