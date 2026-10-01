// The live page: a cover, a chapter per direction, and the six side by side.
// ?d=<slug> shows one chapter; ?t=0.5 seeks every motion there and pauses it.

import { IMAGES } from './lib.js';
import { loadDirections, attempt, errorHTML, loadFonts, settle } from './directions.js';
import { SIZES_HINT } from './video.js';
import { withGrid } from './grid.js';

const params = new URLSearchParams(location.search);
const ONLY = params.get('d');
const FIXED_T = params.has('t') ? Number(params.get('t')) : null;

const $ = (sel, root = document) => root.querySelector(sel);
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const esc = (s = '') => String(s).replace(/[<&"]/g, (c) => ({ '<': '&lt;', '&': '&amp;', '"': '&quot;' })[c]);

/**
 * A still's artboard widened to half its width either side: the room the 16 : 9
 * panels need round the wordmark (a percentage height does not resolve inside
 * them, so the artboard carries the width).
 */
const wide = (str) => str.replace(/viewBox="\s*([-\d.]+)[\s,]+([-\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*"/, (m, x, y, w, h) => `viewBox="${+x - w / 2} ${y} ${2 * w} ${h}"`);

/** A tall still's artboard widened to a square, centred (the S alone): it fits its box by its width, like the rest. */
const squared = (str) => str.replace(/viewBox="\s*([-\d.]+)[\s,]+([-\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*"/, (m, x, y, w, h) => (+h > +w ? `viewBox="${+x - (h - w) / 2} ${y} ${h} ${h}"` : m));

/** An SVG string from a module function, or its error. */
function still(d, fn, arg) {
  const r = attempt(d, fn, arg);
  if (r.error) return errorHTML(r.error);
  if (typeof r.value !== 'string' || !r.value.includes('<svg')) return errorHTML(`${d.slug}.${fn}() did not return an SVG string`);
  return r.value;
}

// The marks' curves: round (0), or in pixels of 4 (the grid) or 10 (half a
// slot) (Jonas, 2026-09-30); the Pixel button and P step through them.
const PIXELS = [0, 4, 10];
let pixel = 0;

/**
 * A still as the page shows it: in pixels or round, the wordmark's artboard
 * widened, its grid added (with the circles of its round self). fn is also
 * its kind of grid (grid.js).
 */
function drawn(d, fn, ground) {
  const one = (px) => { const v = still(d, fn, { ground, pixel: px }); return fn === 'wordmark' ? wide(v) : squared(v); };
  const svg = one(pixel);
  return withGrid(svg, fn, pixel ? one(0) : svg);
}

/** A still's box, marked so the page can draw it again when the curves change. */
const markHTML = (d, fn, ground, cls) => `<div class="mark ${cls}" data-still="${fn}" data-ground="${ground}">${drawn(d, fn, ground)}</div>`;

// Black and white, for every chapter (the focus round): a module's own palette is set aside.
function palette() {
  return '--d-ink:#000;--d-paper:#fff;--d-accent:#fff;';
}

function favicons(d) {
  const at = (size) => `<span class="fav" style="width:${size}px;height:${size}px">${still(d, 'favicon', { size })}</span>`;
  const tab = (theme) => `<div class="tab ${theme}"><span class="fav" style="width:16px;height:16px">${still(d, 'favicon', { size: 16 })}</span><span>SMASH</span><i>×</i></div>`;
  return `<div class="favicons"><div class="sizes">${at(64)}${at(32)}${at(16)}</div><div class="tabs">${tab('light')}${tab('dark')}</div></div>`;
}


function chapter(d) {
  const { info } = d;
  const el = h(`
    <section class="chapter" id="${d.slug}" style="${palette(info)}">
      <header class="ch-head">
        <h2 class="ch-name">${esc(info.name)}</h2>
      </header>
      ${d.error ? errorHTML(`${d.slug} did not load: ${d.error.message}`) : ''}
      <figure class="stage ground-ink">
        <div class="motion-el" data-live="motion"></div>
        <figcaption class="controls">
          <button type="button" class="play" aria-label="Play or pause">Pause</button>
          <input type="range" class="scrub" min="0" max="1000" value="0" aria-label="Scrub the motion">
          ${typeof d.mod.frame === 'function' ? `<button type="button" class="download" title="${SIZES_HINT}">MP4</button>` : ''}
        </figcaption>
      </figure>
      <div class="row two">
        <figure class="panel ground-ink">${markHTML(d, 'wordmark', 'ink', 'wm')}<figcaption class="label">Wordmark</figcaption></figure>
        <figure class="panel ground-paper">${markHTML(d, 'wordmark', 'paper', 'wm')}<figcaption class="label">Wordmark</figcaption></figure>
      </div>
      <div class="row three">
        <figure class="panel ground-ink square">${markHTML(d, 'symbol', 'ink', 'sym')}<figcaption class="label">Symbol</figcaption></figure>
        <figure class="panel ground-mid square">${favicons(d)}<figcaption class="label">Favicon 64 · 32 · 16</figcaption></figure>
        <figure class="panel ground-paper square">${markHTML(d, 'lockup', 'paper', 'lock')}<figcaption class="label">Lockup</figcaption></figure>
      </div>
      ${typeof d.mod.s === 'function' ? `<div class="row three">
        <figure class="panel ground-ink square">${markHTML(d, 's', 'ink', 'sym')}<figcaption class="label">S</figcaption></figure>
        <figure class="panel ground-ink square">${markHTML(d, 'sTurned', 'ink', 'sym')}<figcaption class="label">S on its side</figcaption></figure>
        <figure class="panel ground-ink square">${markHTML(d, 'sSquare', 'ink', 'sym')}<figcaption class="label">Square S</figcaption></figure>
      </div>` : ''}
      ${typeof d.mod.lockupSM === 'function' ? `<div class="row two">
        <figure class="panel ground-ink">${markHTML(d, 'lockupSM', 'ink', 'lock-sm')}<figcaption class="label">Lockup, S M</figcaption></figure>
        <figure class="panel ground-paper">${markHTML(d, 'lockupSM', 'paper', 'lock-sm')}<figcaption class="label">Lockup, S M</figcaption></figure>
      </div>` : ''}
    </section>`);
  return el;
}

/**
 * Mount the live pieces only while a chapter is near the screen, so the page
 * never holds more WebGL contexts than a browser allows.
 */
function live(d, section) {
  const motionEl = $('[data-live="motion"]', section);
  const appEl = $('[data-live="application"]', section);
  const playBtn = $('.play', section);
  const scrub = $('.scrub', section);
  let motion = null;
  let app = null;
  let userPaused = FIXED_T !== null;
  let visible = false;
  let raf = 0;

  const sync = () => {
    if (motion && typeof motion.t === 'number' && document.activeElement !== scrub) scrub.value = Math.round(motion.t * 1000);
    playBtn.textContent = motion?.playing === false || userPaused ? 'Play' : 'Pause';
    raf = requestAnimationFrame(sync);
  };

  const mount = () => {
    if (!motion) {
      const r = attempt(d, 'motion', motionEl, { ground: 'ink' });
      if (r.error) motionEl.innerHTML = errorHTML(r.error);
      else {
        motion = r.value;
        if (FIXED_T !== null) motion.seek?.(FIXED_T);
        else motion.seek?.(0);
        if (visible && !userPaused) motion.play?.(); // already on screen: the visibility check may have come first
      }
    }
    if (!app && appEl) {
      const r = attempt(d, 'application', appEl, { images: IMAGES });
      if (r.error) appEl.innerHTML = errorHTML(r.error);
      else app = r.value ?? {};
    }
    if (!raf) raf = requestAnimationFrame(sync);
  };
  const unmount = () => {
    try { motion?.destroy?.(); } catch (e) { console.error(e); }
    try { app?.destroy?.(); } catch (e) { console.error(e); }
    motion = null; app = null;
    motionEl.innerHTML = ''; if (appEl) appEl.innerHTML = '';
    cancelAnimationFrame(raf); raf = 0;
  };

  playBtn.addEventListener('click', () => {
    if (!motion) return;
    if (motion.playing === false || userPaused) { userPaused = false; if (motion.t >= 1) motion.seek(0); motion.play(); }
    else { userPaused = true; motion.pause(); }
  });
  scrub.addEventListener('input', () => { if (!motion) return; userPaused = true; motion.pause(); motion.seek(scrub.value / 1000); });

  // The download: one loop of the motion as an MP4, drawn frame by frame at its
  // exact time (the module's frame(), ../video.js), whatever the stage is doing.
  const dl = $('.download', section);
  dl?.addEventListener('click', async (e) => {
    if (dl.hasAttribute('data-busy')) return;
    dl.setAttribute('data-busy', '');
    try {
      const { renderVideo, sizeOf, save } = await import('./video.js');
      const [width, height] = sizeOf(e);
      const period = d.mod.duration;
      const blob = await renderVideo({
        period, width, height,
        paint: (ctx, w, h, s) => d.mod.frame(ctx, w, h, s / period, { pixel }), // in pixels too, when the page is
        onProgress: (p) => { dl.textContent = `${Math.round(p * 100)}%`; },
      });
      save(blob, `smash-${d.slug}-motion-${width}x${height}.mp4`);
    } catch (err) {
      console.error(`[identity] ${d.slug}: the video could not be made`, err);
    } finally {
      dl.removeAttribute('data-busy');
      dl.textContent = 'MP4';
    }
  });

  new IntersectionObserver(([e]) => { if (e.isIntersecting) mount(); else unmount(); }, { rootMargin: '100% 0px' }).observe(section);
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (!motion) return;
    if (visible && !userPaused) motion.play?.();
    else motion.pause?.();
  }, { threshold: 0.35 }).observe(motionEl);
  return { get motion() { return motion; }, get app() { return app; } };
}

/**
 * The original, live: tools after chapter 00, each its own module with its
 * own panel. lab.js is the landing's v2 (glass, flat, 3D); mapping.js warps
 * the mark through mapping points; sculpture.js is the mark as an object whose
 * side, or shadow, is something else; one marked last (the sequence) comes
 * after every chapter instead. ?d=<id> shows one alone.
 * Each is mounted once (one WebGL context) and paused while off screen, and
 * loaded on its own, so a failure leaves the rest of the page standing.
 */
const EXTRAS = [
  { id: 'modular', name: 'The modular mark', load: async () => { const m = await import('./modular.js'); return { html: m.HTML, mount: m.mount }; } },
  { id: 'lab', name: 'The live mark', load: async () => { const m = await import('./lab.js'); return { html: m.LAB_HTML, mount: m.mountLab }; } },
  // At the end of the page, after every chapter (Jonas, 2026-09-29).
  { id: 'sequence', name: 'Sequence', last: true, load: async () => { const m = await import('./sequence/section.js'); return { html: m.HTML, mount: m.mount }; } },
  // The type chosen, Anton and Neue Montreal, and the pair at work with the marks (Jonas, 2026-09-30).
  { id: 'type', name: 'Typography', last: true, load: async () => { const m = await import('./type.js'); return { html: m.HTML, mount: m.mount }; } },
  // SMASH's own typeface, for very special occasions: a section of its own (Jonas, 2026-10-01).
  { id: 'typeface', name: 'The SMASH typeface', last: true, load: async () => { const m = await import('./typeface.js'); return { html: m.HTML, mount: m.mount }; } },
  // The palette at the very bottom, after the sequence (Jonas, 2026-09-30).
  { id: 'colour', name: 'Colour', last: true, load: async () => { const m = await import('./colour.js'); return { html: m.HTML, mount: m.mount }; } },
  // Folded, under the colour (Jonas, 2026-09-30: not so important any more): a line each, loaded when opened.
  { id: 'mapping', name: 'Mapping', last: true, folded: true, load: async () => { const m = await import('./mapping.js'); return { html: m.HTML, mount: m.mount }; } },
  { id: 'sculpture', name: 'Sculpture', last: true, folded: true, load: async () => { const m = await import('./sculpture.js'); return { html: m.HTML, mount: m.mount }; } },
];
const extras = {};
async function addExtra(page, x) {
  try {
    const { html, mount } = await x.load();
    const section = h(html);
    page.appendChild(section);
    let tool = null;
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { tool ??= mount(section); extras[x.id] = tool; tool.resume?.(); } else tool?.pause?.();
    }, { rootMargin: '50% 0px' }).observe(section);
  } catch (e) {
    console.error(`[identity] ${x.name} did not load`, e);
    page.insertAdjacentHTML('beforeend', errorHTML(`${x.name} did not load: ${e.message}`));
  }
}



/** A section folded to one line; its module loads, and it mounts, only once it is opened. */
function addFolded(page, x) {
  const fold = h(`<details class="fold" id="fold-${x.id}"><summary class="fold-head"><span class="fold-name">${esc(x.name)}</span><span class="fold-state"></span></summary></details>`);
  page.appendChild(fold);
  let loaded = null;
  fold.addEventListener('toggle', () => { if (fold.open && !loaded) loaded = addExtra(fold, x); });
}

async function main() {
  const directions = await loadDirections(ONLY);
  directions.forEach((d) => loadFonts(d.info));
  const page = $('#page');
  // No cover and no index: the page starts with the marks (Jonas: no fluff, no unnecessary text).
  const lives = [];
  const bySlug = {};
  for (const d of directions) {
    const section = chapter(d);
    page.appendChild(section);
    lives.push(bySlug[d.slug] = live(d, section));
    if (d.slug === 'original' && !ONLY) for (const x of EXTRAS.filter((x) => !x.last)) await addExtra(page, x);
  }
  if (!ONLY) for (const x of EXTRAS.filter((x) => x.last)) await (x.folded ? addFolded(page, x) : addExtra(page, x));
  for (const x of EXTRAS.filter((x) => x.id === ONLY)) await addExtra(page, x);
  // The grid, previewed on the marks (grid.js): a button, and G; kept in this browser. Its lines one device pixel wide.
  document.documentElement.style.setProperty('--hair', `${1 / (window.devicePixelRatio || 1)}px`);
  const tools = h('<div class="view-tools"></div>');
  document.body.appendChild(tools);
  const GRID = 'smash-identity-grid';
  const button = h('<button type="button" class="view-toggle" aria-pressed="false" title="Show the grid (G)">Grid</button>');
  tools.appendChild(button);
  const showGrid = (on) => {
    document.body.classList.toggle('show-grid', on);
    button.setAttribute('aria-pressed', String(on));
    try { localStorage.setItem(GRID, on ? '1' : ''); } catch {}
    lives.forEach((l) => l.motion?.redraw?.());
    document.dispatchEvent(new Event('identity-grid'));
  };
  button.addEventListener('click', () => showGrid(!document.body.classList.contains('show-grid')));
  // The curves in pixels: a button, and P (Shift P back): round, pixels of 4, pixels of 10; kept in this browser.
  const PIXEL = 'smash-identity-pixel';
  const pxButton = h('<button type="button" class="view-toggle" aria-pressed="false" title="The curves round, or in pixels of 4 or 10 (P)">Pixel</button>');
  tools.appendChild(pxButton);
  const setPixel = (n) => {
    pixel = PIXELS.includes(n) ? n : 0;
    document.body.dataset.pixel = String(pixel); // for the motion (directions/original.js)
    pxButton.setAttribute('aria-pressed', String(!!pixel));
    pxButton.textContent = pixel ? `Pixel ${pixel}` : 'Pixel';
    try { localStorage.setItem(PIXEL, pixel ? String(pixel) : ''); } catch {}
    for (const d of directions) for (const el of document.querySelectorAll(`#${d.slug} [data-still]`)) el.innerHTML = drawn(d, el.dataset.still, el.dataset.ground);
    lives.forEach((l) => l.motion?.redraw?.());
    document.dispatchEvent(new Event('identity-pixel')); // for the sections that draw marks of their own (colour.js, type.js)
  };
  const stepPixel = (by) => setPixel(PIXELS[(PIXELS.indexOf(pixel) + by + PIXELS.length) % PIXELS.length]);
  pxButton.addEventListener('click', () => stepPixel(1));
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.target.closest?.('input, select, textarea, [contenteditable]')) return;
    if (e.key.toLowerCase() === 'g') showGrid(!document.body.classList.contains('show-grid'));
    else if (e.key.toLowerCase() === 'p') stepPixel(e.shiftKey ? -1 : 1);
  });
  try { if (localStorage.getItem(GRID)) showGrid(true); } catch {}
  try { const n = Number(localStorage.getItem(PIXEL)); if (n) setPixel(n); } catch {}
  // For the screenshot tool (web/scripts/identity-shoot.py).
  window.__identity = {
    seek(slug, t) { const m = bySlug[slug]?.motion; m?.pause?.(); m?.seek?.(t); return !!m; },
    ready: (slug) => Promise.all([settle(bySlug[slug]?.motion), settle(bySlug[slug]?.app)]),
    extra: (id) => extras[id] ?? null, // a mounted tool (lab, mapping, sculpture), for scripts
  };
  // Ratings, comments, likes: gathered as text to paste into the conversation (feedback.js).
  // Only when asked for (?feedback): once shared, it stays off the page.
  if (params.has('feedback')) import('./feedback.js').then((m) => m.mountFeedback(page)).catch((e) => console.error('[identity] feedback did not load', e));
  // For screenshots: once every live piece that is mounted says it is ready.
  await document.fonts.ready;
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  await Promise.all(lives.map((l) => Promise.all([settle(l.motion), settle(l.app)])));
  if (FIXED_T !== null) lives.forEach((l) => l.motion?.seek?.(FIXED_T));
  document.documentElement.dataset.ready = '1';
}

main().catch((e) => {
  console.error(e);
  document.body.insertAdjacentHTML('afterbegin', errorHTML(e.stack ?? e.message));
  document.documentElement.dataset.ready = '1';
});
