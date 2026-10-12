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

test('the outer corners: rounded tight, four on an S, the top two on the M and the A, the right two on the H', () => {
  const curves = (d) => [...d.matchAll(/C/g)].length;
  assert.deepEqual(G.letterPaths().map(curves), [4, 2, 2, 4, 2]);
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
  // At Jonas's settings: 11 stems of 72, 10 slots and gaps of 20; no dip.
  assert.deepEqual(C.START, { cut: 12, drop: 0, stem: 72, stroke: 20, space: 20, ceil: 44, height: 472, outer: 64, tension: 0.6, tilt: 0, split: 0, a: 'A', dip: 0, downFit: 'fill', tips: 0, frame: 0, frameGap: 20, frameWidth: 20 });
  assert.match(C.wordmark(), /viewBox="0 0 992 472"/);
  assert.equal(C.wordmark(), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 992 472" ><path fill="currentColor" fill-rule="evenodd" d="${G.letters({ ...G.SLANT, ...C.START })}"/></svg>`);
  assert.equal(C.info.slug, 'slant');
});

test('the sliders draw every still at their measures, and back', () => {
  const { slope, stem, height } = Object.fromEntries(C.KNOBS.map((k) => [k.key, k]));
  assert.deepEqual(C.KNOBS.map((k) => k.key), ['slope', 'cut', 'stem', 'slot', 'space', 'ceil', 'height', 'outer', 'tension', 'tilt', 'dip', 'split', 'a', 'tips', 'frame', 'frameGap', 'frameWidth', 'downFit', 'per', 'lower']);
  const at8 = C.wordmark();
  slope.set(12);
  const S0 = C.START;
  assert.ok(C.symbol().includes(G.symbol({ cols: G.symCols(72, 20), rows: G.symRows(20), cut: S0.cut, drop: 0.6, outer: S0.outer, tension: S0.tension })));
  assert.ok(C.wordmark().includes(G.letters({ ...G.SLANT, ...S0, drop: 0.6 })));
  assert.equal(slope.text(12), '12 in 20');
  stem.set('96'); height.set('280');
  assert.match(C.wordmark(), /viewBox="0 0 1256 280"/); // 11 stems of 96, 10 slots of 20
  assert.match(C.symbol(), /viewBox="0 0 560 136"/); // 5 stems of 96, 4 slots of 20; 3 bars and 2 slots down
  const g = C.gridOf('wordmark');
  assert.deepEqual([g.w, g.h, g.bands, g.bar, g.slot], [1256, 280, [0, 44, 124, 156, 236, 280], 96, 20]);
  assert.deepEqual(g.columns.slice(0, 2), [[96, 20], [212, 20]]); // the S's slot, and the gap after it
  const byKey = Object.fromEntries(C.KNOBS.map((k) => [k.key, k]));
  byKey.outer.set('40'); byKey.tension.set('100'); byKey.slot.set('32'); byKey.tilt.set('48'); byKey.split.set('1'); byKey.a.set('a');
  assert.match(C.wordmark(), /viewBox="0 0 1328 280"/); // 11 stems of 96, 6 slots of 32, 4 gaps of 20; no dip
  for (const fn of ['wordmark', 'symbol', 'lockup', 'lockupSM', 's', 'sTurned', 'sSquare']) assert.match(C[fn](), /<path/, fn);
  assert.match(C.favicon({ size: 16 }), /<path/);
  const letters = byKey.per;
  letters.set('cut', 2, 0); letters.set('round', 4, 1);
  assert.ok(!letters.on('cut', 2) && letters.on('round', 4));
  assert.ok(!letters.has('tilt', 1) && letters.has('dip', 2));
  for (const k of C.KNOBS) (k.reset ? k.reset() : k.set(k.value));
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

test('the gap between letters apart from the slots: the letters keep their widths, the word spreads', () => {
  const at = (space) => G.letterPaths({ ...SQUARE, space });
  const widths = (ls) => ls.map((d) => { const xs = polys(d).flat().map(([x]) => x); return Math.max(...xs) - Math.min(...xs); });
  assert.deepEqual(widths(at(60)), widths(at(20)));
  assert.equal(G.block({ ...G.SLANT, space: 60 }).W, 552 + 4 * 40);
  assert.equal(G.letters({ ...SQUARE, space: 20 }), G.letters(SQUARE)); // unset, as wide as the slots
  const d = G.letters({ ...SQUARE, space: 60 });
  for (const q of polys(d)) assert.deepEqual(q.flat().filter((n) => n % 4), []);
  assert.deepEqual(G.symCols(32, 20, 44), [32, 20, 32, 44, 32, 20, 32, 20, 32]);
});

test('each letter its own switches: cut, round, tilt, split, dip', () => {
  const P = { ...G.SLANT, outer: 16, tilt: 42, split: 1, dip: 8 };
  const off = (i, row) => ({ ...P, per: Object.assign([], { [i]: { [row]: 0 } }) });
  const L = (p) => G.letterPaths(p);
  assert.deepEqual(L(P).map((d, i) => (i === 2 ? null : d)), L(off(2, 'cut')).map((d, i) => (i === 2 ? null : d))); // only the A changes
  assert.match(L(off(2, 'cut'))[2], /M312 32L292 32L292 220L312 220Z/); // the A's counter square at the top
  assert.doesNotMatch(L(off(1, 'round'))[1], /C/); // the M's corners square
  assert.equal(L({ ...P, per: Object.assign([], { 4: { round: 1, base: 0 } }) })[4].match(/C/g).length, 1); // the H rounded at its top right
  assert.equal(L({ ...P, per: Object.assign([], { 4: { round: 1, base: 1 } }) })[4].match(/C/g).length, 2); // and at its base right
  assert.match(L({ ...P, per: Object.assign([], { 4: { round: 1, base: 1 } }) })[4], /^M468 0L/); // its left corners square
  assert.equal(L({ ...P, dip: 0, per: Object.assign([], { 1: { base: 1 }, 2: { base: 1 } }) }).slice(1, 3).map((d) => d.match(/C/g).length).join(), '4,4'); // the M and the A, all four
  assert.doesNotThrow(() => G.letters({ ...P, outer: 64, stem: 32, per: [{}, { base: 1 }, { base: 1 }, {}, { round: 1, base: 1 }] })); // a foot's round at most a stem
  assert.equal(L(off(0, 'split'))[0].split('M').filter(Boolean).length, 1); // the first S whole, the second split
  assert.equal(L(off(0, 'split'))[3].split('M').filter(Boolean).length, 2);
  assert.ok(!slopes(L({ ...off(3, 'tilt'), round: 0, outer: 0, split: 0 })[3]).some((k) => Math.abs(k - 0.5) < 1e-9)); // the second S level
  assert.equal(G.depth(off(2, 'dip')), 0);
  assert.match(L(off(2, 'dip'))[2], /L292 472L260 472Z/); // the A's foot square
});

test("SMASH written down: five letters in a column, the stems all as the wordmark's, the M wider, no dip", () => {
  const D = G.down(G.SLANT);
  assert.deepEqual([D.w, D.h], [136, 5 * 176 + 4 * 20]); // the M's width; as short as the slots allow, a gap between
  assert.equal(D.d.split('M').filter(Boolean).length, 6); // five letters, the A's counter
  const pts = [...D.d.matchAll(/[ML]([-\d.]+) ([-\d.]+)/g)].map((m) => [+m[1], +m[2]]);
  assert.ok(pts.every(([x, y]) => x >= 0 && x <= 136 && y >= 0 && y <= D.h));
  const S = pts.filter(([, y]) => y <= 176).map(([x]) => x);
  assert.deepEqual([Math.min(...S), Math.max(...S)], [26, 110]); // the S, 84 wide, centred on the M's 136
  assert.equal(G.down({ ...G.SLANT, dip: 12 }).d, D.d); // never dips
  assert.match(C.down(), /^<svg [^>]*viewBox="0 0 256 /); // at Jonas's settings: an M of stems 72, slots 20
  assert.equal(G.move('M0 0L10 0A4 4 0 0 1 14 4Z', 1, 2), 'M1 2L11 2A4 4 0 0 1 15 6Z');
});

test('Down fitted three ways: the M wider, the others filling its width, or the M squeezed to theirs', () => {
  const at = (downFit) => G.down({ ...G.SLANT, downFit });
  assert.equal(at('wider').w, 136);
  assert.equal(at('fill').w, 136); // the S, A and H's stems (136 - 20) / 2 = 58
  assert.equal(at('squeeze').w, 84); // the M's stems (84 - 40) / 3
  for (const f of G.DOWN_FITS) {
    const D = at(f), xs = [...D.d.matchAll(/[ML]([-\d.]+) /g)].map((m) => +m[1]);
    assert.deepEqual([Math.min(...xs), Math.max(...xs)], [0, D.w], f); // every fit fills its column's edges
  }
  assert.throws(() => at('stretch'), /no fit called stretch/);
});

test("the ceiling: the bars over the slots' top ends and under their bottom ends thicken, the crossbars stay", () => {
  const at = (ceil) => G.letterPaths({ ...SQUARE, ceil });
  assert.equal(G.letters({ ...SQUARE, ceil: 32 }), G.letters(SQUARE));
  assert.match(at(80)[1], /L208 88L188 80L188 472/); // the M's slot ends 80 down, cut 8
  assert.match(at(80)[2], /M312 88L292 80L292 220L312 220Z/); // the A's counter from 80 to the crossbar
  assert.deepEqual(G.block({ ...G.SLANT, ceil: 80 }).bands, [0, 80, 220, 252, 392, 472]);
  for (const q of polys(G.letters({ ...SQUARE, ceil: 80 }))) assert.deepEqual(q.flat().filter((n) => n % 4), []);
  assert.equal(G.block({ ...G.SLANT, ceil: 120, height: 240 }).H, 352); // the block grows to fit its slots: 2 × 120 + 32 + 3 × 20 + 2 × 8, to the 8
  assert.ok(G.down({ ...G.SLANT, ceil: 64 }).h > G.down(G.SLANT).h); // and Down's letters with it
});

test("each letter lowered on its own: the M's slot tops, the S's ends both ways, the A's counter; each to its limit", () => {
  const q = { ...SQUARE };
  const L = (lower) => G.letterPaths({ ...q, lower });
  assert.deepEqual(L([0, 40, 0, 0]).filter((d, i) => i !== 1), L([]).filter((d, i) => i !== 1)); // only the M changes
  assert.match(L([0, 40, 0, 0])[1], /L208 80L188 72L188 472/); // its slot tops 40 lower
  const S = L([24, 0, 0, 0])[0];
  assert.match(S, /L52 64L32 56L/); // the S's top end 24 lower
  assert.match(S, /L32 408L52 416L/); // and its bottom end 24 higher
  assert.deepEqual(turned(S, 84, 472), corners(S)); // still the same upside down
  assert.match(L([0, 0, 40, 0])[2], /M312 80L292 72L292 220L312 220Z/); // the A's counter from 72
  assert.match(L([999, 999, 999, 999])[2], /M312 200L292 192L292 220L312 220Z/); // at most a slot tall
  for (const p of [{ ...G.SLANT, lower: [999, 999, 999, 999] }, { ...G.SLANT, a: 'a', lower: [999, 999, 999, 999] }]) assert.doesNotThrow(() => G.letters(p));
  const at = Object.fromEntries(C.KNOBS.map((k) => [k.key, k])).lower;
  at.set(1, '40'); assert.equal(at.get(1), 40); assert.ok(!at.has(4)); at.reset(); assert.equal(at.get(1), 0);
});

test("the S open, as the S M's: its slot out of the top and the bottom, three pieces; split, four; the same upside down", () => {
  const S = (q) => G.letterPaths({ ...SQUARE, ...q, per: [{ open: 1 }] })[0];
  const pieces = (d) => d.split('M').filter(Boolean).length;
  assert.equal(pieces(S({})), 3);
  assert.match(S({}), /^M0 0L32 0L32 /); // the slot from the top edge
  assert.deepEqual(turned(S({}), 84, 472), corners(S({})));
  assert.equal(pieces(S({ tilt: 42, split: 1 })), 4);
  assert.deepEqual(turned(S({ tilt: 42, split: 1 }), 84, 472), corners(S({ tilt: 42, split: 1 })));
  assert.equal(pieces(G.letterPaths({ ...SQUARE, per: [{ open: 1 }] })[3]), 1); // the second S as it was
  for (const q of [{}, { outer: 64, round: 1 }, { tilt: 160, split: 1, outer: 36 }]) assert.doesNotThrow(() => G.letters({ ...G.SLANT, ...q, per: [{ open: 1 }, {}, {}, { open: 1 }] }));
});

test("the frame: round the box, gap from it, width thick, its corners round the mark's from the same centres", () => {
  const r = G.ring(100, 50, 10, 5, [20, 0, 20, 0], 0.6);
  const [outer, inner] = r.split('M').filter(Boolean).map((q) => 'M' + q);
  assert.match(outer, /^M-15 20C/); // the top left rounded 20 + 15 from the box's corner, out by 15
  assert.match(outer, /L115 -15L115 /); // the top right square
  assert.match(inner, /^M-10 20C/); // the inside, 20 + 10
  assert.deepEqual(G.wordRadii({ ...G.SLANT, outer: 36 }), [36, 32, 32, 36]); // the S's 36, the H's at most a stem
  assert.deepEqual(G.symRadii(24), [24, 24, 0, 24]);
});

test('the chapter framed: the wordmark, Down and the S M in a frame round them, the artboard grown by its gap and width', () => {
  const K = Object.fromEntries(C.KNOBS.map((k) => [k.key, k]));
  const plain = C.wordmark();
  K.frame.set('1');
  assert.match(C.wordmark(), /viewBox="0 0 1072 552"/); // 992 × 472, and 20 + 20 each side
  assert.equal(C.wordmark().match(/M/g).length, plain.match(/M/g).length + 2); // the frame's two edges
  assert.match(C.symbol(), /viewBox="0 0 /);
  assert.match(C.down(), /viewBox="0 0 336 /); // 256 and 40 each side
  assert.equal(C.gridOf('wordmark'), false);
  K.frameGap.set('0'); K.frameWidth.set('8');
  assert.match(C.wordmark(), /viewBox="0 0 1008 488"/);
  for (const k of C.KNOBS) (k.reset ? k.reset() : k.set(k.value));
  assert.equal(C.wordmark(), plain);
});

test("fitted: the frame fills the wedge where two rounded corners meet, keeping its gap from both, never between the letters", () => {
  const box = (x0, x1, r) => ({ box: [x0, 0, x1, 100], radii: [r, r, r, r] });
  const w = G.wedges([box(0, 40, 20), box(60, 100, 20)], 100, 16, 0.6); // a gap of 20 between, 16 from each
  assert.equal(w.split('M').filter(Boolean).length, 2); // a wedge at the top, one at the base
  const pts = [...w.matchAll(/([-\d.]+) ([-\d.]+)/g)].map((m) => [+m[1], +m[2]]);
  const top = pts.filter(([, y]) => y < 50);
  assert.ok(top.every(([, y]) => y >= -16 - 1e-9)); // no higher than the frame's inside
  assert.ok(Math.max(...top.map(([, y]) => y)) < 20); // down only till the gaps meet, far above the letters' sides
  assert.ok(top.every(([x]) => x >= 4 && x <= 96)); // within the corners' rounds
  assert.equal(G.wedges([box(0, 40, 20), box(80, 120, 20)], 100, 16, 0.6), ''); // a gap wider than both gaps: the frame stays out
  assert.equal(G.wedges([box(0, 40, 0), box(60, 100, 0)], 100, 16, 0.6), ''); // square corners: nothing to fill
  const K = Object.fromEntries(C.KNOBS.map((k) => [k.key, k]));
  K.frame.set('2');
  const around = (() => { K.frame.set('1'); return C.wordmark(); })();
  K.frame.set('2');
  assert.match(C.wordmark(), /viewBox="0 0 1072 552"/); // the letters' gaps as they were
  assert.equal(C.wordmark().match(/M/g).length, around.match(/M/g).length + 7); // four meetings at the top; at the base, three (the M's and the A's feet square)
  assert.ok(C.down().match(/M/g).length > G.down({ ...G.SLANT, ...C.START }).d.match(/M/g).length + 2);
  assert.ok(C.symbol().match(/M/g).length >= G.symbol().match(/M/g).length + 3);
  for (const k of C.KNOBS) (k.reset ? k.reset() : k.set(k.value));
});

test('the H rounded both sides', () => {
  const H = (both) => G.letterPaths({ ...G.SLANT, outer: 16, per: Object.assign([], { 4: { both } }) })[4];
  assert.equal(H(0).match(/C/g).length, 2);
  assert.equal(H(1).match(/C/g).length, 4);
  assert.deepEqual(G.letterRadii({ ...G.SLANT, outer: 16, per: Object.assign([], { 4: { both: 1 } }) }, 4), [16, 16, 16, 16]);
});

test("the ends rounded both sides: at half a slot and no slope, a round tip, as the original's", () => {
  const arcs = (d) => [...d.matchAll(/A([\d.]+) /g)].map((m) => +m[1]);
  const M = (q) => G.letterPaths({ ...G.SLANT, outer: 0, drop: 0, cut: 10, ...q })[1];
  assert.deepEqual(arcs(M({})), [10, 10]); // one corner of each of the M's two ends
  assert.deepEqual(arcs(M({ tips: 1 })), [10, 10, 10, 10]); // both
  assert.match(M({ tips: 1 }), /L208 42A10 10 0 0 0 198 32(L198 32)?A10 10 0 0 0 188 42L/); // a half circle: 32 to 42, across the slot
  assert.equal(arcs(G.letters({ ...G.SLANT, tips: 1 })).length, 22); // every cut's two corners: 2 × 11
  assert.equal(arcs(G.symbol({ tips: 1 })).length, 8);
  for (const drop of G.DROPS) for (const stroke of [8, 20, 60]) assert.doesNotThrow(() => G.letters({ ...G.SLANT, drop, stroke, cut: 30, tips: 1, per: [{ open: 1 }, {}, {}, { split: 1 }] }));
});

test("the S M's S carries the wordmark's blade: its crossbar at the wordmark S's angle, split through, the same upside down", () => {
  const has = (d, k) => slopes(d).some((m) => Math.abs(m - k) < 1e-3); // the points are given to two places
  assert.equal(G.symbol({ tilt: 0, split: 0 }), G.symbol()); // level and whole, as it was
  const sym = (q) => G.symbol({ cols: G.symCols(72, 20), rows: G.symRows(20), round: 0, outer: 0, ...q });
  assert.ok(has(G.letterPaths({ ...SQUARE, stem: 72, tilt: 48 })[0], 48 / 164)); // the wordmark's S: 48 across its 164
  const t = sym({ tilt: 48 });
  assert.ok(has(t, 48 / 164)); // the S M's S, as wide, at the same slope
  assert.deepEqual(slopes(t).filter((k) => Math.abs(k - 48 / 164) > 1e-3 && k !== 0.4), []); // its cuts and the M's slot tops still 8 in 20
  assert.match(t, /L368 40L348 32L348 136L276 136L276 40L256 32L/); // the M's two slot tops cut, as they were
  assert.equal(t.split('M').filter(Boolean).length, 4); // the S's body and two blocks, the M
  const S = G.letterS({ cut: 0, tilt: 42 }); // 84 across: the crossbar falls 1 in 2
  assert.ok(slopes(S.d).includes(0.5));
  assert.deepEqual(turned(S.d, S.w, S.h), corners(S.d));
  const two = G.letterS({ cut: 0, tilt: 42, split: 1 });
  assert.equal(two.d.split('M').filter(Boolean).length, 4); // the body in two, the two blocks
  for (const [x] of polys(two.d).flat()) assert.ok(x <= 32 || x >= 52); // the slot straight through, x 32 to 52
  assert.deepEqual(turned(two.d, two.w, two.h), corners(two.d));
  for (const p of polys(G.letterS({ cut: 0, tilt: 0 }).d)) assert.deepEqual(p.flat().filter((n) => n % 4), []); // level, on the grid of 4
});

test("the square S falls at the same angle across its width; split, its crossbar between the slots a third piece", () => {
  const S = G.letterS({ cut: 0, wide: 1, tilt: 42 }); // 136 across: 42 in 84, as the plain S
  assert.equal(S.w, 136);
  assert.ok(slopes(S.d).includes(0.5));
  assert.deepEqual(turned(S.d, S.w, S.h), corners(S.d));
  const split = G.letterS({ cut: 0, wide: 1, tilt: 42, split: 1 });
  assert.equal(split.d.split('M').filter(Boolean).length, 5);
  assert.deepEqual(turned(split.d, split.w, split.h), corners(split.d));
  // Steep, its crossbar rises at the top slot only till a quarter of the slot under the top block stays open.
  const steep = G.letterS({ cut: 0, wide: 1, tilt: 160 });
  const under = polys(steep.d)[0].find(([x, y]) => x === 52 && y < 68); // where the crossbar meets the top slot's right side
  assert.ok(under[1] >= 32 + 5 - 1e-9, `${under}`);
  for (const t of [0, 42, 160]) for (const stem of [32, 200]) for (const slot of [8, 60]) {
    assert.doesNotThrow(() => G.letterS({ wide: 1, tilt: t, split: 1, stem, slot, drop: 1, cut: 30, tips: 1, outer: 64 }));
    assert.doesNotThrow(() => G.letterS({ wide: 1, tilt: t, stem, slot, drop: 1, cut: 30, outer: 64 }));
  }
});

test("the chapter's S M, S alone and favicons take the first S's tilt and split, as its switches have them", () => {
  const K = Object.fromEntries(C.KNOBS.map((k) => [k.key, k]));
  const S0 = C.START, cols = G.symCols(72, 20), rows = G.symRows(20);
  const plain = [C.symbol(), C.s(), C.sSquare(), C.favicon({ size: 64 })];
  K.tilt.set('48'); K.split.set('1');
  assert.ok(C.symbol().includes(G.symbol({ cols, rows, cut: S0.cut, drop: S0.drop, outer: S0.outer, tension: S0.tension, tilt: 48, split: 1 })));
  assert.ok(C.s().includes(G.letterS({ cut: S0.cut, drop: S0.drop, stem: 72, slot: 20, outer: S0.outer, tension: S0.tension, tilt: 48, split: 1 }).d));
  const fav = C.favicon({ size: 64 }).match(/ d="([^"]+)"/)[1];
  assert.ok(slopes(fav).some((k) => Math.abs(k - 48 / 164) < 2e-3)); // the favicon's S at the wordmark S's angle
  K.per.set('tilt', 0, 0); K.per.set('split', 0, 0);
  assert.deepEqual([C.symbol(), C.s(), C.sSquare(), C.favicon({ size: 64 })], plain); // the first S's switches off: level and whole
  for (const k of C.KNOBS) (k.reset ? k.reset() : k.set(k.value));
});

test('the framed S M: its ring rounded from the same centres as the mark, square only at the M foot', () => {
  const K = Object.fromEntries(C.KNOBS.map((k) => [k.key, k]));
  K.frame.set('1');
  const d = C.symbol().match(/ d="([^"]+)"/)[1];
  assert.match(d, /M40 72C40 52\.8 52\.8 40 72 40L/); // the S's top left: 32 round (72, 72)
  assert.match(d, /M0 72C0 28\.8 28\.8 0 72 0L448 0C491\.2 0 520 28\.8 520 72L520 216L72 216C28\.8 216 0 187\.2 0 144Z/); // outside: 72 round the same centres
  assert.match(d, /M20 72C20 40\.8 40\.8 20 72 20L448 20C479\.2 20 500 40\.8 500 72L500 196L72 196/); // inside: 52
  for (const k of C.KNOBS) (k.reset ? k.reset() : k.set(k.value));
});

test('Down draws each letter at its own stems: a squeezed M too thin for an S still draws', () => {
  const p = { ...G.SLANT, stem: 32, stroke: 60, drop: 1, cut: 30, tips: 1, downFit: 'squeeze' };
  assert.doesNotThrow(() => G.down(p));
  const one = G.letterPaths(G.SLANT, 1);
  assert.deepEqual(one, ['', G.letterPaths(G.SLANT)[1], '', '', '']);
});

/** Path data (M L C A Z, absolute) as its sides: curves and (circular) arcs in short pieces. */
const sides = (d, N = 8) => {
  const out = [];
  let start, cur;
  const to = (p) => { if (p[0] !== cur[0] || p[1] !== cur[1]) out.push([cur, p]); cur = p; };
  for (const [, k, args] of d.matchAll(/([MLCAZ])([^MLCAZ]*)/g)) {
    const n = args.trim().split(/[\s,]+/).filter(Boolean).map(Number);
    if (k === 'M') start = cur = n;
    else if (k === 'Z') to(start);
    else if (k === 'L') to(n);
    else if (k === 'C') {
      const p0 = cur;
      for (let i = 1; i <= N; i++) { const t = i / N, u = 1 - t; to([0, 1].map((j) => u * u * u * p0[j] + 3 * u * u * t * n[j] + 3 * u * t * t * n[2 + j] + t * t * t * n[4 + j])); }
    } else {
      const [r, , , , sweep, x1, y1] = n, p0 = cur, dx = x1 - p0[0], dy = y1 - p0[1], c = Math.hypot(dx, dy);
      const h = Math.sqrt(Math.max(0, r * r - (c * c) / 4)) * (sweep ? 1 : -1);
      const cx = (p0[0] + x1) / 2 - (h * dy) / c, cy = (p0[1] + y1) / 2 + (h * dx) / c;
      const a0 = Math.atan2(p0[1] - cy, p0[0] - cx);
      let da = Math.atan2(y1 - cy, x1 - cx) - a0;
      if (sweep && da < 0) da += 2 * Math.PI;
      if (!sweep && da > 0) da -= 2 * Math.PI;
      for (let i = 1; i < N; i++) to([cx + r * Math.cos(a0 + (da * i) / N), cy + r * Math.sin(a0 + (da * i) / N)]);
      to([x1, y1]);
    }
  }
  return out;
};
/** Two sides of a path (of any of its subpaths) that cross, or null. */
const crossing = (d) => {
  const S = sides(d), turn = (a, b, c) => { const v = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]); return Math.abs(v) < 1e-6 ? 0 : Math.sign(v); };
  for (let i = 0; i < S.length; i++) for (let j = i + 1; j < S.length; j++) {
    const [a, b] = S[i], [c, e] = S[j];
    if (turn(a, b, c) * turn(a, b, e) < 0 && turn(c, e, a) * turn(c, e, b) < 0) return JSON.stringify([S[i], S[j]]);
  }
  return null;
};
/** The slope of a path's longest straight side that is neither across nor down: an S's crossbar. */
const blade = (d) => {
  let best = { l: 0, k: 0 }, start, cur;
  for (const [, k, args] of d.matchAll(/([MLCAZ])([^MLCAZ]*)/g)) {
    const n = args.trim().split(/[\s,]+/).filter(Boolean).map(Number);
    const p = k === 'M' ? (start = n) : k === 'Z' ? start : k === 'L' ? n : n.slice(-2);
    if (k === 'L' || k === 'Z') {
      const dx = p[0] - cur[0], dy = p[1] - cur[1];
      if (Math.abs(dx) > 1e-6 && Math.abs(dy) > 1e-6 && Math.hypot(dx, dy) > best.l) best = { l: Math.hypot(dx, dy), k: dy / dx };
    }
    cur = p;
  }
  return best.k;
};

test("a steep tilt in wide slots: no S crosses itself, its crossbar keeping a quarter of a bar through each slot", () => {
  // Before, falling more across a slot than its bar and cut, the slot's end above passed the one below.
  assert.ok(crossing('M0 0L10 10L10 0L0 10Z')); // a bowtie crosses
  assert.equal(crossing(G.letters({ ...G.SLANT, stem: 72 })), null);
  const looks = [{ drop: 0, cut: 12, outer: 64, tension: 0.6 }, { drop: 1, cut: 30, tips: 1, outer: 0 }];
  for (const stem of [32, 200]) for (const slot of [8, 60]) for (const tilt of [0, 32, 64, 96, 128, 160]) for (const split of [0, 1]) for (const look of looks) {
    const q = { stem, slot, tilt, split, ...look };
    const at = JSON.stringify(q);
    assert.equal(crossing(G.symbol({ cols: G.symCols(stem, slot), rows: G.symRows(slot), ...q })), null, `S M ${at}`);
    for (const wide of [0, 1]) for (const turn of [false, true]) assert.equal(crossing(G.letterS({ ...q, wide, turn }).d), null, `S ${wide} ${turn} ${at}`);
    for (const height of [240, 472]) for (const open of [0, 1]) {
      const p = { ...G.SLANT, ...q, stroke: slot, height, per: G.PER.map((o) => ({ ...o, ...('open' in o ? { open } : {}) })) };
      assert.equal(crossing(G.letters(p)), null, `letters ${height} ${open} ${at}`);
    }
  }
  // The reviewer's: slots 60 under stems 32, no slope, tilt 96: every S falls 0.4, 24 in its 60 slot, as the wordmark's.
  const wide = { stem: 32, drop: 0, cut: 0, outer: 0, tilt: 96 };
  assert.ok(Math.abs(blade(G.letterPaths({ ...G.SLANT, ...wide, stroke: 60 })[0]) - 0.4) < 1e-3);
  assert.ok(Math.abs(blade(G.symbol({ cols: G.symCols(32, 60), rows: G.symRows(60), ...wide })) - 0.4) < 1e-3);
  assert.ok(Math.abs(blade(G.letterS({ ...wide, slot: 60 }).d) - 0.4) < 1e-3);
});

test("how far the S M's S and the S alone keep the wordmark S's angle: the plain to tilt 96, the square to about 61, less in thin slots", () => {
  const look = { drop: 0, cut: 12, outer: 64, tension: 0.6 }; // the page's start
  const word = (stem, slot, tilt) => blade(G.letterPaths({ ...G.SLANT, ...look, stem, stroke: slot, tilt })[0]);
  const near = (a, b) => Math.abs(a - b) < 1e-3;
  for (const tilt of [24, 48, 60, 72, 96]) {
    assert.ok(near(word(72, 20, tilt), tilt / 164)); // the wordmark's S: tilt across its 164
    assert.ok(near(blade(G.symbol({ cols: G.symCols(72, 20), rows: G.symRows(20), ...look, tilt })), tilt / 164));
    assert.ok(near(blade(G.letterS({ ...look, stem: 72, slot: 20, tilt }).d), tilt / 164));
  }
  // Steeper, they hold at 96 across 164: the fall their 136 allows.
  assert.ok(near(blade(G.letterS({ ...look, stem: 72, slot: 20, tilt: 160 }).d), 96 / 164));
  // The square S, 256 across, falls those 96 at most: the wordmark's angle to tilt 61, then 0.375.
  const sq = (stem, slot, tilt) => blade(G.letterS({ ...look, stem, slot, tilt, wide: 1 }).d);
  for (const tilt of [24, 48, 60]) assert.ok(near(sq(72, 20, tilt), tilt / 164));
  for (const tilt of [64, 96, 160]) assert.ok(near(sq(72, 20, tilt), 0.375));
  // Under stems 200, slots 8 leave its crossbar 1.5 × 8 / 200 at most, 0.06: the wordmark's angle only to tilt 24.
  assert.ok(near(sq(200, 8, 24), 24 / 408));
  assert.ok(near(word(200, 8, 96), 96 / 408));
  assert.ok(near(sq(200, 8, 96), 0.06));
});
