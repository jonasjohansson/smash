// The grid, previewed on the marks themselves (Jonas, 2026-09-30: every
// version of the mark on one grid, and "i would like to be able to preview
// grids"). The marks are drawn on a grid of 4: a bar 32, a slot 20 (8 : 5), a
// pitch 52, the block 552 × 472, the S M 240 × 136. withGrid() adds a still's
// grid to its own SVG, in its own units, hidden until the page shows it (the
// Grid button, or G): the slots' columns (a slot after every bar, on across
// the artboard), the bands, the mark's box, where a lockup's type starts (a
// pitch after the mark), and every circle its curves are drawn from, with its
// centre. The page adds it; the exports never see it. A still in pixels
// (geometry.js: pixelate) gets the circles of its round self, the curves its
// pixels are sampled from.

import { arcCentre } from './directions/original/geometry.js';

const PINK = '#ff29b8';
/** The block's three bands (the original mark, its lockup), top to bottom. */
export const BANDS = [0, 32, 220, 252, 440, 472];
/** The S M's five: bar, slot, bar, slot, bar. */
export const BANDS5 = [0, 32, 52, 84, 104, 136];

// Each kind of still: its mark's box, its bands, and where its type starts.
// The S on its side has its bands upright and its slots' columns across.
const KINDS = {
  wordmark: { w: 552, h: 472, bands: BANDS },
  symbol: { w: 240, h: 136, bands: BANDS5 },
  lockup: { w: 552, h: 472, bands: BANDS, type: 552 + 52 },
  lockupSM: { w: 240, h: 136, bands: BANDS5, type: 240 + 52 },
  s: { w: 84, h: 136, bands: BANDS5 },
  sTurned: { w: 136, h: 84, bands: BANDS5, turn: true },
  sSquare: { w: 136, h: 136, bands: BANDS5 },
};

const f = (n) => +n.toFixed(2);

/** Every circle a path's arcs are drawn from (M, L, A, Z path data, absolute), each once. */
export function circles(d) {
  const out = new Map();
  let cur = [0, 0], start = [0, 0];
  for (const [, cmd, args] of d.matchAll(/([MLAZC])([^MLAZC]*)/g)) {
    const n = args.trim() ? args.trim().split(/[\s,]+/).map(Number) : [];
    if (cmd === 'M') { cur = [n[0], n[1]]; start = cur; }
    else if (cmd === 'L') cur = [n[0], n[1]];
    else if (cmd === 'C') cur = [n[4], n[5]];
    else if (cmd === 'Z') cur = start;
    else if (cmd === 'A') {
      const to = [n[5], n[6]];
      const c = arcCentre(cur, to, n[0], n[3], n[4]);
      if (c) out.set(c.map((v) => v.toFixed(1)).join(','), c);
      cur = to;
    }
  }
  return [...out.values()];
}

/**
 * The still's SVG with its grid added, hidden (class "mk-grid") until the page
 * shows it; the circles are read from round (the still itself, unless it is in
 * pixels). own is a chapter's own grid for the still, when its measures move
 * (slant.js: gridOf): as KINDS, with its bar and slot.
 */
export function withGrid(svg, kind, round = svg, own = null) {
  const K = own ?? KINDS[kind];
  const vb = svg.match(/viewBox="\s*([-\d.]+)[\s,]+([-\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*"/);
  if (!K || !vb) return svg;
  const [x0, y0, w, h] = vb.slice(1).map(Number);
  // A slot (20) after every bar (32), from the mark's first, on across the artboard (down it, on its side).
  const bar = K.bar ?? 32, slot = K.slot ?? 20, pitch = bar + slot;
  const [from, span] = K.turn ? [y0, h] : [x0, w];
  const first = Math.ceil((from - bar) / pitch), last = Math.ceil((from + span - bar) / pitch) - 1; // those that start on the artboard
  let cols = '';
  // A chapter whose columns are uneven (slant.js: its gaps between letters apart from its slots) gives them: the mark's own.
  if (K.columns) cols = K.columns.map(([x, cw]) => `<rect x="${f(x)}" y="${f(y0)}" width="${f(cw)}" height="${f(h)}"/>`).join('');
  else for (let i = first; i <= last; i++) {
    cols += K.turn ? `<rect x="${f(x0)}" y="${bar + pitch * i}" width="${f(w)}" height="${slot}"/>` : `<rect x="${bar + pitch * i}" y="${f(y0)}" width="${slot}" height="${f(h)}"/>`;
  }
  const bands = K.bands.map((v) => (K.turn ? `M${v} ${f(y0)}V${f(y0 + h)}` : `M${f(x0)} ${v}H${f(x0 + w)}`)).join('');
  const d = round.match(/<path[^>]*\sd="([^"]+)"/)?.[1] ?? '';
  const rings = circles(d).map(([cx, cy, r]) => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" stroke-dasharray="3 2"/><path d="M${f(cx - 3)} ${f(cy)}h6M${f(cx)} ${f(cy - 3)}v6"/>`).join('');
  const type = K.type ? `<path d="M${K.type} ${f(y0)}V${f(y0 + h)}"/>` : '';
  const g = `<g class="mk-grid"><g fill="${PINK}" fill-opacity="0.16" stroke="none">${cols}</g>`
    + `<g fill="none" stroke="${PINK}" stroke-width="1"><path d="${bands}"/><rect x="0" y="0" width="${K.w}" height="${K.h}"/>${type}${rings}</g></g>`;
  return svg.replace(/<\/svg>\s*$/, `${g}</svg>`);
}
