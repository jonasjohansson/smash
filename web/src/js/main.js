// Landing: a fast, shuffled cut through every project image, seen through the
// mark. Frames are decoded off the main thread a couple of dozen ahead and
// drawn to a canvas on the display's own clock, so a cut never waits on a
// decode; if the next frame is not ready the current one simply holds.
// A click opens the project on screen. (No hover pause: the mark fills the
// viewport, so hovering anywhere would stop it.) A inverts the mask,
// S swaps the black ground for white.
// Anywhere: press G to show the grid.

const FRAME_MS = 75;
const AHEAD = 24;
const PARALLEL = 6;

const stage = document.querySelector('[data-stage]');
const framesEl = document.getElementById('frames');

if (stage && framesEl) {
  const slide = stage.querySelector('.slide');
  const poster = slide.querySelector('img');
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  slide.append(canvas);

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

  const decoded = new Map(); // frame index -> ImageBitmap
  const pending = new Set();
  const broken = new Set();
  let next = 0; // the frame to cut to
  let current = null;

  const load = () => {
    for (let k = 0; k < AHEAD && pending.size < PARALLEL; k++) {
      const i = (next + k) % frames.length;
      if (decoded.has(i) || pending.has(i) || broken.has(i)) continue;
      pending.add(i);
      fetch(frames[i][size])
        .then((r) => r.blob())
        .then((blob) => createImageBitmap(blob))
        .then((bitmap) => decoded.set(i, bitmap))
        .catch(() => broken.add(i))
        .finally(() => { pending.delete(i); load(); });
    }
  };

  const fit = () => {
    const dpr = Math.min(devicePixelRatio, 2);
    canvas.width = Math.round(slide.clientWidth * dpr);
    canvas.height = Math.round(slide.clientHeight * dpr);
    if (current) draw(current);
  };

  // object-fit: cover, by hand.
  function draw(bitmap) {
    const cw = canvas.width, ch = canvas.height;
    const scale = Math.max(cw / bitmap.width, ch / bitmap.height);
    const w = bitmap.width * scale, h = bitmap.height * scale;
    ctx.drawImage(bitmap, (cw - w) / 2, (ch - h) / 2, w, h);
  }

  const slow = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Cut on a whole number of display refreshes, so the rhythm is even:
  // 75 ms does not divide 60 Hz, and alternating 67/83 ms reads as a stagger.
  let refresh = 1000 / 60;
  let prev = 0;
  let ticks = 0;

  function tick(now) {
    if (prev) refresh += (Math.min(now - prev, 50) - refresh) * 0.05;
    prev = now;
    const every = Math.max(1, Math.round((slow ? 2500 : FRAME_MS) / refresh));
    if (!document.hidden && ++ticks >= every) {
      if (broken.has(next)) next = (next + 1) % frames.length;
      const bitmap = decoded.get(next);
      if (bitmap) {
        draw(bitmap);
        if (poster.isConnected) poster.remove();
        decoded.delete(next);
        current?.close();
        current = bitmap;
        stage.href = `/work/${frames[next].slug}/`;
        next = (next + 1) % frames.length;
        ticks = 0;
        load();
      }
    }
    requestAnimationFrame(tick);
  }

  fit();
  addEventListener('resize', fit);
  load();
  requestAnimationFrame(tick);

  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key.toLowerCase() === 'a') document.body.classList.toggle('invert');
    if (e.key.toLowerCase() === 's') document.body.classList.toggle('light');
  });
}

document.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'g' && !e.metaKey && !e.ctrlKey && !(e.target instanceof HTMLInputElement)) {
    document.body.classList.toggle('show-grid');
  }
});
