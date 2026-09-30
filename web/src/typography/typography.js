// The typography round: a heading, a body and a detail face to go with the
// SMASH typeface, from Jonas's library, each beside a Google Fonts
// alternative. The pairing is set on the palette's earth with a hyper accent,
// in real copy; the galleries show every candidate, and a click puts it in the
// pairing. The bar switches every font between the library and its Google
// alternative, or shows both side by side.
//
// The library fonts are desktop licences: web/scripts/typography-fonts.py makes
// them into fonts/ on this machine only (kept out of git). Where one is not
// there (the live site), its Google alternative stands in, and says so.
// The state is in the address (?h=…&b=…&d=…&src=…&g=…&a=…), so a pairing can be sent.

import { ACCENTS } from '/identity/colour.js';

const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s = '') => String(s).replace(/[<&"]/g, (c) => ({ '<': '&lt;', '&': '&amp;', '"': '&quot;' })[c]);
const pad = (n) => String(n).padStart(2, '0');

const GROUNDS = {
  earth: { ground: '#1f1915', ink: '#f3efe8' },
  black: { ground: '#000000', ink: '#ffffff' },
  paper: { ground: '#f3efe8', ink: '#1f1915' },
};
const ROLES = ['heading', 'body', 'detail'];

const data = await fetch(new URL('candidates.json', import.meta.url)).then((r) => r.json());
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
  heading: pick('heading', params.get('h') ?? 'canela'),
  body: pick('body', params.get('b') ?? 'suisse'),
  detail: pick('detail', params.get('d') ?? 'maison-mono'),
  source: ['library', 'google', 'compare'].includes(params.get('src')) ? params.get('src') : 'library',
  ground: GROUNDS[params.get('g')] ? params.get('g') : 'earth',
  accent: params.get('a') ?? ACCENTS[0].steps[0],
};
function keep() {
  const q = new URLSearchParams({ h: state.heading, b: state.body, d: state.detail, src: state.source, g: state.ground, a: state.accent });
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

function stage(from, tag) {
  const f = faces(from);
  const h = byId.heading[state.heading];
  const names = ROLES.map((role) => `${f[role].name}${f[role].standIn ? ' (for ' + byId[role][state[role]].name + ', not here)' : ''}`).join(' · ');
  return `
    <article class="stage${h.caps ? ' caps' : ''}">
      ${tag ? `<p class="tag">${tag}</p>` : ''}
      <p class="meta" style="${f.detail.css}">SMASH · Immersive experience studio · Stockholm</p>
      <nav class="nav" style="${f.heading.css}"><span>Work</span><span>Studio</span><span>Contact</span></nav>
      <h1 class="display">Heroes</h1>
      <h2 style="${f.heading.css}">Real-life statues, drone-scanned architecture, projected onto Stockholm's Great Synagogue.</h2>
      <div class="cols">
        <div class="body" style="${f.body.css}">
          <p>Heroes was a projection mapped piece on the facade of Stockholms Stora Synagoga in 2022. It honoured <em>Raoul Wallenberg</em>, who saved thousands of Jews in Budapest during the Holocaust, and <em>Dag Hammarskjöld</em>, 1961 Nobel Peace Prize laureate and UN Secretary-General.</p>
          <p>Real-life statues of both men were 3D scanned and the synagogue was captured by drone, <strong>giving precise geometry to work with</strong>. <a href="#">See the project</a>.</p>
        </div>
        <div class="body" style="${f.body.css}">
          <h3 style="${f.heading.css}">Resonance</h3>
          <p>Interactive projection mapping on Uppsala Town Hall, where the public could paint the facade in colour.</p>
          <p class="credits" style="${f.detail.css}">Heroes — Stockholm, 2022<br>Music — Joseph Wilkinson<br>Nobel Week Lights</p>
        </div>
      </div>
      <hr>
      <h2 style="${f.heading.css}">Smash ultimately wants to make people feel.</h2>
      <p class="lede" style="${f.body.css}">We turn spaces into living experiences: interactive installations, projection mapping and immersive environments that invite people in.</p>
      <p class="note">${esc(names)}</p>
    </article>`;
}

function renderStage() {
  const el = $('.stages');
  const two = state.source === 'compare';
  el.classList.toggle('two', two);
  el.innerHTML = two ? stage('library', 'Library') + stage('google', 'Google alternatives') : stage(state.source);
}

// The galleries --------------------------------------------------------------

const SAMPLE = {
  heading: () => `<p class="h-big">Turning spaces into living experiences</p><p class="h-small">Heroes · Jagad · Sala Hjärtslag</p>`,
  body: () => `<p class="b-text">Smash is an immersive experience studio creating physical and digital experiences that make people feel, combining <em>art, technology and storytelling</em> with <strong>space</strong>: ljus, rum och rörelse.</p>`,
  detail: () => `<p class="d-num">2022 · 5 storeys · 01–24</p><p class="d-text">Heroes — Stockholms Stora Synagoga<br>Jagad — Stockholm · Kanal 5</p>`,
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
    c.current && `<span class="chip">Now: ${esc(c.current)}</span>`,
    c.trial && `<span class="chip warn">Trial: not to ship</span>`,
    c.googleOnly && `<span class="chip">Google Fonts</span>`,
    !c.googleOnly && `<i>Google: ${esc(c.google.family)}</i>`,
    !compare && f.standIn && `<span class="chip warn">Not here: showing ${esc(c.google.family)}</span>`,
  ].filter(Boolean).join('');
  const specs = compare && !c.googleOnly ? spec(c, role, 'library', 'Library') + spec(c, role, 'google', 'Google') : spec(c, role, from ?? 'library');
  return `<button type="button" class="card${c.caps ? ' caps' : ''}" data-role="${role}" data-id="${c.id}" aria-pressed="${state[role] === c.id}">
    ${specs}
    <span class="foot"><b>${pad(i + 1)} ${esc(c.name)}</b><i>${esc(c.kind)}</i>${chips}</span>
  </button>`;
}

function renderGalleries() {
  for (const role of ROLES) $(`.gallery[data-role="${role}"] .cards`).innerHTML = data[role].map((c, i) => card(c, role, i)).join('');
}

// The bar and the pickers ------------------------------------------------------

function paint() {
  const g = GROUNDS[state.ground];
  const root = document.documentElement.style;
  root.setProperty('--ground', g.ground);
  root.setProperty('--ink', g.ink);
  root.setProperty('--accent', state.accent === 'none' ? g.ink : state.accent);
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
// Once the library's faces are known, draw again with the ones that are here.
check().then(render);
await document.fonts.ready;
document.documentElement.dataset.ready = '1';
