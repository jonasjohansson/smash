// Slant (2026-10-11): the mark with its curves cut straight, after CM.SUPPLY's
// round 4. On the grid of 4, every cut at one slope, the S the same upside down.
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.location = { search: '' };
const G = await import('../src/identity/directions/slant/geometry.js');

test('poly rounds a corner with an arc tangent to both its sides, and closes', () => {
  assert.equal(G.poly([[0, 0], [10, 0, 2], [10, 10], [0, 10]]), 'M0 0L8 0A2 2 0 0 1 10 2L10 10L0 10Z');
  assert.equal(G.poly([[0, 0], [10, 0], ['C', 10, 5, 5, 10, 0, 10]]), 'M0 0L10 0C10 5 5 10 0 10Z');
});

/** Path data of corners only (M, L, Z), as its subpaths' corners; every subpath closed. */
const polys = (d) => d.split('M').filter(Boolean).map((sp) => {
  assert.match(sp, /Z$/);
  return sp.replace('Z', '').split('L').map((p) => p.trim().split(/\s+/).map(Number));
});
const corners = (d) => polys(d).map((p) => p.map(([x, y]) => `${x},${y}`).sort().join(' ')).sort();
const turned = (d, w, h) => polys(d).map((p) => p.map(([x, y]) => `${w - x},${h - y}`).sort().join(' ')).sort();
const SQUARE = { ...G.SLANT, round: 0, a: 'flat' }; // no rounds and no swoop: corners only

test('every point of the letters is on the grid of 4, and every cut falls 8 in 20', () => {
  const d = G.letters(SQUARE);
  assert.doesNotMatch(d, /[AC]/);
  for (const p of polys(d)) {
    assert.deepEqual(p.flat().filter((n) => n % 4), []);
    p.forEach(([x, y], i) => {
      const [x2, y2] = p[(i + 1) % p.length];
      if (x !== x2 && y !== y2) assert.equal((y2 - y) / (x2 - x), 0.4, `${x},${y} to ${x2},${y2}`);
    });
  }
});

test('the S is the same upside down', () => {
  const S = G.letterPaths(SQUARE)[0];
  assert.deepEqual(turned(S, 84, 472), corners(S));
});

test('the slot ends are rounded 4 on their obtuse corners, and only there', () => {
  const arcs = [...G.letters(G.SLANT).matchAll(/A([\d.]+) ([\d.]+) 0 0 [01]/g)];
  assert.equal(arcs.length, 8); // two S's ends, the M's two, the a's two
  for (const [, rx, ry] of arcs) assert.deepEqual([rx, ry], ['4', '4']);
});

test('the a: inside stays in the block, below dips 12 under it, flat is square', () => {
  const ys = (a) => [...G.letterPaths({ ...G.SLANT, a })[2].matchAll(/[MLC][^MLCAZ]*/g)].flatMap(([s]) => s.slice(1).trim().split(/\s+/).map(Number).filter((n, i) => i % 2));
  assert.equal(Math.max(...ys('inside')), 472);
  assert.equal(Math.max(...ys('below')), 484);
  assert.match(G.letterPaths({ ...G.SLANT, a: 'inside' })[2], /C/);
  assert.doesNotMatch(G.letterPaths({ ...G.SLANT, a: 'flat' })[2], /C/);
  assert.equal(G.depth('below'), 12);
  assert.equal(G.depth('inside'), 0);
});

test('the S M and the S alone: on the grid, cut 8 in 20, the S the same upside down', () => {
  for (const d of [G.symbol({ round: 0 }), G.letterS().d, G.letterS({ wide: 1 }).d, G.letterS({ turn: true }).d]) {
    assert.doesNotMatch(d, /[AC]/);
    for (const p of polys(d)) assert.deepEqual(p.flat().filter((n) => n % 4), []);
  }
  for (const s of [G.letterS(), G.letterS({ wide: 1 })]) assert.deepEqual(turned(s.d, s.w, s.h), corners(s.d));
  assert.deepEqual([G.SYM_W, G.SYM_H], [240, 136]);
  assert.equal([...G.symbol().matchAll(/A4 4/g)].length, 2); // the M's two slot ends
});
