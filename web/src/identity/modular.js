// The modular mark: the original rebuilt on its own grid of bars and slots.
// Jonas's crop (the S, and the M after it) taken through the whole word:
// five bands high (bar, slot, bar, slot, bar), the S's slots running out of
// the top and the bottom, the M and the A closing under a top bar, the A and
// the H broken by the middle bar. The S M is its symbol. Drawn in 2D as SVG;
// Export SVG gives true outlines (the slots cut from the block with paper.js).

const STORE = 'smash-identity-modular';
const COLORS = {
  'white on black': ['#fff', '#000'],
  'black on white': ['#000', '#fff'],
};
export const MODULAR_DEFAULTS = {
  bar: 31.78, // a bar, as the mark's (its stems and rails)
  slot: 20, // a slot, as the mark's
  stem: 31.78, // the height of the top and the bottom band; a bar for five even bands, more for taller letters
  bend: 10, // the radius of a bend, on the slot's centre line, as the mark's
  ends: 'round', // round | square: the closed slot ends
  counter: 17.5, // where the A's counter starts, from the top
  view: 'board', // board | wordmark | monogram
  symbol: 'S M', // S M | S: the symbol, and the favicons with it
  turn: 0, // 0 | 90 | 180 | 270: the symbol turned, in degrees
  grid: false, // the bands drawn over it
  colors: 'white on black',
};

function load() {
  try { return { ...MODULAR_DEFAULTS, ...JSON.parse(localStorage.getItem(STORE) || '{}') }; } catch { return { ...MODULAR_DEFAULTS }; }
}
function save(p) {
  const changed = Object.fromEntries(Object.entries(p).filter(([k, v]) => v !== MODULAR_DEFAULTS[k]));
  try { localStorage.setItem(STORE, JSON.stringify(changed)); } catch {}
}

/**
 * The geometry for settings p, in mark units: the block (w × h), the column
 * centres, the band edges, and every slot as a centre line with what happens
 * at each end ('open' runs off the block, 'bar' stops flat on the middle bar,
 * 'end' is a closed end). `upTo` crops at the slot after that letter (1: S M).
 */
export function geometry(p, upTo = 4) {
  const { bar: b, slot: s, stem } = p;
  const pitch = b + s;
  const c = (i) => b + s / 2 + i * pitch;
  const w = upTo === 4 ? 10 * s + 11 * b : c([1, 4, 6, 8, 10][upTo]) - s / 2;
  const y = [0, stem, stem + s, stem + s + b, stem + 2 * s + b, 2 * stem + 2 * s + b];
  const h = y[5];
  const up = (y[1] + y[2]) / 2; // the upper slot row's centre: the S's bend
  const lo = (y[3] + y[4]) / 2; // the lower one
  const closed = b + s / 2; // a closed end sits a bar down from the top, like the mark's
  const out = pitch * 2;
  const slot = (pts, start, end) => ({ pts, start, end });
  const full = (i) => slot([[c(i), -out], [c(i), h + out]], 'open', 'open');
  const letters = [
    // S
    [slot([[c(0), -out], [c(0), up], [c(1), up]], 'open', 'open'), slot([[-out, lo], [c(0), lo], [c(0), h + out]], 'open', 'open'), full(1)],
    // M
    [slot([[c(2), closed], [c(2), h + out]], 'end', 'open'), slot([[c(3), closed], [c(3), h + out]], 'end', 'open'), full(4)],
    // A
    [slot([[c(5), Math.min(p.counter, y[2] - s / 2)], [c(5), y[2]]], 'end', 'bar'), slot([[c(5), y[3]], [c(5), h + out]], 'bar', 'open'), full(6)],
    // S
    [slot([[c(7), -out], [c(7), up], [c(8), up]], 'open', 'open'), slot([[c(6), lo], [c(7), lo], [c(7), h + out]], 'open', 'open'), full(8)],
    // H
    [slot([[c(9), -out], [c(9), y[2]]], 'open', 'bar'), slot([[c(9), y[3]], [c(9), h + out]], 'bar', 'open')],
  ];
  return { w, h, s, c, y, slots: letters.slice(0, upTo + 1).flat() };
}

/** A polyline as a path with each bend filleted at radius r (as mark.js). */
function filleted(points, r) {
  const f = (n) => +n.toFixed(2);
  let d = `M${f(points[0][0])} ${f(points[0][1])}`;
  for (let i = 1; i < points.length - 1; i++) {
    const [ax, ay] = points[i - 1];
    const [bx, by] = points[i];
    const [cx, cy] = points[i + 1];
    const l1 = Math.hypot(bx - ax, by - ay);
    const l2 = Math.hypot(cx - bx, cy - by);
    const k = Math.min(r, l1 / 2, l2 / 2);
    if (k <= 0.01) { d += `L${f(bx)} ${f(by)}`; continue; }
    const p1 = [bx - ((bx - ax) / l1) * k, by - ((by - ay) / l1) * k];
    const p2 = [bx + ((cx - bx) / l2) * k, by + ((cy - by) / l2) * k];
    const sweep = (bx - ax) * (cy - by) - (by - ay) * (cx - bx) > 0 ? 1 : 0;
    d += `L${f(p1[0])} ${f(p1[1])}A${f(k)} ${f(k)} 0 0 ${sweep} ${f(p2[0])} ${f(p2[1])}`;
  }
  const last = points.at(-1);
  return d + `L${f(last[0])} ${f(last[1])}`;
}

/** Push an end point outward along its segment by d. */
function extend(points, atEnd, d) {
  const pts = points.map((q) => [...q]);
  const [a, e] = atEnd ? [pts.at(-2), pts.at(-1)] : [pts[1], pts[0]];
  const len = Math.hypot(e[0] - a[0], e[1] - a[1]) || 1;
  e[0] += ((e[0] - a[0]) / len) * d;
  e[1] += ((e[1] - a[1]) / len) * d;
  return pts;
}

/** The slots as stroked centre lines plus round ends: what the mask and the outlines are cut from. */
function cuts(p, g) {
  const dots = [];
  const lines = g.slots.map(({ pts, start, end }) => {
    let q = pts;
    for (const [kind, atEnd] of [[start, false], [end, true]]) {
      if (kind === 'end' && p.ends === 'square') q = extend(q, atEnd, g.s / 2);
      if (kind === 'end' && p.ends === 'round') dots.push(atEnd ? q.at(-1) : q[0]);
    }
    return filleted(q, p.bend);
  });
  return { lines, dots };
}

/** The mark as an SVG (a mask: the block, the slots cut out), in color, on nothing. */
export function markSVG(p, upTo = 4, color = 'currentColor', id = 'm') {
  const g = geometry(p, upTo);
  const { lines, dots } = cuts(p, g);
  const f = (n) => +n.toFixed(2);
  const cutSvg = `<g fill="none" stroke="#000" stroke-width="${g.s}" stroke-linecap="butt" stroke-linejoin="round">${lines.map((d) => `<path d="${d}"/>`).join('')}</g>`
    + `<g fill="#000">${dots.map(([x, y]) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(g.s / 2)}"/>`).join('')}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f(g.w)} ${f(g.h)}"><defs><mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="${f(g.w)}" height="${f(g.h)}">`
    + `<rect width="${f(g.w)}" height="${f(g.h)}" fill="#fff"/>${cutSvg}</mask></defs>`
    + `<rect width="${f(g.w)}" height="${f(g.h)}" fill="${color}" mask="url(#${id})"/></svg>`;
}

/** How far the symbol reaches: 1 is the S M, 0 the S alone. */
const symbolUpTo = (p) => (p.symbol === 'S' ? 0 : 1);

/** An SVG string turned by deg (a quarter turn swaps its width and height), about its centre. */
function turned(svg, deg) {
  if (!deg) return svg;
  const [, , w, h] = svg.match(/viewBox="([^"]+)"/)[1].split(/[\s,]+/).map(Number);
  const [W, H] = deg % 180 ? [h, w] : [w, h];
  const f = (n) => +n.toFixed(2);
  const head = svg.match(/^<svg[^>]*>/)[0].replace(/viewBox="[^"]+"/, `viewBox="0 0 ${f(W)} ${f(H)}"`);
  const inner = svg.slice(svg.indexOf('>') + 1, svg.lastIndexOf('</svg>'));
  return `${head}<g transform="translate(${f(W / 2)} ${f(H / 2)}) rotate(${deg}) translate(${f(-w / 2)} ${f(-h / 2)})">${inner}</g></svg>`;
}

/** The bands, as thin lines over the mark, in its units. */
function gridSVG(p, upTo, color) {
  const g = geometry(p, upTo);
  const f = (n) => +n.toFixed(2);
  const xs = [];
  for (let i = 0; i <= 10; i++) {
    const x = g.c(i) - g.s / 2;
    if (x > g.w + 0.1) break;
    xs.push(x, x + g.s);
  }
  const lines = [...g.y.map((y) => `<line x1="-12" x2="${f(g.w + 12)}" y1="${f(y)}" y2="${f(y)}"/>`),
    ...[0, ...xs.filter((x) => x < g.w), g.w].map((x) => `<line y1="-12" y2="${f(g.h + 12)}" x1="${f(x)}" x2="${f(x)}"/>`)];
  return `<g stroke="${color}" stroke-width="0.6" opacity="0.7" fill="none">${lines.join('')}</g>`;
}

/**
 * The favicon: the symbol at 32 and 64 px, snapped to whole pixels (bars 3
 * and 6 px, slots 2 and 4); at 16 px only the S fits: bars 3, slots 2. It
 * follows the symbol setting and its turn.
 */
export function faviconSVG(p, size, [fg, bg] = COLORS['white on black']) {
  const px = size === 64 ? { bar: 6, slot: 4 } : { bar: 3, slot: 2 };
  const upTo = size === 16 ? 0 : symbolUpTo(p);
  const q = { ...p, bar: px.bar, slot: px.slot, stem: px.bar * (p.stem / p.bar), bend: px.slot / 2, counter: px.bar * 0.55 };
  const g = geometry(q, upTo);
  const [w, h] = p.turn % 180 ? [g.h, g.w] : [g.w, g.h];
  const k = Math.min((size - 2) / w, (size - 2) / h);
  const inner = turned(markSVG(q, upTo, fg, `fav${size}`), p.turn).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  const dx = (size - w * k) / 2;
  const dy = (size - h * k) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="${bg}"/><g transform="translate(${dx.toFixed(2)} ${dy.toFixed(2)}) scale(${k.toFixed(4)})">${inner}</g></svg>`;
}

// Outlines for Illustrator: paper.js, loaded when first asked for.
let paperLoading = null;
function loadPaper() {
  paperLoading ??= new Promise((resolve, reject) => {
    if (window.paper) return resolve(window.paper);
    const tag = document.createElement('script');
    tag.src = 'https://cdn.jsdelivr.net/npm/paper@0.12.18/dist/paper-core.min.js';
    tag.onload = () => resolve(window.paper);
    tag.onerror = reject;
    document.head.appendChild(tag);
  });
  return paperLoading;
}

/**
 * The mark as true outlines: the block minus every slot, one compound path,
 * as a plain SVG string in fill (no mask, no strokes), for Illustrator.
 * A slot is a rectangle per straight run (extended by half a slot into each
 * bend), then at each bend the outer corner is rounded to r + half and, when
 * the bend is wider than the slot, the inner corner filled out to r - half:
 * the same shape a stroke of the filleted centre line covers.
 */
export async function outlineSVG(p, upTo = 4, fill = '#000000', turn = 0) {
  const paper = await loadPaper();
  const scope = new paper.PaperScope();
  scope.setup(new paper.Size(10, 10));
  const g = geometry(p, upTo);
  const h = g.s / 2;
  const P = (x, y) => new scope.Point(x, y);
  const box = (x0, y0, x1, y1) => new scope.Path.Rectangle(P(Math.min(x0, x1), Math.min(y0, y1)), P(Math.max(x0, x1), Math.max(y0, y1)));
  const disc = (x, y, r) => new scope.Path.Circle(P(x, y), r);
  let cut = null;
  const add = (shape) => { cut = cut ? cut.unite(shape) : shape; };
  for (const { pts, start, end } of g.slots) {
    let q = pts;
    if (start === 'end' && p.ends === 'square') q = extend(q, false, h);
    if (end === 'end' && p.ends === 'square') q = extend(q, true, h);
    let slot = null;
    for (let i = 0; i < q.length - 1; i++) {
      const [ax, ay] = q[i];
      const [bx, by] = q[i + 1];
      const len = Math.hypot(bx - ax, by - ay) || 1;
      const ux = (bx - ax) / len;
      const uy = (by - ay) / len;
      const e0 = i > 0 ? h : 0; // into the bend behind
      const e1 = i < q.length - 2 ? h : 0; // into the bend ahead
      const x0 = ax - ux * e0, y0 = ay - uy * e0, x1 = bx + ux * e1, y1 = by + uy * e1;
      const run = Math.abs(ux) > Math.abs(uy) ? box(x0, y0 - h, x1, y1 + h) : box(x0 - h, y0, x1 + h, y1);
      slot = slot ? slot.unite(run) : run;
    }
    for (let i = 1; i < q.length - 1; i++) {
      const [ax, ay] = q[i - 1];
      const [bx, by] = q[i];
      const [cx, cy] = q[i + 1];
      const l1 = Math.hypot(bx - ax, by - ay) || 1;
      const l2 = Math.hypot(cx - bx, cy - by) || 1;
      const r = Math.min(p.bend, l1 / 2, l2 / 2);
      if (r <= 0.01) continue;
      const u = [(bx - ax) / l1, (by - ay) / l1];
      const v = [(cx - bx) / l2, (cy - by) / l2];
      const o = [bx - u[0] * r + v[0] * r, by - u[1] * r + v[1] * r]; // the fillet's centre
      const outer = [bx + u[0] * h - v[0] * h, by + u[1] * h - v[1] * h]; // the L's outside corner
      slot = slot.subtract(box(o[0], o[1], outer[0], outer[1]).subtract(disc(o[0], o[1], r + h)));
      if (r > h + 0.01) {
        const inner = [bx - u[0] * h + v[0] * h, by - u[1] * h + v[1] * h];
        slot = slot.unite(box(o[0], o[1], inner[0], inner[1]).subtract(disc(o[0], o[1], r - h)));
      }
    }
    for (const [kind, atEnd] of [[start, false], [end, true]]) {
      if (kind === 'end' && p.ends === 'round') {
        const [x, y] = atEnd ? q.at(-1) : q[0];
        slot = slot.unite(disc(x, y, h));
      }
    }
    add(slot);
  }
  const mark = box(0, 0, g.w, g.h).subtract(cut);
  // A turn is baked into the outline, so Illustrator gets plain points, no transform.
  if (turn) {
    mark.rotate(turn, P(g.w / 2, g.h / 2));
    mark.translate(P(-mark.bounds.x, -mark.bounds.y));
  }
  const [W, H] = turn % 180 ? [g.h, g.w] : [g.w, g.h];
  const d = mark.pathData;
  scope.project.clear();
  const f = (n) => +n.toFixed(2);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${f(W)}" height="${f(H)}" viewBox="0 0 ${f(W)} ${f(H)}"><path fill="${fill}" fill-rule="evenodd" d="${d}"/></svg>`;
}

export const HTML = `
  <section class="lab" id="modular">
    <header class="ch-head">
      <p class="ch-n">00 · modular</p>
      <h2 class="ch-name">The modular mark</h2>
    </header>
    <div class="lab-body">
      <div class="lab-stage modular-stage"></div>
      <div class="lab-panel"></div>
    </div>
  </section>`;

const STYLE = `
#modular .board { position: absolute; inset: 0; display: grid; grid-template-rows: minmax(0, 1.2fr) minmax(0, 1fr); gap: 7%; padding: 6% 7%; }
#modular .board.single { grid-template-rows: minmax(0, 1fr); padding: 10%; }
#modular .row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 6%; min-height: 0; }
#modular .row > div:last-child { align-self: center; }
/* Each mark fills its cell, scaled to fit (a percentage height inside a grid cell would not resolve). */
#modular .board .word, #modular .board .mono { position: relative; min-height: 0; }
#modular .board svg.mk { position: absolute; inset: 0; width: 100%; height: 100%; display: block; overflow: visible; }
#modular .favs { display: flex; gap: 18px; align-items: end; }
#modular .favs span { display: block; }
#modular .favs svg { width: 100%; height: 100%; display: block; image-rendering: pixelated; }
#modular .cap { font: 11px/1.3 ui-monospace, Menlo, monospace; opacity: 0.55; margin-top: 8px; text-align: center; }
`;

/** Mount the tool. Returns { ready, snapshot(), pause(), resume(), destroy() }. */
export function mount(section, { panel = true, settings = null } = {}) {
  const params = settings ? { ...MODULAR_DEFAULTS, ...settings } : load();
  const keep = () => { if (!settings) save(params); };
  const stage = section.querySelector('.lab-stage');
  if (!document.getElementById('modular-style')) {
    const style = document.createElement('style');
    style.id = 'modular-style';
    style.textContent = STYLE;
    document.head.appendChild(style);
  }
  let destroyed = false;

  const withGrid = (svg, upTo, color) => (params.grid ? svg.replace('</svg>', `${gridSVG(params, upTo, color)}</svg>`) : svg);
  const mk = (upTo, color, id, align = 'xMidYMid', turn = 0) => turned(withGrid(markSVG(params, upTo, color, id), upTo, color), turn).replace('<svg ', `<svg class="mk" preserveAspectRatio="${align} meet" `);

  function draw() {
    if (destroyed) return;
    const [fg, bg] = COLORS[params.colors] ?? COLORS['white on black'];
    stage.style.background = bg;
    stage.style.color = fg;
    const favs = [64, 32, 16].map((n) => `<span style="width:${n}px;height:${n}px">${faviconSVG(params, n, [fg, bg])}</span>`).join('');
    if (params.view === 'wordmark') stage.innerHTML = `<div class="board single"><div class="word">${mk(4, fg, 'mw')}</div></div>`;
    else if (params.view === 'monogram') stage.innerHTML = `<div class="board single"><div class="mono">${mk(symbolUpTo(params), fg, 'mm', 'xMidYMid', params.turn)}</div></div>`;
    else {
      stage.innerHTML = `<div class="board"><div class="word">${mk(4, fg, 'bw')}</div>`
        + `<div class="row"><div class="mono">${mk(symbolUpTo(params), fg, 'bm', 'xMinYMid', params.turn)}</div><div><div class="favs">${favs}</div><p class="cap">64 · 32 · 16</p></div></div></div>`;
    }
  }
  draw();
  const ready = Promise.resolve().then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

  let pane = null;
  if (panel) {
    import('https://cdn.jsdelivr.net/npm/tweakpane@4.0.5/dist/tweakpane.min.js').then(({ Pane }) => {
      if (destroyed) return;
      pane = new Pane({ container: section.querySelector('.lab-panel'), title: 'Modular mark' });
      const view = pane.addFolder({ title: 'View' });
      view.addBinding(params, 'view', { options: { 'wordmark, symbol, favicons': 'board', wordmark: 'wordmark', symbol: 'monogram' } });
      view.addBinding(params, 'colors', { options: Object.fromEntries(Object.keys(COLORS).map((k) => [k, k])) });
      view.addBinding(params, 'grid', { label: 'show the grid' });
      const sym = pane.addFolder({ title: 'Symbol' });
      sym.addBinding(params, 'symbol', { options: { 'S M': 'S M', 'the S alone': 'S' } });
      sym.addBinding(params, 'turn', { options: { '0°': 0, '90°': 90, '180°': 180, '270°': 270 } });
      const m = pane.addFolder({ title: 'Module' });
      m.addBinding(params, 'stem', { label: 'top and bottom band', min: 20, max: 110, step: 0.5 });
      m.addBinding(params, 'bar', { min: 14, max: 60, step: 0.5 });
      m.addBinding(params, 'slot', { min: 6, max: 40, step: 0.5 });
      m.addBinding(params, 'bend', { label: 'bend radius', min: 0, max: 30, step: 0.5 });
      m.addBinding(params, 'ends', { label: 'closed ends', options: { round: 'round', square: 'square' } });
      m.addBinding(params, 'counter', { label: "A's counter from top", min: 4, max: 60, step: 0.5 });
      const download = (name, type, data) => {
        const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([data], { type })), download: name });
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      };
      pane.addButton({ title: 'Export SVG: wordmark (outlines)' }).on('click', async () => download('smash-modular.svg', 'image/svg+xml', await outlineSVG(params, 4)));
      pane.addButton({ title: 'Export SVG: symbol (outlines)' }).on('click', async () => {
        const name = `smash-modular-${params.symbol === 'S' ? 's' : 'sm'}${params.turn ? `-${params.turn}` : ''}.svg`;
        download(name, 'image/svg+xml', await outlineSVG(params, symbolUpTo(params), '#000000', params.turn));
      });
      pane.addButton({ title: 'Copy settings' }).on('click', () => navigator.clipboard?.writeText(JSON.stringify(params, null, 2)));
      pane.addButton({ title: 'Reset' }).on('click', () => { Object.assign(params, MODULAR_DEFAULTS); pane.refresh(); draw(); keep(); });
      pane.on('change', () => { draw(); keep(); });
    }).catch((e) => console.error('[identity] the modular panel did not load', e));
  }

  return {
    ready,
    geometry: () => geometry(params),
    outlines: (upTo = 4) => outlineSVG(params, upTo),
    /** The stage as a PNG data URL, drawn from its SVG. */
    async snapshot() {
      const r = stage.getBoundingClientRect();
      const [fg, bg] = COLORS[params.colors] ?? COLORS['white on black'];
      const svg = markSVG(params, 4, fg, 'snap');
      const img = new Image();
      img.src = `data:image/svg+xml,${encodeURIComponent(svg)}`;
      await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(r.width * 2);
      canvas.height = Math.round(r.height * 2);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const g = geometry(params);
      const k = Math.min(canvas.width * 0.84 / g.w, canvas.height * 0.7 / g.h);
      ctx.drawImage(img, (canvas.width - g.w * k) / 2, (canvas.height - g.h * k) / 2, g.w * k, g.h * k);
      return canvas.toDataURL('image/png');
    },
    pause() {},
    resume() {},
    destroy() { destroyed = true; pane?.dispose(); stage.innerHTML = ''; },
  };
}
