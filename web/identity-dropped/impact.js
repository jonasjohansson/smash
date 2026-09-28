// 03 Impact: a generative fracture. One seed is the logo; every place gets its own.
//
// The symbol is glass the moment after a hit. A seeded hit travels one way; three to five
// cracks fan out from where it lands, over part of a turn, and the glass behind it has fallen
// away. The shard on the hit's line is the longest; the blades beside it splay away from that
// line, so it reads as thrown one way, not as a wheel. The rules live in ./impact/fracture.js
// (one pure function of one rule object, with every variable's range documented there). A
// place (latitude, longitude) is a seed; SMASH's own mark is the one the rules make for
// central Stockholm. Set small, the shards close up and the crack is the S–M letter space.

import { svg, timeline, canvasStage, loadImage, withCleanup, ease, span, clamp, lerp, rng, clipHalfPlane, IMAGES } from '../lib.js';
import { fracture, placeSeed, pathOf, cutShard, hullOf, area as areaOf, RULE } from './impact/fracture.js';
import { LETTERS, CAP } from './impact/letters.js';

const INK = '#0b0c0e';
const PAPER = '#ecebe6';
const BLUE = '#2d5bff';

/** The place the logo is the fingerprint of: central Stockholm, where the studio works. */
export const HOME = { place: 'Stockholm', lat: 59.328, lon: 18.067 };
const SEED = placeSeed(HOME.lat, HOME.lon);
const LOGO = fracture(SEED);

const fonts = new URL('./impact/fonts.css', import.meta.url).href;
const MONO = '"System85 Mono", ui-monospace, Menlo, monospace';
const GROT = '"Scto Grotesk A", "Helvetica Neue", Arial, sans-serif';

export const info = {
  n: 3,
  slug: 'impact',
  name: 'Impact',
  lane: 'Symbol-led',
  idea: 'A generative fracture: one seed is the logo, and every place gets its own.',
  story: 'The symbol is glass the moment after a hit, drawn by a few rules. The hit travels one way: three to five cracks fan out from where it lands, the longest shard flies on along its line, and the glass behind it is gone. Give the rules a place and they draw that place’s own fracture. SMASH’s mark is the one they draw for central Stockholm, where the studio works; the Icehotel, Harpa and every venue after them get their own, so the logo grows a family with every project.',
  dynamism: 'Standing still, it is thrown one way: the hit came from the lower right and the shards fly up and to the left. Set beside the word, the hit comes from SMASH itself. In motion the pieces close up, wind back and take the hit. Light runs down the cracks, the shards burst apart in a third of a second, and each opens onto a project before they settle back into the mark.',
  keeps: 'The studio’s home, as the origin: the mark is the fracture of central Stockholm, and it says so. One measure for mark and word: set beside SMASH, every crack is exactly the space between S and M. The wordmark stays quiet and heavy so the symbol carries the energy. Glass stays an association: flat shards, no bevels or glints.',
  risk: 'A burst of shards is the most expected glass sign, and Ash’s example is one. It becomes SMASH’s only if the one seed is used strictly and the family keeps its rules: one crack width, 15° angles, no level or plumb crack, the glass behind the hit always gone. Blue and pictures in shapes are CM territory too. Here the blue is light in the cracks for under a third of a second, and the pictures sit in shards, never in letters. The wordmark is Scto Grotesk A Black as drawn, so logo use needs its licence or a redraw.',
  palette: { ink: INK, paper: PAPER, accent: BLUE },
  interactive: 'Click or tap anywhere to strike there. That spot becomes a place with its own fracture.',
  application: { title: 'Project page: every place its own fracture', aspect: '16/10' },
  keyframe: 0.6,
  type: {
    fonts: [fonts],
    display: {
      family: GROT,
      css: 'font-weight: 500; letter-spacing: -0.025em;',
      name: 'Scto Grotesk A Medium',
      note: 'Schick Toikka’s grotesk: exact, a little square in the shoulders, never cold. The wordmark is its Black weight, spaced so the space between S and M is the crack in the symbol.',
    },
    text: {
      family: GROT,
      css: 'font-weight: 400;',
      name: 'Scto Grotesk A Regular, System-85 Mono',
      note: 'Scto for reading. Colophon’s System-85 Mono for the fingerprint: places and coordinates, set small, the way a survey marks a spot.',
    },
  },
};

// Geometry -------------------------------------------------------------------

const f2 = (v) => +v.toFixed(2);
const DEG = Math.PI / 180;
const kept = (f) => f.shards.filter((sh) => !sh.dropped && sh.poly.length > 2);

/** The box around some polygons. */
function extentOf(polys) {
  let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
  for (const p of polys) for (const [x, y] of p) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}
const extent = (f) => extentOf(kept(f).map((s) => s.poly));

/**
 * The mark set small: the shards closed up (nothing flown, no void) with the crack cut to g.
 * This is what the lockup, the navigation and the favicons use.
 */
const setPolys = (f, g) => f.shards.map((s) => cutShard(s, g)).filter((p) => p.length > 2);

/** Polygons as one SVG path, scaled by s and moved by dx, dy. */
const polysD = (polys, s, dx, dy) => polys.map((p) => pathOf(p, s, dx, dy)).join('');
/** Polygons as a group with one path per shard, named, so each is its own object in Illustrator. */
const polysG = (polys, s, dx, dy, id = 'symbol') =>
  `<g id="${id}">${polys.map((p, i) => `<path id="${id}-shard-${String(i + 1).padStart(2, '0')}" d="${pathOf(p, s, dx, dy)}"/>`).join('')}</g>`;

// The wordmark ------------------------------------------------------------------

/**
 * The space between letters, in font units: where two letters come closest, they are this far
 * apart. S–M and S–H are exactly this; it is also the crack when the mark is set beside the word.
 * The A's diagonals leave a triangle of air beside them, so it sits a little closer to its
 * neighbours at the foot, where they are nearest; judged by eye.
 */
const SPACE = 72;
const SPACING = { SM: 1, MA: 0.64, AS: 0.78, SH: 1 };

/** A glyph's outline flattened to polygons (font units, y up), for measuring. */
function flatten(cmds) {
  const polys = [];
  let cur = null;
  let last = null;
  for (const [op, ...v] of cmds) {
    if (op === 'M') { cur = [[v[0], v[1]]]; polys.push(cur); last = [v[0], v[1]]; }
    else if (op === 'L') { cur.push([v[0], v[1]]); last = [v[0], v[1]]; }
    else if (op === 'C') {
      const p0 = last;
      for (let i = 1; i <= 16; i++) {
        const t = i / 16;
        const u = 1 - t;
        cur.push([u * u * u * p0[0] + 3 * u * u * t * v[0] + 3 * u * t * t * v[2] + t * t * t * v[4], u * u * u * p0[1] + 3 * u * u * t * v[1] + 3 * u * t * t * v[3] + t * t * t * v[5]]);
      }
      last = [v[4], v[5]];
    }
  }
  return polys;
}
/** Where a glyph's outline is at height y: [leftmost, rightmost]. */
function profile(polys, y) {
  let lo = Infinity;
  let hi = -Infinity;
  for (const p of polys) {
    for (let i = 0; i < p.length; i++) {
      const a = p[i];
      const b = p[(i + 1) % p.length];
      if ((a[1] - y) * (b[1] - y) <= 0 && a[1] !== b[1]) {
        const x = a[0] + ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]);
        lo = Math.min(lo, x);
        hi = Math.max(hi, x);
      }
    }
  }
  return [lo, hi];
}

/** The letters placed in a row: each one's x (font units) so the nearest points of neighbours are SPACE apart. */
function setWord(word = 'SMASH') {
  const flat = {};
  for (const ch of new Set(word)) flat[ch] = flatten(LETTERS[ch].d);
  const xs = [0];
  for (let i = 1; i < word.length; i++) {
    const l = word[i - 1];
    const r = word[i];
    let min = Infinity;
    for (let y = 0; y <= CAP; y += 2) {
      const gap = profile(flat[r], y)[0] - profile(flat[l], y)[1];
      if (gap < min) min = gap;
    }
    xs.push(xs[i - 1] + SPACE * (SPACING[l + r] ?? 1) - min);
  }
  const letters = [...word].map((ch, i) => ({ ch, x: xs[i], g: LETTERS[ch] }));
  const x0 = letters[0].x + letters[0].g.box[0];
  const last = letters[letters.length - 1];
  const x1 = last.x + last.g.box[2];
  const y0 = Math.min(...letters.map((l) => CAP - l.g.box[3]));
  const y1 = Math.max(...letters.map((l) => CAP - l.g.box[1]));
  return { letters, x0, x1, y0, y1, w: x1 - x0 };
}
const WORD = setWord();

/** Path data for a glyph at x (font units), scaled by s and moved by dx, dy; y down, the cap line at dy. */
function glyphD(cmds, x, s, dx, dy) {
  const X = (v) => +(dx + (x + v) * s).toFixed(2);
  const Y = (v) => +(dy + (CAP - v) * s).toFixed(2);
  return cmds.map(([op, ...v]) => {
    if (op === 'Z') return 'Z';
    const pts = [];
    for (let i = 0; i < v.length; i += 2) pts.push(`${X(v[i])} ${Y(v[i + 1])}`);
    return op + pts.join(' ');
  }).join('');
}
/** The wordmark as one path, its left edge at dx and its cap line at dy. */
const wordD = (s = 1, dx = 0, dy = 0) => WORD.letters.map((l) => glyphD(l.g.d, l.x - WORD.x0, s, dx, dy)).join('');
/** The wordmark as a group with one path per letter (evenodd, so the A's counter stays cut in any importer). */
const wordG = (s = 1, dx = 0, dy = 0) =>
  `<g id="wordmark">${WORD.letters.map((l, i) => `<path id="letter-${i + 1}-${l.ch}" fill-rule="evenodd" d="${glyphD(l.g.d, l.x - WORD.x0, s, dx, dy)}"/>`).join('')}</g>`;

// Stills -----------------------------------------------------------------------

export function wordmark() {
  const top = WORD.y0; // the S's overshoot above the cap line
  const h = WORD.y1 - WORD.y0;
  return svg(f2(WORD.w), f2(h), `<g fill="currentColor">${wordG(1, 0, -top)}</g>`);
}

/** The symbol: the moment after the hit, the far shards still flying. */
export function symbol() {
  const e = extent(LOGO);
  const side = 1000; // a round artboard for Illustrator
  const s = (side * 0.9) / Math.max(e.w, e.h);
  const dx = side / 2 - e.cx * s;
  const dy = side / 2 - e.cy * s;
  return svg(f2(side), f2(side), `<g fill="currentColor">${polysG(kept(LOGO).map((sh) => sh.poly), s, dx, dy)}</g>`);
}

/**
 * The lockup: the mark set small beside the word, 1.6 times the cap height, its shards closed
 * up and every crack cut to exactly the S–M space. The space between mark and word is half a cap.
 */
const LOCK = { height: 1.6, gap: 0.5 };
/** The set mark at a scale of s px (or font units) per reach unit: its polygons, box and crack. */
function setMark(s, crackUnits = SPACE) {
  const polys = setPolys(LOGO, crackUnits / s);
  return { polys, e: extentOf(polys) };
}
/** The lockup's layout in font units: the mark's scale and box, and where the word starts. */
function lockLayout() {
  // The box barely changes with the crack, so fit once and cut again at the true scale.
  const first = setMark(1, RULE.gap);
  const s = (LOCK.height * CAP) / first.e.h;
  const m = setMark(s);
  const sy = (LOCK.height * CAP) / m.e.h;
  return { s: sy, mark: setMark(sy), gap: CAP * LOCK.gap };
}
const LOCKUP = lockLayout();

export function lockup() {
  const { s, mark, gap } = LOCKUP;
  const e = mark.e;
  const symW = e.w * s;
  const symH = e.h * s;
  const top = CAP / 2 - symH / 2; // centred on the cap height
  const w = symW + gap + WORD.w;
  const inner = `<g fill="currentColor">${polysG(mark.polys, s, -e.x0 * s, top - e.y0 * s)}${wordG(1, symW + gap, 0)}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${f2(top)} ${f2(w)} ${f2(symH)}">${inner}</svg>`;
}

/** The lockup drawn at a symbol height of h px, its left edge at x and centred on y: two SVG paths. */
function lockupAt(x, y, h, fill = PAPER) {
  const k = h / (LOCK.height * CAP); // px per font unit
  const { s, mark, gap } = LOCKUP;
  const e = mark.e;
  const ps = s * k;
  const sym = polysD(mark.polys, ps, x - e.x0 * ps, y - (e.h * ps) / 2 - e.y0 * ps);
  const word = wordD(k, x + e.w * ps + gap * k, y - (CAP * k) / 2);
  return `<path d="${sym}" fill="${fill}"/><path d="${word}" fill="${fill}"/>`;
}

/**
 * The favicon: the mark set small on its own ink tile, the crack cut in pixels, the shards moved
 * a pixel or so out from the hit so their points never blur together, and the corners snapped.
 * At 32 px the smallest shard goes; at 16 px the two smallest, so the three biggest keep their
 * own shapes (no merging) and every piece is at least two pixels across.
 * `ground: 'none'` gives a clear tile with ink shards, for light browser tabs.
 */
const FAV = {
  64: { gap: 3, open: 1.5, fill: 0.86, snap: 0.5, keep: 0 },
  32: { gap: 2, open: 1, fill: 0.88, snap: 0.5, keep: 4 },
  16: { gap: 1.5, open: 1.5, fill: 0.86, snap: 1, keep: 3 },
};
export function favicon({ size = 32, ground = 'ink', ...over } = {}) {
  const spec = { ...(FAV[size] ?? FAV[32]), ...over };
  let shards = LOGO.shards.slice();
  if (spec.keep && shards.length > spec.keep) {
    const big = shards.map((sh) => Math.abs(areaOf(sh.base))).map((a, i) => [a, i]).sort((a, b) => b[0] - a[0]).slice(0, spec.keep).map(([, i]) => i);
    shards = shards.filter((_, i) => big.includes(i));
  }
  const whole = extentOf(setPolys({ shards }, RULE.gap));
  const s = (size * spec.fill) / Math.max(whole.w, whole.h);
  // Each shard moved out from the hit by `open` px, so the points never meet in a blur there.
  const polys = shards.map((sh) => {
    const u = [Math.cos(sh.bisector) * (spec.open / s), Math.sin(sh.bisector) * (spec.open / s)];
    return cutShard(sh, spec.gap / s).map(([x, y]) => [x + u[0], y + u[1]]);
  }).filter((p) => p.length > 2);
  const e = extentOf(polys);
  const q = spec.snap ? (v) => Math.round(v / spec.snap) * spec.snap : (v) => v;
  const dx = size / 2 - e.cx * s;
  const dy = size / 2 - e.cy * s;
  const d = polys.map((p) => `M${p.map(([x, y]) => `${f2(q(dx + x * s))} ${f2(q(dy + y * s))}`).join('L')}Z`).join('');
  const tile = ground === 'none' ? '' : `<rect width="${size}" height="${size}" fill="${INK}"/>`;
  return svg(size, size, `${tile}<path d="${d}" fill="${ground === 'none' ? INK : PAPER}"/>`);
}

// Motion -------------------------------------------------------------------------

const D = 7; // seconds
/**
 * The timeline, as shares of the loop. Hold the mark · it draws in to the point where the hit
 * will land, faster and faster, turning back against the hit · the hit · the shards burst out
 * from that point, 80% of the way in a third of a second, light running down the cracks and
 * draining outward · a project wipes into each as the light goes · they drift · the pictures
 * wipe out and the shards settle back into the mark · hold. t = 0 and t = 1 are the same frame.
 * The deck's strip lands on the beats: t 0 the mark, 0.2 the burst with light in the cracks,
 * 0.4 the last windows opening, 0.6 every shard a window, 0.8 settling.
 */
const T = {
  gather: [0.105, 0.166], hit: 0.17,
  picIn: [0.215, 0.41], picOut: [0.7, 0.77], settle: [0.77, 0.89], caption: [0.87, 0.93],
};
/** How small the mark gets before the hit: a spark. */
const SPARK = 0.06;
// Seconds after the hit.
const S = {
  race: 0.1, raceStagger: 0.008, // the cracks run with light
  fly: [0.0, 0.35], drift: [0.35, 3.4], // the burst, then the drift
  drain: [0.08, 0.26], // the light drains from the hit out: gone within 0.3 s
  flyOff: 0.15, wipe: 0.15, stamp: 2.4, // the clicked place's caption stays this long
};
/** The pictures in the motion's shards, the largest shard first: facade, piano, dome, ice, coral. */
const MOTION_PICS = [7, 1, 3, 2, 8];
/** Where each picture's lit subject is (0..1 across and down), so it lands in the shard, tip included. */
const FOCUS = {
  0: [0.46, 0.42], 1: [0.56, 0.52], 2: [0.5, 0.42], 3: [0.52, 0.2], 4: [0.6, 0.4], 5: [0.33, 0.35],
  6: [0.42, 0.3], 7: [0.5, 0.42], 8: [0.34, 0.45], 9: [0.52, 0.38], 10: [0.38, 0.6], 11: [0.62, 0.55],
};

/** A place from a point on the stage: the stage is a map of central Stockholm, the studio in the middle. */
function placeAt(u, v) {
  return { place: 'Stockholm', lat: +(HOME.lat + (0.5 - v) * 0.034).toFixed(4), lon: +(HOME.lon + (u - 0.5) * 0.1).toFixed(4) };
}
const fmtLat = (v) => `${Math.abs(v).toFixed(4)} ${v >= 0 ? 'N' : 'S'}`;
const fmtLon = (v) => `${Math.abs(v).toFixed(4)} ${v >= 0 ? 'E' : 'W'}`;

/** One flight curve for the burst: 80% in the first third of a second, then a slow drift. */
const flight = (k) => 0.8 * ease.outExpo(span(k, ...S.fly)) + 0.2 * (0.5 - Math.cos(Math.PI * span(k, ...S.drift)) / 2);

/** Everything about one strike that the frames need, computed once. at: where on the stage the hit lands (0..1), or null. */
function strike(place, { at = null, dir = null } = {}) {
  const seed = placeSeed(place.lat, place.lon);
  const f = fracture(seed, dir == null ? {} : { dir: dir / DEG });
  const R = f.rule;
  const r = rng(seed ^ 0x9e3779b9);
  const shards = f.shards.map((sh) => {
    const lead = Math.max(0, Math.cos(sh.bisector - f.dir));
    return {
      ...sh,
      lift: R.lift * (0.3 + 0.7 * lead), // how far it floats after the hit: furthest on the hit's line
      turn: (r() * 2 - 1) * R.turn * (0.4 + 0.6 * lead) * DEG,
      area: Math.abs(areaOf(sh.base)),
    };
  });
  // The biggest shards get the pictures first.
  const bySize = shards.map((_, i) => i).sort((a, b) => shards[b].area - shards[a].area);
  bySize.forEach((i, k) => { shards[i].pic = MOTION_PICS[k % MOTION_PICS.length]; });
  // The order the cracks race out in, and the shards open: nearest the hit's line first.
  const byLead = shards.map((_, i) => i).sort((a, b) => Math.cos(shards[b].bisector - f.dir) - Math.cos(shards[a].bisector - f.dir));
  byLead.forEach((i, k) => { shards[i].order = k / Math.max(1, shards.length - 1); });
  const raceAt = f.cracks.map((c) => Math.cos(c.a - f.dir)).map((v, i, all) => all.filter((w) => w > v).length);
  const e = extentOf(shards.map((s) => s.poly));
  // The widest the burst gets (for fitting the stage).
  const flown = extentOf(shards.map((s) => {
    const d = s.flyBy + s.lift;
    return s.poly.map(([x, y]) => [x + Math.cos(s.bisector) * s.lift + (x - s.c[0]) * 0.06, y + Math.sin(s.bisector) * s.lift + (y - s.c[1]) * 0.06]).concat([[Math.cos(s.bisector) * d, Math.sin(s.bisector) * d]]);
  }));
  return { place, seed, f, shards, raceAt, e, flown, at };
}
const tracePoly = (ctx, poly) => { ctx.moveTo(poly[0][0], poly[0][1]); for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0], poly[i][1]); ctx.closePath(); };

/** Draw a picture to cover a box, zoomed by z, with its focus (0..1) as near the target point as covering allows. */
function coverAt(ctx, img, box, focus, target, z = 1) {
  const s = Math.max(box.w / img.width, box.h / img.height) * z;
  const iw = img.width * s;
  const ih = img.height * s;
  const x = clamp(target[0] - focus[0] * iw, box.x0 + box.w - iw, box.x0);
  const y = clamp(target[1] - focus[1] * ih, box.y0 + box.h - ih, box.y0);
  ctx.drawImage(img, x, y, iw, ih);
}

/** A shard's pose: turned about its centre by a, grown by z, then moved by (dx, dy). */
const poser = (c, a, dx, dy, z = 1) => {
  const cs = Math.cos(a) * z;
  const sn = Math.sin(a) * z;
  return ([x, y]) => [c[0] + (x - c[0]) * cs - (y - c[1]) * sn + dx, c[1] + (x - c[0]) * sn + (y - c[1]) * cs + dy];
};

export function motion(el) {
  const stage = canvasStage(el, { alpha: false });
  const images = [];
  let dead = false;
  const home = strike(HOME);
  // Each cycle breaks one piece (`before`, until the hit) and shows another (`after`, from it).
  // They are the same unless a click struck somewhere new. `done`: the click's cycle has settled.
  let cyc = { before: home, after: home, done: false };
  let lastT = 0;
  const ready = Promise.all([
    ...IMAGES.map((url, i) => loadImage(url).then((img) => { images[i] = img; }).catch(() => {})),
    document.fonts?.load(`12px ${MONO}`).catch(() => {}),
  ]).then(() => { if (!dead) tl.redraw(); });

  /** px per reach unit, and where a strike's hit sits on the stage. */
  function layout(St) {
    const { width: w, height: h } = stage;
    const fl = home.flown;
    const e = home.e;
    const R = Math.min((h * 0.62) / e.h, (w * 0.5) / e.w, (h * 0.86) / fl.h, (w * 0.7) / fl.w);
    // Centred between the mark at rest and the burst at its widest.
    let cx = w / 2 - ((e.cx + fl.cx) / 2) * R;
    let cy = h / 2 - ((e.cy + fl.cy) / 2) * R;
    if (St.at) {
      // The hit lands where the click was, moved in only as far as keeps the whole burst on the stage.
      const m = Math.min(w, h) * 0.06;
      const f = St.flown;
      cx = clamp(St.at[0] * w, m - f.x0 * R, w - m - f.x1 * R);
      cy = clamp(St.at[1] * h, m - f.y0 * R, h - m - f.y1 * R);
      if (f.w * R > w - 2 * m) cx = w / 2 - f.cx * R;
      if (f.h * R > h - 2 * m) cy = h / 2 - f.cy * R;
    }
    return { R, cx, cy };
  }

  function frame(t, dt) {
    if (cyc.after !== home && t >= T.settle[1]) cyc.done = true;
    // A new loop (or a seek back before the hit) once a click's cycle has settled: the struck
    // place is now the piece that breaks, and the studio's own mark comes out of it.
    const wrapped = dt > 0 && t < lastT - 0.5;
    if ((wrapped || (dt === 0 && t < T.hit)) && (cyc.done || (cyc.after === home && cyc.before !== home && wrapped))) {
      cyc = { before: cyc.after, after: home, done: false, prevZ: SPARK }; // it will have drawn in to a spark by the hit
    }
    lastT = t;
    const { ctx, width: w, height: h } = stage;
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, w, h);
    if (t < T.hit) drawBefore(ctx, cyc.before, t);
    else drawAfter(ctx, cyc.after, t, cyc.before !== cyc.after ? cyc.before : null, cyc.prevZ ?? 1);

    // The fingerprint: the place and where it is. A struck place shows it at once, by its hit.
    const shown = t < T.hit ? cyc.before : cyc.after;
    const narrow = w < 640;
    const size = narrow ? 10 : Math.max(11, Math.round(h * 0.022));
    const m = Math.round(Math.max(14, w * 0.028));
    const line = `${shown.place.place}  ${fmtLat(shown.place.lat)}  ${fmtLon(shown.place.lon)}`;
    ctx.font = `${size}px ${MONO}`;
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = PAPER;
    if (shown.at && t >= T.hit) {
      const k = (t - T.hit) * D;
      const a = span(k, 0.05, 0.2) * (1 - span(k, S.stamp, S.stamp + 0.3));
      if (a > 0) {
        const { R, cx, cy } = layout(shown);
        const tw = ctx.measureText(line).width;
        // Beside the burst, never over it: under it, over it, then either side, on the stage;
        // failing all of those, where the studio's own caption sits.
        const f = shown.flown;
        const B = { x0: cx + f.x0 * R, y0: cy + f.y0 * R, x1: cx + f.x1 * R, y1: cy + f.y1 * R };
        const gap = size * 1.2;
        const hx = clamp(cx - tw / 2, B.x0, B.x1 - tw);
        const spots = [[hx, B.y1 + gap + size], [hx, B.y0 - gap], [B.x1 + gap, cy + size / 2], [B.x0 - gap - tw, cy + size / 2]];
        const fits = ([x, y]) => x >= m && x + tw <= w - m && y - size >= m && y <= h - m;
        const [x, y] = spots.find(fits) ?? (narrow ? [w / 2 - tw / 2, h - m] : [m, h - m]);
        ctx.globalAlpha = a * 0.8;
        ctx.textAlign = 'left';
        ctx.fillText(line, x, y);
      }
    }
    const cap = shown.at ? 0 : t < T.gather[0] ? 1 - span(t, T.gather[0] - 0.015, T.gather[0] + 0.01) : ease.inOutQuad(span(t, ...T.caption));
    if (cap > 0.001) {
      ctx.globalAlpha = cap * 0.62;
      if (narrow) { ctx.textAlign = 'center'; ctx.fillText(line, w / 2, h - m); }
      else { ctx.textAlign = 'left'; ctx.fillText(line, m, h - m); }
    }
    ctx.globalAlpha = 1;
  }

  /** Until the hit: the mark draws in to the point where the hit will land, turning back against it. */
  function drawBefore(ctx, St, t) {
    const { R, cx, cy } = layout(St);
    const g = ease.inCubic(span(t, ...T.gather));
    const dir = St.f.dir;
    const z = lerp(1, SPARK, g);
    ctx.save();
    // Drawn back against the hit and turned against it: the wind-up. At the hit it snaps forward.
    ctx.translate(cx - Math.cos(dir) * 0.05 * R * g, cy - Math.sin(dir) * 0.05 * R * g);
    ctx.rotate(-10 * DEG * g);
    ctx.scale(R * z, R * z);
    ctx.fillStyle = PAPER;
    ctx.beginPath();
    for (const sh of St.shards) {
      const d = sh.flyBy * (1 - g);
      const u = [Math.cos(sh.bisector) * d, Math.sin(sh.bisector) * d];
      if (sh.rest.length > 2) tracePoly(ctx, sh.rest.map(([x, y]) => [x + u[0], y + u[1]]));
    }
    ctx.fill();
    ctx.restore();
  }

  /** From the hit: the cracks run with light, the burst, the pictures, the settle. */
  function drawAfter(ctx, St, t, prev, prevZ = 1) {
    const { R, cx, cy } = layout(St);
    const k = (t - T.hit) * D; // seconds since the hit
    const dir = St.f.dir;
    const ud = [Math.cos(dir), Math.sin(dir)];
    // The shards burst out from the spark they drew into: the whole mark grows back about the hit.
    const burst = ease.outExpo(span(k, ...S.fly));
    const scale = lerp(SPARK, 1, burst);
    const shake = Math.exp(-k * 14) * Math.sin(k * Math.PI * 2 * 11) * 0.014 * R;
    const px = 1 / (R * scale);
    const settle = ease.outBack(ease.inOutQuad(span(t, ...T.settle)), 1.4);
    const fl = flight(k) * (1 - settle); // the burst beyond the mark's own pose
    const open = burst; // back out to the mark's own pose

    // The piece that was there before is knocked away from the new hit (after a click), whole
    // and opaque, shrinking as it goes.
    if (prev && k < S.flyOff) {
      const P = layout(prev);
      const a = ease.outQuad(span(k, 0, S.flyOff));
      const pc = [P.cx + prev.e.cx * P.R, P.cy + prev.e.cy * P.R];
      const away = [pc[0] - cx, pc[1] - cy];
      const al = Math.hypot(away[0], away[1]) || 1;
      const pd = al > 1 ? [away[0] / al, away[1] / al] : [Math.cos(prev.f.dir), Math.sin(prev.f.dir)];
      ctx.save();
      ctx.translate(P.cx + pd[0] * a * P.R * 0.9, P.cy + pd[1] * a * P.R * 0.9);
      ctx.scale(P.R * prevZ * (1 - 0.45 * a), P.R * prevZ * (1 - 0.45 * a));
      ctx.fillStyle = PAPER;
      ctx.beginPath();
      for (const sh of prev.shards) if (sh.poly.length > 2) tracePoly(ctx, sh.poly);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(cx + ud[0] * shake, cy + ud[1] * shake);
    ctx.scale(R * scale, R * scale);

    // The shards, the cracks between them opening, flown out along their own lines, a little turned.
    const g = St.f.rule.gap;
    const now = St.shards.map((sh) => {
      const cut = cutShard(sh, g);
      const d = sh.flyBy * open + sh.lift * fl;
      const pose = poser(sh.c, sh.turn * fl, Math.cos(sh.bisector) * d, Math.sin(sh.bisector) * d, 1 + 0.06 * fl);
      return { sh, cut, pose, poly: cut.map(pose) };
    });

    // Light in the cracks: a line that runs from the hit to the crack's end, as wide as the crack
    // (2 to 6 px), then drains from the hit outward. Kept inside the pieces' outline.
    if (k < S.drain[1] + S.raceStagger * 8) {
      ctx.save();
      ctx.beginPath();
      tracePoly(ctx, hullOf(now.flatMap((s) => s.poly)));
      ctx.clip();
      ctx.fillStyle = BLUE;
      ctx.beginPath();
      St.f.cracks.forEach((c, i) => {
        const A = now[c.left];
        const B = now[c.right];
        const st = St.raceAt[i] * S.raceStagger;
        const run = ease.outExpo(span(k, st, st + S.race));
        const drain = ease.inQuad(span(k, S.drain[0] + st, S.drain[1] + st));
        if (run <= 0 || drain >= 1) return;
        const on = (rr) => {
          const q = [Math.cos(c.a) * rr, Math.sin(c.a) * rr];
          const qa = A.pose(q);
          const qb = B.pose(q);
          return { m: [(qa[0] + qb[0]) / 2, (qa[1] + qb[1]) / 2], w: Math.hypot(qb[0] - qa[0], qb[1] - qa[1]) };
        };
        const p0 = on(0).m;
        const end = on(c.crack);
        const mid = on(c.crack / 2);
        const L = [end.m[0] - p0[0], end.m[1] - p0[1]];
        const ll = Math.hypot(L[0], L[1]) || 1;
        const n = [-L[1] / ll, L[0] / ll];
        const wid = clamp(mid.w - g * 0, 2 * px, 6 * px) / 2;
        const a = [p0[0] + L[0] * drain, p0[1] + L[1] * drain];
        const b = [p0[0] + L[0] * run, p0[1] + L[1] * run];
        if (run <= drain) return;
        tracePoly(ctx, [[a[0] + n[0] * wid, a[1] + n[1] * wid], [b[0] + n[0] * wid, b[1] + n[1] * wid], [b[0] - n[0] * wid, b[1] - n[1] * wid], [a[0] - n[0] * wid, a[1] - n[1] * wid]]);
      });
      ctx.fill();
      ctx.restore();
    }

    for (const s of now) {
      if (s.poly.length < 3) continue;
      ctx.fillStyle = PAPER;
      ctx.beginPath();
      tracePoly(ctx, s.poly);
      ctx.fill();
      // A project wipes in from the hit outwards, holds, and wipes on out.
      const inA = T.picIn[0] + s.sh.order * (T.picIn[1] - T.picIn[0] - S.wipe / D);
      const outA = T.picOut[0] + s.sh.order * (T.picOut[1] - T.picOut[0] - S.wipe / D);
      const wi = ease.inOutCubic(span(t, inA, inA + S.wipe / D));
      const wo = ease.inOutCubic(span(t, outA, outA + S.wipe / D));
      const img = images[s.sh.pic];
      if (wi <= 0 || wo >= 1 || !img) continue;
      const ub = [Math.cos(s.sh.bisector), Math.sin(s.sh.bisector)];
      const apex = nearest(s.cut, [0, 0]);
      let far = 0;
      for (const p of s.cut) far = Math.max(far, (p[0] - apex[0]) * ub[0] + (p[1] - apex[1]) * ub[1]);
      let win = clipHalfPlane(s.cut, [apex[0] + ub[0] * far * wi, apex[1] + ub[1] * far * wi], [-ub[0], -ub[1]]);
      if (wo > 0) win = clipHalfPlane(win, [apex[0] + ub[0] * far * wo, apex[1] + ub[1] * far * wo], ub);
      if (win.length < 3) continue;
      const box = extentOf([s.poly]);
      const hold = span(t, inA, outA + S.wipe / D);
      // The picture's subject sits two thirds of the way out, where the shard is widest and its tip begins.
      const tipward = s.pose([apex[0] + ub[0] * far * 0.62, apex[1] + ub[1] * far * 0.62]);
      ctx.save();
      ctx.beginPath();
      tracePoly(ctx, win.map(s.pose));
      ctx.clip();
      coverAt(ctx, img, box, FOCUS[s.sh.pic] ?? [0.5, 0.5], tipward, 1.05 + 0.05 * hold);
      // Lift the blacks, so a dark corner of a picture never erases a shard's point.
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = 'rgba(236, 235, 230, 0.16)';
      ctx.fillRect(box.x0, box.y0, box.w, box.h);
      ctx.restore();
    }
    ctx.restore();
  }

  const nearest = (poly, q) => {
    let best = poly[0];
    let bd = Infinity;
    for (const p of poly) { const d = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2; if (d < bd) { bd = d; best = p; } }
    return best;
  };

  const tl = timeline({ duration: D, loop: true, render: (t, dt) => frame(t, dt) });
  stage.onResize(() => tl.redraw());

  // A click (not a touch that scrolls) strikes where it lands: that spot is a place with its own
  // fracture, and the hit travels from there through where the mark sits.
  const onClick = (ev) => {
    const r = el.getBoundingClientRect();
    const u = clamp((ev.clientX - r.left) / r.width);
    const v = clamp((ev.clientY - r.top) / r.height);
    const { R, cx, cy } = layout(home);
    const mx = cx + home.e.cx * R;
    const my = cy + home.e.cy * R;
    const px = u * stage.width;
    const py = v * stage.height;
    const far = Math.hypot(mx - px, my - py) > R * 0.15;
    const dir = far ? Math.atan2(my - py, mx - px) : null;
    const was = tl.t < T.hit ? cyc.before : cyc.after;
    // The piece on screen flies off at the size it is now (smaller if it was drawing in).
    const prevZ = tl.t < T.hit ? lerp(1, SPARK, ease.inCubic(span(tl.t, ...T.gather))) : 1;
    cyc = { before: was, after: strike(placeAt(u, v), { at: [u, v], dir }), done: false, prevZ };
    tl.seek(T.hit); // the hit lands on the next frame
    tl.play();
  };
  el.addEventListener('click', onClick);
  el.style.cursor = 'crosshair';
  const ctrl = withCleanup(tl, stage.destroy, () => { dead = true; el.removeEventListener('click', onClick); });
  ctrl.ready = ready;
  return ctrl;
}

// Application ------------------------------------------------------------------

/**
 * Places SMASH has worked, and the pictures that go with them. Seeds come from the coordinates:
 * each venue's reference point (an entrance, a stage, a square in front) within about 100 m of
 * the building, chosen so neighbouring marks differ in silhouette.
 */
const PLACES = [
  { venue: 'Studio', city: 'Stockholm', lat: HOME.lat, lon: HOME.lon, img: 11, home: true },
  { venue: 'Harpa', city: 'Reykjavík', lat: 64.1511, lon: -21.9323, img: 1 },
  { venue: 'Icehotel', city: 'Jukkasjärvi', lat: 67.8475, lon: 20.5955, img: 2 },
  { venue: 'Cosmonova', city: 'Stockholm', lat: 59.3686, lon: 18.055, img: 3 },
  { venue: 'Hemisfèric', city: 'Valencia', lat: 39.4549, lon: -0.3485, img: 0 },
  { venue: 'City Hall', city: 'Uppsala', lat: 59.8577, lon: 17.6401, img: 7 },
];
const MAIN = PLACES[2];
const FACADE = PLACES[5];

let uid = 0;
const esc = (v) => String(v).replace(/[<&"]/g, (c) => ({ '<': '&lt;', '&': '&amp;', '"': '&quot;' })[c]);
const text = (x, y, str, { size = 16, family = GROT, weight = 400, fill = PAPER, opacity = 1, anchor = 'start', spacing = 0 } = {}) =>
  `<text x="${f2(x)}" y="${f2(y)}" font-family='${family}' font-size="${size}" font-weight="${weight}" fill="${fill}" fill-opacity="${opacity}" text-anchor="${anchor}" letter-spacing="${spacing}">${esc(str)}</text>`;

/** An image placed to cover a box, zoomed by z, its focus (0..1) near the target, turned by a degrees about the target. */
function imageAt(href, natural, box, focus, target, z = 1, a = 0) {
  const s = Math.max(box.w / natural[0], box.h / natural[1]) * z;
  const iw = natural[0] * s;
  const ih = natural[1] * s;
  const x = clamp(target[0] - focus[0] * iw, box.x0 + box.w - iw, box.x0);
  const y = clamp(target[1] - focus[1] * ih, box.y0 + box.h - ih, box.y0);
  const rot = a ? ` transform="rotate(${f2(a)} ${f2(target[0])} ${f2(target[1])})"` : '';
  return `<image href="${href}" x="${f2(x)}" y="${f2(y)}" width="${f2(iw)}" height="${f2(ih)}" preserveAspectRatio="none"${rot}/>`;
}
const NATURAL = [[1280, 853], [1280, 720], [1280, 852], [853, 1280], [1280, 720], [1280, 853], [1280, 854], [1280, 720], [1280, 720], [1280, 720], [1024, 1280], [1280, 720]];
/** A veil over a picture that lifts its blacks, so a dark corner never erases a shard's point. */
const LIFT = 0.14;

/** A place's fracture with its hit at (hx, hy) and reach r: in one colour, and its largest shard a window when it is big enough to read as one. */
function familyMark(f, hx, hy, r, imgIndex, images, id) {
  const sh = kept(f);
  let big = 0;
  sh.forEach((s, i) => { if (Math.abs(areaOf(s.poly)) > Math.abs(areaOf(sh[big].poly))) big = i; });
  const win = sh[big];
  const b = extentOf([win.poly]);
  // A window only if the shard is at least 28 px across where it is widest.
  const across = (2 * Math.abs(areaOf(win.poly)) * r * r) / (Math.max(b.w, b.h) * r);
  const pic = across >= 28 && images;
  const rest = sh.filter((_, i) => !pic || i !== big).map((s) => pathOf(s.poly, r, hx, hy)).join('');
  if (!pic) return `<path d="${rest}" fill="${PAPER}"/>`;
  const box = { x0: hx + b.x0 * r, y0: hy + b.y0 * r, w: b.w * r, h: b.h * r };
  const d = pathOf(win.poly, r, hx, hy);
  return `<path d="${rest}" fill="${PAPER}"/><clipPath id="${id}"><path d="${d}"/></clipPath>`
    + `<g clip-path="url(#${id})">${imageAt(images[imgIndex], NATURAL[imgIndex], box, FOCUS[imgIndex], [box.x0 + box.w / 2, box.y0 + box.h / 2], 1.1)}</g>`
    + `<path d="${d}" fill="${PAPER}" fill-opacity="${LIFT}"/>`;
}

/**
 * The project's fracture, big, each shard a window onto a different part of its picture: the
 * shards take the picture's regions in turn, zoomed 1.0 to 2.4 and turned with the shard.
 */
const ICE_REGIONS = [[0.5, 0.42], [0.8, 0.62], [0.5, 0.1], [0.2, 0.6], [0.5, 0.88], [0.1, 0.25]];
function heroMark(f, hx, hy, r, href, natural, id) {
  const defs = [];
  const body = [];
  const sh = kept(f);
  const order = sh.map((_, i) => i).sort((a, b) => Math.abs(areaOf(sh[b].poly)) - Math.abs(areaOf(sh[a].poly)));
  const rr = rng(f.seed ^ 0x51ed);
  order.forEach((i, k) => {
    const s = sh[i];
    const cid = `${id}-s${i}`;
    const d = pathOf(s.poly, r, hx, hy);
    defs.push(`<clipPath id="${cid}"><path d="${d}"/></clipPath>`);
    const b = extentOf([s.poly]);
    const box = { x0: hx + b.x0 * r, y0: hy + b.y0 * r, w: b.w * r, h: b.h * r };
    const z = [1, 1.7, 2.4, 1.4, 2.1, 1.2][k % 6];
    const turn = (rr() * 2 - 1) * 6;
    const c = [hx + s.c[0] * r + s.fly[0] * r, hy + s.c[1] * r + s.fly[1] * r];
    body.push(`<g clip-path="url(#${cid})">${imageAt(href, natural, box, ICE_REGIONS[k % ICE_REGIONS.length], c, z * 1.08, turn)}</g><path d="${d}" fill="${PAPER}" fill-opacity="${LIFT * 0.6}"/>`);
  });
  return `<defs>${defs.join('')}</defs>${body.join('')}`;
}

/** The hero fracture fitted into a band of the page (on a phone), spilling off its left edge. */
function hero(f, { top, bottom, right, bleed }, href, natural, id) {
  const e = extent(f);
  let r = (bottom - top) / e.h;
  const place = () => [-e.x0 * r - bleed * e.w * r, top - e.y0 * r];
  let [hx, hy] = place();
  if (hx + e.x1 * r > right) { r *= right / (hx + e.x1 * r); [hx, hy] = place(); hy += ((bottom - top) - e.h * r) / 2; }
  return heroMark(f, hx, hy, r, href, natural, id);
}

/** The hero fracture in the page's top left corner: its near side ends at right, bottom; its far side (the hit runs up and left) runs off the page. */
function corner(f, { right, bottom, reach }, href, natural, id) {
  const e = extent(f);
  return heroMark(f, right - e.x1 * reach, bottom - e.y1 * reach, reach, href, natural, id);
}

/**
 * The fracture at building scale: a place's mark projected onto its own facade. The shards are
 * light on the stone, the picture darkened under them the way a projection takes over a wall.
 */
function facadeTile(x, y, w, h, place, href, id) {
  const f = fracture(placeSeed(place.lat, place.lon));
  const e = extent(f);
  const nat = NATURAL[7];
  const s = Math.max(w / nat[0], h / nat[1]);
  const iw = nat[0] * s;
  const ih = nat[1] * s;
  const ix = x + (w - iw) / 2;
  const iy = y + (h - ih) * 0.32;
  // The facade in the picture: from about 0.2 to 0.76 across and 0.27 to 0.6 down.
  const fx0 = ix + iw * 0.21;
  const fx1 = ix + iw * 0.75;
  const fy0 = iy + ih * 0.26;
  const fy1 = iy + ih * 0.6;
  // Sized to the facade's height, spilling a little onto the tower, as a projection does.
  const r = Math.min((fx1 - fx0) / e.w, ((fy1 - fy0) * 1.3) / e.h);
  const hx = (fx0 + fx1) / 2 - e.cx * r;
  const hy = fy1 - e.y1 * r;
  const d = kept(f).map((sh) => pathOf(sh.poly, r, hx, hy)).join('');
  return `<clipPath id="${id}"><rect x="${f2(x)}" y="${f2(y)}" width="${f2(w)}" height="${f2(h)}"/></clipPath>`
    + `<g clip-path="url(#${id})"><image href="${href}" x="${f2(ix)}" y="${f2(iy)}" width="${f2(iw)}" height="${f2(ih)}" preserveAspectRatio="none"/>`
    + `<rect x="${f2(x)}" y="${f2(y)}" width="${f2(w)}" height="${f2(h)}" fill="${INK}" fill-opacity="0.66"/>`
    + `<path d="${d}" fill="${PAPER}" fill-opacity="0.9" style="mix-blend-mode:screen"/></g>`;
}

/** Text widths, measured in the real fonts once they have loaded. */
let measurer = null;
function textWidth(str, size, weight = 400, family = GROT) {
  measurer ??= document.createElement('canvas').getContext('2d');
  measurer.font = `${weight} ${size}px ${family}`;
  return measurer.measureText(str).width;
}

const COPY = {
  label: 'Project 031  ·  Winter 2025/26',
  title: 'Icehotel 36',
  sub: 'An art suite in Jukkasjärvi',
  para: ['A room cut from the ice of the Torne River and lit from', 'inside its own walls. Guests fall asleep under a slow', 'aurora that never runs the same way twice. In spring', 'the suite melts back into the river it came from.'],
  paraNarrow: ['A room cut from the ice of the Torne River', 'and lit from inside its own walls. Guests', 'fall asleep under a slow aurora that never', 'runs the same way twice.'],
};

function desktopPage(id, images) {
  const W = 1600;
  const H = 1000;
  const M = 56;
  const mainF = fracture(placeSeed(MAIN.lat, MAIN.lon));
  const parts = [`<rect width="${W}" height="${H}" fill="${INK}"/>`];

  // The project: its own fracture, big in the corner, the far side of the hit spilling off the page.
  parts.push(corner(mainF, { right: 790, bottom: 676, reach: 700 }, images[MAIN.img], NATURAL[MAIN.img], `${id}-hero`));

  // The site's bar, over the page's own column: the lockup, small, and the navigation.
  const tx = 880;
  const barY = 64;
  parts.push(lockupAt(tx, barY, 34));
  const nav = ['Work', 'Places', 'Studio', 'Contact'];
  let nx = W - M;
  for (let i = nav.length - 1; i >= 0; i--) {
    parts.push(text(nx, barY + 6, nav[i], { size: 18, anchor: 'end', opacity: i === 1 ? 1 : 0.6 }));
    nx -= textWidth(nav[i], 18) + 32;
  }

  parts.push(text(tx, 222, COPY.label, { size: 15, family: MONO, opacity: 0.55 }));
  parts.push(text(tx - 5, 326, COPY.title, { size: 104, weight: 500, spacing: -3 }));
  parts.push(text(tx, 380, COPY.sub, { size: 34, opacity: 0.58, spacing: -0.5 }));
  COPY.para.forEach((line, i) => parts.push(text(tx, 452 + i * 31, line, { size: 21, opacity: 0.86 })));
  const fp = [['Place', `${MAIN.venue}, ${MAIN.city}`], ['Position', `${fmtLat(MAIN.lat)}  ${fmtLon(MAIN.lon)}`], ['Opened', '13 December 2025']];
  fp.forEach(([k, v], i) => {
    parts.push(text(tx, 620 + i * 25, k, { size: 14, family: MONO, opacity: 0.45 }));
    parts.push(text(tx + 128, 620 + i * 25, v, { size: 14, family: MONO, opacity: 0.8 }));
  });

  // Every place its own fracture: five marks, and one of them at building scale.
  const top = 712;
  parts.push(`<rect x="0" y="${top - 30}" width="${W}" height="${H - top + 30}" fill="${INK}"/>`);
  parts.push(`<rect x="${M}" y="${top}" width="${W - 2 * M}" height="1" fill="${PAPER}" fill-opacity="0.18"/>`);
  parts.push(text(M, top + 38, 'Every place its own fracture', { size: 20, weight: 500 }));
  parts.push(text(W - M, top + 38, `${PLACES.length} of 48 places`, { size: 14, family: MONO, opacity: 0.5, anchor: 'end' }));
  const tileW = 470;
  const tileX = W - M - tileW;
  const tileY = top + 64;
  const tileH = H - tileY - 30;
  const row = PLACES.filter((p) => p !== FACADE);
  const cw = (tileX - 32 - M) / row.length;
  const midY = tileY + tileH / 2;
  row.forEach((pl, i) => {
    const f = fracture(placeSeed(pl.lat, pl.lon));
    const fe = extent(f);
    const r = 78 / Math.max(fe.w, fe.h);
    const x0 = M + i * cw;
    const here = pl === MAIN;
    parts.push(familyMark(f, x0 + 39 - fe.cx * r, midY - fe.cy * r, r, pl.img, images, `${id}-p${i}`));
    if (here) parts.push(`<rect x="${f2(x0 - 14)}" y="${f2(midY - 49)}" width="3" height="98" fill="${BLUE}"/>`);
    parts.push(text(x0 + 92, midY - 24, pl.venue, { size: 17, weight: 500 }));
    parts.push(text(x0 + 92, midY - 3, pl.city, { size: 15, opacity: 0.55 }));
    parts.push(text(x0 + 92, midY + 26, fmtLat(pl.lat), { size: 12, family: MONO, opacity: 0.5 }));
    parts.push(text(x0 + 92, midY + 42, fmtLon(pl.lon), { size: 12, family: MONO, opacity: 0.5 }));
  });
  // The facade: the same rule at the scale of a building.
  parts.push(facadeTile(tileX, tileY, tileW, tileH, FACADE, images[FACADE.img], `${id}-facade`));
  parts.push(text(tileX + 16, tileY + 28, `${FACADE.venue}, ${FACADE.city}`, { size: 15, weight: 500 }));
  parts.push(text(tileX + 16, tileY + 47, `${fmtLat(FACADE.lat)}  ${fmtLon(FACADE.lon)}`, { size: 12, family: MONO, opacity: 0.7 }));
  parts.push(text(tileX + tileW - 16, tileY + 28, 'Projected, 24 × 14 m', { size: 12, family: MONO, opacity: 0.7, anchor: 'end' }));
  return { W, H, body: parts.join('') };
}

function phonePage(id, images) {
  const W = 390;
  const M = 20;
  const mainF = fracture(placeSeed(MAIN.lat, MAIN.lon));
  const parts = [`<rect width="${W}" height="3000" fill="${INK}"/>`];
  parts.push(hero(mainF, { top: 86, bottom: 548, right: 380, bleed: 0.12 }, images[MAIN.img], NATURAL[MAIN.img], `${id}-hero`));
  parts.push(`<rect x="0" y="0" width="${W}" height="72" fill="${INK}"/>`);
  parts.push(lockupAt(M, 38, 26));
  parts.push(text(W - M, 43, 'Menu', { size: 15, anchor: 'end', opacity: 0.8 }));
  let y = 600;
  parts.push(`<rect x="0" y="${y - 26}" width="${W}" height="2000" fill="${INK}"/>`);
  parts.push(text(M, y, COPY.label, { size: 11, family: MONO, opacity: 0.55 }));
  y += 50;
  parts.push(text(M - 2, y, COPY.title, { size: 44, weight: 500, spacing: -1.2 }));
  y += 30;
  parts.push(text(M, y, COPY.sub, { size: 18, opacity: 0.58 }));
  y += 40;
  COPY.paraNarrow.forEach((line, i) => parts.push(text(M, y + i * 23, line, { size: 16, opacity: 0.86 })));
  y += 4 * 23 + 20;
  [['Place', `${MAIN.venue}, ${MAIN.city}`], ['Position', `${fmtLat(MAIN.lat)}  ${fmtLon(MAIN.lon)}`]].forEach(([k, v], i) => {
    parts.push(text(M, y + i * 19, k, { size: 11, family: MONO, opacity: 0.45 }));
    parts.push(text(M + 84, y + i * 19, v, { size: 11, family: MONO, opacity: 0.8 }));
  });
  y += 2 * 19 + 26;
  parts.push(`<rect x="${M}" y="${y}" width="${W - 2 * M}" height="1" fill="${PAPER}" fill-opacity="0.18"/>`);
  y += 32;
  parts.push(text(M, y, 'Every place its own fracture', { size: 16, weight: 500 }));
  y += 22;
  const four = PLACES.filter((p) => p !== MAIN && p !== FACADE);
  const cw = (W - 2 * M) / 2;
  four.forEach((pl, i) => {
    const f = fracture(placeSeed(pl.lat, pl.lon));
    const fe = extent(f);
    const r = 64 / Math.max(fe.w, fe.h);
    const x0 = M + (i % 2) * cw;
    const y0 = y + Math.floor(i / 2) * 96;
    parts.push(familyMark(f, x0 + 34 - fe.cx * r, y0 + 40 - fe.cy * r, r, pl.img, images, `${id}-q${i}`));
    parts.push(text(x0 + 80, y0 + 30, pl.venue, { size: 14, weight: 500 }));
    parts.push(text(x0 + 80, y0 + 46, pl.city, { size: 12, opacity: 0.55 }));
    parts.push(text(x0 + 80, y0 + 64, `${fmtLat(pl.lat)}`, { size: 11, family: MONO, opacity: 0.5 }));
  });
  y += 2 * 96 + 6;
  const th = 190;
  parts.push(facadeTile(M, y, W - 2 * M, th, FACADE, images[FACADE.img], `${id}-facade`));
  parts.push(text(M + 12, y + 22, `${FACADE.venue}, ${FACADE.city}`, { size: 13, weight: 500 }));
  parts.push(text(M + 12, y + 38, `${fmtLat(FACADE.lat)}  ${fmtLon(FACADE.lon)}`, { size: 11, family: MONO, opacity: 0.7 }));
  y += th + 28;
  return { W, H: Math.round(y), body: parts.join('') };
}

export function application(el, { images = IMAGES } = {}) {
  const id = `imp${++uid}`;
  const aspect = el.style.aspectRatio;
  let mode = '';
  let dead = false;
  const render = () => {
    if (dead) return;
    const narrow = el.getBoundingClientRect().width < 600;
    const page = narrow ? phonePage(id, images) : desktopPage(id, images);
    // On a phone the page is a phone page: taller than the desktop box, so the box follows it.
    el.style.aspectRatio = narrow ? `${page.W} / ${page.H}` : aspect;
    mode = narrow ? 'phone' : 'desk';
    el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${page.W} ${page.H}" preserveAspectRatio="xMidYMid slice" style="position:absolute;inset:0;width:100%;height:100%;display:block">${page.body}</svg>`;
  };
  render();
  const ro = new ResizeObserver(() => {
    const narrow = el.getBoundingClientRect().width < 600;
    if ((narrow ? 'phone' : 'desk') !== mode) render();
  });
  ro.observe(el);
  const ready = Promise.all([
    ...[MAIN.img, FACADE.img].map((i) => loadImage(images[i]).catch(() => {})),
    document.fonts?.load(`500 20px ${GROT}`),
    document.fonts?.load(`400 20px ${GROT}`),
    document.fonts?.load(`14px ${MONO}`),
  ]).catch(() => {}).then(render); // again, now the navigation can be measured in its real font
  return { ready, destroy() { dead = true; ro.disconnect(); el.innerHTML = ''; el.style.aspectRatio = aspect; } };
}

/** For the export script (impact/export-extra.mjs): the logo's fracture, the places, the set mark. */
export const EXTRA = { get LOGO() { return LOGO; }, get PLACES() { return PLACES; }, extent, setPolys, LOCKUP };

// Specimen -----------------------------------------------------------------------

export function specimen(el) {
  const f = LOGO;
  const hitFrom = 'the lower right';
  el.innerHTML = `
    <div class="spec-display">
      <p class="spec-headline" style="font-family:${esc(GROT)};font-weight:500;letter-spacing:-0.03em;">Smash ultimately wants to make people feel.</p>
      <p class="label">Display: Scto Grotesk A Medium</p>
      <p class="note">${esc(info.type.display.note)}</p>
    </div>
    <div class="spec-text">
      <p class="spec-body" style="font-family:${esc(GROT)};">Smash is an immersive experience studio creating physical and digital experiences that make people feel. They combine art, technology, storytelling and spatial experiences to create memorable moments, from large-scale public installations to intimate museum experiences.</p>
      <p class="spec-body" style="font-family:${esc(MONO)};font-size:14px;line-height:1.7;opacity:0.8;white-space:pre-wrap;">${esc(`Place     ${HOME.place}\nPosition  ${fmtLat(HOME.lat)}  ${fmtLon(HOME.lon)}\nSeed      ${f.seed}\nShards    ${f.n}, over ${f.spread}°\nHit       from ${hitFrom}`)}</p>
      <p class="label">Text: Scto Grotesk A Regular · Labels: System-85 Mono</p>
      <p class="note">${esc(info.type.text.note)}</p>
    </div>`;
  return { destroy() { el.innerHTML = ''; } };
}
