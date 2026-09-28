import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

/**
 * The studio's offerings, one file each in `categories/`: its name, the
 * caption over its introduction (`label`), a picture from one of its projects
 * (`project/file`), and the introduction as the body. A project names its own
 * in data.md (`category`). In `order`.
 */
export function readCategories(root) {
  return fs.readdirSync(root)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const { data, content } = matter(fs.readFileSync(path.join(root, f), 'utf8'));
      return { slug: path.basename(f, '.md'), ...data, intro: content.trim() };
    })
    .sort((a, b) => a.order - b.order);
}
