// identity-cm (2026-10-22): CM.SUPPLY's wordmark with a capital A and the S's and the H's bridges.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const G = await import('../src/identity-cm/geometry.js');

/** Path data of corners only (M, L, Z), as its subpaths' corners; every subpath closed. */
const polys = (d) => d.split('M').filter(Boolean).map((sp) => {
  assert.match(sp, /Z$/);
  return sp.replace('Z', '').split('L').map((p) => p.trim().split(/\s+/).map(Number));
});
/** The slope of every side that is neither across nor down. */
const slopes = (d) => polys(d).flatMap((p) => p.map(([x, y], i) => {
  const [x2, y2] = p[(i + 1) % p.length];
  return Math.abs(x - x2) > 1e-6 && Math.abs(y - y2) > 1e-6 ? (y2 - y) / (x2 - x) : null;
}).filter((s) => s !== null));
const NONE = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
const SQUARE = { ...G.CM, round: 0, aRound: 0, aTop: 'cut', corners: NONE }; // corners only
const one = (p, l) => G.row(p, p.height, l, [[0, 0, 0, 0]]).d;

test('the wordmark is their tall one: 1880 × 541', () => {
  const w = G.wordmark(G.CM);
  assert.equal(w.w, 1880);
  assert.equal(w.h, 541);
  for (const sp of w.d.split('M').filter(Boolean)) assert.match(sp, /Z$/);
});

test('bridged, the S and the H are one piece each; open, two, as theirs', () => {
  for (const l of ['S', 'H']) {
    assert.equal(polys(one({ ...SQUARE, sBridge: 1, hBridge: 1 }, l)).length, 1, `${l} bridged`);
    assert.equal(polys(one({ ...SQUARE, sBridge: 0, hBridge: 0 }, l)).length, 2, `${l} open`);
  }
  assert.equal(polys(one(SQUARE, 'A')).length, 2); // the A and its counter
});

test('every cut and the S\'s diagonal fall at one slope; level, the crossbars lie flat', () => {
  const k = G.CM.slope;
  const d = G.wordmark(SQUARE).d;
  assert.ok(slopes(d).length);
  for (const s of slopes(d)) assert.ok(Math.abs(s - k) < 2e-3, `slope ${s}`); // (the path is written to 2 decimals)
  // Level crossbars: the A's and the H's sides flat; their slot ends still cut.
  const A = one({ ...SQUARE, level: 1 }, 'A'), cuts = slopes(A);
  assert.equal(cuts.length, 1); // the counter's top, cut
});

test('the S is the same turned upside down when its openings match and its middle is centred', () => {
  const p = { ...SQUARE, upper: 34, lower: 34, rise: 0 };
  const w = G.widthOf(p, 'S'), h = p.height;
  for (const sBridge of [0, 1]) {
    const d = one({ ...p, sBridge }, 'S');
    const pts = (f) => polys(d).map((q) => q.map(f).map(([x, y]) => `${x.toFixed(6)},${y.toFixed(6)}`).sort().join(' ')).sort();
    assert.deepEqual(pts(([x, y]) => [w - x, h - y]), pts(([x, y]) => [x, y]));
  }
});

test('a block lower than the S allows is raised to it', () => {
  const low = G.least(G.CM);
  assert.ok(low > 100 && low < 220, `least ${low}`); // their S M is about 220
  assert.equal(G.row(G.CM, 50).h, low);
  assert.equal(G.symbol(G.CM).h, 220);
});

test('every outer and cut round draws without breaking the outline', () => {
  const d = G.wordmark(G.CM).d;
  assert.match(d, /C/);
  assert.match(d, /A/);
  assert.doesNotMatch(d, /NaN|Infinity/);
});
