import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import sharp from 'sharp';

/**
 * Every folder in `projects/` with a data.md is a project. Newest first.
 * Asset paths and image aspect ratios are resolved here, so templates and the
 * layout composer never touch the disk.
 */
const cache = new Map();
async function aspect(file) {
  if (!cache.has(file)) cache.set(file, sharp(file).metadata().then((m) => (m.orientation >= 5 ? m.height / m.width : m.width / m.height)));
  return cache.get(file);
}

export async function readProjects(root) {
  const projects = await Promise.all(fs.readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(root, d.name, 'data.md')))
    .map(async (d) => {
      const dir = path.join(root, d.name);
      const data = matter(fs.readFileSync(path.join(dir, 'data.md'), 'utf8')).data;
      const blocks = await Promise.all((data.blocks ?? []).map(async (b) => {
        if (b.type === 'image') {
          const src = path.join(dir, b.src);
          return { ...b, src, ar: b.ar ?? (await aspect(src)) };
        }
        if (b.type === 'video') {
          const poster = b.poster ? path.join(dir, b.poster) : null;
          return { ...b, src: `/${dir}/${b.src}`, poster, ar: b.ar ?? (poster ? await aspect(poster) : 16 / 9) };
        }
        return b;
      }));
      const cover = blocks.find((b) => b.type === 'image') ?? null;
      return {
        slug: d.name,
        title: data.title,
        date: String(data.date),
        year: new Date(data.date).getFullYear(),
        tags: data.tags ?? [],
        featured: data.featured ?? null,
        blocks,
        cover,
      };
    }));
  return projects.sort((a, b) => b.date.localeCompare(a.date));
}
