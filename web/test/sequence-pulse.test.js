// pulse.js: 32 beats, each a change of the mark landing on it or a hold; a
// whip into each change, still after.
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.location = { search: '?pulse' };
const P = await import('../src/identity/sequence/pulse.js');
const E = await import('../src/identity/sequence/engine.js');

const near = (a, b, tol = 1e-6) => a.every((x, i) => Math.abs(x - b[i]) <= tol * Math.max(1, Math.abs(b[i])));
const held = (k) => k.as ?? k;
const changes = P.KEYS.map((k, b) => [k, b]).filter(([k]) => !k.hold);

test('the loop is 32 beats of half a second', () => {
  assert.equal(P.KEYS.length, 32);
  assert.equal(P.BEAT, 0.5);
  assert.equal(P.PERIOD, 16);
  const holds = P.SEGMENTS.filter((s) => s.hold !== undefined);
  assert.deepEqual(holds.map((s) => s.t0), P.KEYS.map((_, b) => b * 0.5));
});

test('every change lands exactly on its beat, and the moment before is it too', () => {
  for (const aspect of [16 / 9, 4 / 3, 1]) {
    for (const [k, b] of changes) {
      const on = P.stateAt(b * P.BEAT, aspect);
      assert.deepEqual(on.q, held(k).q, `beat ${b}`);
      assert.ok(near(on.view, E.viewOf(E.lens(held(k).box, aspect), aspect)), `beat ${b} view`);
      const before = P.stateAt(b * P.BEAT - 1e-7, aspect);
      assert.ok(near(before.view, E.viewOf(E.lens(k.box, aspect), aspect), 1e-4), `beat ${b} arrives`);
      assert.ok(Math.abs(before.q.w - k.q.w) < 1e-3, `beat ${b} arrives: w`);
    }
  }
});

test('every hit changes the mark; the camera moves on its own only as the square grows', () => {
  const alone = changes.filter(([k, b]) => {
    const before = P.stateAt(b * P.BEAT - P.WHIP - 1e-6).q;
    return JSON.stringify(before) === JSON.stringify(k.q);
  });
  assert.deepEqual(alone.map(([k]) => k.q), [E.STATES[5], E.STATES[5]]);
  assert.ok(changes.length >= 20, `${changes.length} hits`);
});

test('a hold moves nothing', () => {
  P.KEYS.forEach((k, b) => {
    if (!k.hold) return;
    assert.deepEqual(P.stateAt(b * P.BEAT - 0.05), P.stateAt(b * P.BEAT + 0.05), `beat ${b}`);
  });
});

test('the story passes through every state, and ends on the block', () => {
  const qs = P.KEYS.map((k) => k.q);
  for (const i of [0, 1, 2, 3, 4, 5]) assert.ok(qs.includes(E.STATES[i]), `state ${i}`);
  assert.equal(P.KEYS.find((k) => k.as).as.q, E.STATES[6]);
});

test('between the whips nothing moves, not even the camera', () => {
  P.KEYS.forEach((k, b) => {
    const a = P.stateAt(b * P.BEAT + 0.02), z = P.stateAt(b * P.BEAT + P.BEAT - P.WHIP - 0.01);
    assert.deepEqual(a.q, held(k).q);
    assert.deepEqual(z, a, `beat ${b}`);
  });
});

test('the ! goes to the square in one drop, never through a colon', () => {
  const tops = P.KEYS.filter((k) => !k.hold).map((k) => held(k).q.top);
  assert.ok(tops.every((t) => t === 0 || t === E.FOOT), tops.join(' '));
});

test('the square becomes the block unseen: the screen is all ink either side', () => {
  const b = P.KEYS.findIndex((k) => k.as);
  for (const aspect of [16 / 9, 4 / 3, 1, 9 / 16]) {
    for (const t of [b * P.BEAT - 1e-9, b * P.BEAT, (b + 1) * P.BEAT]) {
      const { q, view: [x, y, w, h] } = P.stateAt(t, aspect);
      const [x0, y0, x1, y1] = E.draw(q).box;
      assert.ok(x >= x0 && y >= y0 && x + w <= x1 && y + h <= y1, `aspect ${aspect}, t ${t}`);
    }
  }
});

test('the smear runs only in the whips, each copy with its own mask, and the beat itself is crisp', () => {
  for (const [, b] of changes) assert.equal(P.frameAt(b * P.BEAT).svg.match(/<mask /g).length, 1, `beat ${b}`);
  assert.equal(P.frameAt(4 * P.BEAT + 0.2).svg.match(/<mask /g).length, 1);
  assert.equal(P.frameAt(2 * P.BEAT - 0.01).svg.match(/<mask /g).length, 1); // into a hold: nothing moves
  const fast = P.frameAt(5 * P.BEAT - 0.01);
  const ids = [...fast.svg.matchAll(/<mask id="([^"]+)"/g)].map((m) => m[1]);
  assert.ok([8, 16, 32].includes(ids.length), `${ids.length} moments`);
  assert.equal(new Set(ids).size, ids.length);
  assert.match(fast.svg, /isolation:isolate/);
  assert.match(fast.svg, /mix-blend-mode:plus-lighter/);
  assert.ok(P.svgAt(5 * P.BEAT - 0.01).startsWith('<svg '));
});

test('each moment of the smear sits where its own camera saw it', () => {
  const t = 8 * P.BEAT - 0.02, aspect = 16 / 9;
  const { view: [x, y, , h], svg } = P.frameAt(t, aspect);
  const moments = [...svg.matchAll(/translate\(([-\d.]+) ([-\d.]+)\) scale\(([-\d.]+)\) translate\(([-\d.]+) ([-\d.]+)\)/g)].map((m) => m.slice(1).map(Number));
  moments.forEach(([tx, ty, k, sx, sy], i) => {
    const view = P.stateAt(t + ((i + 0.5) / moments.length) * (1 / 40), aspect).view;
    // A world point at the moment's view's corner lands at the frame's corner, scaled by the ratio of their heights.
    assert.ok(Math.abs(tx + k * (view[0] + sx) - x) < 0.01 && Math.abs(ty + k * (view[1] + sy) - y) < 0.01, `moment ${i}`);
    assert.ok(Math.abs(k - h / view[3]) < 1e-4, `moment ${i} scale`);
  });
});

test('the faster the whip, the more moments, and past the most a blur joins them', () => {
  const count = (t) => P.frameAt(t).svg.match(/<mask /g).length;
  const pullBack = 24 * P.BEAT - 0.01; // out of the ink, back to the block's first column
  assert.equal(count(pullBack), P.MOST);
  assert.match(P.frameAt(pullBack).svg, /feGaussianBlur/);
  assert.ok(count(4 * P.BEAT - 0.1) < P.MOST); // early in a whip, slow off
});

test('every change has a sound that hits on its beat; a hold has none', () => {
  const moves = P.SEGMENTS.filter((s) => s.key);
  assert.equal(moves.length, changes.length);
  for (const s of moves) {
    const cue = P.cueOf(s);
    assert.ok(!P.KEYS[s.beat].hold);
    assert.ok(['punch', 'snap', 'land', 'spring', 'sweep', 'reveal'].includes(cue.kind), cue.kind);
    assert.equal(cue.hit, P.WHIP);
    assert.equal(cue.d, P.WHIP);
    const beats = (s.t0 + cue.hit) / P.BEAT;
    assert.ok(Math.abs(beats - Math.round(beats)) < 1e-9, `hits on a beat: ${s.t0 + cue.hit}`);
  }
  const bang = P.cueOf(moves.find((s) => P.KEYS[s.beat].cue.to === 4));
  assert.equal(bang.until, 2 * P.BEAT); // the !'s breath lasts through its hold
  const notes = moves.map((s) => P.cueOf(s)).filter((c) => c.kind === 'sweep').map((c) => c.note);
  assert.deepEqual(notes, ['D5', 'C5', 'A4', 'G4', 'F4', 'D4', 'D3']); // a step down each time
  const last = P.cueOf(moves.find((s) => s.beat === 31));
  assert.deepEqual(last.columns.map((c) => c.i), [9]);
  assert.equal(last.chord, true);
  assert.equal(typeof P.loopSound, 'function');
});

test('the view is always a real box, right up to each beat', () => {
  for (let b = 0; b < 32; b++) {
    for (const t of [b * P.BEAT - 1e-12, b * P.BEAT - 1e-10, b * P.BEAT, b * P.BEAT + 1e-10]) {
      const [, , w, h] = P.stateAt(t).view;
      assert.ok(w > 0 && h > 0 && Number.isFinite(w), `t ${t}: ${w} × ${h}`);
    }
  }
});
