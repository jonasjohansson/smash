// True outlines, for Illustrator: every kit piece, symbol and pattern tile as
// one filled path (fill-rule evenodd), its box as width and height, no masks,
// strokes, CSS, text or transforms. paper.js (the same file modular.js
// loads) is fetched only when something is exported, so the page never
// needs it.
//
// Each line is outlined as one path, the shape a stroke of it covers (as
// modular.js outlineSVG cuts a slot): each side half its width off the
// centre line (a slot's, or a block's), a bend's outside an arc of the
// bend's radius plus that about the fillet's centre, its inside sharp, the
// ends round or square. A ring is outlined as two halves that overlap. The lines are then
// united (blocks), or cut from the block (cut).

import { piece, pieceLines, span, BEND, SLOT, PITCH } from './kit.js';
import { symbolLines, patternLines, repeatBox, copies } from './draw.js';

const f = (n) => +n.toFixed(2);

const PAPER = 'https://cdn.jsdelivr.net/npm/paper@0.12.18/dist/paper-core.min.js';
let loading = null;
function loadPaper() {
  loading ??= new Promise((resolve, reject) => {
    if (window.paper) return resolve(window.paper);
    let tag = [...document.scripts].find((s) => s.src === PAPER);
    if (!tag) tag = document.head.appendChild(Object.assign(document.createElement('script'), { src: PAPER }));
    tag.addEventListener('load', () => resolve(window.paper));
    tag.addEventListener('error', (e) => { loading = null; reject(e); });
  });
  return loading;
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

/** A ring's centre line as two open halves, each carried on half its width past the other: one outline each, overlapping. */
function halves(pts, HALF) {
  const k = Math.max(1, Math.floor((pts.length - 1) / 2));
  const a = pts[k], b = pts[k + 1];
  const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  return [extend(extend([...pts.slice(0, k + 1), mid], false, HALF), true, HALF), extend(extend([mid, ...pts.slice(k + 1)], false, HALF), true, HALF)];
}

/**
 * One open line as an outline: q its points in mark units (ends already
 * moved as they are finished), HALF its half width, round at each end that is.
 */
function lineOutline(S, q, round, HALF) {
  const P = ([x, y]) => new S.Point(x, y);
  const at = (a, b, k) => [a[0] + b[0] * k, a[1] + b[1] * k];
  const unit = (a, b) => { const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / l, (b[1] - a[1]) / l, l]; };
  const path = new S.Path();
  // One side of the polyline, the right-hand one as it is walked.
  const side = (line, first) => {
    const runs = line.slice(1).map((b, i) => unit(line[i], b));
    const normal = (u) => [-u[1], u[0]];
    const start = at(line[0], normal(runs[0]), HALF);
    if (first) path.moveTo(P(start));
    else if (path.lastSegment.point.getDistance(P(start)) > 1e-6) path.lineTo(P(start));
    for (let i = 1; i < line.length - 1; i++) {
      const u = runs[i - 1];
      const v = runs[i];
      const b = line[i];
      const nu = normal(u);
      const nv = normal(v);
      const corner = at(at(b, nu, HALF), nv, HALF); // where the two offset lines meet
      const r = Math.min(BEND, u[2] / 2, v[2] / 2);
      if (r <= 0.01) { path.lineTo(P(corner)); continue; }
      const o = at(at(b, u, -r), v, r); // the fillet's centre
      const inside = nu[0] * v[0] + nu[1] * v[1] > 0; // this side faces it
      const rad = inside ? r - HALF : r + HALF;
      if (rad <= 0.01) { path.lineTo(P(corner)); continue; }
      const a1 = at(at(b, u, -r), nu, HALF);
      const a2 = at(at(b, v, r), nv, HALF);
      const m = unit(o, at(at(a1, a2, 1), o, -1));
      path.lineTo(P(a1));
      path.arcTo(P(at(o, m, rad)), P(a2));
    }
    const last = runs.at(-1);
    path.lineTo(P(at(line.at(-1), normal(last), HALF)));
    return last;
  };
  const cap = (end, u, isRound) => { if (isRound) path.arcTo(P(at(end, u, HALF)), P(at(end, [u[1], -u[0]], HALF))); };
  const fwd = side(q, true);
  cap(q.at(-1), fwd, round[1]);
  const back = side([...q].reverse(), false);
  cap(q[0], back, round[0]);
  path.closePath();
  return path;
}

/** Unit lines (kit.unitLine) as one united paper item. */
function inkOf(S, ul) {
  let ink = null;
  const near = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-6;
  for (const l of ul) {
    const half = (l.w ?? SLOT) / 2;
    const parts = l.closed ? halves(l.pts, half).map((q) => [q, [false, false]]) : [[l.pts, [l.dots.some((d) => near(d, l.pts[0])), l.dots.some((d) => near(d, l.pts.at(-1)))]]];
    for (const [q, round] of parts) {
      const o = lineOutline(S, q, round, half);
      ink = ink ? ink.unite(o, { insert: false }) : o;
    }
  }
  return ink;
}

/** A paper item as absolute path data (M, L, C, Z), moved by -x, -y. */
function pathData(item, x = 0, y = 0) {
  const paths = item.className === 'CompoundPath' ? item.children : [item];
  const P = (px, py) => `${f(px - x)} ${f(py - y)}`;
  const flat = (p) => Math.abs(p.x) < 1e-6 && Math.abs(p.y) < 1e-6;
  let d = '';
  for (const p of paths) {
    const segs = p.segments;
    if (segs.length < 2 || Math.abs(p.area) < 0.01) continue;
    d += `M${P(segs[0].point.x, segs[0].point.y)}`;
    for (let i = 1; i <= segs.length; i++) {
      const a = segs[i - 1];
      const b = segs[i % segs.length];
      if (i === segs.length && flat(a.handleOut) && flat(b.handleIn)) break; // Z closes it
      if (flat(a.handleOut) && flat(b.handleIn)) d += `L${P(b.point.x, b.point.y)}`;
      else d += `C${P(a.point.x + a.handleOut.x, a.point.y + a.handleOut.y)} ${P(b.point.x + b.handleIn.x, b.point.y + b.handleIn.y)} ${P(b.point.x, b.point.y)}`;
    }
    d += 'Z';
  }
  return d;
}

/** One path in a box as the SVG file. */
const fileSVG = (d, w, h, fill) => `<svg xmlns="http://www.w3.org/2000/svg" width="${f(w)}" height="${f(h)}" viewBox="0 0 ${f(w)} ${f(h)}"><path fill="${fill}" fill-rule="evenodd" d="${d}"/></svg>`;

/** Run fn with a fresh paper scope, cleared after. */
async function withPaper(fn) {
  const paper = await loadPaper();
  const S = new paper.PaperScope();
  S.setup(new paper.Size(10, 10));
  try { return fn(S); } finally { S.project.clear(); S.remove(); }
}

/** A symbol's outline: { d, w, h } in its own box (blocks: its ink's box; cut: its block). */
function symbolShape(S, sym) {
  const ul = symbolLines(sym);
  if (sym.build === 'cut') {
    const block = new S.Path.Rectangle(new S.Point(0, 0), new S.Point(span(sym.n), span(sym.m)));
    const out = ul.length ? block.subtract(inkOf(S, ul), { insert: false }) : block;
    return { d: pathData(out), w: span(sym.n), h: span(sym.m) };
  }
  const ink = inkOf(S, ul);
  const b = ink.bounds;
  return { d: pathData(ink, b.x, b.y), w: b.width, h: b.height };
}

/** A kit piece as an SVG file (its ink's box). */
export function pieceSVG(kind, fill = '#000000') {
  return withPaper((S) => {
    const ink = inkOf(S, pieceLines(piece(kind)));
    const b = ink.bounds;
    return fileSVG(pathData(ink, b.x, b.y), b.width, b.height, fill);
  });
}

/** A symbol as an SVG file. */
export function symbolSVGFile(sym, fill = '#000000') {
  return withPaper((S) => { const { d, w, h } = symbolShape(S, sym); return fileSVG(d, w, h, fill); });
}

/**
 * Every symbol on one sheet: a grid of square cells, `cols` across, each
 * symbol centred in its cell at the mark's units (one scale for all), one
 * path each.
 */
export function sheetSVG(syms, cols = 6, fill = '#000000') {
  return withPaper((S) => {
    const shapes = syms.map((s) => symbolShape(S, s));
    const cell = Math.max(...syms.map((s) => Math.max(span(s.n), span(s.m)))) + 2 * PITCH;
    const rows = Math.ceil(shapes.length / cols);
    const paths = shapes.map(({ d, w, h }, i) => {
      const x = (i % cols) * cell + (cell - w) / 2;
      const y = Math.floor(i / cols) * cell + (cell - h) / 2;
      return `<path fill="${fill}" fill-rule="evenodd" d="${moveD(d, x, y)}"/>`;
    }).join('');
    const W = Math.min(cols, shapes.length) * cell, H = rows * cell;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${f(W)}" height="${f(H)}" viewBox="0 0 ${f(W)} ${f(H)}">${paths}</svg>`;
  });
}

/** Path data (absolute, as pathData writes it) moved by dx, dy. */
function moveD(d, dx, dy) {
  return d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x, y) => `${f(+x + dx)} ${f(+y + dy)}`);
}

/**
 * A pattern's tile as an SVG file: one repeat, cut at the middle of a bar (or
 * of the gap between blocks), so tiles laid side by side join without a seam.
 */
export function patternSVGFile(pat, fill = '#000000') {
  return withPaper((S) => {
    const [x0, y0, w, h] = repeatBox(pat);
    const R = (a, b, c, d) => new S.Path.Rectangle(new S.Point(a, b), new S.Point(c, d));
    const tile = R(x0, y0, x0 + w, y0 + h);
    const cut = pat.build === 'cut';
    let out;
    if (pat.kind === 'turns') {
      // Each copy: its block less its slots (cut), or its figure; those that reach the tile.
      const P = pat.n * PITCH;
      let all = null;
      for (const [a, b, sym] of copies(pat, pat.cells, pat.cells)) {
        const ox = a * P, oy = b * P;
        if (ox > x0 + w || oy > y0 + h || ox + P < x0 || oy + P < y0) continue;
        const ul = symbolLines(sym, null, { reach: 1 }).map((l) => ({ ...l, pts: l.pts.map(([x, y]) => [x + ox, y + oy]), dots: l.dots.map(([x, y]) => [x + ox, y + oy]) }));
        let piece = ul.length ? inkOf(S, ul) : null;
        if (cut) {
          const block = R(ox, oy, ox + span(sym.n), oy + span(sym.m));
          piece = piece ? block.subtract(piece, { insert: false }) : block;
        }
        if (piece) all = all ? all.unite(piece, { insert: false }) : piece;
      }
      out = all ? tile.intersect(all, { insert: false }) : tile;
      if (!all) return fileSVG('', w, h, fill);
    } else {
      const ink = inkOf(S, patternLines(pat, pat.wrap[0] ? 2 : 1, pat.wrap[1] ? 2 : 1));
      out = cut ? tile.subtract(ink, { insert: false }) : tile.intersect(ink, { insert: false });
    }
    return fileSVG(pathData(out, x0, y0), w, h, fill);
  });
}

