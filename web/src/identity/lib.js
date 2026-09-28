// Shared helpers for the six directions. Read, don't change: copy into your
// own module if you need something different.

export const INK = '#0e0c0b';
export const PAPER = '#ecebe6';
// The studio's current palette, for reference.
export const BROWN = '#1f1915';
export const CREAM = '#f3efe8';
export const YELLOW = '#f7be04';

/** Twelve project pictures, 1280 px webp, for the applications. */
export const IMAGES = [
  '01-balena-voladora', '02-harpa', '03-icehotel', '04-dome-dreaming', '05-lyra', '06-firestarter',
  '07-svartljus', '08-resonance', '09-emerging-sensation', '10-transcend', '11-eastern-city-portal', '12-vista',
].map((f) => new URL(`./img/${f}.webp`, import.meta.url).href);

// Numbers

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
/** Where t is between a and b, as 0..1 (clamped): the local progress of one step of a timeline. */
export const span = (t, a, b) => clamp((t - a) / (b - a));
export const smoothstep = (a, b, x) => { const t = span(x, a, b); return t * t * (3 - 2 * t); };

/** A seeded random number generator (mulberry32): rng(seed)() gives 0..1, the same every time. */
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const ease = {
  linear: (t) => t,
  inQuad: (t) => t * t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2),
  inCubic: (t) => t ** 3,
  outCubic: (t) => 1 - (1 - t) ** 3,
  inOutCubic: (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2),
  outQuart: (t) => 1 - (1 - t) ** 4,
  inExpo: (t) => (t === 0 ? 0 : 2 ** (10 * t - 10)),
  outExpo: (t) => (t === 1 ? 1 : 1 - 2 ** (-10 * t)),
  inOutExpo: (t) => (t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? 2 ** (20 * t - 10) / 2 : (2 - 2 ** (-20 * t + 10)) / 2),
  outBack: (t, s = 1.70158) => 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2,
  outElastic: (t) => (t === 0 ? 0 : t === 1 ? 1 : 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
};

// Geometry: points are [x, y]

/** An SVG path for a closed polygon. */
export const polyPath = (pts, digits = 2) =>
  pts.length ? `M${pts.map(([x, y]) => `${+x.toFixed(digits)} ${+y.toFixed(digits)}`).join('L')}Z` : '';

/** The part of a polygon on the side of the line through p where (q - p) · n >= 0 (Sutherland–Hodgman). */
export function clipHalfPlane(poly, p, n) {
  const side = ([x, y]) => (x - p[0]) * n[0] + (y - p[1]) * n[1];
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const sa = side(a);
    const sb = side(b);
    if (sa >= 0) out.push(a);
    if ((sa >= 0) !== (sb >= 0)) {
      const k = sa / (sa - sb);
      out.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]);
    }
  }
  return out;
}

/** A convex polygon cut in two by the line through p along direction d: [left, right]. */
export function splitPolygon(poly, p, d) {
  const n = [-d[1], d[0]];
  return [clipHalfPlane(poly, p, n), clipHalfPlane(poly, p, [-n[0], -n[1]])];
}

/** Shrink a convex polygon by moving every edge inward by g (for the gaps between shards). */
export function insetPolygon(poly, g) {
  let out = poly;
  const area = polygonArea(poly);
  const dir = area > 0 ? 1 : -1;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    const n = [(-dy / len) * dir, (dx / len) * dir];
    out = clipHalfPlane(out, [a[0] + n[0] * g, a[1] + n[1] * g], n);
    if (!out.length) break;
  }
  return out;
}

/** Signed area (positive when counter-clockwise in a y-up frame). */
export function polygonArea(poly) {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    s += x1 * y2 - x2 * y1;
  }
  return s / 2;
}

export function centroid(poly) {
  let x = 0;
  let y = 0;
  for (const p of poly) { x += p[0]; y += p[1]; }
  return [x / poly.length, y / poly.length];
}

/** Rotate and move points: about c by angle a (radians), then by [dx, dy]. */
export function transform(pts, c, a, dx = 0, dy = 0) {
  const cs = Math.cos(a);
  const sn = Math.sin(a);
  return pts.map(([x, y]) => {
    const u = x - c[0];
    const v = y - c[1];
    return [c[0] + u * cs - v * sn + dx, c[1] + u * sn + v * cs + dy];
  });
}

// SVG

/** An SVG string with a viewBox and no width or height; `attrs` is extra attributes as a string. */
export const svg = (w, h, inner, attrs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" ${attrs}>${inner}</svg>`;

// Live pieces

/**
 * A timeline: render(t, dt) is called with t in 0..1 over `duration` seconds.
 * Returns the controller the page expects: { duration, seek(t), play(), pause(), destroy(), t }.
 * With loop false it stops at 1. render must draw the same frame for the same t.
 */
export function timeline({ duration = 4, loop = true, render }) {
  let t = 0;
  let playing = false;
  let raf = 0;
  let last = 0;
  const frame = (now) => {
    const dt = last ? (now - last) / 1000 : 0;
    last = now;
    t += dt / duration;
    if (t >= 1) {
      if (loop) t %= 1;
      else { t = 1; playing = false; }
    }
    render(t, dt);
    if (playing) raf = requestAnimationFrame(frame);
  };
  return {
    duration,
    get t() { return t; },
    get playing() { return playing; },
    seek(v) { t = clamp(v); render(t, 0); },
    play() {
      if (playing) return;
      if (!loop && t >= 1) t = 0;
      playing = true; last = 0; raf = requestAnimationFrame(frame);
    },
    pause() { playing = false; cancelAnimationFrame(raf); },
    destroy() { playing = false; cancelAnimationFrame(raf); },
    /** Draw the current frame again (after a resize, or when the pointer moves while paused). */
    redraw() { render(t, 0); },
  };
}

/**
 * A controller that also lets go of other things (stages, listeners) when destroyed.
 * Keeps the timeline's getters live (don't spread a controller: that freezes t and playing).
 */
export function withCleanup(ctrl, ...cleanups) {
  const destroy = ctrl.destroy;
  ctrl.destroy = () => { destroy?.(); for (const f of cleanups) f?.(); };
  return ctrl;
}

/**
 * A canvas filling el at the device's pixel ratio, kept to el's size.
 * { canvas, ctx | gl, width, height (css px), dpr, onResize(fn), destroy() }.
 * With webgl, a WebGL 2 context with preserveDrawingBuffer (the deck copies canvases).
 */
export function canvasStage(el, { webgl = false, alpha = true, antialias = true } = {}) {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
  if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
  el.appendChild(canvas);
  const stage = { canvas, width: 0, height: 0, dpr: 1, listeners: [] };
  if (webgl) stage.gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true, alpha, antialias, premultipliedAlpha: true });
  else stage.ctx = canvas.getContext('2d', { alpha });
  const fit = () => {
    const r = el.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(r.width));
    const h = Math.max(1, Math.round(r.height));
    if (w === stage.width && h === stage.height && dpr === stage.dpr) return;
    Object.assign(stage, { width: w, height: h, dpr });
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    if (stage.ctx) stage.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const fn of stage.listeners) fn(stage);
  };
  const ro = new ResizeObserver(fit);
  ro.observe(el);
  fit();
  stage.onResize = (fn) => { stage.listeners.push(fn); };
  // Browsers keep only about sixteen WebGL contexts, so give this one back.
  stage.destroy = () => { ro.disconnect(); stage.gl?.getExtension('WEBGL_lose_context')?.loseContext(); canvas.remove(); };
  return stage;
}

/**
 * The pointer over el, as 0..1 across and down, eased towards where it is.
 * { x, y, inside, destroy() }; x and y rest at 0.5 when the pointer is away.
 */
export function pointer(el, { onMove } = {}) {
  const p = { x: 0.5, y: 0.5, inside: false };
  const move = (e) => {
    const r = el.getBoundingClientRect();
    p.x = clamp((e.clientX - r.left) / r.width);
    p.y = clamp((e.clientY - r.top) / r.height);
    p.inside = true;
    onMove?.(p);
  };
  const leave = () => { p.inside = false; onMove?.(p); };
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerleave', leave);
  p.destroy = () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); };
  return p;
}

const cache = new Map();
/** An image, loaded once. */
export function loadImage(url) {
  if (!cache.has(url)) {
    cache.set(url, new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    }));
  }
  return cache.get(url);
}

/** Draw an image to cover a w × h box at x, y (like object-fit: cover). */
export function drawCover(ctx, img, x, y, w, h) {
  const s = Math.max(w / img.width, h / img.height);
  const sw = w / s;
  const sh = h / s;
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
}
