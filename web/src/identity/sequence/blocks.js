// The pulse in 3D, a test: the modular mark as blocks, and the crop not as a
// wipe but as letters tipping off the end of the word, one a beat: the H,
// the S, the A, the M, down to the S; held; then back the other way, each
// rising and tipping up into its place. Flat light, black and white: white
// faces, grey sides. It keeps the pulse's time (pulse.js): 120 a minute, a
// whip into each hit that lands on the beat, a dead stop on it, still
// between; the camera only moves with a change, to frame what is left. To
// judge whether the 3D says more than the 2D; not yet a version.
//
// Space pauses; ?t=0.5 seeks (a share of the loop) and pauses.

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
import { MODULAR_DEFAULTS as M, geometry, outlineSVG } from '../modular.js';
import { parsePath, toShapes } from '../extrude.js';

const BEAT = 0.5; // 120 a minute
const BEATS = 12;
const PERIOD = BEATS * BEAT;
const TIP = 0.16; // the whip into a hit: a letter tipping over its edge
const FALL = 0.35, RISE = 0.3; // after tipping off, falling out of sight; before tipping back, rising into place
const FAR = 4; // how far a letter falls, in marks' heights
const U = 100; // mark units to a three.js unit
const DEPTH = 0.64; // the blocks' depth: two bars

const K = 5;
const whip = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : (2 ** (K * u) - 1) / (2 ** K - 1)); // as pulse.js
const out = (u) => 1 - (1 - Math.min(1, Math.max(0, u))) ** 3; // rising, slowing into place
const mix = (a, b, v) => a + (b - a) * v;
const wrap = (t) => ((t % PERIOD) + PERIOD) % PERIOD;

// The score: each letter (S M A S H, 0 to 4) tips off on one beat and comes back on another.
const OFF = [null, 4, 3, 2, 1]; // the H first, the M last; the first S stays
const BACK = [null, 7, 8, 9, 10];
const g = geometry(M);
const ENDS = [g.c(1), g.c(4), g.c(6), g.c(8)].map((x) => x - g.s / 2).concat(g.w); // each letter's right edge

/** A letter at time t: how far over it has tipped (0 standing, 1 lying on its right side), and how far below its place it is. */
function pose(i, t) {
  if (!OFF[i]) return { tip: 0, drop: 0, shown: true };
  t = wrap(t);
  const off = OFF[i] * BEAT, back = BACK[i] * BEAT;
  if (t >= off - TIP && t < off) return { tip: whip((t - off + TIP) / TIP), drop: 0, shown: true };
  if (t >= off && t < off + FALL) { const v = (t - off) / FALL; return { tip: 1 + 0.5 * v, drop: FAR * v * v, shown: true }; }
  if (t >= back - TIP - RISE && t < back - TIP) return { tip: 1, drop: FAR * (1 - out((t - back + TIP + RISE) / RISE)), shown: true };
  if (t >= back - TIP && t < back) return { tip: 1 - whip((t - back + TIP) / TIP), drop: 0, shown: true };
  if (t >= off && t < back) return { tip: 1, drop: FAR, shown: false };
  return { tip: 0, drop: 0, shown: true };
}

/**
 * The camera's framing at time t: the width of word it holds. It moves only
 * with a change: closing in with a letter's tip off, landing on the beat;
 * opening out as one rises to come back, there as it tips up into place.
 */
function framing(t) {
  t = wrap(t);
  let n = 5;
  for (let i = 1; i < 5; i++) {
    const off = OFF[i] * BEAT, back = BACK[i] * BEAT;
    if (t >= off - TIP && t < off) return mix(ENDS[i], ENDS[i - 1], whip((t - off + TIP) / TIP));
    if (t >= back - TIP - RISE && t < back - TIP) return mix(ENDS[i - 1], ENDS[i], out((t - back + TIP + RISE) / RISE));
    if (t >= off && t < back - TIP - RISE) n = Math.min(n, i);
  }
  return ENDS[n - 1];
}

// ---------------------------------------------------------------------------
// The scene

const root = document.querySelector('.blocks');
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
root.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#000');
const camera = new THREE.PerspectiveCamera(18, 16 / 9, 0.1, 200);
// The light: the faces are white whatever it does; it only shades the sides, the tops lightest.
scene.add(new THREE.HemisphereLight('#fff', '#222', 1.6));
const sun = new THREE.DirectionalLight('#fff', 2.2);
sun.position.set(-2, 6, 3);
scene.add(sun);
const face = new THREE.MeshBasicMaterial({ color: '#fff' });
const side = new THREE.MeshLambertMaterial({ color: '#8c8c8c' });

// The modular mark's true outline, in pieces: the full slots cut it into its letters.
const svg = await outlineSVG(M);
const d = svg.match(/ d="([^"]+)"/)[1];
const shapes = toShapes(parsePath(d, (x, y) => [x / U, (g.h - y) / U]));
const pivots = [];
for (let i = 0; i < 5; i++) {
  const x1 = ENDS[i] / U;
  const mine = shapes.filter((s) => {
    const xs = s.getPoints().map((p) => p.x);
    const mid = (Math.min(...xs) + Math.max(...xs)) / 2;
    return mid < x1 && mid > (i ? ENDS[i - 1] / U : -1);
  });
  const geo = new THREE.ExtrudeGeometry(mine, { depth: DEPTH, bevelEnabled: false, curveSegments: 10 });
  geo.translate(-x1, 0, -DEPTH / 2); // hinged on its bottom right edge, the one it tips over
  const pivot = new THREE.Group();
  pivot.position.set(x1, 0, 0);
  pivot.add(new THREE.Mesh(geo, [face, side]));
  scene.add(pivot);
  pivots.push(pivot);
}

// Seen from the front, a little from the right and above, so the sides it tips over show.
const LOOK = new THREE.Vector3(0.42, 0.26, 1).normalize();
function place(t, aspect) {
  pivots.forEach((p, i) => {
    const { tip, drop, shown } = pose(i, t);
    p.rotation.z = (-Math.PI / 2) * tip;
    p.position.y = (-drop * g.h) / U;
    p.visible = shown;
  });
  const w = framing(t) / U, h = g.h / U;
  const fit = Math.max(h, w / aspect) * 1.5; // the height of world to show, with room round it
  const dist = fit / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const target = new THREE.Vector3(w / 2, h / 2, 0);
  camera.position.copy(target).addScaledVector(LOOK, dist);
  camera.lookAt(target);
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
function frame(now) {
  if (last !== null && !paused) t += (now - last) / 1000;
  last = now;
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
addEventListener('keydown', (e) => { if (e.key === ' ') { e.preventDefault(); paused = !paused; } });
document.documentElement.dataset.ready = '1';

// For scripts (a video, frame by frame): hold still at time s, drawn now.
window.__blocks = { PERIOD, seek(s) { t = s; paused = true; render(); } };
