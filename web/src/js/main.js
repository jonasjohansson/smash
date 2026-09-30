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
// away above it. Past the footer the landing starts over: the footer scrolls
// up off the mark at rest, the film playing in it, and scrolling on dives
// again, without end. An offering's page runs on into the next offering's in
// the same way, and a project's into the next project (below).
// (v2's glass stays a single screen.)
//
// Keys on the landing page: H opens the tweak panel (the mark is drawn from
// parameters, see mark.js), A inverts the mask, S swaps black for white.
// Anywhere: G shows the grid, C steps through the colour palettes, D puts
// the type's colour in the accent's place. On a project's page: T and B step
// through the typography round's heading and body faces (the type tester).

// The modules come from the same build as this script: its address carries
// the build's stamp (base.njk), and so do theirs.
const build = new URL(import.meta.url).search;
const [
  { DEFAULTS, buildMark, markShape, paintMark, paintInfo, diveFocus, toDataUrl },
  { GLASS_DEFAULTS, createGlass },
  { createFeed, typeface, fitTitles },
] = await Promise.all([import(`./mark.js${build}`), import(`./glass.js${build}`), import(`./feed.js${build}`)]);

// The site's mark: thinner slots, rounder bends, square ends set further in
// than mark.js's own (which the identity pages keep).
const MARK_DEFAULTS = { ...DEFAULTS, stroke: 12, corner: 16, caps: 'square', inset: 59 };

const AHEAD = 24;
const PARALLEL = 6;
const HOLD = 3000; // ms per image just before the dive lands

const DIVE_DEFAULTS = {
  videoFromStart: true, // play the reel behind the mark instead of the opening slideshow
  length: 2, // screens of scrolling from the mark to the pictures
  overlap: 0, // screens the page is already scrolling before the dive is through
  reel: 0.15, // how far into the dive (of its scroll) the reel takes over from the cut
  vignette: 0.4, // how dark the corners fall once the pictures fill the screen
  parallax: 1.15, // how much the pictures have grown when the mark has passed
  land: false, // slow the cut to a stop as the dive goes in, or let it run on
  light: true, // on the page's ground (white, or warm grey in dark mode), as the projects are (S)
  info: true, // who SMASH is, in rows of the mask along the top and bottom
  infoSize: 0.03, // each row's height, of the screen's (the room round the whole is a slot's width)
  infoGap: 0.012, // between the rows and the mark
};

// The page's colours, from the tweak panel (H): a palette of a ground (the
// page's background), the type on it and an accent, on every page. SMASH's
// own is main.css's; the others are to try. D puts the type's colour in the
// accent's place; C steps through the palettes, those kept in the panel too.
// And the film grain over it all, stronger on the ground than over the mark.
const SMASH_COLOURS = { ground: '#1f1915', ink: '#f3efe8', accent: '#f7be04' };
const PALETTES = {
  smash: { name: 'SMASH', ...SMASH_COLOURS },
  night: { name: 'Night', ground: '#0e0e0e', ink: '#f3efe8', accent: '#f7be04' },
  signal: { name: 'Signal', ground: '#141211', ink: '#f3efe8', accent: '#ff4d2e' },
  acid: { name: 'Acid', ground: '#1b1f17', ink: '#ece9dc', accent: '#c8f000' },
  ultramarine: { name: 'Ultramarine', ground: '#0f1633', ink: '#eef0f7', accent: '#f7be04' },
  plum: { name: 'Plum', ground: '#221520', ink: '#f5ece6', accent: '#ff8fb1' },
  paper: { name: 'Paper', ground: '#f3efe8', ink: '#1a1715', accent: '#e2462c' },
  concrete: { name: 'Concrete', ground: '#d9d6cf', ink: '#161616', accent: '#1f3cff' },
  mono: { name: 'Mono', ground: '#000000', ink: '#ffffff', accent: '#ffffff' },
};
const GROUND_DEFAULTS = { palette: 'smash', ...SMASH_COLOURS, kept: [], whiteAccent: false, grain: 0.08, grainGround: 0.14 };

const isHex = (c) => /^#[0-9a-f]{6}$/i.test(c ?? '');
const rgb = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)).join(' ');
const isLight = (c) => {
  const [r, g, b] = rgb(c).split(' ').map((v) => v / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.5;
};

// The palettes to pick from: the ones above, then those kept in the panel.
const paletteList = (p) => [
  ...Object.entries(PALETTES).map(([value, c]) => ({ value, ...c })),
  ...(p.kept || []).map((c, i) => ({ value: `kept-${i}`, name: `kept ${i + 1}`, ...c })),
];
function usePalette(p, value) {
  const it = paletteList(p).find((x) => x.value === value);
  if (it) Object.assign(p, { palette: value, ground: it.ground, ink: it.ink, accent: it.accent });
}
function stepPalette(p, dir) {
  const list = paletteList(p);
  const i = list.findIndex((x) => x.value === p.palette);
  usePalette(p, list[i < 0 ? (dir > 0 ? 0 : list.length - 1) : (i + dir + list.length) % list.length].value);
}

function paintGround(p) {
  const root = document.documentElement.style;
  for (const [k, v] of [['grain', '--grain'], ['grainGround', '--grain-ground']]) {
    if (typeof p?.[k] === 'number') root.setProperty(v, p[k]);
    else root.removeProperty(v);
  }
  const [ground, ink, accent] = ['ground', 'ink', 'accent'].map((k) => (isHex(p?.[k]) ? p[k].toLowerCase() : SMASH_COLOURS[k]));
  const shown = p?.whiteAccent ? ink : accent;
  const meta = document.querySelectorAll('meta[name="theme-color"]');
  if (ground === SMASH_COLOURS.ground && ink === SMASH_COLOURS.ink && shown === SMASH_COLOURS.accent) {
    for (const k of ['--bg', '--ground', '--ink', '--muted', '--line', '--tile', '--accent', '--on-accent']) root.removeProperty(k);
    meta.forEach((m) => m.content = m.dataset.content ?? m.content);
    return;
  }
  root.setProperty('--bg', ground);
  root.setProperty('--ground', ground);
  root.setProperty('--ink', ink);
  root.setProperty('--muted', `rgb(${rgb(ink)} / 0.55)`);
  root.setProperty('--line', `rgb(${rgb(ink)} / 0.14)`);
  root.setProperty('--tile', `color-mix(in oklab, ${ground}, ${ink} 8%)`);
  root.setProperty('--accent', shown);
  root.setProperty('--on-accent', isLight(shown) ? '#111' : '#fff');
  meta.forEach((m) => { m.dataset.content ??= m.content; m.content = ground; });
}

// Settings as stored: only what differs from the defaults. Before palettes, a
// background of one's own was a switch and a colour, the type turning dark or
// light to suit it.
function stored(key) {
  try {
    const s = JSON.parse(localStorage.getItem(key) || '{}');
    if ('ownGround' in s) {
      if (s.ownGround && isHex(s.ground)) Object.assign(s, { palette: 'custom', ink: isLight(s.ground) ? '#111111' : SMASH_COLOURS.ink });
      else delete s.ground;
      delete s.ownGround;
    }
    return s;
  } catch { return {}; }
}
paintGround(stored('smash-mark'));

// The Palette folder, in both panels: a palette picked from the list sets the
// three colours, and changing one of them makes them the viewer's own
// ('custom'), which Keep adds to the list. `changed` paints and saves.
function addPalette(pane, params, changed) {
  const f = pane.addFolder({ title: 'Palette' });
  let quiet = false; // the panel catching up, not the viewer
  const sync = () => { quiet = true; pane.refresh(); quiet = false; };
  let list = null;
  const addList = () => {
    list?.dispose();
    const options = Object.fromEntries([...paletteList(params).map((x) => [x.name, x.value]), ['custom', 'custom']]);
    list = f.addBinding(params, 'palette', { label: 'palette (C)', options, index: 0 });
    list.on('change', (e) => {
      if (quiet || e.value === 'custom') return;
      usePalette(params, e.value);
      sync();
      changed();
    });
  };
  addList();
  for (const [k, label] of [['ground', 'background'], ['ink', 'text'], ['accent', 'accent']]) {
    f.addBinding(params, k, { label }).on('change', () => {
      if (quiet) return;
      if (params.palette !== 'custom') { params.palette = 'custom'; sync(); }
      changed();
    });
  }
  f.addBinding(params, 'whiteAccent', { label: 'accent is text (D)' }).on('change', changed);
  f.addButton({ title: 'Keep palette' }).on('click', () => {
    params.kept = [...(params.kept || []), { ground: params.ground, ink: params.ink, accent: params.accent }];
    params.palette = `kept-${params.kept.length - 1}`;
    addList();
    changed();
  });
  f.addButton({ title: 'Forget kept palettes' }).on('click', () => {
    if (params.palette.startsWith('kept-')) params.palette = 'custom';
    params.kept = [];
    addList();
    changed();
  });
  f.addButton({ title: 'Copy palette' }).on('click', () => navigator.clipboard?.writeText(JSON.stringify({ ground: params.ground, ink: params.ink, accent: params.accent }, null, 2)));
  return addList; // after a reset, the list again
}


// The tweak panel stays open from page to page, once opened (for this tab).
const paneWasOpen = () => { try { return sessionStorage.getItem('smash-pane') === '1'; } catch { return false; } };
const remember = (open) => { try { open ? sessionStorage.setItem('smash-pane', '1') : sessionStorage.removeItem('smash-pane'); } catch {} };

const stage = document.querySelector('[data-stage]');
const framesEl = document.getElementById('frames');
const typing = (e) => e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement;
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

if (stage && framesEl) {
  const slide = stage.querySelector('.slide');
  const poster = slide.querySelector('img');
  const posterSlug = stage.pathname.split('/').at(-2);
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
  const BASE = glass ? { ...MARK_DEFAULTS, ...GLASS_DEFAULTS, ...GROUND_DEFAULTS } : { ...MARK_DEFAULTS, ...DIVE_DEFAULTS, ...GROUND_DEFAULTS };

  // Settings are a per-viewer convenience; the page works without them.
  const params = { ...BASE, ...stored(STORE) };
  // Only what differs from the defaults is kept, so a default changed later
  // still reaches whoever has not touched that setting.
  const save = () => {
    const changed = Object.fromEntries(Object.entries(params).filter(([k, v]) => v !== BASE[k]));
    try { localStorage.setItem(STORE, JSON.stringify(changed)); } catch {}
  };

  const slow = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // The rows' words are in the page (for screen readers too); the email's link
  // lies over its painted letters.
  const rowEls = [...document.querySelectorAll('[data-info] [data-row]')];
  const infoRows = rowEls.map((p) => p.textContent.trim());
  const infoIcons = rowEls.map((p) => (p.dataset.icons || '').split(' ').filter(Boolean)); // drawn after the words
  const mails = [...document.querySelectorAll('[data-mail]')]; // links over their painted words
  let infoReady = false; // the typeface has loaded
  const trackEl = document.querySelector('[data-track]');
  const loopEl = document.querySelector('[data-loop]'); // past the footer, where the landing starts over

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
    if (!params.info) mails.forEach((m) => { m.hidden = true; });
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
  const introHead = intro?.querySelector('h2');
  const landedLogo = document.querySelector('[data-landed-logo]');
  const view = { t: 0, e: 0, s: 1, x: 0, y: 0, image: 1, fade: 0 };
  // Reveal the logo with the About headline: both start at the fold and
  // finish together. Keep a pinned interval before the page covers it.
  // How far the About scrolls up from the fold while the logo comes in:
  const logoDistance = (box) => {
    const headlineEnd = introHead ? introHead.getBoundingClientRect().bottom - box.top : box.height;
    const room = innerHeight - 2 * (landedLogo.offsetTop + landedLogo.offsetHeight);
    return Math.max(1, Math.min(headlineEnd, room));
  };
  const syncLogo = (tail) => {
    if (!landedLogo || !intro) return;
    if (tail) {
      landedLogo.classList.remove('is-visible');
      landedLogo.inert = true;
      return;
    }
    const box = intro.getBoundingClientRect();
    const progress = Math.min(1, Math.max(0, (innerHeight - box.top) / logoDistance(box)));
    landedLogo.style.setProperty('--logo-progress', progress);
    landedLogo.classList.toggle('is-visible', progress > 0);
    // A covered logo stays behind the page, without a hidden tab stop.
    landedLogo.inert = progress === 0 || box.top <= landedLogo.offsetTop;
  };

  // Where the dive is through: `overlap` screens past the end of the track,
  // so the page below has begun to scroll up while the mark is still passing.
  const diveEnd = () => trackEl.offsetHeight - innerHeight + params.overlap * innerHeight;

  function track() {
    if (!trackEl) return;
    // A screen past the footer is the top of the page again, the same mark at
    // rest on the screen: go there, and whatever was scrolled beyond, on into
    // the dive. (Instant: main.css scrolls smoothly otherwise.)
    const at = loopEl ? loopEl.getBoundingClientRect().top + scrollY : Infinity;
    if (scrollY >= at) scrollTo({ top: scrollY - at, behavior: 'instant' });
    // The footer going up: under it, the mark at rest again, the film in it.
    // It was still covered a moment ago, so the dive comes back out at once.
    const tail = scrollY + innerHeight > at;
    const max = trackEl.offsetHeight - innerHeight;
    const end = diveEnd();
    // At fractional zoom innerHeight is rounded, and the real end can fall a
    // pixel short: the last pixel counts as the end.
    target = tail || end <= 0 ? 0 : scrollY >= end - 1 ? 1 : Math.max(0, scrollY / end);
    if (tail && view.t) { view.t = 0; frame(); dirty = maskDirty = true; }
    // Past the track the film stays where it is, and the studio scrolls up
    // over it (main.css), until it covers the screen and the headline, which
    // shows the film through its letters, has gone by.
    over = tail ? 0 : Math.max(0, scrollY - max);
    under = over >= innerHeight && !(intro && intro.getBoundingClientRect().bottom > 0); // covered
    stage.style.visibility = under ? 'hidden' : '';
    if (reel && (target > 0 || tail)) wantReel();
    document.body.classList.toggle('is-reading', under);
    // Only the mark at rest is a link (not as the footer leaves it); once
    // scrolling in, the pictures are not, and the header and the studio's
    // line along the bottom go.
    if (stage.inert !== (target > 0 || tail)) stage.inert = target > 0 || tail;
    document.body.classList.toggle('is-diving', target > 0);
    syncLogo(tail);
  }

  // The mark's zoom and offset for the dive at view.t, and the pictures' zoom.
  function frame() {
    const e = (view.e = 0.5 - Math.cos(Math.PI * view.t) / 2);
    document.body.classList.toggle('is-through', view.t >= 0.999);
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
  const videoAtStart = () => dives && reel && params.videoFromStart;
  // Normally fetched as the dive begins; opening with video requests it at once.
  const wantReel = () => { if (reel && reel.preload !== 'auto') { reel.preload = 'auto'; reel.load(); } };
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
    if (videoAtStart()) return;
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
  const loadMedia = () => { if (videoAtStart()) wantReel(); else load(); };

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
    // A soft vignette on the pictures and the film once they fill the screen:
    // none in the mark at rest, coming in as the dive goes through it.
    cover(current, view.image);
    const vignette = (params.vignette || 0) * view.e;
    if (vignette > 0) {
      const v = ctx.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * 0.3, cw / 2, ch / 2, Math.hypot(cw, ch) / 2);
      v.addColorStop(0, 'rgba(0,0,0,0)');
      v.addColorStop(1, `rgba(0,0,0,${vignette})`);
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, cw, ch);
    }
    if (view.t >= 1) return; // the mark has passed
    if (maskDirty) {
      const dpr = cw / slide.clientWidth;
      mctx.setTransform(1, 0, 0, 1, 0, 0);
      mctx.clearRect(0, 0, cw, ch);
      mctx.setTransform(dpr * view.s, 0, 0, dpr * view.s, dpr * view.x, dpr * view.y);
      paintMark(mctx, shape, params.invert);
      if (params.info && infoReady) {
        const laid = paintInfo(mctx, shape, infoRows, params.invert, undefined, infoIcons);
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

  // The links (the email; Instagram and LinkedIn) over their letters and
  // icons, where they lie with the mark at rest.
  function placeMail(laid) {
    for (const mail of mails) {
      if (mail.dataset.icon) {
        const box = laid.flatMap((r) => r?.icons || []).find((b) => b.name === mail.dataset.icon);
        mail.hidden = !box;
        if (!box) continue;
        const h = Math.max(24, box.h); // big enough to hit
        Object.assign(mail.style, { left: `${box.x - (h - box.w) / 2}px`, top: `${box.y - (h - box.h) / 2}px`, width: `${h}px`, height: `${h}px` });
        continue;
      }
      const address = mail.textContent.trim().toUpperCase();
      const row = laid.find((r) => r?.text.includes(address));
      mail.hidden = !row;
      if (!row) continue;
      mctx.save();
      mctx.font = row.font;
      const at = (n) => mctx.measureText(row.text.slice(0, n)).width * row.scale;
      const from = row.text.lastIndexOf(address);
      const left = row.x + at(from);
      const h = Math.max(24, row.h); // big enough to hit, however small the row
      Object.assign(mail.style, {
        left: `${left}px`,
        top: `${row.y - (h - row.h) / 2}px`,
        width: `${row.x + at(from + address.length) - left}px`,
        height: `${h}px`,
      });
      mctx.restore();
    }
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
    if (!document.hidden && !params.paused && !landed && !under && !onReel && !videoAtStart() && ++ticks >= every) {
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

    // The reel either starts inside the mark or takes over during the dive.
    // It rests out of sight, and starts over when the slideshow comes back.
    if (reel && !glass) {
      const want = videoAtStart() || view.t > params.reel;
      if (want && reel.readyState >= 2 && !onReel) { onReel = true; show(reel, -2, onScreen); }
      else if (onReel && !want) {
        onReel = false;
        reel.pause();
        reel.currentTime = 0;
        // Restore a still even when the slideshow is paused or its next image
        // has not loaded. The poster stays usable after being removed from the DOM.
        if (poster.complete && poster.naturalWidth) show(poster, -1, posterSlug);
        else { current = null; shown = -1; dirty = true; }
        ticks = every;
        load();
      }
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
    addEventListener('scrollend', track); // a jump back to the top put off while a fling ran
    poster.decode().then(() => { if (!current) show(poster, -1, posterSlug); }).catch(() => {});
    // The rows wait for their typeface rather than flash another.
    typeface(infoRows.join(' ')).then(() => { infoReady = true; dirty = maskDirty = true; });
    // A click dives in by itself, as a scroll through the track would, on
    // until the logo has settled in its corner (or, without it, a little past,
    // so the page below shows its edge); a scroll, touch or key of the
    // viewer's own takes over. At rest the click is on the mark; part way in,
    // or as the footer leaves, the mark is inert and the click falls through
    // to the track or the tail beneath, and from the tail it glides on round
    // the loop.
    document.addEventListener('click', (e) => {
      if (e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || !trackEl) return;
      if (!e.target.closest?.('[data-stage], [data-track], [data-loop]')) return;
      let to = diveEnd() + innerHeight * 0.2;
      if (landedLogo && intro) {
        const box = intro.getBoundingClientRect();
        to = Math.max(diveEnd(), box.top + scrollY - innerHeight + logoDistance(box));
      }
      const at = loopEl ? loopEl.getBoundingClientRect().top + scrollY : Infinity;
      const tail = scrollY + innerHeight > at;
      if (!tail && scrollY >= to - 1) return;
      e.preventDefault();
      glide(Math.ceil(to), tail ? at : 0);
    });
  }

  // On the reel, a click gives it sound (and, with reduced motion, starts it).
  let heard = false;
  document.addEventListener('click', (e) => {
    if (!onReel || under || e.target.closest?.('a, button, .about, .cta, .tweak')) return;
    heard = true;
    reel.muted = !reel.muted;
    if (reel.paused) reel.play().catch(() => {});
  });

  // From the tail, `wrap` is where the loop starts over: the glide begins that
  // far before the top and passes through it, as the scroll would.
  let gliding = 0;
  function glide(to, wrap = 0) {
    if (slow) return scrollTo(0, to);
    const run = ++gliding, from = scrollY - wrap, start = performance.now(), length = 2600;
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
      const y = from + (to - from) * (0.5 - Math.cos(Math.PI * x) / 2);
      scrollTo(0, y < 0 ? y + wrap : y);
      if (x < 1) requestAnimationFrame(step);
      else end();
    };
    requestAnimationFrame(step);
  }
  fit();
  addEventListener('resize', fit);
  loadMedia();
  requestAnimationFrame(tick);

  // ---- the tweak panel (H) -------------------------------------------------

  let pane = null;
  if (paneWasOpen()) openPane();

  async function openPane() {
    const { Pane } = await import('https://cdn.jsdelivr.net/npm/tweakpane@4.0.5/dist/tweakpane.min.js');
    pane = new Pane({ title: glass ? 'SMASH v2' : 'SMASH' });
    pane.element.parentElement.classList.add('tweak');
    const change = () => { drawMark(); loadMedia(); save(); };
    let relist = () => {};
    pane.addButton({ title: 'Reset all settings' }).on('click', () => {
      try { localStorage.removeItem(STORE); } catch {}
      Object.assign(params, BASE);
      relist();
      pane.refresh();
      paintGround(params);
      drawMark();
      loadMedia();
    });
    if (dives) pane.addBinding(params, 'videoFromStart', { label: 'video from start' });

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
      d.addBinding(params, 'reel', { label: 'film starts at', min: 0, max: 0.95, step: 0.01 });
      if (!glass) d.addBinding(params, 'vignette', { min: 0, max: 1, step: 0.01 });
      d.addBinding(params, 'overlap', { label: 'page moves before end', min: 0, max: 2, step: 0.05 }).on('change', track);
      d.addBinding(params, 'parallax', { label: 'pictures grow', min: 1, max: 1.6, step: 0.01 });
      d.addBinding(params, 'land', { label: 'land on a project' });
      const info = pane.addFolder({ title: 'Info' });
      info.addBinding(params, 'info', { label: 'rows of text' });
      info.addBinding(params, 'infoSize', { label: 'row height', min: 0.01, max: 0.08, step: 0.001 });
      info.addBinding(params, 'infoGap', { label: 'gap to the mark', min: 0, max: 0.05, step: 0.001 });
    }

    relist = addPalette(pane, params, () => { paintGround(params); save(); });
    const grain = pane.addFolder({ title: 'Grain' });
    grain.addBinding(params, 'grain', { label: 'grain (mark)', min: 0, max: 0.3, step: 0.005 }).on('change', () => paintGround(params));
    grain.addBinding(params, 'grainGround', { label: 'grain (ground)', min: 0, max: 0.3, step: 0.005 }).on('change', () => paintGround(params));

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
      remember(!pane.hidden);
    }
    if (key === 'a' || key === 's') {
      if (key === 'a') params.invert = !params.invert;
      if (key === 's') params.light = !params.light;
      pane?.refresh();
      drawMark();
      save();
    }
    if (key === 'd' || key === 'c') {
      if (key === 'd') params.whiteAccent = !params.whiteAccent;
      if (key === 'c') stepPalette(params, e.shiftKey ? -1 : 1);
      pane?.refresh();
      paintGround(params);
      save();
    }
  });
}

// A project's own page is the start of the feed: it carries on into the next
// project of its offering, round all of them, then into the other offerings'
// projects, the footer and the next one's opening between one offering and
// the next, without end; the address follows the one being read. The link to
// the next project is for pages without JavaScript.
// Between offerings, the next one's opening, its mark drawn as on its own page.
let drawMarks = () => {}; // (below)
const own = !stage && document.querySelector('main > article.project');
if (own) {
  own.querySelector('.next')?.remove();
  const end = document.querySelector('main > .cta');
  const feed = createFeed(own.parentElement, { end, onInsert: (el) => drawMarks(el) });
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

// The other pages. An offering's opens on its picture seen through the mark,
// drawn to the picture's size and to the viewer's own settings, as on the
// landing; and the tweak panel (H) is here too, with what applies here: the
// page's background, and the mark where there is one. Settings are shared
// with the landing's ('smash-mark'), only what differs from the defaults kept.
if (!stage) {
  const STORE = 'smash-mark';
  const BASE = { ...MARK_DEFAULTS, ...DIVE_DEFAULTS, ...GROUND_DEFAULTS };
  const params = { ...BASE, ...stored(STORE) };
  // On a project's page, the type tester (/typography/tester.js): the
  // typography round's heading and body faces tried on the page itself, a
  // folder in the panel, T and B to step through them.
  const tester = own ? import(`/typography/tester.js${build}`)
    .then((m) => m.start({ refit: () => document.querySelectorAll('main > .project').forEach(fitTitles) }))
    .catch((e) => { console.error('[type tester]', e); return null; }) : null;
  const save = () => {
    const changed = Object.fromEntries(Object.entries(params).filter(([k, v]) => v !== BASE[k]));
    try { localStorage.setItem(STORE, JSON.stringify(changed)); } catch {}
  };
  const marked = document.querySelector('[data-mark]');
  const drawOne = (el) => {
    el.style.webkitMaskImage = el.style.maskImage = toDataUrl(buildMark({ ...params, info: false }, el.clientWidth, el.clientHeight));
    el.classList.add('is-set');
  };
  const draw = () => document.querySelectorAll('[data-mark]').forEach(drawOne);
  drawMarks = (root) => root.querySelectorAll('[data-mark]').forEach(drawOne);
  draw();
  addEventListener('resize', draw);

  // An offering's page runs on past its footer into the next offering's, in
  // the order they are named under its title, round them without end, and
  // the address follows the one being read. Each is fetched once; a copy goes
  // in each time round.
  const offering = document.querySelector('main > .offering');
  if (offering) {
    const main = offering.parentElement;
    const order = [...offering.querySelectorAll('.category-nav a')].map((a) => a.pathname.split('/').at(-2));
    const home = location.pathname;
    const fetched = new Map();
    const get = (slug) => {
      if (!fetched.has(slug)) {
        fetched.set(slug, fetch(`/${slug}/`)
          .then((r) => (r.ok ? r.text() : Promise.reject()))
          .then((html) => new DOMParser().parseFromString(html, 'text/html').querySelector('main > .offering'))
          .catch(() => { fetched.delete(slug); return null; })); // offline: tried again later
      }
      return fetched.get(slug);
    };
    const offerings = () => main.querySelectorAll(':scope > .offering');
    let adding = false;
    // Keep a couple of screens ahead of the reader.
    const grow = () => {
      if (adding || main.getBoundingClientRect().bottom > innerHeight * 3) return;
      const last = [...offerings()].at(-1).dataset.slug;
      adding = true;
      get(order[(order.indexOf(last) + 1) % order.length]).then((el) => {
        if (!el) return setTimeout(() => { adding = false; soon(); }, 5000);
        const copy = el.cloneNode(true);
        main.append(copy);
        copy.querySelectorAll('[data-mark]').forEach(drawOne);
        adding = false;
        soon();
      });
    };
    // The one being read: the last whose top has passed the middle of the screen.
    const follow = () => {
      queued = false;
      grow();
      let reading = offering;
      for (const el of offerings()) {
        if (el.getBoundingClientRect().top > innerHeight / 2) break;
        reading = el;
      }
      const path = `/${reading.dataset.slug}/`;
      if (location.pathname !== path) {
        history.replaceState(history.state, '', path + location.search);
        document.title = `${reading.dataset.title} — SMASH`;
      }
      // Moved on to another offering, a reload opens that one from its top.
      if ('scrollRestoration' in history) history.scrollRestoration = location.pathname === home ? 'auto' : 'manual';
    };
    let queued = false;
    const soon = () => { if (!queued) { queued = true; requestAnimationFrame(follow); } };
    addEventListener('scroll', soon, { passive: true });
    addEventListener('resize', soon);
    soon();
  }

  let pane = null;
  const openPane = async () => {
    const { Pane } = await import('https://cdn.jsdelivr.net/npm/tweakpane@4.0.5/dist/tweakpane.min.js');
    pane = new Pane({ title: 'SMASH' });
    pane.element.parentElement.classList.add('tweak');
    let relist = () => {};
    pane.addButton({ title: 'Reset all settings' }).on('click', () => {
      try { localStorage.removeItem(STORE); } catch {}
      Object.assign(params, BASE);
      relist();
      pane.refresh();
      paintGround(params);
      draw();
      tester?.then((t) => t?.reset());
    });
    relist = addPalette(pane, params, () => { paintGround(params); save(); });
    const grain = pane.addFolder({ title: 'Grain' });
    grain.addBinding(params, 'grain', { label: 'grain (mark)', min: 0, max: 0.3, step: 0.005 });
    grain.addBinding(params, 'grainGround', { label: 'grain (ground)', min: 0, max: 0.3, step: 0.005 });
    if (marked) {
      const mark = pane.addFolder({ title: 'Mark' });
      mark.addBinding(params, 'stroke', { label: 'thickness', min: 2, max: 48, step: 0.5 });
      mark.addBinding(params, 'corner', { label: 'corners', min: 0, max: 40, step: 0.5 });
      mark.addBinding(params, 'caps', { label: 'ends', options: { round: 'round', square: 'square', flat: 'butt' } });
      mark.addBinding(params, 'inset', { label: 'end margin', min: 0, max: 200, step: 1 });
      mark.addBinding(params, 'crossbar', { label: 'crossbar', min: 60, max: 411, step: 0.5 });
      mark.addBinding(params, 'gap', { label: 'crossbar gap', min: 20, max: 200, step: 0.5 });
      mark.addBinding(params, 'columns', { label: 'spread', min: 0.5, max: 1.12, step: 0.005 });
      mark.addBinding(params, 'invert', { label: 'invert' });
    }
    await (await tester)?.addFolder(pane);
    pane.on('change', () => { paintGround(params); draw(); save(); });
  };
  if (paneWasOpen()) openPane();
  document.addEventListener('keydown', async (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || typing(e)) return;
    const key = e.key.toLowerCase();
    // (v3's labyrinth walks on WASD.)
    if ((key === 'd' || key === 'c') && !document.body.classList.contains('maze-page')) {
      if (key === 'd') params.whiteAccent = !params.whiteAccent;
      if (key === 'c') stepPalette(params, e.shiftKey ? -1 : 1);
      pane?.refresh();
      paintGround(params);
      save();
    }
    if (key !== 'h') return;
    if (!pane) await openPane();
    else pane.hidden = !pane.hidden;
    remember(!pane.hidden);
  });
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
