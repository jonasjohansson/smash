// Shapes: the kit and what it makes. The negative shapes of the modular mark
// that are not letters, made solid, are a set of building blocks: the slot,
// the bend, the S's hook, the T-join, the closed end and the A's counter
// (shapes/kit.js). A row of them; then what they build: a bench to build a
// symbol by hand, and a gallery of symbols the grammar builds (shapes/
// grammar.js), as blocks stacked on the ground or as slots cut from a block,
// the S M's family; then patterns, the kit repeated without a seam. Black and
// white, no words: a click on a piece or a pattern downloads it as an SVG
// (true outlines, shapes/outline.js); a click on a symbol opens it on the
// bench (shift-click downloads it). The panel sets the grammar, rerolls it
// and exports.

import { KIT } from './shapes/kit.js';
import { symbol, symbolSteps, deal, pattern, GRIDS } from './shapes/grammar.js';
import { symbolSVG, kitSVG, patternSVG, ASSEMBLY_CSS, KIT_ASPECT } from './shapes/draw.js';
import { bench as mountBench } from './shapes/editor.js';

const STORE = 'smash-identity-shapes-kit';
const COLORS = {
  'white on black': ['#fff', '#000'],
  'black on white': ['#000', '#fff'],
};
export const SHAPES_DEFAULTS = {
  build: 'blocks', // blocks (the pieces, stacked on the ground) | cut (slots cut from a block)
  grid: 'mix', // mix | a key of GRIDS
  symmetry: 'mix', // mix | none | mirror | 2-fold | 4-fold
  density: 0.5, // 0 to 1: how much of the grid the pieces take
  colors: 'white on black',
  seed: 18, // the gallery a first visit sees (and the export writes)
};
/** How many symbols the gallery shows. */
export const COUNT = 24;
export const PATTERNS = ['border', 'field', 'turns'];

/** A task boundary that is not held back like a timeout: the page stays free between symbols. */
const rest = () => new Promise((r) => { const c = new MessageChannel(); c.port1.onmessage = () => r(); c.port2.postMessage(0); });

function load() {
  try { return { ...SHAPES_DEFAULTS, ...JSON.parse(localStorage.getItem(STORE) || '{}') }; } catch { return { ...SHAPES_DEFAULTS }; }
}
function save(p) {
  const changed = Object.fromEntries(Object.entries(p).filter(([k, v]) => v !== SHAPES_DEFAULTS[k]));
  try { localStorage.setItem(STORE, JSON.stringify(changed)); } catch {}
}

/** The gallery's symbol i for settings p, unlike those before it (`seen`: their shapes). */
export function galleryItem(p, i, dealt, seen = new Set()) {
  const d = dealt[i];
  const s = symbol(d.seed, { grid: d.grid, sym: d.sym, build: p.build, density: p.density, avoid: seen });
  seen.add(s.shape);
  return s;
}

/** The same, spread over tasks of about 8 ms each (the same symbol). `alive()` false stops it. */
async function galleryItemSliced(p, i, dealt, seen, alive) {
  const d = dealt[i];
  const steps = symbolSteps(d.seed, { grid: d.grid, sym: d.sym, build: p.build, density: p.density, avoid: seen });
  let t0 = performance.now();
  for (;;) {
    const r = steps.next();
    if (r.done) { seen.add(r.value.shape); return r.value; }
    if (performance.now() - t0 > 8) { await rest(); if (!alive()) return null; t0 = performance.now(); }
  }
}
/** The whole gallery at once (for the export). */
export const gallery = (p = SHAPES_DEFAULTS) => {
  const dealt = deal(p.seed, COUNT, { grid: p.grid, sym: p.symmetry, build: p.build });
  const seen = new Set();
  return dealt.map((_, i) => galleryItem(p, i, dealt, seen));
};
/** The patterns for settings p. */
export const patterns = (p = SHAPES_DEFAULTS) => PATTERNS.map((k) => pattern(p.seed, k, { build: p.build, density: p.density }));

export const HTML = `
  <section class="lab" id="shapes">
    <header class="ch-head">
      <p class="ch-n">00 · shapes</p>
      <h2 class="ch-name">Shapes</h2>
    </header>
    <div class="lab-body">
      <div class="lab-stage shapes-stage">
        <div class="kit"></div>
        <div class="works"><div class="bench"></div></div>
        <div class="patterns"></div>
      </div>
      <div class="lab-panel"></div>
    </div>
  </section>`;

// The stage: the kit in a row; the works, a grid of square cells (two, four
// or six across as it widens) with the bench on its first cells and the
// symbols after it; the patterns, a border the full width and two fields.
const STYLE = `
#shapes .lab-stage { aspect-ratio: auto; overflow: visible; padding: clamp(16px, 3.2vw, 44px); container-type: inline-size; display: grid; gap: clamp(40px, 7vw, 96px); background: var(--sh-bg); color: var(--sh-fg); }
#shapes button { display: block; min-width: 0; padding: 0; margin: 0; border: 0; background: none; color: inherit; font: inherit; cursor: pointer; -webkit-tap-highlight-color: transparent; }
#shapes svg { display: block; width: 100%; height: 100%; }
#shapes .kit { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); }
#shapes .kit button { aspect-ratio: var(--kit-ar); }
#shapes .works { --cols: 2; --gap: clamp(6px, 1.4cqi, 16px); display: grid; grid-template-columns: repeat(var(--cols), minmax(0, 1fr)); grid-auto-rows: calc((100cqi - (var(--cols) - 1) * var(--gap)) / var(--cols)); gap: var(--gap); }
#shapes .tile { width: 100%; height: 100%; }
#shapes .bench { display: grid; grid-template-columns: subgrid; grid-template-rows: subgrid; grid-column: span 2; grid-row: span 3; }
#shapes .board { grid-column: 1 / -1; grid-row: 1 / span 2; overflow: hidden; touch-action: none; cursor: crosshair; outline: 1px solid var(--sh-fg); outline-offset: -1px; user-select: none; -webkit-user-select: none; }
#shapes .tray { grid-column: 1 / -1; grid-row: 3; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); grid-template-rows: repeat(2, minmax(0, 1fr)); min-height: 0; }
#shapes .part { width: 100%; height: 100%; min-height: 0; }
#shapes .patterns { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: clamp(6px, 1.4cqi, 16px); }
#shapes .pat { width: 100%; overflow: hidden; aspect-ratio: 1; }
#shapes .pat.border { grid-column: 1 / -1; aspect-ratio: 9; }
@container (max-width: 559px) {
  #shapes .patterns { grid-template-columns: minmax(0, 1fr); }
  #shapes .pat.border { aspect-ratio: 4.5; }
}
@container (min-width: 560px) {
  #shapes .works { --cols: 4; }
  #shapes .bench { grid-column: span 4; grid-row: span 2; }
  #shapes .board { grid-column: 1 / span 2; grid-row: 1 / -1; }
  #shapes .tray { grid-column: 3 / span 2; grid-row: 1 / -1; }
}
@container (min-width: 860px) {
  #shapes .works { --cols: 5; }
  #shapes .bench { grid-column: span 3; grid-row: span 2; }
  #shapes .tray { grid-column: 3; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-template-rows: repeat(3, minmax(0, 1fr)); }
}
/* Outlines, not shadows: they are drawn over the marks, so a slot run off a block never breaks one. */
@media (hover: hover) { #shapes .tile:hover, #shapes .kit button:hover, #shapes .pat:hover, #shapes .part:hover { outline: 1px solid var(--sh-fg); outline-offset: -1px; } }
#shapes .tile.open { outline: 1px solid var(--sh-fg); outline-offset: -1px; }
#shapes button:focus-visible, #shapes .board:focus-visible { outline: 2px solid var(--sh-fg); outline-offset: -2px; }
/* The panel stays in view beside the tall stage. */
@media (min-width: 901px) { #shapes .lab-panel { position: sticky; top: 16px; } }
${ASSEMBLY_CSS}`;

/** Mount the section. Returns { ready, snapshot(), pause(), resume(), destroy() }. */
export function mount(section, { panel = true, settings = null } = {}) {
  const params = settings ? { ...SHAPES_DEFAULTS, ...settings } : load();
  const keep = () => { if (!settings) save(params); };
  const stage = section.querySelector('.lab-stage');
  const kitEl = stage.querySelector('.kit');
  const works = stage.querySelector('.works');
  const patsEl = stage.querySelector('.patterns');
  if (!document.getElementById('shapes-style')) {
    const style = document.createElement('style');
    style.id = 'shapes-style';
    style.textContent = STYLE;
    document.head.appendChild(style);
  }
  let destroyed = false;
  let syms = []; // the gallery, as drawn
  let pats = [];
  let run = 0; // the current build of the gallery; an older one stops

  const colors = () => COLORS[params.colors] ?? COLORS['white on black'];
  const download = (name, data) => {
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([data], { type: 'image/svg+xml' })), download: name });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const nn = (n) => String(n).padStart(2, '0');
  const outline = () => import('./shapes/outline.js');

  // The cells: the bench first, then a tile per symbol.
  works.insertAdjacentHTML('beforeend', Array.from({ length: COUNT }, (_, i) => `<button type="button" class="tile" data-i="${i}" aria-label="Symbol ${i + 1}"></button>`).join(''));
  const tiles = [...works.querySelectorAll('.tile')];
  kitEl.style.setProperty('--kit-ar', String(KIT_ASPECT));
  kitEl.innerHTML = KIT.map((k) => `<button type="button" data-k="${k}" aria-label="Download the ${k} as SVG"></button>`).join('');
  patsEl.innerHTML = PATTERNS.map((k, i) => `<button type="button" class="pat ${k}" data-i="${i}" aria-label="Download this pattern's tile as SVG"></button>`).join('');

  const bench = mountBench(stage.querySelector('.bench'), {
    onChange(s) {
      // A symbol opened from the gallery is changed there too.
      const i = bench.from;
      if (i === null || !syms[i]) return;
      syms[i] = s;
      const [fg, bg] = colors();
      tiles[i].innerHTML = symbolSVG(s, { fg, bg }).svg;
    },
    onHold(kind) { hand.piece = kind; pane?.refresh(); },
  });
  const hand = { piece: bench.held };

  function paint() {
    const [fg, bg] = colors();
    stage.style.setProperty('--sh-fg', fg);
    stage.style.setProperty('--sh-bg', bg);
    kitEl.querySelectorAll('button').forEach((b) => { b.innerHTML = kitSVG(b.dataset.k, { fg, bg: 'none' }); });
    bench.set({ build: params.build, fg, bg });
  }

  function drawTile(i, assemble = null) {
    const [fg, bg] = colors();
    tiles[i].innerHTML = syms[i] ? symbolSVG(syms[i], { fg, bg, assemble }).svg : '';
    tiles[i].classList.toggle('open', bench.from === i);
  }
  function drawPatterns() {
    const [fg, bg] = colors();
    patsEl.querySelectorAll('.pat').forEach((b, i) => {
      if (pats[i]) b.innerHTML = patternSVG(pats[i], { fg, bg, across: pats[i].kind === 'border' ? 12 : pats[i].kind === 'turns' ? 4 : pats[i].n > 4 ? 3 : 4 });
    });
  }

  // The gallery is built a symbol at a time, a task each; drawn, assembling
  // itself, once it is on the screen (or at once when asked to).
  let seen = false;
  let onScreen = null;
  const visible = new Promise((r) => { onScreen = r; });
  const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { seen = true; onScreen(); io.disconnect(); } }, { threshold: 0.05 });
  io.observe(works);

  async function build({ animate = true } = {}) {
    const my = ++run;
    const dealt = deal(params.seed, COUNT, { grid: params.grid, sym: params.symmetry, build: params.build });
    const next = [];
    const shapes = new Set();
    const alive = () => my === run && !destroyed;
    for (let i = 0; i < COUNT; i++) {
      await rest();
      if (!alive()) return;
      next[i] = await galleryItemSliced(params, i, dealt, shapes, alive);
      if (!alive()) return;
    }
    const nextPats = [];
    for (const [i, k] of PATTERNS.entries()) {
      await rest();
      if (my !== run || destroyed) return;
      nextPats[i] = pattern(params.seed, k, { build: params.build, density: params.density });
    }
    if (!seen) await visible;
    if (my !== run || destroyed) return;
    syms = next;
    pats = nextPats;
    // The bench shows the gallery's strongest symbol until something is built on it by hand; that is kept.
    if (bench.pristine) {
      const best = syms.reduce((b, s, i) => (s.score > syms[b].score ? i : b), 0);
      bench.open(syms[best], best);
      paint();
    } else bench.detach();
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Drawn in a few batches, each tile a little after the one before.
    for (let i = 0; i < COUNT; i += 6) {
      for (let k = i; k < Math.min(COUNT, i + 6); k++) drawTile(k, animate && !still ? k * 28 : null);
      await rest();
      if (my !== run || destroyed) return;
    }
    drawPatterns();
  }

  function redraw() {
    paint();
    syms.forEach((_, i) => drawTile(i));
    drawPatterns();
  }

  // Clicks: a piece or a pattern downloads; a symbol opens on the bench (shift: downloads).
  kitEl.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const k = b.dataset.k;
    download(`smash-kit-${nn(KIT.indexOf(k) + 1)}-${k}.svg`, await (await outline()).pieceSVG(k));
  });
  works.addEventListener('click', async (e) => {
    const t = e.target.closest('.tile');
    const i = t ? Number(t.dataset.i) : -1;
    if (!syms[i]) return;
    if (e.shiftKey || e.altKey) { download(`smash-symbol-${nn(i + 1)}.svg`, await (await outline()).symbolSVGFile(syms[i])); return; }
    bench.open(syms[i], i);
    tiles.forEach((x, k) => x.classList.toggle('open', k === i));
    const r = section.querySelector('.bench').getBoundingClientRect();
    if (r.top < 0 || r.bottom > innerHeight) section.querySelector('.bench').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
  patsEl.addEventListener('click', async (e) => {
    const b = e.target.closest('.pat');
    const p = b && pats[Number(b.dataset.i)];
    if (p) download(`smash-pattern-${p.kind}.svg`, await (await outline()).patternSVGFile(p));
  });

  paint();
  const ready = build().then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))).catch((e) => console.error('[identity] the shapes did not build', e));

  let pane = null;
  if (panel) {
    import('https://cdn.jsdelivr.net/npm/tweakpane@4.0.5/dist/tweakpane.min.js').then(({ Pane }) => {
      if (destroyed) return;
      pane = new Pane({ container: section.querySelector('.lab-panel'), title: 'Shapes' });
      const sy = pane.addFolder({ title: 'Symbols' });
      sy.addBinding(params, 'build', { options: { 'blocks, stacked': 'blocks', 'cut from a block': 'cut' } });
      sy.addBinding(params, 'grid', { options: { mix: 'mix', ...Object.fromEntries(Object.keys(GRIDS).map((k) => [k, k])) } });
      sy.addBinding(params, 'symmetry', { options: { mix: 'mix', none: 'none', mirror: 'mirror', '2-fold': '2-fold', '4-fold': '4-fold' } });
      sy.addBinding(params, 'density', { min: 0, max: 1, step: 0.05 });
      sy.addBinding(params, 'colors', { label: 'colours', options: Object.fromEntries(Object.keys(COLORS).map((k) => [k, k])) });
      sy.addButton({ title: 'Reroll' }).on('click', () => { params.seed = (Math.random() * 1e9) >>> 0; keep(); build(); });
      const ed = pane.addFolder({ title: 'Compose' });
      ed.addBinding(hand, 'piece', { options: Object.fromEntries(KIT.map((k) => [k, k])) }).on('change', (ev) => { if (ev.value !== bench.held) bench.hold(ev.value); });
      ed.addButton({ title: 'Turn (R)' }).on('click', () => bench.turn());
      ed.addButton({ title: 'Mirror (M)' }).on('click', () => bench.mirror());
      ed.addButton({ title: 'Delete' }).on('click', () => bench.remove());
      ed.addButton({ title: 'Undo' }).on('click', () => bench.undo());
      ed.addButton({ title: 'Start empty' }).on('click', () => {
        const g = GRIDS[params.grid] ?? [5, 5];
        bench.empty(...g);
        tiles.forEach((x) => x.classList.remove('open'));
      });
      pane.addButton({ title: 'Export SVG: this symbol' }).on('click', async () => download('smash-symbol.svg', await (await outline()).symbolSVGFile(bench.symbol())));
      pane.addButton({ title: 'Export SVG: all symbols' }).on('click', async () => download(`smash-symbols-${params.build}.svg`, await (await outline()).sheetSVG(syms)));
      pane.addButton({ title: 'Reset' }).on('click', () => { Object.assign(params, SHAPES_DEFAULTS); pane.refresh(); keep(); paint(); build(); });
      // The grammar's settings rebuild the gallery; the colours only repaint it.
      pane.on('change', (ev) => {
        if (ev.target?.key === 'piece') return;
        keep();
        if (ev.target?.key === 'colors') redraw();
        else if (['build', 'grid', 'symmetry', 'density'].includes(ev.target?.key)) { paint(); build(); }
      });
    }).catch((e) => console.error('[identity] the shapes panel did not load', e));
  }

  return {
    ready,
    bench,
    symbols: () => syms,
    patterns: () => pats,
    /** The stage as a PNG data URL: its ground and every symbol, kit piece and pattern, as drawn. */
    async snapshot() {
      await ready;
      const r = stage.getBoundingClientRect();
      const k = Math.min(2, 4096 / Math.max(r.width, r.height, 1));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(r.width * k);
      canvas.height = Math.round(r.height * k);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = colors()[1];
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (const svg of stage.querySelectorAll('.kit svg, .tile svg, .pat svg, .board svg')) {
        const b = svg.getBoundingClientRect();
        const img = new Image();
        const text = new XMLSerializer().serializeToString(svg).replace(/ class="sh-(drop|show)"[^>]*>/g, ' visibility="hidden">');
        img.src = `data:image/svg+xml,${encodeURIComponent(text)}`;
        try { await img.decode(); } catch { continue; }
        ctx.drawImage(img, (b.left - r.left) * k, (b.top - r.top) * k, b.width * k, b.height * k);
      }
      return canvas.toDataURL('image/png');
    },
    pause() {},
    resume() {},
    destroy() { destroyed = true; run++; io.disconnect(); bench.destroy(); pane?.dispose(); stage.querySelectorAll('.kit, .works, .patterns').forEach((x) => { x.innerHTML = ''; }); },
  };
}

/**
 * Every file for 00-original/shapes/ (identity-export.py): the kit, the
 * default gallery (and all of it on one sheet), the default patterns' tiles.
 * Returns { path: svg }.
 */
export async function exportFiles(p = SHAPES_DEFAULTS) {
  const o = await import('./shapes/outline.js');
  const nn = (n) => String(n).padStart(2, '0');
  const files = {};
  for (const [i, k] of KIT.entries()) files[`kit/${nn(i + 1)}-${k}.svg`] = await o.pieceSVG(k);
  const syms = gallery(p);
  for (const [i, s] of syms.entries()) files[`symbols/symbol-${nn(i + 1)}.svg`] = await o.symbolSVGFile(s);
  files['symbols/all-symbols.svg'] = await o.sheetSVG(syms);
  for (const [i, pat] of patterns(p).entries()) files[`patterns/${nn(i + 1)}-${pat.kind}.svg`] = await o.patternSVGFile(pat);
  return files;
}
