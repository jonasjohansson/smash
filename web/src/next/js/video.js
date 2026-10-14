// Video discipline: of the films marked data-auto (muted, looped), only the
// most visible one plays, and only while it is at least half in view, the tab
// is visible and motion allows it. Films one screen away load their metadata;
// the rest load nothing. register(video) adds films made later.

import { motion } from './motion.js';

const seen = new Map(); // video -> visible ratio
let current = null;

function pick() {
  let best = null;
  let ratio = 0.5;
  if (motion.auto && !document.hidden) {
    for (const [v, r] of seen) if (r >= ratio && v.isConnected && !v.dataset.held) { best = v; ratio = r; } // held: paused by the visitor (project.js)
  }
  if (best === current) { if (best && best.paused) best.play().catch(() => {}); return; }
  if (current && !current.paused) current.pause();
  current = best;
  if (best) {
    if (best.preload === 'none') best.preload = 'auto';
    best.play().catch(() => {});
  }
}

const watch = new IntersectionObserver((entries) => {
  for (const e of entries) seen.set(e.target, e.isIntersecting ? e.intersectionRatio : 0);
  pick();
}, { threshold: [0, 0.25, 0.5, 0.6, 0.75, 0.9, 1] });

const near = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    if (e.target.preload === 'none') e.target.preload = 'metadata';
    near.unobserve(e.target);
  }
}, { rootMargin: '100% 0px' });

export function register(v) {
  v.muted = true;
  v.removeAttribute('autoplay');
  seen.set(v, 0);
  watch.observe(v);
  near.observe(v);
}

document.querySelectorAll('video[data-auto]').forEach(register);
document.addEventListener('visibilitychange', pick);
addEventListener('motionchange', () => {
  if (!motion.auto && current) { current.pause(); current = null; }
  pick();
});
