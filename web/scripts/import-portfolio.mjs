/**
 * Stand-in content: copy Jonas Johansson's portfolio projects into `projects/`.
 *
 * Keeps each project's authored blocks (text, image, video, credits), its
 * colour and its data.md shape, so real SMASH projects can later be written the same way.
 * Placements other than `full` are dropped: they were tuned for the portfolio's
 * grid, and leaving them out lets this site's layout composer place everything.
 * Images are resized to 2000px JPEGs; videos over 10 MB and audio are left out.
 * The six most recent projects with a landscape hero are marked `featured`,
 * which puts them on the landing page.
 *
 * The site shows only the projects since marked `smash: true` by hand, and
 * those carry a `caption` and their texts `label`s, written here: running this
 * again replaces `projects/` and loses all three.
 *
 *   node scripts/import-portfolio.mjs [path-to-jonasjohansson.se]
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import YAML from 'yaml';

const SRC = path.resolve(process.argv[2] ?? '../../jonasjohansson.se', 'projects');
const OUT = path.resolve('projects');
const MAX_VIDEO = 10e6;
const FEATURED = 6;

const sips = (...args) => execFileSync('sips', args, { encoding: 'utf8' });

function copyImage(from, to) {
  sips('-s', 'format', 'jpeg', '-s', 'formatOptions', '70', '-Z', '2000', from, '--out', to);
  const out = sips('-g', 'pixelWidth', '-g', 'pixelHeight', to);
  return Number(out.match(/pixelWidth: (\d+)/)[1]) / Number(out.match(/pixelHeight: (\d+)/)[1]);
}

const jpg = (name) => `${path.parse(name).name}.jpg`;
const size = (s) => (s === 'full' ? s : undefined);

fs.rmSync(OUT, { recursive: true, force: true });
const imported = [];

for (const slug of fs.readdirSync(SRC).sort()) {
  const file = path.join(SRC, slug, 'data.md');
  if (!fs.existsSync(file)) continue;
  const data = matter(fs.readFileSync(file, 'utf8')).data;
  if (!data.tags?.length || data.unlisted || !data.date || (data.type && data.type !== 'work')) continue;

  const dir = path.join(OUT, slug);
  fs.mkdirSync(dir, { recursive: true });
  const blocks = [];
  let heroAr = null;

  for (const block of data.blocks ?? []) {
    const from = block.src && path.join(SRC, slug, block.src);
    if (block.type === 'image') {
      if (!fs.existsSync(from)) continue;
      const ar = copyImage(from, path.join(dir, jpg(block.src)));
      heroAr ??= ar;
      blocks.push({ ...block, src: jpg(block.src), size: size(block.size), mobileSrc: undefined, mobileFocal: undefined });
    } else if (block.type === 'video') {
      const small = fs.existsSync(from) && fs.statSync(from).size <= MAX_VIDEO;
      if (small) {
        fs.copyFileSync(from, path.join(dir, block.src));
        const poster = block.poster && copyImage(path.join(SRC, slug, block.poster), path.join(dir, jpg(block.poster)));
        heroAr ??= poster || block.ar;
        blocks.push({ ...block, size: size(block.size), poster: block.poster && jpg(block.poster) });
      } else if (block.poster) {
        // Too heavy to carry: its poster frame stands in as a still.
        const ar = copyImage(path.join(SRC, slug, block.poster), path.join(dir, jpg(block.poster)));
        heroAr ??= ar;
        blocks.push({ type: 'image', src: jpg(block.poster), alt: block.alt, size: size(block.size) });
      }
    } else if (block.type === 'text' || block.type === 'credits') {
      blocks.push(block);
    }
  }

  if (!blocks.some((b) => b.type === 'image' || b.type === 'video')) {
    fs.rmSync(dir, { recursive: true });
    continue;
  }
  const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
  const out = clean({ title: data.title, date: String(data.date), color: data.color, tags: data.tags, blocks: blocks.map(clean) });
  imported.push({ slug, date: out.date, heroAr, out });
}

const featured = imported
  .filter((p) => p.heroAr > 1.2)
  .sort((a, b) => b.date.localeCompare(a.date))
  .slice(0, FEATURED)
  .map((p) => p.slug);

for (const { slug, out } of imported) {
  const i = featured.indexOf(slug);
  const front = i >= 0 ? { title: out.title, date: out.date, featured: i + 1, ...out } : out;
  fs.writeFileSync(path.join(OUT, slug, 'data.md'), `---\n${YAML.stringify(front, { lineWidth: 0 })}---\n`);
}

console.log(`${imported.length} projects imported; featured: ${featured.join(', ')}`);
