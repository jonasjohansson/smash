// The sequence on the pulse (?pulse): the story of engine.js, the logo taken
// down to a square and written back, told as a hit on every beat, after a
// reference of translucent blocks tumbling and restacking. Eight bars at 120
// a minute: 32 beats, and on each one a new picture.
//
// Every beat has the same shape. A whip: the change packed into the last
// 0.12 s before the beat, slow off and fastest at the end. A snap: it lands
// on the beat and stops dead. A drift: until the next whip the camera keeps
// pushing in, slowly, so nothing is ever still. And a smear: in the whips
// each frame is the drawing at several moments across a shutter, averaged.
//
// Each beat is a key: the measures (engine.js's states, and the steps
// between them) and a framing (a box in the mark's space) that land on it,
// and the sound of the move into it. One key hides a change: the square,
// filling the screen, is then the logo's block (its `as`), unseen, and the
// logo writes itself back through it in four hits.
//
// It exports what engine.js does, so the player, the page and the MP4 take
// either one.

import { STATES, W, S, B, FOOT, c, draw, lens, between, viewOf, viewBox, loopSoundFor } from './engine.js';

const VERSION = 'pulse';
const PUNCHY = false;
const TEMPO = 120; // beats a minute
const UNIT = 60 / TEMPO / 4; // a sixteenth
const BEAT = 4 * UNIT; // half a second
const BEATS = 32; // eight bars
const PERIOD = BEATS * BEAT;
const WHIP = 0.12; // how long the move into a beat takes
const DRIFT = 0.035; // how far the camera pushes in over a beat, as a share of what it shows
const START = 2 * UNIT; // the MP4 opens here, on a whole frame, in the logo's drift
const SHUTTER = 1 / 40; // the smear: how much time each frame sees, live and in the MP4 alike
const SAMPLES = 8; // and how many moments across it are drawn

/** The whip: slow off and fastest at the end (an exponential ease-in), stopping dead on 1. */
const K = 5;
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
const band = (q, a, r, pad = 0.08) => part(q, [a, 0.5, r, 0.5], pad); // the stretch from a to r across, as close as the screen allows

const X = (x) => x / W; // an x as a share of the word
const SM_END = X(c(4) + S / 2); // the S M and the slot after it
const across = (x, w = W) => Math.max(-1, Math.min(1, (x / w) * 2 - 1)); // -1 left, 1 right
const dot = FOOT / (draw(BANG).box[3] - draw(BANG).box[1]); // where the !'s dot starts, a share of its height

// The sound of the move into each key (sound.js).
const punch = (pan = 0) => ({ kind: 'punch', key: 'cam', pan: [pan, pan] });
const crop = (from, to, note, state = 0) => ({ kind: 'sweep', key: 'w', note, to: state, pan: [across(from, from), across(to, from)] });
const reveal = (i0, i1, chord = false) => ({ kind: 'reveal', key: 'slot', chord, columns: Array.from({ length: i1 - i0 }, (_, j) => ({ i: i0 + j, pan: across(c(i0 + j)) })) });

const KEYS = [
  // Bar 1: the logo. It lands wide; the camera punches in on the S M, across to the A S H, and back out.
  { q: LOGO, box: whole(LOGO), cue: punch() },
  { q: LOGO, box: band(LOGO, 0, SM_END), cue: punch(-0.5) },
  { q: LOGO, box: band(LOGO, SM_END, 1), cue: punch(0.5) },
  { q: LOGO, box: whole(LOGO, 0.08), cue: punch() },
  // Bar 2: the breaks. The S's top slots through the edge, then the lower ones, the counter rising, the bands squashing: the modular mark.
  { q: TOP, box: whole(LOGO, 0.08), cue: { kind: 'snap', key: 'openTop', pan: [across(c(0)), across(c(7))] } },
  { q: BOTH, box: whole(LOGO, 0.08), cue: { kind: 'snap', key: 'openBot', pan: [across(c(0)), across(c(7))] } },
  { q: RAISED, box: whole(LOGO, 0.08), cue: { kind: 'land', key: 'counter', pan: [across(c(5)), across(c(5))] } },
  { q: MODULAR, box: whole(MODULAR), cue: { kind: 'spring', key: 'stem', pan: [0, 0] } },
  // Bar 3: in on the end the crop comes from; it takes the H, the S, the A: the S M.
  { q: MODULAR, box: band(MODULAR, 0.62, 1), cue: punch(0.6) },
  { q: NO_H, box: whole(NO_H), cue: crop(W, NO_H.w, 'D5') },
  { q: NO_S, box: whole(NO_S), cue: crop(NO_H.w, NO_S.w, 'C5') },
  { q: S_M, box: whole(S_M), cue: crop(NO_S.w, S_M.w, 'A4') },
  // Bar 4: the M in two hits: the S. Then in on its top, and on its foot, where it is going.
  { q: HALF_M, box: whole(HALF_M), cue: crop(S_M.w, HALF_M.w, 'A4') },
  { q: S_ALONE, box: whole(S_ALONE), cue: crop(HALF_M.w, S_ALONE.w, 'G4') },
  { q: S_ALONE, box: part(S_ALONE, [0, 0, 1, 0.55], 0.08), cue: punch(-0.3) },
  { q: S_ALONE, box: part(S_ALONE, [0, 0.45, 1, 1], 0.08), cue: punch(-0.3) },
  // Bar 5: the !, and the camera on it: its stem, its dot, all of it. The held breath, on the beat.
  { q: BANG, box: whole(BANG), cue: crop(S_ALONE.w, B, 'F4', 4) },
  { q: BANG, box: part(BANG, [0, 0.3, 1, 1], 0.08), cue: punch() },
  { q: BANG, box: part(BANG, [0, dot, 1, 1], 0.5), cue: punch() },
  { q: BANG, box: whole(BANG), cue: punch() },
  // Bar 6: the drop to the square; the camera in on it, then on its corners.
  { q: SQUARE, box: whole(SQUARE), cue: { kind: 'sweep', key: 'top', note: 'D4', to: 5, pan: [0, 0] } },
  { q: SQUARE, box: part(SQUARE, [0.1, 0.1, 0.9, 0.9]), cue: punch() },
  { q: SQUARE, box: part(SQUARE, [-0.15, -0.15, 0.35, 0.35]), cue: punch(-0.5) },
  { q: SQUARE, box: part(SQUARE, [0.65, 0.65, 1.15, 1.15]), cue: punch(0.5) },
  // Bar 7: closing in a beat at a time until it fills the screen, where it becomes the logo's block, unseen.
  { q: SQUARE, box: whole(SQUARE, 0.05), cue: punch() },
  { q: SQUARE, box: part(SQUARE, [0.1, 0.1, 0.9, 0.9]), cue: punch() },
  { q: SQUARE, box: part(SQUARE, [0.2, 0.2, 0.8, 0.8]), cue: punch() },
  { q: SQUARE, box: part(SQUARE, [0.4, 0.4, 0.6, 0.6]), as: { q: BLOCK, box: part(BLOCK, [0.4, 0.4, 0.6, 0.6]) }, cue: punch() },
  // Bar 8: the logo writes itself back through the block in four hits, the camera pulling back with it: the S, the M, the A S, the H.
  { q: open(2), box: part(BLOCK, [0, 0.3, 0.3, 0.7], 0.04), cue: reveal(0, 2) },
  { q: open(5), box: part(BLOCK, [0, 0.15, 0.55, 0.85], 0.04), cue: reveal(2, 5) },
  { q: open(9), box: part(BLOCK, [0.05, 0.05, 0.95, 0.95], 0.04), cue: reveal(5, 9) },
  { q: open(10), box: whole(BLOCK, 0.06), cue: reveal(9, 10, true) },
];
const STATES_ON_BEATS = KEYS.map((k) => k.q);

// ---------------------------------------------------------------------------
// Time

const held = (k) => k.as ?? k; // what a key is once it has landed
const drift = (L, s) => ({ ...L, v: L.v * (1 - DRIFT * s) }); // s of a beat after the hit: pushed in about the middle

/** Measures e of the way from a to b: the bands in proportion (as engine.js), the slot columns each, the rest straight. */
function mixQ(a, b, e) {
  const q = { ...a };
  for (const k of ['openTop', 'openBot', 'counter', 'w', 'top', 'slot']) q[k] = mix(a[k], b[k], e);
  q.stem = a.stem * (b.stem / a.stem) ** e;
  if (a.cols || b.cols) {
    const ca = a.cols ?? cols(10 * a.slot), cb = b.cols ?? cols(10 * b.slot);
    q.cols = ca.map((v, i) => mix(v, cb[i], e));
  }
  return q;
}

/**
 * The measures and the camera's view at time t (seconds), for a screen of
 * the given aspect: the last key landed, drifting; in the last WHIP before
 * the next beat, the whip from there into the next key.
 */
function stateAt(t, aspect = 16 / 9) {
  t = wrap(t);
  const b = Math.min(BEATS - 1, Math.floor(t / BEAT + 1e-9));
  const s = t - b * BEAT;
  const from = held(KEYS[b]), to = KEYS[(b + 1) % BEATS];
  const A = drift(lens(from.box, aspect), s / BEAT);
  const u = (s - (BEAT - WHIP)) / WHIP;
  if (u <= 0) return { q: from.q, view: viewOf(A, aspect) };
  const e = whip(u);
  return { q: mixQ(from.q, to.q, e), view: viewOf(between(A, lens(to.box, aspect), e), aspect) };
}

/** Whether the shutter at t reaches into a whip, where the smear is drawn. */
function moving(t) {
  const s = wrap(t) % BEAT;
  return s > BEAT - WHIP - SHUTTER / 2 || s < SHUTTER / 2;
}

/**
 * The frame at time t: the camera's view, and the drawing inside it. In a
 * whip, the drawing is SAMPLES moments across the shutter, each placed as its
 * own camera saw it, added up at 1/SAMPLES each (plus-lighter, in a group of
 * its own) so they make the true average: motion blur, on paper or on ink.
 */
function frameAt(t, aspect = 16 / 9) {
  const base = stateAt(t, aspect);
  if (!moving(t)) return { view: base.view, svg: draw(base.q).svg };
  const [x, y, , h] = base.view;
  let svg = '';
  for (let i = 0; i < SAMPLES; i++) {
    const { q, view } = stateAt(t + ((i + 0.5) / SAMPLES - 0.5) * SHUTTER, aspect);
    svg += `<g style="mix-blend-mode:plus-lighter" opacity="${f(1 / SAMPLES)}" transform="translate(${f(x)} ${f(y)}) scale(${+(h / view[3]).toFixed(6)}) translate(${f(-view[0])} ${f(-view[1])})">${draw(q, `seq-m${i}`).svg}</g>`;
  }
  return { view: base.view, svg: `<g style="isolation:isolate">${svg}</g>` };
}

/** The whole frame at time t as an SVG string for a screen of the given aspect. */
function svgAt(t, aspect = 16 / 9) {
  const { view, svg } = frameAt(t, aspect);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox(view)}" preserveAspectRatio="xMidYMid meet">${svg}</svg>`;
}

// ---------------------------------------------------------------------------
// The score, for the player: a hold on each beat (where the arrows step to),
// and each beat's move with its sound, starting WHIP before it.

const SEGMENTS = [];
KEYS.forEach((k, b) => {
  SEGMENTS.push({ hold: b, t0: b * BEAT });
  SEGMENTS.push({ beat: b, key: k.cue.key, feel: k.cue.kind, t0: wrap(b * BEAT - WHIP), move: WHIP, hit: WHIP });
});
SEGMENTS.sort((x, y) => x.t0 - y.t0);

/** A beat's sound (sound.js): its move into the beat, the whip's curve, the hit on the beat; the !'s breath until the next beat that is not only the camera. */
function cueOf(seg) {
  const { cue } = KEYS[seg.beat];
  let n = 1;
  while (n < BEATS && KEYS[(seg.beat + n) % BEATS].cue.kind === 'punch') n++;
  const columns = cue.columns?.map((col, j) => ({ ...col, at: WHIP + j * 0.018 })); // strummed, left to right, from the beat
  return { ...cue, d: WHIP, ease: whip, hit: WHIP, pan: cue.pan ?? [0, 0], to: cue.to ?? 0, until: n * BEAT, columns };
}

const loopSound = loopSoundFor(PERIOD, SEGMENTS, cueOf);

export { VERSION, PUNCHY, TEMPO, UNIT, BEAT, WHIP, SAMPLES, KEYS, SEGMENTS, PERIOD, START, EASE, wrap, stateAt, frameAt, draw, svgAt, viewBox, cueOf, loopSound };
export { STATES_ON_BEATS as STATES };
