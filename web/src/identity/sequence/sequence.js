// The sequence: the SMASH logo taken down, one move at a time, to a square, and
// round again. The logo, square; the modular mark (the S's slots run off the
// edges, the A's counter raised, the bands squashed to five); the S M; the S;
// the ! (the S cropped to a bar: its stem over its corner square); the square
// in the S's bottom left corner, a bar by a bar, the module it is all built
// from. Then round: filling the screen, that square is the logo's block, seen
// close; the logo appears through it as its slots open. A loop, one way round.
//
// One drawing all the way: the modular mark's geometry (../modular.js), with
// its measures between the logo's and its own. With its top and bottom bands
// tall (238.9) and its closed ends a bar in, it is the logo, drawn square
// (549.58 × 549.58) so that it and the square are one shape; the crops are
// the modular mark's own (the S M ends on the M's right stem, the S before the
// slot after it, the square under the S's lower slot and left of its bend).
//
// Everything keeps time: the moves and the holds are counted in sixteenths
// of a beat (120 a minute by default), so each move, and each sound, lands on
// the grid, and the loop is eight bars. One thing moves at a time; the
// camera moves on its own, after.
//
// Click or space pauses; the arrows step from one to the next; i inverts; s
// (or the speaker) turns the sound on (sound.js); p switches to the punchy
// version and back (?punchy; ?calm is the slow one). ?t=0.5 seeks (a share of
// the loop) and pauses; ?at=2 holds one of the states.

import { MODULAR_DEFAULTS as M } from '../modular.js';
import { createSound } from './sound.js';

const B = M.bar; // 31.78
const S = M.slot; // 20
const PITCH = B + S; // 51.78
const W = 10 * S + 11 * B; // the word's width: 549.58
const c = (i) => B + S / 2 + i * PITCH; // a slot column's centre
const CLOSED = B + S / 2; // a closed end's centre: a bar in from the edge (41.78), the logo's and the M's
const OUT = PITCH * 2; // how far an open slot runs on past the edge
const SQUARE = (W - 2 * S - B) / 2; // the logo's top and bottom bands, drawn square: 238.9
const FOOT = M.stem + 2 * S + B; // where the modular mark's bottom band starts: 103.56

const LOGO = { stem: SQUARE, openTop: 0, openBot: 0, counter: CLOSED, w: W, top: 0, slot: 1 };
const MODULAR = { ...LOGO, stem: M.stem, openTop: 1, openBot: 1, counter: M.counter };
const STATES = [
  LOGO, // the logo
  MODULAR, // the modular mark
  { ...MODULAR, w: c(4) - S / 2 }, // the S M: 238.9
  { ...MODULAR, w: c(1) - S / 2 }, // the S: 83.56
  { ...MODULAR, w: B }, // the S's stem over its corner square, a slot between: an exclamation mark
  { ...MODULAR, w: B, top: FOOT }, // the square in the S's bottom left corner: 31.78 × 31.78
  // The same square, as the logo's block with its slots closed: filling the screen it looks just the same, so the
  // change is unseen, and the logo appears through it.
  { ...LOGO, slot: 0 },
];

// Three versions: snappy (the default), punchy (?punchy, or p) with overshoot
// and bounce, calm (?calm), slow and smooth. Each keeps its own tempo.
const query = new URLSearchParams(location.search);
const VERSION = query.has('punchy') ? 'punchy' : query.has('calm') ? 'calm' : 'snappy';
const PUNCHY = VERSION === 'punchy';
const TEMPO = { snappy: 120, punchy: 132, calm: 84 }[VERSION]; // beats a minute
const UNIT = 60 / TEMPO / 4; // a sixteenth, in seconds

/** A damped spring from 0 to 1: damping z, stiffness w (per the move's length). */
const spring = (z, w) => (u) => { const r = Math.sqrt(1 - z * z); return 1 - Math.exp(-z * w * u) * (Math.cos(w * r * u) + (z / r) * Math.sin(w * r * u)); };
/** Lands past its mark and comes back to it (an ease-out-back; c sets how far). */
const back = (k) => (u) => 1 + (k + 1) * (u - 1) ** 3 + k * (u - 1) ** 2;
/** Winds up a touch the other way, goes, overshoots a touch, settles (an ease-in-out-back). */
const windup = (k) => { const k2 = k * 1.525; return (u) => (u < 0.5 ? ((2 * u) ** 2 * ((k2 + 1) * 2 * u - k2)) / 2 : ((2 * u - 2) ** 2 * ((k2 + 1) * (2 * u - 2) + k2) + 2) / 2); };
/** In and out: slow off, fast through, slow to rest (the power sets how hard). */
const inOut = (k) => (u) => (u < 0.5 ? 2 ** (k - 1) * u ** k : 1 - (-2 * u + 2) ** k / 2);
const expo = (k) => (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u < 0.5 ? 2 ** (2 * k * u - k) / 2 : (2 - 2 ** (-2 * k * u + k)) / 2);

// The feel of a move, per version: how it gets going and how it lands.
//   snap: a slot's end breaking out, all but still and then at once
//   land: the counter rising, a touch past its mark and back
//   spring: the bands squashing, there, giving a little, settling
//   sweep: a crop, a breath back first, then decisive
//   follow: the camera, a softer spring
//   reveal: the slots opening through the block, the logo appearing
const FEELS = {
  calm: { snap: expo(10), land: back(1.4), spring: spring(0.7, 11), sweep: windup(0.3), follow: spring(0.82, 9), reveal: spring(0.78, 10) },
  snappy: { snap: expo(13), land: back(1.9), spring: spring(0.62, 13), sweep: windup(0.55), follow: spring(0.76, 11), reveal: spring(0.66, 12) },
  punchy: { snap: expo(15), land: back(2.6), spring: spring(0.56, 15), sweep: windup(0.9), follow: spring(0.62, 13), reveal: spring(0.55, 14) },
};
const EASE = FEELS[VERSION];

// The score: from each state to the next, one thing at a time, each move
// [what, sixteenths, feel]; then how long each state holds, in sixteenths.
// Eight bars: 128 sixteenths.
const SCORE = [
  [['openTop', 3, 'snap'], ['openBot', 3, 'snap'], ['counter', 4, 'land'], ['stem', 8, 'spring'], ['cam', 6, 'follow']],
  [['w', 5, 'sweep'], ['cam', 5, 'follow']],
  [['w', 5, 'sweep'], ['cam', 5, 'follow']],
  [['w', 5, 'sweep'], ['cam', 5, 'follow']],
  [['top', 5, 'sweep'], ['cam', 5, 'follow']],
  [], // unseen: the square becomes the logo's block
  [['slot', 8, 'reveal']],
];
const HOLDS = [14, 8, 8, 6, 12, 8, 0]; // the logo, the modular mark, the S M, the S, the !, the square
const MOVING = 0.86; // of its sixteenths, how much a move takes; the rest is a breath before the next
const STAGGER = 1 / 28; // the reveal: how far behind the one before it each slot column opens (a share of the move)

/** The first u (0 to 1) where an easing reaches v, or 1. */
const reach = (ease, v) => { for (let i = 0; i <= 800; i++) if (ease(i / 800) >= v) return i / 800; return 1; };
/** Where in its move a move makes contact (a snap through the edge, a landing, a crop locking), or null for the camera. */
const HIT = { snap: 0.5, land: 1, spring: 1, sweep: 0.992, reveal: 1 };
const hitOf = (feel) => (HIT[feel] === undefined ? null : reach(EASE[feel], HIT[feel]) * (feel === 'reveal' ? 1 - 9 * STAGGER : 1));

// The loop, laid out in time: each move on the grid, then started a little
// early, just enough that its contact lands exactly on a sixteenth (the hit on
// the beat, the move leading into it), taken out of the breath before it.
const SEGMENTS = [];
let acc = 0;
STATES.forEach((_, i) => {
  if (HOLDS[i]) { SEGMENTS.push({ hold: i, t0: acc }); acc += HOLDS[i] * UNIT; }
  SCORE[i].forEach(([key, n, feel], k) => {
    const d = n * UNIT;
    const move = d * (key === 'cam' ? 0.96 : MOVING);
    const hit = hitOf(feel);
    const lead = hit === null ? 0 : (hit * move) % UNIT;
    SEGMENTS.push({ from: i, k, key, feel, t0: acc - (lead > 1e-6 ? lead : 0), move, hit: hit === null ? null : hit * move });
    acc += d;
  });
});
const PERIOD = acc;
SEGMENTS.forEach((s, i) => { s.d = (SEGMENTS[i + 1]?.t0 ?? PERIOD) - s.t0; });

const f = (n) => +n.toFixed(2);
const mix = (a, b, v) => a + (b - a) * v;
const wrap = (t) => ((t % PERIOD) + PERIOD) % PERIOD;

/** What the camera frames for measures q: its drawing's box, with room round it. */
function fit(q) {
  const [x0, y0, x1, y1] = draw(q).box;
  const pad = Math.max(x1 - x0, y1 - y0) * 0.16;
  return [x0 - pad, y0 - pad, x1 + pad, y1 + pad];
}

/** The segment (a hold or a move) at time t. */
function segmentAt(t) {
  t = wrap(t);
  return SEGMENTS.findLast((x) => x.t0 <= t) ?? SEGMENTS[0];
}

/**
 * The measures and the camera at time t (seconds). In a move from state i to
 * the next (the last to the first), the steps before this one are done, this
 * one is under way, and those after have not begun; the camera stays on the
 * first state's frame until its own step.
 */
function stateAt(t) {
  t = wrap(t);
  const s = segmentAt(t);
  if (s.hold !== undefined) return { q: STATES[s.hold], box: fit(STATES[s.hold]) };
  const a = STATES[s.from], b = STATES[(s.from + 1) % STATES.length];
  const u = Math.min(1, (t - s.t0) / s.move);
  const v = EASE[s.feel](u);
  const q = { ...a };
  if (s.key === 'slot') q.reveal = u; // the slots open one column after another (draw)
  let cam = 0;
  SCORE[s.from].forEach(([key], k) => {
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
  const full = (i) => ({ pts: [[c(i), -OUT], [c(i), h + OUT]], col: i });
  return { h, list: [
    { pts: [[c(0), top], [c(0), up], [c(1), up]], a: true, col: 0 }, // S
    { pts: [[-OUT, lo], [c(0), lo], [c(0), bot]], b: true, col: 0 },
    full(1),
    { pts: [[c(2), CLOSED], [c(2), h + OUT]], a: true, col: 2 }, // M
    { pts: [[c(3), CLOSED], [c(3), h + OUT]], a: true, col: 3 },
    full(4),
    { pts: [[c(5), Math.min(q.counter, y2 - S / 2)], [c(5), y2]], a: true, col: 5 }, // A: the counter, stopping on the crossbar
    { pts: [[c(5), y3], [c(5), h + OUT]], col: 5 },
    full(6),
    { pts: [[c(7), top], [c(7), up], [c(8), up]], a: true, col: 7 }, // S
    { pts: [[c(6), lo], [c(7), lo], [c(7), bot]], b: true, col: 7 },
    full(8),
    { pts: [[c(9), -OUT], [c(9), y2]], col: 9 }, // H
    { pts: [[c(9), y3], [c(9), h + OUT]], col: 9 },
  ] };
}

/**
 * The mark for measures q, as the inside of an SVG: the block (cropped to w
 * across, from top down) less its slots; its middle held at y 0, so the
 * bands squash about it. Returns { svg, box }.
 */
function draw(q) {
  const { h, list } = slots(q);
  const w = Math.min(W, Math.max(0.5, q.w)); // a crop's wind-up never runs past the block
  const top = Math.min(h - 0.5, Math.max(0, q.top));
  // Each slot's width: all as one, or, as the logo appears, each column opening a little after the one before.
  const widthOf = (col) => (q.reveal === undefined ? S * q.slot : S * Math.max(0, EASE.reveal(Math.max(0, Math.min(1, (q.reveal - col * STAGGER) / (1 - 9 * STAGGER))))));
  let cuts = '';
  for (const sl of list) {
    const sw = widthOf(sl.col);
    if (sw <= 0.05) continue;
    cuts += `<path d="${filleted(sl.pts, M.bend)}" fill="none" stroke="#000" stroke-width="${f(sw)}" stroke-linecap="butt" stroke-linejoin="round"/>`;
    for (const [x, y] of [sl.a && sl.pts[0], sl.b && sl.pts.at(-1)].filter(Boolean)) cuts += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(sw / 2)}" fill="#000"/>`;
  }
  const svg = `<defs><mask id="seq-m" maskUnits="userSpaceOnUse" x="${-OUT}" y="${-OUT}" width="${f(w + 2 * OUT)}" height="${f(h + 2 * OUT)}">`
    + `<rect y="${f(top)}" width="${f(w)}" height="${f(h - top)}" fill="#fff"/>${cuts}</mask></defs>`
    + `<rect y="${f(top)}" width="${f(w)}" height="${f(h - top)}" fill="currentColor" mask="url(#seq-m)"/>`;
  const dy = -h / 2;
  return { svg: `<g transform="translate(0 ${f(dy)})">${svg}</g>`, box: [0, top + dy, w, h + dy] };
}

const viewBox = ([x0, y0, x1, y1]) => `${f(x0)} ${f(y0)} ${f(x1 - x0)} ${f(y1 - y0)}`;

/** The whole frame at time t as an SVG string: the camera's view of the mark, in currentColor, no ground. */
function svgAt(t) {
  const { q, box } = stateAt(t);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox(box)}" preserveAspectRatio="xMidYMid meet">${draw(q).svg}</svg>`;
}

// ---------------------------------------------------------------------------
// The sound's cues: for each move, what the sound needs to follow it (its
// easing, how long, where on the screen it happens, left to right, and which
// note it lands on).

const across = (x, box) => Math.max(-1, Math.min(1, ((x - box[0]) / (box[2] - box[0]) - 0.5) * 2)); // -1 left, 1 right
function cueOf(s) {
  const a = STATES[s.from], b = STATES[(s.from + 1) % STATES.length];
  const box = fit(a);
  const cue = { kind: s.feel, key: s.key, d: s.move, ease: EASE[s.feel], pan: [0, 0], to: (s.from + 1) % STATES.length };
  if (s.key === 'w') cue.pan = [across(a.w, box), across(b.w, box)];
  else if (s.key === 'openTop' || s.key === 'openBot') cue.pan = [across(c(0), box), across(c(7), box)]; // the two S's
  else if (s.key === 'counter') cue.pan = [across(c(5), box), across(c(5), box)];
  else if (s.key === 'cam') { const B2 = fit(b); const mid = (bx) => (bx[0] + bx[2]) / 2; cue.pan = [0, Math.max(-1, Math.min(1, (mid(B2) - mid(box)) / (box[2] - box[0]) * 2))]; }
  else if (s.key === 'slot') {
    // Each slot column: when it opens (its own arrival) and where it is, left to right.
    const first = reach(EASE.reveal, 1) * (1 - 9 * STAGGER);
    cue.columns = Array.from({ length: 10 }, (_, i) => ({ at: (i * STAGGER + first) * s.move, pan: across(c(i), fit(b)) }));
  }
  return cue;
}

/** One loop's sound, rendered offline: an AudioBuffer, each move's sound at its own time. */
async function loopSound(rate = 48000) {
  const tail = 2; // the last sound rings on into the next loop: rendered on, and folded back onto the start
  const ctx = new OfflineAudioContext(2, Math.ceil((PERIOD + tail) * rate), rate);
  const s = createSound({ context: ctx });
  await s.start();
  for (const seg of SEGMENTS) if (seg.key) s.play(cueOf(seg), seg.t0);
  const buf = await ctx.startRendering();
  const n = Math.ceil(PERIOD * rate);
  const out = new AudioBuffer({ numberOfChannels: 2, length: n, sampleRate: rate });
  for (let ch = 0; ch < 2; ch++) {
    const src = buf.getChannelData(ch);
    const dst = out.getChannelData(ch);
    dst.set(src.subarray(0, n));
    for (let i = n; i < src.length; i++) dst[i - n] += src[i]; // the tail over the loop's start, so it loops without a seam
  }
  return out;
}

// ---------------------------------------------------------------------------
// The page

const el = document.querySelector('.mark');
const play = document.querySelector('.play');
const scrub = document.querySelector('.scrub');
const at = query.has('at') ? Math.max(0, Math.min(STATES.length - 1, Number(query.get('at')) || 0)) : null;
let t = query.has('t') ? (Number(query.get('t')) || 0) * PERIOD : at !== null ? (SEGMENTS.find((s) => s.hold === at) ?? SEGMENTS.find((s) => s.from === at)).t0 : 0;
let paused = query.has('t') || at !== null || matchMedia('(prefers-reduced-motion: reduce)').matches;
let last = null;

function render() {
  const { q, box } = stateAt(t);
  el.setAttribute('viewBox', viewBox(box));
  el.innerHTML = draw(q).svg;
  scrub.value = String(Math.round((wrap(t) / PERIOD) * 1000));
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
  if (!paused && soundOn && seg.key && wrap(t) - seg.t0 < 0.1) sound.play(cueOf(seg));
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
  const now = wrap(t);
  const holds = SEGMENTS.filter((s) => s.hold !== undefined).map((s) => s.t0);
  t = dir > 0 ? holds.find((h) => h > now + 0.01) ?? holds[0] + PERIOD : holds.findLast((h) => h < now - 0.01) ?? holds.at(-1) - PERIOD;
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
if (query.has('paper')) document.documentElement.setAttribute('data-paper', '');

setPaused(paused);
render();
requestAnimationFrame(frame);
document.documentElement.dataset.ready = '1';

// For scripts: the measures, the drawing, the cues and the sound at any state or time.
window.__sequence = { STATES, PERIOD, SEGMENTS, EASE, TEMPO, UNIT, stateAt, draw, svgAt, cueOf, loopSound, seek(s) { t = s; setPaused(true); render(); } };
