import fs from 'node:fs/promises';
import path from 'node:path';
import Image from '@11ty/eleventy-img';
import sharp from 'sharp';
import markdownIt from 'markdown-it';
import { asset, listed, readProjects } from './scripts/projects.js';
import { readCategories } from './scripts/categories.js';
import { compose, indexLayout } from './scripts/compose.js';
import { ogImage, summary } from './scripts/og.js';

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
  config.addPassthroughCopy({ 'src/css': 'css', 'src/fonts': 'fonts', 'src/js': 'js', 'src/CNAME': 'CNAME', 'src/brand': 'brand', 'src/gate': 'gate', 'src/v3': 'assets/v3', 'src/reel': 'reel', 'src/clients': 'clients', 'src/typeface': 'typeface', 'src/identity': 'identity', 'src/typography': 'typography' });
  // The videos of the projects on the site, and their poster frames.
  for (const { slug, data } of listed('projects')) {
    for (const b of (data.blocks ?? []).filter((b) => b.type === 'video')) {
      config.addPassthroughCopy(asset(`projects/${slug}`, b.src));
      if (b.poster) config.addPassthroughCopy(asset(`projects/${slug}`, b.poster));
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
    // A project's page runs on without end (feed.js): round the projects of
    // its offering from itself, newest first, then round each offering after
    // it in turn, and back to itself; without JavaScript, by the link to the
    // next of them. Shared, it shows its card's picture and the start of its
    // introduction.
    const offerings = readCategories('categories').map((c) => c.slug);
    const of = (slug) => projects.filter((q) => q.category === slug);
    const from = (list, p) => { const i = list.indexOf(p); return [...list.slice(i), ...list.slice(0, i)]; };
    return Promise.all(projects.map(async (p, i) => {
      const at = offerings.indexOf(p.category);
      const round = at < 0 ? from(projects, p)
        : [...from(of(p.category), p), ...[...offerings.slice(at + 1), ...offerings.slice(0, at)].flatMap(of)];
      const next = round[1] ?? null;
      return {
        ...p, tile: index[i], round: round.map(({ slug, title, category }) => ({ slug, title, category })), next,
        description: summary(p.rows.lead?.content), og: await ogImage((p.thumb ?? p.cover).src),
      };
    }));
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
    // Shared, the landing (and any page without a picture of its own) shows
    // this picture through the mark, as the landing opens.
    return { slug: first.slug, src: await imageSrc(first.cover.src, 1280, 'webp'), og: await ogImage(first.cover.src, { mark: true }) };
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
      // `project/file`, or its path on the site (/projects/project/file).
      const [from, src] = String(c.picture).replace(/^\/projects\//, '').split('/');
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
        // Shared, its picture through the mark, as its page opens.
        description: summary(c.intro), og: await ogImage(block.src, { mark: true }),
      };
    }));
  });
  // The typeface's share picture, drawn by type/build.py in the font itself.
  config.addGlobalData('typefaceOg', () => ogImage('src/typeface/og.svg'));
  // The people in the studio (team/team.json), each with a portrait from
  // team/, in black and white (main.css).
  config.addWatchTarget('team/');
  config.addGlobalData('team', async () => {
    const people = JSON.parse(await fs.readFile('team/team.json', 'utf8'));
    return Promise.all(people.map(async (p) => ({
      ...p,
      picture: await image(asset('team', p.picture), p.name, '(max-width: 720px) 33vw, 22vw'),
    })));
  });
  // The clients on the landing (src/clients/clients.json), each logo at its
  // own proportions, read from the file.
  config.addGlobalData('clients', async () => {
    const clients = JSON.parse(await fs.readFile('src/clients/clients.json', 'utf8'));
    return Promise.all(clients.map(async (c) => {
      if (!c.logo) return c;
      const { width, height } = await sharp(path.join('src', c.logo)).metadata();
      return { ...c, width, height };
    }));
  });
  // Stamped on every stylesheet and script address, so a page is never shown
  // with a stylesheet or script from an earlier build still in the browser's
  // cache (GitHub Pages lets them be kept for ten minutes).
  const build = Date.now().toString(36);
  config.addGlobalData('build', build);
  config.addGlobalData('site', { url: 'https://smash.jonasjohansson.se', name: 'SMASH' });
  config.addGlobalData('featured', async () =>
    (await readProjects('projects')).filter((p) => p.featured).sort((a, b) => a.featured - b.featured));

  return {
    dir: { input: 'pages', includes: '../_includes', data: '../_data', output: 'dist' },
    templateFormats: ['njk'],
    htmlTemplateEngine: 'njk',
  };
}
