// The work index: the filter by offering (?in=slug, kept in the address),
// the two views (Images, the default, and List; the choice is remembered per
// visitor), and the lit room: on a fine pointer, hovering a row of the list
// lights its project's room behind the whole list, after an 80ms intent delay.

const root = document.querySelector('[data-work]');
if (root) {
  const page = document.body;
  const schedule = root.querySelector('[data-schedule]');
  const elevation = root.querySelector('[data-elevation]');
  const status = root.querySelector('[data-work-status]');
  const filters = [...document.querySelectorAll('[data-filters] a')];
  const viewButtons = [...document.querySelectorAll('[data-view]')];
  const lit = document.querySelector('[data-lit]');
  const litLead = document.querySelector('[data-lit-lead]');
  const litPlace = document.querySelector('[data-lit-place]');
  const litCap = document.querySelector('[data-lit-cap]');
  const rooms = lit ? [...lit.querySelectorAll('[data-room]')] : [];
  const rows = [...schedule.querySelectorAll('.srow')];
  const phone = matchMedia('(max-width: 719px)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const KEY = 'smash-work-view';
  let timer = 0;
  let warmed = false;

  /* ---------- Views ---------- */
  const stored = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
  function view(name, remember) {
    const v = name === 'schedule' ? 'schedule' : 'elevation';
    schedule.hidden = v !== 'schedule';
    elevation.hidden = v !== 'elevation';
    viewButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === v)));
    if (remember) { try { localStorage.setItem(KEY, v); } catch { /* this visit only */ } }
    unlight();
  }
  viewButtons.forEach((b) => b.addEventListener('click', () => view(b.dataset.view, true)));
  view(stored() || 'elevation');

  /* ---------- Filter ---------- */
  const names = Object.fromEntries(filters.map((a) => [a.dataset.in, a.firstChild.textContent.trim()]));
  function filter(slug, push) {
    const known = slug && filters.some((a) => a.dataset.in === slug);
    const on = known ? slug : '';
    filters.forEach((a) => a.setAttribute('aria-current', String(a.dataset.in === on)));
    let n = 0;
    for (const list of [schedule, elevation]) {
      const items = [...list.querySelectorAll('[data-item]')];
      const shown = items.filter((li) => !on || li.dataset.in === on);
      const odd = shown.length % 2 === 1;
      items.forEach((li) => { li.hidden = !shown.includes(li); });
      // Images: two to a row; one left over is a hall, and it leads.
      if (list === elevation) shown.forEach((li, i) => li.classList.toggle('hall', odd && i === 0));
      n = shown.length;
    }
    if (status) status.textContent = `${n} ${n === 1 ? 'project' : 'projects'}${on ? `, ${names[on]}` : ''}`;
    if (push) {
      const url = new URL(location.href);
      if (on) url.searchParams.set('in', on); else url.searchParams.delete('in');
      history.replaceState(history.state, '', url);
    }
    unlight();
  }
  filters.forEach((a) => a.addEventListener('click', (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    filter(a.dataset.in, true);
  }));
  filter(new URLSearchParams(location.search).get('in') || '');

  /* ---------- The lit room ---------- */
  const warm = () => {
    if (warmed) return;
    warmed = true;
    rooms.forEach((r) => r.querySelectorAll('img').forEach((img) => { img.loading = 'eager'; }));
  };
  function light(row) {
    if (!lit) return;
    const slug = row.dataset.slug;
    page.classList.add('is-lit');
    rows.forEach((r) => r.classList.toggle('on', r === row));
    rooms.forEach((r) => {
      const on = r.dataset.room === slug;
      r.classList.toggle('on', on);
      // The lit room is the picture that becomes the project's hero.
      r.style.viewTransitionName = on ? `room-${slug}` : '';
    });
    litLead.textContent = row.dataset.lead || '';
    litPlace.textContent = row.dataset.client || '';
    // The caption stands at the foot of the screen, unless the lit row is
    // down there itself: then it moves up under the header, clear of it.
    if (litCap) {
      const low = row.getBoundingClientRect().bottom > innerHeight - litCap.offsetHeight - 40;
      litCap.classList.toggle('at-top', low);
      lit.classList.toggle('at-top', low);
    }
  }
  function unlight() {
    clearTimeout(timer);
    page.classList.remove('is-lit');
    rows.forEach((r) => r.classList.remove('on'));
    rooms.forEach((r) => { r.classList.remove('on'); r.style.viewTransitionName = ''; });
  }
  rows.forEach((row) => {
    row.addEventListener('pointerenter', () => {
      if (!fine.matches || phone.matches) return;
      warm();
      clearTimeout(timer);
      // The first room waits a moment (intent); moving between rows swaps at once.
      if (page.classList.contains('is-lit')) light(row);
      else timer = setTimeout(() => light(row), 80);
    });
    row.addEventListener('focus', () => { if (!phone.matches) { warm(); light(row); } });
    row.addEventListener('blur', () => { if (!row.matches(':hover')) unlight(); });
  });
  schedule.addEventListener('pointerleave', unlight);
  addEventListener('keydown', (e) => { if (e.key === 'Escape') unlight(); });
}
