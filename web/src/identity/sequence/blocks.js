// The pulse in 3D, a test: the modular mark as five blocks, its letters,
// moving the way the reference's blocks do. Straight on it is the flat mark;
// then, a hit on each beat, the letters tip over their edges (left, right,
// forward, back), roll, turn on the spot so the slots become corridors,
// slide out in depth, hop up onto each other and back; the camera turns with
// them, on the beats they move, never on its own. Then each hops home and it
// is flat again. Flat light, black and white: white faces, grey sides. It
// keeps the pulse's time (pulse.js): 120 a minute, each move landing on the
// beat and stopping dead there, still between. To judge whether the 3D says
// more than the 2D; not yet a version.
//
// Space pauses; ?t=0.5 seeks (a share of the loop) and pauses.

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
import { MODULAR_DEFAULTS as M, geometry, outlineSVG } from '../modular.js';
import { parsePath, toShapes } from '../extrude.js';

const BEAT = 0.5; // 120 a minute
const U = 100; // mark units to a three.js unit
const DEPTH = 0.64; // the blocks' depth: two bars
const K = 5;
/** The whip, as pulse.js: slow off and fastest at the end, stopping dead on 1 (a block falling onto a face). */
const whip = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : (2 ** (K * u) - 1) / (2 ** K - 1));
/** In and out, for the camera and a hop's rise and fall: the hop lands at speed all the same, its arc carrying it down. */
const inOut = (u) => (u < 0.5 ? 4 * u ** 3 : 1 - (-2 * u + 2) ** 3 / 2);
const LONG = { tip: 0.22, turn: 0.26, slide: 0.2, hop: 0.34 }; // how long each kind of move takes, landing on its beat
const CAM = 0.34; // and the camera, turning with them

// The letters: S M A S H, 0 to 4.
const [S1, MM, A, S2, H] = [0, 1, 2, 3, 4];
// The score: on each beat, what moves (a letter and its move) and where the camera turns to, if it does
// ([yaw, pitch] in degrees, 0 0 straight on). A hop goes onto a letter (on) or home, turning on the way (spin, about
// the vertical, and flip, end over end). Sixteen beats: the flat mark, eleven hits, the flat mark again.
const SCORE = [
  {},
  { moves: [[H, 'tip', 'back']], cam: [34, 18] },
  { moves: [[A, 'turn', 90], [S2, 'slide', 0, 0.7]] },
  { moves: [[MM, 'hop', { on: S1 }]] },
  { moves: [[S2, 'tip', 'right']], cam: [-32, 26] },
  { moves: [[A, 'tip', 'front']] },
  { moves: [[H, 'hop', { on: A, spin: 90 }]], cam: [-58, 14] },
  { moves: [[S2, 'tip', 'right'], [MM, 'turn', -90]] },
  { moves: [[S2, 'slide', 0, -1.2]], cam: [24, 40] },
  { moves: [[S2, 'hop', { home: true, flip: 1 }], [H, 'hop', { home: true }]] },
  { moves: [[A, 'hop', { home: true }]], cam: [14, 10] },
  { moves: [[MM, 'hop', { home: true }]], cam: [0, 0] },
  {},
  {},
  {},
  {},
];
// Nothing moves while something stands on it: a letter carried off from under another would leave it in the air.
const BEATS = SCORE.length;
const PERIOD = BEATS * BEAT;
const wrap = (t) => ((t % PERIOD) + PERIOD) % PERIOD;

// ---------------------------------------------------------------------------
// The blocks

const g = geometry(M);
const ENDS = [g.c(1), g.c(4), g.c(6), g.c(8)].map((x) => x - g.s / 2).concat(g.w); // each letter's right edge
const svg = await outlineSVG(M);
const shapes = toShapes(parsePath(svg.match(/ d="([^"]+)"/)[1], (x, y) => [x / U, (g.h - y) / U]));
// Each letter's geometry where it stands in the word, on the ground (y 0), its middle at z 0; moved by its matrix alone.
const GEOS = ENDS.map((x1, i) => {
  const x0 = i ? ENDS[i - 1] : -1;
  const mine = shapes.filter((s) => { const xs = s.getPoints().map((p) => p.x * U); const mid = (Math.min(...xs) + Math.max(...xs)) / 2; return mid > x0 && mid < x1; });
  const geo = new THREE.ExtrudeGeometry(mine, { depth: DEPTH, bevelEnabled: false, curveSegments: 10 });
  geo.translate(0, 0, -DEPTH / 2);
  geo.computeBoundingBox();
  return geo;
});
const box = (i, m) => GEOS[i].boundingBox.clone().applyMatrix4(m); // a letter's box where m puts it (exact: every turn is a quarter)
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const about = (point, axis, angle) => new THREE.Matrix4().makeTranslation(point.x, point.y, point.z)
  .multiply(new THREE.Matrix4().makeRotationAxis(axis, angle))
  .multiply(new THREE.Matrix4().makeTranslation(-point.x, -point.y, -point.z));

/**
 * A move as a function of e (0 to 1) giving the letter's matrix, from where
 * it is (m0, with the others at all0): a tip rolls it over a bottom edge of
 * its box, a turn spins it about its middle, a slide shifts it, a hop carries
 * it on an arc (its middle along a line and up, its turn slerped) to its
 * landing: on top of another letter, or home.
 */
function motion(i, [kind, a, b], m0, all0) {
  const bx = box(i, m0);
  const mid = bx.getCenter(V());
  if (kind === 'tip') {
    const [point, axis, angle] = {
      right: [V(bx.max.x, bx.min.y, 0), V(0, 0, 1), -Math.PI / 2],
      left: [V(bx.min.x, bx.min.y, 0), V(0, 0, 1), Math.PI / 2],
      front: [V(0, bx.min.y, bx.max.z), V(1, 0, 0), Math.PI / 2],
      back: [V(0, bx.min.y, bx.min.z), V(1, 0, 0), -Math.PI / 2],
    }[a];
    return (e) => about(point, axis, angle * e).multiply(m0);
  }
  if (kind === 'turn') return (e) => about(mid, V(0, 1, 0), THREE.MathUtils.degToRad(a) * e).multiply(m0);
  if (kind === 'slide') return (e) => new THREE.Matrix4().makeTranslation(a * e, 0, b * e).multiply(m0);
  // A hop: where it lands, then the arc there.
  let m1 = new THREE.Matrix4();
  if (!a.home) {
    const turned = about(mid, V(0, 1, 0), THREE.MathUtils.degToRad(a.spin ?? 0)).multiply(m0);
    const tb = box(i, turned), under = box(a.on, all0[a.on]);
    const to = V((under.min.x + under.max.x) / 2, under.max.y, (under.min.z + under.max.z) / 2);
    const from = V((tb.min.x + tb.max.x) / 2, tb.min.y, (tb.min.z + tb.max.z) / 2);
    m1 = new THREE.Matrix4().makeTranslation(to.x - from.x, to.y - from.y, to.z - from.z).multiply(turned);
  }
  const local = GEOS[i].boundingBox.getCenter(V()); // its middle, as it stands at home
  const [q0, q1] = [m0, m1].map((m) => new THREE.Quaternion().setFromRotationMatrix(m));
  const c0 = local.clone().applyMatrix4(m0), c1 = local.clone().applyMatrix4(m1);
  const flip = a.flip ? new THREE.Quaternion() : null;
  const lift = 0.9 + Math.max(0, c1.y - c0.y);
  return (e) => {
    const u = inOut(e);
    const q = q0.clone().slerp(q1, u);
    if (flip) q.premultiply(flip.setFromAxisAngle(V(1, 0, 0), 2 * Math.PI * a.flip * u)); // end over end, whole turns, on the way
    const c = c0.clone().lerp(c1, u);
    c.y += lift * 4 * e * (1 - e);
    return new THREE.Matrix4().makeRotationFromQuaternion(q).premultiply(new THREE.Matrix4().makeTranslation(c.x, c.y, c.z))
      .multiply(new THREE.Matrix4().makeTranslation(-local.x, -local.y, -local.z));
  };
}

// Laid out: where every letter is once each beat has landed, and each move into it.
const HOME = () => GEOS.map(() => new THREE.Matrix4());
const POSES = [];
const MOVES = [];
let now = HOME();
let view = [0, 0];
const VIEWS = [];
SCORE.forEach((beat, b) => {
  const into = (beat.moves ?? []).map(([i, ...m]) => ({ i, kind: m[0], long: LONG[m[0]], at: motion(i, m, now[i], now) }));
  now = now.map((m, i) => into.find((x) => x.i === i)?.at(1) ?? m);
  view = beat.cam ?? view;
  MOVES.push(into);
  POSES.push(now);
  VIEWS.push(view);
});
// The loop closes: the last beat is home, straight on.
console.assert(POSES.at(-1).every((m) => m.equals(new THREE.Matrix4()) || m.elements.every((v, k) => Math.abs(v - new THREE.Matrix4().elements[k]) < 1e-9)), '[blocks] the loop does not end home');

/** The whole arrangement's box at beat b, for the camera to frame. */
const frameOf = (b) => POSES[b].reduce((all, m, i) => all.union(box(i, m)), new THREE.Box3());

// ---------------------------------------------------------------------------
// The scene

const root = document.querySelector('.blocks');
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
root.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#000');
const camera = new THREE.PerspectiveCamera(18, 16 / 9, 0.1, 400);
// The light: the faces are white whatever it does; it only shades the sides, the tops lightest.
scene.add(new THREE.HemisphereLight('#fff', '#222', 1.6));
const sun = new THREE.DirectionalLight('#fff', 2.2);
sun.position.set(-2, 6, 3);
scene.add(sun);
const face = new THREE.MeshBasicMaterial({ color: '#fff' });
const side = new THREE.MeshLambertMaterial({ color: '#8c8c8c' });
const meshes = GEOS.map((geo) => {
  const mesh = new THREE.Mesh(geo, [face, side]);
  mesh.matrixAutoUpdate = false;
  scene.add(mesh);
  return mesh;
});

/**
 * The camera for an angle and a box: looking at the box's middle from [yaw,
 * pitch], just far enough back that every corner of it is on the screen, with
 * a margin.
 */
function lookAt([yaw, pitch], bx, aspect) {
  const y = THREE.MathUtils.degToRad(yaw), p = THREE.MathUtils.degToRad(pitch);
  const dir = V(Math.sin(y) * Math.cos(p), Math.sin(p), Math.cos(y) * Math.cos(p)); // from the middle to the camera
  const right = V(0, 1, 0).cross(dir).normalize(), up = dir.clone().cross(right);
  const target = bx.getCenter(V());
  const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / 1.3, tanH = tanV * aspect; // the margin: a 1.3 × fit
  let dist = 0;
  for (const cx of [bx.min.x, bx.max.x]) for (const cy of [bx.min.y, bx.max.y]) for (const cz of [bx.min.z, bx.max.z]) {
    const v = V(cx, cy, cz).sub(target);
    const along = v.dot(dir);
    dist = Math.max(dist, along + Math.abs(v.dot(right)) / tanH, along + Math.abs(v.dot(up)) / tanV);
  }
  return { target, dir, dist };
}

/** Everything at time t: each letter where it is, mid-move if its move is under way; the camera the same. */
function place(t, aspect) {
  t = wrap(t);
  const b = Math.floor(t / BEAT + 1e-9) % BEATS, nb = (b + 1) % BEATS;
  const left = (b + 1) * BEAT - t; // until the next beat
  meshes.forEach((mesh, i) => {
    const mv = MOVES[nb].find((x) => x.i === i);
    mesh.matrix.copy(mv && left < mv.long ? mv.at(1 - left / mv.long) : POSES[b][i]);
  });
  const A = lookAt(VIEWS[b], frameOf(b), aspect);
  const turning = MOVES[nb].length && left < CAM;
  const C = turning ? (() => {
    const B = lookAt(VIEWS[nb], frameOf(nb), aspect), e = inOut(1 - left / CAM);
    return { target: A.target.clone().lerp(B.target, e), dir: A.dir.clone().lerp(B.dir, e).normalize(), dist: A.dist + (B.dist - A.dist) * e };
  })() : A;
  camera.position.copy(C.target).addScaledVector(C.dir, C.dist);
  camera.lookAt(C.target);
}

// ---------------------------------------------------------------------------
// Time

const query = new URLSearchParams(location.search);
let t = query.has('t') ? (Number(query.get('t')) || 0) * PERIOD : 0;
let paused = query.has('t');
let last = null;
function render() {
  const w = root.clientWidth, h = root.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / Math.max(1, h);
  camera.updateProjectionMatrix();
  place(t, camera.aspect);
  renderer.render(scene, camera);
}
function frame(stamp) {
  if (last !== null && !paused) t += (stamp - last) / 1000;
  last = stamp;
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
addEventListener('keydown', (e) => { if (e.key === ' ') { e.preventDefault(); paused = !paused; } });
document.documentElement.dataset.ready = '1';

// For scripts (a video, frame by frame): hold still at time s, drawn now.
window.__blocks = { PERIOD, seek(s) { t = s; paused = true; render(); } };
