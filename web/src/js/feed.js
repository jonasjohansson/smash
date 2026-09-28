// The feed of projects: after one project's page comes the next one's, round
// the projects of its offering, then round each other offering's, and on
// without end; the footer and the next offering's opening come between one
// offering and the next, and the address follows the one being read. A
// project's own page is the start of one (main.js).
//
// Each project's page is fetched once, and only its article is taken; a copy
// goes into the feed each time round. The order is the #titles list the page
// carries.

const list = JSON.parse(document.getElementById('titles')?.textContent || '[]'); // [slug, title, offering]
export const titles = Object.fromEntries(list.map(([slug, title]) => [slug, title]));
const offering = Object.fromEntries(list.map(([slug, , of]) => [slug, of]));
const order = list.map(([slug]) => slug);

const RETRY = 5000; // ms before trying the network again
const OFFLINE = Symbol('offline');

// Without the link to the next project: the next one simply follows. A page
// that is not there resolves to null and is skipped; a failed request resolves
// to OFFLINE and is tried again once RETRY has passed.
const pages = new Map();
export function page(slug) {
  const cached = pages.get(slug);
  if (cached && !(cached.retryAt <= performance.now())) return cached;
  const request = fetch(`/${slug}/`)
    .then((r) => (r.ok ? r.text() : null))
    .then((html) => {
      const article = html && new DOMParser().parseFromString(html, 'text/html').querySelector('article.project');
      article?.querySelector('.next')?.remove();
      return article || null;
    })
    .catch(() => { request.retryAt = performance.now() + RETRY; return OFFLINE; });
  pages.set(slug, request);
  return request;
}

// An offering's opening (category.njk): its picture through the mark, its
// name and its introduction, without its projects (they follow in the feed)
// or its footer. Offline or not there, it is simply left out.
const opening = new Map();
function offeringHead(slug) {
  if (!opening.has(slug)) {
    opening.set(slug, fetch(`/${slug}/`)
      .then((r) => (r.ok ? r.text() : Promise.reject()))
      .then((html) => {
        const head = new DOMParser().parseFromString(html, 'text/html').querySelector('main > .offering');
        head?.querySelectorAll(':scope > .category-projects, :scope > .cta').forEach((el) => el.remove());
        if (head) titles[slug] = head.dataset.title;
        return head || null;
      })
      .catch(() => { opening.delete(slug); return null; }));
  }
  return opening.get(slug);
}

// The masks' typeface. Its stylesheet (main.css, data-info-font) has to be in
// before the typeface can be asked for, and WebKit runs this module before it
// is: asked too soon, the answer is that there is no such typeface yet.
const FONT = 'Anton';
const sheet = new Promise((resolve) => {
  const link = document.querySelector('link[data-info-font]');
  if (!link || link.sheet) return resolve();
  link.addEventListener('load', resolve, { once: true });
  link.addEventListener('error', resolve, { once: true });
});
export const typeface = (text) => sheet.then(() => document.fonts.load(`100px ${FONT}`, text)).catch(() => {});

// The ink of `text` set at 100px: left of and right of the origin, above and
// below the baseline. Read from its pixels, set large: WebKit's measureText
// gives the advance for the sides, not the ink.
const LARGE = 200;
const ruler = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
function ink(text) {
  ruler.font = `${LARGE}px ${FONT}`;
  const pad = LARGE / 2, base = LARGE * 1.5;
  const w = Math.ceil(ruler.measureText(text).width + 2 * pad), h = LARGE * 2;
  Object.assign(ruler.canvas, { width: w, height: h }); // clears it, and its font
  ruler.font = `${LARGE}px ${FONT}`;
  ruler.fillText(text, pad, base);
  const px = ruler.getImageData(0, 0, w, h).data;
  let x0 = w, x1 = -1, y0 = h, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (px[(y * w + x) * 4 + 3] < 128) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      y1 = y;
    }
  }
  if (x1 < 0) return null;
  const k = 100 / LARGE;
  return { left: (pad - x0) * k, right: (x1 + 1 - pad) * k, up: (base - y0) * k, down: (y1 + 1 - base) * k };
}

// A project's title as the mask of its hero (project.njk): its letters sized
// by their ink, so that stretched over the hero they meet its edges exactly,
// accents and all. Until the typeface is in, a guess from the length stands.
export async function fitTitle(svg) {
  const text = svg?.querySelector('text');
  const words = text?.textContent;
  if (!words) return;
  await typeface(words);
  if (text.textContent !== words) return; // changed while the typeface loaded
  const m = ink(words);
  if (m) svg.setAttribute('viewBox', `${-m.left} ${-m.up} ${m.left + m.right} ${m.up + m.down}`);
}
export const fitTitles = (root) => root.querySelectorAll('.title-mask').forEach(fitTitle);

// Videos play only while on screen: the feed only grows, and every copy left
// playing above the reader would go on decoding.
const inView = new IntersectionObserver((entries) => {
  for (const { target, isIntersecting } of entries) {
    if (isIntersecting) target.play().catch(() => {});
    else target.pause();
  }
});
const watch = (article) => article.querySelectorAll('video[autoplay]').forEach((v) => inView.observe(v));

// Projects go in before `end`, the page's own footer, which stays hidden
// (main.css): where one offering gives way to the next, a copy of it goes in,
// then the next offering's opening (`onInsert` draws its mark).
export function createFeed(container, { end = null, onInsert } = {}) {
  const articles = () => container.querySelectorAll(':scope > .project');
  const readable = () => container.querySelectorAll(':scope > .project, :scope > .offering');
  let feed = [...articles()].map((a) => a.dataset.slug);
  articles().forEach(watch);
  articles().forEach(fitTitles);
  let feeding = false; // one on its way
  let missing = 0; // in a row without a page: all of them, and the feed stops
  let run = 0; // bumped whenever the feed starts over
  const home = location.pathname;
  const homeTitle = document.title;

  function clear() {
    run++;
    articles().forEach((a) => {
      a.querySelectorAll('video').forEach((v) => inView.unobserve(v));
      a.remove();
    });
    container.querySelectorAll(':scope > [data-between]').forEach((f) => f.remove());
    feed = [];
    feeding = false;
    missing = 0;
  }

  // Resolves true once `slug` is in (or skipped, if it has no page); offline,
  // it waits and tries the same one again, for as long as this run lasts.
  function append(slug) {
    const mine = run;
    feeding = true;
    const before = feed.at(-1);
    const turn = end && before && offering[before] !== offering[slug];
    return Promise.all([page(slug), turn ? offeringHead(offering[slug]) : null]).then(([article, head]) => {
      if (mine !== run) return false;
      if (article === OFFLINE) {
        return new Promise((resolve) => setTimeout(resolve, RETRY)).then(() => mine === run && append(slug));
      }
      feeding = false;
      feed.push(slug);
      if (!article) return ++missing < order.length;
      missing = 0;
      if (turn) {
        for (const el of [end, head]) {
          if (!el) continue;
          const copy = el.cloneNode(true);
          copy.dataset.between = '';
          container.insertBefore(copy, end);
          onInsert?.(copy);
        }
      }
      const copy = article.cloneNode(true);
      container.insertBefore(copy, end);
      watch(copy);
      fitTitles(copy);
      return true;
    });
  }

  // Keep a couple of screens of project ahead of the reader.
  function grow() {
    if (!feed.length || feeding || missing >= order.length) return;
    if (container.getBoundingClientRect().bottom > innerHeight * 3) return;
    const at = order.indexOf(feed.at(-1));
    append(order[(at + 1) % order.length]).then((ok) => ok && grow());
  }

  return {
    get first() { return feed[0]; },
    get length() { return feed.length; },
    clear,
    grow,

    // Start over from `slug`; resolves true once its page is in.
    start(slug) {
      if (feed[0] === slug) return Promise.resolve(true);
      // Never leave another project's page below while this one loads.
      clear();
      return append(slug);
    },

    // The project (or offering's opening) being read: the last one whose top
    // has passed the middle of the screen ('' before the first).
    read() {
      let slug = '';
      for (const article of readable()) {
        if (article.getBoundingClientRect().top > innerHeight / 2) break;
        slug = article.dataset.slug;
      }
      return slug;
    },

    // The address of `slug`, or of the page the feed started on.
    address(slug) {
      const path = slug ? `/${slug}/` : home;
      if (location.pathname === path) return;
      history.replaceState(history.state, '', path + location.search);
      document.title = slug && titles[slug] ? `${titles[slug]} — SMASH` : homeTitle;
    },
  };
}
