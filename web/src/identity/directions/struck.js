// 01 Struck, the lean: the SMASH mark with every slot leaning towards one
// point on the crossbar of the A, as if the block had just been struck.
// Nothing is cut and nothing is added: no cracks, no colour, no pictures. The
// lean is the whole idea, in black and white. In motion it arrives from the
// point, holds, and lets go.
// The geometry (the mark drawn letter by letter, so its slots can lean) is in
// ./struck/geom.js.

import { svg, timeline, canvasStage, withCleanup, pointer, ease, span, clamp, lerp } from '../lib.js';
import * as G from './struck/geom.js';

const BLACK = '#000000';
const WHITE = '#ffffff';

// The page sizes a wordmark by its width, and a near-square one overflows its
// panel there (the panel's grid row grows to the picture's height: a harness
// bug, reported). The file keeps the block's own tight artboard for
// Illustrator; on the page, this rule gives it the panels' proportion. It
// hooks on the wordmark's accessible name, so the exported file carries no
// class or page hook.
const WM_LABEL = 'SMASH, struck';
if (typeof document !== 'undefined' && !document.getElementById('struck-page-css')) {
  const st = document.createElement('style');
  st.id = 'struck-page-css';
  st.textContent = `svg[aria-label="${WM_LABEL}"] { aspect-ratio: 2.36; height: auto !important; }`;
  document.head.append(st);
}

export const info = {
  n: 1,
  slug: 'struck',
  name: 'Struck',
  lane: 'The lean',
  idea: 'The mark you know, leaning in: every slot tilts towards one point on the crossbar of the A, as if the block had just been struck.',
  story: 'Today’s block and its ten slots, leaning towards the A; nothing is added and nothing is cut.',
  dynamism: 'The lean arrives from the point, holds, and lets go.',
  keeps: 'The block, the ten slots, the round ends and the S bends, to the unit.',
  risk: 'Pushed further it reads as a distortion effect, so it is held: no slot past 10.5 degrees, and no bar under two thirds of its width.',
  palette: { ink: BLACK, paper: WHITE, accent: WHITE },
  interactive: 'Hover to move the point; the slots lean towards it.',
  keyframe: 0.5,
  type: {
    fonts: [new URL('./struck/fonts.css', import.meta.url).href],
    display: {
      family: '"Struck SMASH", "SMASH", sans-serif',
      css: "font-variation-settings: 'wght' 760, 'wdth' 118, 'HGHT' 471; text-transform: uppercase;",
      name: 'SMASH, the studio’s variable face',
      note: 'Drawn from the mark’s own rules; kept for the typography round.',
    },
    text: { family: '"Struck Programm", sans-serif', css: '', name: 'Gerstner Programm', note: '' },
  },
};

// ---------------------------------------------------------------- stills

const f2 = (v) => +v.toFixed(2);
const fill = (d, color = 'currentColor') => `<path fill="${color}" fill-rule="evenodd" d="${d}"/>`;
const CANON_I = [G.CANON.ix, G.CANON.iy];

let cache = null;
/** The leaning mark and the symbol, drawn once. */
function drawn() {
  if (cache) return cache;
  const sym = G.symbolGeom();
  cache = {
    mark: G.markPath(G.CANON, G.MARK),
    sym,
    symD: sym.loops.map((l) => G.loopPath(l)).join(''),
  };
  return cache;
}

/** The wordmark: the block with its slots leaning towards the A, on its own artboard (550 × 471). The same at every size. */
export function wordmark() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${G.W} ${G.H}" role="img" aria-label="${WM_LABEL}">${fill(drawn().mark)}</svg>`;
}

/** The symbol: the A where the lean points, with a slot either side leaning in. */
export function symbol() {
  const { sym, symD } = drawn();
  return svg(f2(sym.Q), f2(sym.Q), fill(symD));
}

/**
 * The lockup: the symbol at the wordmark's height, then the wordmark. The gap
 * is one bar of the symbol as drawn there (about one and a half pitches of the
 * wordmark), so it reads as a break, not as one more slot; the two share their
 * top and bottom.
 */
export function lockup() {
  const { sym } = drawn();
  const s = G.H / sym.Q;
  const gap = G.BAR * s;
  const symS = sym.loops.map((l) => G.loopPath(l, (x, y) => [x * s, y * s], s)).join('');
  const wm = G.markPath(G.CANON, G.MARK, (x, y) => [x + G.H + gap, y], 1);
  return svg(f2(G.H + gap + G.W), G.H, fill(symS + wm));
}

/**
 * The favicon: the symbol's pane in white, its slots cut to black (the symbol
 * as it stands on black). At 64 the vector drawing tuned to whole pixels; at
 * 32 and 16 drawn on the pixel grid, as runs of slot pixels: [first row, last
 * row, first column, last column].
 */
const FAV64 = { border: 13, bar: 10, slot: 6, fold: 2.5, brk: 10 };
/**
 * At 32: side slots 3 px, the A's slot 4 px with its cap cut to 2 px on its
 * first row. The left slot steps out one pixel every three or four rows from
 * its fold, the right one is its point reflection, so the crease steps down
 * through the break as in the logo. At 16 the slots step only once each way,
 * so no piece of the pane drops to one pixel.
 */
const stepRuns = (starts, w) => starts.map(([r0, r1, c0]) => [r0, r1, c0, c0 + w - 1]);
const PIX = {
  32: {
    left: stepRuns([[0, 2, 4], [3, 6, 5], [7, 9, 6], [10, 16, 7], [17, 19, 6], [20, 23, 5], [24, 27, 4], [28, 30, 3], [31, 31, 2]], 3),
    a: [[6, 6, 15, 16], [7, 12, 14, 17], [19, 31, 14, 17]],
  },
  16: {
    left: stepRuns([[0, 2, 2], [3, 10, 3], [11, 15, 2]], 2),
    a: [[3, 6, 7, 8], [9, 15, 7, 8]],
  },
};
function pixelRuns(size) {
  const { left, a } = PIX[size];
  const m = size - 1;
  // The right slot is the left one turned half a turn about the centre.
  return [...left, ...left.map(([y0, y1, x0, x1]) => [m - y1, m - y0, m - x1, m - x0]), ...a];
}
function pixelFavicon(size) {
  const rects = pixelRuns(size).map(([y0, y1, x0, x1]) => `<rect x="${x0}" y="${y0}" width="${x1 - x0 + 1}" height="${y1 - y0 + 1}"/>`).join('');
  return svg(size, size, `<rect width="${size}" height="${size}" fill="${WHITE}"/><g fill="${BLACK}">${rects}</g>`);
}
export function favicon({ size = 32 } = {}) {
  if (PIX[size]) return pixelFavicon(size);
  const g = G.symbolGeom(FAV64);
  const Q = f2(g.Q);
  return svg(Q, Q, `<rect width="${Q}" height="${Q}" fill="${BLACK}"/>${fill(g.loops.map((l) => G.loopPath(l)).join(''), WHITE)}`);
}

// ---------------------------------------------------------------- motion

/**
 * The loop, in seconds: at rest; the lean arrives, from the point's slot out
 * to the edges; it holds; it lets go, from the edges back to the point; at
 * rest. The letting go is the arriving played backwards.
 */
const DUR = 6;
const ARRIVE = 0.6; // the point's slot starts to lean
const RELEASE = 3.8; // the farthest slot starts to let go
const MOVE = 1.1; // each slot's lean, in or out
const SPREAD = 0.3; // from the point's slot to the farthest one
const DIST = Array.from({ length: 10 }, (_, i) => Math.abs(G.col(i) - G.CANON.ix));
const FAR = Math.max(...DIST);

/** Each column's share of the lean at time t (0..1): a pure function of t. t 0 and t 1 are the mark at rest. */
export function leanAt(t) {
  const s = clamp(t) * DUR;
  return DIST.map((d) => {
    const lag = (SPREAD * d) / FAR;
    const on = ease.inOutCubic(span(s, ARRIVE + lag, ARRIVE + lag + MOVE));
    const off = ease.inOutCubic(span(s, RELEASE + SPREAD - lag, RELEASE + SPREAD - lag + MOVE));
    return on * (1 - off);
  });
}

/** The block laid out in a w × h px box, `fit` of its height (or width, if narrower). */
function place(w, h, fit = 0.72) {
  let bh = h * fit;
  let bw = (bh * G.W) / G.H;
  if (bw > w * 0.86) { bw = w * 0.86; bh = (bw * G.H) / G.W; }
  return { x: (w - bw) / 2, y: (h - bh) / 2, w: bw, h: bh, s: bw / G.W };
}

export function motion(el, { ground = 'ink' } = {}) {
  const stage = canvasStage(el);
  stage.canvas.style.touchAction = 'pan-y';
  const [bg, fg] = ground === 'paper' ? [WHITE, BLACK] : [BLACK, WHITE];
  // The pointer: hov eases to 1 while it is over the stage, and the point (ax, ay) eases after it to (tx, ty).
  const live = { hov: 0, ax: CANON_I[0], ay: CANON_I[1], tx: CANON_I[0], ty: CANON_I[1], last: 0 };
  let raf = 0;
  let dead = false;
  const wake = () => { if (!raf && !dead) raf = requestAnimationFrame(tick); };
  const ptr = pointer(el, { onMove: wake });
  const toMark = (box, px, py) => [clamp((px - box.x) / box.s, 30, G.W - 30), G.clampI((py - box.y) / box.s)];

  const follow = (box) => {
    if (!ptr.inside && live.hov < 1e-3) {
      Object.assign(live, { hov: 0, last: 0, ax: CANON_I[0], ay: CANON_I[1] });
      return;
    }
    const now = performance.now();
    const dt = live.last ? Math.min(0.05, (now - live.last) / 1000) : 1 / 60;
    live.last = now;
    const a = 1 - Math.exp(-dt * 6);
    live.hov += ((ptr.inside ? 1 : 0) - live.hov) * a;
    if (ptr.inside) {
      [live.tx, live.ty] = toMark(box, ptr.x * stage.width, ptr.y * stage.height);
      live.ax += (live.tx - live.ax) * a;
      live.ay += (live.ty - live.ay) * a;
    }
  };

  const render = (t) => {
    if (dead) return;
    const { ctx, width: w, height: h } = stage;
    const box = place(w, h);
    follow(box);
    // Hovering, the point follows the pointer and the mark leans fully towards it; away, the loop.
    const wgt = ease.inOutCubic(clamp(live.hov));
    const ix = lerp(CANON_I[0], live.ax, wgt);
    const iy = lerp(CANON_I[1], live.ay, wgt);
    const kcol = leanAt(t).map((k) => lerp(k, 1, wgt));
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    const T2 = (x, y) => [box.x + x * box.s, box.y + y * box.s];
    ctx.fillStyle = fg;
    ctx.fill(new Path2D(G.markPath({ ...G.CANON, ix, iy, kcol }, G.MARK, T2, box.s)), 'evenodd');
  };

  const tl = timeline({ duration: DUR, render });
  const tick = () => {
    raf = 0;
    if (dead) return;
    if (!tl.playing) tl.redraw();
    // Keep drawing only while the pointer layer is still moving: easing in or out, or the point catching up.
    const moving = ptr.inside ? live.hov < 0.999 || Math.hypot(live.tx - live.ax, live.ty - live.ay) > 0.05 : live.hov > 1e-3;
    if (moving) raf = requestAnimationFrame(tick);
  };
  stage.onResize(() => tl.redraw());
  return withCleanup(tl, () => { dead = true; cancelAnimationFrame(raf); }, ptr.destroy, stage.destroy);
}
