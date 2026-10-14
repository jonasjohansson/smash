// Data for every page of the next site (/next/): its layout, and what the
// projects' data.md files do not say yet, kept here so the existing site's
// data stays untouched. Each field below could later move into data.md under
// the same name (client, role, plate, plateImages, lead, focus).
//
// `work` is the site's projects, newest first, numbered, with these
// additions and the derived facts merged in (read here rather than computed
// from the global `projects`, so pages can paginate over it). Templates read
// only it. `counts` is projects per offering, by its slug.

import { readProjects } from '../../scripts/projects.js';
import { readCategories } from '../../scripts/categories.js';
// [work pages] the projects as the studio tells them (/next/work/...): words, captions, facts, flow.
import { stories } from '../../_includes/next/story.js';

const MEDIUM = {
  mapping: 'Projection mapping',
  av: 'Audiovisual',
  'mixed reality': 'Mixed reality',
  stage: 'Stage design',
  interactive: 'Interactive',
  game: 'Game',
};

// Home plates: `plate` is room | plate | right | left | row; `media` names
// files of the project (images or videos) in the order shown. `lead` is the
// plate's sentence in the studio's voice.
const META = {
  jagad: {
    client: 'Kanal 5',
    plate: 'room',
    media: ['01-corrected.jpg'],
    lead: 'For three nights, a five-storey building in central Stockholm became an arcade game, played from joysticks on the pavement.',
  },
  'vi-kommer-i-fred': {
    client: 'TV4',
    plate: 'row',
    media: ['03.jpg', '06.jpg', '07.webm'],
    lead: 'Facing the Royal Castle, a screen pulled everyone who walked past into an alien invasion of Stockholm, day and night for two weeks.',
  },
  'dome-conductor': {
    client: 'KTH Royal Institute of Technology',
    plate: 'right',
    media: ['young-conductor.jpg'],
    lead: 'Visitors step into the Wisdome and conduct the Swedish Radio Symphony Orchestra with their hands. Move faster and it speeds up; pause and it waits.',
  },
  'danny-saucedo': {
    client: 'Melodifestivalen',
    plate: 'room',
    media: ['01.jpg'],
    lead: 'A stage for Melodifestivalen 2024: three LED walls, an LED floor, and a Romanesque gate built to be mapped.',
  },
  heroes: {
    client: 'World Jewish Congress, Raoul Wallenberg Academy',
    plate: 'left',
    media: ['01.jpg'],
    lead: 'Statues of Raoul Wallenberg and Dag Hammarskjöld, scanned in 3D and set into the drone-scanned facade of Stockholm’s Great Synagogue.',
  },
  resonance: {
    client: 'Allt ljus på Uppsala',
    plate: 'row',
    media: ['02.jpg', '04.jpg'],
    lead: 'Four lit pads in the square let anyone paint Uppsala Town Hall in colour. Press all four at once and the building answers.',
  },
  'sala-hjartslag': {
    client: 'City of Sala',
    plate: 'plate',
    media: ['01.jpg'],
    lead: 'Four hundred years of a town’s history, drawn onto the curve of one facade for Sala’s anniversary.',
  },
};

// Without an entry above, plates cycle in this order (spec 7.3).
const CYCLE = ['room', 'row', 'right', 'room', 'left', 'row'];

const strip = (md = '') => md.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[*_`]/g, '').trim();
const base = (src = '') => src.split('/').pop();

function media(p, names) {
  const pick = (name) => p.blocks.find((b) => (b.type === 'image' || b.type === 'video') && base(b.src) === name);
  return names.map(pick).filter(Boolean).map((b) => ({
    type: b.type,
    src: b.src, // image: projects/slug/file (for the image shortcode); video: /projects/slug/file
    poster: b.poster ?? null,
    alt: b.alt ?? '',
    ar: b.ar,
  }));
}

function plateFor(p, i) {
  const m = META[p.slug] ?? {};
  let kind = m.plate ?? CYCLE[i % CYCLE.length];
  let names = m.media;
  if (!names) {
    const visual = p.blocks.filter((b) => b.type === 'image' || b.type === 'video');
    const portraits = visual.filter((b) => b.ar < 1);
    if (kind === 'row' && portraits.length < 2) kind = 'plate';
    names = (kind === 'row' ? portraits.slice(0, 3) : [p.cover ?? visual[0]]).filter(Boolean).map((b) => base(b.src));
  }
  const items = media(p, names);
  // A row's pictures share one height: each takes width in proportion to its aspect.
  const sum = items.reduce((s, b) => s + b.ar, 0);
  return { kind, items: items.map((b) => ({ ...b, share: b.ar / sum })) };
}

export default async function () {
  const list = await readProjects('projects');
  const cats = Object.fromEntries(readCategories('categories').map((c) => [c.slug, c.name]));
  const counts = {};
  for (const p of list) counts[p.category] = (counts[p.category] ?? 0) + 1;
  const work = list.map((p, i) => {
    const m = META[p.slug] ?? {};
    const firstText = p.blocks.find((b) => b.type === 'text' && !b.label);
    return {
      slug: p.slug,
      title: p.title,
      year: p.year,
      color: p.color,
      place: p.caption,
      category: p.category,
      offering: cats[p.category] ?? null,
      client: m.client ?? null,
      role: m.role ?? null,
      medium: (p.tags ?? []).map((t) => MEDIUM[t]).filter(Boolean).join(', ') || null,
      lead: m.lead ?? strip(firstText?.content),
      number: String(i + 1).padStart(2, '0'),
      cover: p.cover ? { src: p.cover.src, alt: p.cover.alt ?? '', ar: p.cover.ar } : null,
      plate: plateFor(p, i),
      url: `/next/work/${p.slug}/`,
    };
  });
  return { layout: 'next/base.njk', medium: MEDIUM, counts, work, stories: await stories() /* [work pages] */ };
}
