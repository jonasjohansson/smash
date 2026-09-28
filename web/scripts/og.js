import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { DEFAULTS, buildMark } from '../src/js/mark.js';

/**
 * Share images (og:image), 1200 × 630, made at build time into dist/og/: a
 * picture cropped to fill, or (`mark`) seen through the SMASH mark on yellow,
 * the landing's own shape (mark.js). Each is made once, named by what it is
 * made from, and its address returned.
 */
export const OG = { width: 1200, height: 630 };
const OUT = 'dist/og';

export async function ogImage(src, { mark = false } = {}) {
  const input = await fs.readFile(src);
  const key = crypto.createHash('sha1').update(input).update(mark ? 'mark-yellow' : 'plain').digest('hex').slice(0, 12);
  const url = `/og/${key}.jpg`;
  const file = path.join(OUT, `${key}.jpg`);
  try {
    await fs.access(file);
    return url;
  } catch {}
  await fs.mkdir(OUT, { recursive: true });
  const { width: W, height: H } = OG;
  let picture = await sharp(input).resize(W, H, { fit: 'cover', position: 'attention' }).toBuffer();
  if (mark) {
    const shape = Buffer.from(buildMark({ ...DEFAULTS, padding: 40 }, W, H)); // a margin, so the mark reads
    picture = await sharp(picture).ensureAlpha().composite([{ input: shape, blend: 'dest-in' }]).png().toBuffer();
  }
  await sharp(picture).flatten({ background: mark ? '#f7be04' : '#000' }).jpeg({ quality: 82, progressive: true }).toFile(file); // round the mark, SMASH yellow, as on the landing
  return url;
}

/**
 * A page's description from its text (markdown): the first sentences that
 * fit in about 160 characters, or, if they come to much less, the first 160
 * cut at a word.
 */
export function summary(md, most = 160) {
  const text = String(md ?? '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`#>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= most) return text;
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [];
  let out = '';
  for (const s of sentences) {
    if ((out + s).trim().length > most) break;
    out += s;
  }
  out = out.trim();
  if (out.length >= most / 2) return out;
  return `${text.slice(0, text.lastIndexOf(' ', most))}…`;
}
