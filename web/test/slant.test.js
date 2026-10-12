// Slant (2026-10-11): the mark with its curves cut straight, after CM.SUPPLY's
// round 4. On the grid of 4, every cut at one slope, the S the same upside down.
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.location = { search: '' };
const G = await import('../src/identity/directions/slant/geometry.js');

test('poly rounds a corner with an arc tangent to both its sides, and closes', () => {
  assert.equal(G.poly([[0, 0], [10, 0, 2], [10, 10], [0, 10]]), 'M0 0L8 0A2 2 0 0 1 10 2L10 10L0 10Z');
  assert.equal(G.poly([[0, 0], [0, 10, 2], [10, 10], [10, 0]]), 'M0 0L0 8A2 2 0 0 0 2 10L10 10L10 0Z');
  assert.equal(G.poly([[0, 0], [10, 0], ['C', 10, 5, 5, 10, 0, 10]]), 'M0 0L10 0C10 5 5 10 0 10Z');
});

test('poly refuses a corner it cannot round', () => {
  assert.throws(() => G.poly([[0, 0], [10, 0, 12], [10, 10], [0, 10]]), /can't be rounded/); // the round overruns its sides
  assert.throws(() => G.poly([[0, 0], [10, 0, 2], [0, 0]]), /can't be rounded/); // the corner turns right back
});

/** Path data of corners only (M, L, Z), as its subpaths' corners; every subpath closed. */
const polys = (d) => d.split('M').filter(Boolean).map((sp) => {
  assert.match(sp, /Z$/);
  return sp.replace('Z', '').split('L').map((p) => p.trim().split(/\s+/).map(Number));
});
const corners = (d) => polys(d).map((p) => p.map(([x, y]) => `${x},${y}`).sort().join(' ')).sort();
const turned = (d, w, h) => polys(d).map((p) => p.map(([x, y]) => `${w - x},${h - y}`).sort().join(' ')).sort();
/** The slope of every side that is neither across nor down. */
const slopes = (d) => polys(d).flatMap((p) => p.map(([x, y], i) => {
  const [x2, y2] = p[(i + 1) % p.length];
  return x !== x2 && y !== y2 ? (y2 - y) / (x2 - x) : null;
}).filter((s) => s !== null));
const SQUARE = { ...G.SLANT, round: 0, outer: 0 }; // no rounds: corners only
const cut = (p) => G.letters(p);

test('every point of the letters is on the grid of 4, and every cut falls 8 in 20', () => {
  const d = cut(SQUARE);
  assert.doesNotMatch(d, /[AC]/);
  for (const p of polys(d)) assert.deepEqual(p.flat().filter((n) => n % 4), []);
  assert.ok(slopes(d).length);
  assert.deepEqual(slopes(d).filter((s) => s !== 0.4), []);
});

test('the slope is a parameter: every cut falls 0, 4 … 20 in 20, on the grid', () => {
  assert.deepEqual(G.DROPS, [0, 0.2, 0.4, 0.6, 0.8, 1]);
  for (const drop of G.DROPS) {
    const d = cut({ ...SQUARE, drop });
    for (const p of polys(d)) assert.deepEqual(p.flat().filter((n) => n % 4), [], `drop ${drop}`);
    assert.deepEqual(slopes(d).filter((s) => Math.abs(s - drop) > 1e-9), [], `drop ${drop}`);
    for (const sd of [G.symbol({ round: 0, drop }), G.letterS({ drop }).d]) {
      assert.deepEqual(slopes(sd).filter((s) => Math.abs(s - drop) > 1e-9), [], `drop ${drop}`);
    }
    assert.doesNotThrow(() => G.letters({ ...G.SLANT, drop }), `drop ${drop}`); // rounds fit at every slope
  }
  assert.ok(!slopes(cut({ ...SQUARE, drop: 0 })).length); // flat: the slot ends square, the bends right angles
});

test('the S is the same upside down', () => {
  const S = G.letterPaths(SQUARE)[0];
  assert.deepEqual(turned(S, 84, 472), corners(S));
});

test('the cuts are rounded 4 at their obtuse corners, eleven of them; the slider rounds them more, at most half a slot', () => {
  const arcs = (p) => [...G.letters(p).matchAll(/A([\d.]+) ([\d.]+) 0 0 [01]/g)];
  assert.equal(arcs(G.SLANT).length, 11); // two S's ends and bends, the M's two ends, the A's one
  for (const [, rx, ry] of arcs(G.SLANT)) assert.deepEqual([rx, ry], ['4', '4']);
  for (const [, rx] of arcs({ ...G.SLANT, cut: 8 })) assert.equal(rx, '8');
  for (const [, rx] of arcs({ ...G.SLANT, cut: 20 })) assert.equal(rx, '10');
  assert.equal(arcs({ ...G.SLANT, cut: 0 }).length, 0);
  assert.equal([...G.symbol().matchAll(/A4 4/g)].length, 4); // the M's two slot ends, the S's two bends
});

test('the A: its counter from a bar under the top to the crossbar, its notch from the crossbar down', () => {
  const [outline, counter] = G.letterPaths(SQUARE)[2].split('M').filter(Boolean).map((q) => 'M' + q);
  assert.equal(counter, 'M312 40L292 32L292 220L312 220Z');
  assert.equal(outline, 'M260 0L344 0L344 472L312 472L312 252L292 252L292 472L260 472Z');
});

test('the outer corners: rounded tight, four on an S, the top two on the M and the A, none on the H', () => {
  const curves = (d) => [...d.matchAll(/C/g)].length;
  assert.deepEqual(G.letterPaths().map(curves), [4, 2, 2, 4, 0]);
  assert.match(G.letterPaths()[0], /^M0 16C0 3\.2 3\.2 0 16 0L/); // 16, its handles 80% of the way to the corner
  assert.match(G.letterPaths({ ...G.SLANT, outer: 64 })[0], /^M0 42C/); // at most half the S's width
  assert.equal(curves(G.symbol({ outer: 16 })), 6); // the S's four, the M's top two
  for (const o of [0, 16, 64]) for (const t of [0.55, 1]) assert.doesNotThrow(() => G.letters({ ...G.SLANT, outer: o, tension: t, height: 240, stem: 160 }));
  for (const S of [G.letterS({ outer: 16, cut: 0 }), G.letterS({ outer: 16, cut: 0, wide: 1 })]) {
    const ends = (d) => [...d.matchAll(/[MLC]([^MLCAZ]*)/g)].map(([, a]) => a.trim().split(/\s+/).slice(-2).map(Number));
    const pts = ends(S.d).map(([x, y]) => `${x},${y}`).sort();
    assert.deepEqual(ends(S.d).map(([x, y]) => `${S.w - x},${S.h - y}`).sort(), pts); // the same upside down, rounds and all
  }
});

test('the S M and the S alone: on the grid, cut 8 in 20, the S the same upside down', () => {
  for (const d of [G.symbol({ round: 0 }), G.letterS({ cut: 0 }).d, G.letterS({ cut: 0, wide: 1 }).d, G.letterS({ cut: 0, turn: true }).d]) {
    assert.doesNotMatch(d, /[AC]/);
    for (const p of polys(d)) assert.deepEqual(p.flat().filter((n) => n % 4), []);
  }
  for (const d of [G.symbol({ round: 0 }), G.letterS({ cut: 0 }).d, G.letterS({ cut: 0, wide: 1 }).d]) {
    assert.ok(slopes(d).length);
    assert.deepEqual(slopes(d).filter((s) => s !== 0.4), []);
  }
  const t = slopes(G.letterS({ cut: 0, turn: true }).d); // on its side, the cuts fall 20 in 8
  assert.ok(t.length);
  assert.deepEqual(t.filter((s) => s !== -2.5), []);
  for (const s of [G.letterS({ cut: 0 }), G.letterS({ cut: 0, wide: 1 })]) assert.deepEqual(turned(s.d, s.w, s.h), corners(s.d));
  assert.deepEqual([G.SYM_W, G.SYM_H], [240, 136]);
});

const C = await import('../src/identity/directions/slant.js');

test('the chapter gives every still as plain vector', () => {
  for (const fn of ['wordmark', 'symbol', 'lockup', 'lockupSM', 's', 'sTurned', 'sSquare']) {
    const out = C[fn]();
    assert.match(out, /^<svg [^>]*viewBox="0 0 [\d.]+ [\d.]+"/, fn);
    assert.doesNotMatch(out, /<text|style=|filter|mask|transform/, fn);
  }
  for (const n of [16, 32, 64]) assert.match(C.favicon({ size: n }), new RegExp(`viewBox="0 0 ${n} ${n}"`));
  // At Jonas's settings: 11 stems of 72, 10 slots of 24; the A dips 8.
  assert.deepEqual(C.START, { cut: 20, drop: 0.4, stem: 72, stroke: 24, height: 472, outer: 36, tension: 0.6, tilt: 0, split: 0, a: 'A', dip: 8 });
  assert.match(C.wordmark(), /viewBox="0 0 1032 480"/);
  assert.equal(C.wordmark(), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1032 480" ><path fill="currentColor" fill-rule="evenodd" d="${G.letters({ ...G.SLANT, ...C.START })}"/></svg>`);
  assert.equal(C.info.slug, 'slant');
});

test('the sliders draw every still at their measures, and back', () => {
  const { slope, stem, height } = Object.fromEntries(C.KNOBS.map((k) => [k.key, k]));
  assert.deepEqual(C.KNOBS.map((k) => k.key), ['slope', 'cut', 'stem', 'slot', 'height', 'outer', 'tension', 'tilt', 'dip', 'split', 'a']);
  const at8 = C.wordmark();
  slope.set(12);
  const S0 = C.START;
  assert.ok(C.symbol().includes(G.symbol({ cols: G.symCols(72, 24), rows: G.symRows(24), cut: S0.cut, drop: 0.6, outer: S0.outer, tension: S0.tension })));
  assert.ok(C.wordmark().includes(G.letters({ ...G.SLANT, ...S0, drop: 0.6 })));
  assert.equal(slope.text(12), '12 in 20');
  stem.set('96'); height.set('280');
  assert.match(C.wordmark(), /viewBox="0 0 1296 288"/); // 11 stems of 96, 10 slots of 24; the A dips 8
  assert.match(C.symbol(), /viewBox="0 0 576 144"/); // 5 stems of 96, 4 slots of 24; 3 bars and 2 slots down
  assert.deepEqual(C.gridOf('wordmark'), { w: 1296, h: 280, bands: [0, 32, 124, 156, 248, 280], bar: 96, slot: 24 });
  const byKey = Object.fromEntries(C.KNOBS.map((k) => [k.key, k]));
  byKey.outer.set('40'); byKey.tension.set('100'); byKey.slot.set('32'); byKey.tilt.set('48'); byKey.split.set('1'); byKey.a.set('a');
  assert.match(C.wordmark(), /viewBox="0 0 1376 288"/); // 11 stems of 96, 10 slots of 32; the a dips 8
  for (const fn of ['wordmark', 'symbol', 'lockup', 'lockupSM', 's', 'sTurned', 'sSquare']) assert.match(C[fn](), /<path/, fn);
  assert.match(C.favicon({ size: 16 }), /<path/);
  for (const k of C.KNOBS) k.set(k.value);
  assert.equal(C.wordmark(), at8);
});

test('wider stems and another height: on the grid of 4, every cut at the slope, the S the same upside down', () => {
  for (const stem of [32, 64, 160]) for (const height of [240, 472, 720]) {
    const p = { ...SQUARE, stem, height };
    const b = G.block(p);
    const d = cut(p);
    for (const q of polys(d)) assert.deepEqual(q.flat().filter((n) => n % 4), [], `${stem} ${height}`);
    assert.deepEqual(slopes(d).filter((s) => s !== 0.4), [], `${stem} ${height}`);
    assert.equal(Math.max(...polys(d).flat().map(([x]) => x)), b.W);
    const S = G.letterPaths(p)[0];
    assert.deepEqual(turned(S, 2 * stem + 20, height), corners(S));
    assert.doesNotThrow(() => G.letters({ ...G.SLANT, stem, height, drop: 1 }));
  }
  assert.deepEqual([G.block().W, G.block().H], [552, 472]);
  const S = G.letterS({ stem: 64, wide: 1 });
  assert.deepEqual(turned(S.d, S.w, S.h), corners(S.d));
});

test("the slots: wider, the cuts still on the grid of 4; the S M's rows widen with them", () => {
  for (const stroke of [12, 28, 40, 60]) {
    const d = G.letters({ ...SQUARE, stroke });
    for (const q of polys(d)) assert.deepEqual(q.flat().filter((n) => n % 4), [], `slot ${stroke}`);
    assert.equal(G.block({ ...G.SLANT, stroke }).W, 11 * 32 + 10 * stroke);
  }
  assert.deepEqual(G.symRows(40), [32, 40, 32, 40, 32]);
  assert.deepEqual(G.symCols(64, 40), [64, 40, 64, 40, 64, 40, 64, 40, 64]);
  assert.equal(G.letterS({ slot: 40 }).h, 176);
});

test("the S's crossbar tilted: the slots either side wedges, the S the same upside down; split, two pieces", () => {
  const S = (p) => G.letterPaths({ ...SQUARE, ...p })[0];
  assert.equal(S({ tilt: 0 }), G.letterPaths(SQUARE)[0]);
  const t = S({ tilt: 42 }); // across the S's 84: the crossbar falls 1 in 2
  assert.ok(slopes(t).includes(0.5));
  assert.deepEqual(turned(t, 84, 472), corners(t));
  const two = S({ tilt: 42, split: 1 });
  assert.equal(two.split('M').filter(Boolean).length, 2);
  assert.deepEqual(turned(two, 84, 472), corners(two));
  // the slot runs straight through: nothing of either piece between its sides, x 32 to 52
  for (const [x] of polys(two).flat()) assert.ok(x <= 32 || x >= 52);
});

test("the A or the a: the a's stem square, its bowl rounded, its foot dipping under the baseline", () => {
  const a = G.letterPaths({ ...G.SLANT, a: 'a', dip: 8 })[2];
  assert.match(a, /^M260 16C/); // the bowl's top left rounded
  assert.match(a, /L344 0L344 472L312 472L312 452C/); // the stem square, the swoop from a slot above its foot
  assert.match(a, / 276 480L276 480C/); // into the round of the bowl's corner (16), 8 under
  assert.equal(G.depth({ a: 'a', dip: 8 }), 8);
  assert.equal(G.depth({ a: 'A' }), 0);
  assert.throws(() => G.letterPaths({ ...G.SLANT, a: 'b' }), /no a called b/);
  assert.doesNotThrow(() => G.letters({ ...G.SLANT, a: 'a', outer: 0, stem: 160, height: 240, stroke: 60, dip: 24 }));
});
