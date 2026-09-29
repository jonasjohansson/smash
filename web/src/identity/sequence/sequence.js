// The sequence: the SMASH logo taken down, one move at a time, to a square, and
// round again. The logo, square; the modular mark (the S's slots run off the
// edges, the A's counter raised, the bands squashed to five); the S M; the S;
// the ! (the S cropped to a bar: its stem over its corner square); the square
// in the S's bottom left corner, a bar by a bar, the module it is all built
// from. Then round: filling the screen, that square is the logo's block, seen
// close; the logo writes itself back through it as its slots open, column by
// column. A loop, one way round.
//
// One drawing all the way: the modular mark's geometry (../modular.js), with
// its measures between the logo's and its own. With its top and bottom bands
// tall (238.9) and its closed ends a bar in, it is the logo, drawn square
// (549.58 × 549.58) so that it and the square are one shape; the crops are
// the modular mark's own (the S M ends on the M's right stem, the S before the
// slot after it, the square under the S's lower slot and left of its bend).
//
// Everything keeps time: the moves and the holds are counted in sixteenths
// of a beat (120 a minute by default), the loop is eight bars, and each move
// starts just early enough that its contact (a slot's end through the edge, a
// landing, a crop locking) falls exactly on its sixteenth. One thing moves at
// a time; the camera moves on its own, after, zooming at an even pace about
// the point that stays still on the screen.
//
// Click or space pauses; the arrows step from one to the next; i inverts; s
// (or the speaker) turns the sound on (sound.js); p switches to the punchy
// version and back (?punchy; ?calm is the slow one). The download button
// makes an MP4 (export.js): 1600 × 1200 for Dribbble; shift for 1920 × 1080,
// alt for 1080 × 1080 (or ?size=WxH). ?t=0.5 seeks (a share of the loop) and
// pauses; ?at=2 holds one of the states.

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
  // change is unseen, and the logo writes itself back through it.
  { ...LOGO, slot: 0 },
];

// Three versions: snappy (the default), punchy (?punchy, or p) with overshoot
// and bounce, calm (?calm), slow and smooth. Each keeps its own tempo.
const query = new URLSearchParams(location.search);
const VERSION = query.has('punchy') ? 'punchy' : query.has('calm') ? 'calm' : 'snappy';
const PUNCHY = VERSION === 'punchy';
const TEMPO = { snappy: 120, punchy: 132, calm: 84 }[VERSION]; // beats a minute
const UNIT = 60 / TEMPO / 4; // a sixteenth, in seconds

/** A damped spring from 0 to 1 (damping z, stiffness w per the move's length), scaled to end exactly on 1. */
const spring = (z, w) => {
  const r = Math.sqrt(1 - z * z);
  const raw = (u) => 1 - Math.exp(-z * w * u) * (Math.cos(w * r * u) + (z / r) * Math.sin(w * r * u));
  const end = raw(1);
  return (u) => (u >= 1 ? 1 : raw(u) / end);
};
/** Lands past its mark and comes back to it (an ease-out-back; k sets how far). */
const back = (k) => (u) => 1 + (k + 1) * (u - 1) ** 3 + k * (u - 1) ** 2;
/** Winds up a touch the other way, goes, overshoots a touch (an ease-in-out-back). */
const windup = (k) => { const k2 = k * 1.525; return (u) => (u < 0.5 ? ((2 * u) ** 2 * ((k2 + 1) * 2 * u - k2)) / 2 : ((2 * u - 2) ** 2 * ((k2 + 1) * (2 * u - 2) + k2) + 2) / 2); };
/** In and out: slow off, fast through, slow to rest (the power sets how hard). */
const inOut = (k) => (u) => (u < 0.5 ? 2 ** (k - 1) * u ** k : 1 - (-2 * u + 2) ** k / 2);
const expo = (k) => (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u < 0.5 ? 2 ** (2 * k * u - k) / 2 : (2 - 2 ** (-2 * k * u + k)) / 2);
/** A breath the other way first (k of the move, over its first share a), then the spring: a squash with weight. */
const gather = (k, a, sp) => (u) => (u < a ? -k * Math.sin((Math.PI * u) / a) : sp((u - a) / (1 - a)));

// The feel of a move, per version: how it gets going and how it lands.
//   snap: a slot's end breaking out, all but still and then at once
//   land: the counter rising, a touch past its mark and back
//   spring: the bands squashing: a breath up, then down, giving a little, settling
//   sweep: a crop, a breath back first, then decisive; it stops dead on its mark
//   follow: the camera, smooth in and out, the breath after the hit
//   reveal: each slot column opening through the block
const FEELS = {
  calm: { snap: expo(10), land: back(1.4), spring: gather(0.02, 0.12, spring(0.7, 7.6)), sweep: windup(0.3), follow: inOut(2), reveal: spring(0.78, 7.5) },
  snappy: { snap: expo(13), land: back(1.9), spring: gather(0.03, 0.12, spring(0.62, 8.6)), sweep: windup(0.55), follow: inOut(3), reveal: spring(0.66, 8.3) },
  punchy: { snap: expo(15), land: back(2.6), spring: gather(0.045, 0.12, spring(0.56, 10)), sweep: windup(0.9), follow: inOut(2.5), reveal: spring(0.56, 9.5) },
};
const EASE = FEELS[VERSION];

// The score: from each state to the next, one thing at a time, each move
// [what, sixteenths, feel]; then how long each state holds, in sixteenths.
// Eight bars: 128 sixteenths.
const REVEAL = 9;
const SCORE = [
  [['openTop', 3, 'snap'], ['openBot', 3, 'snap'], ['counter', 1, 'land'], ['stem', 6, 'spring'], ['cam', 7, 'follow']],
  [['w', 5, 'sweep'], ['cam', 5, 'follow']],
  [['w', 5, 'sweep'], ['cam', 5, 'follow']],
  [['w', 5, 'sweep'], ['cam', 5, 'follow']],
  [['top', 5, 'sweep'], ['cam', 5, 'follow']],
  [], // unseen: the square becomes the logo's block
  [['slot', REVEAL, 'reveal']],
];
const HOLDS = [15, 10, 6, 6, 14, 8, 0]; // the logo, the modular mark, the S M, the S, the !, the square
const MOVING = 0.86; // of its sixteenths, how much a move takes; the rest is a breath before the next
const STAGGER = 0.5 / (REVEAL * MOVING); // the reveal: each slot column opens a thirty-second after the one before

/** The first u (0 to 1) where an easing reaches v, or 1. */
const reach = (ease, v) => { for (let i = 0; i <= 2000; i++) if (ease(i / 2000) >= v) return i / 2000; return 1; };
/** Where in its move a move makes contact, as a value of its easing: a slot's end fully through the edge, a landing, a lock. */
const HIT = { snap: (CLOSED + S / 2) / (CLOSED + OUT), land: 1, spring: 1, sweep: 1, reveal: 1 };
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
    SEGMENTS.push({ from: i, k, key, feel, t0: acc - (lead > 1e-6 && UNIT - lead > 1e-6 ? lead : 0), move, hit: hit === null ? null : hit * move });
    acc += d;
  });
});
const PERIOD = acc;
SEGMENTS.forEach((s, i) => { s.d = (SEGMENTS[i + 1]?.t0 ?? PERIOD) - s.t0; });

const f = (n) => +n.toFixed(3);
const mix = (a, b, v) => a + (b - a) * v;
const wrap = (t) => ((t % PERIOD) + PERIOD) % PERIOD;

// ---------------------------------------------------------------------------
// The camera: what it frames, and how it moves from one frame to the next.

/** What the camera frames for measures q: its drawing's box, with room round it. */
function fit(q) {
  const [x0, y0, x1, y1] = draw(q).box;
  const pad = Math.max(x1 - x0, y1 - y0) * 0.16;
  return [x0 - pad, y0 - pad, x1 + pad, y1 + pad];
}
/** A box as the camera sees it at a screen's aspect: its middle, and the height of world it shows (the box fitted in). */
const lens = ([x0, y0, x1, y1], aspect) => ({ cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, v: Math.max(y1 - y0, (x1 - x0) / aspect) });
/**
 * Between two cameras, g of the way: the size changes geometrically (an even
 * zoom to the eye), about the one point that stays still on the screen (so a
 * zoom into the square rises from its foot); a plain pan when there is no zoom.
 */
function between(A, B2, g) {
  if (Math.abs(A.v / B2.v - 1) < 1e-4) return { cx: mix(A.cx, B2.cx, g), cy: mix(A.cy, B2.cy, g), v: A.v };
  const v = A.v * (B2.v / A.v) ** g;
  const px = (B2.cx * A.v - A.cx * B2.v) / (A.v - B2.v), py = (B2.cy * A.v - A.cy * B2.v) / (A.v - B2.v);
  return { cx: px + ((A.cx - px) * v) / A.v, cy: py + ((A.cy - py) * v) / A.v, v };
}
/** A camera as a viewBox at an aspect: [x, y, width, height]. */
const viewOf = (L, aspect) => [L.cx - (L.v * aspect) / 2, L.cy - L.v / 2, L.v * aspect, L.v];

/** The segment (a hold or a move) at time t. */
function segmentAt(t) {
  t = wrap(t);
  return SEGMENTS.findLast((x) => x.t0 <= t) ?? SEGMENTS[0];
}

/**
 * The measures and the camera's view at time t (seconds), for a screen of
 * the given aspect. In a move from state i to the next (the last to the
 * first), the steps before this one are done, this one is under way, and
 * those after have not begun; the camera stays on the first state's frame
 * until its own step.
 */
function stateAt(t, aspect = 16 / 9) {
  t = wrap(t);
  const s = segmentAt(t);
  if (s.hold !== undefined) return { q: STATES[s.hold], view: viewOf(lens(fit(STATES[s.hold]), aspect), aspect) };
  const a = STATES[s.from], b = STATES[(s.from + 1) % STATES.length];
  const u = Math.min(1, (t - s.t0) / s.move);
  const e = EASE[s.feel](u);
  const v = s.feel === 'sweep' ? Math.min(1, e) : e; // a crop stops dead on its mark
  const q = { ...a };
  if (s.key === 'slot') q.reveal = u; // the slots open one column after another (draw)
  let cam = 0;
  SCORE[s.from].forEach(([key], k) => {
    const w = k < s.k ? 1 : k === s.k ? v : 0;
    if (key === 'cam') cam = w;
    else if (key === 'stem') q.stem = a.stem * (b.stem / a.stem) ** w; // the bands squash in proportion: never thinner than a slot
    else q[key] = mix(a[key], b[key], w);
  });
  return { q, view: viewOf(between(lens(fit(a), aspect), lens(fit(b), aspect), cam), aspect) };
}

// ---------------------------------------------------------------------------
// The drawing

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
 * line, where it has a round end (a, b: at its start, its end), and its
 * column (for the reveal). The S's upper arms end round in the next column,
 * where the slot there covers them, so they never show a flat end while the
 * logo writes itself.
 */
function slots(q) {
  const h = 2 * q.stem + 2 * S + B;
  const y2 = q.stem + S, y3 = q.stem + S + B;
  const up = q.stem + S / 2, lo = q.stem + S + B + S / 2; // the two crossbars' slots
  const top = CLOSED + (-OUT - CLOSED) * q.openTop; // the S's upper slot: closed a bar in, or run off the top
  const bot = h - CLOSED + (OUT + CLOSED) * q.openBot; // its lower one, off the bottom
  const full = (i) => ({ pts: [[c(i), -OUT], [c(i), h + OUT]], col: i });
  return { h, list: [
    { pts: [[c(0), top], [c(0), up], [c(1), up]], a: true, b: true, col: 0 }, // S
    { pts: [[-OUT, lo], [c(0), lo], [c(0), bot]], b: true, col: 0 },
    full(1),
    { pts: [[c(2), CLOSED], [c(2), h + OUT]], a: true, col: 2 }, // M
    { pts: [[c(3), CLOSED], [c(3), h + OUT]], a: true, col: 3 },
    full(4),
    { pts: [[c(5), Math.min(q.counter, y2 - S / 2)], [c(5), y2]], a: true, col: 5 }, // A: the counter, stopping on the crossbar
    { pts: [[c(5), y3], [c(5), h + OUT]], col: 5 },
    full(6),
    { pts: [[c(7), top], [c(7), up], [c(8), up]], a: true, b: true, col: 7 }, // S
    { pts: [[c(6), lo], [c(7), lo], [c(7), bot]], b: true, col: 7 },
    full(8),
    { pts: [[c(9), -OUT], [c(9), y2]], col: 9 }, // H
    { pts: [[c(9), y3], [c(9), h + OUT]], col: 9 },
  ] };
}

/**
 * The mark for measures q, as the inside of an SVG: the block (cropped to w
 * across, from top down) less its slots; its middle held at y 0, so the bands
 * squash about it. The crop is the filled rectangle alone (the mask is open
 * everywhere else), so its edges are anti-aliased once. Returns { svg, box }.
 */
function draw(q) {
  const { h, list } = slots(q);
  const w = Math.min(W, Math.max(0.5, q.w)); // a crop's wind-up never runs past the block
  const top = Math.min(h - 0.5, Math.max(0, q.top));
  // Each slot's width: all as one, or, as the logo writes itself, each column opening a thirty-second after the one before.
  const widthOf = (col) => (q.reveal === undefined ? S * q.slot : S * Math.max(0, EASE.reveal(Math.max(0, Math.min(1, (q.reveal - col * STAGGER) / (1 - 9 * STAGGER))))));
  let cuts = '';
  for (const sl of list) {
    const sw = widthOf(sl.col);
    if (sw <= 0.05) continue;
    const xs = sl.pts.map((p) => p[0]), ys = sl.pts.map((p) => p[1]);
    if (Math.min(...xs) - sw / 2 > w || Math.max(...xs) + sw / 2 < 0 || Math.max(...ys) + sw / 2 < top || Math.min(...ys) - sw / 2 > h) continue; // outside the crop
    cuts += `<path d="${filleted(sl.pts, M.bend)}" fill="none" stroke="#000" stroke-width="${f(sw)}" stroke-linecap="butt" stroke-linejoin="round"/>`;
    for (const [x, y] of [sl.a && sl.pts[0], sl.b && sl.pts.at(-1)].filter(Boolean)) cuts += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(sw / 2)}" fill="#000"/>`;
  }
  const m = OUT * 2;
  const svg = `<defs><mask id="seq-m" maskUnits="userSpaceOnUse" x="${-m}" y="${-m}" width="${f(W + 2 * m)}" height="${f(h + 2 * m)}">`
    + `<rect x="${-m}" y="${-m}" width="${f(W + 2 * m)}" height="${f(h + 2 * m)}" fill="#fff"/>${cuts}</mask></defs>`
    + `<rect y="${f(top)}" width="${f(w)}" height="${f(h - top)}" fill="currentColor" mask="url(#seq-m)"/>`;
  const dy = -h / 2;
  return { svg: `<g transform="translate(0 ${f(dy)})">${svg}</g>`, box: [0, top + dy, w, h + dy] };
}

const viewBox = ([x, y, w, h]) => `${f(x)} ${f(y)} ${f(w)} ${f(h)}`;

/** The whole frame at time t as an SVG string for a screen of the given aspect: the camera's view of the mark, in currentColor, no ground. */
function svgAt(t, aspect = 16 / 9) {
  const { q, view } = stateAt(t, aspect);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox(view)}" preserveAspectRatio="xMidYMid meet">${draw(q).svg}</svg>`;
}

// ---------------------------------------------------------------------------
// The sound's cues: for each move, what the sound needs to follow it (its
// easing, how long, when it makes contact, where on the screen it happens,
// left to right, and the state it goes to).

const across = (x, box) => Math.max(-1, Math.min(1, ((x - box[0]) / (box[2] - box[0]) - 0.5) * 2)); // -1 left, 1 right
function cueOf(s) {
  const a = STATES[s.from], b = STATES[(s.from + 1) % STATES.length];
  const box = fit(a);
  const ease = s.feel === 'sweep' ? (u) => Math.min(1, EASE.sweep(u)) : EASE[s.feel];
  const cue = { kind: s.feel, key: s.key, d: s.move, ease, hit: s.hit, pan: [0, 0], to: (s.from + 1) % STATES.length };
  if (s.key === 'w') cue.pan = [across(a.w, box), across(b.w, box)];
  else if (s.key === 'openTop' || s.key === 'openBot') cue.pan = [across(c(0), box), across(c(7), box)]; // the two S's
  else if (s.key === 'counter') cue.pan = [across(c(5), box), across(c(5), box)];
  else if (s.key === 'cam') { const B2 = fit(b); const mid = (bx) => (bx[0] + bx[2]) / 2; cue.pan = [0, Math.max(-1, Math.min(1, ((mid(B2) - mid(box)) / (box[2] - box[0])) * 2))]; }
  else if (s.key === 'slot') {
    // Each slot column: when it opens (its own arrival) and where it is, left to right.
    const first = reach(EASE.reveal, 1) * (1 - 9 * STAGGER);
    cue.columns = Array.from({ length: 10 }, (_, i) => ({ at: (i * STAGGER + first) * s.move, pan: across(c(i), fit(b)) }));
  }
  return cue;
}

/** One loop's sound, rendered offline: an AudioBuffer, each move's sound at its own time, the tail folded onto the start. */
async function loopSound(rate = 48000) {
  const tail = 2.5;
  const ctx = new OfflineAudioContext(2, Math.ceil((PERIOD + tail) * rate), rate);
  const s = createSound({ context: ctx });
  await s.start();
  for (const seg of SEGMENTS) if (seg.key) s.play(cueOf(seg), seg.t0);
  const buf = await ctx.startRendering();
  const n = Math.round(PERIOD * rate);
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
  const aspect = el.clientWidth / Math.max(1, el.clientHeight) || 16 / 9;
  const { q, view } = stateAt(t, aspect);
  el.setAttribute('viewBox', viewBox(view));
  el.innerHTML = draw(q).svg;
  scrub.value = String(Math.round((wrap(t) / PERIOD) * 1000));
}

// The sound: each move's sound scheduled a little ahead, to start exactly when
// its move starts on the screen (the output's own delay taken off); only while
// it plays on its own, not when scrubbed.
const sound = createSound();
const speaker = document.querySelector('.sound');
let soundOn = false;
const scheduled = new Set(); // the moves already scheduled, by when they start (ms, on the page's clock)
function listen() {
  if (paused || !soundOn) return;
  const now = wrap(t);
  for (const seg of SEGMENTS) {
    if (!seg.key) continue;
    let dt = seg.t0 - now;
    if (dt < -PERIOD / 2) dt += PERIOD;
    if (dt < -0.02 || dt > 0.15) continue;
    const id = Math.round((t + dt) * 1000);
    if (scheduled.has(id)) continue;
    scheduled.add(id);
    sound.play(cueOf(seg), sound.now() + Math.max(0, dt - sound.latency()));
  }
  if (scheduled.size > 64) [...scheduled].slice(0, 32).forEach((x) => scheduled.delete(x));
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

// The download: this version, in these colours, made into an MP4 here and now
// (export.js), a ring filling as it goes. 1600 × 1200 by default (Dribbble's
// 4:3); shift for 1920 × 1080, alt for 1080 × 1080; or ?size=WxH. The file
// opens a quarter of a second before the first move, the logo's hold at its
// loop point.
const dl = document.querySelector('.download');
const ring = dl.querySelector('.i-ring');
dl.addEventListener('click', async (e) => {
  if (dl.hasAttribute('data-busy')) return;
  dl.setAttribute('data-busy', '');
  const paperOn = document.documentElement.hasAttribute('data-paper');
  const [ink, paper] = paperOn ? ['#000', '#fff'] : ['#fff', '#000'];
  const asked = /^(\d+)x(\d+)$/.exec(query.get('size') ?? '');
  const [width, height] = asked ? [+asked[1], +asked[2]] : e.shiftKey ? [1920, 1080] : e.altKey ? [1080, 1080] : [1600, 1200];
  const start = HOLDS[0] * UNIT - 2 * UNIT;
  try {
    const { renderVideo } = await import('./export.js');
    const blob = await renderVideo({ period: PERIOD, start, svgAt: (s) => svgAt(s, width / height), sound: loopSound, ink, paper, width, height, onProgress: (p) => ring.setAttribute('stroke-dasharray', `${Math.round(p * 100)} 100`) });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `smash-sequence${VERSION === 'snappy' ? '' : `-${VERSION}`}${paperOn ? '-paper' : ''}-${width}x${height}.mp4` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  } catch (err) {
    console.error('[sequence] the video could not be made', err);
  } finally {
    dl.removeAttribute('data-busy');
    ring.setAttribute('stroke-dasharray', '0 100');
  }
});
addEventListener('keydown', (e) => {
  if (e.target.closest?.('input')) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return; // the browser's own shortcuts
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
window.__sequence = { STATES, PERIOD, SEGMENTS, EASE, TEMPO, UNIT, HOLDS, stateAt, draw, svgAt, cueOf, loopSound, seek(s) { t = s; setPaused(true); render(); } };
