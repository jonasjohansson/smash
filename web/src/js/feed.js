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

// Without the link to the next project: the next one simply follows.
const pages = new Map();
export function page(slug) {
  if (!pages.has(slug)) {
    pages.set(slug, fetch(`/work/${slug}/`)
      .then((r) => (r.ok ? r.text() : Promise.reject(r.status)))
      .then((html) => {
        const article = new DOMParser().parseFromString(html, 'text/html').querySelector('article.project');
        article?.querySelector('.next')?.remove();
        return article;
      })
      .catch(() => null)); // skipped from then on
  }
  return pages.get(slug);
}

export function createFeed(container) {
  let feed = [...container.querySelectorAll(':scope > .project')].map((a) => a.dataset.slug);
  let feeding = false; // one on its way
  let failed = 0; // in a row: give up after a few
  let run = 0; // bumped whenever the feed starts over
  const home = location.pathname;
  const homeTitle = document.title;

  function clear() {
    run++;
    container.querySelectorAll(':scope > .project').forEach((a) => a.remove());
    feed = [];
    feeding = false;
    failed = 0;
  }

  function append(slug) {
    const mine = run;
    feeding = true;
    return page(slug).then((article) => {
      if (mine !== run) return false;
      feeding = false;
      if (!article) { feed.push(slug); failed++; return false; }
      failed = 0;
      const copy = article.cloneNode(true);
      container.append(copy);
      feed.push(slug);
      for (const v of copy.querySelectorAll('video[autoplay]')) v.play().catch(() => {});
      return true;
    });
  }

  return {
    get first() { return feed[0]; },
    get length() { return feed.length; },
    clear,

    // Start over from `slug`; resolves true once its page is in.
    start(slug) {
      if (feed[0] === slug) return Promise.resolve(true);
      // Never leave another project's page below while this one loads.
      clear();
      return append(slug);
    },

    // Keep a couple of screens of project ahead of the reader.
    grow() {
      if (!feed.length || feeding || failed >= 3 || container.getBoundingClientRect().bottom > innerHeight * 3) return;
      const at = order.indexOf(feed.at(-1));
      append(order[(at + 1) % order.length]).then((ok) => ok && this.grow());
    },

    // The project being read: the last one whose top has passed the middle of
    // the screen ('' before the first).
    read() {
      let slug = '';
      for (const article of container.querySelectorAll(':scope > .project')) {
        if (article.getBoundingClientRect().top > innerHeight / 2) break;
        slug = article.dataset.slug;
      }
      return slug;
    },

    // The address of `slug`, or of the page the feed started on.
    address(slug) {
      const path = slug ? `/work/${slug}/` : home;
      if (location.pathname === path) return;
      history.replaceState(history.state, '', path + location.search);
      document.title = slug && titles[slug] ? `${titles[slug]} — SMASH` : homeTitle;
    },
  };
}
