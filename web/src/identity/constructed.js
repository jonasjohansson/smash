// Constructed: SMASH made the way Jonas made the Elicit Projects wordmark
// (2015; its files are in his Drive): only lines, arcs and circles, one even
// stroke, measured on a grid. Taken from Elicit's vector, not by eye:
//
// - the grid is 10, the stroke 3 (3.75 % of the block's width), every end
//   square (cut across the stroke, half a stroke on);
// - a row has three lines, cap, mid and base, 10 apart; a ring's centre sits
//   on the mid line (the O is r 10: the cap line to the base line), a stub
//   runs line to line, a bar lies on a line;
// - lines run at 0, 45 or 90°, and a curve ends on a circle's 45° or 90° point;
// - each piece is one stroke (a corner or a curve stays whole), and no two
//   pieces touch: where a letter's strokes would meet, a gap (Elicit's is 3.9
//   to 4.4).
//
// SMASH on that system: the S is Elicit's own S (two rings, r 4 and r 5, and
// the stroke on their 45° points); the M a V at 45° from the cap line's
// corners to the mid line, over two stems from the mid line to the base; the
// A the top half of the O, run on into its legs, the bar on the mid line a gap
// off each; the H two stems and the bar a gap off each. The M, the A and the H
// are two grid squares wide. Alternates: the M in arches, the A under a 45°
// roof. The construction shows each letter's grid, the three lines, every
// circle whole with its centre, the 45° lines, and the measures.

const STORE = 'smash-identity-constructed-2'; // new units (Elicit's): the first version's settings don't carry over
export const CONSTRUCTED_DEFAULTS = {
  layout: 'sm-ash', // line | sm-ash | sma-sh | sm-as-h (stacked, as Elicit's block, by default)
  m: 'v', // v | arch
  a: 'dome', // dome | roof
  stencil: true, // apart where strokes would meet (off: joined, the skeleton)
  gap: 3.9, // the gap at a broken joint
  weight: 3, // the stroke
  tracking: 4, // between letters
  leading: 10, // between rows: the base line to the next cap line
  apart: 0, // the pieces pulled apart (0 to 1), as Elicit's Particles pages
  construction: false,
  ground: 'ink', // ink | paper
};

const CAP = 20; // the cap line to the base line (centre lines); the mid line at 10
const LAYOUTS = { line: ['SMASH'], 'sm-ash': ['SM', 'ASH'], 'sma-sh': ['SMA', 'SH'], 'sm-as-h': ['SM', 'AS', 'H'] };
const f = (n) => +n.toFixed(3);
const rad = (a) => (a * Math.PI) / 180;
const at = (cx, cy, r, a) => [cx + r * Math.cos(rad(a)), cy + r * Math.sin(rad(a))];
// A piece is a chain of segments drawn as one stroke: a line [x1, y1, x2, y2]
// or an arc { cx, cy, r, a0, a1 } (degrees, y down: 270 is a circle's top; a1
// above a0 runs clockwise).
const line = (x1, y1, x2, y2) => ({ line: [x1, y1, x2, y2] });
const arc = (cx, cy, r, a0, a1) => ({ arc: { cx, cy, r, a0, a1 } });

/**
 * The letters for settings s, in the letter's own frame: x from its left edge,
 * y from the cap line (0) to the base line (20), centre lines. Each: w (its
 * width, edge to edge), pieces (chains), circles ([cx, cy, r]), diagonals
 * (45° construction lines, [x1, y1, x2, y2]), grid (true: two grid squares
 * between its outer stems), clip (joined corners run past the cap line and
 * are cut level with it).
 */
function letters(s) {
  const w = s.weight, h = w / 2, g = s.stencil ? s.gap : 0, apart = s.stencil;
  const W = 20 + w; // the M, the A and the H: two grid squares between the outer stems' centres
  const mid = W / 2;
  const bar = (y) => (apart ? line(w + g + h, y, W - w - g - h, y) : line(h, y, W - h, y));

  // S: Elicit's S, from its circles.
  const c1 = [6.66 + (h - 1.5), 3.42], r1 = 4.04, c2 = [5.70 + (h - 1.5), 14.99], r2 = 5.03;
  const S = {
    w: 9.25 + w,
    pieces: [[arc(...c1, r1, 315, 135), line(...at(...c1, r1, 135), ...at(...c2, r2, -45)), arc(...c2, r2, -45, 135)]],
    circles: [[...c1, r1], [...c2, r2]],
    diagonals: [[...at(...c1, r1, 135), ...at(...c2, r2, -45)]],
  };

  // M. V: the V along the grid squares' diagonals, its ends cut square where
  // they meet the cap line and the letter's edge; the stems the lower half.
  // Joined: one stroke, up the left stem, down the V, up and down the right.
  let M;
  if (s.m === 'arch') {
    // Arches of r 5; apart, the second only from its top, a quarter and its leg.
    M = {
      w: W,
      pieces: [
        [line(h, CAP, h, 5), arc(h + 5, 5, 5, 180, 360), line(h + 10, 5, h + 10, CAP)],
        [arc(h + 15, 5, 5, apart ? 270 : 180, 360), line(h + 20, 5, h + 20, CAP)],
      ],
      circles: [[h + 5, 5, 5], [h + 15, 5, 5]],
      grid: true,
    };
  } else {
    const e = h * Math.SQRT2, a = h * (Math.SQRT2 - 1);
    M = {
      w: W,
      pieces: apart
        ? [[line(e, a, mid, 10), line(mid, 10, W - e, a)], [line(h, 10, h, CAP)], [line(W - h, 10, W - h, CAP)]]
        : [[line(h, CAP, h, 0), line(h, 0, mid, 10), line(mid, 10, W - h, 0), line(W - h, 0, W - h, CAP)]],
      diagonals: [[h, 0, mid, 10], [mid, 10, W - h, 0]],
      grid: true,
      clip: !apart,
    };
  }

  // A. Dome: the top half of the O (r 10, its centre on the mid line), run on
  // into the legs, one stroke; the bar on the mid line. Roof: the legs to the
  // mid line, the roof at 45° to its point on the cap line; the bar low.
  const A = s.a === 'roof'
    ? { w: W, pieces: [[line(h, CAP, h, 10), line(h, 10, mid, 0), line(mid, 0, W - h, 10), line(W - h, 10, W - h, CAP)], [bar(15)]], diagonals: [[h, 10, mid, 0], [mid, 0, W - h, 10]], grid: true }
    : { w: W, pieces: [[line(h, CAP, h, 10), arc(mid, 10, 10, 180, 360), line(W - h, 10, W - h, CAP)], [bar(10)]], circles: [[mid, 10, 10]], grid: true };

  // H: two stems, the bar on the mid line.
  const H = { w: W, pieces: [[line(h, 0, h, CAP)], [line(W - h, 0, W - h, CAP)], [bar(10)]], grid: true, isH: true };
  return { S, M, A, H };
}

/** A chain as path data, moved by (dx, dy). */
function chain(segs, dx = 0, dy = 0) {
  let d = '';
  segs.forEach((sg, i) => {
    if (sg.line) {
      const [x1, y1, x2, y2] = sg.line;
      d += `${i ? 'L' : 'M'}${f(x1 + dx)} ${f(y1 + dy)}L${f(x2 + dx)} ${f(y2 + dy)}`;
    } else {
      const { cx, cy, r, a0, a1 } = sg.arc;
      const [x0, y0] = at(cx, cy, r, a0), [x1, y1] = at(cx, cy, r, a1);
      d += `${i ? 'L' : 'M'}${f(x0 + dx)} ${f(y0 + dy)}A${f(r)} ${f(r)} 0 ${Math.abs(a1 - a0) > 180 ? 1 : 0} ${a1 > a0 ? 1 : 0} ${f(x1 + dx)} ${f(y1 + dy)}`;
    }
  });
  return d;
}

// A small seeded hash: each piece's own way when they come apart.
const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

/** The mark for settings s, in units: { w, h, rows, letters: [{ x, y, L }], pieces: [{ d, row, off, clip }] }. */
export function layout(s) {
  const lines = LAYOUTS[s.layout] ?? LAYOUTS.line;
  const LET = letters(s);
  const widths = lines.map((word) => [...word].reduce((a, ch, i) => a + LET[ch].w + (i ? s.tracking : 0), 0));
  const pitch = CAP + s.leading;
  const out = { w: Math.max(...widths), h: (lines.length - 1) * pitch + CAP + s.weight, rows: [], letters: [], pieces: [] };
  let k = 0;
  lines.forEach((word, row) => {
    let x = 0;
    const y = row * pitch + s.weight / 2; // the cap line's centre, half a stroke in from the top edge
    out.rows.push(y);
    for (const ch of word) {
      const L = LET[ch];
      out.letters.push({ x, y, L });
      for (const p of L.pieces) {
        const a = hash(++k) * Math.PI * 2, r = (0.5 + hash(k + 50)) * 9 * s.apart;
        out.pieces.push({ d: chain(p, x, y), row, clip: L.clip, off: [f(Math.cos(a) * r), f(Math.sin(a) * r)] });
      }
      x += L.w + s.tracking;
    }
  });
  return out;
}

let uid = 0;
const FONT = 'font-family="Neue Montreal, Helvetica, sans-serif"';

/** The mark as an SVG, stroked in color; with its construction when asked. */
export function markSVG(s, color = 'currentColor', { pad = 4, construction = s.construction, accent = '#ff29b8' } = {}) {
  const m = layout(s);
  const id = `cons${++uid}`;
  const w = s.weight;
  const p = construction ? Math.max(pad, 12) : pad + 9 * s.apart; // room for the measures, or the pieces
  const moved = (pc) => (pc.off[0] || pc.off[1] ? ` transform="translate(${pc.off[0]} ${pc.off[1]})"` : '');
  // A joined M's corners run past the cap line: cut level with the row's edges.
  const clips = m.rows.map((y, i) => `<clipPath id="${id}-${i}" clipPathUnits="userSpaceOnUse"><rect x="-1000" y="${f(y - w / 2)}" width="2000" height="${f(CAP + w)}"/></clipPath>`).join('');
  const marks = m.pieces.map((pc) => `<path d="${pc.d}"${moved(pc)}${pc.clip ? ` clip-path="url(#${id}-${pc.row})"` : ''}/>`).join('');

  let under = '', over = '';
  if (construction) {
    const thin = 'fill="none" stroke-width="0.14"';
    const dash = 'stroke-dasharray="0.8 0.5"';
    const parts = [];
    // The three lines of every row, across the mark.
    m.rows.forEach((y) => { for (const dy of [0, 10, CAP]) parts.push(`<path d="M-6 ${f(y + dy)}H${f(m.w + 6)}" ${thin} stroke="${accent}" opacity="${dy === 10 ? 0.5 : 0.9}"/>`); });
    for (const { x, y, L } of m.letters) {
      // Each letter's grid: squares of 10 between its outer stems' centres.
      if (L.grid) {
        const g0 = x + w / 2;
        const grid = [0, 10, 20].map((gx) => `M${f(g0 + gx)} ${f(y)}V${f(y + CAP)}`).join('') + [0, 10, 20].map((gy) => `M${f(g0)} ${f(y + gy)}H${f(g0 + 20)}`).join('');
        parts.push(`<path d="${grid}" ${thin} stroke="${accent}" opacity="0.55"/>`);
      }
      for (const [x1, y1, x2, y2] of L.diagonals ?? []) {
        // The 45° lines, run on past the stroke.
        const dx = x2 - x1, dy = y2 - y1, n = Math.hypot(dx, dy), ux = dx / n, uy = dy / n, run = 4;
        parts.push(`<path d="M${f(x + x1 - ux * run)} ${f(y + y1 - uy * run)}L${f(x + x2 + ux * run)} ${f(y + y2 + uy * run)}" ${thin} stroke="${accent}" ${dash}/>`);
      }
      for (const [cx, cy, r] of L.circles ?? []) {
        parts.push(`<circle cx="${f(x + cx)}" cy="${f(y + cy)}" r="${f(r)}" ${thin} stroke="${accent}" ${dash}/>`
          + `<path d="M${f(x + cx - 1)} ${f(y + cy)}H${f(x + cx + 1)}M${f(x + cx)} ${f(y + cy - 1)}V${f(y + cy + 1)}" ${thin} stroke="${accent}"/>`);
      }
    }
    under = parts.join('');
    // Each stroke's centre line, fine, over the mark: where one ends and the next begins.
    over = `<g fill="none" stroke="${accent}" stroke-width="0.2" stroke-linecap="butt">${m.pieces.map((pc) => `<path d="${pc.d}"${moved(pc)}/>`).join('')}</g>`;
    // The measures: the cap, the grid square, the O's radius, the stroke, a gap.
    const t = (x, y, str, anchor = 'middle', rot = 0) => `<text x="${f(x)}" y="${f(y)}" font-size="2.2" ${FONT} fill="${accent}" text-anchor="${anchor}"${rot ? ` transform="rotate(${rot} ${f(x)} ${f(y)})"` : ''}>${str}</text>`;
    const dim = (x1, y1, x2, y2) => {
      const tk = 1, v = x1 === x2;
      const ends = v ? `M${f(x1 - tk)} ${f(y1)}H${f(x1 + tk)}M${f(x2 - tk)} ${f(y2)}H${f(x2 + tk)}` : `M${f(x1)} ${f(y1 - tk)}V${f(y1 + tk)}M${f(x2)} ${f(y2 - tk)}V${f(y2 + tk)}`;
      return `<path d="M${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}${ends}" fill="none" stroke="${accent}" stroke-width="0.18"/>`;
    };
    const y0 = m.rows[0];
    const gl = m.letters.find((l) => l.L.grid && l.y === y0);
    const hl = [...m.letters].reverse().find((l) => l.L.isH);
    const dl = m.letters.find((l) => l.L.grid && l.L.circles?.length === 1); // the domed A
    over += dim(-5, y0, -5, y0 + CAP) + t(-6.6, y0 + CAP / 2, 'cap 20', 'middle', -90)
      + (gl ? dim(gl.x + w / 2, y0 - 6, gl.x + w / 2 + 10, y0 - 6) + t(gl.x + w / 2 + 5, y0 - 7.6, 'grid 10') : '')
      // The O's radius: a line from its centre out to the stroke at 45°, up and right, labelled in the counter above the bar.
      + (dl ? (() => { const [cx, cy] = [dl.x + dl.L.w / 2, dl.y + 10], [ex, ey] = at(cx, cy, 10, 315);
        return `<path d="M${f(cx)} ${f(cy)}L${f(ex)} ${f(ey)}" fill="none" stroke="${accent}" stroke-width="0.18"/>` + t((cx + ex) / 2 - 1, (cy + ey) / 2 + 0.4, 'r 10', 'end'); })() : '')
      // The stroke under the H's right stem; the gap in its upper counter, between the bar's end and the stem.
      + (hl ? dim(hl.x + hl.L.w - w, hl.y + CAP + 5, hl.x + hl.L.w, hl.y + CAP + 5) + t(hl.x + hl.L.w - w / 2, hl.y + CAP + 8.6, `stroke ${f(w)}`)
        + (s.stencil ? dim(hl.x + hl.L.w - w - s.gap, hl.y + 5, hl.x + hl.L.w - w, hl.y + 5) + t(hl.x + hl.L.w - w - s.gap - 0.8, hl.y + 5.8, `gap ${f(s.gap)}`, 'end') : '') : '');
  }
  const W = m.w + 2 * p, Hh = m.h + 2 * p;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f(-p)} ${f(-p)} ${f(W)} ${f(Hh)}"><defs>${clips}</defs>${under}`
    + `<g fill="none" stroke="${color}" stroke-width="${f(w)}" stroke-linecap="square" stroke-linejoin="miter" stroke-miterlimit="10">${marks}</g>${over}</svg>`;
}

export const HTML = `
  <section class="lab" id="constructed">
    <header class="ch-head">
      <p class="ch-n">00 · constructed</p>
      <h2 class="ch-name">Constructed</h2>
    </header>
    <div class="lab-body">
      <div class="lab-stage cons-stage"></div>
      <div class="lab-panel"></div>
    </div>
    <div class="cons-row"></div>
  </section>`;

const STYLE = `
#constructed .cons-stage { display: grid; place-items: center; }
#constructed .cons-stage svg { width: 78%; height: 78%; display: block; }
#constructed .cons-row { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--gap); }
@media (max-width: 760px) { #constructed .cons-row { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
#constructed .cons-cell { position: relative; aspect-ratio: 1; display: grid; place-items: center; cursor: pointer; margin: 0; }
#constructed .cons-cell svg { width: 66%; height: 66%; display: block; }
#constructed .cons-cell .label { position: absolute; left: 12px; bottom: 10px; color: inherit; opacity: 0.55; }
#constructed .cons-cell[aria-pressed="true"] { outline: 1px solid currentColor; outline-offset: -1px; }
`;

function load() {
  try { return { ...CONSTRUCTED_DEFAULTS, ...JSON.parse(localStorage.getItem(STORE) || '{}') }; } catch { return { ...CONSTRUCTED_DEFAULTS }; }
}
function save(p) {
  const changed = Object.fromEntries(Object.entries(p).filter(([k, v]) => v !== CONSTRUCTED_DEFAULTS[k]));
  try { localStorage.setItem(STORE, JSON.stringify(changed)); } catch {}
}

/** Mount the tool. Returns { ready, pause(), resume(), destroy() }. */
export function mount(section, { panel = true, settings = null } = {}) {
  const params = settings ? { ...CONSTRUCTED_DEFAULTS, ...settings } : load();
  const stage = section.querySelector('.cons-stage');
  const row = section.querySelector('.cons-row');
  if (!document.getElementById('constructed-style')) {
    const style = document.createElement('style');
    style.id = 'constructed-style';
    style.textContent = STYLE;
    document.head.appendChild(style);
  }
  let destroyed = false;
  const colors = () => (params.ground === 'paper' ? ['#000', '#fff'] : ['#fff', '#000']);

  function draw() {
    if (destroyed) return;
    const [fg, bg] = colors();
    stage.style.background = bg;
    stage.style.color = fg;
    stage.innerHTML = markSVG(params, fg);
    // Every layout, as it is set now, to pick from.
    row.innerHTML = Object.keys(LAYOUTS).map((k) => `<figure class="cons-cell" data-layout="${k}" aria-pressed="${k === params.layout}" style="background:${bg};color:${fg}">`
      + `${markSVG({ ...params, layout: k, apart: 0 }, fg, { construction: false })}<figcaption class="label">${LAYOUTS[k].join(' / ')}</figcaption></figure>`).join('');
  }
  row.addEventListener('click', (e) => {
    const c = e.target.closest('.cons-cell');
    if (!c) return;
    params.layout = c.dataset.layout;
    draw();
    keep();
    pane?.refresh();
  });
  const keep = () => { if (!settings) save(params); };
  draw();

  let pane = null;
  if (panel) {
    import('https://cdn.jsdelivr.net/npm/tweakpane@4.0.5/dist/tweakpane.min.js').then(({ Pane }) => {
      if (destroyed) return;
      pane = new Pane({ container: section.querySelector('.lab-panel'), title: 'Constructed' });
      pane.addBinding(params, 'layout', { options: { 'SMASH': 'line', 'SM / ASH': 'sm-ash', 'SMA / SH': 'sma-sh', 'SM / AS / H': 'sm-as-h' } });
      pane.addBinding(params, 'ground', { options: { 'white on black': 'ink', 'black on white': 'paper' } });
      pane.addBinding(params, 'construction', { label: 'show the construction' });
      pane.addBinding(params, 'apart', { label: 'pieces apart', min: 0, max: 1, step: 0.01 });
      const l = pane.addFolder({ title: 'Letters' });
      l.addBinding(params, 'm', { label: 'M', options: { 'V over stems': 'v', 'arches': 'arch' } });
      l.addBinding(params, 'a', { label: 'A', options: { 'dome (the O)': 'dome', 'roof (45°)': 'roof' } });
      const d = pane.addFolder({ title: 'Drawing' });
      d.addBinding(params, 'stencil', { label: 'apart at the joints' });
      d.addBinding(params, 'gap', { min: 1, max: 8, step: 0.1 });
      d.addBinding(params, 'weight', { label: 'stroke', min: 1, max: 5, step: 0.1 });
      d.addBinding(params, 'tracking', { min: 0, max: 12, step: 0.1 });
      d.addBinding(params, 'leading', { label: 'between rows', min: 3, max: 20, step: 0.5 });
      pane.addButton({ title: 'Export SVG' }).on('click', () => {
        const a = Object.assign(document.createElement('a'), {
          href: URL.createObjectURL(new Blob([markSVG({ ...params, apart: 0 }, '#000000', { construction: false })], { type: 'image/svg+xml' })),
          download: `smash-constructed-${params.layout}.svg`,
        });
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      });
      pane.addButton({ title: 'Reset' }).on('click', () => { Object.assign(params, CONSTRUCTED_DEFAULTS); pane.refresh(); draw(); keep(); });
      pane.on('change', () => { draw(); keep(); });
    }).catch((e) => console.error('[identity] the constructed panel did not load', e));
  }

  return {
    ready: Promise.resolve(),
    pause() {},
    resume() {},
    destroy() { destroyed = true; pane?.dispose(); stage.innerHTML = ''; row.innerHTML = ''; },
  };
}
