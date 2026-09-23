// The SMASH mark, drawn from parameters instead of traced.
//
// The mark is a solid block with slots cut into it. Measured from the
// original (550 × 471 units): ten slot columns on a 51.78 pitch, slots 20
// wide; closed slot ends stop 42 from the edge; two crossbars at 209.5 and
// 261.5 make the S bends and the breaks in the A and the H; bends are
// filleted at 10 (half a slot). Every one of those is a parameter here.
//
// buildMark() returns an SVG sized to the box it will mask, so strokes keep a
// true width however far the mark is stretched.

export const UNITS = { w: 550, h: 471 };

export const DEFAULTS = {
  stroke: 20, // slot width
  corner: 10, // radius of the bends, on the slot's centre line
  caps: 'round', // round | square | butt
  inset: 42, // where closed slot ends stop, from top and bottom
  crossbar: 235.5, // centre between the two crossbars
  gap: 52, // distance between the crossbars
  columns: 1, // spread of the columns across the block (1 = original)
  fit: 'stretch', // stretch (edge to edge) | contain
  padding: 0, // margin around the block, in px
  invert: false,
  light: false,
  speed: 75, // ms per image
  paused: false,
};

const PITCH = 51.78;
const FIRST = 41.5;

/**
 * The slot centre lines, in mark units, with what happens at each end:
 * 'end' is a closed slot end (drawn with the chosen caps), 'bar' is flat
 * against a crossbar (the breaks in the A and the H), 'open' runs off the block.
 */
function slots(p) {
  const out = UNITS.h * 0.5;
  const mid = FIRST + PITCH * 4.5;
  const c = (i) => mid + (FIRST + PITCH * i - mid) * p.columns;
  const top = p.inset;
  const bot = UNITS.h - p.inset;
  const up = p.crossbar - p.gap / 2;
  const lo = p.crossbar + p.gap / 2;
  const slot = (pts, start, end) => ({ pts, start, end });
  const full = (i) => slot([[c(i), -out], [c(i), UNITS.h + out]], 'open', 'open');
  return [
    // S
    slot([[c(0), top], [c(0), up], [c(1), up]], 'end', 'open'),
    slot([[c(0) - PITCH * 2, lo], [c(0), lo], [c(0), bot]], 'open', 'end'),
    full(1),
    // M
    slot([[c(2), top], [c(2), UNITS.h + out]], 'end', 'open'),
    slot([[c(3), top], [c(3), UNITS.h + out]], 'end', 'open'),
    full(4),
    // A
    slot([[c(5), top], [c(5), up]], 'end', 'bar'),
    slot([[c(5), lo], [c(5), UNITS.h + out]], 'bar', 'open'),
    full(6),
    // S
    slot([[c(7), top], [c(7), up], [c(8), up]], 'end', 'open'),
    slot([[c(6), lo], [c(7), lo], [c(7), bot]], 'open', 'end'),
    full(8),
    // H
    slot([[c(9), -out], [c(9), up]], 'open', 'bar'),
    slot([[c(9), lo], [c(9), UNITS.h + out]], 'bar', 'open'),
  ];
}

/** Push an end point outward along its segment by d. */
function extend(points, atEnd, d) {
  const pts = points.map((q) => [...q]);
  const [a, b] = atEnd ? [pts.at(-2), pts.at(-1)] : [pts[1], pts[0]];
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  b[0] += ((b[0] - a[0]) / len) * d;
  b[1] += ((b[1] - a[1]) / len) * d;
  return pts;
}

/** A polyline as a path with each bend filleted at radius r. */
function filleted(points, r) {
  const f = (n) => n.toFixed(2);
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
 * An SVG, W × H px, usable as a CSS mask: opaque where the image should show.
 * Normal: the block shows the image and the slots are cut out.
 * Inverted: only the slots (and anything outside the block) show it.
 */
export function buildMark(p, W, H) {
  const pad = p.padding;
  let bw = Math.max(1, W - 2 * pad);
  let bh = Math.max(1, H - 2 * pad);
  if (p.fit === 'contain') {
    const s = Math.min(bw / UNITS.w, bh / UNITS.h);
    bw = UNITS.w * s;
    bh = UNITS.h * s;
  }
  const bx = (W - bw) / 2;
  const by = (H - bh) / 2;
  const sx = bw / UNITS.w;
  const sy = bh / UNITS.h;

  // Work in px so a stretched block keeps round caps round.
  const toPx = (pts) => pts.map(([x, y]) => [bx + x * sx, by + y * sy]);
  const stroke = p.stroke * sx;
  const corner = p.corner * sx;
  // Lines are drawn with flat ends; each end is then finished by kind.
  const dots = [];
  const d = slots(p).map(({ pts, start, end }) => {
    let px = toPx(pts);
    for (const [kind, atEnd] of [[start, false], [end, true]]) {
      if (kind === 'bar' || (kind === 'end' && p.caps === 'square')) px = extend(px, atEnd, stroke / 2);
      if (kind === 'end' && p.caps === 'round') dots.push(atEnd ? px.at(-1) : px[0]);
    }
    return filleted(px, corner);
  }).join('');
  const caps = dots.map(([x, y]) => `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${(stroke / 2).toFixed(2)}"/>`).join('');

  const ground = p.invert ? '#fff' : '#000';
  const block = p.invert ? '#000' : '#fff';
  const cut = p.invert ? '#fff' : '#000';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`
    + `<defs><clipPath id="b"><rect x="${bx}" y="${by}" width="${bw}" height="${bh}"/></clipPath>`
    + `<mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}">`
    + `<rect width="${W}" height="${H}" fill="${ground}"/>`
    + `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="${block}"/>`
    + `<g clip-path="url(#b)" fill="${cut}"><path d="${d}" fill="none" stroke="${cut}" stroke-width="${stroke}" stroke-linecap="butt" stroke-linejoin="${p.corner > 0 ? 'round' : 'miter'}"/>${caps}</g>`
    + `</mask></defs><rect width="${W}" height="${H}" mask="url(#m)"/></svg>`;
}

export const toDataUrl = (svg) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
