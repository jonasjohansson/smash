import type { Media, MediaAspect, PortableBlock, PortableText } from '@/sanity/types';

/**
 * Builders for seed content.
 *
 * Keys are derived from the content itself rather than randomised, so server and
 * client render byte-identical markup — a `Math.random()` key here would be a
 * hydration mismatch waiting to happen.
 */

function slugKey(input: string, index: number): string {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 24);
  return `${base || 'k'}-${index}`;
}

/** Paragraphs → Portable Text blocks. */
export function pt(...paragraphs: string[]): PortableText {
  return paragraphs.map<PortableBlock>((text, i) => ({
    _type: 'block',
    _key: slugKey(text, i),
    style: 'normal',
    markDefs: [],
    children: [{ _type: 'span', _key: `${slugKey(text, i)}-s`, text }],
  }));
}

/** A labelled media slot with no asset behind it yet. */
export function media(label: string, aspect: MediaAspect = '16/9', caption?: string): Media {
  return {
    _type: 'media',
    _key: slugKey(label, 0),
    label,
    aspect,
    caption: caption ?? null,
    image: null,
  };
}
