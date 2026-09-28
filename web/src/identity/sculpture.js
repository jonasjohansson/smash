// Shadow sculpture: one object that reads SMASH from the front and the S from
// the side, the wordmark and the logo at once. With a light on each it casts
// both, SMASH on the wall behind it and the S on the wall beside it. The camera
// walks round it, from the front through three-quarters (both shadows) to the side.
// After Hofstadter's GEB block, Tim Noble and Sue Webster, Kumi Yamashita.
//
// The object is the intersection of two extrusions at right angles: the traced
// mark swept along z, and the S (the modular mark's symbol, the S alone,
// sculpture/shapes.js) swept along x, as deep as the S is wide for the mark's
// height (about 0.62). The mark and the S both have material at every height,
// so each silhouette is exactly its drawing. It is drawn without CSG: each
// extrusion throws away the fragments that lie outside the other's drawing
// (distance fields, sculpture/field.js), in the picture and in the shadow maps
// alike, and what is left is exactly the intersection's surface
// (sculpture/materials.js). The room is sculpture/room.js. Black and white: a
// white plaster object, white light, a dark room, black shadows.
//
// The S is read from +x, so its left edge is the object's front and the S's
// shadow falls on the left wall. Neither of the S's edges is solid over its
// whole height (one slot runs out of each), so in any object with these two
// silhouettes SMASH's face steps back where a slot runs out. Here that is the
// lower slot, from 0.24 to 0.38 of the height, 0.24 to 0.38 of the height deep
// (the back of the step is the S's bend, so it shades from dark to light).
// Read from -x instead, the step moves to the upper slot, the S's top block
// floats at the front, and the side face gets a groove from SMASH's own S; from
// +x the side face is whole (the H's edge is solid) and the lone block that
// floats is at the back. Square on, the lens is long and level, so the step's
// letters stay in register with the rest of the face.
//
// Only the camera moves. A quarter turn of the object would bring one of its
// two faces round from behind, and that face and its shadow would read mirrored.

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';

import { markFromSVG, symbolSide, crossings, OVERSHOOT } from './sculpture/shapes.js';
import { distanceField } from './sculpture/field.js';
import { walls, caps, geometry } from './sculpture/build.js';
import { beamLights, beamShape, cutUniforms, cutMaterial, cutDepth } from './sculpture/materials.js';
import { wallMaterial, floorMaterial, studio } from './sculpture/room.js';

const STORE = 'smash-identity-sculpture-s'; // the S alone: settings saved for the S M do not carry over
const TWEAKPANE = 'https://cdn.jsdelivr.net/npm/tweakpane@4.0.5/dist/tweakpane.min.js';

export const SCULPTURE_DEFAULTS = {
  turntable: true, // moving: the camera walks round it, the front to the side and back
  travel: 4, // seconds from the front to the side
  hold: 2.4, // seconds held square on to the front and to the side
  linger: 3, // seconds at three-quarters, where both shadows show
  yaw: 45, // the camera's angle when it is held: 0 the front (SMASH), 90 the side (the S)
  pitch: 9, // degrees from above at three-quarters; the camera comes down level to the front and the side
  walls: true,
};

// White plaster. ao: how dark the slots get. env: how much of the studio it reflects. lamp: how soft
// the lamps' own highlight is on it, at least, and spec how strong (sculpture/materials.js).
const PLASTER = { color: '#f2f2f2', roughness: 0.9, metalness: 0, clearcoat: 0.001, ccRoughness: 1, env: 0.4, grain: 0.035, scale: 150, speck: 0, ao: 0.8, lamp: 0, spec: 1 };

// The room, in the mark's heights: the back wall behind the object, the side wall to its left.
// The side light comes from the right (+x), where the side view is. At three-quarters the picture
// reads the S's shadow, the object, SMASH's shadow. Each wall stands just far enough off that at
// three-quarters its shadow clears the object (the object is wider than it is deep, so the back
// wall needs more room than the side wall), and no further, so the object is large in the frame.
const BACK_WALL_Z = -2.0;
const SIDE_WALL_X = -2.2;
const YAW_ROOM = [-10, 100]; // inside the room the camera stays between its walls
const FOV_SQUARE = 7; // degrees, square on to the front or the side: long, so each is a flat elevation
const FOV_ROOM = 21; // degrees, at three-quarters
const ROOM_HW = 1.95; // the half-width framed at three-quarters, both shadows in it
const TARGET = new THREE.Vector3(0, 0.5, 0);
const LIGHT_FRONT = 3.0;
const LIGHT_SIDE = 2.7;
const PIXEL_BUDGET = 5.2e6; // device pixels the stage may draw

const pick = (o) => Object.fromEntries(Object.entries(o ?? {}).filter(([k]) => k in SCULPTURE_DEFAULTS));
function load() {
  try { return { ...SCULPTURE_DEFAULTS, ...pick(JSON.parse(localStorage.getItem(STORE) || '{}')) }; } catch { return { ...SCULPTURE_DEFAULTS }; }
}
function save(params) {
  const changed = Object.fromEntries(Object.entries(params).filter(([k, v]) => v !== SCULPTURE_DEFAULTS[k]));
  try { localStorage.setItem(STORE, JSON.stringify(changed)); } catch {}
}

export const HTML = `
  <section class="lab" id="sculpture">
    <header class="ch-head">
      <p class="ch-n">00 · sculpture</p>
      <h2 class="ch-name">Sculpture</h2>
    </header>
    <div class="lab-body">
      <div class="lab-stage"></div>
      <div class="lab-panel"></div>
    </div>
  </section>`;

const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const sine = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : 0.5 - 0.5 * Math.cos(Math.PI * t));
const lerp = (a, b, t) => a + (b - a) * t;
const rad = THREE.MathUtils.degToRad;
const wrap = (a) => ((((a + 180) % 360) + 360) % 360) - 180; // into -180..180
const ANGLES = ['yaw', 'pitch'];

/**
 * Mount the tool in its section. Returns { ready, pause(), resume(), destroy(), snapshot(view), set(settings) }.
 * With settings, it starts from the defaults plus those and saves nothing.
 */
export function mount(section, { panel = true, settings = null } = {}) {
  const stage = section.querySelector('.lab-stage');
  const panelEl = section.querySelector('.lab-panel');
  const params = settings ? { ...SCULPTURE_DEFAULTS, ...pick(settings) } : load();
  const keep = () => { if (!settings) save(params); };

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  } catch (e) {
    console.error('[identity] sculpture: no WebGL', e);
    stage.insertAdjacentHTML('beforeend', '<p class="label" style="padding:24px">This browser could not start WebGL.</p>');
    return { ready: Promise.resolve(), pause() {}, resume() {}, destroy() {}, snapshot: () => '', set: () => Promise.resolve() };
  }
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  const canvas = renderer.domElement;
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:pan-y;cursor:grab;';
  stage.appendChild(canvas);

  // The room.
  const scene = new THREE.Scene();
  const ground = new THREE.Color('#000000');
  scene.background = ground;
  scene.fog = new THREE.Fog(ground, 9, 20);
  const env = studio(renderer);
  const camera = new THREE.PerspectiveCamera(FOV_ROOM, 16 / 9, 0.1, 80);
  const beams = beamLights();

  const floorMat = floorMaterial();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), floorMat.material);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  scene.add(new THREE.HemisphereLight('#ffffff', '#000000', 0.26));
  // Each wall is lit only in the pool of its light (the other light runs along it).
  const wallMat = wallMaterial('#a6a6a6', { ...beams, ...beamShape([0, 0.5, 0], [1.5, 1.02], [0.34, 0.02]) });
  const room = new THREE.Group();
  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(16, 8), wallMat);
  backWall.position.set(SIDE_WALL_X - 0.02 + 8, 4, BACK_WALL_Z);
  const sideWall = new THREE.Mesh(new THREE.PlaneGeometry(16, 8), wallMat);
  sideWall.rotation.y = Math.PI / 2;
  sideWall.position.set(SIDE_WALL_X, 4, BACK_WALL_Z - 0.02 + 8);
  backWall.receiveShadow = sideWall.receiveShadow = true;
  room.add(backWall, sideWall);
  scene.add(room);

  // Two white lights, exactly along the axes, so each shadow is exactly its drawing. Front first: the beams count on it.
  const light = (intensity) => {
    const l = new THREE.DirectionalLight('#ffffff', intensity);
    l.castShadow = true;
    l.shadow.mapSize.set(2048, 2048);
    l.shadow.bias = -0.0002;
    l.shadow.normalBias = 0;
    Object.assign(l.shadow.camera, { near: 0.5, far: 5 - BACK_WALL_Z + 2.5 });
    l.target.position.copy(TARGET);
    scene.add(l, l.target);
    return l;
  };
  const frontLight = light(LIGHT_FRONT);
  const sideLight = light(LIGHT_SIDE);
  // A soft light straight above, as over a plinth: it lights the tops and pools on the floor, never
  // the front or the side faces (so the planes SMASH's face steps between are lit alike), and its
  // shadow falls straight down, under the object, so it never touches the two on the walls.
  const topLight = new THREE.SpotLight('#ffffff', 40, 0, 0.34, 1, 2);
  topLight.position.set(0, 5.2, 0);
  topLight.target.position.set(0, 0, 0);
  topLight.castShadow = true;
  topLight.shadow.mapSize.set(1024, 1024);
  topLight.shadow.bias = -0.0004;
  topLight.shadow.radius = 4;
  Object.assign(topLight.shadow.camera, { near: 3, far: 7 });
  scene.add(topLight, topLight.target);

  // The object: A is the mark swept along z, B the S swept along x. It stands still; the camera moves.
  const UA = cutUniforms(1);
  const UB = cutUniforms(0);
  const G = { uGrain: { value: PLASTER.grain }, uGrainScale: { value: PLASTER.scale }, uSpeck: { value: PLASTER.speck }, uAo: { value: PLASTER.ao }, uDirectRough: { value: PLASTER.lamp }, uLampSpec: { value: PLASTER.spec } };
  // On the object each beam is a broad pool: its faces shade gently from the middle out.
  const objectBeam = { ...beams, ...beamShape([0, 0.7, 0], [1.7, 1.3], [0, 0.62]), uLampView: { value: [new THREE.Vector3(), new THREE.Vector3()] } };
  const matA = cutMaterial(UA, G, objectBeam);
  const matB = cutMaterial(UB, G, objectBeam);
  for (const mat of [matA, matB]) {
    const m = PLASTER;
    mat.envMap = env;
    mat.color.set(m.color);
    mat.roughness = m.roughness;
    mat.metalness = m.metalness;
    mat.clearcoat = m.clearcoat; // never 0: the shader the cut was written for
    mat.clearcoatRoughness = m.ccRoughness;
    mat.envMapIntensity = m.env;
  }
  const meshA = new THREE.Mesh(new THREE.BufferGeometry(), matA);
  const meshB = new THREE.Mesh(new THREE.BufferGeometry(), matB);
  meshA.customDepthMaterial = cutDepth(UA);
  meshB.customDepthMaterial = cutDepth(UB);
  // Where the two lamps stand, as the camera drawing this sees them (for their highlights).
  const lampsInView = (r, s, cam) => {
    objectBeam.uLampView.value[0].copy(frontLight.position).applyMatrix4(cam.matrixWorldInverse);
    objectBeam.uLampView.value[1].copy(sideLight.position).applyMatrix4(cam.matrixWorldInverse);
  };
  meshA.onBeforeRender = meshB.onBeforeRender = lampsInView;
  for (const m of [meshA, meshB]) { m.castShadow = true; m.receiveShadow = true; scene.add(m); }

  // A soft dark footprint where it stands.
  const contact = document.createElement('canvas');
  contact.width = contact.height = 256;
  const contactTex = new THREE.CanvasTexture(contact);
  const decal = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 2.8), new THREE.MeshBasicMaterial({ color: 0x000000, alphaMap: contactTex, transparent: true, opacity: 0.75, depthWrite: false }));
  decal.rotation.x = -Math.PI / 2;
  decal.position.y = 0.0015;
  decal.renderOrder = 1;
  scene.add(decal);

  let mark = null; // the parsed mark (the front)
  let markField = null;
  let side = null; // the S (the side): { field, bottom }
  let depth = 1; // the object's depth, in the mark's heights: the S's width over its height
  let built = false;
  let destroyed = false;
  let running = true;
  let dirty = true;
  const tmpSize = new THREE.Vector2();
  let exportScale = 0; // while saving a PNG: the pixel ratio to draw at

  // What is shown (the camera's yaw and pitch), the drag, a glide back onto the walk after one, and the clock.
  const view = { yaw: params.yaw, pitch: 0 };
  let drag = null;
  let glide = null;
  let clock = 0;
  let last = performance.now();

  /** The camera's walk from the front (0) through three-quarters (a linger, both shadows) to the side (90) and back. */
  function walkCycle(t) {
    const H = Math.max(0, params.hold);
    const T = Math.max(0.2, params.travel);
    const L = Math.max(0, params.linger);
    const leg = H + T + L;
    let x = t % (2 * leg);
    const out = x < leg;
    if (!out) x -= leg;
    let p;
    if (x < H) p = 0;
    else if (L < 0.05) p = sine((x - H) / T);
    else if (x < H + T / 2) p = 0.5 * sine((x - H) / (T / 2));
    else if (x < H + T / 2 + L) p = 0.5;
    else p = 0.5 + 0.5 * sine((x - H - T / 2 - L) / (T / 2));
    return 90 * (out ? p : 1 - p);
  }
  // A walk starts inside the linger, so its first picture is the one with both shadows.
  const walkStart = () => Math.max(0, params.hold) + Math.max(0.2, params.travel) / 2 + 0.3 * Math.max(0, params.linger);

  /**
   * The camera comes down level square on to the front or the side, so each is a flat elevation
   * (from above, the floor of the step in SMASH's face and the far wall's shadow over the top would
   * show), and rises to the set pitch between them, where the room and both shadows are the picture.
   * Dragged higher than the default, the extra height stays all the way round.
   */
  function risePitch(yaw, peak = params.pitch) {
    const s = Math.abs(Math.sin((Math.PI * yaw) / 90));
    return peak * s + Math.max(0, peak - SCULPTURE_DEFAULTS.pitch) * (1 - s);
  }

  /** Aim the lights exactly along the axes, so each shadow is exactly its drawing. */
  function aimLights() {
    const df = new THREE.Vector3(0, 0, -1); // the front light travels towards -z
    const ds = new THREE.Vector3(-1, 0, 0); // the side light towards -x, from the right
    frontLight.position.copy(TARGET).addScaledVector(df, -5);
    sideLight.position.copy(TARGET).addScaledVector(ds, -5);
    beams.uBeamDir.value[0].copy(df);
    beams.uBeamDir.value[1].copy(ds);
    floorMat.uniforms.uSpillBack.value.set(0, BACK_WALL_Z, 1.1);
    floorMat.uniforms.uSpillSide.value.set(0, SIDE_WALL_X, 1.1);
    renderer.shadowMap.needsUpdate = true;
  }

  /** Each light's shadow camera, fitted round the object as that light sees it (the tighter, the crisper). */
  function fitShadows(D) {
    for (const [l, r] of [[frontLight, mark.width / 2 + 0.05], [sideLight, D / 2 + 0.05]]) {
      Object.assign(l.shadow.camera, { left: -r, right: r, top: 0.64, bottom: -0.64 });
      l.shadow.camera.updateProjectionMatrix();
    }
  }

  /**
   * Frame the view. Square on to the front or the side the lens is long, so the object is a clean
   * elevation (its slots barely open up) and fills the frame; at three-quarters it is wider, and
   * the whole room is in the picture: both walls and both shadows.
   */
  function place(cam, yaw, pitch, aspect) {
    const a = rad(yaw);
    const p = rad(pitch);
    const k = smooth((Math.abs(Math.sin((Math.PI * yaw) / 90)) - 0.2) / 0.65);
    const fov = lerp(FOV_SQUARE, FOV_ROOM, k);
    if (cam.fov !== fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
    const t = Math.tan(rad(fov / 2));
    // What to fit round the target (half-width, half-height), and how far the object reaches towards the camera.
    const hw = params.walls ? lerp(1.12, ROOM_HW, k) : lerp(1.12, 1.25, k);
    const hh = params.walls ? lerp(0.72, 0.92, k) : 0.72;
    const near = Math.abs(Math.cos(a)) * (depth / 2) + Math.abs(Math.sin(a)) * ((mark?.width ?? 1) / 2);
    const dist = Math.max(hh / t, hw / (t * aspect)) + near;
    cam.position.set(TARGET.x + dist * Math.sin(a) * Math.cos(p), TARGET.y + dist * Math.sin(p), TARGET.z + dist * Math.cos(a) * Math.cos(p));
    cam.lookAt(TARGET);
    // The fog starts behind the object: without walls the floor fades into the dark before it can
    // make a horizon; with them it only softens the far floor.
    scene.fog.near = dist + (params.walls ? 5 : 1.2);
    scene.fog.far = dist + (params.walls ? 16 : 6);
  }


  let lastTurning = params.turntable;
  function apply() {
    // Onto the walk: glide there from wherever the view is now.
    if (params.turntable && !lastTurning) {
      clock = walkStart();
      glide = { from: { ...view }, at: performance.now(), wait: 0 };
    }
    lastTurning = params.turntable;
    room.visible = params.walls;
    // Inside the room, the camera stays between its walls.
    if (params.walls) {
      const y = THREE.MathUtils.clamp(params.yaw, ...YAW_ROOM);
      if (y !== params.yaw) { params.yaw = y; refresh(); }
    }
    // The walls throw some of their light back onto the floor.
    const spill = (l) => (params.walls ? l.intensity : 0);
    floorMat.uniforms.uBackCol.value.copy(frontLight.color).multiplyScalar(spill(frontLight));
    floorMat.uniforms.uSideCol.value.copy(sideLight.color).multiplyScalar(spill(sideLight));
    renderer.shadowMap.needsUpdate = true;
    dirty = true;
  }

  /** Set the two extrusions' depths and cuts, once both drawings are built. */
  function shapeObject() {
    const D = depth;
    meshA.scale.z = D + 2 * OVERSHOOT;
    meshB.scale.z = D;
    meshA.updateMatrix();
    meshB.updateMatrix();
    UA.uCutLocal.value.copy(meshA.matrix);
    UB.uCutLocal.value.copy(meshB.matrix);
    UA.uCutNScale.value.set(1, 1, 1 / meshA.scale.z);
    UB.uCutNScale.value.set(1, 1, 1 / D);
    // The side's field is drawn with z from -0.5 to 0.5: read it at z / D.
    const s = side.field;
    const sideXf = (v) => v.set(s.xf.x / D, s.xf.y, s.xf.z, s.xf.w);
    UA.uCutMask.value = s.texture;
    UA.uCutFar.value = s.far;
    sideXf(UA.uCutXf.value);
    UA.uOwnFar.value = markField.far;
    UA.uOwnXf.value.copy(markField.xf);
    UB.uCutMask.value = markField.texture;
    UB.uCutFar.value = markField.far;
    UB.uCutXf.value.copy(markField.xf);
    UB.uOwnFar.value = s.far;
    sideXf(UB.uOwnXf.value);
    UA.uFarBand.value = UB.uFarBand.value = s.farBand;
    footprint(side.bottom.map(([a, b]) => [a * D, b * D]));
    fitShadows(D);
  }

  function footprint(zs) {
    const ctx = contact.getContext('2d');
    const S = contact.width;
    const k = S / 2.8;
    ctx.filter = 'none';
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, S, S);
    ctx.filter = `blur(${Math.round(S * 0.018)}px)`;
    ctx.fillStyle = '#fff';
    const xs = crossings(mark.contours, 0.01);
    for (const [x0, x1] of xs) for (const [z0, z1] of zs) ctx.fillRect(S / 2 + x0 * k, S / 2 + z0 * k, (x1 - x0) * k, (z1 - z0) * k);
    ctx.filter = 'none';
    contactTex.needsUpdate = true;
  }

  /** Resolves once the stage has a size (or after ms, so a hidden mount still resolves). */
  function sized(ms = 3000) {
    return new Promise((resolve) => {
      if (stage.clientWidth && stage.clientHeight) { resolve(true); return; }
      const watch = new ResizeObserver(() => {
        if (!stage.clientWidth || !stage.clientHeight) return;
        watch.disconnect();
        clearTimeout(timer);
        resolve(true);
      });
      const timer = setTimeout(() => { watch.disconnect(); resolve(false); }, ms);
      watch.observe(stage);
    });
  }

  const ready = (async () => {
    const [text, sm] = await Promise.all([
      fetch(new URL('/brand/smash-logo.svg', location.href)).then((res) => {
        if (!res.ok) throw new Error(`the mark did not load (${res.status})`);
        return res.text();
      }),
      symbolSide(),
    ]);
    if (destroyed) return;
    mark = markFromSVG(text);
    depth = sm.aspect;
    meshA.geometry = geometry(
      walls(mark.contours, -0.5, 0.5, { place: (u, v, w) => [u, v, w], turn: (nu, nv) => [nu, nv, 0] }),
      caps(mark.shapes, -0.5, 0.5),
    );
    // The S, swept along x a little past the mark either side (so no two faces lie in one plane).
    const e = OVERSHOOT;
    const halfW = mark.width / 2 + e;
    meshB.geometry = geometry(walls(sm.contours, -halfW, halfW, {
      place: (u, v, w) => [w, v, u],
      turn: (nu, nv) => [0, nv, nu],
      flip: true,
    }));
    const m = 0.03;
    const [mf, sf] = await Promise.all([
      distanceField(mark.contours, { x0: -mark.width / 2 - m, x1: mark.width / 2 + m, y0: -m, y1: 1 + m }, { ppu: 2000 }),
      distanceField(sm.contours, { x0: -0.5 - m, x1: 0.5 + m, y0: -e - m, y1: 1 + e + m }, { ppu: 2000 }),
    ]);
    markField = mf;
    side = { field: sf, bottom: crossings(sm.contours, 0.01) };
    if (destroyed) return;
    shapeObject();
    apply();
    aimLights();
    await sized();
    if (destroyed) return;
    resize();
    place(camera, params.yaw, risePitch(params.yaw), camera.aspect);
    await renderer.compileAsync(scene, camera);
    if (destroyed) return;
    // Start where the walk starts (inside its linger), with nothing left to settle.
    clock = walkStart();
    glide = null;
    const tv = targetView(performance.now());
    for (const k of ANGLES) view[k] = tv[k];
    built = true;
    last = performance.now();
    frame(performance.now(), true);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  })();
  ready.catch((e) => console.error('[identity] the sculpture did not build', e));

  function resize() {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    if (!w || !h) return false;
    // Up to two device pixels to one, within a budget (a large 1x screen would otherwise draw 4x).
    let pr = Math.min(window.devicePixelRatio || 1, 2);
    if (w * h * pr * pr > PIXEL_BUDGET) pr = Math.max(1, Math.sqrt(PIXEL_BUDGET / (w * h)));
    if (exportScale) pr = exportScale;
    if (renderer.getPixelRatio() !== pr) { renderer.setPixelRatio(pr); dirty = true; }
    const size = renderer.getSize(tmpSize);
    if (size.x !== w || size.y !== h) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      dirty = true;
    }
    return true;
  }

  function draw(v) {
    place(camera, v.yaw, v.pitch, camera.aspect);
    renderer.render(scene, camera);
    opaque();
  }

  /**
   * Alpha to coverage leaves each cut edge's coverage in the canvas's alpha: the page shows the
   * canvas opaque, but a PNG of it would have see-through edges. Set the alpha back to one.
   */
  function opaque() {
    const gl = renderer.getContext();
    renderer.setScissorTest(false);
    renderer.state.buffers.color.setClear(0, 0, 0, 1);
    gl.colorMask(false, false, false, true);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.colorMask(true, true, true, true);
  }

  /** Where the view should be now: the drag, the walk (and a glide back onto it), or the settings. */
  function targetView(now) {
    if (drag) return { yaw: drag.yaw, pitch: risePitch(drag.yaw, drag.peak), snap: true };
    if (!params.turntable) return { yaw: params.yaw, pitch: risePitch(params.yaw), snap: false };
    const y = walkCycle(clock);
    const tv = { yaw: y, pitch: risePitch(y), snap: true };
    if (glide) {
      const w = smooth(((now - glide.at) / 1000 - glide.wait) / 2.4);
      if (w >= 1) glide = null;
      else for (const k of ANGLES) tv[k] = glide.from[k] + wrap(tv[k] - glide.from[k]) * w;
    }
    return tv;
  }

  function frame(now, force = false) {
    if (!built || !resize()) return;
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (params.turntable && !drag) clock += dt;
    const tv = targetView(now);
    const k = tv.snap ? 1 : 1 - Math.exp(-dt * 5);
    for (const key of ANGLES) {
      const d = key === 'pitch' ? tv[key] - view[key] : wrap(tv[key] - view[key]);
      if (Math.abs(d) < 1e-3) { if (view[key] !== tv[key]) { view[key] = tv[key]; dirty = true; } continue; }
      view[key] += d * k;
      dirty = true;
    }
    if (!dirty && !force) return;
    dirty = false;
    draw(view);
  }

  let raf = 0;
  const loop = (now) => {
    raf = requestAnimationFrame(loop);
    if (document.hidden) { last = now; return; }
    frame(now);
  };
  raf = requestAnimationFrame(loop);
  const ro = new ResizeObserver(() => { dirty = true; });
  ro.observe(stage);

  // Drag: walk round it (left and right) and look from higher or lower (up and down).
  const down = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    drag = { x: e.clientX, y: e.clientY, yaw0: view.yaw, peak0: params.pitch, yaw: view.yaw, peak: params.pitch };
    glide = null;
    canvas.setPointerCapture?.(e.pointerId);
    canvas.style.cursor = 'grabbing';
  };
  const move = (e) => {
    if (!drag) return;
    // As if turning the object by hand: drag left and its front turns to the left, bringing the
    // S round from the right. Inside the room the camera stays between its walls; without them
    // it goes all the way round.
    const [lo, hi] = params.walls ? YAW_ROOM : [-Infinity, Infinity];
    drag.yaw = THREE.MathUtils.clamp(drag.yaw0 - (e.clientX - drag.x) * 0.35, lo, hi);
    drag.peak = THREE.MathUtils.clamp(drag.peak0 + (e.clientY - drag.y) * 0.25, 0, 60);
  };
  // Let go near the front or the side and it settles square on, where the object is exactly SMASH or the S.
  const detent = (a) => {
    const q = Math.round(a / 90) * 90;
    return Math.abs(a - q) < 7 ? wrap(q) : Math.round(a);
  };
  const up = () => {
    if (!drag) return;
    const d = drag;
    drag = null;
    canvas.style.cursor = 'grab';
    view.yaw = wrap(d.yaw);
    params.pitch = Math.round(d.peak);
    if (params.turntable) {
      // Hold where it was let go, then glide back onto the walk.
      glide = { from: { yaw: view.yaw, pitch: risePitch(view.yaw, d.peak) }, at: performance.now(), wait: 1.2 };
    } else params.yaw = detent(view.yaw);
    refresh();
    keep();
  };
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);

  // The panel.
  let pane = null;
  let refreshing = false;
  const refresh = () => { refreshing = true; try { pane?.refresh(); } finally { refreshing = false; } };
  if (panel && panelEl) {
    import(TWEAKPANE).then(({ Pane }) => {
      if (destroyed) return;
      pane = new Pane({ container: panelEl, title: 'Sculpture' });
      pane.addBinding(params, 'walls');

      const motion = pane.addFolder({ title: 'Motion' });
      const stops = { front: 0, tq: 45, side: 90 };
      const hold = {
        get at() {
          if (params.turntable) return 'walking';
          return Object.keys(stops).find((k) => stops[k] === params.yaw) ?? 'free';
        },
        set at(v) {
          if (v === 'walking') { params.turntable = true; return; }
          if (v === 'free') {
            // Stop it where it is, to take it on by hand.
            if (!params.turntable) return;
            params.turntable = false;
            params.yaw = Math.round(wrap(view.yaw));
            return;
          }
          if (!(v in stops)) return;
          params.turntable = false;
          params.yaw = stops[v];
        },
      };
      motion.addBinding(hold, 'at', { label: 'hold at', options: { walking: 'walking', 'front: SMASH': 'front', 'three-quarter': 'tq', 'side: S': 'side', 'where it is': 'free' } }).on('change', () => { if (!refreshing) refresh(); });
      const timing = motion.addFolder({ title: 'Timing', expanded: false });
      timing.addBinding(params, 'travel', { label: 'travel (s)', min: 1, max: 12, step: 0.1 });
      timing.addBinding(params, 'hold', { label: 'hold (s)', min: 0, max: 8, step: 0.1 });
      timing.addBinding(params, 'linger', { label: 'three-quarter (s)', min: 0, max: 8, step: 0.1 });

      pane.addButton({ title: 'Save PNG' }).on('click', () => {
        const a = Object.assign(document.createElement('a'), { href: exportPNG(), download: 'smash-sculpture.png' });
        a.click();
      });
      pane.addButton({ title: 'Reset' }).on('click', () => {
        Object.assign(params, SCULPTURE_DEFAULTS);
        lastTurning = false; // glide back onto the walk from wherever it is
        refresh();
        apply();
        keep();
      });
      pane.on('change', () => { if (refreshing) return; apply(); keep(); });
    }).catch((e) => console.error('[identity] the sculpture panel did not load', e));
  }

  /** The frame as shown, drawn at two pixels to one whatever the screen (up to 3840 wide), for Save PNG. */
  function exportPNG() {
    const w = stage.clientWidth || 1920;
    exportScale = Math.max(1, Math.min(2, 3840 / w));
    try { return snapshot(); } finally {
      exportScale = 0;
      // Back to the screen's size, and drawn at once, so the stage never shows the cleared canvas.
      if (resize() && built) draw(view);
    }
  }

  /** The current frame as a PNG data URL; with { yaw, pitch } (degrees: yaw 0 the front, 90 the side), that view held still. */
  function snapshot(v) {
    if (destroyed || !built) return '';
    if (!resize()) {
      // Mounted with no size (hidden): draw at a fixed 1920 x 1080.
      renderer.setPixelRatio(1);
      renderer.setSize(1920, 1080, false);
      camera.aspect = 16 / 9;
      camera.updateProjectionMatrix();
    }
    if (!v) {
      draw(view);
      return canvas.toDataURL('image/png');
    }
    const yaw = v.yaw ?? view.yaw;
    draw({ yaw, pitch: v.pitch ?? risePitch(yaw) });
    const url = canvas.toDataURL('image/png');
    dirty = true;
    return url;
  }

  return {
    ready,
    pause() { if (!running) return; running = false; cancelAnimationFrame(raf); },
    resume() {
      if (running || destroyed) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    },
    snapshot,
    /** Change settings from a script (not remembered). */
    set(next) {
      if (destroyed) return Promise.resolve();
      Object.assign(params, pick(next));
      if ('yaw' in next) view.yaw = params.yaw;
      if ('yaw' in next || 'pitch' in next) view.pitch = risePitch(params.yaw);
      refresh();
      apply();
      return ready;
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      pane?.dispose();
      pane = null;
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', up);
      side?.field.dispose();
      markField?.dispose();
      contactTex.dispose();
      env.dispose();
      scene.traverse((o) => { if (o.isMesh) { o.geometry?.dispose(); [].concat(o.material, o.customDepthMaterial).forEach((m) => m?.dispose()); } });
      for (const l of [frontLight, sideLight, topLight]) l.shadow.map?.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
