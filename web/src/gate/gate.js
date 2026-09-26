// The gate: the SMASH mark as a 3D gate that swings open onto a small planet.
// Projects stand on the planet as glass shards with their image inside;
// broken glass grows out of the ground and drifts in the air.
//
// Walk: drag, scroll, WASD or the arrow keys. Click a shard to open its project.

import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const body = document.body;
const canvas = document.querySelector('[data-gate-canvas]');
const titleEl = document.querySelector('[data-title]');
const enterEl = document.querySelector('[data-enter]');
const projects = JSON.parse(document.getElementById('projects-data').textContent);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---- tunables --------------------------------------------------------------

const BG = 0x07080b;
const GATE_WIDTH = 7;
const GATE_DEPTH = 0.38;
const PLANET_RADIUS = 8;
const PLANET_CENTER = new THREE.Vector3(0, -PLANET_RADIUS, -12);
const OUTSIDE = { pos: new THREE.Vector3(0, 2.7, 14), look: new THREE.Vector3(0, 2.7, 0) };
const INSIDE = { pos: new THREE.Vector3(0, 1.7, -9), look: new THREE.Vector3(0, 0.9, -21) };
const DOOR_OPEN = 1.95; // radians each door swings
const OPEN_MS = 2600;
const FLY_MS = 3400;
const IDLE_WALK = 0.018; // radians per second, so the world keeps turning

// ---- renderer, scene, light -------------------------------------------------

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch {
  location.replace('/');
  throw new Error('WebGL unavailable');
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.localClippingEnabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(BG);
// Outside, fog swallows everything past the gate, so the world is only
// guessed at through the slots; it lifts as you pass through.
const FOG_OUT = { near: 14.6, far: 19 };
const FOG_IN = { near: 5, far: 34 };
scene.fog = new THREE.Fog(BG, FOG_OUT.near, FOG_OUT.far);

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.9;

const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
camera.position.copy(OUTSIDE.pos);
camera.lookAt(OUTSIDE.look);

const key = new THREE.DirectionalLight(0xfff1e0, 1.6);
key.position.set(-6, 10, 8);
scene.add(key, new THREE.AmbientLight(0x8090a8, 0.25));
// A light just behind the gate, so the slots glow before it opens.
const GLOW = 40;
const inner = new THREE.PointLight(0xdfe8ff, GLOW, 12, 1.6);
inner.position.set(0, 3, -2.5);
// And a soft light high over the planet for once you are inside.
const sky = new THREE.DirectionalLight(0xe6ecff, 0);
sky.position.set(4, 14, -8);
scene.add(inner, sky);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.3, 0.6, 0.9);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ---- helpers ---------------------------------------------------------------

const rand = (a, b) => a + Math.random() * (b - a);

/** Negative scale reverses triangle winding; swap two corners of every triangle back. */
function flipWinding(geo) {
  for (const name of ['position', 'normal', 'uv']) {
    const attr = geo.getAttribute(name);
    if (!attr) continue;
    const n = attr.itemSize;
    const a = attr.array;
    for (let i = 0; i < a.length; i += 3 * n) {
      for (let k = 0; k < n; k++) {
        const t = a[i + n + k];
        a[i + n + k] = a[i + 2 * n + k];
        a[i + 2 * n + k] = t;
      }
    }
    attr.needsUpdate = true;
  }
}

/** An irregular, broken-looking polygon roughly w × h, centred on the origin. */
function shardShape(w, h, jag = 0.18) {
  const corners = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]];
  const pts = [];
  corners.forEach(([x, y], i) => {
    const [nx, ny] = corners[(i + 1) % 4];
    // Sometimes a corner is snapped off: two points instead of one.
    if (Math.random() < 0.35) {
      const t = rand(0.08, 0.22);
      const [px, py] = corners[(i + 3) % 4];
      pts.push([x + (px - x) * t, y + (py - y) * t], [x + (nx - x) * t, y + (ny - y) * t]);
    } else {
      pts.push([x + rand(-jag, jag) * w * 0.3, y + rand(-jag, jag) * h * 0.3]);
    }
    // And sometimes an edge is chipped.
    if (Math.random() < 0.4) {
      const t = rand(0.3, 0.7);
      const nxv = -(ny - y), nyv = nx - x;
      const len = Math.hypot(nxv, nyv);
      const d = rand(-0.06, 0.03) * Math.min(w, h);
      pts.push([x + (nx - x) * t + (nxv / len) * d, y + (ny - y) * t + (nyv / len) * d]);
    }
  });
  return new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
}

/** A splinter: a thin, sharp triangle or quad. */
function splinterShape(size) {
  const n = Math.random() < 0.6 ? 3 : 4;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rand(-0.4, 0.4);
    const r = size * (i === 0 ? rand(1.2, 2.2) : rand(0.3, 0.7));
    pts.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r));
  }
  return new THREE.Shape(pts);
}

const glass = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  metalness: 0,
  roughness: 0.04,
  transmission: 1,
  thickness: 0.35,
  ior: 1.52,
  iridescence: 0.35,
  iridescenceIOR: 1.3,
  clearcoat: 1,
  clearcoatRoughness: 0.05,
  specularIntensity: 1,
  envMapIntensity: 1.4,
  attenuationColor: new THREE.Color(0xd9f1ff),
  attenuationDistance: 2.5,
});

// Glass in front of an image: clear, no rainbow, so the work reads through it.
const pane = glass.clone();
pane.iridescence = 0;
pane.envMapIntensity = 0.3;
pane.thickness = 0.12;
pane.attenuationDistance = 12;

function glassPiece(shape, depth, material = glass) {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: true, bevelThickness: depth * 0.25, bevelSize: depth * 0.25, bevelSegments: 2, curveSegments: 1,
  });
  geo.translate(0, 0, -depth / 2);
  return new THREE.Mesh(geo, material);
}

// ---- the gate ------------------------------------------------------------------

const gate = new THREE.Group();
scene.add(gate);
const doors = [];

async function buildGate() {
  const svg = new SVGLoader().parse(await (await fetch('/brand/smash-logo.svg')).text());
  const shapes = svg.paths.flatMap((p) => SVGLoader.createShapes(p));
  // Scale from the outline's own width so bevels are set in scene units.
  const xs = shapes.flatMap((sh) => sh.getPoints().map((p) => p.x));
  const s = GATE_WIDTH / (Math.max(...xs) - Math.min(...xs));
  const bevel = 0.03 / s;
  const geo = new THREE.ExtrudeGeometry(shapes, {
    depth: GATE_DEPTH / s - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.6, bevelSegments: 3, curveSegments: 8,
  });
  geo.scale(s, -s, s); // SVG y runs down
  flipWinding(geo);
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  geo.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2);

  // One geometry, two doors: each is cut in half by a clipping plane that
  // travels with it, and hinged on its outer edge.
  for (const side of [-1, 1]) {
    const plane = new THREE.Plane(new THREE.Vector3(side, 0, 0), 0);
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0x0d0e12,
      metalness: 0.8,
      roughness: 0.32,
      clearcoat: 0.6,
      clearcoatRoughness: 0.2,
      envMapIntensity: 0.7,
      side: THREE.DoubleSide,
      clippingPlanes: [plane.clone()],
    });
    const mesh = new THREE.Mesh(geo, mat);
    const hinge = new THREE.Group();
    hinge.position.x = side * GATE_WIDTH / 2; // left door hinges at -w/2, right at +w/2
    mesh.position.x = -side * GATE_WIDTH / 2;
    hinge.add(mesh);
    gate.add(hinge);
    doors.push({ hinge, mesh, local: plane, side });
  }
}

function updateClipping() {
  for (const d of doors) {
    d.mesh.updateMatrixWorld();
    d.mesh.material.clippingPlanes[0].copy(d.local).applyMatrix4(d.mesh.matrixWorld);
  }
}

// ---- the planet ------------------------------------------------------------------

const planet = new THREE.Group();
planet.position.copy(PLANET_CENTER);
scene.add(planet);

function checkerTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#15171c';
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#1c1f26';
  g.fillRect(0, 0, 32, 32);
  g.fillRect(32, 32, 32, 32);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(48, 24);
  t.magFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}

planet.add(new THREE.Mesh(
  new THREE.SphereGeometry(PLANET_RADIUS, 128, 64),
  new THREE.MeshStandardMaterial({ map: checkerTexture(), roughness: 0.85, metalness: 0, envMapIntensity: 0.12 }),
));

/** Evenly spread points on a sphere. */
function fibonacci(n, i) {
  const y = 1 - ((i + 0.5) / n) * 2;
  const r = Math.sqrt(1 - y * y);
  const phi = i * Math.PI * (3 - Math.sqrt(5));
  return new THREE.Vector3(Math.cos(phi) * r, y, Math.sin(phi) * r);
}

/** Orient an object so its local +Y is `up` (a unit vector in the planet's space). */
function standOn(obj, up) {
  obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
}

const loader = new THREE.TextureLoader();
const exhibits = []; // { group, face, project, normal }
const pickables = [];

function buildExhibits() {
  // Start from the top of the planet so the first work is right in front of you.
  const turn = new THREE.Quaternion().setFromUnitVectors(fibonacci(projects.length, 0), new THREE.Vector3(0, 0.85, -0.53).normalize());
  projects.forEach((project, i) => {
    const normal = fibonacci(projects.length, i).applyQuaternion(turn);
    const group = new THREE.Group();
    group.position.copy(normal).multiplyScalar(PLANET_RADIUS - 0.05);
    standOn(group, normal);
    planet.add(group);

    // The face turns about the local up axis to look at the walker.
    const face = new THREE.Group();
    group.add(face);

    const tall = Math.random() < 0.5;
    const h = rand(1.6, 2.1);
    const w = tall ? h * 0.78 : h * 1.4;
    const shape = shardShape(w, h);
    face.position.y = h / 2 + 0.25;

    const imageGeo = new THREE.ShapeGeometry(shape);
    const uv = imageGeo.getAttribute('uv');
    const pos = imageGeo.getAttribute('position');
    for (let k = 0; k < pos.count; k++) uv.setXY(k, (pos.getX(k) + w / 2) / w, (pos.getY(k) + h / 2) / h);
    const map = loader.load(project.image, (tex) => {
      // Cover-fit the image into the shard.
      const ia = tex.image.width / tex.image.height;
      const sa = w / h;
      if (ia > sa) { tex.repeat.set(sa / ia, 1); tex.offset.set((1 - sa / ia) / 2, 0); }
      else { tex.repeat.set(1, ia / sa); tex.offset.set(0, (1 - ia / sa) / 2); }
    });
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 8;
    const image = new THREE.Mesh(imageGeo, new THREE.MeshBasicMaterial({ map, side: THREE.DoubleSide }));
    const cover = glassPiece(shape, 0.07, pane);
    cover.scale.set(1.03, 1.03, 1);
    face.add(image, cover);

    // A few splinters lie broken off at its foot.
    for (let k = 0; k < 3; k++) {
      const s = glassPiece(splinterShape(rand(0.06, 0.16)), 0.03);
      s.position.set(rand(-w / 2, w / 2), 0.03, rand(-0.5, 0.5));
      s.rotation.set(-Math.PI / 2 + rand(-0.3, 0.3), 0, rand(0, Math.PI * 2));
      group.add(s);
    }

    image.userData.project = cover.userData.project = project;
    pickables.push(image, cover);
    exhibits.push({ group, face, project, normal });
  });
}

function buildCrystals() {
  // Glass growing out of the ground, in clusters.
  for (let c = 0; c < 26; c++) {
    const at = new THREE.Vector3().randomDirection();
    for (let k = 0; k < 4; k++) {
      const normal = at.clone().add(new THREE.Vector3().randomDirection().multiplyScalar(0.05)).normalize();
      const shard = glassPiece(splinterShape(rand(0.12, 0.35)), rand(0.04, 0.09));
      const holder = new THREE.Group();
      holder.position.copy(normal).multiplyScalar(PLANET_RADIUS - 0.08);
      standOn(holder, normal);
      shard.rotation.set(rand(-0.4, 0.4), rand(0, Math.PI), Math.PI / 2 + rand(-0.5, 0.5));
      shard.position.y = 0.15;
      holder.add(shard);
      planet.add(holder);
    }
  }
}

const drifting = [];
function buildDrift() {
  // Broken glass in the air: around the gate first, then over the planet.
  for (let i = 0; i < 70; i++) {
    const nearGate = i < 22;
    const shard = glassPiece(nearGate ? shardShape(rand(0.25, 0.7), rand(0.25, 0.8), 0.4) : splinterShape(rand(0.1, 0.4)), rand(0.03, 0.07));
    shard.position.set(
      nearGate ? rand(-7, 7) : rand(-14, 14),
      nearGate ? rand(0.2, 6) : rand(1.5, 9),
      nearGate ? rand(-4, 3) : rand(-34, -4),
    );
    if (nearGate && Math.abs(shard.position.x) < 3.8 && shard.position.z > -1) shard.position.z = rand(1.2, 3);
    shard.rotation.set(rand(0, 6.3), rand(0, 6.3), rand(0, 6.3));
    shard.userData.spin = new THREE.Vector3(rand(-0.25, 0.25), rand(-0.25, 0.25), rand(-0.1, 0.1));
    shard.userData.bob = rand(0, Math.PI * 2);
    shard.userData.y = shard.position.y;
    scene.add(shard);
    drifting.push(shard);
  }
}

// ---- walking -----------------------------------------------------------------

const velocity = { walk: 0, turn: 0 };
const keys = new Set();
let state = 'loading';
let openedAt = 0;

addEventListener('keydown', (e) => keys.add(e.code));
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('wheel', (e) => {
  if (state === 'outside') return enter();
  if (state === 'inside') velocity.walk += e.deltaY * 0.00012;
}, { passive: true });

let drag = null;
canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, moved: 0 }; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', (e) => {
  pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  if (!drag || state !== 'inside') return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  drag.moved += Math.abs(dx) + Math.abs(dy);
  velocity.turn += dx * 0.0009;
  velocity.walk -= dy * 0.0006;
  drag.x = e.clientX; drag.y = e.clientY;
});
canvas.addEventListener('pointerup', () => {
  if (drag && drag.moved < 6) click();
  drag = null;
});

const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const q = new THREE.Quaternion();

function walk(dt) {
  const forward = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
  const side = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
  velocity.walk += forward * 0.5 * dt;
  velocity.turn += side * 1.1 * dt;
  velocity.walk *= Math.pow(0.12, dt);
  velocity.turn *= Math.pow(0.08, dt);
  const walkRate = velocity.walk + (state === 'inside' && !drag && !keys.size ? IDLE_WALK : 0);
  // Walking forward rolls the ground towards you; turning spins it about your feet.
  planet.quaternion.premultiply(q.setFromAxisAngle(X, walkRate * dt));
  planet.quaternion.premultiply(q.setFromAxisAngle(Y, -velocity.turn * dt));
}

// ---- picking -----------------------------------------------------------------

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2(9, 9);
let hovered = null;

function pick() {
  if (state !== 'inside') return;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(pickables, false)[0];
  const project = hit && hit.distance < 22 ? hit.object.userData.project : null;
  if (project === hovered) return;
  hovered = project;
  body.classList.toggle('is-pointing', !!project);
  titleEl.innerHTML = project ? `${project.title}<span>${project.year}</span>` : '';
}

function click() {
  if (state === 'outside') return enter();
  if (hovered) location.href = `/${hovered.slug}/`;
}

// ---- entering ----------------------------------------------------------------

function enter() {
  if (state !== 'outside') return;
  state = 'opening';
  body.dataset.state = 'opening';
  openedAt = performance.now();
}
enterEl.addEventListener('click', enter);
addEventListener('keydown', (e) => { if (e.code === 'Enter' || e.code === 'Space') enter(); });

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const look = new THREE.Vector3();

function animateEntry(now) {
  const t = reducedMotion ? OPEN_MS + FLY_MS : now - openedAt;
  const open = ease(Math.min(1, t / OPEN_MS));
  for (const d of doors) d.hinge.rotation.y = -d.side * DOOR_OPEN * open;
  const fly = ease(Math.min(1, Math.max(0, (t - OPEN_MS * 0.35) / FLY_MS)));
  camera.position.lerpVectors(OUTSIDE.pos, INSIDE.pos, fly);
  // Rise a little on the way through, so the threshold is felt.
  camera.position.y += Math.sin(fly * Math.PI) * 0.6;
  look.lerpVectors(OUTSIDE.look, INSIDE.look, fly);
  camera.lookAt(look);
  inner.intensity = GLOW * (1 - fly);
  sky.intensity = 1.2 * fly;
  scene.fog.near = THREE.MathUtils.lerp(FOG_OUT.near, FOG_IN.near, fly);
  scene.fog.far = THREE.MathUtils.lerp(FOG_OUT.far, FOG_IN.far, Math.min(1, fly * 1.6));
  if (fly >= 1) {
    state = 'inside';
    body.dataset.state = 'inside';
    gate.visible = false;
  }
}

// ---- loop ------------------------------------------------------------------

const cameraLocal = new THREE.Vector3();
const inv = new THREE.Quaternion();
const clock = new THREE.Clock();

function faceWalker() {
  // Each shard turns about its own up axis to face the camera, so the work stays readable.
  inv.copy(planet.quaternion).invert();
  cameraLocal.copy(camera.position).sub(planet.position).applyQuaternion(inv);
  for (const ex of exhibits) {
    const to = cameraLocal.clone().sub(ex.group.position);
    to.applyQuaternion(ex.group.quaternion.clone().invert());
    ex.face.rotation.y = Math.atan2(to.x, to.z);
  }
}

function frame(now) {
  const dt = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;
  if (state === 'opening') animateEntry(now);
  if (state === 'inside' || state === 'opening') walk(dt);
  if (state === 'outside') {
    // The closed gate breathes slightly with the pointer.
    const target = Math.abs(pointer.x) <= 1 ? pointer.x * 0.12 : 0;
    gate.rotation.y += (target - gate.rotation.y) * 0.04;
  }
  for (const s of drifting) {
    s.rotation.x += s.userData.spin.x * dt;
    s.rotation.y += s.userData.spin.y * dt;
    s.rotation.z += s.userData.spin.z * dt;
    s.position.y = s.userData.y + Math.sin(time * 0.4 + s.userData.bob) * 0.15;
  }
  faceWalker();
  updateClipping();
  pick();
  composer.render();
  requestAnimationFrame(frame);
}

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  bloom.setSize(w, h);
  camera.aspect = w / h;
  // Keep the whole gate in frame on narrow screens.
  camera.fov = w / h < 1 ? 40 / Math.max(0.55, w / h) : 40;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);

// ---- go ------------------------------------------------------------------------

resize();
await buildGate();
buildExhibits();
buildCrystals();
buildDrift();
state = 'outside';
body.dataset.state = 'outside';
if (location.hash === '#inside') {
  openedAt = performance.now() - OPEN_MS - FLY_MS;
  state = 'opening';
}
requestAnimationFrame(frame);
