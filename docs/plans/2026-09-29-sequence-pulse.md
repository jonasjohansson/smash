# The sequence on the pulse (2D, `?pulse`): implementation plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** A new version of the sequence, `/identity/sequence/?pulse`: the same story (logo → modular mark → S M → S → ! → square → logo), with a hit on every beat. Each beat has a whip into it, a dead stop on it, a camera drift after it, and a motion-blur smear through the fast frames. The design is in `docs/plans/2026-09-29-sequence-pulse-design.md`.

**Architecture:** A new module, `web/src/identity/sequence/pulse.js`, exports the same interface as `engine.js`, so `player.js`, the page and the MP4 take either one. It reuses `engine.js`'s drawing and camera maths, which this plan exports. Its score is 32 keys, one per beat; each key is a set of measures plus a framing box. `stateAt(t)` whips from the drifted last key into the next. The smear draws several sub-frame copies, blended with `mix-blend-mode: plus-lighter` inside an isolated group. The sound reuses `sound.js`, with one new cue kind, `punch`.

**Tech stack:** Plain ES modules in the browser (no bundler), SVG, Web Audio, WebCodecs through `video.js`. Tests run on `node --test` (Node 22) with a stubbed `location`. Browser checks use Python Playwright against `web/scripts/identity-serve.py`.

**Conventions:** Match the surrounding code: prose comments in full sentences, British-leaning plain English, no semicolon-free style changes, and commit messages as a plain sentence in the imperative (see `git log`), ending with the `Co-Authored-By` line.

Two deliberate differences from the design doc's beat table:

1. **The square fills the screen on beat 28, not beat 24.** Filling it earlier would leave four beats of solid ink. Bar 6 and bar 7 now close in on the square a step per beat, and the swap to the logo's block happens on beat 28 (key 27).
2. **The `/identity` section stays on the classic sequence.** Only the sequence's own page gets `?pulse`, for now.

---

### Task 1: Open engine.js up for a second sequence

**Files:**
- Modify: `web/src/identity/sequence/engine.js`
- Modify: `web/package.json` (a `test` script)
- Create: `web/test/sequence-engine.test.js`

**Step 1: Write the failing test**

`web/test/sequence-engine.test.js`:

```js
// engine.js as a library for other sequences: its geometry and camera, a
// drawing with its own mask id and per-column slots, a frame, the MP4's start.
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.location = { search: '' };
const E = await import('../src/identity/sequence/engine.js');

test('the geometry and the camera are exported', () => {
  for (const name of ['W', 'S', 'B', 'FOOT', 'c', 'lens', 'between', 'viewOf', 'frameAt', 'loopSoundFor', 'START']) assert.ok(name in E, name);
  assert.equal(+E.W.toFixed(2), 549.58);
  assert.equal(+E.FOOT.toFixed(2), 103.56);
});

test('draw takes its own mask id', () => {
  const { svg } = E.draw(E.STATES[0], 'seq-m3');
  assert.match(svg, /<mask id="seq-m3"/);
  assert.match(svg, /mask="url\(#seq-m3\)"/);
  assert.match(E.draw(E.STATES[0]).svg, /<mask id="seq-m"/);
});

test('draw opens slot columns by the given amounts', () => {
  const block = E.STATES[6];
  const shut = E.draw({ ...block, cols: Array(10).fill(0) }).svg;
  const first = E.draw({ ...block, cols: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0] }).svg;
  assert.doesNotMatch(shut, /stroke-width/);
  assert.equal(first.match(/stroke-width="20"/g).length, 2); // the S's two slots in column 0
});

test('a frame is the view and the drawing, and svgAt is made from it', () => {
  const { view, svg } = E.frameAt(1, 16 / 9);
  assert.equal(view.length, 4);
  assert.ok(E.svgAt(1).includes(svg));
});

test('the MP4 starts where it did', () => {
  assert.equal(E.START, (E.HOLDS[0] - 3) * E.UNIT);
});
```

`web/package.json`, in `"scripts"`, add:

```json
    "test": "node --test test/",
```

**Step 2: Run it to see it fail**

Run: `cd web && npm test`
Expected: FAIL, because `W`, `frameAt` and the rest are not exported and `draw` ignores the id.

**Step 3: Implement**

In `engine.js`:

1. In `draw`, add the id and the columns. Change the signature to `function draw(q, id = 'seq-m') {`, and put the columns first in `widthOf`:

```js
  // Each slot's width: by column where given (the pulse's reveal), all as one, or, as the logo writes itself, each column opening a thirty-second after the one before.
  const widthOf = (col) => (q.cols ? S * q.cols[col] : q.reveal === undefined ? S * q.slot : S * Math.max(0, EASE.reveal(Math.max(0, Math.min(1, (q.reveal - col * STAGGER) / (1 - 9 * STAGGER))))));
```

   In the `svg` string, replace `id="seq-m"` with `id="${id}"` and `mask="url(#seq-m)"` with `mask="url(#${id})"`. Update the doc comment: "The mark for measures q, as the inside of an SVG, its mask named id: …".

2. Add a frame after `stateAt`'s drawing section, and build `svgAt` from it:

```js
/** The frame at time t for a screen of the given aspect: the camera's view, and the drawing inside it. */
function frameAt(t, aspect = 16 / 9) {
  const { q, view } = stateAt(t, aspect);
  return { view, svg: draw(q).svg };
}

/** The whole frame at time t as an SVG string for a screen of the given aspect: the camera's view of the mark, in currentColor, no ground. */
function svgAt(t, aspect = 16 / 9) {
  const { view, svg } = frameAt(t, aspect);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox(view)}" preserveAspectRatio="xMidYMid meet">${svg}</svg>`;
}
```

3. Make the loop's sound work for any sequence:

```js
/** One loop's sound for a sequence, rendered offline: an AudioBuffer, each cue at its own time, the tail folded onto the start. */
function loopSoundFor(period, segments, cueOf) {
  return async (rate = 48000) => {
    const tail = 2.5;
    const ctx = new OfflineAudioContext(2, Math.ceil((period + tail) * rate), rate);
    const s = createSound({ context: ctx });
    await s.start();
    for (const seg of segments) if (seg.key) s.play(cueOf(seg), seg.t0);
    const buf = await ctx.startRendering();
    const n = Math.round(period * rate);
    const out = new AudioBuffer({ numberOfChannels: 2, length: n, sampleRate: rate });
    for (let ch = 0; ch < 2; ch++) {
      const src = buf.getChannelData(ch);
      const dst = out.getChannelData(ch);
      dst.set(src.subarray(0, n));
      for (let i = n; i < src.length; i++) dst[i - n] += src[i]; // the tail over the loop's start, so it loops without a seam
    }
    return out;
  };
}
const loopSound = loopSoundFor(PERIOD, SEGMENTS, cueOf);
```

   This replaces the old `async function loopSound`.

4. Where the MP4 starts, next to `PERIOD`:

```js
const START = (HOLDS[0] - 3) * UNIT; // the MP4 opens here: on a whole frame, a quarter of a second before the first move
```

5. The export line:

```js
export { VERSION, PUNCHY, TEMPO, UNIT, STATES, SCORE, HOLDS, SEGMENTS, PERIOD, START, EASE, W, S, B, FOOT, c, wrap, lens, between, viewOf, stateAt, frameAt, draw, svgAt, viewBox, cueOf, loopSound, loopSoundFor };
```

**Step 4: Run the tests**

Run: `cd web && npm test`
Expected: PASS, 5 tests.

**Step 5: Commit**

```bash
git add web/package.json web/test/sequence-engine.test.js web/src/identity/sequence/engine.js
git commit -m "Open the sequence's engine up for a second sequence

Its geometry and camera exported, a drawing with its own mask id and slots
opened by column, a frame of view and drawing, the MP4's start, and the
loop's sound for any score. Tests on node --test.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: The pulse's keys and its time

**Files:**
- Create: `web/src/identity/sequence/pulse.js`
- Create: `web/test/sequence-pulse.test.js`

**Step 1: Write the failing test**

`web/test/sequence-pulse.test.js`:

```js
// pulse.js: 32 keys, one landing on each beat; a whip into each, a drift after.
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.location = { search: '?pulse' };
const P = await import('../src/identity/sequence/pulse.js');
const E = await import('../src/identity/sequence/engine.js');

const near = (a, b, tol = 1e-6) => a.every((x, i) => Math.abs(x - b[i]) <= tol * Math.max(1, Math.abs(b[i])));
const held = (k) => k.as ?? k;

test('the loop is 32 beats of half a second', () => {
  assert.equal(P.KEYS.length, 32);
  assert.equal(P.BEAT, 0.5);
  assert.equal(P.PERIOD, 16);
  const holds = P.SEGMENTS.filter((s) => s.hold !== undefined);
  assert.deepEqual(holds.map((s) => s.t0), P.KEYS.map((_, b) => b * 0.5));
});

test('every key lands exactly on its beat, and the moment before is it too', () => {
  for (const aspect of [16 / 9, 4 / 3, 1]) {
    P.KEYS.forEach((k, b) => {
      const on = P.stateAt(b * P.BEAT, aspect);
      assert.deepEqual(on.q, held(k).q, `beat ${b}`);
      assert.ok(near(on.view, E.viewOf(E.lens(held(k).box, aspect), aspect)), `beat ${b} view`);
      const before = P.stateAt(b * P.BEAT - 1e-7, aspect);
      assert.ok(near(before.view, E.viewOf(E.lens(k.box, aspect), aspect), 1e-4), `beat ${b} arrives`);
      assert.ok(Math.abs(before.q.w - k.q.w) < 1e-3, `beat ${b} arrives: w`);
    });
  }
});

test('the story passes through every state, and ends on the block', () => {
  const qs = P.KEYS.map((k) => k.q);
  for (const i of [0, 1, 2, 3, 4, 5]) assert.ok(qs.includes(E.STATES[i]), `state ${i}`);
  assert.equal(P.KEYS.find((k) => k.as).as.q, E.STATES[6]);
});

test('between the whips only the camera moves, pushing in', () => {
  P.KEYS.forEach((k, b) => {
    const a = P.stateAt(b * P.BEAT + 0.02), z = P.stateAt(b * P.BEAT + P.BEAT - P.WHIP - 0.01);
    assert.deepEqual(a.q, held(k).q);
    assert.deepEqual(z.q, held(k).q);
    assert.ok(z.view[3] < a.view[3], `beat ${b} drifts in`);
  });
});

test('the square becomes the block unseen: the screen is all ink either side', () => {
  const b = P.KEYS.findIndex((k) => k.as);
  for (const aspect of [16 / 9, 4 / 3, 1, 9 / 16]) {
    for (const t of [b * P.BEAT - 1e-9, b * P.BEAT]) {
      const { q, view: [x, y, w, h] } = P.stateAt(t, aspect);
      const [x0, y0, x1, y1] = E.draw(q).box;
      assert.ok(x >= x0 && y >= y0 && x + w <= x1 && y + h <= y1, `aspect ${aspect}, t ${t}`);
    }
  }
});
```

**Step 2: Run it to see it fail**

Run: `cd web && npm test`
Expected: FAIL, because `pulse.js` does not exist.

**Step 3: Implement**

`web/src/identity/sequence/pulse.js`:

```js
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

// ---------------------------------------------------------------------------
// The score, for the player: a hold on each beat (where the arrows step to),
// and each beat's move with its sound, starting WHIP before it.

const SEGMENTS = [];
KEYS.forEach((k, b) => {
  SEGMENTS.push({ hold: b, t0: b * BEAT });
  SEGMENTS.push({ beat: b, key: k.cue.key, feel: k.cue.kind, t0: wrap(b * BEAT - WHIP), move: WHIP, hit: WHIP });
});
SEGMENTS.sort((x, y) => x.t0 - y.t0);

export { VERSION, PUNCHY, TEMPO, UNIT, BEAT, WHIP, KEYS, SEGMENTS, PERIOD, START, EASE, wrap, stateAt, draw, viewBox };
export { STATES_ON_BEATS as STATES };
```

**Step 4: Run the tests**

Run: `cd web && npm test`
Expected: PASS, 10 tests. If "every key lands exactly" fails on `q` for the key after the block (key 0 after key 31), check that `mixQ` is not reached at `u <= 0`. Landing is `s === 0` → `u < 0`.

**Step 5: Commit**

```bash
git add web/src/identity/sequence/pulse.js web/test/sequence-pulse.test.js
git commit -m "Lay the sequence out on the pulse: a key on every beat

32 keys, the story of the sequence a hit at a time: the logo punched into,
the breaks one by one, the crops a letter at a time, the ! and the square
closed in on, the logo written back in four. A whip into each beat, a dead
stop on it, the camera drifting in after.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: The smear

**Files:**
- Modify: `web/src/identity/sequence/pulse.js`
- Modify: `web/test/sequence-pulse.test.js`

**Step 1: Write the failing test**

Append to `web/test/sequence-pulse.test.js`:

```js
test('the smear runs only in the whips, each copy with its own mask', () => {
  const still = P.frameAt(4 * P.BEAT + 0.2);
  assert.equal(still.svg.match(/<mask /g).length, 1);
  const fast = P.frameAt(5 * P.BEAT - 0.01);
  const ids = [...fast.svg.matchAll(/<mask id="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(ids.length, P.SAMPLES);
  assert.equal(new Set(ids).size, P.SAMPLES);
  assert.match(fast.svg, /isolation:isolate/);
  assert.match(fast.svg, /mix-blend-mode:plus-lighter/);
  assert.ok(P.svgAt(5 * P.BEAT - 0.01).startsWith('<svg '));
});
```

**Step 2: Run it to see it fail**

Run: `cd web && npm test`
Expected: FAIL, because `frameAt` is not a function.

**Step 3: Implement**

In `pulse.js`, next to the other constants:

```js
const SHUTTER = 1 / 40; // the smear: how much time each frame sees, live and in the MP4 alike
const SAMPLES = 8; // and how many moments across it are drawn
```

After `stateAt`:

```js
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
```

Add `SAMPLES, frameAt, svgAt` to the first export line.

**Step 4: Run the tests**

Run: `cd web && npm test`
Expected: PASS, 11 tests.

**Step 5: Commit**

```bash
git add web/src/identity/sequence/pulse.js web/test/sequence-pulse.test.js
git commit -m "Smear the pulse's whips

In a whip each frame is eight moments across a fortieth of a second, each
as its own camera saw it, added up to their average: motion blur that is
the same on screen and in the MP4.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: The pulse's sound

**Files:**
- Modify: `web/src/identity/sequence/sound.js`
- Modify: `web/src/identity/sequence/pulse.js`
- Modify: `web/test/sequence-pulse.test.js`

**Step 1: Write the failing test**

Append to `web/test/sequence-pulse.test.js`:

```js
test('every beat has a sound that hits on it', () => {
  const moves = P.SEGMENTS.filter((s) => s.key);
  assert.equal(moves.length, 32);
  for (const s of moves) {
    const cue = P.cueOf(s);
    assert.ok(['punch', 'snap', 'land', 'spring', 'sweep', 'reveal'].includes(cue.kind), cue.kind);
    assert.equal(cue.hit, P.WHIP);
    assert.equal(cue.d, P.WHIP);
    const beats = (s.t0 + cue.hit) / P.BEAT;
    assert.ok(Math.abs(beats - Math.round(beats)) < 1e-9, `hits on a beat: ${s.t0 + cue.hit}`);
  }
  const bang = P.cueOf(moves.find((s) => P.KEYS[s.beat].cue.to === 4));
  assert.equal(bang.until, 4 * P.BEAT); // the !'s breath lasts through its three punches
  const last = P.cueOf(moves.find((s) => s.beat === 31));
  assert.deepEqual(last.columns.map((c) => c.i), [9]);
  assert.equal(last.chord, true);
  assert.equal(typeof P.loopSound, 'function');
});
```

**Step 2: Run it to see it fail**

Run: `cd web && npm test`
Expected: FAIL, because `cueOf` is not a function.

**Step 3: Implement**

In `pulse.js`, after `SEGMENTS`:

```js
/** A beat's sound (sound.js): its move into the beat, the whip's curve, the hit on the beat; the !'s breath until the next beat that is not only the camera. */
function cueOf(seg) {
  const { cue } = KEYS[seg.beat];
  let n = 1;
  while (n < BEATS && KEYS[(seg.beat + n) % BEATS].cue.kind === 'punch') n++;
  const columns = cue.columns?.map((col, j) => ({ ...col, at: WHIP + j * 0.018 })); // strummed, left to right, from the beat
  return { ...cue, d: WHIP, ease: whip, hit: WHIP, pan: cue.pan ?? [0, 0], to: cue.to ?? 0, until: n * BEAT, columns };
}

const loopSound = loopSoundFor(PERIOD, SEGMENTS, cueOf);
```

Add `cueOf, loopSound` to the first export line.

In `sound.js`, `play`:

1. `sweep`: the lock's note can come with the cue. Replace `note: LOCK[to] ?? 'D4'` with `note: cue.note ?? LOCK[to] ?? 'D4'`.
2. A new case, after `follow`:

```js
      case 'punch': // the camera on the beat (?pulse): air rushing into the beat, and a soft knock on it
        whoosh(t0, d, c, { lo: 300, hi: 1400, q: 1, level: 0.22, pan, send: 0.15, tame: 2400 });
        thump(hit, { level: 0.14, pan: pan[1], from: 130, to: 62, len: 0.12 });
        break;
```

3. `reveal`: a column can name itself (its note is its column's), and the chord can be left out:

```js
      case 'reveal': { // the logo appearing through the block: each slot column plucks its note as it opens, over the chord
        const cols = cue.columns ?? [];
        cols.forEach((col, i) => {
          const last = col.i === undefined ? i === cols.length - 1 : col.i === 9;
          pluck(t0 + col.at, { note: ARPEGGIO[col.i ?? i], level: last ? 0.13 : 0.11, pan: col.pan, ring: last ? 1.1 : 0.55 });
        });
        if (cue.chord !== false) bloom(t0, d, c, { notes: ['D3', 'A3', 'D4', 'F4', 'A4', 'E5'], level: 0.16, ring: 2.4 });
        if (cols.length) thump(t0 + cols[0].at, { level: 0.24, from: 96, to: 49, len: 0.4 });
        break;
      }
```

Also update the header comment of `sound.js` with one sentence: "On the pulse (?pulse) the camera's punches get a rush of air and a soft knock on the beat, and the crops lock a step down each time, from D5."

**Step 4: Run the tests**

Run: `cd web && npm test`
Expected: PASS, 12 tests.

**Step 5: Commit**

```bash
git add web/src/identity/sequence/sound.js web/src/identity/sequence/pulse.js web/test/sequence-pulse.test.js
git commit -m "Give every beat of the pulse its sound

The camera's punches get air rushing into the beat and a knock on it, the
crops lock a step lower each letter, the ! breathes through its punches,
and the logo's columns pluck their notes a group at a time, the chord
under the last.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Put the pulse on the sequence's page

**Files:**
- Modify: `web/src/identity/sequence/player.js`
- Modify: `web/src/identity/sequence/sequence.js`

**Step 1: The player takes a sequence**

In `player.js`:

1. Replace the engine import with `import * as classic from './engine.js';`.
2. The options: `export function mountSequence(root, { engine = classic, t = 0, paused = false, paper = false, onState = () => {} } = {}) {`, and as its first line:

```js
  const { PERIOD, SEGMENTS, START, VERSION, wrap, frameAt, svgAt, viewBox, cueOf, loopSound } = engine;
```

   Add to the doc comment: "Options: engine (the sequence: engine.js by default, or pulse.js), t …".
3. `render()`:

```js
  function render() {
    const aspect = el.clientWidth / Math.max(1, el.clientHeight) || 16 / 9;
    const { view, svg } = frameAt(t, aspect);
    el.setAttribute('viewBox', viewBox(view));
    el.innerHTML = svg;
    if (scrub) scrub.value = String(Math.round((wrap(t) / PERIOD) * 1000));
  }
```

4. In `download`, replace `const start = (HOLDS[0] - 3) * UNIT; // …` with `const start = START;`, and change its comment. It said "a quarter of a second before the first move"; it now says "where the sequence says it opens".

**Step 2: The page picks one**

In `sequence.js`, replace the engine import and its uses:

```js
import { mountSequence } from './player.js';

const query = new URLSearchParams(location.search);
const E = await import(query.has('pulse') ? './pulse.js' : './engine.js');
```

   - `at`: `Math.min(E.STATES.length - 1, …)`, and `(E.SEGMENTS.find((s) => s.hold === at) ?? E.SEGMENTS.find((s) => s.from === at)).t0`, and `* E.PERIOD` for `?t`.
   - `mountSequence(root, { engine: E, … })`.
   - Keys: `p` and a new `b` swap versions.

```js
const swap = (name) => { const u = new URL(location.href); const on = u.searchParams.has(name); for (const v of ['punchy', 'calm', 'pulse']) u.searchParams.delete(v); if (!on) u.searchParams.set(name, ''); location.href = u.href; };
```

     with `else if (e.key === 'p') swap('punchy');` and `else if (e.key === 'b') swap('pulse');`.
   - `window.__sequence = { ...E, seek: player.seek };`
   - Header comment: add "b the version on the pulse (?pulse, pulse.js: a hit on every beat)", and change "?at=2 holds one of the states" to "?at=2 holds one of the states (on the pulse, one of the beats)".

**Step 3: Run the tests**

Run: `cd web && npm test`
Expected: PASS, 12 tests. The engine is unchanged by this task.

**Step 4: Check both versions load in a browser**

Start the server if it isn't running: `python3 web/scripts/identity-serve.py 8765 &`

Save as `$SCRATCH/load.py` (`$SCRATCH` = this session's scratchpad directory):

```python
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome')
    for q in ['', '?pulse', '?punchy', '?pulse&at=16']:
        pg = b.new_page(viewport={'width': 1280, 'height': 720})
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: m.type == 'error' and errs.append(m.text))
        pg.goto(f'http://localhost:8765/identity/sequence/{q}')
        pg.wait_for_function('document.documentElement.dataset.ready')
        pg.wait_for_timeout(1500)
        print(q or '(snappy)', pg.evaluate('window.__sequence.VERSION'), pg.evaluate('document.querySelector(".seq-mark").innerHTML.length'), errs or 'no errors')
    b.close()
```

Run: `python3 $SCRATCH/load.py`
Expected: four lines: `(snappy) snappy …`, `?pulse pulse …`, `?punchy punchy …`, `?pulse&at=16 pulse …`, each with a non-zero length and `no errors`.

**Step 5: Commit**

```bash
git add web/src/identity/sequence/player.js web/src/identity/sequence/sequence.js
git commit -m "Play the pulse on the sequence's page, as ?pulse

The player takes a sequence; the page picks engine.js or pulse.js, and b
swaps to the pulse and back, as p does for the punchy one.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Check it by eye, and measure it like the reference

**Files:** none in the repo. Outputs go to `$SCRATCH/pulse/`.

**Step 1: Stills on the beats and in the whips**

Save as `$SCRATCH/shoot.py`:

```python
import os
from playwright.sync_api import sync_playwright
out = os.path.join(os.environ['SCRATCH'], 'pulse'); os.makedirs(out, exist_ok=True)
# on beats 0, 3, 7, 11, 16, 20, 27, 28, 31; mid-whip into beats 4, 9, 20, 28; mid-drift of 18
times = [0, 1.5, 3.5, 5.5, 8, 10, 13.5, 14, 15.5, 1.97, 4.47, 9.97, 13.97, 9.2]
with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome')
    pg = b.new_page(viewport={'width': 1280, 'height': 720})
    for t in times:
        pg.goto(f'http://localhost:8765/identity/sequence/?pulse&t={t / 16}')
        pg.wait_for_function('document.documentElement.dataset.ready')
        pg.wait_for_timeout(300)
        pg.screenshot(path=f'{out}/t{t:05.2f}.png')
    b.close()
print(out)
```

Run: `SCRATCH=<scratchpad> python3 $SCRATCH/shoot.py`, then look at each PNG.

Expected:

- On the beats: a clean, crisp mark. The S M close-up on beat 1, the ! on 16, the square on 20, all ink on 27, the S opening on 28, the whole logo on 31.
- In the whips: a soft grey smear between two framings, **not** hard overlapping copies. Hard copies mean plus-lighter isn't compositing. Fall back to a plain `opacity` without the blend mode, and note it.
- Nothing framed off the mark by mistake, such as a blank screen outside of beat 27.

Fix any framing that reads badly by changing that key's box in `KEYS` (Task 2), re-run `npm test`, and commit as "Tune the pulse's framings".

**Step 2: An MP4, measured**

Add to the same script (or a second one) and run it:

```python
    pg.goto('http://localhost:8765/identity/sequence/?pulse')
    pg.wait_for_function('document.documentElement.dataset.ready')
    with pg.expect_download(timeout=600000) as d:
        pg.evaluate('document.querySelector(".download").click()')
    d.value.save_as(f'{out}/pulse.mp4')
```

Then measure it the way the reference was measured:

```bash
cd $SCRATCH/pulse && ffmpeg -v error -i pulse.mp4 -vf "scale=180:-1,tblend=all_mode=difference,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=diff.txt" -f null - && awk '/pts_time/{split($0,a,"pts_time:");t=a[2]} /YAVG/{split($0,b,"=");v=b[2]; n=int(v*4); s=""; for(i=0;i<n;i++)s=s"#"; printf "%5.2f %6.2f %s\n",t,v,s}' diff.txt | head -80
```

Expected: a spike every 0.5 s, at file times 0.25, 0.75, 1.25 … (the file opens at START = 0.25 s into the loop). Low but **non-zero** motion between the spikes, from the drift. Compare against the reference's profile: spikes every 0.5 s, never still.

Also check `ffprobe` shows a 16 s loop with an audio stream. Listen to it. Every beat should have a hit, and the !'s held note should last through its punches.

**Step 3: Report**

Show Jonas the stills (whips and beats) and the motion profile next to the reference's, and say what's still off. Tuning is by his eye.

---

### Task 7: Write it down

**Files:**
- Modify: `web/src/identity/README.md` (the `sequence/` bullet)
- Modify: `docs/plans/2026-09-29-sequence-pulse-design.md` (the two deviations at the top of this plan)
- Skynet wiki: today's log row (`$SKYNET/wiki/logs/2026-09-29.md`)

**Step 1: README**

In the `sequence/` bullet, after the sentence about the versions ("p (or `?punchy`) plays the punchier version (`?calm` the slow one)"), add:

> `?pulse` (or b) plays it on the pulse (`pulse.js`): the same story as a hit on every beat, after a reference of blocks tumbling and restacking. Each beat has a whip into it, a dead stop on it, the camera drifting in after, and a smear through the fast frames (eight moments across a fortieth of a second, added up). `pulse.js` exports what `engine.js` does, so the player and the MP4 take either one. Tests: `npm test` in `web/`.

**Step 2: The design doc**

Under "The beats", note that the square fills the screen on beat 28 (key 27), not 24, and that the `/identity` section stays on the classic sequence for now.

**Step 3: Commit**

```bash
git add web/src/identity/README.md docs/plans/2026-09-29-sequence-pulse-design.md
git commit -m "Write down the sequence on the pulse

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Step 4: The wiki log**

Append a row to today's activity table in `$SKYNET/wiki/logs/2026-09-29.md` for the SMASH project: "Sequence: new 2D version on the pulse (?pulse), after a reference of tumbling blocks; 3D version next." Follow the file's existing columns. Create it with the usual frontmatter if it's missing.

---

## After this: the 3D version

This gets its own brainstorm and plan once Jonas has seen the 2D version. It will use the same 32-beat map and sound, with the mark extruded in three.js (as `web/src/identity/extrude.js`), pieces tipping over their edges, and a camera that changes angle on the beat.
