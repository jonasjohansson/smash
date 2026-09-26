// Landing: a fast, shuffled cut through every project image, seen through the
// mark. Frames are decoded off the main thread a couple of dozen ahead and
// drawn to a canvas on the display's own clock, so a cut never waits on a
// decode; if the next frame is not ready the current one simply holds.
// At rest, a click dives in by itself (with a modifier, it opens the project
// on screen, as a link).
//
// Scrolling dives into the mark, like the Marvel intro run backwards: the mark
// comes at you (on a log scale, so every stretch of the approach takes as long)
// through the gap between the M and the A, until its edges pass the edges of
// the screen and the pictures fill it, the cut running on all the while (with
// `land`, it slows instead and stops on one picture); the pictures, further
// back, grow a little less than the mark does. Reduced motion dissolves the
// mark instead.
// Landed, scrolling on reads the studio (landing.njk): the picture scrolls
// away above it, and the page ends with it. The projects run on without end
// only on a project's own page (below).
// (v2's glass stays a single screen.)
//
// Keys on the landing page: H opens the tweak panel (the mark is drawn from
// parameters, see mark.js), A inverts the mask, S swaps black for white.
// Anywhere: G shows the grid.

// The modules come from the same build as this script: its address carries
// the build's stamp (base.njk), and so do theirs.
const build = new URL(import.meta.url).search;
const [
  { DEFAULTS, buildMark, markShape, paintMark, paintInfo, diveFocus, toDataUrl },
  { GLASS_DEFAULTS, createGlass },
  { createFeed, typeface, fitTitles },
] = await Promise.all([import(`./mark.js${build}`), import(`./glass.js${build}`), import(`./feed.js${build}`)]);

const AHEAD = 24;
const PARALLEL = 6;
const HOLD = 3000; // ms per image just before the dive lands
const REEL = 0.2; // how far into the dive the reel takes over from the cut

const DIVE_DEFAULTS = {
  length: 2, // screens of scrolling from the mark to the pictures
  overlap: 0.6, // screens the page is already scrolling before the dive is through
  parallax: 1.15, // how much the pictures have grown when the mark has passed
  land: false, // slow the cut to a stop as the dive goes in, or let it run on
  invert: true, // the pictures through the slots and round the mark, the block white (A)
  light: true, // on the page's ground (white, or warm grey in dark mode), as the projects are (S)
  info: true, // who SMASH is, in rows of the mask along the top and bottom
  infoSize: 0.03, // each row's height, of the screen's (the room round the whole is a slot's width)
  infoGap: 0.012, // between the rows and the mark
};

const stage = document.querySelector('[data-stage]');
const framesEl = document.getElementById('frames');
const typing = (e) => e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement;
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

if (stage && framesEl) {
  const slide = stage.querySelector('.slide');
  const poster = slide.querySelector('img');
  const canvas = document.createElement('canvas');
  slide.append(canvas);

  // v2 draws the mark as liquid glass in WebGL; v1 (and v2 without WebGL 2)
  // draws it on a 2D canvas, over the picture.
  const glass = stage.dataset.renderer === 'glass' ? createGlass(canvas) : null;
  const ctx = glass ? null : canvas.getContext('2d');
  const mask = glass ? null : document.createElement('canvas');
  const mctx = mask?.getContext('2d');
  const dives = stage.dataset.renderer !== 'glass'; // v2 stays one screen, even without WebGL 2
  if (glass) {
    slide.classList.add('is-glass');
    poster.decode().then(() => { if (!current) glass.setImage(poster); }).catch(() => {});
  }
  const STORE = glass ? 'smash-mark-v2' : 'smash-mark';
  const BASE = glass ? { ...DEFAULTS, ...GLASS_DEFAULTS } : { ...DEFAULTS, ...DIVE_DEFAULTS };

  // Settings are a per-viewer convenience; the page works without them.
  const params = { ...BASE };
  try { Object.assign(params, JSON.parse(localStorage.getItem(STORE) || '{}')); } catch {}
  // Only what differs from the defaults is kept, so a default changed later
  // still reaches whoever has not touched that setting.
  const save = () => {
    const changed = Object.fromEntries(Object.entries(params).filter(([k, v]) => v !== BASE[k]));
    try { localStorage.setItem(STORE, JSON.stringify(changed)); } catch {}
  };

  const slow = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // The rows' words are in the page (for screen readers too); the email's link
  // lies over its painted letters.
  const infoRows = [...document.querySelectorAll('[data-info] [data-row]')].map((p) => p.textContent.trim());
  const mail = document.querySelector('[data-mail]');
  let infoReady = false; // the typeface has loaded
  const trackEl = document.querySelector('[data-track]');

  // ---- the mark ---------------------------------------------------------

  let shape = null; // the mark laid out for the current size (v1)
  let focus = null; // where the dive goes, and how far it zooms
  let dirty = true; // the canvas needs drawing
  let maskDirty = true; // and the mark with it (not on every cut)
  let lastShape = '';
  function drawMark() {
    const W = slide.clientWidth, H = slide.clientHeight;
    document.body.classList.toggle('light', params.light);
    if (glass) {
      const g = Object.fromEntries(Object.keys(GLASS_DEFAULTS).map((k) => [k, params[k]]));
      glass.set({ ...g, light: params.light, bg: params.light ? [1, 1, 1] : [0, 0, 0] });
      const shape = JSON.stringify([params, W, H].map((x, i) => (i ? x : { ...x, ...Object.fromEntries(Object.keys(GLASS_DEFAULTS).map((k) => [k, 0])), speed: 0, paused: 0, light: 0 })));
      // The distance field only needs rebuilding when the shape changes.
      if (shape !== lastShape) { lastShape = shape; glass.setMask(buildMark(params, W, H), W, H); }
      return;
    }
    shape = markShape(params, W, H);
    if (mail && !params.info) mail.hidden = true;
    focus = diveFocus(params, shape);
    document.body.style.setProperty('--dive', params.length);
    track();
    frame();
    dirty = maskDirty = true;
    // Until the canvas has a picture, the poster is masked with CSS.
    if (!current) {
      const url = toDataUrl(buildMark(params, W, H));
      slide.style.webkitMaskImage = url;
      slide.style.maskImage = url;
    }
    slide.classList.add('is-set'); // drawn with the viewer's settings
  }

  // ---- the dive ---------------------------------------------------------

  // Scroll position (0 at the mark, 1 at the pictures), eased toward on each
  // frame so a mouse wheel's steps glide like a trackpad.
  let target = 0;
  let over = 0; // px scrolled past the dive, into the project
  let under = false; // and the pictures scrolled out of sight: the cut rests
  const intro = document.querySelector('.about-intro-wrap'); // its headline shows the film
  const view = { t: 0, e: 0, s: 1, x: 0, y: 0, image: 1, fade: 0 };

  // Where the dive is through: `overlap` screens past the end of the track,
  // so the page below has begun to scroll up while the mark is still passing.
  const diveEnd = () => trackEl.offsetHeight - innerHeight + params.overlap * innerHeight;

  function track() {
    if (!trackEl) return;
    const max = trackEl.offsetHeight - innerHeight;
    const end = diveEnd();
    // At fractional zoom innerHeight is rounded, and the real end can fall a
    // pixel short: the last pixel counts as the end.
    target = end > 0 ? (scrollY >= end - 1 ? 1 : Math.max(0, scrollY / end)) : 0;
    // Past the track the film stays where it is, and the studio scrolls up
    // over it (main.css), until it covers the screen and the headline, which
    // shows the film through its letters, has gone by.
    over = Math.max(0, scrollY - max);
    under = over >= innerHeight && !(intro && intro.getBoundingClientRect().bottom > 0); // covered
    stage.style.visibility = under ? 'hidden' : '';
    if (reel && target > 0 && reel.preload !== 'auto') { reel.preload = 'auto'; reel.load(); }
    document.body.classList.toggle('is-reading', under);
    // Only the mark at rest is a link; once scrolling in, the pictures are not,
    // and the header and the studio's line along the bottom go.
    if (stage.inert !== target > 0) stage.inert = target > 0;
    document.body.classList.toggle('is-diving', target > 0);
  }

  // The mark's zoom and offset for the dive at view.t, and the pictures' zoom.
  function frame() {
    const e = (view.e = 0.5 - Math.cos(Math.PI * view.t) / 2);
    if (slow) { Object.assign(view, { s: 1, x: 0, y: 0, image: 1, fade: e }); return; }
    const W = slide.clientWidth, H = slide.clientHeight;
    const s = Math.exp(e * Math.log(focus.depth));
    // The focus drifts to the centre of the screen as the mark comes in.
    view.s = s;
    view.x = focus.x + (W / 2 - focus.x) * e - s * focus.x;
    view.y = focus.y + (H / 2 - focus.y) * e - s * focus.y;
    // A camera moving in on both: the pictures are further back, at a distance
    // that makes them `parallax` times larger by the time the mark has passed.
    const z = 1 - 1 / s, zEnd = 1 - 1 / focus.depth;
    const far = params.parallax > 1 ? (params.parallax * zEnd) / (params.parallax - 1) : Infinity;
    view.image = far / (far - z) || 1;
    // The mark is gone well before the end; fade what could be left, so it
    // never vanishes in one frame. If the gap never opens (slots thicker than
    // their spacing, or a zoom past the limit), dissolve it over the last stretch.
    view.fade = smooth(focus.open ? 0.97 : 0.75, 1, view.t);
  }

  // ---- the slideshow ----------------------------------------------------

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

  const reel = document.querySelector('[data-reel]'); // SMASH's reel, where the dive lands
  let onReel = false;
  const decoded = new Map(); // frame index -> ImageBitmap
  const pending = new Set();
  const broken = new Set();
  let next = 0; // the frame to cut to
  let current = null; // what is on screen: an ImageBitmap, or the poster
  let shown = -1; // its frame index
  let onScreen = ''; // and its project
  let sharpened = -1; // the frame last swapped for a bigger size

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

  function show(picture, i, slug) {
    if (current !== picture) current?.close?.();
    current = picture;
    shown = i;
    onScreen = slug;
    if (slug) stage.href = `/${slug}/`;
    if (glass) return glass.setImage(picture);
    dirty = true;
    if (!slide.classList.contains('is-drawn')) {
      slide.classList.add('is-drawn');
      slide.style.webkitMaskImage = slide.style.maskImage = '';
    }
  }

  // Landed: the picture fills the screen, so fetch it at its biggest (a
  // phone held upright crops a landscape picture to a third of its width).
  function sharpen() {
    const i = shown;
    if (i < 0 || sharpened === i) return;
    sharpened = i;
    const url = frames[i].x;
    if (!url || url === frames[i][size]) return;
    fetch(url)
      .then((r) => r.blob())
      .then((blob) => createImageBitmap(blob))
      .then((bitmap) => (shown === i ? show(bitmap, i, frames[i].slug) : bitmap.close()))
      .catch(() => {});
  }

  // object-fit: cover, by hand, `zoom` times larger about the centre.
  function cover(picture, zoom) {
    const cw = canvas.width, ch = canvas.height;
    const iw = picture.videoWidth || picture.naturalWidth || picture.width;
    const ih = picture.videoHeight || picture.naturalHeight || picture.height;
    const scale = Math.max(cw / iw, ch / ih) * zoom;
    const w = iw * scale, h = ih * scale;
    ctx.drawImage(picture, (cw - w) / 2, (ch - h) / 2, w, h);
  }

  // The picture, then the mark cut out of it: whatever the mask leaves clear
  // shows the page behind (black, or white with S).
  function render() {
    const cw = canvas.width, ch = canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    if (!current) return;
    cover(current, view.image);
    if (view.t >= 1) return; // the mark has passed
    if (maskDirty) {
      const dpr = cw / slide.clientWidth;
      mctx.setTransform(1, 0, 0, 1, 0, 0);
      mctx.clearRect(0, 0, cw, ch);
      mctx.setTransform(dpr * view.s, 0, 0, dpr * view.s, dpr * view.x, dpr * view.y);
      paintMark(mctx, shape, params.invert);
      if (params.info && infoReady) {
        const laid = paintInfo(mctx, shape, infoRows, params.invert);
        if (view.t === 0) placeMail(laid);
      }
      if (view.fade > 0) {
        mctx.setTransform(1, 0, 0, 1, 0, 0);
        mctx.globalAlpha = view.fade;
        mctx.fillRect(0, 0, cw, ch);
        mctx.globalAlpha = 1;
      }
      maskDirty = false;
    }
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(mask, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
  }

  // The email's link over its letters, where they lie with the mark at rest.
  function placeMail(laid) {
    if (!mail) return;
    const address = mail.textContent.trim().toUpperCase();
    const row = laid.find((r) => r?.text.includes(address));
    mail.hidden = !row;
    if (!row) return;
    mctx.save();
    mctx.font = row.font;
    const at = (n) => mctx.measureText(row.text.slice(0, n)).width * row.scale;
    const from = row.text.indexOf(address);
    const left = row.x + at(from);
    Object.assign(mail.style, {
      left: `${left}px`,
      top: `${row.y}px`,
      width: `${row.x + at(from + address.length) - left}px`,
      height: `${row.h}px`,
    });
    mctx.restore();
  }

  const fit = () => {
    // The 2D canvas carries the mark's edges too, so it goes to 3x on phones.
    const dpr = Math.min(devicePixelRatio, glass ? 2 : 3);
    canvas.width = Math.round(slide.clientWidth * dpr);
    canvas.height = Math.round(slide.clientHeight * dpr);
    if (mask) { mask.width = canvas.width; mask.height = canvas.height; }
    if (glass && current) glass.setImage(current);
    drawMark();
  };

  // Cut on a whole number of display refreshes, so the rhythm is even:
  // 75 ms does not divide 60 Hz, and alternating 67/83 ms reads as a stagger.
  let refresh = 1000 / 60;
  let prev = 0;
  let ticks = 0;

  function tick(now) {
    const dt = prev ? Math.min(now - prev, 50) : 0;
    if (prev) refresh += (dt - refresh) * 0.05;
    prev = now;

    if (dives && view.t !== target) {
      view.t += (target - view.t) * (1 - Math.exp(-dt / 110));
      if (Math.abs(target - view.t) < 1e-4) view.t = target;
      frame();
      dirty = maskDirty = true;
    }

    // With `land`, the cut slows on a log scale as the dive goes in, and stops
    // once the scroll reaches the end of the dive (the picture follows a moment
    // later); without, it runs on at its pace.
    const base = slow ? 2500 : params.speed;
    const landed = dives && params.land && target >= 1;
    const hold = landed ? 1 : dives && params.land ? view.e : 0;
    const every = Math.max(1, Math.round((base * Math.pow(Math.max(1, HOLD / base), hold)) / refresh));
    if (!document.hidden && !params.paused && !landed && !under && !onReel && ++ticks >= every) {
      if (broken.has(next)) next = (next + 1) % frames.length;
      const bitmap = decoded.get(next);
      if (bitmap) {
        show(bitmap, next, frames[next].slug);
        if (poster.isConnected) poster.remove();
        decoded.delete(next);
        next = (next + 1) % frames.length;
        ticks = 0;
        load();
      }
    }
    if (landed) sharpen();

    // The dive ends on the reel: a little way in, the cut gives way to it, and
    // it plays on through the rest of the dive and after. It rests out of
    // sight, and starts over when the cut comes back.
    if (reel && !glass) {
      const want = view.e > REEL && reel.readyState >= 2;
      if (want && !onReel) { onReel = true; show(reel, -2, onScreen); }
      else if (onReel && view.e <= REEL) { onReel = false; reel.pause(); reel.currentTime = 0; ticks = every; }
      const play = onReel && !under && !document.hidden && (!slow || heard);
      if (play && reel.paused) reel.play().catch(() => {});
      else if (!play && !reel.paused) reel.pause();
      if (onReel && !reel.paused) dirty = true;
    }

    if (dirty && !glass) { render(); dirty = false; }
    requestAnimationFrame(tick);
  }

  if (dives) {
    // The intro always starts at the mark.
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    document.body.classList.add('can-dive');
    addEventListener('scroll', track, { passive: true });
    poster.decode().then(() => { if (!current) show(poster, -1, stage.pathname.split('/').at(-2)); }).catch(() => {});
    // The rows wait for their typeface rather than flash another.
    typeface(infoRows.join(' ')).then(() => { infoReady = true; dirty = maskDirty = true; });
    // A click at rest dives in by itself, as a scroll through the track would;
    // a scroll, touch or key of the viewer's own takes over.
    stage.addEventListener('click', (e) => {
      if (e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || !trackEl) return;
      e.preventDefault();
      glide(diveEnd());
    });
  }

  // On the reel, a click gives it sound (and, with reduced motion, starts it).
  let heard = false;
  document.addEventListener('click', (e) => {
    if (!onReel || under || e.target.closest?.('a, button, .about, .cta')) return;
    heard = true;
    reel.muted = !reel.muted;
    if (reel.paused) reel.play().catch(() => {});
  });

  let gliding = 0;
  function glide(to) {
    if (slow) return scrollTo(0, to);
    const run = ++gliding, from = scrollY, start = performance.now(), length = 2600;
    const root = document.documentElement.style;
    const stop = () => { gliding++; end(); };
    const end = () => {
      root.scrollBehavior = ''; // main.css scrolls smoothly otherwise
      for (const k of ['wheel', 'touchstart', 'keydown']) removeEventListener(k, stop);
    };
    root.scrollBehavior = 'auto';
    for (const k of ['wheel', 'touchstart', 'keydown']) addEventListener(k, stop, { passive: true });
    const step = (now) => {
      if (run !== gliding) return;
      const x = Math.min(1, (now - start) / length);
      scrollTo(0, from + (to - from) * (0.5 - Math.cos(Math.PI * x) / 2));
      if (x < 1) requestAnimationFrame(step);
      else end();
    };
    requestAnimationFrame(step);
  }
  fit();
  addEventListener('resize', fit);
  load();
  requestAnimationFrame(tick);

  // ---- the tweak panel (H) -------------------------------------------------

  let pane = null;

  async function openPane() {
    const { Pane } = await import('https://cdn.jsdelivr.net/npm/tweakpane@4.0.5/dist/tweakpane.min.js');
    pane = new Pane({ title: glass ? 'SMASH v2' : 'SMASH' });
    pane.element.parentElement.classList.add('tweak');
    const change = () => { drawMark(); save(); };
    pane.addButton({ title: 'Reset all settings' }).on('click', () => {
      try { localStorage.removeItem(STORE); } catch {}
      Object.assign(params, BASE);
      pane.refresh();
      drawMark();
    });

    const mark = pane.addFolder({ title: 'Mark' });
    mark.addBinding(params, 'stroke', { label: 'thickness', min: 2, max: 48, step: 0.5 });
    mark.addBinding(params, 'corner', { label: 'corners', min: 0, max: 40, step: 0.5 });
    mark.addBinding(params, 'caps', { label: 'ends', options: { round: 'round', square: 'square', flat: 'butt' } });
    mark.addBinding(params, 'inset', { label: 'end margin', min: 0, max: 200, step: 1 });
    mark.addBinding(params, 'crossbar', { label: 'crossbar', min: 60, max: 411, step: 0.5 });
    mark.addBinding(params, 'gap', { label: 'crossbar gap', min: 20, max: 200, step: 0.5 });
    mark.addBinding(params, 'columns', { label: 'spread', min: 0.5, max: 1.12, step: 0.005 });

    const layout = pane.addFolder({ title: 'Layout' });
    layout.addBinding(params, 'fit', { options: { 'edge to edge': 'stretch', proportional: 'contain' } });
    layout.addBinding(params, 'padding', { min: 0, max: 200, step: 1 });
    layout.addBinding(params, 'invert', { label: 'invert (A)' });
    layout.addBinding(params, 'light', { label: 'white (S)' });

    if (glass) {
      const g = pane.addFolder({ title: 'Glass' });
      g.addBinding(params, 'bevel', { label: 'bevel (px)', min: 2, max: 120, step: 1 });
      g.addBinding(params, 'depth', { label: 'thickness (px)', min: 0, max: 240, step: 1 });
      g.addBinding(params, 'ior', { label: 'refraction index', min: 1, max: 2.2, step: 0.01 });
      g.addBinding(params, 'dispersion', { min: 0, max: 0.08, step: 0.001 });
      g.addBinding(params, 'frost', { min: 0, max: 4, step: 0.05 });
      g.addBinding(params, 'reflect', { label: 'reflections', min: 0, max: 2, step: 0.01 });
      g.addBinding(params, 'shine', { label: 'light sweep', min: 0, max: 2, step: 0.01 });
      g.addBinding(params, 'sweep', { label: 'sweep every (s)', min: 2, max: 20, step: 0.5 });
      g.addBinding(params, 'flow', { label: 'liquid', min: 0, max: 2, step: 0.01 });
    }

    if (dives) {
      const d = pane.addFolder({ title: 'Dive' });
      d.addBinding(params, 'length', { label: 'scroll (screens)', min: 0.5, max: 6, step: 0.1 });
      d.addBinding(params, 'overlap', { label: 'page moves before end', min: 0, max: 1, step: 0.05 }).on('change', track);
      d.addBinding(params, 'parallax', { label: 'pictures grow', min: 1, max: 1.6, step: 0.01 });
      d.addBinding(params, 'land', { label: 'land on a project' });
      const info = pane.addFolder({ title: 'Info' });
      info.addBinding(params, 'info', { label: 'rows of text' });
      info.addBinding(params, 'infoSize', { label: 'row height', min: 0.01, max: 0.08, step: 0.001 });
      info.addBinding(params, 'infoGap', { label: 'gap to the mark', min: 0, max: 0.05, step: 0.001 });
    }

    const slideshow = pane.addFolder({ title: 'Slideshow' });
    slideshow.addBinding(params, 'speed', { label: 'ms per image', min: 17, max: 1000, step: 1 });
    slideshow.addBinding(params, 'paused');

    pane.addButton({ title: 'Export SVG' }).on('click', () => {
      const svg = buildMark({ ...params, fit: 'contain', padding: 0, invert: false, info: false }, 1100, 942);
      const a = Object.assign(document.createElement('a'), {
        href: URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })),
        download: 'smash-mark.svg',
      });
      a.click();
      URL.revokeObjectURL(a.href);
    });
    pane.addButton({ title: 'Copy settings' }).on('click', () => navigator.clipboard?.writeText(JSON.stringify(params, null, 2)));

    pane.on('change', change);
  }

  document.addEventListener('keydown', async (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || typing(e)) return;
    const key = e.key.toLowerCase();
    if (key === 'h') {
      if (!pane) await openPane();
      else pane.hidden = !pane.hidden;
    }
    if (key === 'a' || key === 's') {
      if (key === 'a') params.invert = !params.invert;
      if (key === 's') params.light = !params.light;
      pane?.refresh();
      drawMark();
      save();
    }
  });
}

// A project's own page is the start of the feed too: it carries on into the
// next project, and the next, and the address follows the one being read. The
// link to the next project and the footer are for pages without JavaScript.
const own = !stage && document.querySelector('main > article.project');
if (own) {
  own.querySelector('.next')?.remove();
  document.querySelector('.site-footer')?.remove();
  const feed = createFeed(own.parentElement);
  const path = location.pathname;
  let queued = false;
  const follow = () => {
    queued = false;
    feed.grow();
    feed.address(feed.read() || feed.first);
    // Moved on to another project, a reload opens that one from its top;
    // still on this page's own, Back and reload keep the place as usual.
    if ('scrollRestoration' in history) history.scrollRestoration = location.pathname === path ? 'auto' : 'manual';
  };
  const soon = () => { if (!queued) { queued = true; requestAnimationFrame(follow); } };
  addEventListener('scroll', soon, { passive: true });
  addEventListener('resize', soon);
  soon();
}

// The way in (cta.njk) comes out of the ground in yellow dots: a strip of
// them, dense at the foot and thinning out upward, drawn to the screen's own
// pixels (a scaled mask would blur them) and repeated across the band.
const DOT = 2; // px, each dot of the dither
function dither(band) {
  const dpr = devicePixelRatio || 1;
  const fade = Math.round(Math.min(360, Math.max(160, innerWidth * 0.22)));
  const w = 512, cols = w / DOT, rows = Math.ceil(fade / DOT);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(rows * DOT * dpr);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000';
  const px = DOT * dpr;
  for (let y = 0; y < rows; y++) {
    const t = (y + 0.5) / rows; // how yellow this row is
    for (let x = 0; x < cols; x++) {
      if (Math.random() < t) ctx.fillRect(Math.round(x * px), Math.round(y * px), Math.ceil(px), Math.ceil(px));
    }
  }
  band.style.setProperty('--dither', `url(${canvas.toDataURL()})`);
  band.style.setProperty('--dither-size', `${w}px ${rows * DOT}px`);
  band.style.setProperty('--fade', `${rows * DOT}px`);
  band.classList.add('is-dithered');
}
const bands = document.querySelectorAll('.cta');
if (bands.length) {
  let last = 0;
  const redither = () => { if (innerWidth !== last) { last = innerWidth; bands.forEach(dither); } };
  redither();
  addEventListener('resize', redither);
}

// An offering's page opens on its picture seen through the mark, drawn to the
// picture's size and to the viewer's own settings, as on the landing.
const marked = document.querySelector('[data-mark]');
if (marked) {
  const params = { ...DEFAULTS };
  try { Object.assign(params, JSON.parse(localStorage.getItem('smash-mark') || '{}')); } catch {}
  const draw = () => {
    marked.style.webkitMaskImage = marked.style.maskImage = toDataUrl(buildMark({ ...params, info: false }, marked.clientWidth, marked.clientHeight));
    marked.classList.add('is-set');
  };
  draw();
  addEventListener('resize', draw);
}

document.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'g' && !e.metaKey && !e.ctrlKey && !typing(e)) {
    document.body.classList.toggle('show-grid');
  }
});

// Back to top, without leaving #top in the address. On the landing it flies
// back out through the mark.
document.addEventListener('click', (e) => {
  if (e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || !e.target.closest?.('[data-top]')) return;
  e.preventDefault();
  scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
});
