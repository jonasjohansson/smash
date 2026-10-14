// A project's page: the title band measured under the hero, the running head
// in the header ("03  Dome Conductor"), the door to the next project, the
// feed that follows it one round through the work, the progress hairline,
// and the words that control each film.
//
// The door: a hall one screen tall plus a short run-in, its stage pinned. The
// next project's room is seen through one slot of light a gutter wide at the
// centre column; as the door comes up the screen (from 60% of the viewport)
// the slot widens to the whole screen (window to threshold) and the title
// fades. Then the next project simply continues: its page is fetched, its
// article goes in after the door without its hero (the door was its hero),
// and the address, the running head and the hairline follow whichever project
// is being read. After one round the last door is left out, and the page ends
// in the contact room. Reduced motion: no pin and no scrub, the door is its
// title and its picture, a plain link.

import { motion } from './motion.js';
import { scan } from './reveal.js';
import { register } from './video.js';

const clamp = (v) => Math.min(1, Math.max(0, v));
const ease = (t) => bezier(0.6, 0, 0.2, 1, t); // --ease-scrub
const origin = document.querySelector('article.project');
const header = document.querySelector('[data-header]');
const running = header?.querySelector('[data-running]');
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
      if (sound) {
        sound.textContent = v.muted ? 'Sound on' : 'Sound off';
        sound.setAttribute('aria-pressed', String(!v.muted));
      }
      if (clock) clock.textContent = time(v.duration);
    };
    play.addEventListener('click', () => {
      if (v.paused) { delete v.dataset.held; if (v.preload === 'none') v.preload = 'auto'; v.play().catch(() => {}); }
      else { v.dataset.held = '1'; v.pause(); }
    });
    sound?.addEventListener('click', () => {
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
  // From the door's top at 60% of the screen to the end of its pin.
  const start = H * 0.6;
  const p = clamp((start - r.top) / Math.max(1, start + r.height - H));
  const e = ease(p);
  const text = el.querySelector('[data-door-text]');
  const g = parseFloat(getComputedStyle(el).getPropertyValue('--g')) || 16;
  const W = el.clientWidth;
  // The slot: one gutter wide at the centre, from below the title to the margin.
  const meta = text?.querySelector('.door-meta');
  const top0 = meta ? Math.min(H * 0.62, meta.offsetTop + meta.offsetHeight + 52) : H * 0.5;
  const x = ((W - g) / 2) * (1 - e);
  // The slot widens first; its top rises only once the title has begun to go,
  // so the room never runs over type that can still be read.
  const dt = top0 * (1 - clamp((e - 0.3) / 0.7));
  el.style.setProperty('--dx', `${x}px`);
  el.style.setProperty('--dt', `${dt}px`);
  el.style.setProperty('--db', `${g * (1 - e)}px`);
  el.style.setProperty('--dr', `${(g / 2) * (1 - e)}px`);
  // The title gives way as the room rises to it, and is gone before they meet.
  const last = meta || text?.querySelector('.door-title');
  const tb = last ? last.offsetTop + last.offsetHeight : 0;
  el.style.setProperty('--dtext', String(Math.min(clamp(1 - (e - 0.2) / 0.2), clamp((dt - tb) / 40))));
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
    article.classList.remove('has-hero');
    // Its title is the page's title only once: the fed ones are h2 in effect.
    const h1 = article.querySelector('h1');
    if (h1) { const h2 = document.createElement('h2'); h2.className = h1.className; h2.id = h1.id; h2.innerHTML = h1.innerHTML; h1.replaceWith(h2); }
    const next = article.querySelector('[data-door]');
    if (next && seen.has(next.dataset.next)) next.remove(); // the round is complete: the page ends
    // Images it carried as relative or lazy stay as they are; it goes in after this article.
    const host = el.closest('article.project');
    host.after(document.adoptNode(article));
    scan(article);
    article.querySelectorAll('video[data-auto]').forEach(register);
    controls(article);
    door(article.querySelector('[data-door]'));
    articles = [...document.querySelectorAll('article.project')];
    el.dataset.fed = 'done';
  } catch {
    el.dataset.fed = ''; // offline or missing: the door is still a link; try again later
  }
}

/* ---------- The title band: the hero fills the screen down to it ---------- */
function band() {
  if (!origin?.classList.contains('has-hero')) return;
  const head = origin.querySelector('.pj-head');
  if (head) origin.style.setProperty('--pj-band', `${Math.ceil(head.getBoundingClientRect().height)}px`);
}

/* ---------- Running head, address, progress ---------- */
let articles = [...document.querySelectorAll('article.project')];
let current = origin;
let shown = '';
function head(a) {
  if (!running) return;
  const key = a ? a.dataset.project : '';
  header.classList.toggle('has-running', Boolean(a));
  if (key === shown) return;
  shown = key;
  running.textContent = '';
  if (!a) return;
  const no = document.createElement('span');
  no.className = 'no';
  no.textContent = a.dataset.number;
  running.append(no, a.dataset.title);
}
function follow() {
  const H = innerHeight;
  // The project being read: the last one whose title band is past the middle of the screen.
  let now = articles[0];
  for (const a of articles) if ((a.querySelector('.pj-head') ?? a).getBoundingClientRect().top <= H * 0.5) now = a;
  if (now && now !== current) {
    current = now;
    const url = now.dataset.url;
    if (url && location.pathname !== url) history.replaceState(history.state, '', url);
    document.title = `${now.dataset.title} · SMASH`;
    if (progress) progress.style.setProperty('--project', now.style.getPropertyValue('--project'));
  }
  if (now && progress) {
    const r = now.getBoundingClientRect();
    progress.style.setProperty('--p', String(clamp(-r.top / Math.max(1, r.height - H))));
  }
  // The running head: once the title has gone under the header, until the contact room.
  const title = now?.querySelector('.pj-title');
  const under = title && title.getBoundingClientRect().bottom < (header?.offsetHeight || 52);
  const end = contact && contact.getBoundingClientRect().top < H;
  head(under && !end ? now : null);
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
  band();
  document.fonts?.ready.then(() => { band(); tick(); });
  addEventListener('resize', band);
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
