// Geometry for the two extrusions: the walls of closed outlines swept along an
// axis, with smooth normals where the outline curves and hard ones at its
// corners, and flat caps. Built by hand (not ExtrudeGeometry) for the normals:
// ExtrudeGeometry's walls are flat-shaded, and a face in profile shows every facet.

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';

/**
 * The walls of contours (outer ones counter-clockwise, holes clockwise, y up)
 * swept from w0 to w1. place(u, v, w) gives the vertex and turn(nu, nv) the
 * normal in the object's frame; flip when place mirrors (so faces stay outward).
 * Returns { position, normal } arrays.
 */
export function walls(contours, w0, w1, { place, turn, flip = false, crease = 38 }) {
  const position = [];
  const normal = [];
  const cosC = Math.cos((crease * Math.PI) / 180);
  for (const c of contours) {
    const n = c.length;
    const seg = [];
    for (let i = 0; i < n; i++) {
      const [ax, ay] = c[i];
      const [bx, by] = c[(i + 1) % n];
      const dx = bx - ax;
      const dy = by - ay;
      const l = Math.hypot(dx, dy) || 1;
      seg.push([dy / l, -dx / l]);
    }
    // At each point, the normal coming in and the one going out: one shared normal where the turn is gentle.
    const at = [];
    for (let i = 0; i < n; i++) {
      const a = seg[(i - 1 + n) % n];
      const b = seg[i];
      if (a[0] * b[0] + a[1] * b[1] > cosC) {
        const x = a[0] + b[0];
        const y = a[1] + b[1];
        const l = Math.hypot(x, y) || 1;
        const s = [x / l, y / l];
        at.push([s, s]);
      } else at.push([a, b]);
    }
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const [au, av] = c[i];
      const [bu, bv] = c[j];
      const a0 = place(au, av, w0);
      const b0 = place(bu, bv, w0);
      const b1 = place(bu, bv, w1);
      const a1 = place(au, av, w1);
      const na = turn(...at[i][1]);
      const nb = turn(...at[j][0]);
      const tris = flip
        ? [[a0, na], [b1, nb], [b0, nb], [a0, na], [a1, na], [b1, nb]]
        : [[a0, na], [b0, nb], [b1, nb], [a0, na], [b1, nb], [a1, na]];
      for (const [p, q] of tris) {
        position.push(p[0], p[1], p[2]);
        normal.push(q[0], q[1], q[2]);
      }
    }
  }
  return { position, normal };
}

/** Flat caps of shapes ({ outer, holes } in x, y) at z0 (facing -z) and z1 (facing +z). */
export function caps(shapes, z0, z1) {
  const position = [];
  const normal = [];
  for (const { outer, holes } of shapes) {
    const v2 = (pts) => pts.map(([x, y]) => new THREE.Vector2(x, y));
    const faces = THREE.ShapeUtils.triangulateShape(v2(outer), holes.map(v2));
    const all = [...outer, ...holes.flat()];
    for (const [ia, ib, ic] of faces) {
      const a = all[ia];
      const b = all[ib];
      const c = all[ic];
      const ccw = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]) > 0;
      const [p, q, r] = ccw ? [a, b, c] : [a, c, b];
      position.push(p[0], p[1], z1, q[0], q[1], z1, r[0], r[1], z1);
      normal.push(0, 0, 1, 0, 0, 1, 0, 0, 1);
      position.push(p[0], p[1], z0, r[0], r[1], z0, q[0], q[1], z0);
      normal.push(0, 0, -1, 0, 0, -1, 0, 0, -1);
    }
  }
  return { position, normal };
}

/** One BufferGeometry from { position, normal } parts. */
export function geometry(...parts) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(parts.flatMap((p) => p.position), 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(parts.flatMap((p) => p.normal), 3));
  g.computeBoundingSphere();
  return g;
}
