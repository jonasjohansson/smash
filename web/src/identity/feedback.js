// Feedback on the identity page: a rating (1–5) and a comment per section,
// a like or a dislike on any single piece (a wordmark, a symbol, the motion…),
// and a drawer that gathers it all as plain text to copy and paste into a
// conversation. Kept in this browser (localStorage) as you go; nothing is sent
// anywhere. Not shown to automated browsers (the screenshot scripts), so the
// pictures the builders judge stay clean.

const STORE = 'smash-identity-feedback';

function load() {
  try { return JSON.parse(localStorage.getItem(STORE) || '{}'); } catch { return {}; }
}
function save(data) {
  try { localStorage.setItem(STORE, JSON.stringify(data)); } catch {}
}

const STYLE = `
.fb-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 16px; margin: 8px 0 18px; padding: 10px 12px; border: 1px solid var(--line, #2a2622); font-size: 13px; color: var(--dim, #8d877f); }
.fb-bar .fb-stars { display: flex; gap: 4px; }
.fb-bar .fb-stars button { width: 28px; height: 28px; border: 1px solid #3a3530; background: none; color: #8d877f; font-family: inherit; font-size: 13px; line-height: 1; cursor: pointer; border-radius: 50%; }
.fb-bar .fb-stars button.on { background: #f7be04; border-color: #f7be04; color: #111; }
.fb-bar textarea { flex: 1 1 320px; min-height: 34px; height: 34px; resize: vertical; background: #141210; color: #efece6; border: 1px solid #3a3530; padding: 7px 9px; font-family: inherit; font-size: 14px; line-height: 1.35; }
.fb-bar .fb-tags { flex-basis: 100%; display: flex; flex-wrap: wrap; gap: 6px; }
.fb-bar .fb-tags span { padding: 2px 8px; border-radius: 10px; background: #211d1a; color: #cfc8bd; font-size: 12px; }
.fb-bar .fb-tags span.like { background: #2c3a22; color: #cfe8b8; }
.fb-bar .fb-tags span.dislike { background: #3a2222; color: #f0b8b8; }
.fb-bar .fb-tags span button { background: none; border: 0; color: inherit; cursor: pointer; opacity: 0.6; padding: 0 0 0 4px; }
.fb-piece { position: absolute; top: 8px; right: 8px; z-index: 5; display: flex; gap: 4px; opacity: 0; transition: opacity 0.15s; }
.fb-host:hover > .fb-piece, .fb-piece.set { opacity: 1; }
.lab-body > .fb-piece { left: 8px; right: auto; }
@media (hover: none) { .fb-piece { opacity: 0.85; } }
.fb-piece button { width: 30px; height: 30px; border-radius: 50%; border: 0; cursor: pointer; font: 15px/1 -apple-system, sans-serif; background: rgba(20, 18, 16, 0.78); color: #efece6; backdrop-filter: blur(4px); }
.fb-piece button.on.like { background: #6da544; color: #fff; }
.fb-piece button.on.dislike { background: #c8553d; color: #fff; }
.fb-fab { position: fixed; right: 18px; bottom: 18px; z-index: 50; padding: 12px 16px; border-radius: 24px; border: 0; background: #f7be04; color: #111; font: 600 14px/1 -apple-system, sans-serif; cursor: pointer; box-shadow: 0 6px 24px rgba(0, 0, 0, 0.35); }
.fb-drawer { position: fixed; right: 18px; bottom: 70px; z-index: 50; width: min(520px, calc(100vw - 36px)); max-height: 70vh; display: none; flex-direction: column; gap: 10px; padding: 14px; background: #171513; border: 1px solid #3a3530; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5); }
.fb-drawer.open { display: flex; }
.fb-drawer textarea { flex: 1; min-height: 260px; background: #0e0c0b; color: #efece6; border: 1px solid #3a3530; padding: 10px; font: 12.5px/1.45 ui-monospace, Menlo, monospace; resize: vertical; }
.fb-drawer .fb-row { display: flex; gap: 8px; justify-content: space-between; align-items: center; }
.fb-drawer button { padding: 8px 12px; border: 1px solid #3a3530; background: #211d1a; color: #efece6; cursor: pointer; font-family: inherit; font-size: 13px; }
.fb-drawer button.primary { background: #f7be04; border-color: #f7be04; color: #111; font-weight: 600; }
.fb-drawer .fb-hint { font-size: 12px; color: #8d877f; }
`;

/** The section's name as the page shows it: "Original", "The modular mark". */
const sectionName = (section) => section.querySelector('.ch-name')?.textContent.trim() ?? section.id;

/** The pieces in a section a like or a dislike can go on, each with a name. */
function pieces(section) {
  const out = [];
  const add = (el, name) => { if (el && !el.dataset.fbPiece) out.push([el, name]); };
  add(section.querySelector(':scope > .stage'), 'motion');
  const panels = [...section.querySelectorAll(':scope > .row .panel')];
  for (const p of panels) {
    const label = p.querySelector('figcaption')?.textContent.trim().toLowerCase() ?? 'panel';
    const ground = p.classList.contains('ground-paper') ? ' (on paper)' : p.classList.contains('ground-ink') ? ' (on ink)' : '';
    add(p, label.startsWith('wordmark') ? `wordmark${ground}` : label.startsWith('favicon') ? 'favicon' : label);
  }
  // On the figure, not the live element inside it: that is emptied whenever the page lets it go.
  add(section.querySelector(':scope > .app'), 'application');
  add(section.querySelector(':scope > [data-specimen]'), 'type');
  add(section.querySelector(':scope .lab-body'), 'the tool');
  return out;
}

export function mountFeedback(page) {
  if (navigator.webdriver) return; // screenshot scripts: leave the page as the builders see it
  const data = load();
  const style = document.createElement('style');
  style.textContent = STYLE;
  document.head.appendChild(style);

  const entry = (id, name) => {
    data[id] ??= { name, rating: 0, comment: '', likes: [], dislikes: [] };
    data[id].name = name;
    return data[id];
  };
  const bars = new Map();

  function renderTags(id) {
    const bar = bars.get(id);
    if (!bar) return;
    const e = data[id];
    const tags = bar.querySelector('.fb-tags');
    tags.innerHTML = [...e.likes.map((p) => ['like', p]), ...e.dislikes.map((p) => ['dislike', p])]
      .map(([kind, p]) => `<span class="${kind}">${kind === 'like' ? '♥' : '✕'} ${p}<button type="button" data-kind="${kind}" data-piece="${p}" aria-label="Remove">×</button></span>`).join('');
  }

  function attach(section) {
    if (!section.id || section.dataset.fb || section.id === 'compare') return;
    section.dataset.fb = '1';
    const id = section.id;
    const e = entry(id, sectionName(section));
    const bar = document.createElement('div');
    bar.className = 'fb-bar';
    bar.innerHTML = `<span>Your take</span><div class="fb-stars">${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-n="${n}" aria-label="${n} of 5">${n}</button>`).join('')}</div>`
      + `<textarea placeholder="A comment on ${e.name}…" rows="1"></textarea><div class="fb-tags"></div>`;
    const head = section.querySelector(':scope > .ch-head');
    (head ?? section.firstElementChild)?.after(bar);
    bars.set(id, bar);
    const stars = [...bar.querySelectorAll('.fb-stars button')];
    const paint = () => stars.forEach((b) => b.classList.toggle('on', Number(b.dataset.n) <= e.rating));
    paint();
    stars.forEach((b) => b.addEventListener('click', () => { e.rating = e.rating === Number(b.dataset.n) ? 0 : Number(b.dataset.n); paint(); save(data); refresh(); }));
    const ta = bar.querySelector('textarea');
    ta.value = e.comment;
    ta.addEventListener('input', () => { e.comment = ta.value; save(data); refresh(); });
    bar.querySelector('.fb-tags').addEventListener('click', (ev) => {
      const btn = ev.target.closest('button[data-piece]');
      if (!btn) return;
      const list = btn.dataset.kind === 'like' ? e.likes : e.dislikes;
      list.splice(list.indexOf(btn.dataset.piece), 1);
      save(data); renderTags(id); refreshPieces(section); refresh();
    });
    renderTags(id);
    for (const [el, name] of pieces(section)) {
      el.dataset.fbPiece = name;
      if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
      el.classList.add('fb-host');
      const ctl = document.createElement('div');
      ctl.className = 'fb-piece';
      ctl.innerHTML = `<button type="button" class="like" title="Like the ${name}">♥</button><button type="button" class="dislike" title="Don't like the ${name}">✕</button>`;
      el.appendChild(ctl);
      const toggle = (kind) => {
        const [mine, other] = kind === 'like' ? [e.likes, e.dislikes] : [e.dislikes, e.likes];
        if (mine.includes(name)) mine.splice(mine.indexOf(name), 1);
        else { mine.push(name); if (other.includes(name)) other.splice(other.indexOf(name), 1); }
        save(data); renderTags(id); refreshPieces(section); refresh();
      };
      ctl.querySelector('.like').addEventListener('click', (ev) => { ev.stopPropagation(); toggle('like'); });
      ctl.querySelector('.dislike').addEventListener('click', (ev) => { ev.stopPropagation(); toggle('dislike'); });
    }
    refreshPieces(section);
  }

  function refreshPieces(section) {
    const e = data[section.id];
    for (const el of section.querySelectorAll('[data-fb-piece]')) {
      const name = el.dataset.fbPiece;
      const ctl = el.querySelector(':scope > .fb-piece');
      if (!ctl) continue;
      ctl.querySelector('.like').classList.toggle('on', e.likes.includes(name));
      ctl.querySelector('.dislike').classList.toggle('on', e.dislikes.includes(name));
      ctl.classList.toggle('set', e.likes.includes(name) || e.dislikes.includes(name));
    }
  }

  // The drawer: everything, as text to paste.
  const fab = document.createElement('button');
  fab.className = 'fb-fab';
  fab.type = 'button';
  const drawer = document.createElement('div');
  drawer.className = 'fb-drawer';
  drawer.innerHTML = `<div class="fb-row"><strong>Feedback</strong><span class="fb-hint">Copy, then paste it into the conversation.</span></div>`
    + `<textarea readonly></textarea>`
    + `<div class="fb-row"><button type="button" class="clear">Clear all</button><span><button type="button" class="close">Close</button> <button type="button" class="primary copy">Copy</button></span></div>`;
  document.body.append(fab, drawer);
  const out = drawer.querySelector('textarea');

  const order = () => [...page.querySelectorAll('section[id]')].map((s) => s.id).filter((id) => data[id]);
  function text() {
    const stamp = new Date().toLocaleString('sv-SE').slice(0, 16); // local time, as 2026-09-28 18:27
    const lines = [`SMASH identity feedback (${stamp})`, ''];
    for (const id of order()) {
      const e = data[id];
      if (!e.rating && !e.comment.trim() && !e.likes.length && !e.dislikes.length) continue;
      lines.push(`${e.name}${e.rating ? ` : ${e.rating}/5` : ''}`);
      if (e.likes.length) lines.push(`  like: ${e.likes.join(', ')}`);
      if (e.dislikes.length) lines.push(`  don't like: ${e.dislikes.join(', ')}`);
      if (e.comment.trim()) lines.push(...e.comment.trim().split('\n').map((l) => `  "${l}"`));
      lines.push('');
    }
    return lines.length > 2 ? lines.join('\n').trim() : 'Nothing yet: rate a section, comment, or ♥ / ✕ a piece.';
  }
  function refresh() {
    const n = Object.values(data).filter((e) => e.rating || e.comment.trim() || e.likes.length || e.dislikes.length).length;
    fab.textContent = n ? `Feedback (${n})` : 'Feedback';
    if (drawer.classList.contains('open')) out.value = text();
  }
  fab.addEventListener('click', () => { drawer.classList.toggle('open'); out.value = text(); });
  drawer.querySelector('.close').addEventListener('click', () => drawer.classList.remove('open'));
  drawer.querySelector('.copy').addEventListener('click', async () => {
    out.value = text();
    try { await navigator.clipboard.writeText(out.value); } catch { out.select(); document.execCommand('copy'); }
    const b = drawer.querySelector('.copy');
    b.textContent = 'Copied';
    setTimeout(() => { b.textContent = 'Copy'; }, 1400);
  });
  drawer.querySelector('.clear').addEventListener('click', () => {
    for (const k of Object.keys(data)) delete data[k];
    save(data);
    for (const s of page.querySelectorAll('section[data-fb]')) {
      const e = entry(s.id, sectionName(s));
      const bar = bars.get(s.id);
      bar?.querySelectorAll('.fb-stars button').forEach((b) => b.classList.remove('on'));
      if (bar) bar.querySelector('textarea').value = '';
      renderTags(s.id);
      refreshPieces(s);
      void e;
    }
    refresh();
  });

  // Sections arrive over time (the live tools load on their own): attach to each as it comes.
  const scan = () => page.querySelectorAll('section[id]').forEach(attach);
  scan();
  new MutationObserver(scan).observe(page, { childList: true });
  refresh();
}
