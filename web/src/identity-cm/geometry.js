// identity-cm (2026-10-22): CM.SUPPLY's round 4 wordmark (identity/references/cm-supply-2026-10-08/), drawn as
// code, with a capital A in their a's place (Jonas: "identical to the CM supply except with a capital A") and a
// bridge for the S and the H ("we want the bridge for the s and the H"). Measured off their tall wordmark
// (logo-tall-1880.png), in its pixels: the block 541 tall, stems 139 (the M's middle one 147), slots 36, 30 to 36
// between the letters. Every cut falls to the right at one slope (0.286, about 16°), its obtuse corner rounded
// 13, its acute one sharp; a closed slot's high corner is a bar (25) from the edge. The outer corners are
// rounded long, 30 across and 48 down, each letter its own (S all four, M its top right, A its top left as their
// a, H its bottom left). The S's middle is their diagonal: its upper opening on the right, its lower on the left,
// the two diagonal sides a bridge (36) apart; bridged, the slot is shut between them and the S is one piece
// with a spine, unbridged it runs through, as theirs. The A's crossbar and the H's are the same band, on the
// same centre (the middle, risen 13), slanted as the cuts or level.

/** Their tall wordmark's measures, and the switches: the defaults the page starts from. */
export const CM = {
  height: 541, // the block, tall
  stem: 139, mid: 147, slot: 36, space: 32, // across: the stems, the M's middle stem, the slots, between letters
  even: 0, kern: [-2, 4, -2, -1], // their spacing, not even: each gap space + kern (30, 36, 30, 31), the wider by their a
  bar: 25, slope: 0.286, round: 13, // a closed slot's end: its high corner a bar in, the cut's slope, its obtuse corner's round
  outerX: 30, outerY: 48, tension: 0.5, // the outer corners: how far round across and down, how tight (0.55 near an ellipse)
  bridge: 36, rise: 13, sLevel: 0, // the S's diagonal band and the crossbars: how thick, how far above the middle; the S's level
  upper: 31, lower: 36, // the S's openings at the slot, tall: the upper (right) and the lower (left)
  sBridge: 1, hBridge: 1, level: 0, // the S bridged, the H bridged, the A's and the H's crossbars level (not slanted)
  aTop: 'round', aRound: 7, // the A's counter's top: as their a's (flat, rounded aRound), or 'cut' as the S's
  corners: [[1, 1, 1, 1], [0, 1, 0, 0], [1, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 1]], // each letter's tl tr br bl
  symbol: 220, // the S M and the S alone: how tall, chopped (their slide 03)
};

export const LETTERS = ['S', 'M', 'A', 'S', 'H'];

const f = (n) => String(+n.toFixed(2));
const P = (x, y) => `${f(x)} ${f(y)}`;

/** The arc rounding corner c (from prev, on to next) by r: where it leaves each side, and its sweep. */
function fillet(prev, c, next, r) {
  const unit = (p) => { const dx = p[0] - c[0], dy = p[1] - c[1], l = Math.hypot(dx, dy); return [dx / l, dy / l]; };
  const u = unit(prev), v = unit(next);
  const room = Math.min(Math.hypot(prev[0] - c[0], prev[1] - c[1]), Math.hypot(next[0] - c[0], next[1] - c[1]));
  const half = Math.acos(Math.max(-1, Math.min(1, u[0] * v[0] + u[1] * v[1]))) / 2;
  const t = Math.min(r / Math.tan(half), room); // a round longer than a side is cut to it
  const turn = (c[0] - prev[0]) * (next[1] - c[1]) - (c[1] - prev[1]) * (next[0] - c[0]);
  return { from: [c[0] + u[0] * t, c[1] + u[1] * t], to: [c[0] + v[0] * t, c[1] + v[1] * t], r: t * Math.tan(half), sweep: turn > 0 ? 1 : 0 };
}

/**
 * A closed outline as path data, from its corners: [x, y] a sharp corner, [x, y, r] rounded by a circle's arc
 * (a cut's obtuse corner), or [x, y, 'o', rx, ry, k] an outer corner rounded rx along a side across and ry along
 * a side down, by a curve whose handles reach k of the way into the corner. The first is a sharp corner.
 */
export function outline(pts) {
  const at = (i) => pts[(i + pts.length) % pts.length];
  return pts.map((p, i) => {
    if (p[2] == null || p[2] === 0) return `L${P(p[0], p[1])}`;
    const prev = at(i - 1), next = at(i + 1);
    if (p[2] !== 'o') {
      const { from, to, r, sweep } = fillet(prev, p, next, p[2]);
      return r > 0.01 ? `L${P(...from)}A${f(r)} ${f(r)} 0 0 ${sweep} ${P(...to)}` : `L${P(p[0], p[1])}`;
    }
    const [, , , rx, ry, k] = p;
    const along = (q) => { // the point on the side toward q, rx or ry in, as the side runs across or down
      const dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1;
      const d = Math.min(Math.abs(dx) > Math.abs(dy) ? rx : ry, l / 2);
      return [p[0] + (dx / l) * d, p[1] + (dy / l) * d];
    };
    const a = along(prev), b = along(next), into = (q) => [q[0] + (p[0] - q[0]) * k, q[1] + (p[1] - q[1]) * k];
    return `L${P(...a)}C${P(...into(a))} ${P(...into(b))} ${P(...b)}`;
  }).join('').replace(/^L/, 'M') + 'Z';
}

/** Letter i's measures at block height h: the S's openings shrink with the block, as their S M's do. */
function measures(p, h) {
  const k = p.slope, scale = h / p.height;
  return {
    k, h, kb: p.level ? 0 : k, mid: h / 2 - p.rise * scale,
    upper: p.upper * scale, lower: p.lower * scale,
    topLow: p.bar + k * p.slot, botHigh: h - p.bar - k * p.slot, // a closed top end's low corner, a bottom end's high one
  };
}

/** An outer corner at (x, y), rounded or square as its switch. */
const outer = (p, on, x, y) => (on ? [x, y, 'o', p.outerX, p.outerY, p.tension] : [x, y]);

/** The S at x0: its slot from a to b; its middle a band between lines A and B (the slope, through the slot's centre). */
function S(p, x0, m, c4) {
  const { h, mid, topLow, botHigh } = m, r = p.round, k = p.sLevel ? 0 : m.k;
  const a = x0 + p.stem, b = a + p.slot, x1 = b + p.stem, c = a + p.slot / 2;
  const A = (x) => mid - p.bridge / 2 + k * (x - c), B = (x) => mid + p.bridge / 2 + k * (x - c);
  const yT = A(b) - m.upper, yB = B(a) + m.lower; // the upper opening's top, the lower one's bottom
  const [tl, tr, br, bl] = c4.map((on, i) => outer(p, on, i % 3 ? x1 : x0, i < 2 ? 0 : h));
  if (p.sBridge) {
    return outline([tl, tr, [x1, yT], [b, yT], [b, topLow, r], [a, p.bar], [a, A(a), r], [x1, A(x1)], br, bl,
      [x0, yB], [a, yB], [a, botHigh, r], [b, h - p.bar], [b, B(b), r], [x0, B(x0)]]);
  }
  return outline([tl, tr, [x1, yT], [b, yT], [b, topLow, r], [a, p.bar], [a, B(a)], [x0, B(x0)]])
    + outline([[b, A(b)], [x1, A(x1)], br, bl, [x0, yB], [a, yB], [a, botHigh, r], [b, h - p.bar]]);
}

/** The M at x0: two slots, open through the base, their tops cut. */
function M(p, x0, m, c4) {
  const { h, topLow } = m, r = p.round;
  const a1 = x0 + p.stem, b1 = a1 + p.slot, a2 = b1 + p.mid, b2 = a2 + p.slot, x1 = b2 + p.stem;
  const [tl, tr, br, bl] = c4.map((on, i) => outer(p, on, i % 3 ? x1 : x0, i < 2 ? 0 : h));
  return outline([tl, tr, br, [b2, h], [b2, topLow, r], [a2, p.bar], [a2, h], [b1, h], [b1, topLow, r], [a1, p.bar], [a1, h], bl]);
}

/** The crossbar's two sides through a slot from a to b (the A's, the H's): the S's band, slanted or level. */
const bars = (p, m, a) => {
  const c = a + p.slot / 2;
  return [(x) => m.mid - p.bridge / 2 + m.kb * (x - c), (x) => m.mid + p.bridge / 2 + m.kb * (x - c)];
};

/** The capital A at x0: the counter closed, its top as their a's (or cut), the leg open through the base. */
function Acap(p, x0, m, c4) {
  const { h, kb, topLow } = m, r = p.round;
  const a = x0 + p.stem, b = a + p.slot, x1 = b + p.stem, [top, bot] = bars(p, m, a);
  const [tl, tr, br, bl] = c4.map((on, i) => outer(p, on, i % 3 ? x1 : x0, i < 2 ? 0 : h));
  const ends = kb ? [r, 0] : [p.aRound, p.aRound]; // a cut's obtuse corner rounded; level, both as the a's top
  const head = p.aTop === 'cut' ? [[a, p.bar], [b, topLow, r]] : [[a, p.bar, p.aRound], [b, p.bar, p.aRound]];
  return outline([tl, tr, br, [b, h], [b, bot(b), ends[0]], [a, bot(a), ends[1]], [a, h], bl])
    + outline([...head, [b, top(b), ends[1]], [a, top(a), ends[0]]]);
}

/** The H at x0: two stems, and the crossbar between them when bridged. */
function Hh(p, x0, m, c4) {
  const { h, kb } = m, r = p.round;
  const a = x0 + p.stem, b = a + p.slot, x1 = b + p.stem, [top, bot] = bars(p, m, a);
  const [tl, tr, br, bl] = c4.map((on, i) => outer(p, on, i % 3 ? x1 : x0, i < 2 ? 0 : h));
  const ends = kb ? [r, 0] : [p.aRound, p.aRound];
  if (!p.hBridge) return outline([tl, [a, 0], [a, h], bl]) + outline([[b, 0], tr, br, [b, h]]);
  return outline([tl, [a, 0], [a, top(a), ends[0]], [b, top(b), ends[1]], [b, 0], tr, br, [b, h],
    [b, bot(b), ends[0]], [a, bot(a), ends[1]], [a, h], bl]);
}

const DRAW = { S, M, A: Acap, H: Hh };
/** A letter's width. */
export const widthOf = (p, l) => (l === 'M' ? 2 * p.stem + p.mid + 2 * p.slot : 2 * p.stem + p.slot);

/**
 * The least block height at which the S still holds together: its slots' ends above and below its openings by
 * a round, and the A's counter and leg at least a round long. Their S M is close to it (about 220).
 */
export function least(p) {
  const ok = (h) => {
    const m = measures(p, h), c = p.slot / 2;
    const yT = m.mid - p.bridge / 2 + m.k * c - m.upper, yB = m.mid + p.bridge / 2 - m.k * c + m.lower;
    const top = m.mid - p.bridge / 2 - m.kb * c, bot = m.mid + p.bridge / 2 + m.kb * c;
    return yT >= m.topLow + p.round && yB <= m.botHigh - p.round && top >= m.topLow + p.round && bot <= h - p.round;
  };
  let h = Math.ceil(p.bar * 2 + p.bridge);
  while (!ok(h) && h < 4000) h += 1;
  return h;
}

/**
 * Letters set in a row at block height h (no lower than least): { w, h, d }. letters is a word of S M A H
 * (SMASH, SM, S); corners are each letter's, by its place in SMASH unless given.
 */
export function row(p, h = p.height, letters = 'SMASH', corners = p.corners) {
  h = Math.max(h, least(p));
  const m = measures(p, h);
  let x = 0, d = '';
  [...letters].forEach((l, i) => {
    d += DRAW[l](p, x, m, corners[i]);
    x += widthOf(p, l) + p.space + (p.even || letters !== 'SMASH' ? 0 : p.kern[i] ?? 0); // (no kern after the H)
  });
  return { w: x - p.space, h, d };
}

export const wordmark = (p, h) => row(p, h);
/** The S M, chopped: the S as SMASH's first, the M its right corners both rounded, ending the symbol. */
export const symbol = (p, h = p.symbol) => row(p, h, 'SM', [p.corners[0], [p.corners[1][0], 1, 1, p.corners[1][3]]]);
/** The S alone, chopped, every corner rounded. */
export const sAlone = (p, h = p.symbol) => row(p, h, 'S', [[1, 1, 1, 1]]);

/** A mark as an SVG: in fill, on a ground if one is given, m of clear space round it. */
export function svgOf({ w, h, d }, { fill = '#000', ground = null, m = 0 } = {}) {
  const W = f(w + 2 * m), H = f(h + 2 * m);
  const bg = ground ? `<rect id="ground" width="${W}" height="${H}" fill="${ground}"/>` : '';
  const at = m ? ` transform="translate(${f(m)} ${f(m)})"` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="SMASH">${bg}<path fill="${fill}" fill-rule="evenodd"${at} d="${d}"/></svg>`;
}
