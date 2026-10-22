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
  assert.ok(low > 100 && low < 217, `least ${low}`); // their short wordmark is 217
  assert.equal(G.row(G.CM, 50).h, low);
  assert.equal(G.symbol(G.CM).h, 217);
});

test('every outer and cut round draws without breaking the outline', () => {
  const d = G.wordmark(G.CM).d;
  assert.match(d, /C/);
  assert.match(d, /A/);
  assert.doesNotMatch(d, /NaN|Infinity/);
});

/** The corners of a mark's path, as numbers [x, y], round or not (every pair after a command). */
const points = (d) => [...d.matchAll(/[MLC]([^MLCAZ]+)/g)].flatMap(([, n]) => {
  const v = n.trim().split(/\s+/).map(Number), out = [];
  for (let i = 0; i < v.length; i += 2) out.push([v[i], v[i + 1]]);
  return out;
});

test('chopped, nothing is scaled: the S\'s middle and its ends come through, only shifted', () => {
  const p = { ...SQUARE, sBridge: 1 };
  const tall = new Set(points(one(p, 'S')).map(([x, y]) => `${x}`));
  const short = G.row(p, 217, 'S', [[0, 0, 0, 0]]);
  assert.equal(short.h, 217);
  // the same columns of corners, and the diagonals at the same slope
  assert.deepEqual(new Set(points(short.d).map(([x]) => `${x}`)), tall);
  for (const s of slopes(short.d)) assert.ok(Math.abs(s - G.CM.slope) < 2e-3, `slope ${s}`);
  // the top end and the bottom end as tall, the bottom one moved up by the chop
  const ys = (d) => points(d).map(([, y]) => y);
  assert.ok(ys(short.d).includes(25));
  assert.ok(ys(short.d).includes(217 - 25));
});

test('their short one: 217, chopped 162 above the middle and 162 below', () => {
  const p = { ...SQUARE, sBridge: 1 };
  const band = (d) => points(d).filter(([x]) => x === 139).map(([, y]) => y).sort((a, b) => a - b);
  const tall = band(one(p, 'S')), short = band(G.row(p, 217, 'S', [[0, 0, 0, 0]]).d);
  // at the slot's left side: the top end as tall, the band's top 162 up, the lower opening's flat bottom closed up
  // to the strip's edge (theirs 126.9), the bottom end 324 up
  assert.deepEqual(short.map((y) => +y.toFixed(2)), [tall[0], +(tall[1] - 162).toFixed(2), 127.35, +(tall[3] - 324).toFixed(2)]);
});

test('their a dips under the block, and taller blocks draw the strips back in', () => {
  const w = G.wordmark({ ...G.CM, a: 'a' });
  assert.ok(w.below > 6 && w.below < 10, `dip ${w.below}`); // theirs dips 8
  assert.match(G.svgOf(w), new RegExp(`viewBox="0 0 1880 ${+(541 + w.below).toFixed(2)}"`));
  assert.equal(G.wordmark(G.CM, 800).h, 800);
  assert.doesNotMatch(G.wordmark({ ...G.CM, a: 'a', hStyle: 'cut' }, 217).d, /NaN/);
});
