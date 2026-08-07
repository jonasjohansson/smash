import * as React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MediaBlock } from '@/components/wireframe/MediaBlock';
import { Prose } from '@/components/wireframe/Prose';
import { Container, Eyebrow, Section } from '@/components/wireframe/primitives';
import { getCaseStudies, getCaseStudy, getNextCaseStudy } from '@/sanity/fetch';
import { NARRATIVE_KEYS, type NarrativeKey } from '@/sanity/types';

type Params = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const projects = await getCaseStudies();
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const project = await getCaseStudy(slug);
  if (!project) return { title: 'Not found' };
  return {
    title: project.title,
    description: `${project.title} — ${project.client}, ${project.year}.`,
  };
}

/** The order the narrative is told in. Fixed, because the storytelling rule is fixed. */
const NARRATIVE_LABELS: Record<NarrativeKey, string> = {
  idea: 'Idea',
  context: 'Context',
  experience: 'Audience experience',
  transformation: 'Transformation',
};

export default async function CaseStudyPage({ params }: Params) {
  const { slug } = await params;
  const project = await getCaseStudy(slug);
  if (!project) notFound();

  const next = await getNextCaseStudy(slug);

  return (
    <>
      {/* --- title + meta ----------------------------------------------- */}
      <Section className="pt-16 pb-10 sm:pt-20">
        <Container>
          <Eyebrow>
            {project.client} · {project.year}
          </Eyebrow>
          <h1 className="mt-6 max-w-[16ch] text-[clamp(2.4rem,8vw,6rem)] leading-[0.94] font-medium tracking-[-0.035em] text-ink">
            {project.title}
          </h1>
          <dl className="mt-10 grid gap-x-8 gap-y-4 border-t border-line pt-5 sm:grid-cols-3">
            <div>
              <dt className="font-mono text-[10px] tracking-[0.2em] text-muted uppercase">Client</dt>
              <dd className="mt-1 text-[15px] text-ink">{project.client}</dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] tracking-[0.2em] text-muted uppercase">Year</dt>
              <dd className="mt-1 text-[15px] text-ink">{project.year}</dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] tracking-[0.2em] text-muted uppercase">Segments</dt>
              <dd className="mt-1 flex flex-wrap gap-x-3 text-[15px]">
                {project.segments.map((s) => (
                  <Link
                    key={s.slug}
                    href={`/expertise/${s.slug}`}
                    className="text-ink underline underline-offset-4"
                  >
                    {s.title}
                  </Link>
                ))}
              </dd>
            </div>
          </dl>
        </Container>
      </Section>

      {/* --- hero, full bleed ------------------------------------------- */}
      <div className="px-5 sm:px-8 lg:px-14">
        <MediaBlock media={project.heroMedia} priority width={2000} />
      </div>

      {/* --- narrative --------------------------------------------------- */}
      {NARRATIVE_KEYS.map((key, i) => {
        const section = project[key];
        return (
          <React.Fragment key={key}>
            <Section className="pb-10 sm:pb-12">
              <Container>
                <div className="mb-8 flex items-baseline gap-4 border-t border-line pt-4">
                  <Eyebrow>{String(i + 1).padStart(2, '0')}</Eyebrow>
                  <Eyebrow>{NARRATIVE_LABELS[key]}</Eyebrow>
                </div>
                <div className="grid gap-8 md:grid-cols-12">
                  <h2 className="md:col-span-5 text-[clamp(1.5rem,3.4vw,2.4rem)] leading-[1.08] font-medium tracking-[-0.02em] text-ink">
                    {section.heading}
                  </h2>
                  <div className="md:col-span-7">
                    <Prose value={section.body} />
                  </div>
                </div>
              </Container>
            </Section>

            {section.media.length > 0 ? (
              <div className="px-5 pb-4 sm:px-8 lg:px-14">
                <div
                  className={
                    section.media.length > 1 ? 'grid gap-4 sm:grid-cols-2' : 'block'
                  }
                >
                  {section.media.map((m) => (
                    <MediaBlock key={m._key} media={m} width={1800} />
                  ))}
                </div>
              </div>
            ) : null}
          </React.Fragment>
        );
      })}

      {/* --- gallery ----------------------------------------------------- */}
      {project.gallery.length > 0 ? (
        <Section className="border-t border-line">
          <Container>
            <div className="mb-8 flex items-baseline gap-4">
              <Eyebrow>05</Eyebrow>
              <Eyebrow>Gallery</Eyebrow>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {project.gallery.map((m) => (
                <li key={m._key}>
                  <MediaBlock media={m} width={1000} />
                </li>
              ))}
            </ul>
          </Container>
        </Section>
      ) : null}

      {/* --- credits ----------------------------------------------------- */}
      {project.credits.length > 0 ? (
        <Section className="border-t border-line pt-14 pb-14">
          <Container>
            <div className="mb-8 flex items-baseline gap-4">
              <Eyebrow>06</Eyebrow>
              <Eyebrow>Credits</Eyebrow>
            </div>
            <dl className="grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
              {project.credits.map((c) => (
                <div key={c._key} className="flex justify-between gap-6 border-b border-line py-3">
                  <dt className="font-mono text-[10px] tracking-[0.18em] text-muted uppercase">
                    {c.role}
                  </dt>
                  <dd className="text-right text-[14px] text-ink-soft">{c.name}</dd>
                </div>
              ))}
            </dl>
          </Container>
        </Section>
      ) : null}

      {/* --- next project, bleeding in ----------------------------------- */}
      {next ? (
        <Link
          href={`/work/${next.slug}`}
          className="group relative block overflow-hidden border-t border-line"
        >
          <div className="relative">
            <MediaBlock media={{ ...next.heroMedia, aspect: '21/9' }} width={2000} />
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
              <span className="font-mono text-[10px] tracking-[0.24em] text-muted uppercase">
                Next project
              </span>
              <span className="max-w-[14ch] text-[clamp(1.6rem,5vw,3.5rem)] leading-[0.98] font-medium tracking-[-0.03em] text-ink">
                {next.title}
              </span>
              <span className="font-mono text-[11px] tracking-[0.14em] text-muted uppercase">
                {next.client} · {next.year}
              </span>
            </div>
          </div>
        </Link>
      ) : null}
    </>
  );
}
