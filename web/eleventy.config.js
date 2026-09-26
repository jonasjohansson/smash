import path from 'node:path';
import Image from '@11ty/eleventy-img';
import markdownIt from 'markdown-it';
import { listed, readProjects } from './scripts/projects.js';
import { readCategories } from './scripts/categories.js';
import { compose, indexLayout } from './scripts/compose.js';

const md = markdownIt({ html: true, linkify: true });
const external = (html) => html.replace(/<a href="(https?:[^"]*)">/g, '<a href="$1" target="_blank" rel="noopener">');

const IMAGE_OPTIONS = {
  widths: [640, 1280, 2000],
  formats: ['webp', 'jpeg'],
  outputDir: 'dist/img/',
  urlPath: '/img/',
  sharpJpegOptions: { quality: 78, progressive: true },
  sharpWebpOptions: { quality: 76 },
};

/** `<picture>` at the widths the grid actually uses; `sizes` comes from the column span. */
async function image(src, alt = '', sizes = '100vw', loading = 'lazy', className = '') {
  const meta = await Image(src, IMAGE_OPTIONS);
  return Image.generateHTML(meta, {
    alt, sizes, loading, decoding: 'async',
    ...(className && { class: className }),
    ...(loading === 'eager' && { fetchpriority: 'high' }),
  });
}

/**
 * Just a URL, for code that loads images itself (the slideshow, the gate).
 * Same options as `image`, so it reuses those files rather than making more.
 */
async function imageSrc(src, width = 640, format = 'jpeg') {
  const sizes = (await Image(src, IMAGE_OPTIONS))[format];
  return (sizes.filter((s) => s.width <= width).at(-1) ?? sizes[0]).url;
}

export default function (config) {
  config.addPassthroughCopy({ 'src/css': 'css', 'src/fonts': 'fonts', 'src/js': 'js', 'src/CNAME': 'CNAME', 'src/brand': 'brand', 'src/gate': 'gate', 'src/v3': 'assets/v3', 'src/reel': 'reel', 'src/clients': 'clients' });
  // The videos of the projects on the site, and their poster frames.
  for (const { slug, data } of listed('projects')) {
    for (const b of (data.blocks ?? []).filter((b) => b.type === 'video')) {
      config.addPassthroughCopy(`projects/${slug}/${b.src}`);
      if (b.poster) config.addPassthroughCopy(`projects/${slug}/${b.poster}`);
    }
  }
  config.addWatchTarget('src/');
  config.addWatchTarget('scripts/');
  config.addWatchTarget('projects/');
  config.addWatchTarget('categories/');

  config.addFilter('md', (text) => external(md.render(text || '')));
  config.addFilter('mdInline', (text) => external(md.renderInline(text || '')));
  config.addFilter('year', (date) => new Date(date).getFullYear());
  config.addFilter('pad', (n) => String(n).padStart(2, '0'));
  config.addAsyncShortcode('image', image);
  config.addAsyncShortcode('imageSrc', imageSrc);

  config.addGlobalData('projects', async () => {
    const projects = (await readProjects('projects')).map((p) => ({ ...p, rows: compose(p) }));
    const index = indexLayout(projects);
    // A project's page goes once round the projects of its offering (feed.js),
    // newest first; without JavaScript, by the link to the next of them.
    return projects.map((p, i) => {
      const round = p.category ? projects.filter((q) => q.category === p.category) : projects;
      const next = round[(round.indexOf(p) + 1) % round.length];
      return { ...p, tile: index[i], round: round.map(({ slug, title }) => ({ slug, title })), next: next === p ? null : next };
    });
  });
  // The landing's slideshow: every image of every project, at two sizes, and
  // a third for the one the dive lands on, full screen.
  config.addGlobalData('frames', async () => {
    const projects = await readProjects('projects');
    const frames = [];
    for (const p of projects) {
      for (const b of p.blocks.filter((b) => b.type === 'image')) {
        frames.push({
          slug: p.slug,
          s: await imageSrc(b.src, 640, 'webp'),
          l: await imageSrc(b.src, 1280, 'webp'),
          x: await imageSrc(b.src, 2000, 'webp'),
        });
      }
    }
    return frames;
  });
  // Project covers for the WebGL pages (the labyrinth).
  config.addGlobalData('slides', async () => {
    const projects = await readProjects('projects');
    return Promise.all(projects.map(async (p) => ({
      slug: p.slug, title: p.title, ar: p.cover.ar,
      s: await imageSrc(p.cover.src, 640, 'webp'), l: await imageSrc(p.cover.src, 1280, 'webp'),
    })));
  });
  config.addGlobalData('poster', async () => {
    const projects = await readProjects('projects');
    const first = projects.filter((p) => p.featured).sort((a, b) => a.featured - b.featured)[0]
      ?? projects.find((p) => p.cover?.ar > 1.2) ?? projects[0];
    return { slug: first.slug, src: await imageSrc(first.cover.src, 1280, 'webp') };
  });
  // The studio's offerings (categories/): under its introduction on the
  // landing, a tall picture each, leading to its own page with its projects.
  config.addGlobalData('categories', async () => {
    const projects = await readProjects('projects');
    const categories = readCategories('categories');
    for (const p of projects) {
      if (!categories.some((c) => c.slug === p.category)) console.warn(`[smash] ${p.slug} is in no category ('${p.category ?? ''}'), so on no category page`);
    }
    return Promise.all(categories.map(async (c) => {
      const [from, src] = String(c.picture).split('/');
      const block = projects.find((q) => q.slug === from)?.blocks.find((b) => b.type === 'image' && path.basename(b.src) === src);
      if (!block) throw new Error(`${c.name}'s picture, ${c.picture}, is not an image of a project on the site`);
      // A tall panel crops the picture to its height: nearly the screen's on
      // a desktop, 5:4 of the width on a phone.
      const ar = Math.max(1, block.ar);
      return {
        ...c,
        words: c.name.split(' '),
        hero: { src: block.src, alt: block.alt ?? '' },
        picture: await image(block.src, block.alt ?? '', `(max-width: 720px) ${Math.ceil(125 * ar)}vw, ${Math.ceil(100 * ar)}vh`),
        projects: projects.filter((p) => p.category === c.slug).map(({ slug, title, caption, year, thumb }) => ({ slug, title, caption, year, cover: thumb })),
      };
    }));
  });
  // Stamped on every stylesheet and script address, so a page is never shown
  // with a stylesheet or script from an earlier build still in the browser's
  // cache (GitHub Pages lets them be kept for ten minutes).
  const build = Date.now().toString(36);
  config.addGlobalData('build', build);
  config.addGlobalData('featured', async () =>
    (await readProjects('projects')).filter((p) => p.featured).sort((a, b) => a.featured - b.featured));

  return {
    dir: { input: 'pages', includes: '../_includes', data: '../_data', output: 'dist' },
    templateFormats: ['njk'],
    htmlTemplateEngine: 'njk',
  };
}
