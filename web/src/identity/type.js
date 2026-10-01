// Typography: the site's own type. Anton for titles, always in capitals, on
// the web standing in for Druk (Commercial Type), SMASH's title face (Jonas,
// 2026-10-01: "i think druk is great, and anton a good web font alternative";
// only Druk's trial is in the library, without Å Ä Ö, so the pieces stay in
// Anton until it is bought); Neue
// Montreal for labels, captions and small text; Season Mix for what tells a
// project at length, its lead and its story (Jonas, 2026-10-01, after trying
// the site without it: "i think we prefer the season mix"). SMASH's own
// typeface, for very special occasions ("we wont use it primiarly"), has a
// section of its own (typeface.js), which borrows this one's pieces and
// styles. Then, as Jonas asked ("more like type specimens and then some
// typography compositions ... with various versions of the logo and
// wordmark"): specimens (each face, the scale), compositions, each with
// another version of the mark (the S on its side, the square S, the modular
// mark, the wordmark in pixels, the S alone), and, folded, the type in use.
// Only SMASH's own work (the projects the site lists), in its own words.
//
// The colour switch: black and white, or an accent on the earth ground, as
// the Colour section has it. The marks follow the page's Pixel switch
// (identity.js), but for the composition that is about pixels.
// web/scripts/identity-samples.py renders the pieces as pictures and PDFs,
// which the section links.

import * as original from './directions/original.js';
import { markSVG as modularSVG, MODULAR_DEFAULTS } from './modular.js';
import { IMAGES } from './lib.js';
import { ACCENTS, EARTH, contrast } from './colour.js';

const STORE = 'smash-identity-type';
const GROUND = EARTH.find((e) => e.name === 'Ground').hex;
const TYPE = EARTH.find((e) => e.name === 'Type').hex;
const PINK = '#ff29b8'; // the construction's pink, as the grid's

/**
 * A treatment's colours: black and white, or an accent (by name) on the
 * earth ground. ground and type are an artwork's own; accent is what stands
 * out on the ground (a mark, a face's name); field is a whole piece in the
 * accent (a card's front, the profile picture), paper the poster printed on
 * it, light the pale pieces (a card's back, a slide); construct draws the
 * specimens' measures.
 */
export function treatment(name) {
  const a = ACCENTS.find((x) => x.name.toLowerCase() === String(name).toLowerCase());
  if (!a) return { ground: '#000000', type: '#ffffff', accent: '#ffffff', field: '#000000', onField: '#ffffff', paper: '#ffffff', onPaper: '#000000', light: '#ffffff', onLight: '#000000', construct: PINK };
  const hex = a.steps[0];
  const on = contrast(hex, '#ffffff') >= contrast(hex, '#000000') ? TYPE : GROUND; // type or ground on the accent, as the Colour section
  return { ground: GROUND, type: TYPE, accent: hex, field: hex, onField: on, paper: hex, onPaper: on, light: TYPE, onLight: GROUND, construct: hex };
}
const TREATMENTS = ['black and white', ...ACCENTS.map((a) => a.name.toLowerCase())];

/** Where the PDFs are, once identity-samples.py has made them. */
export const pdfURL = (t) => new URL(`./samples/SMASH-typography-${t.replace(/ /g, '-')}.pdf`, import.meta.url).href;
export const PDFS = ['black and white', 'yellow'];

const pic = (file) => (file.includes('/') ? file : new URL(`./img/${file}`, import.meta.url).href);
const photo = (file, pos = '50% 50%') => `<img class="ty-photo" src="${pic(file)}" alt="" loading="lazy" style="object-position:${pos}">`;
const RESONANCE_PHOTO = IMAGES.find((u) => u.includes('08-resonance'));

// The marks, as the page draws them (original.js's stills, round or in pixels), and the modular mark.
const STILLS = { wordmark: 'wordmark', symbol: 'symbol', s: 's', side: 'sTurned', square: 'sSquare' };
let masks = 0;
function markSVG(kind, pixel = 0) {
  if (kind === 'modular') return modularSVG(MODULAR_DEFAULTS, 4, 'currentColor', `ty-mod-${masks++}`);
  const [name, fixed] = kind.split(':'); // "wordmark:10": always in pixels of 10
  return original[STILLS[name]]({ pixel: fixed ? Number(fixed) : pixel });
}
export const mark = (kind, cls = '') => `<span class="ty-mk ${cls}" data-mk="${kind}">${markSVG(kind)}</span>`;

// Resonance's own words, for the scale and the slide.
const RESONANCE = 'Interactive projection mapping on Uppsala Town Hall, where the public could paint the facade in colour.';
const HOW = 'Four weatherproofed touch pads with embedded lighting were placed in the main square, built to handle snow, rain, and countless jumps. Each pad triggered a colour ripple across the facade, animating an ocean scene on the building\'s surface. When all four pads were activated at once, a final sequence of light and music played out.';

// The faces ------------------------------------------------------------------

// Their vertical measures per em (the fonts' OS/2 and hhea tables): cap height, x-height, descent.
export const METRICS = {
  anton: { cap: 1760 / 2048, x: 1500 / 2048, desc: 674 / 2048 },
  nm: { cap: 0.715, x: 0.51, desc: 0.225 },
  sm: { cap: 0.721, x: 0.519, desc: 0.254 },
  smash: { cap: 0.7, x: 0.7, desc: 0.2 }, // at its defaults: its height 471 (the mark's) draws the letters 700 high
};
// The advance widths, per em, of the words set to a measure (read from the fonts with fontTools).
export const EM = { 400: 1.4824, JAGAD: 2.415, Uppsala: 3.465, Hjärtslag: 3.783, Resonance: 1.386 };
const FAMILY = { anton: 'Anton', nm: 'Neue Montreal', sm: 'Season Mix', smash: 'SMASH' };
const per1000 = (v) => Math.round(v * 1000);

/**
 * A word as big as a specimen shows it, with the face's measures drawn
 * across it (cap height, x-height, baseline, descent), labelled at the right:
 * an SVG 1000 wide, the word 740 of it.
 */
export function measured(face, word, { lines = ['cap', 'x', 'base', 'desc'], labels = {}, settings = '' } = {}) {
  const m = METRICS[face];
  const size = 740 / EM[word];
  const top = face === 'anton' ? 40 : 60; // room over the cap height for the ascenders
  const base = top + m.cap * size;
  const h = Math.ceil(base + m.desc * size + 34);
  const at = { cap: base - m.cap * size, x: base - m.x * size, base, desc: base + m.desc * size };
  const label = { cap: `Cap height ${per1000(m.cap)}`, x: `x-height ${per1000(m.x)}`, base: 'Baseline 0', desc: `Descent ${per1000(m.desc)}`, ...labels };
  const rules = lines.map((k) => `<path class="ty-rule" d="M0 ${f(at[k])}H1000"/><text class="ty-rule-label" x="1000" y="${f(at[k] - 9)}" text-anchor="end">${label[k]}</text>`).join('');
  return `<svg class="ty-measured" viewBox="0 0 1000 ${h}" aria-label="${word}">${rules}`
    + `<text x="0" y="${f(base)}" font-family="${FAMILY[face]}" font-size="${f(size)}"${settings ? ` style="font-variation-settings:${settings}"` : ''} fill="currentColor">${word}</text></svg>`;
}
export const f = (n) => +n.toFixed(2);

export const CAPS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ';
const LOWER = 'abcdefghijklmnopqrstuvwxyzåäö';
export const FIGURES = '0123456789';
export const MARKS_ = '&?!.,:;–()';
const MORE = '@%'; // the text faces' table filled to whole rows
const glyphs = (set, cls = '') => `<div class="ty-glyphs ${cls}">${[...set].map((g) => `<span>${g === '&' ? '&amp;' : g}</span>`).join('')}</div>`;

export function sheet({ name, face, by, role, word, set, cols, measure = {}, extra = '' }) {
  return `<div class="ty-art ty-sheet">
    <div class="ty-sheet-head"><p class="ty-meta">${name}</p><p class="ty-meta">${by}</p><p class="ty-meta">${role}</p></div>
    <div class="ty-sheet-body">
      <div class="ty-sheet-word ty-hi">${measured(face, word, measure)}${extra}</div>
      ${glyphs(set, `ty-${face}`).replace('class="ty-glyphs', `style="--cols:${cols}" class="ty-glyphs`)}
    </div>
  </div>`;
}

// The SMASH face's axes, each at its least, its default (the mark's) and its most.
export const SMASH_DEFAULTS = { wght: 500, wdth: 100, CRSB: 50, ROND: 100, HGHT: 471 };
export const AXES = [
  ['Weight', 'wght', [100, 500, 900]],
  ['Width', 'wdth', [70, 100, 175]],
  ['Crossbar', 'CRSB', [27, 50, 73]],
  ['Roundness', 'ROND', [0, 50, 100]],
  ['Height', 'HGHT', [300, 471, 720]],
];
export const settings = (o) => Object.entries(o).map(([k, v]) => `'${k}' ${v}`).join(', ');
const SPECIMENS = `
    <div class="ty-row">
      ${fig(sheet({
        name: 'Anton', face: 'anton', word: 'JAGAD', cols: 7, measure: { lines: ['cap', 'base', 'desc'] },
        by: 'Vernon Adams · Google Fonts · free, SIL Open Font License',
        role: 'Titles on the web, in place of Druk, the title face · always in capitals · line height 0.92',
        set: CAPS + FIGURES + MARKS_,
      }), 'Specimen · Anton')}
    </div>
    <div class="ty-row">
      ${fig(sheet({
        name: 'Neue Montreal', face: 'nm', word: 'Uppsala', cols: 10,
        by: 'Mathieu Desjardins, Sebastien Tremblay · Pangram Pangram · licensed',
        role: 'Labels, captions, small text · labels in capitals, tracked 6 %',
        set: CAPS + LOWER + FIGURES + MARKS_ + MORE,
      }), 'Specimen · Neue Montreal')}
    </div>
    <div class="ty-row">
      ${fig(sheet({
        name: 'Season Mix', face: 'sm', word: 'Hjärtslag', cols: 10,
        by: 'Martin Vácha · Displaay · licensed',
        role: 'A project told at length: its lead, its story · roman and italic',
        set: CAPS + LOWER + FIGURES + MARKS_ + MORE,
        extra: '<p class="ty-sheet-italic ty-sm"><em>Projection mapping 400 years of Sala\'s history onto a curved facade.</em></p>',
      }), 'Specimen · Season Mix')}
    </div>
    <div class="ty-row">
      ${fig(`<div class="ty-art ty-scale">
        <p class="ty-meta ty-scale-spec">Label<br><span>Neue Montreal 12 · capitals · tracked 6 %</span></p>
        <p class="ty-meta ty-scale-label">Uppsala Town Hall · 2024</p>
        <p class="ty-meta ty-scale-spec">Title<br><span>Anton 104 · line height 0.97 · capitals</span></p>
        <h3 class="ty-title ty-scale-title">Resonance</h3>
        <p class="ty-meta ty-scale-spec">Lead and story<br><span>Season Mix 46 · line height 1.15</span></p>
        <p class="ty-text ty-scale-lead">${RESONANCE}</p>
        <p class="ty-meta ty-scale-spec">Small text<br><span>Neue Montreal 16 · line height 1.5</span></p>
        <p class="ty-text ty-scale-text">Made with Rose Hallgren, for Allt Ljus på Uppsala. The facade was drone-scanned to build a digital replica, and a laser-cut scale model of the building served for testing the projection.</p>
      </div>`, 'Specimen · the scale, as on the site at 1440 px')}
    </div>
`;

// Compositions ----------------------------------------------------------------

/** One number as wide as the measure (860 of 1000). */
function number(n) {
  const size = 860 / EM[n];
  const cap = METRICS.anton.cap * size;
  return `<svg class="ty-number" viewBox="0 0 860 ${f(cap)}" aria-label="${n}"><text x="0" y="${f(cap)}" font-family="Anton" font-size="${f(size)}" textLength="860" lengthAdjust="spacing" fill="currentColor">${n}</text></svg>`;
}

const COMPOSITIONS = `
    <div class="ty-row two">
      ${fig(`<div class="ty-art ty-poster ty-count">
        ${number(400)}
        <div class="ty-count-body">
          <h3 class="ty-title">Sala Hjärtslag</h3>
          <p class="ty-text">Projection mapping 400 years of Sala's history onto a curved facade.</p>
        </div>
        <div class="ty-poster-foot-row"><p class="ty-meta">City of Sala<br>2024</p>${mark('side', 'ty-hi')}</div>
      </div>`, 'A number · the S on its side')}
      ${fig(`<div class="ty-art ty-poster ty-squared">
        ${mark('square', 'ty-hi')}
        <div class="ty-squared-foot">
          <h3 class="ty-title">Installations,<br>projection,<br>stages</h3>
          <p class="ty-meta">Immersive<br>experience studio<br>Stockholm</p>
        </div>
      </div>`, 'Three words · the square S')}
    </div>
    <div class="ty-row two">
      ${fig(`<div class="ty-art ty-leadpiece">
        <div class="ty-leadpiece-top"><h3 class="ty-title">Dome Conductor</h3><p class="ty-meta">Wisdome Stockholm · 2025</p></div>
        <p class="ty-text ty-leadpiece-lead">An orchestra follows your hands. Raise them, find a rhythm and conduct the music around you.</p>
        <div class="ty-leadpiece-foot">${mark('modular', 'ty-hi')}<p class="ty-meta">smash.studio</p></div>
      </div>`, 'A lead · the modular mark')}
      ${fig(`<div class="ty-art ty-pixels">
        ${mark('wordmark:10', 'ty-hi ty-pixels-mark')}
        <div class="ty-pixels-text">
          <p class="ty-meta">Kanal 5, Stockholm · 2026</p>
          <h3 class="ty-title">Jagad</h3>
          <p class="ty-text">For three nights, a building in central Stockholm became a five-storey, playable arcade game.</p>
        </div>
      </div>`, 'Pixels · the wordmark in pixels of 10')}
    </div>
    <div class="ty-row">
      ${fig(`<div class="ty-art ty-spread ty-light">
        <div class="ty-spread-page">
          <p class="ty-meta">Kungsträdgården, Stockholm · 2025</p>
          <h3 class="ty-title">Vi kommer<br>i fred</h3>
          <p class="ty-text ty-spread-lead">In Kungsträdgården, facing the Royal Castle, a screen pulled everyone who walked past into an alien invasion of Stockholm.</p>
          <div class="ty-folio">${mark('s')}<p class="ty-meta">12</p></div>
        </div>
        <div class="ty-spread-page">
          <div class="ty-spread-cols">
            <div><p class="ty-meta">The launch</p><p class="ty-text">For the launch of TV4's sci-fi drama "Vi kommer i fred", a single-camera totem stood in Kungsträdgården, facing the Royal Castle across the water, and dropped whoever walked by straight into the show's opening scene, a huge alien craft breaking through the clouds over the city.</p></div>
            <div><p class="ty-meta">How it works</p><p class="ty-text">Behind it, the whole invasion ran live in Resolume, mapped onto the live camera feed so anyone who stepped up landed inside the shot. Two versions of the scene, one for day and one for night, swapped on a timer to match the light, and it ran around the clock for two weeks.</p></div>
          </div>
          <div class="ty-folio ty-folio-right"><p class="ty-meta">SMASH · Selected work</p><p class="ty-meta">13</p></div>
        </div>
      </div>`, 'A spread · the S alone')}
    </div>`;

// In use -----------------------------------------------------------------------

const IN_USE = `
    <div class="ty-row">
      ${fig(`<div class="ty-art ty-web ty-shade">
        ${photo(RESONANCE_PHOTO, '50% 40%')}
        <div class="ty-web-bar">${mark('symbol', 'ty-hi')}<p class="ty-meta">hello@smash.studio</p></div>
        <div class="ty-web-hero">
          <div><p class="ty-meta">Uppsala Town Hall · 2024</p><h3 class="ty-title">Resonance</h3></div>
          <p class="ty-text">${RESONANCE}</p>
        </div>
      </div>`, 'Website · a project')}
    </div>
    <div class="ty-row three">
      ${fig(`<div class="ty-art ty-poster ty-shade">
        ${photo('smash-vi-kommer-i-fred.webp', '50% 35%')}
        <div class="ty-poster-top">${mark('symbol', 'ty-hi')}<p class="ty-meta">Kungsträdgården<br>Stockholm</p></div>
        <div class="ty-poster-foot"><h3 class="ty-title">Vi kommer<br>i fred</h3><p class="ty-text">In Kungsträdgården, facing the Royal Castle, a screen pulled everyone who walked past into an alien invasion of Stockholm.</p><p class="ty-meta"><span>2025</span><span>smash.studio</span></p></div>
      </div>`, 'Poster · with a picture')}
      ${fig(`<div class="ty-art ty-poster ty-paper">
        ${mark('wordmark')}
        <div class="ty-poster-foot"><h3 class="ty-title">Heroes</h3><p class="ty-text">Real-life statues, drone-scanned architecture, projected onto Stockholm's Great Synagogue.</p><p class="ty-meta"><span>Great Synagogue, Stockholm</span><span>2022</span></p></div>
      </div>`, 'Poster · the wordmark')}
      ${fig(`<div class="ty-art ty-poster ty-shade">
        ${photo('smash-sala-hjartslag.webp', '50% 45%')}
        <div class="ty-poster-top">${mark('square', 'sq ty-hi')}<p class="ty-meta">City of Sala</p></div>
        <div class="ty-poster-foot"><h3 class="ty-title">Sala<br>Hjärtslag</h3><p class="ty-text">Projection mapping 400 years of Sala's history onto a curved facade.</p><p class="ty-meta"><span>2024</span><span>smash.studio</span></p></div>
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
          ${photo('smash-jagad.webp', '50% 50%')}
          ${mark('symbol', 'ty-hi')}
          <div><h3 class="ty-title">Jagad</h3><p class="ty-text">For three nights, a building in central Stockholm became a five-storey, playable arcade game.</p></div>
        </div>
      </div>`, 'Profile picture and a post')}
    </div>
    <div class="ty-row two">
      ${fig(`<div class="ty-art ty-slide ty-light">
        <div class="ty-slide-top">${mark('symbol')}<p class="ty-meta">04</p></div>
        <div class="ty-slide-body">
          <div><p class="ty-meta">How it works</p><h3 class="ty-title">Resonance</h3></div>
          <p class="ty-text">${HOW}</p>
        </div>
      </div>`, 'Slide')}
      ${fig(`<div class="ty-art ty-end">
        ${mark('wordmark', 'ty-hi')}
        <p class="ty-meta">Immersive experience studio · Stockholm<br>smash.studio</p>
      </div>`, 'Film · end card')}
    </div>`;

export function fig(art, caption, cls = '') {
  return `<figure class="ty-fig ${cls}">${art}<figcaption class="label">${caption}</figcaption></figure>`;
}
const button = (attr, value, label, on, swatch = '') => `<button type="button" data-${attr}="${value}" aria-pressed="${on}">${swatch ? `<i style="background:${swatch}"></i>` : ''}${label}</button>`;

/** Both sections' styles (this one's, and typeface.js's, which borrows its pieces). */
export const STYLE = `
:is(#type, #typeface) {
  --anton: Anton, Impact, "Arial Narrow", sans-serif; --nm: "Neue Montreal", "Helvetica Neue", Arial, sans-serif; --sm: "Season Mix", Georgia, serif;
  --ty-ground: #000; --ty-type: #fff; --ty-accent: #fff; --ty-field: #000; --ty-on-field: #fff; --ty-paper: #fff; --ty-on-paper: #000; --ty-light: #fff; --ty-on-light: #000; --ty-construct: ${PINK};
}
:is(#type, #typeface) .ty-controls { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 28px; font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--dim); }
:is(#type, #typeface) .ty-seg { display: flex; flex-wrap: wrap; gap: 4px; }
:is(#type, #typeface) .ty-seg button { display: inline-flex; align-items: center; gap: 7px; padding: 6px 10px; background: none; color: var(--dim); border: 1px solid var(--line); font: inherit; letter-spacing: inherit; text-transform: inherit; cursor: pointer; }
:is(#type, #typeface) .ty-seg button:hover, :is(#type, #typeface) .ty-seg button[aria-pressed="true"] { color: var(--text); border-color: var(--text); }
:is(#type, #typeface) .ty-seg i { width: 9px; height: 9px; flex: none; }
:is(#type, #typeface) .ty-pdfs { margin: 0; display: flex; gap: 14px; }
:is(#type, #typeface) .ty-pdfs a { color: var(--text); text-decoration: none; border-bottom: 1px solid var(--dim); }
:is(#type, #typeface) .ty-group { margin: calc(var(--gap) * 4) 0 0; }
:is(#type, #typeface) .ty-row { display: grid; gap: var(--gap); margin-top: var(--gap); }
:is(#type, #typeface) .ty-row.two { grid-template-columns: repeat(2, minmax(0, 1fr)); }
:is(#type, #typeface) .ty-row.three { grid-template-columns: repeat(3, minmax(0, 1fr)); }
@media (max-width: 760px) { :is(#type, #typeface) .ty-row.two, :is(#type, #typeface) .ty-row.three { grid-template-columns: 1fr; } }
:is(#type, #typeface) .ty-fig { margin: 0; min-width: 0; }
:is(#type, #typeface) .ty-fig > figcaption { margin-top: 10px; }
:is(#type, #typeface) .ty-fold { margin-top: calc(var(--gap) * 4); }
/* An artwork: what is in it measured in its width (cqw), so it scales as one picture. (Its own padding,
   gaps and tracks are in % instead: cqw there would be the viewport's.) The picture and its shade sit
   under the rest. */
:is(#type, #typeface) .ty-art { position: relative; container-type: inline-size; overflow: hidden; isolation: isolate; background: var(--ty-ground); color: var(--ty-type); }
:is(#type, #typeface) .ty-paper { background: var(--ty-paper); color: var(--ty-on-paper); }
:is(#type, #typeface) .ty-light { background: var(--ty-light); color: var(--ty-on-light); }
:is(#type, #typeface) .ty-field { background: var(--ty-field); color: var(--ty-on-field); }
:is(#type, #typeface) .ty-hi { color: var(--ty-accent); }
:is(#type, #typeface) .ty-stage { background: #5f5f5f; }
:is(#type, #typeface) .ty-photo { position: absolute; inset: 0; z-index: -1; width: 100%; height: 100%; object-fit: cover; display: block; }
:is(#type, #typeface) .ty-shade::after { content: ""; position: absolute; inset: 0; z-index: -1; background: linear-gradient(to top, color-mix(in srgb, var(--ty-ground) 82%, transparent), transparent 60%); }
:is(#type, #typeface) .ty-mk { display: block; }
:is(#type, #typeface) .ty-mk svg { display: block; width: 100%; height: auto; }
:is(#type, #typeface) .ty-title { margin: 0; font: 400 var(--s, 10cqw)/0.92 var(--anton); text-transform: uppercase; }
:is(#type, #typeface) .ty-text { margin: 0; font: 400 1.6cqw/1.4 var(--sm); max-width: 44ch; } /* what tells a project: its lead, its story */
:is(#type, #typeface) .ty-meta { margin: 0; font: 400 1.05cqw/1.2 var(--nm); letter-spacing: 0.06em; text-transform: uppercase; }
:is(#type, #typeface) .ty-anton { font-family: var(--anton); }
:is(#type, #typeface) .ty-nm { font-family: var(--nm); }
:is(#type, #typeface) .ty-sm { font-family: var(--sm); }
:is(#type, #typeface) .ty-sheet-italic { margin: 3cqw 0 0; font-size: 2.2cqw; line-height: 1.2; color: var(--ty-type); }
:is(#type, #typeface) .ty-smash { font-family: "SMASH", var(--anton); font-variation-settings: "wght" 500; }

/* Specimens: a face's sheet (its word with its measures, its characters) and the scale */
:is(#type, #typeface) .ty-sheet { aspect-ratio: 2 / 1; padding: 3.5%; display: flex; flex-direction: column; gap: 3cqw; }
:is(#type, #typeface) .ty-sheet-head { display: grid; grid-template-columns: 1fr 2fr 1.4fr; gap: 3cqw; }
:is(#type, #typeface) .ty-sheet-head .ty-meta { font-size: 1.1cqw; }
:is(#type, #typeface) .ty-sheet-head .ty-meta:first-child { color: var(--ty-accent); }
:is(#type, #typeface) .ty-sheet-head .ty-meta:not(:first-child) { opacity: 0.7; }
:is(#type, #typeface) .ty-sheet-body { flex: 1; display: grid; grid-template-columns: 58fr 42fr; gap: 4cqw; align-items: center; min-height: 0; }
:is(#type, #typeface) .ty-measured { display: block; width: 100%; height: auto; overflow: visible; }
:is(#type, #typeface) .ty-rule { fill: none; stroke: var(--ty-construct); vector-effect: non-scaling-stroke; stroke-width: 1; }
:is(#type, #typeface) .ty-rule-label { fill: var(--ty-construct); font: 400 15px var(--nm); letter-spacing: 0.06em; text-transform: uppercase; }
:is(#type, #typeface) .ty-glyphs { display: grid; grid-template-columns: repeat(var(--cols), minmax(0, 1fr)); border-top: 1px solid color-mix(in srgb, currentColor 22%, transparent); border-left: 1px solid color-mix(in srgb, currentColor 22%, transparent); }
:is(#type, #typeface) .ty-glyphs span { aspect-ratio: 1; display: grid; place-items: center; border-right: 1px solid color-mix(in srgb, currentColor 22%, transparent); border-bottom: 1px solid color-mix(in srgb, currentColor 22%, transparent); font-size: 2.1cqw; line-height: 1; }
:is(#type, #typeface) .ty-glyphs.ty-anton span { font-size: 2.6cqw; }
:is(#type, #typeface) .ty-glyphs.ty-smash span { font-size: 3.9cqw; font-variation-settings: "wght" 500, "wdth" 175; }
:is(#type, #typeface) .ty-axes { padding: 3.5%; display: grid; grid-template-columns: 16fr 28fr 28fr 28fr; column-gap: 3cqw; row-gap: 3.2cqw; align-items: end; }
:is(#type, #typeface) .ty-axes-name { font-size: 1.1cqw; }
:is(#type, #typeface) .ty-axes-name span { opacity: 0.6; }
:is(#type, #typeface) .ty-axes-cell .ty-smash { margin: 0 0 0.9cqw; font-size: 6cqw; line-height: 1; }
:is(#type, #typeface) .ty-axes-cell .ty-meta { font-size: 0.95cqw; opacity: 0.6; }
:is(#type, #typeface) .ty-scale { padding: 3.5%; display: grid; grid-template-columns: 22fr 78fr; column-gap: 3cqw; row-gap: 2.6cqw; align-items: baseline; }
:is(#type, #typeface) .ty-scale-spec { font-size: 0.95cqw; opacity: 0.7; }
:is(#type, #typeface) .ty-scale-spec span { opacity: 0.8; }
:is(#type, #typeface) .ty-scale-label { font-size: 0.83cqw; }
:is(#type, #typeface) .ty-scale-title { --s: 7.2cqw; line-height: 0.97; }
:is(#type, #typeface) .ty-scale-lead { font-size: 3.2cqw; line-height: 1.15; max-width: 28ch; }
:is(#type, #typeface) .ty-scale-text { font-family: var(--nm); font-size: 1.11cqw; line-height: 1.5; max-width: 60ch; }

/* Compositions */
:is(#type, #typeface) .ty-count { justify-content: space-between; }
:is(#type, #typeface) .ty-number { display: block; width: 100%; height: auto; overflow: visible; }
:is(#type, #typeface) .ty-poster.ty-count .ty-title { --s: 9cqw; }
:is(#type, #typeface) .ty-poster.ty-count .ty-text { font-size: 6.2cqw; line-height: 1.12; margin-top: 3cqw; }
:is(#type, #typeface) .ty-poster-foot-row { display: flex; justify-content: space-between; align-items: end; }
:is(#type, #typeface) .ty-poster-foot-row .ty-mk { width: 16cqw; }
:is(#type, #typeface) .ty-squared { justify-content: space-between; }
:is(#type, #typeface) .ty-squared > .ty-mk { width: 100%; }
:is(#type, #typeface) .ty-squared-foot { display: flex; justify-content: space-between; align-items: end; gap: 4cqw; }
:is(#type, #typeface) .ty-poster.ty-squared .ty-title { --s: 11.4cqw; }
:is(#type, #typeface) .ty-squared .ty-meta { text-align: right; }
:is(#type, #typeface) .ty-leadpiece { aspect-ratio: 16 / 9; padding: 5%; display: flex; flex-direction: column; justify-content: space-between; }
:is(#type, #typeface) .ty-leadpiece-top { display: flex; justify-content: space-between; align-items: baseline; }
:is(#type, #typeface) .ty-leadpiece-top .ty-title { --s: 4.4cqw; }
:is(#type, #typeface) .ty-leadpiece .ty-meta { font-size: 1.3cqw; }
:is(#type, #typeface) .ty-leadpiece-lead { font-size: 5.4cqw; line-height: 1.08; max-width: none; }
:is(#type, #typeface) .ty-leadpiece-foot { display: flex; justify-content: space-between; align-items: end; }
:is(#type, #typeface) .ty-leadpiece-foot .ty-mk { width: 20cqw; }
:is(#type, #typeface) .ty-pixels { aspect-ratio: 16 / 9; }
:is(#type, #typeface) .ty-pixels-mark { position: absolute; width: 74cqw; left: 45cqw; top: 7cqw; }
:is(#type, #typeface) .ty-pixels-text { position: absolute; left: 5cqw; bottom: 5cqw; width: 34cqw; }
:is(#type, #typeface) .ty-pixels .ty-title { --s: 12cqw; margin: 1.4cqw 0 2cqw; }
:is(#type, #typeface) .ty-pixels .ty-text { font-size: 2.1cqw; line-height: 1.2; }
:is(#type, #typeface) .ty-pixels .ty-meta { font-size: 1.3cqw; }
:is(#type, #typeface) .ty-spread { aspect-ratio: 2 / 1; display: grid; grid-template-columns: 1fr 1fr; }
:is(#type, #typeface) .ty-spread-page { position: relative; padding: 7% 7% 5%; display: flex; flex-direction: column; justify-content: space-between; }
:is(#type, #typeface) .ty-spread-page + .ty-spread-page { border-left: 1px solid color-mix(in srgb, currentColor 18%, transparent); }
:is(#type, #typeface) .ty-spread .ty-title { --s: 8.6cqw; margin: 1.6cqw 0 2.4cqw; }
:is(#type, #typeface) .ty-spread .ty-meta { font-size: 0.95cqw; }
:is(#type, #typeface) .ty-spread-lead { font-size: 2.3cqw; line-height: 1.15; max-width: 22ch; }
:is(#type, #typeface) .ty-spread-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 2.6cqw; }
:is(#type, #typeface) .ty-spread-cols .ty-text { font-size: 1.12cqw; line-height: 1.5; margin-top: 1cqw; }
:is(#type, #typeface) .ty-folio { display: flex; align-items: end; gap: 1.4cqw; }
:is(#type, #typeface) .ty-folio .ty-mk { width: 2.2cqw; }
:is(#type, #typeface) .ty-folio-right { justify-content: space-between; }

/* In use: a project's page on the site */
:is(#type, #typeface) .ty-web { aspect-ratio: 16 / 9; }
:is(#type, #typeface) .ty-web-bar { position: absolute; top: 3cqw; left: 3cqw; right: 3cqw; display: flex; justify-content: space-between; align-items: center; }
:is(#type, #typeface) .ty-web-bar .ty-mk { width: 5.4cqw; }
:is(#type, #typeface) .ty-web-hero { position: absolute; left: 3cqw; right: 3cqw; bottom: 3cqw; display: grid; grid-template-columns: minmax(0, 1fr) 32cqw; align-items: end; gap: 3cqw; }
:is(#type, #typeface) .ty-web-hero .ty-title { --s: 14cqw; margin-bottom: -1.1cqw; }
:is(#type, #typeface) .ty-web-hero .ty-text { font-size: 1.9cqw; line-height: 1.2; }
:is(#type, #typeface) .ty-web .ty-meta { font-size: 1.2cqw; }
:is(#type, #typeface) .ty-web-hero .ty-meta { margin-bottom: 1.2cqw; }

/* Posters, A-sized */
:is(#type, #typeface) .ty-poster { aspect-ratio: 1 / 1.4142; padding: 7%; display: flex; flex-direction: column; justify-content: space-between; }
:is(#type, #typeface) .ty-poster .ty-title { --s: 19cqw; }
:is(#type, #typeface) .ty-poster .ty-text { font-size: 4.4cqw; line-height: 1.25; margin-top: 4cqw; }
:is(#type, #typeface) .ty-poster .ty-meta { font-size: 3cqw; }
:is(#type, #typeface) .ty-poster-top { display: flex; justify-content: space-between; align-items: start; gap: 4cqw; }
:is(#type, #typeface) .ty-poster-top .ty-mk { width: 22cqw; }
:is(#type, #typeface) .ty-poster-top .ty-mk.sq { width: 14cqw; }
:is(#type, #typeface) .ty-poster-top .ty-meta { text-align: right; }
:is(#type, #typeface) .ty-poster-foot .ty-meta { margin-top: 5cqw; display: flex; justify-content: space-between; }

/* Business cards, 85 × 55, on a grey table */
:is(#type, #typeface) .ty-cards { aspect-ratio: 16 / 9; display: flex; align-items: center; justify-content: center; gap: 4%; }
:is(#type, #typeface) .ty-card { width: 42cqw; aspect-ratio: 85 / 55; position: relative; box-shadow: 0 0.6cqw 2cqw rgba(0, 0, 0, 0.35); }
:is(#type, #typeface) .ty-card-front { display: grid; place-items: center; }
:is(#type, #typeface) .ty-card-front .ty-mk { width: 10cqw; }
:is(#type, #typeface) .ty-card-back { padding: 2.8cqw; display: flex; flex-direction: column; justify-content: space-between; }
:is(#type, #typeface) .ty-card-back .ty-mk { width: 7cqw; }
:is(#type, #typeface) .ty-card-name { margin: 0; font: 400 2.4cqw/1.15 var(--nm); }
:is(#type, #typeface) .ty-card-lines { margin: 0.4cqw 0 0; font: 400 1.6cqw/1.4 var(--nm); }
:is(#type, #typeface) .ty-card-back .ty-meta { font-size: 1.15cqw; }

/* A profile picture at three sizes, and a post */
:is(#type, #typeface) .ty-social { aspect-ratio: 16 / 9; display: grid; grid-template-columns: auto 46%; align-items: center; justify-content: center; column-gap: 7%; }
:is(#type, #typeface) .ty-avatars { display: flex; align-items: end; gap: 2.4cqw; }
:is(#type, #typeface) .ty-avatar { border-radius: 50%; display: grid; place-items: center; }
:is(#type, #typeface) .ty-avatar .ty-mk { width: 56%; }
:is(#type, #typeface) .ty-post { aspect-ratio: 1; padding: 7%; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 0.6cqw 2cqw rgba(0, 0, 0, 0.35); }
:is(#type, #typeface) .ty-post .ty-mk { width: 16cqw; }
:is(#type, #typeface) .ty-post .ty-title { --s: 17cqw; }
:is(#type, #typeface) .ty-post .ty-text { font-size: 3.9cqw; line-height: 1.25; margin-top: 3cqw; }

/* A slide, and a film's end card */
:is(#type, #typeface) .ty-slide { aspect-ratio: 16 / 9; padding: 4%; display: flex; flex-direction: column; justify-content: space-between; }
:is(#type, #typeface) .ty-slide-top { display: flex; justify-content: space-between; align-items: start; }
:is(#type, #typeface) .ty-slide-top .ty-mk { width: 7cqw; }
:is(#type, #typeface) .ty-slide .ty-meta { font-size: 1.4cqw; }
:is(#type, #typeface) .ty-slide-body { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 4cqw; align-items: end; }
:is(#type, #typeface) .ty-slide-body .ty-meta { margin-bottom: 1.4cqw; }
:is(#type, #typeface) .ty-slide-body .ty-title { --s: 9cqw; }
:is(#type, #typeface) .ty-slide .ty-text { font-size: 2cqw; line-height: 1.25; }
:is(#type, #typeface) .ty-end { aspect-ratio: 16 / 9; display: grid; place-items: center; align-content: center; }
:is(#type, #typeface) .ty-end .ty-mk { width: 22cqw; }
:is(#type, #typeface) .ty-end .ty-meta { margin-top: 3.4cqw; font-size: 1.45cqw; line-height: 1.5; opacity: 0.8; text-align: center; }
`;

export const HTML = `
  <section class="lab" id="type">
    <style>${STYLE}</style>
    <header class="ch-head">
      <p class="ch-n">00 · type</p>
      <h2 class="ch-name">Typography</h2>
    </header>
    <div class="ty-controls">
      <div class="ty-seg" role="group" aria-label="Colour">${TREATMENTS.map((t, i) => button('treat', t, i ? ACCENTS[i - 1].name : 'Black and white', i === 0, i ? ACCENTS[i - 1].steps[0] : '')).join('')}</div>
      
      <p class="ty-pdfs">PDF ${PDFS.map((t) => `<a href="${pdfURL(t)}" target="_blank" rel="noopener">${t}</a>`).join('')}</p>
    </div>
    <p class="label ty-group">Specimens</p>
    ${SPECIMENS}
    <p class="label ty-group">Compositions</p>
    ${COMPOSITIONS}
    <details class="fold ty-fold"><summary class="fold-head"><span class="fold-name">In use: a project's page, posters, cards, a post, a slide, an end card</span><span class="fold-state"></span></summary>
    ${IN_USE}
    </details>
  </section>`;

function load() {
  try { return { treat: JSON.parse(localStorage.getItem(STORE) || '{}').treat ?? 'black and white' }; } catch { return { treat: 'black and white' }; }
}

/**
 * The colour switch, and the marks following the Pixel switch. Returns the
 * usual tool, plus set({ treat }) for scripts (identity-samples.py).
 */
export function mount(section) {
  const state = load();
  const apply = () => {
    for (const [k, v] of Object.entries(treatment(state.treat))) section.style.setProperty(`--ty-${k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`, v);
    for (const b of section.querySelectorAll('[data-treat]')) b.setAttribute('aria-pressed', String(b.dataset.treat === state.treat));
    try { localStorage.setItem(STORE, JSON.stringify(state)); } catch {}
  };
  const onClick = (e) => {
    const b = e.target.closest('[data-treat]');
    if (!b) return;
    state.treat = b.dataset.treat;
    apply();
  };
  section.addEventListener('click', onClick);
  const draw = () => {
    const pixel = Number(document.body.dataset.pixel) || 0;
    for (const el of section.querySelectorAll('.ty-mk[data-mk]')) if (el.dataset.mk !== 'modular' && !el.dataset.mk.includes(':')) el.innerHTML = markSVG(el.dataset.mk, pixel);
  };
  if (Number(document.body.dataset.pixel)) draw();
  document.addEventListener('identity-pixel', draw);
  apply();
  return {
    ready: Promise.resolve(),
    set({ treat = state.treat } = {}) { state.treat = treat; apply(); },
    pause() {},
    resume() {},
    destroy() { section.removeEventListener('click', onClick); document.removeEventListener('identity-pixel', draw); },
  };
}
