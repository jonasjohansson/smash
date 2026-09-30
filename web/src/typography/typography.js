// The typography round: a heading and a body face to go with the SMASH
// typeface (no third: the meta and the credits are the body face, small and
// spaced), from Jonas's library, each beside a Google Fonts alternative. The pairing is set on the palette's earth with a hyper accent,
// in real copy; the galleries show every candidate, and a click puts it in the
// pairing. The bar switches every font between the library and its Google
// alternative, or shows both side by side.
//
// The library fonts are made into fonts/ by web/scripts/typography-fonts.py (in
// git, so the live site has them). Where one is missing, its Google
// alternative stands in, and says so.
// The state is in the address (?h=…&b=…&src=…&g=…&a=…), so a pairing can be sent; the
// pairing's text can be edited in place (kept in this browser).
// The galleries run in Jonas's round 1 order (his stars), the round 2 additions after his top pick.

import { ACCENTS } from '/identity/colour.js';
import { row, mountFeedback } from './feedback.js';

const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s = '') => String(s).replace(/[<&"]/g, (c) => ({ '<': '&lt;', '&': '&amp;', '"': '&quot;' })[c]);
const pad = (n) => String(n).padStart(2, '0');

const GROUNDS = {
  earth: { ground: '#1f1915', ink: '#f3efe8' },
  black: { ground: '#000000', ink: '#ffffff' },
  paper: { ground: '#f3efe8', ink: '#1f1915' },
};
const ROLES = ['heading', 'body'];

const data = await fetch(new URL('candidates.json', import.meta.url)).then((r) => r.json());
// Best rated first; a round 2 addition just under round 1's top rating, one not rated at the end.
const rank = (c) => (c.r1 ?? (c.round === 2 ? 3.5 : 0));
for (const role of ROLES) data[role].sort((a, b) => rank(b) - rank(a));
const byId = Object.fromEntries(ROLES.map((role) => [role, Object.fromEntries(data[role].map((c) => [c.id, c]))]));

// The Google alternatives, all in one stylesheet.
{
  const specs = [...new Set(ROLES.flatMap((role) => data[role].map((c) => c.google.css2)))];
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?${specs.map((s) => `family=${s}`).join('&')}&display=swap`;
  document.head.appendChild(link);
}

// Which library fonts are here: a face that loads. (On the live site fonts/ is not there.)
const here = {};
async function check() {
  const ids = [...new Set(ROLES.flatMap((role) => data[role].filter((c) => c.library).map((c) => c.id)))];
  await Promise.all(ids.map(async (id) => {
    try { here[id] = (await document.fonts.load(`20px "L ${id}"`)).length > 0; } catch { here[id] = false; }
  }));
}

// State, from the address.
const params = new URLSearchParams(location.search);
const pick = (role, id) => (byId[role][id] ? id : data[role][0].id);
const state = {
  heading: pick('heading', params.get('h') ?? 'stolzl-display'),
  body: pick('body', params.get('b') ?? 'inter'),
  source: ['library', 'google', 'compare'].includes(params.get('src')) ? params.get('src') : 'library',
  ground: GROUNDS[params.get('g')] ? params.get('g') : 'earth',
  accent: params.get('a') ?? 'none', // no accent unless one is chosen (Jonas)
};
// Sizes and line heights (the sliders): the heading in % of the stage's width, the body in px.
const SIZES = { hs: 4.2, hl: 1.05, bs: 17, bl: 1.55 };
for (const [k, v] of Object.entries(SIZES)) state[k] = Number.isFinite(Number(params.get(k))) && params.get(k) !== null ? Number(params.get(k)) : v;
function keep() {
  const q = new URLSearchParams({ h: state.heading, b: state.body, src: state.source, g: state.ground, a: state.accent });
  for (const k of Object.keys(SIZES)) if (state[k] !== SIZES[k]) q.set(k, state[k]);
  history.replaceState(null, '', `?${q}`);
}

/**
 * (Its CSS goes in a style attribute, so it quotes with single quotes.)
 * The face for candidate c from `from` ('library' or 'google'): its CSS
 * (family, weight, any axis), where it came from, and whether it stands in
 * for a library font that is not here.
 */
function face(c, from, role) {
  const weight = role === 'heading' ? (c.weight ?? 400) : 400;
  const google = () => ({ css: `font-family:'${c.google.family}',sans-serif;font-weight:${weight};${c.google.css ?? ''}`, name: c.google.family, from: 'google' });
  if (from === 'google' || c.googleOnly) return google();
  if (c.local) return { css: `font-family:'${c.local}',sans-serif;font-weight:${weight};`, name: c.name, from: 'library' };
  if (here[c.id]) return { css: `font-family:'L ${c.id}',sans-serif;font-weight:${weight};`, name: c.name, from: 'library' };
  return { ...google(), standIn: true };
}
const faces = (from) => Object.fromEntries(ROLES.map((role) => [role, face(byId[role][state[role]], from, role)]));

// The pairing ----------------------------------------------------------------

// The pairing's text: SMASH's own copy by default, editable in place (any
// element with data-t); an edit is kept in this browser and feeds the cards.
const TEXT_STORE = 'smash-typography-text';
const TEXT = {
  meta: 'SMASH · Immersive experience studio · Stockholm',
  nav: '<span>Work</span><span>Studio</span><span>Contact</span>',
  display: 'Heroes',
  h2a: "Real-life statues, drone-scanned architecture, projected onto Stockholm's Great Synagogue.",
  p1: 'Heroes was a projection mapped piece on the facade of Stockholms Stora Synagoga in 2022. It honoured <em>Raoul Wallenberg</em>, who saved thousands of Jews in Budapest during the Holocaust, and <em>Dag Hammarskjöld</em>, 1961 Nobel Peace Prize laureate and UN Secretary-General.',
  p2: 'Real-life statues of both men were 3D scanned and the synagogue was captured by drone, <strong>giving precise geometry to work with</strong>. <a href="#">See the project</a>.',
  h3: 'Resonance',
  p3: 'Interactive projection mapping on Uppsala Town Hall, where the public could paint the facade in colour.',
  credits: 'Heroes — Stockholm, 2022<br>Music — Joseph Wilkinson<br>Nobel Week Lights',
  h2b: 'Smash ultimately wants to make people feel.',
  lede: 'We turn spaces into living experiences: interactive installations, projection mapping and immersive environments that invite people in.',
};
let edits = {};
try { edits = JSON.parse(localStorage.getItem(TEXT_STORE) || '{}'); } catch {}
/** A text's HTML: an edit (kept as plain text, line breaks kept) or the default. */
const text = (k) => (k in edits ? esc(edits[k]).replace(/\n/g, '<br>') : TEXT[k]);
/** Plain text for a card sample. */
const plain = (k) => (k in edits ? edits[k] : TEXT[k].replace(/<br>/g, ' ').replace(/<[^>]+>/g, ''));
const ed = (k) => `data-t="${k}" contenteditable="plaintext-only" spellcheck="false"`;

function stage(from, tag) {
  const f = faces(from);
  const h = byId.heading[state.heading];
  const names = ROLES.map((role) => `${f[role].name}${f[role].standIn ? ' (for ' + byId[role][state[role]].name + ', not here)' : ''}`).join(' · ');
  return `
    <article class="stage${h.caps ? ' caps' : ''}">
      ${tag ? `<p class="tag">${tag}</p>` : ''}
      <p class="meta" style="${f.body.css}" ${ed('meta')}>${text('meta')}</p>
      <nav class="nav" style="${f.heading.css}">${TEXT.nav}</nav>
      <h1 class="display" ${ed('display')}>${text('display')}</h1>
      <h2 style="${f.heading.css}" ${ed('h2a')}>${text('h2a')}</h2>
      <div class="cols">
        <div class="body" style="${f.body.css}">
          <p ${ed('p1')}>${text('p1')}</p>
          <p ${ed('p2')}>${text('p2')}</p>
        </div>
        <div class="body" style="${f.body.css}">
          <h3 style="${f.heading.css}" ${ed('h3')}>${text('h3')}</h3>
          <p ${ed('p3')}>${text('p3')}</p>
          <p class="credits" style="${f.body.css}" ${ed('credits')}>${text('credits')}</p>
        </div>
      </div>
      <hr>
      <h2 style="${f.heading.css}" ${ed('h2b')}>${text('h2b')}</h2>
      <p class="lede" style="${f.body.css}" ${ed('lede')}>${text('lede')}</p>
      <p class="note">${esc(names)}</p>
    </article>`;
}

function renderStage() {
  const el = $('.stages');
  const two = state.source === 'compare';
  el.classList.toggle('two', two);
  el.innerHTML = two ? stage('library', 'Library') + stage('google', 'Google alternatives') : stage(state.source);
  $('.pair-fb').innerHTML = `<span class="label">This pairing</span>${row(`pair:${state.heading}+${state.body}`)}`;
}

// The galleries --------------------------------------------------------------

const SAMPLE = {
  heading: () => `<p class="h-big">${esc(plain('h2b'))}</p><p class="h-small">Heroes · Jagad · Sala Hjärtslag</p>`,
  body: () => `<p class="b-text">${esc(plain('p1'))}</p>`,
};

function spec(c, role, from, label) {
  const f = face(c, from, role);
  return `<div class="spec" style="${f.css}">${label ? `<p class="which">${label}: ${esc(f.name)}</p>` : ''}${SAMPLE[role]()}</div>`;
}

function card(c, role, i) {
  const compare = state.source === 'compare';
  const from = compare ? null : state.source;
  const f = face(c, from ?? 'library', role);
  const chips = [
    c.r1 && `<span class="chip" title="${esc(c.note ?? '')}">Round 1 ${'★'.repeat(c.r1)}${'☆'.repeat(5 - c.r1)}</span>`,
    c.round === 2 && `<span class="chip warn">New</span>`,
    c.current && `<span class="chip">Now: ${esc(c.current)}</span>`,
    c.trial && `<span class="chip warn">Trial: not to ship</span>`,
    c.googleOnly && `<span class="chip">Google Fonts</span>`,
    !c.googleOnly && `<i>Google: ${esc(c.google.family)}</i>`,
    !compare && f.standIn && `<span class="chip warn">Not here: showing ${esc(c.google.family)}</span>`,
  ].filter(Boolean).join('');
  const specs = compare && !c.googleOnly ? spec(c, role, 'library', 'Library') + spec(c, role, 'google', 'Google') : spec(c, role, from ?? 'library');
  return `<div class="card-wrap"><button type="button" class="card${c.caps ? ' caps' : ''}" data-role="${role}" data-id="${c.id}" aria-pressed="${state[role] === c.id}">
    ${specs}
    <span class="foot"><b>${pad(i + 1)} ${esc(c.name)}</b><i>${esc(c.kind)}</i>${chips}${c.note ? `<span class="note-r1">“${esc(c.note)}”</span>` : ''}</span>
  </button>${row(`${role}:${c.id}`)}</div>`;
}

// Three galleries: the headings, the experimental display faces (headings too), the body faces.
const GALLERIES = [
  { sel: '.gallery[data-role="heading"]:not(.experimental)', role: 'heading', keep: (c) => !c.experimental },
  { sel: '.gallery.experimental', role: 'heading', keep: (c) => c.experimental },
  { sel: '.gallery[data-role="body"]', role: 'body', keep: () => true },
];
function renderGalleries() {
  for (const g of GALLERIES) $(`${g.sel} .cards`).innerHTML = data[g.role].filter(g.keep).map((c, i) => card(c, g.role, i)).join('');
}

// The bar and the pickers ------------------------------------------------------

function paint() {
  const g = GROUNDS[state.ground];
  const root = document.documentElement.style;
  root.setProperty('--ground', g.ground);
  root.setProperty('--ink', g.ink);
  root.setProperty('--accent', state.accent === 'none' ? g.ink : state.accent);
  for (const k of Object.keys(SIZES)) {
    root.setProperty(`--${k}`, state[k]);
    $(`input[data-v="${k}"]`).value = state[k];
    $(`output[data-for="${k}"]`).textContent = k === 'bs' ? `${state[k]}px` : state[k];
  }
  for (const set of ['source', 'ground']) {
    document.querySelectorAll(`[data-set="${set}"] button`).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === state[set])));
  }
  document.querySelectorAll('[data-set="accent"] button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === state.accent)));
  for (const role of ROLES) $(`select[data-role="${role}"]`).value = state[role];
}

function render() {
  paint();
  renderStage();
  renderGalleries();
  keep();
}

function setup() {
  const accents = $('[data-set="accent"]');
  accents.insertAdjacentHTML('beforeend', ACCENTS.map((a) => `<button type="button" data-v="${a.steps[0]}" title="${a.name}" style="background:${a.steps[0]}"></button>`).join('')
    + `<button type="button" class="none" data-v="none" title="No accent"></button>`);
  for (const set of ['source', 'ground', 'accent']) {
    $(`[data-set="${set}"]`).addEventListener('click', (e) => {
      const b = e.target.closest('button[data-v]');
      if (!b) return;
      state[set] = b.dataset.v;
      render();
    });
  }
  for (const role of ROLES) {
    const sel = $(`select[data-role="${role}"]`);
    sel.innerHTML = data[role].map((c, i) => `<option value="${c.id}">${pad(i + 1)} ${esc(c.name)}</option>`).join('');
    sel.addEventListener('change', () => { state[role] = sel.value; render(); });
  }
  // The sliders only restyle: nothing is drawn again while one moves.
  document.querySelector('.sizes').addEventListener('input', (e) => {
    const k = e.target.dataset?.v;
    if (!k) return;
    state[k] = Number(e.target.value);
    paint();
    keep();
  });
  $('.reset-sizes').addEventListener('click', () => { Object.assign(state, SIZES); paint(); keep(); });
  // Editing the text in place: kept as you type; the other stage (side by side) follows at once, the cards a moment later.
  let cardsLater = 0;
  document.querySelector('.stages').addEventListener('input', (e) => {
    const el = e.target.closest('[data-t]');
    if (!el) return;
    const k = el.dataset.t;
    edits[k] = el.innerText;
    try { localStorage.setItem(TEXT_STORE, JSON.stringify(edits)); } catch {}
    document.querySelectorAll(`.stages [data-t="${k}"]`).forEach((other) => { if (other !== el) other.innerText = edits[k]; });
    clearTimeout(cardsLater);
    cardsLater = setTimeout(renderGalleries, 400);
  });
  $('.reset-text').addEventListener('click', () => {
    edits = {};
    try { localStorage.removeItem(TEXT_STORE); } catch {}
    render();
  });
  $('.shuffle').addEventListener('click', () => {
    for (const role of ROLES) state[role] = data[role][Math.floor(Math.random() * data[role].length)].id;
    render();
  });
  document.addEventListener('click', (e) => {
    const c = e.target.closest('.card');
    if (!c) return;
    state[c.dataset.role] = c.dataset.id;
    render();
    $('.pairing').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

setup();
render();
// Feedback: every candidate and every pairing tried, gathered to copy (feedback.js).
const ROLE_NAME = { heading: 'Headings', body: 'Body' };
mountFeedback({
  groups: ['Pairings', 'Headings', 'Body'],
  describe(key) {
    const [kind, rest] = key.split(':');
    if (kind === 'pair') {
      const [h, b, d] = rest.split('+');
      if (d || !byId.heading[h] || !byId.body[b]) return null; // round 1's pairings had a third (detail) face
      const link = `${location.origin}${location.pathname}?${new URLSearchParams({ h, b })}`;
      return { group: 'Pairings', name: `${byId.heading[h].name} + ${byId.body[b].name}`, link };
    }
    const c = byId[kind]?.[rest];
    return c ? { group: ROLE_NAME[kind], name: `${c.name} (Google: ${c.google.family})` } : null;
  },
});
// Once the library's faces are known, draw again with the ones that are here.
check().then(render);
await document.fonts.ready;
document.documentElement.dataset.ready = '1';
