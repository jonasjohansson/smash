// The Aperture: the home page's opening.
//
// The original mark (mark.js) is drawn in ink, whole, on the first screen,
// with the showreel playing behind it: the film shows only through the
// slots, light through slits in a dark room. "Watch with sound" sits under
// it, at its first column. The mark's slots span whole columns, the ones
// next.css declares once (--mark-start, --mark-span: 3-10, 4-9 on a very wide,
// short screen, all 4 on a phone): the block's plain outer edge, 32 of its 552
// units each side, lies out past them, unseen on the ink. It stands from the
// header to the bottom margin; on a phone its slots become full-height columns
// of light (mark.js keeps the round ends round however far it stretches).
// Scrolling, while the stage is held:
//   1. door: every closed slot end runs out through the edge (inset 42 -> 0);
//      "Watch with sound" is gone from the first step;
//   2. open: the block grows to the screen's edges as its slots widen until
//      they meet (stroke 20 -> 54), and nothing of the ink is left.
// Then the film scrolls away as a picture.
// Reduced motion or Save-Data: no hold, no scrub; the poster in the still mark.

import { markShape, DEFAULTS, UNITS } from '/js/mark.js';
import { motion } from './motion.js';
import './reel.js';

const root = document.querySelector('[data-aperture]');

if (root) {
  const stage = root.querySelector('[data-ap-stage]');
  const canvas = root.querySelector('[data-ap-ink]');
  const row = root.querySelector('[data-ap-row]');
  const ctx = canvas.getContext('2d');
  const token = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const INK = token('--ink');
  const scrub = (t) => cubic(0.6, 0, 0.2, 1, t);
  const clamp = (v) => Math.min(1, Math.max(0, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  // The slots' width when they meet: their pitch is 52 units.
  const MET = 54;
  // The slot field: from the first slot's outer edge to the last's, in the block's 552 units.
  const EDGE = 32;
  const FIELD = UNITS.w - 2 * EDGE;

  let L = null;
  let raf = 0;
  let still = false;

  function layout() {
    still = motion.reduced || motion.slow;
    root.classList.toggle('no-scrub', still);
    if (still) {
      root.style.height = '';
      row.style.top = '';
      return;
    }
    const vw = stage.clientWidth;
    const vh = stage.clientHeight;
    const g = parseFloat(getComputedStyle(row).paddingLeft); // --g, the gutter and margin, resolved
    const cols = parseFloat(token('--cols'));
    const top = parseFloat(token('--header')); // under the header
    const gap = parseFloat(token('--s2'));
    const safe = parseFloat(getComputedStyle(stage).paddingBottom) || 0; // env(safe-area-inset-bottom)
    const room = vh - top - gap - row.offsetHeight - g - safe; // what the mark may take, height
    // The slot field on whole columns; the block reaches its plain edge past them.
    const col = (vw - 2 * g - (cols - 1) * g) / cols;
    const start = parseFloat(token('--mark-start'));
    const span = parseFloat(token('--mark-span'));
    const field = span * col + (span - 1) * g;
    const W = (field * UNITS.w) / FIELD;
    const H = room;
    const ox = g + (start - 1) * (col + g) - (EDGE * W) / UNITS.w;
    const dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round(vw * dpr);
    canvas.height = Math.round(vh * dpr);
    const phases = { door: 0.3 * vh, open: 0.7 * vh };
    const total = phases.door + phases.open;
    root.style.height = `${vh + total}px`;
    row.style.top = `${Math.round(top + H + gap)}px`;
    L = { vw, vh, W, H, ox, top, dpr, phases, total };
    draw();
  }

  function draw() {
    raf = 0;
    if (!L || still) return;
    const { vw, vh, W, H, ox, top, dpr, phases: P } = L;
    const y = Math.max(0, scrollY - root.offsetTop);
    const door = scrub(clamp(y / P.door));
    const open = scrub(clamp((y - P.door) / P.open));

    // The block's rectangle: the mark's own, growing to the screen (2px over, no seams).
    const x0 = lerp(ox, -2, open);
    const y0 = lerp(top, -2, open);
    const bw = lerp(W, vw + 4, open);
    const bh = lerp(H, vh + 4, open);

    row.style.visibility = y > 0 ? 'hidden' : '';

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, vw, vh);
    if (open >= 1) return; // the film alone

    const stroke = 20 + (MET - 20) * open;
    const p = { ...DEFAULTS, stroke, corner: (10 * stroke) / 20, inset: 42 * (1 - door), fit: 'stretch', padding: 0 };
    const s = markShape(p, bw, bh);

    // The ink round the block, overlapping it by a pixel: no seam.
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.rect(0, 0, vw, vh);
    ctx.rect(x0 + 1, y0 + 1, bw - 2, bh - 2);
    ctx.fill('evenodd');

    // The block, its slots cut through.
    ctx.save();
    ctx.translate(x0, y0);
    ctx.beginPath();
    ctx.rect(0, 0, bw, bh);
    ctx.clip();
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, bw, bh);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineCap = 'butt';
    ctx.lineJoin = s.join;
    ctx.strokeStyle = '#000';
    ctx.fillStyle = '#000';
    ctx.lineWidth = s.stroke;
    ctx.stroke(new Path2D(s.d));
    // The same slots with square bends, cut at the strength of the opening:
    // the ink outside each S's rounded turn thins away with the bars.
    if (open > 0) {
      ctx.globalAlpha = open;
      ctx.lineJoin = 'miter';
      ctx.stroke(new Path2D(markShape({ ...p, corner: 0 }, bw, bh).d));
      ctx.globalAlpha = 1;
      ctx.lineJoin = s.join;
    }
    ctx.beginPath();
    for (const [x, yy, r = s.stroke / 2] of s.dots) { ctx.moveTo(x + r, yy); ctx.arc(x, yy, r, 0, Math.PI * 2); }
    ctx.fill();
    // The outer bars thin from outside too, until they are gone.
    const edge = 17 * open * s.sx;
    if (edge > 0) { ctx.fillRect(0, 0, edge, bh); ctx.fillRect(bw - edge, 0, edge, bh); }
    ctx.restore();

  }

  const queue = () => { if (!raf) raf = requestAnimationFrame(draw); };
  addEventListener('scroll', queue, { passive: true });
  let rt = 0;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(layout, 80); });
  addEventListener('motionchange', layout);
  layout();
  document.fonts?.ready.then(layout);
}

/** cubic-bezier(x1, y1, x2, y2) at t, solved for x by Newton's method. */
function cubic(x1, y1, x2, y2, t) {
  const bx = (u) => 3 * x1 * u * (1 - u) ** 2 + 3 * x2 * u * u * (1 - u) + u ** 3;
  const by = (u) => 3 * y1 * u * (1 - u) ** 2 + 3 * y2 * u * u * (1 - u) + u ** 3;
  let u = t;
  for (let i = 0; i < 8; i++) {
    const d = (bx(u + 1e-4) - bx(u - 1e-4)) / 2e-4;
    if (!d) break;
    u -= (bx(u) - t) / d;
    u = Math.min(1, Math.max(0, u));
  }
  return by(u);
}
