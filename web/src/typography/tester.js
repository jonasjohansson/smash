// The type tester: the typography round's faces tried on the project pages
// themselves (Jonas, 2026-09-30: "this tester system in a gui on the project
// pages"). main.js loads it on a project's page; it adds a Typography folder
// to the tweak panel (H), and T and B step through the heading and body faces
// (Shift: back). Until a face is chosen, the page keeps its own type.
//
// What goes where, as on /typography's pairing: the heading face sets the
// introduction (the large words under the hero, which /typography sets as its
// heading) and a title without a hero; the body face sets the texts, their
// labels and the credits. The title cut out of the hero and the footer's
// invitation are the display: the site's own (Anton), the heading face, or
// the SMASH typeface. Sizes are the page's own scaled (100 %), line heights
// the page's own until moved. From the library or as the Google alternatives,
// as on /typography; a library face that is not here stands in as its Google
// alternative, and says so.
//
// Kept in this browser (only what differs from the page's own), so it carries
// from project to project. A link can carry one too (Copy link): ?h=&b=&src=
// &title=&hsize=&hline=&bsize=&bline=, shown as it is and not kept. "Take
// /typography's pairing" takes the one last set there (typography.js leaves
// it in localStorage), its sizes relative to that page's own.

import { candidates, googleHref, libraryHere, face } from './faces.js';

const STORE = 'smash-type-tester';
const PAIRING = 'smash-typography-pairing'; // left by typography.js
// The page's own: main.css's sizes (scaled by hsize and bsize) and line heights.
export const TYPE_DEFAULTS = { heading: 'own', body: 'own', source: 'library', title: 'own', hsize: 1, hline: 1.15, bsize: 1, bline: 1.18 };
const OWN = {
  lead: 'clamp(24px, 3.12vw, 46px)', // .lead
  title: 'var(--t-title)', // .project-title, .next-title
  text: 'clamp(20px, 2.22vw, 32px)', // .row-section .prose, .row-split .prose
};
// /typography's own sizes and line heights, to take its pairing relative to them.
const ROUND = { hs: 4.2, hl: 1.05, bs: 17, bl: 1.55 };
const QUERY = { heading: 'h', body: 'b', source: 'src', title: 'title', hsize: 'hsize', hline: 'hline', bsize: 'bsize', bline: 'bline' };
const TITLES = { "site's own (Anton)": 'own', 'heading face': 'heading', 'SMASH typeface': 'smash' };

const pad = (n) => String(n).padStart(2, '0');
const typing = (e) => e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement || e.target.isContentEditable;

function stored() {
  try { return JSON.parse(localStorage.getItem(STORE) || '{}'); } catch { return {}; }
}
function fromQuery() {
  const q = new URLSearchParams(location.search);
  const s = {};
  for (const [k, name] of Object.entries(QUERY)) {
    if (!q.has(name)) continue;
    s[k] = typeof TYPE_DEFAULTS[k] === 'number' ? Number(q.get(name)) : q.get(name);
    if (typeof s[k] === 'number' && !Number.isFinite(s[k])) delete s[k];
  }
  return s;
}

/**
 * Start the tester on this page. refit() sets the title masks again (feed.js
 * sizes them by their ink, which depends on the face). Returns { addFolder(pane), reset() }.
 */
export function start({ refit = () => {} } = {}) {
  const linked = fromQuery();
  const state = { ...TYPE_DEFAULTS, ...(Object.keys(linked).length ? linked : stored()) };
  const save = () => {
    const changed = Object.fromEntries(Object.entries(state).filter(([k, v]) => v !== TYPE_DEFAULTS[k]));
    try { localStorage.setItem(STORE, JSON.stringify(changed)); } catch {}
  };
  const untouched = () => Object.entries(TYPE_DEFAULTS).every(([k, v]) => k === 'source' || state[k] === v);

  const style = document.createElement('style');
  style.id = 'type-tester';
  document.head.append(style);
  const info = { showing: "The page's own type." };
  let pane = null;
  let quiet = false; // the panel catching up, not the viewer
  const sync = () => { quiet = true; pane?.refresh(); quiet = false; };

  // The candidates, fetched once, when first needed.
  let list = null;
  const load = () => (list ??= candidates());
  // Library faces: their stylesheet once, then which are here (asked once each).
  const here = {};
  let sheet = null;
  const library = (cs) => {
    sheet ??= new Promise((resolve) => {
      const link = Object.assign(document.createElement('link'), { rel: 'stylesheet', href: new URL('fonts/library.css', import.meta.url).href });
      link.onload = link.onerror = resolve;
      document.head.append(link);
    });
    const ask = cs.filter((c) => c.library && !(c.id in here));
    return sheet.then(() => libraryHere(ask)).then((h) => Object.assign(here, h));
  };
  // Google alternatives: a stylesheet for each choice that needs one, once;
  // resolves when it is in (a face can only be asked for after).
  const googled = new Map();
  const google = (cs) => {
    if (!cs.length) return Promise.resolve();
    const href = googleHref(cs);
    if (!googled.has(href)) {
      const link = Object.assign(document.createElement('link'), { rel: 'stylesheet', href });
      googled.set(href, new Promise((resolve) => { link.onload = link.onerror = resolve; }));
      document.head.append(link);
    }
    return googled.get(href);
  };

  let runs = 0;
  let fitted = 'own'; // the face the title masks were last sized in
  async function apply() {
    const run = ++runs;
    if (untouched()) {
      style.textContent = '';
      info.showing = "The page's own type.";
      sync();
      if (fitted !== 'own') { fitted = 'own'; refit(); }
      return;
    }
    const { byId } = await load();
    const chosen = { heading: byId.heading[state.heading] ?? null, body: byId.body[state.body] ?? null };
    const picked = [chosen.heading, chosen.body].filter(Boolean);
    if (state.source === 'library') await library(picked);
    if (run !== runs) return;
    const f = {
      heading: chosen.heading && face(chosen.heading, state.source, 'heading', here),
      body: chosen.body && face(chosen.body, state.source, 'body', here),
    };
    const googleIn = google(['heading', 'body'].filter((role) => f[role]?.from === 'google').map((role) => chosen[role]));
    style.textContent = css(f, chosen);
    const name = (role) => (f[role] ? `${f[role].name}${f[role].standIn ? ` (for ${chosen[role].name}, not here)` : ''}${f[role].from === 'google' && !f[role].standIn ? ' (Google)' : ''}` : "the page's own");
    info.showing = `Heading: ${name('heading')}\nBody: ${name('body')}`;
    sync();
    // The title masks are sized by their letters' ink: again, once their face is in.
    const title = display(f.heading);
    const key = title ? `${title.weight} ${title.family}` : 'own';
    if (key === fitted) return;
    if (title) await googleIn.then(() => document.fonts.load(`${title.weight} 100px ${title.family}`)).catch(() => {});
    if (run !== runs) return;
    fitted = key;
    refit();
  }
  // The display: the title cut out of the hero, the footer's invitation, an offering's title.
  const display = (h) => (state.title === 'smash' ? { family: 'SMASH', weight: 500, extra: '' } : state.title === 'heading' ? h : null);

  // The rules, only for what differs from the page's own.
  function css(f, chosen) {
    const rules = [];
    const set = (sel, decl) => decl && rules.push(`${sel} { ${decl} }`);
    const h = f.heading, b = f.body;
    const caps = chosen.heading?.caps ? 'text-transform: uppercase;' : '';
    if (h) set('.project .lead, .project-title, .next-title', `font-family: ${h.family}; font-weight: ${h.weight}; ${h.extra} ${caps}`);
    if (b) set('.project .prose, .project .label, .project .credits, .next-label', `font-family: ${b.family}; font-weight: ${b.weight}; ${b.extra}`);
    if (state.hsize !== 1) {
      set('.project .lead', `font-size: calc(${OWN.lead} * ${state.hsize});`);
      set('.project-title, .next-title', `font-size: calc(${OWN.title} * ${state.hsize});`);
    }
    if (state.hline !== TYPE_DEFAULTS.hline) set('.project .lead', `line-height: ${state.hline};`);
    if (state.bsize !== 1) set('.project .row-section .prose, .project .row-split .prose', `font-size: calc(${OWN.text} * ${state.bsize});`);
    if (state.bline !== TYPE_DEFAULTS.bline) set('.project .row-section .prose, .project .row-split .prose', `line-height: ${state.bline};`);
    const d = display(h);
    if (d) set('.title-mask text, .cta-title, .cta-mail, .category-title', `font-family: ${d.family}; font-weight: ${d.weight}; ${d.extra}`);
    return rules.join('\n');
  }

  // A line at the foot of the screen, a moment, when T or B changes a face with the panel shut.
  let toast = null, toastTimer = 0;
  function say(text) {
    if (pane && !pane.hidden) return;
    toast ??= Object.assign(document.createElement('div'), { className: 'type-tester-toast' });
    toast.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:100;padding:8px 10px;background:var(--ground,#1f1915);color:var(--ink,#f3efe8);border:1px solid var(--line,#3a3530);font:12px/1.4 "Neue Montreal",sans-serif;white-space:pre;pointer-events:none';
    toast.textContent = text;
    document.body.append(toast);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.remove(), 2200);
  }

  const changed = () => { if (quiet) return; save(); apply(); };
  async function step(role, dir) {
    const { data } = await load();
    const ids = ['own', ...data[role].map((c) => c.id)];
    const i = Math.max(0, ids.indexOf(state[role]));
    state[role] = ids[(i + dir + ids.length) % ids.length];
    changed();
    const at = ids.indexOf(state[role]);
    const c = data[role][at - 1];
    say(`${role === 'heading' ? 'Heading' : 'Body'}: ${c ? `${pad(at)} ${c.name}` : "the page's own"}`);
  }
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || typing(e)) return;
    const k = e.key.toLowerCase();
    if (k === 't') step('heading', e.shiftKey ? -1 : 1);
    if (k === 'b') step('body', e.shiftKey ? -1 : 1);
  });

  // A link to the page as it is set now.
  function link(base = location.origin + location.pathname, names = QUERY) {
    const q = new URLSearchParams();
    for (const [k, name] of Object.entries(names)) if (state[k] !== TYPE_DEFAULTS[k]) q.set(name, state[k]);
    return `${base}${String(q) ? `?${q}` : ''}`;
  }

  function reset() {
    Object.assign(state, TYPE_DEFAULTS);
    try { localStorage.removeItem(STORE); } catch {}
    sync();
    apply();
  }

  async function addFolder(p) {
    pane = p;
    const { data } = await load();
    const options = (role) => ({ "the page's own": 'own', ...Object.fromEntries(data[role].map((c, i) => [`${pad(i + 1)} ${c.name}${c.trial ? ' (trial)' : ''}`, c.id])) });
    const f = p.addFolder({ title: 'Typography' });
    f.addBinding(state, 'heading', { label: 'heading (T)', options: options('heading') }).on('change', changed);
    f.addBinding(state, 'body', { label: 'body (B)', options: options('body') }).on('change', changed);
    f.addBinding(state, 'title', { label: 'title', options: TITLES }).on('change', changed);
    f.addBinding(state, 'source', { label: 'fonts', options: { library: 'library', 'Google alternatives': 'google' } }).on('change', changed);
    const percent = { format: (v) => `${Math.round(v * 100)} %` };
    f.addBinding(state, 'hsize', { label: 'heading size', min: 0.5, max: 2, step: 0.01, ...percent }).on('change', changed);
    f.addBinding(state, 'hline', { label: 'heading line height', min: 0.8, max: 1.6, step: 0.01 }).on('change', changed);
    f.addBinding(state, 'bsize', { label: 'body size', min: 0.5, max: 2, step: 0.01, ...percent }).on('change', changed);
    f.addBinding(state, 'bline', { label: 'body line height', min: 0.9, max: 2, step: 0.01 }).on('change', changed);
    f.addBinding(info, 'showing', { readonly: true, multiline: true, rows: 2, label: 'showing' });
    f.addButton({ title: "Take /typography's pairing" }).on('click', () => {
      let t = null;
      try { t = JSON.parse(localStorage.getItem(PAIRING) || 'null'); } catch {}
      if (!t) return say('No pairing set on /typography yet.');
      // Its sizes and line heights as they stand to its own, set to the page's own.
      const rel = (v, round, own) => +((v / round) * own).toFixed(2);
      Object.assign(state, {
        heading: t.heading, body: t.body, source: t.source === 'google' ? 'google' : 'library',
        hsize: rel(t.hs, ROUND.hs, 1), bsize: rel(t.bs, ROUND.bs, 1),
        hline: rel(t.hl, ROUND.hl, TYPE_DEFAULTS.hline), bline: rel(t.bl, ROUND.bl, TYPE_DEFAULTS.bline),
      });
      sync();
      changed();
    });
    f.addButton({ title: 'Open in /typography' }).on('click', () => {
      const q = new URLSearchParams();
      if (state.heading !== 'own') q.set('h', state.heading);
      if (state.body !== 'own') q.set('b', state.body);
      q.set('src', state.source);
      window.open(`/typography/?${q}`, '_blank', 'noopener');
    });
    f.addButton({ title: 'Copy link' }).on('click', () => navigator.clipboard?.writeText(link()));
    f.addButton({ title: 'Reset typography' }).on('click', reset);
  }

  apply();
  return { addFolder, reset, state };
}
