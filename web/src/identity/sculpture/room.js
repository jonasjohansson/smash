// The room the sculpture stands in: two walls, each lit in the pool of its
// light's beam; a floor that catches their spill; and the small studio the
// object reflects. All of it neutral grey and white light, so the picture is
// black and white.

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';

import { BEAM_PARS, BEAM_LIGHTS, ROOM_VERT } from './materials.js';

/** A wall lit only inside its light's beam (B: beamLights plus a beamShape), as a stage light would. */
export function wallMaterial(color, B) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.97, metalness: 0, envMapIntensity: 0.22, dithering: true });
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, B);
    s.vertexShader = ROOM_VERT(s.vertexShader);
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vRoom;\n${BEAM_PARS}`)
      .replace('#include <lights_fragment_begin>', BEAM_LIGHTS);
  };
  m.customProgramCacheKey = () => 'smash-sculpture-wall-2';
  return m;
}

/**
 * The floor: dark, with some of the light each wall throws back spilling onto
 * it below the pool. The back wall stands at -z, the side wall at -x.
 */
export function floorMaterial() {
  const U = {
    // (the pool's centre along its wall, the wall's position, how far the spill reaches into the room)
    uSpillBack: { value: new THREE.Vector3(0, -1, 1) },
    uSpillSide: { value: new THREE.Vector3(0, 1, 1) },
    uBackCol: { value: new THREE.Color(0, 0, 0) },
    uSideCol: { value: new THREE.Color(0, 0, 0) },
  };
  const m = new THREE.MeshStandardMaterial({ color: '#2a2a2a', roughness: 0.9, metalness: 0, envMapIntensity: 0.5, dithering: true });
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, U);
    s.vertexShader = ROOM_VERT(s.vertexShader);
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', /* glsl */ `#include <common>
        varying vec3 vRoom;
        uniform vec3 uSpillBack;
        uniform vec3 uSpillSide;
        uniform vec3 uBackCol;
        uniform vec3 uSideCol;`)
      .replace('#include <lights_fragment_end>', /* glsl */ `#include <lights_fragment_end>
        {
          float db = (vRoom.z - uSpillBack.y) / uSpillBack.z;
          float ab = (vRoom.x - uSpillBack.x) / 2.0;
          float sb = exp(-db * db * 2.4) * exp(-ab * ab * 1.8) * step(uSpillBack.y, vRoom.z);
          float ds = (vRoom.x - uSpillSide.y) / uSpillSide.z;
          float as_ = (vRoom.z - uSpillSide.x) / 2.0;
          float ss = exp(-ds * ds * 2.4) * exp(-as_ * as_ * 1.8) * step(uSpillSide.y, vRoom.x);
          reflectedLight.indirectDiffuse += diffuseColor.rgb * (uBackCol * sb + uSideCol * ss) * 0.36;
        }`);
  };
  m.customProgramCacheKey = () => 'smash-sculpture-floor-4';
  return { material: m, uniforms: U };
}

/** A soft box: bright in the middle, falling off to its edges (so a flat, polished face shows a gradient, not one fill). */
function softbox() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.45, '#d9d9d9');
  g.addColorStop(0.85, '#3a3a3a');
  g.addColorStop(1, '#000000');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * What the object reflects: a dark studio with a grey horizon, soft boxes
 * where the two lights are, a ceiling, and strips round the sides, so the
 * plaster's faces shade softly. Only the object sees it; the room is lit by its lights alone.
 */
export function studio(renderer) {
  const scene = new THREE.Scene();
  // The backdrop: dark overhead and underfoot, a low grey band round the horizon.
  const sky = new THREE.SphereGeometry(12, 48, 24);
  const pos = sky.attributes.position;
  const col = [];
  const low = new THREE.Color(0.016, 0.016, 0.016);
  const band = new THREE.Color(0.15, 0.15, 0.15);
  const high = new THREE.Color(0.038, 0.038, 0.038);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 12;
    const glow = Math.exp(-((y - 0.08) ** 2) / 0.012);
    c.copy(y < 0.08 ? low : high).lerp(band, glow);
    col.push(c.r, c.g, c.b);
  }
  sky.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  scene.add(new THREE.Mesh(sky, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const box = softbox();
  const panel = (w, h, at, rgb, k) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: box, color: new THREE.Color(...rgb).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(...at);
    m.lookAt(0, 0.6, 0);
    scene.add(m);
  };
  const white = [1, 1, 1];
  // Above the lights' own line, as studio boxes hang: a camera square on to a face sees their falloff, not their mirror image.
  // The front light is at +z, the side light at +x (where the S's face looks).
  panel(4.2, 3.2, [0.8, 2.9, 6.2], white, 4.2); // the front light
  panel(3.4, 3.8, [6.2, 2.9, -0.9], white, 3.6); // the side light
  panel(10, 4, [0, 4.4, 0.8], white, 1.1); // the ceiling
  panel(1.2, 5, [-5.5, 1.6, 4.2], white, 1.9); // strips round the room
  panel(1.2, 5, [4.6, 1.6, -5.2], white, 1.4);
  panel(1.2, 5, [-5.2, 1.6, -4.6], white, 0.8);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(scene, 0.02).texture;
  pmrem.dispose();
  scene.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
  box.dispose();
  return env;
}
