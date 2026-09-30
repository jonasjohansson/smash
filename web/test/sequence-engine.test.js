// engine.js as a library for other sequences: its geometry and camera, a
// drawing with its own mask id and per-column slots, a frame, the MP4's start.
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.location = { search: '' };
const E = await import('../src/identity/sequence/engine.js');

test('the geometry and the camera are exported', () => {
  for (const name of ['W', 'S', 'B', 'FOOT', 'c', 'lens', 'between', 'viewOf', 'frameAt', 'loopSoundFor', 'START']) assert.ok(name in E, name);
  assert.equal(+E.W.toFixed(2), 552); // on the grid of 4: 11 bars of 32, 10 slots of 20
  assert.equal(+E.FOOT.toFixed(2), 104);
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
