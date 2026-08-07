import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MediaBlock } from '@/components/wireframe/MediaBlock';
import { Prose } from '@/components/wireframe/Prose';
import { WorkCard } from '@/components/work/WorkCard';
import { Container, Eyebrow, Section, SectionHead, WireNote } from '@/components/wireframe/primitives';
import { media } from '@/content/portable';
import { getCaseStudiesForSegment, getSegment, getSegments } from '@/sanity/fetch';

type Params = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const segments = await getSegments();
  return segments.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const segment = await getSegment(slug);
  if (!segment) return { title: 'Not found' };
  return { title: segment.title, description: segment.intro };
}

/**
 * WIREFRAME: the two narrative blocks below are the same for every segment.
 * They exist to hold the page's shape — "how it feels" then "what it does" — and
 * should become per-segment content in Sanity once the copy is written.
 */
const NARRATIVE = [
  {
    index: '02',
    label: 'How it feels',
    heading: 'The first thirty seconds decide everything.',
    body: 'Placeholder copy. People arrive with their attention already spent. The work has to be legible before it is impressive: one clear invitation, no instructions, and a response fast enough that nobody wonders whether it noticed them.',
    media: media('Audience moment — first contact', '16/9'),
  },
  {
    index: '03',
    label: 'What it does',
    heading: 'Underneath, it is a system that has to run unattended.',
    body: 'Placeholder copy. Sensing, control, playback, failover, and a way for the venue to start it in the morning without calling us. The craft that nobody sees is the part that decides whether the piece is still running in month six.',
    media: media('Technical — rig and control', '16/9'),
  },
];

export default async function ExpertisePage({ params }: Params) {
  const { slug } = await params;
  const segment = await getSegment(slug);
  if (!segment) notFound();

  const [related, allSegments] = await Promise.all([
    getCaseStudiesForSegment(slug),
    getSegments(),
  ]);

  return (
    <>
      {/* --- intro statement -------------------------------------------- */}
      <Section className="pt-16 sm:pt-20">
        <Container>
          <Eyebrow>Expertise</Eyebrow>
          <h1 className="mt-6 max-w-[15ch] text-[clamp(2.4rem,8vw,6rem)] leading-[0.94] font-medium tracking-[-0.035em] text-ink">
            {segment.title}
          </h1>
          <p className="mt-8 max-w-[46ch] text-[clamp(1.15rem,2.6vw,1.75rem)] leading-[1.25] tracking-[-0.015em] text-ink">
            {segment.intro}
          </p>
        </Container>
      </Section>

      <Section className="border-t border-line">
        <Container>
          <SectionHead index="01" label="In practice" />
          <div className="grid gap-10 md:grid-cols-12">
            <div className="md:col-span-7">
              <Prose value={segment.description} />
            </div>
            <div className="md:col-span-5">
              <MediaBlock media={media(`${segment.title} — reference still`, '4/5')} />
            </div>
          </div>
        </Container>
      </Section>

      {/* --- narrative blocks -------------------------------------------- */}
      {NARRATIVE.map((n) => (
        <Section key={n.index} className="border-t border-line">
          <Container>
            <SectionHead index={n.index} label={n.label} />
            <div className="grid gap-10 md:grid-cols-12">
              <h2 className="md:col-span-5 text-[clamp(1.5rem,3.4vw,2.4rem)] leading-[1.08] font-medium tracking-[-0.02em] text-ink">
                {n.heading}
              </h2>
              <div className="md:col-span-7">
                <p className="max-w-[62ch] text-[15px] leading-[1.7] text-ink-soft sm:text-base">
                  {n.body}
                </p>
              </div>
            </div>
            <div className="mt-10">
              <MediaBlock media={n.media} width={1800} />
            </div>
          </Container>
        </Section>
      ))}

      {/* --- related work ------------------------------------------------ */}
      <Section className="border-t border-line">
        <Container>
          <SectionHead index="04" label="Related work" />
          {related.length > 0 ? (
            <ul className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <li key={p.slug}>
                  <WorkCard project={p} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[15px] text-ink-soft">
              No projects tagged with this segment yet.
            </p>
          )}
          <Link
            href="/work"
            className="mt-10 inline-block border-b border-ink pb-0.5 font-mono text-[11px] tracking-[0.16em] text-ink uppercase"
          >
            All work
          </Link>
          <WireNote>
            Wireframe: the &quot;how it feels / what it does&quot; blocks are shared across all four
            segment pages. Per-segment copy replaces them once written.
          </WireNote>
        </Container>
      </Section>

      {/* --- other segments ---------------------------------------------- */}
      <Section className="border-t border-line pt-14">
        <Container>
          <SectionHead index="05" label="Other expertise" />
          <ul className="grid gap-6 sm:grid-cols-3">
            {allSegments
              .filter((s) => s.slug !== slug)
              .map((s) => (
                <li key={s.slug} className="border-t border-ink pt-4">
                  <Link href={`/expertise/${s.slug}`} className="group block">
                    <h3 className="text-lg font-medium tracking-[-0.01em] text-ink">{s.title}</h3>
                    <p className="mt-2 text-[14px] leading-[1.6] text-ink-soft">{s.intro}</p>
                  </Link>
                </li>
              ))}
          </ul>
        </Container>
      </Section>
    </>
  );
}
