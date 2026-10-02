import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import sharp from 'sharp';

/**
 * Every folder in `projects/` with a data.md is a project; the site shows the
 * ones SMASH made (`smash: true`). The rest are Jonas Johansson's own, brought
 * in with them from his portfolio (scripts/import-portfolio.mjs). Newest first.
 * Asset paths and image aspect ratios are resolved here, so templates and the
 * layout composer never touch the disk.
 */
const cache = new Map();
async function aspect(file) {
  if (!cache.has(file)) cache.set(file, sharp(file).metadata().then((m) => (m.orientation >= 5 ? m.height / m.width : m.width / m.height)));
  return cache.get(file);
}

/**
 * A project's colour when data.md gives none, from its cover: the average of
 * its pixels weighted by how vivid each is (so a night shot gives its lights,
 * not its black), brought up to full brightness. Grey if nothing is vivid.
 */
const tints = new Map();
async function dominant(file) {
  if (!tints.has(file)) {
    tints.set(file, sharp(file).resize(64, 64, { fit: 'inside' }).removeAlpha().raw().toBuffer().then((px) => {
      const sum = [0, 0, 0];
      let total = 0;
      for (let i = 0; i < px.length; i += 3) {
        const [r, g, b] = [px[i], px[i + 1], px[i + 2]];
        const w = (Math.max(r, g, b) - Math.min(r, g, b)) ** 2;
        sum[0] += r * w; sum[1] += g * w; sum[2] += b * w;
        total += w;
      }
      if (total < 1) return '#808080';
      const avg = sum.map((v) => v / total);
      const lift = 255 / Math.max(...avg, 1);
      return `#${avg.map((v) => Math.round(Math.min(255, v * lift)).toString(16).padStart(2, '0')).join('')}`;
    }));
  }
  return tints.get(file);
}

/**
 * A file named in data.md, on disk: by its name in the project's folder
 * (`01.jpg`), or by its path on the site (`/projects/harpa/01.jpg`, as Pages
 * CMS writes it, .pages.yml).
 */
export const asset = (dir, file) => (file.startsWith('/') ? file.slice(1) : path.join(dir, file));

/** The projects on the site, as { slug, data } from their data.md; read as is. */
export function listed(root) {
  return fs.readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(root, d.name, 'data.md')))
    .map((d) => ({ slug: d.name, data: matter(fs.readFileSync(path.join(root, d.name, 'data.md'), 'utf8')).data }))
    .filter(({ data }) => data.smash);
}

export async function readProjects(root) {
  const projects = await Promise.all(listed(root)
    .map(async ({ slug, data }) => {
      const dir = path.join(root, slug);
      const blocks = await Promise.all((data.blocks ?? []).map(async (b) => {
        if (b.type === 'image') {
          const src = asset(dir, b.src);
          return { ...b, src, ar: b.ar ?? (await aspect(src)) };
        }
        if (b.type === 'video') {
          const poster = b.poster ? asset(dir, b.poster) : null;
          return { ...b, src: `/${asset(dir, b.src)}`, poster, ar: b.ar ?? (poster ? await aspect(poster) : 16 / 9) };
        }
        return b;
      }));
      const cover = blocks.find((b) => b.type === 'image') ?? null;
      // YAML reads a bare date as a Date: kept as its ISO day, so it sorts.
      const date = new Date(data.date);
      return {
        slug,
        title: data.title,
        caption: data.caption ?? null, // who it was for, or where: the small line over the introduction
        category: data.category ?? null, // which of the studio's offerings (categories/)
        // The picture on its card, if not its cover (`thumb: file` in data.md;
        // one of its images, so known by its name).
        thumb: (data.thumb && blocks.find((b) => b.type === 'image' && path.basename(b.src) === path.basename(data.thumb))) || cover,
        color: data.color ?? (cover ? await dominant(cover.src) : null),
        date: date.toISOString().slice(0, 10),
        year: date.getUTCFullYear(),
        tags: data.tags ?? [],
        featured: data.featured ?? null,
        blocks,
        cover,
      };
    }));
  return projects.sort((a, b) => b.date.localeCompare(a.date));
}
