// identity-cm (2026-10-22): CM.SUPPLY's round 4 wordmark (identity/references/cm-supply-2026-10-08/), drawn as
// code, with a capital A in their a's place (Jonas: "identical to the CM supply except with a capital A") and a
// bridge for the S and the H ("we want the bridge for the s and the H"). Measured off their tall wordmark
// (logo-tall-1880.png), in its pixels: the block 541 tall, stems 139 (the M's middle one 147), slots 36, 30 to 36
// between the letters. Every cut falls to the right at one slope (0.286, about 16°), its obtuse corner rounded
// 13, its acute one sharp; a closed slot's high corner is a bar (25) from the edge. The outer corners are
// rounded long, 30 across and 48 down, each letter its own (S all four, M its top right, A its top left as their
// a, H its bottom left). The S's middle is their diagonal: its upper opening on the right, its lower on the left,
// the two diagonal sides a bridge (36) apart; bridged, the slot is shut between them and the S is one piece
// with a spine, unbridged it runs through, as their tall one. Their a is here too (p.a), its bowl one curve.
//
// Chopped (Jonas: "the part of the S is removed top and bottom", "and then that chop goes across the S and M"):
// a lower block is the tall one with two strips taken out across every letter, one just above the S's middle
// and one just below it, so nothing is scaled: the bars, the cuts, the corners and the middle stay as they are,
// the slots and the openings grow shorter. Their short wordmark (a screenshot of their Figma, 217 tall) is the
// tall one chopped so, 162 out above the middle and 162 below, the openings kept 15 and 19 at the slot. A
// taller block puts the strips back in, in the slots' straight runs above and below the openings.

/** Their tall wordmark's measures, and the switches: the defaults the page starts from. */
export const CM = {
  height: 541, // the block, tall; the wordmark is drawn at it and chopped (or drawn out) to any other
  stem: 139, mid: 147, slot: 36, space: 32, // across: the stems, the M's middle stem, the slots, between letters
  even: 0, kern: [-2, 4, -2, -1], // their spacing, not even: each gap space + kern (30, 36, 30, 31), the wider by their a
  bar: 25, slope: 0.286, round: 13, // a closed slot's end: its high corner a bar in, the cut's slope, its obtuse corner's round
  outerX: 30, outerY: 48, tension: 0.5, // the outer corners: how far round across and down, how tight (0.55 near an ellipse)
  bridge: 36, rise: 13, sLevel: 0, // the S's diagonal band and the crossbars: how thick, how far above the middle; the S's level
  upper: 31, lower: 36, // the S's openings at the slot, tall: the upper (right) and the lower (left)
  keepUpper: 15, keepLower: 19, // chopped, how much of each opening stays at the slot (their short one's)
  chop: 217, // the page's live chopped wordmark: how tall (their short one's)
  sBridge: 1, hBridge: 1, level: 0, // the S bridged, the H bridged, the A's and the H's band crossbars level (not slanted)
  hStyle: 'cut', hBase: 113, hGrow: 0.13, // the H's crossbar: theirs ('cut': level on top, a slot under it cut as the
  // M's), its top hBase above the base at 217 and hGrow more for each unit taller (their 217 and their 346, both
  // to the pixel); or 'band', the S's
  a: 'A', // the capital A, or 'a', theirs
  aTop: 'round', aRound: 7, // the A's counter's top: as their a's (flat, rounded aRound), or 'cut' as the S's
  aNotch: 19, aSwoop: 94, aCounter: 44, // their a: its bowl meeting the stem this far up, its swoop's pull down, its counter's low corner
  corners: [[1, 1, 1, 1], [0, 1, 0, 0], [1, 1, 0, 0], [1, 1, 1, 1], [0, 0, 0, 1]], // each letter's tl tr br bl (the A both top ones, Jonas)
  symbol: 217, // the S M and the S alone: how tall, chopped (their slide 03; their short wordmark's block)
};

export const LETTERS = ['S', 'M', 'A', 'S', 'H'];

const f = (n) => String(+n.toFixed(2));
const P = (x, y) => `${f(x)} ${f(y)}`;
const end = (p) => (p[0] === 'C' ? p.slice(5, 7) : p.slice(0, 2));

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
 * (a cut's obtuse corner), [x, y, 'o', rx, ry, k] an outer corner rounded rx along a side across and ry along
 * a side down, by a curve whose handles reach k of the way into the corner, or ['C', x1, y1, x2, y2, x, y] a
 * curve to (x, y) (its neighbours sharp corners). The first is a sharp corner.
 */
export function outline(pts) {
  const at = (i) => end(pts[(i + pts.length) % pts.length]);
  return pts.map((p, i) => {
    if (p[0] === 'C') return `C${P(p[1], p[2])} ${P(p[3], p[4])} ${P(p[5], p[6])}`;
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

/**
 * The S's middle and where a chop may cut, in the tall block: the band's lines A (its top) and B (its bottom)
 * through the S's slot, relative to its centre; the middle's highest and lowest points (the S's diagonals, the
 * crossbars); and the strips' edges, zTop and zBot (each opening kept keepUpper and keepLower at the slot).
 */
function middle(p) {
  const H = p.height, mid = H / 2 - p.rise, k = p.slope, ks = p.sLevel ? 0 : k, kb = p.level ? 0 : k;
  const s = p.slot / 2, w = p.stem + s; // from the slot's centre to its side, and to the S's
  const top = Math.min(mid - p.bridge / 2 - ks * w, mid - p.bridge / 2 - kb * s); // B at the S's left, or a crossbar's top
  const bot = Math.max(mid + p.bridge / 2 + ks * w, mid + p.bridge / 2 + kb * s);
  const A = mid - p.bridge / 2 + ks * s, B = mid + p.bridge / 2 - ks * s; // A at the slot's right side, B at its left
  return {
    H, mid, k, ks, kb,
    zTop: Math.min(A - p.keepUpper, mid + p.bridge / 2 - ks * w), // never into the S's lower diagonal
    zBot: Math.max(B + p.keepLower, mid - p.bridge / 2 + ks * w),
    yT: A - p.upper, yB: B + p.lower, top, bot,
    topLow: p.bar + k * p.slot, botHigh: H - p.bar - k * p.slot, // a closed top end's low corner, a bottom end's high one
  };
}

/** How far each strip may go: the top one down to a round under the slots' top ends, the bottom one up to the bottom ends. */
function room(p, m) {
  const topEnd = Math.max(m.topLow, p.bar + p.aRound) + p.round + 1;
  const botEnd = Math.min(m.botHigh, p.a === 'a' ? m.H - p.aCounter - p.slope * p.slot : m.H) - p.round - 1;
  return [Math.max(0, m.zTop - topEnd), Math.max(0, botEnd - m.zBot)];
}

/**
 * The block's vertical map for height h: y in the tall block to y in this one (Y), and the middle's (Ym, its
 * strips' shift). Lower: the strips [zTop - d1, zTop] and [zBot, zBot + d2] taken out, what was in them closed
 * up to their edges. Taller: the strips put in, above the upper opening and below the lower.
 */
function mapOf(p, m, h) {
  const d = m.H - h;
  if (d <= 0) {
    const e1 = -d / 2, e2 = -d - e1, i1 = m.yT - 1, i2 = m.yB + 1;
    return { Y: (y) => (y <= i1 ? y : y <= i2 ? y + e1 : y + e1 + e2), Ym: (y) => y + e1, h };
  }
  const { d1, d2 } = cutOf(p, m, d), s1 = m.zTop - d1;
  return {
    Y: (y) => (y <= s1 ? y : y <= m.zTop ? s1 : y <= m.zBot ? y - d1 : y <= m.zBot + d2 ? m.zBot - d1 : y - d1 - d2),
    Ym: (y) => y - d1,
    h: +(m.H - d1 - d2).toFixed(6),
  };
}

/** How much each strip takes for a chop of d in all: half each, the rest to the other where one runs out of room. */
function cutOf(p, m, d) {
  const [r1, r2] = room(p, m);
  let d1 = Math.min(d / 2, r1);
  const d2 = Math.min(d - d1, r2);
  d1 = Math.min(d - d2, r1);
  return { d1, d2 };
}

/** The two strips a chop to h takes out of the tall block, [y0, y1] each, top then bottom; none when h is the tall one's or more. */
export function strips(p, h) {
  const m = middle(p), d = m.H - Math.max(h, least(p));
  if (d <= 0) return [];
  const { d1, d2 } = cutOf(p, m, d);
  return [[m.zTop - d1, m.zTop], [m.zBot, m.zBot + d2]].filter(([a, b]) => b - a > 0.01);
}

/** The least block height: the tall one chopped as far as it goes. */
export function least(p) {
  const m = middle(p), [r1, r2] = room(p, m);
  return Math.ceil(m.H - r1 - r2);
}

/** An outer corner at (x, y), rounded or square as its switch. */
const outer = (p, on, x, y) => (on ? [x, y, 'o', p.outerX, p.outerY, p.tension] : [x, y]);
/** A letter's four outer corners, tl tr br bl, from x0 to x1, the block mapped. */
const box = (p, c4, x0, x1, g) => c4.map((on, i) => outer(p, on, i % 3 ? x1 : x0, i < 2 ? 0 : g.Y(g.H)));

/** The S at x0: its slot from a to b; its middle a band between lines A and B (the slope, through the slot's centre). */
function S(p, x0, g, c4) {
  const { Y, Ym, H } = g, r = p.round, k = g.ks;
  const a = x0 + p.stem, b = a + p.slot, x1 = b + p.stem, c = a + p.slot / 2;
  const A = (x) => Ym(g.mid - p.bridge / 2 + k * (x - c)), B = (x) => Ym(g.mid + p.bridge / 2 + k * (x - c));
  const yT = Y(g.yT), yB = Y(g.yB), topLow = Y(g.topLow), bar = Y(p.bar), botHigh = Y(g.botHigh), low = Y(H - p.bar);
  const [tl, tr, br, bl] = box(p, c4, x0, x1, g);
  if (p.sBridge) {
    return outline([tl, tr, [x1, yT], [b, yT], [b, topLow, r], [a, bar], [a, A(a), r], [x1, A(x1)], br, bl,
      [x0, yB], [a, yB], [a, botHigh, r], [b, low], [b, B(b), r], [x0, B(x0)]]);
  }
  return outline([tl, tr, [x1, yT], [b, yT], [b, topLow, r], [a, bar], [a, B(a)], [x0, B(x0)]])
    + outline([[b, A(b)], [x1, A(x1)], br, bl, [x0, yB], [a, yB], [a, botHigh, r], [b, low]]);
}

/** The M at x0: two slots, open through the base, their tops cut. */
function M(p, x0, g, c4) {
  const { Y } = g, r = p.round, h = Y(g.H), topLow = Y(g.topLow), bar = Y(p.bar);
  const a1 = x0 + p.stem, b1 = a1 + p.slot, a2 = b1 + p.mid, b2 = a2 + p.slot, x1 = b2 + p.stem;
  const [tl, tr, br, bl] = box(p, c4, x0, x1, g);
  return outline([tl, tr, br, [b2, h], [b2, topLow, r], [a2, bar], [a2, h], [b1, h], [b1, topLow, r], [a1, bar], [a1, h], bl]);
}

/** A band crossbar's two sides through a slot from a (the A's, the H's): the S's band, slanted or level. */
const bars = (p, g, a) => {
  const c = a + p.slot / 2;
  return [(x) => g.Ym(g.mid - p.bridge / 2 + g.kb * (x - c)), (x) => g.Ym(g.mid + p.bridge / 2 + g.kb * (x - c))];
};
/** The counter's top: as their a's (flat, rounded), or cut as the S's. */
const head = (p, g, a, b) => (p.aTop === 'cut' ? [[a, g.Y(p.bar)], [b, g.Y(g.topLow), p.round]] : [[a, g.Y(p.bar), p.aRound], [b, g.Y(p.bar), p.aRound]]);

/** The capital A at x0: the counter closed, its top as their a's (or cut), the leg open through the base. */
function Acap(p, x0, g, c4) {
  const r = p.round, h = g.Y(g.H);
  const a = x0 + p.stem, b = a + p.slot, x1 = b + p.stem, [top, bot] = bars(p, g, a);
  const [tl, tr, br, bl] = box(p, c4, x0, x1, g);
  const ends = g.kb ? [r, 0] : [p.aRound, p.aRound]; // a cut's obtuse corner rounded; level, both as the a's top
  return outline([tl, tr, br, [b, h], [b, bot(b), ends[0]], [a, bot(a), ends[1]], [a, h], bl])
    + outline([...head(p, g, a, b), [b, top(b), ends[1]], [a, top(a), ends[0]]]);
}

/**
 * Their a at x0: the stem on the right whole; the bowl's base one curve, from the stem (aNotch up) down under the
 * baseline and round up the left side; the counter's bottom cut rising to the stem, a bar over the curve.
 * Fitted to their tall a (within a pixel): the curve leaves the stem at their slope, 0.32, pulled 132 along it,
 * and meets the left side 71 up, pulled aSwoop below it.
 */
function a(p, x0, g, c4) {
  const { Y } = g, r = p.round, H = g.H;
  const ka = 0.32, pull = 132, up = 71;
  const aa = x0 + p.stem, b = aa + p.slot, x1 = b + p.stem;
  const [tl, tr, br] = box(p, c4, x0, x1, g);
  const q0 = H - p.aNotch, q3 = H - up;
  const low = H - p.aCounter, high = low - p.slope * p.slot; // the counter's bottom: low at its left, high at the stem
  return outline([tl, tr, br, [b, Y(H)], [b, Y(q0)], ['C', b - pull, Y(q0 + pull * ka), x0, Y(q3 + p.aSwoop), x0, Y(q3)]])
    + outline([...head({ ...p, aTop: 'round' }, g, aa, b), [b, Y(high), r], [aa, Y(low)]]);
}

/** The H at x0: two stems, and the crossbar between them when bridged: the S's band, or theirs (cut). */
function Hh(p, x0, g, c4) {
  const r = p.round, h = g.Y(g.H);
  const a = x0 + p.stem, b = a + p.slot, x1 = b + p.stem;
  const [tl, tr, br, bl] = box(p, c4, x0, x1, g);
  if (!p.hBridge) return outline([tl, [a, 0], [a, h], bl]) + outline([[b, 0], tr, br, [b, h]]);
  if (p.hStyle === 'cut') { // level on top, the slot under it cut as the M's: its high corner a bar down
    const top = h - p.hBase - p.hGrow * (h - 217), cut = (x) => top + p.bar + g.k * (x - a);
    return outline([tl, [a, 0], [a, top], [b, top], [b, 0], tr, br, [b, h], [b, cut(b), r], [a, cut(a)], [a, h], bl]);
  }
  const [top, bot] = bars(p, g, a), [obtuse, acute] = g.kb ? [r, 0] : [p.aRound, p.aRound];
  return outline([tl, [a, 0], [a, top(a), obtuse], [b, top(b), acute], [b, 0], tr, br, [b, h],
    [b, bot(b), obtuse], [a, bot(a), acute], [a, h], bl]);
}

const DRAW = { S, M, A: Acap, a, H: Hh };
/** A letter's width. */
export const widthOf = (p, l) => (l === 'M' ? 2 * p.stem + p.mid + 2 * p.slot : 2 * p.stem + p.slot);

/** How far the mark reaches under its block: their a's swoop (the lowest of its curve). */
function depthOf(p, letters) {
  if (p.a !== 'a' || !letters.includes('A')) return 0;
  const H = p.height, q0 = H - p.aNotch, q3 = H - 71, y1 = q0 + 132 * 0.32, y2 = q3 + p.aSwoop;
  let most = 0;
  for (let i = 0; i <= 100; i++) {
    const t = i / 100, y = (1 - t) ** 3 * q0 + 3 * (1 - t) ** 2 * t * y1 + 3 * (1 - t) * t ** 2 * y2 + t ** 3 * q3;
    most = Math.max(most, y - H);
  }
  return Math.ceil(most * 100) / 100;
}

/**
 * Letters set in a row at block height h (the tall one chopped to it, no lower than least, or drawn out):
 * { w, h, below, d }. letters is a word of S M A H (SMASH, SM, S), the A drawn as p.a; corners are each
 * letter's, by its place in SMASH unless given. below is how far the a dips under the block.
 */
export function row(p, h = p.height, letters = 'SMASH', corners = p.corners) {
  const m = middle(p), map = mapOf(p, m, Math.max(h, least(p)));
  const g = { ...m, ...map };
  let x = 0, d = '';
  [...letters].forEach((l, i) => {
    d += DRAW[l === 'A' ? p.a : l](p, x, g, corners[i]);
    x += widthOf(p, l) + p.space + (p.even || letters !== 'SMASH' ? 0 : p.kern[i] ?? 0); // (no kern after the H)
  });
  return { w: x - p.space, h: map.h, below: depthOf(p, letters), d };
}

export const wordmark = (p, h) => row(p, h);
/** The S M, chopped: the S as SMASH's first, the M its right corners both rounded, ending the symbol. */
export const symbol = (p, h = p.symbol) => row(p, h, 'SM', [p.corners[0], [p.corners[1][0], 1, 1, p.corners[1][3]]]);
/** The S alone, chopped, every corner rounded. */
export const sAlone = (p, h = p.symbol) => row(p, h, 'S', [[1, 1, 1, 1]]);

/** A mark as an SVG: in fill, on a ground if one is given, m of clear space round it (the a's dip under the block). */
export function svgOf({ w, h, below = 0, d }, { fill = '#000', ground = null, m = 0 } = {}) {
  const W = f(w + 2 * m), H = f(h + below + 2 * m);
  const bg = ground ? `<rect id="ground" width="${W}" height="${H}" fill="${ground}"/>` : '';
  const at = m ? ` transform="translate(${f(m)} ${f(m)})"` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="SMASH">${bg}<path fill="${fill}" fill-rule="evenodd"${at} d="${d}"/></svg>`;
}
