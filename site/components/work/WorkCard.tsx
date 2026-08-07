import * as React from 'react';
import Link from 'next/link';
import { MediaBlock } from '@/components/wireframe/MediaBlock';
import type { CaseStudySummary } from '@/sanity/types';

/** One project. Used on /work, on segment pages, and in the related strips. */
export function WorkCard({ project, priority = false }: { project: CaseStudySummary; priority?: boolean }) {
  return (
    <article>
      <Link href={`/work/${project.slug}`} className="group block">
        <MediaBlock
          media={{ ...project.heroMedia, aspect: '4/5' }}
          priority={priority}
          width={900}
          className="transition-opacity group-hover:opacity-85"
        />
        <div className="mt-4 flex items-baseline justify-between gap-4">
          <h3 className="text-[clamp(1.05rem,2vw,1.35rem)] leading-tight font-medium tracking-[-0.01em] text-ink">
            {project.title}
          </h3>
          <span className="font-mono text-[11px] text-muted">{project.year}</span>
        </div>
        <p className="mt-1 font-mono text-[11px] tracking-[0.12em] text-muted uppercase">
          {project.client}
        </p>
        <p className="mt-2 text-[13px] text-ink-soft">
          {project.segments.map((s) => s.title).join(' · ')}
        </p>
      </Link>
    </article>
  );
}
