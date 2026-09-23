import Image from '@11ty/eleventy-img';
import markdownIt from 'markdown-it';
import { readProjects } from './scripts/projects.js';
import { compose, indexLayout } from './scripts/compose.js';

const md = markdownIt({ html: true, linkify: true });
const external = (html) => html.replace(/<a href="(https?:[^"]*)">/g, '<a href="$1" target="_blank" rel="noopener">');

/** `<picture>` at the widths the grid actually uses; `sizes` comes from the column span. */
async function image(src, alt = '', sizes = '100vw', loading = 'lazy', className = '') {
  const meta = await Image(src, {
    widths: [640, 1280, 2000],
    formats: ['webp', 'jpeg'],
    outputDir: 'dist/img/',
    urlPath: '/img/',
    sharpJpegOptions: { quality: 78, progressive: true },
    sharpWebpOptions: { quality: 76 },
  });
  return Image.generateHTML(meta, {
    alt, sizes, loading, decoding: 'async',
    ...(className && { class: className }),
    ...(loading === 'eager' && { fetchpriority: 'high' }),
  });
}

export default function (config) {
  config.addPassthroughCopy({ 'src/css': 'css', 'src/js': 'js', 'src/CNAME': 'CNAME' });
  config.addPassthroughCopy('projects/**/*.{mp4,webm}');
  config.addWatchTarget('src/');
  config.addWatchTarget('scripts/');
  config.addWatchTarget('projects/');

  config.addFilter('md', (text) => external(md.render(text || '')));
  config.addFilter('mdInline', (text) => external(md.renderInline(text || '')));
  config.addFilter('year', (date) => new Date(date).getFullYear());
  config.addFilter('pad', (n) => String(n).padStart(2, '0'));
  config.addAsyncShortcode('image', image);

  config.addGlobalData('projects', async () => {
    const projects = (await readProjects('projects')).map((p) => ({ ...p, rows: compose(p) }));
    const index = indexLayout(projects);
    return projects.map((p, i) => ({ ...p, tile: index[i], next: projects[(i + 1) % projects.length] }));
  });
  config.addGlobalData('featured', async () =>
    (await readProjects('projects')).filter((p) => p.featured).sort((a, b) => a.featured - b.featured));

  return {
    dir: { input: 'pages', includes: '../_includes', data: '../_data', output: 'dist' },
    templateFormats: ['njk'],
    htmlTemplateEngine: 'njk',
  };
}
