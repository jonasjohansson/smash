// The stencil card's front, drawn by the site's own mark (web/src/js/mark.js), as the landing draws it: the block
// stretched to the card's width, its letters cut through (here, out of the card), a row of Druk along the top and
// one along the bottom, or (`bottom`) only the bottom one, the block running up to the margin.
//
//   node web/scripts/identity-stencil.mjs <out-dir> [margin-mm 3] [row-mm 2.6] [gap-mm 1.1] [both|bottom|side]
//
// Writes, in card millimetres x 10 (850 x 550):
//   holes.svg   the letters, black: what the laser cuts (the A's closed counter held by two bridges)
//   layout.json the block and the two rows (x, y, w, h, in mm), for the printed face and the render

import { writeFileSync, mkdirSync } from 'node:fs';
import { DEFAULTS, markShape, UNITS } from '../src/js/mark.js';

const [out = '.', margin = 3, row = 2.6, gap = 1.1, which = 'both'] = process.argv.slice(2);
const U = 10; // units per mm
const W = 85 * U, H = 55 * U;
// With one row (the bottom), the mark is drawn on a card taller by a row and its gap, and that top row is
// then left off above the card: the block runs up to the margin. With `side`, no row above or below: the block
// fills the card less a row and its gap at the right, where the row stands, read from the bottom up.
const r = Number(row) * U, g = Number(gap) * U, pad = Number(margin) * U;
const extra = which === 'bottom' ? r + g : 0;
const H2 = H + extra;
let s;
if (which === 'side') {
  s = markShape({ ...DEFAULTS, info: false, padding: pad }, W - r - g, H);
  s.rows = [{ x: W - pad - r, y: s.by, w: r, h: s.bh, rotate: 90 }];
} else {
  s = markShape({ ...DEFAULTS, info: true, infoSize: r / H2, infoGap: g / H2, padding: pad }, W, H2);
}
const dy = -extra; // the whole drawing moved up by it (an SVG transform: its paths keep their arcs)
if (extra) s.rows = s.rows.slice(1);

// The letters are the block less the slots (the slots stroked, their round ends as dots).
const caps = s.dots.map(([x, y, r = s.stroke / 2]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('');
const slots = s.parts.map((g) => `<path d="${g.d}" fill="none" stroke="#fff" stroke-width="${g.stroke}" stroke-linecap="butt" stroke-linejoin="${g.join}"/>`).join('');
// The bridges: the A's closed counter (slot column 5, x 302 of 552, from y 42 to 220) held by strips of card at
// both ends: up to the block's top, and down across the crossbar (y 220 to 252) to the slot below it
const bw = 1.0 * U; // at least the sheet's thickness, for the laser
const bridgeX = s.bx + 302 * s.sx;
const strip = (y0, y1) => `<rect x="${bridgeX - bw / 2}" y="${s.by + y0 * s.sy}" width="${bw}" height="${(y1 - y0) * s.sy}" fill="#fff"/>`;
const bridge = strip(-1, 56) + strip(214, 258);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`
  + `<rect width="${W}" height="${H}" fill="#fff"/>`
  + `<g transform="translate(0 ${dy})"><rect x="${s.bx}" y="${s.by}" width="${s.bw}" height="${s.bh}" fill="#000"/>`
  + `<g fill="#fff">${slots}${caps}</g>${bridge}</g></svg>`;

mkdirSync(out, { recursive: true });
writeFileSync(`${out}/holes.svg`, svg);
const mm = (v) => v / U;
writeFileSync(`${out}/layout.json`, JSON.stringify({
  card: [85, 55],
  block: { x: mm(s.bx), y: mm(s.by + dy), w: mm(s.bw), h: mm(s.bh) },
  rows: s.rows.map((q) => ({ x: mm(q.x), y: mm(q.y + dy), w: mm(q.w), h: mm(q.h), rotate: q.rotate || 0 })),
  units: UNITS,
}, null, 1));
console.log(`block ${mm(s.bw).toFixed(1)} x ${mm(s.bh).toFixed(1)} mm, ${s.rows.length} row(s)`);
