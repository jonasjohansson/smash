// Settled (2026-10-13): the original mark, its capital A the one letter that
// gives (Jonas: "capital A for sure"). The S, M, S and H the original's, on
// the grid of 4, nothing on the diagonal; the A's rounds from the system's
// own measures; its foot settled exactly as far as the slider says.
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.location = { search: '' };
const G = await import('../src/identity/directions/settled/geometry.js');
const O = await import('../src/identity/directions/original/geometry.js');
const C = await import('../src/identity/directions/settled.js');

/** Every combination of the controls. */
const ALL = G.BACKS.flatMap((back) => G.HEELS.flatMap((heel) => G.DIPS.map((dip) => ({ back, heel, dip }))));
const SETTLED_8 = { back: 'round', heel: 'round', dip: 8 };

/** Path data (M, L, A, Z, absolute) as subpaths of segments: { from, to, arc: { r, large, sweep } | null }; no other curve. */
function segments(d) {
  const subs = [];
  let cur, start, sub;
  for (const [, cmd, args] of d.matchAll(/([MLAZC])([^MLAZC]*)/g)) {
    const n = args.trim() ? args.trim().split(/[\s,]+/).map(Number) : [];
    if (cmd === 'C') throw new Error('a curve that is not a circle');
    if (cmd === 'M') { cur = start = [n[0], n[1]]; sub = []; subs.push(sub); continue; }
    if (cmd === 'Z') {
      if (cur[0] !== start[0] || cur[1] !== start[1]) sub.push({ from: cur, to: start, arc: null });
      sub.closed = true;
      cur = start;
      continue;
    }
    const to = n.slice(-2);
    sub.push({ from: cur, to, arc: cmd === 'A' ? { r: n[0], large: n[3], sweep: n[4] } : null });
    cur = to;
  }
  return subs;
}
const straights = (d) => segments(d).flat().filter((s) => !s.arc);
/** Every arc, with its radius, its centre and its chord. */
const arcs = (d) => segments(d).flat().filter((s) => s.arc).map((s) => {
  const [cx, cy] = O.arcCentre(s.from, s.to, s.arc.r, s.arc.large, s.arc.sweep);
  return { ...s, r: s.arc.r, c: [+cx.toFixed(2), +cy.toFixed(2)], chord: Math.hypot(s.to[0] - s.from[0], s.to[1] - s.from[1]) };
});
/** The lowest point a path reaches (y grows down): its ends, and the bottom of any circle an arc sweeps through. */
function lowest(d) {
  let low = -Infinity;
  for (const s of segments(d).flat()) low = Math.max(low, s.from[1], s.to[1]);
  for (const a of arcs(d)) {
    const ang = ([x, y]) => Math.atan2(y - a.c[1], x - a.c[0]);
    let a0 = ang(a.from), a1 = ang(a.to);
    if (!a.arc.sweep) [a0, a1] = [a1, a0]; // sweep 1 turns with the angle
    while (a1 < a0) a1 += 2 * Math.PI;
    for (let b = Math.PI / 2; b < a0 + 4 * Math.PI; b += 2 * Math.PI) if (b > a0 + 1e-9 && b < a1 - 1e-9) low = Math.max(low, a.c[1] + a.r);
  }
  return low;
}
/** A path's segments as a sorted list of strings, moved by (dx, dy), or turned 180 degrees in a box w × h. */
const segSet = (d, { dx = 0, dy = 0, w = 0, h = 0 } = {}) => segments(d).flat().map(({ from, to, arc }) => {
  const t = ([x, y]) => (w ? [w - x, h - y] : [x + dx, y + dy]);
  return `${t(from)}>${t(to)}${arc ? `:${arc.r},${arc.large},${arc.sweep}` : ''}`;
}).sort();

test("the defaults draw the original's A, and the original's mark, to the character", () => {
  assert.deepEqual(C.START, { back: 'square', heel: 'square', dip: 0 });
  assert.equal(G.letterA(), O.letterPaths()[2]);
  assert.equal(G.letters(), O.letters());
  assert.equal(C.wordmark(), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 552 472" ><path fill="currentColor" fill-rule="evenodd" d="${O.letters()}"/></svg>`);
});

test("every combination of the controls draws, and the S, M, S and H stay the original's", () => {
  assert.equal(ALL.length, 24);
  const orig = O.letterPaths();
  for (const p of ALL) {
    const L = G.letterPathsOf(p);
    for (const i of [0, 1, 3, 4]) assert.equal(L[i], orig[i], `${JSON.stringify(p)}, letter ${i}`);
    assert.doesNotThrow(() => G.down(p));
  }
  assert.throws(() => G.letterA({ dip: 6 }), /off the grid/);
  assert.throws(() => G.letterA({ dip: 24 }), /past a slot/);
  assert.throws(() => G.letterA({ back: 'bevel' }), /no back/);
  assert.throws(() => G.letterA({ heel: 'bevel' }), /no heel/);
});

test("the two S's are identical, and each is itself turned 180 degrees", () => {
  const [S1, , , S2] = G.letterPathsOf(SETTLED_8);
  const [a, b] = G.spans()[3];
  assert.deepEqual(segSet(S2), segSet(S1, { dx: a }));
  assert.deepEqual(segSet(S1, { w: 84, h: 472 }), segSet(S1));
  assert.deepEqual(segSet(S2, { w: a + b, h: 472 }), segSet(S2));
});

test('every straight edge runs across or down, on a line of the grid of 4; nothing on the diagonal', () => {
  for (const p of ALL) {
    for (const { from: [x1, y1], to: [x2, y2] } of straights(G.letters(p))) {
      assert.ok(x1 === x2 || y1 === y2, `a diagonal, ${x1} ${y1} to ${x2} ${y2}, at ${JSON.stringify(p)}`);
      assert.equal((x1 === x2 ? x1 : y1) % 4, 0, `off the grid: ${x1} ${y1} to ${x2} ${y2}, at ${JSON.stringify(p)}`);
    }
  }
});

test("arcs only at the slot caps (r10, half circles), the S bends (r20, quarters) and the A's own rounds", () => {
  for (const p of ALL) {
    const L = G.letterPathsOf(p);
    L.forEach((d, i) => {
      for (const a of arcs(d)) {
        if (a.r === 10) {
          assert.ok(Math.abs(a.chord - 20) < 1e-9, 'a cap is a half circle');
          assert.ok([42, 430].includes(a.c[1]), `a cap's centre ${a.c} 42 from the top or the bottom`);
        } else if (a.r === 20) {
          assert.ok(i === 0 || i === 3, 'a bend only in an S');
          assert.ok(Math.abs(a.chord - 20 * Math.SQRT2) < 1e-9, 'a bend is a quarter');
        } else if (a.r === 42) {
          assert.ok(i === 2 && p.back === 'round');
          assert.ok(Math.abs(a.chord - 42 * Math.SQRT2) < 1e-9, 'the back is a quarter');
          assert.deepEqual(a.c, [302, 42], "the back is concentric with the counter's top cap");
        } else if (a.r === 32) {
          assert.ok(i === 2 && p.heel === 'round');
          assert.ok(Math.abs(a.chord - 32 * Math.SQRT2) < 1e-9, 'the heel is a quarter');
          assert.deepEqual(a.c, [292, 440 + p.dip], 'the heel turns one stem round, across the foot');
        } else assert.fail(`an arc of radius ${a.r} in letter ${i}`);
      }
    });
    assert.equal(arcs(L[2]).filter((a) => a.r !== 10).length, (p.back === 'round') + (p.heel === 'round'), "the A's own rounds, as the switches say");
  }
});

test('the dip is measured exactly: the lowest point is 472 + dip, the right leg on the line, a step where the foot meets the notch', () => {
  for (const p of ALL) {
    assert.equal(lowest(G.letters(p)), 472 + p.dip, JSON.stringify(p));
    assert.equal(G.depth(p), p.dip);
    const A = straights(G.letterA(p));
    // The right leg's foot, from the A's right edge to the notch, on the line.
    assert.ok(A.some(({ from, to }) => from[0] === 344 && to[0] === 312 && from[1] === 472 && to[1] === 472));
    // The notch: square, its right wall up from the line, its left wall down to the foot's floor.
    assert.ok(A.some(({ from, to }) => from[0] === 312 && to[0] === 312 && from[1] === 472 && to[1] === 252));
    assert.ok(A.some(({ from, to }) => from[0] === 292 && to[0] === 292 && from[1] === 252 && to[1] === 472 + p.dip));
  }
  assert.equal(lowest(O.letters()), 472); // the caps' arcs (bottom at 440) never reach the line
});

test("the A's counter is closed, with a stem of ink round it", () => {
  for (const p of ALL) {
    const subs = segments(G.letterA(p));
    assert.equal(subs.length, 2);
    const [outer, counter] = subs;
    assert.ok(outer.closed && counter.closed);
    const box = (s) => s.flatMap(({ from, to }) => [from, to]).reduce(([a, b, c, d], [x, y]) => [Math.min(a, x), Math.min(b, y), Math.max(c, x), Math.max(d, y)], [Infinity, Infinity, -Infinity, -Infinity]);
    const [ox0, oy0, ox1] = box(outer), [cx0, cy0, cx1, cy1] = box(counter);
    assert.deepEqual([cx0, cy0, cx1, cy1], [292, 42, 312, 220]); // a slot wide, from its cap down to the crossbar
    assert.deepEqual([cx0 - ox0, ox1 - cx1, oy0], [32, 32, 0]); // a stem either side, the top at 0
    // Round, the back is a stem from the cap's circle all the way round: r42 about the cap's centre, r10.
    const cap = arcs(G.letterA(p)).find((a) => a.r === 10), back = arcs(G.letterA(p)).find((a) => a.r === 42);
    if (back) {
      assert.deepEqual(back.c, cap.c);
      assert.equal(back.r - cap.r, 32);
    }
  }
});

test("Down: the five letters a slot apart, each the original's, a slot and the dip under the A", () => {
  for (const p of ALL) {
    const D = G.down(p), L = G.letterPathsOf(p), sp = G.spans();
    assert.equal(D.w, 136);
    assert.deepEqual(D.lefts, [26, 0, 26, 26, 26]);
    assert.deepEqual(D.tops, [0, 492, 984, 1476 + p.dip, 1968 + p.dip]);
    assert.equal(D.h, 5 * 472 + 4 * 20 + p.dip);
    // Each letter as in the wordmark, moved to its place.
    assert.deepEqual(segSet(D.d), L.flatMap((d, i) => segSet(d, { dx: D.lefts[i] - sp[i][0], dy: D.tops[i] })).sort());
    // The A's lowest point a slot above the S under it.
    assert.equal(D.tops[3] - (D.tops[2] + lowest(L[2])), 20);
  }
});

test('the chapter: every still as plain vector, round or in pixels; the controls set the wordmark, and back', () => {
  for (const fn of ['wordmark', 'wordmarkOriginal', 'wordmarkBack', 'wordmarkSettled', 'symbol', 'lockup', 'down']) {
    for (const pixel of [0, 4, 10]) {
      const out = C[fn]({ pixel });
      assert.match(out, /^<svg [^>]*viewBox="0 0 [\d.]+ [\d.]+"/, fn);
      assert.doesNotMatch(out, /<text|style=|filter|mask|transform/, fn);
    }
  }
  for (const n of [16, 32, 64]) assert.match(C.favicon({ size: n }), new RegExp(`viewBox="0 0 ${n} ${n}"`));
  assert.deepEqual([C.info.slug, C.info.n], ['settled', 3]);
  assert.deepEqual(C.KNOBS.map((k) => k.key), ['back', 'heel', 'dip']);
  const k = Object.fromEntries(C.KNOBS.map((q) => [q.key, q]));
  const at0 = C.wordmark();
  k.back.set('round'); k.heel.set('round'); k.dip.set('8');
  assert.equal(C.wordmark(), C.wordmarkSettled());
  assert.match(C.wordmark(), /viewBox="0 0 552 480"/);
  assert.match(C.lockup(), /viewBox="0 0 [\d.]+ 480"/);
  assert.match(C.down(), /viewBox="0 0 136 2448"/);
  for (const q of C.KNOBS) q.set(q.value);
  assert.equal(C.wordmark(), at0);
});
