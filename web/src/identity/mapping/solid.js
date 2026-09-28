// The true 3D mode: the mark as a solid, in three.js, in black and white.
//
// The solid is the warped mark itself: the front face is the flat stage's
// finely cut mesh (bent through the grid, the mask cutting the letters out of
// it), the walls are the mark's outlines, every point pushed through the warp
// and run straight back. The camera stays where the projector is and the solid
// turns, lit from in front of its own face. The face is the mark's own white
// (or black); the walls are greys, the only shading; on white, its shadow falls
// on the ground. Straight on, it sits exactly where the flat stage draws it.

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
import { rasterize } from './source.js';
import { MESH_SUB } from './render.js';

const FOV = 30;
// The walls' grey under the face's white (on black) or black (on white), and the back face's.
const TONES = {
  black: { face: '#ffffff', side: '#8c8c8c', back: '#262626', shadow: 0 },
  white: { face: '#000000', side: '#9a9a9a', back: '#3a3a3a', shadow: 0.2 },
};

/** Mount in stage, before `under` (the grid). Returns { ready, canvas, setSource, draw, project, unproject, destroy }. */
export function createSolid(stage, under) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  renderer.toneMapping = THREE.NoToneMapping; // white stays white
  const canvas = renderer.domElement;
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;';
  stage.insertBefore(canvas, under);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#000000');
  const D = 0.5 / Math.tan(THREE.MathUtils.degToRad(FOV / 2)); // a plane one unit tall fills the view
  const camera = new THREE.PerspectiveCamera(FOV, 16 / 9, 0.01, 60);
  camera.position.set(0, 0, D);
  camera.updateMatrixWorld();

  // Lit from in front of its own face, a little from above and from the side
  // that shows: the face is the brightest, the walls in the light a mid tone,
  // the others darker, whichever way it turns.
  const hemi = new THREE.HemisphereLight(0xffffff, 0x303030, 1.45);
  const key = new THREE.DirectionalLight(0xffffff, 2.55);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.radius = 9;
  key.shadow.blurSamples = 16;
  key.shadow.bias = -0.0004;
  scene.add(hemi, key, key.target);

  // The solid: faces and walls, turned together about the mark's middle.
  const obj = new THREE.Group();
  obj.matrixAutoUpdate = false;
  scene.add(obj);

  const R1 = MESH_SUB + 1;
  const count = R1 * R1;
  const lattice = (nz) => {
    const g = new THREE.BufferGeometry();
    const uv = new Float32Array(count * 2);
    const nrm = new Float32Array(count * 3);
    for (let j = 0; j <= MESH_SUB; j++) for (let i = 0; i <= MESH_SUB; i++) {
      const k = j * R1 + i;
      uv[k * 2] = i / MESH_SUB;
      uv[k * 2 + 1] = j / MESH_SUB;
      nrm[k * 3 + 2] = nz;
    }
    const idx = [];
    for (let j = 0; j < MESH_SUB; j++) for (let i = 0; i < MESH_SUB; i++) {
      const a = j * R1 + i, b = a + 1, c = a + R1, d = c + 1;
      if (nz >= 0) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c);
    }
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
    g.setIndex(idx);
    return g;
  };
  const frontGeo = lattice(1);
  const backGeo = lattice(-1);

  const maskTex = new THREE.Texture();
  maskTex.flipY = false;
  maskTex.generateMipmaps = true;
  maskTex.minFilter = THREE.LinearMipmapLinearFilter;
  maskTex.anisotropy = renderer.capabilities.getMaxAnisotropy();

  // The face unlit, so it is the mark's own pure white or black at any turn; the walls take the light.
  const frontMat = new THREE.MeshBasicMaterial({ color: '#ffffff', alphaMap: maskTex, alphaTest: 0.5, alphaToCoverage: true });
  const backMat = new THREE.MeshLambertMaterial({ color: TONES.black.back, alphaMap: maskTex, alphaTest: 0.5, alphaToCoverage: true });
  const sideMat = new THREE.MeshLambertMaterial({ color: TONES.black.side, side: THREE.DoubleSide });
  const front = new THREE.Mesh(frontGeo, frontMat);
  const back = new THREE.Mesh(backGeo, backMat);
  for (const m of [front, back]) { m.castShadow = true; m.frustumCulled = false; }
  obj.add(front, back);

  // The walls, made when the source is known.
  let walls = null;
  let contours = [];

  // Behind it, the ground itself: a plane that only takes the shadow (grey, on white; none on black).
  const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShadowMaterial({ opacity: 0.2 }));
  shadowPlane.receiveShadow = true;
  scene.add(shadowPlane);

  const toWorld = (x, y, W, H) => [(x - W / 2) / H, (H / 2 - y) / H];
  let view = { W: 1, H: 1 };
  let lastSize = '';
  const objInv = new THREE.Matrix4();

  function setSource(src, outl) {
    maskTex.image = rasterize(src, Math.min(4096, renderer.capabilities.maxTextureSize)); // as fine as the flat stage's
    maskTex.needsUpdate = true;
    contours = outl.flatMap((p) => p.contours);
    buildWalls();
  }

  function buildWalls() {
    if (walls) { obj.remove(walls); walls.geometry.dispose(); }
    let segs = 0;
    for (const c of contours) segs += c.length;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(segs * 4 * 3), 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(segs * 4 * 3), 3).setUsage(THREE.DynamicDrawUsage));
    const idx = new Uint32Array(segs * 6);
    for (let s = 0; s < segs; s++) {
      const v = s * 4; // a0 a1 b0 b1: front and back at each end
      idx.set([v, v + 1, v + 2, v + 2, v + 1, v + 3], s * 6);
    }
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    walls = new THREE.Mesh(g, sideMat);
    walls.castShadow = true;
    walls.frustumCulled = false;
    obj.add(walls);
  }

  const pt = [0, 0];
  const bounds = { x0: 0, y0: 0, x1: 0, y1: 0 };
  /** Every outline point to the world (toW: mark units to world x, y), run back by depth; note their extent. */
  function updateWalls(toW, depth) {
    if (!walls) return;
    const pos = walls.geometry.attributes.position.array;
    const nrm = walls.geometry.attributes.normal.array;
    let o = 0;
    const cos35 = Math.cos((35 * Math.PI) / 180);
    bounds.x0 = bounds.y0 = Infinity;
    bounds.x1 = bounds.y1 = -Infinity;
    for (const c of contours) {
      const L = c.length;
      const P = new Float32Array(L * 2);
      for (let i = 0; i < L; i++) {
        const [x, y] = toW(c[i][0], c[i][1], pt);
        P[i * 2] = x; P[i * 2 + 1] = y;
        if (x < bounds.x0) bounds.x0 = x; if (x > bounds.x1) bounds.x1 = x;
        if (y < bounds.y0) bounds.y0 = y; if (y > bounds.y1) bounds.y1 = y;
      }
      // Each segment's own normal, (dy, -dx), which faces the way its two triangles do.
      const N = new Float32Array(L * 2);
      for (let i = 0; i < L; i++) {
        const j = (i + 1) % L;
        const dx = P[j * 2] - P[i * 2], dy = P[j * 2 + 1] - P[i * 2 + 1];
        const len = Math.hypot(dx, dy) || 1;
        N[i * 2] = dy / len; N[i * 2 + 1] = -dx / len;
      }
      // Smooth across gentle turns (the bends, the round slot ends), sharp at corners.
      const blend = (i, j) => {
        const d = N[i * 2] * N[j * 2] + N[i * 2 + 1] * N[j * 2 + 1];
        if (d < cos35) return [N[i * 2], N[i * 2 + 1]];
        const x = N[i * 2] + N[j * 2], y = N[i * 2 + 1] + N[j * 2 + 1];
        const len = Math.hypot(x, y) || 1;
        return [x / len, y / len];
      };
      for (let i = 0; i < L; i++) {
        const j = (i + 1) % L;
        const na = blend(i, (i - 1 + L) % L), nb = blend(i, j);
        const ends = [[P[i * 2], P[i * 2 + 1], na], [P[j * 2], P[j * 2 + 1], nb]];
        for (const [x, y, n] of ends) {
          for (const z of [0, -depth]) {
            pos[o * 3] = x; pos[o * 3 + 1] = y; pos[o * 3 + 2] = z;
            nrm[o * 3] = n[0]; nrm[o * 3 + 1] = n[1]; nrm[o * 3 + 2] = 0;
            o++;
          }
        }
      }
    }
    walls.geometry.attributes.position.needsUpdate = true;
    walls.geometry.attributes.normal.needsUpdate = true;
  }

  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const tmpM = new THREE.Matrix4();
  const tmpN = new THREE.Matrix4();
  const v3 = new THREE.Vector3();

  /**
   * Draw a frame. s: { W, H, dpr, verts (the flat stage's mesh, css px), placeMark (mark units to css px),
   * content [x, y, w, h], ground ('black' | 'white'), depth (css px), yaw, pitch (degrees) }.
   */
  function draw(s) {
    const { W, H } = s;
    view = { W, H };
    // Drawn at least twice the stage's css size: the face's cut edges come from its mask's coverage, which at
    // 1x steps along the slots' curves; the browser scales the canvas down, smooth. (A saved picture is larger anyway.)
    const ss = Math.max(s.dpr, 2);
    const w = Math.max(1, Math.round(W * ss)), h = Math.max(1, Math.round(H * ss));
    const sizeKey = `${w}x${h}`;
    if (sizeKey !== lastSize) {
      lastSize = sizeKey;
      renderer.setPixelRatio(1);
      renderer.setSize(w, h, false);
    }
    const [cx0, cy0, cw, ch] = s.content;

    // The faces and walls: the warped mark on the stage, run back by the depth.
    const depth = Math.max(0.002, s.depth / H);
    for (const [geo, z] of [[frontGeo, 0], [backGeo, -depth]]) {
      const pos = geo.attributes.position.array;
      for (let k = 0; k < count; k++) {
        const [x, y] = toWorld(s.verts[k * 2], s.verts[k * 2 + 1], W, H);
        pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = z;
      }
    }
    updateWalls((u, v, out) => { s.placeMark(u, v, out); const [x, y] = toWorld(out[0], out[1], W, H); out[0] = x; out[1] = y; return out; }, depth);
    frontGeo.attributes.position.needsUpdate = true;
    backGeo.attributes.position.needsUpdate = true;

    // The mask is the mark's own frame, within the lattice's.
    maskTex.repeat.set(1 / cw, 1 / ch);
    maskTex.offset.set(-cx0 / cw, -cy0 / ch);

    // Black and white: the face in the mark's own tone, the walls and the back in greys.
    const tone = TONES[s.ground] ?? TONES.black;
    frontMat.color.set(tone.face);
    sideMat.color.set(tone.side);
    backMat.color.set(tone.back);
    scene.background.set(s.ground === 'white' ? '#ffffff' : '#000000');
    shadowPlane.visible = tone.shadow > 0;
    shadowPlane.material.opacity = tone.shadow;

    // The turn, about the middle of the mark.
    const C = new THREE.Vector3((bounds.x0 + bounds.x1) / 2, (bounds.y0 + bounds.y1) / 2, -depth / 2);
    e.set(THREE.MathUtils.degToRad(s.pitch), THREE.MathUtils.degToRad(-s.yaw), 0, 'XYZ');
    q.setFromEuler(e);
    obj.matrix.makeTranslation(C.x, C.y, C.z).multiply(tmpM.makeRotationFromQuaternion(q)).multiply(tmpN.makeTranslation(-C.x, -C.y, -C.z));
    obj.matrixWorldNeedsUpdate = true;
    objInv.copy(obj.matrix).invert();

    // The ground behind, just past the farthest corner, filling the view.
    let far = -depth;
    for (const x of [bounds.x0, bounds.x1]) for (const y of [bounds.y0, bounds.y1]) for (const z of [0, -depth]) {
      v3.set(x, y, z).applyMatrix4(obj.matrix);
      far = Math.min(far, v3.z);
    }
    const wallZ = far - 0.004;
    const grow = ((D - wallZ) / D) * 1.02;
    shadowPlane.position.set(0, 0, wallZ);
    shadowPlane.scale.set((W / H) * grow, grow, 1);

    // The light: in front of the face, a little above it, and a little to the side that shows.
    const side = THREE.MathUtils.clamp(s.yaw / 20, -1, 1) * 0.24;
    const L = new THREE.Vector3(side, 0.5, 1).normalize().applyQuaternion(q);
    key.target.position.copy(C);
    key.position.copy(C).addScaledVector(L, 3);
    const ext = Math.max(bounds.x1 - bounds.x0, bounds.y1 - bounds.y0) * 0.75 + depth + 0.15;
    Object.assign(key.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext, near: 0.1, far: 8 });
    key.shadow.camera.updateProjectionMatrix();
    key.target.updateMatrixWorld();
    key.updateMatrixWorld();

    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    renderer.setRenderTarget(null);
    renderer.render(scene, camera);
  }

  const ray = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const localRay = new THREE.Ray();
  return {
    ready: Promise.resolve(),
    canvas,
    setSource,
    draw,
    /** A point of the mark's face (css px on the flat stage) to where the camera shows it, turned (css px). */
    project(x, y) {
      const { W, H } = view;
      const [wx, wy] = toWorld(x, y, W, H);
      v3.set(wx, wy, 0).applyMatrix4(obj.matrix).project(camera);
      return [(v3.x + 1) / 2 * W, (1 - v3.y) / 2 * H];
    },
    /** Where on the face (css px on the flat stage) a point of the screen falls, or null past its horizon. */
    unproject(X, Y) {
      const { W, H } = view;
      ray.setFromCamera(new THREE.Vector2((X / W) * 2 - 1, 1 - (Y / H) * 2), camera);
      localRay.copy(ray.ray).applyMatrix4(objInv);
      const hit = localRay.intersectPlane(plane, v3);
      if (!hit) return null;
      return [hit.x * H + W / 2, H / 2 - hit.y * H];
    },
    destroy() {
      for (const g of [frontGeo, backGeo, walls?.geometry, shadowPlane.geometry]) g?.dispose();
      for (const m of [frontMat, backMat, sideMat, shadowPlane.material]) m.dispose();
      maskTex.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
