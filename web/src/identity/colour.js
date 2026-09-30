// Colour: the seven accents, each with three darker steps (the colour's hue
// kept, its lightness taken to 80, 62 and 44 % of the base in OKLCH, as much
// chroma kept as a screen can show), the site's own colours beside them, and
// the mark in each. Every swatch carries its hex and its WCAG contrast: white
// and black type on it, and it on the brown ground; the figures are worked out
// here from the hex, not written in. The page is otherwise black and white;
// this is the one place with colour.

import { letters, REST, W, H } from './directions/original/geometry.js';

// Round the colour wheel. Yellow is the site's own (SMASH yellow); Orange sits
// half way between it and Red (hue 45°), Pink half way between Red and Violet
// (346°), both at full strength like the others.
export const ACCENTS = [
  { name: 'Acid', steps: ['#ccff00', '#97bd02', '#6a8604', '#405200'] },
  { name: 'Yellow', steps: ['#f7be04', '#b88c00', '#826200', '#503b00'] },
  { name: 'Orange', steps: ['#ff6a00', '#be4d00', '#863400', '#531d00'] },
  { name: 'Red', steps: ['#ff002b', '#bd021e', '#860112', '#520107'] },
  { name: 'Pink', steps: ['#ff29b8', '#c20089', '#890060', '#55003a'] },
  { name: 'Violet', steps: ['#ab00ff', '#7e00bd', '#580086', '#340052'] },
  { name: 'Sky', steps: ['#00bdff', '#068cbd', '#046285', '#023b52'] },
];
export const SITE = [
  { name: 'Ground', hex: '#1f1915' },
  { name: 'Type', hex: '#f3efe8' },
];
const STEPS = ['Base', 'Dark 1', 'Dark 2', 'Dark 3'];
const GROUND = '#1f1915';
const TYPE = '#f3efe8';

/** WCAG relative luminance of a hex colour. */
export function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
/** WCAG contrast ratio between two hex colours. */
export function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}
const fmt = (n) => n.toFixed(1);
/** White or black, whichever reads better on hex. */
const typeOn = (hex) => (contrast(hex, '#ffffff') >= contrast(hex, '#000000') ? '#ffffff' : '#000000');

const MARK = letters(REST);
const mark = (fill) => `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true"><path fill="${fill}" fill-rule="evenodd" d="${MARK}"/></svg>`;

function swatch(name, hex) {
  const t = typeOn(hex);
  return `
    <figure class="col-swatch" style="background:${hex};color:${t}">
      <figcaption>
        <span class="col-name">${name}</span>
        <span class="col-hex">${hex}</span>
        <span class="col-ratio" title="Contrast: white type on it, black type on it, it on the brown ground">W ${fmt(contrast(hex, '#ffffff'))} · B ${fmt(contrast(hex, '#000000'))} · on ground ${fmt(contrast(hex, GROUND))}</span>
      </figcaption>
    </figure>`;
}

function panel(ground, fill, label) {
  return `<figure class="panel col-panel" style="background:${ground};color:${typeOn(ground)}"><div class="col-mark">${mark(fill)}</div><figcaption class="label">${label} · ${fmt(contrast(fill, ground))}</figcaption></figure>`;
}

const STYLE = `
#colour .col-ramp { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); }
#colour .col-site { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; margin-top: var(--gap); box-shadow: inset 0 0 0 1px var(--line); }
#colour .col-swatch { position: relative; aspect-ratio: 3 / 2; display: flex; align-items: flex-end; padding: 12px; }
#colour .col-site .col-swatch { aspect-ratio: 4 / 1; }
#colour .col-swatch figcaption { display: grid; gap: 2px; font-size: 13px; line-height: 1.3; }
#colour .col-name { font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; }
#colour .col-hex { font: 15px/1.3 ui-monospace, Menlo, monospace; }
#colour .col-ratio { font: 11px/1.3 ui-monospace, Menlo, monospace; opacity: 0.7; }
#colour .col-use { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: var(--gap); margin-top: var(--gap); }
#colour .col-panel { aspect-ratio: 1; }
#colour .col-mark { width: 100%; height: 100%; padding: 24%; display: grid; place-items: center; }
#colour .col-mark svg { width: 100%; height: 100%; display: block; }
@media (max-width: 1100px) { #colour .col-use { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
@media (max-width: 900px) { #colour .col-ramp, #colour .col-use { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
`;

export const HTML = `
  <section class="lab" id="colour">
    <style>${STYLE}</style>
    <header class="ch-head">
      <p class="ch-n">00 · colour</p>
      <h2 class="ch-name">Colour</h2>
    </header>
    ${ACCENTS.map((a) => `
    <div class="col-ramp">${a.steps.map((hex, i) => swatch(`${a.name}${i ? ` · ${STEPS[i]}` : ''}`, hex)).join('')}</div>`).join('')}
    <div class="col-ramp col-site">${SITE.map((s) => swatch(s.name, s.hex)).join('')}</div>
    <div class="col-use">${ACCENTS.map((a) => panel(GROUND, a.steps[0], 'on the ground')).join('')}</div>
    <div class="col-use">${ACCENTS.map((a) => panel(a.steps[3], a.steps[0], 'on Dark 3')).join('')}</div>
    <div class="col-use">${ACCENTS.map((a) => panel(a.steps[0], typeOn(a.steps[0]) === '#000000' ? GROUND : TYPE, typeOn(a.steps[0]) === '#000000' ? 'Ground on it' : 'Type on it')).join('')}</div>
  </section>`;


/** Nothing moves here (the style comes with the section's HTML). */
export function mount() {
  return { ready: Promise.resolve(), pause() {}, resume() {}, destroy() {} };
}
