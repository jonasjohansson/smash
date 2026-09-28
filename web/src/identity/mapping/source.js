// What is mapped: the original SMASH mark (the traced logo, brand/smash-logo.svg),
// or chapter 01's wordmark (the other chapters were dropped). Each becomes
// outlines (for the SVG export and the 3D walls) and a mask picture about
// 4000 px wide (for the screen).

export const SOURCES = [
  // The impact point of chapter 01 (the crossbar of the A): column 5 of the mark, at its crossbar.
  { id: 'original', name: 'original', url: '/brand/smash-logo.svg', impact: [(42 + 51.78 * 5) / 550, 235.5 / 471] },
  { id: 'struck', name: '01 struck', slug: 'struck', impact: [0.547, 0.5] },
];

const cache = new Map();

/** A source as { id, paths: [{ d, rule, m }], frame: { x, y, w, h }, impact: [s, t] }, loaded once. */
export function loadSource(id) {
  const src = SOURCES.find((s) => s.id === id) ?? SOURCES[0];
  if (!cache.has(src.id)) {
    const text = src.url
      ? fetch(new URL(src.url, location.href)).then((r) => { if (!r.ok) throw new Error(`${src.url}: ${r.status}`); return r.text(); })
      : import(`../directions/${src.slug}.js`).then((mod) => mod.wordmark());
    cache.set(src.id, text.then((svg) => build(src, svg)));
    cache.get(src.id).catch(() => cache.delete(src.id));
  }
  return cache.get(src.id);
}

/** Which of the chapter wordmarks load here (a module that fails is left out). */
export async function availableSources() {
  const ok = await Promise.all(SOURCES.map((s) => loadSource(s.id).then(() => true, (e) => { console.warn(`[mapping] source ${s.id} left out:`, e.message); return false; })));
  return SOURCES.filter((_, i) => ok[i]);
}

function build(src, svg) {
  const paths = parseSVG(svg);
  if (!paths.length) throw new Error(`${src.id}: no paths`);
  // The frame is the outlines' bounds with a margin round them, so the grid's handles sit just off the mark.
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const path of paths) {
    for (const c of flatten(path, 4)) for (const [x, y] of c) {
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  const pad = (y1 - y0) * 0.045;
  const frame = { x: x0 - pad, y: y0 - pad, w: x1 - x0 + 2 * pad, h: y1 - y0 + 2 * pad };
  // The impact point is given in the mark's own bounds; move it into the frame.
  const impact = [(x0 + src.impact[0] * (x1 - x0) - frame.x) / frame.w, (y0 + src.impact[1] * (y1 - y0) - frame.y) / frame.h];
  return { id: src.id, paths, frame, impact, aspect: frame.w / frame.h };
}

// ------------------------------------------------------------ SVG

const IDENTITY = [1, 0, 0, 1, 0, 0];
const mul = (a, b) => [
  a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1],
  a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3],
  a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5],
];

/** An SVG transform attribute as a matrix [a b c d e f]: translate, scale, rotate, matrix. */
function parseTransform(s) {
  let m = IDENTITY;
  if (!s) return m;
  for (const [, fn, args] of s.matchAll(/(\w+)\s*\(([^)]*)\)/g)) {
    const v = args.split(/[\s,]+/).filter(Boolean).map(Number);
    let t = IDENTITY;
    if (fn === 'translate') t = [1, 0, 0, 1, v[0] || 0, v[1] || 0];
    else if (fn === 'scale') t = [v[0], 0, 0, v[1] ?? v[0], 0, 0];
    else if (fn === 'matrix') t = v;
    else if (fn === 'rotate') {
      const a = ((v[0] || 0) * Math.PI) / 180, c = Math.cos(a), sn = Math.sin(a);
      t = [c, sn, -sn, c, 0, 0];
      if (v.length === 3) t = mul(mul([1, 0, 0, 1, v[1], v[2]], t), [1, 0, 0, 1, -v[1], -v[2]]);
    }
    m = mul(m, t);
  }
  return m;
}

/** Every filled path in an SVG string, with its fill rule and its transform to the SVG's own units. */
export function parseSVG(text) {
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  const root = doc.documentElement;
  const out = [];
  const attr = (el, name) => el.getAttribute(name) ?? (el.getAttribute('style') ?? '').match(new RegExp(`${name}\\s*:\\s*([^;]+)`))?.[1]?.trim() ?? null;
  const walk = (el, m, rule, fill) => {
    const mm = mul(m, parseTransform(el.getAttribute('transform')));
    const r = attr(el, 'fill-rule') ?? rule;
    const f = attr(el, 'fill') ?? fill;
    if (el.localName === 'path' && f !== 'none') {
      const d = el.getAttribute('d');
      if (d) out.push({ d, rule: r === 'evenodd' ? 'evenodd' : 'nonzero', m: mm });
    }
    for (const c of el.children) if (!['defs', 'clipPath', 'mask', 'title', 'desc'].includes(c.localName)) walk(c, mm, r, f);
  };
  walk(root, IDENTITY, 'nonzero', 'black');
  return out;
}

/**
 * A path's outlines as polygons in the SVG's units: curves and arcs flattened,
 * and long straight edges cut up too, so every piece can bend when warped.
 * step: the longest piece, in those units.
 */
export function flatten({ d, m }, step) {
  const tokens = d.match(/[a-zA-Z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) ?? [];
  const T = (x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
  const contours = [];
  let cur = null;
  let x = 0, y = 0, sx = 0, sy = 0, cx = 0, cy = 0; // pen, subpath start, last control point
  let cmd = '', prev = '';
  let i = 0;
  const num = () => parseFloat(tokens[i++]);
  const flag = () => {
    // Arc flags may be written together with no separator ("0 01 5 5"): take one digit.
    const tk = tokens[i];
    if (tk.length > 1 && (tk[0] === '0' || tk[0] === '1')) { tokens[i] = tk.slice(1); return +tk[0]; }
    i++;
    return +tk;
  };
  const emit = (px, py) => cur.push(T(px, py));
  const lineTo = (nx, ny) => {
    const [ax, ay] = T(x, y), [bx, by] = T(nx, ny);
    const k = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / step));
    for (let q = 1; q <= k; q++) emit(x + ((nx - x) * q) / k, y + ((ny - y) * q) / k);
    x = nx; y = ny;
  };
  const curve = (pts) => { // cubic or quadratic Bézier from the pen
    const P = [[x, y], ...pts];
    const tp = P.map(([a, b]) => T(a, b));
    let len = 0;
    for (let q = 1; q < tp.length; q++) len += Math.hypot(tp[q][0] - tp[q - 1][0], tp[q][1] - tp[q - 1][1]);
    const k = Math.max(2, Math.ceil(len / step));
    for (let q = 1; q <= k; q++) {
      const t = q / k, u = 1 - t;
      let px, py;
      if (P.length === 4) {
        px = u * u * u * P[0][0] + 3 * u * u * t * P[1][0] + 3 * u * t * t * P[2][0] + t * t * t * P[3][0];
        py = u * u * u * P[0][1] + 3 * u * u * t * P[1][1] + 3 * u * t * t * P[2][1] + t * t * t * P[3][1];
      } else {
        px = u * u * P[0][0] + 2 * u * t * P[1][0] + t * t * P[2][0];
        py = u * u * P[0][1] + 2 * u * t * P[1][1] + t * t * P[2][1];
      }
      emit(px, py);
    }
    x = P.at(-1)[0]; y = P.at(-1)[1];
  };
  const arc = (rx, ry, rot, large, sweep, nx, ny) => {
    // Endpoint to centre parameterisation (SVG implementation notes, F.6.5).
    if (!rx || !ry) return lineTo(nx, ny);
    rx = Math.abs(rx); ry = Math.abs(ry);
    const ph = (rot * Math.PI) / 180, cs = Math.cos(ph), sn = Math.sin(ph);
    const dx = (x - nx) / 2, dy = (y - ny) / 2;
    const x1 = cs * dx + sn * dy, y1 = -sn * dx + cs * dy;
    const lam = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry);
    if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
    const sgn = large === sweep ? -1 : 1;
    const num2 = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1;
    const co = sgn * Math.sqrt(Math.max(0, num2 / (rx * rx * y1 * y1 + ry * ry * x1 * x1)));
    const cxp = (co * rx * y1) / ry, cyp = (-co * ry * x1) / rx;
    const ccx = cs * cxp - sn * cyp + (x + nx) / 2, ccy = sn * cxp + cs * cyp + (y + ny) / 2;
    const ang = (ux, uy, vx, vy) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    const t1 = ang(1, 0, (x1 - cxp) / rx, (y1 - cyp) / ry);
    let dt = ang((x1 - cxp) / rx, (y1 - cyp) / ry, (-x1 - cxp) / rx, (-y1 - cyp) / ry);
    if (!sweep && dt > 0) dt -= Math.PI * 2;
    else if (sweep && dt < 0) dt += Math.PI * 2;
    const sc = Math.hypot(m[0], m[1]);
    const k = Math.max(2, Math.ceil((Math.abs(dt) * Math.max(rx, ry) * sc) / step));
    for (let q = 1; q <= k; q++) {
      const a = t1 + (dt * q) / k;
      const ex = rx * Math.cos(a), ey = ry * Math.sin(a);
      emit(cs * ex - sn * ey + ccx, sn * ex + cs * ey + ccy);
    }
    x = nx; y = ny;
  };
  const close = () => { if (cur && cur.length > 2) contours.push(cur); cur = null; };
  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i])) cmd = tokens[i++];
    else if (!cmd) { i++; continue; }
    const rel = cmd === cmd.toLowerCase();
    const ox = rel ? x : 0, oy = rel ? y : 0;
    switch (cmd.toUpperCase()) {
      case 'M': {
        close();
        x = sx = num() + ox; y = sy = num() + oy;
        cur = [T(x, y)];
        cmd = rel ? 'l' : 'L';
        prev = 'M';
        continue;
      }
      case 'Z':
        if (cur && (x !== sx || y !== sy)) lineTo(sx, sy);
        if (cur && cur.length > 1) { const a = cur[0], b = cur.at(-1); if (Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9) cur.pop(); }
        close();
        x = sx; y = sy;
        prev = 'Z';
        continue;
      default:
        if (!cur) cur = [T(x, y)];
    }
    switch (cmd.toUpperCase()) {
      case 'L': lineTo(num() + ox, num() + oy); break;
      case 'H': lineTo(num() + ox, y); break;
      case 'V': lineTo(x, num() + oy); break;
      case 'C': { const a = [num() + ox, num() + oy], b = [num() + ox, num() + oy], e = [num() + ox, num() + oy]; curve([a, b, e]); cx = b[0]; cy = b[1]; break; }
      case 'S': {
        const a = /[CS]/i.test(prev) ? [2 * x - cx, 2 * y - cy] : [x, y];
        const b = [num() + ox, num() + oy], e = [num() + ox, num() + oy];
        curve([a, b, e]); cx = b[0]; cy = b[1]; break;
      }
      case 'Q': { const a = [num() + ox, num() + oy], e = [num() + ox, num() + oy]; curve([a, e]); cx = a[0]; cy = a[1]; break; }
      case 'T': {
        const a = /[QT]/i.test(prev) ? [2 * x - cx, 2 * y - cy] : [x, y];
        const e = [num() + ox, num() + oy];
        curve([a, e]); cx = a[0]; cy = a[1]; break;
      }
      case 'A': { const rx = num(), ry = num(), rot = num(), la = flag(), sw = flag(); arc(rx, ry, rot, la, sw, num() + ox, num() + oy); break; }
      default: i++;
    }
    prev = cmd;
  }
  close();
  return contours;
}

/**
 * The mask: the source painted white on black, its frame filling a canvas
 * `size` px wide (or tall, if the frame is taller than wide).
 */
export function rasterize(source, size = 4096) {
  const { frame } = source;
  const k = size / Math.max(frame.w, frame.h);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(frame.w * k));
  canvas.height = Math.max(1, Math.round(frame.h * k));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fff';
  for (const p of source.paths) {
    const [a, b, c, d, e, f] = p.m;
    ctx.setTransform(k, 0, 0, k, -frame.x * k, -frame.y * k);
    ctx.transform(a, b, c, d, e, f);
    ctx.fill(new Path2D(p.d), p.rule);
  }
  return canvas;
}

/** Every outline of the source as polygons in frame units (s, t in 0..1), with each path's fill rule. */
export function outlines(source, step = 1 / 360) {
  const { frame } = source;
  return source.paths.map((p) => ({
    rule: p.rule,
    contours: flatten(p, step * frame.h).map((c) => c.map(([x, y]) => [(x - frame.x) / frame.w, (y - frame.y) / frame.h])),
  }));
}
