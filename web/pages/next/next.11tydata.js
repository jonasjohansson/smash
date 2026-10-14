// Data for every page of the next site (/next/): its layout, `work` (the
// projects, newest first, each with how the home page shows it) and
// `stories` (each project's page, from story.js). The existing site's data
// stays untouched.

import { readProjects } from '../../scripts/projects.js';
import { stories, columns } from '../../_includes/next/story.js';

// Home plates, all inside the margins: `plate` is one picture across the 12
// columns, `row` two or three on whole columns (story.js, columns()); `media`
// names files of the project (images or videos) in the order shown; `focus`
// is an object-position for them.
const PLATES = {
  jagad: { plate: 'plate', media: ['01-corrected.jpg'] },
  'vi-kommer-i-fred': { plate: 'row', media: ['03.jpg', '07.webm'] },
  'dome-conductor': { plate: 'plate', media: ['young-conductor.jpg'], focus: '50% 30%' },
  'danny-saucedo': { plate: 'plate', media: ['03.jpg'] },
  heroes: { plate: 'plate', media: ['01.jpg'] },
  resonance: { plate: 'row', media: ['02.jpg', '04.jpg'] },
  'sala-hjartslag': { plate: 'row', media: ['01-poster.jpg', '01.jpg'] },
};

// Without an entry above, plates alternate.
const CYCLE = ['plate', 'row'];

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
  const m = PLATES[p.slug] ?? {};
  let kind = m.plate ?? CYCLE[i % CYCLE.length];
  let names = m.media;
  if (!names) {
    const visual = p.blocks.filter((b) => b.type === 'image' || b.type === 'video');
    const portraits = visual.filter((b) => b.ar < 1);
    if (kind === 'row' && portraits.length < 2) kind = 'plate';
    names = (kind === 'row' ? portraits.slice(0, 3) : [p.cover ?? visual[0]]).filter(Boolean).map((b) => base(b.src));
  }
  const items = media(p, names);
  if (kind === 'row' && items.length < 2) kind = 'plate';
  return { kind, focus: m.focus ?? null, ...columns(items) };
}

export default async function () {
  const list = await readProjects('projects');
  const work = list.map((p, i) => ({
    slug: p.slug,
    title: p.title,
    plate: plateFor(p, i),
    url: `/next/work/${p.slug}/`,
  }));
  return { layout: 'next/base.njk', work, stories: await stories() };
}
