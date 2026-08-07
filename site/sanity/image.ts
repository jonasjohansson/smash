import { createImageUrlBuilder } from '@sanity/image-url';
import type { SanityImageRef } from './types';
import { dataset, isSanityConfigured, projectId } from './env';

const builder = createImageUrlBuilder({ projectId, dataset });

/**
 * Image URL for a Sanity asset reference, or null when there is nothing to show.
 *
 * The wireframe always hits the null path — every `Media.image` in the seed is
 * null — so `MediaBlock` draws its labelled placeholder instead.
 */
export function imageUrl(source: SanityImageRef | null, width: number): string | null {
  if (!source || !isSanityConfigured) return null;
  return builder.image(source).width(width).auto('format').fit('max').url();
}
