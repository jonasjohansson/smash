// The original and the six directions, in order, and a safe way to load them: a module that
// fails to load, or a function that throws, becomes an error on the page
// instead of taking the page down with it.

// The focus round (2026-09-28): the original and the struck lean; the struck lean came off
// too on 2026-09-30 (Jonas). Reassembled, Impact, Cut,
// Alignment and Crack Line were set aside; their modules stay in directions/ for the record.
export const SLUGS = ['original'];

export async function loadDirections(only) {
  const slugs = only ? SLUGS.filter((s) => s === only) : SLUGS;
  return Promise.all(slugs.map(async (slug, i) => {
    try {
      const mod = await import(`./directions/${slug}.js`);
      return { slug, mod, info: { n: i, name: slug, lane: '', palette: {}, type: {}, application: {}, ...mod.info } };
    } catch (error) {
      console.error(`[identity] ${slug} failed to load`, error);
      return { slug, mod: {}, info: { n: SLUGS.indexOf(slug), name: slug, lane: '', palette: {}, type: {}, application: {} }, error };
    }
  }));
}

/** Call fn and return what it returns, or a message panel if it throws or is missing. */
export function attempt(d, fn, ...args) {
  const f = d.mod[fn];
  if (typeof f !== 'function') return { error: `${d.slug}: ${fn}() is not there yet` };
  try {
    return { value: f(...args) };
  } catch (error) {
    console.error(`[identity] ${d.slug}.${fn}() threw`, error);
    return { error: `${d.slug}.${fn}(): ${error.message}` };
  }
}

export const errorHTML = (message) => `<div class="error">${String(message).replace(/[<&]/g, (c) => (c === '<' ? '&lt;' : '&amp;'))}</div>`;

/** Load a direction's font stylesheets once. */
const loaded = new Set();
export function loadFonts(info) {
  for (const href of info.type?.fonts ?? []) {
    if (loaded.has(href)) continue;
    loaded.add(href);
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }
}

/** Wait for a controller's `ready` promise, if it has one, but no longer than ms. */
export const settle = (ctrl, ms = 6000) =>
  Promise.race([Promise.resolve(ctrl?.ready), new Promise((r) => setTimeout(r, ms))]);

export const pad = (n) => String(n).padStart(2, '0');

export const STORY = {
  headline: 'Smash ultimately wants to make people feel.',
  body: 'Smash is an immersive experience studio creating physical and digital experiences that make people feel. They combine art, technology, storytelling and spatial experiences to create memorable moments, from large-scale public installations to intimate museum experiences.',
};
