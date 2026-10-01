// The SMASH typeface: SMASH's own, drawn from the mark (web/src/typeface/, the
// site's /typeface/), for very special occasions (Jonas, 2026-10-01: "i think
// the smash typeface is mostly for very special occassions we wont use it
// primiarly", "but i thought the smash typeface could have a section on the
// page"). A line to set in it with its five axes, as /typeface/ has them; its
// specimen; its axes at their least, the mark's and their most; and three
// occasions: the wordmark beside SMASH typed in the face (the face is the
// mark's letters), a number at its widest, a name at its tallest. The pieces
// and their styles are the Typography section's (type.js).

import * as original from './directions/original.js';
import { STYLE as TYPE_STYLE, sheet, fig, mark, settings, SMASH_DEFAULTS, AXES, METRICS, CAPS, FIGURES, MARKS_, f } from './type.js';

// Words set to a measure, their advance widths per em (read from the font with fontTools).
const WIDTHS = {
  'SMASH at its defaults': 0.847,
  '400 at its widest': 0.807, // width 175
  'JAGAD at its widest': 1.345, // width 175 (and height 720: the letters 1.07 em tall)
};

/** The wordmark, and SMASH typed in the face at its defaults, as tall: one drawing, two ways. */
function typed() {
  const d = original.wordmark().match(/ d="([^"]+)"/)[1];
  const size = 472 / METRICS.smash.cap; // letters as tall as the block
  const x = 552 + 104; // two pitches on
  const w = x + WIDTHS['SMASH at its defaults'] * size;
  return `<svg class="tf-typed" viewBox="-104 -104 ${f(w + 208)} ${472 + 208}" aria-label="The wordmark, and SMASH typed in the face">`
    + `<path d="${d}" fill="currentColor" fill-rule="evenodd"/>`
    + `<text x="${x}" y="472" font-family="SMASH" font-size="${f(size)}" style="font-variation-settings:${settings(SMASH_DEFAULTS)}" fill="currentColor">SMASH</text>`
    + `<text class="tf-svg-label" x="0" y="532">The wordmark</text><text class="tf-svg-label" x="${x}" y="532">SMASH, typed in the face at its defaults</text></svg>`;
}

/** A word as wide as the measure (860 of 1000) at the given axes; its letters as tall as the height axis makes them. */
function fitted(word, key, axes) {
  const size = 860 / WIDTHS[key];
  const tall = (METRICS.smash.cap * (axes.HGHT ?? SMASH_DEFAULTS.HGHT)) / SMASH_DEFAULTS.HGHT * size;
  return `<svg class="ty-number" viewBox="0 0 860 ${f(tall)}" aria-label="${word}"><text x="0" y="${f(tall)}" font-family="SMASH" font-size="${f(size)}" style="font-variation-settings:${settings({ ...SMASH_DEFAULTS, ...axes })}" textLength="860" lengthAdjust="spacing" fill="currentColor">${word}</text></svg>`;
}

const AXES_HTML = `<div class="ty-art ty-axes">${AXES.map(([name, tag, vals]) => `
        <p class="ty-meta ty-axes-name">${name}<br><span>${tag} · ${vals[0]} to ${vals.at(-1)}</span></p>
        ${vals.map((v) => `<div class="ty-axes-cell"><p class="ty-smash ty-hi" style="font-variation-settings:${settings({ ...SMASH_DEFAULTS, [tag]: v })}">Stockholm</p><p class="ty-meta">${v}${v === SMASH_DEFAULTS[tag] ? ' · the mark' : ''}</p></div>`).join('')}`).join('')}
      </div>`;

const STYLE = `
#typeface { --wght: 500; --wdth: 100; --CRSB: 50; --ROND: 100; --HGHT: 471; }
#typeface .tf-tester { display: grid; gap: calc(var(--gap) * 2); margin-bottom: calc(var(--gap) * 3); }
#typeface .tf-axes { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)) auto; gap: 14px 28px; align-items: end; }
@media (max-width: 760px) { #typeface .tf-axes { grid-template-columns: 1fr 1fr; } }
#typeface .tf-axis { display: grid; grid-template-columns: 1fr auto; gap: 8px 10px; font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--dim); }
#typeface .tf-axis input { grid-column: 1 / -1; width: 100%; margin: 0; accent-color: #fff; }
#typeface .tf-axis output { color: var(--text); font-variant-numeric: tabular-nums; }
#typeface .tf-reset { padding: 6px 12px; background: none; color: var(--dim); border: 1px solid var(--line); font: 400 12px/1 "Neue Montreal", "Helvetica Neue", Arial, sans-serif; letter-spacing: 0.06em; text-transform: uppercase; cursor: pointer; }
#typeface .tf-reset:hover { color: var(--text); border-color: var(--text); }
#typeface .tf-sample {
  margin: 0; outline: none; overflow-wrap: anywhere; font-family: "SMASH"; font-size: clamp(64px, 12vw, 200px);
  line-height: calc(var(--HGHT) * 0.7em / 471 + 0.18em); /* as tall as the height axis makes the letters */
  font-variation-settings: "wght" var(--wght), "wdth" var(--wdth), "CRSB" var(--CRSB), "ROND" var(--ROND), "HGHT" var(--HGHT);
}
#typeface .tf-alts { display: flex; flex-wrap: wrap; align-items: end; gap: 12px 48px; color: var(--dim); font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; }
#typeface .tf-alts span { display: block; margin-top: 8px; color: var(--text); font-family: "SMASH"; font-size: clamp(40px, 5vw, 80px); line-height: 1; letter-spacing: 0.1em; font-variation-settings: "wght" 500; }
#typeface .tf-alts .ss01 { font-feature-settings: "ss01"; }
#typeface .tf-alts a { display: block; margin-top: 10px; color: var(--text); text-decoration: none; border-bottom: 1px solid var(--dim); width: max-content; }
#typeface .tf-typed-art { aspect-ratio: auto; padding: 4% 5%; }
#typeface .tf-typed { display: block; width: 100%; height: auto; overflow: visible; }
#typeface .tf-svg-label { font: 400 17px "Neue Montreal", "Helvetica Neue", Arial, sans-serif; letter-spacing: 0.06em; text-transform: uppercase; fill: currentColor; opacity: 0.6; }
#typeface .ty-poster.tf-occasion .ty-title { --s: 9cqw; }
#typeface .ty-poster.tf-occasion .ty-text { font-size: 6.2cqw; line-height: 1.12; margin-top: 3cqw; }
`;

export const HTML = `
  <section class="lab" id="typeface">
    <style>${TYPE_STYLE}${STYLE}</style>
    <header class="ch-head">
      <h2 class="ch-name">The SMASH typeface</h2>
    </header>
    <div class="tf-tester">
      <div class="tf-axes">
        ${AXES.map(([name, tag, vals]) => `<label class="tf-axis"><span>${name}</span><output>${SMASH_DEFAULTS[tag]}</output><input type="range" data-axis="${tag}" min="${vals[0]}" max="${vals.at(-1)}" step="1" value="${SMASH_DEFAULTS[tag]}"></label>`).join('')}
        <button type="button" class="tf-reset">The mark's</button>
      </div>
      <p class="tf-sample" contenteditable="true" spellcheck="false" aria-label="Type to try the typeface">Immersive experience studio</p>
      <div class="tf-alts"><p>Its letters<span>RKVXY</span></p><p>Stylistic set 1<span class="ss01">RKVXY</span></p><p>The font, its Glyphs file, its sources<a href="/typeface/">smash.jonasjohansson.se/typeface</a></p></div>
    </div>
    <div class="ty-row">
      ${fig(sheet({
        name: 'SMASH', face: 'smash', word: 'Resonance', cols: 7,
        measure: { lines: ['cap', 'base', 'desc'], labels: { cap: 'Cap height 700 · one case' }, settings: settings(SMASH_DEFAULTS) },
        by: 'Our own, drawn from the mark · variable: weight, width, crossbar, roundness, height · version 0.000',
        role: 'For very special occasions · always in capitals · its defaults the mark\'s',
        set: CAPS + FIGURES + MARKS_,
      }), 'Specimen · the SMASH typeface at its defaults')}
    </div>
    <div class="ty-row">
      ${fig(AXES_HTML, 'Its five axes: each at its least, the mark\'s and its most')}
    </div>
    <p class="label ty-group">Occasions</p>
    <div class="ty-row">
      ${fig(`<div class="ty-art tf-typed-art">${typed()}</div>`, 'The typeface is the mark\'s letters')}
    </div>
    <div class="ty-row two">
      ${fig(`<div class="ty-art ty-poster tf-occasion">
        ${fitted('400', '400 at its widest', { wdth: 175 })}
        <div><h3 class="ty-title">Sala Hjärtslag</h3><p class="ty-text">Projection mapping 400 years of Sala's history onto a curved facade.</p></div>
        <div class="ty-poster-foot-row"><p class="ty-meta">City of Sala<br>2024</p>${mark('side', 'ty-hi')}</div>
      </div>`, 'A number, at its widest · the S on its side')}
      ${fig(`<div class="ty-art ty-poster tf-occasion">
        <div class="ty-poster-top">${mark('symbol', 'ty-hi')}<p class="ty-meta">Kanal 5<br>Stockholm</p></div>
        ${fitted('JAGAD', 'JAGAD at its widest', { wdth: 175, HGHT: 720 })}
        <div><p class="ty-text">For three nights, a building in central Stockholm became a five-storey, playable arcade game.</p><p class="ty-meta" style="margin-top:5cqw">2026</p></div>
      </div>`, 'A name, at its widest and tallest · the S M')}
    </div>
  </section>`;

/** The sliders set the tester's axes; the marks follow the page's Pixel switch. */
export function mount(section) {
  const inputs = [...section.querySelectorAll('[data-axis]')];
  const set = (input) => {
    section.style.setProperty(`--${input.dataset.axis}`, input.value);
    input.previousElementSibling.value = input.value;
  };
  const onInput = (e) => { if (e.target.dataset?.axis) set(e.target); };
  const reset = () => { for (const input of inputs) { input.value = input.defaultValue; set(input); } };
  section.addEventListener('input', onInput);
  section.querySelector('.tf-reset').addEventListener('click', reset);
  const draw = () => {
    const pixel = Number(document.body.dataset.pixel) || 0;
    for (const el of section.querySelectorAll('.ty-mk[data-mk]')) el.innerHTML = original[{ symbol: 'symbol', side: 'sTurned' }[el.dataset.mk]]({ pixel });
  };
  if (Number(document.body.dataset.pixel)) draw();
  document.addEventListener('identity-pixel', draw);
  return {
    ready: document.fonts.load('100px SMASH').then(() => true, () => true),
    pause() {},
    resume() {},
    destroy() { section.removeEventListener('input', onInput); document.removeEventListener('identity-pixel', draw); },
  };
}
