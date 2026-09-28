// Mapping: the SMASH mark on a grid of mapping points, warped the way the
// studio maps light onto a building. A mesh warp as in MadMapper or Resolume,
// with the logo as its content: drag the points, pick a preset, give the bent
// letters depth. In black and white: the mark in white on black, or in black on
// white; the only greys are the depth's shading and the grid's thin lines.
//
// The maths is in mapping/warp.js (the grid, its interpolations, the presets
// and the motion), the outlines and the mask in mapping/source.js, the WebGL 2
// stage in mapping/render.js, the true 3D mode (three.js, loaded only when
// asked for) in mapping/solid.js, the grid's drawing in mapping/overlay.js, the
// SVG in mapping/export.js, and the panel in mapping/panel.js.
//
// The grid's frame is the mark's own (its outlines' bounds and a margin), so
// the handles sit just off the letters.

import {
  PRESETS, PRESET_INTERP, restGrid, copyGrid, mixGrids, warper, sampleMesh, resample, pose, animate, morphAt,
  easeInOut, clamp, folds, inv3, apply3,
} from './mapping/warp.js';
import { SOURCES, loadSource, availableSources, rasterize, outlines } from './mapping/source.js';
import { createRenderer, MESH_SUB } from './mapping/render.js';
import { createPanel, GROUNDS } from './mapping/panel.js';
import { drawGrid, BLEND } from './mapping/overlay.js';
import { warpedSVG } from './mapping/export.js';

const ID = 'mapping';
const STORE = 'smash-identity-mapping';
const OUT = [1920, 1080]; // the output the coordinates are read in, as a projector's

// The two grounds. ink and ground as [r, g, b] for the stage; shade: the 2.5D walls' grey, in shade and
// in the light; fog: how far the back of the walls fades into the ground, so the depth reads as distance.
const TONES = {
  black: { ink: [1, 1, 1], ground: [0, 0, 0], inkCss: '#fff', groundCss: '#000', shade: [0.16, 0.64], fog: 0.75 },
  white: { ink: [0, 0, 0], ground: [1, 1, 1], inkCss: '#000', groundCss: '#fff', shade: [0.3, 0.75], fog: 0.7 },
};
const INTERPS = ['smooth', 'linear', 'corner'];

const BASE = {
  source: 'original',
  cols: 5,
  rows: 4,
  interp: 'smooth', // smooth | linear | corner (a true corner pin, from the four corners only)
  grid: true,
  preset: 'flat',
  ground: 'black', // black: the mark in white on black | white: in black on white
  extrude: 'off', // off | 2.5d | 3d
  depth: 0.14, // of the mark's height
  angle: -58, // 2.5D: the direction the depth runs, degrees (0 right, 90 up)
  persp: 0, // 2.5D: 0 parallel, more and the back shrinks towards the middle
  yaw: 24, // 3D: how far it turns
  pitch: 10, // 3D: tilted towards you from above
  animate: 'off', // off | drift | breathe | morph
  amount: 0.5,
  speed: 1,
  seed: 7,
};
const ENUMS = {
  source: SOURCES.map((s) => s.id), interp: INTERPS, preset: PRESETS,
  ground: Object.keys(TONES), extrude: ['off', '2.5d', '3d'], animate: ['off', 'drift', 'breathe', 'morph'],
};
// The panel's own ranges, so pasted or deck settings can't break a slide. [min, max, whole numbers]
const RANGES = {
  cols: [2, 12, true], rows: [2, 12, true],
  depth: [0, 0.6], angle: [-180, 180], persp: [0, 0.8], yaw: [-60, 60], pitch: [-45, 45],
  amount: [0, 1], speed: [0.1, 3], seed: [1, 999, true],
};

/** Settings from anywhere (this browser, the deck, a pasted JSON) made safe: known keys, of the right kind, in range. */
function sanitize(raw = {}) {
  const p = { ...BASE };
  for (const [k, v] of Object.entries(raw ?? {})) {
    if (!(k in BASE)) continue;
    if (ENUMS[k]) { if (ENUMS[k].includes(v)) p[k] = v; continue; }
    if (typeof v !== typeof BASE[k]) continue;
    if (typeof v === 'number') {
      if (!Number.isFinite(v)) continue;
      const r = RANGES[k];
      p[k] = r ? clamp(r[2] ? Math.round(v) : v, r[0], r[1]) : v;
    } else p[k] = v;
  }
  return p;
}
const validPoints = (pts, n, m) => Array.isArray(pts) && pts.length === n * m && pts.every((q) => Array.isArray(q) && q.length === 2 && q.every((v) => Number.isFinite(v) && Math.abs(v) < 20));

function load() {
  let raw = {};
  try { raw = JSON.parse(localStorage.getItem(STORE) || '{}') ?? {}; } catch { return {}; }
  // Points laid on a building (the surfaces are gone) belong to that photo's frame, not the mark's.
  if (raw && raw.surface === 'photo') delete raw.points;
  return raw;
}

// One line under the stage (the stage's own hint has the keys); a finger gets what a finger can do.
const NOTE = {
  fine: 'Drag a point, or a box of points. Alt-drag moves a row or column.',
  coarse: 'Drag a point. Double-tap puts it back.',
};

export const HTML = `
  <section class="lab" id="${ID}">
    <header class="ch-head">
      <p class="ch-n">00 · mapping</p>
      <h2 class="ch-name">Mapping</h2>
      <p class="ch-lane">The mark, mapped</p>
      <p class="ch-idea">The mark on a grid of mapping points. Pull them and it bends the way projected light does.</p>
    </header>
    <div class="lab-body">
      <div class="lab-stage"></div>
      <div class="lab-panel"></div>
    </div>
    <p class="lab-note label">${NOTE.fine}</p>
  </section>`;

const MONO = '"Roboto Mono", "Source Code Pro", Menlo, monospace';
const STYLE = `
#${ID} .lab-stage { user-select: none; -webkit-user-select: none; }
#${ID} .mp-overlay.kbd:focus { box-shadow: inset 0 0 0 1px rgba(128, 128, 128, 0.9); }
#${ID} .mp-hud { position: absolute; left: 12px; bottom: 9px; right: 12px; display: flex; gap: 14px; pointer-events: none; white-space: nowrap; overflow: hidden; font: 10px/1.3 ui-monospace, "SF Mono", Menlo, monospace; letter-spacing: 0.02em; color: rgba(255, 255, 255, 0.6); mix-blend-mode: ${BLEND}; }
#${ID} .mp-hud.top { bottom: auto; top: 9px; }
#${ID} .mp-state { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
#${ID} .mp-warn { flex: none; color: #fff; }
#${ID} .mp-warn:empty { display: none; }
#${ID} .mp-hint { flex: none; margin-left: auto; color: rgba(255, 255, 255, 0.85); transition: opacity 0.6s; }
#${ID} .mp-hint.gone { opacity: 0; }
@media (max-width: 640px) and (pointer: fine) { #${ID} .mp-hint { display: none; } }
/* No text on the stage (Jonas: no fluff): the status and the hint stay out; a warning still shows. */
#${ID} .mp-state, #${ID} .mp-hint { display: none; }
#${ID} .mp-msg { position: absolute; inset: 0; display: grid; place-items: center; color: #888; font-size: 13px; padding: 24px; text-align: center; }
#${ID} .lab-panel {
  --tp-base-background-color: hsl(0, 0%, 17%); --tp-base-shadow-color: rgba(0, 0, 0, 0.2);
  --tp-button-background-color: hsl(0, 0%, 70%); --tp-button-background-color-active: #d7d7d7;
  --tp-button-background-color-focus: #c9c9c9; --tp-button-background-color-hover: #bcbcbc;
  --tp-button-foreground-color: hsl(0, 0%, 17%);
  --tp-container-background-color: rgba(190, 190, 190, 0.1); --tp-container-background-color-active: rgba(190, 190, 190, 0.25);
  --tp-container-background-color-focus: rgba(190, 190, 190, 0.2); --tp-container-background-color-hover: rgba(190, 190, 190, 0.15);
  --tp-container-foreground-color: hsl(0, 0%, 75%); --tp-groove-foreground-color: rgba(190, 190, 190, 0.1);
  --tp-input-background-color: rgba(190, 190, 190, 0.1); --tp-input-background-color-active: rgba(190, 190, 190, 0.25);
  --tp-input-background-color-focus: rgba(190, 190, 190, 0.2); --tp-input-background-color-hover: rgba(190, 190, 190, 0.15);
  --tp-input-foreground-color: hsl(0, 0%, 75%); --tp-label-foreground-color: rgba(190, 190, 190, 0.7);
  --tp-monitor-background-color: rgba(0, 0, 0, 0.2); --tp-monitor-foreground-color: rgba(190, 190, 190, 0.7);
}
#${ID} .mp-strips { background: hsl(0, 0%, 17%); border-radius: 6px; padding: 8px 6px 6px; margin-bottom: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.2); display: grid; gap: 10px; }
#${ID} .mp-strip p { margin: 0 2px 6px; font: 11px/1.2 ${MONO}; color: rgba(190, 190, 190, 0.7); display: flex; justify-content: space-between; align-items: center; gap: 8px; }
#${ID} .mp-hist { display: flex; gap: 3px; }
#${ID} .mp-btn { appearance: none; border: 0; margin: 0; padding: 3px 6px; border-radius: 3px; background: rgba(190, 190, 190, 0.1); color: rgba(190, 190, 190, 0.85); cursor: pointer; font: 10px/1.2 ${MONO}; }
#${ID} .mp-btn:hover:not(:disabled) { background: rgba(190, 190, 190, 0.2); color: #fff; }
#${ID} .mp-btn:disabled { opacity: 0.35; cursor: default; }
#${ID} .mp-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 3px; }
#${ID} .mp-grid.mp-two { grid-template-columns: repeat(2, minmax(0, 1fr)); }
#${ID} .mp-chip { appearance: none; border: 0; margin: 0; padding: 5px 0 4px; border-radius: 3px; background: rgba(190, 190, 190, 0.08); color: rgba(190, 190, 190, 0.72); cursor: pointer; display: grid; justify-items: center; gap: 3px; font: 9.5px/1 ${MONO}; letter-spacing: -0.02em; min-width: 0; }
#${ID} .mp-chip > span { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
#${ID} .mp-chip:hover { background: rgba(190, 190, 190, 0.16); color: #fff; }
#${ID} .mp-chip:focus-visible, #${ID} .mp-btn:focus-visible { outline: 1px solid rgba(255, 255, 255, 0.8); }
#${ID} .mp-chip svg { width: 100%; max-width: 44px; height: 26px; display: block; }
#${ID} .mp-chip[data-preset] svg path { fill: none; stroke: currentColor; stroke-width: 0.9; vector-effect: non-scaling-stroke; }
#${ID} .mp-chip[aria-pressed="true"] { background: rgba(255, 255, 255, 0.14); color: #fff; box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.55); }
#${ID} .mp-ground svg { max-width: 64px; border-radius: 2px; box-shadow: 0 0 0 1px rgba(190, 190, 190, 0.28); }
#${ID} .tp-btnv_b { background: rgba(190, 190, 190, 0.1); color: rgba(224, 224, 224, 0.9); font-family: ${MONO}; border-radius: 3px; }
#${ID} .tp-btnv_b:hover { background: rgba(190, 190, 190, 0.2); }
#${ID} .tp-btnv_b:active { background: rgba(255, 255, 255, 0.24); color: #fff; }
@media (max-width: 900px) { #${ID} .lab-panel { max-height: none; overflow: visible; } }
`;

/** Where the mark's own frame sits in a frame of aspect A: [x, y, w, h], keeping its proportions. */
function contentRect(mk, A, markAspect) {
  let h = mk.h, w = (h * markAspect) / A;
  if (w > mk.maxW) { w = mk.maxW; h = (w * A) / markAspect; }
  return [mk.cx - w / 2, mk.cy - h / 2, w, h];
}

/**
 * Mount the tool in its section. Returns { ready, snapshot(view), svg(), settings(), handles(), pause(), resume(), destroy() }.
 * With settings, it starts from the defaults plus those and remembers nothing (the deck); the grid
 * then shows its lines without handles, unless settings.handles is true.
 * snapshot({ grid, t, width }): the frame as a PNG, at time t, with or without the grid, `width` px wide.
 */
export function mount(section, { panel = true, settings = null } = {}) {
  if (!document.getElementById(`${ID}-style`)) {
    document.head.insertAdjacentHTML('beforeend', `<style id="${ID}-style">${STYLE}</style>`);
  }
  const stage = section.querySelector('.lab-stage');
  const stored = settings ? settings : load();
  const params = sanitize(stored);
  // Whether the user chose the interpolation. If not, it follows the preset (a crease wants straight cells).
  let interpUser = !!stored && ('interp' in stored) && ENUMS.interp.includes(stored.interp);
  const keep = !settings;
  const showHandles = panel || settings?.handles === true;

  // ---------------------------------------------------------------- the stage
  const glCanvas = document.createElement('canvas');
  glCanvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;';
  // The grid's lines, drawn in white and laid on by difference, so they read on black, on white and
  // across the mark; above them, the handles, plainly (see overlay.js). Inline styles, so the stage
  // works in any markup (the deck's too), not only in this section.
  const lineCanvas = document.createElement('canvas');
  lineCanvas.style.cssText = `position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;mix-blend-mode:${BLEND};`;
  const overlay = document.createElement('canvas');
  overlay.className = 'mp-overlay';
  overlay.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;outline:none;touch-action:pan-y pinch-zoom;';
  if (getComputedStyle(stage).position === 'static') stage.style.position = 'relative';
  overlay.tabIndex = 0;
  overlay.setAttribute('role', 'application');
  overlay.setAttribute('aria-label', 'Mapping grid. Drag the points, or select one and move it with the arrow keys.');
  stage.append(glCanvas, lineCanvas, overlay);
  const lctx = lineCanvas.getContext('2d');
  const octx = overlay.getContext('2d');
  const coarse = matchMedia('(pointer: coarse)').matches;
  const note = section.querySelector('.lab-note');
  if (note) note.textContent = coarse ? NOTE.coarse : NOTE.fine;
  // A status line, as mapping software shows one, and a first hint. On the page only: never in a picture.
  const hud = panel ? document.createElement('div') : null;
  if (hud) {
    hud.className = 'mp-hud';
    hud.innerHTML = `<span class="mp-state"></span><span class="mp-warn"></span><span class="mp-hint">${coarse ? 'drag a point · double-tap puts it back' : 'drag a point · 1–0 presets · ⌘Z undo'}</span>`;
    stage.append(hud);
  }
  let renderer = null;
  try { renderer = createRenderer(glCanvas); } catch (e) { console.error('[mapping] WebGL did not start', e); }
  if (!renderer) stage.insertAdjacentHTML('beforeend', '<p class="mp-msg">This browser has no WebGL 2, which the mapping stage needs.</p>');

  let src = null; // the loaded source
  let grid = restGrid(params.cols, params.rows);
  let tween = null;
  let current = null; // the last frame's layout and warp, for the pointer and the exports
  let clock = 0;
  let running = true;
  let destroyed = false;
  let dirty = true;
  let raf = 0;
  let last = 0;
  const sel = new Set(); // the selected points
  let primary = -1; // the one whose coordinates show
  let hover = -1;
  let altHeld = false;
  let drag = null;
  const history = [];
  const future = [];
  let solid = null; // the 3D mode, when asked for
  let solidLoading = null;
  let ui = null; // the panel

  const touch = () => { dirty = true; };

  // ---------------------------------------------------------------- frames and poses
  /** The frame's aspect (the mark's own), and the struck preset's impact in it: none of it depends on the stage's size. */
  const frameInfo = () => ({ A: src?.aspect ?? 1, impact: src?.impact ?? [0.5, 0.5] });
  /** A preset's pose, made in the mark's frame. */
  function presetPose(name = params.preset, n = grid.n, m = grid.m) {
    const { A, impact } = frameInfo();
    return pose(name, n, m, { A, seed: params.seed, impact });
  }
  const isEdited = () => { const ref = presetPose(); return grid.n !== ref.n || grid.m !== ref.m || grid.p.some((v, i) => Math.abs(v - ref.p[i]) > 1e-5); };

  // A crease (fold, struck) wants straight cells.
  const preferredInterp = () => PRESET_INTERP[params.preset] ?? BASE.interp;
  const autoInterp = () => { if (!interpUser) params.interp = preferredInterp(); };
  if (!interpUser) params.interp = preferredInterp();

  // ---------------------------------------------------------------- settings
  let saveTimer = 0;
  function save() {
    if (!keep) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const changed = Object.fromEntries(Object.entries(params).filter(([k, v]) => v !== BASE[k] && k !== 'interp'));
      if (interpUser) changed.interp = params.interp;
      if (isEdited()) changed.points = pointsList();
      try { localStorage.setItem(STORE, JSON.stringify(changed)); } catch {}
    }, 250);
  }
  const pointsList = (g = grid) => Array.from({ length: g.n * g.m }, (_, k) => [+g.p[k * 2].toFixed(7), +g.p[k * 2 + 1].toFixed(7)]);
  const settingsJSON = () => JSON.stringify({ ...params, points: pointsList() }, null, 2);

  // ---------------------------------------------------------------- history
  const snap = () => ({ grid: copyGrid(grid), preset: params.preset, cols: grid.n, rows: grid.m, interp: params.interp, interpUser });
  function remember() {
    history.push(snap());
    if (history.length > 80) history.shift();
    future.length = 0;
  }
  function restore(s) {
    if (s.params) {
      // A whole state (Reset everything): every setting comes back, and the 3D mode with it or without it.
      const sourceWas = params.source;
      Object.assign(params, s.params);
      if (params.extrude !== '3d') dropSolid();
      if (params.source !== sourceWas) useSource(params.source);
    }
    grid = copyGrid(s.grid);
    Object.assign(params, { preset: s.preset, cols: s.cols, rows: s.rows, interp: s.interp });
    interpUser = s.interpUser;
    tween = null;
    for (const k of [...sel]) if (k >= grid.n * grid.m) sel.delete(k);
    if (primary >= grid.n * grid.m) primary = -1;
    refreshPanel();
    touch();
    save();
  }
  // Stepping over a whole-state entry keeps a whole state on the other side too.
  const undo = () => { if (!history.length) return; settle(); const s = history.pop(); future.push(s.params ? { ...snap(), params: { ...params } } : snap()); restore(s); };
  const redo = () => { if (!future.length) return; settle(); const s = future.pop(); history.push(s.params ? { ...snap(), params: { ...params } } : snap()); restore(s); };

  // ---------------------------------------------------------------- presets
  /** The base points as they are drawn this moment (mid-tween or not). */
  function base(now = performance.now()) {
    if (!tween) return grid;
    const k = easeInOut(clamp((now - tween.t0) / tween.dur));
    if (k >= 1) { tween = null; return grid; }
    return mixGrids(tween.from, grid, k);
  }
  function settle() { if (tween) { grid = copyGrid(base()); tween = null; } }
  function setPreset(name, { ease = true } = {}) {
    if (name === 'random' && params.preset === 'random') params.seed = (params.seed % 997) + 1; // again: a new throw
    remember();
    const from = copyGrid(base());
    params.preset = name;
    autoInterp(); // only if the user has not chosen one; never out of a corner pin they set
    grid = presetPose();
    tween = ease && from.n === grid.n && from.m === grid.m ? { from, t0: performance.now(), dur: 600 } : null;
    hintGone();
    refreshPanel();
    touch();
    save();
  }
  /** White on black, or black on white: a way of looking, not an edit, so it is not a step of undo. */
  function setGround(ground) {
    if (ground === params.ground || !(ground in TONES)) return;
    params.ground = ground;
    refreshPanel();
    touch();
    save();
  }

  // ---------------------------------------------------------------- layout
  /**
   * Where the frame sits on the stage: a 3 × 3 map from frame units (s, t) to
   * stage px, the mark's frame centred at its true proportions.
   */
  function layout(W = stage.clientWidth, H = stage.clientHeight) {
    const { A } = frameInfo();
    const [x, y, w, h] = contentRect({ cx: 0.5, cy: 0.5, h: 0.62, maxW: 0.74 }, W / H, A);
    const M = [W * w, 0, W * x, 0, H * h, H * y, 0, 0, 1];
    return { W, H, M, inv: inv3(M), A, content: [0, 0, 1, 1], heightPx: H * h };
  }

  // ---------------------------------------------------------------- the frame
  /** The points at time t: the base, then the motion on top. */
  function displayed(t) {
    const b = base();
    const posed = (name) => presetPose(name, b.n, b.m);
    const edits = params.animate === 'morph' ? (() => { const ref = presetPose(); return b.p.map((v, i) => v - ref.p[i]); })() : null;
    return animate(b, { mode: params.animate, amount: params.amount, speed: params.speed, seed: params.seed, A: frameInfo().A, t, edits, posed });
  }

  const mesh = new Float64Array((MESH_SUB + 1) * (MESH_SUB + 1) * 2);
  const verts = new Float32Array(mesh.length);
  const tmp = [0, 0];

  function frame(t = clock, dprAt = null, size = null) {
    if (!src || destroyed || !renderer) return false;
    const L = layout(size?.W, size?.H);
    if (!L.W || !L.H) return false;
    const disp = displayed(t);
    const warp = warper(disp, params.interp);
    const place = (s, q, out = tmp) => { warp(s, q, out); return apply3(L.M, out[0], out[1], out); };
    const [cx, cy, cw, ch] = L.content;
    const placeMark = (s, q, out = tmp) => place(cx + s * cw, cy + q * ch, out);
    const dpr = dprAt ?? Math.min(devicePixelRatio || 1, 2);
    const tone = TONES[params.ground];
    stage.classList.toggle('light', params.ground === 'white'); // the stage's own ground, while nothing is drawn

    // The mesh, bent through the grid and set on the stage.
    sampleMesh(disp, params.interp, MESH_SUB, mesh);
    const o = [0, 0];
    for (let k = 0; k < mesh.length; k += 2) {
      apply3(L.M, mesh[k], mesh[k + 1], o);
      verts[k] = o[0];
      verts[k + 1] = o[1];
    }
    const folded = folds(verts, MESH_SUB, [cx, cy, cx + cw, cy + ch]);
    current = { L, disp, warp, place, placeMark, t, folded, fallback: !!warp.fallback };

    const use3d = params.extrude === '3d';
    if (use3d) ensureSolid();
    glCanvas.style.display = use3d && solid ? 'none' : 'block';
    if (use3d && solid) {
      solid.draw({
        W: L.W, H: L.H, dpr, verts, placeMark, content: L.content, ground: params.ground,
        depth: params.depth * L.heightPx, yaw: params.yaw, pitch: params.pitch,
      });
    } else {
      renderer.draw({
        W: L.W, H: L.H, dpr, verts, content: L.content, color: tone.ink, ground: tone.ground,
        extrude: params.extrude === '2.5d' && params.depth > 0 ? extrusion(L, dpr, tone) : null,
      });
    }
    drawOverlay(dpr);
    updateHud(t);
    return true;
  }

  /** The 2.5D extrusion's settings for this frame: layers a device pixel or two apart along the depth. */
  function extrusion(L, dpr, tone) {
    const D = params.depth * L.heightPx;
    const a = (params.angle * Math.PI) / 180;
    const dir = [Math.cos(a), -Math.sin(a)]; // css px, y down
    // On screen, a layer every 1.8 device px; for a saved picture, every one, so its walls don't band.
    const steps = Math.min(1024, Math.max(2, Math.ceil((D * dpr) / (dpr > 2 ? 1 : 1.8))));
    const c = placeMarkCentre(L);
    const lightAngle = a + (75 * Math.PI) / 180; // lights one run of walls, leaves the other in shade
    return {
      step: [(dir[0] * D) / steps, (dir[1] * D) / steps], steps, center: c, persp: params.persp,
      // Walls in greys, apart from the face's white or black, so the letters keep their shape.
      shade: tone.shade, fog: tone.fog,
      light: [Math.cos(lightAngle), -Math.sin(lightAngle)],
    };
  }
  const placeMarkCentre = (L) => { const [cx, cy, cw, ch] = L.content; return current.place(cx + cw / 2, cy + ch / 2, [0, 0]); };

  // ---------------------------------------------------------------- the overlay
  // In 3D the mark's face turns, grid and all: these carry points of the flat stage to and from the screen.
  const in3d = () => params.extrude === '3d' && !!solid;
  const toScreen = (x, y) => (in3d() ? solid.project(x, y) : [x, y]);
  const fromScreen = (x, y) => (in3d() ? solid.unproject(x, y) : [x, y]);

  function handles() {
    if (!current) return [];
    const { disp } = current;
    const { n, m } = disp;
    const out = [];
    for (let j = 0; j < m; j++) {
      for (let i = 0; i < n; i++) {
        if (params.interp === 'corner' && !((i === 0 || i === n - 1) && (j === 0 || j === m - 1))) continue;
        const k = j * n + i;
        const [x, y] = apply3(current.L.M, disp.p[k * 2], disp.p[k * 2 + 1], [0, 0]);
        const [X, Y] = toScreen(x, y);
        out.push({ k, i, j, x: X, y: Y });
      }
    }
    return out;
  }

  function drawOverlay(dpr = Math.min(devicePixelRatio || 1, 2)) {
    if (!current) return;
    const { L, place, disp } = current;
    const w = Math.round(L.W * dpr), h = Math.round(L.H * dpr);
    for (const [c, x] of [[lineCanvas, lctx], [overlay, octx]]) {
      if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      x.clearRect(0, 0, L.W, L.H);
    }
    if (!params.grid) return;
    const tone = TONES[params.ground];
    drawGrid(lctx, octx, {
      L, place, disp, toScreen, fallback: current.fallback,
      hl: drag?.axis ?? (altHeld && hover >= 0 ? 'both' : null), hk: drag && drag.k >= 0 ? drag.k : hover,
      marquee: drag?.marquee ?? null, handles: showHandles ? handles() : null,
      sel, primary, hover, moving: drag?.moving, coarse, out: OUT, ink: tone.inkCss, paper: tone.groundCss,
    });
  }

  let hudText = '', warnText = '';
  const INTERP_NAME = { smooth: 'smooth', linear: 'linear', corner: 'corner pin' };
  function updateHud(t) {
    if (!hud) return;
    let name = params.preset;
    if (params.animate === 'morph') { const m = morphAt(t, params.speed); name = `morph · ${m.e < 0.5 ? m.a : m.b}`; }
    else if (!tween && isEdited()) name += ', edited';
    const txt = `${name} · ${grid.n} × ${grid.m} · ${INTERP_NAME[params.interp]}${params.extrude !== 'off' ? ` · ${params.extrude === '3d' ? '3D' : '2.5D'}` : ''}`;
    if (txt !== hudText) { hudText = txt; hud.children[0].textContent = txt; }
    const warn = current?.fallback ? 'not convex · bilinear' : current?.folded ? 'folds over itself' : '';
    if (warn !== warnText) { warnText = warn; hud.children[1].textContent = warn; }
    hud.style.visibility = params.grid ? 'visible' : 'hidden'; // a clean view is clean
    // Out of the handles' way: to the top while points sit along the bottom (a monolith standing on the ground).
    if (current && params.grid && !drag) {
      const band = coarse ? 34 : 28, H = current.L.H;
      const hs = handles();
      hud.classList.toggle('top', hs.some((p) => p.y > H - band) && !hs.some((p) => p.y < band));
    }
  }
  // Faded, then taken out of the line, so the status gets its room back (on a phone it needs it).
  const hintGone = () => {
    const h = hud?.lastElementChild;
    if (!h || h.classList.contains('gone')) return;
    h.classList.add('gone');
    setTimeout(() => { h.hidden = true; }, 650);
  };

  // ---------------------------------------------------------------- the pointer
  const local = (e) => { const r = overlay.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const pickRadius = (e) => (e.pointerType === 'touch' ? 22 : 11);
  function pick(x, y, radius) {
    if (!params.grid || !showHandles) return -1;
    let best = -1, bd = radius * radius;
    for (const p of handles()) {
      const d = (p.x - x) ** 2 + (p.y - y) ** 2;
      if (d <= bd) { bd = d; best = p.k; }
    }
    return best;
  }
  /** A point on the screen in frame units (through the turned face, in 3D). */
  function toFrame(x, y) {
    if (!current) return null;
    const q = fromScreen(x, y);
    if (!q) return null;
    return apply3(current.L.inv, q[0], q[1], [0, 0]);
  }
  /** Is the screen point inside the warped frame? (To drag the whole grid.) */
  function insideSurface(x, y) {
    if (!current) return false;
    const poly = [];
    const S = 24;
    const edge = (fn) => { for (let q = 0; q < S; q++) { const [s, t] = fn(q / S); const [a, b] = current.place(s, t, [0, 0]); poly.push(toScreen(a, b)); } };
    edge((u) => [u, 0]); edge((u) => [1, u]); edge((u) => [1 - u, 1]); edge((u) => [0, 1 - u]);
    let hit = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [ax, ay] = poly[i], [bx, by] = poly[j];
      if ((ay > y) !== (by > y) && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) hit = !hit;
    }
    return hit;
  }
  const rowOf = (k) => Array.from({ length: grid.n }, (_, i) => Math.floor(k / grid.n) * grid.n + i);
  const colOf = (k) => Array.from({ length: grid.m }, (_, j) => j * grid.n + (k % grid.n));
  const allPoints = () => Array.from({ length: grid.n * grid.m }, (_, i) => i);
  const selectable = () => (params.interp === 'corner' ? [0, grid.n - 1, grid.n * (grid.m - 1), grid.n * grid.m - 1] : allPoints());

  let grabbed = false;
  let pointerFocus = false;
  let lastTap = { k: -1, t: 0 };
  function onDown(e) {
    if (e.button > 0 && e.pointerType === 'mouse') return;
    const [x, y] = local(e);
    overlay.classList.remove('kbd');
    pointerFocus = true;
    overlay.focus({ preventScroll: true });
    pointerFocus = false;
    const k = pick(x, y, pickRadius(e));
    grabbed = false;
    if (k >= 0) {
      settle();
      if (e.shiftKey) { if (sel.has(k)) sel.delete(k); else sel.add(k); primary = sel.has(k) ? k : primary; touch(); return; }
      if (!sel.has(k)) { sel.clear(); sel.add(k); }
      primary = k;
      const f = toFrame(x, y);
      if (!f) return;
      remember();
      // Alt-drag moves the point's row or column, whichever way the drag first runs.
      const mode = e.altKey ? 'pending' : 'point';
      drag = { k, start: copyGrid(grid), f0: f, px: [x, y], mode, axis: null, moved: false, pointer: e.pointerType };
      drag.moving = [...sel];
      grabbed = true;
    } else if (showHandles && params.grid && e.pointerType !== 'touch' && (e.shiftKey || (!in3d() && !insideSurface(x, y)))) {
      // A box round points (from outside the surface, or anywhere with Shift).
      drag = { marquee: [x, y, x, y], add: e.shiftKey, before: new Set(sel) };
      grabbed = true;
    } else if (in3d()) {
      // In 3D, a drag off the points turns the solid.
      drag = { orbit: true, px: [x, y], yaw: params.yaw, pitch: params.pitch };
      grabbed = e.pointerType !== 'touch' || overlay.style.touchAction === 'none';
    } else if (params.grid && e.pointerType !== 'touch' && insideSurface(x, y)) {
      settle();
      const f = toFrame(x, y);
      if (!f) return;
      remember();
      drag = { k: -1, start: copyGrid(grid), f0: f, px: [x, y], mode: 'all', moving: allPoints(), moved: false };
      grabbed = true;
    } else {
      sel.clear();
      primary = -1;
    }
    if (grabbed) overlay.setPointerCapture(e.pointerId);
    touch();
  }
  function onMove(e) {
    const [x, y] = local(e);
    if (!drag) {
      const k = pick(x, y, pickRadius(e));
      altHeld = e.altKey;
      if (k !== hover) { hover = k; touch(); }
      const inside = params.grid && insideSurface(x, y);
      overlay.style.cursor = k >= 0 ? (e.altKey ? 'move' : 'grab') : in3d() ? 'grab' : inside ? 'move' : params.grid && showHandles ? 'crosshair' : 'default';
      return;
    }
    if (drag.marquee) {
      drag.marquee[2] = x;
      drag.marquee[3] = y;
      const [x0, y0, x1, y1] = drag.marquee;
      const bx = [Math.min(x0, x1), Math.max(x0, x1)], by = [Math.min(y0, y1), Math.max(y0, y1)];
      sel.clear();
      if (drag.add) for (const k of drag.before) sel.add(k);
      for (const p of handles()) if (p.x >= bx[0] && p.x <= bx[1] && p.y >= by[0] && p.y <= by[1]) { sel.add(p.k); primary = p.k; }
      touch();
      return;
    }
    if (drag.orbit) {
      // A slow turn, as a knob would be: 0.15° a pixel.
      params.yaw = clamp(drag.yaw + (x - drag.px[0]) * 0.15, -60, 60);
      params.pitch = clamp(drag.pitch - (y - drag.px[1]) * 0.12, -45, 45);
      overlay.style.cursor = 'grabbing';
      refreshPanel();
      touch();
      return;
    }
    const f = toFrame(x, y);
    if (!f) return;
    if (drag.mode === 'pending') {
      const dx = x - drag.px[0], dy = y - drag.px[1];
      if (Math.hypot(dx, dy) < 4) return;
      drag.axis = Math.abs(dy) > Math.abs(dx) ? 'row' : 'column';
      drag.mode = drag.axis;
      drag.moving = drag.axis === 'row' ? rowOf(drag.k) : colOf(drag.k);
    }
    const ds = f[0] - drag.f0[0], dt = f[1] - drag.f0[1];
    for (const k of drag.moving) {
      grid.p[k * 2] = drag.start.p[k * 2] + ds;
      grid.p[k * 2 + 1] = drag.start.p[k * 2 + 1] + dt;
    }
    if (Math.hypot(x - drag.px[0], y - drag.px[1]) > 2) drag.moved = true;
    hintGone();
    overlay.style.cursor = 'grabbing';
    touch();
  }
  function onUp(e) {
    if (drag && !drag.orbit && !drag.marquee && !drag.moved) {
      history.pop(); // a click, not a change
      if (drag.k >= 0) grid.p.set(drag.start.p);
      // A double tap on a point puts it back (touch has no double-click to speak of).
      if (drag.pointer === 'touch' && drag.k >= 0) {
        const now = performance.now();
        if (lastTap.k === drag.k && now - lastTap.t < 380) { resetPoint(drag.k); lastTap = { k: -1, t: 0 }; }
        else lastTap = { k: drag.k, t: now };
      }
    }
    if (drag && !drag.marquee) save();
    drag = null;
    grabbed = false;
    refreshPanel();
    touch();
  }
  function resetPoint(k) {
    settle();
    remember();
    const ref = presetPose();
    grid.p[k * 2] = ref.p[k * 2];
    grid.p[k * 2 + 1] = ref.p[k * 2 + 1];
    sel.clear();
    sel.add(k);
    primary = k;
    refreshPanel();
    touch();
    save();
  }
  function onDbl(e) {
    const [x, y] = local(e);
    const k = pick(x, y, 12);
    if (k >= 0) resetPoint(k);
  }

  // ---------------------------------------------------------------- the keys
  // Heard on the whole page while this tool is the one in view, not only when the stage has focus,
  // so Cmd-Z works straight after a preset is clicked, and 1–0 before anything is.
  let lastNudge = 0;
  const typing = (el) => !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
  function inView() {
    const r = section.getBoundingClientRect();
    return r.top < innerHeight * 0.65 && r.bottom > innerHeight * 0.35;
  }
  function onKey(e) {
    if (destroyed || !running || e.defaultPrevented) return;
    const t = e.target;
    if (typing(t)) return;
    const inside = section.contains(t);
    if (!inside && ((t && t !== document.body && t !== document.documentElement) || !inView())) return;
    const onControl = inside && t !== overlay && !!t.closest?.('.tp-rotv'); // Tweakpane's sliders keep their arrows
    const mod = e.metaKey || e.ctrlKey;
    if (t === overlay) overlay.classList.add('kbd'); // the focus ring is for keyboard use
    if (mod && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
    if (mod && (e.key === 'y' || e.key === 'Y')) { e.preventDefault(); redo(); return; }
    if (e.key === 'Alt') { altHeld = true; touch(); return; }
    if (mod || e.altKey) return;
    const arrows = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (arrows[e.key] && sel.size && current && !onControl) {
      e.preventDefault();
      settle();
      const now = performance.now();
      if (now - lastNudge > 700) remember();
      lastNudge = now;
      // One pixel of a 1920 × 1080 output, or ten with Shift, moved on the stage and read back in frame units.
      const step = (e.shiftKey ? 10 : 1) * (current.L.W / OUT[0]);
      for (const k of sel) {
        const [ax, ay] = apply3(current.L.M, grid.p[k * 2], grid.p[k * 2 + 1], [0, 0]);
        const b = apply3(current.L.inv, ax + arrows[e.key][0] * step, ay + arrows[e.key][1] * step, [0, 0]);
        grid.p[k * 2] = b[0];
        grid.p[k * 2 + 1] = b[1];
      }
      refreshPanel();
      touch();
      save();
      return;
    }
    if (onControl) return;
    if (e.key === ']' || e.key === '[') {
      e.preventDefault();
      const ks = selectable();
      const at = ks.indexOf(primary);
      primary = ks[(at + (e.key === ']' ? 1 : -1) + ks.length) % ks.length];
      sel.clear();
      sel.add(primary);
      touch();
      return;
    }
    if (e.key === 'Escape') { if (sel.size) { sel.clear(); primary = -1; touch(); } return; }
    if (e.key === 'g' || e.key === 'G') { params.grid = !params.grid; refreshPanel(); touch(); save(); return; }
    const n = '1234567890'.indexOf(e.key);
    if (n >= 0 && PRESETS[n]) { e.preventDefault(); setPreset(PRESETS[n]); }
  }
  const onKeyUp = (e) => { if (e.key === 'Alt' && altHeld) { altHeld = false; touch(); } };
  // On touch, a finger that lands on a point takes it instead of scrolling the page.
  const onTouchStart = (e) => { if (grabbed) e.preventDefault(); };
  overlay.addEventListener('pointerdown', onDown);
  overlay.addEventListener('pointermove', onMove);
  overlay.addEventListener('pointerup', onUp);
  overlay.addEventListener('pointercancel', onUp);
  overlay.addEventListener('pointerleave', () => { if (!drag && hover >= 0) { hover = -1; touch(); } });
  overlay.addEventListener('dblclick', onDbl);
  overlay.addEventListener('focus', () => { if (!pointerFocus) overlay.classList.add('kbd'); });
  overlay.addEventListener('touchstart', onTouchStart, { passive: false });
  if (panel) {
    document.addEventListener('keydown', onKey);
    document.addEventListener('keyup', onKeyUp);
  }
  const focusStage = () => { overlay.classList.remove('kbd'); pointerFocus = true; overlay.focus({ preventScroll: true }); pointerFocus = false; };

  // ---------------------------------------------------------------- 3D
  function ensureSolid() {
    if (solid || solidLoading) return;
    solidLoading = import('./mapping/solid.js').then(({ createSolid }) => {
      solidLoading = null;
      if (destroyed || params.extrude !== '3d') return;
      solid = createSolid(stage, lineCanvas); // under the grid
      if (src) solid.setSource(src, outlines(src, 1 / 300));
      // In 3D a drag on the stage turns it, up and down too: the page scrolls beside it.
      overlay.style.touchAction = 'none';
      touch();
    }).catch((e) => { solidLoading = null; console.error('[mapping] the 3D mode did not load', e); });
  }
  function dropSolid() {
    if (solid) { solid.destroy(); solid = null; }
    overlay.style.touchAction = 'pan-y pinch-zoom';
  }

  // ---------------------------------------------------------------- source
  function useSource(id) {
    return loadSource(id).then((s) => {
      if (destroyed || params.source !== id) return;
      const untouched = !src || !isEdited();
      const c = rasterize(s, Math.min(4096, renderer?.maxTex ?? 4096));
      renderer?.setMask(c);
      c.width = c.height = 0;
      src = s;
      if (untouched || grid.n !== params.cols || grid.m !== params.rows) { tween = null; grid = presetPose(params.preset, params.cols, params.rows); }
      solid?.setSource(s, outlines(s, 1 / 300));
      exportCache = null;
      touch();
    }).catch((e) => {
      console.error(`[mapping] ${id} did not load`, e);
      if (id !== 'original') { params.source = 'original'; refreshPanel(); return useSource('original'); }
    });
  }

  // The first grid: from the settings' own points, or the preset's.
  const firstPoints = stored?.points;
  const ready = useSource(params.source).then(() => {
    if (!src) return;
    grid = presetPose(params.preset, params.cols, params.rows);
    if (validPoints(firstPoints, params.cols, params.rows)) firstPoints.forEach(([s, t], k) => { grid.p[k * 2] = s; grid.p[k * 2 + 1] = t; });
    const waits = [];
    if (params.extrude === '3d') { ensureSolid(); waits.push(solidLoading?.then(() => solid?.ready)); }
    return Promise.all(waits);
  }).then(() => {
    if (destroyed) return;
    frame();
    dirty = false;
    return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  }).catch((e) => console.error('[mapping] did not start', e));

  // ---------------------------------------------------------------- the loop
  // Drawn when something changed, and while the points move.
  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;
    if (params.animate !== 'off') clock += dt;
    if (dirty || tween || params.animate !== 'off') {
      dirty = false;
      frame();
    }
  }
  raf = requestAnimationFrame(loop);
  const ro = new ResizeObserver(touch);
  ro.observe(stage);

  // ---------------------------------------------------------------- exports
  let exportCache = null;
  /**
   * The warped outlines as an SVG, on a 1920 × 1080 artboard: every outline point pushed
   * through the same warp, one plain even-odd path, in white on a black rectangle or black on
   * a white one, as the stage shows it. Where the surface folds over itself,
   * the mark is cut along the grid's cells (finer where the fold runs), one path each, so
   * the overlaps paint as they do on screen instead of cancelling out.
   */
  function exportSVG() {
    if (!src) return '';
    exportCache ??= outlines(src, 1 / 420);
    const W = stage.clientWidth || 960, H = (W * 9) / 16;
    const L = layout(W, H);
    const disp = displayed(clock);
    const warp = warper(disp, params.interp);
    const k = OUT[0] / W;
    const [cx, cy, cw, ch] = L.content;
    // Where it folds, from the same fine mesh the screen draws.
    const m64 = sampleMesh(disp, params.interp, MESH_SUB, new Float64Array((MESH_SUB + 1) ** 2 * 2));
    const px = new Float32Array(m64.length);
    const o = [0, 0];
    for (let q = 0; q < m64.length; q += 2) { apply3(L.M, m64[q], m64[q + 1], o); px[q] = o[0]; px[q + 1] = o[1]; }
    const tone = TONES[params.ground];
    return warpedSVG({
      contours: exportCache.flatMap(({ contours }) => contours).map((c) => c.map(([s, t]) => [cx + s * cw, cy + t * ch])),
      toOut: (s, t) => { const q = warp(s, t, [0, 0]); apply3(L.M, q[0], q[1], q); return [q[0] * k, q[1] * k]; },
      size: OUT,
      fill: tone.inkCss,
      ground: tone.groundCss,
      about: `SMASH, mapped: ${src.id}, ${params.preset}, ${grid.n} × ${grid.m} points, ${params.interp}, ${GROUNDS[params.ground]}. Output ${OUT[0]} × ${OUT[1]}.${params.extrude !== 'off' ? ' The depth is not included: these are the outlines of the face.' : ''}`,
      content: L.content,
      n: grid.n,
      m: grid.m,
      folds: (box) => folds(px, MESH_SUB, box),
    });
  }
  const fileGround = () => GROUNDS[params.ground].replaceAll(' ', '-');
  const download = (href, name) => { const a = Object.assign(document.createElement('a'), { href, download: name }); document.body.append(a); a.click(); a.remove(); };

  /**
   * The frame as a PNG: the stage and, if the grid shows, the grid.
   * view: { t (seconds, for a moment of the motion), grid (true or false), width (px: drawn that wide, at exactly 16:9) }.
   */
  function snapshot(view = {}) {
    if (!src) return '';
    const t = typeof view.t === 'number' ? view.t : clock;
    const W = stage.clientWidth;
    const size = view.width && W ? { W, H: (W * 9) / 16 } : null;
    const dpr = size ? view.width / W : null;
    frame(t, dpr, size);
    const showGrid = view.grid ?? params.grid;
    // The 3D canvas may be drawn larger than the stage (supersampled): the picture is the stage's size.
    const from = in3d() ? solid.canvas : glCanvas;
    const c = document.createElement('canvas');
    c.width = overlay.width;
    c.height = overlay.height;
    const x = c.getContext('2d');
    x.imageSmoothingQuality = 'high';
    x.drawImage(from, 0, 0, c.width, c.height);
    // The grid laid on as the page lays it: by difference.
    if (showGrid) {
      x.globalCompositeOperation = BLEND;
      x.drawImage(lineCanvas, 0, 0, c.width, c.height);
      x.globalCompositeOperation = 'source-over';
      x.drawImage(overlay, 0, 0, c.width, c.height);
    }
    const url = c.toDataURL('image/png');
    c.width = c.height = 0;
    if (t !== clock || size) frame(); // back to the screen's own frame
    return url;
  }

  // ---------------------------------------------------------------- the panel
  let refreshPanel = () => {};
  let resizeFrom = null;
  let shownInterp = { interp: params.interp, user: interpUser }; // what the panel last showed
  if (panel) {
    ui = createPanel(section.querySelector('.lab-panel'), {
      params,
      sources: availableSources(),
      destroyed: () => destroyed,
      focusStage,
      setPreset,
      setGround,
      undo,
      redo,
      canUndo: () => history.length > 0,
      canRedo: () => future.length > 0,
      change: () => { touch(); save(); },
      useSource: (id) => useSource(id),
      // A slide of columns or rows is one step of undo. An untouched preset is posed again at the new
      // count (it stays itself, not "edited"); a surface the user has bent is resampled from where it started.
      resize(ev) {
        resizeFrom ??= { grid: copyGrid(base()), snap: snap(), edited: isEdited() };
        tween = null;
        grid = resizeFrom.edited ? resample(resizeFrom.grid, params.interp, params.cols, params.rows) : presetPose(params.preset, params.cols, params.rows);
        for (const k of [...sel]) if (k >= grid.n * grid.m) sel.delete(k);
        if (ev.last) {
          if (resizeFrom.grid.n !== grid.n || resizeFrom.grid.m !== grid.m) { history.push(resizeFrom.snap); future.length = 0; }
          resizeFrom = null;
        }
        refreshPanel();
        touch();
        save();
      },
      // Tweakpane has already set the new value: the step of undo carries the one before.
      interpChanged() {
        settle();
        const was = snap();
        Object.assign(was, { interp: shownInterp.interp, interpUser: shownInterp.user });
        history.push(was);
        future.length = 0;
        interpUser = true;
        sel.clear();
        primary = -1;
        refreshPanel();
        touch();
        save();
      },
      extrudeChanged() { if (params.extrude !== '3d') dropSolid(); refreshPanel(); touch(); save(); },
      seedChanged() { if (params.preset === 'random') grid = presetPose(); touch(); save(); },
      savePNG: () => download(snapshot({ width: 3840 }), `smash-mapping-${params.preset}-${fileGround()}.png`),
      saveSVG() {
        const url = URL.createObjectURL(new Blob([exportSVG()], { type: 'image/svg+xml' }));
        download(url, `smash-mapping-${src?.id ?? 'mark'}-${params.preset}-${fileGround()}.svg`);
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      },
      copySettings: () => navigator.clipboard?.writeText(settingsJSON()) ?? Promise.reject(new Error('no clipboard')),
      resetAll() {
        settle();
        history.push({ ...snap(), params: { ...params } });
        if (history.length > 80) history.shift();
        future.length = 0;
        const from = copyGrid(base());
        const sourceWas = params.source;
        Object.assign(params, BASE);
        interpUser = false;
        autoInterp();
        dropSolid();
        if (params.source !== sourceWas) useSource(params.source);
        grid = presetPose(params.preset, params.cols, params.rows);
        if (from.n === grid.n && from.m === grid.m) tween = { from, t0: performance.now(), dur: 600 };
        sel.clear();
        primary = -1;
        clock = 0;
        refreshPanel();
        touch();
        save();
      },
    });
    refreshPanel = () => { ui.refresh(); shownInterp = { interp: params.interp, user: interpUser }; };
  }
  return {
    ready,
    snapshot,
    /** The warped outlines as an SVG string (1920 × 1080). */
    svg: exportSVG,
    settings: () => JSON.parse(settingsJSON()),
    /** Where the points are on the stage (css px), for scripts. */
    handles: () => handles().map(({ k, i, j, x, y }) => ({ k, i, j, x, y })),
    pause() {
      if (!running) return;
      running = false;
      cancelAnimationFrame(raf);
    },
    resume() {
      if (running || destroyed) return;
      running = true;
      last = 0;
      dirty = true;
      raf = requestAnimationFrame(loop);
    },
    destroy() {
      destroyed = true;
      running = false;
      cancelAnimationFrame(raf);
      clearTimeout(saveTimer);
      ro.disconnect();
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('keyup', onKeyUp);
      ui?.dispose();
      dropSolid();
      renderer?.destroy();
      glCanvas.remove();
      lineCanvas.remove();
      overlay.remove();
      hud?.remove();
    },
  };
}
