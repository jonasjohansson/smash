// Constructed: SMASH built the way the Elicit Projects wordmark was (Jonas's
// reference, 2026-09-30; its manual, presentations and working files are in
// his Drive). Elicit didn't draw letters: it took a geometric sans (Futura
// under the working file's layers) down to one even stroke, then took each
// letter apart into particles, the iterations and movements of that one
// stroke: a bar, a stub, the stroke turned, the stroke bent into an arc or a
// corner, a ring. Where two particles would join, a gap. What bends stays
// whole (the L, the O, the J, the S); what meets at a joint comes apart (the
// E loses its stem; the T's stem drops a gap under its bar; the P's stem is a
// stub under its bowl).
//
// SMASH in that system, on the same skeleton: the S as Elicit's S (two
// rings and the stroke between them, on their inside tangent), whole; the M
// Futura's (two stems, the V between them), apart at its point, so each stem
// and its arm are one stroke bent; the A the stroke bent into a Λ with a stub
// of a bar in its counter; the H two stems and a bar a gap off each. Or the M
// and the A round: arches, the M's second a gap along its ring off the first.
// Joined (no gaps), the skeleton. Measured on a grid whose unit (u) is the
// stroke: the cap height 7u, the gap 1u. The page also shows the system
// itself: the stroke turned, bent and cornered, with the particles SMASH
// takes from it in pink.

const STORE = 'smash-identity-constructed';
export const CONSTRUCTED_DEFAULTS = {
  layout: 'line', // line | sma-sh | sm-ash | sm-as-h
  stencil: true, // apart at the joints (off: the letters joined, the skeleton)
  gap: 1, // the gap at a joint, in units
  weight: 1, // the stroke, in units (1: the grid's unit)
  tracking: 1.5, // between letters, in units
  leading: 1.5, // between lines, in units
  shape: 'pointed', // the M and the A: pointed (the V, the Λ) | round (arches)
  apart: 0, // the particles pulled apart (0 to 1), as Elicit's Particles pages
  construction: false,
  ground: 'ink', // ink | paper
};

const H = 7; // the cap height, in units
const LAYOUTS = { line: ['SMASH'], 'sma-sh': ['SMA', 'SH'], 'sm-ash': ['SM', 'ASH'], 'sm-as-h': ['SM', 'AS', 'H'] };
const f = (n) => +n.toFixed(3);
const rad = (a) => (a * Math.PI) / 180;
const deg = (a) => (a * 180) / Math.PI;

// A particle is a chain of segments drawn as one stroke: line [x1, y1, x2, y2]
// or arc { cx, cy, r, a0, a1 } (degrees, y down: 270 is a circle's top). part
// names the movement of the stroke it is; clip keeps it inside the cap height
// (a turned stroke's end is cut level with the baseline or the cap line).
const line = (x1, y1, x2, y2) => ({ line: [x1, y1, x2, y2] });
const arc = (cx, cy, r, a0, a1) => ({ arc: { cx, cy, r, a0, a1 } });

/** The letters for settings s: { S: { w, pieces: [{ part, segs, clip, rings }] }, … }. */
function letters(s) {
  const w = s.weight, h = w / 2, g = s.stencil ? s.gap : 0;
  const out = {};

  // S: Elicit's S. Two rings, the top one 3.25u across and the bottom 3.75u,
  // one above the other, and the stroke between them on their inside tangent;
  // its ends cut square to the stroke, at 45°. Whole: a bend doesn't come apart.
  {
    const W = 4, c1 = [W / 2, 1.625], c2 = [W / 2, H - 1.875];
    const r1 = 1.625 - h, r2 = 1.875 - h;
    const dx = c1[0] - c2[0], dy = c1[1] - c2[1], d = Math.hypot(dx, dy);
    const phi = Math.acos(Math.min(1, (r1 + r2) / d));
    const ux = dx / d, uy = dy / d; // from the bottom centre to the top one
    const n = [ux * Math.cos(phi) - uy * Math.sin(phi), ux * Math.sin(phi) + uy * Math.cos(phi)];
    if (n[0] < 0) { n[0] = ux * Math.cos(-phi) - uy * Math.sin(-phi); n[1] = ux * Math.sin(-phi) + uy * Math.cos(-phi); }
    const t1 = [c1[0] - r1 * n[0], c1[1] - r1 * n[1]], t2 = [c2[0] + r2 * n[0], c2[1] + r2 * n[1]];
    const a1 = deg(Math.atan2(t1[1] - c1[1], t1[0] - c1[0]));
    const a2 = deg(Math.atan2(t2[1] - c2[1], t2[0] - c2[0]));
    out.S = { w: W, pieces: [{ part: 'bend', segs: [arc(...c1, r1, 315, a1), line(...t1, ...t2), arc(...c2, r2, a2, 135)], rings: [[...c1, r1], [...c2, r2]] }] };
  }

  // The V and the Λ: the stroke bent to a point, its outer edges from the
  // box's corners to the point (on the baseline for the V, the cap line for
  // the Λ); the centre line is half a stroke in. th is each arm's angle off
  // the vertical.
  const bent = (W, down, ox = 0) => {
    const th = Math.atan(W / 2 / H);
    const tip = h / Math.sin(th); // from the point, in, to the centre line's
    const x0 = h / Math.cos(th); // an arm's centre where it meets the far line
    const yRun = down ? -w : H + w; // run on past the far line, then cut level (clip)
    const run = w * Math.tan(th);
    return { th, W, ox, down, pts: [[ox + x0 - run, yRun], [ox + W / 2, down ? H - tip : tip], [ox + W - x0 + run, yRun]] };
  };
  const poly = (pts) => pts.slice(1).map((p, i) => line(...pts[i], ...p));
  const corner = (v) => ({ part: 'corner', segs: poly(v.pts), clip: true, th: v.th, W: v.W, ox: v.ox, down: v.down });
  // The arch: the stroke bent over a half ring, its legs to the baseline (Elicit's P bowl, stood up).
  const arch = (ox, W) => {
    const r = W / 2 - h, cx = ox + W / 2, cy = W / 2;
    return { part: 'arch', segs: [line(ox + h, H, ox + h, cy), arc(cx, cy, r, 180, 360), line(ox + W - h, cy, ox + W - h, H)], rings: [[cx, cy, r]] };
  };

  if (s.shape === 'round') {
    // M: an arch, and the second arch on the first's right leg, starting a gap
    // along its ring (as Elicit's P bowl starts a gap off its stem).
    const a = 4.5, r = a / 2 - h, cy = a / 2;
    out.M = { w: a - w + a, pieces: [
      arch(0, a),
      { part: 'arch', segs: [arc(a - h + r, cy, r, 180 + deg(g / r), 360), line(a - h + 2 * r, cy, a - h + 2 * r, H)], rings: [[a - h + r, cy, r]] },
    ] };
    // A: the arch, and its bar a gap off each leg.
    const W = 6.5, y = 4.75, inner = g ? w + g : h;
    out.A = { w: W, pieces: [arch(0, W), { part: 'bar', segs: [line(inner, y, W - inner, y)] }] };
  } else {
    // M: two stems and the V between them, its arms from the stems' tops to
    // the point on the baseline (Futura's M). Apart, it comes apart at the
    // point: each stem and its arm stay one stroke, bent (as Elicit's L), and
    // the arms stop a gap short of each other.
    const W = 8, v = bent(W, true);
    const [[ax, ay], [bx, by]] = [v.pts[0], v.pts[1]];
    const tn = (bx - ax) / (by - ay), half = h / Math.cos(v.th);
    const yAt = (x) => ay + (x - ax) / tn; // on the left arm's centre line
    const yEnd = g ? yAt(W / 2 - g / 2 - half) : by;
    const L = [[h, H], [h, yAt(h)], [ax + (yEnd - ay) * tn, yEnd]];
    const R = L.map(([x, y]) => [W - x, y]);
    out.M = { w: W, pieces: g
      ? [{ ...corner(v), segs: poly(L) }, { ...corner(v), segs: poly(R), guide: false }]
      : [corner(v), { part: 'stem', segs: [line(h, 0, h, H)] }, { part: 'stem', segs: [line(W - h, 0, W - h, H)] }] };
    // A: the Λ, and its bar low in the counter; apart, a gap off each leg.
    const WA = 8, va = bent(WA, false), y = 5.5;
    const tan = Math.tan(va.th), sec = 1 / Math.cos(va.th);
    const inner = g ? (H - y) * tan + w * sec + g : (H - y) * tan + h * sec;
    out.A = { w: WA, pieces: [corner(va), { part: 'bar', segs: [line(inner, y, WA - inner, y)] }] };
  }

  // H: two stems and the bar, a gap off each.
  {
    const W = 6, y = 3.5;
    const inner = g ? w + g : h;
    out.H = { w: W, pieces: [
      { part: 'stem', segs: [line(h, 0, h, H)] },
      { part: 'stem', segs: [line(W - h, 0, W - h, H)] },
      { part: 'bar', segs: [line(inner, y, W - inner, y)] },
    ] };
  }
  return out;
}

/** A chain of segments as path data, moved by (dx, dy). */
function chain(segs, dx = 0, dy = 0) {
  let d = '';
  segs.forEach((sg, i) => {
    if (sg.line) {
      const [x1, y1, x2, y2] = sg.line;
      d += `${i ? 'L' : 'M'}${f(x1 + dx)} ${f(y1 + dy)}L${f(x2 + dx)} ${f(y2 + dy)}`;
    } else {
      const { cx, cy, r, a0, a1 } = sg.arc;
      const at = (a) => [cx + r * Math.cos(rad(a)) + dx, cy + r * Math.sin(rad(a)) + dy];
      const [x0, y0] = at(a0), [x1, y1] = at(a1);
      d += `${i ? 'L' : 'M'}${f(x0)} ${f(y0)}A${f(r)} ${f(r)} 0 ${Math.abs(a1 - a0) > 180 ? 1 : 0} ${a1 > a0 ? 1 : 0} ${f(x1)} ${f(y1)}`;
    }
  });
  return d;
}

// A small seeded hash: each particle's own direction when they come apart.
const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

/** The mark for settings s: { w, h, rows: [y], pieces: [{ d, row, off, part, rings, x, y }] } in units. */
export function layout(s) {
  const lines = LAYOUTS[s.layout] ?? LAYOUTS.line;
  const LETTERS = letters(s);
  const widths = lines.map((word) => [...word].reduce((a, ch, i) => a + LETTERS[ch].w + (i ? s.tracking : 0), 0));
  const w = Math.max(...widths);
  const h = lines.length * H + (lines.length - 1) * s.leading;
  const pieces = [], rows = [];
  let k = 0;
  lines.forEach((word, row) => {
    let x = 0;
    const y = row * (H + s.leading);
    rows.push(y);
    for (const ch of word) {
      for (const p of LETTERS[ch].pieces) {
        const a = hash(++k) * Math.PI * 2, r = (0.6 + hash(k + 50)) * 2.2 * s.apart;
        pieces.push({ ...p, d: chain(p.segs, x, y), row, x, y, off: [f(Math.cos(a) * r), f(Math.sin(a) * r)] });
      }
      x += LETTERS[ch].w + s.tracking;
    }
  });
  return { w, h, rows, pieces };
}

let uid = 0;
const MONO = 'font-family="Neue Montreal, Helvetica, sans-serif"';

/** The mark as an SVG, stroked in color, with its measured construction when asked. */
export function markSVG(s, color = 'currentColor', { pad = 0, construction = s.construction, accent = '#ff29b8' } = {}) {
  const m = layout(s);
  const id = `cons${++uid}`;
  const w = s.weight;
  const p = construction ? Math.max(pad, 2.6) : pad + 2.2 * s.apart; // room for the measures, or the particles
  const x0 = -p, y0 = -p, W = m.w + 2 * p, Hh = m.h + 2 * p;
  const clips = m.rows.map((y, i) => `<clipPath id="${id}-${i}" clipPathUnits="userSpaceOnUse"><rect x="-1000" y="${f(y)}" width="2000" height="${H}"/></clipPath>`).join('');
  const draw = (pc, stroke, sw, extra = '') => `<g transform="translate(${pc.off[0]} ${pc.off[1]})"><path d="${pc.d}" fill="none" stroke="${stroke}" stroke-width="${f(sw)}"${pc.clip ? ` clip-path="url(#${id}-${pc.row})"` : ''} ${extra}/></g>`;
  const marks = m.pieces.map((pc) => draw(pc, color, w)).join('');

  let under = '', over = '';
  if (construction) {
    const dash = 'stroke-dasharray="0.12 0.1"';
    const grid = [];
    for (let x = 0; x <= Math.ceil(m.w); x++) grid.push(`M${x} 0V${f(m.h)}`);
    for (let y = 0; y <= Math.ceil(m.h); y++) grid.push(`M0 ${y}H${f(m.w)}`);
    const rings = m.pieces.flatMap((pc) => (pc.rings ?? []).map(([cx, cy, r]) => [cx + pc.x + pc.off[0], cy + pc.y + pc.off[1], r]));
    under = `<path d="${grid.join('')}" fill="none" stroke="${accent}" stroke-width="0.025" ${dash} opacity="0.7"/>`
      + rings.map(([cx, cy, r]) => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="none" stroke="${accent}" stroke-width="${f(w)}" opacity="0.16"/>`
        + [r + w / 2, Math.max(0.01, r - w / 2)].map((rr) => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(rr)}" fill="none" stroke="${accent}" stroke-width="0.03" ${dash}/>`).join('')).join('')
      // The bent strokes' outer edges, run on to the box's corners: the V and the Λ are cut from them.
      + m.pieces.filter((pc) => pc.part === 'corner' && pc.guide !== false).map((pc) => {
        const ox = pc.x + pc.off[0] + pc.ox, oy = pc.y + pc.off[1], W = pc.W;
        const [c0, pt, c1] = pc.down ? [[0, 0], [W / 2, H], [W, 0]] : [[0, H], [W / 2, 0], [W, H]];
        return `<path d="M${f(c0[0] + ox)} ${f(c0[1] + oy)}L${f(pt[0] + ox)} ${f(pt[1] + oy)}L${f(c1[0] + ox)} ${f(c1[1] + oy)}" fill="none" stroke="${accent}" stroke-width="0.04" ${dash}/>`;
      }).join('');
    const centres = rings.map(([cx, cy]) => `M${f(cx - 0.25)} ${f(cy)}H${f(cx + 0.25)}M${f(cx)} ${f(cy - 0.25)}V${f(cy + 0.25)}`).join('');
    const t = (x, y, str, rot = 0) => `<text x="${f(x)}" y="${f(y)}" font-size="0.55" ${MONO} fill="${accent}" text-anchor="middle" ${rot ? `transform="rotate(${rot} ${f(x)} ${f(y)})"` : ''}>${str}</text>`;
    const dim = (x1, y1, x2, y2) => {
      const tick = 0.3, vert = x1 === x2;
      const ends = vert ? `M${f(x1 - tick)} ${f(y1)}H${f(x1 + tick)}M${f(x2 - tick)} ${f(y2)}H${f(x2 + tick)}` : `M${f(x1)} ${f(y1 - tick)}V${f(y1 + tick)}M${f(x2)} ${f(y2 - tick)}V${f(y2 + tick)}`;
      return `<path d="M${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}${ends}" fill="none" stroke="${accent}" stroke-width="0.04"/>`;
    };
    const u = (n) => `${+n.toFixed(2)}u`;
    // Each particle's centre line, in pink over the mark: where one stroke ends and the next begins.
    over = m.pieces.map((pc) => draw(pc, accent, 0.06)).join('')
      + `<path d="${centres}" fill="none" stroke="${accent}" stroke-width="0.05"/>`
      + dim(-1.3, 0, -1.3, H) + t(-1.7, H / 2, u(H), -90)
      + (rings[0] ? dim(rings[0][0] - rings[0][2] - w / 2, -1.3, rings[0][0] + rings[0][2] + w / 2, -1.3) + t(rings[0][0], -1.65, `Ø ${u(2 * rings[0][2] + w)}`) : '')
      + (rings[1] ? `<text x="${f(rings[1][0] - rings[1][2] - w / 2 - 0.4)}" y="${f(rings[1][1] + 0.2)}" font-size="0.55" ${MONO} fill="${accent}" text-anchor="end">Ø ${u(2 * rings[1][2] + w)}</text>` : '')
      + dim(m.w - w, m.h + 1.2, m.w, m.h + 1.2) + t(m.w - w / 2, m.h + 2, `stroke ${u(w)}`)
      + (s.stencil ? dim(m.w - w - s.gap, m.h + 1.2, m.w - w, m.h + 1.2) + t(m.w - w - s.gap / 2, m.h + 2.7, `gap ${u(s.gap)}`) : '');
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f(x0)} ${f(y0)} ${f(W)} ${f(Hh)}"><defs>${clips}</defs>${under}`
    + `<g stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="10">${marks}${over}</g></svg>`;
}
// The system: one stroke, moved, as Elicit's manual shows it. Rows of five:
// the stroke turned, bent into an arc, bent into a corner; the cells in pink
// are the particles SMASH is built from (the stem, the bar, the S's bend, the
// Λ's corner, and the M's: the V joined, each stem bent into its arm apart).
function systemSVG(s, color, accent = '#ff29b8') {
  const w = s.weight, L = 4.4, cell = 6.5;
  const lt = letters(s);
  const round = s.shape === 'round';
  const angM = round ? 60 : (s.stencil ? 1 : 2) * deg(lt.M.pieces[0].th), angA = round ? 45 : 2 * deg(lt.A.pieces[0].th);
  // Each step as points along the stroke, of one length; drawn centred in its cell.
  const rows = [
    { name: 'turned', steps: [0, 22.5, 45, 67.5, 90], used: [1, 0, 0, 0, 1], pts: (a) => [[-Math.sin(rad(a)) * L / 2, -Math.cos(rad(a)) * L / 2], [Math.sin(rad(a)) * L / 2, Math.cos(rad(a)) * L / 2]] },
    { name: 'bent', steps: [0, 90, 180, 270, 360], used: round ? [0, 0, 1, 1, 0] : [0, 0, 0, 1, 0], pts: (a) => {
      if (!a) return [[0, -L / 2], [0, L / 2]];
      const len = L * 1.5, r = len / rad(a), n = 48;
      return Array.from({ length: n + 1 }, (_, i) => { const t = rad(180 - a / 2 + (a * i) / n); return [r * Math.cos(t), r * Math.sin(t)]; });
    } },
    { name: 'cornered', steps: [180, 135, angA, angM, 90], used: round ? [0, 0, 0, 0, 0] : [0, 0, 1, 1, 0], pts: (a, i) => {
      const half = rad(a / 2), arm = L * 0.6, dir = i === 3 && !s.stencil && !round ? 1 : -1; // the joined M's V points down; the rest up (apart, the M is two stems bent into their arms)
      return [[-Math.sin(half) * arm, 0], [0, dir * Math.cos(half) * arm], [Math.sin(half) * arm, 0]];
    } },
  ];
  const Wd = 5 * cell, Hd = rows.length * cell;
  const body = rows.map((row, j) => row.steps.map((a, i) => {
    const pts = row.pts(a, i);
    const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
    const mx = (Math.min(...xs) + Math.max(...xs)) / 2, my = (Math.min(...ys) + Math.max(...ys)) / 2;
    const cx = i * cell + cell / 2 - mx, cy = j * cell + cell / 2 - my;
    const d = pts.map((q, k) => `${k ? 'L' : 'M'}${f(q[0] + cx)} ${f(q[1] + cy)}`).join('') + (a === 360 && row.name === 'bent' ? 'Z' : '');
    return `<path d="${d}" fill="none" stroke="${row.used[i] ? accent : color}" stroke-width="${f(w * 0.8)}"/>`;
  }).join('') + `<text x="-0.6" y="${f(j * cell + cell / 2 + 0.3)}" font-size="0.9" ${MONO} fill="${color}" opacity="0.6" text-anchor="end">${row.name}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-7 0 ${f(Wd + 7)} ${f(Hd)}" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="10">${body}</svg>`;
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
    <div class="cons-system"></div>
    <div class="cons-row"></div>
  </section>`;

const STYLE = `
#constructed .cons-stage { display: grid; place-items: center; }
#constructed .cons-stage svg { width: 80%; height: 80%; display: block; }
#constructed .cons-system { aspect-ratio: 16 / 7; display: grid; place-items: center; }
#constructed .cons-system svg { width: 70%; height: 80%; display: block; }
#constructed .cons-row { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--gap); }
@media (max-width: 760px) { #constructed .cons-row { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
#constructed .cons-cell { position: relative; aspect-ratio: 1; display: grid; place-items: center; cursor: pointer; margin: 0; }
#constructed .cons-cell svg { width: 70%; height: 70%; display: block; }
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
  const system = section.querySelector('.cons-system');
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
    system.style.background = bg;
    system.innerHTML = systemSVG(params, fg);
    // Every layout, as it is set now, to pick from.
    row.innerHTML = Object.keys(LAYOUTS).map((k) => `<figure class="cons-cell" data-layout="${k}" aria-pressed="${k === params.layout}" style="background:${bg};color:${fg}">`
      + `${markSVG({ ...params, layout: k, apart: 0 }, fg, { pad: 0.5, construction: false })}<figcaption class="label">${LAYOUTS[k].join(' / ')}</figcaption></figure>`).join('');
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
      pane.addBinding(params, 'shape', { label: 'M and A', options: { 'pointed (V, Λ)': 'pointed', 'round (arches)': 'round' } });
      pane.addBinding(params, 'construction', { label: 'show the construction' });
      pane.addBinding(params, 'apart', { label: 'particles apart', min: 0, max: 1, step: 0.01 });
      const m = pane.addFolder({ title: 'Drawing' });
      m.addBinding(params, 'stencil', { label: 'apart at the joints' });
      m.addBinding(params, 'gap', { label: 'gap', min: 0.25, max: 2, step: 0.05 });
      m.addBinding(params, 'weight', { label: 'stroke', min: 0.5, max: 1.6, step: 0.05 });
      m.addBinding(params, 'tracking', { min: 0, max: 3, step: 0.05 });
      m.addBinding(params, 'leading', { label: 'between lines', min: 0, max: 3, step: 0.05 });
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
    destroy() { destroyed = true; pane?.dispose(); stage.innerHTML = ''; system.innerHTML = ''; row.innerHTML = ''; },
  };
}
