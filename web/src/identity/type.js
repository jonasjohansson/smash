// Typography: the site's own type (Jonas, 2026-09-30: "i quite liked the
// current pairing ... anton and montreal fonts"). Anton for titles, always in
// capitals; Neue Montreal for everything else; and Season Mix where the site
// tells a project at length, its leads and its story. One weight each (Season
// Mix with its italic). First the faces, then the type at work with the
// marks: a project's page, posters, business cards, a profile picture and a
// post, a slide and a film's end card, in the studio's own words (the
// projects' pages on the site) and pictures. Two switches: the colour (black
// and white, or an accent on the earth ground, as the Colour section has it)
// and the long texts (Season Mix, as the site, or Neue Montreal). The marks
// follow the page's Pixel switch (identity.js). web/scripts/identity-samples.py
// renders the samples as pictures and PDFs, which the section links.

import * as original from './directions/original.js';
import { IMAGES } from './lib.js';
import { ACCENTS, EARTH, contrast } from './colour.js';

const STORE = 'smash-identity-type';
const GROUND = EARTH.find((e) => e.name === 'Ground').hex;
const TYPE = EARTH.find((e) => e.name === 'Type').hex;

/**
 * A treatment's colours: black and white, or an accent (by name) on the
 * earth ground. ground and type are an artwork's own; accent is what stands
 * out on the ground (a mark, a face's name); field is a whole piece in the
 * accent (a card's front, the profile picture), paper the poster that is
 * printed on it, light the pale pieces (a card's back, a slide).
 */
export function treatment(name) {
  const a = ACCENTS.find((x) => x.name.toLowerCase() === String(name).toLowerCase());
  if (!a) return { ground: '#000000', type: '#ffffff', accent: '#ffffff', field: '#000000', onField: '#ffffff', paper: '#ffffff', onPaper: '#000000', light: '#ffffff', onLight: '#000000' };
  const hex = a.steps[0];
  const on = contrast(hex, '#ffffff') >= contrast(hex, '#000000') ? TYPE : GROUND; // type or ground on the accent, as the Colour section
  return { ground: GROUND, type: TYPE, accent: hex, field: hex, onField: on, paper: hex, onPaper: on, light: TYPE, onLight: GROUND };
}
const TREATMENTS = ['black and white', ...ACCENTS.map((a) => a.name.toLowerCase())];

/** Where the samples' PDFs are, once identity-samples.py has made them. */
export const pdfURL = (t) => new URL(`./samples/SMASH-typography-${t.replace(/ /g, '-')}.pdf`, import.meta.url).href;
export const PDFS = ['black and white', 'yellow'];

const img = (name) => IMAGES.find((u) => u.includes(name));
const photo = (name, pos = '50% 50%') => `<img class="ty-photo" src="${img(name)}" alt="" loading="lazy" style="object-position:${pos}">`;

// The marks, as the page draws them: original.js's stills, round or in pixels.
const MARKS = { symbol: 'symbol', wordmark: 'wordmark', square: 'sSquare' };
const markSVG = (kind, pixel = 0) => original[MARKS[kind]]({ pixel });
const mark = (kind, cls = '') => `<span class="ty-mk ${cls}" data-mk="${kind}">${markSVG(kind)}</span>`;

const STYLE = `
#type {
  --anton: Anton, Impact, "Arial Narrow", sans-serif; --nm: "Neue Montreal", "Helvetica Neue", Arial, sans-serif; --sm: "Season Mix", Georgia, serif;
  --ty-ground: #000; --ty-type: #fff; --ty-accent: #fff; --ty-field: #000; --ty-on-field: #fff; --ty-paper: #fff; --ty-on-paper: #000; --ty-light: #fff; --ty-on-light: #000;
  --ty-long: var(--sm);
}
#type[data-long="sans"] { --ty-long: var(--nm); }
#type .ty-controls { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 28px; font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--dim); }
#type .ty-seg { display: flex; flex-wrap: wrap; gap: 4px; }
#type .ty-seg button { display: inline-flex; align-items: center; gap: 7px; padding: 6px 10px; background: none; color: var(--dim); border: 1px solid var(--line); font: inherit; letter-spacing: inherit; text-transform: inherit; cursor: pointer; }
#type .ty-seg button:hover, #type .ty-seg button[aria-pressed="true"] { color: var(--text); border-color: var(--text); }
#type .ty-seg i { width: 9px; height: 9px; flex: none; }
#type .ty-pdfs { margin: 0; display: flex; gap: 14px; }
#type .ty-pdfs a { color: var(--text); text-decoration: none; border-bottom: 1px solid var(--dim); }
#type .ty-row { display: grid; gap: var(--gap); margin-top: var(--gap); }
#type .ty-row.two { grid-template-columns: repeat(2, minmax(0, 1fr)); }
#type .ty-row.three { grid-template-columns: repeat(3, minmax(0, 1fr)); }
@media (max-width: 760px) { #type .ty-row.two, #type .ty-row.three { grid-template-columns: 1fr; } }
#type .ty-fig { margin: 0; min-width: 0; }
#type .ty-fig > figcaption { margin-top: 10px; }
/* An artwork: what is in it measured in its width (cqw), so it scales as one picture. (Its own padding,
   gaps and tracks are in % instead: cqw there would be the viewport's.) The picture and its shade sit
   under the rest. */
#type .ty-art { position: relative; container-type: inline-size; overflow: hidden; isolation: isolate; background: var(--ty-ground); color: var(--ty-type); }
#type .ty-paper { background: var(--ty-paper); color: var(--ty-on-paper); }
#type .ty-light { background: var(--ty-light); color: var(--ty-on-light); }
#type .ty-field { background: var(--ty-field); color: var(--ty-on-field); }
#type .ty-hi { color: var(--ty-accent); }
#type .ty-stage { background: #5f5f5f; }
#type .ty-photo { position: absolute; inset: 0; z-index: -1; width: 100%; height: 100%; object-fit: cover; display: block; }
#type .ty-shade::after { content: ""; position: absolute; inset: 0; z-index: -1; background: linear-gradient(to top, color-mix(in srgb, var(--ty-ground) 82%, transparent), transparent 60%); }
#type .ty-mk { display: block; }
#type .ty-mk svg { display: block; width: 100%; height: auto; }
#type .ty-title { margin: 0; font: 400 10cqw/0.92 var(--anton); text-transform: uppercase; }
#type .ty-text { margin: 0; font: 400 1.6cqw/1.4 var(--nm); max-width: 44ch; }
#type .ty-long { font-family: var(--ty-long); }
#type .ty-meta { margin: 0; font: 400 1.05cqw/1.2 var(--nm); letter-spacing: 0.06em; text-transform: uppercase; }

/* The faces */
#type .ty-face { aspect-ratio: 16 / 9; padding: 5%; display: flex; flex-direction: column; justify-content: space-between; }
#type .ty-face .ty-meta { font-size: 2.2cqw; opacity: 0.6; }
#type .ty-face-name { margin: 0; line-height: 0.92; }
#type .ty-anton { font-family: var(--anton); text-transform: uppercase; }
#type .ty-nm { font-family: var(--nm); }
#type .ty-sm { font-family: var(--sm); }
#type .ty-face-set { margin: 0; line-height: 1.15; }

/* A project's page on the site */
#type .ty-web { aspect-ratio: 16 / 9; }
#type .ty-web-bar { position: absolute; top: 3cqw; left: 3cqw; right: 3cqw; display: flex; justify-content: space-between; align-items: center; }
#type .ty-web-bar .ty-mk { width: 5.4cqw; }
#type .ty-web-hero { position: absolute; left: 3cqw; right: 3cqw; bottom: 3cqw; display: grid; grid-template-columns: minmax(0, 1fr) 32cqw; align-items: end; gap: 3cqw; }
#type .ty-web-hero .ty-title { font-size: 14cqw; margin-bottom: -1.1cqw; }
#type .ty-web-hero .ty-text { font-size: 1.9cqw; line-height: 1.2; }
#type .ty-web .ty-meta { font-size: 1.2cqw; }
#type .ty-web-hero .ty-meta { margin-bottom: 1.2cqw; }

/* Posters, A-sized */
#type .ty-poster { aspect-ratio: 1 / 1.4142; padding: 7%; display: flex; flex-direction: column; justify-content: space-between; }
#type .ty-poster .ty-title { font-size: 19cqw; }
#type .ty-poster .ty-text { font-size: 4.4cqw; line-height: 1.25; margin-top: 4cqw; }
#type .ty-poster .ty-meta { font-size: 3cqw; }
#type .ty-poster-top { display: flex; justify-content: space-between; align-items: start; gap: 4cqw; }
#type .ty-poster-top .ty-mk { width: 22cqw; }
#type .ty-poster-top .ty-mk.sq { width: 14cqw; }
#type .ty-poster-top .ty-meta { text-align: right; }
#type .ty-poster-foot .ty-meta { margin-top: 5cqw; display: flex; justify-content: space-between; }

/* Business cards, 85 × 55, on a grey table */
#type .ty-cards { aspect-ratio: 16 / 9; display: flex; align-items: center; justify-content: center; gap: 4%; }
#type .ty-card { width: 42cqw; aspect-ratio: 85 / 55; position: relative; box-shadow: 0 0.6cqw 2cqw rgba(0, 0, 0, 0.35); }
#type .ty-card-front { display: grid; place-items: center; }
#type .ty-card-front .ty-mk { width: 10cqw; }
#type .ty-card-back { padding: 2.8cqw; display: flex; flex-direction: column; justify-content: space-between; }
#type .ty-card-back .ty-mk { width: 7cqw; }
#type .ty-card-name { margin: 0; font: 400 2.4cqw/1.15 var(--nm); }
#type .ty-card-lines { margin: 0.4cqw 0 0; font: 400 1.6cqw/1.4 var(--nm); }
#type .ty-card-back .ty-meta { font-size: 1.15cqw; }

/* A profile picture at three sizes, and a post */
#type .ty-social { aspect-ratio: 16 / 9; display: grid; grid-template-columns: auto 46%; align-items: center; justify-content: center; column-gap: 7%; }
#type .ty-avatars { display: flex; align-items: end; gap: 2.4cqw; }
#type .ty-avatar { border-radius: 50%; display: grid; place-items: center; }
#type .ty-avatar .ty-mk { width: 56%; }
#type .ty-post { aspect-ratio: 1; padding: 7%; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 0.6cqw 2cqw rgba(0, 0, 0, 0.35); }
#type .ty-post .ty-mk { width: 16cqw; }
#type .ty-post .ty-title { font-size: 17cqw; }
#type .ty-post .ty-text { font-size: 3.9cqw; line-height: 1.25; margin-top: 3cqw; }

/* A slide, and a film's end card */
#type .ty-slide { aspect-ratio: 16 / 9; padding: 4%; display: flex; flex-direction: column; justify-content: space-between; }
#type .ty-slide-top { display: flex; justify-content: space-between; align-items: start; }
#type .ty-slide-top .ty-mk { width: 7cqw; }
#type .ty-slide .ty-meta { font-size: 1.4cqw; }
#type .ty-slide-body { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 4cqw; align-items: end; }
#type .ty-slide-body .ty-meta { margin-bottom: 1.4cqw; }
#type .ty-slide-body .ty-title { font-size: 9cqw; }
#type .ty-slide .ty-text { font-size: 2cqw; line-height: 1.25; }
#type .ty-end { aspect-ratio: 16 / 9; display: grid; place-items: center; align-content: center; }
#type .ty-end .ty-mk { width: 22cqw; }
#type .ty-end .ty-meta { margin-top: 3.4cqw; font-size: 1.45cqw; line-height: 1.5; opacity: 0.8; text-align: center; }
`;

const RESONANCE = 'Interactive projection mapping on Uppsala Town Hall, where the public could paint the facade in colour.';
const HOW = 'Four weatherproofed touch pads with embedded lighting were placed in the main square, built to handle snow, rain, and countless jumps. Each pad triggered a colour ripple across the facade, animating an ocean scene on the building\'s surface. When all four pads were activated at once, a final sequence of light and music played out.';

const fig = (art, caption, cls = '') => `<figure class="ty-fig ${cls}">${art}<figcaption class="label">${caption}</figcaption></figure>`;
const button = (attr, value, label, on, swatch = '') => `<button type="button" data-${attr}="${value}" aria-pressed="${on}">${swatch ? `<i style="background:${swatch}"></i>` : ''}${label}</button>`;

export const HTML = `
  <section class="lab" id="type">
    <style>${STYLE}</style>
    <header class="ch-head">
      <p class="ch-n">00 · type</p>
      <h2 class="ch-name">Typography</h2>
    </header>
    <div class="ty-controls">
      <div class="ty-seg" role="group" aria-label="Colour">${TREATMENTS.map((t, i) => button('treat', t, t === 'black and white' ? 'Black and white' : ACCENTS[i - 1].name, i === 0, i ? ACCENTS[i - 1].steps[0] : '')).join('')}</div>
      <div class="ty-seg" role="group" aria-label="Long texts">${button('long', 'serif', 'Long texts in Season Mix', true)}${button('long', 'sans', 'In Neue Montreal', false)}</div>
      <p class="ty-pdfs">PDF ${PDFS.map((t) => `<a href="${pdfURL(t)}" target="_blank" rel="noopener">${t}</a>`).join('')}</p>
    </div>
    <div class="ty-row three">
      ${fig(`<div class="ty-art ty-face">
        <p class="ty-meta">Titles, always in capitals</p>
        <p class="ty-face-name ty-anton ty-hi" style="font-size:22cqw">Anton</p>
        <p class="ty-face-set ty-anton" style="font-size:4.6cqw">ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ<br>0123456789 &amp;?!.,:;–</p>
      </div>`, 'Anton · titles')}
      ${fig(`<div class="ty-art ty-face">
        <p class="ty-meta">Text, captions and labels</p>
        <p class="ty-face-name ty-nm ty-hi" style="font-size:10.4cqw;letter-spacing:-0.02em">Neue Montreal</p>
        <p class="ty-face-set ty-nm" style="font-size:3.2cqw">ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ<br>abcdefghijklmnopqrstuvwxyzåäö<br>0123456789 &amp;?!.,:;–</p>
      </div>`, 'Neue Montreal · text')}
      ${fig(`<div class="ty-art ty-face">
        <p class="ty-meta">A project told at length: its lead, its story</p>
        <p class="ty-face-name ty-sm ty-hi" style="font-size:12.4cqw;letter-spacing:-0.01em">Season Mix</p>
        <p class="ty-face-set ty-sm" style="font-size:3.4cqw">ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ<br>abcdefghijklmnopqrstuvwxyzåäö<br><em>abcdefghijklmnopqrstuvwxyzåäö</em></p>
      </div>`, 'Season Mix · long texts')}
    </div>
    <div class="ty-row">
      ${fig(`<div class="ty-art ty-web ty-shade">
        ${photo('08-resonance', '50% 40%')}
        <div class="ty-web-bar">${mark('symbol', 'ty-hi')}<p class="ty-meta">hello@smash.studio</p></div>
        <div class="ty-web-hero">
          <div><p class="ty-meta">Uppsala Town Hall · 2024</p><h3 class="ty-title">Resonance</h3></div>
          <p class="ty-text ty-long">${RESONANCE}</p>
        </div>
      </div>`, 'Website · a project')}
    </div>
    <div class="ty-row three">
      ${fig(`<div class="ty-art ty-poster ty-shade">
        ${photo('04-dome-dreaming', '50% 30%')}
        <div class="ty-poster-top">${mark('symbol', 'ty-hi')}<p class="ty-meta">Wisdome<br>Stockholm and Malmö</p></div>
        <div class="ty-poster-foot"><h3 class="ty-title">Dome<br>Dreaming</h3><p class="ty-text ty-long">A fulldome film festival at two newly built domes in Stockholm and Malmö.</p><p class="ty-meta"><span>2026</span><span>smash.studio</span></p></div>
      </div>`, 'Poster · with a picture')}
      ${fig(`<div class="ty-art ty-poster ty-paper">
        ${mark('wordmark')}
        <div class="ty-poster-foot"><h3 class="ty-title">Heroes</h3><p class="ty-text ty-long">Real-life statues, drone-scanned architecture, projected onto Stockholm's Great Synagogue.</p><p class="ty-meta"><span>Great Synagogue, Stockholm</span><span>2022</span></p></div>
      </div>`, 'Poster · the wordmark')}
      ${fig(`<div class="ty-art ty-poster ty-shade">
        ${photo('11-eastern-city-portal', '40% 50%')}
        <div class="ty-poster-top">${mark('square', 'sq ty-hi')}<p class="ty-meta">London</p></div>
        <div class="ty-poster-foot"><h3 class="ty-title">Eastern<br>City Portal</h3><p class="ty-text ty-long">A hybrid sculpture and augmented reality portal for the streets of London.</p><p class="ty-meta"><span>2024</span><span>smash.studio</span></p></div>
      </div>`, 'Poster · the square S')}
    </div>
    <div class="ty-row two">
      ${fig(`<div class="ty-art ty-stage ty-cards">
        <div class="ty-card ty-card-front ty-field">${mark('square')}</div>
        <div class="ty-card ty-card-back ty-light">
          ${mark('symbol')}
          <div><p class="ty-card-name">Ashley Reed</p><p class="ty-card-lines">ash@smash.studio</p></div>
          <p class="ty-meta">Immersive experience studio · Stockholm · smash.studio</p>
        </div>
      </div>`, 'Business card · front and back')}
      ${fig(`<div class="ty-art ty-stage ty-social">
        <div class="ty-avatars">
          <div class="ty-avatar ty-field" style="width:15cqw;height:15cqw">${mark('square')}</div>
          <div class="ty-avatar ty-field" style="width:7.5cqw;height:7.5cqw">${mark('square')}</div>
          <div class="ty-avatar ty-field" style="width:3.75cqw;height:3.75cqw">${mark('square')}</div>
        </div>
        <div class="ty-art ty-post ty-shade">
          ${photo('01-balena-voladora', '45% 50%')}
          ${mark('symbol', 'ty-hi')}
          <div><h3 class="ty-title">Balena<br>Voladora</h3><p class="ty-text ty-long">A flying whale in the desert. Pulling a lever sets its wooden skeleton in motion, swimming above the sand.</p></div>
        </div>
      </div>`, 'Profile picture and a post')}
    </div>
    <div class="ty-row two">
      ${fig(`<div class="ty-art ty-slide ty-light">
        <div class="ty-slide-top">${mark('symbol')}<p class="ty-meta">04</p></div>
        <div class="ty-slide-body">
          <div><p class="ty-meta">How it works</p><h3 class="ty-title">Resonance</h3></div>
          <p class="ty-text ty-long">${HOW}</p>
        </div>
      </div>`, 'Slide')}
      ${fig(`<div class="ty-art ty-end">
        ${mark('wordmark', 'ty-hi')}
        <p class="ty-meta">Immersive experience studio · Stockholm<br>smash.studio</p>
      </div>`, 'Film · end card')}
    </div>
  </section>`;

function load() {
  try { return { treat: 'black and white', long: 'serif', ...JSON.parse(localStorage.getItem(STORE) || '{}') }; } catch { return { treat: 'black and white', long: 'serif' }; }
}

/**
 * The switches, and the marks following the Pixel switch. Returns the usual
 * tool, plus set({ treat, long }) for scripts (identity-samples.py).
 */
export function mount(section) {
  const state = load();
  const apply = () => {
    for (const [k, v] of Object.entries(treatment(state.treat))) section.style.setProperty(`--ty-${k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`, v);
    section.dataset.long = state.long;
    for (const b of section.querySelectorAll('[data-treat]')) b.setAttribute('aria-pressed', String(b.dataset.treat === state.treat));
    for (const b of section.querySelectorAll('[data-long]')) b.setAttribute('aria-pressed', String(b.dataset.long === state.long));
    try { localStorage.setItem(STORE, JSON.stringify(state)); } catch {}
  };
  const onClick = (e) => {
    const b = e.target.closest('[data-treat], [data-long]');
    if (!b) return;
    if (b.dataset.treat) state.treat = b.dataset.treat;
    if (b.dataset.long) state.long = b.dataset.long;
    apply();
  };
  section.addEventListener('click', onClick);
  const draw = () => {
    const pixel = Number(document.body.dataset.pixel) || 0;
    for (const el of section.querySelectorAll('.ty-mk[data-mk]')) el.innerHTML = markSVG(el.dataset.mk, pixel);
  };
  if (Number(document.body.dataset.pixel)) draw();
  document.addEventListener('identity-pixel', draw);
  apply();
  return {
    ready: Promise.resolve(),
    set({ treat = state.treat, long = state.long } = {}) { Object.assign(state, { treat, long }); apply(); },
    pause() {},
    resume() {},
    destroy() { section.removeEventListener('click', onClick); document.removeEventListener('identity-pixel', draw); },
  };
}
