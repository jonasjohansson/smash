// The endless feed of projects: after one project's page comes the next one's,
// round all of them and on, and the address follows the one being read.
// A project's own page is the start of one; so is the landing, once its dive
// has landed (main.js).
//
// Each project's page is fetched once, and only its article is taken; a copy
// goes into the feed, so a project can come round again. The order is the
// site's, newest first, from the #titles list the page carries.

const list = JSON.parse(document.getElementById('titles')?.textContent || '[]'); // [slug, title]
export const titles = Object.fromEntries(list);
const order = list.map(([slug]) => slug);
export const first = order[0]; // the newest

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

// A project's title as the mask of its hero (project.njk): its letters sized
// by their ink, so that stretched over the hero they meet its edges exactly,
// accents and all. Until the typeface is in, a guess from the length stands.
const FONT = 'Anton';
const ruler = document.createElement('canvas').getContext('2d');
export async function fitTitle(svg) {
  const text = svg?.querySelector('text');
  const words = text?.textContent;
  if (!words) return;
  await document.fonts.load(`100px ${FONT}`, words).catch(() => {});
  if (text.textContent !== words) return; // changed while the typeface loaded
  ruler.font = `100px ${FONT}`;
  const m = ruler.measureText(words);
  const w = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
  const h = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
  if (w > 0 && h > 0) svg.setAttribute('viewBox', `${-m.actualBoundingBoxLeft} ${-m.actualBoundingBoxAscent} ${w} ${h}`);
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

export function createFeed(container) {
  const articles = () => container.querySelectorAll(':scope > .project');
  let feed = [...articles()].map((a) => a.dataset.slug);
  articles().forEach(watch);
  articles().forEach(fitTitles);
  let feeding = false; // one on its way
  let missing = 0; // pages not there, in a row: give up after a few
  let run = 0; // bumped whenever the feed starts over
  const home = location.pathname;
  const homeTitle = document.title;

  function clear() {
    run++;
    articles().forEach((a) => {
      a.querySelectorAll('video').forEach((v) => inView.unobserve(v));
      a.remove();
    });
    feed = [];
    feeding = false;
    missing = 0;
  }

  // Resolves true once `slug` is in (or skipped, if it has no page); offline,
  // it waits and tries the same one again, for as long as this run lasts.
  function append(slug) {
    const mine = run;
    feeding = true;
    return page(slug).then((article) => {
      if (mine !== run) return false;
      if (article === OFFLINE) {
        return new Promise((resolve) => setTimeout(resolve, RETRY)).then(() => mine === run && append(slug));
      }
      feeding = false;
      feed.push(slug);
      if (!article) { missing++; return true; }
      missing = 0;
      const copy = article.cloneNode(true);
      // Scrolled into, not opened: its hero shows whole, the title over it
      // (the mask is for a project's own page).
      copy.classList.add('in-feed');
      container.append(copy);
      watch(copy);
      fitTitles(copy);
      return true;
    });
  }

  // Keep a couple of screens of project ahead of the reader.
  function grow() {
    if (!feed.length || feeding || missing >= 3 || container.getBoundingClientRect().bottom > innerHeight * 3) return;
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

    // The project being read: the last one whose top has passed the middle of
    // the screen ('' before the first).
    read() {
      let slug = '';
      for (const article of articles()) {
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
