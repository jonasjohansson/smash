// The Aperture: the home page's opening.
//
// The original mark (mark.js) is drawn in ink, whole, on the first screen,
// with the showreel playing behind it: the film shows only through the
// slots, light through slits in a dark room. Its caption row sits under it.
// On a phone the mark stands tall: its slots become full-height columns of
// light (mark.js keeps the round ends round however far it stretches).
// Scrolling, while the stage is held:
//   1. door: every closed slot end runs out through the edge (inset 42 -> 0);
//   2. open: the block grows to the screen's edges as its slots widen
//      (stroke 20 -> 51); the ink lifts and is gone by 80% of the way;
//   3. fade: the clean film darkens to ink from below, and scrolls away.
// Reduced motion or Save-Data: no hold, no scrub; the poster in the still mark.
//
// Presence: while the doors are shut, on a fine pointer, the slot nearest
// the pointer eases a little wider (20 -> 24) and settles when it leaves.

import { markShape, DEFAULTS } from '/js/mark.js';
import { motion } from './motion.js';
import './reel.js';

const root = document.querySelector('[data-aperture]');
const header = document.querySelector('[data-header]');

if (root) {
  const stage = root.querySelector('[data-ap-stage]');
  const canvas = root.querySelector('[data-ap-ink]');
  const row = root.querySelector('[data-ap-row]');
  const ctx = canvas.getContext('2d');
  const INK = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#0b0b0c';
  const scrub = (t) => cubic(0.6, 0, 0.2, 1, t);
  const clamp = (v) => Math.min(1, Math.max(0, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, t) => { const x = clamp((t - a) / (b - a)); return x * x * (3 - 2 * x); };
  const fine = matchMedia('(hover: hover) and (pointer: fine)');

  let L = null;
  let raf = 0;
  let still = false;

  // Presence: per slot path, its extra width now, in mark units (0..4).
  const near = { x: -1, y: -1, on: false };
  let lift = [];

  function layout() {
    still = motion.reduced || motion.slow;
    root.classList.toggle('no-scrub', still);
    if (still) {
      root.style.height = '';
      row.style.top = '';
      if (header) header.dataset.hold = 52;
      return;
    }
    const vw = stage.clientWidth;
    const vh = stage.clientHeight;
    const g = parseFloat(getComputedStyle(row).paddingLeft) || 16;
    const safe = parseFloat(getComputedStyle(stage).paddingBottom) || 0; // env(safe-area-inset-bottom)
    const phone = vw < 720;
    const top = 52 + 20; // under the header
    const rowH = row.offsetHeight;
    const gap = phone ? 12 : 16;
    const room = vh - top - gap - rowH - g - safe; // what the mark may take, height
    let W, H;
    if (phone) {
      W = vw - 2 * g;
      H = room;
    } else {
      H = Math.min(((vw - 2 * g) * 472) / 552, room);
      W = (H * 552) / 472;
    }
    const ox = (vw - W) / 2;
    const dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round(vw * dpr);
    canvas.height = Math.round(vh * dpr);
    const phases = { door: 0.3 * vh, open: 0.7 * vh, fade: 0.25 * vh };
    const total = phases.door + phases.open + phases.fade;
    root.style.height = `${vh + total}px`;
    row.style.top = `${Math.round(top + H + gap)}px`;
    L = { vw, vh, W, H, ox, top, dpr, phases, total };
    if (header) header.dataset.hold = Math.round(total + vh - 52);
    draw();
  }

  function draw() {
    raf = 0;
    if (!L || still) return;
    const { vw, vh, W, H, ox, top, dpr, phases: P } = L;
    const y = Math.max(0, scrollY - root.offsetTop);
    const door = scrub(clamp(y / P.door));
    const open = scrub(clamp((y - P.door) / P.open));
    const fade = clamp((y - P.door - P.open) / P.fade);

    // The block's rectangle: the mark's own, growing to the screen (2px over, no seams).
    const x0 = lerp(ox, -2, open);
    const y0 = lerp(top, -2, open);
    const bw = lerp(W, vw + 4, open);
    const bh = lerp(H, vh + 4, open);
    const alpha = 1 - smooth(0.4, 0.8, open);

    stage.style.setProperty('--fade', fade.toFixed(3));
    const gone = clamp(door * 1.6);
    row.style.opacity = String(1 - gone);
    row.style.visibility = gone >= 1 ? 'hidden' : '';

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, vw, vh);
    if (alpha <= 0) return; // the film alone

    const stroke = 20 + 31 * open;
    const p = { ...DEFAULTS, stroke, corner: (10 * stroke) / 20, inset: 42 * (1 - door), fit: 'stretch', padding: 0 };
    const s = markShape(p, bw, bh);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = INK;
    // The ink round the block, overlapping it by a pixel: no seam.
    if (open < 1) {
      ctx.beginPath();
      ctx.rect(0, 0, vw, vh);
      ctx.rect(x0 + 1, y0 + 1, bw - 2, bh - 2);
      ctx.fill('evenodd');
    }
    ctx.restore();

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
    // Presence: a lifted slot is cut again, wider, on its own centre line.
    if (door === 0) {
      const paths = s.d.split(/(?=M)/);
      lift.forEach((v, i) => {
        if (v < 0.02 || !paths[i]) return;
        const w = (20 + v) * s.sx;
        ctx.lineWidth = w;
        ctx.stroke(new Path2D(paths[i]));
        ctx.beginPath();
        for (const [x, yy] of ends(paths[i])) {
          if (!s.dots.some(([dx, dy]) => Math.abs(dx - x) < 0.5 && Math.abs(dy - yy) < 0.5)) continue;
          ctx.moveTo(x + w / 2, yy); ctx.arc(x, yy, w / 2, 0, Math.PI * 2);
        }
        ctx.fill();
      });
    }
    // The outer bars thin from outside too, to one unit on their centre line.
    const edge = 15.5 * open * s.sx;
    if (edge > 0) { ctx.fillRect(0, 0, edge, bh); ctx.fillRect(bw - edge, 0, edge, bh); }
    // Then the whole block takes the opening's alpha.
    ctx.globalCompositeOperation = 'destination-out';
    if (alpha < 1) { ctx.globalAlpha = 1 - alpha; ctx.fillRect(0, 0, bw, bh); }
    ctx.restore();

  }

  // A path's vertices (M and L points; arcs are bends between them).
  const points = (d) => [...d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
  const ends = (d) => { const q = points(d); return [q[0], q.at(-1)]; };
  // Distance from (x, y) to a polyline of vertical and horizontal runs.
  function dist(q, x, y) {
    let d = Infinity;
    for (let i = 1; i < q.length; i++) {
      const [ax, ay] = q[i - 1];
      const [bx, by] = q[i];
      const cx = Math.min(Math.max(x, Math.min(ax, bx)), Math.max(ax, bx));
      const cy = Math.min(Math.max(y, Math.min(ay, by)), Math.max(ay, by));
      d = Math.min(d, Math.hypot(x - cx, y - cy));
    }
    return d;
  }

  // Presence: the slot nearest the pointer leans open by 4 units, eased
  // (about 600ms), and settles back when the pointer leaves or the page moves.
  let lifting = 0;
  function settle() {
    lifting = 0;
    if (!L) return;
    const { W, H, ox, top } = L;
    const live = near.on && scrollY - root.offsetTop <= 0;
    let best = -1;
    if (live) {
      const s = markShape({ ...DEFAULTS, fit: 'stretch', padding: 0 }, W, H);
      const x = near.x - ox;
      const y = near.y - top;
      let d = (26 * W) / 552; // within half a pitch of a slot
      s.d.split(/(?=M)/).forEach((path, i) => {
        const dd = dist(points(path), x, y);
        if (dd < d) { d = dd; best = i; }
      });
      if (lift.length !== 14) lift = new Array(14).fill(0);
    }
    let moving = false;
    lift = lift.map((v, i) => {
      const target = i === best ? 4 : 0;
      const nv = v + (target - v) * 0.09;
      if (Math.abs(nv - target) < 0.02) return target;
      moving = true;
      return nv;
    });
    draw();
    if (moving) lifting = requestAnimationFrame(settle);
  }
  const wake = () => { if (!lifting) lifting = requestAnimationFrame(settle); };
  const presenceOK = () => fine.matches && !motion.reduced && !motion.slow && !still;
  stage.addEventListener('pointermove', (e) => {
    if (!presenceOK() || !L) return;
    const r = stage.getBoundingClientRect();
    near.x = e.clientX - r.left;
    near.y = e.clientY - r.top;
    near.on = true;
    wake();
  });
  stage.addEventListener('pointerleave', () => { near.on = false; wake(); });

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
