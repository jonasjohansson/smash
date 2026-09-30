// Feedback on the typography round: a rating (1–5) and a comment on every
// candidate and on every pairing tried, and free notes; a drawer gathers it all
// as plain text (best rated first) to copy and paste into a conversation. Kept
// in this browser (localStorage) as you go; nothing is sent anywhere.

const STORE = 'smash-typography-feedback';

function load() {
  try { return JSON.parse(localStorage.getItem(STORE) || '{}'); } catch { return {}; }
}
let data = load();
function save() {
  try { localStorage.setItem(STORE, JSON.stringify(data)); } catch {}
}
const esc = (s = '') => String(s).replace(/[<&"]/g, (c) => ({ '<': '&lt;', '&': '&amp;', '"': '&quot;' })[c]);

/** The rating and comment row for key (role:id, or pair:h+b+d). */
export function row(key) {
  const { rating = 0, comment = '' } = data[key] ?? {};
  return `<div class="fb" data-key="${esc(key)}">
    <span class="fb-stars">${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-n="${n}" class="${n <= rating ? 'on' : ''}" aria-label="Rate ${n}">${n}</button>`).join('')}</span>
    <input type="text" placeholder="Comment" value="${esc(comment)}" aria-label="Comment">
  </div>`;
}

const STYLE = `
.fb { display: flex; align-items: center; gap: 10px; padding: 8px 10px; background: color-mix(in srgb, var(--ground) 70%, #000); }
.fb-stars { display: flex; gap: 3px; flex: none; }
.fb-stars button { width: 24px; height: 24px; border-radius: 50%; border: 1px solid #3a3530; background: none; color: #8d877f; font: 12px/1 "Neue Montreal", sans-serif; cursor: pointer; padding: 0; }
.fb-stars button.on { background: var(--accent); border-color: var(--accent); color: #111; }
.fb input { flex: 1; min-width: 0; background: transparent; border: 0; border-bottom: 1px solid #3a3530; color: var(--ink); font: 13px/1.3 "Neue Montreal", sans-serif; padding: 4px 0; }
.fb input:focus { outline: none; border-bottom-color: var(--accent); }
.fb-fab { position: fixed; right: 18px; bottom: 18px; z-index: 50; padding: 12px 16px; border-radius: 24px; border: 0; background: var(--accent); color: #111; font: 500 14px/1 "Neue Montreal", sans-serif; cursor: pointer; box-shadow: 0 6px 24px rgba(0, 0, 0, 0.4); }
.fb-drawer { position: fixed; right: 18px; bottom: 70px; z-index: 50; width: min(560px, calc(100vw - 36px)); max-height: 76vh; display: none; flex-direction: column; gap: 10px; padding: 14px; background: #171513; border: 1px solid #3a3530; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5); }
.fb-drawer.open { display: flex; }
.fb-drawer label { font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; color: #8d877f; }
.fb-drawer textarea { background: #0e0c0b; color: #efece6; border: 1px solid #3a3530; padding: 10px; resize: vertical; }
.fb-drawer .notes { min-height: 70px; font: 14px/1.4 "Neue Montreal", sans-serif; }
.fb-drawer .out { flex: 1; min-height: 220px; font: 12.5px/1.45 ui-monospace, Menlo, monospace; }
.fb-drawer .fb-row { display: flex; gap: 8px; justify-content: space-between; align-items: center; }
.fb-drawer button { padding: 8px 12px; border: 1px solid #3a3530; background: #211d1a; color: #efece6; cursor: pointer; font: 13px "Neue Montreal", sans-serif; }
.fb-drawer button.primary { background: var(--accent); border-color: var(--accent); color: #111; }
.fb-drawer .hint { font-size: 12px; color: #8d877f; }
`;

/**
 * Mount the drawer and listen to every row on the page. describe(key) gives a
 * row's name ({ group, name, link }); a key it doesn't know is left out.
 */
export function mountFeedback({ describe, groups }) {
  const style = document.createElement('style');
  style.textContent = STYLE;
  document.head.appendChild(style);
  document.body.insertAdjacentHTML('beforeend', `
    <button type="button" class="fb-fab">Feedback</button>
    <div class="fb-drawer" role="dialog" aria-label="Feedback">
      <label>Notes<textarea class="notes" placeholder="Anything about the round as a whole"></textarea></label>
      <label>All of it, to paste<textarea class="out" readonly></textarea></label>
      <div class="fb-row"><span class="hint">Kept in this browser as you go.</span><span><button type="button" class="clear">Clear all</button> <button type="button" class="primary copy">Copy</button></span></div>
    </div>`);
  const fab = document.querySelector('.fb-fab');
  const drawer = document.querySelector('.fb-drawer');
  const notes = drawer.querySelector('.notes');
  const out = drawer.querySelector('.out');
  notes.value = data.notes ?? '';

  const stars = (n) => (n ? '★'.repeat(n) + '☆'.repeat(5 - n) : '');
  function text() {
    const lines = [`SMASH typography feedback, ${new Date().toISOString().slice(0, 10)}`];
    for (const group of groups) {
      const items = Object.entries(data)
        .filter(([k, v]) => k !== 'notes' && (v.rating || v.comment) && describe(k)?.group === group)
        .map(([k, v]) => ({ ...describe(k), ...v }))
        .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
      if (!items.length) continue;
      lines.push('', group);
      for (const it of items) lines.push(`- ${it.name}${it.rating ? ` ${stars(it.rating)}` : ''}${it.comment ? ` — ${it.comment}` : ''}${it.link ? `  (${it.link})` : ''}`);
    }
    if (data.notes?.trim()) lines.push('', 'Notes', data.notes.trim());
    return lines.length > 1 ? lines.join('\n') : 'Nothing yet: rate or comment on a font or a pairing.';
  }
  const refresh = () => { out.value = text(); fab.textContent = `Feedback (${Object.keys(data).filter((k) => k !== 'notes' && (data[k].rating || data[k].comment)).length})`; };

  document.addEventListener('click', (e) => {
    const b = e.target.closest('.fb-stars button');
    if (!b) return;
    e.stopPropagation();
    const key = b.closest('.fb').dataset.key;
    const n = Number(b.dataset.n);
    const cur = data[key] ?? {};
    data[key] = { ...cur, rating: cur.rating === n ? 0 : n };
    b.parentElement.querySelectorAll('button').forEach((x) => x.classList.toggle('on', Number(x.dataset.n) <= data[key].rating));
    save();
    refresh();
  }, true);
  document.addEventListener('input', (e) => {
    const input = e.target.closest('.fb input');
    if (input) {
      const key = input.closest('.fb').dataset.key;
      data[key] = { ...(data[key] ?? {}), comment: input.value };
    } else if (e.target === notes) data.notes = notes.value;
    else return;
    save();
    refresh();
  });
  fab.addEventListener('click', () => { refresh(); drawer.classList.toggle('open'); });
  drawer.querySelector('.copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(out.value); } catch { out.select(); document.execCommand('copy'); }
    drawer.querySelector('.copy').textContent = 'Copied';
    setTimeout(() => { drawer.querySelector('.copy').textContent = 'Copy'; }, 1400);
  });
  // Clear all takes a second click, so a slip doesn't lose the round.
  const clear = drawer.querySelector('.clear');
  clear.addEventListener('click', () => {
    if (!Object.keys(data).length) return;
    if (!clear.dataset.armed) {
      clear.dataset.armed = '1';
      clear.textContent = 'Click again to clear';
      setTimeout(() => { delete clear.dataset.armed; clear.textContent = 'Clear all'; }, 3000);
      return;
    }
    delete clear.dataset.armed;
    clear.textContent = 'Clear all';
    data = {};
    save();
    notes.value = '';
    document.querySelectorAll('.fb').forEach((el) => { el.querySelectorAll('button').forEach((x) => x.classList.remove('on')); el.querySelector('input').value = ''; });
    refresh();
  });
  refresh();
}
