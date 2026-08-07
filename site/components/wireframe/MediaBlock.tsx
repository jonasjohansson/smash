import * as React from 'react';
import type { Media } from '@/sanity/types';
import { imageUrl } from '@/sanity/image';

/**
 * A media slot.
 *
 * With no asset behind it — which is every slot in the wireframe — it draws a
 * dashed, labelled box at the correct aspect ratio, so the page's rhythm is
 * honest about where images and film will sit and how much room they take.
 * The moment Sanity holds a real asset the same component renders it, with the
 * label carried over as alt text.
 */
export function MediaBlock({
  media,
  priority = false,
  className = '',
  width = 1600,
}: {
  media: Media;
  /** Reserved for the future real-image path; ignored while placeholders render. */
  priority?: boolean;
  className?: string;
  width?: number;
}) {
  const url = imageUrl(media.image, width);

  return (
    <figure className={className}>
      <div
        className="relative flex w-full items-center justify-center overflow-hidden border border-dashed border-dash bg-paper-alt"
        style={{ aspectRatio: media.aspect.replace('/', ' / ') }}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- Sanity CDN URLs are already sized/optimised by the image builder.
          <img
            src={url}
            alt={media.label}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="px-6 text-center">
            <p className="font-mono text-[10px] tracking-[0.22em] text-muted uppercase">
              Media placeholder · {media.aspect}
            </p>
            <p className="mt-2 text-sm text-ink-soft">{media.label}</p>
          </div>
        )}
      </div>
      {media.caption ? (
        <figcaption className="mt-2 font-mono text-[11px] text-muted">{media.caption}</figcaption>
      ) : null}
    </figure>
  );
}
