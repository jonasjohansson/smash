// The sequence: the SMASH logo taken down, one move at a time, to a square, and
// round again. The logo, framed like a stamp; the modular mark (the outline
// erased, the S's slots run off the edges, the A's counter raised, the bands
// squashed to five); the S M; the S; the square in the S's bottom left corner,
// a bar by a bar, the module it is all built from. Then round: the square is
// the logo's block, seen close (filling the screen they are the same height);
// it widens to the logo's proportions, the logo appears through it as its
// slots open, and the outline is drawn back on. A loop, one way round.
//
// One drawing all the way: the modular mark's geometry (../modular.js), with
// its measures between the logo's and its own. With its top and bottom bands
// tall (199.61) and its closed ends a bar in, it is the logo (mark.js, within
// a tenth of a unit); the crops are its own (the S M ends on the M's right
// stem, the S before the slot after it, the square under the S's lower slot
// and left of its bend).
//
// Click or space pauses; the arrows step from one to the next; i inverts; s
// (or the speaker) turns the sound on, each move's own (sound.js); p switches
// to the punchy version and back (?punchy; ?calm is the slow one).
// ?t=0.5 seeks (a share of the loop) and pauses; ?at=2 holds one of the states.

import { MODULAR_DEFAULTS as M } from '../modular.js';
import { createSound } from './sound.js';

const B = M.bar; // 31.78
const S = M.slot; // 20
const PITCH = B + S; // 51.78
const c = (i) => B + S / 2 + i * PITCH; // a slot column's centre
const CLOSED = B + S / 2; // a closed end's centre: a bar in from the edge (41.78), the logo's and the M's
const OUT = PITCH * 2; // how far an open slot runs on past the edge
const TALL = (471 - 2 * S - B) / 2; // the logo's top and bottom bands (its height is 471): 199.61
const FRAME = { gap: S, width: S }; // the stamp's outline: a slot off the block, a slot wide

const MODULAR = { stem: M.stem, openTop: 1, openBot: 1, counter: M.counter, w: 10 * S + 11 * B, top: 0, slot: 1, frame: 0 };
const FOOT = M.stem + 2 * S + B; // where the bottom band starts: the crop to the square and to the strip
const STATES = [
  { ...MODULAR, stem: TALL, openTop: 0, openBot: 0, counter: CLOSED, frame: 1 }, // the logo, as a stamp
  MODULAR, // the modular mark
  { ...MODULAR, w: c(4) - S / 2 }, // the S M: 238.9
  { ...MODULAR, w: c(1) - S / 2 }, // the S: 83.56
  { ...MODULAR, w: B }, // the S's left stem over its corner square, a slot between: an exclamation mark
  { ...MODULAR, w: B, top: FOOT }, // the square in the S's bottom left corner: 31.78 × 31.78
  // The same square, as the logo's block cropped square with its slots closed (471 × 471): filling the screen,
  // it looks just the same, so the change is unseen, and the logo can grow out of it.
  { ...MODULAR, stem: TALL, counter: CLOSED, openTop: 0, openBot: 0, w: 471, slot: 0 },
  { ...MODULAR, stem: TALL, counter: CLOSED, openTop: 0, openBot: 0, slot: 0 }, // the logo's block, solid
  { ...MODULAR, stem: TALL, counter: CLOSED, openTop: 0, openBot: 0 }, // the logo, its slots open, no outline yet
];

// Three versions: snappy (the default); punchy (?punchy, or p), the same with
// overshoots and bounce; calm (?calm), slow and smooth.
const params0 = new URLSearchParams(location.search);
const VERSION = params0.has('punchy') ? 'punchy' : params0.has('calm') ? 'calm' : 'snappy';
const PUNCHY = VERSION === 'punchy';

/** A damped spring from 0 to 1: damping z, stiffness w (per the move's length). */
const spring = (z, w) => (u) => { const r = Math.sqrt(1 - z * z); return 1 - Math.exp(-z * w * u) * (Math.cos(w * r * u) + (z / r) * Math.sin(w * r * u)); };
/** Lands past its mark and comes back to it (an ease-out-back; c sets how far). */
const back = (c) => (u) => 1 + (c + 1) * (u - 1) ** 3 + c * (u - 1) ** 2;
/** In and out: slow off, fast through, slow to rest (the power sets how hard). */
const inOut = (k) => (u) => (u < 0.5 ? 2 ** (k - 1) * u ** k : 1 - (-2 * u + 2) ** k / 2);
const expo = (k) => (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u < 0.5 ? 2 ** (2 * k * u - k) / 2 : (2 - 2 ** (-2 * k * u + k)) / 2);

// The feel of a move, per version: how it gets going and how it lands.
//   draw: the stamp's outline, erased along itself and drawn back on
//   sweep: a crop, decisive
//   snap: a slot's end, all but still and then at once
//   land: the counter, a touch past its mark and back
//   spring: the bands, there, giving a little, settling
//   follow: the camera, a softer spring
const FEELS = {
  calm: { draw: inOut(3), sweep: inOut(4), snap: expo(10), land: back(1.4), spring: spring(0.7, 11), follow: spring(0.82, 9) },
  snappy: { draw: inOut(4), sweep: inOut(5), snap: expo(13), land: back(1.8), spring: spring(0.66, 13), follow: spring(0.78, 11) },
  punchy: { draw: (u) => 1 - (1 - u) ** 5, sweep: inOut(5), snap: expo(15), land: back(2.6), spring: spring(0.6, 15), follow: spring(0.6, 13) },
};
const EASE = FEELS[VERSION];

// From each to the next, one thing at a time, each its own move: [what, seconds (calm), feel, the breath after it].
// The outline is erased; the S's slots break out at the top, then at the bottom;
// the counter rises; the bands squash about the middle; a crop across, then down;
// and only then the camera, to frame what is left. Round again: the square
// widens to the logo's block, its slots open through it, the camera makes room
// and the outline is drawn on.
const CALM = [
  [['frame', 1.6, 'draw', 0.45], ['openTop', 0.5, 'snap'], ['openBot', 0.5, 'snap'], ['counter', 0.6, 'land'], ['stem', 1.2, 'spring'], ['cam', 1.1, 'follow']],
  [['w', 1, 'sweep'], ['cam', 1.1, 'follow']],
  [['w', 0.85, 'sweep'], ['cam', 1.1, 'follow']],
  [['w', 0.7, 'sweep'], ['cam', 1.1, 'follow']],
  [['top', 0.7, 'sweep'], ['cam', 1.1, 'follow']],
  [], // unseen: the square becomes the logo's block
  [['w', 0.9, 'sweep'], ['cam', 1.1, 'follow']],
  [['slot', 1.1, 'sweep']],
  [['cam', 1, 'follow'], ['frame', 1.6, 'draw', 0.3]],
];
const CALM_HOLD = [1.7, 1.2, 1.2, 1.1, 1.6, 1.3, 0, 0.5, 0.7]; // seconds on each; the ! a little longer
// How much quicker each version is than calm: [moves, the outline, holds, breaths].
const PACE = { calm: [1, 1, 1, 1], snappy: [0.5, 0.6, 0.72, 0.55], punchy: [0.42, 0.55, 0.62, 0.45] }[VERSION];
const STEPS = CALM.map((steps) => steps.map(([key, d, feel, beat]) => [key, +(d * PACE[key === 'frame' ? 1 : 0]).toFixed(3), feel, beat === undefined ? undefined : beat * PACE[3]]));
const HOLD = CALM_HOLD.map((h, i) => (i === 4 ? h * Math.max(0.85, PACE[2]) : h * PACE[2])); // the ! keeps its moment
const BEAT = 0.12 * PACE[3]; // a breath after each move, before the next

const f = (n) => +n.toFixed(2);
const mix = (a, b, v) => a + (b - a) * v;

/** What the camera frames for measures q: its drawing's box, with room round it. */
function fit(q) {
  const [x0, y0, x1, y1] = draw(q).box;
  const pad = Math.max(x1 - x0, y1 - y0) * 0.14;
  return [x0 - pad, y0 - pad, x1 + pad, y1 + pad];
}

// The loop: from the logo to the square and round to the logo again, a step at a time.
const SEGMENTS = [];
// A move: its easing (feel), and the kind of move it is, for its sound (kind: the calm name).
const move = (i, k) => { const [key, d, feel, beat = BEAT] = STEPS[i][k]; return { from: i, k, key, dir: 1, move: d, feel, kind: feel, d: d + beat }; };
for (let i = 0; i < STATES.length; i++) {
  if (HOLD[i]) SEGMENTS.push({ hold: i, d: HOLD[i] });
  STEPS[i].forEach((_, k) => SEGMENTS.push(move(i, k)));
}
let acc = 0;
for (const s of SEGMENTS) { s.t0 = acc; acc += s.d; }
const PERIOD = acc;

/** The segment (a hold or a move) at time t. */
function segmentAt(t) {
  t = ((t % PERIOD) + PERIOD) % PERIOD;
  return SEGMENTS.findLast((x) => x.t0 <= t) ?? SEGMENTS[0];
}

/**
 * The measures and the camera at time t (seconds). In a move from state i to
 * the next (the last to the first), the steps before this one are done, this
 * one is under way, and those after have not begun; the camera stays on the
 * first state's frame until its own step.
 */
function stateAt(t) {
  t = ((t % PERIOD) + PERIOD) % PERIOD;
  const s = segmentAt(t);
  if (s.hold !== undefined) return { q: STATES[s.hold], box: fit(STATES[s.hold]) };
  const a = STATES[s.from], b = STATES[(s.from + 1) % STATES.length];
  const u = Math.min(1, (t - s.t0) / s.move);
  const v = EASE[s.feel](u);
  const q = { ...a, erasing: b.frame < a.frame };
  let cam = 0;
  STEPS[s.from].forEach(([key], k) => {
    const w = k < s.k ? 1 : k === s.k ? v : 0;
    if (key === 'cam') cam = w;
    else q[key] = mix(a[key], b[key], w);
  });
  const A = fit(a), Bx = fit(b);
  return { q, box: A.map((x, i) => mix(x, Bx[i], cam)) };
}

/** A polyline as a path, each bend filleted at radius r (as modular.js). */
function filleted(points, r) {
  let d = `M${f(points[0][0])} ${f(points[0][1])}`;
  for (let i = 1; i < points.length - 1; i++) {
    const [ax, ay] = points[i - 1];
    const [bx, by] = points[i];
    const [cx, cy] = points[i + 1];
    const l1 = Math.hypot(bx - ax, by - ay);
    const l2 = Math.hypot(cx - bx, cy - by);
    const k = Math.min(r, l1 / 2, l2 / 2);
    if (k <= 0.01) { d += `L${f(bx)} ${f(by)}`; continue; }
    const p1 = [bx - ((bx - ax) / l1) * k, by - ((by - ay) / l1) * k];
    const p2 = [bx + ((cx - bx) / l2) * k, by + ((cy - by) / l2) * k];
    const sweep = (bx - ax) * (cy - by) - (by - ay) * (cx - bx) > 0 ? 1 : 0;
    d += `L${f(p1[0])} ${f(p1[1])}A${f(k)} ${f(k)} 0 0 ${sweep} ${f(p2[0])} ${f(p2[1])}`;
  }
  const last = points.at(-1);
  return d + `L${f(last[0])} ${f(last[1])}`;
}

/**
 * The slots for measures q, as modular.js lays them out through the whole
 * word, with the logo's closed S ends and counter in between: each a centre
 * line, and where it has a round (closed) end.
 */
function slots(q) {
  const h = 2 * q.stem + 2 * S + B;
  const y2 = q.stem + S, y3 = q.stem + S + B;
  const up = q.stem + S / 2, lo = q.stem + S + B + S / 2; // the two crossbars' slots
  const top = CLOSED + (-OUT - CLOSED) * q.openTop; // the S's upper slot: closed a bar in, or run off the top
  const bot = h - CLOSED + (OUT + CLOSED) * q.openBot; // its lower one, off the bottom
  const full = (i) => ({ pts: [[c(i), -OUT], [c(i), h + OUT]] });
  return { h, list: [
    { pts: [[c(0), top], [c(0), up], [c(1), up]], a: true }, // S
    { pts: [[-OUT, lo], [c(0), lo], [c(0), bot]], b: true },
    full(1),
    { pts: [[c(2), CLOSED], [c(2), h + OUT]], a: true }, // M
    { pts: [[c(3), CLOSED], [c(3), h + OUT]], a: true },
    full(4),
    { pts: [[c(5), Math.min(q.counter, y2 - S / 2)], [c(5), y2]], a: true }, // A: the counter, stopping on the crossbar
    { pts: [[c(5), y3], [c(5), h + OUT]] },
    full(6),
    { pts: [[c(7), top], [c(7), up], [c(8), up]], a: true }, // S
    { pts: [[c(6), lo], [c(7), lo], [c(7), bot]], b: true },
    full(8),
    { pts: [[c(9), -OUT], [c(9), y2]] }, // H
    { pts: [[c(9), y3], [c(9), h + OUT]] },
  ] };
}

/**
 * The mark for measures q, as the inside of an SVG: the block (cropped to w
 * across, from top down) less its slots, and the stamp's frame; its middle
 * held at y 0, so the bands squash about it. Returns { svg, box }.
 */
function draw(q) {
  const { h, list } = slots(q);
  const w = q.w;
  const top = q.top ?? 0;
  const sw = S * q.slot;
  let cuts = '';
  if (sw > 0.05) {
    const paths = list.map((s) => `<path d="${filleted(s.pts, M.bend)}"/>`).join('');
    const dots = list.flatMap((s) => [s.a && s.pts[0], s.b && s.pts.at(-1)].filter(Boolean))
      .map(([x, y]) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(sw / 2)}"/>`).join('');
    cuts = `<g fill="none" stroke="#000" stroke-width="${f(sw)}" stroke-linecap="butt" stroke-linejoin="round">${paths}</g><g fill="#000">${dots}</g>`;
  }
  const m = OUT + FRAME.gap + FRAME.width;
  let svg = `<defs><mask id="seq-m" maskUnits="userSpaceOnUse" x="${-m}" y="${-m}" width="${f(w + 2 * m)}" height="${f(h + 2 * m)}">`
    + `<rect y="${f(top)}" width="${f(w)}" height="${f(h - top)}" fill="#fff"/>${cuts}</mask></defs>`
    + `<rect y="${f(top)}" width="${f(w)}" height="${f(h - top)}" fill="currentColor" mask="url(#seq-m)"/>`;
  if (q.frame > 0.001) {
    // The stamp's outline, drawn from its top left corner round clockwise: erased back along itself as frame falls.
    // Its ends are square, so where it starts and ends, in that corner, the corner is whole; drawn in full, no dash at all.
    const o = FRAME.gap + FRAME.width / 2; // its centre line, off the block
    const L = 2 * (w + 2 * o) + 2 * (h + 2 * o);
    const drawn = Math.min(1, Math.max(0, q.frame)) * L;
    // Clockwise both ways: erased from its start on round (what is left is its end), drawn from its start on round.
    const dash = drawn >= L - 0.01 ? '' : ` stroke-dasharray="${f(drawn)} ${f(L + 1)}" stroke-linecap="square"${q.erasing ? ` stroke-dashoffset="${f(drawn - L)}"` : ''}`;
    svg += `<path d="M${f(-o)} ${f(-o)}H${f(w + o)}V${f(h + o)}H${f(-o)}Z" fill="none" stroke="currentColor" stroke-width="${f(FRAME.width)}" stroke-linejoin="miter"${dash}/>`;
  }
  // What the camera frames: the block, and the frame while it is there.
  const reach = (FRAME.gap + FRAME.width) * Math.min(1, q.frame * 3);
  const dy = -h / 2;
  return { svg: `<g transform="translate(0 ${f(dy)})">${svg}</g>`, box: [-reach, top + dy - reach, w + reach, h + dy + reach] };
}

const viewBox = ([x0, y0, x1, y1]) => `${f(x0)} ${f(y0)} ${f(x1 - x0)} ${f(y1 - y0)}`;

/** The whole frame at time t as an SVG string: the camera's view of the mark, in currentColor, no ground. */
function svgAt(t) {
  const { q, box } = stateAt(t);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox(box)}" preserveAspectRatio="xMidYMid meet">${draw(q).svg}</svg>`;
}

/** One loop's sound, rendered offline: an AudioBuffer, each move's sound at its own time. */
async function loopSound(rate = 48000) {
  const ctx = new OfflineAudioContext(2, Math.ceil(PERIOD * rate), rate);
  const s = createSound({ context: ctx });
  await s.start();
  for (const seg of SEGMENTS) if (seg.key) s.play({ feel: seg.kind, ease: EASE[seg.feel], d: seg.move, dir: seg.dir, key: seg.key }, seg.t0);
  return ctx.startRendering();
}

// ---------------------------------------------------------------------------
// The page

const el = document.querySelector('.mark');
const play = document.querySelector('.play');
const scrub = document.querySelector('.scrub');
const params = new URLSearchParams(location.search);
const at = params.has('at') ? Math.max(0, Math.min(STATES.length - 1, Number(params.get('at')) || 0)) : null;
let t = params.has('t') ? (Number(params.get('t')) || 0) * PERIOD : at !== null ? (SEGMENTS.find((s) => s.hold === at) ?? SEGMENTS.find((s) => s.from === at)).t0 : 0;
let paused = params.has('t') || at !== null || matchMedia('(prefers-reduced-motion: reduce)').matches;
let last = null;

function render() {
  const { q, box } = stateAt(t);
  el.setAttribute('viewBox', viewBox(box));
  el.innerHTML = draw(q).svg;
  scrub.value = String(Math.round((((t % PERIOD) + PERIOD) % PERIOD) / PERIOD * 1000));
}

// The sound of each move, started as the move starts (only while it plays on its own, not when scrubbed).
const sound = createSound();
const speaker = document.querySelector('.sound');
let soundOn = false;
let current = null;
function listen() {
  const seg = segmentAt(t);
  if (seg === current) return;
  current = seg;
  const into = (((t % PERIOD) + PERIOD) % PERIOD) - seg.t0;
  if (!paused && soundOn && seg.key && into < 0.1) sound.play({ feel: seg.kind, ease: EASE[seg.feel], d: seg.move, dir: seg.dir, key: seg.key });
}
function setSound(on) {
  soundOn = on;
  speaker.toggleAttribute('data-on', on);
  if (on) sound.start(); else sound.stop();
}

function frame(now) {
  if (last !== null && !paused) t += (now - last) / 1000;
  last = now;
  listen();
  render();
  requestAnimationFrame(frame);
}

function setPaused(p) {
  paused = p;
  play.toggleAttribute('data-paused', p);
}

/** The start of the next (or previous) hold. */
function step(dir) {
  const now = ((t % PERIOD) + PERIOD) % PERIOD;
  const holds = SEGMENTS.filter((s) => s.hold !== undefined).map((s) => s.t0);
  const next = dir > 0 ? holds.find((h) => h > now + 0.01) ?? holds[0] + PERIOD : holds.findLast((h) => h < now - 0.01) ?? holds.at(-1) - PERIOD;
  t = next;
}

play.addEventListener('click', () => setPaused(!paused));
el.addEventListener('click', () => setPaused(!paused));
scrub.addEventListener('input', () => { t = (Number(scrub.value) / 1000) * PERIOD; setPaused(true); });
document.querySelector('.invert').addEventListener('click', () => document.documentElement.toggleAttribute('data-paper'));
speaker.addEventListener('click', () => setSound(!soundOn));
// The download: this version, in these colours, made into an MP4 here and now (export.js), a ring filling as it goes.
const dl = document.querySelector('.download');
const ring = dl.querySelector('.i-ring');
dl.addEventListener('click', async () => {
  if (dl.hasAttribute('data-busy')) return;
  dl.setAttribute('data-busy', '');
  const paperOn = document.documentElement.hasAttribute('data-paper');
  const [ink, paper] = paperOn ? ['#000', '#fff'] : ['#fff', '#000'];
  try {
    const { renderVideo } = await import('./export.js');
    const blob = await renderVideo({ period: PERIOD, svgAt, sound: loopSound, ink, paper, onProgress: (p) => ring.setAttribute('stroke-dasharray', `${Math.round(p * 100)} 100`) });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `smash-sequence${VERSION === 'snappy' ? '' : `-${VERSION}`}${paperOn ? '-paper' : ''}.mp4` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  } catch (e) {
    console.error('[sequence] the video could not be made', e);
  } finally {
    dl.removeAttribute('data-busy');
    ring.setAttribute('stroke-dasharray', '0 100');
  }
});
addEventListener('keydown', (e) => {
  if (e.target.closest?.('input')) return;
  if (e.key === ' ') { e.preventDefault(); setPaused(!paused); }
  else if (e.key === 'ArrowRight') step(1);
  else if (e.key === 'ArrowLeft') step(-1);
  else if (e.key === 'i') document.documentElement.toggleAttribute('data-paper');
  else if (e.key === 's') setSound(!soundOn);
  else if (e.key === 'p') { const u = new URL(location.href); if (PUNCHY) u.searchParams.delete('punchy'); else u.searchParams.set('punchy', ''); location.href = u.href; }
});
if (params.has('paper')) document.documentElement.setAttribute('data-paper', '');

setPaused(paused);
render();
requestAnimationFrame(frame);
document.documentElement.dataset.ready = '1';

// For scripts: the measures and the drawing at any state or time.
window.__sequence = { STATES, PERIOD, SEGMENTS, EASE, stateAt, draw, seek(s) { t = s; setPaused(true); render(); } };
