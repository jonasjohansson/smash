// The type tester: the typography round's faces tried on the site itself, on
// every page, with the site's real text (Jonas, 2026-09-30: "integrate the
// text tool gui on the website so we can experiment with real data"). main.js
// starts it on every page; a small Aa button (bottom left) opens its panel,
// and T and B step through the heading and body faces (Shift: back). Until a
// face is chosen, the page keeps its own type.
//
// What goes where: the heading face takes every place the site's display face
// (Anton) has now, the big titles (the studio's statement, the pillars, an
// offering's title, "Let's work together" and the address under it) and the
// titles cut out of the heroes; the SMASH typeface can take them too. The body
// face takes everything else, the site's large texts (--serif: the
// introductions, the texts, the offering's links; Neue Montreal since
// 2026-10-01, Season Mix before) and its sans (Neue Montreal: labels, credits,
// the rest). Sizes and line heights are the site's own, scaled (100 %): the
// rules are read from the site's stylesheet, so a new one is taken as it comes.
//
// From the library or as the Google alternatives, as on /typography; a library
// face that is not here stands in as its Google alternative, and says so.
// Kept in this browser (only what differs from the page's own), so it carries
// from page to page; a link carries one too (Copy link: ?h=&b=&src=&hs=&hl=&bs=
// &bl=&caps=), shown as it is and not kept. The pairing on the screen can be
// rated, and the rating joins /typography's feedback drawer ("On the site").

import { candidates, googleHref, libraryHere, face } from './faces.js';

const STORE = 'smash-type-tester-2'; // the first version's line heights were absolute: not carried over
const OPEN = 'smash-type-tester-open';
const PAIRING = 'smash-typography-pairing'; // left by typography.js
const FEEDBACK = 'smash-typography-feedback'; // feedback.js's, read on /typography
export const TYPE_DEFAULTS = { heading: 'own', body: 'own', source: 'library', hsize: 1, hline: 1, bsize: 1, bline: 1, caps: true };
const QUERY = { heading: 'h', body: 'b', source: 'src', hsize: 'hs', hline: 'hl', bsize: 'bs', bline: 'bl', caps: 'caps' };
// /typography's own sizes and line heights, to take its pairing relative to them.
const ROUND = { hs: 4.2, hl: 1.05, bs: 17, bl: 1.55 };
// The SMASH typeface, as /typography sets it.
const SMASH = { family: "'SMASH',sans-serif", weight: 500, extra: 'font-variation-settings: "wght" 500, "wdth" 100, "HGHT" 471;', name: 'SMASH typeface', from: 'site' };

const pad = (n) => String(n).padStart(2, '0');
const f2 = (n) => +n.toFixed(3);
const typing = (e) => e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement || e.target.isContentEditable;
const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback; } catch { return fallback; } };
const write = (key, v) => { try { localStorage.setItem(key, JSON.stringify(v)); } catch {} };

function fromQuery() {
  const q = new URLSearchParams(location.search);
  const s = {};
  for (const [k, name] of Object.entries(QUERY)) {
    if (!q.has(name)) continue;
    const v = q.get(name);
    s[k] = typeof TYPE_DEFAULTS[k] === 'number' ? Number(v) : typeof TYPE_DEFAULTS[k] === 'boolean' ? v !== '0' && v !== 'false' : v;
    if (typeof s[k] === 'number' && !Number.isFinite(s[k])) delete s[k];
  }
  return s;
}

/**
 * The site's type as its stylesheet sets it: every rule in the display face
 * and every one in the serif, with its size and line height ({ sel, size, lh }).
 * The SMASH typeface's own page keeps its type.
 */
function siteRules() {
  const out = { display: [], serif: [] };
  const walk = (rules) => {
    for (const r of rules) {
      if (r.cssRules?.length && !(r instanceof CSSStyleRule)) { walk(r.cssRules); continue; }
      if (!(r instanceof CSSStyleRule) || /typeface/.test(r.selectorText)) continue;
      const m = r.cssText.match(/font:\s*(?:\d{3}\s+)?(.+?)\s*\/\s*([\d.]+)\s+var\(--(display|serif)\)/);
      if (m) out[m[3]].push({ sel: r.selectorText, size: m[1], lh: Number(m[2]) });
    }
  };
  for (const sheet of document.styleSheets) {
    try { walk(sheet.cssRules); } catch { /* another origin's: not the site's */ }
  }
  return out;
}

const STYLE = `
.tt-fab { position: fixed; left: 10px; bottom: 10px; z-index: 120; width: 32px; height: 32px; border-radius: 50%; border: 1px solid #3a3530; background: #171513; color: #efece6; font: 400 13px/1 "Neue Montreal", "Helvetica Neue", Arial, sans-serif; cursor: pointer; opacity: 0.55; }
.tt-fab:hover, .tt-fab[aria-expanded="true"] { opacity: 1; }
.tt-panel { position: fixed; left: 10px; bottom: 50px; z-index: 120; width: min(310px, calc(100vw - 24px)); max-height: calc(100vh - 80px); overflow: auto; display: grid; gap: 10px; padding: 14px; background: #171513; color: #efece6; border: 1px solid #3a3530; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45); font: 400 13px/1.35 "Neue Montreal", "Helvetica Neue", Arial, sans-serif; text-transform: none; letter-spacing: 0; }
.tt-panel[hidden] { display: none; }
.tt-panel * { box-sizing: border-box; font-family: inherit; }
.tt-panel .tt-l { display: grid; gap: 4px; }
.tt-panel .tt-k { font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; color: #8d877f; display: flex; justify-content: space-between; }
.tt-panel .tt-k output { color: #efece6; font-variant-numeric: tabular-nums; letter-spacing: 0; }
.tt-panel select, .tt-panel input[type="text"] { width: 100%; background: #0e0c0b; color: #efece6; border: 1px solid #3a3530; padding: 6px 8px; font-size: 13px; }
.tt-panel input[type="range"] { width: 100%; accent-color: #efece6; margin: 0; }
.tt-panel .tt-seg { display: flex; gap: 6px; }
.tt-panel button { background: none; border: 1px solid #3a3530; color: #8d877f; padding: 5px 9px; font-size: 12px; cursor: pointer; }
.tt-panel button[aria-pressed="true"], .tt-panel button:hover { color: #efece6; border-color: #efece6; }
.tt-panel .tt-two { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.tt-panel .tt-check { display: flex; gap: 8px; align-items: center; color: #efece6; }
.tt-panel .tt-show { color: #8d877f; font-size: 12px; white-space: pre-line; }
.tt-panel .tt-rate { display: grid; gap: 6px; padding-top: 10px; border-top: 1px solid #3a3530; }
.tt-panel .tt-stars { display: flex; gap: 4px; }
.tt-panel .tt-stars button { width: 26px; height: 26px; border-radius: 50%; padding: 0; }
.tt-panel .tt-stars button.on { background: #efece6; color: #111; border-color: #efece6; }
.tt-panel .tt-acts { display: flex; flex-wrap: wrap; gap: 6px; }
.tt-panel .tt-keys { margin: 0; color: #8d877f; font-size: 11px; }
.tt-toast { position: fixed; left: 50px; bottom: 12px; z-index: 120; padding: 8px 10px; background: #171513; color: #efece6; border: 1px solid #3a3530; font: 400 12px/1.4 "Neue Montreal", sans-serif; white-space: pre; pointer-events: none; }
`;

/**
 * Start the tester on this page. refit() sets the heroes' title masks again
 * (feed.js sizes them by their ink, which depends on the face). Returns { reset, state }.
 */
export function start({ refit = () => {} } = {}) {
  const linked = fromQuery();
  const state = { ...TYPE_DEFAULTS, ...(Object.keys(linked).length ? linked : read(STORE, {})) };
  const save = () => write(STORE, Object.fromEntries(Object.entries(state).filter(([k, v]) => v !== TYPE_DEFAULTS[k])));
  const untouched = () => Object.entries(TYPE_DEFAULTS).every(([k, v]) => k === 'source' || state[k] === v);
  const rules = siteRules();

  const style = document.createElement('style');
  style.id = 'type-tester';
  document.head.append(style);
  document.head.append(Object.assign(document.createElement('style'), { textContent: STYLE }));

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
  // Google alternatives: a stylesheet for each choice that needs one, once; resolves when it is in.
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

  // The rules, only for what differs from the page's own.
  function css(h, b) {
    const out = [];
    const display = rules.display.map((r) => r.sel).join(', ');
    const serif = rules.serif.map((r) => r.sel).join(', ');
    if (h) {
      out.push(`:root { --display: ${h.family}; }`);
      out.push(`${display}, .title-mask text { font-family: ${h.family}; font-weight: ${h.weight}; ${h.extra} }`);
    }
    if (!state.caps && display) out.push(`${display} { text-transform: none; }`);
    for (const r of rules.display) {
      const d = [];
      if (state.hsize !== 1) d.push(`font-size: calc(${r.size} * ${state.hsize});`);
      if (state.hline !== 1) d.push(`line-height: ${f2(r.lh * state.hline)};`);
      if (d.length) out.push(`${r.sel} { ${d.join(' ')} }`);
    }
    if (b) {
      out.push(`:root { --font: ${b.family}; --serif: ${b.family}; }`);
      out.push(`body${serif ? `, ${serif}` : ''} { font-weight: ${b.weight}; ${b.extra} }`);
    }
    for (const r of rules.serif) {
      const d = [];
      if (state.bsize !== 1) d.push(`font-size: calc(${r.size} * ${state.bsize});`);
      if (state.bline !== 1) d.push(`line-height: ${f2(r.lh * state.bline)};`);
      if (d.length) out.push(`${r.sel} { ${d.join(' ')} }`);
    }
    return out.join('\n');
  }

  let runs = 0;
  let fitted = 'own'; // the face the title masks were last sized in
  let showing = "The site's own type.";
  async function apply() {
    const run = ++runs;
    if (untouched()) {
      style.textContent = '';
      showing = "The site's own type.";
      paint();
      if (fitted !== 'own') { fitted = 'own'; refit(); }
      return;
    }
    const { byId } = await load();
    const chosen = { heading: byId.heading[state.heading] ?? null, body: byId.body[state.body] ?? null };
    const picked = [chosen.heading, chosen.body].filter(Boolean);
    if (state.source === 'library') await library(picked);
    if (run !== runs) return;
    const h = state.heading === 'smash' ? SMASH : chosen.heading && face(chosen.heading, state.source, 'heading', here);
    const b = chosen.body && face(chosen.body, state.source, 'body', here);
    const googleIn = google(['heading', 'body'].filter((role) => ({ heading: h, body: b })[role]?.from === 'google').map((role) => chosen[role]));
    style.textContent = css(h, b);
    const name = (x, c) => (x ? `${x.name}${x.standIn ? ` (for ${c.name}, not here)` : x.from === 'google' ? ' (Google)' : ''}` : "the site's own");
    showing = `Heading: ${name(h, chosen.heading)}\nBody: ${name(b, chosen.body)}`;
    paint();
    // The title masks are sized by their letters' ink: again, once their face is in.
    const key = h ? `${h.weight} ${h.family}` : 'own';
    if (key === fitted) return;
    if (h) await googleIn.then(() => document.fonts.load(`${h.weight} 100px ${h.family}`)).catch(() => {});
    if (run !== runs) return;
    fitted = key;
    refit();
  }

  // The panel.
  const fab = Object.assign(document.createElement('button'), { type: 'button', className: 'tt-fab', textContent: 'Aa', title: 'Type (T and B step through the faces)' });
  fab.setAttribute('aria-expanded', 'false');
  const panel = document.createElement('div');
  panel.className = 'tt-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Type tester');
  panel.hidden = true;
  const range = (k, label, min, max) => `<label class="tt-l"><span class="tt-k">${label}<output data-for="${k}"></output></span><input type="range" data-k="${k}" min="${min}" max="${max}" step="0.01"></label>`;
  panel.innerHTML = `
    <label class="tt-l"><span class="tt-k">Heading (T)</span><select data-k="heading"></select></label>
    <label class="tt-l"><span class="tt-k">Body (B)</span><select data-k="body"></select></label>
    <div class="tt-seg" data-k="source"><button type="button" data-v="library">Library</button><button type="button" data-v="google">Google</button></div>
    <div class="tt-two">${range('hsize', 'Heading size', 0.4, 1.6)}${range('hline', 'Line height', 0.7, 1.5)}</div>
    <div class="tt-two">${range('bsize', 'Body size', 0.6, 1.5)}${range('bline', 'Line height', 0.7, 1.6)}</div>
    <label class="tt-check"><input type="checkbox" data-k="caps"> Headings in capitals, as the site sets them</label>
    <div class="tt-show"></div>
    <div class="tt-rate"><span class="tt-k">This pairing, here</span><div class="tt-stars">${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-n="${n}" aria-label="Rate ${n}">${n}</button>`).join('')}</div><input type="text" placeholder="Comment (shows in /typography's feedback)" aria-label="Comment"></div>
    <div class="tt-acts"><button type="button" data-a="link">Copy link</button><button type="button" data-a="round">Open in /typography</button><button type="button" data-a="take">Take /typography's pairing</button><button type="button" data-a="reset">Reset</button></div>
    <p class="tt-keys">T and B step through the faces (Shift goes back). Kept in this browser, from page to page.</p>`;
  document.body.append(panel, fab);
  const $ = (s) => panel.querySelector(s);

  const feedbackKey = () => `site:${state.heading}+${state.body}`;
  function paint() {
    for (const k of ['heading', 'body']) { const sel = $(`select[data-k="${k}"]`); if (sel.options.length) sel.value = state[k]; }
    panel.querySelectorAll('[data-k="source"] button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === state.source)));
    for (const k of ['hsize', 'hline', 'bsize', 'bline']) {
      $(`input[data-k="${k}"]`).value = state[k];
      $(`output[data-for="${k}"]`).textContent = `${Math.round(state[k] * 100)} %`;
    }
    $('input[data-k="caps"]').checked = state.caps;
    $('.tt-show').textContent = showing;
    const fb = read(FEEDBACK, {})[feedbackKey()] ?? {};
    panel.querySelectorAll('.tt-stars button').forEach((b) => b.classList.toggle('on', Number(b.dataset.n) <= (fb.rating ?? 0)));
    const input = $('.tt-rate input');
    if (document.activeElement !== input) input.value = fb.comment ?? '';
  }
  async function fill() {
    const { data } = await load();
    const opts = (role, own) => [`<option value="own">${own}</option>`, ...(role === 'heading' ? ['<option value="smash">SMASH typeface</option>'] : []),
      ...data[role].map((c, i) => `<option value="${c.id}">${pad(i + 1)} ${c.name}${c.trial ? ' (trial)' : ''}${c.r1 ? ` ${'★'.repeat(c.r1)}` : ''}</option>`)].join('');
    $('select[data-k="heading"]').innerHTML = opts('heading', "The site's own (Anton)");
    $('select[data-k="body"]').innerHTML = opts('body', "The site's own (Neue Montreal)");
    paint();
  }
  const setOpen = (open) => {
    panel.hidden = !open;
    fab.setAttribute('aria-expanded', String(open));
    write(OPEN, open);
    if (open) fill();
  };
  fab.addEventListener('click', () => setOpen(panel.hidden));
  const changed = () => { save(); apply(); };
  panel.addEventListener('input', (e) => {
    const k = e.target.dataset?.k;
    if (k === 'caps') state.caps = e.target.checked;
    else if (k === 'heading' || k === 'body') state[k] = e.target.value;
    else if (k) state[k] = Number(e.target.value);
    else if (e.target.closest('.tt-rate')) {
      const all = read(FEEDBACK, {});
      all[feedbackKey()] = { ...(all[feedbackKey()] ?? {}), comment: e.target.value };
      write(FEEDBACK, all);
      return;
    } else return;
    changed();
  });
  panel.addEventListener('click', async (e) => {
    const src = e.target.closest('[data-k="source"] button');
    if (src) { state.source = src.dataset.v; changed(); return; }
    const star = e.target.closest('.tt-stars button');
    if (star) {
      const all = read(FEEDBACK, {});
      const cur = all[feedbackKey()] ?? {};
      const n = Number(star.dataset.n);
      all[feedbackKey()] = { ...cur, rating: cur.rating === n ? 0 : n };
      write(FEEDBACK, all);
      paint();
      return;
    }
    const act = e.target.closest('[data-a]')?.dataset.a;
    if (act === 'reset') reset();
    if (act === 'link') { await navigator.clipboard?.writeText(link()).catch(() => {}); say('Link copied.'); }
    if (act === 'round') {
      const q = new URLSearchParams();
      if (!['own', 'smash'].includes(state.heading)) q.set('h', state.heading);
      if (state.body !== 'own') q.set('b', state.body);
      q.set('src', state.source);
      window.open(`/typography/?${q}`, '_blank', 'noopener');
    }
    if (act === 'take') {
      const t = read(PAIRING, null);
      if (!t) { say('No pairing set on /typography yet.'); return; }
      Object.assign(state, {
        heading: t.heading, body: t.body, source: t.source === 'google' ? 'google' : 'library',
        hsize: f2(t.hs / ROUND.hs), hline: f2(t.hl / ROUND.hl), bsize: f2(t.bs / ROUND.bs), bline: f2(t.bl / ROUND.bl),
      });
      changed();
    }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) setOpen(false); });

  // A line by the button, a moment, when T or B changes a face with the panel shut.
  let toast = null, toastTimer = 0;
  function say(text) {
    toast ??= Object.assign(document.createElement('div'), { className: 'tt-toast' });
    toast.textContent = text;
    document.body.append(toast);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.remove(), 2200);
  }
  async function step(role, dir) {
    const { data } = await load();
    const ids = ['own', ...(role === 'heading' ? ['smash'] : []), ...data[role].map((c) => c.id)];
    const i = Math.max(0, ids.indexOf(state[role]));
    state[role] = ids[(i + dir + ids.length) % ids.length];
    changed();
    const c = data[role].find((x) => x.id === state[role]);
    const n = data[role].indexOf(c) + 1;
    if (panel.hidden) say(`${role === 'heading' ? 'Heading' : 'Body'}: ${c ? `${pad(n)} ${c.name}` : state[role] === 'smash' ? 'SMASH typeface' : "the site's own"}`);
  }
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || typing(e)) return;
    const k = e.key.toLowerCase();
    if (k === 't') step('heading', e.shiftKey ? -1 : 1);
    if (k === 'b') step('body', e.shiftKey ? -1 : 1);
  });

  // A link to the page as it is set now.
  function link() {
    const q = new URLSearchParams();
    for (const [k, name] of Object.entries(QUERY)) if (state[k] !== TYPE_DEFAULTS[k]) q.set(name, typeof state[k] === 'boolean' ? (state[k] ? '1' : '0') : state[k]);
    return `${location.origin}${location.pathname}${String(q) ? `?${q}` : ''}`;
  }
  function reset() {
    Object.assign(state, TYPE_DEFAULTS);
    try { localStorage.removeItem(STORE); } catch {}
    apply();
  }

  if (read(OPEN, false)) setOpen(true);
  apply();
  return { reset, state };
}
