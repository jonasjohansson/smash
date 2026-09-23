/**
 * Stand-in content: pull Jonas Johansson's portfolio projects into the seed layer.
 *
 * Reads `jonasjohansson.se/projects/<slug>/data.md`, keeps the tagged, listed
 * projects, resizes their images into `public/work/<slug>/`, and writes
 * `content/portfolio.json`, which `content/seed.ts` maps onto case studies.
 *
 * Run from `site/`:  node scripts/import-portfolio.mjs [path-to-jonasjohansson.se]
 * Both outputs are committed, so CI never needs the portfolio repo.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

const SRC = path.resolve(process.argv[2] ?? '../../jonasjohansson.se');
const PROJECTS = path.join(SRC, 'projects');
const OUT_JSON = path.resolve('content/portfolio.json');
const OUT_MEDIA = path.resolve('public/work');
const MAX_IMAGES = 9;
const WIDTH = 1600;

const ASPECTS = { '21/9': 21 / 9, '16/9': 16 / 9, '1/1': 1, '4/5': 4 / 5 };

function nearestAspect(w, h) {
  const r = w / h;
  return Object.entries(ASPECTS).reduce((best, [k, v]) =>
    Math.abs(Math.log(v / r)) < Math.abs(Math.log(ASPECTS[best] / r)) ? k : best,
  '16/9');
}

function dimensions(file) {
  const out = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', file], { encoding: 'utf8' });
  const w = Number(out.match(/pixelWidth: (\d+)/)[1]);
  const h = Number(out.match(/pixelHeight: (\d+)/)[1]);
  return { w, h };
}

/** Markdown links → their text; collapse whitespace. */
const plain = (s) => s.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\s+/g, ' ').trim();

fs.rmSync(OUT_MEDIA, { recursive: true, force: true });
const projects = [];

for (const slug of fs.readdirSync(PROJECTS).sort()) {
  const file = path.join(PROJECTS, slug, 'data.md');
  if (!fs.existsSync(file)) continue;
  const fm = YAML.parse(fs.readFileSync(file, 'utf8').split(/^---$/m)[1]);
  if (!fm?.tags?.length || fm.unlisted || !fm.date) continue;

  const blocks = fm.blocks ?? [];
  const texts = blocks.filter((b) => b.type === 'text' && b.content).map((b) => plain(b.content));
  const images = [];
  for (const b of blocks.filter((b) => b.type === 'image' && b.src).slice(0, MAX_IMAGES)) {
    const src = path.join(PROJECTS, slug, b.src);
    if (!fs.existsSync(src)) continue;
    const name = `${path.parse(b.src).name}.jpg`;
    const dest = path.join(OUT_MEDIA, slug, name);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '72', '-Z', String(WIDTH), src, '--out', dest], { stdio: 'ignore' });
    const { w, h } = dimensions(dest);
    images.push({ src: `/work/${slug}/${name}`, alt: plain(b.alt ?? fm.title), aspect: nearestAspect(w, h) });
  }
  if (!images.length) continue;

  projects.push({ slug, title: fm.title, date: String(fm.date), tags: fm.tags, texts, images });
}

projects.sort((a, b) => b.date.localeCompare(a.date));
fs.writeFileSync(OUT_JSON, JSON.stringify(projects, null, 2) + '\n');
console.log(`${projects.length} projects → ${path.relative(process.cwd(), OUT_JSON)}`);
