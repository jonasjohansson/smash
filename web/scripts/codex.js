import { readProjects } from './projects.js';

/**
 * The projects, from Codex (SMASH OS) when the build is given its feed, else
 * from `projects/` as before. Set CODEX_FEED to the feed's address
 * (https://os.smash.studio/api/codex-site) and every page, the landing's
 * slideshow and the offerings read the projects SMASH has published there;
 * leave it unset and nothing changes.
 *
 * The feed gives each project already in the shape readProjects() makes
 * (slug, title, caption, category, date, featured, colour, blocks), so the
 * templates and the layout composer read it as they read data.md. Its
 * pictures are web copies, 2400 px on the long side, at their own addresses;
 * eleventy-img fetches and resizes them as it does the files here. Its films
 * play from Mux: an MP4 for the page, with a poster frame.
 *
 * A build that cannot read the feed, or reads one with no projects, stops
 * rather than publish an empty site: the site already deployed stays up.
 * The contract: smash-os apps/web/docs/design/codex-web.md.
 */

const VERSION = 1;
let feed = null;

/** One feed request per build; ?build= so a build never reads a cached feed. */
async function fetchFeed(url) {
  const res = await fetch(`${url}${url.includes('?') ? '&' : '?'}build=${Date.now()}`);
  if (!res.ok) throw new Error(`[codex] the feed answered ${res.status} (${url})`);
  const data = await res.json();
  if (data.version !== VERSION) throw new Error(`[codex] the feed is version ${data.version}; this site reads version ${VERSION}`);
  if (!Array.isArray(data.projects) || !data.projects.length) {
    if (process.env.CODEX_ALLOW_EMPTY) return [];
    throw new Error('[codex] the feed has no projects, so the build stops rather than publish an empty site (CODEX_ALLOW_EMPTY=1 to allow it)');
  }
  return data.projects;
}

const ratio = (b, fallback) => (b.width && b.height ? b.width / b.height : fallback);

/** A feed block as readProjects() gives one: aspect ratio, and a film's poster. */
export function toBlock(b) {
  if (b.type === 'image') return { ...b, ar: ratio(b, 3 / 2) };
  if (b.type === 'video') return { ...b, src: b.mp4, poster: b.poster ?? null, ar: ratio(b, 16 / 9) };
  return b;
}

/** A feed project as readProjects() gives one. */
export function toProject(p) {
  const blocks = (p.blocks ?? []).map(toBlock);
  const cover = blocks.find((b) => b.type === 'image') ?? null;
  return {
    slug: p.slug,
    title: p.title,
    caption: p.caption ?? null,
    category: p.category ?? null,
    thumb: (p.thumb && blocks.find((b) => b.type === 'image' && b.id === p.thumb)) || cover,
    color: p.color ?? '#808080',
    date: p.date,
    year: p.year ?? Number(String(p.date).slice(0, 4)),
    tags: p.tags ?? [],
    featured: p.featured ?? null,
    blocks,
    cover,
  };
}

export const fromCodex = () => Boolean(process.env.CODEX_FEED);

/** The projects on the site, newest first: Codex's when CODEX_FEED is set. */
export async function loadProjects(root = 'projects') {
  if (!fromCodex()) return readProjects(root);
  feed ??= fetchFeed(process.env.CODEX_FEED).then((list) => list.map(toProject));
  return (await feed).toSorted((a, b) => String(b.date).localeCompare(String(a.date)));
}
