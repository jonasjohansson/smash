// v3: the mark as a labyrinth.
//
// From far above, through a long lens, it reads flat: the mark. Scroll, click
// or Enter and the camera descends, the lens widening as it drops, until you
// stand in a slot. Every corridor wall is a projection surface, mapped edge
// to edge with the work, rising into a height fog; every few seconds a wall
// cues its next project with a soft wipe. The floors are wet and polished,
// reflecting the projections (screen-space reflections). Each letter's
// corridors are their own place:
//
//   S  cobblestones, warm fireflies
//   M  forest floor, pollen rising, low mist
//   A  a shallow water channel over river pebbles, cool motes above it
//   S  sand, dust drifting along the corridor
//   H  polished terrazzo, ash falling slowly
//
// Light comes from an HDRI sky: the sun's direction and colour, and the fog's
// colours, are read from the image itself. Post: SSR, GTAO ambient occlusion,
// bloom, ACES, vignette and grain, SMAA. H opens the settings.
//
// Geometry follows mark.js: walls are the traced mark extruded; floors, prints
// and particles follow the slot centre lines; collision reads its raster.

import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { SSRPass } from 'three/addons/postprocessing/SSRPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { DEFAULTS, UNITS, buildMark, slots } from './mark.js';

const canvas = document.querySelector('[data-maze]');
const hintEl = document.querySelector('[data-hint]');
const titleEl = document.querySelector('[data-title]');
const upEl = document.querySelector('[data-up]');
const slides = JSON.parse(document.getElementById('slides').textContent);
const ASSETS = '/assets/v3';
const mobile = matchMedia('(max-width: 720px)').matches;

// ---- settings (H) --------------------------------------------------------------------

const SKIES = {
  'partly cloudy': 'kloofendal_48d_partly_cloudy_puresky',
  sunset: 'belfast_sunset_puresky',
  overcast: 'overcast_soil_puresky',
};
const SETTINGS = {
  sky: 'partly cloudy',
  exposure: 1.0,
  skyBrightness: 1.0,
  environment: 0.6,
  sunIntensity: 3.2,
  sunAzimuth: 0, // read from the sky
  sunElevation: 0,
  fogDensity: 0.016,
  fogHeight: 30,
  wallHeight: 16,
  projection: 1.0, // brightness of the mapped walls
  motion: 1, // how much the mapped content drifts
  change: 22, // seconds between cues, per wall
  reflections: 0.7,
  gloss: 0.06, // clearcoat roughness of the floors: lower is wetter
  particles: 1,
  particleSize: 1,
  particleSpeed: 1,
  mist: 0.35,
  water: true,
  ao: true,
  aoRadius: 1.4,
  bloom: 0.28,
  vignette: 0.35,
  grain: 0.035,
  fov: 68,
  eye: 1.7,
  speed: 4.2,
  bob: 1,
  sensitivity: 1,
  resolution: mobile ? 1 : 1.5,
  shadows: true,
};
const STORE = 'smash-v3';
const settings = { ...SETTINGS };
try { Object.assign(settings, JSON.parse(localStorage.getItem(STORE) || '{}')); } catch {}
const save = () => { try { localStorage.setItem(STORE, JSON.stringify(settings)); } catch {} };

// ---- scale ------------------------------------------------------------------------------

const S = 0.15; // metres per mark unit: a 20-unit slot is a 3 m corridor
const toWorld = (x, y) => new THREE.Vector2((x - UNITS.w / 2) * S, (y - UNITS.h / 2) * S);
const BLOCK = { w: UNITS.w * S, h: UNITS.h * S };

// ---- renderer --------------------------------------------------------------------------

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
} catch {
  document.body.classList.add('no-webgl');
  throw new Error('WebGL unavailable');
}
renderer.setPixelRatio(Math.min(devicePixelRatio, settings.resolution));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = settings.exposure;
renderer.shadowMap.enabled = settings.shadows;
renderer.shadowMap.type = THREE.PCFShadowMap;
const maxAniso = renderer.capabilities.getMaxAnisotropy();

// Fog that knows up from down: it takes the sky's colour in the direction you
// look and thickens with height, so the walls dissolve upward into the sky.
// Seen from high above it clears, so the mark reads.
const fogShared = { fogSkyColor: { value: new THREE.Color() }, fogTop: { value: settings.fogHeight } };
THREE.ShaderChunk.fog_pars_vertex = '#ifdef USE_FOG\n varying float vFogDepth;\n varying vec3 vFogWorld;\n#endif';
THREE.ShaderChunk.fog_vertex = '#ifdef USE_FOG\n vFogDepth = - mvPosition.z;\n vFogWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;\n#endif';
THREE.ShaderChunk.fog_pars_fragment = `#ifdef USE_FOG
 uniform vec3 fogColor, fogSkyColor;
 uniform float fogDensity, fogTop;
 varying float vFogDepth;
 varying vec3 vFogWorld;
#endif`;
THREE.ShaderChunk.fog_fragment = `#ifdef USE_FOG
 float fogLow = 1.0 - smoothstep(40.0, 200.0, cameraPosition.y);
 vec3 fogDir = normalize(vFogWorld - cameraPosition);
 vec3 fogSky = mix(fogColor, fogSkyColor, smoothstep(-0.05, 0.55, fogDir.y));
 float fogD = fogDensity * fogLow;
 float fogFactor = 1.0 - exp(- fogD * fogD * vFogDepth * vFogDepth);
 fogFactor = max(fogFactor, smoothstep(fogTop * 0.25, fogTop, vFogWorld.y) * fogLow);
 gl_FragColor.rgb = mix(gl_FragColor.rgb, fogSky, fogFactor);
#endif`;
/** Every lit material shares the fog's extra uniforms. */
function fogged(material) {
  material.onBeforeCompile = (shader) => Object.assign(shader.uniforms, fogShared);
  return material;
}

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x777777, settings.fogDensity);
scene.backgroundBlurriness = 0.18;

const camera = new THREE.PerspectiveCamera(settings.fov, 1, 0.1, 5000);

const hemi = new THREE.HemisphereLight(0xffffff, 0x2a241e, 0.25);
const sun = new THREE.DirectionalLight(0xffffff, settings.sunIntensity);
sun.castShadow = true;
sun.shadow.mapSize.set(mobile ? 1024 : 4096, mobile ? 1024 : 4096);
Object.assign(sun.shadow.camera, { left: -58, right: 58, top: 58, bottom: -58, near: 1, far: 400 });
sun.shadow.bias = -0.0003;
sun.shadow.normalBias = 0.05;
scene.add(hemi, sun, sun.target);
const sunOffset = new THREE.Vector3(0, 180, 0);

function placeSun() {
  const az = THREE.MathUtils.degToRad(settings.sunAzimuth);
  const el = THREE.MathUtils.degToRad(Math.max(8, settings.sunElevation));
  sunOffset.set(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)).multiplyScalar(180);
  sun.intensity = settings.sunIntensity;
}

// ---- the sky ---------------------------------------------------------------------------

const pmrem = new THREE.PMREMGenerator(renderer);
const hdrLoader = new HDRLoader().setDataType(THREE.FloatType);
let envMap = null;
let skyColors = { horizon: new THREE.Color(0.5, 0.5, 0.5), high: new THREE.Color(0.7, 0.7, 0.75) };

/** Mean colour of a band of rows, as fractions of the height from the top. */
function band(img, from, to) {
  const { data, width, height } = img;
  const c = new THREE.Color(0, 0, 0);
  let n = 0;
  for (let y = Math.floor(from * height); y < Math.floor(to * height); y++) {
    for (let x = 0; x < width; x += 2) {
      const i = (y * width + x) * 4;
      c.r += Math.min(data[i], 4); c.g += Math.min(data[i + 1], 4); c.b += Math.min(data[i + 2], 4);
      n++;
    }
  }
  return c.multiplyScalar(1 / n);
}

async function loadSky(name, setSun) {
  const tex = await hdrLoader.loadAsync(`${ASSETS}/sky/${SKIES[name]}.hdr`);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  const img = tex.image;

  // The sun: the brightest texel in the upper half.
  let best = -1, bx = 0, by = 0;
  for (let y = 0; y < img.height / 2; y++) {
    for (let x = 0; x < img.width; x++) {
      const i = (y * img.width + x) * 4;
      const l = img.data[i] * 0.2126 + img.data[i + 1] * 0.7152 + img.data[i + 2] * 0.0722;
      if (l > best) { best = l; bx = x; by = y; }
    }
  }
  const i = (by * img.width + bx) * 4;
  sun.color.setRGB(img.data[i], img.data[i + 1], img.data[i + 2]);
  sun.color.multiplyScalar(1 / Math.max(sun.color.r, sun.color.g, sun.color.b, 1e-4)).lerp(new THREE.Color(1, 1, 1), 0.35);
  if (setSun) {
    // Equirectangular: u = atan(z, x) / 2π + ½, v = asin(y) / π + ½, row 0 at the top.
    settings.sunAzimuth = Math.round(THREE.MathUtils.radToDeg((bx / img.width - 0.5) * Math.PI * 2));
    settings.sunElevation = Math.round(THREE.MathUtils.radToDeg((0.5 - by / img.height) * Math.PI));
  }

  // Fog: the horizon's colour low down, the sky's higher up.
  skyColors = { horizon: band(img, 0.45, 0.5), high: band(img, 0.12, 0.3) };
  hemi.color.copy(skyColors.high).multiplyScalar(1 / Math.max(skyColors.high.r, skyColors.high.g, skyColors.high.b, 1e-4));

  envMap?.dispose();
  envMap = pmrem.fromEquirectangular(tex).texture;
  scene.environment = envMap;
  scene.background = tex;
  applyLook();
  placeSun();
}

function applyLook() {
  renderer.toneMappingExposure = settings.exposure;
  scene.backgroundIntensity = settings.skyBrightness;
  scene.environmentIntensity = settings.environment;
  scene.fog.density = settings.fogDensity;
  scene.fog.color.copy(skyColors.horizon).multiplyScalar(settings.skyBrightness);
  fogShared.fogSkyColor.value.copy(skyColors.high).multiplyScalar(settings.skyBrightness);
  fogShared.fogTop.value = settings.fogHeight;
}

// ---- materials ---------------------------------------------------------------------------

const texLoader = new THREE.TextureLoader();
function pbr(id, { repeat = 4, tint = 0xffffff, rough = 1, coat = 0 } = {}) {
  const load = (map, srgb) => {
    const t = texLoader.load(`${ASSETS}/tex/${id}_${map}.jpg`);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = maxAniso;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const arm = load('arm'); // ambient occlusion, roughness, metalness in r, g, b
  // A clear coat over the texture: wet stone, polished concrete.
  const m = new THREE.MeshPhysicalMaterial({
    map: load('diff', true), normalMap: load('nor'), aoMap: arm, roughnessMap: arm, metalnessMap: arm,
    color: tint, roughness: rough, metalness: 1,
    clearcoat: coat, clearcoatRoughness: settings.gloss, envMapIntensity: 1,
  });
  m.userData.coat = coat;
  m.userData.repeat = repeat; // metres per tile, for the world-space UVs
  return fogged(m);
}

const ZONES = [
  { floor: pbr('cobblestone_floor_04', { repeat: 3.2, rough: 0.6, coat: 1 }), particle: { mode: 0, color: 0xffc27a, count: 360, size: 0.9 } },
  { floor: pbr('forest_ground_04', { repeat: 3.6, rough: 0.75, coat: 0.8 }), particle: { mode: 1, color: 0xf3f0d8, count: 900, size: 0.55 } },
  { floor: pbr('ganges_river_pebbles', { repeat: 2.4, rough: 0.5, coat: 1 }), particle: { mode: 2, color: 0xbfe3ff, count: 500, size: 0.6 } },
  { floor: pbr('coast_sand_01', { repeat: 4, rough: 0.6, coat: 1 }), particle: { mode: 3, color: 0xffe2b8, count: 1100, size: 0.4 } },
  { floor: pbr('terrazzo_tiles', { repeat: 2.5, rough: 0.35, coat: 1 }), particle: { mode: 4, color: 0xeae7e2, count: 700, size: 0.55 } },
];
// Which letter each slot of mark.js belongs to, in its order.
const SLOT_ZONE = [0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4];

// ---- ground and floors ------------------------------------------------------------------------

/** World-space UVs on a flat XZ mesh, in tiles of `repeat` metres. */
function planarUV(geo, repeat) {
  const pos = geo.getAttribute('position');
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = pos.getX(i) / repeat;
    uv[i * 2 + 1] = pos.getZ(i) / repeat;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}
function flatUp(geo) {
  const n = new Float32Array(geo.getAttribute('position').count * 3);
  for (let i = 1; i < n.length; i += 3) n[i] = 1;
  geo.setAttribute('normal', new THREE.BufferAttribute(n, 3));
}

const grass = pbr('sparse_grass', { repeat: 5, tint: 0xb9b3a4, coat: 0.5 });
const groundGeo = new THREE.PlaneGeometry(1600, 1600).rotateX(-Math.PI / 2);
planarUV(groundGeo, 5);
const ground = new THREE.Mesh(groundGeo, grass);
ground.position.y = -0.03;
ground.receiveShadow = true;
scene.add(ground);

const params = { ...DEFAULTS };
const HALF = (params.stroke / 2) * S;
const inBlock = ([x, y]) => [Math.min(UNITS.w, Math.max(0, x)), Math.min(UNITS.h, Math.max(0, y))];

/** Each slot's straight runs, clipped to the block, in world metres. */
// Each end is a bend (walls meet) or a stop (a slot end, a crossbar, the block edge).
const RUNS = [];
slots(params).forEach(({ pts, start, end }, slot) => {
  for (let k = 0; k < pts.length - 1; k++) {
    const a = toWorld(...inBlock(pts[k])), b = toWorld(...inBlock(pts[k + 1]));
    if (a.distanceTo(b) < 0.5) continue;
    const kindA = k === 0 ? start : 'bend', kindB = k === pts.length - 2 ? end : 'bend';
    RUNS.push({ a, b, zone: SLOT_ZONE[slot], bendA: kindA === 'bend', bendB: kindB === 'bend' });
  }
});

function strip(a, b, halfWidth, y, extend) {
  const dir = b.clone().sub(a).normalize();
  const n = new THREE.Vector2(-dir.y, dir.x).multiplyScalar(halfWidth);
  const a2 = a.clone().sub(dir.clone().multiplyScalar(extend)), b2 = b.clone().add(dir.clone().multiplyScalar(extend));
  const c = [a2.clone().add(n), b2.clone().add(n), b2.clone().sub(n), a2.clone().sub(n)];
  return [c[0], c[1], c[2], c[0], c[2], c[3]].flatMap((p) => [p.x, y, p.y]);
}

const reflective = [ground];
function buildFloors() {
  ZONES.forEach((zone, z) => {
    const pos = RUNS.filter((r) => r.zone === z).flatMap((r) => strip(r.a, r.b, HALF + 0.25, 0.002 * (z + 1), HALF + 0.25));
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    flatUp(geo);
    planarUV(geo, zone.floor.userData.repeat);
    zone.floor.side = THREE.DoubleSide;
    const mesh = new THREE.Mesh(geo, zone.floor);
    mesh.receiveShadow = true;
    scene.add(mesh);
    reflective.push(mesh);
  });
}

// The water channel in the A: dark, glassy, its surface slowly moving.
function waterNormal() {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const img = g.createImageData(size, size);
  const h = (x, y) => {
    const u = (x / size) * Math.PI * 2, v = (y / size) * Math.PI * 2;
    return Math.sin(u * 3 + Math.sin(v * 2) * 1.3) * 0.5 + Math.sin(v * 5 + u * 2) * 0.3 + Math.sin((u + v) * 7) * 0.15;
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = new THREE.Vector3(-(h(x + 1, y) - h(x - 1, y)) * 2, -(h(x, y + 1) - h(x, y - 1)) * 2, 1).normalize();
      const i = (y * size + x) * 4;
      img.data[i] = (n.x * 0.5 + 0.5) * 255; img.data[i + 1] = (n.y * 0.5 + 0.5) * 255; img.data[i + 2] = (n.z * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
const waterNormals = waterNormal();
const waterMat = fogged(new THREE.MeshPhysicalMaterial({
  color: 0x0c1717, roughness: 0.03, metalness: 0, transparent: true, opacity: 0.78, side: THREE.DoubleSide,
  normalMap: waterNormals, normalScale: new THREE.Vector2(0.18, 0.18), envMapIntensity: 1.4, clearcoat: 1,
}));
let water = null;
function buildWater() {
  const pos = RUNS.filter((r) => r.zone === 2).flatMap((r) => strip(r.a, r.b, HALF - 0.05, 0.1, HALF - 0.05));
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  flatUp(geo);
  planarUV(geo, 6);
  water = new THREE.Mesh(geo, waterMat);
  water.visible = settings.water;
  scene.add(water);
  reflective.push(water);
}

// ---- walls -------------------------------------------------------------------------------------

const concrete = pbr('concrete_layers_02', { repeat: 6, tint: 0x5a5856, rough: 0.5, coat: 1 });
const cap = pbr('concrete_layers_02', { repeat: 6, tint: 0x2a2927, rough: 0.5, coat: 1 });

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

let markShapes = null;
let walls = null;
async function buildWalls() {
  // createShapes honours the SVG's fill rule: the slots stay holes.
  markShapes ??= new SVGLoader().parse(await (await fetch('/brand/smash-logo.svg')).text()).paths.flatMap((p) => SVGLoader.createShapes(p));
  if (walls) { scene.remove(walls); walls.geometry.dispose(); }
  const geo = new THREE.ExtrudeGeometry(markShapes, { depth: settings.wallHeight, bevelEnabled: false, curveSegments: 6 });
  const pos = geo.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const w = toWorld(pos.getX(i) / 4, pos.getY(i) / 4);
    pos.setXYZ(i, w.x, pos.getZ(i), w.y);
  }
  flipWinding(geo);
  geo.computeVertexNormals();
  // UVs by face direction: tops in plan, sides along the wall and up it.
  const nrm = geo.getAttribute('normal');
  const uv = geo.getAttribute('uv');
  const r = concrete.userData.repeat;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    if (Math.abs(nrm.getY(i)) > 0.5) uv.setXY(i, x / r, z / r);
    else if (Math.abs(nrm.getX(i)) > Math.abs(nrm.getZ(i))) uv.setXY(i, z / r, y / r);
    else uv.setXY(i, x / r, y / r);
  }
  walls = new THREE.Mesh(geo, [cap, concrete]);
  walls.castShadow = walls.receiveShadow = true;
  scene.add(walls);
}

// ---- the work: every corridor wall mapped edge to edge -------------------------------------

const projTextures = slides.map(() => null);
function projTexture(i) {
  if (!projTextures[i]) {
    const t = texLoader.load(mobile ? slides[i].s : slides[i].l);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = maxAniso;
    projTextures[i] = t;
  }
  return projTextures[i];
}

const projUniforms = { uTime: { value: 0 }, uBright: { value: settings.projection }, uMotion: { value: settings.motion } };
const PROJ_VERT = `
  varying vec2 vUv;
  #include <fog_pars_vertex>
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    #ifdef USE_FOG
      vFogDepth = -mv.z;
      vFogWorld = (modelMatrix * vec4(position, 1.0)).xyz;
    #endif
    gl_Position = projectionMatrix * mv;
  }`;
const PROJ_FRAG = `
  uniform sampler2D uA, uB;
  uniform vec4 uRectA, uRectB;
  uniform float uMix, uTime, uBright, uMotion, uSeed;
  varying vec2 vUv;
  #include <fog_pars_fragment>
  // The content drifts slowly inside its crop, as mapped content does.
  vec2 drift(vec4 r) {
    float z = 1.0 + 0.07 * uMotion * (0.5 + 0.5 * sin(uTime * 0.045 + uSeed * 6.3));
    vec2 c = mix(r.xy, r.zw, 0.5) + vec2(sin(uTime * 0.031 + uSeed * 4.1), cos(uTime * 0.026 + uSeed * 2.7)) * 0.018 * uMotion;
    return c + (vUv - 0.5) * (r.zw - r.xy) / z;
  }
  void main() {
    vec3 a = texture2D(uA, drift(uRectA)).rgb;
    vec3 b = texture2D(uB, drift(uRectB)).rgb;
    // A cue: the next work wipes along the wall behind a thin line of light.
    float front = uMix * 1.1 - 0.05;
    // (smoothstep needs edge0 < edge1; reversed edges are undefined in GLSL.)
    float w = 1.0 - smoothstep(front - 0.035, front + 0.035, vUv.x);
    vec3 col = mix(a, b, w);
    float live = step(0.001, uMix) * step(uMix, 0.999);
    col += vec3(1.0, 0.98, 0.95) * exp(-pow((vUv.x - front) * 70.0, 2.0)) * 0.55 * live;
    // A projector's throw: a touch brighter at eye height, falling off above.
    col *= uBright * mix(1.0, 0.78, smoothstep(0.1, 0.9, vUv.y));
    gl_FragColor = vec4(col, 1.0);
    #include <fog_fragment>
  }`;

let projection = new THREE.Group();
scene.add(projection);
const faces = [];

function buildProjection() {
  scene.remove(projection);
  projection.traverse((o) => { o.geometry?.dispose(); o.material?.dispose?.(); });
  projection = new THREE.Group();
  faces.length = 0;
  const order = [...slides.keys()].sort(() => Math.random() - 0.5);
  let next = 0;
  const top = settings.wallHeight + 0.4;

  for (const run of RUNS) {
    const { a, b } = run;
    const dir = b.clone().sub(a);
    const len = dir.length();
    dir.normalize();
    const nrm = new THREE.Vector2(-dir.y, dir.x);
    // Reach into bends so neighbouring walls meet; stop short of slot ends.
    const ea = run.bendA ? HALF - 0.03 : -0.02, eb = run.bendB ? HALF - 0.03 : -0.02;
    for (const side of [1, -1]) {
      const off = nrm.clone().multiplyScalar(side * (HALF - 0.06));
      const face = nrm.clone().multiplyScalar(-side);
      let p0 = a.clone().sub(dir.clone().multiplyScalar(ea)).add(off);
      let p1 = b.clone().add(dir.clone().multiplyScalar(eb)).add(off);
      if ((p1.x - p0.x) * face.y - (p1.y - p0.y) * face.x < 0) [p0, p1] = [p1, p0];
      const w = p0.distanceTo(p1);
      if (w < 1) continue;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute([p0.x, 0, p0.y, p1.x, 0, p1.y, p1.x, top, p1.y, p0.x, 0, p0.y, p1.x, top, p1.y, p0.x, top, p0.y], 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1], 2));
      geo.computeVertexNormals(); // the AO and reflection passes read normals
      const f = { aspect: w / top, k: order[next++ % order.length], nextAt: 0, mix: -1 };
      const mat = new THREE.ShaderMaterial({
        fog: true,
        uniforms: {
          ...THREE.UniformsLib.fog, ...fogShared, ...projUniforms,
          uA: { value: projTexture(f.k) }, uB: { value: projTexture(f.k) },
          uRectA: { value: rect(f.k, f.aspect) }, uRectB: { value: rect(f.k, f.aspect) },
          uMix: { value: 0 }, uSeed: { value: Math.random() },
        },
        vertexShader: PROJ_VERT,
        fragmentShader: PROJ_FRAG,
        // Always win over the concrete it covers, even at grazing angles.
        polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.userData.face = faces.length;
      f.mesh = mesh;
      f.nextAt = performance.now() + (4 + Math.random() * settings.change) * 1000;
      faces.push(f);
      projection.add(mesh);
    }
  }
  scene.add(projection);
}

/** The part of an image that covers a surface of the given aspect, as (u0, v0, u1, v1). */
function rect(k, aspect) {
  const ia = slides[k].ar || 1.5;
  return ia > aspect
    ? new THREE.Vector4(0.5 - aspect / ia / 2, 0, 0.5 + aspect / ia / 2, 1)
    : new THREE.Vector4(0, 0.5 - ia / aspect / 2, 1, 0.5 + ia / aspect / 2);
}

const CUE_MS = 2400;
function updateProjection(now) {
  for (const f of faces) {
    const u = f.mesh.material.uniforms;
    if (f.mix < 0 && now >= f.nextAt) {
      // Cue another work, not one already on a wall nearby in the list.
      let k = f.k;
      while (k === f.k) k = Math.floor(Math.random() * slides.length);
      u.uB.value = projTexture(k);
      u.uRectB.value = rect(k, f.aspect);
      f.k = k;
      f.mix = 0;
      f.start = now;
    }
    if (f.mix >= 0) {
      f.mix = Math.min(1, (now - f.start) / CUE_MS);
      u.uMix.value = f.mix < 0.5 ? 2 * f.mix * f.mix : 1 - Math.pow(-2 * f.mix + 2, 2) / 2;
      if (f.mix >= 1) {
        u.uA.value = u.uB.value;
        u.uRectA.value = u.uRectB.value;
        u.uMix.value = 0;
        f.mix = -1;
        f.nextAt = now + (settings.change * (0.7 + Math.random() * 0.6)) * 1000;
      }
    }
  }
}

// ---- particles: one quiet system per zone -------------------------------------------------------

const particleUniforms = {
  uTime: { value: 0 }, uSpeed: { value: settings.particleSpeed }, uSize: { value: settings.particleSize },
  uPixel: { value: 1 }, uCamY: { value: 0 },
};
let particles = new THREE.Group();
scene.add(particles);

function buildParticles() {
  scene.remove(particles);
  particles.traverse((o) => o.geometry?.dispose());
  particles = new THREE.Group();
  ZONES.forEach((zone, z) => {
    const zr = RUNS.filter((r) => r.zone === z);
    const total = zr.reduce((s, r) => s + r.a.distanceTo(r.b), 0);
    const count = Math.round(zone.particle.count * settings.particles * (mobile ? 0.5 : 1));
    if (!count) return;
    const pos = new Float32Array(count * 3), seed = new Float32Array(count * 4), flow = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      let pick = Math.random() * total, r = zr[0];
      for (const run of zr) { const l = run.a.distanceTo(run.b); if (pick <= l) { r = run; break; } pick -= l; }
      const dir = r.b.clone().sub(r.a).normalize();
      const p = r.a.clone().lerp(r.b, Math.random()).add(new THREE.Vector2(-dir.y, dir.x).multiplyScalar((Math.random() - 0.5) * 2 * (HALF - 0.4)));
      pos.set([p.x, 0, p.y], i * 3);
      seed.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
      flow.set([dir.x, 0, dir.y], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('seed', new THREE.BufferAttribute(seed, 4));
    geo.setAttribute('flow', new THREE.BufferAttribute(flow, 3));
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { ...particleUniforms, uColor: { value: new THREE.Color(zone.particle.color) }, uMode: { value: zone.particle.mode }, uBase: { value: zone.particle.size } },
      vertexShader: `
        uniform float uTime, uSpeed, uSize, uPixel, uBase, uCamY;
        uniform int uMode;
        attribute vec4 seed;
        attribute vec3 flow;
        varying float vAlpha;
        void main() {
          float t = uTime * uSpeed;
          vec3 p = position;
          float a = 1.0;
          float ph = seed.x * 6.2832;
          if (uMode == 0) {        // fireflies: wander low, and blink
            p.y = 0.4 + seed.y * 2.6;
            p += vec3(sin(t * 0.31 + ph) * 1.1, sin(t * 0.43 + seed.z * 6.3) * 0.35, cos(t * 0.27 + seed.w * 6.3) * 1.1);
            a = pow(0.5 + 0.5 * sin(t * 1.7 + seed.w * 40.0), 6.0);
          } else if (uMode == 1) { // pollen: rising slowly, swaying
            p.y = mod(seed.y * 14.0 + t * (0.12 + 0.1 * seed.z), 14.0);
            p.xz += vec2(sin(t * 0.4 + ph), cos(t * 0.33 + ph)) * 0.5;
            a = smoothstep(0.0, 1.0, p.y) * (1.0 - smoothstep(9.0, 14.0, p.y)) * 0.55;
          } else if (uMode == 2) { // motes: hovering over the water
            p.y = 0.25 + seed.y * 1.4 + sin(t * 0.5 + ph) * 0.12;
            p.xz += vec2(sin(t * 0.18 + ph), cos(t * 0.21 + ph)) * 0.8;
            a = 0.45 + 0.55 * pow(0.5 + 0.5 * sin(t * 0.9 + seed.w * 20.0), 3.0);
          } else if (uMode == 3) { // dust: drifting along the corridor
            float d = mod(seed.y * 30.0 + t * (0.25 + 0.2 * seed.z), 30.0) - 15.0;
            p += flow * d;
            p.y = 0.3 + seed.w * 7.0 + sin(t * 0.3 + ph) * 0.4;
            a = 0.35 * (1.0 - smoothstep(10.0, 15.0, abs(d)));
          } else {                 // ash: falling slowly
            float top = 22.0;
            p.y = top - mod(seed.y * top + t * (0.22 + 0.15 * seed.z), top);
            p.xz += vec2(sin(t * 0.35 + ph + p.y * 0.3), cos(t * 0.29 + ph + p.y * 0.25)) * 0.9;
            a = 0.6 * smoothstep(0.0, 1.5, p.y);
          }
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          float dist = -mv.z;
          gl_PointSize = uBase * uSize * uPixel * (0.6 + 0.8 * seed.z) * 38.0 / max(dist, 0.5);
          // Only near the ground: gone when seen from the air, and in the distance.
          vAlpha = a * (1.0 - smoothstep(18.0, 60.0, dist)) * (1.0 - smoothstep(20.0, 60.0, uCamY));
        }`,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vAlpha;
        void main() {
          float r = length(gl_PointCoord - 0.5);
          float soft = 1.0 - smoothstep(0.0, 0.5, r);
          gl_FragColor = vec4(uColor * soft * soft * vAlpha * 1.6, 1.0);
        }`,
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    particles.add(pts);
  });
  scene.add(particles);
}

// ---- mist: a thin sheet of moving haze at the feet -----------------------------------------

const fx = []; // mist and particles: seen, but not surfaces for AO or reflections
const mistUniforms = { uTime: { value: 0 }, uAmount: { value: settings.mist }, uColor: { value: new THREE.Color() }, uCamY: { value: 0 } };
for (const [y, scale] of [[0.3, 1]]) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(BLOCK.w + 40, BLOCK.h + 40).rotateX(-Math.PI / 2),
    new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { ...mistUniforms, uScale: { value: scale } },
      vertexShader: 'varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: `
        uniform float uTime, uAmount, uScale, uCamY;
        uniform vec3 uColor;
        varying vec3 vW;
        float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float n(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
        float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * n(p); p *= 2.03; a *= 0.5; } return s; }
        void main() {
          vec2 p = vW.xz * 0.06;
          float f = fbm(p + vec2(uTime * 0.012, uTime * 0.007)) * fbm(p * 1.7 - vec2(uTime * 0.009, 0.0));
          float a = smoothstep(0.12, 0.55, f) * uAmount * 0.55 * uScale;
          a *= 1.0 - smoothstep(10.0, 40.0, uCamY);
          gl_FragColor = vec4(uColor, a);
        }`,
    }),
  );
  m.position.y = y;
  scene.add(m);
  fx.push(m);
}

// ---- collision ---------------------------------------------------------------------------------------

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
  if (Math.hypot(x, z) > 160) return true;
  if (!solid) return false;
  const u = Math.round(x / S + UNITS.w / 2), v = Math.round(z / S + UNITS.h / 2);
  if (u < 0 || v < 0 || u >= UNITS.w || v >= UNITS.h) return false;
  return solid[(v * UNITS.w + u) * 4 + 3] > 127;
}
const RADIUS = 0.45;
const free = (x, z) => [0, 1, 2, 3, 4, 5, 6, 7].every((k) => !blocked(x + Math.cos(k * 0.785) * RADIUS, z + Math.sin(k * 0.785) * RADIUS));

// ---- post ---------------------------------------------------------------------------------------------

const composer = new EffectComposer(renderer);
// Screen-space reflections on the floors and water (it renders the scene too).
const ssr = new SSRPass({ renderer, scene, camera, width: 1, height: 1, selects: reflective });
ssr.thickness = 0.4;
ssr.infiniteThick = false;
ssr.maxDistance = 60;
ssr.blur = true;
composer.addPass(ssr);
// The AO and reflection passes render the scene's normals and depth; the mist
// sheets and particles are not surfaces, so they sit those renders out.
function withoutFx(fn) {
  return (...args) => {
    const shown = [particles, ...fx].filter((o) => o.visible);
    shown.forEach((o) => { o.visible = false; });
    try { return fn(...args); } finally { shown.forEach((o) => { o.visible = true; }); }
  };
}
ssr._renderOverride = withoutFx(ssr._renderOverride.bind(ssr));
ssr._renderMetalness = withoutFx(ssr._renderMetalness.bind(ssr));
const gtao = new GTAOPass(scene, camera, 1, 1);
composer.addPass(gtao);
gtao._overrideVisibility = ((original) => function () {
  original.call(this);
  // Also hide the mist; restored with the rest by _restoreVisibility.
  for (const o of fx) if (o.visible) { o.visible = false; this._visibilityCache.push(o); }
})(gtao._overrideVisibility);
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), settings.bloom, 0.6, 0.85);
composer.addPass(bloom);
composer.addPass(new OutputPass());
const finish = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uVignette: { value: settings.vignette }, uGrain: { value: settings.grain }, uTime: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uVignette, uGrain, uTime; varying vec2 vUv;
    float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233)) + uTime) * 43758.5453); }
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      vec2 d = vUv - 0.5;
      c *= 1.0 - uVignette * smoothstep(0.25, 0.85, dot(d, d) * 2.2);
      c += (h(vUv * 1000.0) - 0.5) * uGrain;
      gl_FragColor = vec4(c, 1.0);
    }`,
});
composer.addPass(finish);
composer.addPass(new SMAAPass());

function applyPost() {
  gtao.enabled = settings.ao;
  gtao.updateGtaoMaterial({ radius: settings.aoRadius, distanceExponent: 1.5, thickness: 1.4, scale: 1.15 });
  bloom.strength = settings.bloom;
  finish.uniforms.uVignette.value = settings.vignette;
  finish.uniforms.uGrain.value = settings.grain;
  renderer.shadowMap.enabled = settings.shadows;
  sun.castShadow = settings.shadows;
  projUniforms.uBright.value = settings.projection;
  projUniforms.uMotion.value = settings.motion;
  ssr.opacity = settings.reflections;
  ssr.enabled = settings.reflections > 0.01;
  for (const m of [...ZONES.map((z) => z.floor), grass, concrete, cap]) m.clearcoatRoughness = settings.gloss;
  particleUniforms.uSpeed.value = settings.particleSpeed;
  particleUniforms.uSize.value = settings.particleSize;
  mistUniforms.uAmount.value = settings.mist;
  if (water) water.visible = settings.water;
}

// ---- camera: from the long lens above down to eye height --------------------------------------------

const ABOVE = 1500;
const ENTRY = toWorld(249.1, 330);
const player = { x: ENTRY.x, z: ENTRY.y, yaw: 0, pitch: 0 };
let mode = 'loading'; // loading | above | diving | walk | rising
let t0 = 0;
const DIVE_MS = 4400;
const qAbove = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0, 'YXZ'));
const qWalk = new THREE.Quaternion();

/** The field of view that frames the whole mark from height h. */
function fitFov(h) {
  const need = Math.max((BLOCK.h / 2) * 1.06, ((BLOCK.w / 2) * 1.06) / camera.aspect);
  return THREE.MathUtils.radToDeg(2 * Math.atan(need / h));
}

function setCamera(x, y, z, q, fov) {
  camera.position.set(x, y, z);
  camera.quaternion.copy(q);
  camera.fov = fov;
  // Near and far follow the height, so a far view keeps its depth precision.
  camera.near = THREE.MathUtils.clamp(y * 0.05, 0.08, 60);
  camera.far = Math.max(1200, y + 600);
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
  // Height falls on a log scale, so every stretch of the descent takes as long.
  const h = Math.exp(THREE.MathUtils.lerp(Math.log(ABOVE), Math.log(settings.eye), e));
  // The lens stays long, framing the mark, until it would pass the walking lens.
  const fov = Math.min(settings.fov, fitFov(h));
  const across = ease(THREE.MathUtils.clamp((t - 0.15) / 0.55, 0, 1));
  qWalk.setFromEuler(new THREE.Euler(player.pitch, player.yaw, 0, 'YXZ'));
  const q = qAbove.clone().slerp(qWalk, ease(THREE.MathUtils.clamp((t - 0.62) / 0.38, 0, 1)));
  setCamera(player.x * across, h, player.z * across, q, fov);
  if ((now - t0) / DIVE_MS < 1) return;
  if (mode === 'diving') {
    mode = 'walk';
    upEl.hidden = false;
    hintEl.textContent = 'Drag to look · scroll or WASD to walk · H for settings';
    hintEl.classList.remove('is-gone');
    setTimeout(() => hintEl.classList.add('is-gone'), 5000);
  } else {
    mode = 'above';
    hintEl.textContent = 'Scroll to enter';
    hintEl.classList.remove('is-gone');
    setCamera(0, ABOVE, 0, qAbove, fitFov(ABOVE));
  }
}

// ---- walking ------------------------------------------------------------------------------------------

const keys = new Set();
const typing = (e) => e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement;
addEventListener('keydown', (e) => {
  if (typing(e)) return;
  keys.add(e.code);
  if (mode === 'above' && (e.code === 'Enter' || e.code === 'Space' || e.code === 'ArrowDown')) dive();
  if (mode === 'walk' && e.code === 'Escape') rise();
  if (e.code === 'KeyH' && !e.metaKey && !e.ctrlKey) togglePane();
});
addEventListener('keyup', (e) => keys.delete(e.code));
upEl.addEventListener('click', rise);

let walkImpulse = 0;
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  if (mode === 'above' && e.deltaY > 0) return dive();
  if (mode === 'walk') walkImpulse = THREE.MathUtils.clamp(walkImpulse - e.deltaY * 0.015, -1.5, 1.5);
}, { passive: false });

const velocity = new THREE.Vector2();
let stride = 0;
function walk(dt) {
  const fwd = THREE.MathUtils.clamp((keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) + walkImpulse, -1.5, 1.5);
  const strafe = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
  if (keys.has('ArrowLeft')) player.yaw += 1.5 * dt;
  if (keys.has('ArrowRight')) player.yaw -= 1.5 * dt;
  walkImpulse *= Math.pow(0.05, dt);
  const sin = Math.sin(player.yaw), cos = Math.cos(player.yaw);
  const want = new THREE.Vector2(-sin * fwd + cos * strafe, -cos * fwd - sin * strafe).multiplyScalar(settings.speed);
  velocity.lerp(want, 1 - Math.pow(0.002, dt));
  const nx = player.x + velocity.x * dt;
  if (free(nx, player.z)) player.x = nx; else velocity.x = 0;
  const nz = player.z + velocity.y * dt;
  if (free(player.x, nz)) player.z = nz; else velocity.y = 0;
  const moving = Math.min(1, velocity.length() / settings.speed);
  stride += velocity.length() * dt * 1.9;
  const bob = Math.sin(stride) * 0.035 * moving * settings.bob;
  const sway = Math.cos(stride * 0.5) * 0.012 * moving * settings.bob;
  qWalk.setFromEuler(new THREE.Euler(player.pitch, player.yaw, sway, 'YXZ'));
  setCamera(player.x, settings.eye + bob, player.z, qWalk, settings.fov);
}

let drag = null;
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
function printUnder(e) {
  if (mode !== 'walk') return null;
  pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObject(projection, true)[0];
  if (!hit || hit.distance > 35) return null;
  return slides[faces[hit.object.userData.face].k];
}
canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, moved: 0 }; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', (e) => {
  if (drag) {
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    if (drag.moved > 5) canvas.classList.add('is-dragging');
    if (mode === 'walk') {
      player.yaw -= dx * 0.0032 * settings.sensitivity;
      player.pitch = THREE.MathUtils.clamp(player.pitch - dy * 0.0032 * settings.sensitivity, -1.2, 1.4);
    }
    drag.x = e.clientX; drag.y = e.clientY;
    return;
  }
  const p = printUnder(e);
  canvas.classList.toggle('is-pointing', !!p);
  titleEl.textContent = p ? p.title : '';
});
canvas.addEventListener('pointerup', (e) => {
  const click = drag && drag.moved < 5;
  drag = null;
  canvas.classList.remove('is-dragging');
  if (!click) return;
  if (mode === 'above') return dive();
  const p = printUnder(e);
  if (p) location.href = `/work/${p.slug}/`;
});

/** Stand at the middle of a zone's longest run, looking along it. */
function goToZone(z) {
  const run = RUNS.filter((r) => r.zone === z).sort((a, b) => b.a.distanceTo(b.b) - a.a.distanceTo(a.b))[0];
  const mid = run.a.clone().lerp(run.b, 0.35);
  const dir = run.b.clone().sub(run.a).normalize();
  Object.assign(player, { x: mid.x, z: mid.y, yaw: Math.atan2(-dir.x, -dir.y), pitch: 0.08 });
  if (mode === 'above') { mode = 'diving'; t0 = performance.now() - DIVE_MS; hintEl.classList.add('is-gone'); }
}

// ---- settings panel (H) ----------------------------------------------------------------------------

let pane = null;
async function togglePane() {
  if (pane) { pane.hidden = !pane.hidden; return; }
  const { Pane } = await import('https://cdn.jsdelivr.net/npm/tweakpane@4.0.5/dist/tweakpane.min.js');
  pane = new Pane({ title: 'SMASH v3' });
  pane.element.parentElement.classList.add('tweak');
  const look = () => { applyLook(); placeSun(); save(); };
  const post = () => { applyPost(); save(); };

  const sky = pane.addFolder({ title: 'Sky & light' });
  sky.addBinding(settings, 'sky', { options: Object.fromEntries(Object.keys(SKIES).map((k) => [k, k])) })
    .on('change', async () => { await loadSky(settings.sky, true); pane.refresh(); save(); });
  sky.addBinding(settings, 'exposure', { min: 0.3, max: 2.5, step: 0.01 }).on('change', look);
  sky.addBinding(settings, 'skyBrightness', { label: 'sky', min: 0.2, max: 3, step: 0.01 }).on('change', look);
  sky.addBinding(settings, 'environment', { label: 'ambient', min: 0, max: 2, step: 0.01 }).on('change', look);
  sky.addBinding(settings, 'sunIntensity', { label: 'sun', min: 0, max: 8, step: 0.05 }).on('change', look);
  sky.addBinding(settings, 'sunAzimuth', { label: 'sun direction', min: -180, max: 180, step: 1 }).on('change', look);
  sky.addBinding(settings, 'sunElevation', { label: 'sun height', min: 8, max: 85, step: 1 }).on('change', look);

  const fog = pane.addFolder({ title: 'Fog & mist' });
  fog.addBinding(settings, 'fogDensity', { label: 'distance fog', min: 0, max: 0.05, step: 0.0005 }).on('change', look);
  fog.addBinding(settings, 'fogHeight', { label: 'walls fade by (m)', min: 12, max: 120, step: 1 }).on('change', look);
  fog.addBinding(settings, 'mist', { label: 'ground mist', min: 0, max: 1.5, step: 0.01 }).on('change', post);

  const work = pane.addFolder({ title: 'Projection' });
  work.addBinding(settings, 'projection', { label: 'brightness', min: 0, max: 2.5, step: 0.01 }).on('change', post);
  work.addBinding(settings, 'motion', { label: 'content drift', min: 0, max: 3, step: 0.01 }).on('change', post);
  work.addBinding(settings, 'change', { label: 'cue every (s)', min: 4, max: 90, step: 1 }).on('change', save);

  const surf = pane.addFolder({ title: 'Surfaces' });
  surf.addBinding(settings, 'wallHeight', { label: 'wall height (m)', min: 4, max: 60, step: 0.5 }).on('change', async () => { await buildWalls(); buildProjection(); save(); });
  surf.addBinding(settings, 'reflections', { min: 0, max: 1, step: 0.01 }).on('change', post);
  surf.addBinding(settings, 'gloss', { label: 'wet ← → matte', min: 0, max: 0.6, step: 0.005 }).on('change', post);

  const air = pane.addFolder({ title: 'Particles & water' });
  air.addBinding(settings, 'particles', { label: 'amount', min: 0, max: 3, step: 0.05 }).on('change', () => { buildParticles(); save(); });
  air.addBinding(settings, 'particleSize', { label: 'size', min: 0.2, max: 3, step: 0.01 }).on('change', post);
  air.addBinding(settings, 'particleSpeed', { label: 'speed', min: 0, max: 4, step: 0.01 }).on('change', post);
  air.addBinding(settings, 'water').on('change', post);

  const fx = pane.addFolder({ title: 'Post' });
  fx.addBinding(settings, 'ao', { label: 'ambient occlusion' }).on('change', post);
  fx.addBinding(settings, 'aoRadius', { label: 'AO radius', min: 0.2, max: 4, step: 0.05 }).on('change', post);
  fx.addBinding(settings, 'bloom', { min: 0, max: 1.5, step: 0.01 }).on('change', post);
  fx.addBinding(settings, 'vignette', { min: 0, max: 1, step: 0.01 }).on('change', post);
  fx.addBinding(settings, 'grain', { min: 0, max: 0.15, step: 0.001 }).on('change', post);

  const move = pane.addFolder({ title: 'Walking' });
  move.addBinding(settings, 'fov', { label: 'field of view', min: 35, max: 100, step: 1 }).on('change', save);
  move.addBinding(settings, 'eye', { label: 'eye height (m)', min: 0.4, max: 6, step: 0.05 }).on('change', save);
  move.addBinding(settings, 'speed', { min: 1, max: 14, step: 0.1 }).on('change', save);
  move.addBinding(settings, 'bob', { label: 'head bob', min: 0, max: 2, step: 0.01 }).on('change', save);
  move.addBinding(settings, 'sensitivity', { label: 'look speed', min: 0.2, max: 3, step: 0.01 }).on('change', save);

  const perf = pane.addFolder({ title: 'Performance', expanded: false });
  perf.addBinding(settings, 'resolution', { min: 0.5, max: 2, step: 0.05 }).on('change', () => { resize(); save(); });
  perf.addBinding(settings, 'shadows').on('change', post);

  const go = pane.addFolder({ title: 'Go to' });
  ['S · cobbles', 'M · forest', 'A · water', 'S · sand', 'H · terrazzo'].forEach((label, z) => go.addButton({ title: label }).on('click', () => goToZone(z)));

  pane.addButton({ title: 'Fly out' }).on('click', rise);
  pane.addButton({ title: 'Reset' }).on('click', async () => {
    Object.assign(settings, SETTINGS);
    await loadSky(settings.sky, true);
    buildParticles(); applyPost(); resize(); pane.refresh(); save();
  });
}

// ---- loop --------------------------------------------------------------------------------------------

const focus = new THREE.Vector3();
const white = new THREE.Color(1, 1, 1);
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const time = now / 1000;
  if (mode === 'diving' || mode === 'rising') animateDive(now);
  if (mode === 'walk') walk(dt);
  particleUniforms.uTime.value = time;
  particleUniforms.uCamY.value = camera.position.y;
  particleUniforms.uPixel.value = renderer.getPixelRatio();
  mistUniforms.uTime.value = time;
  mistUniforms.uCamY.value = camera.position.y;
  mistUniforms.uColor.value.copy(scene.fog.color).lerp(white, 0.25);
  waterNormals.offset.set(time * 0.012, time * 0.007);
  projUniforms.uTime.value = time;
  updateProjection(now);
  finish.uniforms.uTime.value = time % 10;
  // The sun's shadow follows the walker, so it stays sharp where you are.
  if (mode === 'walk') focus.set(player.x, 0, player.z); else focus.set(0, 0, 0);
  sun.target.position.copy(focus);
  sun.position.copy(focus).add(sunOffset);
  composer.render(dt);
  requestAnimationFrame(frame);
}

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setPixelRatio(Math.min(devicePixelRatio, settings.resolution));
  renderer.setSize(w, h, false);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(w, h);
  ssr.setSize(w * renderer.getPixelRatio(), h * renderer.getPixelRatio());
  camera.aspect = w / h;
  if (mode === 'above' || mode === 'loading') setCamera(0, ABOVE, 0, qAbove, fitFov(ABOVE));
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);

// ---- go ----------------------------------------------------------------------------------------------

resize();
hintEl.textContent = 'Loading';
await Promise.all([loadSky(settings.sky, !settings.sunElevation), buildWalls(), buildCollision()]);
buildFloors();
buildWater();
buildProjection();
buildParticles();
applyPost();
mode = 'above';
hintEl.textContent = 'Scroll to enter';
requestAnimationFrame(frame);
if (new URLSearchParams(location.search).has('debug')) window.__maze = { THREE, scene, camera, get walls() { return walls; }, get projection() { return projection; }, faces, settings };
if (location.hash === '#inside') { mode = 'diving'; t0 = performance.now() - DIVE_MS; }
const zoneHash = location.hash.match(/zone=(\d)/);
if (zoneHash) goToZone(Number(zoneHash[1]));
