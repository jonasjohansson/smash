// Constructed: SMASH drawn in the manner of the Elicit Projects wordmark
// (Jonas's reference, 2026-09-30): one even stroke on a square grid, every
// letter built from straight bars and arcs of one circle, the letters coming
// apart at stencil breaks, set as a line or stacked into a block. Close to
// the geometric direction of the typography round (Stolzl Display).
//
// Measured as the reference is: the grid's unit (u) is the stroke; the cap
// height is 7u; every curve is a piece of one ring, 4u across on its outside
// (half the cap height and a stroke, so two stacked rings share a stroke):
// the S is two of them meeting at its spine, the M's two arches and the A's
// arch are the same ring. The construction shows the unit grid, each ring
// whole (dashed, its unused part pale), the arcs used in pink, the rings'
// centres, and the measures: the cap height, the ring and the stroke.

const STORE = 'smash-identity-constructed';
export const CONSTRUCTED_DEFAULTS = {
  layout: 'line', // line | sma-sh | sm-ash | sm-as-h
  stencil: true, // the breaks
  gap: 0.5, // the stencil gap, in units
  weight: 1, // the stroke, in units (1: the grid's unit)
  tracking: 1, // between letters, in units
  leading: 1, // between lines, in units
  construction: false,
  ground: 'ink', // ink | paper
};

const H = 7; // the cap height, in units
const RING = 4; // the ring's outside diameter
const L = (x1, y1, x2, y2, cut = [0, 0]) => ({ kind: 'line', x1, y1, x2, y2, cut });
const A = (cx, cy, r, a0, a1, cut = [0, 0]) => ({ kind: 'arc', cx, cy, r, a0, a1, cut });

// The letters for a stroke of w: width and pieces, drawn so the outer edges
// sit on the letter's box whatever the stroke (a centre line is half a stroke
// in). Angles in degrees, y down (270 is the top of a circle). cut is in gaps:
// 1 is one gap; more than 1 is a T-joint, the bar drawn from the stem's centre
// and cut back to its edge and a gap beyond.
function letters(w) {
  const h = w / 2;
  const r = RING / 2 - h; // the ring on its centre line
  const c = RING / 2; // a ring's centre, from its box's edge
  return {
    S: { w: RING, pieces: [
      A(c, c, r, 315, 90, [0, 0.5]), // the top ring: from its upper right, over the top and round the left, to the spine
      L(c, c + r, c, H - c - r), // (only a step when the stroke isn't the unit)
      A(c, H - c, r, 270, 495, [0.5, 0]), // the bottom ring: from the spine, round the right and under, to its lower left
    ] },
    M: { w: 2 * RING - w, pieces: [
      L(h, H, h, c),
      A(c, c, r, 180, 360),
      A(RING - w + c, c, r, 180, 360),
      L(RING - h, c, RING - h, H, [1, 0]), // the middle stem, floating a gap under the arches
      L(2 * RING - w - h, c, 2 * RING - w - h, H),
    ] },
    A: { w: RING, pieces: [
      L(h, H, h, c),
      A(c, c, r, 180, 360),
      L(RING - h, c, RING - h, H),
      L(h, 4.5, RING - h, 4.5, [1.5, 0]), // the crossbar, off the left stem by a gap
    ] },
    H: { w: RING, pieces: [
      L(h, 0, h, H),
      L(RING - h, 0, RING - h, H),
      L(h, H / 2, RING - h, H / 2, [0, 1.5]), // the crossbar, off the right stem by a gap
    ] },
  };
}
const LAYOUTS = { line: ['SMASH'], 'sma-sh': ['SMA', 'SH'], 'sm-ash': ['SM', 'ASH'], 'sm-as-h': ['SM', 'AS', 'H'] };

const f = (n) => +n.toFixed(3);
const rad = (a) => (a * Math.PI) / 180;

/**
 * A piece's centre line as path data, moved by (dx, dy), its ends cut back
 * (by cut × gap along the line or the arc). A T-joint's cut of 1.5 × gap
 * takes the bar from the stem's centre to its edge (half a stroke) and a gap
 * beyond, when the gap is a third of the stroke; so the cut is worked out
 * from the stroke too: (cut - 1) × gap + stroke / 2 when cut > 1.
 */
function piece(p, dx, dy, s) {
  const trim = (c) => (!s.stencil || !c ? 0 : c > 1 ? s.weight / 2 + s.gap : c * s.gap);
  const [t0, t1] = [trim(p.cut[0]), trim(p.cut[1])];
  if (p.kind === 'line' && Math.hypot(p.x2 - p.x1, p.y2 - p.y1) - t0 - t1 <= 0.001) return ''; // cut away entirely
  if (p.kind === 'line') {
    const len = Math.hypot(p.x2 - p.x1, p.y2 - p.y1);
    const ux = (p.x2 - p.x1) / len, uy = (p.y2 - p.y1) / len;
    return `M${f(p.x1 + ux * t0 + dx)} ${f(p.y1 + uy * t0 + dy)}L${f(p.x2 - ux * t1 + dx)} ${f(p.y2 - uy * t1 + dy)}`;
  }
  const dir = Math.sign(p.a1 - p.a0);
  const a0 = p.a0 + (dir * t0 * 180) / (Math.PI * p.r);
  const a1 = p.a1 - (dir * t1 * 180) / (Math.PI * p.r);
  const at = (a) => [p.cx + p.r * Math.cos(rad(a)) + dx, p.cy + p.r * Math.sin(rad(a)) + dy];
  const [x0, y0] = at(a0), [x1, y1] = at(a1);
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  const sweep = dir > 0 ? 1 : 0;
  return `M${f(x0)} ${f(y0)}A${f(p.r)} ${f(p.r)} 0 ${large} ${sweep} ${f(x1)} ${f(y1)}`;
}

/** The mark for settings s: { w, h, paths: [d], circles: [[cx, cy, r]], arcs: [d] } in units. */
export function layout(s) {
  const lines = LAYOUTS[s.layout] ?? LAYOUTS.line;
  const LETTERS = letters(s.weight);
  const widths = lines.map((word) => [...word].reduce((a, ch, i) => a + LETTERS[ch].w + (i ? s.tracking : 0), 0));
  const w = Math.max(...widths);
  const h = lines.length * H + (lines.length - 1) * s.leading;
  const paths = [], circles = [], arcs = [];
  lines.forEach((word, row) => {
    let x = 0;
    const y = row * (H + s.leading);
    for (const ch of word) {
      for (const p of LETTERS[ch].pieces) {
        const d = piece(p, x, y, s);
        if (!d) continue;
        paths.push(d);
        if (p.kind === 'arc') { circles.push([p.cx + x, p.cy + y, p.r]); arcs.push(d); }
      }
      x += LETTERS[ch].w + s.tracking;
    }
  });
  return { w, h, paths, circles, arcs };
}

/** The mark as an SVG, stroked in color, with its construction when asked. */
/** The mark as an SVG, stroked in color, with its measured construction when asked. */
export function markSVG(s, color = 'currentColor', { pad = 0, construction = s.construction, accent = '#ff29b8' } = {}) {
  const m = layout(s);
  const p = construction ? Math.max(pad, 2.4) : pad; // room for the measures
  const x0 = -p, y0 = -p, W = m.w + 2 * p, Hh = m.h + 2 * p;
  const w = s.weight;
  let under = '', over = '';
  if (construction) {
    const dash = 'stroke-dasharray="0.12 0.1"';
    const grid = [];
    for (let x = 0; x <= Math.ceil(m.w); x++) grid.push(`M${x} 0V${f(m.h)}`);
    for (let y = 0; y <= Math.ceil(m.h); y++) grid.push(`M0 ${y}H${f(m.w)}`);
    const rings = [...new Map(m.circles.map((c) => [c.map(f).join(','), c])).values()];
    under = `<path d="${grid.join('')}" fill="none" stroke="${accent}" stroke-width="0.025" ${dash} opacity="0.7"/>`
      + rings.map(([cx, cy, r]) => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="none" stroke="${accent}" stroke-width="${f(w)}" opacity="0.16"/>`
        + `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r + w / 2)}" fill="none" stroke="${accent}" stroke-width="0.03" ${dash}/>`
        + `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(Math.max(0.01, r - w / 2))}" fill="none" stroke="${accent}" stroke-width="0.03" ${dash}/>`).join('');
    const centres = rings.map(([cx, cy]) => `M${f(cx - 0.25)} ${f(cy)}H${f(cx + 0.25)}M${f(cx)} ${f(cy - 0.25)}V${f(cy + 0.25)}`).join('');
    // The measures: the cap height beside the first line, the first ring across its top, the stroke under the last stem.
    const t = (x, y, str, rot = 0) => `<text x="${f(x)}" y="${f(y)}" font-size="0.55" font-family="Neue Montreal, Helvetica, sans-serif" fill="${accent}" text-anchor="middle" ${rot ? `transform="rotate(${rot} ${f(x)} ${f(y)})"` : ''}>${str}</text>`;
    const dim = (x1, y1, x2, y2) => {
      const tick = 0.3, vert = x1 === x2;
      const ends = vert ? `M${f(x1 - tick)} ${f(y1)}H${f(x1 + tick)}M${f(x2 - tick)} ${f(y2)}H${f(x2 + tick)}` : `M${f(x1)} ${f(y1 - tick)}V${f(y1 + tick)}M${f(x2)} ${f(y2 - tick)}V${f(y2 + tick)}`;
      return `<path d="M${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}${ends}" fill="none" stroke="${accent}" stroke-width="0.04"/>`;
    };
    const unit = (n) => `${+n.toFixed(2)}u`;
    const ring = m.circles[0];
    over = `<path d="${m.arcs.join('')}" fill="none" stroke="${accent}" stroke-width="${f(w)}" stroke-linecap="butt"/>`
      + `<path d="${centres}" fill="none" stroke="${color}" stroke-width="0.05"/>`
      + dim(-1.2, 0, -1.2, H) + t(-1.6, H / 2, unit(H), -90)
      + (ring ? dim(ring[0] - ring[2] - w / 2, -1.2, ring[0] + ring[2] + w / 2, -1.2) + t(ring[0], -1.5, `Ø ${unit(2 * ring[2] + w)}`) : '')
      + dim(m.w - w, m.h + 1.1, m.w, m.h + 1.1) + t(m.w - w / 2, m.h + 1.9, unit(w));
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f(x0)} ${f(y0)} ${f(W)} ${f(Hh)}">${under}`
    + `<g fill="none" stroke="${color}" stroke-width="${f(w)}" stroke-linecap="butt" stroke-linejoin="miter"><path d="${m.paths.join('')}"/></g>${over}</svg>`; // one path: no seams where the pieces meet
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
#constructed .cons-stage svg { width: 76%; height: 76%; display: block; }
#constructed .cons-row { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--gap); }
@media (max-width: 760px) { #constructed .cons-row { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
#constructed .cons-cell { position: relative; aspect-ratio: 1; display: grid; place-items: center; cursor: pointer; }
#constructed .cons-cell svg { width: 62%; height: 62%; display: block; }
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

/** Mount the tool. Returns { ready, snapshot(), pause(), resume(), destroy() }. */
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
    stage.innerHTML = markSVG(params, fg, { pad: 0.5 });
    // Every layout, as it is set now, to pick from.
    row.innerHTML = Object.keys(LAYOUTS).map((k) => `<figure class="cons-cell" data-layout="${k}" aria-pressed="${k === params.layout}" style="background:${bg};color:${fg}">`
      + `${markSVG({ ...params, layout: k }, fg, { pad: 0.5 })}<figcaption class="label">${LAYOUTS[k].join(' / ')}</figcaption></figure>`).join('');
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
      pane.addBinding(params, 'layout', { options: { 'SMASH': 'line', 'SMA / SH': 'sma-sh', 'SM / ASH': 'sm-ash', 'SM / AS / H': 'sm-as-h' } });
      pane.addBinding(params, 'ground', { options: { 'white on black': 'ink', 'black on white': 'paper' } });
      pane.addBinding(params, 'construction', { label: 'show the construction' });
      const m = pane.addFolder({ title: 'Drawing' });
      m.addBinding(params, 'stencil', { label: 'stencil breaks' });
      m.addBinding(params, 'gap', { label: 'stencil gap', min: 0.1, max: 1.5, step: 0.05 });
      m.addBinding(params, 'weight', { label: 'stroke', min: 0.5, max: 1.8, step: 0.05 });
      m.addBinding(params, 'tracking', { min: 0, max: 2, step: 0.05 });
      m.addBinding(params, 'leading', { label: 'between lines', min: 0, max: 2, step: 0.05 });
      pane.addButton({ title: 'Export SVG' }).on('click', () => {
        const a = Object.assign(document.createElement('a'), {
          href: URL.createObjectURL(new Blob([markSVG(params, '#000000', { construction: false })], { type: 'image/svg+xml' })),
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
