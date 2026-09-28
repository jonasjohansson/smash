// The mapping grid drawn over the stage, as mapping software draws it: thin
// lines (the edge stronger than the inside), square handles, the selected ones
// filled with their coordinates in the output's pixels, a row or column lit
// while Alt is held, a box being dragged round points, and the edge dashed
// when a corner pin has no true perspective. Black, white and greys only.
//
// Two layers. The lines are drawn in white on a canvas laid on the stage by
// difference (BLEND): white over black stays white, white over the white mark
// turns black, so one grid reads on either ground and across the mark. The
// handles and the tag are drawn plainly on the canvas above, in the mark's own
// tone with a rim of the ground's, so they hold on the greys of the depth too.

import { apply3, clamp } from './warp.js';

/** How the lines' canvas is laid on the stage, in CSS and on a canvas. */
export const BLEND = 'difference';

const INNER = 'rgba(255,255,255,0.34)';
const EDGE = 'rgba(255,255,255,0.72)';
const LIT = '#fff';

/**
 * Draw on two 2D contexts already scaled to css px: lines (laid on by BLEND), handles (laid on plainly). s: {
 *   L (the layout: W, H, M), place(s, t, out) (frame units to stage px), disp (the grid as drawn),
 *   toScreen(x, y), fallback (the corner pin fell back to bilinear),
 *   hl ('row' | 'column' | 'both' | null), hk (the point whose row or column lights),
 *   marquee ([x0, y0, x1, y1] | null), handles ([{ k, i, j, x, y }] | null for none),
 *   sel (Set), primary, hover, moving ([k]), coarse, out ([w, h] of the output),
 *   ink, paper (css colours: the mark's and the ground's)
 * }
 */
export function drawGrid(lines, top, s) {
  const { L, place, disp, toScreen } = s;
  const { n, m } = disp;
  const S = 40;
  const pt = [0, 0];
  const line = (color, width, fn) => {
    lines.lineWidth = width;
    lines.strokeStyle = color;
    lines.beginPath();
    for (let q = 0; q <= S; q++) {
      const [u, v] = fn(q / S);
      place(u, v, pt);
      const [X, Y] = toScreen(pt[0], pt[1]);
      if (q) lines.lineTo(X, Y); else lines.moveTo(X, Y);
    }
    lines.stroke();
  };
  const hi = s.hk >= 0 ? s.hk % n : -1, hj = s.hk >= 0 ? Math.floor(s.hk / n) : -1;
  lines.lineCap = 'round';
  lines.lineJoin = 'round';
  const colOn = (i) => (s.hl === 'column' || s.hl === 'both') && i === hi;
  const rowOn = (j) => (s.hl === 'row' || s.hl === 'both') && j === hj;
  for (let i = 1; i < n - 1; i++) if (!colOn(i)) line(INNER, 1, (u) => [i / (n - 1), u]);
  for (let j = 1; j < m - 1; j++) if (!rowOn(j)) line(INNER, 1, (u) => [u, j / (m - 1)]);
  // A corner pin that fell back to bilinear: its edge dashed (the status line says why).
  if (s.fallback) lines.setLineDash([5, 4]);
  for (const i of [0, n - 1]) if (!colOn(i)) line(EDGE, 1, (u) => [i / (n - 1), u]);
  for (const j of [0, m - 1]) if (!rowOn(j)) line(EDGE, 1, (u) => [u, j / (m - 1)]);
  lines.setLineDash([]);
  for (let i = 0; i < n; i++) if (colOn(i)) line(LIT, 1.6, (u) => [i / (n - 1), u]);
  for (let j = 0; j < m; j++) if (rowOn(j)) line(LIT, 1.6, (u) => [u, j / (m - 1)]);

  if (s.marquee) {
    const [x0, y0, x1, y1] = s.marquee;
    const x = Math.min(x0, x1), y = Math.min(y0, y1), w = Math.abs(x1 - x0), h = Math.abs(y1 - y0);
    lines.fillStyle = 'rgba(255,255,255,0.07)';
    lines.fillRect(x, y, w, h);
    lines.lineWidth = 1;
    lines.strokeStyle = 'rgba(255,255,255,0.8)';
    lines.setLineDash([4, 3]);
    lines.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.round(w), Math.round(h));
    lines.setLineDash([]);
  }
  const H = s.handles;
  if (!H) return;

  // The points: small squares, open, filled when selected or held. Their size follows how close they
  // sit, so a dense grid on a phone doesn't bury the mark under its own handles.
  let gap = Infinity;
  const at = new Map(H.map((p) => [`${p.i},${p.j}`, p]));
  for (const p of H) {
    for (const q of [at.get(`${p.i + 1},${p.j}`), at.get(`${p.i},${p.j + 1}`)]) if (q) gap = Math.min(gap, Math.hypot(q.x - p.x, q.y - p.y));
  }
  // On a phone smaller still (a finger's reach is set apart, in the pick radius), so they don't cover the letters.
  const r = clamp(Number.isFinite(gap) ? gap * 0.12 : 4, 2.5, s.coarse ? 3.5 : 4);
  const { ink, paper } = s;
  for (const p of H) {
    const on = s.sel.has(p.k) || s.moving?.includes(p.k), hov = p.k === s.hover;
    const x = Math.round(p.x) + 0.5, y = Math.round(p.y) + 0.5;
    // A rim of the ground's tone, then the square in the mark's: it reads on the ground, the mark and the
    // greys. An open one lets the mark show through a little, so a dense grid doesn't hide it.
    top.lineWidth = 2.5;
    top.strokeStyle = paper;
    top.globalAlpha = 0.6;
    top.strokeRect(x - r, y - r, r * 2, r * 2);
    top.globalAlpha = on ? 1 : 0.5;
    top.fillStyle = on ? ink : paper;
    top.fillRect(x - r, y - r, r * 2, r * 2);
    if (hov && !on) { top.globalAlpha = 0.5; top.fillStyle = ink; top.fillRect(x - r, y - r, r * 2, r * 2); }
    top.globalAlpha = 1;
    top.lineWidth = 1;
    top.strokeStyle = ink;
    top.strokeRect(x - r, y - r, r * 2, r * 2);
  }
  const sp = H.find((p) => p.k === s.primary && s.sel.has(p.k));
  if (!sp) return;
  const [x, y] = apply3(L.M, disp.p[sp.k * 2], disp.p[sp.k * 2 + 1], [0, 0]);
  const text = s.sel.size > 1 ? `${s.sel.size} points` : `${sp.i + 1}·${sp.j + 1}  ${Math.round((x / L.W) * s.out[0])}, ${Math.round((y / L.H) * s.out[1])}`;
  top.font = '10px ui-monospace, "SF Mono", Menlo, monospace';
  const tw = Math.round(top.measureText(text).width + 8);
  let lx = sp.x + 10, ly = sp.y - 24;
  if (lx + tw > L.W - 4) lx = sp.x - 10 - tw;
  if (ly < 4) ly = sp.y + 10;
  lx = Math.round(lx);
  ly = Math.round(ly);
  // A tag in the mark's tone with a rim of the ground's, the text in the ground's.
  top.fillStyle = paper;
  top.fillRect(lx - 1, ly - 1, tw + 2, 17);
  top.fillStyle = ink;
  top.fillRect(lx, ly, tw, 15);
  top.fillStyle = paper;
  top.fillText(text, lx + 4, ly + 11);
}
