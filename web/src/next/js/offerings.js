// What we do: on a fine pointer, hovering an offering lights its picture in
// the last three columns and dims the other rows. Touch: plain links.

const fine = matchMedia('(hover: hover) and (pointer: fine)');

document.querySelectorAll('[data-offerings]').forEach((section) => {
  const list = section.querySelector('[data-offer-list]');
  const panel = section.querySelector('[data-offer-panel]');
  if (!list || !panel) return;
  const pics = [...panel.children];
  const rows = [...list.querySelectorAll('[data-offer]')];
  const show = (i) => {
    if (!fine.matches) return;
    section.classList.toggle('is-hover', i >= 0);
    list.classList.toggle('is-hover', i >= 0);
    rows.forEach((r, k) => r.classList.toggle('on', k === i));
    pics.forEach((p, k) => p.classList.toggle('on', k === i));
    // Pictures load only once someone looks.
    if (i >= 0) pics[i].querySelectorAll('img[loading="lazy"]').forEach((img) => { img.loading = 'eager'; });
  };
  rows.forEach((r, i) => {
    r.addEventListener('pointerenter', () => show(i));
    r.addEventListener('focus', () => show(i));
    r.addEventListener('blur', () => show(-1));
  });
  list.addEventListener('pointerleave', () => show(-1));
});
