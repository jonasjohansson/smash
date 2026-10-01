// Illusion: the mark as op art. The logo is already stripes (ten slots cut
// through a block), so this takes it the other way: fifteen optical
// illusions, each with the mark as its hidden or moving figure, live, in
// black and white. Stripe fields and phase (the mark only where lines stop or
// turn), orientation, Ouchi, Riley's waves, rings, echoes of its outline, the
// liquified swell, Vasarely's bulge, moiré, scanimation, motion-defined form,
// a stereogram, and reaction–diffusion grown from it.
//
// One WebGL context draws every tile in turn (illusion/gl.js); the mark comes
// in as its signed distance (illusion/field.js); the techniques are
// illusion/techniques.js. A tile draws only while it is on screen. Click a
// tile to see it wide; each has its MP4. ?t=0.5 holds every tile half way
// through its loop (for screenshots).

import { renderer } from './illusion/gl.js';
import { originalField, modularField } from './illusion/field.js';
import { TECHNIQUES, SIM_INIT, SIM_STEP, SIM_SHOW, stereogram } from './illusion/techniques.js';
import { SIZES_HINT } from './video.js';

const pad = (n) => String(n).padStart(2, '0');

export const HTML = `
  <section class="lab" id="illusion">
    <header class="ch-head">
      <h2 class="ch-name">Illusion</h2>
    </header>
    <div class="controls ill-bar">
      <button type="button" class="play" aria-label="Play or pause">Pause</button>
      <button type="button" class="which" aria-pressed="false" title="The original mark, or the modular one">Modular</button>
      <button type="button" class="invert" aria-pressed="false" aria-label="Black on white, or white on black">Invert</button>
    </div>
    <div class="ill-grid">
      ${TECHNIQUES.map((t, i) => `
      <figure class="ill-tile" data-id="${t.id}">
        <canvas></canvas>
        <figcaption class="label">${pad(i + 1)} ${t.name}</figcaption>
        <button type="button" class="ill-mp4" title="${SIZES_HINT}">MP4</button>
      </figure>`).join('')}
    </div>
  </section>`;

const STYLE = `
#illusion .ill-bar { padding: 0; background: none; }
#illusion .ill-bar [aria-pressed="true"] { color: var(--text); border-color: var(--text); }
#illusion .ill-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--gap); grid-auto-flow: dense; }
@media (max-width: 1100px) { #illusion .ill-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 640px) { #illusion .ill-grid { grid-template-columns: 1fr; } }
#illusion .ill-tile { position: relative; aspect-ratio: 4 / 3; background: #000; overflow: hidden; cursor: zoom-in; }
#illusion .ill-tile.wide { grid-column: 1 / -1; aspect-ratio: 16 / 9; cursor: zoom-out; }
#illusion .ill-tile canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
#illusion .ill-tile .label { position: absolute; left: 0; bottom: 0; padding: 6px 10px; background: #000; color: #fff; opacity: 1; }
#illusion .ill-mp4 { position: absolute; right: 8px; bottom: 8px; font: 12px/1 "Neue Montreal", sans-serif; color: #fff; background: #000; border: 1px solid #fff; padding: 5px 8px; cursor: pointer; opacity: 0; transition: opacity 0.2s; font-variant-numeric: tabular-nums; }
#illusion .ill-tile:hover .ill-mp4, #illusion .ill-mp4[data-busy], #illusion .ill-mp4:focus-visible { opacity: 1; }
#illusion .ill-tile .error { position: absolute; inset: 0; overflow: auto; font-size: 10px; }
`;

/** Where the mark sits in a w × h tile: [x, y, px a unit], fitted to fractions [fw, fh] of it. */
function fitOf(field, w, h, [fw, fh] = field.name === 'modular' ? [0.7, 0.5] : [0.6, 0.56]) {
  const s = Math.min((w * fw) / field.w, (h * fh) / field.h);
  return [(w - field.w * s) / 2, (h - field.h * s) / 2, s];
}

export function mount(section) {
  if (!document.getElementById('illusion-style')) {
    const style = document.createElement('style');
    style.id = 'illusion-style';
    style.textContent = STYLE;
    document.head.appendChild(style);
  }
  const params = new URLSearchParams(location.search);
  const FIXED = params.has('t') ? Number(params.get('t')) : null;
  const $ = (sel) => section.querySelector(sel);
  const r = renderer();
  const { gl } = r;

  // The marks' fields, and each one's distance as a texture, made when first asked for.
  const fields = {};
  async function field(name) {
    if (!fields[name]) {
      fields[name] = (async () => {
        const f = name === 'modular' ? await modularField() : originalField();
        f.tex = r.texture({ width: f.tw, height: f.th, data: f.sdf, internal: gl.R16F, format: gl.RED, type: gl.FLOAT });
        const L = new Float32Array(12);
        f.letters.slice(0, 6).forEach(([a, b], i) => { L[i * 2] = a; L[i * 2 + 1] = b; });
        f.lettersFlat = L;
        return f;
      })();
    }
    return fields[name];
  }

  const state = { mark: 'original', invert: false, playing: FIXED === null && !matchMedia('(prefers-reduced-motion: reduce)').matches, clock: 0 };
  let current = null; // the field in use

  const uniforms = (f, tech, w, h, time, dpr, fit = fitOf(f, w, h, tech.fit)) => ({
    uRes: [w, h],
    uTime: time,
    uPhase: (time % tech.loop) / tech.loop,
    uDpr: dpr,
    uInvert: state.invert ? 1 : 0,
    uSdf: { tex: f.tex },
    uBox: f.box,
    uSize: [f.w, f.h],
    uFit: fit,
    uStripes: f.stripes,
    uLetters: f.lettersFlat,
    uLetterN: Math.min(6, f.letters.length),
  });

  // Reaction–diffusion: a simulation per tile (and one per MP4), stepped on the shared context,
  // at a resolution set by the mark's size in the tile, so the pattern is always the mark's weight.
  function simulation(tech) {
    let pair = null;
    let key = '';
    let steps = 0;
    let lastLoop = -1;
    const sim = {
      /** Keep a simulation for a w × h tile with field f; start it over when either changes. */
      ensure(f, w, h) {
        const perUnit = tech.sim.cells / f.stripes[1]; // cells a mark unit
        const scale = fitOf(f, w, h, tech.fit)[2]; // pixels a mark unit
        const sw = Math.min(900, Math.max(8, Math.round((w / scale) * perUnit)));
        const sh = Math.max(8, Math.round((sw * h) / w));
        const k = `${f.name}:${sw}x${sh}`;
        if (k === key && pair) return;
        pair?.destroy();
        pair = r.pingpong(sw, sh);
        key = k;
        sim.reset(f);
      },
      reset(f) {
        const fit = fitOf(f, pair.width, pair.height, tech.fit);
        r.run(SIM_INIT, { ...uniforms(f, tech, pair.width, pair.height, 0, 1, fit), uMode: tech.sim.mode, uSeed: Math.random() * 1000 }, pair.width, pair.height, pair.a.fbo);
        steps = 0;
      },
      step(f, n) {
        const fit = fitOf(f, pair.width, pair.height, tech.fit);
        const u = { ...uniforms(f, tech, pair.width, pair.height, 0, 1, fit), uMode: tech.sim.mode, uF: tech.sim.F, uK: tech.sim.k };
        for (let i = 0; i < n; i++) {
          r.run(SIM_STEP, { ...u, uState: { tex: pair.a.tex } }, pair.width, pair.height, pair.b.fbo);
          pair.swap();
        }
        steps += n;
      },
      /** Bring it to time (seconds): start again each loop, then some steps a frame. */
      advance(f, time, perFrame) {
        const loop = Math.floor(time / tech.loop);
        if (loop !== lastLoop) { if (lastLoop !== -1) sim.reset(f); lastLoop = loop; }
        sim.step(f, perFrame);
      },
      get tex() { return pair?.a.tex; },
      get steps() { return steps; },
      destroy() { pair?.destroy(); pair = null; key = ''; },
    };
    return sim;
  }

  /** Draw technique tech at time (s) onto ctx, w × h device pixels. */
  function paint(tile, ctx, w, h, time, dpr) {
    const f = current;
    const { tech } = tile;
    if (tech.cpu) {
      const k = `${f.name}:${w}x${h}:${state.invert}`;
      if (tile.cpuKey !== k) {
        // The stereogram, at css-pixel dots, raised where the mark is.
        const cw = Math.max(1, Math.round(w / dpr)), ch = Math.max(1, Math.round(h / dpr));
        const fit = fitOf(f, cw, ch, tech.fit);
        const sdAt = (x, y) => {
          const ux = (x - fit[0]) / fit[2], uy = (y - fit[1]) / fit[2];
          const tx = Math.round((ux - f.box[0]) / f.box[2] * f.tw), ty = Math.round((uy - f.box[1]) / f.box[3] * f.th);
          if (tx < 0 || ty < 0 || tx >= f.tw || ty >= f.th) return 1;
          return f.sdf[ty * f.tw + tx];
        };
        const dots = stereogram(cw, ch, (x, y) => sdAt(x, y) < 0, Math.round(Math.min(110, cw / 4.5)));
        const img = new ImageData(cw, ch);
        for (let i = 0; i < dots.length; i++) {
          const v = state.invert ? 255 - dots[i] : dots[i];
          img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
          img.data[i * 4 + 3] = 255;
        }
        const c = document.createElement('canvas');
        c.width = cw; c.height = ch;
        c.getContext('2d').putImageData(img, 0, 0);
        tile.cpuImage = c;
        tile.cpuKey = k;
      }
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(tile.cpuImage, 0, 0, w, h);
      return;
    }
    if (tech.sim) {
      tile.sim ??= simulation(tech);
      tile.sim.ensure(f, w, h);
      // Ten steps a frame; none while held (a redraw when paused); with ?t, all at once up to simUntil.
      const n = tile.simUntil != null ? Math.max(0, tile.simUntil - tile.sim.steps) : tile.hold ? 0 : 10;
      tile.sim.advance(f, time, n);
      r.run(SIM_SHOW, { ...uniforms(f, tech, w, h, time, dpr), uState: { tex: tile.sim.tex }, uLevel: tech.sim.level }, w, h);
      r.copy(ctx, w, h);
      return;
    }
    r.run(tech.frag, uniforms(f, tech, w, h, time, dpr), w, h);
    r.copy(ctx, w, h);
  }

  // The tiles.
  const tiles = TECHNIQUES.map((tech) => {
    const el = section.querySelector(`.ill-tile[data-id="${tech.id}"]`);
    const canvas = el.querySelector('canvas');
    const tile = { tech, el, canvas, ctx: canvas.getContext('2d', { alpha: false }), w: 0, h: 0, dpr: 1, visible: false, dirty: true, broken: false };
    new ResizeObserver(() => {
      const b = el.getBoundingClientRect();
      tile.dpr = Math.min(window.devicePixelRatio || 1, 2);
      tile.w = Math.max(1, Math.round(b.width * tile.dpr));
      tile.h = Math.max(1, Math.round(b.height * tile.dpr));
      if (canvas.width !== tile.w || canvas.height !== tile.h) { canvas.width = tile.w; canvas.height = tile.h; }
      tile.dirty = true;
    }).observe(el);
    new IntersectionObserver(([e]) => { tile.visible = e.isIntersecting; tile.dirty = true; }).observe(el);
    el.addEventListener('click', (e) => {
      if (e.target.closest('.ill-mp4')) return;
      el.classList.toggle('wide');
      if (el.classList.contains('wide')) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
    return tile;
  });

  const timeOf = (tile) => (FIXED !== null ? FIXED * tile.tech.loop : state.clock);

  function draw(tile) {
    if (tile.broken || !current || !tile.w) return;
    try {
      tile.hold = !state.playing;
      paint(tile, tile.ctx, tile.w, tile.h, timeOf(tile), tile.dpr);
      tile.dirty = false;
    } catch (e) {
      tile.broken = true;
      console.error(`[identity] illusion ${tile.tech.id}`, e);
      tile.el.insertAdjacentHTML('beforeend', `<div class="error">${String(e.message).replace(/[<&]/g, (c) => (c === '<' ? '&lt;' : '&amp;'))}</div>`);
    }
  }

  let raf = 0;
  let last = 0;
  let away = false;
  let destroyed = false;
  function frame(now) {
    raf = 0;
    if (destroyed || away) return;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;
    if (state.playing) state.clock += dt;
    for (const tile of tiles) {
      if (!tile.visible) continue;
      // A simulation only moves on while playing; everything else is a function of time.
      if (state.playing || tile.dirty) draw(tile);
    }
    raf = requestAnimationFrame(frame);
  }
  const start = () => { if (!raf && !destroyed) { last = 0; raf = requestAnimationFrame(frame); } };

  // With ?t, the simulations are brought along to a fixed step, so a still shows the pattern grown.
  async function use(name) {
    current = await field(name);
    for (const tile of tiles) {
      tile.dirty = true;
      tile.sim?.destroy();
      tile.sim = null;
      if (FIXED !== null) tile.simUntil = 8000;
    }
    start();
  }
  const ready = use(state.mark).then(() => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res))));

  // The bar.
  const play = $('.play'), which = $('.which'), invert = $('.invert');
  const sync = () => {
    play.textContent = state.playing ? 'Pause' : 'Play';
    which.setAttribute('aria-pressed', String(state.mark === 'modular'));
    invert.setAttribute('aria-pressed', String(state.invert));
    section.querySelectorAll('.ill-tile').forEach((el) => { el.style.background = state.invert ? '#fff' : '#000'; });
  };
  play.addEventListener('click', () => { state.playing = !state.playing; sync(); });
  which.addEventListener('click', () => { state.mark = state.mark === 'modular' ? 'original' : 'modular'; sync(); use(state.mark); });
  invert.addEventListener('click', () => { state.invert = !state.invert; for (const t of tiles) t.dirty = true; sync(); });
  sync();

  // An MP4 of a tile: one loop, drawn at each frame's time; a simulation runs its own copy from the seed.
  for (const tile of tiles) {
    const dl = tile.el.querySelector('.ill-mp4');
    dl.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (dl.hasAttribute('data-busy') || !current) return;
      dl.setAttribute('data-busy', '');
      const shadow = { tech: tile.tech };
      try {
        const { renderVideo, sizeOf, save } = await import('./video.js');
        const [width, height] = sizeOf(e);
        const period = tile.tech.loop;
        const blob = await renderVideo({
          period, width, height,
          paint: (ctx, w, h, s) => paint(shadow, ctx, w, h, s, Math.max(1, Math.round(h / 540))),
          onProgress: (p) => { dl.textContent = `${Math.round(p * 100)}%`; },
        });
        save(blob, `smash-illusion-${tile.tech.id}-${state.mark}${state.invert ? '-paper' : ''}-${width}x${height}.mp4`);
      } catch (err) {
        console.error(`[identity] illusion ${tile.tech.id}: the video could not be made`, err);
      } finally {
        shadow.sim?.destroy();
        dl.removeAttribute('data-busy');
        dl.textContent = 'MP4';
      }
    });
  }

  return {
    ready,
    pause() { away = true; cancelAnimationFrame(raf); raf = 0; },
    resume() { away = false; start(); },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      for (const t of tiles) t.sim?.destroy();
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
    async snapshot() { return tiles[0].canvas.toDataURL('image/png'); },
  };
}
