// The two drawings the sculpture is made of: the traced SMASH mark (the front)
// and the S, the modular mark's symbol with the S alone (the side), drawn in the
// z-y plane. Everything here is plain outlines: arrays of [x, y] points, y up.
//
// The S comes from modular.js as true outlines (the slots cut from its block),
// fitted to the unit box: z from -0.5 to 0.5 (the sculpture scales it to the
// S's own depth) and y just past 0 to 1, so the mark's top and bottom always
// cut through it and the front view stays exactly SMASH. Both drawings have
// material at every height, so the side view stays exactly the S. The side is
// seen from +x, where the S reads left to right: its left edge is the front.

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';

import { MODULAR_DEFAULTS, outlineSVG } from '../modular.js';

/** How far the side shapes reach past the mark's top and bottom, so no two faces lie in one plane. */
export const OVERSHOOT = 0.006;

/** SVG path data (M L H V C Q Z, absolute or relative) into a THREE.ShapePath, points mapped by map(x, y). */
export function parsePath(d, map = (x, y) => [x, y]) {
  const sp = new THREE.ShapePath();
  const tokens = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) ?? [];
  let i = 0;
  let cmd = '';
  let x = 0, y = 0, sx = 0, sy = 0;
  const num = () => parseFloat(tokens[i++]);
  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i])) cmd = tokens[i++];
    else if (!cmd || cmd === 'z' || cmd === 'Z') { i++; continue; }
    const rel = cmd === cmd.toLowerCase();
    switch (cmd.toLowerCase()) {
      case 'm': {
        let nx = num(), ny = num();
        if (rel) { nx += x; ny += y; }
        x = sx = nx; y = sy = ny;
        sp.moveTo(...map(x, y));
        cmd = rel ? 'l' : 'L';
        break;
      }
      case 'l': { let nx = num(), ny = num(); if (rel) { nx += x; ny += y; } x = nx; y = ny; sp.lineTo(...map(x, y)); break; }
      case 'h': { let nx = num(); if (rel) nx += x; x = nx; sp.lineTo(...map(x, y)); break; }
      case 'v': { let ny = num(); if (rel) ny += y; y = ny; sp.lineTo(...map(x, y)); break; }
      case 'c': {
        const a = [num(), num(), num(), num(), num(), num()];
        if (rel) for (let k = 0; k < 6; k++) a[k] += k % 2 ? y : x;
        sp.bezierCurveTo(...map(a[0], a[1]), ...map(a[2], a[3]), ...map(a[4], a[5]));
        x = a[4]; y = a[5];
        break;
      }
      case 'q': {
        const a = [num(), num(), num(), num()];
        if (rel) for (let k = 0; k < 4; k++) a[k] += k % 2 ? y : x;
        sp.quadraticCurveTo(...map(a[0], a[1]), ...map(a[2], a[3]));
        x = a[2]; y = a[3];
        break;
      }
      case 'z': x = sx; y = sy; break;
      default: i++;
    }
  }
  return sp;
}

/** Closed polylines from a ShapePath: curves cut into pieces about `step` long, lines kept whole. */
export function sample(shapePath, step) {
  const out = [];
  for (const path of shapePath.subPaths) {
    const pts = [];
    for (const curve of path.curves) {
      const n = curve.isLineCurve ? 1 : Math.max(2, Math.min(96, Math.ceil(curve.getLength() / step)));
      for (let k = 0; k < n; k++) {
        const p = curve.getPoint(k / n);
        const last = pts.at(-1);
        if (!last || Math.hypot(p.x - last[0], p.y - last[1]) > 1e-7) pts.push([p.x, p.y]);
      }
    }
    // Where the last piece ends (a path closed by Z alone has no piece back to its start).
    const end = path.curves.at(-1)?.getPoint(1);
    if (end && pts.length && Math.hypot(end.x - pts.at(-1)[0], end.y - pts.at(-1)[1]) > 1e-7) pts.push([end.x, end.y]);
    // The path may or may not end where it began: keep one copy of that point.
    while (pts.length > 2 && Math.hypot(pts[0][0] - pts.at(-1)[0], pts[0][1] - pts.at(-1)[1]) < 1e-7) pts.pop();
    if (pts.length > 2) out.push(pts);
  }
  return out;
}

export function area(pts) {
  let s = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) s += (pts[j][0] - pts[i][0]) * (pts[j][1] + pts[i][1]);
  return s / 2;
}

function inside([x, y], poly) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if ((a[1] > y) !== (b[1] > y) && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) hit = !hit;
  }
  return hit;
}

/**
 * Nest contours (a contour inside an odd number of others is a hole), turn
 * outer ones counter-clockwise and holes clockwise, and group them into shapes.
 * Returns { contours, shapes: [{ outer, holes }] }.
 */
export function organize(contours) {
  const cs = contours.map((pts) => ({ pts: pts.slice(), a: area(pts) })).filter((c) => Math.abs(c.a) > 1e-9);
  cs.sort((p, q) => Math.abs(q.a) - Math.abs(p.a));
  cs.forEach((c, k) => {
    const parents = cs.slice(0, k).filter((o) => inside(c.pts[0], o.pts));
    c.hole = parents.length % 2 === 1;
    c.parent = parents.at(-1) ?? null;
    if (c.hole === c.a > 0) c.pts.reverse();
  });
  const shapes = cs.filter((c) => !c.hole).map((c) => ({ outer: c.pts, holes: cs.filter((h) => h.hole && h.parent === c).map((h) => h.pts) }));
  return { contours: cs.map((c) => c.pts), shapes };
}

/** Where the contours cross the line y = at, as [from, to] intervals along x (even-odd). */
export function crossings(contours, at) {
  const xs = [];
  for (const c of contours) {
    for (let i = 0, j = c.length - 1; i < c.length; j = i++) {
      const a = c[j];
      const b = c[i];
      if ((a[1] > at) !== (b[1] > at)) xs.push(a[0] + ((at - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
    }
  }
  xs.sort((p, q) => p - q);
  const out = [];
  for (let i = 0; i + 1 < xs.length; i += 2) out.push([xs[i], xs[i + 1]]);
  return out;
}

/**
 * The traced logo (brand/smash-logo.svg, one potrace path in a translate(0, H)
 * scale(0.1, -0.1) frame) as outlines in the sculpture's units: one unit is the
 * mark's height, x centred, y from 0 (the floor) to 1.
 */
export function markFromSVG(text) {
  const d = text.match(/<path[^>]*\sd="([^"]+)"/)[1];
  const vb = text.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  const [W, H] = [parseFloat(vb[1]), parseFloat(vb[2])];
  const map = (px, py) => [(0.1 * px - W / 2) / H, (0.1 * py) / H];
  const { contours, shapes } = organize(sample(parsePath(d, map), 0.004));
  return { contours, shapes, width: W / H };
}

/**
 * The side: the S alone (the modular mark cropped at the slot after its S) as
 * outlines of [z, y] points in the unit box, z from -0.5 to 0.5 and y from
 * -OVERSHOOT to 1 + OVERSHOOT. Resolves to { contours, shapes, aspect }: aspect
 * is the S's width over its height (about 0.62), the depth that keeps its proportion.
 */
export async function symbolSide(settings = MODULAR_DEFAULTS) {
  const svg = await outlineSVG(settings, 0);
  const d = svg.match(/\sd="([^"]+)"/)[1];
  const vb = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  const [W, H] = [parseFloat(vb[1]), parseFloat(vb[2])];
  const e = OVERSHOOT;
  // Drawn with y down; seen from +x (where the side view is), right is -z.
  const fit = (x, y) => [0.5 - x / W, (1 - y / H) * (1 + 2 * e) - e];
  const { contours, shapes } = organize(sample(parsePath(d, fit), 0.004));
  return { contours, shapes, aspect: W / H };
}
