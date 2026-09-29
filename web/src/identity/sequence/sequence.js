// The sequence: the SMASH logo taken down, one move at a time, to a square. The
// logo, framed like a stamp; the modular mark (the frame gone, the S's slots
// run off the edges, the A's counter raised, the bands squashed to five); the
// S M; the S; and the square in the S's bottom left corner, a bar by a bar,
// the module it is all built from. It plays forward and back, and loops.
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
// to the punchy version and back (?punchy).
// ?t=0.5 seeks (a share of the loop) and pauses; ?at=2 holds one of the five.

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
const STATES = [
  { ...MODULAR, stem: TALL, openTop: 0, openBot: 0, counter: CLOSED, frame: 1 }, // the logo, as a stamp
  MODULAR, // the modular mark
  { ...MODULAR, w: c(4) - S / 2 }, // the S M: 238.9
  { ...MODULAR, w: c(1) - S / 2 }, // the S: 83.56
  { ...MODULAR, w: B, top: M.stem + 2 * S + B }, // the square in the S's bottom left corner: 31.78 × 31.78
];
// Two versions: calm (the default) and punchy (?punchy, or p): shorter moves,
// sharper snaps, bigger overshoots, bouncier springs, a snappier camera.
const PUNCHY = new URLSearchParams(location.search).has('punchy');

/** A damped spring from 0 to 1: damping z, stiffness w (per the move's length). */
const spring = (z, w) => (u) => { const r = Math.sqrt(1 - z * z); return 1 - Math.exp(-z * w * u) * (Math.cos(w * r * u) + (z / r) * Math.sin(w * r * u)); };
/** Lands past its mark by about `over` and comes back to it (an ease-out-back). */
const back = (c) => (u) => 1 + (c + 1) * (u - 1) ** 3 + c * (u - 1) ** 2;
const expo = (k) => (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u < 0.5 ? 2 ** (2 * k * u - k) / 2 : (2 - 2 ** (-2 * k * u + k)) / 2);

// The feel of a move: how it gets going and how it lands.
const EASE = {
  // Drawn: the stamp's outline, erased along itself (and drawn back on).
  draw: (u) => (u < 0.5 ? 4 * u ** 3 : 1 - (-2 * u + 2) ** 3 / 2),
  // A decisive sweep: slow off the mark, fast through, gentle to rest.
  sweep: (u) => (u < 0.5 ? 8 * u ** 4 : 1 - (-2 * u + 2) ** 4 / 2),
  // A snap: all but still, then at once.
  snap: expo(10),
  // Lands a touch past its mark, and comes back to it.
  land: back(1.4),
  // A spring: gets there, gives a little, settles.
  spring: spring(0.7, 11),
  // The camera: a softer spring, a long tail.
  follow: spring(0.82, 9),
  // Punchy: the same moves, harder.
  drawP: (u) => 1 - (1 - u) ** 5, // off at once, a long tail
  sweepP: (u) => (u < 0.5 ? 16 * u ** 5 : 1 - (-2 * u + 2) ** 5 / 2),
  snapP: expo(14),
  landP: back(2.6),
  springP: spring(0.6, 15), // about a tenth past: the bands never squash thinner than a slot
  followP: spring(0.6, 13),
};

// From each to the next, one thing at a time, each its own move: [what, seconds, feel, the breath after it].
// The outline is erased; the S's slots break out at the top, then at the bottom;
// the counter rises; the bands squash about the middle; a crop across, then down;
// and only then the camera, to frame what is left.
const CALM = [
  [['frame', 1.6, 'draw', 0.45], ['openTop', 0.5, 'snap'], ['openBot', 0.5, 'snap'], ['counter', 0.6, 'land'], ['stem', 1.2, 'spring'], ['cam', 1.1, 'follow']],
  [['w', 1, 'sweep'], ['cam', 1.1, 'follow']],
  [['w', 0.85, 'sweep'], ['cam', 1.1, 'follow']],
  [['w', 0.7, 'sweep'], ['top', 0.7, 'sweep'], ['cam', 1.2, 'follow']],
];
const STEPS = PUNCHY
  ? CALM.map((steps) => steps.map(([key, d, feel, beat]) => [key, +(d * (key === 'frame' ? 0.7 : 0.6)).toFixed(2), `${feel}P`, beat === undefined ? 0.06 : beat * 0.6]))
  : CALM;
const HOLD = PUNCHY ? [1.4, 0.9, 0.9, 0.8, 1.2] : [1.7, 1.2, 1.2, 1.1, 1.5]; // seconds on each
const BEAT = PUNCHY ? 0.06 : 0.12; // a breath after each move, before the next

const f = (n) => +n.toFixed(2);
const mix = (a, b, v) => a + (b - a) * v;

/** What the camera frames for measures q: its drawing's box, with room round it. */
function fit(q) {
  const [x0, y0, x1, y1] = draw(q).box;
  const pad = Math.max(x1 - x0, y1 - y0) * 0.14;
  return [x0 - pad, y0 - pad, x1 + pad, y1 + pad];
}

// The loop: forward from the logo to the square, a step at a time, and back the same way.
const SEGMENTS = [];
// A move: its easing (feel), and the kind of move it is, for its sound (kind: the calm name).
const move = (i, k, dir) => { const [key, d, feel, beat = BEAT] = STEPS[i][k]; return { from: i, k, key, dir, move: d, feel, kind: feel.replace(/P$/, ''), d: d + beat }; };
for (let i = 0; i < STATES.length; i++) {
  SEGMENTS.push({ hold: i, d: HOLD[i] });
  if (i < STEPS.length) STEPS[i].forEach((_, k) => SEGMENTS.push(move(i, k, 1)));
}
for (let i = STEPS.length - 1; i >= 0; i--) {
  for (let k = STEPS[i].length - 1; k >= 0; k--) SEGMENTS.push(move(i, k, -1));
  if (i > 0) SEGMENTS.push({ hold: i, d: HOLD[i] });
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
 * the next, the steps before this one are done, this one is under way, and
 * those after have not begun; the camera stays on the first state's frame
 * until its own step. Backwards, a step lands with the same feel as it does
 * going forwards (a spring settles on the way back too).
 */
function stateAt(t) {
  t = ((t % PERIOD) + PERIOD) % PERIOD;
  const s = segmentAt(t);
  if (s.hold !== undefined) return { q: STATES[s.hold], box: fit(STATES[s.hold]) };
  const a = STATES[s.from], b = STATES[s.from + 1];
  const u = Math.min(1, (t - s.t0) / s.move);
  const e = EASE[s.feel](u);
  const v = s.dir > 0 ? e : 1 - e;
  const q = { ...a };
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
    const o = FRAME.gap + FRAME.width / 2; // its centre line, off the block
    const L = 2 * (w + 2 * o) + 2 * (h + 2 * o);
    const drawn = Math.min(1, Math.max(0, q.frame)) * L;
    svg += `<path d="M${f(-o)} ${f(-o)}H${f(w + o)}V${f(h + o)}H${f(-o)}Z" fill="none" stroke="currentColor" stroke-width="${f(FRAME.width)}" stroke-linejoin="miter" stroke-dasharray="${f(drawn)} ${f(L)}"/>`;
  }
  // What the camera frames: the block, and the frame while it is there.
  const reach = (FRAME.gap + FRAME.width) * Math.min(1, q.frame * 3);
  const dy = -h / 2;
  return { svg: `<g transform="translate(0 ${f(dy)})">${svg}</g>`, box: [-reach, top + dy - reach, w + reach, h + dy + reach] };
}

// ---------------------------------------------------------------------------
// The page

const el = document.querySelector('.mark');
const play = document.querySelector('.play');
const scrub = document.querySelector('.scrub');
const params = new URLSearchParams(location.search);
const at = params.has('at') ? Math.max(0, Math.min(STATES.length - 1, Number(params.get('at')) || 0)) : null;
let t = params.has('t') ? (Number(params.get('t')) || 0) * PERIOD : at !== null ? SEGMENTS.find((s) => s.hold === at).t0 : 0;
let paused = params.has('t') || at !== null || matchMedia('(prefers-reduced-motion: reduce)').matches;
let last = null;

function render() {
  const { q, box } = stateAt(t);
  const [x0, y0, x1, y1] = box;
  el.setAttribute('viewBox', `${f(x0)} ${f(y0)} ${f(x1 - x0)} ${f(y1 - y0)}`);
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
// The download: this version's video, rendered by web/scripts/identity-sequence-video.py.
document.querySelector('.download').href = `video/smash-sequence${PUNCHY ? '-punchy' : ''}.mp4`;
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
window.__sequence = {
  STATES, PERIOD, SEGMENTS, EASE, stateAt, draw,
  seek(s) { t = s; setPaused(true); render(); },
  /** One loop's sound, rendered offline: a WAV file's bytes, base64 (for identity-sequence-video.py). */
  async soundtrack(rate = 48000) {
    const ctx = new OfflineAudioContext(2, Math.ceil(PERIOD * rate), rate);
    const s = createSound({ context: ctx });
    await s.start();
    for (const seg of SEGMENTS) if (seg.key) s.play({ feel: seg.kind, ease: EASE[seg.feel], d: seg.move, dir: seg.dir, key: seg.key }, seg.t0);
    const buf = await ctx.startRendering();
    return wavBase64(buf);
  },
};

/** An AudioBuffer as a 16-bit WAV file, base64. */
function wavBase64(buf) {
  const ch = buf.numberOfChannels, n = buf.length, rate = buf.sampleRate;
  const data = new DataView(new ArrayBuffer(44 + n * ch * 2));
  const str = (o, s) => [...s].forEach((c, i) => data.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF'); data.setUint32(4, 36 + n * ch * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
  data.setUint32(16, 16, true); data.setUint16(20, 1, true); data.setUint16(22, ch, true); data.setUint32(24, rate, true);
  data.setUint32(28, rate * ch * 2, true); data.setUint16(32, ch * 2, true); data.setUint16(34, 16, true); str(36, 'data'); data.setUint32(40, n * ch * 2, true);
  const chans = Array.from({ length: ch }, (_, c) => buf.getChannelData(c));
  let o = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { data.setInt16(o, Math.max(-1, Math.min(1, chans[c][i])) * 0x7fff, true); o += 2; }
  let bin = '';
  const bytes = new Uint8Array(data.buffer);
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
