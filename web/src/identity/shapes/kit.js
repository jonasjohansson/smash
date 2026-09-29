// The kit: the negative shapes of the modular mark (modular.js) that are not
// letters, made solid, as blocks to build with. The slot; the bend; the S's
// hook, two bends; the T-join, a hook meeting a through slot, as the S's top
// slot meets the slot after it; the closed end, the M's; and the A's counter,
// the short one that stops just under the edge.
//
// Each piece is a centre line on the pitch grid (a node every 51.78, in
// pitches), with what happens at each of its ends, so it can be placed,
// turned, mirrored and snapped; and it is drawn as the mark draws a slot:
// stroked, each bend filleted at the mark's radius on the centre line. Cut
// from a block it is a slot wide, its free ends round, exactly the mark's
// slot. As a building block it is a bar wide (BLOCK), so blocks side by side
// keep a slot between them (the mark turned inside out), and its free ends
// are flat, a brick's; only the closed end and the counter stay round.
//
// Pieces put together are read as one graph on the grid (a Board). Where two
// meet end to end they click into one line (a bend is filleted, as the
// mark's); where one ends on the side of another it is a T, as the mark's.
// Nothing else may touch: two pieces never share a run, four never meet at a
// node, and whatever is not joined keeps a bar clear, which the grid gives
// for free (a slot is 20, the pitch 51.78: a bar, 31.78, between).

import { MODULAR_DEFAULTS } from '../modular.js';

export const BAR = MODULAR_DEFAULTS.bar; // 31.78
export const SLOT = MODULAR_DEFAULTS.slot; // 20
export const BEND = MODULAR_DEFAULTS.bend; // 10, on the slot's centre line
export const PITCH = BAR + SLOT; // 51.78
const HALF = SLOT / 2;
/** How wide a building block is drawn: a bar, so two a pitch apart keep a slot between them. */
export const BLOCK = BAR;
/** The stroke for a build: a slot (cut, the mark's own) or a block. */
export const weightOf = (build) => (build === 'cut' ? SLOT : BLOCK);
/** The A's counter stops short: its round end's centre this far from the node it stands on (24.28). */
const TIP = BAR + HALF - MODULAR_DEFAULTS.counter;

/** A node's place, in mark units: the first a bar and half a slot in from the block's edge. */
export const at = (i) => BAR + HALF + i * PITCH;
/** A block n nodes across: n slots and n + 1 bars (the S M is 4 × 2: 238.9 × 135.34). */
export const span = (n) => n * PITCH + BAR;

const f = (n) => +n.toFixed(2);

// The four ways out of a node, as bits: east, south, west, north (y runs down).
const E = 1, S = 2, W = 4, N = 8;
const STEP = { [E]: [1, 0], [S]: [0, 1], [W]: [-1, 0], [N]: [0, -1] };
const BACK = { [E]: W, [S]: N, [W]: E, [N]: S };
const DIRS = [E, S, W, N];
const dirOf = (dx, dy) => (dx > 0 ? E : dx < 0 ? W : dy > 0 ? S : N);
const degree = (bits) => (bits & 1) + ((bits >> 1) & 1) + ((bits >> 2) & 1) + ((bits >> 3) & 1);

// ---------------------------------------------------------------------------
// The pieces

/**
 * A centre line through grid points, with its two ends: 'free' (round when
 * cut, flat as a block), 'round' (closed, always), 'flat' (square) or 'tip'
 * (the A's counter).
 */
const line = (pts, a = 'free', b = 'free') => ({ pts, ends: [a, b] });

// Each kind: its lines for a set of lengths (in pitches), and the lengths it
// has as a kit piece. Drawn upright: the bend goes down and then right, the
// hook down, right and down again, the join's hook meets its slot from the
// left, the closed end and the counter stand on their flat ends.
const KINDS = {
  slot: { size: [2], lines: ([a]) => [line([[0, 0], [0, a]])] },
  bend: { size: [1, 1], lines: ([a, b]) => [line([[0, 0], [0, a], [b, a]])] },
  hook: { size: [1, 1, 1], lines: ([a, b, c]) => [line([[0, 0], [0, a], [b, a], [b, a + c]])] },
  join: { size: [1, 1, 1], lines: ([a, b, c]) => [line([[b, 0], [b, a + c]]), line([[0, 0], [0, a], [b, a]])] },
  end: { size: [2], lines: ([a]) => [line([[0, 0], [0, a]], 'round', 'flat')] },
  counter: { size: [], lines: () => [line([[0, 0], [0, 1]], 'tip', 'flat')] },
};
/** The kit, in order. */
export const KIT = Object.keys(KINDS);

/** A piece's box, in nodes: [x0, y0, x1, y1]. */
export function box(p) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const l of p.lines) for (const [x, y] of l.pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return [x0, y0, x1, y1];
}

/** The piece with every point moved by fn (its ends go with them). */
export const mapPiece = (p, fn) => ({ ...p, lines: p.lines.map((l) => ({ pts: l.pts.map(fn), ends: [...l.ends] })) });
export const moved = (p, dx, dy) => mapPiece(p, ([x, y]) => [x + dx, y + dy]);

/** Mirrored left to right, in place (about the middle of its box). */
export function mirrored(p) {
  const [x0, , x1] = box(p);
  return { ...mapPiece(p, ([x, y]) => [x0 + x1 - x, y]), m: !p.m };
}

/**
 * Turned a quarter clockwise, in place: about the middle of its box, snapped
 * back onto the grid. A box of odd by even lands between nodes; it is nudged
 * half a pitch, the nudge itself turning with the piece, so four turns bring
 * it back where it was.
 */
export function turned(p) {
  const [x0, y0, x1, y1] = box(p);
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  let q = mapPiece(p, ([x, y]) => [cx - (y - cy), cy + (x - cx)]);
  if ((x1 - x0 + y1 - y0) % 2) {
    let [dx, dy] = [0.5, 0.5];
    for (let k = 0; k < (p.r ?? 0) % 4; k++) [dx, dy] = [-dy, dx];
    q = moved(q, dx, dy);
  }
  return { ...q, r: ((p.r ?? 0) + 1) % 4 };
}

/**
 * A kit piece: kind, its lengths (the kit's own when left out), mirrored
 * (m), turned r quarters clockwise, with its box's top left at x, y.
 */
export function piece(kind, size = KINDS[kind].size, { x = 0, y = 0, r = 0, m = false } = {}) {
  let p = { kind, size, r: 0, m: false, lines: KINDS[kind].lines(size) };
  if (m) p = mirrored(p);
  for (let k = 0; k < r; k++) p = mapPiece(p, ([px, py]) => [-py, px]);
  const [bx, by] = box(p);
  return { ...moved(p, x - bx, y - by), r: r % 4, m };
}

/** The runs a piece takes: [x, y, dir] for each unit step along its lines. */
function runsOf(p) {
  const out = [];
  for (const { pts } of p.lines) {
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1];
      const [bx, by] = pts[i];
      const n = Math.abs(bx - ax) + Math.abs(by - ay);
      const d = dirOf(bx - ax, by - ay);
      const [sx, sy] = STEP[d];
      for (let k = 0; k < n; k++) out.push([ax + sx * k, ay + sy * k, d]);
    }
  }
  return out;
}

/**
 * A number for a piece's runs, the same for two pieces that lie on each other
 * (images of a symmetric piece): each run's key, squared, summed, with their
 * count; in whatever order they come.
 */
export function signature(p) {
  let sum = 0, sq = 0, n = 0;
  for (const [x, y, d] of runsOf(p)) {
    const k = d === W ? ((x + 511) * 1024 + y + 512) * 2 : d === N ? ((x + 512) * 1024 + y + 511) * 2 + 1 : ((x + 512) * 1024 + y + 512) * 2 + (d === S ? 1 : 0);
    sum += k;
    sq = (sq + Math.imul(k, k)) | 0;
    n++;
  }
  return `${n}:${sum}:${sq}`;
}

// ---------------------------------------------------------------------------
// The board: pieces on a grid, as a graph

const mod = (a, n) => ((a % n) + n) % n;

/**
 * Pieces on a grid of N × M nodes, read as a graph: which runs are taken and
 * by what, and which ways each node is left. `cut` lets a slot run off the
 * block: to a node one step outside, straight across the edge, where it
 * ends. `wrap` joins each far edge to the near one, for a seamless pattern.
 * `open` (x, y) leaves that axis without edges at all (a drawing of a
 * pattern). Adding pieces is refused when it breaks a rule.
 */
export class Board {
  constructor({ N: n, M: m, cut = false, wrap = [false, false], open = [false, false] }) {
    Object.assign(this, { n, m, cut, wrap, open });
    this.runs = new Map(); // run key → the index of the piece that takes it
    this.nodes = new Map(); // node key → { x, y, inside, bits (the ways it is left), tip, ends: [declared end types] }
    this.pieces = [];
  }

  /** A node's key (wrapped where the grid wraps). */
  key(x, y) {
    if (this.wrap[0]) x = mod(x, this.n);
    if (this.wrap[1]) y = mod(y, this.m);
    return (x + 4096) * 8192 + (y + 4096);
  }

  /** Where a node is: its key, its place (wrapped), and whether it is inside the block. */
  node(x, y) {
    const { n, m, wrap } = this;
    if (wrap[0]) x = mod(x, n);
    if (wrap[1]) y = mod(y, m);
    const inX = this.open[0] || wrap[0] || (x >= 0 && x < n);
    const inY = this.open[1] || wrap[1] || (y >= 0 && y < m);
    return { key: (x + 4096) * 8192 + (y + 4096), x, y, inside: inX && inY, near: (inX || x === -1 || x === n) && (inY || y === -1 || y === m) };
  }

  /** 0: on the grid; 1: a step off it, across one edge (a slot's open end); 2: further. */
  where(x, y) {
    const { n, m, wrap, open } = this;
    const offX = open[0] || wrap[0] || (x >= 0 && x < n) ? 0 : x === -1 || x === n ? 1 : 2;
    const offY = open[1] || wrap[1] || (y >= 0 && y < m) ? 0 : y === -1 || y === m ? 1 : 2;
    return offX + offY;
  }

  runKey(x, y, d) {
    if (d === W) return this.key(x - 1, y) * 2;
    if (d === N) return this.key(x, y - 1) * 2 + 1;
    return this.key(x, y) * 2 + (d === S ? 1 : 0);
  }

  /** Whether pieces can go on together (they may click onto each other and onto what is there). */
  fits(pieces) {
    const runs = new Set();
    const bits = new Map(); // node key → the ways it is left by the new pieces
    const outside = new Set(); // node keys a step off the block
    const tips = new Set();
    for (const p of pieces) {
      for (const { pts, ends } of p.lines) {
        for (let i = 1; i < pts.length; i++) {
          const [ax, ay] = pts[i - 1];
          const [bx, by] = pts[i];
          const d = dirOf(bx - ax, by - ay);
          const [sx, sy] = STEP[d];
          const steps = Math.abs(bx - ax) + Math.abs(by - ay);
          for (let s = 0; s < steps; s++) {
            const x = ax + sx * s, y = ay + sy * s;
            const k = this.runKey(x, y, d);
            if (this.runs.has(k) || runs.has(k)) return false; // two pieces on one run
            runs.add(k);
            const wa = this.where(x, y), wb = this.where(x + sx, y + sy);
            if (wa > 1 || wb > 1 || (wa && wb)) return false; // off the grid
            const ka = this.key(x, y), kb = this.key(x + sx, y + sy);
            bits.set(ka, (bits.get(ka) ?? 0) | d);
            bits.set(kb, (bits.get(kb) ?? 0) | BACK[d]);
            if (wa) outside.add(ka);
            if (wb) outside.add(kb);
          }
        }
        if (ends[0] === 'tip') tips.add(this.key(...pts[0]));
        if (ends[1] === 'tip') tips.add(this.key(...pts.at(-1)));
      }
    }
    for (const [k, b] of bits) {
      const old = this.nodes.get(k);
      const deg = degree((old?.bits ?? 0) | b);
      if (deg > 3) return false; // four never meet: no crossings
      if (outside.has(k) && (deg > 1 || !this.cut)) return false; // off the block only as a slot's open end
      if ((tips.has(k) || old?.tip) && deg > 1) return false; // the counter's short end stays clear
    }
    return true;
  }

  /** Put pieces on (fits() first). Returns their indices. */
  add(pieces) {
    return pieces.map((p) => {
      const i = this.pieces.push(p) - 1;
      for (const [x, y, d] of runsOf(p)) {
        this.runs.set(this.runKey(x, y, d), i);
        const [sx, sy] = STEP[d];
        for (const [nx, ny, bit] of [[x, y, d], [x + sx, y + sy, BACK[d]]]) {
          const nd = this.node(nx, ny);
          const rec = this.nodes.get(nd.key) ?? { x: nd.x, y: nd.y, inside: nd.inside, bits: 0, tip: false, ends: [] };
          rec.bits |= bit;
          this.nodes.set(nd.key, rec);
        }
      }
      for (const l of p.lines) {
        l.ends.forEach((e, j) => {
          const rec = this.nodes.get(this.node(...(j ? l.pts.at(-1) : l.pts[0])).key);
          if (!rec) return;
          rec.ends.push(e);
          if (e === 'tip') rec.tip = true;
        });
      }
      return i;
    });
  }

  /** Whether a node has anything on it. */
  taken(x, y) {
    return (this.nodes.get(this.key(x, y))?.bits ?? 0) !== 0;
  }

  /**
   * How a free end is finished, for a node left one way only (`out` is the way
   * it points): the counter's short round end; off the block, open (cut);
   * facing something a bar away, flat, as the A and the H stop on the
   * crossbar (and as a block stands on what is under it); on the ground
   * (`ground`), a flat foot; otherwise as the piece has it, a free end round
   * in a cut block and flat on a building block.
   */
  finish(rec, out, ground = false) {
    const declared = rec.ends[0] ?? 'free';
    if (declared === 'tip') return 'tip';
    if (!rec.inside) return 'open';
    const [sx, sy] = STEP[out];
    if (this.taken(rec.x + sx, rec.y + sy)) return 'flat';
    if (ground && out === S && rec.y === this.m - 1) return 'flat';
    if (declared === 'free') return this.cut ? 'round' : 'flat';
    return declared;
  }

  /**
   * The drawing: every line as it is to be drawn, the pieces clicked together.
   * Each run belongs to one line; a line goes straight through a T and on
   * round a bend, and stops at a free end (finished as finish() says) or where
   * it meets another's side (butt: the other covers it). Closed rings are
   * lines whose first point is their last. Points in nodes, not wrapped.
   */
  lines({ ground = false } = {}) {
    const seen = new Set();
    const out = [];
    // Which way a line goes on from a node, having come in from `from` (a way out of it), or 0.
    const onward = (rec, from) => {
      const rest = rec.bits & ~from;
      if (degree(rec.bits) === 2) return rest;
      if (degree(rec.bits) === 3 && rec.bits & BACK[from]) return BACK[from];
      return 0;
    };
    // A free end points away from its line: back from the first run, on past the last.
    const endAt = (rec, out) => (degree(rec.bits) === 1 ? this.finish(rec, out, ground) : 'butt');
    const walk = (first, d) => {
      const pts = [[first.x, first.y]];
      let x = first.x, y = first.y;
      let cur = first;
      let dir = d;
      for (;;) {
        const k = this.runKey(x, y, dir);
        if (seen.has(k)) break;
        seen.add(k);
        const [sx, sy] = STEP[dir];
        x += sx; y += sy;
        pts.push([x, y]);
        cur = this.nodes.get(this.node(x, y).key);
        const next = onward(cur, BACK[dir]);
        if (!next || seen.has(this.runKey(x, y, next))) break;
        dir = next;
      }
      const closed = pts.length > 2 && cur === first;
      return { pts, closed, ends: closed ? ['butt', 'butt'] : [endAt(first, BACK[d]), endAt(cur, dir)] };
    };
    for (const rec of this.nodes.values()) {
      for (const d of DIRS) {
        if (!(rec.bits & d) || onward(rec, d)) continue; // not a start: a line comes through here
        if (seen.has(this.runKey(rec.x, rec.y, d))) continue;
        out.push(walk(rec, d));
      }
    }
    for (const rec of this.nodes.values()) {
      for (const d of DIRS) if (rec.bits & d && !seen.has(this.runKey(rec.x, rec.y, d))) out.push(walk(rec, d));
    }
    return out;
  }
}

/** Pieces on an N × M board, or null when they do not fit together. */
export function boardOf(pieces, opts) {
  const b = new Board(opts);
  for (const p of pieces) {
    if (!b.fits([p])) return null;
    b.add([p]);
  }
  return b;
}

// ---------------------------------------------------------------------------
// Drawing

/** Push an end point outward along its segment by d (as mark.js); a negative d pulls it back. */
function extend(points, atEnd, d) {
  const pts = points.map((q) => [...q]);
  const [a, e] = atEnd ? [pts.at(-2), pts.at(-1)] : [pts[1], pts[0]];
  const len = Math.hypot(e[0] - a[0], e[1] - a[1]) || 1;
  e[0] += ((e[0] - a[0]) / len) * d;
  e[1] += ((e[1] - a[1]) / len) * d;
  return pts;
}

/** A polyline without the points it only passes straight through. */
function corners(pts) {
  return pts.filter((p, i) => {
    if (i === 0 || i === pts.length - 1) return true;
    const a = pts[i - 1];
    const b = pts[i + 1];
    return (p[0] - a[0]) * (b[1] - p[1]) - (p[1] - a[1]) * (b[0] - p[0]) !== 0;
  });
}

/** A polyline as a path with each bend filleted at radius r (as modular.js). */
function filleted(points, r) {
  let d = `M${f(points[0][0])} ${f(points[0][1])}`;
  for (let i = 1; i < points.length - 1; i++) {
    const [ax, ay] = points[i - 1];
    const [bx, by] = points[i];
    const [cx, cy] = points[i + 1];
    const l1 = Math.hypot(bx - ax, by - ay);
    const l2 = Math.hypot(cx - bx, cy - by);
    const k = Math.min(r, l1 / 2, l2 / 2);
    if (k <= 0.01) { d += `L${f(bx)} ${f(by)}`; continue; }
    const p1 = [bx - ((bx - ax) / l1) * k, by - ((by - ay) / l1) * k];
    const p2 = [bx + ((cx - bx) / l2) * k, by + ((cy - by) / l2) * k];
    const sweep = (bx - ax) * (cy - by) - (by - ay) * (cx - bx) > 0 ? 1 : 0;
    d += `L${f(p1[0])} ${f(p1[1])}A${f(k)} ${f(k)} 0 0 ${sweep} ${f(p2[0])} ${f(p2[1])}`;
  }
  const last = points.at(-1);
  return d + `L${f(last[0])} ${f(last[1])}`;
}

/**
 * A line in mark units, ready to stroke w wide (a slot, or a block) with flat
 * ends: its points (the ends moved as they are finished: a flat end carried
 * on half the width, so what it faces keeps a slot or a bar clear; an open
 * one well past the edge; the counter's pulled back), the round ends'
 * centres, and w. A ring starts halfway along a run, so every corner is a
 * bend. `reach`: how far past the node off the block an open end runs.
 */
export function unitLine({ pts, ends, closed }, ox = 0, oy = 0, reach = PITCH, w = SLOT) {
  let q = pts.map(([x, y]) => [at(x) + ox, at(y) + oy]);
  if (closed) {
    const m = [(q[0][0] + q[1][0]) / 2, (q[0][1] + q[1][1]) / 2];
    return { pts: corners([m, ...q.slice(1), m]), dots: [], closed: true, w };
  }
  q = corners(q);
  const dots = [];
  ends.forEach((e, i) => {
    const atEnd = i === 1;
    if (e === 'flat') q = extend(q, atEnd, w / 2);
    else if (e === 'open') q = extend(q, atEnd, reach);
    else if (e === 'tip') q = extend(q, atEnd, TIP - PITCH);
    if (e === 'round' || e === 'tip') dots.push(atEnd ? q.at(-1) : q[0]);
  });
  return { pts: q, dots, closed: false, w };
}

/** Path data for unit lines: the centre lines, filleted at the mark's bend. */
export const lineD = (ul) => ul.map((l) => filleted(l.pts, BEND) + (l.closed ? 'Z' : '')).join('');

/**
 * Lines as SVG: one stroke as wide as they are (or `width`), flat-ended,
 * filleted, and a disc at each round end, all in color. Returns a string of
 * elements.
 */
export function strokesSVG(ul, color, width = ul[0]?.w ?? SLOT) {
  if (!ul.length) return '';
  const r = width / 2;
  const dots = ul.flatMap((l) => l.dots).map(([x, y]) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}"/>`).join('');
  return `<path d="${lineD(ul)}" fill="none" stroke="${color}" stroke-width="${f(width)}" stroke-linejoin="round"/>${dots ? `<g fill="${color}">${dots}</g>` : ''}`;
}

/**
 * The ink's box of unit lines, in mark units: [x0, y0, x1, y1]. Each run
 * covers half its width to each side of it and ends where it ends (a flat
 * end is already carried on); a round end reaches half its width further.
 */
export function inkBox(ul) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const add = (ax, ay, bx, by) => { x0 = Math.min(x0, ax); y0 = Math.min(y0, ay); x1 = Math.max(x1, bx); y1 = Math.max(y1, by); };
  for (const l of ul) {
    const HALF = (l.w ?? SLOT) / 2;
    for (let i = 1; i < l.pts.length; i++) {
      const [ax, ay] = l.pts[i - 1];
      const [bx, by] = l.pts[i];
      const across = Math.abs(bx - ax) > Math.abs(by - ay);
      add(Math.min(ax, bx) - (across ? 0 : HALF), Math.min(ay, by) - (across ? HALF : 0), Math.max(ax, bx) + (across ? 0 : HALF), Math.max(ay, by) + (across ? HALF : 0));
    }
    for (const [x, y] of l.dots) add(x - HALF, y - HALF, x + HALF, y + HALF);
  }
  return [x0, y0, x1, y1];
}

/** A lone piece's lines as it is drawn on its own (its own ends), in mark units, w wide (a block's, unless asked), its first node at half that. */
export function pieceLines(p, w = BLOCK) {
  const [bx, by] = box(p);
  const b = boardOf([moved(p, -bx, -by)], { N: 64, M: 64 });
  return b.lines().map((l) => unitLine(l, w / 2 - at(0), w / 2 - at(0), PITCH, w));
}

