// 02 Slant: the mark with every curve cut straight (2026-10-11, after
// CM.SUPPLY's round 4; Jonas: "i thought it was interesting with the slants
// instead of the uniform inner curves, i also thought the alternate a was
// interesting"). The block, the bars, the slots and the crossbars are the
// original's; the slot ends and the S bends are cut at one slope, 8 in 20
// (the slope, the stems, the height and the outer corners are sliders on the
// page, KNOBS). The A stays a capital: the single-storey a read as an o. The
// letters' outer corners are rounded, tight. The symbol, the S alone, the
// lockups and the favicons follow. No motion yet and no pixels: the stage
// holds the wordmark. Geometry: ./slant/geometry.js.

import { svg, timeline, canvasStage, withCleanup } from '../lib.js';
import { letters, slash, letterS, down as downPath, symbol as symbolPath, symbolCells, symCols, symRows, block, depth, ring, wedges, move, wordRadii, letterRadii, symRadii, rounds, SLANT, DROP, DROPS, BAR, PER, H, PITCH } from './slant/geometry.js';
import { lockPaths } from './original.js';
import { extent } from './slant/clip.js';

const BLACK = '#000000';
const WHITE = '#ffffff';

export const info = {
  n: 2,
  slug: 'slant',
  name: 'Slant',
  lane: 'Cut the curves',
  idea: 'The original mark with every curve cut straight at one slope, its outer corners rounded tight.',
  story: '',
  dynamism: '',
  keeps: 'The block, the bars, the slots and the crossbars.',
  risk: 'The cuts read as speed or as italic if the slope gets steeper.',
  palette: { ink: BLACK, paper: WHITE, accent: WHITE },
  interactive: '',
  motion: false, // the export takes no frames
  pixel: false, // nor pixel versions
};

const path = (d, rule = 'evenodd') => `<path fill="currentColor" fill-rule="${rule}" d="${d}"/>`;

// The sliders (Jonas, 2026-10-12): the slope of every cut, in a slot of 20
// ("maybe this can be a parameter i can slide to choose"); the stems' width
// and the block's height ("to match a bit the cm latest iteration"). The page
// sets them and draws the chapter again; the files are made at the defaults.
// And the outer corners' round and tension ("i also like the roundness how
// there's a bit of edge and drama to these corners").
// Where they start, and what the files are made at: Jonas's, 2026-10-12
// ("this is decent settings too for default"): the cuts flat (slope 0), the
// slot ends' corners rounded, the ceiling 44, the outer corners rounded 64
// at 60%, no tilt and no dip, the A a capital, Down filled.
export const START = { cut: 12, drop: 0, stem: 72, stroke: 20, space: 20, ceil: 44, height: H, rise: 0, outer: 64, tension: 0.6, tilt: 0, lock: 0, split: 0, a: 'A', dip: 0, downFit: 'fill', tips: 0, frame: 0, frameGap: 20, frameWidth: 20, slash: 0, slashWidth: 20, shift: 0, slashAt: 0, symbol: 'extended' };
const at = { ...START, per: PER.map((q) => ({ ...q })), lower: [0, 0, 0, 0, 0] };
const knob = (key, label, min, max, step, value, text, set) => ({ key, label, min, max, step, value, text, set: (v) => set(Number(v)) });
/** A switch between a few options (the page draws a button for each): [label, value]. */
const choice = (key, label, options, value) => ({ key, label, options, value, set: (v) => { at[key] = options.find(([, o]) => String(o) === String(v))?.[1] ?? value; } });
// More to get closer to CM.SUPPLY's latest (Jonas, 2026-10-12): the slots'
// width, the S's crossbar tilted into their long diagonal and its slot run
// through it, and the A or their a ("lets explore having both capital and
// lowercase a"), the a dipping under the baseline.
export const KNOBS = [
  knob('slope', 'Slope', 0, 20, 4, START.drop * 20, (v) => `${v} in 20`, (v) => { at.drop = DROPS.find((k) => Math.abs(k - v / 20) < 1e-9) ?? DROP; }),
  knob('cut', 'Cut round', 0, 20, 1, START.cut, (v) => `${v}`, (v) => { at.cut = v; }),
  knob('stem', 'Stem', BAR, 200, 4, START.stem, (v) => `${v}`, (v) => { at.stem = v; }),
  knob('slot', 'Slot', 8, 60, 4, START.stroke, (v) => `${v}`, (v) => { at.stroke = v; }),
  knob('space', 'Gap', 8, 80, 4, START.space, (v) => `${v}`, (v) => { at.space = v; }),
  knob('ceil', 'Ceiling', 16, 160, 4, START.ceil, (v) => `${v}`, (v) => { at.ceil = v; }),
  knob('height', 'Height', 240, 720, 8, START.height, (v) => `${v}`, (v) => { at.height = v; }),
  // The crossbars risen above the middle (the design panel, round 1,
  // 2026-10-12: an optical crossbar rise): the S's blade, the A's counter and
  // the H's crossbar move up together, the S's top counter the smaller
  // (geometry.js: block). Too short for the rise, the block grows.
  knob('rise', 'Rise', 0, 48, 4, START.rise, (v) => `${v}`, (v) => { at.rise = v; }),
  knob('outer', 'Round', 0, 64, 4, START.outer, (v) => `${v}`, (v) => { at.outer = v; }),
  knob('tension', 'Tension', 55, 100, 5, START.tension * 100, (v) => `${v}%`, (v) => { at.tension = v / 100; }),
  knob('tilt', 'Tilt', 0, 160, 4, START.tilt, (v) => `${v}`, (v) => { at.tilt = v; }),
  // One governing angle (the design panel, round 1, 2026-10-12): locked, every
  // S's crossbar falls at the cuts' slope, across its own width (geometry.js:
  // tiltOf), and the Tilt slider waits; free, the slider sets it.
  choice('lock', 'Angle', [['Free', 0], ['Locked', 1]], START.lock),
  knob('dip', 'Dip', 0, 24, 4, START.dip, (v) => `${v}`, (v) => { at.dip = v; }),
  choice('split', 'S', [['Whole', 0], ['Split', 1]], START.split),
  choice('a', 'A', [['A', 'A'], ['a', 'a']], START.a),
  choice('tips', 'Ends', [['One corner', 0], ['Both', 1]], START.tips),
  choice('frame', 'Frame', [['Off', 0], ['Around', 1], ['Fitted', 2]], START.frame),
  knob('frameGap', 'Frame gap', 0, 80, 4, START.frameGap, (v) => `${v}`, (v) => { at.frameGap = v; }),
  knob('frameWidth', 'Frame width', 4, 64, 4, START.frameWidth, (v) => `${v}`, (v) => { at.frameWidth = v; }),
  // The slash (the design panel, round 1, 2026-10-12): one straight kerf
  // through the wordmark along the S's blade, as wide as a slot to start; the
  // shift slides all below it right, a struck object (geometry.js: slash).
  // Sloped, through the S's blade it runs off the base before the H; through
  // the middle, the same slope crosses every letter (slashLine).
  choice('slash', 'Slash', [['Off', 0], ['On', 1]], START.slash),
  knob('slashWidth', 'Slash width', 8, 60, 4, START.slashWidth, (v) => `${v}`, (v) => { at.slashWidth = v; }),
  knob('shift', 'Shift', 0, 24, 4, START.shift, (v) => `${v}`, (v) => { at.shift = v; }),
  choice('slashAt', 'Slash at', [['S', 0], ['Middle', 1]], START.slashAt),
  choice('downFit', 'Down', [['M wider', 'wider'], ['Fill', 'fill'], ['Squeeze', 'squeeze']], START.downFit),
  // The S M built from the wordmark's own cells (the design panel, round 2,
  // 2026-10-13): its first S and an M squeezed to the S's width, the
  // wordmark's height, stems and gap, so a crop of it; the extended S M as it
  // was (geometry.js: symbolCells). The lockup and the favicons follow it.
  choice('symbol', 'Symbol', [['Extended', 'extended'], ['Cells', 'cells']], START.symbol),
  // Each letter's own switches (geometry.js: PER): a button where the letter has the setting.
  {
    key: 'per', label: 'Letters', letters: ['S', 'M', 'A', 'S', 'H'],
    rows: [['cut', 'Cut'], ['round', 'Round'], ['base', 'Base'], ['both', 'Both sides'], ['tilt', 'Tilt'], ['split', 'Split'], ['open', 'Open'], ['dip', 'Dip']],
    has: (row, i) => row in PER[i],
    on: (row, i) => !!at.per[i][row],
    set: (row, i, v) => { at.per[i][row] = v ? 1 : 0; },
    reset() { at.per = PER.map((q) => ({ ...q })); },
  },
  // Each letter's slot ends lowered past the ceiling (geometry.js: p.lower): a slider a letter, the H has none.
  {
    key: 'lower', label: 'Lower', each: ['S', 'M', 'A', 'S', 'H'], min: 0, max: 200, step: 4,
    has: (i) => i < 4,
    get: (i) => at.lower[i],
    set: (i, v) => { at.lower[i] = Number(v); },
    reset() { at.lower = [0, 0, 0, 0, 0]; },
  },
];

/** The marks' measures, as the sliders have them. */
const now = () => ({ ...SLANT, ...at });
const box = () => block(now());

// The frame (Jonas, 2026-10-12: "a border around SMASH and the SM wordmark
// that follows the border"), when it is on: round a mark w × h of path data
// d, its corners rounded from the same centres as the mark's (radii). The
// mark and its frame, { w, h, d }.
// Fitted ("the frame goes into the gaps", the red part in Jonas's drawing):
// where two letters' rounded corners meet, the frame fills the wedge they
// leave, keeping its gap from both; never between the letters.
// Slashed and shifted (markWith), the mark is as wide as its slid feet: the
// frame goes round that, whole, never cut or bent; the wedges at the base sit
// between the feet where they slid (base).
const FITTED = 2;
const upTo = (a, b) => Math.max(a, Math.ceil(b * 100) / 100);
function framed(w, h, d, radii, boxes, down = false, base = boxes) {
  if (!at.frame) return { w, h, d };
  const m = at.frameGap + at.frameWidth;
  let f = ring(w, h, at.frameGap, at.frameWidth, radii, at.tension);
  if (at.frame === FITTED && boxes) f += wedges(boxes, down ? w : h, at.frameGap, at.tension, down, base);
  return { w: Math.round((w + 2 * m) * 100) / 100, h: h + 2 * m, d: move(d, m, m) + move(f, m, m) };
}
const still = (f) => svg(f.w, f.h, path(f.d));

// The wordmark, with the A or the a as switched; and both, side by side (the
// page shows them in a row of their own). Either dips under the block, so its
// artboard does too.
const markWith = (a) => {
  const p = { ...now(), a: a ?? at.a }, b = block(p), h = b.H + depth(p);
  const spans = [[0, b.left(1)], [b.right(1), b.left(4)], [b.right(4), b.left(6)], [b.right(6), b.left(8)], [b.right(8), b.W]];
  const boxes = spans.map(([x0, x1], i) => ({ box: [x0, 0, x1, i === 2 ? h : b.H], radii: letterRadii(p, i) }));
  if (!p.slash) return framed(b.W, h, letters(p), wordRadii(p), boxes);
  const S = slash(p), d = S.paths.join(''); // the wordmark alone is slashed: not Down, not the S M
  if (!S.shift) return framed(b.W, h, d, wordRadii(p), boxes);
  // Shifted: the artboard as wide as the feet that slid; each letter's corners where its parts went
  // (a point inside each, in from its round).
  const into = (x, y, r, dx, dy) => [x + dx * (0.4 * r + 1), y + dy * (0.4 * r + 1)];
  const slid = (side) => boxes.map(({ box: [x0, y0, x1, y1], radii }) => {
    const y = side ? y1 : y0, dy = side ? -1 : 1, [rl, rr] = side ? [radii[3], radii[2]] : [radii[0], radii[1]];
    return { box: [x0 + S.at(into(x0, y, rl, 1, dy)), y0, x1 + S.at(into(x1, y, rr, -1, dy)), y1], radii };
  });
  return framed(upTo(b.W, extent(d)[2]), h, d, wordRadii(p), slid(0), false, slid(1));
};
const wordmarkWith = (a) => still(markWith(a));
const mark = () => letters(now());
export const wordmark = () => wordmarkWith();
export const wordmarkCapital = () => wordmarkWith('A');
export const wordmarkLower = () => wordmarkWith('a');
export const VERSIONS = [['wordmarkCapital', 'Capital A'], ['wordmarkLower', 'Lowercase a']];

// SMASH written down (Jonas, 2026-10-12: "the DOWN looks pretty good, but
// lets assume no dip"): the letters in a column, each as wide as an S.
export const down = () => {
  const p = now(), D = downPath(p), S = D.boxes[0], Hh = D.boxes[4];
  return still(framed(D.w, D.h, D.d, [S.radii[0], S.radii[1], Hh.radii[2], Hh.radii[3]], D.boxes, true)); // the first S's top corners, the H's feet
};

// The S M and the S alone, as the original's, their stems and slots as the wordmark's.
const cols = () => symCols(at.stem, at.stroke, at.space);
const rows = () => symRows(at.stroke);
const symW = () => cols().reduce((t, n) => t + n);
const symH = () => rows().reduce((t, n) => t + n);
// The S M's S and the S alone carry the wordmark's blade (the design panel,
// round 1, 2026-10-12): the first S's tilt and split, as its switches have
// them, at the same angle; their slots already open, as the S M's.
// Locked, they fall at their own cuts' slope instead, as the wordmark's S's.
const blade = () => ({ tilt: at.per[0].tilt ? at.tilt : 0, lock: at.per[0].tilt ? at.lock : 0, split: at.per[0].split ? at.split : 0 });
// Cells (symbolCells): the S M from the wordmark's first S and its M squeezed to it, at the sliders' measures.
const cells = () => (at.symbol === 'cells' ? symbolCells(now()) : null);
const sym = () => symbolPath({ cols: cols(), rows: rows(), cut: at.cut, tips: at.tips, drop: at.drop, outer: at.outer, tension: at.tension, ...blade() });
export const symbol = () => {
  const C = cells();
  if (C) {
    const [S, M] = C.boxes;
    return still(framed(C.w, C.h, C.d, [S.radii[0], M.radii[1], M.radii[2], S.radii[3]], C.boxes)); // the S's left corners, the M's right
  }
  const c = cols(), [R] = symRadii(at.outer, c, rows()), sw = c[0] + c[1] + c[2];
  const boxes = [{ box: [0, 0, sw, symH()], radii: [R, R, R, R] }, { box: [sw + c[3], 0, symW(), symH()], radii: [R, R, 0, 0] }]; // the S, the M
  return still(framed(symW(), symH(), sym(), symRadii(at.outer, c, rows()), boxes));
};
const alone = (o) => { const S = letterS({ ...o, cut: at.cut, tips: at.tips, drop: at.drop, stem: at.stem, slot: at.stroke, outer: at.outer, tension: at.tension, ...blade() }); return svg(S.w, S.h, path(S.d)); };
export const s = () => alone({});
export const sTurned = () => alone({ turn: true });
export const sSquare = () => alone({ wide: 1 });

// The lockups, as the original's: three lines whose capitals fill the mark's
// three solid bands, a pitch after it.
const CAP = 32;
export function lockup() {
  const b = box();
  const L = lockPaths([['studio', b.bands[1]], ['middle', b.bands[3]], ['stockholm', b.H]], CAP, b.W + PITCH);
  return svg(L.width, b.H + depth(now()), path(mark()) + path(L.d, 'nonzero'));
}
export function lockupSM() {
  const C = cells();
  if (C) { // its lines in the wordmark's bands, as the lockup's
    const L = lockPaths([['name', C.bands[1]], ['studio', C.bands[3]], ['stockholm', C.h]], CAP, C.w + PITCH);
    return svg(L.width, C.h, path(C.d) + path(L.d, 'nonzero'));
  }
  const r = rows(), bars = [r[0], r[0] + r[1] + r[2], symH()];
  const L = lockPaths([['name', bars[0]], ['studio', bars[1]], ['stockholm', bars[2]]], r[0], symW() + PITCH);
  return svg(L.width, symH(), path(sym()) + path(L.d, 'nonzero'));
}

/** The S M's slots and its gap, as [left, width]. */
const symColumns = () => cols().reduce((o, n, i, a) => (i % 2 ? [...o, [a.slice(0, i).reduce((t, m) => t + m, 0), n]] : o), []);

/** Each still's grid (grid.js), at the sliders' measures: its box, bands, stems and slots, and where its type starts. */
export function gridOf(kind) {
  if (at.frame && ['wordmark', 'symbol', 'down'].includes(kind)) return false; // framed, the mark moves in its artboard: no grid
  if (at.slash && at.shift && kind === 'wordmark') return false; // slid along its slash, the wordmark leaves the grid
  const b = box(), w = symW(), h = symH(), bar = at.stem, slot = at.stroke;
  const bands5 = rows().reduce((e, n) => [...e, e.at(-1) + n], [0]);
  const sw = 2 * bar + slot, C = cells();
  const sm = C ? { w: C.w, h: C.h, bands: C.bands, bar, slot, columns: C.columns } : { w, h, bands: bands5, bar, slot, columns: symColumns() };
  return {
    wordmark: { w: b.W, h: b.H, bands: b.bands, bar, slot, columns: b.columns },
    lockup: { w: b.W, h: b.H, bands: b.bands, type: b.W + PITCH, bar, slot, columns: b.columns },
    symbol: sm,
    lockupSM: { ...sm, type: sm.w + PITCH },
    s: { w: sw, h, bands: bands5, bar, slot },
    sTurned: { w: h, h: sw, bands: bands5, turn: true, bar, slot },
    sSquare: { w: sw + bar + slot, h, bands: bands5, bar, slot },
  }[kind];
}

// Favicons: the S M at the original's measures (bars 8, 4 and 2 px; slots half
// that), centred. Its cuts are diagonals, so it is drawn smooth, not on pixels.
const FAV = { 64: 8, 32: 4, 16: 2 };
export function favicon({ size = 32 } = {}) {
  const n = FAV[size] ? size : 32;
  // Cells: that S M built again at favicon measures, on whole pixels (the design panel's review, round 2,
  // 2026-10-13: scaled down from the wordmark's, its slots were 0.59 px at 16, grey smears). Its stems a bar
  // (8, 4 and 2 px, as the extended's), its slots and its gap half that, 7 in 8 of the icon tall; its ceiling,
  // rise and lowered ends the wordmark's share of its height, to the pixel at 16; its cut rounds, corners and
  // tilt the same share of its slots, stems and S. Its switches, slope and angle the symbol's, its cuts off the
  // grid (its slots of 16 would round them to it). Where the ceiling and the rise leave a held S no room, they
  // give way, the ceiling first.
  if (at.symbol === 'cells') {
    const k = FAV[n] / BAR, px = BAR / 2, tall = 7 * BAR; // its scale; 16 px of it, a pixel at 16; 7 in 8 of the icon
    const H = box().H, snap = (v) => Math.round((v * tall) / H / px) * px;
    let ceil = Math.max(px, snap(at.ceil)), rise = snap(at.rise), C;
    const make = () => symbolCells({ ...now(), stem: BAR, stroke: px, space: px, height: tall, ceil, rise, grid: 0, cut: (at.cut * px) / at.stroke, outer: (at.outer * BAR) / at.stem, tilt: (at.tilt * (2 * BAR + px)) / (2 * at.stem + at.stroke), lower: at.lower.map(snap) });
    while ((C = make()).h > tall && (ceil > px || rise > 0)) ceil > px ? (ceil -= px) : (rise -= px);
    const x = Math.floor((n - C.w * k) / 2), y = Math.floor((n - C.h * k) / 2);
    return svg(n, n, `<rect width="${n}" height="${n}" fill="${BLACK}"/><path fill="${WHITE}" fill-rule="evenodd" d="${move(C.d, x, y, k)}"/>`);
  }
  const bar = FAV[n];
  const sl = bar / 2;
  const cols = [bar, sl, bar, sl, bar, sl, bar, sl, bar];
  const rows = [bar, sl, bar, sl, bar];
  // Its S's crossbar falls at the wordmark S's angle: tilt across that S's width, scaled to this one's.
  // Locked, at its own cuts' slope.
  const { tilt, lock, split } = blade(), fall = (tilt * (2 * bar + sl)) / (2 * at.stem + at.stroke);
  const d = symbolPath({ cols, rows, x: (n - (5 * bar + 4 * sl)) / 2, y: (n - (3 * bar + 2 * sl)) / 2, stop: bar, tips: at.tips, cut: (at.cut * bar) / BAR, drop: at.drop, outer: (at.outer * bar) / BAR, tension: at.tension, grid: 0, tilt: fall, lock, split, room: (8 * bar) / BAR });
  return svg(n, n, `<rect width="${n}" height="${n}" fill="${BLACK}"/><path fill="${WHITE}" fill-rule="evenodd" d="${d}"/>`);
}

// The stage: the wordmark, white on black, held (no motion yet).
function draw(ctx, w, h) {
  ctx.fillStyle = BLACK;
  ctx.fillRect(0, 0, w, h);
  const { w: W, h: H, d } = markWith();
  const k = Math.min((h * 0.64) / H, (w * 0.8) / W);
  ctx.save();
  ctx.translate((w - W * k) / 2, (h - H * k) / 2);
  ctx.scale(k, k);
  ctx.fillStyle = WHITE;
  ctx.fill(new Path2D(d), 'evenodd');
  ctx.restore();
}

export function motion(el) {
  const stage = canvasStage(el);
  const tl = timeline({ duration: 10, render: () => draw(stage.ctx, stage.width, stage.height) });
  stage.onResize(() => tl.redraw());
  tl.ready = Promise.resolve();
  return withCleanup(tl, stage.destroy);
}
