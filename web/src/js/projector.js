// The work page: a slide projector in a dark room.
//
// The projects are slides in the round tray on top. The one in the gate is
// thrown onto the page background: a plane fixed to the camera that always
// fills the view, lit by a faint beam from the lens. Advancing turns the tray
// one slot, dips the slide, and shutters the picture to the next project.
//
// Scroll, ←/→ or a click on the projector: next or previous slide.
// Drag: walk around it. Room / Above: the two framed views.
// A click on the picture opens the project.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const canvas = document.querySelector('[data-projector]');
const titleEl = document.querySelector('[data-title]');
const slides = JSON.parse(document.getElementById('slides').textContent);
const N = slides.length;
const STEP = (Math.PI * 2) / N;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
} catch {
  document.body.classList.add('no-webgl');
  throw new Error('WebGL unavailable');
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050505);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.35;

const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
scene.add(camera);

const key = new THREE.DirectionalLight(0xfff3e6, 1.4);
key.position.set(3, 7, 4);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
key.shadow.camera.left = key.shadow.camera.bottom = -3;
key.shadow.camera.right = key.shadow.camera.top = 3;
scene.add(key, new THREE.AmbientLight(0xffffff, 0.08));

const loader = new THREE.TextureLoader();
const texture = (url) => {
  const t = loader.load(url);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
};

// ---- the room: a floor for the shadow ------------------------------------

const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.45 }));
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// ---- the projector --------------------------------------------------------

const projector = new THREE.Group();
scene.add(projector);

const mat = (color, roughness = 0.55, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const light = mat(0xcfccc4, 0.5);
const dark = mat(0x5f605e, 0.6);
const black = mat(0x111111, 0.35);

function add(mesh, x, y, z) {
  mesh.position.set(x, y, z);
  mesh.castShadow = mesh.receiveShadow = true;
  projector.add(mesh);
  return mesh;
}

// Body: pale upper shell over a darker base, like the Carousel S.
add(new THREE.Mesh(new RoundedBoxGeometry(3, 0.55, 3, 4, 0.08), dark), 0, 0.3, 0);
add(new THREE.Mesh(new RoundedBoxGeometry(3.1, 0.7, 3.1, 5, 0.14), light), 0, 0.88, 0);

// Name on the front, in the site's own type.
function label() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#1a1a1a';
  g.font = '300 92px Inter, Helvetica, Arial, sans-serif';
  g.textBaseline = 'middle';
  g.fillText('SMASH Carousel', 40, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
add(new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.3), new THREE.MeshBasicMaterial({ map: label(), transparent: true, toneMapped: false })), 0.55, 0.9, 1.556);

// Handle across the front, a knob on the side.
add(new THREE.Mesh(new RoundedBoxGeometry(1.3, 0.14, 0.12, 3, 0.04), black), -0.3, 0.62, 1.6);
const knob = add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.16, 40), black), 1.62, 0.7, 0.9);
knob.rotation.z = Math.PI / 2;

// Lens: a black barrel out of the back, towards the wall.
const LENS = new THREE.Vector3(-0.85, 0.72, -1.95);
const barrel = add(new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.36, 0.55, 48), black), LENS.x, LENS.y, LENS.z + 0.28);
barrel.rotation.x = Math.PI / 2;
const lensGlass = add(new THREE.Mesh(new THREE.CircleGeometry(0.27, 48), new THREE.MeshBasicMaterial({ color: 0xfff2dc, toneMapped: false })), LENS.x, LENS.y, LENS.z - 0.001);
lensGlass.rotation.y = Math.PI;

// Tray: a black ring on top, numbered round its base, holding the slides.
const TRAY_Y = 1.23;
const tray = new THREE.Group();
tray.position.y = TRAY_Y;
projector.add(tray);

const ringShape = new THREE.Shape().absarc(0, 0, 1.32, 0, Math.PI * 2);
ringShape.holes.push(new THREE.Path().absarc(0, 0, 0.42, 0, Math.PI * 2, true));
const ring = new THREE.Mesh(new THREE.ExtrudeGeometry(ringShape, { depth: 0.3, bevelEnabled: false, curveSegments: 96 }), black);
ring.rotation.x = -Math.PI / 2;
ring.castShadow = true;
tray.add(ring);

function numbers() {
  const c = document.createElement('canvas');
  c.width = 4096; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#111';
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#e8e6e0';
  g.font = '300 34px Inter, Helvetica, Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  for (let i = 0; i < N; i++) g.fillText(String(i + 1), ((i + 0.5) / N) * c.width, 32);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
const band = new THREE.Mesh(
  new THREE.CylinderGeometry(1.335, 1.335, 0.07, 128, 1, true),
  new THREE.MeshStandardMaterial({ map: numbers(), roughness: 0.6 }),
);
band.position.y = 0.05;
tray.add(band);

// The slides: card mounts standing radially, the picture on both faces.
const GATE = Math.PI / 2; // turns slot 0 to the back, over the lens and towards the wall
const slideMeshes = [];
const mount = mat(0xe9e5da, 0.8);
slides.forEach((s, i) => {
  const holder = new THREE.Group();
  const a = i * STEP;
  holder.rotation.y = -a;
  tray.add(holder);
  const slide = new THREE.Group();
  slide.position.set(0.87, 0.28, 0);
  holder.add(slide);
  const card = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 0.016), mount);
  card.castShadow = true;
  slide.add(card);
  const pic = new THREE.MeshBasicMaterial({ map: texture(s.s), toneMapped: false });
  for (const side of [1, -1]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.44), pic);
    p.position.z = 0.009 * side;
    if (side < 0) p.rotation.y = Math.PI;
    slide.add(p);
  }
  slide.userData.index = i;
  card.userData.index = i;
  slideMeshes.push(slide);
});

// Clear dust cover over the tray.
const cover = new THREE.Mesh(
  new THREE.CylinderGeometry(1.36, 1.36, 0.34, 128, 1, true),
  new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.18, clearcoat: 1, depthWrite: false }),
);
cover.position.y = 0.46;
tray.add(cover);
const lid = new THREE.Mesh(new THREE.ExtrudeGeometry(ringShape, { depth: 0.02, bevelEnabled: false, curveSegments: 96 }), cover.material);
lid.rotation.x = -Math.PI / 2;
lid.position.y = 0.63;
tray.add(lid);
// Clicks go through the cover to the slides.
cover.raycast = lid.raycast = () => {};

// ---- the picture on the wall ------------------------------------------------

// A plane on the camera that always fills the view: the page background.
const WALL = 30;
const wallMat = new THREE.MeshBasicMaterial({ color: 0x000000, toneMapped: false });
const wall = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), wallMat);
wall.position.z = -WALL;
camera.add(wall);

// Projector falloff: darker towards the edges.
function vignette() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(256, 256, 60, 256, 256, 380);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.72)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 512, 512);
  return new THREE.CanvasTexture(c);
}
const shade = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: vignette(), transparent: true, depthWrite: false }));
shade.position.z = -WALL + 0.01;
camera.add(shade);

// The beam: a pyramid from the lens to the corners of the picture, fading out.
const beamGeo = new THREE.BufferGeometry();
beamGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(5 * 3), 3));
beamGeo.setAttribute('fade', new THREE.Float32BufferAttribute([1, 0, 0, 0, 0], 1));
beamGeo.setIndex([0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 1]);
const beam = new THREE.Mesh(beamGeo, new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  side: THREE.DoubleSide,
  blending: THREE.AdditiveBlending,
  uniforms: { strength: { value: 0.09 } },
  vertexShader: 'attribute float fade; varying float vFade; void main() { vFade = fade; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: 'uniform float strength; varying float vFade; void main() { gl_FragColor = vec4(vec3(1.0, 0.95, 0.86) * strength * pow(vFade, 1.6), 1.0); }',
}));
beam.frustumCulled = false;
scene.add(beam);

const large = new Map();
const largeTexture = (i) => {
  if (!large.has(i)) large.set(i, texture(slides[i].l));
  return large.get(i);
};

function fitWall() {
  const h = 2 * WALL * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const w = h * camera.aspect;
  wall.scale.set(w, h, 1);
  shade.scale.set(w, h, 1);
  const map = wallMat.map;
  if (map) {
    const ia = slides[shown].ar;
    const va = w / h;
    // Cover the view, cropping the long side.
    if (ia > va) { map.repeat.set(va / ia, 1); map.offset.set((1 - va / ia) / 2, 0); }
    else { map.repeat.set(1, ia / va); map.offset.set(0, (1 - ia / va) / 2); }
  }
}

// ---- advancing ------------------------------------------------------------------

let current = 0; // slot in the gate
let shown = 0; // picture on the wall
let trayAngle = GATE; // eased towards the target
let dip = 0;
let shutter = 0; // 0 dark .. 1 bright
let shutterTarget = 1;
let swapAt = 0;

const trayTarget = () => GATE + current * STEP;

function go(delta) {
  current = (current + delta + N) % N;
  dip = 1;
  shutterTarget = 0;
  swapAt = performance.now() + 140;
  [-1, 1, 2].forEach((k) => largeTexture((current + k + N) % N));
}

function show(i) {
  shown = i;
  wallMat.map = largeTexture(i);
  wallMat.needsUpdate = true;
  fitWall();
  titleEl.textContent = slides[i].title;
  shutterTarget = 1;
}

// ---- camera views -----------------------------------------------------------

const VIEWS = {
  // The machine low in the frame, so the picture on the wall leads.
  behind: { az: 0.5, el: 0.36, dist: 12, look: new THREE.Vector3(-0.2, 2.1, -1.2) },
  above: { az: 0, el: 1.45, dist: 9, look: new THREE.Vector3(0, TRAY_Y, 0) },
};
const orbit = { az: VIEWS.behind.az, el: VIEWS.behind.el, dist: VIEWS.behind.dist, look: VIEWS.behind.look.clone() };
const orbitTarget = { ...orbit, look: orbit.look.clone() };
const buttons = [...document.querySelectorAll('[data-view]')];

function setView(name) {
  const v = VIEWS[name];
  Object.assign(orbitTarget, { az: v.az, el: v.el, dist: v.dist });
  orbitTarget.look.copy(v.look);
  buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === name)));
}
buttons.forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));

// ---- input ------------------------------------------------------------------------

let wheel = 0;
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  wheel += e.deltaY + e.deltaX;
  if (Math.abs(wheel) > 60) { go(Math.sign(wheel)); wheel = 0; }
}, { passive: false });

addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') go(1);
  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') go(-1);
  if (e.key === 'Enter') location.href = `/work/${slides[shown].slug}/`;
});

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const hits = (e) => {
  pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  return raycaster.intersectObjects([projector, wall], true)[0];
};

let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  drag = { x: e.clientX, y: e.clientY, moved: 0 };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (drag) {
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    if (drag.moved > 6) canvas.classList.add('is-dragging');
    orbitTarget.az -= dx * 0.005;
    orbitTarget.el = THREE.MathUtils.clamp(orbitTarget.el + dy * 0.004, 0.12, 1.5);
    drag.x = e.clientX; drag.y = e.clientY;
    return;
  }
  const hit = hits(e);
  canvas.classList.toggle('is-pointing', !!hit);
});
canvas.addEventListener('pointerup', (e) => {
  const click = drag && drag.moved < 6;
  drag = null;
  canvas.classList.remove('is-dragging');
  if (!click) return;
  const hit = hits(e);
  if (!hit) return;
  if (hit.object === wall) { location.href = `/work/${slides[shown].slug}/`; return; }
  // A click on a slide brings that one to the gate; anywhere else on the machine, the next.
  let o = hit.object;
  while (o && o.userData.index === undefined) o = o.parent;
  if (o) go(((o.userData.index - current + N + N / 2) % N) - N / 2 || 0);
  else go(1);
});

// ---- loop ------------------------------------------------------------------------------

const corners = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
const lensWorld = new THREE.Vector3();

function updateBeam() {
  const pos = beamGeo.getAttribute('position');
  lensGlass.getWorldPosition(lensWorld);
  pos.setXYZ(0, lensWorld.x, lensWorld.y, lensWorld.z);
  // A projector throws a smaller picture than the whole wall: aim the beam at
  // the middle three quarters of it, so it reads as light, not a frame.
  [[-0.38, -0.38], [0.38, -0.38], [0.38, 0.38], [-0.38, 0.38]].forEach(([u, v], k) => {
    corners[k].set(u * wall.scale.x, v * wall.scale.y, -WALL);
    camera.localToWorld(corners[k]);
    pos.setXYZ(k + 1, corners[k].x, corners[k].y, corners[k].z);
  });
  pos.needsUpdate = true;
}

function frame(now) {
  // Tray: ease to the slot, the gate slide dips as it drops in.
  const target = trayTarget();
  let d = target - trayAngle;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  trayAngle += d * 0.14;
  tray.rotation.y = trayAngle;
  dip *= 0.9;
  slideMeshes.forEach((s, i) => { s.position.y = 0.28 - (i === current ? 0.14 * Math.sin(dip * Math.PI) : 0); });

  // Shutter: dark, swap, light.
  if (swapAt && now >= swapAt) { swapAt = 0; show(current); }
  shutter += (shutterTarget - shutter) * (shutterTarget ? 0.14 : 0.35);
  const flicker = shutterTarget && shutter < 0.98 ? 0.94 + Math.random() * 0.06 : 1;
  wallMat.color.setScalar(shutter * flicker * 0.92);
  lensGlass.material.color.setScalar(0.4 + 0.6 * shutter);
  beam.material.uniforms.strength.value = 0.09 * shutter;

  // Camera orbit.
  for (const k of ['az', 'el', 'dist']) orbit[k] += (orbitTarget[k] - orbit[k]) * 0.08;
  orbit.look.lerp(orbitTarget.look, 0.08);
  camera.position.set(
    orbit.look.x + orbit.dist * Math.cos(orbit.el) * Math.sin(orbit.az),
    orbit.look.y + orbit.dist * Math.sin(orbit.el),
    orbit.look.z + orbit.dist * Math.cos(orbit.el) * Math.cos(orbit.az),
  );
  camera.lookAt(orbit.look);
  camera.updateMatrixWorld();

  updateBeam();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.fov = camera.aspect < 1 ? 48 : 32;
  camera.updateProjectionMatrix();
  fitWall();
}
addEventListener('resize', resize);

resize();
show(0);
[1, N - 1].forEach(largeTexture);
requestAnimationFrame(frame);
