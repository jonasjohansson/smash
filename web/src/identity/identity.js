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
 * them, so the artboard carries the width). A wider mark (slant.js, its stems
 * widened) gets less: the original's proportion, or a sixth of its own width
 * either side, whichever is more.
 */
const wide = (str) => str.replace(/viewBox="\s*([-\d.]+)[\s,]+([-\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*"/, (m, x, y, w, h) => {
  const to = Math.max(Math.min(2 * w, (h * 1104) / 472), (4 * w) / 3);
  return `viewBox="${+x - (to - w) / 2} ${y} ${to} ${h}"`;
});

/**
 * A still drawn at a fixed scale, its box as wide as its own width says
 * (slant.js: down, Jonas 2026-10-12: "changing the ceiling seems to change
 * the width"): a taller column grows down the page instead of shrinking to
 * fit its panel.
 */
const DOWN_SCALE = 0.4; // px a unit
const atScale = (str) => str.replace(/<svg ([^>]*)viewBox="\s*([-\d.]+)[\s,]+([-\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*"/, (m, pre, x, y, w, h) => `<svg ${pre}viewBox="${x} ${y} ${w} ${h}" width="${+w * DOWN_SCALE}" height="${+h * DOWN_SCALE}"`);

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
  const kind = fn.startsWith('wordmark') ? 'wordmark' : fn; // the a's versions (slant.js: VERSIONS) are wordmarks too
  const one = (px) => { const v = still(d, fn, { ground, pixel: px }); return kind === 'wordmark' ? wide(v) : kind === 'down' ? atScale(v) : squared(v); };
  const svg = one(pixel);
  return withGrid(svg, kind, pixel ? one(0) : svg, d.mod.gridOf?.(kind));
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


/**
 * A chapter's own control (slant.js: KNOBS): a slider (its label, the range,
 * and its value in words), or a switch (a button for each of its options).
 */
const knobHTML = (k) => (k.each
  ? `<span class="knob each" data-knob="${esc(k.key)}"><span>${esc(k.label)}</span>${k.each.map((l, i) => (k.has(i) ? `<label><span class="col">${esc(l)}</span><input type="range" data-i="${i}" min="${k.min}" max="${k.max}" step="${k.step}" value="${k.get(i)}"><output>${k.get(i)}</output></label>` : '')).join('')}</span>`
  : k.rows
  ? `<span class="knob letters" data-knob="${esc(k.key)}" style="--n:${k.letters.length}"><span></span>${k.letters.map((l) => `<span class="col">${esc(l)}</span>`).join('')}${k.rows.map(([row, label]) => `<span>${esc(label)}</span>${k.letters.map((l, i) => (k.has(row, i) ? `<button type="button" data-row="${esc(row)}" data-i="${i}" title="${esc(`${label}, ${l}`)}"${k.on(row, i) ? ' data-on' : ''}${k.live && !k.live(row, i) ? ' disabled' : ''}></button>` : '<i></i>')).join('')}`).join('')}</span>`
  : k.options
  ? `<span class="knob switch" data-knob="${esc(k.key)}"><span>${esc(k.label)}</span>${k.options.map(([label, v]) => `<button type="button" data-v="${esc(String(v))}"${String(v) === String(k.value) ? ' data-on' : ''}>${esc(label)}</button>`).join('')}</span>`
  : `<label class="knob" data-knob="${esc(k.key)}"><span>${esc(k.label)}</span><input type="range" min="${k.min}" max="${k.max}" step="${k.step}" value="${k.value}"><output>${esc(k.text(k.value))}</output></label>`);

/**
 * A chapter's controls: in its groups where it has them (slant.js: GROUPS, [name, open at the start], and each
 * control's group), each group a fold under its name, the controls with none above them all. A fold opened or
 * shut is remembered in this browser (by chapter and name), so it stays as it was when a preset reloads the page.
 */
const foldKey = (slug, name) => `identity:fold:${slug}:${name}`;
function knobsHTML(d) {
  const K = d.mod.KNOBS ?? [];
  if (!d.mod.GROUPS) return K.map(knobHTML).join('');
  const isOpen = (name, open) => { try { const v = localStorage.getItem(foldKey(d.slug, name)); return v == null ? open : v === '1'; } catch { return open; } };
  return K.filter((k) => !k.group).map(knobHTML).join('') + d.mod.GROUPS.map(([name, open]) => {
    const inside = K.filter((k) => k.group === name);
    return inside.length ? `<details class="knob-group" data-group="${esc(name)}"${isOpen(name, open) ? ' open' : ''}><summary>${esc(name)}</summary><div>${inside.map(knobHTML).join('')}</div></details>` : '';
  }).join('');
}

/** Each control sets its measure, and the chapter's stills, favicons and stage are drawn again. */
function knobs(d, section) {
  const redraw = () => {
    for (const el of section.querySelectorAll('[data-still]')) el.innerHTML = drawn(d, el.dataset.still, el.dataset.ground);
    const fav = $('.favicons', section);
    if (fav) fav.outerHTML = favicons(d);
    // A table's switches that do nothing as the other controls now stand (k.live), dimmed.
    for (const k of d.mod.KNOBS ?? []) if (k.rows && k.live) for (const b of section.querySelectorAll(`.knob[data-knob="${k.key}"] button`)) b.disabled = !k.live(b.dataset.row, Number(b.dataset.i));
    shown();
    d.live?.motion?.redraw?.();
  };
  // A control that does nothing as the others stand (k.when), hidden.
  const shown = () => { for (const k of d.mod.KNOBS ?? []) if (k.when) $(`.knob[data-knob="${k.key}"]`, section).hidden = !k.when(); };
  shown();
  for (const fold of section.querySelectorAll('.knob-group')) {
    fold.addEventListener('toggle', () => { try { localStorage.setItem(foldKey(d.slug, fold.dataset.group), fold.open ? '1' : '0'); } catch { /* no storage: the fold as it starts */ } });
  }
  for (const k of d.mod.KNOBS ?? []) {
    const el = $(`.knob[data-knob="${k.key}"]`, section);
    if (k.each) {
      for (const input of el.querySelectorAll('input')) {
        input.addEventListener('input', () => {
          k.set(Number(input.dataset.i), input.value);
          input.nextElementSibling.textContent = input.value;
          redraw();
        });
      }
      continue;
    }
    if (k.rows) {
      for (const b of el.querySelectorAll('button')) {
        b.addEventListener('click', () => {
          const on = !b.hasAttribute('data-on');
          k.set(b.dataset.row, Number(b.dataset.i), on);
          b.toggleAttribute('data-on', on);
          redraw();
        });
      }
      continue;
    }
    if (k.options) {
      for (const b of el.querySelectorAll('button')) {
        b.addEventListener('click', () => {
          k.set(b.dataset.v);
          for (const o of el.querySelectorAll('button')) o.toggleAttribute('data-on', o === b);
          redraw();
        });
      }
      continue;
    }
    const input = $('input', el);
    input.addEventListener('input', () => {
      k.set(input.value);
      $('output', el).textContent = k.text(Number(input.value));
      redraw();
    });
  }
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
          <button type="button" class="play" aria-label="Play or pause"${info.motion === false ? ' hidden' : ''}>Pause</button>
          <input type="range" class="scrub" min="0" max="1000" value="0" aria-label="Scrub the motion"${info.motion === false ? ' hidden' : ''}>
          ${typeof d.mod.frame === 'function' ? `<button type="button" class="download" title="${SIZES_HINT}">MP4</button>` : ''}
          ${knobsHTML(d)}
        </figcaption>
      </figure>
      <div class="row two">
        <figure class="panel ground-ink">${markHTML(d, 'wordmark', 'ink', 'wm')}<figcaption class="label">Wordmark</figcaption></figure>
        <figure class="panel ground-paper">${markHTML(d, 'wordmark', 'paper', 'wm')}<figcaption class="label">Wordmark</figcaption></figure>
      </div>
      ${d.mod.VERSIONS ? `<div class="row three">${d.mod.VERSIONS.map(([fn, label]) => `
        <figure class="panel ground-paper">${markHTML(d, fn, 'paper', 'wm')}<figcaption class="label">${esc(label)}</figcaption></figure>`).join('')}
      </div>` : ''}
      ${typeof d.mod.down === 'function' ? `<div class="row three">
        <figure class="panel ground-ink tall">${markHTML(d, 'down', 'ink', 'down')}<figcaption class="label">Down</figcaption></figure>
        <figure class="panel ground-paper tall">${markHTML(d, 'down', 'paper', 'down')}<figcaption class="label">Down</figcaption></figure>
      </div>` : ''}
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
  // The type chosen, Druk (Anton until 2026-10-03), Neue Montreal and Season Mix, at work with the marks (Jonas, 2026-09-30).
  // It and the typeface folded to a line each, loaded when opened (Jonas, 2026-10-14).
  { id: 'type', name: 'Typography', last: true, folded: true, load: async () => { const m = await import('./type.js'); return { html: m.HTML, mount: m.mount }; } },
  // SMASH's own typeface, for very special occasions: a section of its own (Jonas, 2026-10-01).
  { id: 'typeface', name: 'The SMASH typeface', last: true, folded: true, load: async () => { const m = await import('./typeface.js'); return { html: m.HTML, mount: m.mount }; } },
  // The palette at the very bottom, after the sequence (Jonas, 2026-09-30).
  { id: 'colour', name: 'Colour', last: true, load: async () => { const m = await import('./colour.js'); return { html: m.HTML, mount: m.mount }; } },
  // The kit, after the colour (Jonas, 2026-10-14): business cards and email signatures, at their real size.
  { id: 'kit', name: 'Kit', last: true, load: async () => { const m = await import('./kit.js'); return { html: m.HTML, mount: m.mount }; } },
  // Folded, under the colour (Jonas, 2026-09-30: not so important any more): a line, loaded when opened.
  { id: 'mapping', name: 'Mapping', last: true, folded: true, load: async () => { const m = await import('./mapping.js'); return { html: m.HTML, mount: m.mount }; } },
  // Hidden since 2026-10-14 (Jonas): off the page and its bar, still there alone at ?d=sculpture.
  { id: 'sculpture', name: 'Sculpture', last: true, hidden: true, load: async () => { const m = await import('./sculpture.js'); return { html: m.HTML, mount: m.mount }; } },
  // Slant's best presets, in the palette's colours: a section of its own at the bottom of the page (Jonas, 2026-10-14).
  { id: 'slant-best', name: 'Slant, best of', last: true, load: async () => { const m = await import('./slant-best.js'); return { html: m.HTML, mount: m.mount }; } },
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

/**
 * The sections, in a bar fixed at the top, the full width (Jonas, 2026-10-14: "a small fixed menu that follows
 * along", then "fixed in the top"): every section's name, the one on screen lit; a click takes the page there (and
 * opens it, if it is folded).
 */
function sectionNav(page) {
  const items = [...page.children].filter((el) => el.matches('section[id], details.fold')).map((el) => ({
    el, name: (el.querySelector(':scope > .ch-head .ch-name, :scope > .fold-head .fold-name')?.textContent ?? el.id).trim(),
  }));
  if (!items.length) return;
  const nav = h(`<nav class="section-nav" aria-label="Sections">${items.map((x, i) => `<button type="button" data-i="${i}">${esc(x.name)}</button>`).join('')}</nav>`);
  document.body.prepend(nav);
  document.body.classList.add('has-section-nav');
  const links = [...nav.querySelectorAll('button')];
  const below = () => nav.getBoundingClientRect().bottom;
  nav.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const { el } = items[b.dataset.i];
    if (el.tagName === 'DETAILS') el.open = true;
    // A jump, then again while the sections passed mount and change their height, until it holds (or a second).
    let until = performance.now() + 1000;
    const stop = () => { until = 0; };
    addEventListener('wheel', stop, { once: true, passive: true });
    addEventListener('touchstart', stop, { once: true, passive: true });
    const land = () => {
      if (performance.now() > until) return;
      const off = el.getBoundingClientRect().top - below();
      if (Math.abs(off) > 1) scrollBy(0, off);
      requestAnimationFrame(land);
    };
    land();
  });
  // The section on screen: the last one whose top is above the middle of the window.
  let at = -1, queued = false;
  const follow = () => {
    queued = false;
    let i = 0;
    items.forEach((x, j) => { if (x.el.getBoundingClientRect().top < innerHeight / 2) i = j; });
    if (i === at) return;
    at = i;
    links.forEach((b, j) => b.toggleAttribute('data-now', j === i));
    // On a narrow screen the bar scrolls sideways: keep the lit name in it.
    const b = links[i];
    if (b.offsetLeft < nav.scrollLeft || b.offsetLeft + b.offsetWidth > nav.scrollLeft + nav.clientWidth) nav.scrollLeft = b.offsetLeft - 16;
  };
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(follow); } }, { passive: true });
  addEventListener('resize', follow);
  follow();
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
    lives.push(bySlug[d.slug] = d.live = live(d, section));
    knobs(d, section);
    if (d.slug === 'original' && !ONLY) for (const x of EXTRAS.filter((x) => !x.last)) await addExtra(page, x);
  }
  if (!ONLY) for (const x of EXTRAS.filter((x) => x.last && !x.hidden)) await (x.folded ? addFolded(page, x) : addExtra(page, x));
  for (const x of EXTRAS.filter((x) => x.id === ONLY)) await addExtra(page, x);
  if (!ONLY) sectionNav(page);
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
