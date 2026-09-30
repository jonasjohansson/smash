// Systems: five modular interpretations of SMASH (Jonas, 2026-09-30: "5 quite
// different interpretations of a modular approach", after Constructed). Each
// is one module and a rule, and the letters are whatever the rule lets the
// module make; they differ in the kind of module, not only its shape:
//
// 01 Tiles: solid pieces on a square grid, square, quarter circle and circle
//    (Albers' combination letters, 1931), a hairline between them.
// 02 Stripes: one band of three lines, straight, bent in quarter circles or
//    cornered at 45°, the lines bending together.
// 03 Bulbs: points of light at one spacing along a single line.
// 04 Blocks: cubes on a grid, the letters built rather than drawn.
// 05 Field: one module over the whole ground; the letters are where it turns.
//
// Tiles and Blocks are bitmaps (a row of cells per string); Stripes, Bulbs and
// Field share one skeleton, centre lines on a cap height of 10, drawn apart
// (Stripes) or joined (Bulbs, Field). Each has a construction view (its grid,
// its centre lines and circles) and its kit.

const STORE = 'smash-identity-systems';
export const SYSTEMS_DEFAULTS = {
  layout: 'line', // line | sm-ash
  ground: 'ink', // ink | paper
  construction: false,
  tilesGap: 0.05, // the hairline round a curved piece, in cells
  stripeLines: 3,
  stripeWeight: 0.34, // one line (and one gap), in skeleton units
  bulbSpacing: 1, // between bulbs, in skeleton units
  bulbSize: 0.34, // a bulb's radius, in spacings
  bulbWire: false,
  blockDepth: 0.55, // the cubes' depth, in cells
  fieldPitch: 0.62, // the module, in skeleton units
  fieldModule: 'bar', // bar | dot
};
export const SYSTEMS = [
  { id: 'tiles', n: '01', name: 'Tiles', rule: 'square, quarter circle, circle: solid pieces on a grid, a hairline between them' },
  { id: 'stripes', n: '02', name: 'Stripes', rule: 'one band of three lines, bending together: straight, quarter circle, 45°' },
  { id: 'bulbs', n: '03', name: 'Bulbs', rule: 'points of light at one spacing along one line' },
  { id: 'blocks', n: '04', name: 'Blocks', rule: 'cubes on a grid: the letters built, not drawn' },
  { id: 'field', n: '05', name: 'Field', rule: 'one module over the whole ground: the letters are where it turns' },
];
const LAYOUTS = { line: ['SMASH'], 'sm-ash': ['SM', 'ASH'] };

const f = (n) => +n.toFixed(3);
const rad = (a) => (a * Math.PI) / 180;
const K = Math.SQRT1_2;
const at = (cx, cy, r, a) => [cx + r * Math.cos(rad(a)), cy + r * Math.sin(rad(a))];
const line = (x1, y1, x2, y2) => ({ line: [x1, y1, x2, y2] });
const arc = (cx, cy, r, a0, a1) => ({ arc: { cx, cy, r, a0, a1 } }); // degrees, y down; a1 above a0 runs clockwise

/** A chain of segments as path data, moved by (dx, dy). */
function chainD(segs, dx = 0, dy = 0) {
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
const segLen = (sg) => (sg.line ? Math.hypot(sg.line[2] - sg.line[0], sg.line[3] - sg.line[1]) : (Math.abs(sg.arc.a1 - sg.arc.a0) * Math.PI * sg.arc.r) / 180);
const segAt = (sg, t) => (sg.line ? [sg.line[0] + (sg.line[2] - sg.line[0]) * t, sg.line[1] + (sg.line[3] - sg.line[1]) * t] : at(sg.arc.cx, sg.arc.cy, sg.arc.r, sg.arc.a0 + (sg.arc.a1 - sg.arc.a0) * t));
function segDist(px, py, sg) {
  if (sg.line) {
    const [x1, y1, x2, y2] = sg.line, dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy;
    const t = l2 ? Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / l2)) : 0;
    return Math.hypot(px - x1 - dx * t, py - y1 - dy * t);
  }
  const { cx, cy, r, a0, a1 } = sg.arc;
  let a = (Math.atan2(py - cy, px - cx) * 180) / Math.PI;
  const lo = Math.min(a0, a1), hi = Math.max(a0, a1);
  while (a < lo) a += 360;
  while (a > hi + 1e-9 && a - 360 >= lo) a -= 360;
  if (a >= lo && a <= hi) return Math.abs(Math.hypot(px - cx, py - cy) - r);
  const [ex0, ey0] = at(cx, cy, r, a0), [ex1, ey1] = at(cx, cy, r, a1);
  return Math.min(Math.hypot(px - ex0, py - ey0), Math.hypot(px - ex1, py - ey1));
}

// ---------------------------------------------------------------------------
// The skeleton: centre lines, cap height 10 (Stripes, Bulbs, Field).

const CAP = 10;
/**
 * The skeleton's letters. join: bars meet their stems (Bulbs, Field); apart:
 * the bars stand off their stems (Stripes), by gap, with ends run on by ext
 * so a band's butt end sits on the cap and base lines' outer edge.
 */
function skeleton({ join = true, gap = 0, ext = 0 } = {}) {
  // S: two rings, r 2 and r 2.4, the stroke between them tangent to both on
  // their 45° points (so it runs at 45°), the ends on the rings' 45° points too.
  const r1 = 2, r2 = 2.4;
  const dx = CAP - (r1 + r2) * (1 + 2 * K); // the lower centre, from the upper
  let c1 = [0, r1], c2 = [dx, CAP - r2];
  const left = Math.min(c1[0] - r1, c2[0] - r2 * K), shift = -left;
  c1 = [c1[0] + shift, c1[1]]; c2 = [c2[0] + shift, c2[1]];
  const S = {
    w: Math.max(c2[0] + r2, c1[0] + r1 * K),
    paths: [[arc(...c1, r1, 315, 135), line(...at(...c1, r1, 135), ...at(...c2, r2, -45)), arc(...c2, r2, -45, 135)]],
    circles: [[...c1, r1], [...c2, r2]],
  };
  // M: two stems and a V to below the mid line; one stroke.
  const MW = 8, MV = 6;
  const M = { w: MW, paths: [[line(0, CAP + ext, 0, 0), line(0, 0, MW / 2, MV), line(MW / 2, MV, MW, 0), line(MW, 0, MW, CAP + ext)]], clip: true };
  // A: a half ring over its legs, r 4; the bar below the ring's centre.
  const AW = 8, AR = AW / 2, AY = 6.5;
  const abar = join ? line(0, AY, AW, AY) : line(gap, AY, AW - gap, AY);
  const A = { w: AW, paths: [[line(0, CAP + ext, 0, AR), arc(AR, AR, AR, 180, 360), line(AW, AR, AW, CAP + ext)], [abar]], circles: [[AR, AR, AR]] };
  // H: two stems and the bar on the mid line.
  const HW = 7;
  const hbar = join ? line(0, CAP / 2, HW, CAP / 2) : line(gap, CAP / 2, HW - gap, CAP / 2);
  const H = { w: HW, paths: [[line(0, -ext, 0, CAP + ext)], [line(HW, -ext, HW, CAP + ext)], [hbar]] };
  return { S, M, A, H };
}

/** Set a string of skeleton letters: [{ ch, x, y, L }], and the box of their centre lines. */
function setSkeleton(rows, LET, track, lead) {
  const out = [];
  let w = 0;
  rows.forEach((word, r) => {
    let x = 0;
    const y = r * (CAP + lead);
    [...word].forEach((ch, i) => { if (i) x += track; out.push({ ch, x, y, L: LET[ch] }); x += LET[ch].w; });
    w = Math.max(w, x);
  });
  return { items: out, w, h: rows.length * CAP + (rows.length - 1) * lead };
}

// ---------------------------------------------------------------------------
// The bitmaps (Tiles, Blocks). Tiles: '##' a square; 'tl', 'tr', 'bl', 'br' a
// quarter circle bulging to that corner; 'oo' a circle; '..' empty.

const TILES = {
  S: ['tl ## ## ##', '## .. .. ..', 'bl ## ## tr', '.. .. .. ##', '## ## ## br'],
  M: ['tl ## ## ## tr', '## .. ## .. ##', '## .. oo .. ##', '## .. .. .. ##', '## .. .. .. ##'],
  A: ['tl ## ## tr', '## .. .. ##', '## ## ## ##', '## .. .. ##', '## .. .. ##'],
  H: ['## .. .. ##', '## .. .. ##', '## ## ## ##', '## .. .. ##', '## .. .. ##'],
};
const BLOCKS = {
  S: ['.###', '#...', '.##.', '...#', '###.'],
  M: ['#...#', '##.##', '#.#.#', '#...#', '#...#'],
  A: ['.##.', '#..#', '####', '#..#', '#..#'],
  H: ['#..#', '#..#', '####', '#..#', '#..#'],
};
/** Set a string in a bitmap: cells [{ x, y, v }] and the size in cells. */
function setBitmap(rows, MAP, split, track = 1, lead = 1) {
  const cells = [];
  let w = 0;
  const hRow = MAP.S.length;
  rows.forEach((word, r) => {
    let x = 0;
    [...word].forEach((ch, i) => {
      if (i) x += track;
      const g = MAP[ch].map(split);
      g.forEach((row, y) => row.forEach((v, cx) => { if (v !== '.' && v !== '..') cells.push({ x: x + cx, y: r * (hRow + lead) + y, v }); }));
      x += g[0].length;
    });
    w = Math.max(w, x);
  });
  return { cells, w, h: rows.length * hRow + (rows.length - 1) * lead };
}

// ---------------------------------------------------------------------------
// Framing: every system is drawn into a viewBox of the stage's aspect, the
// mark centred with a margin of its own height.

function frame(w, h, aspect, margin) {
  let W = w + 2 * margin, Hh = h + 2 * margin;
  if (W / Hh < aspect) W = Hh * aspect; else Hh = W / aspect;
  return { x: (w - W) / 2, y: (h - Hh) / 2, W, H: Hh };
}
const svgOpen = (b) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f(b.x)} ${f(b.y)} ${f(b.W)} ${f(b.H)}">`;
const PINK = '#ff29b8';
/** a and b ('#rrggbb') mixed, t of a. */
function mix(a, b, t) {
  const h = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const [x, y] = [h(a), h(b)];
  return '#' + x.map((v, i) => Math.round(v * t + y[i] * (1 - t)).toString(16).padStart(2, '0')).join('');
}
const thin = (w = 0.05) => `fill="none" stroke="${PINK}" stroke-width="${w}"`;

// 01 Tiles --------------------------------------------------------------------
function tileShape(x, y, v, g) {
  // A square fills its cell, so squares run together into bars; a curved piece
  // stands off the cell's edges by the hairline, so the pieces show.
  if (v === '##') return `M${f(x)} ${f(y)}h1v1h-1Z`;
  const a = x + g, b = y + g, s = 1 - 2 * g;
  if (v === 'oo') return `M${f(x + 0.5 - s / 2)} ${f(y + 0.5)}a${f(s / 2)} ${f(s / 2)} 0 1 0 ${f(s)} 0a${f(s / 2)} ${f(s / 2)} 0 1 0 ${f(-s)} 0Z`;
  // A quarter circle bulging to its corner: its right angle at the opposite corner.
  const [cx, cy] = { tl: [a + s, b + s], tr: [a, b + s], bl: [a + s, b], br: [a, b] }[v];
  const sx = v[1] === 'l' ? -1 : 1, sy = v[0] === 't' ? -1 : 1;
  const sweep = sx * sy > 0 ? 1 : 0;
  return `M${f(cx)} ${f(cy)}L${f(cx + sx * s)} ${f(cy)}A${f(s)} ${f(s)} 0 0 ${sweep} ${f(cx)} ${f(cy + sy * s)}Z`;
}
function tiles(s, color, rows, aspect) {
  const m = setBitmap(rows, TILES, (r) => r.split(' '), 1, 1);
  const b = frame(m.w, m.h, aspect, 1.6);
  let out = svgOpen(b);
  if (s.construction) out += `<path d="${m.cells.map((c) => `M${c.x} ${c.y}h1v1h-1Z`).join('')}" ${thin(0.03)}/>`;
  out += `<path d="${m.cells.map((c) => tileShape(c.x, c.y, c.v, s.tilesGap)).join('')}" fill="${color}"/>`;
  return out + '</svg>';
}
function tilesKit(s, color) {
  const kinds = ['##', 'tl', 'tr', 'bl', 'br', 'oo'];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-0.2 -0.2 ${kinds.length * 1.6} 1.4"><path d="${kinds.map((v, i) => tileShape(i * 1.6, 0, v, s.tilesGap)).join('')}" fill="${color}"/></svg>`;
}

// 02 Stripes ------------------------------------------------------------------
function stripes(s, color, ground, rows, aspect) {
  const l = s.stripeWeight, n = s.stripeLines, B = (2 * n - 1) * l;
  const LET = skeleton({ join: false, gap: 1.1 * B, ext: B / 2 }); // a bar stands 0.6 bands off its stems
  const m = setSkeleton(rows, LET, B + 1.6, B + 2.4);
  const b = frame(m.w, m.h, aspect, 3);
  const ds = m.items.flatMap((it) => it.L.paths.map((p) => ({ d: chainD(p, it.x, it.y), clip: it.L.clip, row: it.y })));
  const id = `st${++uid}`;
  const rowsY = [...new Set(m.items.map((it) => it.y))];
  const clips = rowsY.map((y, i) => `<clipPath id="${id}${i}" clipPathUnits="userSpaceOnUse"><rect x="-1000" y="${f(y - B / 2)}" width="2000" height="${f(CAP + B)}"/></clipPath>`).join('');
  // The band as nested strokes: the widest in ink, then ground, then ink, down to one line.
  let layers = '';
  for (let k = 0; k < n * 2 - 1; k++) {
    const wk = B - 2 * k * l, c = k % 2 ? ground : color;
    layers += `<g stroke="${c}" stroke-width="${f(wk)}">${ds.map((p) => `<path d="${p.d}"${p.clip ? ` clip-path="url(#${id}${rowsY.indexOf(p.row)})"` : ''}/>`).join('')}</g>`;
  }
  let out = svgOpen(b) + `<defs>${clips}</defs><g fill="none" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="12">${layers}</g>`;
  if (s.construction) out += constructSkeleton(m, 0.06);
  return out + '</svg>';
}
function stripesKit(s, color, ground) {
  const l = s.stripeWeight, n = s.stripeLines, B = (2 * n - 1) * l;
  const ds = ['M0 5V1', `M${B + 2} 5V${B + 1}A2 2 0 0 1 ${B + 4} ${B - 1}H${B + 5}`, `M${2 * B + 7} 5L${2 * B + 9} 1L${2 * B + 11} 5`];
  let layers = '';
  for (let k = 0; k < n * 2 - 1; k++) layers += `<g stroke="${k % 2 ? ground : color}" stroke-width="${f(B - 2 * k * l)}">${ds.map((d) => `<path d="${d}"/>`).join('')}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f(-B)} ${f(-B)} ${f(2 * B + 12 + 2 * B)} ${f(6 + 2 * B)}"><g fill="none" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="12">${layers}</g></svg>`;
}

// 03 Bulbs --------------------------------------------------------------------
function bulbPoints(m, sp) {
  const pts = [];
  const add = (x, y) => { if (!pts.some(([a, b]) => Math.hypot(a - x, b - y) < sp * 0.45)) pts.push([x, y]); };
  for (const it of m.items) for (const p of it.L.paths) for (const sg of p) {
    const n = Math.max(1, Math.round(segLen(sg) / sp));
    for (let k = 0; k <= n; k++) { const [x, y] = segAt(sg, k / n); add(x + it.x, y + it.y); }
  }
  return pts;
}
function bulbs(s, color, rows, aspect) {
  const LET = skeleton({ join: true });
  const sp = s.bulbSpacing, r = s.bulbSize * sp;
  const m = setSkeleton(rows, LET, 2.4 * sp, 3 * sp);
  const b = frame(m.w, m.h, aspect, 3);
  let out = svgOpen(b);
  if (s.bulbWire || s.construction) out += `<g fill="none" stroke="${s.construction ? PINK : color}" stroke-width="${s.construction ? 0.06 : 0.07}" opacity="${s.construction ? 1 : 0.5}">${m.items.flatMap((it) => it.L.paths.map((p) => `<path d="${chainD(p, it.x, it.y)}"/>`)).join('')}</g>`;
  out += `<g fill="${color}">${bulbPoints(m, sp).map(([x, y]) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}"/>`).join('')}</g>`;
  if (s.construction) out += constructSkeleton(m, 0.06, false);
  return out + '</svg>';
}
function bulbsKit(s, color) {
  const sp = s.bulbSpacing, r = s.bulbSize * sp;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f(-sp)} ${f(-sp)} ${f(6 * sp)} ${f(2 * sp)}"><g fill="${color}">${[0, 1, 2, 3, 4].map((i) => `<circle cx="${f(i * sp)}" cy="0" r="${f(r)}"/>`).join('')}</g></svg>`;
}

// 04 Blocks -------------------------------------------------------------------
function blocks(s, color, ground, rows, aspect) {
  const m = setBitmap(rows, BLOCKS, (r) => [...r], 1, 1.4);
  const D = s.blockDepth, ox = D * K, oy = -D * K; // the depth, up and to the right at 45°
  const b = frame(m.w + ox, m.h - oy, aspect, 1.6);
  b.y += oy; // the cubes run up from the top row by the depth
  const on = new Set(m.cells.map((c) => `${c.x},${c.y}`));
  const has = (x, y) => on.has(`${x},${y}`);
  // Painted from the back: rows from the bottom up, cells from the left.
  const order = [...m.cells].sort((a, c) => c.y - a.y || a.x - c.x);
  const face = (pts, fill) => `<path d="M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}Z" fill="${fill}" stroke="${ground}" stroke-width="0.035" stroke-linejoin="round"/>`;
  let body = '';
  for (const { x, y } of order) {
    if (!has(x, y - 1)) body += face([[x, y], [x + 1, y], [x + 1 + ox, y + oy], [x + ox, y + oy]], mix(color, ground, 0.62));
    if (!has(x + 1, y)) body += face([[x + 1, y], [x + 1 + ox, y + oy], [x + 1 + ox, y + 1 + oy], [x + 1, y + 1]], mix(color, ground, 0.3));
    body += face([[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]], color);
  }
  let out = svgOpen(b);
  if (s.construction) {
    const cols = Math.ceil(m.w), rws = Math.ceil(m.h);
    let g = '';
    for (let i = 0; i <= cols; i++) g += `M${i} 0V${rws}`;
    for (let j = 0; j <= rws; j++) g += `M0 ${j}H${cols}`;
    out += `<path d="${g}" ${thin(0.025)} opacity="0.7"/>`;
  }
  return out + body + '</svg>';
}
function blocksKit(s, color, ground) {
  const D = s.blockDepth, ox = D * K, oy = -D * K;
  const face = (pts, fill) => `<path d="M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}Z" fill="${fill}" stroke="${ground}" stroke-width="0.035"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-0.3 ${f(oy - 0.3)} ${f(1.6 + ox)} ${f(1.6 - oy)}">`
    + face([[0, 0], [1, 0], [1 + ox, oy], [ox, oy]], mix(color, ground, 0.62))
    + face([[1, 0], [1 + ox, oy], [1 + ox, 1 + oy], [1, 1]], mix(color, ground, 0.3))
    + face([[0, 0], [1, 0], [1, 1], [0, 1]], color) + '</svg>';
}

// 05 Field --------------------------------------------------------------------
const FIELD_T = 2.7; // the letters' weight, in skeleton units
function field(s, color, rows, aspect) {
  const LET = skeleton({ join: true });
  const m = setSkeleton(rows, LET, FIELD_T + 1.5, FIELD_T + 2);
  const b = frame(m.w + FIELD_T, m.h + FIELD_T, aspect, 3.2);
  b.x -= FIELD_T / 2; b.y -= FIELD_T / 2;
  const segs = m.items.flatMap((it) => it.L.paths.flatMap((p) => p.map((sg) => (sg.line
    ? line(sg.line[0] + it.x, sg.line[1] + it.y, sg.line[2] + it.x, sg.line[3] + it.y)
    : arc(sg.arc.cx + it.x, sg.arc.cy + it.y, sg.arc.r, sg.arc.a0, sg.arc.a1)))));
  const inside = (x, y) => segs.some((sg) => segDist(x, y, sg) <= FIELD_T / 2);
  const p = s.fieldPitch;
  const x0 = Math.floor(b.x / p) * p, y0 = Math.floor(b.y / p) * p;
  let d = '';
  for (let y = y0 + p / 2; y < b.y + b.H; y += p) {
    for (let x = x0 + p / 2; x < b.x + b.W; x += p) {
      const inn = inside(x, y);
      if (s.fieldModule === 'dot') {
        // A dot outside, a dash inside: the same module, stretched.
        const rx = inn ? p * 0.42 : p * 0.14, ry = p * 0.14;
        d += `M${f(x - rx)} ${f(y)}a${f(rx)} ${f(ry)} 0 1 0 ${f(2 * rx)} 0a${f(rx)} ${f(ry)} 0 1 0 ${f(-2 * rx)} 0Z`;
      } else {
        // A bar: upright outside, lying down inside.
        const hw = p * 0.4, ht = p * 0.1;
        d += inn ? `M${f(x - hw)} ${f(y - ht)}h${f(2 * hw)}v${f(2 * ht)}h${f(-2 * hw)}Z` : `M${f(x - ht)} ${f(y - hw)}h${f(2 * ht)}v${f(2 * hw)}h${f(-2 * ht)}Z`;
      }
    }
  }
  let out = svgOpen(b) + `<path d="${d}" fill="${color}"/>`;
  if (s.construction) out += `<g fill="none" stroke="${PINK}" stroke-width="0.07">${m.items.flatMap((it) => it.L.paths.map((pp) => `<path d="${chainD(pp, it.x, it.y)}"/>`)).join('')}</g>`;
  return out + '</svg>';
}
function fieldKit(s, color) {
  const p = 1, hw = p * 0.4, ht = p * 0.09;
  const up = (x) => `M${f(x - ht)} ${f(-hw)}h${f(2 * ht)}v${f(2 * hw)}h${f(-2 * ht)}Z`, down = (x) => `M${f(x - hw)} ${f(-ht)}h${f(2 * hw)}v${f(2 * ht)}h${f(-2 * hw)}Z`;
  const dot = (x, rx) => `M${f(x - rx)} 0a${f(rx)} ${f(p * 0.14)} 0 1 0 ${f(2 * rx)} 0a${f(rx)} ${f(p * 0.14)} 0 1 0 ${f(-2 * rx)} 0Z`;
  const d = s.fieldModule === 'dot' ? dot(0, 0.14) + dot(1.6, 0.42) : up(0) + down(1.6);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-0.8 -0.8 3.2 1.6"><path d="${d}" fill="${color}"/></svg>`;
}

// The skeleton's construction: the rows' cap, mid and base lines, the circles
// whole with their centres, and the centre lines.
function constructSkeleton(m, w, centres = true) {
  const rowsY = [...new Set(m.items.map((it) => it.y))];
  let g = rowsY.map((y) => [0, CAP / 2, CAP].map((dy) => `M-2 ${f(y + dy)}H${f(m.w + 2)}`).join('')).join('');
  let out = `<path d="${g}" ${thin(w * 0.8)} opacity="0.8"/>`;
  for (const it of m.items) for (const [cx, cy, r] of it.L.circles ?? []) {
    out += `<circle cx="${f(cx + it.x)}" cy="${f(cy + it.y)}" r="${f(r)}" ${thin(w)} stroke-dasharray="0.3 0.2"/>`
      + `<path d="M${f(cx + it.x - 0.4)} ${f(cy + it.y)}h0.8M${f(cx + it.x)} ${f(cy + it.y - 0.4)}v0.8" ${thin(w)}/>`;
  }
  if (centres) out += `<g ${thin(w)}>${m.items.flatMap((it) => it.L.paths.map((p) => `<path d="${chainD(p, it.x, it.y)}"/>`)).join('')}</g>`;
  return out;
}

let uid = 0;
/** One system's mark as an SVG at a stage's aspect. */
export function systemSVG(id, s, { color = '#ffffff', ground = '#000000', aspect = 21 / 9 } = {}) {
  const rows = LAYOUTS[s.layout] ?? LAYOUTS.line;
  if (id === 'tiles') return tiles(s, color, rows, aspect);
  if (id === 'stripes') return stripes(s, color, ground, rows, aspect);
  if (id === 'bulbs') return bulbs(s, color, rows, aspect);
  if (id === 'blocks') return blocks(s, color, ground, rows, aspect);
  return field(s, color, rows, aspect);
}
/** One system's kit: its module(s), small. */
export function kitSVG(id, s, { color = '#ffffff', ground = '#000000' } = {}) {
  if (id === 'tiles') return tilesKit(s, color);
  if (id === 'stripes') return stripesKit(s, color, ground);
  if (id === 'bulbs') return bulbsKit(s, color);
  if (id === 'blocks') return blocksKit(s, color, ground);
  return fieldKit(s, color);
}

export const HTML = `
  <section class="lab" id="systems">
    <header class="ch-head">
      <p class="ch-n">00 · systems</p>
      <h2 class="ch-name">Systems</h2>
    </header>
    <div class="lab-body">
      <div class="sys-list"></div>
      <div class="lab-panel"></div>
    </div>
  </section>`;

const STYLE = `
#systems .sys-list { display: grid; gap: clamp(28px, 4vw, 56px); }
#systems .sys { margin: 0; display: grid; gap: 10px; }
#systems .sys-stage { aspect-ratio: 21 / 9; overflow: hidden; }
#systems .sys-stage svg { width: 100%; height: 100%; display: block; }
#systems .sys-cap { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
#systems .sys-cap p { margin: 0; font-size: 13px; color: var(--dim, #8c8c8c); }
#systems .sys-cap b { font-weight: 400; color: var(--text, #fff); margin-right: 8px; }
#systems .sys-kit { height: 26px; flex: none; }
#systems .sys-kit svg { height: 100%; width: auto; display: block; }
#systems .lab-panel { position: sticky; top: 16px; }
`;

function load() {
  try { return { ...SYSTEMS_DEFAULTS, ...JSON.parse(localStorage.getItem(STORE) || '{}') }; } catch { return { ...SYSTEMS_DEFAULTS }; }
}
function save(p) {
  const changed = Object.fromEntries(Object.entries(p).filter(([k, v]) => v !== SYSTEMS_DEFAULTS[k]));
  try { localStorage.setItem(STORE, JSON.stringify(changed)); } catch {}
}

/** Mount the section. Returns { ready, pause(), resume(), destroy() }. */
export function mount(section, { panel = true, settings = null } = {}) {
  const params = settings ? { ...SYSTEMS_DEFAULTS, ...settings } : load();
  const list = section.querySelector('.sys-list');
  if (!document.getElementById('systems-style')) {
    const style = document.createElement('style');
    style.id = 'systems-style';
    style.textContent = STYLE;
    document.head.appendChild(style);
  }
  let destroyed = false;
  const colors = () => (params.ground === 'paper' ? { color: '#000000', ground: '#ffffff' } : { color: '#ffffff', ground: '#000000' });
  function draw() {
    if (destroyed) return;
    const c = colors();
    list.innerHTML = SYSTEMS.map((sy) => `<figure class="sys" data-id="${sy.id}">`
      + `<div class="sys-stage" style="background:${c.ground}">${systemSVG(sy.id, params, c)}</div>`
      + `<figcaption class="sys-cap"><p><b>${sy.n} ${sy.name}</b>${sy.rule}</p><span class="sys-kit">${kitSVG(sy.id, params, { color: '#ffffff', ground: '#000000' })}</span></figcaption></figure>`).join('');
  }
  const keep = () => { if (!settings) save(params); };
  draw();

  let pane = null;
  if (panel) {
    import('https://cdn.jsdelivr.net/npm/tweakpane@4.0.5/dist/tweakpane.min.js').then(({ Pane }) => {
      if (destroyed) return;
      pane = new Pane({ container: section.querySelector('.lab-panel'), title: 'Systems' });
      pane.addBinding(params, 'layout', { options: { 'SMASH': 'line', 'SM / ASH': 'sm-ash' } });
      pane.addBinding(params, 'ground', { options: { 'white on black': 'ink', 'black on white': 'paper' } });
      pane.addBinding(params, 'construction', { label: 'show the construction' });
      const t = pane.addFolder({ title: '01 Tiles', expanded: false });
      t.addBinding(params, 'tilesGap', { label: 'hairline', min: 0, max: 0.25, step: 0.01 });
      const st = pane.addFolder({ title: '02 Stripes', expanded: false });
      st.addBinding(params, 'stripeLines', { label: 'lines', min: 1, max: 5, step: 1 });
      st.addBinding(params, 'stripeWeight', { label: 'line', min: 0.12, max: 0.6, step: 0.01 });
      const bu = pane.addFolder({ title: '03 Bulbs', expanded: false });
      bu.addBinding(params, 'bulbSpacing', { label: 'spacing', min: 0.5, max: 1.6, step: 0.05 });
      bu.addBinding(params, 'bulbSize', { label: 'size', min: 0.12, max: 0.5, step: 0.01 });
      bu.addBinding(params, 'bulbWire', { label: 'wire' });
      const bl = pane.addFolder({ title: '04 Blocks', expanded: false });
      bl.addBinding(params, 'blockDepth', { label: 'depth', min: 0, max: 1.5, step: 0.05 });
      const fi = pane.addFolder({ title: '05 Field', expanded: false });
      fi.addBinding(params, 'fieldPitch', { label: 'module', min: 0.3, max: 0.9, step: 0.01 });
      fi.addBinding(params, 'fieldModule', { label: 'kind', options: { 'bar (turns)': 'bar', 'dot (stretches)': 'dot' } });
      const ex = pane.addFolder({ title: 'Export SVG', expanded: false });
      for (const sy of SYSTEMS) {
        ex.addButton({ title: `${sy.n} ${sy.name}` }).on('click', () => {
          const a = Object.assign(document.createElement('a'), {
            href: URL.createObjectURL(new Blob([systemSVG(sy.id, { ...params, construction: false }, { color: '#000000', ground: '#ffffff' })], { type: 'image/svg+xml' })),
            download: `smash-${sy.id}-${params.layout}.svg`,
          });
          a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        });
      }
      pane.addButton({ title: 'Reset' }).on('click', () => { Object.assign(params, SYSTEMS_DEFAULTS); pane.refresh(); draw(); keep(); });
      pane.on('change', () => { draw(); keep(); });
    }).catch((e) => console.error('[identity] the systems panel did not load', e));
  }

  return {
    ready: Promise.resolve(),
    pause() {},
    resume() {},
    destroy() { destroyed = true; pane?.dispose(); list.innerHTML = ''; },
  };
}
