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
