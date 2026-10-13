// The kit (Jonas, 2026-10-14, after CM.SUPPLY's mockups: "what would be the best way for us to prepare a
// communication kit"): what the studio hands out and sends, drawn here at its real size, from the same marks.
// First the business cards, 85 × 55 mm: one front, a back for each of the team (Ashley Reed, Veronica Reed,
// Emile Pascoe), in black and white or an accent, as the Typography section's switch. Then the email
// signatures, which copy as HTML to paste into a mail client's settings.
// web/scripts/identity-kit.py prints the cards as PDFs, at 85 × 55 mm with 3 mm of bleed, ready for a printer.

import * as original from './directions/original.js';
import { ACCENTS } from './colour.js';
import { treatment } from './type.js';

const STORE = 'smash-identity-kit';
const SITE = 'smash.studio';
// The signature's S M, a picture an email can show (mail clients drop SVG): served by the site, where a direct
// link to a file skips the site's password. To move to smash.studio with the site.
const SIGNATURE_MARK = 'https://smash.jonasjohansson.se/identity/kit/smash-sm.png';
const HERE = new URL('./kit/smash-sm.png', import.meta.url).href; // the same picture, from this server, on the page

export const TEAM = [
  { name: 'Ashley Reed', email: 'ash@smash.studio' },
  { name: 'Veronica Reed', email: 'veronica@smash.studio' },
  { name: 'Emile Pascoe', email: 'emile@smash.studio' },
];
const TREATMENTS = ['black and white', ...ACCENTS.map((a) => a.name.toLowerCase())];
const esc = (s = '') => String(s).replace(/[<&"]/g, (c) => ({ '<': '&lt;', '&': '&amp;', '"': '&quot;' })[c]);

/** A card's two sides. Everything on a card is measured in its millimetres (--mm), so it scales as one. */
const front = () => `<div class="kit-card kit-field" data-card="front"><div class="kit-face kit-front">${original.wordmark()}</div></div>`;
const back = (p) => `<div class="kit-card kit-light" data-card="${esc(p.email)}"><div class="kit-face kit-back">
  <span class="kit-sym">${original.symbol()}</span>
  <div class="kit-who"><p class="kit-name">${esc(p.name)}</p><p class="kit-line">${esc(p.email)}</p></div>
  <p class="kit-line kit-site">${SITE}</p>
</div></div>`;

/** A signature as mail clients take it: a table, inline styles, a picture by its address. */
export function signature(p, mark = SIGNATURE_MARK) {
  const font = 'font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:18px;color:#000000;';
  const link = 'color:#000000;text-decoration:none;';
  return `<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;${font}"><tr>`
    + `<td style="padding:2px 14px 0 0;vertical-align:top;"><img src="${mark}" width="48" height="27" alt="SMASH" style="display:block;border:0;"></td>`
    + `<td style="vertical-align:top;${font}">${esc(p.name)}<br>`
    + `<a href="mailto:${esc(p.email)}" style="${link}">${esc(p.email)}</a><br>`
    + `<a href="https://${SITE}" style="${link}">${SITE}</a></td>`
    + '</tr></table>';
}

const STYLE = `
#kit { --kit-field: #000; --kit-on-field: #fff; --kit-light: #fff; --kit-on-light: #000; }
#kit .kit-controls { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 28px; font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--dim); }
#kit .kit-seg { display: flex; flex-wrap: wrap; gap: 4px; }
#kit .kit-seg button, #kit .kit-copy { display: inline-flex; align-items: center; gap: 7px; padding: 6px 10px; background: none; color: var(--dim); border: 1px solid var(--line); font: inherit; font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; cursor: pointer; }
#kit .kit-seg button:hover, #kit .kit-seg button[aria-pressed="true"], #kit .kit-copy:hover { color: var(--text); border-color: var(--text); }
#kit .kit-seg i { width: 9px; height: 9px; flex: none; }
#kit .kit-group { margin: calc(var(--gap) * 3) 0 0; }
#kit .kit-cards { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--gap); margin-top: var(--gap); }
@media (max-width: 760px) { #kit .kit-cards { grid-template-columns: 1fr; } }
#kit figure { margin: 0; min-width: 0; }
#kit figcaption { margin-top: 10px; }
/* A card: 85 × 55 mm, its millimetre a container's 85th. Printed, it grows by the bleed (identity-kit.py). */
#kit .kit-card { --w: 85; --h: 55; --bleed: 0; position: relative; aspect-ratio: calc(var(--w) + 2 * var(--bleed)) / calc(var(--h) + 2 * var(--bleed)); container-type: inline-size; overflow: hidden; }
#kit .kit-field { background: var(--kit-field); color: var(--kit-on-field); box-shadow: inset 0 0 0 1px var(--line); }
#kit .kit-light { background: var(--kit-light); color: var(--kit-on-light); box-shadow: inset 0 0 0 1px var(--line); }
#kit .kit-face { --mm: calc(100cqw / (var(--w) + 2 * var(--bleed))); position: absolute; inset: calc(var(--bleed) * var(--mm)); }
#kit .kit-face svg { display: block; width: 100%; height: 100%; }
/* The front: the wordmark, the block, upright in the middle, 31 mm high. */
#kit .kit-front { display: grid; place-items: center; }
#kit .kit-front svg { width: auto; height: calc(31 * var(--mm)); }
/* The back: the S M top left, the person bottom left, the site bottom right; 6 mm in from every edge. */
#kit .kit-back { padding: calc(6 * var(--mm)); display: grid; grid-template-columns: 1fr auto; grid-template-rows: 1fr auto; }
#kit .kit-sym { width: calc(14 * var(--mm)); grid-column: 1 / -1; align-self: start; }
#kit .kit-who { align-self: end; }
#kit .kit-name, #kit .kit-line { margin: 0; font-family: "Neue Montreal", "Helvetica Neue", Arial, sans-serif; font-weight: 400; }
#kit .kit-name { font-size: calc(3.4 * var(--mm)); line-height: 1.2; }
#kit .kit-line { font-size: calc(2.6 * var(--mm)); line-height: 1.35; }
#kit .kit-site { align-self: end; text-align: right; }
/* The signatures, on white as in a mail. */
#kit .kit-sigs { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--gap); margin-top: var(--gap); }
@media (max-width: 900px) { #kit .kit-sigs { grid-template-columns: 1fr; } }
#kit .kit-mail { background: #fff; color: #000; padding: 28px 24px; min-height: 120px; }
#kit .kit-sig-foot { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; }
`;

export const HTML = `
  <section class="lab" id="kit">
    <style>${STYLE}</style>
    <header class="ch-head">
      <h2 class="ch-name">Kit</h2>
    </header>
    <div class="kit-controls">
      <div class="kit-seg" role="group" aria-label="Colour">${TREATMENTS.map((t, i) => `<button type="button" data-treat="${t}" aria-pressed="${i === 0}">${i ? `<i style="background:${ACCENTS[i - 1].steps[0]}"></i>${ACCENTS[i - 1].name}` : 'Black and white'}</button>`).join('')}</div>
    </div>
    <p class="label kit-group">Business cards</p>
    <div class="kit-cards">
      <figure>${front()}<figcaption class="label">Front</figcaption></figure>
      ${TEAM.map((p) => `<figure>${back(p)}<figcaption class="label">${esc(p.name)}</figcaption></figure>`).join('')}
    </div>
    <p class="label kit-group">Email signatures</p>
    <div class="kit-sigs">
      ${TEAM.map((p, i) => `<figure><div class="kit-mail">${signature(p, HERE)}</div><figcaption class="kit-sig-foot"><span class="label">${esc(p.name)}</span><button type="button" class="kit-copy" data-copy="${i}">Copy</button></figcaption></figure>`).join('')}
    </div>
  </section>`;

function load() {
  try { return { treat: JSON.parse(localStorage.getItem(STORE) || '{}').treat ?? 'black and white' }; } catch { return { treat: 'black and white' }; }
}

/** The colour switch and the copy buttons. Returns the usual tool, plus set({ treat }) for identity-kit.py. */
export function mount(section) {
  const state = load();
  const apply = () => {
    const t = treatment(state.treat);
    const colours = { field: t.field, 'on-field': t.onField, light: t.light, 'on-light': t.onLight };
    for (const [k, v] of Object.entries(colours)) section.style.setProperty(`--kit-${k}`, v);
    for (const b of section.querySelectorAll('[data-treat]')) b.setAttribute('aria-pressed', String(b.dataset.treat === state.treat));
    try { localStorage.setItem(STORE, JSON.stringify(state)); } catch {}
  };
  // A signature copies as HTML (and as plain text), to paste into Gmail's or Apple Mail's settings.
  const copy = async (b) => {
    const html = signature(TEAM[b.dataset.copy]);
    const text = b.closest('figure').querySelector('.kit-mail').innerText;
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([text], { type: 'text/plain' }) })]);
      b.textContent = 'Copied';
    } catch {
      b.textContent = 'Copy failed';
    }
    setTimeout(() => { b.textContent = 'Copy'; }, 1600);
  };
  const onClick = (e) => {
    const t = e.target.closest('[data-treat]');
    if (t) { state.treat = t.dataset.treat; apply(); return; }
    const c = e.target.closest('[data-copy]');
    if (c) copy(c);
  };
  section.addEventListener('click', onClick);
  apply();
  return {
    ready: Promise.resolve(),
    pause() {}, resume() {},
    destroy() { section.removeEventListener('click', onClick); },
    snapshot: () => ({ ...state }),
    set(next) { Object.assign(state, next); apply(); },
  };
}
