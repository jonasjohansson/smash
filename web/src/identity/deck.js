// The deck: the same modules as 1920 × 1080 slides, for the PDF
// (web/scripts/identity-pdf.py). Live pieces are drawn one at a time, frozen
// into pictures and let go, so no more than one WebGL context is alive at once.

import { IMAGES } from './lib.js';
import { loadDirections, attempt, errorHTML, loadFonts, settle, pad } from './directions.js';

const params = new URLSearchParams(location.search);
const ONLY = params.get('d');
const DATE = '2026 09 28';
const esc = (s = '') => String(s).replace(/[<&"]/g, (c) => ({ '<': '&lt;', '&': '&amp;', '"': '&quot;' })[c]);
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };

function still(d, fn, arg) {
  const r = attempt(d, fn, arg);
  if (r.error) return errorHTML(r.error);
  return typeof r.value === 'string' ? r.value : errorHTML(`${d.slug}.${fn}() did not return an SVG string`);
}
// Black and white (the focus round).
const palette = () => '--d-ink:#000;--d-paper:#fff;--d-accent:#fff;';
const foot = () => ''; // no running text on the slides

/** Mount a live piece in el, seek it, wait until it is drawn, and freeze it into a picture. */
async function freeze(d, fn, el, arg, t) {
  const r = attempt(d, fn, el, arg);
  if (r.error) { el.innerHTML = errorHTML(r.error); return; }
  const ctrl = r.value ?? {};
  try {
    if (t !== undefined) ctrl.seek?.(t);
    await settle(ctrl);
    if (t !== undefined) ctrl.seek?.(t);
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
    for (const c of el.querySelectorAll('canvas')) {
      const img = new Image();
      img.src = c.toDataURL('image/png');
      img.style.cssText = c.style.cssText || 'position:absolute;inset:0;width:100%;height:100%;';
      await img.decode().catch(() => {});
      c.replaceWith(img);
    }
    const snap = el.cloneNode(true);
    ctrl.pause?.();
    ctrl.destroy?.();
    el.replaceWith(snap);
  } catch (e) {
    console.error(e);
    el.innerHTML = errorHTML(`${d.slug}.${fn}: ${e.message}`);
  }
}

function titleSlide(d) {
  const { info } = d;
  return h(`
    <section class="slide s-title ground-ink" style="${palette(info)}">
      <div class="s-head"><span>${pad(info.n)}</span><span>${esc(info.lane)}</span></div>
      <h2 class="s-name">${esc(info.name)}</h2>
      <p class="s-idea">${esc(info.idea ?? '')}</p>
      <div class="s-wm">${still(d, 'wordmark', { ground: 'ink' })}</div>
      ${foot(`${pad(info.n)} ${info.name}`)}
    </section>`);
}

function markSlide(d) {
  const { info } = d;
  const fav = (size) => `<span class="fav" style="width:${size}px;height:${size}px">${still(d, 'favicon', { size })}</span>`;
  return h(`
    <section class="slide s-marks" style="${palette(info)}">
      <div class="m m-wm-ink ground-ink"><div class="mk">${still(d, 'wordmark', { ground: 'ink' })}</div><p class="lbl">Wordmark</p></div>
      <div class="m m-wm-paper ground-paper"><div class="mk">${still(d, 'wordmark', { ground: 'paper' })}</div><p class="lbl">Wordmark</p></div>
      <div class="m m-sym ground-ink"><div class="mk">${still(d, 'symbol', { ground: 'ink' })}</div><p class="lbl">Symbol</p></div>
      <div class="m m-lock ground-paper"><div class="mk">${still(d, 'lockup', { ground: 'paper' })}</div><p class="lbl">Lockup</p></div>
      <div class="m m-fav ground-mid"><div class="favs">${fav(64)}${fav(32)}${fav(16)}</div><p class="lbl">Favicon 64 · 32 · 16</p></div>
      ${foot(`${pad(info.n)} ${info.name}: the marks`)}
    </section>`);
}

function motionSlide(d) {
  const { info } = d;
  const key = info.keyframe ?? 0.75;
  const ts = [0, 0.2, 0.4, 0.6, 0.8];
  return h(`
    <section class="slide s-motion" style="${palette(info)}">
      <div class="big ground-ink"><div class="live" data-fn="motion" data-t="${key}"></div></div>
      <div class="side">
        <p class="lbl">Motion</p>
        <p class="s-story">${esc(info.idea ?? '')}</p>
      </div>
      <div class="strip">${ts.map((t) => `<div class="frame ground-ink"><div class="live" data-fn="motion" data-t="${t}"></div><span class="t">t ${t.toFixed(1)}</span></div>`).join('')}</div>
      ${foot(`${pad(info.n)} ${info.name}: motion`)}
    </section>`);
}


function coverSlides() {
  return [h(`<section class="slide s-cover"><h1>SMASH</h1></section>`)];
}


async function main() {
  const directions = await loadDirections(ONLY);
  directions.forEach((d) => loadFonts(d.info));
  const deck = document.getElementById('deck');
  if (!ONLY) coverSlides().forEach((s) => deck.appendChild(s));
  for (const d of directions) {
    for (const make of [titleSlide, markSlide, motionSlide]) {
      const slide = make(d);
      slide.dataset.slug = d.slug;
      deck.appendChild(slide);
    }
    if (d.slug === 'original' && !ONLY) deck.appendChild(h(`
      <section class="slide s-modular">
        <div class="s-head"><span>00 · modular</span><span>The mark on its own grid</span></div>
        <h2 class="s-name">The modular mark</h2>
        <p class="s-idea">The crop Jonas liked, taken through the whole word: the mark rebuilt on its bars and slots, five bands high. The S M is its symbol.</p>
        <div class="mod-word" data-modular="4"></div>
        <div class="mod-mono" data-modular="1"></div>
        ${foot('00 Original: the modular mark')}
      </section>`));
    if (d.slug === 'original' && !ONLY) deck.appendChild(h(`
      <section class="slide s-lab">
        <div class="s-head"><span>00 · live</span><span>The generator</span></div>
        <h2 class="s-name">The mark, live</h2>
        <p class="s-idea">The original as a system: every measure of the mark is a setting, letter by letter, and the work shows through it.</p>
        <div class="lab-shot"><div class="lab-stage"></div></div>
        ${foot('00 Original: live')}
      </section>`));
    // (The 3D views stay on the page, in the generator; the deck is 2D first.)
  }
  await document.fonts.ready;
  // One live piece at a time.
  for (const el of [...deck.querySelectorAll('.live')]) {
    const d = directions.find((x) => x.slug === el.closest('[data-slug]')?.dataset.slug) ?? null;
    if (!d) continue;
    const fn = el.dataset.fn;
    const t = el.dataset.t !== undefined ? Number(el.dataset.t) : undefined;
    await freeze(d, fn, el, fn === 'application' ? { images: IMAGES } : { ground: 'ink' }, t);
  }
  // The modular mark: plain SVG from modular.js, drawn from its defaults.
  for (const el of deck.querySelectorAll('[data-modular]')) {
    try {
      const { markSVG, MODULAR_DEFAULTS } = await import('./modular.js');
      // The word centred; the S M set flush left, under the word's first letters.
      const align = el.dataset.modular === '1' ? 'xMinYMid' : 'xMinYMid';
      el.innerHTML = markSVG(MODULAR_DEFAULTS, Number(el.dataset.modular), '#fff', `deck-mod-${el.dataset.modular}`).replace('<svg ', `<svg preserveAspectRatio="${align} meet" `);
    } catch (e) { el.innerHTML = errorHTML(`The modular mark: ${e.message}`); }
  }
  // The live mark, from its defaults (not this browser's settings): drawn,
  // frozen into a picture, let go. The 3D slide draws the same object from two sides.
  for (const slide of deck.querySelectorAll('.s-lab')) {
    const solid = slide.classList.contains('s-lab3d');
    for (const stage of slide.querySelectorAll('.lab-stage')) {
      try {
        const { mountLab } = await import('./lab.js');
        const holder = document.createElement('div');
        holder.innerHTML = '<div class="lab-stage"></div>';
        stage.replaceWith(holder);
        holder.className = 'lab-holder';
        const inner = holder.firstElementChild;
        inner.dataset.view = stage.dataset.view ?? '';
        const lab = mountLab(holder, { panel: false, settings: solid ? { renderer: '3d', turntable: false } : {} });
        await Promise.race([lab.ready, new Promise((r) => setTimeout(r, 10000))]);
        await new Promise((r) => setTimeout(r, 1500));
        const [yaw, pitch] = (inner.dataset.view || '').split(',').map(Number);
        const img = new Image();
        img.src = lab.snapshot(solid ? { yaw, pitch } : undefined);
        await img.decode().catch(() => {});
        lab.destroy();
        inner.replaceChildren(img);
      } catch (e) {
        console.error(e);
        stage.innerHTML = errorHTML(`The live mark: ${e.message}`);
      }
    }
  }
  document.documentElement.dataset.ready = '1';
}

main().catch((e) => {
  console.error(e);
  document.body.insertAdjacentHTML('afterbegin', errorHTML(e.stack ?? e.message));
  document.documentElement.dataset.ready = '1';
});
