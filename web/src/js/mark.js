// The SMASH mark, drawn from parameters instead of traced.
//
// The mark is a solid block with slots cut into it. Measured from the
// original and set on a grid of 4 (2026-09-30, Jonas: every version on one
// grid): a block 552 × 472; ten slot columns on a 52 pitch, slots 20 wide and
// every bar 32 (8 : 5); closed slot ends stop 42 from the edge (their round
// ends' centres one pitch in, at 52); two crossbars at 210 and 262 (one pitch
// apart around the exact middle, 236) make the S bends and the breaks in the
// A and the H; bends are filleted at 10 (half a slot). (The trace measured
// 550 × 471, a 51.78 pitch and stems of 31.78.) Every one is a parameter here.
//
// buildMark() returns an SVG sized to the box it will mask, so strokes keep a
// true width however far the mark is stretched. paintMark() draws the same
// shape on a canvas, where it stays sharp at any zoom (the landing's dive).
//
// With `info`, a row of text runs along the top and one along the bottom, as
// on svartljus.se: part of the mask, the pictures showing through the letters,
// the block drawn between them. paintInfo() sets them.
//
// With `letters`, each of the five letters can have its own measures: an array
// of five objects (S, M, A, S, H), any of LETTER_KEYS in each, overriding the
// whole mark's for that letter's own slots. The four slots between letters
// keep the whole mark's. Without it, the mark is drawn exactly as before.

export const UNITS = { w: 552, h: 472 };

export const DEFAULTS = {
  stroke: 20, // slot width
  corner: 10, // radius of the bends, on the slot's centre line
  caps: 'round', // round | square | butt
  inset: 42, // where closed slot ends stop, from top and bottom
  crossbar: 236, // centre between the two crossbars: the block's middle
  gap: 52, // distance between the crossbars
  columns: 1, // spread of the columns across the block (1 = original)
  fit: 'stretch', // stretch (edge to edge) | contain
  padding: 0, // margin around the block, in px
  invert: false,
  light: false,
  speed: 100, // ms per image
  paused: false,
};

export const LETTERS = ['S', 'M', 'A', 'S', 'H'];
/** What a letter can set for itself (the M has no crossbar, so crossbar and gap do nothing there). */
export const LETTER_KEYS = ['stroke', 'corner', 'caps', 'inset', 'crossbar', 'gap'];

/** The measures for letter i: the whole mark's, with the letter's own on top. -1 is a slot between letters. */
function forLetter(p, i) {
  const own = i >= 0 ? p.letters?.[i] : null;
  if (!own) return p;
  const q = { ...p };
  for (const k of LETTER_KEYS) if (own[k] !== undefined && own[k] !== null) q[k] = own[k];
  return q;
}

const PITCH = 52; // a bar (32) and a slot (20)
const FIRST = 42; // the first slot's centre: a bar and half a slot in
const MID = FIRST + PITCH * 4.5; // the columns spread from here: 276, the block's middle

/** The centre line of slot column i, in mark units. */
const column = (p, i) => MID + (FIRST + PITCH * i - MID) * p.columns;

/**
 * The slot centre lines, in mark units, with what happens at each end:
 * 'end' is a closed slot end (drawn with the chosen caps), 'bar' is flat
 * against a crossbar (the breaks in the A and the H), 'open' runs off the block.
 * `letter` is the letter a slot belongs to (0–4), or -1 between two letters.
 */
export function slots(p) {
  const out = UNITS.h * 0.5;
  const c = (i) => column(p, i);
  const at = (i) => {
    const q = forLetter(p, i);
    return { top: q.inset, bot: UNITS.h - q.inset, up: q.crossbar - q.gap / 2, lo: q.crossbar + q.gap / 2 };
  };
  const slot = (letter, pts, start, end) => ({ pts, start, end, letter });
  const full = (i) => slot(-1, [[c(i), -out], [c(i), UNITS.h + out]], 'open', 'open');
  const [s1, m, a, s2, h] = [0, 1, 2, 3, 4].map(at);
  return [
    // S
    slot(0, [[c(0), s1.top], [c(0), s1.up], [c(1), s1.up]], 'end', 'open'),
    slot(0, [[c(0) - PITCH * 2, s1.lo], [c(0), s1.lo], [c(0), s1.bot]], 'open', 'end'),
    full(1),
    // M
    slot(1, [[c(2), m.top], [c(2), UNITS.h + out]], 'end', 'open'),
    slot(1, [[c(3), m.top], [c(3), UNITS.h + out]], 'end', 'open'),
    full(4),
    // A
    slot(2, [[c(5), a.top], [c(5), a.up]], 'end', 'bar'),
    slot(2, [[c(5), a.lo], [c(5), UNITS.h + out]], 'bar', 'open'),
    full(6),
    // S
    slot(3, [[c(7), s2.top], [c(7), s2.up], [c(8), s2.up]], 'end', 'open'),
    slot(3, [[c(6), s2.lo], [c(7), s2.lo], [c(7), s2.bot]], 'open', 'end'),
    full(8),
    // H
    slot(4, [[c(9), -out], [c(9), h.up]], 'open', 'bar'),
    slot(4, [[c(9), h.lo], [c(9), UNITS.h + out]], 'bar', 'open'),
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
 * The mark laid out in a W × H px box: the block, and the slots as one path
 * (`d`) to be drawn `stroke` px wide with flat ends, plus a round cap at each
 * of `dots`. When letters have their own measures, `parts` holds the slots in
 * groups of one width and join ({ d, stroke, join }), and each dot carries its
 * own radius as a third number; without them, `parts` is just [{ d, stroke, join }].
 */
export function markShape(p, W, H) {
  const pad = p.padding;
  // The rows of text, if any, take a band off the top and the bottom, close
  // to the mark (infoGap). The room round the whole, at the sides, above and
  // below, is half one of the mark's slots, as its stroke is drawn.
  const row = p.info ? Math.round(H * p.infoSize) : 0;
  const gap = p.info ? Math.round(H * p.infoGap) : 0;
  const inner = (W - 2 * pad) / (p.info ? 1 + p.stroke / UNITS.w : 1);
  const edge = p.info ? (p.stroke * inner) / UNITS.w / 2 : 0;
  let bw = Math.max(1, inner);
  let bh = Math.max(1, H - 2 * pad - 2 * (edge + row + gap));
  if (p.fit === 'contain') {
    const s = Math.min(bw / UNITS.w, bh / UNITS.h);
    bw = UNITS.w * s;
    bh = UNITS.h * s;
  }
  const bx = (W - bw) / 2;
  const by = (H - bh) / 2;
  const sx = bw / UNITS.w;
  const sy = bh / UNITS.h;
  // As wide as the block, just above and below it: one piece with the mark.
  const rows = p.info ? [
    { x: bx, y: by - gap - row, w: bw, h: row },
    { x: bx, y: by + bh + gap, w: bw, h: row },
  ] : [];

  // Work in px so a stretched block keeps round caps round.
  const toPx = (pts) => pts.map(([x, y]) => [bx + x * sx, by + y * sy]);
  const stroke = p.stroke * sx;
  const join = p.corner > 0 ? 'round' : 'miter';
  // Lines are drawn with flat ends; each end is then finished by kind.
  const dots = [];
  const groups = new Map();
  const d = slots(p).map(({ pts, start, end, letter }) => {
    const q = forLetter(p, letter);
    const w = q.stroke * sx;
    let px = toPx(pts);
    for (const [kind, atEnd] of [[start, false], [end, true]]) {
      if (kind === 'bar' || (kind === 'end' && q.caps === 'square')) px = extend(px, atEnd, w / 2);
      if (kind === 'end' && q.caps === 'round') dots.push([...(atEnd ? px.at(-1) : px[0]), w / 2]);
    }
    const path = filleted(px, q.corner * sx);
    const key = `${w}|${q.corner > 0 ? 'round' : 'miter'}`;
    if (!groups.has(key)) groups.set(key, { d: '', stroke: w, join: q.corner > 0 ? 'round' : 'miter' });
    groups.get(key).d += path;
    return path;
  }).join('');
  const parts = [...groups.values()];
  return { W, H, bx, by, bw, bh, sx, sy, stroke, d, dots, join, parts, rows };
}

/**
 * An SVG, W × H px, usable as a CSS mask: opaque where the image should show.
 * Normal: the block shows the image and the slots are cut out.
 * Inverted: only the slots (and anything outside the block) show it.
 */
export function buildMark(p, W, H) {
  const { bx, by, bw, bh, stroke, dots, parts } = markShape(p, W, H);
  const caps = dots.map(([x, y, r = stroke / 2]) => `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${r.toFixed(2)}"/>`).join('');

  const ground = p.invert ? '#fff' : '#000';
  const block = p.invert ? '#000' : '#fff';
  const cut = p.invert ? '#fff' : '#000';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`
    + `<defs><mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}">`
    + `<rect width="${W}" height="${H}" fill="${ground}"/>`
    + `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="${block}"/>`
    + `<g fill="${cut}">${parts.map((g) => `<path d="${g.d}" fill="none" stroke="${cut}" stroke-width="${g.stroke}" stroke-linecap="butt" stroke-linejoin="${g.join}"/>`).join('')}${caps}</g>`
    + `</mask></defs><rect width="${W}" height="${H}" mask="url(#m)"/></svg>`;
}

/**
 * The same mask on a 2D canvas, in whatever transform is set: opaque where
 * the image should show, clear elsewhere. `shape` is from markShape().
 */
export function paintMark(ctx, shape, invert) {
  const { W, H, bx, by, bw, bh, stroke, dots, join } = shape;
  shape.path ??= new Path2D(shape.d);
  // Slots of more than one width (letters with their own measures) are stroked group by group.
  const parts = shape.parts?.length > 1 ? shape.parts : null;
  if (parts) for (const g of parts) g.path ??= new Path2D(g.d);
  ctx.fillStyle = ctx.strokeStyle = '#fff';
  if (invert) {
    // Outside the block shows the image too. At rest or zoomed in, the screen
    // never sees past a ground three boxes wide.
    ctx.beginPath();
    ctx.rect(-W, -H, 3 * W, 3 * H);
    ctx.rect(bx, by, bw, bh);
    ctx.fill('evenodd');
  } else {
    ctx.fillRect(bx, by, bw, bh);
    ctx.globalCompositeOperation = 'destination-out';
  }
  // Open slots run through the edge into an already clear (or opaque) ground.
  // Clipping them to the block again antialiases that shared edge twice,
  // leaving a hairline where a slot meets the outside of the mark.
  ctx.save();
  ctx.lineCap = 'butt';
  if (parts) {
    for (const g of parts) {
      ctx.lineWidth = g.stroke;
      ctx.lineJoin = g.join;
      ctx.stroke(g.path);
    }
  } else {
    ctx.lineWidth = stroke;
    ctx.lineJoin = join;
    ctx.stroke(shape.path);
  }
  ctx.beginPath();
  for (const [x, y, r = stroke / 2] of dots) {
    ctx.moveTo(x + r, y);
    ctx.arc(x, y, r, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.restore();
  ctx.globalCompositeOperation = 'source-over';
}

export const INFO_FONT = 'Druk, "Druk Fill"'; // Anton for what Druk's trial lacks (main.css)

// Icons that can close a row (paintInfo), drawn on a 24-unit square: they
// keep their shape however the row's letters are stretched.
const ICONS = {
  instagram(ctx) {
    const frame = new Path2D();
    frame.roundRect(2, 2, 20, 20, 5.5);
    frame.moveTo(16.6, 12);
    frame.arc(12, 12, 4.6, 0, Math.PI * 2);
    ctx.lineWidth = 2.2;
    ctx.stroke(frame);
    ctx.beginPath();
    ctx.arc(17.6, 6.4, 1.4, 0, Math.PI * 2);
    ctx.fill();
  },
  linkedin(ctx) {
    ctx.fill(new Path2D('M3 0h18a3 3 0 0 1 3 3v18a3 3 0 0 1-3 3H3a3 3 0 0 1-3-3V3a3 3 0 0 1 3-3zM6.6 4.6a1.75 1.75 0 1 0 0 3.5a1.75 1.75 0 1 0 0-3.5zM5.1 9.5h3v9.4h-3zM10.1 9.5h2.9v1.3c.5-.9 1.6-1.5 3-1.5 2.4 0 3.6 1.5 3.6 4.2v5.4h-3v-4.9c0-1.3-.4-2.1-1.5-2.1s-1.9.8-1.9 2.2v4.8h-3.1z'), 'evenodd');
  },
};

/**
 * The rows of text, in the mask: each set in capitals to fill its row from
 * edge to edge, stretched or squeezed sideways (as the mark is), but never
 * squeezed below `least` of its width; then it is set smaller instead,
 * centred in the row. Like the block, the letters show the pictures; inverted,
 * they are cut from them. A row can close on icons (`icons[i]`, names from
 * ICONS), square and as tall as its capitals. Returns, per row, what it takes
 * to find a word in it again: { x (its origin), y, h, scale, font, text },
 * and where its icons are: icons: [{ name, x, y, w, h }].
 */
export function paintInfo(ctx, shape, texts, invert, least = 0.8, icons = []) {
  const out = [];
  shape.rows.forEach((box, i) => {
    const text = (texts[i] || '').toUpperCase();
    if (!text) return;
    const marks = (icons[i] || []).filter((n) => ICONS[n]);
    // The ink, not the type's box, meets the row's edges on all four sides,
    // so the room around each row is exactly what was asked for.
    const ink = (s) => {
      ctx.font = `${s}px ${INFO_FONT}`;
      const t = ctx.measureText(text);
      return {
        left: t.actualBoundingBoxLeft,
        width: t.actualBoundingBoxLeft + t.actualBoundingBoxRight,
        up: t.actualBoundingBoxAscent,
        height: t.actualBoundingBoxAscent + t.actualBoundingBoxDescent,
      };
    };
    // The icons after the text, each as wide as the capitals are tall, with
    // half that between them and before the first.
    const room = (m) => marks.length * m.height * 1.5;
    let size = (box.h / ink(100).height) * 100;
    let m = ink(size);
    let scale = (box.w - room(m)) / m.width;
    if (scale < least) {
      size *= box.w / (least * m.width + room(m));
      m = ink(size);
      scale = (box.w - room(m)) / m.width;
    }
    const top = box.y + (box.h - m.height) / 2; // centred, if it had to be set smaller
    const y = top + m.up; // the baseline
    ctx.save();
    ctx.globalCompositeOperation = invert ? 'destination-out' : 'source-over';
    ctx.fillStyle = ctx.strokeStyle = '#fff';
    ctx.textBaseline = 'alphabetic';
    ctx.save();
    ctx.translate(box.x + m.left * scale, y);
    ctx.scale(scale, 1);
    ctx.fillText(text, 0, 0);
    ctx.restore();
    const placed = [];
    let x = box.x + m.width * scale;
    for (const name of marks) {
      x += m.height / 2;
      ctx.save();
      ctx.translate(x, top);
      ctx.scale(m.height / 24, m.height / 24);
      ICONS[name](ctx);
      ctx.restore();
      placed.push({ name, x, y: top, w: m.height, h: m.height });
      x += m.height;
    }
    ctx.restore();
    out[i] = { x: box.x + m.left * scale, y: top, h: m.height, scale, font: `${size}px ${INFO_FONT}`, text, icons: placed };
  });
  return out;
}

/**
 * Where the landing's dive goes, in px of the laid-out mark: into the picture
 * between the M and the A, at the very centre of the mark; inverted, down the
 * middle of the M's last slot. `depth` is the zoom at which the edges of that
 * gap (or slot) have passed the edges of the screen, once the dive has brought
 * it to the centre; `open` is false when no zoom up to the limit gets there.
 */
export function diveFocus(p, shape) {
  const { W, H, bx, by, bh, sx, sy } = shape;
  const x = p.invert ? column(p, 4) : (column(p, 4) + column(p, 5)) / 2;
  const gap = p.invert ? p.stroke / 2 : (PITCH * p.columns - p.stroke) / 2;
  // The gap runs the block's full height; above and below it is ground.
  const depth = Math.max(W / 2 / (Math.max(0.5, gap) * sx), p.invert ? 1 : H / bh) * 1.03;
  return { x: bx + x * sx, y: by + (UNITS.h / 2) * sy, depth: Math.min(400, depth), open: gap > 0 && depth <= 400 };
}

export const toDataUrl = (svg) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
