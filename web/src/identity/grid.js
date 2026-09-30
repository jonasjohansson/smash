// The grid every mark on the page is set on (Jonas, 2026-09-30: "adhere the
// current logo versions and wordmarks (all of them) to a unified grid and just
// tighten it"). The mark's own measures are the units, on a grid of 4: a bar
// 32, a slot 20, a pitch 52, the block 552 × 472; the S M 240 × 136; the
// modular mark 552 × 136.
//
// Every still is set at one scale (--s, px to a unit), so the symbol is
// exactly the S M in the wordmark and a lockup's mark exactly the wordmark,
// and a pitch in from its panel's left and its bottom (--m); its label a pitch
// in, in the band above. Every row is one height: a pitch, the block, a pitch
// (576). A stage of two rows sets its mark at twice the scale, on the same
// margins. layoutGrid() works the scale out from the page's width and fits
// every sheet to its panel; G on the page shows the lines.

export const G = { unit: 4, pitch: 52, m: 52, row: 576, first: 42 };
/** The block's three bands (the original mark, the lockups), top to bottom. */
export const BANDS = [0, 32, 220, 252, 440, 472];
/** The modular mark's and the S M's five: bar, slot, bar, slot, bar. */
export const BANDS5 = [0, 32, 52, 84, 104, 136];

const box = (str) => {
  const vb = str.match(/viewBox="\s*([-\d.]+)[\s,]+([-\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*"/);
  return vb ? { w: Number(vb[3]), h: Number(vb[4]) } : null;
};

/**
 * A sheet: stills set on the grid in one SVG as wide as its panel, in mark
 * units, `rows` rows tall (half a row where seven go across). Each item is
 * { svg, x, y } or { svg, x, bottom } (from the sheet's bottom edge to the
 * still's), and k (its scale: 2 on a two-row stage, a quarter on a half row)
 * and bands (its bands, for the grid's lines). The sheet's k sets the grid's
 * columns (through the slots of stills at that scale).
 */
export function sheet(items, { rows = 1, k: sk = 1 } = {}) {
  const H = rows * G.row;
  let lines = '';
  let reach = 0; // how far right the stills reach, a margin after the last
  const body = items.map(({ svg, x = G.m, y = null, bottom = G.m, k = 1, bands = null }) => {
    const b = box(svg);
    if (!b) return svg;
    reach = Math.max(reach, x + b.w * k + G.m);
    const top = y ?? H - bottom - b.h * k;
    if (bands) lines += bands.map((v) => `M-9999 ${+(top + v * k).toFixed(2)}H99999`).join('');
    return svg.replace('<svg ', `<svg x="${x}" y="${+top.toFixed(2)}" width="${+(b.w * k).toFixed(2)}" height="${+(b.h * k).toFixed(2)}" overflow="visible" `);
  }).join('');
  return `<svg class="placed" data-rows="${rows}" data-k="${sk}" data-reach="${+reach.toFixed(2)}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 ${H}" preserveAspectRatio="xMinYMax meet">`
    + `<g class="grid-lines"><path class="grid-cols"/><path d="${lines}"/><rect class="grid-margin" x="${G.m}" y="${G.m}" width="0" height="${H - 2 * G.m}"/></g>`
    + body + '</svg>';
}

/** One still, bottom left, a pitch in: the page's usual panel (k and rows for a quarter-scale half row). */
export const placed = (svg, bands = null, { k = 1, rows = 1 } = {}) => sheet([{ svg, bands, k }], { rows, k });

/** Work out the grid's scale from the page's width, and fit every sheet to its panel. */
export function layoutGrid() {
  const page = document.getElementById('page');
  if (!page) return;
  const cs = getComputedStyle(page);
  const C = page.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const probe = document.querySelector('.grow.two') ?? document.querySelector('.grow');
  const gap = probe ? parseFloat(getComputedStyle(probe).columnGap) || 0 : 0;
  const narrow = matchMedia('(max-width: 760px)').matches;
  // A two-up panel at 16 : 9 is one row. On a phone, one column: the scale at
  // which the widest still (the lockup) fits the width, margins and all.
  const sheets = [...document.querySelectorAll('svg.placed')];
  const widest = Math.max(G.m * 2 + 552, ...sheets.map((el) => Number(el.dataset.reach) || 0));
  const s = narrow ? C / widest : (((C - gap) / 2) * (9 / 16)) / G.row;
  const row = s * G.row;
  const root = document.documentElement.style;
  root.setProperty('--row', `${row}px`);
  root.setProperty('--s', String(s));
  root.setProperty('--m', `${G.m * s}px`);
  for (const svg of sheets) {
    const wu = svg.clientWidth / s;
    if (!wu) continue;
    const H = (Number(svg.dataset.rows) || 1) * G.row;
    svg.setAttribute('viewBox', `0 0 ${+wu.toFixed(2)} ${H}`);
    svg.querySelector('.grid-margin')?.setAttribute('width', String(Math.max(0, +(wu - 2 * G.m).toFixed(2))));
    // A column through every slot: every still starts a pitch in, so their slots line up.
    // The mark's own rhythm across the whole panel: a slot (20) after every bar (32), from the margin on. Every
    // edge lands on it: the mark's two, the S M's right one, and a lockup's type, a pitch after the mark.
    const k = Number(svg.dataset.k) || 1;
    let cols = '';
    for (let x = G.m + 32 * k; x < wu; x += G.pitch * k) cols += `M${+x.toFixed(2)} 0h${+(20 * k).toFixed(2)}V${H}h${+(-20 * k).toFixed(2)}Z`;
    svg.querySelector('.grid-cols')?.setAttribute('d', cols);
  }
}
