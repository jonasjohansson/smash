// Every page of the next site: the header, the phone menu, the grid overlay
// (G or ?grid), the Motion toggle, the clock, slot reveals and video
// discipline. Page modules (aperture.js, offerings.js, ...) load on their own.

import { motion } from './motion.js';
import './reveal.js';
import './video.js';
import './clock.js';

const header = document.querySelector('[data-header]');

/* Header: transparent at the top; hides on the way down, comes back as a
   solid strip on the way up; inverts over the paper room. A page can hold it
   in place for a while (the Aperture) by setting header.dataset.hold (px). */
if (header) {
  let last = scrollY;
  let ticking = false;
  const papers = () => document.querySelectorAll('[data-ground="paper"]');
  const update = () => {
    ticking = false;
    const y = scrollY;
    const hold = Number(header.dataset.hold || 52);
    const sheetOpen = document.documentElement.classList.contains('sheet-open');
    if (y <= hold || sheetOpen) {
      header.classList.remove('is-hidden');
      header.classList.toggle('is-solid', false);
    } else {
      if (y > last + 4) header.classList.add('is-hidden');
      else if (y < last - 4) header.classList.remove('is-hidden');
      header.classList.add('is-solid');
    }
    // Over paper when the header's middle line is over a paper section.
    const line = 26;
    let paper = false;
    for (const el of papers()) {
      const r = el.getBoundingClientRect();
      if (r.top <= line && r.bottom >= line) { paper = true; break; }
    }
    header.classList.toggle('is-paper', paper);
    last = y;
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener('resize', update);
  header.addEventListener('focusin', () => header.classList.remove('is-hidden'));
  update();
}

/* Phone menu: a full ink sheet. */
const sheet = document.querySelector('[data-sheet]');
const menu = document.querySelector('[data-menu]');
if (sheet && menu) {
  const open = (on) => {
    sheet.hidden = !on;
    menu.setAttribute('aria-expanded', String(on));
    document.documentElement.classList.toggle('sheet-open', on);
    document.body.style.overflow = on ? 'hidden' : '';
    // While the sheet is open it is the whole page: the rest is inert, so
    // Tab and a screen reader stay inside it.
    for (const el of document.body.children) if (el !== sheet) el.inert = on;
    if (on) sheet.querySelector('nav a')?.focus();
    else menu.focus({ preventScroll: true });
  };
  menu.addEventListener('click', () => open(true));
  sheet.querySelectorAll('[data-menu-close]').forEach((b) => b.addEventListener('click', () => open(false)));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !sheet.hidden) open(false); });
}

/* The grid, drawn: ?grid, or G. */
const overlay = document.querySelector('[data-grid-overlay]');
if (overlay) {
  if (new URLSearchParams(location.search).has('grid')) overlay.hidden = false;
  addEventListener('keydown', (e) => {
    if (e.key !== 'g' && e.key !== 'G') return;
    if (e.metaKey || e.ctrlKey || e.altKey || /input|textarea|select/i.test(e.target.tagName) || e.target.isContentEditable) return;
    overlay.hidden = !overlay.hidden;
  });
}

/* Motion: On / Off, for every autoplaying film on the site (WCAG 2.2.2). */
document.querySelectorAll('[data-motion-toggle]').forEach((b) => {
  const state = b.parentElement.querySelector('[data-motion-state]');
  const show = () => {
    if (state) state.textContent = `Motion: ${motion.on ? 'on' : 'off'}`;
    b.textContent = motion.on ? 'Turn off' : 'Turn on';
    b.setAttribute('aria-label', motion.on ? 'Turn motion off: pause the films that play by themselves' : 'Turn motion on: let films play by themselves');
  };
  b.addEventListener('click', () => { motion.set(!motion.on); });
  addEventListener('motionchange', show);
  show();
});
