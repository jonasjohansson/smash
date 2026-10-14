// A project's page: the door to the next project, the feed that follows it
// one round through the work, the running foot ("03 / 07  Dome Conductor"),
// the progress hairline, and the words that control each film.
//
// The door: a 160svh hall whose stage is pinned. The next project's room is
// seen through one slot of light a gutter wide at the centre column; walking
// up to it, the slot widens to the whole screen (window to threshold) and the
// title fades. Then the next project simply continues: its page is fetched,
// its article goes in after the door without its hero (the door was its
// hero), and the address, the running foot and the hairline follow whichever
// project is being read. After one round the last door is left out, and the
// page ends in the contact room. Reduced motion: no pin and no scrub, the door
// is its title and its picture, a plain link.

import { motion } from './motion.js';
import { observe } from './reveal.js';
import { register } from './video.js';

const clamp = (v) => Math.min(1, Math.max(0, v));
const ease = (t) => bezier(0.6, 0, 0.2, 1, t); // --ease-scrub
const origin = document.querySelector('article.project');
const foot = document.querySelector('[data-foot]');
const progress = document.querySelector('[data-progress]');
const contact = document.getElementById('contact');
const feedOn = Boolean(origin) && 'fetch' in window && 'DOMParser' in window;
const seen = new Set(origin ? [origin.dataset.project] : []);

/* ---------- Films: Pause / Sound on / 0:24, in the caption line ---------- */
const time = (s) => (Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '');
function controls(root) {
  root.querySelectorAll('video[data-vctl]').forEach((v) => {
    const fig = v.closest('figure');
    const box = fig?.querySelector('[data-vctl-for]');
    if (!box || box.dataset.ready) return;
    box.dataset.ready = '1';
    const play = box.querySelector('[data-v="play"]');
    const sound = box.querySelector('[data-v="sound"]');
    const clock = box.querySelector('[data-v="time"]');
    const show = () => {
      play.textContent = v.paused ? 'Play' : 'Pause';
      sound.textContent = v.muted ? 'Sound on' : 'Sound off';
      sound.setAttribute('aria-pressed', String(!v.muted));
      clock.textContent = time(v.duration);
    };
    play.addEventListener('click', () => {
      if (v.paused) { delete v.dataset.held; if (v.preload === 'none') v.preload = 'auto'; v.play().catch(() => {}); }
      else { v.dataset.held = '1'; v.pause(); }
    });
    sound.addEventListener('click', () => {
      v.muted = !v.muted;
      if (!v.muted && v.paused) { delete v.dataset.held; v.play().catch(() => {}); }
      show();
    });
    ['play', 'pause', 'volumechange', 'loadedmetadata', 'durationchange'].forEach((e) => v.addEventListener(e, show));
    show();
  });
}

/* ---------- The door ---------- */
const doors = new Set();
function door(el) {
  if (!el || el.dataset.ready) return;
  el.dataset.ready = '1';
  // The scrub is driven by the visitor's own scroll, so only reduced motion turns it off.
  if (motion.reduced) return; // a plain link with its picture
  el.classList.add('is-scrub');
  doors.add(el);
  // Its picture loads as soon as it is near.
  const near = new IntersectionObserver((es) => {
    if (!es.some((e) => e.isIntersecting)) return;
    el.querySelectorAll('img[loading="lazy"]').forEach((img) => { img.loading = 'eager'; });
    near.disconnect();
  }, { rootMargin: '150% 0px' });
  near.observe(el);
}

function paintDoor(el) {
  const r = el.getBoundingClientRect();
  const H = innerHeight;
  if (r.bottom < -H || r.top > 2 * H) return;
  const span = Math.max(1, r.height - H);
  const p = clamp(-r.top / span);
  const e = ease(p);
  const text = el.querySelector('[data-door-text]');
  const g = parseFloat(getComputedStyle(el).getPropertyValue('--g')) || 16;
  const W = el.clientWidth;
  // The slot: one gutter wide at the centre, from below the title to the margin.
  const meta = text?.querySelector('.door-meta');
  const top0 = meta ? Math.min(H * 0.62, meta.offsetTop + meta.offsetHeight + 52) : H * 0.5;
  const x = ((W - g) / 2) * (1 - e);
  el.style.setProperty('--dx', `${x}px`);
  el.style.setProperty('--dt', `${top0 * (1 - e)}px`);
  el.style.setProperty('--db', `${g * (1 - e)}px`);
  el.style.setProperty('--dr', `${(g / 2) * (1 - e)}px`);
  el.style.setProperty('--dtext', String(clamp(1 - p / 0.4)));
  if (feedOn && r.top < H * 1.5 && !el.dataset.fed) feed(el);
}

/* ---------- The feed: one round of the work, then the end ---------- */
async function feed(el) {
  el.dataset.fed = 'pending';
  const slug = el.dataset.next;
  if (!slug || seen.has(slug)) { el.dataset.fed = 'done'; return; }
  const link = el.querySelector('[data-door-link]');
  try {
    const res = await fetch(link.href, { credentials: 'same-origin' });
    if (!res.ok) throw new Error(res.status);
    const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
    const article = doc.querySelector('article.project');
    if (!article) throw new Error('no article');
    seen.add(slug);
    article.classList.add('is-fed');
    article.querySelector('.pj-hero')?.remove();
    // Its title is the page's title only once: the fed ones are h2 in effect.
    const h1 = article.querySelector('h1');
    if (h1) { const h2 = document.createElement('h2'); h2.className = h1.className; h2.id = h1.id; h2.innerHTML = h1.innerHTML; h1.replaceWith(h2); }
    const next = article.querySelector('[data-door]');
    if (next && seen.has(next.dataset.next)) next.remove(); // the round is complete: the page ends
    // Images it carried as relative or lazy stay as they are; it goes in after this article.
    const host = el.closest('article.project');
    host.after(document.adoptNode(article));
    article.querySelectorAll('.reveal').forEach(observe);
    article.querySelectorAll('video[data-auto]').forEach(register);
    controls(article);
    door(article.querySelector('[data-door]'));
    articles = [...document.querySelectorAll('article.project')];
    el.dataset.fed = 'done';
  } catch {
    el.dataset.fed = ''; // offline or missing: the door is still a link; try again later
  }
}

/* ---------- Running foot, address, progress ---------- */
let articles = [...document.querySelectorAll('article.project')];
let current = origin;
function follow() {
  const H = innerHeight;
  let now = articles[0];
  for (const a of articles) if (a.getBoundingClientRect().top <= H * 0.45) now = a;
  if (now && now !== current) {
    current = now;
    const url = now.dataset.url;
    if (url && location.pathname !== url) history.replaceState(history.state, '', url);
    document.title = `${now.dataset.title} · SMASH`;
    if (foot) {
      foot.querySelector('[data-foot-no]').textContent = now.dataset.number;
      foot.querySelector('[data-foot-title]').textContent = now.dataset.title;
    }
    if (progress) progress.style.setProperty('--project', now.style.getPropertyValue('--project'));
  }
  if (now && progress) {
    const r = now.getBoundingClientRect();
    progress.style.setProperty('--p', String(clamp(-r.top / Math.max(1, r.height - H))));
  }
  if (foot && contact) foot.classList.toggle('is-off', contact.getBoundingClientRect().top < H - 40 || scrollY < 40);
}

let ticking = false;
function frame() {
  ticking = false;
  doors.forEach(paintDoor);
  follow();
}
const tick = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };

if (origin) {
  controls(document);
  document.querySelectorAll('[data-door]').forEach(door);
  addEventListener('scroll', tick, { passive: true });
  addEventListener('resize', tick);
  addEventListener('motionchange', tick);
  frame();
}

/* Cubic bezier, solved for x (as in CSS). */
function bezier(x1, y1, x2, y2, x) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  let t = x;
  for (let i = 0; i < 6; i++) {
    const f = ((ax * t + bx) * t + cx) * t - x;
    const d = (3 * ax * t + 2 * bx) * t + cx;
    if (Math.abs(f) < 1e-5 || !d) break;
    t -= f / d;
  }
  t = clamp(t);
  return ((ay * t + by) * t + cy) * t;
}
