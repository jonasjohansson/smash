// Colour: hyper colours, raised, on a grounded, earthed ground. The seven
// accents, each with three darker steps (the colour's hue kept, its lightness
// taken to 80, 62 and 44 % of the base in OKLCH, as much chroma kept as a
// screen can show), the earth they sit on (the brown ground, black, the type),
// the marks in black and white, the dark steps as grounds under white, and
// the original, the modular and the S M in every accent. Every swatch carries its hex and its WCAG contrast: white
// and black type on it, and it on the brown ground; the figures are worked out
// here from the hex, not written in. The page is otherwise black and white;
// this is the one place with colour.

import { letters, REST, W, H } from './directions/original/geometry.js';
import { markSVG, MODULAR_DEFAULTS } from './modular.js';
import * as original from './directions/original.js';
import { placed, BANDS, BANDS5 } from './grid.js';

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
// The earth the hyper colours sit on: the warm brown ground, black, and the type.
export const EARTH = [
  { name: 'Ground', hex: '#1f1915' },
  { name: 'Black', hex: '#000000' },
  { name: 'Type', hex: '#f3efe8' },
];
const STEPS = ['Base', 'Dark 1', 'Dark 2', 'Dark 3'];
const GROUND = '#1f1915';
const TYPE = '#f3efe8';
const BLACK = '#000000';
const WHITE = '#ffffff';

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

// The marks, each in currentColor: the original, the modular mark and the S M symbol.
let masks = 0;
const MARK = letters(REST);
export const MARKS = [
  { name: 'Original', bands: BANDS, svg: () => `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="${MARK}"/></svg>` },
  { name: 'Modular', bands: BANDS5, svg: () => markSVG(MODULAR_DEFAULTS, 4, 'currentColor', `col-m${masks++}`) },
  { name: 'S M', bands: BANDS5, svg: () => original.symbol() },
];

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

/**
 * A mark (from MARKS) in fill on ground, labelled with its contrast, on the
 * page's grid (grid.js): three across, a row high at the page's scale; seven
 * across (small), half a row at a quarter of it.
 */
function panel(m, ground, fill, label, small = false) {
  const sheet = placed(m.svg(), m.bands, small ? { k: 0.25, rows: 0.5 } : {}).replace('<svg class="placed"', `<svg class="placed" style="color:${fill}"`);
  return `<figure class="gpanel col-panel${small ? ' half' : ''}" style="background:${ground};color:${typeOn(ground)}">${sheet}<figcaption class="label">${label} · ${fmt(contrast(fill, ground))}</figcaption></figure>`;
}
/** Ground or type, whichever the accent takes (the ground on the light ones). */
const onAccent = (hex) => (typeOn(hex) === BLACK ? GROUND : TYPE);
const row = (cells, cls = '') => `<div class="col-use ${cls}">${cells.join('')}</div>`;
const group = (name) => `<p class="label col-group">${name}</p>`;

const STYLE = `
#colour .col-ramp { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); }
#colour .col-earth { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; box-shadow: inset 0 0 0 1px var(--line); }
#colour .col-group { margin: calc(var(--gap) * 3) 0 var(--gap); }
#colour .col-group:first-of-type { margin-top: 0; }
#colour .col-swatch { position: relative; aspect-ratio: 3 / 2; display: flex; align-items: flex-end; padding: 12px; }
#colour .col-earth .col-swatch { aspect-ratio: 3 / 1; }
#colour .col-swatch figcaption { display: grid; gap: 2px; font-size: 13px; line-height: 1.3; }
#colour .col-name { font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; }
#colour .col-hex { font: 15px/1.3 ui-monospace, Menlo, monospace; }
#colour .col-ratio { font: 11px/1.3 ui-monospace, Menlo, monospace; opacity: 0.7; }
#colour .col-use { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: var(--gap); margin-top: var(--gap); }
#colour .col-use.three { grid-template-columns: repeat(3, minmax(0, 1fr)); }
#colour .gpanel.half { height: calc(var(--row, 360px) / 2); }
#colour .col-panel .label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; right: var(--m, 12px); }
@media (max-width: 1100px) { #colour .col-use { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
@media (max-width: 900px) { #colour .col-ramp, #colour .col-use, #colour .col-use.three { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
`;

// Hyper colours, raised, on a grounded, earthed ground (Jonas, 2026-09-30):
// the seven accents, then the earth they sit on, the marks in black and white,
// and every mark in every accent.
export const HTML = `
  <section class="lab" id="colour">
    <style>${STYLE}</style>
    <header class="ch-head">
      <p class="ch-n">00 · colour</p>
      <h2 class="ch-name">Colour</h2>
    </header>
    ${group('Hyper')}
    ${ACCENTS.map((a) => `
    <div class="col-ramp">${a.steps.map((hex, i) => swatch(`${a.name}${i ? ` · ${STEPS[i]}` : ''}`, hex)).join('')}</div>`).join('')}
    ${group('Earth')}
    <div class="col-ramp col-earth">${EARTH.map((s) => swatch(s.name, s.hex)).join('')}</div>
    ${group('Black and white: white on black, black on white, type on the ground')}
    ${row(MARKS.map((m) => panel(m, BLACK, WHITE, m.name)), 'three')}
    ${row(MARKS.map((m) => panel(m, WHITE, BLACK, m.name)), 'three')}
    ${row(MARKS.map((m) => panel(m, GROUND, TYPE, m.name)), 'three')}
    ${group('The dark steps as grounds, white on top: Dark 1, Dark 2, Dark 3')}
    ${[1, 2, 3].map((i) => row(ACCENTS.map((a) => panel(MARKS[0], a.steps[i], WHITE, `${a.name} · ${STEPS[i]}`, true)))).join('')}
    ${MARKS.map((m) => `
    ${group(`${m.name} in colour: on the ground${m.name === 'Original' ? ', on its Dark 3' : ''}, and ground or type on it`)}
    ${row(ACCENTS.map((a) => panel(m, GROUND, a.steps[0], a.name, true)))}
    ${m.name === 'Original' ? row(ACCENTS.map((a) => panel(m, a.steps[3], a.steps[0], a.name, true))) : ''}
    ${row(ACCENTS.map((a) => panel(m, a.steps[0], onAccent(a.steps[0]), a.name, true)))}`).join('')}
  </section>`;

/** Nothing moves here (the style comes with the section's HTML). */
export function mount() {
  return { ready: Promise.resolve(), pause() {}, resume() {}, destroy() {} };
}
