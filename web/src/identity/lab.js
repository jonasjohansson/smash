// The mark, live: the generator. The parametric mark (mark.js) in black and
// white, every measure a setting; each letter can take its own measures, and
// the letters' crossbars can move, each a beat after the last. 2D, or 3D
// (extrude.js). No pictures and no glass: the focus round is the mark itself.

import { DEFAULTS, LETTERS, LETTER_KEYS, buildMark, markShape, paintMark } from '/js/mark.js?v=letters';
import { EXTRUDE_DEFAULTS } from './extrude-defaults.js';

const STORE = 'smash-identity-lab-bw';
/** Each letter's own measures, off (the whole mark's) until `own` is ticked. */
const freshLetters = () => LETTERS.map(() => ({ own: false, ...Object.fromEntries(LETTER_KEYS.map((k) => [k, DEFAULTS[k]])) }));
const BASE = {
  ...DEFAULTS, ...EXTRUDE_DEFAULTS,
  fit: 'contain', padding: 64, renderer: 'flat', light: false, invert: false,
  letters: freshLetters(),
  moving: false, // the letters' crossbars move, each a beat after the last
  reach: 70, // how far the crossbars move, in mark units either way
  beat: 4, // seconds for one full move
  lag: 0.16, // of a beat, from one letter to the next
};
const withLetters = (p, letters) => ({ ...p, letters: freshLetters().map((l, i) => ({ ...l, ...(letters?.[i] ?? {}) })) });

// Settings are a per-viewer convenience; the page works without them.
function load() {
  try { const stored = JSON.parse(localStorage.getItem(STORE) || '{}'); return withLetters({ ...BASE, ...stored }, stored.letters); } catch { return withLetters(BASE); }
}
function save(params) {
  const changed = Object.fromEntries(Object.entries(params).filter(([k, v]) => JSON.stringify(v) !== JSON.stringify(BASE[k])));
  try { localStorage.setItem(STORE, JSON.stringify(changed)); } catch {}
}

/**
 * The measures to draw with at time t (seconds): each letter's own where it has
 * them, and, while the letters move, every crossbar but the M's (it has none)
 * swinging a beat after the one before. No letters of their own: the original.
 */
function measuresAt(params, t) {
  const letters = params.letters.map((l, i) => {
    const own = l.own ? Object.fromEntries(LETTER_KEYS.map((k) => [k, l[k]])) : {};
    if (params.moving && i !== 1) {
      const base = own.crossbar ?? params.crossbar;
      const wave = Math.sin(((t / params.beat) - i * params.lag) * Math.PI * 2);
      own.crossbar = Math.min(411, Math.max(60, base + params.reach * wave));
    }
    return Object.keys(own).length ? own : null;
  });
  return letters.some(Boolean) ? { ...params, letters } : { ...params, letters: undefined };
}

export const LAB_HTML = `
  <section class="lab" id="original-live">
    <header class="ch-head">
      <h2 class="ch-name">The mark, live</h2>
      <p class="ch-lane">The generator</p>
      <p class="ch-idea">Every measure of the mark is a setting, letter by letter, in 2D and in 3D.</p>
    </header>
    <div class="lab-body">
      <div class="lab-stage"></div>
      <div class="lab-panel"></div>
    </div>
  </section>`;

/**
 * Mount the generator in its section. Returns { ready, snapshot(view), pause(), resume(), destroy() }.
 * With settings, it starts from BASE plus those and remembers nothing (the deck).
 */
export function mountLab(section, { panel = true, settings = null } = {}) {
  const stage = section.querySelector('.lab-stage');
  const params = settings ? withLetters({ ...BASE, ...settings }, settings.letters) : load();
  const keep = () => { if (!settings) save(params); };
  const t0 = performance.now();
  const now = () => (performance.now() - t0) / 1000;
  const flat = document.createElement('canvas');
  flat.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
  stage.append(flat);
  const fctx = flat.getContext('2d');
  const mask = document.createElement('canvas');
  const mctx = mask.getContext('2d');
  let destroyed = false;
  let paused = false;
  let raf = 0;

  const colors = () => (params.light ? ['#000', '#fff'] : ['#fff', '#000']); // [mark, ground]
  const use3d = () => params.renderer === '3d';
  const EXTRUDE_KEYS = Object.keys(EXTRUDE_DEFAULTS);
  const solidSettings = () => ({ ...Object.fromEntries(EXTRUDE_KEYS.map((k) => [k, params[k]])), ground: params.light ? 'white' : 'black' });
  let ext = null; // the extruded mark, made when 3D is first asked for
  let extLoading = null;

  function draw3d() {
    if (!ext && !extLoading) {
      extLoading = import('./extrude.js').then(({ createExtruded }) => {
        extLoading = null;
        if (destroyed || !use3d()) return;
        ext = createExtruded(stage, solidSettings());
      }).catch((e) => { extLoading = null; console.error('[identity] the extruded mark did not load', e); });
    }
    ext?.set(solidSettings());
  }

  function draw() {
    if (destroyed) return;
    const [fg, bg] = colors();
    stage.style.background = bg;
    flat.style.display = use3d() ? 'none' : 'block';
    if (use3d()) { draw3d(); return; }
    if (ext) { ext.destroy(); ext = null; }
    // 2D: the mark in one colour on the ground (the mask says where; the colour fills it).
    const W = stage.clientWidth;
    const H = stage.clientHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    flat.width = mask.width = Math.round(W * dpr);
    flat.height = mask.height = Math.round(H * dpr);
    mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    mctx.clearRect(0, 0, W, H);
    paintMark(mctx, markShape(measuresAt(params, now()), W, H), params.invert);
    fctx.setTransform(1, 0, 0, 1, 0, 0);
    fctx.clearRect(0, 0, flat.width, flat.height);
    fctx.fillStyle = fg;
    fctx.fillRect(0, 0, flat.width, flat.height);
    fctx.globalCompositeOperation = 'destination-in';
    fctx.drawImage(mask, 0, 0);
    fctx.globalCompositeOperation = 'source-over';
  }

  // While the letters move, draw on every frame.
  const move = () => {
    cancelAnimationFrame(raf);
    if (!params.moving || destroyed || paused) return;
    const tick = () => { draw(); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
  };

  const ro = new ResizeObserver(() => draw());
  ro.observe(stage);
  draw();
  move();
  const ready = Promise.resolve()
    .then(() => extLoading)
    .then(() => ext?.ready)
    .then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

  let pane = null;
  let PaneClass = null;
  function buildPane() {
    if (destroyed || !PaneClass) return;
    pane = new PaneClass({ container: section.querySelector('.lab-panel'), title: 'SMASH mark' });
    const change = () => { draw(); keep(); };
    const look = pane.addFolder({ title: 'Look' });
    look.addBinding(params, 'renderer', { label: 'view', options: { '2D': 'flat', '3D': '3d' } });
    look.addBinding(params, 'light', { label: 'black on white' });
    look.addBinding(params, 'invert');
    look.addBinding(params, 'fit', { options: { proportional: 'contain', 'edge to edge': 'stretch' } });
    look.addBinding(params, 'padding', { min: 0, max: 240, step: 1 });

    const mark = pane.addFolder({ title: 'Mark' });
    mark.addBinding(params, 'stroke', { label: 'thickness', min: 2, max: 48, step: 0.5 });
    mark.addBinding(params, 'corner', { label: 'corners', min: 0, max: 40, step: 0.5 });
    mark.addBinding(params, 'caps', { label: 'ends', options: { round: 'round', square: 'square', flat: 'butt' } });
    mark.addBinding(params, 'inset', { label: 'end margin', min: 0, max: 200, step: 1 });
    mark.addBinding(params, 'crossbar', { min: 60, max: 411, step: 0.5 });
    mark.addBinding(params, 'gap', { label: 'crossbar gap', min: 20, max: 200, step: 0.5 });
    mark.addBinding(params, 'columns', { label: 'spread', min: 0.5, max: 1.12, step: 0.005 });

    // Each letter on its own: tick "own measures" and they override the whole mark's for its slots.
    const lf = pane.addFolder({ title: 'Letters', expanded: false });
    lf.addBinding(params, 'moving', { label: 'letters move' }).on('change', move);
    lf.addBinding(params, 'reach', { label: 'how far', min: 0, max: 160, step: 1 });
    lf.addBinding(params, 'beat', { label: 'beat (s)', min: 0.6, max: 12, step: 0.1 });
    lf.addBinding(params, 'lag', { label: 'lag per letter', min: 0, max: 0.5, step: 0.01 });
    lf.addButton({ title: 'Letters: surprise me' }).on('click', () => {
      const r = (a, b) => a + Math.random() * (b - a);
      params.letters.forEach((l) => Object.assign(l, {
        own: true, crossbar: Math.round(r(140, 330)), gap: Math.round(r(34, 90)), stroke: Math.round(r(12, 32)),
        corner: Math.round(r(0, 18)), inset: Math.round(r(20, 90)), caps: ['round', 'square', 'butt'][Math.floor(r(0, 3))],
      }));
      pane.refresh(); change();
    });
    lf.addButton({ title: 'Letters: as the mark' }).on('click', () => { params.letters = freshLetters(); rebuild(); change(); });
    params.letters.forEach((l, i) => {
      const f = lf.addFolder({ title: `${i + 1} ${LETTERS[i]}`, expanded: false });
      f.addBinding(l, 'own', { label: 'own measures' });
      if (i !== 1) {
        f.addBinding(l, 'crossbar', { min: 60, max: 411, step: 0.5 });
        f.addBinding(l, 'gap', { label: 'crossbar gap', min: 20, max: 200, step: 0.5 });
      }
      f.addBinding(l, 'stroke', { label: 'thickness', min: 2, max: 48, step: 0.5 });
      f.addBinding(l, 'corner', { label: 'corners', min: 0, max: 40, step: 0.5 });
      f.addBinding(l, 'caps', { label: 'ends', options: { round: 'round', square: 'square', flat: 'butt' } });
      f.addBinding(l, 'inset', { label: 'end margin', min: 0, max: 200, step: 1 });
    });

    // 3D follows the traced original (the letters' own measures are 2D only for now).
    const solid = pane.addFolder({ title: '3D', expanded: false });
    solid.addBinding(params, 'depth', { min: 0.02, max: 3, step: 0.01 });
    solid.addBinding(params, 'material', { options: { white: 'white', black: 'black' } });
    solid.addBinding(params, 'yaw', { label: 'turn', min: -90, max: 90, step: 1 });
    solid.addBinding(params, 'pitch', { label: 'from above', min: -8, max: 70, step: 1 });
    solid.addBinding(params, 'turntable');
    solid.addBinding(params, 'swing', { min: 0, max: 90, step: 1 });
    solid.addBinding(params, 'period', { label: 'swing (s)', min: 4, max: 40, step: 0.5 });
    solid.addBinding(params, 'floor');

    const download = (name, href) => Object.assign(document.createElement('a'), { href, download: name }).click();
    pane.addButton({ title: 'Export SVG' }).on('click', () => {
      const svg = buildMark({ ...measuresAt(params, now()), fit: 'contain', padding: 0, invert: false }, 1100, 942);
      const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
      download('smash-mark.svg', url);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    pane.addButton({ title: 'Save picture (PNG)' }).on('click', () => download('smash-mark.png', snapshot()));
    pane.addButton({ title: 'Copy settings' }).on('click', () => navigator.clipboard?.writeText(JSON.stringify(params, null, 2)));
    pane.addButton({ title: 'Reset' }).on('click', () => { Object.assign(params, withLetters(BASE)); rebuild(); change(); move(); });
    pane.on('change', change);
  }
  // Bindings hold the letter objects, so a fresh set of letters needs a fresh panel.
  function rebuild() { pane?.dispose(); pane = null; buildPane(); }
  if (panel) {
    import('https://cdn.jsdelivr.net/npm/tweakpane@4.0.5/dist/tweakpane.min.js')
      .then(({ Pane }) => { PaneClass = Pane; buildPane(); })
      .catch((e) => console.error('[identity] the settings panel did not load', e));
  }

  /** The current frame as a PNG data URL (in 3D, optionally from a view { yaw, pitch }). */
  function snapshot(view) {
    if (use3d() && ext) return ext.snapshot(view);
    const [, bg] = colors();
    const c = document.createElement('canvas');
    c.width = flat.width;
    c.height = flat.height;
    const x = c.getContext('2d');
    x.fillStyle = bg;
    x.fillRect(0, 0, c.width, c.height);
    x.drawImage(flat, 0, 0);
    return c.toDataURL('image/png');
  }

  return {
    ready,
    snapshot,
    pause() { paused = true; cancelAnimationFrame(raf); ext?.pause(); },
    resume() { paused = false; ext?.resume(); move(); },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      pane?.dispose();
      ext?.destroy();
      flat.remove();
    },
  };
}
