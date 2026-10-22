// /identity-cm/ (2026-10-22): CM.SUPPLY's wordmark with a capital A and the S's and the H's bridges
// (geometry.js), live, with its measures as controls. Jonas: "we also want to have some variables for it",
// and to see it "tall like the original and then chopped a bit so we get the word mark with S and M etc": the
// wordmark tall, then chopped to three lower blocks (their slide 07), then the S M and the S alone, chopped,
// with their lockups (slides 03 and 04), and the bridges each way. The settings live in the address (#…), so a
// link shows what was set; Theirs over lays their tall PNG on the tall wordmark, to check it against.

import { CM, LETTERS, wordmark, symbol, sAlone, svgOf, least } from './geometry.js';

const CHOPPED = [420, 320, 220]; // the chopped wordmarks' blocks, under the tall one
const EXAGGERATED = [1.25, 1.5]; // the tall block drawn out (Jonas, 2026-10-22: "exaggerate the height a bit"), above it
const REF = new URL('./cm-supply-tall.png', import.meta.url).href; // their tall wordmark, 1880 × 550 (the a dips 9)
const REF_W = 1880;

// [key, label, min, max, step, group, as words]
const deg = (k) => `${(Math.atan(k) * 180 / Math.PI).toFixed(1)}°`;
const SLIDERS = [
  ['height', 'Height', 160, 1400, 1, 'Block'],
  ['symbol', 'S M height', 140, 600, 1, 'Block'],
  ['stem', 'Stem', 40, 260, 1, 'Block'],
  ['mid', 'M middle stem', 40, 280, 1, 'Block'],
  ['slot', 'Slot', 8, 90, 1, 'Block'],
  ['space', 'Space', 0, 120, 1, 'Block'],
  ['bar', 'Bar', 4, 90, 1, 'Cuts'],
  ['slope', 'Slope', 0, 0.7, 0.002, 'Cuts', deg],
  ['round', 'Cut round', 0, 30, 0.5, 'Cuts'],
  ['aRound', 'A top round', 0, 18, 0.5, 'Cuts'],
  ['bridge', 'Bridge', 6, 120, 1, 'Middle'],
  ['rise', 'Rise', -60, 80, 1, 'Middle'],
  ['upper', 'Upper opening', 0, 140, 1, 'Middle'],
  ['lower', 'Lower opening', 0, 140, 1, 'Middle'],
  ['outerX', 'Corner across', 0, 90, 1, 'Corners'],
  ['outerY', 'Corner down', 0, 140, 1, 'Corners'],
  ['tension', 'Corner tension', 0.1, 1, 0.01, 'Corners'],
];
// [key, label, [[label, value]], group]
const SWITCHES = [
  ['sBridge', 'S bridge', [['On', 1], ['Off', 0]], 'Middle'],
  ['hBridge', 'H bridge', [['On', 1], ['Off', 0]], 'Middle'],
  ['sLevel', 'S middle', [['Diagonal', 0], ['Level', 1]], 'Middle'],
  ['level', 'Crossbars', [['Slanted', 0], ['Level', 1]], 'Middle'],
  ['aTop', 'A counter top', [['As their a', 'round'], ['Cut', 'cut']], 'Cuts'],
  ['even', 'Spacing', [['Theirs', 0], ['Even', 1]], 'Block'],
];
const GROUPS = [['Block', true], ['Middle', true], ['Cuts', false], ['Corners', false]];
const CORNERS = [['tl', 'Top left'], ['tr', 'Top right'], ['br', 'Bottom right'], ['bl', 'Bottom left']];
const PRESETS = [['SMASH, bridged', {}], ["CM.SUPPLY's, open", { sBridge: 0, hBridge: 0 }]];

const esc = (s = '') => String(s).replace(/[<&"]/g, (c) => ({ '<': '&lt;', '&': '&amp;', '"': '&quot;' })[c]);
const fresh = () => structuredClone(CM);

// The settings that differ from the defaults, in the address.
const read = () => { try { return JSON.parse(decodeURIComponent(location.hash.slice(1)) || '{}'); } catch { return {}; } };
const write = (p) => {
  const diff = Object.fromEntries(Object.entries(p).filter(([k, v]) => JSON.stringify(v) !== JSON.stringify(CM[k])));
  history.replaceState(null, '', Object.keys(diff).length ? `#${encodeURIComponent(JSON.stringify(diff))}` : location.pathname + location.search);
};

let p = { ...fresh(), ...read() };
const view = { paper: false, ref: false };

// The marks

const shown = (mark) => svgOf(mark, { fill: 'currentColor' });
const file = (mark, name) => `<a download="${esc(name)}.svg" href="data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgOf(mark, { fill: '#000' }))}">SVG</a>`;
const size = (m) => `${Math.round(m.w)} × ${Math.round(m.h)}`;
function fig(mark, label, name, extra = '') {
  return `<figure><div class="art">${extra ? `<div style="position:relative;width:100%">${shown(mark)}${extra}</div>` : shown(mark)}</div>
    <figcaption><span>${esc(label)}, ${size(mark)}</span>${file(mark, name)}</figcaption></figure>`;
}
const lockup = (mark, cls = '') => `<div class="lockup ${cls}"><span class="m">${shown(mark)}</span><span class="t"><span>SMASH</span><span>Immersive Experience Studio</span><span>Stockholm</span></span></div>`;

function marks() {
  const tall = wordmark(p);
  const ref = view.ref ? `<img class="ref" src="${REF}" alt="" style="left:0;top:0;width:${(REF_W / tall.w) * 100}%">` : '';
  const chopped = CHOPPED.map((h) => wordmark(p, h));
  const drawn = EXAGGERATED.map((k) => wordmark(p, Math.round(p.height * k)));
  const sm = symbol(p), s = sAlone(p);
  const ways = [['Bridged', 1, 1], ['S bridged', 1, 0], ['H bridged', 0, 1], ["Open, as CM.SUPPLY's", 0, 0]];
  return `
    <section class="sec"><h2>Exaggerated</h2><div class="chopped">${drawn.map((m, i) => fig(m, `Exaggerated, ${EXAGGERATED[i]}×`, `smash-cm-${m.h}`)).join('')}</div></section>
    <section class="sec"><h2>Tall</h2>${fig(tall, 'Tall', 'smash-cm-tall', ref)}</section>
    <section class="sec"><h2>Chopped</h2><div class="chopped">${chopped.map((m) => fig(m, m.h > CHOPPED.at(-1) ? 'Chopped' : 'Chopped, its lowest here', `smash-cm-${m.h}`)).join('')}</div></section>
    <section class="sec"><h2>S M and S</h2>
      <div class="pair">${fig(sm, 'S M', 'smash-cm-sm')}${fig(s, 'S', 'smash-cm-s')}</div>
      <div class="pair"><div class="art lockup-art">${lockup(sm)}</div><div class="art lockup-art">${lockup(s, 's')}</div></div>
    </section>
    <section class="sec"><h2>The bridges</h2><div class="grid">${ways.map(([label, sB, hB]) => fig(wordmark({ ...p, sBridge: sB, hBridge: hB }), label, `smash-cm-${label.toLowerCase().replace(/[^a-z]+/g, '-')}`)).join('')}</div></section>`;
}

// The controls

const value = (key, v) => { const s = SLIDERS.find(([k]) => k === key); return s?.[6] ? s[6](v) : String(+(+v).toFixed(3)); };
const slider = ([key, label, min, max, step]) => `<label class="knob" data-key="${key}"><span>${esc(label)}</span><input type="range" min="${min}" max="${max}" step="${step}" value="${p[key]}"><output>${esc(value(key, p[key]))}</output></label>`;
const toggle = ([key, label, options]) => `<span class="switch" data-key="${key}"><span>${esc(label)}</span>${options.map(([l, v]) => `<button type="button" data-v="${esc(JSON.stringify(v))}"${p[key] === v ? ' data-on' : ''}>${esc(l)}</button>`).join('')}</span>`;
const letters = () => `<div class="letters"><span></span>${LETTERS.map((l) => `<span class="col">${l}</span>`).join('')}${CORNERS.map(([, label], c) => `<span>${label}</span>${LETTERS.map((l, i) => `<button type="button" data-letter="${i}" data-corner="${c}" title="${esc(`${label}, ${l}`)}"${p.corners[i][c] ? ' data-on' : ''}></button>`).join('')}`).join('')}</div>`;
const KEY = 'identity-cm:folds';
const folds = () => { try { return JSON.parse(localStorage.getItem(KEY)) ?? {}; } catch { return {}; } };
function controls() {
  const open = folds();
  return `<div class="controls">
    <div class="actions">${PRESETS.map(([label], i) => `<button type="button" data-preset="${i}">${esc(label)}</button>`).join('')}
      <button type="button" data-view="paper"${view.paper ? ' data-on' : ''}>Paper</button>
      <button type="button" data-view="ref"${view.ref ? ' data-on' : ''} title="Their tall wordmark over the tall one, to check it against">Theirs over</button>
      <span class="note">Lowest block now ${least(p)}</span></div>
    ${GROUPS.map(([name, start]) => `<details data-group="${name}"${(open[name] ?? start) ? ' open' : ''}><summary>${name}</summary><div>
      ${SLIDERS.filter((s) => s[5] === name).map(slider).join('')}${SWITCHES.filter((s) => s[3] === name).map(toggle).join('')}${name === 'Corners' ? letters() : ''}
    </div></details>`).join('')}
  </div>`;
}

// The page

const page = document.getElementById('page');
page.innerHTML = `
  <header class="top"><span>SMASH, after CM.SUPPLY's round 4, with a capital A</span><a href="/identity/">Identity</a></header>
  <section class="sec" id="controls"></section>
  <div id="marks" style="display:grid;gap:clamp(48px,8vw,120px)"></div>`;
const $controls = page.querySelector('#controls'), $marks = page.querySelector('#marks');

function paint() {
  document.documentElement.style.setProperty('--mark', view.paper ? '#000' : '#fff');
  document.documentElement.style.setProperty('--ground', view.paper ? '#fff' : '#000');
  $marks.innerHTML = marks();
  const note = $controls.querySelector('.note');
  if (note) note.textContent = `Lowest block now ${least(p)}`;
  write(p);
}
const rebuild = () => { $controls.innerHTML = controls(); paint(); };

$controls.addEventListener('input', (e) => {
  const knob = e.target.closest('.knob');
  if (!knob) return;
  p[knob.dataset.key] = Number(e.target.value);
  knob.querySelector('output').textContent = value(knob.dataset.key, p[knob.dataset.key]);
  paint();
});
$controls.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.preset) { p = { ...fresh(), ...PRESETS[b.dataset.preset][1] }; return rebuild(); }
  if (b.dataset.view) { view[b.dataset.view] = !view[b.dataset.view]; b.toggleAttribute('data-on', view[b.dataset.view]); return paint(); }
  if (b.dataset.letter) {
    const i = +b.dataset.letter, c = +b.dataset.corner;
    p.corners = p.corners.map((row, j) => (j === i ? row.map((on, k) => (k === c ? 1 - on : on)) : row));
    b.toggleAttribute('data-on', !!p.corners[i][c]);
    return paint();
  }
  const sw = b.closest('.switch');
  if (sw) {
    p[sw.dataset.key] = JSON.parse(b.dataset.v);
    for (const o of sw.querySelectorAll('button')) o.toggleAttribute('data-on', o === b);
    paint();
  }
});
$controls.addEventListener('toggle', (e) => {
  const d = e.target.closest('details');
  if (!d) return;
  const open = folds();
  open[d.dataset.group] = d.open;
  try { localStorage.setItem(KEY, JSON.stringify(open)); } catch { /* no storage: as they start */ }
}, true);

rebuild();
