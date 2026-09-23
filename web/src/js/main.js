// Landing slideshow: crossfade through featured work. Press G to show the grid.

const SLIDE_MS = 6000;

const stage = document.querySelector('[data-stage]');
if (stage) {
  const slides = [...stage.querySelectorAll('[data-slide]')];
  const captions = [...stage.querySelectorAll('[data-caption]')];
  const count = stage.querySelector('[data-count]');
  const progress = stage.querySelector('[data-progress]');
  let current = 0;
  let timer;

  const show = (i) => {
    current = (i + slides.length) % slides.length;
    slides.forEach((s, n) => s.classList.toggle('is-active', n === current));
    captions.forEach((c, n) => c.classList.toggle('is-active', n === current));
    count.textContent = String(current + 1).padStart(2, '0');
    progress.animate([{ width: '0%' }, { width: '100%' }], { duration: SLIDE_MS, easing: 'linear', fill: 'forwards' });
    clearTimeout(timer);
    timer = setTimeout(() => show(current + 1), SLIDE_MS);
  };

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') show(current + 1);
    if (e.key === 'ArrowLeft') show(current - 1);
  });
  if (slides.length > 1) show(0);
}

document.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'g' && !e.metaKey && !e.ctrlKey && !(e.target instanceof HTMLInputElement)) {
    document.body.classList.toggle('show-grid');
  }
});
