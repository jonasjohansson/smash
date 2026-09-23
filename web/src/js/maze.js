// v3: the mark as a labyrinth.
//
// Seen from straight above it is the landing: the letters, with the work
// cutting fast across their tops. Scroll or click and the camera dives into
// a slot and lands on the floor. The letters are now walls 40 m high,
// tiled with the projects as glowing panels that rise into a height fog;
// distance fog closes off the edges. Walk the corridors; click a panel to
// open its project; Up flies back out.
//
// Geometry: the solid walls are the traced mark, extruded. The panels follow
// the slot centre lines from mark.js, offset to each corridor wall, so they
// sit exactly on the faces you walk past. Collision reads a raster of the
// same mark. Light: a low warm sun with soft shadows, sky and ground fill,
// the panels' own glow, GTAO ambient occlusion and a light bloom.

import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { DEFAULTS, UNITS, buildMark, slots } from './mark.js';

const canvas = document.querySelector('[data-maze]');
const hintEl = document.querySelector('[data-hint]');
const titleEl = document.querySelector('[data-title]');
const upEl = document.querySelector('[data-up]');
const slides = JSON.parse(document.getElementById('slides').textContent);

// ---- scale: mark units to metres -------------------------------------------------

const S = 0.15; // a 20-unit slot is a 3 m corridor
const WALL = 40; // m
const EYE = 1.7;
const toWorld = (x, y) => new THREE.Vector2((x - UNITS.w / 2) * S, (y - UNITS.h / 2) * S);
const SKY_LOW = new THREE.Color(0x474c58);
const SKY_HIGH = new THREE.Color(0xe2d3c1);

// ---- renderer --------------------------------------------------------------------------

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
} catch {
  document.body.classList.add('no-webgl');
  throw new Error('WebGL unavailable');
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

// Fog that knows up from down: it takes the sky's colour in the direction you
// look, and thickens with height, so the walls dissolve upward into the sky.
THREE.ShaderChunk.fog_pars_vertex = '#ifdef USE_FOG\n varying float vFogDepth;\n varying vec3 vFogWorld;\n#endif';
THREE.ShaderChunk.fog_vertex = '#ifdef USE_FOG\n vFogDepth = - mvPosition.z;\n vFogWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;\n#endif';
THREE.ShaderChunk.fog_pars_fragment = `#ifdef USE_FOG
 uniform vec3 fogColor;
 varying float vFogDepth;
 varying vec3 vFogWorld;
 uniform float fogDensity;
#endif`;
THREE.ShaderChunk.fog_fragment = `#ifdef USE_FOG
 // Seen from high above, the air is clear enough to read the mark.
 float fogLow = 1.0 - smoothstep(20.0, 90.0, cameraPosition.y);
 vec3 fogDir = normalize(vFogWorld - cameraPosition);
 vec3 fogSky = mix(fogColor, vec3(${SKY_HIGH.r.toFixed(3)}, ${SKY_HIGH.g.toFixed(3)}, ${SKY_HIGH.b.toFixed(3)}), smoothstep(-0.05, 0.7, fogDir.y));
 float fogD = fogDensity * mix(0.15, 1.0, fogLow);
 float fogFactor = 1.0 - exp(- fogD * fogD * vFogDepth * vFogDepth);
 fogFactor = max(fogFactor, smoothstep(10.0, ${WALL.toFixed(1)} + 4.0, vFogWorld.y) * fogLow);
 gl_FragColor.rgb = mix(gl_FragColor.rgb, fogSky, fogFactor);
#endif`;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(SKY_LOW, 0.017);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.25;

const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 900);
camera.rotation.order = 'YXZ';

// Sky: a dome from the horizon's grey up to a warm, bright haze.
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(600, 48, 24),
  new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { low: { value: SKY_LOW }, high: { value: SKY_HIGH } },
    vertexShader: 'varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 low, high; varying vec3 vDir; void main() { gl_FragColor = vec4(mix(low, high, smoothstep(-0.05, 0.7, vDir.y)), 1.0); }',
  }),
);
scene.add(sky);

// Light.
scene.add(new THREE.HemisphereLight(0xcfd6e2, 0x1b1714, 0.55));
const sun = new THREE.DirectionalLight(0xffd8ae, 2.6);
sun.position.set(-40, 70, 25);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 220 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.04;
scene.add(sun, sun.target);

// Floor: dark, a little polished, running out into the fog.
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(900, 900),
  new THREE.MeshStandardMaterial({ color: 0x24221f, roughness: 0.42, metalness: 0 }),
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// ---- the work: an atlas of covers, and the landing's cut on the wall tops ---------------

const COLS = 6;
const CELL = { w: 512, h: 384 };
const atlasCanvas = document.createElement('canvas');
const rows = Math.ceil(slides.length / COLS);
atlasCanvas.width = COLS * CELL.w;
atlasCanvas.height = rows * CELL.h;
const atlas = new THREE.CanvasTexture(atlasCanvas);
atlas.colorSpace = THREE.SRGBColorSpace;
atlas.anisotropy = 8;

const covers = [];
function cover(ctx, img, x, y, w, h) {
  const s = Math.max(w / img.width, h / img.height);
  ctx.drawImage(img, x + (w - img.width * s) / 2, y + (h - img.height * s) / 2, img.width * s, img.height * s);
}
const loaded = Promise.all(slides.map((s, i) => new Promise((resolve) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    covers[i] = img;
    const g = atlasCanvas.getContext('2d');
    g.save();
    g.beginPath();
    g.rect((i % COLS) * CELL.w, Math.floor(i / COLS) * CELL.h, CELL.w, CELL.h);
    g.clip();
    cover(g, img, (i % COLS) * CELL.w, Math.floor(i / COLS) * CELL.h, CELL.w, CELL.h);
    g.restore();
    atlas.needsUpdate = true;
    resolve();
  };
  img.onerror = resolve;
  img.src = s.s;
})));

// The wall tops, seen from above, show the landing's fast cut.
const capCanvas = document.createElement('canvas');
capCanvas.width = 1100;
capCanvas.height = 942;
const capTex = new THREE.CanvasTexture(capCanvas);
capTex.colorSpace = THREE.SRGBColorSpace;
// Extruded caps carry the SVG's own coordinates (2200 × 1888) as UVs.
capTex.repeat.set(1 / 2200, -1 / 1888);
capTex.offset.set(0, 1);
let capIndex = 0;
function cutCap() {
  const ready = covers.filter(Boolean);
  if (!ready.length) return;
  capIndex = (capIndex + 1 + Math.floor(Math.random() * 3)) % ready.length;
  cover(capCanvas.getContext('2d'), ready[capIndex], 0, 0, capCanvas.width, capCanvas.height);
  capTex.needsUpdate = true;
}

// ---- the walls ----------------------------------------------------------------------------

/** Swap two corners of every triangle, after a mirroring transform. */
function flipWinding(geo) {
  for (const name of ['position', 'normal', 'uv']) {
    const a = geo.getAttribute(name);
    if (!a) continue;
    const n = a.itemSize, arr = a.array;
    for (let i = 0; i < arr.length; i += 3 * n) {
      for (let k = 0; k < n; k++) {
        const t = arr[i + n + k];
        arr[i + n + k] = arr[i + 2 * n + k];
        arr[i + 2 * n + k] = t;
      }
    }
  }
}

async function buildWalls() {
  const svg = new SVGLoader().parse(await (await fetch('/brand/smash-logo.svg')).text());
  const shapes = svg.paths.flatMap((p) => SVGLoader.createShapes(p));
  const geo = new THREE.ExtrudeGeometry(shapes, { depth: WALL, bevelEnabled: false, curveSegments: 6 });
  // SVG (x, y down) and extrusion depth → world (x, height, z). The mapping
  // mirrors, so the triangles are turned back afterwards.
  const pos = geo.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const w = toWorld(pos.getX(i) / 4, pos.getY(i) / 4);
    pos.setXYZ(i, w.x, pos.getZ(i), w.y);
  }
  flipWinding(geo);
  geo.computeVertexNormals();
  const walls = new THREE.Mesh(geo, [
    new THREE.MeshStandardMaterial({ map: capTex, roughness: 0.9, emissive: 0xffffff, emissiveMap: capTex, emissiveIntensity: 0.9 }),
    new THREE.MeshStandardMaterial({ color: 0x1b1a1a, roughness: 0.85 }),
  ]);
  walls.castShadow = walls.receiveShadow = true;
  scene.add(walls);
}

// ---- the panels on the corridor walls ------------------------------------------------------

const PANEL = { w: 2.4, h: 1.8, gap: 0.14 };
const ROWS = 16;
const panelProject = [];

function buildPanels() {
  const params = { ...DEFAULTS };
  const half = (params.stroke / 2) * S;
  const positions = [], uvs = [], normals = [];
  const clip = (x, y) => x >= 0 && x <= UNITS.w && y >= 0 && y <= UNITS.h;

  for (const { pts } of slots(params)) {
    for (let k = 0; k < pts.length - 1; k++) {
      // Keep the part of each centre-line segment inside the block.
      let [ax, ay] = pts[k];
      let [bx, by] = pts[k + 1];
      const clampPt = (x, y) => [Math.min(UNITS.w, Math.max(0, x)), Math.min(UNITS.h, Math.max(0, y))];
      if (!clip(ax, ay)) [ax, ay] = clampPt(ax, ay);
      if (!clip(bx, by)) [bx, by] = clampPt(bx, by);
      const a = toWorld(ax, ay), b = toWorld(bx, by);
      const dir = b.clone().sub(a);
      const len = dir.length();
      if (len < PANEL.w) continue;
      dir.normalize();
      const nrm = new THREE.Vector2(-dir.y, dir.x);
      // Stop short of bends and slot ends, where walls turn.
      const inset = half + 0.2;
      const usable = len - 2 * inset;
      const count = Math.floor((usable + PANEL.gap) / (PANEL.w + PANEL.gap));
      if (count < 1) continue;
      const start = inset + (usable - (count * (PANEL.w + PANEL.gap) - PANEL.gap)) / 2;
      for (const side of [1, -1]) {
        // The wall face, and the way it faces: back into the corridor.
        const off = nrm.clone().multiplyScalar(side * (half - 0.08));
        const face = nrm.clone().multiplyScalar(-side);
        for (let i = 0; i < count; i++) {
          const s0 = start + i * (PANEL.w + PANEL.gap);
          let p0 = a.clone().add(dir.clone().multiplyScalar(s0)).add(off);
          let p1 = a.clone().add(dir.clone().multiplyScalar(s0 + PANEL.w)).add(off);
          // Wind so the front faces the corridor.
          if ((p1.x - p0.x) * face.y - (p1.y - p0.y) * face.x < 0) [p0, p1] = [p1, p0];
          for (let r = 0; r < ROWS; r++) {
            const y0 = 0.35 + r * (PANEL.h + PANEL.gap), y1 = y0 + PANEL.h;
            const project = Math.floor(Math.random() * slides.length);
            panelProject.push(project);
            const u0 = (project % COLS) / COLS, u1 = u0 + 1 / COLS;
            const v1 = 1 - Math.floor(project / COLS) / rows, v0 = v1 - 1 / rows;
            positions.push(p0.x, y0, p0.y, p1.x, y0, p1.y, p1.x, y1, p1.y, p0.x, y0, p0.y, p1.x, y1, p1.y, p0.x, y1, p0.y);
            uvs.push(u0, v0, u1, v0, u1, v1, u0, v0, u1, v1, u0, v1);
            for (let n = 0; n < 6; n++) normals.push(face.x, 0, face.y);
          }
        }
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    map: atlas, emissiveMap: atlas, emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.4,
  }));
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

// ---- collision: a raster of the same mark ------------------------------------------------

let solid = null;
async function buildCollision() {
  const svg = buildMark({ ...DEFAULTS, fit: 'stretch', padding: 0, invert: false }, UNITS.w, UNITS.h);
  const img = new Image();
  img.src = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = UNITS.w;
  c.height = UNITS.h;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  solid = g.getImageData(0, 0, UNITS.w, UNITS.h).data;
}
function blocked(x, z) {
  if (!solid) return false;
  const u = Math.round(x / S + UNITS.w / 2), v = Math.round(z / S + UNITS.h / 2);
  if (u < 0 || v < 0 || u >= UNITS.w || v >= UNITS.h) return false;
  return solid[(v * UNITS.w + u) * 4 + 3] > 127;
}
const RADIUS = 0.4;
const free = (x, z) => [0, 1, 2, 3, 4, 5, 6, 7].every((k) => !blocked(x + Math.cos(k * 0.785) * RADIUS, z + Math.sin(k * 0.785) * RADIUS));

// ---- post ------------------------------------------------------------------------------------

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const gtao = new GTAOPass(scene, camera, 1, 1);
gtao.updateGtaoMaterial({ radius: 1.2, distanceExponent: 1.4, thickness: 1.5, scale: 1.1 });
composer.addPass(gtao);
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.32, 0.55, 0.82);
composer.addPass(bloom);
composer.addPass(new OutputPass());
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

// ---- views and the dive -----------------------------------------------------------------------

// Start inside the M's third slot, halfway down, facing the top of the mark.
const ENTRY = toWorld(249.1, 330);
const ABOVE_HEIGHT = 175;
const player = { x: ENTRY.x, z: ENTRY.y, yaw: 0, pitch: 0 };
let mode = 'above'; // above | diving | walk | rising
let t0 = 0;
const DIVE_MS = 3800;

const qAbove = new THREE.Quaternion();
const qWalk = new THREE.Quaternion();
const eAbove = new THREE.Euler(-Math.PI / 2, 0, 0, 'YXZ');
qAbove.setFromEuler(eAbove);

function aboveFov() {
  // Frame the whole mark from overhead, with a little room.
  const need = Math.max((UNITS.h * S) / 2 * 1.12, ((UNITS.w * S) / 2 * 1.12) / camera.aspect);
  return THREE.MathUtils.radToDeg(2 * Math.atan(need / ABOVE_HEIGHT));
}

function placeAbove() {
  camera.position.set(0, ABOVE_HEIGHT, 0);
  camera.quaternion.copy(qAbove);
  camera.fov = aboveFov();
  camera.updateProjectionMatrix();
}

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function dive() {
  if (mode !== 'above') return;
  mode = 'diving';
  t0 = performance.now();
  hintEl.classList.add('is-gone');
}
function rise() {
  if (mode !== 'walk') return;
  mode = 'rising';
  t0 = performance.now();
  upEl.hidden = true;
  titleEl.textContent = '';
}

function animateDive(now) {
  let t = Math.min(1, (now - t0) / DIVE_MS);
  if (mode === 'rising') t = 1 - t;
  const e = ease(t);
  // Over the entry slot first, then straight down into it.
  const across = ease(Math.min(1, t * 1.6));
  const y = THREE.MathUtils.lerp(ABOVE_HEIGHT, EYE, e);
  camera.position.set(player.x * across, y, player.z * across);
  qWalk.setFromEuler(new THREE.Euler(player.pitch, player.yaw, 0, 'YXZ'));
  // Keep looking down until close to the walls, then level out.
  camera.quaternion.slerpQuaternions(qAbove, qWalk, ease(Math.max(0, (t - 0.45) / 0.55)));
  camera.fov = THREE.MathUtils.lerp(aboveFov(), 70, ease(Math.max(0, (t - 0.25) / 0.75)));
  camera.updateProjectionMatrix();
  const done = (now - t0) / DIVE_MS >= 1;
  if (done && mode === 'diving') { mode = 'walk'; upEl.hidden = false; hintEl.textContent = 'Drag to look · scroll or WASD to walk'; hintEl.classList.remove('is-gone'); setTimeout(() => hintEl.classList.add('is-gone'), 4000); }
  if (done && mode === 'rising') { mode = 'above'; hintEl.textContent = 'Scroll to enter'; hintEl.classList.remove('is-gone'); placeAbove(); }
}

// ---- walking -------------------------------------------------------------------------------

const keys = new Set();
addEventListener('keydown', (e) => {
  keys.add(e.code);
  if (mode === 'above' && (e.code === 'Enter' || e.code === 'Space' || e.code === 'ArrowDown')) dive();
  if (mode === 'walk' && e.code === 'Escape') rise();
});
addEventListener('keyup', (e) => keys.delete(e.code));
upEl.addEventListener('click', rise);

let walkImpulse = 0;
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  if (mode === 'above' && e.deltaY > 0) return dive();
  if (mode === 'walk') walkImpulse -= e.deltaY * 0.02;
}, { passive: false });

const velocity = new THREE.Vector2();
function walk(dt) {
  const fwd = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) + walkImpulse;
  const strafe = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
  if (keys.has('ArrowLeft')) player.yaw += 1.6 * dt;
  if (keys.has('ArrowRight')) player.yaw -= 1.6 * dt;
  walkImpulse *= Math.pow(0.02, dt);
  const speed = 4.2;
  const sin = Math.sin(player.yaw), cos = Math.cos(player.yaw);
  const want = new THREE.Vector2(-sin * fwd + cos * strafe, -cos * fwd - sin * strafe).multiplyScalar(speed);
  velocity.lerp(want, 1 - Math.pow(0.001, dt));
  // Move along each axis on its own, so walls are slid along, not stuck to.
  const nx = player.x + velocity.x * dt;
  if (free(nx, player.z)) player.x = nx; else velocity.x = 0;
  const nz = player.z + velocity.y * dt;
  if (free(player.x, nz)) player.z = nz; else velocity.y = 0;
  const bob = Math.sin(performance.now() / 180) * Math.min(1, velocity.length() / speed) * 0.025;
  camera.position.set(player.x, EYE + bob, player.z);
  camera.quaternion.setFromEuler(new THREE.Euler(player.pitch, player.yaw, 0, 'YXZ'));
}

// Drag to look; a click (no drag) on a panel opens its project.
let drag = null;
let panels = null;
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
function panelUnder(e) {
  if (!panels || mode !== 'walk') return null;
  pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObject(panels, false)[0];
  if (!hit || hit.distance > 30) return null;
  return slides[panelProject[Math.floor(hit.faceIndex / 2)]];
}
canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, moved: 0 }; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', (e) => {
  if (drag) {
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    if (drag.moved > 5) canvas.classList.add('is-dragging');
    if (mode === 'walk') {
      player.yaw -= dx * 0.0032;
      player.pitch = THREE.MathUtils.clamp(player.pitch - dy * 0.0032, -1.2, 1.35);
    }
    drag.x = e.clientX; drag.y = e.clientY;
    return;
  }
  const p = panelUnder(e);
  canvas.classList.toggle('is-pointing', !!p);
  titleEl.textContent = p ? p.title : '';
});
canvas.addEventListener('pointerup', (e) => {
  const click = drag && drag.moved < 5;
  drag = null;
  canvas.classList.remove('is-dragging');
  if (!click) return;
  if (mode === 'above') return dive();
  const p = panelUnder(e);
  if (p) location.href = `/work/${p.slug}/`;
});

// ---- loop ------------------------------------------------------------------------------------

let last = performance.now();
let lastCut = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (mode === 'above' || mode === 'diving' || mode === 'rising') {
    if (now - lastCut > 90) { cutCap(); lastCut = now; }
  }
  if (mode === 'diving' || mode === 'rising') animateDive(now);
  if (mode === 'walk') walk(dt);
  sky.position.copy(camera.position);
  composer.render();
  requestAnimationFrame(frame);
}

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  gtao.setSize(w, h);
  bloom.setSize(w, h);
  camera.aspect = w / h;
  if (mode === 'above') camera.fov = aboveFov();
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);

resize();
placeAbove();
await Promise.all([buildWalls(), buildCollision()]);
panels = buildPanels();
requestAnimationFrame(frame);
loaded.then(() => { atlas.needsUpdate = true; });
if (location.hash === '#inside') { mode = 'diving'; t0 = performance.now() - DIVE_MS; }
