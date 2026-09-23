// Landing: a fast, shuffled cut through every project image, seen through the
// mark. Images load a few frames ahead of the cut, never all at once.
// Hover holds a frame; a click opens the project it belongs to.
// Anywhere: press G to show the grid.

const FRAME_MS = 150;
const AHEAD = 12;

const stage = document.querySelector('[data-stage]');
const framesEl = document.getElementById('frames');

if (stage && framesEl) {
  const img = stage.querySelector('[data-frame]');
  const size = matchMedia('(max-width: 720px)').matches ? 's' : 'l';
  const frames = JSON.parse(framesEl.textContent).filter(Boolean);

  // Shuffle, then break up runs from the same project.
  for (let i = frames.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [frames[i], frames[j]] = [frames[j], frames[i]];
  }
  for (let i = 1; i < frames.length; i++) {
    if (frames[i].slug !== frames[i - 1].slug) continue;
    const k = frames.findIndex((f, n) => n > i && f.slug !== frames[i - 1].slug);
    if (k > 0) [frames[i], frames[k]] = [frames[k], frames[i]];
  }

  const ready = [];
  let requested = 0;
  let inFlight = 0;
  let played = 0; // cuts so far; paces loading and never wraps

  const fill = () => {
    while (inFlight < 4 && requested < frames.length && requested < played + AHEAD) {
      const frame = frames[requested++];
      const probe = new Image();
      probe.src = frame[size];
      inFlight++;
      probe.decode()
        .then(() => ready.push(frame))
        .catch(() => {})
        .finally(() => { inFlight--; fill(); });
    }
  };

  let held = false;
  const cut = () => {
    if (!held && !document.hidden && ready.length) {
      const frame = ready[played++ % ready.length];
      img.src = frame[size];
      stage.href = `/work/${frame.slug}/`;
      fill();
    }
  };

  const slow = matchMedia('(prefers-reduced-motion: reduce)').matches;
  fill();
  setInterval(cut, slow ? 2500 : FRAME_MS);
  stage.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') held = true; });
  stage.addEventListener('pointerleave', () => { held = false; });
}

document.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'g' && !e.metaKey && !e.ctrlKey && !(e.target instanceof HTMLInputElement)) {
    document.body.classList.toggle('show-grid');
  }
});
