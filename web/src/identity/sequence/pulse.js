// The sequence on the pulse (?pulse): the story of engine.js, the logo taken
// down to a square and written back, told in hits on the beat, after a
// reference of translucent blocks tumbling and restacking. Eight bars at 120
// a minute: 32 beats. Every hit changes the mark itself (a slot breaking
// out, the bands squashing, a letter cropped away, a column opening); the
// camera only moves with a change, to frame what it made, never on its own.
// A beat with nothing to change holds.
//
// Every hit has the same shape. A whip: the change packed into the last
// 0.12 s before the beat, slow off and fastest at the end. A snap: it lands
// on the beat and stops dead, and holds still until the next. And a smear:
// in the whips each frame is the drawing at several moments across a
// shutter, averaged.
//
// Each beat is a key, or a hold: the measures (engine.js's states, and the
// steps between them) and a framing (a box in the mark's space) that land on
// it, and the sound of the move into it. One key hides a change: the square,
// grown to fill the screen, is then the logo's block (its `as`), unseen, and
// the logo writes itself back through it a column at a time.
//
// It exports what engine.js does, so the player, the page and the MP4 take
// either one.

import { STATES, W, S, B, c, draw, lens, between, viewOf, viewBox, loopSoundFor } from './engine.js';

const VERSION = 'pulse';
const PUNCHY = false;
const TEMPO = 120; // beats a minute
const UNIT = 60 / TEMPO / 4; // a sixteenth
const BEAT = 4 * UNIT; // half a second
const BEATS = 32; // eight bars
const PERIOD = BEATS * BEAT;
const WHIP = 0.12; // how long the move into a beat takes
const START = 2 * UNIT; // the MP4 opens here, on a whole frame, in the logo's hold
const SHUTTER = 1 / 40; // the smear: how much time each frame sees, live and in the MP4 alike
const SAMPLES = 8; // the fewest moments across it drawn (8, 16 or 32: a share that adds up to full ink in 8 bits)
const MOST = 32; // and the most, for the fastest frames
const STEP = 1 / 240; // how far apart on the screen (a share of its height) the moments may be before more are drawn

const K = 5;
/** The whip: slow off and fastest at the end (an exponential ease-in), stopping dead on 1. */
const whip = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : (2 ** (K * u) - 1) / (2 ** K - 1));
const EASE = { whip };

const f = (n) => +n.toFixed(3);
const mix = (a, b, v) => a + (b - a) * v;
const wrap = (t) => ((t % PERIOD) + PERIOD) % PERIOD;

// ---------------------------------------------------------------------------
// The keys

const [LOGO, MODULAR, S_M, S_ALONE, BANG, SQUARE, BLOCK] = STATES;
// The steps between the states: the breaks one at a time, the crops a letter at a time.
const TOP = { ...LOGO, openTop: 1 };
const BOTH = { ...TOP, openBot: 1 };
const RAISED = { ...BOTH, counter: MODULAR.counter };
const NO_H = { ...MODULAR, w: c(8) - S / 2 };
const NO_S = { ...MODULAR, w: c(6) - S / 2 };
const HALF_M = { ...MODULAR, w: c(3) - S / 2 };
const cols = (n) => Array.from({ length: 10 }, (_, i) => (i < n ? 1 : 0));
const open = (n) => ({ ...BLOCK, cols: cols(n) }); // the block with its first n slot columns open

/**
 * A framing: the share [left, top, right, bottom] of the drawing for q, with
 * room round it (pad, a share of the larger side). The camera fits it to the
 * screen, so a thin band is a close-up across and a tall one a close-up down.
 */
function part(q, [a, b, r, d], pad = 0) {
  const [x0, y0, x1, y1] = draw(q).box;
  const w = x1 - x0, h = y1 - y0;
  const box = [x0 + a * w, y0 + b * h, x0 + r * w, y0 + d * h];
  const p = Math.max(box[2] - box[0], box[3] - box[1]) * pad;
  return [box[0] - p, box[1] - p, box[2] + p, box[3] + p];
}
const whole = (q, pad = 0.16) => part(q, [0, 0, 1, 1], pad); // as engine.js frames a state

const X = (x) => x / W; // an x as a share of the word
const across = (x, w = W) => Math.max(-1, Math.min(1, (x / w) * 2 - 1)); // -1 left, 1 right
/** The block with n columns open, framed from its left edge to a bar past the last of them, the band opening out to the whole as it goes. */
const writing = (n) => { const m = 0.3 * (1 - n / 10); return part(BLOCK, [0, m, Math.min(1, X(c(n - 1) + S / 2 + B)), 1 - m], 0.04); };

// The sound of the move into each key (sound.js).
const punch = (pan = 0) => ({ kind: 'punch', key: 'cam', pan: [pan, pan] });
const crop = (from, to, note, state) => ({ kind: 'sweep', key: 'w', note, to: state, pan: [across(from, from), across(to, from)] });
const reveal = (i0, i1, chord = false) => ({ kind: 'reveal', key: 'slot', chord, columns: Array.from({ length: i1 - i0 }, (_, j) => ({ i: i0 + j, pan: across(c(i0 + j)) })) });

const HOLD = null; // a beat with nothing to change: no whip, no sound; the change before holds on through it
const held = (k) => k.as ?? k; // what a key is once it has landed

const SCORE = [
  // Bar 1: the logo, landed on the last beat, held to be read.
  HOLD, HOLD, HOLD, HOLD,
  // Bar 2: the breaks. The S's top slots through the edge, then the lower ones, the counter rising, the bands squashing: the modular mark.
  { q: TOP, box: whole(LOGO), cue: { kind: 'snap', key: 'openTop', pan: [across(c(0)), across(c(7))] } },
  { q: BOTH, box: whole(LOGO), cue: { kind: 'snap', key: 'openBot', pan: [across(c(0)), across(c(7))] } },
  { q: RAISED, box: whole(LOGO), cue: { kind: 'land', key: 'counter', pan: [across(c(5)), across(c(5))] } },
  { q: MODULAR, box: whole(MODULAR), cue: { kind: 'spring', key: 'stem', pan: [0, 0] } },
  // Bar 3: the crop takes the H, the S, the A (the S M), and half the M.
  { q: NO_H, box: whole(NO_H), cue: crop(W, NO_H.w, 'D5', 2) },
  { q: NO_S, box: whole(NO_S), cue: crop(NO_H.w, NO_S.w, 'C5', 2) },
  { q: S_M, box: whole(S_M), cue: crop(NO_S.w, S_M.w, 'A4', 2) },
  { q: HALF_M, box: whole(HALF_M), cue: crop(S_M.w, HALF_M.w, 'G4', 3) },
  // Bar 4: the rest of the M: the S. Then the !, each held a beat.
  { q: S_ALONE, box: whole(S_ALONE), cue: crop(HALF_M.w, S_ALONE.w, 'F4', 3) },
  HOLD,
  { q: BANG, box: whole(BANG), cue: crop(S_ALONE.w, B, 'D4', 4) },
  HOLD,
  // Bar 5: the !'s stem drops away, down to the square; held.
  { q: SQUARE, box: whole(SQUARE), cue: { kind: 'sweep', key: 'top', note: 'D3', to: 5, pan: [0, 0] } },
  HOLD, HOLD, HOLD,
  // Bar 6: the square grows to fill the screen in two hits, where it becomes the logo's block, unseen.
  { q: SQUARE, box: part(SQUARE, [0.15, 0.15, 0.85, 0.85]), cue: punch() },
  HOLD,
  { q: SQUARE, box: part(SQUARE, [0.4, 0.4, 0.6, 0.6]), as: { q: BLOCK, box: part(BLOCK, [0.4, 0.4, 0.6, 0.6]) }, cue: punch() },
  HOLD,
  // Bars 7 and 8: the logo writes itself back through the block, a column a beat (two at a time at the end), the camera pulling back with it.
  { q: open(1), box: writing(1), cue: reveal(0, 1) },
  { q: open(2), box: writing(2), cue: reveal(1, 2) },
  { q: open(3), box: writing(3), cue: reveal(2, 3) },
  { q: open(4), box: writing(4), cue: reveal(3, 4) },
  { q: open(5), box: writing(5), cue: reveal(4, 5) },
  { q: open(7), box: writing(7), cue: reveal(5, 7) },
  { q: open(9), box: writing(9), cue: reveal(7, 9) },
  { q: LOGO, box: whole(LOGO), cue: reveal(9, 10, true) },
];
// For each beat, the beat of the change that landed last (round the loop); a hold is that change, landed.
const LAST = SCORE.map((_, b) => { let l = b; while (!SCORE[l]) l = (l + BEATS - 1) % BEATS; return l; });
const KEYS = SCORE.map((k, b) => k ?? { ...held(SCORE[LAST[b]]), hold: true });
const STATES_ON_BEATS = KEYS.map((k) => held(k).q);

// ---------------------------------------------------------------------------
// Time


/** Measures e of the way from a to b: the bands in proportion (as engine.js), the slot columns each, the rest straight. */
function mixQ(a, b, e) {
  const q = { ...a };
  for (const k of ['openTop', 'openBot', 'counter', 'w', 'top', 'slot']) q[k] = mix(a[k], b[k], e);
  q.stem = a.stem * (b.stem / a.stem) ** e;
  if (a.cols || b.cols) {
    const ca = a.cols ?? Array(10).fill(a.slot), cb = b.cols ?? Array(10).fill(b.slot);
    q.cols = ca.map((v, i) => mix(v, cb[i], e));
  }
  return q;
}

/**
 * The measures and the camera's view at time t (seconds), for a screen of
 * the given aspect: the last change landed, still; in the last WHIP
 * before a beat with a change, the whip from there into it.
 */
function stateAt(t, aspect = 16 / 9) {
  t = wrap(t);
  const b = Math.min(BEATS - 1, Math.floor(t / BEAT + 1e-9));
  const s = t - b * BEAT;
  const from = held(KEYS[LAST[b]]), to = KEYS[(b + 1) % BEATS];
  const A = lens(from.box, aspect);
  const u = (s - (BEAT - WHIP)) / WHIP;
  if (to.hold || u <= 0) return { q: from.q, view: viewOf(A, aspect) };
  const e = whip(u);
  return { q: mixQ(from.q, to.q, e), view: viewOf(between(A, lens(to.box, aspect), e), aspect) };
}

/**
 * Whether the shutter at t reaches into a whip, where the smear is drawn. The
 * shutter opens at t and looks ahead, so the frame on the beat, and every
 * frame after it, is the landed mark, crisp.
 */
function moving(t) {
  t = wrap(t);
  const b = Math.min(BEATS - 1, Math.floor(t / BEAT + 1e-9));
  return t - b * BEAT > BEAT - WHIP - SHUTTER && !KEYS[(b + 1) % BEATS].hold;
}

/**
 * How far the picture moves across the shutter at t, as a share of the
 * screen's height: the camera's edges, and the mark's own moves (its crop,
 * its drop, its bands, its slots breaking out, its columns opening), added.
 */
function travel(t, aspect) {
  const a = stateAt(t, aspect), z = stateAt(t + SHUTTER, aspect);
  const cam = Math.max(...a.view.map((v, i) => Math.abs(v - z.view[i])));
  const d = (k) => Math.abs(a.q[k] - z.q[k]);
  const cols = a.q.cols && z.q.cols ? Math.max(...a.q.cols.map((v, i) => Math.abs(v - z.q.cols[i]))) : 0;
  // A slot's end breaking out runs from a bar in to past the edge: c(2) (a bar and a half-slot, and two pitches).
  const mark = Math.max(d('w'), d('top'), 2 * d('stem'), d('counter'), (d('openTop') + d('openBot')) * c(2), cols * S);
  return (cam + mark) / Math.min(a.view[3], z.view[3]);
}

/**
 * The frame at time t: the camera's view, and the drawing inside it. In a
 * whip, the drawing is moments across the shutter, each placed as its own
 * camera saw it, added up at an equal share each (plus-lighter, in a group of
 * its own) so they make the true average: motion blur, on paper or on ink.
 * The faster it moves, the more moments (SAMPLES, doubling up to MOST, so
 * they are STEP apart); where even MOST are further apart than that, a blur
 * as wide as the gap joins them into one smear.
 */
function frameAt(t, aspect = 16 / 9) {
  const base = stateAt(t, aspect);
  if (!moving(t)) return { view: base.view, svg: draw(base.q).svg };
  const [x, y, w, h] = base.view;
  const far = travel(t, aspect);
  const n = Math.min(MOST, SAMPLES * 2 ** Math.max(0, Math.ceil(Math.log2(far / STEP / SAMPLES))));
  let svg = '';
  for (let i = 0; i < n; i++) {
    const { q, view } = stateAt(t + ((i + 0.5) / n) * SHUTTER, aspect);
    svg += `<g style="mix-blend-mode:plus-lighter" opacity="${+(1 / n).toFixed(5)}" transform="translate(${f(x)} ${f(y)}) scale(${+(h / view[3]).toFixed(6)}) translate(${f(-view[0])} ${f(-view[1])})">${draw(q, `seq-m${i}`).svg}</g>`;
  }
  const gap = (far / n) * h; // how far apart the moments are, in the view's units
  if (gap <= STEP * h) return { view: base.view, svg: `<g style="isolation:isolate">${svg}</g>` };
  const blur = `<defs><filter id="seq-blur" filterUnits="userSpaceOnUse" x="${f(x - w)}" y="${f(y - h)}" width="${f(3 * w)}" height="${f(3 * h)}"><feGaussianBlur stdDeviation="${f(gap * 0.6)}"/></filter></defs>`;
  return { view: base.view, svg: `${blur}<g style="isolation:isolate" filter="url(#seq-blur)">${svg}</g>` };
}

/** The whole frame at time t as an SVG string for a screen of the given aspect. */
function svgAt(t, aspect = 16 / 9) {
  const { view, svg } = frameAt(t, aspect);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox(view)}" preserveAspectRatio="xMidYMid meet">${svg}</svg>`;
}

// ---------------------------------------------------------------------------
// The score, for the player: a hold on each beat (where the arrows step to),
// and each change's move with its sound, starting WHIP before its beat.

const SEGMENTS = [];
KEYS.forEach((k, b) => {
  SEGMENTS.push({ hold: b, t0: b * BEAT });
  if (!k.hold) SEGMENTS.push({ beat: b, key: k.cue.key, feel: k.cue.kind, t0: wrap(b * BEAT - WHIP), move: WHIP, hit: WHIP });
});
SEGMENTS.sort((x, y) => x.t0 - y.t0);

/** A change's sound (sound.js): its move into the beat, the whip's curve, the hit on the beat; the !'s breath through the holds after it. */
function cueOf(seg) {
  const { cue } = KEYS[seg.beat];
  let n = 1;
  while (n < BEATS && KEYS[(seg.beat + n) % BEATS].hold) n++;
  const columns = cue.columns?.map((col, j) => ({ ...col, at: WHIP + j * 0.018 })); // strummed, left to right, from the beat
  return { ...cue, d: WHIP, ease: whip, hit: WHIP, pan: cue.pan ?? [0, 0], to: cue.to ?? 0, until: n * BEAT, columns };
}

const loopSound = loopSoundFor(PERIOD, SEGMENTS, cueOf);

export { VERSION, PUNCHY, TEMPO, UNIT, BEAT, WHIP, SAMPLES, MOST, KEYS, SEGMENTS, PERIOD, START, EASE, wrap, stateAt, frameAt, draw, svgAt, viewBox, cueOf, loopSound };
export { STATES_ON_BEATS as STATES };
