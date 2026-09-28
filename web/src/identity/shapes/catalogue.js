// The catalogue behind the Shapes section: every distinct shape the marks are
// cut into, as true outlines. Four sources, all in the mark's own units:
// the wordmark (mark.js, its DEFAULTS), the modular mark (modular.js, its
// wordmark) and the symbol, the logo, in both its forms: the S M (geometry.js,
// symbolA) and the S alone (the same, cropped at the S).
//
// The slots are built as outlines with paper.js (a rectangle per straight
// run, the bends rounded, the closed ends round), then:
// - negative: the block intersected with the slots, split into its separate
//   pieces (each slot as you see it, clipped by the block's edge), and each
//   bent slot on its own and whole (its full centre line, off the block too);
// - positive: the block minus the slots, split into its pieces (the letters),
//   and cut again so a letter's parts come apart: at the slots' closed ends
//   (each slot carried on to the edge), at the crossbar (along both its
//   edges), and at both. Those give the S's spine, its hooks, the arches,
//   the stems and the bars.
// Shapes that match under the eight turns and mirrorings, within a tiny
// tolerance, are kept once. A plain rectangle is kept only as one of the
// mark's bars in its own role (a stem, the crossbar, the module square), not
// as a stem cut short at the crossbar; slivers are dropped.
//
// Building it takes paper.js and a second or so, so the page reads it from
// catalogue-data.js, written by identity-export.py (shapes()) from the same
// code. When the marks have changed since (the fingerprint differs), it is
// built live instead, in short steps that leave the page free.

import { slots as markSlots, DEFAULTS as MARK, UNITS } from '/js/mark.js?v=letters';
import { geometry, MODULAR_DEFAULTS } from '../modular.js';
import { symbolA, smMeasures, SYM_COLS, SYM_ROWS, SYM_W } from '../directions/original/geometry.js';

/** The sources, in page order; 'symbol-s' is the symbol as the S alone (shown in place of 'symbol' when chosen). */
export const SOURCES = ['wordmark', 'modular', 'symbol'];
export const KEYS = ['wordmark', 'modular', 'symbol', 'symbol-s'];
const KINDS = ['negative', 'positive'];
const BAR = MODULAR_DEFAULTS.bar; // 31.78; the wordmark's outer stems are 32
// Bump when the cutting or the choosing changes, so stored data is not used.
const RULES = 3;

// paper.js, loaded when first asked for (the same file modular.js loads).
const PAPER = 'https://cdn.jsdelivr.net/npm/paper@0.12.18/dist/paper-core.min.js';
let paperLoading = null;
function loadPaper() {
  paperLoading ??= new Promise((resolve, reject) => {
    if (window.paper) return resolve(window.paper);
    let tag = [...document.scripts].find((s) => s.src === PAPER);
    if (!tag) tag = document.head.appendChild(Object.assign(document.createElement('script'), { src: PAPER }));
    tag.addEventListener('load', () => resolve(window.paper));
    tag.addEventListener('error', reject);
  });
  return paperLoading;
}

/** Push an end point outward along its segment by d (as mark.js). */
function extend(points, atEnd, d) {
  const pts = points.map((q) => [...q]);
  const [a, e] = atEnd ? [pts.at(-2), pts.at(-1)] : [pts[1], pts[0]];
  const len = Math.hypot(e[0] - a[0], e[1] - a[1]) || 1;
  e[0] += ((e[0] - a[0]) / len) * d;
  e[1] += ((e[1] - a[1]) / len) * d;
  return pts;
}

// The sources, each as a block (w × h), its slots as centre lines, where its
// crossbar is (between the two slot rows) and which cuts carry its closed
// ends on to the edge. A slot end is 'round' (a disc), 'flat' (carried on
// half a slot: square ends and the stops on a crossbar) or 'none' (runs off).

function wordmarkSource() {
  const p = MARK;
  const s = p.stroke;
  const finish = (kind) => (kind === 'bar' ? 'flat' : kind === 'end' ? ({ round: 'round', square: 'flat' })[p.caps] ?? 'none' : 'none');
  return {
    w: UNITS.w, h: UNITS.h,
    slots: markSlots(p).map(({ pts, start, end }) => ({ pts, w: s, bend: p.corner, ends: [finish(start), finish(end)], closed: [start === 'end', end === 'end'] })),
    crossbar: [p.crossbar - p.gap / 2 + s / 2, p.crossbar + p.gap / 2 - s / 2],
  };
}

/** The modular mark's wordmark (its S M crop is the symbol, below). */
function modularSource() {
  const p = MODULAR_DEFAULTS;
  const g = geometry(p, 4);
  const finish = (kind) => (kind === 'end' ? (p.ends === 'square' ? 'flat' : 'round') : 'none');
  return {
    w: g.w, h: g.h,
    slots: g.slots.map(({ pts, start, end }) => ({ pts, w: g.s, bend: p.bend, ends: [finish(start), finish(end)], closed: [start === 'end', end === 'end'] })),
    crossbar: [g.y[2], g.y[3]],
  };
}

/**
 * The logo: symbolA's own outline is the positive; its M's slots are the
 * closed ends. As the S alone ('S') it is cropped at the S's right edge,
 * where the modular mark crops it, with the slot after it left off.
 */
function symbolSource(form = 'S M') {
  const sm = smMeasures();
  const e = SYM_COLS.reduce((a, n) => [...a, a.at(-1) + n], [0]);
  const r = SYM_ROWS.reduce((a, n) => [...a, a.at(-1) + n], [0]);
  const tip = sm.stop + SYM_COLS[5] / 2; // the centre of a closed end
  const alone = form === 'S';
  return {
    w: alone ? e[3] : SYM_W, h: r[5],
    positive: symbolA(),
    ends: alone ? [] : [[e[5], -1, e[6], tip], [e[7], -1, e[8], tip]],
    crossbar: [r[2], r[3]],
  };
}

const SOURCE_OF = {
  wordmark: wordmarkSource,
  modular: modularSource,
  symbol: () => symbolSource('S M'),
  'symbol-s': () => symbolSource('S'),
};

/** A short fingerprint of the sources and the rules: stored data is used only while it matches. */
export function fingerprint() {
  const text = JSON.stringify([RULES, KEYS.map((k) => SOURCE_OF[k]())]);
  let h = 0x811c9dc5; // FNV-1a, 32 bits
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(16).padStart(8, '0');
}

/**
 * A slot as an outline: the shape a stroke of its filleted centre line
 * covers (the same as modular.js outlineSVG), drawn as one path rather than
 * put together with booleans, whose tangent corners paper.js can lose. Each
 * side runs half a slot off the centre line; at a bend (a quarter turn, as
 * all the marks' are) the outside is an arc of r + half about the fillet's
 * centre, the inside an arc of r − half, or a sharp corner when that is none.
 */
function slotOutline(S, { pts, w, bend, ends }) {
  const h = w / 2;
  let q = pts;
  if (ends[0] === 'flat') q = extend(q, false, h);
  if (ends[1] === 'flat') q = extend(q, true, h);
  const P = ([x, y]) => new S.Point(x, y);
  const at = (a, b, k) => [a[0] + b[0] * k, a[1] + b[1] * k];
  const unit = (a, b) => { const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / l, (b[1] - a[1]) / l, l]; };
  const path = new S.Path();
  // One side of the polyline, the right-hand one as it is walked.
  const side = (line, first) => {
    const runs = line.slice(1).map((b, i) => unit(line[i], b));
    const normal = (u) => [-u[1], u[0]];
    const start = at(line[0], normal(runs[0]), h);
    if (first) path.moveTo(P(start));
    else if (path.lastSegment.point.getDistance(P(start)) > 1e-6) path.lineTo(P(start));
    for (let i = 1; i < line.length - 1; i++) {
      const u = runs[i - 1];
      const v = runs[i];
      const b = line[i];
      const nu = normal(u);
      const nv = normal(v);
      const corner = at(at(b, nu, h), nv, h); // where the two offset lines meet
      const r = Math.min(bend, u[2] / 2, v[2] / 2);
      if (r <= 0.01) { path.lineTo(P(corner)); continue; }
      const o = at(at(b, u, -r), v, r); // the fillet's centre
      const inside = nu[0] * v[0] + nu[1] * v[1] > 0; // this side faces it
      const rad = inside ? r - h : r + h;
      if (rad <= 0.01) { path.lineTo(P(corner)); continue; }
      const a1 = at(at(b, u, -r), nu, h);
      const a2 = at(at(b, v, r), nv, h);
      const m = unit(o, at(at(a1, a2, 1), o, -1));
      path.lineTo(P(a1));
      path.arcTo(P(at(o, m, rad)), P(a2));
    }
    const last = runs.at(-1);
    path.lineTo(P(at(line.at(-1), normal(last), h)));
    return last;
  };
  const cap = (end, u, round) => { if (round) path.arcTo(P(at(end, u, h)), P(at(end, [u[1], -u[0]], h))); };
  const fwd = side(q, true);
  cap(q.at(-1), fwd, ends[1] === 'round');
  const back = side([...q].reverse(), false);
  cap(q[0], back, ends[0] === 'round');
  path.closePath();
  return path;
}

/** A closed slot end carried straight on, a slot wide, past the block's edge. */
function endCuts(src) {
  if (src.ends) return src.ends;
  const far = 2 * Math.max(src.w, src.h);
  const out = [];
  for (const { pts, w, closed } of src.slots) {
    closed.forEach((isClosed, atEnd) => {
      if (!isClosed) return;
      const [x, y] = atEnd ? pts.at(-1) : pts[0];
      const [ax, ay] = atEnd ? pts.at(-2) : pts[1];
      const len = Math.hypot(x - ax, y - ay) || 1;
      const ux = (x - ax) / len, uy = (y - ay) / len;
      const tx = x + ux * far, ty = y + uy * far;
      out.push(Math.abs(ux) > Math.abs(uy)
        ? [Math.min(x, tx), y - w / 2, Math.max(x, tx), y + w / 2]
        : [x - w / 2, Math.min(y, ty), x + w / 2, Math.max(y, ty)]);
    });
  }
  return out;
}

/**
 * A paper item split into its separate pieces: each outer ring with the holes
 * directly inside it. Returns plain data, placed with its box at 0, 0:
 * { rings (each a list of segments [x, y, inX, inY, outX, outY]), w, h, area, length }.
 */
function split(S, item) {
  if (!item || item.isEmpty?.()) return [];
  const paths = (item.className === 'CompoundPath' ? item.children : [item])
    .map((p) => p.clone({ insert: false }))
    .filter((p) => Math.abs(p.area) > 0.5);
  const info = paths.map((p) => ({ p, a: Math.abs(p.area), pt: (p.interiorPoint ?? p.bounds.center) }));
  for (const i of info) i.within = info.filter((o) => o !== i && o.a > i.a && o.p.contains(i.pt));
  const out = [];
  for (const o of info.filter((i) => i.within.length % 2 === 0)) {
    const holes = info.filter((i) => i.within.length === o.within.length + 1 && i.within.includes(o));
    const b = o.p.bounds;
    const ring = (p) => p.segments.map((s) => [s.point.x - b.x, s.point.y - b.y, s.handleIn.x, s.handleIn.y, s.handleOut.x, s.handleOut.y]);
    const area = o.a - holes.reduce((t, i) => t + i.a, 0);
    if (area < 8 || Math.min(b.width, b.height) < 1.5) continue; // a sliver from touching edges
    out.push({ rings: [ring(o.p), ...holes.map((i) => ring(i.p))], w: b.width, h: b.height, area, length: o.p.length + holes.reduce((t, i) => t + i.p.length, 0), x: b.x, y: b.y });
  }
  // Reading order: left to right, then top to bottom.
  return out.sort((a, b) => a.x - b.x || a.y - b.y);
}

const f = (n) => String(+n.toFixed(2));

/** Absolute path data for rings: M, L, C and Z only. */
function pathData(rings) {
  const P = (x, y) => `${f(x)} ${f(y)}`;
  const flat = (x, y) => Math.abs(x) < 1e-6 && Math.abs(y) < 1e-6;
  let d = '';
  for (const r of rings) {
    d += `M${P(r[0][0], r[0][1])}`;
    for (let i = 1; i <= r.length; i++) {
      const a = r[i - 1];
      const b = r[i % r.length];
      if (flat(a[4], a[5]) && flat(b[2], b[3])) { if (i < r.length) d += `L${P(b[0], b[1])}`; } else d += `C${P(a[0] + a[4], a[1] + a[5])} ${P(b[0] + b[2], b[1] + b[3])} ${P(b[0], b[1])}`;
    }
    d += 'Z';
  }
  return d;
}

/** Path data (absolute M, L, C, Z, as pathData writes it) scaled by k and moved by dx, dy. */
export function moveD(d, k = 1, dx = 0, dy = 0) {
  return d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x, y) => `${f(x * k + dx)} ${f(y * k + dy)}`);
}

/** A plain rectangle: one ring, filling its box. */
const isRect = (s) => s.rings.length === 1 && Math.abs(s.area - s.w * s.h) < 0.002 * s.w * s.h;
/** A bar wide: 31.78, or the wordmark's 32 at its edges. */
const isBar = (s) => Math.abs(Math.min(s.w, s.h) - BAR) < 0.6;
/**
 * Whether a piece is shown. A plain rectangle only as one of the mark's bars
 * in its own role, once: the module square (a piece of the block as the slots
 * leave it), a stem (the block's full height) and the crossbar itself. Not a
 * stem cut short by the extra cuts, and not the square the M's stems make at
 * the crossbar (the M has none).
 */
function wanted(s) {
  if (!isRect(s)) return true;
  if (!isBar(s)) return false;
  const long = Math.max(s.w, s.h);
  if (s.from === 'block') return true;
  if (s.from === 'bar') return s.band === 1 && long > 1.5 * BAR;
  return Math.abs(long - s.tall) < 0.6;
}

// Same up to a turn or a mirroring: close in size, area and outline length,
// then confirmed on a raster under the turns and mirrorings that keep its
// proportions, where only a difference deeper than a pixel (about half a
// unit) counts.
const near = (a, b, rel, abs = 0) => Math.abs(a - b) <= rel * Math.max(a, b) + abs;
const TURNS = [
  [false, (w, h) => [1, 0, 0, 1, 0, 0]],
  [true, (w, h) => [0, 1, -1, 0, h, 0]],
  [false, (w, h) => [-1, 0, 0, -1, w, h]],
  [true, (w, h) => [0, -1, 1, 0, 0, w]],
  [false, (w, h) => [-1, 0, 0, 1, w, 0]],
  [true, (w, h) => [0, -1, -1, 0, h, w]],
  [false, (w, h) => [1, 0, 0, -1, 0, h]],
  [true, (w, h) => [0, 1, 1, 0, 0, 0]],
];
let canvas = null;
function raster(s, [swap, m], k, W, H) {
  canvas ??= document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const [w, h] = swap ? [s.h, s.w] : [s.w, s.h];
  ctx.translate((W - w * k) / 2, (H - h * k) / 2);
  ctx.scale(k, k);
  ctx.transform(...m(s.w, s.h));
  ctx.fill((s.path ??= new Path2D(s.d)), 'evenodd');
  const px = ctx.getImageData(0, 0, W, H).data;
  const out = new Uint8Array(W * H);
  for (let i = 0; i < out.length; i++) out[i] = px[i * 4 + 3] > 127 ? 1 : 0;
  return out;
}
function same(a, b) {
  const [a1, a2] = [a.w, a.h].sort((x, y) => x - y);
  const [b1, b2] = [b.w, b.h].sort((x, y) => x - y);
  if (!near(a1, b1, 0.004, 0.6) || !near(a2, b2, 0.004, 0.6) || !near(a.area, b.area, 0.015) || !near(a.length, b.length, 0.015, 2)) return false;
  // The raster is a's own box (a turned b must fit it), so a tall thin shape costs little.
  const k = Math.min(3, 900 / Math.max(a.w, a.h));
  const W = Math.ceil(a.w * k) + 6;
  const H = Math.ceil(a.h * k) + 6;
  if (a.ref?.k !== k || a.ref.W !== W || a.ref.H !== H) a.ref = { k, W, H, data: raster(a, TURNS[0], k, W, H) };
  const ref = a.ref.data;
  return TURNS.some((t) => {
    const [bw, bh] = t[0] ? [b.h, b.w] : [b.w, b.h];
    if (!near(bw, a.w, 0.004, 0.6) || !near(bh, a.h, 0.004, 0.6)) return false;
    const img = raster(b, t, k, W, H);
    for (let i = 0; i < img.length; i++) img[i] ^= ref[i];
    // Only a difference deeper than a pixel counts: erode it by one.
    let deep = 0;
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const i = y * W + x;
        if (img[i] && img[i - 1] && img[i + 1] && img[i - W] && img[i + W] && img[i - W - 1] && img[i - W + 1] && img[i + W - 1] && img[i + W + 1] && ++deep > 4) return false;
      }
    }
    return true;
  });
}

const rest = () => new Promise((r) => setTimeout(r, 0)); // a task boundary, so the page stays free

/** The pieces of one source: { negative, positive }, each in order, repeats kept for now. In steps, with a rest between. */
async function cutUp(S, src) {
  const step = async () => { await rest(); S.activate(); };
  const P = (x, y) => new S.Point(x, y);
  const box = ([x0, y0, x1, y1]) => new S.Path.Rectangle(P(x0, y0), P(x1, y1));
  const union = (items) => items.reduce((a, b) => (a ? a.unite(b) : b), null);
  const tag = (list, from, band) => list.map((s) => Object.assign(s, { from, band, tall: src.h }));
  const block = box([0, 0, src.w, src.h]);
  let positive;
  let negative;
  let whole = [];
  if (src.slots) {
    const outlines = src.slots.map((sl) => slotOutline(S, sl));
    let cut = null;
    for (const [i, o] of outlines.entries()) {
      cut = cut ? cut.unite(o) : o;
      if (i % 4 === 3) await step();
    }
    await step();
    positive = block.subtract(cut);
    await step();
    negative = block.intersect(cut);
    // A bent slot on its own, whole: the S's hooks and bends, off the block too.
    whole = src.slots.map((sl, i) => (sl.pts.length > 2 ? split(S, outlines[i]) : [])).flat();
  } else {
    const drawn = new S.CompoundPath(src.positive);
    drawn.fillRule = 'evenodd';
    positive = block.intersect(drawn);
    negative = block.subtract(positive);
  }
  const out = { negative: [...tag(split(S, negative), 'block'), ...tag(whole, 'whole')] };
  await step();
  out.positive = tag(split(S, positive), 'block');
  await step();
  const ends = endCuts(src);
  const opened = ends.length ? positive.subtract(union(ends.map(box))) : positive;
  out.positive.push(...tag(split(S, opened), 'opened'));
  const far = 4 * Math.max(src.w, src.h);
  const [c0, c1] = src.crossbar;
  const bands = [[-far, -far, far, c0], [-far, c0, far, c1], [-far, c1, far, far]].map(box);
  for (const item of [positive, opened]) {
    for (const [band, b] of bands.entries()) {
      await step();
      out.positive.push(...tag(split(S, item.intersect(b)), 'bar', band));
    }
  }
  return out;
}

/** Kept once each, in order; the rectangles (bars) last, longest first. Yields now and then. */
async function distinct(list) {
  const out = [];
  let t = performance.now();
  for (const s of list) {
    s.d ??= pathData(s.rings);
    if (!wanted(s)) continue;
    if (!out.some((o) => same(o, s))) out.push(s);
    if (performance.now() - t > 30) { await rest(); t = performance.now(); }
  }
  const rects = out.filter(isRect).sort((a, b) => Math.max(b.w, b.h) - Math.max(a.w, a.h) || a.area - b.area);
  return [...out.filter((s) => !isRect(s)), ...rects];
}

/** Build the catalogue live, with paper.js, in short steps. */
async function build() {
  const paper = await loadPaper();
  const S = new paper.PaperScope();
  S.setup(new paper.Size(10, 10));
  try {
    const raw = {};
    for (const key of KEYS) {
      S.activate();
      raw[key] = await cutUp(S, SOURCE_OF[key]());
      S.project.clear();
      await rest();
    }
    const out = {};
    const seen = [];
    for (const key of KEYS) {
      out[key] = {};
      // The S alone is weighed against the wordmark and the modular mark, as the S M is.
      const before = key === 'symbol-s' ? seen.filter((o) => o.source !== 'symbol') : seen;
      for (const kind of KINDS) {
        const list = (await distinct(raw[key][kind])).map((s, i) => ({ ...s, w: +s.w.toFixed(2), h: +s.h.toFixed(2), source: key, kind, n: i + 1 }));
        for (const s of list) s.repeat = before.some((o) => o.kind === kind && same(o, s));
        seen.push(...list);
        out[key][kind] = list;
        await rest();
      }
    }
    return out;
  } finally {
    S.project.clear();
    S.remove();
  }
}

/** Shapes from stored data (catalogue-data.js), as build() gives them. */
function fromData(data) {
  return Object.fromEntries(KEYS.map((key) => [key, Object.fromEntries(KINDS.map((kind) => [kind,
    (data[key]?.[kind] ?? []).map((s, i) => ({ ...s, source: key, kind, n: i + 1 }))]))]));
}

let stored = null;
let live = null;

/**
 * The catalogue: for each of KEYS, { negative, positive }, each a list of
 * shapes { d, w, h, source, kind, n, repeat }. `n` is its place in its
 * source's list, the same in every view and in the exported file names.
 * `repeat` is true when an earlier source already has the same shape (shown
 * once when every source is shown). Read from catalogue-data.js while it
 * matches the marks; with `live` (or when it does not) built with paper.js.
 */
export function catalogue({ live: fresh = false } = {}) {
  if (fresh) {
    live ??= build();
    live.catch(() => { live = null; });
    return live;
  }
  stored ??= import('./catalogue-data.js')
    .then((m) => (m.KEY === fingerprint() ? fromData(m.SHAPES) : null), () => null)
    .then((c) => c ?? catalogue({ live: true }));
  stored.catch(() => { stored = null; });
  return stored;
}

/** The catalogue as the source of catalogue-data.js. */
export function dataModule(cat) {
  const shape = (s) => `      ${JSON.stringify({ w: +f(s.w), h: +f(s.h), repeat: !!s.repeat, d: s.d })},`;
  const body = KEYS.map((key) => `  '${key}': {\n${KINDS.map((kind) => `    ${kind}: [\n${cat[key][kind].map(shape).join('\n')}\n    ],`).join('\n')}\n  },`).join('\n');
  return `// The Shapes catalogue for the marks as they are, written by
// web/scripts/identity-export.py (shapes()) from shapes/catalogue.js, so the
// page need not build it. KEY is the marks' fingerprint: when they change, the
// page builds the catalogue live until the export is run again. Not for editing.

export const KEY = '${fingerprint()}';

export const SHAPES = {
${body}
};
`;
}

/** One shape as an SVG for Illustrator: one filled path, its box as width and height. */
export function shapeSVG(s, fill = '#000000') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${f(s.w)}" height="${f(s.h)}" viewBox="0 0 ${f(s.w)} ${f(s.h)}"><path fill="${fill}" fill-rule="evenodd" d="${s.d}"/></svg>`;
}

/**
 * Every shape in `blocks` (lists, each starting a new row) on one sheet: one
 * filled path per shape. 'true' keeps every shape at the mark's units, set
 * in rows on a common baseline, as the page shows them; 'fitted' scales each
 * to a square cell of a grid.
 */
export function sheetSVG(blocks, scale = 'true', fill = '#000000') {
  const lists = blocks.filter((b) => b.length);
  const all = lists.flat();
  const paths = [];
  let W = 0;
  let top = 0;
  if (scale === 'fitted') {
    const cell = 120;
    const cols = Math.min(6, Math.max(...lists.map((b) => b.length)));
    for (const block of lists) {
      block.forEach((s, i) => {
        const k = (cell * 0.8) / Math.max(s.w, s.h);
        const x = (i % cols) * cell + (cell - s.w * k) / 2;
        const y = top + Math.floor(i / cols) * cell + (cell - s.h * k) / 2;
        paths.push(`<path fill="${fill}" fill-rule="evenodd" d="${moveD(s.d, k, x, y)}"/>`);
      });
      top += Math.ceil(block.length / cols) * cell + cell / 2;
    }
    W = cols * cell;
    top -= cell / 2;
  } else {
    const gap = 2 * BAR;
    const most = Math.max(...all.map((s) => Math.max(s.w, s.h)));
    const width = Math.max(3 * most, ...all.map((s) => s.w));
    for (const block of lists) {
      let row = [];
      const setRow = () => {
        const h = Math.max(...row.map((s) => s.h));
        let x = 0;
        for (const s of row) { paths.push(`<path fill="${fill}" fill-rule="evenodd" d="${moveD(s.d, 1, x, top + h - s.h)}"/>`); x += s.w + gap; }
        W = Math.max(W, x - gap);
        top += h + gap;
        row = [];
      };
      for (const s of block) {
        const used = row.reduce((t, o) => t + o.w + gap, 0);
        if (row.length && used + s.w > width) setRow();
        row.push(s);
      }
      if (row.length) setRow();
      top += gap;
    }
    top -= 2 * gap;
  }
  const H = Math.max(1, top);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${f(W)}" height="${f(H)}" viewBox="0 0 ${f(W)} ${f(H)}">${paths.join('')}</svg>`;
}
