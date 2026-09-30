// The marks' curves in pixels (geometry.js: pixelate, Jonas 2026-09-30) and
// the S alone: on the grid, never failing while the mark moves, and the S's
// shapes what they say they are.
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.location = { search: '' };
const G = await import('../src/identity/directions/original/geometry.js');
const O = await import('../src/identity/directions/original.js');

const pathOf = (svg) => svg.match(/ d="([^"]+)"/)[1];
const numbers = (d) => d.match(/-?\d+(?:\.\d+)?/g).map(Number);

/** Straight-line path data (M, L, Z), filled evenodd, sampled at the centres of the grid of 4's cells: rows of 0 and 1. */
function bitmap(d, w, h) {
  const polys = d.split('M').filter(Boolean).map((s) => s.replace('Z', '').split('L').map((p) => p.trim().split(/\s+/).map(Number)));
  const inside = (x, y) => {
    let c = false;
    for (const p of polys) {
      for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
        const [xi, yi] = p[i], [xj, yj] = p[j];
        if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
      }
    }
    return c;
  };
  return Array.from({ length: h / 4 }, (_, j) => Array.from({ length: w / 4 }, (_, i) => (inside(4 * i + 2, 4 * j + 2) ? 1 : 0)).join(''));
}
const quarter = (rows) => rows[0].split('').map((_, i) => rows.map((r) => r[i]).reverse().join('')); // turned a quarter clockwise
const upsideDown = (rows) => rows.map((r) => r.split('').reverse().join('')).reverse();

test('in pixels of 4 every point of every mark is on the grid of 4, and no arc is left', () => {
  for (const fn of ['wordmark', 'symbol', 's', 'sTurned', 'sSquare', 'lockup', 'lockupSM']) {
    const d = pathOf(O[fn]({ pixel: 4 }));
    assert.doesNotMatch(d, /A/, fn);
    assert.deepEqual(numbers(d).filter((n) => n % 4), [], fn);
  }
});

test('in pixels of 10 the round ends are square and a bend loses one pixel', () => {
  const S = bitmap(G.pixelate(G.letterS().d, 10), 84, 136);
  const round = bitmap(G.pixelate(G.letterS().d, 4), 84, 136);
  assert.notDeepEqual(S, round);
  // The upper bend's corner square (32 to 52 across, 32 to 52 down): its outer corner pixel (10 × 10) is solid, the rest slot.
  const cell = (rows, x, y) => rows[y / 4 | 0][x / 4 | 0];
  assert.equal(cell(S, 34, 50), '1');
  assert.equal(cell(S, 34, 38), '0');
  assert.equal(cell(S, 50, 50), '0');
});

test('the moving mark goes into pixels at any moment', () => {
  for (let stroke = 20; stroke <= 24; stroke += 0.37) {
    for (let crossbar = 164; crossbar <= 308; crossbar += 13.3) {
      for (const q of [4, 10]) assert.doesNotMatch(G.pixelate(G.letters({ ...G.REST, stroke, crossbar }), q), /A/);
    }
  }
});

test('the favicons are on whole pixels', () => {
  for (const size of [16, 32, 64]) assert.deepEqual(numbers(pathOf(O.favicon({ size }))).filter((n) => !Number.isInteger(n)), [], String(size));
});

test('the S alone: the S M\'s S, the same upside down, and on its side the same S turned', () => {
  const s = G.letterS(), t = G.letterS({ turn: true }), q = G.letterS({ wide: 1 });
  assert.deepEqual([s.w, s.h, t.w, t.h, q.w, q.h], [84, 136, 136, 84, 136, 136]);
  const S = bitmap(G.pixelate(s.d, 4), s.w, s.h);
  const T = bitmap(G.pixelate(t.d, 4), t.w, t.h);
  const Q = bitmap(G.pixelate(q.d, 4), q.w, q.h);
  assert.deepEqual(S, bitmap(G.pixelate(G.symbolA(), 4), 240, 136).map((r) => r.slice(0, 84 / 4)));
  assert.deepEqual(upsideDown(S), S);
  assert.deepEqual(upsideDown(Q), Q);
  assert.deepEqual(quarter(S), T);
  // The square S: its middle bar the full width, its top slot a bar in from the left, its bottom one a bar in from the right.
  assert.equal(Q[(52 + 2) / 4 | 0], '1'.repeat(34));
  assert.equal(Q[0].slice(8, 13), '00000');
  assert.equal(Q[33].slice(21, 26), '00000');
});
