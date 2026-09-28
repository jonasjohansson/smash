// Shapes: every distinct shape the marks are cut into, each on its own, for
// use elsewhere in the brand. The negative shapes (the slots, bends, hooks
// and closed ends cut out of the block) and the positive pieces between them
// (the letters, the S's spine and hooks, the arches, the stems and bars),
// from the wordmark (mark.js), the modular mark (modular.js) and the symbol
// (geometry.js), as the S M or the S alone. A calm grid, black and white, no
// words: a tile click downloads that shape as an SVG; the panel exports them
// all on one sheet. The shapes themselves are found in shapes/catalogue.js.

import { catalogue, dataModule, shapeSVG, sheetSVG, SOURCES } from './shapes/catalogue.js';

export { catalogue, dataModule, shapeSVG, sheetSVG };

const STORE = 'smash-identity-shapes';
const COLORS = {
  'white on black': ['#fff', '#000'],
  'black on white': ['#000', '#fff'],
};
export const SHAPES_DEFAULTS = {
  show: 'both', // negative | positive | both
  from: 'all', // all | wordmark | modular | symbol
  colors: 'white on black',
  scale: 'fitted', // fitted (each fills its tile) | true (one scale for all, so relative sizes read)
  symbol: 'S M', // S M | S: the symbol's form, the S M or the S alone
};
const PAD = 0.15; // room round a fitted shape, of its tile, each side

function load() {
  try { return { ...SHAPES_DEFAULTS, ...JSON.parse(localStorage.getItem(STORE) || '{}') }; } catch { return { ...SHAPES_DEFAULTS }; }
}
function save(p) {
  const changed = Object.fromEntries(Object.entries(p).filter(([k, v]) => v !== SHAPES_DEFAULTS[k]));
  try { localStorage.setItem(STORE, JSON.stringify(changed)); } catch {}
}

/** The catalogue's key for a source: the symbol in the chosen form. */
const keyOf = (source, p) => (source === 'symbol' && p.symbol === 'S' ? 'symbol-s' : source);

/**
 * What the settings show: blocks of shapes, one per source and kind, in order
 * (the wordmark, the modular mark, the symbol; negative, then positive).
 * With every source shown, a shape an earlier source already has is left out.
 */
export function blocks(cat, p) {
  const kinds = p.show === 'both' ? ['negative', 'positive'] : [p.show];
  const sources = p.from === 'all' ? SOURCES : [p.from];
  return sources.flatMap((source) => kinds.map((kind) => ({
    source: keyOf(source, p), kind,
    shapes: cat[keyOf(source, p)][kind].filter((s) => p.from !== 'all' || !s.repeat),
  }))).filter((b) => b.shapes.length);
}

export const HTML = `
  <section class="lab" id="shapes">
    <header class="ch-head">
      <p class="ch-n">00 · shapes</p>
      <h2 class="ch-name">Shapes</h2>
    </header>
    <div class="lab-body">
      <div class="lab-stage shapes-stage"></div>
      <div class="lab-panel"></div>
    </div>
  </section>`;

// Fitted: a grid of fixed columns, six on a wide stage and three on a narrow
// one, so a source's six negatives make one row (two on a phone). True scale:
// each tile its shape's own box at one scale for all (the tallest shown about
// 360 px, most of the width on a phone), in rows on a common baseline.
const STYLE = `
#shapes .lab-stage { aspect-ratio: auto; min-height: 240px; padding: clamp(8px, 3vw, 40px); container-type: inline-size; }
#shapes .block { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
@container (min-width: 640px) { #shapes .block { grid-template-columns: repeat(6, minmax(0, 1fr)); } }
#shapes .block.true-scale { display: flex; flex-wrap: wrap; align-items: flex-end; --top: min(360px, 90cqi); --pad: clamp(10px, 2.4cqi, 22px); }
/* Negative and positive half a tile apart; a new source a tile. */
#shapes .block + .block { margin-top: clamp(44px, 8cqi, 96px); }
#shapes .block + .block.first { margin-top: clamp(88px, 16cqi, 192px); }
#shapes .tile { display: block; aspect-ratio: 1; min-width: 0; padding: 0; margin: 0; border: 0; background: none; color: inherit; cursor: pointer; }
#shapes .tile svg { display: block; width: 100%; height: 100%; }
#shapes .true-scale .tile { display: grid; place-items: center; aspect-ratio: auto; min-width: 44px; padding: var(--pad); }
#shapes .true-scale .tile svg { width: calc(var(--w) / var(--most) * var(--top)); height: calc(var(--h) / var(--most) * var(--top)); }
#shapes .tile:hover { outline: 1px solid color-mix(in srgb, currentColor 35%, transparent); outline-offset: -1px; }
#shapes .tile:focus-visible { background: var(--shapes-fg); color: var(--shapes-bg); outline: none; }
/* The panel stays in view beside the tall stage. */
@media (min-width: 901px) { #shapes .lab-panel { position: sticky; top: 16px; } }
`;

/** Mount the section. Returns { ready, snapshot(), pause(), resume(), destroy() }. */
export function mount(section, { panel = true, settings = null } = {}) {
  const params = settings ? { ...SHAPES_DEFAULTS, ...settings } : load();
  const keep = () => { if (!settings) save(params); };
  const stage = section.querySelector('.lab-stage');
  if (!document.getElementById('shapes-style')) {
    const style = document.createElement('style');
    style.id = 'shapes-style';
    style.textContent = STYLE;
    document.head.appendChild(style);
  }
  let destroyed = false;
  let cat = null;
  let shown = []; // the blocks on the stage, as drawn

  const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const download = (name, data) => {
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([data], { type: 'image/svg+xml' })), download: name });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const nn = (n) => String(n).padStart(2, '0');
  const f = (n) => +n.toFixed(2);

  function draw() {
    if (destroyed || !cat) return;
    const [fg, bg] = COLORS[params.colors] ?? COLORS['white on black'];
    const exact = params.scale === 'true';
    stage.style.background = bg;
    stage.style.color = fg;
    stage.style.setProperty('--shapes-fg', fg);
    stage.style.setProperty('--shapes-bg', bg);
    shown = blocks(cat, params);
    // True scale: the tallest (or widest) shape shown sets the one scale.
    stage.style.setProperty('--most', Math.max(1, ...shown.flatMap((b) => b.shapes.map((s) => Math.max(s.w, s.h)))));
    stage.innerHTML = shown.map((b, i) => {
      const first = i === 0 || shown[i - 1].source !== b.source;
      const tiles = b.shapes.map((s, j) => {
        // Fitted: a square view round the shape, with room; true: the shape's own box.
        const v = Math.max(s.w, s.h) / (1 - 2 * PAD);
        const box = exact ? `0 0 ${f(s.w)} ${f(s.h)}` : `${f((s.w - v) / 2)} ${f((s.h - v) / 2)} ${f(v)} ${f(v)}`;
        const size = exact ? ` style="--w:${f(s.w)};--h:${f(s.h)}"` : '';
        return `<button type="button" class="tile" data-block="${i}" data-i="${j}" aria-label="Download this shape as SVG">`
          + `<svg viewBox="${box}"${size} aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="${s.d}"/></svg></button>`;
      }).join('');
      return `<div class="block${first ? ' first' : ''}${exact ? ' true-scale' : ''}">${tiles}</div>`;
    }).join('');
  }

  // A shape's file is named by its place in its source's whole list, the same in every view.
  stage.addEventListener('click', (e) => {
    const tile = e.target.closest('.tile');
    const s = tile && shown[tile.dataset.block]?.shapes[tile.dataset.i];
    if (s) download(`smash-shape-${s.source}-${s.kind}-${nn(s.n)}.svg`, shapeSVG(s));
  });

  const ready = catalogue().then((c) => { cat = c; draw(); }).then(frame).catch((e) => console.error('[identity] the shapes did not load', e));

  let pane = null;
  if (panel) {
    import('https://cdn.jsdelivr.net/npm/tweakpane@4.0.5/dist/tweakpane.min.js').then(({ Pane }) => {
      if (destroyed) return;
      pane = new Pane({ container: section.querySelector('.lab-panel'), title: 'Shapes' });
      const view = pane.addFolder({ title: 'View' });
      view.addBinding(params, 'show', { options: { negative: 'negative', positive: 'positive', both: 'both' } });
      view.addBinding(params, 'from', { options: { all: 'all', wordmark: 'wordmark', modular: 'modular', symbol: 'symbol' } });
      view.addBinding(params, 'colors', { label: 'colours', options: Object.fromEntries(Object.keys(COLORS).map((k) => [k, k])) });
      view.addBinding(params, 'scale', { options: { 'true scale': 'true', fitted: 'fitted' } });
      const sym = pane.addFolder({ title: 'Symbol' });
      sym.addBinding(params, 'symbol', { label: 'form', options: { 'S M': 'S M', 'the S alone': 'S' } });
      pane.addButton({ title: 'Export SVG: all shapes' }).on('click', () => {
        const from = params.from === 'all' ? '' : `-${keyOf(params.from, params)}`;
        const name = `smash-shapes${from}${params.show === 'both' ? '' : `-${params.show}`}${params.scale === 'fitted' ? '-fitted' : ''}.svg`;
        download(name, sheetSVG(shown.map((b) => b.shapes), params.scale));
      });
      pane.addButton({ title: 'Reset' }).on('click', () => { Object.assign(params, SHAPES_DEFAULTS); pane.refresh(); draw(); keep(); });
      pane.on('change', () => { keep(); draw(); });
    }).catch((e) => console.error('[identity] the shapes panel did not load', e));
  }

  return {
    ready,
    catalogue: () => cat,
    /** The stage as a PNG data URL, drawn from its tiles. */
    async snapshot() {
      await ready;
      const r = stage.getBoundingClientRect();
      const [fg, bg] = COLORS[params.colors] ?? COLORS['white on black'];
      const k = Math.min(2, 4096 / Math.max(r.width, r.height, 1));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(r.width * k);
      canvas.height = Math.round(r.height * k);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = fg;
      for (const tile of stage.querySelectorAll('.tile')) {
        const s = shown[tile.dataset.block]?.shapes[tile.dataset.i];
        const svg = tile.querySelector('svg');
        if (!s || !svg) continue;
        const t = svg.getBoundingClientRect();
        const [x0, y0, vw, vh] = svg.getAttribute('viewBox').split(' ').map(Number);
        const u = Math.min(t.width / vw, t.height / vh); // the view fitted and centred, as the SVG draws it
        const ox = t.left - r.left + (t.width - vw * u) / 2 - x0 * u;
        const oy = t.top - r.top + (t.height - vh * u) / 2 - y0 * u;
        ctx.setTransform(k * u, 0, 0, k * u, k * ox, k * oy);
        ctx.fill(new Path2D(s.d), 'evenodd');
      }
      return canvas.toDataURL('image/png');
    },
    pause() {},
    resume() {},
    destroy() { destroyed = true; pane?.dispose(); stage.innerHTML = ''; },
  };
}
