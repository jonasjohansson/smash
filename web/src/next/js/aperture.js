// The Aperture: the home page's opening.
//
// The original mark (mark.js) is drawn in ink across the full grid, at its
// own proportions, so its ten slots fall on the page's ten gutters; the
// showreel plays behind it and shows only through the slots. Scrolling:
//   1. the facade rises, if it is taller than the screen (plain scrolling);
//   2. window to threshold: every closed slot end runs out through the edge
//      (mark.js `inset` 42 -> 0);
//   3. the slots widen (`stroke` 20 -> 51) until each bar is one unit, a
//      hairline on the column it stood on, and the ink round the block lifts;
//   4. the hairlines fade: the film is the whole screen, and scrolls away.
// Reduced motion or Save-Data: no pin, no scrub; the poster in the still mark.

import { markShape, DEFAULTS } from '/js/mark.js';
import { motion } from './motion.js';
import './reel.js';

const root = document.querySelector('[data-aperture]');
const header = document.querySelector('[data-header]');

if (root) {
  const stage = root.querySelector('[data-ap-stage]');
  const canvas = root.querySelector('[data-ap-ink]');
  const row = root.querySelector('[data-ap-row]');
  const intro = root.querySelector('[data-ap-intro]');
  const ctx = canvas.getContext('2d');
  const INK = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#0b0b0c';
  const scrub = (t) => cubic(0.6, 0, 0.2, 1, t);
  const clamp = (v) => Math.min(1, Math.max(0, v));

  let L = null;
  let raf = 0;
  let still = false;

  function layout() {
    still = motion.reduced || motion.slow;
    root.classList.toggle('no-scrub', still);
    if (still) {
      root.style.height = '';
      if (header) header.dataset.hold = 52;
      return;
    }
    const vw = stage.clientWidth;
    const vh = stage.clientHeight;
    const g = parseFloat(getComputedStyle(row).paddingLeft) || 16;
    const head = 52;
    const W = vw - 2 * g;
    const H = (W * 472) / 552;
    const rowH = row.offsetHeight;
    const gap = 12;
    // The mark's top: below the header, at least two gutters down.
    let top = Math.max(head + 20, 2 * g);
    const foot = top + H + gap + rowH + g;
    let rise = Math.max(0, foot - vh);
    // A mark that fits sits at the middle of the screen, where the film's
    // middle is (a portrait screen crops the film's sides, not its top).
    if (!rise) top = Math.max(top, (vh - H) / 2);
    const dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round(vw * dpr);
    canvas.height = Math.round(vh * dpr);
    const phases = { rise, door: 0.45 * vh, open: 1.1 * vh, fade: 0.35 * vh };
    const total = phases.rise + phases.door + phases.open + phases.fade;
    root.style.height = `${vh + total}px`;
    L = { vw, vh, g, W, H, top, gap, dpr, phases, total };
    if (header) header.dataset.hold = Math.round(total + vh - 52);
    draw();
  }

  function draw() {
    raf = 0;
    if (!L || still) return;
    const { vw, vh, W, H, top, gap, dpr, phases: P } = L;
    const y = Math.max(0, scrollY - root.offsetTop);
    const shift = Math.min(y, P.rise);
    const door = scrub(clamp((y - P.rise) / P.door));
    const open = scrub(clamp((y - P.rise - P.door) / P.open));
    const fade = clamp((y - P.rise - P.door - P.open) / P.fade);

    const stroke = 20 + 31 * open;
    const p = { ...DEFAULTS, stroke, corner: (10 * stroke) / 20, inset: 42 * (1 - door), fit: 'stretch', padding: 0 };
    const s = markShape(p, W, H);
    const ox = (vw - W) / 2;
    const oy = top - shift;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, vw, vh);
    ctx.fillStyle = INK;

    // The block, its slots cut through.
    ctx.save();
    ctx.translate(ox, oy);
    ctx.globalAlpha = 1 - fade;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.clip();
    ctx.lineCap = 'butt';
    ctx.lineJoin = s.join;
    ctx.lineWidth = s.stroke;
    ctx.strokeStyle = '#000';
    ctx.stroke(new Path2D(s.d));
    // The same slots with square bends, cut at the strength of the opening:
    // the ink outside each S's rounded turn thins away with the bars, so no
    // wedge is left standing once every bar is down to its hairline.
    if (open > 0) {
      ctx.globalAlpha = open;
      ctx.lineJoin = 'miter';
      ctx.stroke(new Path2D(markShape({ ...p, corner: 0 }, W, H).d));
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = '#000';
    ctx.beginPath();
    for (const [x, yy, r = s.stroke / 2] of s.dots) { ctx.moveTo(x + r, yy); ctx.arc(x, yy, r, 0, Math.PI * 2); }
    ctx.fill();
    // The outer bars thin from outside too, to one unit on their centre line.
    const edge = 15.5 * open * s.sx;
    if (edge > 0) { ctx.fillRect(0, 0, edge, H); ctx.fillRect(W - edge, 0, edge, H); }
    ctx.restore();

    // The ink round the block, which lifts as the slots open.
    ctx.save();
    ctx.globalAlpha = 1 - Math.min(1, open * 1.25);
    if (ctx.globalAlpha > 0) {
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.rect(0, 0, vw, vh);
      ctx.rect(ox + 1, oy + 1, W - 2, H - 2); // overlap the block by a pixel: no seam
      ctx.fill('evenodd');
    }
    ctx.restore();

    // The line under the mark rides with it, and goes as the doors open.
    row.style.transform = `translateY(${oy + H + gap}px)`;
    const gone = clamp(open * 4);
    row.style.opacity = String(1 - gone);
    row.style.visibility = gone >= 1 ? 'hidden' : '';
    if (intro) {
      intro.style.opacity = String(1 - clamp(door * 1.5));
      intro.style.transform = `translateY(${-shift}px)`;
    }
  }

  const queue = () => { if (!raf) raf = requestAnimationFrame(draw); };
  addEventListener('scroll', queue, { passive: true });
  let rt = 0;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(layout, 80); });
  addEventListener('motionchange', layout);
  row.style.top = '0';
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
