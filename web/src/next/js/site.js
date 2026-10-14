// Every page of the next site: films that play by themselves (video.js),
// a way to stop or start any film that is not a link (click it, or focus it
// and press Space or Enter), and pictures fetched ahead.

import { motion } from './motion.js';
import './video.js';

document.querySelectorAll('video[data-auto]').forEach((v) => {
  if (v.closest('a, [data-aperture]')) return;
  v.tabIndex = 0;
  const label = (v.getAttribute('aria-label') || 'Film').replace(/[.\s]+$/, '');
  const name = () => v.setAttribute('aria-label', `${label}. ${v.paused ? 'Paused, press to play' : 'Playing, press to pause'}`);
  const toggle = () => {
    if (v.paused) {
      delete v.dataset.held;
      if (v.preload === 'none') v.preload = 'auto';
      v.play().catch(() => {});
    } else {
      v.dataset.held = '1'; // video.js leaves a held film alone
      v.pause();
    }
  };
  v.addEventListener('click', toggle);
  v.addEventListener('keydown', (e) => {
    if (e.key !== ' ' && e.key !== 'Enter') return;
    e.preventDefault();
    toggle();
  });
  v.addEventListener('play', name);
  v.addEventListener('pause', name);
  name();
  // With reduced motion nothing plays by itself: the poster stands until clicked.
  if (!motion.auto) v.preload = 'none';
});

// Once the page has loaded and the browser is idle, the first lazy pictures
// are fetched ahead (not on Save-Data or a slow connection), so scrolling
// meets finished pictures.
const conn = navigator.connection;
if (!(conn && (conn.saveData || /(^|-)[23]g$/.test(conn.effectiveType || '')))) {
  const ahead = () => {
    document.querySelectorAll('main .media img[loading="lazy"]').forEach((img, i) => {
      if (i < 16) img.loading = 'eager';
    });
  };
  const idle = window.requestIdleCallback || ((f) => setTimeout(f, 300));
  const start = () => idle(ahead, { timeout: 500 });
  if (document.readyState === 'complete') start();
  else addEventListener('load', start, { once: true });
}
