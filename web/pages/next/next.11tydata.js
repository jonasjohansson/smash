// Data for every page of the next site (/next/): its layout, `work` (the
// projects, newest first, each with its room on the home page) and
// `stories` (each project's page, from story.js). The existing site's data
// stays untouched.

import { readProjects } from '../../scripts/projects.js';
import { stories } from '../../_includes/next/story.js';

// Home: one room per project, full bleed, people inside the work. Each file
// stands for its project here and nowhere else (the cover, the hero and the
// flow use others: story.js). `focus` keeps the people and the light in frame
// where the room is cropped: a phone shows the middle half of the width, a
// 1440 × 900 screen a little less than the full height. `alt` where data.md
// has none.
const HOME = {
  jagad: { file: '08.jpg', focus: '46% 50%', alt: 'A crowd on the pavement at night watches the game cover the building across the street.' },
  'vi-kommer-i-fred': { file: '03.jpg', focus: '58% 50%', alt: 'A visitor crouches and points up beside the screen in Kungsträdgården, the Royal Castle behind.' },
  'dome-conductor': { file: 'dome-experience.jpg', focus: '62% 50%' },
  'danny-saucedo': { file: '03.jpg', focus: '44% 40%', alt: 'Danny Saucedo sings on the Melodifestivalen stage, the projected gate behind him.' },
  heroes: { file: '01.jpg', focus: '48% 50%' },
  resonance: { file: '02.jpg', focus: '54% 60%', alt: 'A visitor jumps between the lit pads in the square as colour runs across Uppsala Town Hall.' },
  'sala-hjartslag': { file: '01.jpg', focus: '42% 50%' },
};

const base = (src = '') => src.split('/').pop();

function home(p) {
  const h = HOME[p.slug];
  const images = p.blocks.filter((b) => b.type === 'image');
  const b = (h && images.find((x) => base(x.src) === h.file)) ?? images[0];
  if (!b) return null;
  return { src: b.src, ar: Number(b.ar) || 1.5, alt: b.alt || h?.alt || '', focus: h?.focus ?? null };
}

export default async function () {
  const list = await readProjects('projects');
  const work = list.map((p) => ({
    slug: p.slug,
    title: p.title,
    home: home(p),
    url: `/next/work/${p.slug}/`,
  }));
  return { layout: 'next/base.njk', work, stories: await stories() };
}
