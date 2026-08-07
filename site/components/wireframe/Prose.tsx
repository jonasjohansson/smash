import * as React from 'react';
import { PortableText, type PortableTextComponents } from '@portabletext/react';
import type { PortableText as PortableTextValue } from '@/sanity/types';

/**
 * Portable Text rendering, with the block styles the schema actually allows.
 *
 * Deliberately explicit rather than a `prose` class: the wireframe's job is to
 * show the real typographic hierarchy, and a plugin's opinion about it would be
 * a design decision smuggled in early.
 */
const components: PortableTextComponents = {
  block: {
    normal: ({ children }) => (
      <p className="mt-5 max-w-[62ch] text-[15px] leading-[1.7] text-ink-soft first:mt-0 sm:text-base">
        {children}
      </p>
    ),
    h3: ({ children }) => (
      <h3 className="mt-10 max-w-[36ch] text-lg font-medium tracking-[-0.01em] text-ink first:mt-0">
        {children}
      </h3>
    ),
    blockquote: ({ children }) => (
      <blockquote className="mt-8 max-w-[46ch] border-l-2 border-line pl-5 text-lg leading-snug text-ink">
        {children}
      </blockquote>
    ),
  },
  marks: {
    strong: ({ children }) => <strong className="font-medium text-ink">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
  },
};

export function Prose({ value, className = '' }: { value: PortableTextValue; className?: string }) {
  if (!value?.length) return null;
  return (
    <div className={className}>
      <PortableText value={value} components={components} />
    </div>
  );
}
