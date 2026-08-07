import * as React from 'react';

/**
 * Wireframe primitives.
 *
 * The typographic scale, the page gutter and the section rhythm live here so
 * they are decided once. When the brand direction lands, most of it can be
 * absorbed by changing these components rather than every page.
 */

const GUTTER = 'px-5 sm:px-8 lg:px-14';

export function Container({
  children,
  className = '',
  wide = false,
}: {
  children: React.ReactNode;
  className?: string;
  wide?: boolean;
}) {
  return (
    <div className={`mx-auto w-full ${wide ? 'max-w-[1600px]' : 'max-w-[1280px]'} ${GUTTER} ${className}`}>
      {children}
    </div>
  );
}

/** Small all-caps label. Used for section numbering and metadata keys. */
export function Eyebrow({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`font-mono text-[10px] tracking-[0.22em] text-muted uppercase ${className}`}>
      {children}
    </p>
  );
}

/** A full-width hairline. The wireframe's main structural device. */
export function Rule({ className = '' }: { className?: string }) {
  return <hr className={`border-0 border-t border-line ${className}`} />;
}

/**
 * A note to the humans reading this wireframe. Renders visibly, because
 * pretending a placeholder is finished work is how placeholders ship.
 */
export function WireNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 max-w-[62ch] border-l-2 border-dash pl-3 font-mono text-[11px] leading-relaxed text-muted">
      {children}
    </p>
  );
}

/** Standard vertical rhythm for a page section. */
export function Section({
  children,
  className = '',
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`py-20 sm:py-28 lg:py-36 ${className}`}>
      {children}
    </section>
  );
}

/** Section header: number + label on one line, above the content. */
export function SectionHead({
  index,
  label,
  className = '',
}: {
  index: string;
  label: string;
  className?: string;
}) {
  return (
    <div className={`mb-10 flex items-baseline gap-4 border-t border-line pt-4 ${className}`}>
      <Eyebrow>{index}</Eyebrow>
      <Eyebrow>{label}</Eyebrow>
    </div>
  );
}
