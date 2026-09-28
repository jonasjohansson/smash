// The mark as an object: the traced SMASH logo (brand/smash-logo.svg)
// extruded in three.js and seen from any side. Straight on it is the logo;
// turned, the slots become corridors and the letters a block of walls, the
// labyrinth the mark has always been. Pictures of the work can sit on its face.

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';

import { EXTRUDE_DEFAULTS } from './extrude-defaults.js';

export { EXTRUDE_DEFAULTS };

const COLORS = { white: '#f2f2f2', black: '#161616', dark: '#2a221c', cream: '#efe9df', yellow: '#f7be04', glass: '#ffffff', chrome: '#d9d9d9' };

/** SVG path data (M L H V C Q Z, absolute or relative) into a THREE.ShapePath, points mapped by map(x, y). */
function parsePath(d, map) {
  const sp = new THREE.ShapePath();
  const tokens = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) ?? [];
  let i = 0;
  let cmd = '';
  let x = 0, y = 0, sx = 0, sy = 0;
  const num = () => parseFloat(tokens[i++]);
  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i])) cmd = tokens[i++];
    else if (!cmd || cmd === 'z' || cmd === 'Z') { i++; continue; }
    const rel = cmd === cmd.toLowerCase();
    switch (cmd.toLowerCase()) {
      case 'm': {
        let nx = num(), ny = num();
        if (rel) { nx += x; ny += y; }
        x = sx = nx; y = sy = ny;
        sp.moveTo(...map(x, y));
        cmd = rel ? 'l' : 'L';
        break;
      }
      case 'l': { let nx = num(), ny = num(); if (rel) { nx += x; ny += y; } x = nx; y = ny; sp.lineTo(...map(x, y)); break; }
      case 'h': { let nx = num(); if (rel) nx += x; x = nx; sp.lineTo(...map(x, y)); break; }
      case 'v': { let ny = num(); if (rel) ny += y; y = ny; sp.lineTo(...map(x, y)); break; }
      case 'c': {
        const a = [num(), num(), num(), num(), num(), num()];
        if (rel) for (let k = 0; k < 6; k++) a[k] += k % 2 ? y : x;
        sp.bezierCurveTo(...map(a[0], a[1]), ...map(a[2], a[3]), ...map(a[4], a[5]));
        x = a[4]; y = a[5];
        break;
      }
      case 'q': {
        const a = [num(), num(), num(), num()];
        if (rel) for (let k = 0; k < 4; k++) a[k] += k % 2 ? y : x;
        sp.quadraticCurveTo(...map(a[0], a[1]), ...map(a[2], a[3]));
        x = a[2]; y = a[3];
        break;
      }
      case 'z': x = sx; y = sy; break;
      default: i++;
    }
  }
  return sp;
}

/** Outlines into shapes with holes, by nesting: a contour inside an odd number of others is a hole. */
function toShapes(shapePath) {
  const contours = shapePath.subPaths.map((p) => {
    const pts = p.getPoints(10);
    return { pts, area: Math.abs(THREE.ShapeUtils.area(pts)) };
  }).filter((c) => c.pts.length > 2 && c.area > 1e-6).sort((a, b) => b.area - a.area);
  const inside = ([x, y], poly) => {
    let hit = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [a, b] = [poly[i], poly[j]];
      if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) hit = !hit;
    }
    return hit;
  };
  const shapes = [];
  contours.forEach((c, k) => {
    const probe = [c.pts[0].x, c.pts[0].y];
    const parents = contours.slice(0, k).filter((o) => inside(probe, o.pts));
    c.depth = parents.length;
    if (c.depth % 2 === 0) { c.shape = new THREE.Shape(c.pts); shapes.push(c.shape); }
    else parents.at(-1).shape?.holes.push(new THREE.Path(c.pts));
  });
  return shapes;
}

/** A dim studio to reflect in: glass and chrome need something to show. */
function studio(renderer) {
  const scene = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.BoxGeometry(20, 12, 20), new THREE.MeshBasicMaterial({ color: 0x151515, side: THREE.BackSide }));
  scene.add(room);
  const panel = (w, h, pos, intensity) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(intensity, intensity, intensity * 0.97) }));
    m.position.set(...pos);
    m.lookAt(0, 0, 0);
    scene.add(m);
  };
  panel(8, 2, [0, 5.5, 2], 3);
  panel(2, 6, [-9, 1, 3], 1.4);
  panel(2, 6, [9, 1, -3], 0.8);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(scene, 0.03).texture;
  pmrem.dispose();
  return env;
}

/** Mount in el (sized by the page). Returns { ready, set(params), setImage(img), pause(), resume(), snapshot(), destroy() }. */
export function createExtruded(el, initial = {}) {
  const params = { ...EXTRUDE_DEFAULTS, ...initial };
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const canvas = renderer.domElement;
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;cursor:grab;';
  el.appendChild(canvas);

  const scene = new THREE.Scene();
  const ground = new THREE.Color('#000');
  scene.background = ground;
  scene.fog = new THREE.Fog(ground, 5, 13); // the floor fades into the room
  scene.environment = studio(renderer);
  const camera = new THREE.PerspectiveCamera(28, 16 / 9, 0.05, 100);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x202020, 0.9));
  const fill = new THREE.DirectionalLight(0xffffff, 0.5);
  fill.position.set(1.5, 0.8, 4);
  scene.add(fill);
  const key = new THREE.DirectionalLight(0xffffff, 3.2);
  key.position.set(-2.2, 3.2, 3.4);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.radius = 6;
  Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 0.5, far: 12 });
  key.shadow.bias = -0.0004;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 0.9);
  rim.position.set(3, 1.2, -3);
  scene.add(rim);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: '#0c0c0c', roughness: 0.92 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const texture = new THREE.Texture();
  texture.colorSpace = THREE.SRGBColorSpace;
  let imageAspect = 1;
  const side = new THREE.MeshPhysicalMaterial({ color: COLORS.dark, roughness: 0.55 });
  const face = new THREE.MeshPhysicalMaterial({ color: COLORS.dark, roughness: 0.5 });
  let mesh = null;
  let markW = 1;
  let builtDepth = -1;
  let shapes = null;

  const ready = fetch(new URL('/brand/smash-logo.svg', location.href)).then((r) => r.text()).then((text) => {
    const d = text.match(/<path[^>]*\sd="([^"]+)"/)[1];
    const vb = text.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
    const [W, H] = [parseFloat(vb[1]), parseFloat(vb[2])];
    // The trace's own frame: translate(0, H) scale(0.1, -0.1), flipped again for y up; one unit is the mark's height.
    const map = (px, py) => [(0.1 * px - W / 2) / H, (0.1 * py - H / 2) / H];
    shapes = toShapes(parsePath(d, map));
    markW = W / H;
    build();
    frame();
  });

  function build() {
    if (!shapes || builtDepth === params.depth) return;
    builtDepth = params.depth;
    if (mesh) { scene.remove(mesh); mesh.geometry.dispose(); }
    const bevel = 0.006;
    const geometry = new THREE.ExtrudeGeometry(shapes, {
      depth: Math.max(0.005, params.depth), bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 10,
    });
    geometry.translate(0, 0.5 + bevel, -params.depth / 2);
    mesh = new THREE.Mesh(geometry, [face, side]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    fitTexture();
  }

  // The picture covers the front face as object-fit: cover would (the caps' UVs are their x, y).
  function fitTexture() {
    const h = Math.max(1, markW / imageAspect);
    const w = h * imageAspect;
    // UVs are the shape's own x, y (centred on the mark), set before the mesh was lifted onto the floor.
    texture.repeat.set(1 / w, 1 / h);
    texture.offset.set(0.5, 0.5);
    texture.needsUpdate = true;
  }

  function look() {
    const m = params.material;
    const base = COLORS[m] ?? COLORS.dark;
    for (const mat of [side, face]) {
      mat.color.set(base);
      mat.metalness = m === 'chrome' ? 1 : 0;
      mat.roughness = m === 'chrome' ? 0.12 : m === 'glass' ? 0.04 : m === 'yellow' ? 0.45 : 0.55;
      mat.transmission = m === 'glass' ? 1 : 0;
      mat.thickness = m === 'glass' ? params.depth : 0;
      mat.ior = 1.48;
      mat.envMapIntensity = m === 'chrome' || m === 'glass' ? 1.2 : 0.5;
    }
    const pictures = params.faces && texture.image && m !== 'glass' && m !== 'chrome';
    face.map = pictures ? texture : null;
    if (pictures) face.color.set('#ffffff');
    face.needsUpdate = side.needsUpdate = true;
    floor.visible = params.floor;
    // The room: black or white, floor and fog with it.
    const white = params.ground === 'white';
    ground.set(white ? '#fff' : '#000');
    scene.fog.color.copy(ground);
    floor.material.color.set(white ? '#f2f2f2' : '#0c0c0c');
  }

  let yaw = params.yaw;
  let pitch = params.pitch;
  let dragging = null;
  let start = performance.now();
  let pausedAt = 0;

  function place(time) {
    const swing = params.turntable && !dragging ? params.swing * Math.sin((time / 1000 / params.period) * Math.PI * 2) : 0;
    const a = THREE.MathUtils.degToRad(yaw + swing);
    const p = THREE.MathUtils.degToRad(pitch);
    // Far enough that the mark, with room round it, fits the frame both ways.
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const dist = Math.max(0.78 / t, (markW * 0.78) / (t * camera.aspect));
    const target = new THREE.Vector3(0, 0.5, 0);
    camera.position.set(target.x + dist * Math.sin(a) * Math.cos(p), target.y + dist * Math.sin(p), target.z + dist * Math.cos(a) * Math.cos(p));
    camera.lookAt(target);
  }

  function frame(now = performance.now()) {
    const w = el.clientWidth, h = el.clientHeight;
    if (w && h) {
      if (canvas.width !== Math.round(w * renderer.getPixelRatio()) || canvas.height !== Math.round(h * renderer.getPixelRatio())) {
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
    }
    place(now - start);
    renderer.render(scene, camera);
  }

  let raf = 0;
  let running = true;
  const loop = (now) => { if (!document.hidden) frame(now); raf = requestAnimationFrame(loop); };
  raf = requestAnimationFrame(loop);

  const down = (e) => { dragging = { x: e.clientX, y: e.clientY, yaw, pitch }; canvas.setPointerCapture(e.pointerId); canvas.style.cursor = 'grabbing'; };
  const move = (e) => {
    if (!dragging) return;
    yaw = dragging.yaw + (e.clientX - dragging.x) * 0.3;
    pitch = THREE.MathUtils.clamp(dragging.pitch + (e.clientY - dragging.y) * 0.2, -8, 70);
  };
  const up = () => { dragging = null; canvas.style.cursor = 'grab'; start = performance.now() - 0; };
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);

  look();
  return {
    ready,
    set(next) {
      const yawChanged = next.yaw !== undefined && next.yaw !== params.yaw;
      const pitchChanged = next.pitch !== undefined && next.pitch !== params.pitch;
      Object.assign(params, next);
      if (yawChanged) yaw = params.yaw;
      if (pitchChanged) pitch = params.pitch;
      build();
      look();
    },
    setImage(img) {
      texture.dispose(); // a picture of another size needs a new upload, not an update
      texture.image = img;
      imageAspect = img.width / img.height;
      fitTexture();
      look();
    },
    pause() { if (!running) return; running = false; cancelAnimationFrame(raf); pausedAt = performance.now(); },
    resume() { if (running) return; running = true; start += performance.now() - pausedAt; raf = requestAnimationFrame(loop); },
    /** Draw one frame at a fixed view (yaw and pitch in degrees; the turntable held still) and return it as a PNG. */
    snapshot(view) {
      if (view) {
        const keep = { yaw, pitch, turntable: params.turntable };
        yaw = view.yaw ?? yaw; pitch = view.pitch ?? pitch; params.turntable = false;
        frame();
        const url = canvas.toDataURL('image/png');
        yaw = keep.yaw; pitch = keep.pitch; params.turntable = keep.turntable;
        return url;
      }
      frame();
      return canvas.toDataURL('image/png');
    },
    destroy() {
      cancelAnimationFrame(raf);
      running = false;
      canvas.removeEventListener('pointerdown', down);
      mesh?.geometry.dispose();
      texture.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
