// How pictures arrive.
//
// The slot reveal (.reveal), used once a page: closed, the frame is a dim
// room with one round-ended slit of full light down its middle; once the
// frame is in view it opens to the edges. The CSS is .reveal / .reveal.is-open.
//
// Every other lazy picture (.media without .reveal) waits unseen until it has
// loaded, then fades in once (500ms): .fade / .fade.is-in. Nothing pops in
// half-drawn, and a picture already loaded is simply there.
//
// Once the page has loaded and the browser is idle, the first lazy pictures
// are fetched and decoded ahead (not on Save-Data or a slow connection), so
// scrolling meets finished pictures.
//
// observe(el) adds a reveal made later; scan(root) handles both kinds inside a
// root (the endless feed of project pages).

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const has = 'IntersectionObserver' in window;

const io = has ? new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    io.unobserve(e.target);
    e.target.classList.add('is-open');
  }
}, { threshold: 0, rootMargin: '0px 0px -10% 0px' }) : null;

/** Call back once the frame's picture has loaded (or failed, or after 4s). */
function ready(img, done) {
  let t = 0;
  const go = () => { clearTimeout(t); done(); };
  img.addEventListener('load', go, { once: true });
  img.addEventListener('error', go, { once: true });
  t = setTimeout(go, 4000);
}

export function observe(el) {
  if (!io || reduced) { el.classList.add('is-open'); return; }
  io.observe(el);
}

// Pictures that move or are shown by hand elsewhere keep their own ways.
const SKIP = '.reveal, .lit .media, .door-room .media, .offer-panel .media, [data-no-fade]';
const loaded = (img) => img.complete && img.naturalWidth > 0;

function fade(el) {
  if (reduced || el.matches(SKIP) || el.closest('[data-no-fade]')) return;
  const img = el.querySelector(':scope > picture img, :scope > img');
  if (!img || loaded(img)) return;
  el.classList.add('fade');
  ready(img, () => requestAnimationFrame(() => el.classList.add('is-in')));
}

export function scan(root = document) {
  root.querySelectorAll('.reveal').forEach(observe);
  root.querySelectorAll('.media').forEach(fade);
}

scan();

// Fetch ahead, when idle: the first lazy pictures of the page as built.
const conn = navigator.connection;
const thrifty = conn && (conn.saveData || /(^|-)[23]g$/.test(conn.effectiveType || ''));
if (!thrifty) {
  const ahead = () => {
    const imgs = [...document.querySelectorAll('main .media img[loading="lazy"]')]
      .filter((img) => !img.closest(SKIP.replace('.reveal, ', '')))
      .slice(0, 16);
    // Fetched and decoded ahead: a picture scrolled to is ready to paint.
    imgs.forEach((img) => { img.loading = 'eager'; img.decode?.().catch(() => {}); });
  };
  const idle = window.requestIdleCallback || ((f) => setTimeout(f, 300));
  const start = () => idle(ahead, { timeout: 500 });
  if (document.readyState === 'complete') start();
  else addEventListener('load', start, { once: true });
}
