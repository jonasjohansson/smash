'use client';

import * as React from 'react';
import { WorkCard } from './WorkCard';
import type { CaseStudySummary, SegmentSummary } from '@/sanity/types';

/**
 * The case-study index.
 *
 * The filter is client-side and real — the whole index is already on the page,
 * so filtering costs nothing and pretending it does not work would be a worse
 * wireframe than one that does. It intentionally has no URL state yet; whether
 * filters should be shareable links is a decision for later.
 */
export function WorkGrid({
  projects,
  segments,
}: {
  projects: CaseStudySummary[];
  segments: SegmentSummary[];
}) {
  const [active, setActive] = React.useState<string | null>(null);

  const visible = active ? projects.filter((p) => p.segments.some((s) => s.slug === active)) : projects;

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-y border-line py-4">
        <button
          type="button"
          onClick={() => setActive(null)}
          aria-pressed={active === null}
          className={`font-mono text-[10px] tracking-[0.2em] uppercase transition-colors ${
            active === null ? 'text-ink underline underline-offset-[6px]' : 'text-muted hover:text-ink'
          }`}
        >
          All ({projects.length})
        </button>
        {segments.map((s) => {
          const count = projects.filter((p) => p.segments.some((x) => x.slug === s.slug)).length;
          return (
            <button
              key={s.slug}
              type="button"
              onClick={() => setActive(active === s.slug ? null : s.slug)}
              aria-pressed={active === s.slug}
              className={`font-mono text-[10px] tracking-[0.2em] uppercase transition-colors ${
                active === s.slug ? 'text-ink underline underline-offset-[6px]' : 'text-muted hover:text-ink'
              }`}
            >
              {s.title} ({count})
            </button>
          );
        })}
      </div>

      <ul className="mt-10 grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((p, i) => (
          <li key={p.slug}>
            <WorkCard project={p} priority={i < 3} />
          </li>
        ))}
      </ul>

      {visible.length === 0 ? (
        <p className="mt-10 font-mono text-[11px] tracking-[0.16em] text-muted uppercase">
          Nothing here yet.
        </p>
      ) : null}
    </>
  );
}
