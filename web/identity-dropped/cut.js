// Cut: one diagonal slice through the name; the offset is the energy.
//
// SMASH is drawn as one heavy, wide word (an extended geometric grotesk on a
// cap height of 100), and one straight blade cuts it at 1:12 (4.8°), rising to
// the right. The part above the blade steps along it by whole stems and lifts
// off it by g, the kerf. The letters are drawn for the blade: it passes through
// the point the two S's turn about, runs along both S terminals and the top of
// the A's counter, and meets both S counters at their inner extremes, so it
// only crosses stems and counters square. d is the brand's one variable: one
// stem for the logo, two on a facade, four when the cut becomes a window.

import { svg, timeline, canvasStage, loadImage, withCleanup, ease, span, clamp, lerp, INK, PAPER, IMAGES } from '../lib.js';

// ---------------------------------------------------------------------------
// Paths made of segments: a line is [p0, p1], a cubic is [p0, c1, c2, p1].

const P = (x, y) => [x, y];
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

function at(seg, t) {
  if (seg.length === 2) return mix(seg[0], seg[1], t);
  const [a, b, c, d] = seg;
  const u = 1 - t;
  return [
    u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0],
    u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1],
  ];
}

function splitAt(seg, t) {
  if (seg.length === 2) { const m = mix(seg[0], seg[1], t); return [[seg[0], m], [m, seg[1]]]; }
  const [a, b, c, d] = seg;
  const ab = mix(a, b, t), bc = mix(b, c, t), cd = mix(c, d, t);
  const abc = mix(ab, bc, t), bcd = mix(bc, cd, t);
  const m = mix(abc, bcd, t);
  return [[a, ab, abc, m], [m, bcd, cd, d]];
}

const reverseSeg = (s) => [...s].reverse();

/** A contour drawn with a little pen: L(p), C(c1, c2, p), close(). */
function pen(start) {
  const segs = [];
  let cur = start;
  const api = {
    L(p) { segs.push([cur, p]); cur = p; return api; },
    C(c1, c2, p) { segs.push([cur, c1, c2, p]); cur = p; return api; },
    close() { if (Math.hypot(cur[0] - start[0], cur[1] - start[1]) > 1e-9) segs.push([cur, start]); return segs; },
  };
  return api;
}
const poly = (pts) => { const p = pen(pts[0]); pts.slice(1).forEach((q) => p.L(q)); return p.close(); };

const mapContours = (cs, f) => cs.map((c) => c.map((s) => s.map(f)));
const moveContours = (cs, dx, dy) => mapContours(cs, ([x, y]) => [x + dx, y + dy]);

function pathData(contours, dx = 0, dy = 0, k = 100) {
  const f = (v) => Math.round(v * k) / k;
  const pt = (p) => `${f(p[0] + dx)} ${f(p[1] + dy)}`;
  return contours.map((c) => {
    let d = `M${pt(c[0][0])}`;
    for (const s of c) d += s.length === 2 ? `L${pt(s[1])}` : `C${pt(s[1])} ${pt(s[2])} ${pt(s[3])}`;
    return d + 'Z';
  }).join('');
}

function bounds(contours, box = [Infinity, Infinity, -Infinity, -Infinity], dx = 0, dy = 0) {
  for (const c of contours) for (const s of c) {
    const n = s.length === 2 ? 1 : 16;
    for (let i = 0; i <= n; i++) {
      const [x, y] = at(s, i / n);
      box[0] = Math.min(box[0], x + dx); box[1] = Math.min(box[1], y + dy);
      box[2] = Math.max(box[2], x + dx); box[3] = Math.max(box[3], y + dy);
    }
  }
  return box;
}

// ---------------------------------------------------------------------------
// Cutting contours with a straight line: every piece on each side, closed
// along the line. Works for letters with counters (fill-rule evenodd).

function cutContours(contours, origin, dir) {
  const nrm = [-dir[1], dir[0]]; // for dir rising to the right, this points down: s > 0 is below
  const s = (q) => (q[0] - origin[0]) * nrm[0] + (q[1] - origin[1]) * nrm[1];
  const lam = (q) => (q[0] - origin[0]) * dir[0] + (q[1] - origin[1]) * dir[1];
  const sideOf = (seg) => (s(at(seg, 0.5)) < 0 ? 'up' : 'down');
  const out = { up: [], down: [] };
  const runs = [];
  const points = [];

  for (const contour of contours) {
    // Split every segment where it crosses the line.
    const segs = [];
    for (const seg of contour) {
      const roots = [];
      const N = seg.length === 2 ? 1 : 48;
      let prevT = 0;
      let prevS = s(at(seg, 0)) || 1e-9;
      for (let i = 1; i <= N; i++) {
        const t = i / N;
        const v = s(at(seg, t)) || 1e-9;
        if ((v < 0) !== (prevS < 0)) {
          let a = prevT, b = t, sa = prevS;
          for (let k = 0; k < 50; k++) {
            const m = (a + b) / 2;
            const sm = s(at(seg, m)) || 1e-9;
            if ((sm < 0) === (sa < 0)) { a = m; sa = sm; } else b = m;
          }
          const r = (a + b) / 2;
          if (r > 1e-7 && r < 1 - 1e-7) roots.push(r);
        }
        prevT = t; prevS = v;
      }
      let rest = seg;
      let used = 0;
      for (const r of roots) {
        const local = (r - used) / (1 - used);
        const [a, b] = splitAt(rest, local);
        segs.push(a);
        rest = b;
        used = r;
      }
      segs.push(rest);
    }
    const sides = segs.map(sideOf);
    if (sides.every((x) => x === sides[0])) { out[sides[0]].push(segs); continue; }
    // Start right after a change of side, then gather runs.
    const start = sides.findIndex((x, i) => x !== sides[(i - 1 + sides.length) % sides.length]);
    const order = segs.map((_, i) => (start + i) % segs.length);
    let run = null;
    for (const i of order) {
      if (!run || run.side !== sides[i]) { run = { side: sides[i], segs: [] }; runs.push(run); }
      run.segs.push(segs[i]);
    }
  }
  // Each run starts and ends on the line; pair crossings along the line (even-odd spans).
  for (const r of runs) {
    r.a = r.segs[0][0];
    r.b = r.segs.at(-1).at(-1);
    r.la = lam(r.a);
    r.lb = lam(r.b);
    points.push(r.la, r.lb);
  }
  const uniq = [...new Set(points.map((v) => Math.round(v * 1e6) / 1e6))].sort((a, b) => a - b);
  const key = (v) => Math.round(v * 1e6) / 1e6;
  const partner = (v) => { const i = uniq.indexOf(key(v)); return uniq[i % 2 === 0 ? i + 1 : i - 1]; };
  for (const side of ['up', 'down']) {
    const mine = runs.filter((r) => r.side === side);
    const used = new Set();
    for (const first of mine) {
      if (used.has(first)) continue;
      const piece = [];
      let cur = first;
      let fwd = true;
      for (let guard = 0; guard < 64; guard++) {
        used.add(cur);
        const segs = fwd ? cur.segs : [...cur.segs].reverse().map(reverseSeg);
        piece.push(...segs);
        const end = fwd ? cur.b : cur.a;
        const pl = partner(fwd ? cur.lb : cur.la);
        const next = mine.find((r) => key(r.la) === pl || key(r.lb) === pl);
        if (!next) break;
        const q = key(next.la) === pl ? next.a : next.b;
        piece.push([end, q]);
        if (next === first) break;
        fwd = key(next.la) === pl;
        cur = next;
      }
      out[side].push(piece);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// The letters, drawn on a cap height of 100 (y down, baseline at 100).
//
// The blade is one straight line at 1:12, rising to the right. The letters are
// drawn around it. It passes through the point the two S's turn about, so it
// runs along the lower terminal of the first S and the upper terminal of the
// second, and meets each S's counter exactly at its inner extreme; it runs
// along the top of the A's counter. It only ever crosses stems and counters
// square: no slivers, no near-misses.

export const SPEC = {
  slope: 1 / 12,  // the cut: one up for every twelve across (4.8°)
  V: 30,          // vertical stems
  o: 1.6,         // overshoot of the round S and the M's point
  diag: 0.5,      // the diagonals of M and A run one across for two down
  dThick: 28,     // diagonal thickness, measured square to the stroke
  // S: width, stroke at top and bottom, outer and inner curve fullness, outer left extreme,
  // spine handles (outer shoulder, inner corner), terminal width and inset.
  // The inner extremes of its counters and its terminals are set by the blade.
  sW: 106, sTop: 21.5, sK: 0.64, sKi: 0.7, sLout: 43, sHo: 0.82, sHi: 0.08, sTW: 28, sE: 1.5,
  mW: 136,
  aW: 130, aBar: [58, 80],
  hW: 110, hBar: [38.5, 61.5],
  gaps: [9, 4, 3, 9],
};

/** From the first S to the second. */
const sDistance = (p) => p.sW + p.gaps[0] + p.mW + p.gaps[1] + p.aW + p.gaps[2];

// The first S's terminal sits a hair under the blade (and the second's a hair over it),
// so the blade never runs exactly along an edge.
const HAIR = 0.02;

/** The blade in word units: through the point the two S's turn about, halfway between them. */
export function blade(p = SPEC) {
  const x0 = (p.sW + sDistance(p)) / 2;
  const y0 = 50;
  const a = Math.atan(p.slope);
  return {
    origin: [x0, y0],
    dir: [Math.cos(a), -Math.sin(a)],
    angle: a,
    slope: p.slope,
    y: (x) => y0 - (x - x0) * p.slope,
  };
}

/** Where the line crosses the edge x = a + b·y (in the letter's own units, the letter at x0). */
const meet = (L, x0, a, b) => {
  const y = (L.origin[1] - (x0 + a - L.origin[0]) * L.slope) / (1 + b * L.slope);
  return P(a + b * y, y);
};

function glyphS(p, yt, lin) {
  const { sW: w, V, o, sTop, sK: k, sKi: ki, sTW: tw, sE: e, slope } = p;
  const cx = w / 2;
  const rot = ([x, y]) => [w - x, 100 - y];
  // The lower terminal is cut along the blade; the upper one is the same, turned round.
  const BTo = P(e, yt + (slope * tw) / 2);
  const BTi = P(e + tw, yt - (slope * tw) / 2);
  const TTo = rot(BTo);
  const TTi = rot(BTi);
  const Tout = P(cx, -o);
  const Tin = P(cx, -o + sTop);
  const Lout = P(0, p.sLout);
  const Lin = P(V, lin);
  const Rin = rot(Lin);
  const Bin = rot(Tin);
  const Bout = rot(Tout);
  const Rout = rot(Lout);
  // Each edge of the spine is one curve, from an upright extreme to the opposite one:
  // a long handle on the outer shoulder, a short one where it turns into a counter.
  const lower = Rin[1] - Lout[1];
  const upper = Rout[1] - Lin[1];
  const c = pen(TTo)
    .C(P(TTo[0], TTo[1] - k * (TTo[1] - Tout[1])), P(Tout[0] + k * (TTo[0] - Tout[0]), Tout[1]), Tout)
    .C(P(Tout[0] - k * (Tout[0] - Lout[0]), Tout[1]), P(Lout[0], Lout[1] - k * (Lout[1] - Tout[1])), Lout)
    .C(P(Lout[0], Lout[1] + p.sHo * lower), P(Rin[0], Rin[1] - p.sHi * lower), Rin)
    .C(P(Rin[0], Rin[1] + ki * (Bin[1] - Rin[1])), P(Bin[0] + ki * (Rin[0] - Bin[0]), Bin[1]), Bin)
    .C(P(Bin[0] - ki * (Bin[0] - BTi[0]), Bin[1]), P(BTi[0], BTi[1] + ki * (Bin[1] - BTi[1])), BTi)
    .L(BTo)
    .C(P(BTo[0], BTo[1] + k * (Bout[1] - BTo[1])), P(Bout[0] - k * (Bout[0] - BTo[0]), Bout[1]), Bout)
    .C(P(Bout[0] + k * (Rout[0] - Bout[0]), Bout[1]), P(Rout[0], Rout[1] + k * (Bout[1] - Rout[1])), Rout)
    .C(P(Rout[0], Rout[1] - p.sHo * upper), P(Lin[0], Lin[1] + p.sHi * upper), Lin)
    .C(P(Lin[0], Lin[1] - ki * (Lin[1] - Tin[1])), P(Tin[0] - ki * (Tin[0] - Lin[0]), Tin[1]), Tin)
    .C(P(Tin[0] + ki * (TTi[0] - Tin[0]), Tin[1]), P(TTi[0], TTi[1] - ki * (TTi[1] - Tin[1])), TTi)
    .close();
  return { w, contours: [c] };
}

/** M: upright stems, the diagonals meet in a point on the baseline (like the A's counter, a true vertex). */
function glyphM(p) {
  const { mW: w, V, diag, dThick, o } = p;
  const m = w / 2;
  const hx = dThick * Math.hypot(1, diag); // horizontal width of a diagonal
  const vt = (100 * diag - hx) / diag;     // the notch: where the diagonals' inner edges meet
  const pTop = m - vt * diag;              // where the diagonal leaves the top
  const yk = 100 - (m - V) / diag;         // where the diagonal meets the inner stem
  return {
    w,
    contours: [poly([
      P(0, 100), P(0, 0), P(pTop, 0), P(m, vt), P(w - pTop, 0), P(w, 0), P(w, 100), P(w - V, 100),
      P(w - V, yk), P(m, 100 + o), P(V, yk), P(V, 100),
    ])],
  };
}

/** A: a flat apex one stem wide; its counter's top is the blade, so the upper A is whole. */
function glyphA(p, L, x0) {
  const { aW: w, diag, dThick, aBar: [bt, bb] } = p;
  const hx = dThick * Math.hypot(1, diag);
  const lo = meet(L, x0, 100 * diag, -diag);          // outer left edge on the blade
  const ro = meet(L, x0, w - 100 * diag, diag);       // outer right
  const li = meet(L, x0, hx + 100 * diag, -diag);     // inner left: the counter's top corners
  const ri = meet(L, x0, w - hx - 100 * diag, diag);  // inner right
  const inL = (y) => P(hx + (100 - y) * diag, y);
  const inR = (y) => P(w - hx - (100 - y) * diag, y);
  const apexL = P(100 * diag, 0);
  const apexR = P(w - 100 * diag, 0);
  const outer = poly([P(0, 100), apexL, apexR, P(w, 100), P(w - hx, 100), inR(bb), inL(bb), P(hx, 100)]);
  const counter = poly([li, ri, inR(bt), inL(bt)]);
  return {
    w,
    contours: [outer, counter],
    up: [poly([lo, apexL, apexR, ro])],
    down: [poly([lo, P(0, 100), P(hx, 100), inL(bb), inR(bb), P(w - hx, 100), P(w, 100), ro, ri, inR(bt), inL(bt), li])],
  };
}

/** H: a level bar at the optical middle; the blade crosses its stems above it. */
function glyphH(p) {
  const { hW: w, V, hBar: [bt, bb] } = p;
  return {
    w,
    contours: [poly([P(0, 0), P(V, 0), P(V, bt), P(w - V, bt), P(w - V, 0), P(w, 0), P(w, 100), P(w - V, 100),
      P(w - V, bb), P(V, bb), P(V, 100), P(0, 100)])],
  };
}

/** The word SMASH laid out on its blade, and cut: { letters, width, line, up, down, whole }. */
export function word(p = SPEC) {
  const L = blade(p);
  const yt = L.y(p.sE + p.sTW / 2) + HAIR;
  const lin = L.y(sDistance(p) + p.V); // the second S's counter, at its inner extreme, on the blade
  const S = glyphS(p, yt, lin);
  const makers = [() => S, () => glyphM(p), (x) => glyphA(p, L, x), () => S, () => glyphH(p)];
  let x = 0;
  const up = [];
  const down = [];
  const letters = makers.map((make, i) => {
    const g = make(x);
    const l = { contours: moveContours(g.contours, x, 0), x, w: g.w };
    if (g.up) {
      up.push(...moveContours(g.up, x, 0));
      down.push(...moveContours(g.down, x, 0));
    } else {
      const r = cutContours(l.contours, L.origin, L.dir);
      up.push(...r.up);
      down.push(...r.down);
    }
    x += g.w + (i < makers.length - 1 ? p.gaps[i] : 0);
    return l;
  });
  return { letters, width: x, line: L, up, down, whole: letters.flatMap((l) => l.contours), S };
}

/** The ends of the cut: how far along the blade each half touches it, as x at the blade. */
function cutSpan(parts, L) {
  const nrm = [-L.dir[1], L.dir[0]];
  const s = (q) => (q[0] - L.origin[0]) * nrm[0] + (q[1] - L.origin[1]) * nrm[1];
  const span = (cs) => {
    let a = Infinity;
    let b = -Infinity;
    for (const c of cs) for (const seg of c) for (const q of [seg[0], seg.at(-1)]) {
      if (Math.abs(s(q)) < 0.05) { a = Math.min(a, q[0]); b = Math.max(b, q[0]); }
    }
    return [a, b];
  };
  return { down: span(parts.down), up: span(parts.up) };
}


// ---------------------------------------------------------------------------
// The system: one cut, and how far the halves move.

const ACCENT = '#ff4d12';
const WORD = word(SPEC);
const L0 = WORD.line;
const ANGLE = L0.angle;
const U = L0.dir;                               // along the blade, rising to the right
const N = [-Math.sin(ANGLE), -Math.cos(ANGLE)]; // square to the blade, upward
/** The move of the upper half: d along the blade, g off it (the kerf). */
const along = (d, g) => [U[0] * d + N[0] * g, U[1] * d + N[1] * g];
const CUT = { up: WORD.up, down: WORD.down };
const WHOLE = WORD.whole;
const SPAN = cutSpan(CUT, L0);
// The symbol: the first S, cut exactly where the word cuts it. Its body slides over its foot.
const SYM = cutContours(WORD.S.contours, L0.origin, L0.dir);

/**
 * The offset scale. d is counted in stems: the upper half steps along by whole
 * stems, so every upper stem lands exactly where a lower one ends. g is the
 * kerf, square to the blade, in hundredths of the cap height.
 */
export const OFFSETS = {
  logo: { k: 1, g: 5 },     // the logo, from about 200 px wide
  small: { k: 1, g: 8 },    // under 300 px wide: the kerf never closes below 1.5 px
  symbol: { k: 1, g: 6 },   // the symbol alone
  facade: { k: 2, g: 14 },  // display sizes, buildings
  open: { k: 4, g: 64 },    // the cut as a window onto the work
};
/** d along the blade for a horizontal step of k stems, with kerf g. */
const stepD = (k, g) => (k * SPEC.V + g * Math.sin(ANGLE)) / Math.cos(ANGLE);
const dOf = (o) => stepD(o.k, o.g);

const r2 = (v) => Math.round(v * 100) / 100;
const scaled = (cs, s, tx, ty) => mapContours(cs, ([x, y]) => [x * s + tx, y * s + ty]);

/**
 * The kerf between the halves as a band along the blade, with upright ends where
 * the cut begins and ends: the gap the light comes through.
 */
function kerfBand(span, L, d, g) {
  const [ox, oy] = along(d, g);
  const x0 = Math.min(span.down[0], span.up[0] + ox);
  const x1 = Math.max(span.down[1], span.up[1] + ox);
  const lo = (x) => L.y(x);
  const hi = (x) => L.y(x - ox) + oy;
  return [P(x0, lo(x0)), P(x1, lo(x1)), P(x1, hi(x1)), P(x0, hi(x0))];
}

/** The two halves as SVG paths, the upper one moved by (d, g), on a box that fits them. */
function halvesSVG(parts, d, g, { pad = 1 } = {}) {
  const [ox, oy] = along(d, g);
  const b = bounds(parts.down);
  bounds(parts.up, b, ox, oy);
  const x0 = b[0] - pad;
  const y0 = b[1] - pad;
  return svg(r2(b[2] - b[0] + 2 * pad), r2(b[3] - b[1] + 2 * pad),
    `<path fill="currentColor" fill-rule="evenodd" d="${pathData(parts.down, -x0, -y0)}"/>`
    + `<path fill="currentColor" fill-rule="evenodd" d="${pathData(parts.up, ox - x0, oy - y0)}"/>`);
}


// ---------------------------------------------------------------------------
// About

export const info = {
  n: 4,
  slug: 'cut',
  name: 'Cut',
  lane: 'Graphic gesture',
  idea: 'One diagonal slice through the name; the offset is the energy.',
  story: 'One heavy, wide SMASH and one straight cut through it. The top half steps along the blade by exactly one stem, so every upper stroke starts where a lower one ends. The step is the system: one stem for the logo, two on a building, four when the cut opens into a window onto the work. The letters were drawn for the blade, so it never leaves a sliver. The name as an action: one clean hit, and light comes through.',
  dynamism: 'Standing still, the step shows which way the top half went. In motion the halves snap shut, a hot blade scores the word in under a fifth of a second, and the top half flies open: light in the gap first, then a project. It lands back on the logo with a small overshoot.',
  keeps: 'The name at full strength: capitals, heavy, wide, readable at 200 px. The brief\'s strong, angular, bold, memorable and flexible, and a symbol that stands alone: the first S, cut exactly where the word cuts it. Glass stays a hint, a clean break rather than a picture of broken glass. It lets the labyrinth go: the equity moves to the S and the step.',
  risk: 'A sliced word is a familiar move, and it sits near CM\'s diagonal logic and near 02 Reassembled. Cut differs in one way: one straight line and one rigid move along it. No wedges, no crack pattern, no gradient wipes: a solid word is cut and moves. The angle is shallow, 4.8°, because a steeper slash cannot cross all five letters of a wide word without leaving slivers. Type takes the cut only as a project number or a short word that stands alone, never inside a sentence, where it reads as a strikethrough.',
  palette: { ink: INK, paper: PAPER, accent: ACCENT },
  interactive: 'Strike through it with the pointer, or click: a slow stroke barely parts it, a fast one throws it open.',
  keyframe: 0.4,
  application: { title: 'Website hero: the cut opens onto the showreel', aspect: '16/9' },
  type: {
    fonts: [new URL('./cut/fonts.css', import.meta.url).href],
    display: {
      family: '"Cut Ginto", sans-serif',
      css: 'font-weight: 700; font-stretch: 200%; text-transform: uppercase; letter-spacing: 0; line-height: 1;',
      name: 'ABC Ginto Nord Bold',
      note: 'The wide cut of Ginto, in capitals: the same width and weight as the wordmark, so a headline and the logo read as one voice. A number or short word that stands alone, like a project opener, can take the logo\'s cut; a sentence never does. Trial version; it would need a licence from Dinamo.',
    },
    text: {
      family: '"Cut Ginto", sans-serif',
      css: 'font-weight: 400; font-stretch: 100%;',
      name: 'ABC Ginto Normal Regular',
      note: 'The same family at its normal width: warm and plain for reading. One variable file covers both, so the type stretches the way the logo steps.',
    },
  },
};

// ---------------------------------------------------------------------------
// Stills
//
// The marks are one colour. The gap is where colour lives: a window onto the
// work when the cut opens, and the accent for the few frames when it splits,
// light through the break. A lit hairline at logo size reads as a
// strikethrough, so the accent never sits in the still kerf.

export function wordmark() {
  return halvesSVG(CUT, dOf(OFFSETS.logo), OFFSETS.logo.g);
}

export function symbol() {
  return halvesSVG(SYM, dOf(OFFSETS.symbol), OFFSETS.symbol.g);
}

/**
 * Symbol and wordmark side by side on one blade. The symbol is twice the cap
 * height, the gap 0.6 cap, and it sits where the blade that cuts the word
 * continues exactly through the symbol's own cut (within two units of centred
 * on the word). One line, one move: the whole upper half steps along by one of
 * the word's stems.
 */
const LOCK = { k: 2, gap: 60 };
function lockupParts() {
  const { k, gap } = LOCK;
  const [x0, y0] = L0.origin;
  const m = L0.slope;
  const wx = SPEC.sW * k + gap;
  const sy = y0 * (1 - k) + m * (wx + x0 * (1 - k)); // the symbol's top, so both cuts are one line
  return {
    down: [...scaled(SYM.down, k, 0, sy), ...moveContours(CUT.down, wx, 0)],
    up: [...scaled(SYM.up, k, 0, sy), ...moveContours(CUT.up, wx, 0)],
  };
}
export function lockup() {
  return halvesSVG(lockupParts(), dOf(OFFSETS.logo), OFFSETS.logo.g);
}

/**
 * The favicon: the cut S on its own ground, drawn to the pixel grid. The top of
 * the S and the foot of its lower half sit on whole pixel rows, and the kerf is
 * a whole number of pixels: 4 at 64, 2 at 32, 1 at 16.
 */
const FAV = {
  64: { k: 1, kerf: 4, top: 6, bottom: 58 },
  32: { k: 1, kerf: 2, top: 3, bottom: 29 },
  16: { k: 1, kerf: 1, top: 1, bottom: 15 },
};
export function favicon({ size = 32 } = {}) {
  const f = FAV[size] ?? FAV[32];
  const hTop = -SPEC.o;       // the top of the S
  const hBot = 100 + SPEC.o;  // the foot of its lower half
  // Scale and kerf depend on each other (the kerf lifts the top half): solve them together.
  let sc = (f.bottom - f.top) / (hBot - hTop);
  let g = f.kerf / sc;
  for (let i = 0; i < 8; i++) {
    const [, oy] = along(stepD(f.k, g), g);
    sc = (f.bottom - f.top) / (hBot - hTop - oy);
    g = f.kerf / sc;
  }
  const [ox, oy] = along(stepD(f.k, g), g);
  const b = bounds(SYM.down);
  bounds(SYM.up, b, ox, oy);
  const tx = Math.round(((size - (b[2] - b[0]) * sc) / 2 - b[0] * sc) * 2) / 2;
  const ty = f.top - (hTop + oy) * sc;
  const lo = scaled(SYM.down, sc, tx, ty);
  const up = scaled(SYM.up, sc, tx + ox * sc, ty + oy * sc);
  return svg(size, size, `<rect width="${size}" height="${size}" fill="${INK}"/><path fill="${PAPER}" fill-rule="evenodd" d="${pathData(lo)}"/><path fill="${PAPER}" fill-rule="evenodd" d="${pathData(up)}"/>`);
}

// ---------------------------------------------------------------------------
// Motion: the logo snaps shut, a blade scores the word, the top half flies open
// with light in the gap and then a project, and lands back on the logo. 5 s, a
// pure function of t. The pointer can strike a cut of its own on top.

/** A value from keyframes [t, v, easing]: each easing shapes the step that ends at its key. */
function keys(t, ks) {
  if (t <= ks[0][0]) return ks[0][1];
  for (let i = 1; i < ks.length; i++) {
    const [t1, v1, e = ease.inOutCubic] = ks[i];
    const [t0, v0] = ks[i - 1];
    if (t <= t1) return lerp(v0, v1, e(span(t, t0, t1)));
  }
  return ks.at(-1)[1];
}

const DURATION = 5;
const FRAME = 1 / 60 / DURATION;
// In shares of the loop: rest on the logo, snap shut (0.22 s), two frames of contact, the blade
// (0.18 s), the split with five lit frames, open by 0.33, the window held, settle past the logo
// by a hair and land on it by 0.74, rest. The deck's frames fall on logo, blade, window,
// mid-flight and logo.
const T = { close0: 0.13, close1: 0.174, blade0: 0.182, blade1: 0.218, open: 0.33, hold: 0.48, over: 0.66, land: 0.74 };
const FLASH = 5 * FRAME;   // the kerf lit, before the work shows through it
const LEAD = 0.012;        // the kerf opens 60 ms before the slide starts: a split first, not a shift
const BLADE = 2.5;         // the blade, in word units (about 4 px at 1440)
const WINDOW = 10;         // from this kerf up, the work shows through

function cutState(t) {
  const { open, logo } = OFFSETS;
  const dOpen = dOf(open);
  const dLogo = dOf(logo);
  const d = keys(t, [
    [T.close0, dLogo], [T.close1, 0, ease.inCubic],
    [T.blade1 + LEAD, 0], [T.open, dOpen, ease.outExpo], [T.hold, dOpen + 4, ease.inOutQuad],
    [T.over, dLogo - 2.5, ease.inOutCubic], [T.land, dLogo, ease.outQuad],
  ]);
  const g = keys(t, [
    [T.close0, logo.g], [T.close1, 0, ease.inCubic],
    [T.blade1, 0], [T.blade1 + 0.09, open.g, ease.outExpo], [T.hold, open.g * 0.96, ease.inOutQuad],
    [T.over - 0.01, logo.g - 0.6, ease.inOutCubic], [T.land - 0.02, logo.g, ease.outQuad],
  ]);
  return {
    d,
    g,
    whole: t >= T.close1 && t <= T.blade1,
    blade: t > T.blade0 && t < T.blade1 ? span(t, T.blade0, T.blade1) : -1,
    flash: t > T.blade1 && t < T.blade1 + FLASH,
    open: span(t, T.blade1, T.over), // how far through the open state, for the picture's drift
  };
}

/**
 * A cut struck with the pointer, on top of the loop: a blade runs out both ways
 * from where the pointer crossed, then the top half flies (outExpo) by as much as
 * the stroke was fast, holds, and lands back (inOutCubic with a small overshoot).
 */
const STRIKE = { blade: 0.12, fly: 0.34, hold: 0.22, land: 0.72 };
const STRIKE_END = STRIKE.blade + STRIKE.fly + STRIKE.hold + STRIKE.land;
function strikeState(s, tau) {
  const { blade, fly, hold, land } = STRIKE;
  const { open, logo } = OFFSETS;
  const reach = keys(tau, [
    [blade, 0], [blade + fly, 1, ease.outExpo], [blade + fly + hold, 1],
    [blade + fly + hold + land * 0.8, -0.04, ease.inOutCubic], [STRIKE_END, 0, ease.outQuad],
  ]);
  const lift = keys(tau, [
    [blade, 0], [blade + fly * 0.7, 1, ease.outExpo], [blade + fly + hold, 1],
    [blade + fly + hold + land * 0.75, 0, ease.inOutCubic],
  ]);
  return {
    d: s.dir * s.amp * (dOf(open) - dOf(logo)) * reach,
    g: s.amp * (open.g - logo.g) * lift,
    blade: tau < blade ? tau / blade : -1,
    flash: tau >= blade && tau < blade + 5 / 60,
  };
}

export function motion(el, { ground = 'ink' } = {}) {
  const stage = canvasStage(el);
  const bg = ground === 'paper' ? PAPER : INK;
  const fg = ground === 'paper' ? INK : PAPER;
  const lower = new Path2D(pathData(CUT.down));
  const upper = new Path2D(pathData(CUT.up));
  const whole = new Path2D(pathData(WHOLE));
  const [sx0, sx1] = [SPAN.down[0], SPAN.down[1]];
  // The frame is centred on the logo, and scaled so the fully open cut still fits.
  const [lx, ly] = along(dOf(OFFSETS.logo), OFFSETS.logo.g);
  const [px, py] = along(dOf(OFFSETS.open), OFFSETS.open.g);
  const lb = bounds(CUT.down);
  bounds(CUT.up, lb, lx, ly);
  const ob = bounds(CUT.down);
  bounds(CUT.up, ob, px, py);
  const cx = (lb[0] + lb[2]) / 2;
  const cy = (lb[1] + lb[3]) / 2;
  const reachX = Math.max(cx - ob[0], ob[2] - cx);
  const reachY = Math.max(cy - ob[1], ob[3] - cy);
  // The picture sits still behind the kerf, framed on the fully open window: a window, not a sticker.
  const pic = bounds([poly(kerfBand(SPAN, L0, dOf(OFFSETS.open), OFFSETS.open.g))]);
  let img = null;
  let tl = null;
  let strike = null;
  let view = { s: 1, x0: 0, y0: 0 };

  const render = (t) => {
    const { ctx, width: w, height: h } = stage;
    const st = cutState(t);
    let { d, g } = st;
    let blade = st.blade >= 0 ? { from: sx0, to: lerp(sx0, sx1, st.blade) } : null;
    let flash = st.flash;
    let whole0 = st.whole;
    if (strike) {
      const tau = (performance.now() - strike.t0) / 1000;
      if (tau >= STRIKE_END) strike = null;
      else {
        const k = strikeState(strike, tau);
        d += k.d;
        g += k.g;
        if (k.blade >= 0) {
          const u = k.blade;
          blade = { from: lerp(strike.x, sx0, u), to: lerp(strike.x, sx1, u) };
        }
        flash = flash || k.flash;
        whole0 = whole0 && Math.abs(k.d) < 1e-3 && k.g < 1e-3;
      }
    }

    const s = Math.min((w * 0.45) / reachX, (h * 0.44) / reachY);
    const x0 = w / 2 - cx * s;
    const y0 = h / 2 - cy * s;
    view = { s, x0, y0 };
    const [ox, oy] = along(d, g);

    ctx.setTransform(stage.dpr, 0, 0, stage.dpr, 0, 0);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.setTransform(stage.dpr * s, 0, 0, stage.dpr * s, stage.dpr * x0, stage.dpr * y0);

    if (g > 0.05) {
      // The kerf: lit for five frames when it splits, then a window onto the work.
      const band = kerfBand(SPAN, L0, d, g);
      if (flash || (g > WINDOW && img)) {
        ctx.save();
        ctx.beginPath();
        band.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.closePath();
        if (flash) {
          ctx.fillStyle = ACCENT;
          ctx.fill();
        } else {
          ctx.clip();
          const bw = pic[2] - pic[0];
          const bh = pic[3] - pic[1];
          // Cover the open window; drift against the slide, so the picture has depth behind it.
          const z = 1.1 - 0.05 * st.open;
          const k = Math.max((bw * z) / img.width, (bh * z) / img.height);
          const iw = img.width * k;
          const ih = img.height * k;
          const drift = (0.5 - st.open) * bw * 0.05;
          ctx.drawImage(img, (pic[0] + pic[2]) / 2 - iw / 2 + drift, (pic[1] + pic[3]) / 2 - ih / 2, iw, ih);
        }
        ctx.restore();
      }
    }

    ctx.fillStyle = fg;
    if (whole0 && d < 1e-3 && g < 1e-3) ctx.fill(whole, 'evenodd');
    else {
      ctx.fill(lower, 'evenodd');
      ctx.save();
      ctx.translate(ox, oy);
      ctx.fill(upper, 'evenodd');
      ctx.restore();
    }

    if (blade) {
      // The blade: a solid, hard-edged line along the middle of the kerf, from where it
      // started to its head. It leaves the scored line behind it.
      const yc = (x) => L0.y(x - ox / 2) + oy / 2;
      const a = Math.min(blade.from, blade.to);
      const b = Math.max(blade.from, blade.to);
      const hb = Math.max(BLADE, 2.2 / s) / 2 / Math.cos(ANGLE); // never thinner than about 2 px
      ctx.fillStyle = ACCENT;
      ctx.beginPath();
      ctx.moveTo(a, yc(a) - hb);
      ctx.lineTo(b, yc(b) - hb);
      ctx.lineTo(b, yc(b) + hb);
      ctx.lineTo(a, yc(a) + hb);
      ctx.closePath();
      ctx.fill();
    }
  };

  tl = timeline({ duration: DURATION, render });
  // seek(t) always draws the loop's own frame: a strike in progress is dropped.
  const baseSeek = tl.seek;
  tl.seek = (v) => { strike = null; baseSeek(v); };

  // The pointer strikes. Crossing the cut line fires a blade from the crossing, as
  // strong as the stroke was fast; a click or a tap fires one where it lands.
  let last = null;
  let pump = 0;
  const toWord = (e) => {
    const r = el.getBoundingClientRect();
    return [(e.clientX - r.left - view.x0) / view.s, (e.clientY - r.top - view.y0) / view.s, e.clientX, e.clientY];
  };
  const tick = () => {
    pump = 0;
    if (!strike) return;
    if (!tl.playing) tl.redraw();
    pump = requestAnimationFrame(tick);
  };
  const fire = (x, dir, amp) => {
    if (strike && (performance.now() - strike.t0) / 1000 < STRIKE.blade + STRIKE.fly) return;
    strike = { t0: performance.now(), x: clamp(x, sx0, sx1), dir, amp };
    if (!pump) pump = requestAnimationFrame(tick);
  };
  const onMove = (e) => {
    const [x, y, cxp, cyp] = toWord(e);
    const now = performance.now();
    const side = Math.sign(y - L0.y(x)) || 1;
    if (last && side !== last.side && now - last.time < 200) {
      const u = (last.y - L0.y(last.x)) / ((last.y - L0.y(last.x)) - (y - L0.y(x)));
      const xc = lerp(last.x, x, u);
      if (xc > sx0 - 40 && xc < sx1 + 40) {
        const v = Math.hypot(cxp - last.cx, cyp - last.cy) / Math.max(0.008, (now - last.time) / 1000);
        const perWord = (sx1 - sx0) * view.s;
        const amp = clamp(v / perWord / 3, 0.12, 1);
        fire(xc, Math.sign(cxp - last.cx) || 1, amp);
      }
    }
    last = { x, y, cx: cxp, cy: cyp, time: now, side };
  };
  const onDown = (e) => {
    const [x] = toWord(e);
    fire(x, 1, 0.6);
  };
  const onLeave = () => { last = null; };
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointerleave', onLeave);
  el.style.touchAction = 'pan-y';

  const ready = loadImage(IMAGES[7]).then((i) => { img = i; tl.redraw(); }).catch(() => {});
  stage.onResize(() => tl.redraw());
  const ctrl = withCleanup(tl, () => {
    cancelAnimationFrame(pump);
    el.removeEventListener('pointermove', onMove);
    el.removeEventListener('pointerdown', onDown);
    el.removeEventListener('pointerleave', onLeave);
  }, stage.destroy);
  ctrl.ready = ready;
  return ctrl;
}

// ---------------------------------------------------------------------------
// Type that takes the cut: two copies of the same word, clipped along a line at
// the brand angle through the middle of its capitals, the upper one moved one
// stem along it and lifted off it by the kerf. Only for a word that stands
// alone (a section, a project): inside a sentence a cut word reads as a
// strikethrough.

/** The cap height and stem (the I) from the font, and the middle of the capitals, from where the browser puts the baseline. */
function capMetrics(host, probe) {
  const cs = getComputedStyle(host);
  const fs = parseFloat(cs.fontSize) || 16;
  const ctx = (capMetrics.ctx ??= document.createElement('canvas').getContext('2d'));
  ctx.font = `${cs.fontWeight} ${fs}px ${cs.fontFamily}`;
  if ('fontStretch' in ctx) ctx.fontStretch = parseFloat(cs.fontStretch) >= 200 ? 'ultra-expanded' : 'normal';
  const H = ctx.measureText('H');
  const I = ctx.measureText('I');
  const cap = H.actualBoundingBoxAscent || fs * 0.7;
  const stem = I.actualBoundingBoxRight + I.actualBoundingBoxLeft || fs * 0.2;
  const base = probe.offsetTop;
  return { fs, cap, mid: base - cap / 2, stem };
}

function cutText(host, { step = SPEC.V / 100, kerf = OFFSETS.logo.g / 100 } = {}) {
  const html = host.innerHTML;
  host.style.position = 'relative';
  host.style.display = 'inline-block';
  host.innerHTML = `<span style="display:block">${html}<i style="display:inline-block;width:0;height:0;vertical-align:baseline"></i></span><span aria-hidden="true" style="display:block;position:absolute;left:0;top:0;right:0;user-select:none;pointer-events:none">${html}</span>`;
  const lo = host.firstElementChild;
  const hi = host.lastElementChild;
  const probe = lo.querySelector('i');
  const fit = () => {
    const w = host.offsetWidth;
    const h = host.offsetHeight;
    if (!w || !h) return;
    const { cap, mid } = capMetrics(host, probe);
    const m = 60;
    const yl = mid + (w / 2 + m) * SPEC.slope;
    const yr = mid - (w / 2 + m) * SPEC.slope;
    lo.style.clipPath = `polygon(${-m}px ${r2(yl)}px, ${w + m}px ${r2(yr)}px, ${w + m}px ${h + m}px, ${-m}px ${h + m}px)`;
    hi.style.clipPath = `polygon(${-m}px ${-m}px, ${w + m}px ${-m}px, ${w + m}px ${r2(yr)}px, ${-m}px ${r2(yl)}px)`;
    const g = Math.max(3, kerf * cap);
    const [ox, oy] = along((step * cap + g * Math.sin(ANGLE)) / Math.cos(ANGLE), g);
    hi.style.transform = `translate(${r2(ox)}px, ${r2(oy)}px)`;
  };
  fit();
  const ro = new ResizeObserver(fit);
  ro.observe(host);
  document.fonts?.ready.then(fit);
  return () => ro.disconnect();
}

// ---------------------------------------------------------------------------
// Application: the studio's website. The page is cut by the same blade as the
// logo; the gap between the halves is the showreel, and every change of
// project is a new cut: slam shut, the blade, open onto the next.

const REEL = [
  [7, 'Resonance', 'A facade in projected light'],
  [4, 'Lyra', 'A cage of light to stand inside'],
  [0, 'Balena Voladora', 'A whale drawn in light, at dusk'],
  [3, 'Dome Dreaming', 'A full dome of projected sky'],
  [6, 'Svartljus', 'Rings of light in a dark forest'],
  [9, 'Transcend', 'Hands of light, reaching'],
  [2, 'Icehotel', 'A suite carved from river ice'],
  [5, 'Firestarter', 'A tower of fire under lightning'],
];

/** Two layouts on the same 16:9 box: a desktop hero, and a phone one with a bigger word and less copy. */
const HERO = {
  wide: { DW: 1600, DH: 900, pad: 100, box: { y: 262, w: 1400 }, nav: 104, logo: 150, hl: { top: 560, size: 70 }, sub: true, meta: 818, navText: 17 },
  narrow: { DW: 900, DH: 506, pad: 44, box: { y: 178, w: 812 }, nav: 76, logo: 150, hl: { top: 350, size: 46 }, sub: false, meta: 454, navText: 22 },
};

export function application(el, { images = IMAGES } = {}) {
  let inner = null;
  let mode = '';
  const build = () => {
    const next = el.clientWidth && el.clientWidth < 600 ? 'narrow' : 'wide';
    if (next === mode) return;
    mode = next;
    inner?.destroy();
    inner = hero(el, images, HERO[mode]);
  };
  const ro = new ResizeObserver(build);
  ro.observe(el);
  build();
  return {
    get ready() { return inner?.ready; },
    destroy() { ro.disconnect(); inner?.destroy(); },
  };
}

function hero(el, images, H) {
  const { DW, DH, pad, box } = H;
  const k = box.w / WORD.width;                  // px per word unit
  const bx = pad;
  const [tx, ty] = L0.origin;
  const P0 = [bx + tx * k, box.y + ty * k];      // the blade, where it turns the two S's
  const yAt = (x) => P0[1] - (x - P0[0]) * SPEC.slope;
  const OPEN = { k: 1, g: 50 };                  // one stem along, a tall window
  const dOpen = dOf(OPEN);
  const [, byOpen] = along(dOpen * k, OPEN.g * k);
  const band = { top: yAt(DW) + byOpen - 16, bottom: yAt(0) + 16 };
  const x0 = bx + SPAN.down[0] * k;
  const x1 = bx + SPAN.down[1] * k;

  const root = document.createElement('div');
  root.className = 'cut-hero';
  root.style.cssText = `position:absolute;inset:0;overflow:hidden;background:${INK};`;
  const stage = document.createElement('div');
  stage.style.cssText = `position:absolute;left:0;top:0;width:${DW}px;height:${DH}px;transform-origin:0 0;font-family:"Cut Ginto",sans-serif;color:${PAPER};`;
  root.appendChild(stage);
  const rule = `<i class="rule" aria-hidden="true"></i>`; // the chapter's marker: a short rule at the brand angle
  const css = `
    .cut-hero .layer { position:absolute; inset:0; background:${INK}; }
    .cut-hero .reel { position:absolute; left:0; width:${DW}px; top:${band.top}px; height:${band.bottom - band.top}px; overflow:hidden; }
    .cut-hero .reel img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; opacity:0; transform-origin:50% 50%; will-change:transform; }
    .cut-hero .nav { position:absolute; left:0; top:0; width:${DW}px; height:${H.nav}px; padding:0 ${pad}px; box-sizing:border-box; display:flex; align-items:center; justify-content:space-between; background:${INK}; font-size:${H.navText}px; font-weight:500; }
    .cut-hero .nav svg { width:${H.logo}px; display:block; }
    .cut-hero .nav ul { display:flex; gap:44px; list-style:none; margin:0; padding:0; }
    .cut-hero .nav li { opacity:0.62; }
    .cut-hero .nav li.on { opacity:1; position:relative; }
    .cut-hero .nav li.on i { position:absolute; left:-2px; right:-2px; top:calc(100% + 9px); height:2px; background:${ACCENT}; transform:rotate(${-ANGLE}rad); transform-origin:0 50%; }
    .cut-hero .hl { position:absolute; left:${pad}px; top:${H.hl.top}px; font-size:${H.hl.size}px; font-weight:700; font-stretch:200%; text-transform:uppercase; line-height:1; white-space:nowrap; }
    .cut-hero .sub { position:absolute; left:${pad}px; top:674px; width:560px; margin:0; font-size:22px; line-height:1.4; font-weight:400; opacity:0.86; }
    .cut-hero .clients { position:absolute; left:900px; top:676px; width:600px; margin:0; font-size:16px; line-height:1.7; font-weight:400; opacity:0.7; }
    .cut-hero .clients b { display:block; font-weight:400; opacity:0.72; margin-bottom:4px; }
    .cut-hero .pmeta { position:absolute; left:${pad}px; right:${pad}px; top:${H.meta}px; display:flex; justify-content:space-between; align-items:baseline; font-size:16px; font-weight:400; }
    .cut-hero .pmeta .n { font-variant-numeric:tabular-nums; opacity:0.7; margin-right:18px; }
    .cut-hero .pmeta .t { font-stretch:200%; font-weight:700; text-transform:uppercase; letter-spacing:0.01em; margin-right:14px; }
    .cut-hero .pmeta .c { opacity:0.7; }
    .cut-hero .pmeta .more { opacity:0.7; display:inline-flex; align-items:center; gap:12px; }
    .cut-hero .rule { display:inline-block; width:18px; height:2px; background:currentColor; transform:rotate(${-ANGLE}rad); }
    .cut-hero .blade { position:absolute; left:0; top:0; height:${r2(BLADE * k)}px; background:${ACCENT}; transform-origin:0 50%; width:0; }
    .cut-hero .flash { position:absolute; inset:0; background:${ACCENT}; opacity:0; }
  `;
  const bigHalf = (parts, fill) => `<svg viewBox="0 0 ${r2(WORD.width)} 100" style="position:absolute;left:${bx}px;top:${box.y}px;width:${box.w}px;overflow:visible" aria-hidden="true"><path fill="${fill}" fill-rule="evenodd" d="${pathData(parts)}"/></svg>`;
  const content = (hidden, parts) => `
    <div class="layer"${hidden ? ' aria-hidden="true"' : ''}>
      ${bigHalf(parts, PAPER)}
      <div class="hl">Art you can walk into.</div>
      ${H.sub ? `<p class="sub">An immersive studio in Stockholm. We turn rooms, domes and facades into places people feel, and we build them too.</p>
      <p class="clients"><b>Made with</b>Netflix, HBO Max, Spotify, IKEA,<br>the Nobel Prize and Eurovision / SVT</p>` : ''}
      <div class="pmeta"><span><span class="n"></span><span class="t"></span>${H.sub ? '<span class="c"></span>' : ''}</span>${H.sub ? `<span class="more">Selected work ${rule}</span>` : ''}</div>
    </div>`;
  const small = halvesSVG(CUT, dOf(OFFSETS.small), OFFSETS.small.g).replace('<svg ', `<svg role="img" aria-label="SMASH" style="color:${PAPER}" `);
  const items = mode2items(H);
  stage.innerHTML = `<style>${css}</style>
    <div class="reel">${REEL.map(([i]) => `<img alt="" src="${images[i] ?? images[0]}">`).join('')}<div class="flash"></div></div>
    <div class="half lo">${content(false, CUT.down)}</div>
    <div class="half hi">${content(true, CUT.up)}</div>
    <div class="blade"></div>
    <header class="nav">${small}${items}</header>`;
  el.appendChild(root);

  const lo = stage.querySelector('.half.lo');
  const hi = stage.querySelector('.half.hi');
  const m = 80;
  // The lower layer reaches a pixel over the line, so no seam shows when the page is closed.
  lo.style.cssText = `position:absolute;inset:0;clip-path:polygon(${-m}px ${r2(yAt(-m) - 1)}px, ${DW + m}px ${r2(yAt(DW + m) - 1)}px, ${DW + m}px ${DH + m}px, ${-m}px ${DH + m}px);`;
  hi.style.cssText = `position:absolute;inset:0;clip-path:polygon(${-m}px ${-m}px, ${DW + m}px ${-m}px, ${DW + m}px ${r2(yAt(DW + m))}px, ${-m}px ${r2(yAt(-m))}px);will-change:transform;`;
  const reel = stage.querySelector('.reel');
  const flashEl = stage.querySelector('.flash');
  const imgs = [...stage.querySelectorAll('.reel img')];
  const metas = [...stage.querySelectorAll('.pmeta')];
  const blade = stage.querySelector('.blade');

  const fit = () => { stage.style.transform = `scale(${el.clientWidth / DW})`; };
  const ro = new ResizeObserver(fit);
  ro.observe(el);
  fit();

  // One cycle per project: hold open, slam shut, the blade, open onto the next (the kerf
  // lit for five frames first, and the kerf ahead of the slide by 60 ms).
  const HOLD = 4.2;
  const CLOSE = 0.24;
  const CUTS = 0.2;
  const OPENS = 0.9;
  const CYCLE = HOLD + CLOSE + CUTS + OPENS;
  let shown = -1;
  const show = (i) => {
    if (i === shown) return;
    shown = i;
    const [, title, line] = REEL[i];
    for (const mt of metas) {
      mt.querySelector('.n').textContent = `${String(i + 1).padStart(2, '0')} / ${String(REEL.length).padStart(2, '0')}`;
      mt.querySelector('.t').textContent = title;
      const c = mt.querySelector('.c');
      if (c) c.textContent = line;
    }
  };
  const set = (node, prop, value, cache) => {
    if (cache[prop] === value) return;
    cache[prop] = value;
    node.style[prop] = value;
  };
  const cache = { hi: {}, reel: {}, blade: {}, flash: {}, imgs: imgs.map(() => ({})) };
  const frame = (time) => {
    const c = time % CYCLE;
    const n = Math.floor(time / CYCLE);
    let d = dOpen;
    let g = OPEN.g;
    let head = -1;
    let lit = false;
    let cur = n % REEL.length;
    let since = c + OPENS; // how long the current picture has been open, for its slow push in
    if (c > HOLD && c <= HOLD + CLOSE) {
      const x = ease.inCubic(span(c, HOLD, HOLD + CLOSE));
      g = lerp(OPEN.g, 0, x);
      d = lerp(dOpen, 0, x);
    } else if (c > HOLD + CLOSE && c <= HOLD + CLOSE + CUTS) {
      g = 0;
      d = 0;
      head = span(c, HOLD + CLOSE + 0.03, HOLD + CLOSE + CUTS);
    } else if (c > HOLD + CLOSE + CUTS) {
      const a = c - (HOLD + CLOSE + CUTS);
      g = lerp(0, OPEN.g, ease.outExpo(span(a, 0, OPENS * 0.8)));
      d = lerp(0, dOpen, ease.outExpo(span(a, 0.06, OPENS)));
      lit = a < 5 / 60;
      cur = (n + 1) % REEL.length;
      since = a;
    }
    show(cur);
    imgs.forEach((im, i) => {
      const on = i === cur && !lit;
      set(im, 'opacity', on ? '1' : '0', cache.imgs[i]);
      if (i === cur) set(im, 'transform', `scale(${(1.1 - 0.06 * clamp(since / CYCLE)).toFixed(5)})`, cache.imgs[i]);
    });
    set(flashEl, 'opacity', lit ? '1' : '0', cache.flash);
    const [ox, oy] = along(d * k, g * k);
    set(hi, 'transform', `translate(${r2(ox)}px, ${r2(oy)}px)`, cache.hi);
    // The reel shows only in the kerf: between the blade and the moved upper half.
    const bt = band.top;
    set(reel, 'clipPath', `polygon(${-m}px ${r2(yAt(-m) - bt)}px, ${DW + m}px ${r2(yAt(DW + m) - bt)}px, ${DW + m}px ${r2(yAt(DW + m - ox) + oy - bt)}px, ${-m}px ${r2(yAt(-m - ox) + oy - bt)}px)`, cache.reel);
    if (head >= 0) {
      // The blade scores the word from the S's foot to the H: solid, no tail.
      const hx = lerp(x0, x1, head);
      const len = (hx - x0) / Math.cos(ANGLE);
      set(blade, 'width', `${r2(Math.max(0, len))}px`, cache.blade);
      set(blade, 'transform', `translate(${r2(x0)}px, ${r2(yAt(x0) - (BLADE * k) / 2)}px) rotate(${-ANGLE}rad)`, cache.blade);
      set(blade, 'opacity', '1', cache.blade);
    } else set(blade, 'opacity', '0', cache.blade);
  };
  let raf = 0;
  let t0 = 0;
  const loop = (now) => {
    if (!t0) t0 = now;
    frame((now - t0) / 1000);
    raf = requestAnimationFrame(loop);
  };
  frame(0);
  raf = requestAnimationFrame(loop);
  const ready = Promise.all([
    ...imgs.slice(0, 2).map((im) => (im.decode ? im.decode().catch(() => {}) : null)),
    document.fonts?.ready,
  ]).then(() => frame(0));
  return {
    ready,
    destroy() { cancelAnimationFrame(raf); ro.disconnect(); root.remove(); },
  };
}

function mode2items(H) {
  if (!H.sub) return '<ul><li class="on">Menu<i></i></li></ul>';
  return '<ul><li class="on">Work<i></i></li><li>Studio</li><li>Approach</li><li>Journal</li><li>Contact</li></ul>';
}

// ---------------------------------------------------------------------------
// Specimen: one family; a word that stands alone takes the cut; the offset scale.

export function specimen(el) {
  const t = info.type;
  const fam = (f) => f.family.replace(/"/g, '&quot;');
  el.innerHTML = `
    <div class="spec-display">
      <div style="display:flex;align-items:flex-end;gap:clamp(14px, 2vw, 28px);margin:clamp(14px, 1.6vw, 24px) 0 18px">
        <div class="cut-spec-word" style="font-family:${fam(t.display)};${t.display.css}font-size:clamp(56px, 8vw, 132px)">04</div>
        <div style="padding-bottom:0.3em">
          <div style="font-family:${fam(t.display)};${t.display.css}font-size:clamp(18px, 1.8vw, 28px)">Dome Dreaming</div>
          <div style="font-family:${fam(t.text)};${t.text.css}font-size:clamp(13px, 1.1vw, 16px);opacity:0.72;margin-top:6px">A full dome of projected sky</div>
        </div>
      </div>
      <div style="font-family:${fam(t.display)};${t.display.css}font-size:clamp(22px, 2.6vw, 40px);line-height:1.04;margin-bottom:20px">Art you can walk into.</div>
      <p class="label">Display: ${t.display.name}, capitals. A project number takes the cut; a sentence stays whole</p>
      <p class="note">${t.display.note}</p>
    </div>
    <div class="spec-text">
      <p class="spec-body" style="font-family:${fam(t.text)};${t.text.css}">We are an immersive studio in Stockholm. We turn rooms, domes and facades into places people feel, and we build them too: installations, projection mapping, stage design. The work lives in dark rooms, and it only works when people step inside.</p>
      <p class="label">Text: ${t.text.name}</p>
      <p class="note">${t.text.note}</p>
      <div class="cut-spec-scale" style="margin-top:28px"></div>
    </div>`;
  const word = el.querySelector('.cut-spec-word');
  // The number steps along by the logo's own proportion: a stem of 0.3 cap, a kerf of 0.05.
  const undo = cutText(word);
  // The offset scale: one stem, two, and four with the work in the kerf.
  const uid = `cut-open-${Math.random().toString(36).slice(2, 8)}`;
  const openSVG = (() => {
    const o = OFFSETS.open;
    const d = dOf(o);
    const [ox, oy] = along(d, o.g);
    const b = bounds(CUT.down);
    bounds(CUT.up, b, ox, oy);
    const x0 = b[0] - 1;
    const y0 = b[1] - 1;
    const bandP = kerfBand(SPAN, L0, d, o.g);
    const bb = bounds([poly(bandP)]);
    return svg(r2(b[2] - b[0] + 2), r2(b[3] - b[1] + 2),
      `<defs><clipPath id="${uid}"><path d="${pathData([poly(bandP)], -x0, -y0)}"/></clipPath></defs>`
      + `<image href="${IMAGES[7]}" x="${r2(bb[0] - x0)}" y="${r2(bb[1] - y0 - 20)}" width="${r2(bb[2] - bb[0])}" height="${r2(bb[3] - bb[1] + 40)}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${uid})"/>`
      + `<path fill="currentColor" fill-rule="evenodd" d="${pathData(CUT.down, -x0, -y0)}"/>`
      + `<path fill="currentColor" fill-rule="evenodd" d="${pathData(CUT.up, ox - x0, oy - y0)}"/>`);
  })();
  const rows = [
    ['Logo: one stem', halvesSVG(CUT, dOf(OFFSETS.logo), OFFSETS.logo.g)],
    ['Facade: two stems', halvesSVG(CUT, dOf(OFFSETS.facade), OFFSETS.facade.g)],
    ['Open: four stems, a window', openSVG],
  ];
  el.querySelector('.cut-spec-scale').innerHTML = `<p class="label" style="margin-bottom:12px">The offset, d: one variable, counted in stems</p>`
    + `<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;align-items:end">${rows.map(([name, s]) => `<div><div style="color:inherit">${s.replace('<svg ', '<svg style="display:block;width:100%;height:auto" ')}</div><p class="label" style="margin-top:8px">${name}</p></div>`).join('')}</div>`;
  return { destroy: undo };
}

// ---------------------------------------------------------------------------
// The system for Illustrator: the offset scale and the construction, as plain
// vector (not called by the page). identity/04-cut/system/ is written from it.

export function systemFiles() {
  const named = (svgText) => svgText
    .replace('<path fill="currentColor" fill-rule="evenodd" d=', '<path id="lower-half" fill="currentColor" fill-rule="evenodd" d=')
    .replace(/(<path )(fill="currentColor" fill-rule="evenodd" d="[^"]*"\/>)(<\/svg>)$/, '$1id="upper-half" $2$3');
  const files = {};
  for (const [name, o] of Object.entries({ 'wordmark-1-stem-logo': OFFSETS.logo, 'wordmark-1-stem-small': OFFSETS.small, 'wordmark-2-stems-facade': OFFSETS.facade, 'wordmark-4-stems-open': OFFSETS.open })) {
    files[`${name}.svg`] = named(halvesSVG(CUT, dOf(o), o.g));
  }
  // The word whole, with the blade: the line it is drawn around, and where it meets the letters.
  const pad = 12;
  const [x0, x1] = [-pad, WORD.width + pad];
  const t = 0.6;
  const bl = [P(x0, L0.y(x0) - t / 2), P(x1, L0.y(x1) - t / 2), P(x1, L0.y(x1) + t / 2), P(x0, L0.y(x0) + t / 2)];
  files['construction-word-and-blade.svg'] = svg(r2(WORD.width + 2 * pad), 100 + 2 * pad,
    `<path id="word" fill="currentColor" fill-rule="evenodd" d="${pathData(WHOLE, pad, pad)}"/><path id="blade" fill="${ACCENT}" d="${pathData([poly(bl)], pad, pad)}"/>`);
  return files;
}
