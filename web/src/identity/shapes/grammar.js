// Symbols and patterns built from the kit (kit.js), by a small seeded grammar.
//
// A symbol is a few kit pieces on a grid of nodes (3 × 3 up to 6 × 6, or a
// taller or wider stack), clicked together as the mark's slots are: end to
// end, round a bend, or into a T. Two ways to build: 'blocks', the pieces
// themselves as solid shapes stacked on the ground, and 'cut', the pieces as
// slots cut out of a solid block, running off its edges as the mark's do,
// so those are the S M's family.
//
// The grammar places a piece at a time (a kind, its lengths, a turn, a
// mirroring, a place, often clicked onto what is there), with each of its
// images under the chosen symmetry: none, mirror, 2-fold (a half turn) or
// 4-fold (the square's: its turns and its mirrors). The board refuses
// anything that overlaps, crosses or touches without a join. Many tries are
// made for each symbol and the best is kept, judged for: few pieces, filling
// its grid, a weight of ink near the density asked for, holding together
// (blocks stand on the ground or on each other, a bar apart; a cut block
// does not fall into crumbs or stripes, and its slots reach its edges),
// a strong silhouette, a counter or a stud, and a little character (a T, a
// bend, a round end); not a plain letter. Whatever spins, a pinwheel that
// could read as a swastika, is never kept (spins()).
//
// Patterns are the same grammar on a grid whose far edges join its near ones
// (a running border joins left to right, a field on all four sides), so they
// repeat without a seam; and a small symbol set out on a plate in turns.

import { Board, piece, mapPiece, signature, box } from './kit.js';

/** A seeded random number generator: mulberry32. */
export function random(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A seed from anything: FNV-1a over its text. */
export function hash(...parts) {
  const text = parts.join('|');
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

const pick = (rng, list) => list[Math.floor(rng() * list.length)];
const tables = new WeakMap(); // a weight table as [key, weight] pairs and their total, worked out once
function weighted(rng, table) {
  let t = tables.get(table);
  if (!t) { const list = Object.entries(table); t = { list, total: list.reduce((a, [, w]) => a + w, 0) }; tables.set(table, t); }
  let r = rng() * t.total;
  for (const [k, w] of t.list) if ((r -= w) < 0) return k;
  return t.list[0][0];
}
const int = (rng, a, b) => a + Math.floor(rng() * (b - a + 1));

// How often each piece is reached for. The slot and the bend are the
// mark's own; the closed end is the M; the counter is rare, a detail.
const KINDS = {
  blocks: { slot: 3, bend: 3, hook: 1.4, join: 1.3, end: 2.3, counter: 1.1 },
  cut: { slot: 3, bend: 3, hook: 1.4, join: 1, end: 2.6, counter: 0.7 },
};

/**
 * The images of a point under a symmetry, on a grid of n × m nodes (or a
 * pattern's repeat, where a mirror is taken about the repeat's middle).
 */
export function symmetry(name, n, m) {
  const X = (x) => n - 1 - x;
  const Y = (y) => m - 1 - y;
  const id = (p) => p;
  switch (name) {
    case 'mirror': return [id, ([x, y]) => [X(x), y]];
    case '2-fold': return [id, ([x, y]) => [X(x), Y(y)]];
    case 'both': return [id, ([x, y]) => [X(x), y], ([x, y]) => [x, Y(y)], ([x, y]) => [X(x), Y(y)]];
    case '4-fold': // the square's eight: four turns, four mirrors
      return [id, ([x, y]) => [X(x), y], ([x, y]) => [x, Y(y)], ([x, y]) => [X(x), Y(y)],
        ([x, y]) => [y, x], ([x, y]) => [Y(y), x], ([x, y]) => [y, X(x)], ([x, y]) => [Y(y), X(x)]];
    default: return [id];
  }
}

/** A piece's images under the maps, each once (an image that lands on another is the same piece). */
function images(p, maps) {
  if (maps.length === 1) return [p];
  const out = [];
  const seen = new Set();
  for (const fn of maps) {
    const q = mapPiece(p, fn);
    const sig = signature(q);
    if (!seen.has(sig)) { seen.add(sig); out.push(q); }
  }
  return out;
}

/** Lengths for a kind of piece on an n × m grid; `long`, from the top of the range (a first piece, a skeleton). */
function sizeFor(kind, rng, n, m, long = false) {
  const L = Math.max(2, Math.max(n, m) - 1);
  const len = (a, b) => (long ? int(rng, Math.ceil((a + b) / 2), b) : int(rng, a, b));
  switch (kind) {
    case 'slot': return [len(1, L)];
    case 'bend': return [len(1, Math.min(3, L)), len(1, Math.min(3, L))];
    case 'hook': return [len(1, 2), 1, len(1, 2)];
    case 'join': return [len(1, 2), len(1, 2), len(1, 2)];
    case 'end': return [len(1, L)];
    default: return [];
  }
}

// ---------------------------------------------------------------------------
// Reading a composition

/**
 * What a board holds, for judging it: the runs inside, the ink's box and
 * middle, its free ends by finish, the T's, bends and rings, its separate
 * parts, and how they meet (stacked, side by side, or not at all).
 */
function read(board, ctx) {
  const { n, m } = board;
  const out = { runs: 0, ends: { round: 0, flat: 0, open: 0, tip: 0 }, ts: 0, bends: 0, box: [Infinity, Infinity, -Infinity, -Infinity], cx: 0, cy: 0 };
  // Parts: union-find over the nodes the runs join.
  const parent = new Map();
  const find = (k) => { while (parent.get(k) !== k) { parent.set(k, parent.get(parent.get(k))); k = parent.get(k); } return k; };
  const join = (a, b) => { parent.set(find(a), find(b)); };
  for (const [k, rec] of board.nodes) {
    parent.set(k, k);
    if (rec.inside) {
      out.box[0] = Math.min(out.box[0], rec.x); out.box[1] = Math.min(out.box[1], rec.y);
      out.box[2] = Math.max(out.box[2], rec.x); out.box[3] = Math.max(out.box[3], rec.y);
    }
    const deg = (rec.bits & 1) + ((rec.bits >> 1) & 1) + ((rec.bits >> 2) & 1) + ((rec.bits >> 3) & 1);
    if (deg === 3) out.ts++;
    if (deg === 2 && rec.bits !== 5 && rec.bits !== 10) out.bends++;
    if (deg === 1) {
      const outWay = { 1: 4, 2: 8, 4: 1, 8: 2 }[rec.bits];
      out.ends[board.finish(rec, outWay, ctx.gravity)]++;
    }
  }
  for (const [k, rec] of board.nodes) {
    if (rec.bits & 1) join(k, board.node(rec.x + 1, rec.y).key);
    if (rec.bits & 2) join(k, board.node(rec.x, rec.y + 1).key);
  }
  let sx = 0, sy = 0;
  for (const rec of board.nodes.values()) {
    if (rec.inside && rec.bits & 1 && board.node(rec.x + 1, rec.y).inside) { out.runs++; sx += rec.x + 0.5; sy += rec.y; }
    if (rec.inside && rec.bits & 2 && board.node(rec.x, rec.y + 1).inside) { out.runs++; sx += rec.x; sy += rec.y + 0.5; }
  }
  out.cx = out.runs ? sx / out.runs / Math.max(1, n - 1) : 0.5;
  out.cy = out.runs ? sy / out.runs / Math.max(1, m - 1) : 0.5;
  const parts = new Map();
  for (const k of board.nodes.keys()) {
    const r = find(k);
    parts.set(r, [...(parts.get(r) ?? []), k]);
  }
  out.parts = [...parts.values()];
  // Contacts: two parts a bar apart, face to face (stacked, or clicked end to end across a bar).
  const partOf = new Map();
  out.parts.forEach((keys, i) => keys.forEach((k) => partOf.set(k, i)));
  // A stub: a part of a single run that is not a counter (a stud). Contacts count between parts that are more than that.
  const runsIn = out.parts.map((keys) => keys.length - 1);
  const stud = out.parts.map((keys) => keys.some((k) => board.nodes.get(k).tip));
  out.stubs = runsIn.filter((n, i) => n <= 1 && !stud[i]).length;
  const touching = new Set();
  const stacked = new Set();
  out.contacts = 0; // one resting on another, a bar above it: a stack (side by side is only two things)
  out.faces = 0; // node pairs of two parts a bar apart, either way
  for (const [k, rec] of board.nodes) {
    for (const [bit, dx, dy] of [[1, 1, 0], [2, 0, 1]]) {
      if (rec.bits & bit) continue;
      const nk = board.node(rec.x + dx, rec.y + dy).key;
      const j = partOf.get(nk);
      const i = partOf.get(k);
      if (j === undefined || j === i) continue;
      touching.add(j).add(i);
      out.faces++;
      if (dy) stacked.add(j).add(i);
      if (dy && (runsIn[i] > 1 || stud[i]) && (runsIn[j] > 1 || stud[j])) out.contacts++;
    }
  }
  out.loose = out.parts.length > 1 ? out.parts.length - touching.size : 0;
  out.apart = out.parts.length > 1 ? touching.size - [...touching].filter((i) => stacked.has(i)).length : 0; // side by side only
  // Rings: runs beyond a tree (every run counted, off the block too).
  let all = 0;
  for (const rec of board.nodes.values()) all += (rec.bits & 1 ? 1 : 0) + (rec.bits & 2 ? 1 : 0);
  out.rings = all - board.nodes.size + out.parts.length;
  return out;
}

/**
 * Whether every part stands: on the ground (the bottom row) or on a part
 * that stands, directly under one of its nodes, a bar below.
 */
function stands(board, parts) {
  const { m } = board;
  const standing = new Set();
  const partOf = new Map();
  parts.forEach((keys, i) => keys.forEach((k) => partOf.set(k, i)));
  let changed = true;
  while (changed) {
    changed = false;
    parts.forEach((keys, i) => {
      if (standing.has(i)) return;
      const ok = keys.some((k) => {
        const rec = board.nodes.get(k);
        if (!rec.inside) return false;
        if (rec.y === m - 1) return true;
        if (rec.bits & 2) return false; // it goes on down itself
        const below = board.node(rec.x, rec.y + 1).key;
        const j = partOf.get(below);
        return j !== undefined && j !== i && standing.has(j);
      });
      if (ok) { standing.add(i); changed = true; }
    });
  }
  return standing.size === parts.length;
}

/**
 * The parts a cut block falls into, on a fine grid: each bar square, each
 * run between two nodes, each node, is solid unless a slot takes it. Returns
 * the parts' sizes, in bar squares.
 */
function crumbs(board) {
  const { n, m } = board;
  const W = 2 * n + 1, H = 2 * m + 1;
  const solid = new Uint8Array(W * H);
  const has = (x, y, bit) => ((board.nodes.get(board.node(x, y).key)?.bits ?? 0) & bit) !== 0;
  for (let Y = 0; Y < H; Y++) {
    for (let X = 0; X < W; X++) {
      const i = (X - 1) / 2, j = (Y - 1) / 2;
      let ink = false;
      if (X % 2 && Y % 2) ink = board.taken(i, j);
      else if (X % 2) ink = has(i, Y / 2 - 1, 2); // the run down from the node above
      else if (Y % 2) ink = has(X / 2 - 1, j, 1); // the run right from the node to the left
      solid[Y * W + X] = ink ? 0 : 1;
    }
  }
  const seen = new Uint8Array(W * H);
  const sizes = [];
  let plain = 0; // parts that are only a straight bar, a stripe
  for (let s = 0; s < W * H; s++) {
    if (!solid[s] || seen[s]) continue;
    let bars = 0;
    const xs = new Set(), ys = new Set();
    const stack = [s];
    seen[s] = 1;
    while (stack.length) {
      const c = stack.pop();
      const x = c % W, y = (c - x) / W;
      xs.add(x >> 1); ys.add(y >> 1);
      if (!(x % 2) && !(y % 2)) bars++;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const nc = ny * W + nx;
        if (solid[nc] && !seen[nc]) { seen[nc] = 1; stack.push(nc); }
      }
    }
    sizes.push(bars);
    if (bars >= 3 && (xs.size === 1 || ys.size === 1)) plain++;
  }
  sizes.plain = plain;
  return sizes;
}

/**
 * Whether a figure spins: reads as a pinwheel, which can read as a swastika,
 * and is never wanted. Two tests, either is enough:
 * - it looks much more like itself turned a quarter than like any of its
 *   mirror images (on a fine grid of its nodes and runs, allowing half a
 *   step's slip), which also catches pinwheels of separate pieces;
 * - not a mirror image of itself, it has a hub (a knot of T's, a run or two
 *   apart) with arms going all four ways, of which three or more bend, or
 *   two or more bend and all the same way.
 */
export function spins(board) {
  const nodes = board.nodes;
  const bits = (x, y) => nodes.get(board.node(x, y).key)?.bits ?? 0;
  const deg = (b) => (b & 1) + ((b >> 1) & 1) + ((b >> 2) & 1) + ((b >> 3) & 1);
  const STEP = { 1: [1, 0], 2: [0, 1], 4: [-1, 0], 8: [0, -1] };
  const BACK = { 1: 4, 2: 8, 4: 1, 8: 2 };
  // The nodes and runs as cells of a fine grid, centred on the ink's middle, to compare the figure
  // with itself turned and mirrored (allowing half a step's slip).
  const cells = [];
  for (const r of nodes.values()) {
    cells.push([2 * r.x, 2 * r.y]);
    if (r.bits & 1) cells.push([2 * r.x + 1, 2 * r.y]);
    if (r.bits & 2) cells.push([2 * r.x, 2 * r.y + 1]);
  }
  if (cells.length < 6) return false;
  const xs = cells.map((c) => c[0]), ys = cells.map((c) => c[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const id = (x, y) => (x + 512) * 2048 + (y + 512);
  const set = new Set(cells.map(([x, y]) => id(x, y)));
  const like = (fn) => {
    let best = 0;
    for (const [sx, sy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [0.5, 0.5], [-0.5, 0.5], [0.5, -0.5], [-0.5, -0.5]]) {
      let hits = 0;
      for (const [x, y] of cells) {
        const [u, v] = fn(x - cx, y - cy);
        const X = u + cx + sx, Y = v + cy + sy;
        if (Number.isInteger(X) && Number.isInteger(Y) && set.has(id(X, Y))) hits++;
      }
      best = Math.max(best, hits / cells.length);
    }
    return best;
  };
  const quarter = like((x, y) => [-y, x]);
  const mirror = Math.max(like((x, y) => [-x, y]), like((x, y) => [x, -y]), like((x, y) => [y, x]), like((x, y) => [-y, -x]));
  // Exactly the same turned a quarter and in no mirror; or much more like its quarter turn than any mirror.
  if (quarter === 1 && mirror < 1) return true;
  if (quarter >= 0.6 && quarter - mirror >= 0.2) return true;
  if (mirror === 1) return false; // a mirror image of itself never spins
  // Hubs: T's joined to each other by a straight path of at most two runs.
  const seen = new Set();
  for (const t0 of nodes.values()) {
    const k0 = board.node(t0.x, t0.y).key;
    if (deg(t0.bits) !== 3 || seen.has(k0)) continue;
    const hub = [t0];
    seen.add(k0);
    for (let i = 0; i < hub.length; i++) {
      const h = hub[i];
      for (const d of [1, 2, 4, 8]) {
        if (!(h.bits & d)) continue;
        let [x, y] = [h.x, h.y];
        for (let k = 0; k < 2; k++) {
          x += STEP[d][0]; y += STEP[d][1];
          const b = bits(x, y);
          if (deg(b) === 3) {
            const key = board.node(x, y).key;
            if (!seen.has(key)) { seen.add(key); hub.push(nodes.get(key)); }
            break;
          }
          if (b !== (d | BACK[d])) break; // it bends or ends
        }
      }
    }
    // The arms: each way out of the hub that does not lead back into it; which way each first turns.
    const inHub = new Set(hub.map((h) => board.node(h.x, h.y).key));
    const ways = new Set();
    const turns = { 1: 0, [-1]: 0 };
    for (const h of hub) {
      for (const d of [1, 2, 4, 8]) {
        if (!(h.bits & d)) continue;
        let [x, y] = [h.x, h.y];
        let reached = false;
        for (let k = 0; k < 64; k++) {
          x += STEP[d][0]; y += STEP[d][1];
          if (inHub.has(board.node(x, y).key)) { reached = true; break; }
          const b = bits(x, y);
          if (b === (d | BACK[d])) continue;
          if (deg(b) === 2) {
            const nd = b & ~BACK[d];
            const [ax, ay] = STEP[d], [bx, by] = STEP[nd];
            turns[Math.sign(ax * by - ay * bx)]++;
          }
          break;
        }
        if (!reached) ways.add(d);
      }
    }
    // Arms all four ways, and those that bend all bend the same way, or three or more bend at all.
    const bent = turns[1] + turns[-1];
    if (ways.size === 4 && ((Math.min(turns[1], turns[-1]) === 0 && bent >= 2) || bent >= 3)) return true;
  }
  return false;
}

/**
 * What makes a figure read as a letter: arms (a straight run of two or more
 * ending in the air: an ascender, the b's and d's, a T's stem), feet (the same
 * standing on the ground), and stems (straight lines the full height or width
 * of its box, of which two side by side are an H, a U, a ladder).
 */
function letterish(board, box, ground = false) {
  const BACK = { 1: 4, 2: 8, 4: 1, 8: 2 };
  const STEP = { 1: [1, 0], 2: [0, 1], 4: [-1, 0], 8: [0, -1] };
  const bits = (x, y) => board.nodes.get(board.node(x, y).key)?.bits ?? 0;
  let arms = 0, feet = 0;
  for (const rec of board.nodes.values()) {
    if (!rec.inside || rec.tip || ![1, 2, 4, 8].includes(rec.bits)) continue;
    const d = rec.bits;
    let [x, y] = [rec.x, rec.y];
    let run = 0;
    for (;;) {
      x += STEP[d][0]; y += STEP[d][1];
      run++;
      if (bits(x, y) !== (d | BACK[d])) break;
    }
    if (run < 2) continue;
    if (ground && d === 8 && rec.y === board.m - 1) feet++;
    else arms++;
  }
  let tall = 0, wide = 0;
  const h = box[3] - box[1], w = box[2] - box[0];
  for (const l of board.lines()) {
    if (l.pts.length !== 2 || l.closed) continue;
    const [[ax, ay], [bx, by]] = l.pts;
    if (ax === bx && h >= 2 && Math.abs(by - ay) >= h) tall++;
    if (ay === by && w >= 2 && Math.abs(bx - ax) >= w) wide++;
  }
  return { arms, feet, stems: Math.max(0, tall - 1) + Math.max(0, wide - 1) };
}

/** Whether a part crosses the mirror's axis (the middle column, or the runs across the middle). */
function crossesAxis(board, parts) {
  const { n } = board;
  const mid = (n - 1) / 2;
  return parts.some((keys) => keys.some((k) => {
    const rec = board.nodes.get(k);
    if (!rec.inside) return false;
    if (Number.isInteger(mid)) return rec.x === mid;
    return rec.x === Math.floor(mid) && rec.bits & 1;
  }));
}

/** How much of the edge of a box of nodes the runs cover: 1 for a frame. */
function edgeShare(board, [x0, y0, x1, y1]) {
  let edge = 0, around = 0;
  const bits = (x, y) => board.nodes.get(board.node(x, y).key)?.bits ?? 0;
  for (let x = x0; x < x1; x++) for (const y of [y0, y1]) { around++; if (bits(x, y) & 1) edge++; }
  for (let y = y0; y < y1; y++) for (const x of [x0, x1]) { around++; if (bits(x, y) & 2) edge++; }
  return around ? edge / around : 0;
}

/** A score for a board: higher is better; -Infinity when it is not wanted at all. */
function judge(board, groups, ctx) {
  const r = read(board, ctx);
  if (!r.runs) return -Infinity;
  const { n, m } = board;
  let s = 0;
  const spanX = n > 1 ? (r.box[2] - r.box[0]) / (n - 1) : 1;
  const spanY = m > 1 ? (r.box[3] - r.box[1]) / (m - 1) : 1;
  const total = n * (m - 1) + m * (n - 1);
  const dens = r.runs / total;
  s -= 9 * Math.abs(dens - ctx.target);
  s -= 0.3 * Math.max(0, groups.length - 2);
  s -= 0.12 * Math.max(0, r.ends.round - 2);
  s += 0.2 * Math.min(r.ts, 3) + 0.07 * Math.min(r.bends, 6);
  // Character: the more of the mark's details it has, the better (a T, a bend, a round end, a stud, a ring).
  const kinds = [r.ts, r.bends, r.ends.round, r.ends.flat + r.ends.open, r.ends.tip, r.rings].filter(Boolean).length;
  s += 0.18 * kinds;
  if (ctx.sym === 'none') s -= 3 * Math.hypot(r.cx - 0.5, r.cy - 0.5);
  if (ctx.cut) {
    // The block keeps its silhouette; the slots reach across it and off its edges, as the mark's.
    s -= 2 * Math.max(0, 0.8 - spanX) + 2 * Math.max(0, 0.8 - spanY);
    if (!r.ends.open) s -= 1.5;
    s += 0.25 * Math.min(r.ends.open, 4);
    const sizes = crumbs(board);
    const all = sizes.reduce((a, b) => a + b, 0);
    const small = sizes.filter((z) => z <= 1).length;
    if (small > 4) return -Infinity;
    s -= 0.3 * small + 0.35 * Math.max(0, sizes.length - 3);
    if (sizes.plain) return -Infinity; // never a stripe sliced off the block
    if (Math.max(...sizes) < 0.4 * all) s -= 1;
    // A slot reaches the edge, as the mark's do (the counter apart): a slot floating inside is a dash.
    const floating = r.parts.filter((keys) => keys.every((k) => { const rec = board.nodes.get(k); return rec.inside && !rec.tip; })).length;
    s -= 0.8 * floating;
  } else {
    // A figure fills its grid, holds together and (unturned) stands up.
    s -= 3 * (2 - spanX - spanY);
    if (ctx.gravity && !stands(board, r.parts)) return -Infinity;
    // One figure, or a clean stack: parts that rest on each other, a bar apart, face to face. Not
    // crumbs: a part on its own is loose, a lone short dash is fussy.
    const np = r.parts.length;
    // Building blocks: one figure, or two that rest on each other face to face. No crumbs.
    if (np > 2) return -Infinity;
    if (np === 2) {
      const small = r.parts.filter((keys) => keys.length <= 3 && !keys.some((k) => board.nodes.get(k).tip)).length;
      if (small || r.faces < 2) return -Infinity;
    }
    s += np === 1 ? 0.7 : 0;
    s -= 1 * r.loose + 1.3 * r.stubs + 0.6 * r.apart;
    // Not a letter: no arms in the air, no two stems side by side; a mirror image is one mass across its axis.
    const L = letterish(board, r.box, ctx.gravity);
    s -= 1.5 * L.arms + 0.8 * L.feet + 3 * L.stems;
    if (ctx.sym === 'mirror' && !crossesAxis(board, r.parts)) s -= 2;
    s += 0.3 * Math.min(r.contacts, 3);
    s += 0.1 * Math.min(r.ends.flat, 4);
    s += 0.6 * Math.min(r.rings, 2) + 0.3 * Math.min(r.ends.tip, 2); // closed, and a stud or two
    if (!r.rings && !r.ends.tip) s -= 0.5; // neither a counter nor a stud: open strokes, a letter
    // A strong silhouette: how much of the edge of its box the figure holds (a frame all, an H little).
    s += 1.1 * edgeShare(board, r.box);
    // Character: at least two of the mark's joins and details, or it is a plain letter.
    const traits = [r.ts, r.bends, r.rings, r.ends.tip, r.contacts, r.ends.round >= 2].filter(Boolean).length;
    if (traits < 2) s -= 1;
    // Not a plain letter: one figure of a few straight strokes (an H, an I, a T), one bent stroke, or a bare ring.
    if (r.parts.length === 1) {
      const lines = board.lines();
      const straight = lines.every((l) => l.pts.length === 2 || l.pts.every((q) => q[0] === l.pts[0][0]) || l.pts.every((q) => q[1] === l.pts[0][1]));
      if (straight && lines.length <= 3) s -= 2.5;
      else if (lines.length === 1) s -= lines[0].closed ? 1.2 : 0.9;
    }
  }
  return s;
}

// ---------------------------------------------------------------------------
// Building

/** Where a piece might go: anywhere it fits in the grid, or clicked onto a node that is taken. */
function place(rng, p, board, ctx) {
  const [x0, y0, x1, y1] = box(p);
  const w = x1 - x0, h = y1 - y0;
  const { n, m } = board;
  const taken = [...board.nodes.values()].filter((r) => r.inside);
  if (taken.length && rng() < ctx.click) {
    // One of its ends onto a taken node (a T, or end to end), or a bar above one (stacked).
    const t = pick(rng, taken);
    const l = pick(rng, p.lines);
    const [ex, ey] = rng() < 0.5 ? l.pts[0] : l.pts.at(-1);
    const up = !ctx.cut && rng() < 0.3 ? 1 : 0;
    return mapPiece(p, ([x, y]) => [x - ex + t.x, y - ey + t.y - up]);
  }
  if (ctx.wrap) return mapPiece(p, ([x, y]) => [x - x0 + int(rng, 0, n - 1), y - y0 + int(rng, 0, m - 1)]);
  if (w > n - 1 || h > m - 1) return null;
  let x = int(rng, 0, n - 1 - w);
  let y = int(rng, 0, m - 1 - h);
  if (!ctx.cut && ctx.gravity && rng() < 0.5) y = m - 1 - h; // on the ground
  if (ctx.cut && rng() < 0.4) { if (rng() < 0.5) x = rng() < 0.5 ? 0 : n - 1 - w; else y = rng() < 0.5 ? 0 : m - 1 - h; } // at an edge
  return mapPiece(p, ([px, py]) => [px - x0 + x, py - y0 + y]);
}

/** Cut: a slot's end at the block's edge, pointing out, often runs on off it, as the mark's do. */
function openEnds(rng, p, board) {
  const { n, m } = board;
  return { ...p, lines: p.lines.map((l) => {
    let pts = l.pts.map((q) => [...q]);
    const ends = [...l.ends];
    for (const atEnd of [false, true]) {
      if (ends[+atEnd] === 'tip' || rng() > 0.72) continue;
      const e = atEnd ? pts.at(-1) : pts[0];
      const a = atEnd ? pts.at(-2) : pts[1];
      const dx = Math.sign(e[0] - a[0]), dy = Math.sign(e[1] - a[1]);
      const out = [e[0] + dx, e[1] + dy];
      const off = (!board.wrap[0] && (out[0] < 0 || out[0] >= n)) || (!board.wrap[1] && (out[1] < 0 || out[1] >= m));
      if (!off) continue;
      if (atEnd) pts[pts.length - 1] = out; else pts[0] = out;
    }
    return { pts, ends };
  }) };
}

/** One try: pieces placed one after another, each with its images. Returns { board, groups }. */
function attempt(rng, ctx) {
  const board = new Board({ N: ctx.n, M: ctx.m, cut: ctx.cut, wrap: ctx.wrap ?? [false, false] });
  const groups = [];
  const want = ctx.pieces(rng);
  let fails = 0;
  while (groups.length < want && fails < 28) {
    const kind = weighted(rng, ctx.kinds);
    let p = piece(kind, sizeFor(kind, rng, ctx.n, ctx.m, !groups.length && rng() < 0.6), { r: int(rng, 0, 3), m: rng() < 0.5 });
    p = place(rng, p, board, ctx);
    if (p && ctx.cut) p = openEnds(rng, p, board);
    const imgs = p && images(p, ctx.maps);
    if (!imgs || !board.fits(imgs)) { fails++; continue; }
    groups.push(board.add(imgs));
  }
  return { board, groups };
}

/** The settings of one try, for a grid, a symmetry, blocks or cut, and a density. */
function context({ n, m, sym, cut, density, wrap = null }) {
  const maps = symmetry(sym, n, m);
  const per = maps.length; // how many images a piece has, at most
  return {
    n, m, sym, cut, wrap, maps,
    gravity: !cut && !wrap && (sym === 'none' || sym === 'mirror'),
    kinds: KINDS[cut ? 'cut' : 'blocks'],
    click: cut ? 0.4 : 0.6,
    // The ink wanted: a share of the grid's runs.
    target: cut ? 0.14 + 0.24 * density : 0.26 + 0.3 * density,
    // How many pieces (before their images): few, fewer the more images each has.
    pieces: cut
      ? (rng) => Math.max(1, Math.round((per >= 4 ? 1.4 : per === 2 ? 2.2 : 3.4) + density * 1.6 + (rng() - 0.5) * 1.4))
      : (rng) => Math.max(1, Math.round((per >= 4 ? 1 : per === 2 ? 1.5 : 2.3) + density * 1.1 + (rng() - 0.5) * 1))
  };
}

/**
 * A symbol: the best of many tries for a seed. `grid` is [n, m] nodes;
 * `sym` none | mirror | 2-fold | 4-fold (4-fold wants a square grid, else
 * mirror); `build` blocks | cut; `density` 0 to 1; `avoid` (a gallery's
 * shapes so far) steers it off a repeat, and off a third frame. Returns
 * { n, m, sym, build, seed, score, pieces, groups, shape } (groups: the
 * pieces placed together, in order; shape: for telling repeats apart).
 */
export function symbol(seed, opts = {}) {
  const steps = symbolSteps(seed, opts);
  for (;;) { const r = steps.next(); if (r.done) return r.value; }
}

/**
 * The same search, a try at a time: a generator that yields after each try
 * and returns the symbol, so a page can spread it over several tasks (the
 * tries, and so the symbol, are the same however it is run).
 */
export function* symbolSteps(seed, { grid = [4, 4], sym = 'mirror', build = 'blocks', density = 0.5, tries = sym === '4-fold' ? 70 : 110, avoid = null } = {}) {
  const [n, m] = grid;
  if (sym === '4-fold' && n !== m) sym = 'mirror';
  const cut = build === 'cut';
  const rng = random(hash(seed, n, m, sym, build, density));
  // A character of its own: which pieces it reaches for most, and a little more or less ink.
  const ctx = context({ n, m, sym, cut, density: Math.min(1, Math.max(0, density + (rng() - 0.5) * 0.3)) });
  ctx.kinds = Object.fromEntries(Object.entries(ctx.kinds).map(([k, w]) => [k, w * (0.25 + 1.5 * rng())]));
  let best = null;
  for (let t = 0; t < tries; t++) {
    const { board, groups } = attempt(rng, ctx);
    let score = judge(board, groups, ctx) + rng() * 0.25;
    if (score > (best?.score ?? -Infinity) && spins(board)) score = -Infinity; // checked only for a try that would win
    if (avoid && score > (best?.score ?? -Infinity)) {
      if (avoid.has(shape(board))) score -= 8; // one already in the gallery
      if (!cut && (avoid.frames ?? 0) >= 2 && isFrame(board)) score -= 2; // two frames are enough
    }
    if (!best || score > best.score) best = { score, board, groups };
    yield t;
  }
  const { board, groups } = best;
  if (avoid && !cut && isFrame(board)) avoid.frames = (avoid.frames ?? 0) + 1;
  return { n, m, sym, build, seed, score: best.score, pieces: board.pieces, groups, shape: shape(board) };
}

/** Whether a figure is a frame: it holds (nearly) the whole edge of its box. */
function isFrame(board) {
  const b = [Infinity, Infinity, -Infinity, -Infinity];
  for (const r of board.nodes.values()) if (r.inside) { b[0] = Math.min(b[0], r.x); b[1] = Math.min(b[1], r.y); b[2] = Math.max(b[2], r.x); b[3] = Math.max(b[3], r.y); }
  return edgeShare(board, b) >= 0.9;
}

/** A board's runs as text, the same under any turn or mirroring of it: for telling repeats apart. */
export function shape(board) {
  const runs = [];
  for (const rec of board.nodes.values()) {
    if (rec.bits & 1) runs.push([rec.x + 0.5, rec.y]);
    if (rec.bits & 2) runs.push([rec.x, rec.y + 0.5]);
  }
  const maps = [([x, y]) => [x, y], ([x, y]) => [-x, y], ([x, y]) => [x, -y], ([x, y]) => [-x, -y], ([x, y]) => [y, x], ([x, y]) => [-y, x], ([x, y]) => [y, -x], ([x, y]) => [-y, -x]];
  let min = null;
  for (const fn of maps) {
    const q = runs.map(fn);
    const x0 = Math.min(...q.map((r) => r[0])), y0 = Math.min(...q.map((r) => r[1]));
    const t = q.map(([x, y]) => `${x - x0},${y - y0}`).sort().join(' ');
    if (min === null || t < min) min = t;
  }
  return min ?? '';
}

// The gallery's mix of grids and symmetries, dealt out by the seed.
const MIX_GRIDS = [[3, 3], [3, 3], [3, 3], [3, 3], [4, 4], [4, 4], [4, 4], [4, 4], [5, 5], [5, 5], [5, 5], [5, 5],
  [3, 4], [3, 4], [3, 4], [4, 3], [4, 3], [3, 5], [4, 6], [5, 3], [4, 5], [4, 5], [6, 6], [6, 6]];
const MIX_SYMS = ['mirror', 'mirror', 'mirror', 'mirror', 'mirror', 'mirror', 'mirror', 'mirror', 'mirror', 'mirror', 'mirror', 'mirror',
  'mirror', 'mirror', 'mirror', 'none', 'none', '2-fold', '2-fold', '2-fold', '2-fold', '4-fold', '4-fold', '4-fold'];
// Blocks are chunky: small grids, few pieces (the 4-fold ones get the fives).
const MIX_GRIDS_BLOCKS = [[3, 3], [3, 3], [3, 3], [3, 3], [3, 3], [3, 3], [4, 4], [4, 4], [4, 4], [4, 4], [4, 4], [4, 4],
  [4, 4], [3, 4], [3, 4], [3, 4], [4, 3], [4, 3], [4, 3], [3, 5], [5, 5], [5, 5], [5, 5], [5, 5]];
export const GRIDS = { '3 × 3': [3, 3], '4 × 4': [4, 4], '5 × 5': [5, 5], '6 × 6': [6, 6], 'tall 3 × 5': [3, 5], 'tall 4 × 6': [4, 6], 'wide 5 × 3': [5, 3], 'wide 6 × 4': [6, 4] };

function shuffled(rng, list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/**
 * The settings of the gallery's symbols for a seed: count of them, each a
 * grid and a symmetry (from the mix, or as chosen), so a reroll deals a new
 * spread. The 4-fold ones get the square grids.
 */
export function deal(seed, count, { grid = 'mix', sym = 'mix', build = 'blocks' } = {}) {
  const rng = random(hash('deal', seed));
  const grids = shuffled(rng, build === 'cut' ? MIX_GRIDS : MIX_GRIDS_BLOCKS);
  const syms = shuffled(rng, MIX_SYMS);
  const out = [];
  for (let i = 0; i < count; i++) {
    let g = grid === 'mix' ? grids[i % grids.length] : GRIDS[grid] ?? [4, 4];
    let s = sym === 'mix' ? syms[i % syms.length] : sym;
    if (s === '4-fold' && grid === 'mix' && (g[0] !== g[1] || g[0] < 5)) {
      // 4-fold wants a square of five or six: on less, only a bare ring or a ring and dashes fit.
      // Trade grids with a later one that is, or else take a five.
      const j = grids.findIndex((q, k) => k > i && q[0] === q[1] && q[0] >= 5);
      if (j >= 0) { [grids[i], grids[j]] = [grids[j], grids[i]]; g = grids[i]; } else g = [5, 5];
    }
    out.push({ seed: hash(seed, i), grid: g, sym: s });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Patterns

/**
 * A pattern. 'border' and 'field' are repeats of n × m nodes whose far edges
 * join their near ones, so they tile without a seam: a border runs left to
 * right (a band, its ends joined), a field repeats both ways. 'turns' sets a
 * small symbol out on a plate, four by four, each a quarter turn on from the
 * one before it along a row, and each row a quarter on from the one above;
 * the blocks a slot apart, so a cut symbol's open slots run into the gaps.
 * Returns { kind, n, m, wrap, pieces, build } ('turns': { kind, motif, n, m, build }).
 */
export function pattern(seed, kind, { build = 'blocks', density = 0.5 } = {}) {
  const rng = random(hash('pattern', kind, seed, build, density));
  const cut = build === 'cut';
  if (kind === 'turns') {
    // The motif: of five small symbols, the calmest with character (one figure, a ring or a T), turned.
    const k = pick(rng, [3, 3, 4]);
    let motif = null, most = -Infinity;
    for (let i = 0; i < 12; i++) {
      const c = symbol(hash(seed, 'motif', i), { grid: [k, k], sym: pick(rng, ['none', '2-fold', '2-fold']), build, density, tries: 40 });
      const b = new Board({ N: k, M: k, cut });
      b.add(c.pieces);
      const r = read(b, { gravity: false });
      const L = cut ? { arms: 0 } : letterish(b, r.box);
      const v = c.score + 0.8 * Math.min(r.rings, 1) + 0.3 * Math.min(r.ts, 1) - 0.6 * (r.parts.length - 1) - 2.5 * L.arms;
      if (v > most) { most = v; motif = c; }
    }
    return { kind, motif, n: k + 1, m: k + 1, cells: 4, wrap: [true, true], build };
  }
  const border = kind === 'border';
  const n = pick(rng, [4, 6]);
  const m = border ? pick(rng, [2, 3]) : n;
  const wrap = border ? [true, false] : [true, true];
  const sym = border ? pick(rng, ['mirror', 'mirror', '2-fold', 'none']) : pick(rng, ['both', 'both', '2-fold']);
  const ctx = context({ n, m, sym, cut, density, wrap });
  ctx.gravity = false;
  ctx.pieces = (r) => Math.max(1, Math.round((sym === 'both' ? 1.6 : 2.4) + density * 1.4 + (r() - 0.5)));
  let best = null;
  for (let t = 0; t < (border ? 240 : 60); t++) {
    const { board, groups } = attempt(rng, ctx);
    let s = judgePattern(board, groups, ctx);
    s += rng() * 0.2;
    if (s > (best?.s ?? -Infinity) && spins(board)) s = -Infinity;
    if (!best || s > best.s) best = { s, board };
  }
  return { kind, n, m, wrap, pieces: best.board.pieces, build, sym };
}

/** A pattern's score: its ink near the density, running across the repeat's seams, in few long parts. */
function judgePattern(board, groups, ctx) {
  if (!board.pieces.length) return -Infinity;
  const { n, m } = board;
  let runs = 0;
  let seams = 0;
  for (const rec of board.nodes.values()) {
    if (rec.bits & 1) { runs++; if (ctx.wrap[0] && rec.x === n - 1) seams++; }
    if (rec.bits & 2 && (ctx.wrap[1] || rec.y < m - 1)) { runs++; if (ctx.wrap[1] && rec.y === m - 1) seams++; }
  }
  const total = (ctx.wrap[0] ? n : n - 1) * m + (ctx.wrap[1] ? m : m - 1) * n;
  let s = -7 * Math.abs(runs / total - ctx.target);
  s += 0.5 * Math.min(seams, 3);
  if (!seams) s -= 2;
  // Every column of the repeat (and every row of a field) has something in it: no gaps in the rhythm.
  const xs = new Set(), ys = new Set();
  for (const rec of board.nodes.values()) if (rec.inside) { xs.add(rec.x); ys.add(rec.y); }
  s -= 2.5 * (1 - xs.size / n) + (ctx.wrap[1] ? 2.5 * (1 - ys.size / m) : 0);
  const r = read(board, { gravity: false });
  s -= 0.3 * Math.max(0, r.parts.length - 2);
  // A running line: one part that crosses the seam (on a ring of repeats it never ends).
  const across = r.parts.some((keys) => keys.some((k) => { const rec = board.nodes.get(k); return rec.x === n - 1 && rec.bits & 1; }));
  if (across) s += ctx.wrap[1] ? 0.5 : 1.2;
  else if (!ctx.wrap[1]) s -= 3; // a border that stops at each repeat is a row of things, not a border
  const kinds = [r.ts, r.bends, r.ends.round, r.ends.flat + r.ends.open, r.rings].filter(Boolean).length;
  s += 0.25 * kinds + 0.2 * Math.min(r.bends, 6);
  if (!r.ts && !r.bends) s -= 1.5; // straight strokes only: a plain bar, not a rhythm
  // A rail (a straight line all the way along a row or down a column) makes stripes, a ladder: not a pattern.
  const bits = (x, y) => board.nodes.get(board.node(x, y).key)?.bits ?? 0;
  let rails = 0;
  for (let y = 0; y < m; y++) { let all = true; for (let x = 0; x < n; x++) if (!(bits(x, y) & 1)) all = false; if (all) rails++; }
  if (ctx.wrap[1]) for (let x = 0; x < n; x++) { let all = true; for (let y = 0; y < m; y++) if (!(bits(x, y) & 2)) all = false; if (all) rails++; }
  s -= 1.1 * rails;
  s -= 0.6 * r.stubs;
  const arms = ctx.cut ? 0 : letterish(board, [0, 0, n - 1, m - 1]).arms;
  if (arms && !ctx.wrap[1]) return -Infinity; // a border is one running line, never a row of letters
  s -= 1.5 * arms;
  if (ctx.cut && !ctx.wrap[1]) s -= 0.8 * r.parts.filter((keys) => keys.every((k) => board.nodes.get(k).inside)).length;
  s += 0.15 * Math.min(r.ts, 3);
  return s;
}
