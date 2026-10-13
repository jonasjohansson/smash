// Slant, best of (Jonas, 2026-10-14: "add it as a section under /identity/ with the slanted variations also
// with some color options, like a best-of"): the Slant chapter's best presets side by side, each its wordmark
// and Down, drawn by the chapter itself (directions/slant.js: drawWith) from the defaults, so the chapter's own
// controls are left as they are. One colour for them all, from the palette (colour.js): white on black, black
// on white, the type on the earth, or one of the hyper colours on the earth; Flip swaps the mark and the ground.
// The choice is kept in this browser. Slant was explored and left (identity/brief.md); this is its record.
// Every preset with its S level (LEVEL; Jonas, 2026-10-14: not "with the S that way", split along a diagonal
// blade); level, Calm Blade was all but Carved Column, so it went. Each card only its name ("we don't need all
// this explanation text", nor the link to the chapter).

import { PRESETS, LEVEL, drawWith, wordmark, down } from './directions/slant.js';
import { ACCENTS, EARTH } from './colour.js';

const hex = (name) => EARTH.find((e) => e.name === name).hex;
// [name, the mark, the ground]
const COLOURS = [
  ['Ink', '#ffffff', '#000000'],
  ['Paper', '#000000', '#ffffff'],
  ['Earth', hex('Type'), hex('Ground')],
  ...ACCENTS.map((a) => [a.name, a.steps[0], hex('Ground')]),
];
// [the preset, its name here] (Jonas, 2026-10-14: "we don't need all this explanation text": a name, no line)
const BEST = [
  ['start', 'Start'],
  ['r1-locked-blade', 'Round 1'],
  ['r2-column-blade', 'Round 2'],
  ['r3-carved-column', 'Round 3'],
  ['r4-apex', 'Round 3 + Apex'],
  ['wide', 'Wide'],
];

const esc = (s = '') => String(s).replace(/[<&"]/g, (c) => ({ '<': '&lt;', '&': '&amp;', '"': '&quot;' })[c]);
const card = ([key, name]) => {
  const preset = PRESETS.find(([k]) => k === key)?.[2];
  if (!preset) return '';
  const set = { ...preset, ...LEVEL };
  return `
    <figure class="best-card">
      <div class="best-art">
        <div class="best-wm">${drawWith(set, wordmark)}</div>
        <div class="best-down">${drawWith(set, down)}</div>
      </div>
      <figcaption><span class="best-name">${esc(name)}</span></figcaption>
    </figure>`;
};

const STYLE = `
#slant-best { --best-mark: #fff; --best-ground: #000; }
#slant-best .best-colours { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-bottom: var(--gap); font-size: 12px; }
#slant-best .best-colours button { font: inherit; color: var(--text); background: none; border: 1px solid var(--line); padding: 4px 10px 4px 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
#slant-best .best-colours button[data-on] { border-color: var(--text); }
#slant-best .best-colours i { width: 14px; height: 14px; border-radius: 50%; box-shadow: inset 0 0 0 1px var(--line); }
#slant-best .best-colours .flip { margin-left: 12px; }
#slant-best .best-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 560px), 1fr)); gap: var(--gap); }
#slant-best .best-card { margin: 0; display: grid; gap: 10px; }
#slant-best .best-art { background: var(--best-ground); color: var(--best-mark); box-shadow: inset 0 0 0 1px var(--line); display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8%; align-items: center; padding: 10% 8%; aspect-ratio: 16 / 9; transition: background 0.2s, color 0.2s; }
#slant-best .best-wm svg { display: block; width: 100%; height: auto; }
#slant-best .best-down svg { display: block; height: clamp(140px, 22vw, 260px); width: auto; }
#slant-best figcaption { display: flex; flex-wrap: wrap; gap: 4px 14px; align-items: baseline; }
#slant-best .best-name { color: var(--text); font-size: 13px; }
`;

export const HTML = `
  <section class="lab" id="slant-best">
    <style>${STYLE}</style>
    <header class="ch-head">
      <h2 class="ch-name">Slant, best of</h2>
    </header>
    <div class="best-colours">${COLOURS.map(([name, mark, ground]) => `<button type="button" data-colour="${esc(name)}" title="${esc(`${mark} on ${ground}`)}"><i style="background:linear-gradient(135deg, ${mark} 50%, ${ground} 50%)"></i>${esc(name)}</button>`).join('')}<button type="button" class="flip">Flip</button></div>
    <div class="best-grid">${BEST.map(card).join('')}</div>
  </section>`;

const KEY = 'identity:slant-best';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) ?? {}; } catch { return {}; } };
const keep = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* no storage: as it starts */ } };

export function mount(section) {
  let { colour = 'Ink', flip = false } = load();
  const paint = () => {
    const [, mark, ground] = COLOURS.find(([n]) => n === colour) ?? COLOURS[0];
    section.style.setProperty('--best-mark', flip ? ground : mark);
    section.style.setProperty('--best-ground', flip ? mark : ground);
    for (const b of section.querySelectorAll('[data-colour]')) b.toggleAttribute('data-on', b.dataset.colour === colour);
    section.querySelector('.flip').toggleAttribute('data-on', flip);
    keep({ colour, flip });
  };
  for (const b of section.querySelectorAll('[data-colour]')) b.addEventListener('click', () => { colour = b.dataset.colour; paint(); });
  section.querySelector('.flip').addEventListener('click', () => { flip = !flip; paint(); });
  paint();
  return { ready: Promise.resolve(), pause() {}, resume() {}, destroy() {} };
}
