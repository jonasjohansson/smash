// The grid, previewed on the marks themselves (Jonas, 2026-09-30: every
// version of the mark on one grid, and "i would like to be able to preview
// grids"). The marks are drawn on a grid of 4: a bar 32, a slot 20 (8 : 5), a
// pitch 52, the block 552 × 472, the S M 240 × 136. withGrid() adds a still's
// grid to its own SVG, in its own units, hidden until the page shows it (the
// Grid button, or G): the slots' columns (a slot after every bar, on across
// the artboard), the bands, the mark's box, where a lockup's type starts (a
// pitch after the mark), and every circle its curves are drawn from, with its
// centre. The page adds it; the exports never see it.

const PINK = '#ff29b8';
/** The block's three bands (the original mark, its lockup), top to bottom. */
export const BANDS = [0, 32, 220, 252, 440, 472];
/** The S M's five: bar, slot, bar, slot, bar. */
export const BANDS5 = [0, 32, 52, 84, 104, 136];

// Each kind of still: its mark's box, its bands, and where its type starts.
const KINDS = {
  wordmark: { w: 552, h: 472, bands: BANDS },
  symbol: { w: 240, h: 136, bands: BANDS5 },
  lockup: { w: 552, h: 472, bands: BANDS, type: 552 + 52 },
  lockupSM: { w: 240, h: 136, bands: BANDS5, type: 240 + 52 },
};

const f = (n) => +n.toFixed(2);

/** The centre of an SVG arc (a circle's: rx = ry = r) from p to q, with its flags. */
function centre([x1, y1], [x2, y2], r, large, sweep) {
  const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
  const d2 = dx * dx + dy * dy;
  if (!d2) return null;
  const rr = Math.max(r * r, d2);
  const k = Math.sqrt(Math.max(0, (rr - d2) / d2)) * (large === sweep ? -1 : 1);
  return [k * dy + (x1 + x2) / 2, -k * dx + (y1 + y2) / 2, Math.sqrt(rr)];
}

/** Every circle a path's arcs are drawn from (M, L, A, Z path data, absolute), each once. */
export function circles(d) {
  const out = new Map();
  let cur = [0, 0], start = [0, 0];
  for (const [, cmd, args] of d.matchAll(/([MLAZ])([^MLAZ]*)/g)) {
    const n = args.trim() ? args.trim().split(/[\s,]+/).map(Number) : [];
    if (cmd === 'M') { cur = [n[0], n[1]]; start = cur; }
    else if (cmd === 'L') cur = [n[0], n[1]];
    else if (cmd === 'Z') cur = start;
    else if (cmd === 'A') {
      const to = [n[5], n[6]];
      const c = centre(cur, to, n[0], n[3], n[4]);
      if (c) out.set(c.map((v) => v.toFixed(1)).join(','), c);
      cur = to;
    }
  }
  return [...out.values()];
}

/** The still's SVG with its grid added, hidden (class "mk-grid") until the page shows it. */
export function withGrid(svg, kind) {
  const K = KINDS[kind];
  const vb = svg.match(/viewBox="\s*([-\d.]+)[\s,]+([-\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*"/);
  if (!K || !vb) return svg;
  const [x0, y0, w, h] = vb.slice(1).map(Number);
  // A slot (20) after every bar (32), from the mark's first, on across the artboard.
  const first = Math.ceil((x0 - 32) / 52), last = Math.floor((x0 + w - 32) / 52);
  let cols = '';
  for (let i = first; i <= last; i++) cols += `<rect x="${32 + 52 * i}" y="${f(y0)}" width="20" height="${f(h)}"/>`;
  const bands = K.bands.map((y) => `M${f(x0)} ${y}H${f(x0 + w)}`).join('');
  const d = svg.match(/<path[^>]*\sd="([^"]+)"/)?.[1] ?? '';
  const rings = circles(d).map(([cx, cy, r]) => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" stroke-dasharray="3 2"/><path d="M${f(cx - 3)} ${f(cy)}h6M${f(cx)} ${f(cy - 3)}v6"/>`).join('');
  const type = K.type ? `<path d="M${K.type} ${f(y0)}V${f(y0 + h)}"/>` : '';
  const g = `<g class="mk-grid"><g fill="${PINK}" fill-opacity="0.16" stroke="none">${cols}</g>`
    + `<g fill="none" stroke="${PINK}" stroke-width="1"><path d="${bands}"/><rect x="0" y="0" width="${K.w}" height="${K.h}"/>${type}${rings}</g></g>`;
  return svg.replace(/<\/svg>\s*$/, `${g}</svg>`);
}
