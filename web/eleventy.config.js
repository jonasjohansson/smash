import path from 'node:path';
import Image from '@11ty/eleventy-img';
import markdownIt from 'markdown-it';
import { listed, readProjects } from './scripts/projects.js';
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
  config.addPassthroughCopy({ 'src/css': 'css', 'src/fonts': 'fonts', 'src/js': 'js', 'src/CNAME': 'CNAME', 'src/brand': 'brand', 'src/gate': 'gate', 'src/v3': 'assets/v3' });
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

  config.addFilter('md', (text) => external(md.render(text || '')));
  config.addFilter('mdInline', (text) => external(md.renderInline(text || '')));
  config.addFilter('year', (date) => new Date(date).getFullYear());
  config.addFilter('pad', (n) => String(n).padStart(2, '0'));
  config.addAsyncShortcode('image', image);
  config.addAsyncShortcode('imageSrc', imageSrc);

  config.addGlobalData('projects', async () => {
    const projects = (await readProjects('projects')).map((p) => ({ ...p, rows: compose(p) }));
    const index = indexLayout(projects);
    return projects.map((p, i) => ({ ...p, tile: index[i], next: projects[(i + 1) % projects.length] }));
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
  // The studio's three offerings, under its introduction on the landing: each
  // its name in lines (the mask of its picture), what it covers, and a picture
  // from one of its projects.
  const PILLARS = [
    { name: 'Experience Design', note: 'Museum work', from: 'dome-conductor', src: 'dome-orchestra.jpg' },
    { name: 'Digital Interactive', note: 'Digital installations', from: 'jagad', src: 'joystick-hero.jpg' },
    { name: 'SMASH Originals', note: 'Projection pieces', from: 'resonance', src: '01.jpg' },
  ];
  const GAP = 40; // between a name's lines, of the picture's 1000
  const sizes = (k) => `(max-width: 720px) ${Math.ceil(100 * k)}vw, ${Math.ceil(33 * k)}vw`;
  config.addGlobalData('pillars', async () => {
    const projects = await readProjects('projects');
    return Promise.all(PILLARS.map(async (p) => {
      const block = projects.find((q) => q.slug === p.from)?.blocks.find((b) => b.type === 'image' && path.basename(b.src) === p.src);
      if (!block) throw new Error(`The ${p.name} picture, ${p.from}/${p.src}, is not an image of a project on the site`);
      const words = p.name.split(' ');
      const h = (1000 - GAP * (words.length - 1)) / words.length;
      return {
        ...p,
        gap: GAP,
        // Until the typeface is in (feed.js fits each line to its ink), a guess from the length.
        lines: words.map((w, i) => ({ text: w.toUpperCase(), transform: `translate(0 ${i * (h + GAP) + h}) scale(${1000 / (w.length * 41)} ${h / 88})` })),
        // Cropped to the pillar's 4:5, a wider picture is drawn wider than its box.
        picture: await image(block.src, block.alt ?? '', sizes(Math.max(1, (block.ar * 5) / 4))),
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
