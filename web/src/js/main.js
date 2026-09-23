// Landing: a fast, shuffled cut through every project image, seen through the
// mark. Frames are decoded off the main thread a couple of dozen ahead and
// drawn to a canvas on the display's own clock, so a cut never waits on a
// decode; if the next frame is not ready the current one simply holds.
// A click opens the project on screen.
//
// Keys on the landing page: H opens the tweak panel (the mark is drawn from
// parameters, see mark.js), A inverts the mask, S swaps black for white.
// Anywhere: G shows the grid.

import { DEFAULTS, buildMark, toDataUrl } from './mark.js';
import { GLASS_DEFAULTS, createGlass } from './glass.js';

const AHEAD = 24;
const PARALLEL = 6;

const stage = document.querySelector('[data-stage]');
const framesEl = document.getElementById('frames');
const typing = (e) => e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement;

if (stage && framesEl) {
  const slide = stage.querySelector('.slide');
  const poster = slide.querySelector('img');
  const canvas = document.createElement('canvas');
  slide.append(canvas);

  // v2 draws the mark as liquid glass in WebGL; v1 (and v2 without WebGL 2)
  // masks a 2D canvas with CSS.
  const glass = stage.dataset.renderer === 'glass' ? createGlass(canvas) : null;
  const ctx = glass ? null : canvas.getContext('2d');
  if (glass) {
    slide.classList.add('is-glass');
    poster.decode().then(() => { if (!current) glass.setImage(poster); }).catch(() => {});
  }
  const STORE = glass ? 'smash-mark-v2' : 'smash-mark';
  const BASE = glass ? { ...DEFAULTS, ...GLASS_DEFAULTS } : { ...DEFAULTS };

  // Settings are a per-viewer convenience; the page works without them.
  const params = { ...BASE };
  try { Object.assign(params, JSON.parse(localStorage.getItem(STORE) || '{}')); } catch {}
  const save = () => { try { localStorage.setItem(STORE, JSON.stringify(params)); } catch {} };

  // ---- the mark ---------------------------------------------------------

  function drawMark() {
    const W = slide.clientWidth, H = slide.clientHeight;
    document.body.classList.toggle('light', params.light);
    if (glass) {
      glass.set({ refract: params.refract, aberr: params.aberr, shine: params.shine, bg: params.light ? [1, 1, 1] : [0, 0, 0] });
      glass.setMask(buildMark(params, W, H), W, H, params.rim);
      return;
    }
    const url = toDataUrl(buildMark(params, W, H));
    slide.style.webkitMaskImage = url;
    slide.style.maskImage = url;
  }

  // ---- the slideshow ----------------------------------------------------

  const size = matchMedia('(max-width: 720px)').matches ? 's' : 'l';
  const frames = JSON.parse(framesEl.textContent).filter(Boolean);

  // Shuffle, then break up runs from the same project.
  for (let i = frames.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [frames[i], frames[j]] = [frames[j], frames[i]];
  }
  for (let i = 1; i < frames.length; i++) {
    if (frames[i].slug !== frames[i - 1].slug) continue;
    const k = frames.findIndex((f, n) => n > i && f.slug !== frames[i - 1].slug);
    if (k > 0) [frames[i], frames[k]] = [frames[k], frames[i]];
  }

  const decoded = new Map(); // frame index -> ImageBitmap
  const pending = new Set();
  const broken = new Set();
  let next = 0; // the frame to cut to
  let current = null;

  const load = () => {
    for (let k = 0; k < AHEAD && pending.size < PARALLEL; k++) {
      const i = (next + k) % frames.length;
      if (decoded.has(i) || pending.has(i) || broken.has(i)) continue;
      pending.add(i);
      fetch(frames[i][size])
        .then((r) => r.blob())
        .then((blob) => createImageBitmap(blob))
        .then((bitmap) => decoded.set(i, bitmap))
        .catch(() => broken.add(i))
        .finally(() => { pending.delete(i); load(); });
    }
  };

  // object-fit: cover, by hand.
  function draw(bitmap) {
    if (glass) return glass.setImage(bitmap);
    const cw = canvas.width, ch = canvas.height;
    const scale = Math.max(cw / bitmap.width, ch / bitmap.height);
    const w = bitmap.width * scale, h = bitmap.height * scale;
    ctx.drawImage(bitmap, (cw - w) / 2, (ch - h) / 2, w, h);
  }

  const fit = () => {
    const dpr = Math.min(devicePixelRatio, 2);
    canvas.width = Math.round(slide.clientWidth * dpr);
    canvas.height = Math.round(slide.clientHeight * dpr);
    if (current) draw(current);
    drawMark();
  };

  const slow = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Cut on a whole number of display refreshes, so the rhythm is even:
  // 75 ms does not divide 60 Hz, and alternating 67/83 ms reads as a stagger.
  let refresh = 1000 / 60;
  let prev = 0;
  let ticks = 0;

  function tick(now) {
    if (prev) refresh += (Math.min(now - prev, 50) - refresh) * 0.05;
    prev = now;
    const every = Math.max(1, Math.round((slow ? 2500 : params.speed) / refresh));
    if (!document.hidden && !params.paused && ++ticks >= every) {
      if (broken.has(next)) next = (next + 1) % frames.length;
      const bitmap = decoded.get(next);
      if (bitmap) {
        draw(bitmap);
        if (poster.isConnected) poster.remove();
        decoded.delete(next);
        current?.close();
        current = bitmap;
        stage.href = `/work/${frames[next].slug}/`;
        next = (next + 1) % frames.length;
        ticks = 0;
        load();
      }
    }
    requestAnimationFrame(tick);
  }

  fit();
  addEventListener('resize', fit);
  load();
  requestAnimationFrame(tick);

  // ---- the tweak panel (H) -------------------------------------------------

  let pane = null;

  async function openPane() {
    const { Pane } = await import('https://cdn.jsdelivr.net/npm/tweakpane@4.0.5/dist/tweakpane.min.js');
    pane = new Pane({ title: glass ? 'SMASH v2' : 'SMASH' });
    pane.element.parentElement.classList.add('tweak');
    const change = () => { drawMark(); save(); };

    const mark = pane.addFolder({ title: 'Mark' });
    mark.addBinding(params, 'stroke', { label: 'thickness', min: 2, max: 48, step: 0.5 });
    mark.addBinding(params, 'corner', { label: 'corners', min: 0, max: 40, step: 0.5 });
    mark.addBinding(params, 'caps', { label: 'ends', options: { round: 'round', square: 'square', flat: 'butt' } });
    mark.addBinding(params, 'inset', { label: 'end margin', min: 0, max: 200, step: 1 });
    mark.addBinding(params, 'crossbar', { label: 'crossbar', min: 60, max: 411, step: 0.5 });
    mark.addBinding(params, 'gap', { label: 'crossbar gap', min: 20, max: 200, step: 0.5 });
    mark.addBinding(params, 'columns', { label: 'spread', min: 0.5, max: 1.12, step: 0.005 });

    const layout = pane.addFolder({ title: 'Layout' });
    layout.addBinding(params, 'fit', { options: { 'edge to edge': 'stretch', proportional: 'contain' } });
    layout.addBinding(params, 'padding', { min: 0, max: 200, step: 1 });
    layout.addBinding(params, 'invert', { label: 'invert (A)' });
    layout.addBinding(params, 'light', { label: 'white (S)' });

    if (glass) {
      const g = pane.addFolder({ title: 'Glass' });
      g.addBinding(params, 'refract', { label: 'refraction', min: 0, max: 6, step: 0.05 });
      g.addBinding(params, 'rim', { label: 'rim width', min: 4, max: 120, step: 1 });
      g.addBinding(params, 'aberr', { label: 'colour split', min: 0, max: 0.4, step: 0.005 });
      g.addBinding(params, 'shine', { min: 0, max: 1.5, step: 0.01 });
    }

    const show = pane.addFolder({ title: 'Slideshow' });
    show.addBinding(params, 'speed', { label: 'ms per image', min: 17, max: 1000, step: 1 });
    show.addBinding(params, 'paused');

    pane.addButton({ title: 'Export SVG' }).on('click', () => {
      const svg = buildMark({ ...params, fit: 'contain', padding: 0, invert: false }, 1100, 942);
      const a = Object.assign(document.createElement('a'), {
        href: URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })),
        download: 'smash-mark.svg',
      });
      a.click();
      URL.revokeObjectURL(a.href);
    });
    pane.addButton({ title: 'Copy settings' }).on('click', () => navigator.clipboard?.writeText(JSON.stringify(params, null, 2)));
    pane.addButton({ title: 'Reset' }).on('click', () => { Object.assign(params, BASE); pane.refresh(); change(); });

    pane.on('change', change);
  }

  document.addEventListener('keydown', async (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || typing(e)) return;
    const key = e.key.toLowerCase();
    if (key === 'h') {
      if (!pane) await openPane();
      else pane.hidden = !pane.hidden;
    }
    if (key === 'a' || key === 's') {
      if (key === 'a') params.invert = !params.invert;
      if (key === 's') params.light = !params.light;
      pane?.refresh();
      drawMark();
      save();
    }
  });
}

document.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'g' && !e.metaKey && !e.ctrlKey && !typing(e)) {
    document.body.classList.toggle('show-grid');
  }
});
