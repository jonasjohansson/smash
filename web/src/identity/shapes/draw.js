// Drawing the kit, the symbols and the patterns on the page, as SVG: strokes
// (a slot wide in a cut block, as modular.js markSVG draws the slots; a bar
// wide as building blocks), no paper.js, so the page stays fast. Blocks are drawn in the ink colour on the ground; a cut
// symbol is a block in the ink colour with the slots drawn over it in the
// ground's, running on off its edges into the ground, where they vanish.
// The true outlines, for Illustrator, are in outline.js.

import { Board, KIT, piece, box, unitLine, strokesSVG, inkBox, pieceLines, span, at, weightOf, PITCH, SLOT } from './kit.js';

const f = (n) => +n.toFixed(2);

/** Whether a symbol stands on the ground: built as blocks, and upright (not turned into itself). */
export const grounded = (sym) => sym.build !== 'cut' && (sym.sym === 'none' || sym.sym === 'mirror' || !sym.sym);

/**
 * A symbol's pieces (all, or those at the given indices) clicked together:
 * its lines in mark units. `reach`: how far an open slot runs on past the
 * block (well past it, unless the symbol sits among others on a plate).
 */
export function symbolLines(sym, which = null, { reach = PITCH } = {}) {
  const b = new Board({ N: sym.n, M: sym.m, cut: sym.build === 'cut' });
  b.add(which ? which.map((i) => sym.pieces[i]) : sym.pieces);
  return b.lines({ ground: grounded(sym) }).map((l) => unitLine(l, 0, 0, reach, weightOf(sym.build)));
}

/**
 * The order the pieces go on in: groups (a piece and its images) from the
 * ground up when it stands, else as they were placed.
 */
export function order(sym) {
  const groups = sym.groups?.length ? sym.groups : sym.pieces.map((_, i) => [i]);
  if (!grounded(sym)) return groups;
  const low = (g) => Math.max(...g.map((i) => box(sym.pieces[i])[3]));
  return groups.map((g, k) => ({ g, k })).sort((a, b) => low(b.g) - low(a.g) || a.k - b.k).map((o) => o.g);
}

// The assembly: each group drops half a pitch into place, one after another.
export const DROP = 170; // ms, one piece's fall
export const STAGGER = 75; // ms between pieces
export const ASSEMBLY_CSS = `
@keyframes sh-drop { from { visibility: visible; transform: translateY(-${f(PITCH / 2)}px); } to { visibility: visible; transform: none; } }
@keyframes sh-show { from, to { visibility: visible; } }
@keyframes sh-wait { from, to { visibility: hidden; } }
.sh-drop, .sh-show { visibility: hidden; }
.sh-drop { animation: sh-drop ${DROP}ms cubic-bezier(0.3, 1.5, 0.55, 1); }
.sh-show { animation: sh-show 1s linear; }
.sh-last { animation: sh-wait 1s linear; }
@media (prefers-reduced-motion: reduce) { .sh-drop, .sh-show { display: none; } .sh-last { animation: none; } }
`;

/**
 * A symbol as an SVG string, in fg on bg, its block framed with room round
 * it (pad, of its longer side). With `assemble` (a delay in ms), it builds
 * itself block by block: each group falls into place while the pieces so far
 * are drawn clicked together, so every step is exact. Returns { svg, time }
 * (time: when it is done, in ms).
 */
export function symbolSVG(sym, { fg = '#fff', bg = '#000', pad = 0.13, assemble = null } = {}) {
  const W = span(sym.n);
  const H = span(sym.m);
  const cut = sym.build === 'cut';
  const ink = cut ? bg : fg;
  // Cut: the block, framed. Blocks: the figure itself (its ink), framed, so it is as big as it can be.
  const [x0, y0, x1, y1] = cut || !sym.pieces.length ? [0, 0, W, H] : inkBox(symbolLines(sym));
  const p = Math.max(x1 - x0, y1 - y0) * pad;
  const head = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f(x0 - p)} ${f(y0 - p)} ${f(x1 - x0 + 2 * p)} ${f(y1 - y0 + 2 * p)}" aria-hidden="true">`;
  const block = cut ? `<rect width="${f(W)}" height="${f(H)}" fill="${fg}"/>` : '';
  if (assemble === null || !sym.pieces.length) return { svg: `${head}${block}${strokesSVG(symbolLines(sym), ink)}</svg>`, time: 0 };
  const steps = order(sym);
  const t0 = assemble;
  const land = (k) => t0 + k * STAGGER + DROP;
  let body = '';
  const so = [];
  steps.forEach((g, k) => {
    so.push(...g);
    body += `<g class="sh-drop" style="animation-delay:${Math.round(t0 + k * STAGGER)}ms">${strokesSVG(symbolLines(sym, g), ink)}</g>`;
    const now = strokesSVG(symbolLines(sym, [...so]), ink);
    if (k < steps.length - 1) body += `<g class="sh-show" style="animation-delay:${Math.round(land(k))}ms;animation-duration:${STAGGER}ms">${now}</g>`;
    else body += `<g class="sh-last" style="animation-duration:${Math.round(land(k))}ms">${now}</g>`;
  });
  return { svg: `${head}${block}${body}</svg>`, time: land(steps.length - 1) };
}

// ---------------------------------------------------------------------------
// The kit

/**
 * A kit piece's lines in mark units, as the kit shows it: turned (quarters
 * clockwise) and mirrored as asked, standing on the ground (its ink's bottom
 * at 0) and centred across; or, with `centred`, centred both ways.
 */
export function kitLines(kind, { turns = 0, mirror = false, centred = false } = {}) {
  const p = piece(kind, undefined, { r: turns, m: mirror });
  const ul = pieceLines(p);
  const [x0, y0, x1, y1] = inkBox(ul);
  const dx = -(x0 + x1) / 2;
  const dy = centred ? -(y0 + y1) / 2 : -y1;
  return ul.map((l) => ({ ...l, pts: l.pts.map(([x, y]) => [x + dx, y + dy]), dots: l.dots.map(([x, y]) => [x + dx, y + dy]) }));
}

/** The tallest and widest of the kit's pieces, upright, for one scale for all. */
export const KIT_BOX = (() => {
  let w = 0, h = 0;
  for (const k of KIT) {
    const [x0, y0, x1, y1] = inkBox(kitLines(k));
    w = Math.max(w, x1 - x0);
    h = Math.max(h, y1 - y0);
  }
  return { w, h };
})();

/** The kit's frame, upright: its width over its height (room: of the tallest piece, round it). */
const kitFrame = (room) => [KIT_BOX.w * (1 + room * 2) + PITCH * 0.4, KIT_BOX.h * (1 + room * 2)];
export const KIT_ASPECT = +(kitFrame(0.28)[0] / kitFrame(0.28)[1]).toFixed(4);

/**
 * A kit piece as an SVG string, at the kit's one scale: every piece in the
 * same frame, standing on the same ground, so a row of them reads as a set.
 * Turned or mirrored (the piece in hand), it is centred in a square frame.
 */
export function kitSVG(kind, { fg = '#fff', bg = '#000', room = 0.28, turns = 0, mirror = false, square = false } = {}) {
  const centred = square || turns % 2 === 1;
  const ul = kitLines(kind, { turns, mirror, centred });
  let vb;
  if (centred) {
    const s = Math.max(KIT_BOX.w, KIT_BOX.h) * (1 + room * 2);
    vb = [-s / 2, -s / 2, s, s];
  } else {
    const [w, h] = kitFrame(room);
    vb = [-w / 2, -KIT_BOX.h * (1 + room), w, h];
  }
  const ground = bg === 'none' ? '' : `<rect x="${f(vb[0])}" y="${f(vb[1])}" width="${f(vb[2])}" height="${f(vb[3])}" fill="${bg}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.map(f).join(' ')}" aria-hidden="true">${ground}${strokesSVG(ul, fg)}</svg>`;
}

// ---------------------------------------------------------------------------
// Patterns

/** A symbol turned t quarters clockwise about its middle (a square one). */
export function turnSymbol(sym, t) {
  const c = (sym.n - 1) / 2;
  const turn = ([x, y]) => [c - (y - c), c + (x - c)];
  let pieces = sym.pieces;
  for (let k = 0; k < t % 4; k++) pieces = pieces.map((p) => ({ ...p, lines: p.lines.map((l) => ({ ...l, pts: l.pts.map(turn) })) }));
  return { ...sym, pieces };
}

/** The turns pattern's copies: [a, b, symbol turned], a × b over the window, from one before. */
export function copies(pat, across, down) {
  const out = [];
  for (let b = -1; b <= down; b++) for (let a = -1; a <= across; a++) out.push([a, b, turnSymbol(pat.motif, (((a + b) % 4) + 4) % 4)]);
  return out;
}

/**
 * A pattern's lines over a window: its repeat laid out (reps across and
 * down, from one before), clicked together, in mark units. The repeat's
 * first node sits a node in (at(0)), as a symbol's does.
 */
export function patternLines(pat, across, down) {
  const border = !pat.wrap[1];
  const b = new Board({ N: pat.n, M: pat.m, cut: pat.build === 'cut', open: [true, !border] });
  const rows = border ? [0] : Array.from({ length: down + 2 }, (_, i) => i - 1);
  for (const r of rows) {
    for (let c = -1; c <= across; c++) {
      b.add(pat.pieces.map((p) => ({ ...p, lines: p.lines.map((l) => ({ ...l, pts: l.pts.map(([x, y]) => [x + c * pat.n, y + r * pat.m]) })) })));
    }
  }
  return b.lines().map((l) => unitLine(l, 0, 0, PITCH, weightOf(pat.build)));
}

/** The repeat's box in mark units: from the middle of the bar before its first node, a whole repeat on (a border's is its band). */
export function repeatBox(pat) {
  if (pat.kind === 'turns') return [-SLOT / 2, -SLOT / 2, pat.cells * pat.n * PITCH, pat.cells * pat.m * PITCH];
  const x0 = at(0) - PITCH / 2;
  const border = !pat.wrap[1];
  return border ? [x0, 0, pat.n * PITCH, span(pat.m)] : [x0, at(0) - PITCH / 2, pat.n * PITCH, pat.m * PITCH];
}

/**
 * A pattern as an SVG string: `across` repeats wide, in fg on bg (cut: a
 * plane in fg, or the border's band, with the slots in bg), cropped to fill
 * whatever box it is set in.
 */
export function patternSVG(pat, { fg = '#fff', bg = '#000', across = 6 } = {}) {
  if (pat.kind === 'turns') return turnsSVG(pat, { fg, bg, across });
  const [x0, y0, w, h] = repeatBox(pat);
  const down = pat.wrap[1] ? Math.max(2, Math.ceil((across * w) / h)) : 1;
  const ul = patternLines(pat, across, down);
  const W = w * across;
  const H = pat.wrap[1] ? h * down : h;
  const cut = pat.build === 'cut';
  const ground = cut ? `<rect x="${f(x0)}" y="${f(y0)}" width="${f(W)}" height="${f(H)}" fill="${fg}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f(x0)} ${f(y0)} ${f(W)} ${f(H)}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${ground}${strokesSVG(ul, cut ? bg : fg)}</svg>`;
}

/** The turns pattern: each copy its own block (cut) or figure, a slot apart, turned. `across` copies wide. */
function turnsSVG(pat, { fg, bg, across }) {
  const P = pat.n * PITCH; // a copy and the gap after it
  const W = across * P;
  const down = across;
  const H = down * P;
  const cut = pat.build === 'cut';
  let body = '';
  for (const [a, b, sym] of copies(pat, across, down)) {
    const ox = a * P, oy = b * P;
    const ul = symbolLines(sym, null, { reach: 1 }).map((l) => ({ ...l, pts: l.pts.map(([x, y]) => [x + ox, y + oy]), dots: l.dots.map(([x, y]) => [x + ox, y + oy]) }));
    body += (cut ? `<rect x="${f(ox)}" y="${f(oy)}" width="${f(span(sym.n))}" height="${f(span(sym.m))}" fill="${fg}"/>` : '') + strokesSVG(ul, cut ? bg : fg);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f(-SLOT / 2)} ${f(-SLOT / 2)} ${f(W)} ${f(H)}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${body}</svg>`;
}

