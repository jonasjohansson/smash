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
  assert.deepEqual(C.START, { cut: 12, drop: 0, stem: 72, stroke: 20, space: 20, ceil: 44, height: 472, rise: 0, outer: 64, tension: 0.6, corners: 0, endRound: 128, innerRound: 24, tilt: 0, lock: 0, split: 0, blade: 'step', a: 'A', dip: 0, downFit: 'fill', downJoin: 'tiles', downKerf: 0, tips: 0, frame: 0, frameGap: 20, frameWidth: 20, slash: 0, slashWidth: 20, shift: 0, slashAt: 0, symbol: 'extended' });
  assert.match(C.wordmark(), /viewBox="0 0 992 472"/);
  assert.equal(C.wordmark(), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 992 472" ><path fill="currentColor" fill-rule="evenodd" d="${G.letters({ ...G.SLANT, ...C.START })}"/></svg>`);
  assert.equal(C.info.slug, 'slant');
});

test('the sliders draw every still at their measures, and back', () => {
  const { slope, stem, height } = Object.fromEntries(C.KNOBS.map((k) => [k.key, k]));
  assert.deepEqual(C.KNOBS.map((k) => k.key), ['preset', 'slope', 'cut', 'stem', 'slot', 'space', 'ceil', 'height', 'rise', 'outer', 'tension', 'corners', 'endRound', 'innerRound', 'tilt', 'lock', 'dip', 'split', 'blade', 'a', 'tips', 'frame', 'frameGap', 'frameWidth', 'slash', 'slashWidth', 'shift', 'slashAt', 'downFit', 'downJoin', 'downKerf', 'symbol', 'per', 'downPer', 'lower']);
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
  letters.set('cut', 2, 0); letters.set('tl', 4, 1);
  assert.ok(!letters.on('cut', 2) && letters.on('tl', 4));
  assert.ok(!letters.has('tilt', 1) && letters.has('dip', 2));
  for (const k of C.KNOBS) (k.reset ? k.reset() : k.set(k.value));
  assert.equal(C.wordmark(), at8);
});

test('each corner of each letter rounded or square on its own; the old Round, Base and Both as they were', () => {
  const P = { ...G.SLANT, outer: 16, a: 'A', dip: 0 };
  const with1 = (i, q) => ({ ...P, per: Object.assign([], { [i]: q }) });
  const none = { tl: 0, tr: 0, br: 0, bl: 0 };
  // Every corner of every letter alone, at the start's measures and in two tiers: it draws, and it alone rounds.
  for (const corners of [0, 1]) for (let i = 0; i < 5; i++) for (const [k, c] of G.CORNERS.entries()) {
    const p = { ...with1(i, { ...none, [c]: 1 }), corners, outer: 40 };
    assert.doesNotThrow(() => G.letters(p), `${i} ${c}`);
    assert.deepEqual(G.letterRadii(p, i).map((r) => r > 0), G.CORNERS.map((_, j) => j === k), `${i} ${c}`);
  }
  // All square, the letters have no curve but their slot ends' rounds; all four, the H's four.
  assert.doesNotMatch(G.letterPaths(with1(1, none))[1], /C/);
  assert.deepEqual(G.letterRadii(with1(4, { tl: 1, tr: 1, br: 1, bl: 1 }), 4), [16, 16, 16, 16]);
  // The old switches set the corners as they did: the H's Both its left as its right, the M's Base its feet.
  assert.deepEqual(G.cornersOf(with1(4, { both: 1 }), 4), [true, true, true, true]);
  assert.deepEqual(G.cornersOf(with1(1, { base: 1 }), 1), [true, true, true, true]);
  assert.deepEqual(G.cornersOf(with1(0, { round: 0 }), 0), [false, false, true, true]);
  // The a: its stem square at its top whatever its Top right says, its bowl's corner with its top.
  assert.deepEqual(G.cornersOf({ a: 'a', per: Object.assign([], { 2: { tl: 1, tr: 1, br: 0, bl: 0 } }) }, 2), [true, false, false, true]);
  // The page's Letters table: four corner rows, each letter's dots as its corners; a preset's Both sets the H's left.
  const K = Object.fromEntries(C.KNOBS.map((k) => [k.key, k]));
  assert.deepEqual(K.per.rows.slice(1, 5).map(([r]) => r), ['tl', 'tr', 'bl', 'br']);
  assert.deepEqual([0, 1, 2, 3, 4].map((i) => G.CORNERS.map((c) => (K.per.on(c, i) ? 1 : 0)).join('')), ['1111', '1100', '1100', '1111', '0110']);
  C.applyPreset({ per: [{}, {}, {}, {}, { both: 1 }] });
  assert.ok(K.per.on('tl', 4) && K.per.on('bl', 4));
  for (const k of C.KNOBS) (k.reset ? k.reset() : k.set(k.value));
  assert.ok(!K.per.on('tl', 4));
});

test('bent in: a letter squares its corners that face a round one and reaches into it, the gap kept; Down its own', () => {
  const P = { ...G.SLANT, ...C.START, drop: 0, per: Object.assign([], { 1: { bend: 1 } }) }; // the M bends into the S
  // Its top left gives way to the S's top right, its top right to the A's top left; its feet are square already.
  assert.deepEqual(G.cornersOf(P, 1), [false, false, false, false]);
  assert.deepEqual(G.letterRadii(P, 1), [0, 0, 0, 0]);
  const plain = G.letterPaths({ ...P, per: Object.assign([], { 1: { tl: 0, tr: 0 } }) }), bent = G.letterPaths(P);
  assert.equal(bent[1].split('M').length, plain[1].split('M').length + 3); // into the S's top right and base right, the A's top left
  assert.deepEqual([0, 2, 3, 4].map((i) => bent[i]), [0, 2, 3, 4].map((i) => plain[i]));
  // Each piece by the S keeps the gap from its round: every point at least the gap from the round's centre, less its round.
  const b = G.block(P), R = G.letterRadii(P, 0)[1];
  const pts = bent[1].split('M').slice(-3).flatMap((d) => d.replace('Z', '').split('L').map((q) => q.split(' ').map(Number))).filter(([x]) => x < b.right(1) + 40);
  const sx = b.left(1), gap = b.right(1) - sx; // the S's right edge, and the gap to the M
  for (const [x, y] of pts.filter(([, y]) => y < R)) assert.ok(Math.hypot(Math.max(0, x - (sx - R)), R - y) >= gap - 1, `${x} ${y}`);
  assert.ok(pts.some(([x]) => x < b.right(1) - 1)); // it reaches past its own side, over the S's corner
  // Every letter bent, both cases and every Down, draws.
  const all = [0, 1, 2, 3, 4].map(() => ({ bend: 1 }));
  for (const a of ['A', 'a']) for (const downFit of G.DOWN_FITS) for (const downJoin of G.DOWN_JOINS) {
    assert.doesNotThrow(() => G.letters({ ...P, a, per: all }), `${a}`);
    assert.doesNotThrow(() => G.down({ ...P, a, downFit, downJoin, per: all }), `${a} ${downFit} ${downJoin}`);
  }
  // Down has its own switches: bent there, the wordmark as it was, and the other way about.
  const D = (q) => G.down({ ...G.SLANT, ...C.START, drop: 0, downFit: 'fill', ...q }).d;
  assert.notEqual(D({ downPer: Object.assign([], { 1: { bend: 1 } }) }), D({}));
  assert.equal(D({ per: Object.assign([], { 1: { bend: 1 } }), downPer: [] }), D({}));
  assert.equal(D({ downPer: Object.assign([], { 1: { bend: 1 } }), downFit: 'wider' }), D({ downFit: 'wider' })); // set in from each other, none bends
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

test("one governing angle: locked, every S's crossbar falls at the cuts' slope across its own width, the Tilt slider waiting", () => {
  const near = (a, b, e = 1e-3) => Math.abs(a - b) < e;
  const L = (q) => G.letterPaths({ ...SQUARE, tilt: 120, lock: 1, ...q });
  for (const drop of G.DROPS.slice(1)) for (const stem of [32, 72, 120]) {
    for (const i of [0, 3]) {
      const S = L({ drop, stem })[i];
      assert.ok(near(blade(S), drop), `S ${i} drop ${drop} stem ${stem}: ${blade(S)}`); // the blade, at the cuts' slope
      assert.deepEqual(slopes(S).filter((k) => !near(k, drop)), [], `S ${i} drop ${drop} stem ${stem}`); // every slanted side parallel
    }
    assert.notEqual(L({ drop, stem, lock: 0 })[0], L({ drop, stem })[0]); // free, the slider's 120 instead
  }
  // The cuts' slope as they are drawn, on the grid: 8 in a slot of 24 at 0.4.
  assert.ok(near(blade(L({ drop: 0.4, stroke: 24 })[0]), 8 / 24));
  // Level cuts, a level crossbar; a tilt switched off, level too.
  assert.equal(L({ drop: 0 })[0], G.letterPaths({ ...SQUARE, drop: 0 })[0]);
  assert.ok(!slopes(G.letterPaths({ ...SQUARE, drop: 0.4, lock: 1, per: Object.assign([], { 3: { tilt: 0 } }) })[3]).some((k) => k !== 0.4 && k !== 0));
  // At the defaults, nothing changes: unlocked, the slider's tilt.
  assert.equal(G.letters({ ...G.SLANT, lock: 0, tilt: 48 }), G.letters({ ...G.SLANT, tilt: 48 }));
});

test("locked, Down's S's keep the cuts' slope however wide their stems: the blade parallel in every fit", () => {
  const near = (a, b) => Math.abs(a - b) < 1e-3;
  for (const downFit of G.DOWN_FITS) for (const drop of [0.2, 0.4, 0.8]) {
    const D = G.down({ ...SQUARE, drop, lock: 1, tilt: 0, downFit });
    const pieces = D.d.split('M').filter(Boolean).map((q) => 'M' + q); // S, M, the A and its counter, S, H
    for (const i of [0, 4]) {
      assert.ok(near(blade(pieces[i]), drop), `${downFit} ${drop} ${i}: ${blade(pieces[i])}`);
      assert.deepEqual(slopes(pieces[i]).filter((k) => !near(k, drop)), [], `${downFit} ${drop} ${i}`);
    }
  }
  // Filled, the S's 136 across, not the wordmark's 84: the fall grows with it, the angle stays.
  const S = G.down({ ...SQUARE, drop: 0.4, lock: 1, downFit: 'fill' }).d.split('M')[1];
  const xs = polys('M' + S)[0].map(([x]) => x);
  assert.equal(Math.max(...xs) - Math.min(...xs), 136);
  // At the page's start, filled, the S's 256 across and 200 tall, rounded 64: it falls 96 at most, 0.375 where the cuts fall 0.4.
  const start = { ...G.SLANT, stem: 72, ceil: 44, outer: 64, tension: 0.6, cut: 12, drop: 0.4, lock: 1, downFit: 'fill' };
  assert.ok(near(blade(G.down(start).d.split('M').filter(Boolean).map((q) => 'M' + q)[0]), 96 / 256));
  assert.equal(crossing(G.down(start).d), null);
});

test("locked, the S M's S, the S alone and the square S fall at their cuts' slope; where one can't, the steepest that fits", () => {
  const near = (a, b, e = 1e-3) => Math.abs(a - b) < e;
  for (const drop of [0.2, 0.4]) for (const stem of [32, 72]) {
    const sym = G.symbol({ cols: G.symCols(stem, 20), rows: G.symRows(20), round: 0, outer: 0, drop, lock: 1, tilt: 3 });
    assert.ok(near(blade(sym), drop), `S M ${drop} ${stem}`);
    assert.deepEqual(slopes(sym).filter((k) => !near(k, drop)), [], `S M ${drop} ${stem}`); // its S's cuts, its blade and the M's slot tops, one angle
    for (const wide of [0, 1]) {
      const S = G.letterS({ cut: 0, drop, stem, lock: 1, wide });
      assert.ok(near(blade(S.d), drop), `S ${wide} ${drop} ${stem}`);
      const two = (d) => d.replace(/[\d.]+/g, (n) => String(+(+n).toFixed(2)));
      assert.deepEqual(turned(S.d, S.w, S.h).map(two), corners(S.d).map(two)); // the same upside down
    }
  }
  // Too steep for the square S under stems 72: its crossbar rises into the top slot only till a
  // quarter of it stays open, 15 over 36 across 256, so its blade falls 0.417, not the cuts' 0.6.
  const sq = G.letterS({ cut: 0, drop: 0.6, stem: 72, lock: 1, wide: 1 });
  assert.ok(near(blade(sq.d), (15 * 256) / 36 / 256), `${blade(sq.d)}`);
  assert.equal(crossing(sq.d), null);
  // And the wordmark's S, short under wide stems: 240 tall, it falls 264 at most, across its 420.
  const S = G.letterPaths({ ...SQUARE, stem: 200, height: 240, drop: 1, lock: 1 })[0];
  assert.ok(near(blade(S), 264 / 420), `${blade(S)}`);
  assert.equal(crossing(S), null);
});

test("the chapter's Angle: locked, the wordmark, Down, the S M and the favicon's S at the cuts' slope; free, the Tilt slider", () => {
  const K = Object.fromEntries(C.KNOBS.map((k) => [k.key, k]));
  const near = (a, b, e = 1e-3) => Math.abs(a - b) < e;
  const d = (svg) => svg.match(/ d="([^"]+)"/)[1];
  K.slope.set(8); K.tilt.set('120'); K.outer.set('0'); K.cut.set('0');
  const free = [C.wordmark(), C.down(), C.symbol()];
  K.lock.set('1');
  assert.ok(C.wordmark().includes(G.letters({ ...G.SLANT, ...C.START, drop: 0.4, tilt: 120, outer: 0, cut: 0, lock: 1 })));
  const pieces = (svg) => d(svg).split('M').filter(Boolean).map((q) => 'M' + q);
  assert.ok(near(blade(pieces(C.wordmark())[0]), 0.4)); // the first S, 164 across
  assert.ok(near(blade(pieces(C.down())[0]), 0.4)); // Down's, filled to the M's 236
  assert.ok(near(blade(C.symbol()), 0.4));
  assert.deepEqual(slopes(d(C.symbol())).filter((k) => !near(k, 0.4)), []);
  for (const size of [16, 32, 64]) assert.deepEqual(slopes(d(C.favicon({ size }))).filter((k) => !near(k, 0.4, 2e-2)), [], `favicon ${size}`);
  assert.ok(slopes(d(C.favicon({ size: 64 }))).length > 4); // the S's cuts and blade, the M's slot tops
  K.lock.set('0');
  assert.deepEqual([C.wordmark(), C.down(), C.symbol()], free);
  for (const k of C.KNOBS) (k.reset ? k.reset() : k.set(k.value));
});

test("locked, steep cuts in wide slots under wide stems: no S crosses itself", () => {
  const looks = [{ cut: 12, outer: 64, tension: 0.6 }, { cut: 30, tips: 1, outer: 0 }];
  for (const stem of [32, 200]) for (const slot of [8, 60]) for (const drop of [0.2, 1]) for (const split of [0, 1]) for (const look of looks) {
    const q = { stem, slot, drop, split, lock: 1, ...look };
    const at = JSON.stringify(q);
    assert.equal(crossing(G.symbol({ cols: G.symCols(stem, slot), rows: G.symRows(slot), ...q })), null, `S M ${at}`);
    for (const wide of [0, 1]) assert.equal(crossing(G.letterS({ ...q, wide }).d), null, `S ${wide} ${at}`);
    for (const height of [240, 472]) for (const open of [0, 1]) {
      const p = { ...G.SLANT, ...q, stroke: slot, height, per: G.PER.map((o) => ({ ...o, ...('open' in o ? { open } : {}) })) };
      assert.equal(crossing(G.letters(p)), null, `letters ${height} ${open} ${at}`);
      assert.equal(crossing(G.down(p).d.split('M').filter(Boolean).map((s) => 'M' + s)[0]), null, `Down ${height} ${open} ${at}`);
    }
  }
});

const K = await import('../src/identity/directions/slant/clip.js');

test('a ring cut by a line: its pieces either side, closed, the line along their cut sides', () => {
  const area = (r) => r.reduce((t, [x, y], i) => { const [x2, y2] = r[(i + 1) % r.length]; return t + x * y2 - x2 * y; }, 0) / 2;
  const square = [[0, 0], [10, 0], [10, 10], [0, 10]];
  const { lo, hi } = K.cutRing(square, 4);
  assert.equal(lo.length, 1); assert.equal(hi.length, 1);
  assert.ok(Math.abs(area(lo[0]) - 40) < 1e-4 && Math.abs(area(hi[0]) - 60) < 1e-4); // turning as the square does
  // A U, open at the top: cut across its arms, two pieces above and one below.
  const U = [[0, 0], [4, 0], [4, 6], [6, 6], [6, 0], [10, 0], [10, 10], [0, 10]];
  const u = K.cutRing(U, 3);
  assert.equal(u.lo.length, 2); assert.equal(u.hi.length, 1);
  assert.ok(Math.abs(u.lo.map(area).reduce((a, b) => a + b) + u.hi.map(area).reduce((a, b) => a + b) - area(U)) < 1e-4);
  for (const r of u.lo) assert.ok(r.every(([, y]) => y <= 3));
  // A side on the line falls below it: the whole U below a line at its top.
  assert.deepEqual(K.cutRing(U, 0).lo, []);
  // An arc flattened: its points on the circle, a unit or so apart.
  const [arc] = K.flatten('M0 0L10 0A10 10 0 0 1 20 10L0 10Z');
  assert.ok(arc.length > 15 && arc.slice(1, -1).every(([x, y]) => Math.abs(Math.hypot(x - 10, y - 10) - 10) < 1e-9));
});

test("the slash: off, the letters as they were; along the S's blade, its line at the cuts' slope through the first S", () => {
  const p = { ...SQUARE, drop: 0.4, lock: 1 };
  assert.deepEqual(G.slash(p).paths, G.letterPaths(p));
  const { c } = G.block(p);
  const line = G.slashLine(p);
  assert.equal(line.x, c(0)); assert.equal(line.y, G.block(p).H / 2);
  assert.ok(Math.abs(line.slope - 0.4) < 1e-9); // 8 in 20, the S's blade
  assert.equal(G.slashLine({ ...p, lock: 0, tilt: 0 }).slope, 0);
  // The first S's tilt off, the second leads.
  assert.equal(G.slashLine({ ...p, per: Object.assign([], { 0: { tilt: 0 } }) }).x, c(7));
});

test("the slash, level: the M cut through its three stems, the S's, the A's and the H's crossbars left whole (half a stem of sliver)", () => {
  const p = { ...SQUARE, slash: 1, slashWidth: 24 }; // level (no tilt); the band 224 to 248, on the grid
  const before = G.letterPaths(p), after = G.slash(p).paths;
  for (const i of [0, 2, 3, 4]) assert.equal(after[i], before[i], `letter ${i}`);
  const M = polys(after[1]);
  assert.equal(M.length, 4); // its top and its three legs
  for (const r of M) {
    assert.deepEqual(r.flat().filter((n) => n % 4), []); // on the grid of 4
    assert.ok(r.every(([, y]) => y <= 224) || r.every(([, y]) => y >= 248)); // none in the band
  }
  assert.deepEqual(M.filter((r) => r.every(([, y]) => y >= 248)).map((r) => r.filter(([, y]) => y === 248).length), [2, 2, 2]);
  // Wider than the crossbars (32), the band takes them: the A and the H come apart too.
  const wide = G.slash({ ...p, slashWidth: 48 }).paths;
  assert.ok(polys(wide[2]).length > polys(before[2]).length && polys(wide[4]).length === 4);
});

test("the slash locked to the blade: its sides at the cuts' slope through the M and the A, the first S's blade left whole", () => {
  const p = { ...SQUARE, drop: 0.4, lock: 1, slash: 1 };
  const before = G.letterPaths(p), { paths } = G.slash(p);
  assert.equal(paths[0], before[0]); // its blade is the slash's start: cut along, it would leave slivers
  const near = (a, b) => Math.abs(a - b) < 1e-2;
  const { y, slope, x } = G.slashLine(p);
  for (const i of [1, 2]) {
    assert.ok(polys(paths[i]).length > polys(before[i]).length, `letter ${i}`);
    assert.deepEqual(slopes(paths[i]).filter((k) => !near(k, 0.4)), [], `letter ${i}`); // the cut sides parallel to the slot ends' cuts
    // No corner strictly inside the band, 20 tall about the blade's line.
    const u = ([X, Y]) => Y - y - slope * (X - x);
    assert.deepEqual(polys(paths[i]).flat().filter((q) => Math.abs(u(q)) < 10 - 1e-2), [], `letter ${i}`);
    assert.equal(crossing(paths[i]), null);
  }
  // Under the page's stems (72) it runs off the base at the second S: it doesn't chip its corner.
  const wide = { ...p, stem: 72, ceil: 44 };
  assert.equal(G.slash(wide).paths[3], G.letterPaths(wide)[3]);
});

// The page's measures (START), with the switches as PER has them.
const PAGE = { ...G.SLANT, ...C.START, per: G.PER.map((q) => ({ ...q })), lower: [0, 0, 0, 0, 0] };
/** Path data's outlines, flattened: [outer ring, its counters] for each part. */
const regions = (d) => {
  const rings = K.flatten(d);
  // A point just inside each (a counter may share a cut side with its letter): beside its longest side.
  const within = (r) => {
    const k = r.reduce((best, a, i) => (Math.hypot(...[0, 1].map((j) => r[(i + 1) % r.length][j] - a[j])) > Math.hypot(...[0, 1].map((j) => r[(best + 1) % r.length][j] - r[best][j])) ? i : best), 0);
    const [a, b] = [r[k], r[(k + 1) % r.length]], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], n = [(a[1] - b[1]) / len * 0.01, (b[0] - a[0]) / len * 0.01];
    return [[mid[0] + n[0], mid[1] + n[1]], [mid[0] - n[0], mid[1] - n[1]]].find((q) => K.inside([r], q));
  };
  const pts = rings.map(within), depth = (i) => rings.filter((o, j) => j !== i && K.inside([o], pts[i])).length;
  const outer = rings.map((r, i) => depth(i) % 2 === 0);
  return rings.filter((r, i) => outer[i]).map((r) => [r, ...rings.filter((o, j) => !outer[j] && K.inside([r], pts[j]))]);
};
/** Whether a disc r in radius fits in rings (evenodd): probed every 12 units, then 6, 3 and 1.5, so to within one. */
const fits = (rings, r) => {
  const pts = rings.flat(), sides = rings.flatMap((q) => q.map((a, i) => [a, q[(i + 1) % q.length]]));
  const to = ([x, y], [ax, ay], [bx, by]) => {
    const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
    return Math.hypot(x - ax - t * dx, y - ay - t * dy);
  };
  const [x0, x1] = [Math.min(...pts.map(([x]) => x)), Math.max(...pts.map(([x]) => x))];
  const [y0, y1] = [Math.min(...pts.map(([, y]) => y)), Math.max(...pts.map(([, y]) => y))];
  for (const g of [12, 6, 3, 1.5]) {
    for (let y = y0 + g / 2; y < y1; y += g) for (let x = x0 + g / 2; x < x1; x += g) {
      if (sides.every(([a, b]) => to([x, y], a, b) >= r) && K.inside(rings, [x, y])) return true;
    }
  }
  return false;
};
/** Whether every outline of after is one of before's, moved right 0 or dx whole: its points off the band's sides on before's sides. */
const rigid = (before, after, dx, onBand) => {
  const sides = K.flatten(before).flatMap((r) => r.map((a, i) => [a, r[(i + 1) % r.length]]));
  const on = ([x, y]) => sides.some(([[ax, ay], [bx, by]]) => {
    const len = Math.hypot(bx - ax, by - ay), t = ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / (len * len || 1);
    return t > -1e-3 && t < 1 + 1e-3 && Math.abs((x - ax) * (by - ay) - (y - ay) * (bx - ax)) / (len || 1) < 0.02;
  });
  return K.flatten(after).every((r) => {
    const own = r.filter((q) => !onBand(q));
    return [0, dx].some((m) => own.every(([x, y]) => on([x - m, y])));
  });
};

test('the shift slides each part below the slash right whole, level, never sheared: its sides at their own slopes', () => {
  // The review's cases: level; locked steep and wide; free and steep; through the middle.
  for (const set of [{ shift: 16 }, { drop: 1, lock: 1, slashWidth: 60, shift: 24 }, { tilt: 80, shift: 24 }, { drop: 0.4, lock: 1, slashAt: 1, shift: 24 }]) {
    const p = { ...PAGE, slash: 1, ...set }, S = G.slash(p), before = G.letterPaths(p);
    const { x, y, slope } = G.slashLine(p), h = (p.slashWidth ?? 20) / 2;
    const u = ([X, Y]) => Y - y - slope * (X - x);
    // Where a cut side runs, and slid along it: on either side of the band, the slide's height above it.
    const onBand = (q) => [-h, h, h - slope * S.shift].some((c) => Math.abs(u(q) - c) < 0.05) || [-h, h].some((c) => Math.abs(u([q[0] - S.shift, q[1]]) - c) < 0.05);
    assert.ok(S.shift > 0, JSON.stringify(set));
    S.paths.forEach((d, i) => assert.ok(rigid(before[i], d, S.shift, onBand), `${JSON.stringify(set)} letter ${i}`));
    // Level: nothing drops under the baseline, and the parts below the band slide right, none down.
    const all = K.flatten(S.paths.join('')).flat();
    assert.ok(Math.max(...all.map(([, Y]) => Y)) <= G.block(p).H + 1e-6, JSON.stringify(set));
  }
  // Level at the page's measures: the M's legs right, the S's, the A and the H, held by their crossbars, stay where they were.
  const p = { ...PAGE, slash: 1, shift: 16 }, S = G.slash(p), before = G.letterPaths(p);
  for (const i of [0, 2, 3, 4]) assert.equal(S.paths[i], before[i], `letter ${i}`);
  assert.equal(S.shift, 10); // half a gap: the M's legs keep clear of the A, which stayed
  const legs = (d) => regions(d).filter(([r]) => Math.min(...r.map(([, Y]) => Y)) > G.block(p).H / 2);
  assert.deepEqual(legs(S.paths[1]).map(([r]) => Math.round(Math.min(...r.map(([X]) => X)))).sort((a, b) => a - b), [184, 276, 368].map((X) => X + 10)); // its three legs, 10 right
  // Where the band falls, the slide stops where the kerf keeps half its width: locked at 20 in 20, a band 20 tall, 10.
  assert.equal(G.slash({ ...PAGE, slash: 1, drop: 1, lock: 1, shift: 24 }).shift, 10);
});

test("slashed, no piece left above or below the band is thinner than half a stem, at the page's measures", () => {
  // The review's: level, tilt 16, a slash 44 tall (a 40 × 4 crumb of the second S); tilt 40 in a slash 8 tall (a wedge
  // off the H's foot); tilt 80, shifted 24 (6 of the A). And a grid of tilts and widths, free, locked and through the middle.
  const sets = [{ tilt: 16, slashWidth: 44 }, { tilt: 40, slashWidth: 8 }, { tilt: 80, slashWidth: 20, shift: 24 }];
  for (const tilt of [0, 24, 48, 80, 120, 160]) for (const slashWidth of [8, 20, 32, 44, 60]) sets.push({ tilt, slashWidth });
  for (const drop of [0.2, 0.4, 0.6, 1]) for (const slashWidth of [8, 20, 44]) for (const slashAt of [0, 1]) sets.push({ drop, lock: 1, slashWidth, slashAt });
  // Thin slots under a low ceiling, locked at 8 in 20: the band's bottom just meets the A's foot at its corner, a chip.
  sets.push({ drop: 0.4, lock: 1, slashWidth: 44, stroke: 8, ceil: 16 });
  for (const set of sets) {
    const p = { ...PAGE, slash: 1, ...set }, before = G.letterPaths(p);
    G.slash(p).paths.forEach((d, i) => {
      if (d === before[i]) return;
      for (const rings of regions(d)) assert.ok(fits(rings, p.stem / 4 - 2), `${JSON.stringify(set)} letter ${i}: a piece thinner than half a stem`);
    });
  }
  assert.ok(G.slash({ ...PAGE, slash: 1, stroke: 8, ceil: 16, drop: 0.4, lock: 1, slashWidth: 44 }).paths[2] === G.letterPaths({ ...PAGE, stroke: 8, ceil: 16, drop: 0.4, lock: 1 })[2]);
  // A piece the band's sides don't show thin: a block on a tail 10 wide, the band across where they meet. Cut, the tail
  // would hang on its own; it stays, the outline whole. A tail half a stem wide is cut.
  const p = { ...PAGE, slash: 1 }, H2 = G.block(p).H / 2;
  const tail = (w) => G.poly([[0, 0], [72, 0], [72, H2], [30 + w, H2], [30 + w, 2 * H2], [30, 2 * H2], [30, H2], [0, H2]]);
  assert.deepEqual(G.slash(p, [tail(10)]).paths, [tail(10)]);
  assert.equal(regions(G.slash(p, [tail(40)]).paths[0]).length, 2);
});

test('through the middle, a sloped slash crosses every letter, S to H; through the S, it runs off the base at the second S', () => {
  const p = { ...PAGE, slash: 1, drop: 0.4, lock: 1, slashAt: 1 }, b = G.block(p);
  const { x, y, slope } = G.slashLine(p);
  assert.deepEqual([x, y], [b.W / 2, b.H / 2]);
  assert.ok(Math.abs(slope - G.slashLine({ ...p, slashAt: 0 }).slope) < 1e-9); // the S's blade's slope
  const crossed = (q) => {
    const u = ([X, Y]) => Y - (q.y + q.slope * (X - q.x));
    return G.letterPaths(p).map((d) => { const pts = K.flatten(d).flat(); return pts.some((r) => u(r) < -10) && pts.some((r) => u(r) > 10); });
  };
  assert.deepEqual(crossed({ x, y, slope }), [true, true, true, true, true]);
  assert.deepEqual(crossed(G.slashLine({ ...p, slashAt: 0 })), [true, true, true, false, false]);
  // Cut, all but the A: its crossbar is where the band runs through its middle, and would leave slivers.
  const before = G.letterPaths(p), after = G.slash(p).paths;
  assert.deepEqual(after.map((d, i) => d !== before[i]), [true, true, false, true, true]);
});

test('framed and shifted, the frame goes round the slid mark whole: its sides across and down, the wedges clear of the letters', () => {
  const K2 = Object.fromEntries(C.KNOBS.map((k) => [k.key, k]));
  for (const [set, fit] of [[{ shift: 16 }, 1], [{ shift: 16 }, 2], [{ slope: 8, lock: 1, shift: 24 }, 2], [{ slope: 8, lock: 1, slashAt: 1, shift: 24 }, 2]]) {
    for (const k of C.KNOBS) (k.reset ? k.reset() : k.set(k.value));
    K2.slash.set(1); K2.frame.set(fit);
    for (const [k, v] of Object.entries(set)) K2[k].set(v);
    const p = { ...PAGE, slash: 1, ...set, drop: (set.slope ?? 0) / 20 };
    const m = C.START.frameGap + C.START.frameWidth, S = G.slash(p), letters = G.move(S.paths.join(''), m, m);
    const out = C.wordmark(), d = out.match(/ d="([^"]+)"/)[1];
    assert.ok(S.shift > 0 && d.startsWith(letters), JSON.stringify(set));
    const frame = d.slice(letters.length).split(/(?=M)/);
    // The ring: its two outlines, square to the page but for their rounds; round the slid mark, a gap clear.
    for (const sub of frame.slice(0, 2)) {
      for (const [, a, b] of sub.matchAll(/(?<=[ML])([\d.-]+ [\d.-]+)(?=L([\d.-]+ [\d.-]+))/g)) {
        const [[x1, y1], [x2, y2]] = [a, b].map((q) => q.split(' ').map(Number));
        assert.ok(x1 === x2 || y1 === y2, `${JSON.stringify(set)}: ${a} to ${b}`);
      }
    }
    const [ix0, iy0, ix1, iy1] = K.extent(frame[1]), [lx0, ly0, lx1, ly1] = K.extent(letters);
    assert.ok(lx0 - ix0 >= C.START.frameGap - 1e-6 && ix1 - lx1 >= C.START.frameGap - 1e-6 && ly0 - iy0 >= C.START.frameGap - 1e-6 && iy1 - ly1 >= C.START.frameGap - 1e-6, JSON.stringify(set));
    const [, vw, vh] = out.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/).map(Number);
    assert.ok(Math.abs(vw - (lx1 + m)) < 0.01 && vh === 472 + 2 * m, `${JSON.stringify(set)}: ${vw} × ${vh}`); // as wide as the slid mark, no taller
    // The wedges: none inside a letter.
    const glyphs = K.flatten(letters);
    for (const w of frame.slice(2)) for (const q of K.flatten(w)[0]) assert.ok(!K.inside(glyphs, q), `${JSON.stringify(set)}: a wedge in a letter at ${q}`);
  }
  for (const k of C.KNOBS) (k.reset ? k.reset() : k.set(k.value));
});

test("the chapter's slash: the wordmark slashed, slid and grown to hold it; Down and the S M not; off, as before", () => {
  const K2 = Object.fromEntries(C.KNOBS.map((k) => [k.key, k]));
  const start = [C.wordmark(), C.down(), C.symbol(), C.lockup()];
  K2.slash.set('1');
  assert.notEqual(C.wordmark(), start[0]);
  assert.deepEqual([C.down(), C.symbol(), C.lockup()], start.slice(1));
  assert.match(C.wordmark(), /viewBox="0 0 992 472"/);
  K2.shift.set('24');
  assert.match(C.wordmark(), /viewBox="0 0 992 472"/); // level: the M's legs slide, the H stays
  assert.equal(C.gridOf('wordmark'), false);
  K2.slope.set(8); K2.lock.set('1'); K2.slashAt.set('1');
  assert.match(C.wordmark(), /viewBox="0 0 994.16 472"/); // through the middle: the H's foot 10 right, its round cut
  K2.slashAt.set('0'); K2.slope.set(0); K2.lock.set('0');
  K2.slope.set(8); K2.lock.set('1'); K2.frame.set('2');
  assert.match(C.wordmark(), /<path/);
  assert.equal(crossing(C.wordmark().match(/ d="([^"]+)"/)[1].split('M').filter(Boolean).map((q) => 'M' + q)[1]), null);
  K2.slash.set('0');
  K2.frame.set('0'); K2.slope.set(0); K2.lock.set('0'); K2.shift.set('0');
  assert.equal(C.wordmark(), start[0]);
  for (const k of C.KNOBS) (k.reset ? k.reset() : k.set(k.value));
  assert.equal(C.wordmark(), start[0]);
});

test("the crossbars risen: the S's blade, the A's counter and notch and the H's crossbar move up together, the S's top counter the shorter", () => {
  assert.equal(G.letters({ ...G.SLANT, rise: 0 }), G.letters(G.SLANT)); // unrisen, as before
  const b = G.block({ ...SQUARE, rise: 24 });
  assert.deepEqual([b.H, b.mid, b.up, b.lo, b.bands], [472, 212, 186, 238, [0, 32, 196, 228, 440, 472]]);
  const [S, , A, , Hh] = G.letterPaths({ ...SQUARE, rise: 24 });
  // The S's top slot 32 to 196 under its blade, its bottom one 228 to 440: 164 against 212.
  assert.equal(S, 'M0 0L84 0L84 176L52 176L52 40L32 32L32 188L52 196L84 196L84 472L0 472L0 248L32 248L32 432L52 440L52 236L32 228L0 228Z');
  assert.equal(A, 'M260 0L344 0L344 472L312 472L312 228L292 228L292 472L260 472ZM312 40L292 32L292 196L312 196Z'); // the counter to 196, the notch from 228
  assert.equal(Hh, 'M468 0L500 0L500 196L520 196L520 0L552 0L552 472L520 472L520 228L500 228L500 472L468 472Z');
  assert.notDeepEqual(turned(S, 84, 472), corners(S)); // no longer the same upside down
  for (const rise of [4, 24, 48]) for (const drop of G.DROPS) {
    const d = cut({ ...SQUARE, drop, rise });
    for (const q of polys(d)) assert.deepEqual(q.flat().filter((n) => n % 4), [], `rise ${rise} drop ${drop}`);
    assert.deepEqual(slopes(d).filter((k) => Math.abs(k - drop) > 1e-9), [], `rise ${rise} drop ${drop}`);
  }
});

test("risen, the block grows to keep the shorter half's slots clear, and the ends lowered stop at the upper bend", () => {
  // 2 × 120 + 32 + 3 × 20 + 2 × 8 and twice the rise, to the 8: 400, not 352.
  assert.equal(G.block({ ...G.SLANT, ceil: 120, height: 240, rise: 24 }).H, 400);
  assert.equal(G.block({ ...G.SLANT, rise: 48 }).H, 472); // tall enough already
  const S = G.letterPaths({ ...SQUARE, rise: 24, lower: [999, 0, 0, 999] })[0];
  assert.match(S, /L52 176L52 166L32 158L/); // the top end half a slot under the upper crossbar slot (176)
  assert.match(S, /L32 306L52 314L/); // the bottom end lowered as far, its slot the longer
  // The A's counter at most a slot tall, under the risen crossbar.
  assert.match(G.letterPaths({ ...SQUARE, rise: 24, lower: [0, 0, 999, 0] })[2], /M312 176L292 168L292 196L312 196Z/);
  // A blade's high end nears the top first: it falls twice the rise less, 248 - 48 + 32 - 8 across 420.
  const tall = G.letterPaths({ ...SQUARE, stem: 200, height: 240, drop: 1, lock: 1, rise: 24 })[0];
  assert.ok(Math.abs(blade(tall) - 224 / 420) < 1e-3, `${blade(tall)}`);
  assert.equal(crossing(tall), null);
  const looks = [{ drop: 0, cut: 12, outer: 64, tension: 0.6 }, { drop: 1, cut: 30, tips: 1, outer: 0 }];
  for (const rise of [24, 48]) for (const stem of [32, 200]) for (const slot of [8, 60]) for (const tilt of [0, 96, 160]) for (const look of looks) for (const height of [240, 472]) for (const open of [0, 1]) {
    const p = { ...G.SLANT, ...look, rise, stem, stroke: slot, tilt, split: 1, height, lower: [999, 999, 999, 999], per: G.PER.map((o) => ({ ...o, ...('open' in o ? { open } : {}) })) };
    assert.equal(crossing(G.letters(p)), null, JSON.stringify({ rise, stem, slot, tilt, height, open, ...look }));
  }
  // The slash runs at the crossbars' height.
  assert.equal(G.slashLine({ ...G.SLANT, rise: 24 }).y, 212);
  assert.equal(G.slashLine({ ...G.SLANT, rise: 24, slashAt: 1 }).y, 212);
});

test("the chapter's Rise: the wordmark, Down and the lockup's middle line move up with the crossbars; the S M as it was", () => {
  const K2 = Object.fromEntries(C.KNOBS.map((k) => [k.key, k]));
  const start = [C.wordmark(), C.down(), C.symbol(), C.lockup()];
  K2.rise.set('24');
  assert.ok(C.wordmark().includes(G.letters({ ...G.SLANT, ...C.START, rise: 24 })));
  assert.deepEqual(C.gridOf('wordmark').bands, [0, 44, 196, 228, 428, 472]);
  assert.notEqual(C.down(), start[1]);
  assert.notEqual(C.lockup(), start[3]);
  assert.equal(C.symbol(), start[2]); // the S M keeps its rows
  for (const k of C.KNOBS) (k.reset ? k.reset() : k.set(k.value));
  assert.deepEqual([C.wordmark(), C.down(), C.symbol(), C.lockup()], start);
});

test("the symbol from the wordmark's cells: its first S as the wordmark draws it, the M squeezed to the S's width, the gap between", () => {
  const p = { ...SQUARE, stem: 40 }; // the M's stems (2 × 40 - 20) / 3 = 20: on the grid of 4
  const Y = G.symbolCells(p);
  assert.deepEqual([Y.w, Y.h], [2 * 100 + 20, 472]); // two cells of 2 stems and a slot, the gap; the wordmark's height
  assert.ok(Y.d.startsWith(G.letterPaths(p)[0])); // the S, the wordmark's, where it stands
  const M = Y.d.slice(G.letterPaths(p)[0].length);
  const xs = polys(M).flat().map(([x]) => x);
  assert.deepEqual([Math.min(...xs), Math.max(...xs)], [120, 220]); // the M as wide as the S, after the gap
  const sq = G.down({ ...p, downFit: 'squeeze' }).d.split('M').filter(Boolean)[1]; // Down's squeezed M, as tall as its slots allow
  assert.deepEqual(polys(M)[0].filter(([, y]) => y === 472).map(([x]) => x - 120), polys('M' + sq)[0].filter(([, y]) => y === Math.max(...polys('M' + sq)[0].map(([, v]) => v))).map(([x]) => x)); // its stems and slots at the foot, Down's
  for (const q of polys(Y.d)) assert.deepEqual(q.flat().filter((n) => n % 4), []);
  assert.deepEqual(slopes(Y.d).filter((k) => k !== 0.4), []); // every cut 8 in 20, the S's and the M's
  assert.deepEqual(Y.columns, [[40, 20], [100, 20], [140, 20], [180, 20]]); // the S's slot, the gap, the M's two slots
  // The wordmark's height, stems, gap and rise, and the first S's switches: open, its slot out of the top and the bottom.
  assert.equal(G.symbolCells({ ...p, height: 600 }).h, 600);
  assert.equal(G.symbolCells({ ...p, space: 60 }).w, 260);
  assert.equal(polys(G.symbolCells({ ...p, per: [{ open: 1 }] }).d).length, 4); // the S's three pieces, the M
  assert.ok(G.symbolCells({ ...p, rise: 24 }).d.startsWith(G.letterPaths({ ...p, rise: 24 })[0]));
  // Its corners as the letters': the S's four, the M's top two.
  assert.deepEqual(G.symbolCells({ ...G.SLANT, stem: 72, outer: 64 }).boxes.map((b) => b.radii), [[64, 64, 64, 64], [124 / 3 + 10, 124 / 3 + 10, 0, 0]]); // the M's at most a stem (124 / 3) and half a slot
});

test("held to the angle: locked, the cells' S falls exactly the slope across its run, its band grown to the fall and a slot", () => {
  const near = (a, b, e = 1e-6) => Math.abs(a - b) < e;
  const S = (q) => G.symbolCells({ ...SQUARE, lock: 1, ...q }).d.split('M').filter(Boolean).map((d) => 'M' + d)[0];
  // Stems 72, slots 20, 8 in 20: the blade falls 65.6 across 164. Its band, a bar and two slots (72), can't hold
  // 65.6 and a slot: it grows to 85.6, its crossbar slots 13.4 a half, the counters 6.8 shorter each.
  const h = G.holdOf({ ...SQUARE, stem: 72, drop: 0.4, lock: 1, hold: 1 }, 0);
  assert.ok(near(h.D, 65.6) && near(h.sv, 13.4) && near(h.top, 193.2) && h.least <= 472); // 472 tall already: no taller
  const s = S({ stem: 72, drop: 0.4 });
  assert.ok(near(blade(s), 0.4, 1e-3));
  assert.match(s, /L164 193\.2L92 193\.2L/); // the top crossbar slot's top, 236 - 16 - 2 × 13.4
  assert.match(s, /L0 278\.8L72 278\.8L/); // the bottom one's foot: the band 85.6, the fall and a slot
  // Held in a band that holds it (a bar and two slots: the fall at most 52), as the wordmark's.
  assert.equal(S({ stem: 32, drop: 0.2 }), G.letterPaths({ ...SQUARE, stem: 32, drop: 0.2, lock: 1 })[0]);
  // Where the counters can't give it, a bar each at least, the S M grows: stems 120 at 1 in 1 fall 260; 240 tall,
  // it grows to 2 × (32 + 32) + 260 + 20, to the 8: 408, its top counter a bar.
  const tall = G.symbolCells({ ...SQUARE, stem: 120, drop: 1, lock: 1, height: 240 });
  assert.equal(tall.h, 408);
  const t = G.holdOf({ ...SQUARE, stem: 120, drop: 1, lock: 1, hold: 1, height: 408 }, 0);
  assert.equal(t.top - 32, 32);
  assert.ok(near(blade('M' + tall.d.split('M')[1]), 1, 1e-3));
  // Free, the Tilt slider and the clamps, as before; the second S is never the symbol's.
  assert.equal(S({ stem: 72, drop: 0.4, lock: 0, tilt: 48 }), G.letterPaths({ ...SQUARE, stem: 72, drop: 0.4, tilt: 48 })[0]);
  assert.equal(G.holdOf({ ...SQUARE, drop: 0.4, lock: 1, hold: 1, per: [{ tilt: 0 }] }, 0), null);
});

test("held, every slope in every proportion: the blade at the cuts' slope exactly, the counters a bar at least, nothing crossing", () => {
  const near = (a, b) => Math.abs(a - b) < 1e-3;
  const looks = [{ cut: 0, outer: 0, round: 0 }, { cut: 12, outer: 64, tension: 0.6 }, { cut: 30, tips: 1, outer: 0 }];
  for (const stem of [32, 72, 200]) for (const slot of [8, 20, 60]) for (const drop of [0.2, 0.6, 1]) for (const height of [240, 472]) for (const rise of [0, 48]) for (const look of looks) {
    const p = { ...G.SLANT, ...look, stem, stroke: slot, drop, height, rise, lock: 1 }, at = JSON.stringify({ stem, slot, drop, height, rise, ...look });
    const Y = G.symbolCells(p), S = Y.d.split('M').filter(Boolean).map((d) => 'M' + d)[0];
    const k = (Math.round((drop * slot) / 4) * 4) / slot; // the cuts' slope as drawn, on the grid
    assert.ok(near(blade(S), k), `${at}: ${blade(S)} for ${k}`);
    assert.equal(crossing(Y.d), null, at);
    const h = G.holdOf(G.held(p, 0), 0), b = G.block(G.held(p, 0));
    assert.ok(h.top - b.ceil >= 32 - 1e-9 || h.least === 0, at); // the top counter, the shorter, a bar at least where it gave
    {
      const D = G.down({ ...p, downFit: 'squeeze' }).d.split('M').filter(Boolean).map((d) => 'M' + d);
      for (const i of [0, D.length - 2]) assert.ok(near(blade(D[i]), k), `Down ${i} ${at}: ${blade(D[i])}`); // the first S, the second (before the H)
      assert.equal(crossing(D.join('')), null, `Down ${at}`);
    }
    for (const open of [0, 1]) for (const split of [0, 1]) assert.equal(crossing(G.symbolCells({ ...p, split, per: [{ open }] }).d), null, `${at} open ${open} split ${split}`);
  }
});

test("the chapter's Symbol: cells, the S M, its lockup and favicons from the wordmark's first S and M; extended as before", () => {
  const K2 = Object.fromEntries(C.KNOBS.map((k) => [k.key, k]));
  const start = [C.symbol(), C.lockupSM(), C.favicon({ size: 32 }), C.wordmark(), C.down(), C.s()];
  K2.symbol.set('cells');
  const Y = G.symbolCells({ ...PAGE });
  assert.match(C.symbol(), /viewBox="0 0 348 472"/); // two cells of 164 and the gap of 20; the wordmark's 472
  assert.ok(C.symbol().includes(Y.d));
  assert.ok(C.lockupSM().includes(Y.d));
  assert.deepEqual([C.wordmark(), C.down(), C.s()], start.slice(3)); // the others as they were
  const g = C.gridOf('symbol');
  assert.deepEqual([g.w, g.h, g.bands], [348, 472, G.block(PAGE).bands]);
  assert.equal(C.gridOf('lockupSM').type, 348 + G.PITCH);
  for (const size of [16, 32, 64]) {
    const pts = K.flatten(C.favicon({ size }).match(/<path[^>]* d="([^"]+)"/)[1]).flat();
    assert.ok(pts.every(([x, y]) => x >= 0 && x <= size && y >= 0 && y <= size), `favicon ${size}`);
    assert.ok(Math.abs(Math.max(...pts.map(([, y]) => y)) - Math.min(...pts.map(([, y]) => y)) - 0.875 * size) < 0.05, `favicon ${size}`); // 7 in 8 of it, tall
  }
  // Locked, the favicon's S at the cuts' slope too.
  K2.slope.set(8); K2.lock.set('1'); K2.cut.set('0'); K2.outer.set('0');
  const fav = C.favicon({ size: 64 }).match(/<path[^>]* d="([^"]+)"/)[1];
  assert.ok(slopes(fav).some((k) => Math.abs(k - 0.4) < 2e-2) && slopes(fav).every((k) => Math.abs(k - 0.4) < 2e-2), 'favicon');
  // Framed, its ring round both cells.
  K2.frame.set('2');
  assert.match(C.symbol(), /viewBox="0 0 428 /);
  for (const k of C.KNOBS) (k.reset ? k.reset() : k.set(k.value));
  assert.deepEqual([C.symbol(), C.lockupSM(), C.favicon({ size: 32 }), C.wordmark(), C.down(), C.s()], start);
});

/** Two sides of a path, its curves and arcs flattened (clip.js), that cross, or null. */
const crossingFlat = (d, step = 0.5) => {
  const S = K.flatten(d, step).flatMap((r) => r.map((p, i) => [p, r[(i + 1) % r.length]]));
  const turn = (a, b, c) => { const v = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]); return Math.abs(v) < 1e-6 ? 0 : Math.sign(v); };
  for (let i = 0; i < S.length; i++) for (let j = i + 1; j < S.length; j++) {
    const [a, b] = S[i], [c, e] = S[j];
    if (turn(a, b, c) * turn(a, b, e) < 0 && turn(c, e, a) * turn(c, e, b) < 0) return JSON.stringify([S[i], S[j]]);
  }
  return null;
};

test("held, the first S's own Cut switch off: its ends at the bends fall the blade's fall, the blade at the cuts' slope exactly", () => {
  const near = (a, b) => Math.abs(a - b) < 1e-3;
  // Stems 72, slots 40, 20 in 20: square ends held the blade at 0.6 under the M's slot heads at 1.
  const p = { ...SQUARE, stem: 72, stroke: 40, drop: 1, lock: 1, per: [{ cut: 0 }] };
  const S = G.symbolCells(p).d.split('M').filter(Boolean).map((d) => 'M' + d)[0];
  assert.ok(near(blade(S), 1), `${blade(S)}`);
  assert.deepEqual([...new Set(slopes(S))], [1]); // its ends at the bends along the blade, parallel
  assert.equal(slopes(G.letterPaths({ ...p, lock: 0, tilt: 0 })[0]).length, 0); // free and level, its ends square, as before
  for (const stem of [32, 72, 200]) for (const slot of [8, 20, 28, 40, 60]) for (const drop of [0.2, 0.6, 1]) for (const height of [240, 472]) for (const rise of [0, 48]) for (const look of [{ outer: 0 }, { outer: 64, tension: 0.6, cut: 12 }]) {
    const q = { ...G.SLANT, ...look, stem, stroke: slot, drop, height, rise, lock: 1 }, at = JSON.stringify({ stem, slot, drop, height, rise, ...look });
    const k = (Math.round((drop * slot) / 4) * 4) / slot; // the cuts' slope as drawn, on the grid
    for (const open of [0, 1]) for (const split of [0, 1]) {
      const r = { ...q, split, per: [{ cut: 0, open }, {}, {}, { cut: 0, open }] }, Y = G.symbolCells(r);
      assert.ok(near(blade(Y.d.split('M').filter(Boolean).map((d) => 'M' + d)[0]), k), `${at} open ${open} split ${split}: ${blade(Y.d)}`);
      assert.equal(crossing(Y.d), null, `${at} open ${open} split ${split}`);
    }
    const D = G.down({ ...q, per: [{ cut: 0 }, {}, {}, { cut: 0 }], downFit: 'squeeze' }).d.split('M').filter(Boolean).map((d) => 'M' + d);
    for (const i of [0, D.length - 2]) assert.ok(near(blade(D[i]), k), `Down ${i} ${at}: ${blade(D[i])}`);
  }
});

test("the squeezed M: its stems a quarter of a bar at least, its slots narrower where they must; its top rounds clear of its slots", () => {
  assert.deepEqual(G.squeezeM(164, 20), { stem: 124 / 3, stroke: 20 }); // as it was: three stems and two of the S's slots
  assert.deepEqual(G.squeezeM(124, 60), { stem: 8, stroke: 50 }); // stems 32, slots 60: 4 / 3 wide; a quarter bar, slots 50
  for (const [stem, outer] of [[32, 32], [32, 64], [36, 64]]) for (const tension of [0.55, 0.6, 1]) {
    const p = { ...G.SLANT, stem, stroke: 60, ceil: 16, outer, tension }, at = JSON.stringify({ stem, outer, tension });
    const Y = G.symbolCells(p), M = Y.d.split('M').filter(Boolean).map((d) => 'M' + d).at(-1);
    const xs = K.flatten(M, 1)[0].map(([x]) => x);
    assert.ok(Math.abs(Math.max(...xs) - Math.min(...xs) - (2 * stem + 60)) < 1e-9, at); // as wide as the S
    assert.ok(Y.columns.slice(2).every(([, w]) => w === G.squeezeM(2 * stem + 60, 60).stroke), at); // its slots, as drawn
    assert.equal(crossingFlat(Y.d), null, at);
    assert.equal(crossingFlat(G.down({ ...p, downFit: 'squeeze' }).d), null, `Down ${at}`);
  }
  // Thinner still, its top corners round only till they pass over its slots' tops: a stem of 4, a ceiling of 16.
  const thin = { ...G.SLANT, stem: 4, stroke: 60, ceil: 16, outer: 64, tension: 0.55 };
  const { Rr } = G.rounds(thin, 1);
  assert.ok(Rr < 4 + 30 && Math.abs(Rr - (4 + 15 + Math.sqrt(2 * 4 * 15))) < 1e-9, `${Rr}`);
  assert.equal(crossingFlat(G.letterPaths(thin, 1)[1]), null);
});

test("the cells favicons: built at favicon measures, every stem and slot on whole pixels, the slots a pixel at 16", () => {
  const K2 = Object.fromEntries(C.KNOBS.map((k) => [k.key, k]));
  const reset = () => { for (const k of C.KNOBS) (k.reset ? k.reset() : k.set(k.value)); };
  const looks = [{}, { stem: 200, slot: 8 }, { stem: 32, slot: 60, ceil: 160, rise: 48 }, { slope: 20, lock: '1' }];
  for (const look of looks) for (const size of [16, 32, 64]) {
    reset();
    K2.symbol.set('cells');
    for (const [k, v] of Object.entries(look)) K2[k].set(v);
    const d = C.favicon({ size }).match(/<path[^>]* d="([^"]+)"/)[1], at = `${JSON.stringify(look)} ${size}`;
    const xs = [...new Set(sides(d).filter(([a, b]) => a[0] === b[0] && a[1] !== b[1]).map(([a]) => a[0]))].sort((a, b) => a - b);
    assert.deepEqual(xs.filter((x) => !Number.isInteger(x)), [], at); // every stem's side on a whole pixel
    // The S's stems a bar and its slot half one, the gap half one, the M's stems and slots half one: at 16, 2 px and 1 px.
    assert.deepEqual(xs, [0, 32, 48, 80, 96, 112, 128, 144, 160, 176].map((u) => Math.floor((5 * size) / 32) + (u * size) / 256), at);
    assert.ok(xs.slice(1).every((x, i) => x - xs[i] >= size / 16), at); // a pixel at 16 at least
  }
  reset();
});

/** The sloped sides of corners-only path data, each with its subpath: [[a, b], subpath index]. */
const sloped = (d) => polys(d).flatMap((p, n) => p.map((a, i) => [[a, p[(i + 1) % p.length]], n])).filter(([[a, b]]) => a[0] !== b[0] && a[1] !== b[1]);
/** Whether point c is on the line through a and b (the points are given to two places). */
const onLine = ([a, b], c) => Math.abs((b[1] - a[1]) * (c[0] - a[0]) - (c[1] - a[1]) * (b[0] - a[0])) / Math.hypot(b[0] - a[0], b[1] - a[1]) < 0.01;
/** As turned, to two places, as the points are given. */
const turned2 = (d, w, h) => polys(d).map((p) => p.map(([x, y]) => `${+(w - x).toFixed(2)},${+(h - y).toFixed(2)}`).sort().join(' ')).sort();
/** Whether every sloped side runs on, across a kerf, in another piece: one line through both. */
const across = (d) => sloped(d).every(([s, n]) => sloped(d).some(([t, m]) => m !== n && onLine(s, t[0]) && onLine(s, t[1])));

test("the split S's blade along one line: one straight cut across the kerf, its ends on the grid, the S the same upside down", () => {
  const S = (q) => G.letterPaths({ ...SQUARE, drop: 0, tilt: 42, split: 1, ...q })[0];
  assert.equal(S({ blade: 'step' }), S({})); // stepping, as it was
  assert.throws(() => G.letterPaths({ ...G.SLANT, blade: 'curve' }), /no blade called curve/);
  assert.ok(!across(S({}))); // stepping: the left piece's bottom edge a bar under the right piece's top edge
  const one = S({ blade: 'line' });
  assert.equal(one.split('M').filter(Boolean).length, 2);
  assert.ok(across(one));
  // Its centre line from 215 to 257 across the S's 84, its ends on the grid (a tie away from the centre): 216 and 256.
  assert.deepEqual(sloped(one).map(([s]) => s), [[[32, 231.24], [0, 216]], [[52, 240.76], [84, 256]]]); // the kerf's sides on it, between
  for (const [[a, b]] of sloped(one)) for (const [x, y] of [a, b]) if (x === 0 || x === 84) assert.equal(y % 4, 0);
  assert.deepEqual(turned2(one, 84, 472), corners(one));
  assert.ok(polys(one).flat().every(([X]) => X <= 32 || X >= 52)); // the kerf straight through, x 32 to 52
  // Unsplit, the line changes nothing.
  assert.equal(S({ split: 0, blade: 'line' }), S({ split: 0 }));
  // Open, as the S M's: the same.
  const open = G.letterPaths({ ...SQUARE, drop: 0, tilt: 42, split: 1, blade: 'line', per: [{ open: 1 }] })[0];
  assert.equal(open.split('M').filter(Boolean).length, 4);
  assert.ok(across(open));
  assert.deepEqual(turned2(open, 84, 472), corners(open));
});

test("along one line, the S M's S, the S alone and Down's S's too; the square S's crossbar keeps its bar between its kerfs", () => {
  const sym = (q) => G.symbol({ cols: G.symCols(72, 20), rows: G.symRows(20), round: 0, outer: 0, drop: 0, tilt: 48, split: 1, ...q });
  assert.equal(sym({ line: 0 }), sym({}));
  assert.ok(!across(sym({})));
  assert.ok(across(sym({ line: 1 })));
  const S = G.letterS({ cut: 0, drop: 0, tilt: 42, split: 1, line: 1 });
  assert.ok(across(S.d));
  assert.deepEqual(turned2(S.d, S.w, S.h), corners(S.d));
  assert.ok(!across(G.letterS({ cut: 0, drop: 0, tilt: 42, split: 1 }).d));
  // The square S: its crossbar between the kerfs a bar thick, its edges running on across both, its ends on the grid.
  const sq = G.letterS({ cut: 0, drop: 0, wide: 1, tilt: 42, split: 1, line: 1 });
  assert.equal(sq.d.split('M').filter(Boolean).length, 5);
  assert.ok(across(sq.d));
  assert.deepEqual(turned2(sq.d, sq.w, sq.h), corners(sq.d));
  for (const [[a, b]] of sloped(sq.d)) for (const [x, y] of [a, b]) if (x === 0 || x === sq.w) assert.equal(y % 4, 0, `${x} ${y}`);
  for (const downFit of ['wider', 'squeeze']) {
    const D = (q) => G.down({ ...SQUARE, drop: 0, tilt: 42, split: 1, downFit, ...q }).d;
    assert.ok(!across(D({})), downFit);
    assert.ok(across(D({ blade: 'line' })), downFit);
  }
});

test("along one line, the chapter's Blade switch: its S M, S alone and favicons follow; the slash runs along the snapped line", () => {
  const K = Object.fromEntries(C.KNOBS.map((k) => [k.key, k]));
  const S0 = C.START, cols = G.symCols(72, 20), rows = G.symRows(20);
  assert.deepEqual(K.blade.options, [['Step', 'step'], ['Line', 'line']]);
  const plain = [C.wordmark(), C.symbol(), C.s(), C.down(), C.favicon({ size: 64 })];
  K.blade.set('line');
  assert.deepEqual([C.wordmark(), C.symbol(), C.s(), C.down(), C.favicon({ size: 64 })], plain); // whole: nothing to run across
  K.tilt.set('48'); K.split.set('1');
  assert.ok(C.symbol().includes(G.symbol({ cols, rows, cut: S0.cut, drop: S0.drop, outer: S0.outer, tension: S0.tension, tilt: 48, split: 1, line: 1 })));
  assert.ok(C.s().includes(G.letterS({ cut: S0.cut, drop: S0.drop, stem: 72, slot: 20, outer: S0.outer, tension: S0.tension, tilt: 48, split: 1, line: 1 }).d));
  for (const size of [16, 32, 64]) assert.doesNotThrow(() => C.favicon({ size }));
  K.symbol.set('cells');
  for (const size of [16, 32, 64]) assert.doesNotThrow(() => C.favicon({ size }));
  for (const k of C.KNOBS) (k.reset ? k.reset() : k.set(k.value));
  // The slash along the S's blade: its slope between the line's ends on the grid, 216 and 256 across 84.
  const p = { ...SQUARE, drop: 0, tilt: 42, split: 1, blade: 'line' };
  assert.ok(Math.abs(G.slashLine(p).slope - 40 / 84) < 1e-9);
  assert.ok(Math.abs(G.slashLine({ ...p, blade: 'step' }).slope - 42 / 84) < 1e-9);
});

test("along one line, steep: its cut edges half a bar further into the corners' rounds, the fall clamped to clear them", () => {
  // Down's S's least height, Round 64: the step's fall left its edges at the rounds; the line's would pass them.
  for (const stem of [32, 72, 200]) for (const slot of [8, 20, 60]) for (const tilt of [96, 160]) for (const downFit of ['wider', 'fill', 'squeeze']) for (const lock of [0, 1]) {
    const p = { ...G.SLANT, ...C.START, stem, stroke: slot, tilt, lock, drop: 1, split: 1, blade: 'line', downFit, per: G.PER.map((q) => ({ ...q })) };
    const at = JSON.stringify({ stem, slot, tilt, downFit, lock });
    assert.doesNotThrow(() => G.letters(p), at);
    assert.doesNotThrow(() => G.down(p), at);
    assert.doesNotThrow(() => G.symbolCells(p), at);
    assert.equal(crossing(G.letters({ ...p, outer: 0 })), null, at);
  }
});

// Two tiers of corners (the design panel, round 2, 2026-10-13): a machined slab, generous ends, tight break edges inside.
/** Every point a path's commands end on, as "x,y", off the sides of its box w × h (where its outer corners' rounds end). */
const inside = (d, w, h) => [...d.matchAll(/[MLC]([^MLCAZ]*)/g)].map(([, a]) => a.trim().split(/\s+/).slice(-2).map(Number))
  .filter(([x, y]) => x !== 0 && x !== w && y !== 0 && y !== h).map(([x, y]) => `${x},${y}`).sort();

test("two tiers: the word's four extreme corners round the ends, every other corner the inside; off, as it was", () => {
  const two = { ...PAGE, corners: 1, endRound: 128, innerRound: 24 };
  assert.deepEqual([0, 1, 2, 3, 4].map((i) => G.letterRadii(two, i)), [[128, 24, 24, 128], [24, 24, 0, 0], [24, 24, 0, 0], [24, 24, 24, 24], [0, 128, 128, 0]]); // the H's as the S's, over its slot
  assert.deepEqual(G.wordRadii(two), [128, 128, 128, 128]);
  const L = G.letterPaths(two);
  assert.match(L[0], /^M0 128C0 51\.2 51\.2 0 128 0L140 0C/); // the S's top left 128 at 60%, its top right 24 (164 less 140)
  assert.equal(L[0].match(/C/g).length, 4);
  // Off, or both at the Round slider's value, the word as it was.
  assert.equal(G.letters({ ...PAGE, corners: 0, endRound: 200, innerRound: 0 }), G.letters(PAGE));
  assert.equal(G.letters({ ...PAGE, corners: 1, endRound: 64, innerRound: 64 }), G.letters(PAGE));
  assert.equal(G.letters({ ...PAGE, corners: 1, endRound: undefined, innerRound: undefined }), G.letters(PAGE)); // unset, each follows outer
  // Only the corners change: every other point as one tier has it, on the grid of 4 (the cuts square, 8 in 20).
  // The H's ends pass its stem, so its round also meets its slot's sides (72 and 92 across), off the grid.
  const sq = { ...PAGE, cut: 0, drop: 0.4 }, b = G.block(sq), w = 2 * b.stem + b.slot;
  for (const i of [0, 4]) {
    const [one, tw] = [sq, { ...sq, corners: 1, endRound: 160, innerRound: 16 }].map((p) => G.move(G.letterPaths(p)[i], -(i ? b.right(8) : 0), 0));
    const pts = inside(tw, w, b.H).filter((q) => !(i && [b.stem, b.stem + b.slot].includes(+q.split(',')[0]) && !inside(one, w, b.H).includes(q)));
    assert.equal(inside(tw, w, b.H).length - pts.length, i ? 4 : 0);
    assert.ok(pts.length >= (i ? 4 : 10), `${pts.length}`); // the H's crossbar, the S's slots and bends
    assert.deepEqual(pts, inside(one, w, b.H));
    assert.deepEqual(pts.flatMap((q) => q.split(',').map(Number)).filter((n) => n % 4), []);
  }
  assert.deepEqual(slopes(G.letters({ ...SQUARE, drop: 0.4, corners: 1, endRound: 0, innerRound: 0 })).filter((s) => s !== 0.4), []);
});

test("an end may pass a stem: across its slot head, as far as the S holds it, a quarter of a bar kept over the slot", () => {
  // At the page's measures the top is shared with the inner corner: 164 less 24.
  assert.deepEqual(G.letterRadii({ ...PAGE, corners: 1, endRound: 200, innerRound: 24 }, 0), [140, 24, 24, 140]);
  // Thin stems, wide slots, a low ceiling: the round passes over the slot's high corner, 8 clear of it,
  // r = 8 + a + b + √(2ab), a and b the corner's 32 and 16 less the 8.
  const t = { ...PAGE, corners: 1, endRound: 200, innerRound: 0, stem: 32, stroke: 60, ceil: 16 };
  const [tl, , , bl] = G.letterRadii(t, 0), r = 8 + 24 + 8 + Math.sqrt(2 * 24 * 8);
  assert.ok(Math.abs(tl - r) < 1e-9 && tl === bl && tl > 32, `${tl}`);
  assert.equal(crossingFlat(G.letterPaths(t)[0]), null);
  // The slot head's high corner (32, 16) stays 8 inside the round's circle (the 60% curve lies outside it).
  assert.ok(Math.abs(Math.hypot(tl - 32, tl - 16) - (tl - 8)) < 1e-9);
  // The word's ends alike: the H's as the S's (the S's top shared with its 24 inside), and the S's sides holding both
  // where the H is short and its stems wide.
  assert.deepEqual(G.letterRadii({ ...PAGE, corners: 1, endRound: 200, innerRound: 24 }, 4), [0, 140, 140, 0]);
  assert.deepEqual(G.wordRadii({ ...PAGE, corners: 1, endRound: 200, innerRound: 24, stem: 200, height: 240 }), [84, 84, 84, 84]);
  // Every proportion, every end: no outline crosses itself; the H's inner sides keep a quarter of a bar beside its
  // crossbar where its round crosses them; the inner corners never round past the ends.
  for (const stem of [32, 72, 200]) for (const slot of [8, 60]) for (const ceil of [16, 160]) for (const innerRound of [0, 64]) for (const rise of [0, 48]) {
    const p = { ...PAGE, corners: 1, endRound: 200, innerRound, stem, stroke: slot, ceil, rise, tension: 0.55 }, at = JSON.stringify({ stem, slot, ceil, innerRound, rise });
    const L = G.letterPaths(p), b = G.block(p), x = b.c(9);
    for (const i of [0, 4]) assert.equal(crossingFlat(L[i], 2), null, `${i} ${at}`);
    for (const [X, Y] of polys(L[4]).flat().filter(([X, Y]) => Math.abs(Math.abs(X - x) - b.slot / 2) < 1e-9 && Y > 0 && Y < b.H)) {
      assert.ok(Y <= b.up + b.slot / 2 - 8 + 0.01 || Y >= b.lo - b.slot / 2 + 8 - 0.01 || [b.up + b.slot / 2, b.lo - b.slot / 2].includes(Y), `${X} ${Y} ${at}`);
    }
    assert.equal(crossingFlat(G.symbolCells(p).d, 2), null, `cells ${at}`);
    const [e] = G.wordRadii(p);
    assert.ok([0, 1, 2, 3, 4].every((i) => G.letterRadii(p, i).every((r) => r <= e)), at);
    assert.ok(G.down(p).boxes.every(({ radii }) => radii.every((r) => r <= G.down(p).boxes[0].radii[0])), `down ${at}`);
  }
});

test("two tiers written down: the top S's top and the H's feet the ends, a letter's two alike; the S M's sides", () => {
  const two = { ...PAGE, corners: 1, endRound: 128, innerRound: 24 };
  const D = G.down(two);
  // Down's S's are 184 tall: the top S's top right stops at its crossbar slot, 92 - 16 - 20, its top left with it,
  // and the H's feet with them, a pair whatever its Both switch says (they are the column's extreme corners).
  assert.deepEqual(D.boxes.map((b) => b.radii), [[56, 56, 24, 24], [24, 24, 0, 0], [24, 24, 0, 0], [24, 24, 24, 24], [0, 24, 56, 56]]);
  assert.equal(crossingFlat(D.d, 2), null);
  // Thin stems, wide: the S's top holds 52, and the H's feet take it past its stems of 32, each half its 104 across,
  // sweeping over its slot from either side to meet at its middle; the column's frame with them.
  const D2 = G.down({ ...PAGE, corners: 1, endRound: 200, innerRound: 24, stem: 32, stroke: 40, ceil: 44, downFit: 'wider' });
  assert.deepEqual(D2.boxes.map((b) => b.radii), [[52, 52, 24, 24], [24, 24, 0, 0], [24, 24, 0, 0], [24, 24, 24, 24], [0, 24, 52, 52]]);
  assert.equal(crossingFlat(D2.d, 2), null);
  // The S M from the wordmark's cells: its S's left, its M's right (over its slot's head, its foot square), alike.
  const Y = G.symbolCells(two);
  const [mtl, mtr, mbr, mbl] = Y.boxes[1].radii;
  assert.deepEqual(Y.boxes[0].radii, [mtr, 24, 24, mtr]);
  assert.ok(mtl === 24 && mtr > 124 / 3 && mtr < 128 && mbr === 0 && mbl === 0, `${Y.boxes[1].radii}`);
  // The extended S M: its S's left and its M's right the ends, at most a bar.
  const e = G.symbol({ outer: 8, ends: 24 }), one = G.symbol({ outer: 8 });
  assert.match(e, /^M0 24C/);
  assert.notEqual(e, one);
  assert.equal(G.symbol({ outer: 8, ends: 8 }), one);
});

test("the chapter's Corners: two, every mark from the Round ends and Round inside sliders, the frame round the ends; one, as it was", () => {
  const K2 = Object.fromEntries(C.KNOBS.map((k) => [k.key, k]));
  const reset = () => { for (const k of C.KNOBS) (k.reset ? k.reset() : k.set(k.value)); };
  reset();
  const plain = ['wordmark', 'wordmarkLower', 'down', 'symbol', 's', 'lockup', 'lockupSM'].map((fn) => C[fn]()), fav = C.favicon({ size: 32 });
  K2.endRound.set('160'); K2.innerRound.set('16');
  assert.equal(C.wordmark(), plain[0]); // one tier: the sliders wait
  K2.corners.set('1');
  const two = { ...PAGE, corners: 1, endRound: 160, innerRound: 16 };
  assert.ok(C.wordmark().includes(G.letters(two)));
  assert.ok(C.down().includes(G.down(two).d));
  assert.ok(C.symbol().includes(G.symbol({ cols: G.symCols(72, 20), rows: G.symRows(20), cut: 12, drop: 0, outer: 16, ends: 160, tension: 0.6 })));
  assert.notEqual(C.favicon({ size: 32 }), fav);
  // Framed, the ring round the ends: the word's 148 (the S's top shared with the 16 inside), the H's alike.
  assert.deepEqual(G.wordRadii(two), [148, 148, 148, 148]);
  K2.frame.set('1');
  assert.ok(C.wordmark().includes(G.move(G.ring(992, 472, 20, 20, [148, 148, 148, 148], 0.6), 40, 40)));
  assert.match(C.wordmark(), /M0 188C/); // its outside rounded 148 + 40
  const D = G.down(two);
  assert.ok(C.down().includes(G.move(G.ring(D.w, D.h, 20, 20, [D.boxes[0].radii[0], D.boxes[0].radii[1], D.boxes[4].radii[2], D.boxes[4].radii[3]], 0.6), 40, 40)));
  K2.symbol.set('cells');
  const Y = G.symbolCells(two);
  assert.ok(C.symbol().includes(G.move(G.ring(Y.w, Y.h, 20, 20, [Y.boxes[0].radii[0], Y.boxes[1].radii[1], Y.boxes[1].radii[2], Y.boxes[0].radii[3]], 0.6), 40, 40)));
  K2.corners.set('0');
  K2.frame.set('0'); K2.symbol.set('extended');
  assert.deepEqual(['wordmark', 'wordmarkLower', 'down', 'symbol', 's', 'lockup', 'lockupSM'].map((fn) => C[fn]()), plain);
  reset();
});

test("an H's end past its stem sweeps over its open slot onto its other stem, one round from one centre", () => {
  // At the page's measures, Round ends 160: the H's right ends 148, as the S's; its stems 72, its slot 20.
  const p = { ...PAGE, corners: 1, endRound: 160, innerRound: 16 }, b = G.block(p), d = G.move(G.letterPaths(p)[4], -b.right(8), 0);
  const k = 0.6, r = 148, w = 164, Q = [[w - r, 0], [w - r + k * r, 0], [w, r - k * r], [w, r]];
  const at = (t) => [0, 1].map((j) => (1 - t) ** 3 * Q[0][j] + 3 * (1 - t) ** 2 * t * Q[1][j] + 3 * (1 - t) * t * t * Q[2][j] + t ** 3 * Q[3][j]);
  const yAt = (x) => { let lo = 0, hi = 1; for (let n = 0; n < 60; n++) { const m = (lo + hi) / 2; if (at(m)[0] < x) lo = m; else hi = m; } return at(lo)[1]; };
  // The left stem's top runs flat to 16 (164 less 148), then the round down to its inner side; the right stem's
  // inner side from where the same round meets it, out to the H's side 148 down; the crossbar as it was.
  assert.match(d, /^M0 0L16 0C[\d. ]+ 72 (\S+)L72 220L92 220L92 (\S+)C[\d. ]+ 164 148L164 324C/);
  const [, y72, y92] = d.match(/^M0 0L16 0C[\d. ]+ 72 (\S+)L72 220L92 220L92 (\S+)C/).map(Number);
  assert.ok(Math.abs(y72 - yAt(72)) < 0.01 && Math.abs(y92 - yAt(92)) < 0.01 && y92 < 220 - 8, `${y72} ${y92}`);
  // Its base the same round, turned: where it meets the slot's sides as far from the base.
  const [, z92, z72] = d.match(/L164 324C[\d. ]+ 92 (\S+)L92 252L72 252L72 (\S+)C[\d. ]+ 16 472L0 472Z$/).map(Number);
  assert.deepEqual([b.H - z92, b.H - z72].map((v) => +v.toFixed(2)), [y92, y72]);
  // At most a stem, the H as it was: its corners rounded by poly, its slot's sides straight to its top.
  assert.match(G.letterPaths({ ...p, endRound: 72 })[4], /L900 0L900 220L920 220L920 0L920 0C/);
});

test("the two-tier sliders and the tips' switch are labelled apart: every control's label its own", () => {
  const labels = C.KNOBS.map((k) => k.label).filter(Boolean);
  assert.deepEqual(labels.filter((l, i) => labels.indexOf(l) !== i), []);
  assert.deepEqual(['endRound', 'innerRound'].map((key) => C.KNOBS.find((k) => k.key === key).label), ['Round ends', 'Round inside']);
});

// The A's and the H's tilt (the design panel, round 2, 2026-10-13): the S's angle carried through their crossbars.
const TILTED = G.PER.map((q, i) => ({ ...q, ...(i === 2 || i === 4 ? { tilt: 1 } : {}) }));
/** A subpath's corners (path data of corners only), as [x, y]. */
const ringOf = (d, k = 0) => polys(d)[k];

test("the A's and the H's tilt: their crossbars fall at the S's blade's slope, a bar thick down, about the slot's centre", () => {
  // Locked at 8 in 20: the A's counter floor 216 to 224 under its cut top 32 to 40, its notch's top 248 to 256;
  // the H's crossbar the same, its upper slot ending on its higher edge, its lower starting on its lower.
  const [, , A, , Hh] = G.letterPaths({ ...SQUARE, lock: 1, per: TILTED });
  assert.equal(A, 'M260 0L344 0L344 472L312 472L312 256L292 248L292 472L260 472ZM312 40L292 32L292 216L312 224Z');
  assert.equal(Hh, 'M468 0L500 0L500 216L520 224L520 0L552 0L552 472L520 472L520 256L500 248L500 472L468 472Z');
  // Off, as PER has them, or no fall to take (level cuts locked, the Tilt slider at 0 free): as before.
  assert.ok(!G.PER[2].tilt && !G.PER[4].tilt);
  assert.equal(G.letters({ ...SQUARE, drop: 0, lock: 1, per: TILTED }), G.letters({ ...SQUARE, drop: 0, lock: 1 }));
  assert.equal(G.letters({ ...SQUARE, per: TILTED }), G.letters(SQUARE));
  // One angle through S, A, S, H: locked, every sloped side of the word at the cuts' slope, for every slope and
  // rise; the A's three (its cut top, its counter's floor, its notch's top), the H's two. Free, every side at the
  // Tilt slider's fall across an S: 42 across 84.
  for (const rise of [0, 24, 48]) for (const drop of G.DROPS) {
    const p = { ...SQUARE, drop, rise, lock: 1, per: TILTED }, L = G.letterPaths(p), b = G.block(p);
    assert.deepEqual(slopes(L.join('')).filter((k) => Math.abs(k - drop) > 1e-9), [], `rise ${rise} drop ${drop}`);
    assert.deepEqual([slopes(L[2]).length, slopes(L[4]).length], drop ? [3, 2] : [0, 0]);
    // On the grid of 4 where half the cut's fall is (8 and 16 in 20).
    if (drop === 0.4 || drop === 0.8) for (const q of polys(L[2] + L[4])) assert.deepEqual(q.flat().filter((n) => n % 4), [], `rise ${rise} drop ${drop}`);
    // A bar thick, measured down, at both sides of the slot; centred on the crossbars' height at the slot's centre.
    const H = ringOf(L[4]), x = b.c(9), y = (X, top) => H.find(([u, v]) => u === X && (top ? v < b.mid : v > b.mid) && v !== 0 && v !== b.H)[1];
    for (const X of [x - b.s, x + b.s]) assert.equal(y(X, false) - y(X, true), G.BAR);
    assert.equal((y(x - b.s, true) + y(x + b.s, true)) / 2, b.mid - G.BAR / 2);
    // The A's counter as tall as it was at the slot's centre, a trapezoid between its cut top and its floor.
    const [, counter] = polys(L[2]), [flat] = [polys(G.letterPaths({ ...SQUARE, drop, rise, lock: 1 })[2])[1]];
    const centre = (r) => (r[2][1] + r[3][1]) / 2 - (r[0][1] + r[1][1]) / 2;
    assert.equal(centre(counter), centre(flat));
  }
  const free = G.letterPaths({ ...SQUARE, drop: 0, tilt: 42, per: TILTED });
  assert.deepEqual([...new Set(slopes(free.join('')))], [0.5]);
  assert.match(free[4], /L500 215L520 225L/);
  // Risen, they pivot at the risen height, with the S's blade.
  assert.match(G.letterPaths({ ...SQUARE, rise: 24, lock: 1, per: TILTED })[4], /L500 192L520 200L/);
});

test("tilted, the A and the H hold every slope in every proportion: nothing crosses, the A's counter keeps a slot at its left", () => {
  const looks = [{ round: 0, outer: 0, cut: 0 }, { cut: 20, tips: 1, outer: 64, tension: 0.6 }, { corners: 1, endRound: 200, innerRound: 16, outer: 64, tension: 0.6 }];
  for (const stem of [32, 200]) for (const slot of [8, 60]) for (const height of [240, 720]) for (const ceil of [16, 160]) for (const rise of [0, 48])
    for (const [lock, drop, tilt] of [[1, 1, 0], [1, 0.4, 0], [0, 0, 160], [0, 1, 160]]) for (const look of looks) for (const both of [0, 1]) for (const lowerA of [0, 999]) {
      const per = TILTED.map((q, i) => (i === 4 ? { ...q, both } : q));
      const p = { ...G.SLANT, ...look, stem, stroke: slot, height, ceil, rise, lock, drop, tilt, per, lower: [0, 0, lowerA, 0] };
      const why = JSON.stringify({ stem, slot, height, ceil, rise, lock, drop, tilt, both, lowerA, ...look });
      const L = G.letterPaths(p);
      assert.equal(crossingFlat(L[2], 2), null, why);
      assert.equal(crossingFlat(L[4], 2), null, why);
      if (look.round === 0) {
        // The counter's left side, the shorter: a slot at least (and the cut's fall), lowered or not.
        const [, c] = polys(L[2]), b = G.block(p), left = c.filter(([x]) => x === b.c(5) - b.s).map(([, y]) => y);
        assert.ok(Math.max(...left) - Math.min(...left) >= slot - 1e-6, why);
        // The H's crossbar's high corner under the top, its low corner over the base.
        const H = ringOf(L[4]).filter(([x, y]) => Math.abs(x - b.c(9)) === b.s && y > 0 && y < b.H).map(([, y]) => y);
        assert.ok(Math.min(...H) >= G.BAR / 4 && Math.max(...H) <= b.H - G.BAR / 4, why);
      }
    }
});

test("the chapter's Letters table: a Tilt for the A and the H, off; on, the wordmark, Down and the lockup carry the angle, the S M as it was", () => {
  const reset = () => { for (const k of C.KNOBS) (k.reset ? k.reset() : k.set(k.value)); };
  reset();
  const K2 = Object.fromEntries(C.KNOBS.map((k) => [k.key, k])), letters = K2.per;
  assert.deepEqual([0, 1, 2, 3, 4].map((i) => letters.has('tilt', i)), [true, false, true, true, true]);
  assert.deepEqual([2, 4].map((i) => letters.on('tilt', i)), [false, false]);
  K2.lock.set(1); K2.slope.set(8);
  const fns = ['wordmark', 'down', 'lockup', 'symbol', 's', 'lockupSM'], before = fns.map((f) => C[f]());
  letters.set('tilt', 2, 1); letters.set('tilt', 4, 1);
  assert.ok(C.wordmark().includes(G.letters({ ...PAGE, drop: 0.4, lock: 1, per: TILTED })));
  assert.deepEqual(fns.map((f, i) => C[f]() === before[i]), [false, true, false, true, true, true]); // Down has its own table
  K2.downPer.set('tilt', 2, 1); K2.downPer.set('tilt', 4, 1);
  assert.deepEqual(fns.map((f, i) => C[f]() === before[i]), [false, false, false, true, true, true]);
  // Down's A and H tilt at their own stems (filled, wider than the wordmark's), at the same slope.
  const D = G.down({ ...SQUARE, drop: 0.4, lock: 1, per: TILTED, downFit: 'fill' });
  assert.deepEqual([...new Set(slopes(D.d).map((k) => +k.toFixed(9)))], [0.4]);
  reset();
  assert.equal(C.wordmark(), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 992 472" ><path fill="currentColor" fill-rule="evenodd" d="${G.letters({ ...G.SLANT, ...C.START })}"/></svg>`);
});

/**
 * The slope of the A's or the H's crossbar edges (letter i's), every one there is: the sides from its slot's
 * left side to its right that pivot at the crossbars' height (b.up + b.s, b.lo - b.s), read off the path data.
 */
const barSlopes = (p, i) => {
  const b = G.block(p), x = b.c(i === 2 ? 5 : 9), f = (n) => String(+n.toFixed(2)), [l, r] = [f(x - b.s), f(x + b.s)];
  const n = '(-?[\\d.]+)', re = new RegExp(`(?:^|[ML])${l} ${n}L${r} ${n}|(?:^|[ML])${r} ${n}L${l} ${n}`, 'g');
  return [...G.letterPaths(p)[i].matchAll(re)]
    .map((m) => (m[1] != null ? [+m[1], +m[2]] : [+m[4], +m[3]]))
    .filter(([y0, y1]) => [b.up + b.s, b.lo - b.s].some((v) => Math.abs((y0 + y1) / 2 - v) < 0.02))
    .map(([y0, y1]) => (y1 - y0) / (2 * b.s));
};

test("the A's and the H's tilt fall as the S's blade is drawn: where it gives way, they give way with it", () => {
  const near = (a, b, s) => Math.abs(a - b) <= 0.01 / s; // the path data's two decimals, across a slot
  // Free, the S's blade held back (its slots: fallThrough; its rounds: fallOf), the Tilt slider steeper than it:
  // 96 across 204 (0.47) drawn at 0.4; 160 across 104 (1.54) at 0.6; risen in two tiers at slots of 8, level.
  for (const [set, raw, slope] of [
    [{ stroke: 60, tilt: 96 }, 96 / 204, 0.4],
    [{ stem: 32, stroke: 40, tilt: 160 }, 160 / 104, 0.6],
    [{ corners: 1, stroke: 8, height: 240, rise: 48, tilt: 160 }, 160 / 152, 0],
  ]) {
    const p = { ...PAGE, ...set, per: TILTED }, s = G.block(p).s, S = G.slashLine(p).slope;
    assert.ok(near(S, slope, s) && raw > S + 0.05, JSON.stringify(set));
    for (const i of [2, 4]) {
      const k = barSlopes(p, i);
      assert.equal(k.length, 2, JSON.stringify(set)); // the A's floor and its notch's top; the H's two edges
      assert.ok(k.every((m) => near(m, S, s)), `${JSON.stringify(set)} ${i}: ${k} against ${S}`);
    }
  }
  // Every proportion: the A's and the H's four edges at one slope, never steeper than the S's blade (less only
  // where their own room gives way: below).
  for (const stem of [32, 200]) for (const slot of [8, 60]) for (const height of [240, 720]) for (const ceil of [16, 160]) for (const rise of [-48, 48])
    for (const [lock, drop, tilt] of [[1, 1, 0], [1, 0.4, 0], [0, 0, 160], [0, 1, 96]]) for (const corners of [0, 1]) for (const [split, blade] of [[0, 'step'], [1, 'line']]) {
      const p = { ...PAGE, corners, endRound: 200, innerRound: 16, stem, stroke: slot, height, ceil, rise, lock, drop, tilt, split, blade, per: TILTED };
      const why = JSON.stringify({ stem, slot, height, ceil, rise, lock, drop, tilt, corners, split, blade });
      const s = G.block(p).s, S = G.slashLine(p).slope, k = [...barSlopes(p, 2), ...barSlopes(p, 4)];
      assert.equal(k.length, 4, why);
      assert.ok(k.every((m) => near(m, k[0], s)) && k[0] <= S + 0.01 / s, `${why}: ${k} against ${S}`);
    }
  // Down's squeezed S's held to the cuts' slope exactly, and its A and H with them.
  for (const stroke of [20, 60]) {
    const D = G.down({ ...SQUARE, stroke, drop: 0.8, lock: 1, per: TILTED, downFit: 'squeeze' });
    assert.deepEqual([...new Set(slopes(D.d).map((k) => +k.toFixed(9)))], [0.8]);
  }
});

test("both tilted, the A and the H share the smaller room: where the A gives way before the S, the H does too", () => {
  // Locked at 20 in 20, 240 tall, ceiling 160, risen 48, stems 32, slots 60: the S's blade at 1, the A's counter
  // only room for 20 across half its slot, its floor 292 to 332 (2/3); the H with it, 292 to 332.
  const p = { ...PAGE, lock: 1, drop: 1, height: 240, ceil: 160, rise: 48, stem: 32, stroke: 60, per: TILTED };
  assert.equal(G.slashLine(p).slope, 1);
  assert.deepEqual([barSlopes(p, 2), barSlopes(p, 4)], [[2 / 3, 2 / 3], [2 / 3, 2 / 3]]);
  assert.match(G.letterPaths(p)[2], /L412 292L472 332Z$/);
  assert.match(G.letterPaths(p)[4], /L700 292L760 332L/);
  // The A level, or the a (no crossbar to fall), the H takes its own room, at the S's slope.
  assert.deepEqual(barSlopes({ ...p, per: TILTED.map((q, i) => (i === 2 ? { ...q, tilt: 0 } : q)) }, 4), [1, 1]);
  assert.deepEqual(barSlopes({ ...p, a: 'a' }, 4), [1, 1]);
});

test("the Letters table dims the A's Tilt while the a is chosen: it waits for the capital", () => {
  const reset = () => { for (const k of C.KNOBS) (k.reset ? k.reset() : k.set(k.value)); };
  reset();
  const K2 = Object.fromEntries(C.KNOBS.map((k) => [k.key, k])), letters = K2.per;
  const live = () => letters.rows.flatMap(([row]) => [0, 1, 2, 3, 4].filter((i) => letters.has(row, i) && !letters.live(row, i)).map((i) => `${row} ${i}`));
  assert.deepEqual(live(), []);
  K2.a.set('a');
  assert.deepEqual(live(), ['tr 2', 'tilt 2']); // the a's stem square at its top, too
  // And it does nothing there: the a's wordmark the same, its Tilt on or off.
  const before = C.wordmark();
  letters.set('tilt', 2, 1);
  assert.equal(C.wordmark(), before);
  reset();
  assert.deepEqual(live(), []);
});

// Down as one carved block (the design panel, round 2, 2026-10-13): a single stone with cuts in it.
/** Down's pieces, one a subpath: S, M, the A and its counter, S, H. */
const downPieces = (p) => G.down(p).d.split('M').filter(Boolean).map((q) => 'M' + q);

test("Down carved as one block: a slot between the letters, their seams square, only the column's four outer corners rounded", () => {
  const near = (a, b) => Math.abs(a - b) < 1e-6;
  const tiles = G.down({ ...PAGE, space: 60 }), carved = G.down({ ...PAGE, space: 60, downJoin: 'block' });
  const gaps = (D) => D.boxes.slice(1).map((b, i) => b.box[1] - D.boxes[i].box[3]);
  assert.deepEqual(gaps(tiles), [60, 60, 60, 60]); // the Gap slider's, as they were
  assert.deepEqual(gaps(carved), [20, 20, 20, 20]); // a slot, the Gap slider waiting
  // Every fit, one tier or two: the top S's top and the H's feet rounded, a pair (the H's Both switch off or on), every seam square.
  for (const downFit of G.DOWN_FITS) for (const corners of [0, 1]) for (const both of [0, 1]) {
    const p = { ...PAGE, downFit, corners, per: G.PER.map((q, i) => (i === 4 ? { ...q, both } : { ...q })), downJoin: 'block' };
    const D = G.down(p), [[a, b, c0, d0], ...rest] = D.boxes.map((x) => x.radii), [h0, h1, h2, h3] = rest.pop();
    const at = JSON.stringify({ downFit, corners, both });
    assert.ok(a > 0 && near(a, b) && near(a, h2) && near(a, h3), `${at} ${a} ${b} ${h2} ${h3}`);
    assert.deepEqual([c0, d0, ...rest.flat(), h0, h1], Array(16).fill(0), at);
    // The outline rounds only there: its four curves, each ending within that round of the top S's top corners or the H's feet.
    const [S, Hb] = [D.boxes[0].box, D.boxes[4].box], outer = [[S[0], S[1]], [S[2], S[1]], [Hb[2], Hb[3]], [Hb[0], Hb[3]]];
    const ends = [...D.d.matchAll(/C([^MLCAZ]*)/g)].map(([, q]) => q.trim().split(/\s+/).slice(-2).map(Number));
    assert.equal(ends.length, 4, at);
    for (const [x, y] of ends) assert.ok(outer.some(([X, Y]) => Math.abs(x - X) <= a + 1e-6 && Math.abs(y - Y) <= a + 1e-6), `${at} ${x} ${y}`);
    assert.equal(crossingFlat(D.d, 2), null, at);
  }
  // Tiles, as they were: the kerf switch waits for the block.
  assert.equal(G.down({ ...PAGE, downJoin: 'tiles', downKerf: 1, drop: 0.4, lock: 1 }).d, G.down({ ...PAGE, drop: 0.4, lock: 1 }).d);
  assert.throws(() => G.down({ ...PAGE, downJoin: 'glued' }), /no join called glued/);
});

test("carved, each S's crossbar slots run out through the column's side at its blade's angle, one kerf a slot tall", () => {
  const near = (a, b, e = 1e-3) => Math.abs(a - b) < e;
  const P = { ...PAGE, outer: 0, cut: 0, drop: 0.4, lock: 1, downJoin: 'block' };
  /** An S's points on its side x, their heights down, in order. */
  const side = (S, x) => polys(S)[0].filter(([X]) => near(X, x)).map(([, y]) => y).sort((m, n) => m - n);
  for (const downFit of G.DOWN_FITS) {
    const level = downPieces({ ...P, downFit }), sloped = downPieces({ ...P, downFit, downKerf: 1 });
    for (const i of [0, 4]) {
      const S = sloped[i], xs = polys(S)[0].map(([x]) => x), [L, R] = [Math.min(...xs), Math.max(...xs)], k = blade(S);
      assert.ok(k > 0.3, `${downFit} ${i}: ${k}`);
      // Every slanted side parallel to the blade: the slots' far sides too, two more of them.
      assert.deepEqual(slopes(S).filter((m) => !near(m, k)), [], `${downFit} ${i}`);
      assert.equal(slopes(S).length, slopes(level[i]).length + 2, `${downFit} ${i}`);
      // Down its right side, the top, the upper slot's far side, the blade's top, the base; its left, the top, the blade's
      // bottom, the lower slot's far side, the base: each slot as tall where it runs out as where it turns, two half
      // slots (a slot, unless held: squeezed, taller).
      const [, u, t] = side(S, R), [, b, l] = side(S, L), [, u0, t0] = side(level[i], R);
      assert.ok(near(t - u, l - b), `${downFit} ${i}`);
      if (downFit !== 'squeeze') assert.ok(near(t - u, 20), `${downFit} ${i}: ${t - u}`);
      assert.ok(t0 - u0 > t - u + 10, `${downFit} ${i}`); // level, a wedge, taller at the side by the blade's fall
      assert.ok(near(t, t0) && u > u0, `${downFit} ${i}`); // the far side moved down, the blade not
    }
    // The other letters as they were, level or sloped.
    assert.deepEqual([1, 2, 3, 5].map((j) => sloped[j]), [1, 2, 3, 5].map((j) => level[j]), downFit);
  }
  // The blade level, the kerf is level: nothing to slope.
  assert.equal(G.down({ ...P, drop: 0, downKerf: 1 }).d, G.down({ ...P, drop: 0 }).d);
  // Every proportion, split or whole, open or closed, one tier or two: no outline crosses itself.
  for (const stem of [32, 200]) for (const slot of [8, 60]) for (const drop of [0.4, 1]) for (const lock of [0, 1]) for (const split of [0, 1]) for (const blade of ['step', 'line']) for (const open of [0, 1]) for (const corners of [0, 1]) for (const downFit of G.DOWN_FITS) {
    const p = { ...PAGE, stem, stroke: slot, drop, lock, tilt: 160, split, blade, corners, endRound: 200, downFit, downJoin: 'block', downKerf: 1, per: G.PER.map((q, i) => (i === 0 || i === 3 ? { ...q, open } : { ...q })) };
    const at = JSON.stringify({ stem, slot, drop, lock, split, blade, open, corners, downFit });
    assert.doesNotThrow(() => G.down(p), at);
    for (const S of [0, 3]) assert.equal(crossingFlat(G.letterPaths({ ...p, height: 0, ends: 'down', kerf: true, seam: [S > 0, true] }, S)[S], 2), null, at);
  }
});

test("the chapter's Down join: Block, Down carved as one stone, and its kerf sloped; the other marks as they were", () => {
  const K2 = Object.fromEntries(C.KNOBS.map((k) => [k.key, k]));
  const reset = () => { for (const k of C.KNOBS) (k.reset ? k.reset() : k.set(k.value)); };
  reset();
  const others = () => ['wordmark', 'wordmarkLower', 'symbol', 's', 'lockup', 'lockupSM'].map((fn) => C[fn]()).concat(C.favicon({ size: 32 }));
  const plain = C.down(), rest = others();
  K2.downKerf.set('1');
  assert.equal(C.down(), plain); // tiles: the kerf waits
  K2.downJoin.set('block');
  assert.ok(C.down().includes(G.down({ ...PAGE, downJoin: 'block', downKerf: 1 }).d));
  K2.slope.set('8'); K2.lock.set('1');
  const sloped = C.down();
  assert.ok(sloped.includes(G.down({ ...PAGE, drop: 0.4, lock: 1, downJoin: 'block', downKerf: 1 }).d));
  K2.downKerf.set('0');
  assert.notEqual(C.down(), sloped);
  K2.slope.set('0'); K2.lock.set('0');
  assert.deepEqual(others(), rest);
  reset();
  assert.equal(C.down(), plain);
});

// The A and the H told apart (the design panel, round 3, 2026-10-13): the A's apex and window, the H's bar step.
/** PER with the A's switches a and the H's h. */
const perWith = (a = {}, h = {}) => G.PER.map((q, i) => ({ ...q, ...(i === 2 ? a : i === 4 ? h : {}) }));

test("the A's apex: its counter head a chevron, two edges at the governing slope meeting on the slot's centre line, its ends on the grid", () => {
  // At 8 in 20, slots of 20: the head's ends 4 under its point, half a slot either side of it; the floor as it was.
  const P = { ...SQUARE, per: perWith({ apex: 1 }) }, [, , A] = G.letterPaths(P);
  assert.equal(A, 'M260 0L344 0L344 472L312 472L312 252L292 252L292 472L260 472ZM312 36L302 32L292 36L292 220L312 220Z');
  // Only the A's counter changes.
  assert.deepEqual(G.letterPaths(P).map((d, i) => (i === 2 ? null : d)), G.letterPaths(SQUARE).map((d, i) => (i === 2 ? null : d)));
  // Off, as PER has it: as before.
  assert.ok(!G.PER[2].apex);
  assert.equal(G.letters({ ...SQUARE, per: perWith({ apex: 0 }) }), G.letters(SQUARE));
  // Every slope and slot: the point on the slot's centre line at the head's top, the two ends level with each other, on the
  // grid, each half a slot across and the cut's fall over half a slot down (to the grid), the counter cut at that slope
  // whatever the A's Cut switch says (the governing slope is the mark's).
  for (const drop of G.DROPS) for (const slot of [8, 20, 40, 60]) for (const cut of [0, 1]) {
    const p = { ...SQUARE, drop, stroke: slot, per: perWith({ apex: 1, cut }) }, b = G.block(p), x = b.c(5), s = slot / 2;
    const [r, l, t, ...rest] = ringOf(G.letterPaths(p)[2], 1), e = Math.round((drop * s) / 4) * 4, at = JSON.stringify({ drop, slot, cut });
    assert.deepEqual([r, t], [[x + s, b.ceil + e], [x - s, b.ceil + e]], at);
    assert.deepEqual(l, [x, b.ceil], at);
    assert.deepEqual([r, t, ...rest].flat().filter((n) => n % 4), [], at);
    assert.ok(Math.abs(e - drop * s) <= 2, at);
    assert.deepEqual([(r[1] - l[1]) / (r[0] - l[0]), (t[1] - l[1]) / (t[0] - l[0])], [e / s, -e / s], at);
  }
  // Rounded (the page's measures), its two ends round alike, its point sharp; lowered, it peaks as far down.
  const R = G.letterPaths({ ...PAGE, drop: 0.4, per: perWith({ apex: 1 }) })[2].split('M')[2];
  assert.equal([...R.matchAll(/A10 10 /g)].length, 2);
  assert.match(R, /L542 44L/);
  assert.match(G.letterPaths({ ...PAGE, drop: 0.4, lower: [0, 0, 40], per: perWith({ apex: 1 }) })[2], /L542 84L/);
  // The a's slot head peaks the same.
  assert.match(G.letterPaths({ ...SQUARE, a: 'a', per: perWith({ apex: 1 }) })[2], /M312 36L302 32L292 36L/);
});

test("the A's window: its crossbar a slot and a half or 6 in 100 of the height tall, about the crossbars' centre; tilted, both bars a slot thick across", () => {
  /** The A's counter floor and notch top at its slot's centre, and the H's upper slot floor and lower slot top at its own. */
  const bars = (p) => {
    const b = G.block(p), [, , A, , Hh] = G.letterPaths(p), x = b.c(5), s = b.s, mid = (a, c) => (a[1] + c[1]) / 2;
    const out = ringOf(A), ctr = ringOf(A, 1);
    const floor = mid(...ctr.filter(([X, Y]) => Y > b.ceil + 1 && Math.abs(Math.abs(X - x) - s) < 1e-9).slice(-2));
    const notch = mid(...out.filter(([X, Y]) => Y < b.H && Y > 0 && Math.abs(Math.abs(X - x) - s) < 1e-9));
    return { floor, notch, mid: b.mid, H: Hh };
  };
  // Slots of 40: 60 wanted, 64 on the grid's 8, about the middle (236); the H's crossbar a bar, as it was.
  const p40 = { ...SQUARE, stroke: 40, per: perWith({ apex: 1 }) };
  assert.deepEqual([bars(p40).floor, bars(p40).notch], [204, 268]);
  assert.equal(G.letterPaths(p40)[4], G.letterPaths({ ...SQUARE, stroke: 40 })[4]);
  // 720 tall, slots of 20: 6 in 100 of the height, 43.2, to 48, about 360; risen 48 at slots of 40, about the risen centre.
  const tall = bars({ ...SQUARE, height: 720, per: perWith({ apex: 1 }) });
  assert.deepEqual([tall.floor, tall.notch], [336, 384]);
  const risen = bars({ ...p40, rise: 48 });
  assert.deepEqual([risen.floor, risen.notch, risen.mid], [156, 220, 188]);
  // At the page's start (slots of 20, a bar 32 already over 30): the window is the bar, as it was.
  assert.deepEqual([bars({ ...SQUARE, per: perWith({ apex: 1 }) }).floor, bars({ ...SQUARE, per: perWith({ apex: 1 }) }).notch], [220, 252]);
  // Locked at 20 in 20, stems 32, slots 60, both tilted: the A's window 96 down at its slot's centre (90 wanted), the H's
  // bar 88 (60 across at slope 1: 84.9), each falling 30 across half its slot: at least a slot thick square to their fall.
  const p = { ...SQUARE, stem: 32, stroke: 60, drop: 1, lock: 1, per: perWith({ apex: 1, tilt: 1 }, { barStep: 1, tilt: 1 }) };
  const [, , A, , Hh] = G.letterPaths(p);
  assert.match(A, /L552 314L492 254L/); // its notch's top, about 284
  assert.match(A, /L492 158L552 218Z$/); // its counter's floor, about 188
  assert.match(Hh, /L860 162L920 222L/); // the H's upper slot's floor, about 192
  for (const [down, slope] of [[284 - 188, 1], [88, 1]]) assert.ok(down / Math.hypot(1, slope) >= 60, `${down}`);
  // Short, a high ceiling, wide slots, any slope: the window at least a bar, and never past what leaves the counter a
  // slot under its peak (its cut's round besides).
  for (const height of [240, 472]) for (const ceil of [16, 160]) for (const slot of [8, 20, 60]) for (const drop of G.DROPS) for (const rise of [0, 48]) {
    const q = { ...SQUARE, height, ceil, stroke: slot, drop, rise, per: perWith({ apex: 1 }) }, bq = G.block(q), w = bars(q);
    const e = Math.round((drop * slot) / 8) * 4, at = JSON.stringify({ height, ceil, slot, drop, rise });
    assert.ok(w.floor - (bq.ceil + e) >= slot && w.notch - w.floor >= 32, at);
    assert.equal((w.floor + w.notch) / 2, bq.mid, at);
  }
});

test("the H's bar step: its lower slot stands aside where the bar falls, a slot or 3 in 10 of a stem, at most half a stem; on the grid, at the one angle", () => {
  // Stems 72, slots 20: 21.6 to the grid, 24; the upper slot 900 to 920, the lower 924 to 944.
  const P = { ...SQUARE, stem: 72, per: perWith({}, { barStep: 1 }) };
  assert.equal(G.letterPaths(P)[4], 'M828 0L900 0L900 220L920 220L920 0L992 0L992 472L944 472L944 252L924 252L924 472L828 472Z');
  assert.deepEqual(G.letterPaths(P).slice(0, 4), G.letterPaths({ ...SQUARE, stem: 72 }).slice(0, 4)); // only the H changes
  assert.ok(!G.PER[4].barStep);
  /** The H's lower slot's left side less its upper slot's. */
  const step = (p) => { const [Hh] = G.letterPaths(p).slice(4), xs = ringOf(Hh).filter(([, y]) => y === G.block(p).H).map(([x]) => x).sort((a, b) => a - b); return xs[1] - ringOf(Hh)[1][0]; };
  for (const [stem, slot, want] of [[72, 20, 24], [200, 20, 60], [32, 20, 16], [72, 60, 36], [32, 8, 12]]) {
    const p = { ...SQUARE, stem, stroke: slot, per: perWith({}, { barStep: 1 }) };
    assert.equal(step(p), want, `${stem} ${slot}`); // a slot or 3 in 10 of a stem; at most half a stem (32: 16, 72 with slots of 60: 36)
    for (const q of polys(G.letterPaths(p)[4])) assert.deepEqual(q.flat().filter((n) => n % 4), [], `${stem} ${slot}`);
  }
  // Tilted at 8 in 20: every slanted side of the H at the slope, the lower slot's top on the bar's lower edge where it stands.
  const T = { ...P, drop: 0.4, lock: 1, per: perWith({}, { barStep: 1, tilt: 1 }) }, Hh = G.letterPaths(T)[4];
  assert.equal(Hh, 'M828 0L900 0L900 216L920 224L920 0L992 0L992 472L944 472L944 265.6L924 257.6L924 472L828 472Z');
  assert.deepEqual([...new Set(slopes(Hh).map((k) => +k.toFixed(9)))], [0.4]);
  // At the page's measures (Round 64 on stems of 72): its right foot 48 wide, its round passes it over the slot's foot as
  // an end does, keeping clear of the crossbar; in one tier or two, both sides or one; the outline never crosses itself.
  for (const corners of [0, 1]) for (const both of [0, 1]) {
    const p = { ...PAGE, corners, endRound: 200, per: perWith({}, { barStep: 1, both }) }, d = G.letterPaths(p)[4];
    assert.equal(crossingFlat(d, 2), null, `${corners} ${both}`);
    assert.ok(G.letterRadii(p, 4)[2] > 48, `${corners} ${both}`);
  }
});

test("the Letters table's Apex and Bar step: the A's and the H's, off at the start; on, the A and the H change in the wordmark, Down and the lockup", () => {
  const reset = () => { for (const k of C.KNOBS) (k.reset ? k.reset() : k.set(k.value)); };
  reset();
  const letters = C.KNOBS.find((k) => k.key === 'per');
  assert.deepEqual(['apex', 'barStep'].map((row) => [0, 1, 2, 3, 4].filter((i) => letters.has(row, i))), [[2], [4]]);
  assert.ok(!letters.on('apex', 2) && !letters.on('barStep', 4));
  const others = () => ['symbol', 's', 'sSquare', 'lockupSM'].map((fn) => C[fn]()).concat(C.favicon({ size: 32 }));
  const before = { word: C.wordmark(), down: C.down(), lockup: C.lockup(), others: others() };
  letters.set('apex', 2, 1);
  letters.set('barStep', 4, 1);
  assert.equal(C.down(), before.down); // Down has its own table
  const downs = C.KNOBS.find((k) => k.key === 'downPer');
  downs.set('apex', 2, 1);
  downs.set('barStep', 4, 1);
  const per = perWith({ apex: 1 }, { barStep: 1 }), p = { ...PAGE, per };
  assert.ok(C.wordmark().includes(G.letters(p)));
  assert.notEqual(G.letters(p), G.letters(PAGE));
  assert.deepEqual(G.letterPaths(p).slice(0, 2), G.letterPaths(PAGE).slice(0, 2));
  assert.ok(C.down().includes(G.down(p).d) && C.down() !== before.down);
  assert.ok(C.lockup().includes(G.letters(p)) && C.lockup() !== before.lockup);
  assert.deepEqual(others(), before.others); // the S M, the S alone and the favicons have no A or H
  // The a's slot head peaks too: the switch stays live.
  C.KNOBS.find((k) => k.key === 'a').set('a');
  assert.ok(letters.live('apex', 2));
  assert.ok(C.wordmarkLower().includes(G.letters({ ...p, a: 'a' })));
  reset();
  assert.deepEqual({ word: C.wordmark(), down: C.down(), lockup: C.lockup(), others: others() }, before);
});

test("the A's apex and the H's bar step at every extreme: every letter draws, the A and the H never cross themselves", () => {
  const per = perWith({ apex: 1, tilt: 1 }, { barStep: 1, tilt: 1 });
  for (const stem of [32, 200]) for (const slot of [8, 60]) for (const drop of [0.4, 1]) for (const lock of [0, 1]) for (const height of [240, 720]) for (const ceil of [16, 160]) for (const rise of [0, 48]) for (const corners of [0, 1]) {
    const p = { ...PAGE, stem, stroke: slot, drop, lock, tilt: 160, height, ceil, rise, corners, endRound: 200, innerRound: 64, cut: 20, lower: [0, 0, 200, 0, 0], per: per.map((q, i) => (i === 4 ? { ...q, both: corners } : q)) };
    const at = JSON.stringify({ stem, slot, drop, lock, height, ceil, rise, corners });
    for (const a of ['A', 'a']) {
      const L = G.letterPaths({ ...p, a });
      for (const i of [2, 4]) assert.equal(crossingFlat(L[i], 2), null, `${at} ${a} ${i}`);
    }
    for (const downFit of G.DOWN_FITS) assert.doesNotThrow(() => G.down({ ...p, downFit, downJoin: corners ? 'block' : 'tiles' }), at);
  }
});

test("the design loop's winners as presets: each sets the controls and draws every still, and back", () => {
  const plain = C.wordmark();
  const knob = Object.fromEntries(C.KNOBS.map((k) => [k.key, k]));
  const before = Object.fromEntries(C.KNOBS.map((k) => [k.key, k.value]));
  const restore = () => C.KNOBS.forEach((k) => { k.value = before[k.key]; if (k.reset) k.reset(); else if (k.key !== 'preset') k.set(k.value); });
  assert.equal(knob.preset.value, 'start');
  assert.ok(C.PRESETS.length >= 9);
  for (const [key, , set] of C.PRESETS) {
    C.applyPreset(set);
    for (const fn of ['wordmark', 'down', 'symbol', 's', 'lockup', 'lockupSM']) assert.match(C[fn](), /<path/, `${key} ${fn}`);
    for (const [k, v] of Object.entries(set)) if (knob[k] && !knob[k].rows && !knob[k].each) assert.equal(knob[k].value, v, `${key} ${k}`);
    if (set.height) assert.notEqual(C.wordmark(), plain, key);
    restore();
    assert.equal(C.wordmark(), plain, `${key}: back to the defaults`);
  }
});

test('a preset drawn for the best-of: as the preset sets the chapter, and the chapter left as it was', () => {
  const values = Object.fromEntries(C.KNOBS.map((k) => [k.key, k.value]));
  const reset = () => C.KNOBS.forEach((k) => { k.value = values[k.key]; if (k.reset) k.reset(); else if (k.key !== 'preset') k.set(k.value); });
  reset();
  const K = Object.fromEntries(C.KNOBS.map((k) => [k.key, k]));
  K.stem.set(100); K.per.set('bend', 1, 1); // the page's own settings, which the best-of must not touch
  const page = { word: C.wordmark(), down: C.down(), stem: K.stem.value };
  for (const [key, , set] of C.PRESETS) {
    const best = { word: C.drawWith(set, C.wordmark), down: C.drawWith(set, C.down) };
    assert.deepEqual({ word: C.wordmark(), down: C.down(), stem: K.stem.value }, page, `${key}: the page as it was`);
    reset(); C.applyPreset(set);
    assert.deepEqual({ word: C.wordmark(), down: C.down() }, best, `${key}: as the preset`);
    reset(); K.stem.set(100); K.per.set('bend', 1, 1);
  }
  reset();
});
