import type { Metadata } from 'next';
import { Container, Eyebrow, Section, WireNote } from '@/components/wireframe/primitives';
import { getLabExperiments } from '@/sanity/fetch';
import type { LabStatus } from '@/sanity/types';

export const metadata: Metadata = {
  title: 'Lab',
  description: 'Small experiments from the studio — the ideas that are not projects yet.',
};

const STATUS_LABEL: Record<LabStatus, string> = {
  sketch: 'Sketch',
  live: 'Live',
  archived: 'Archived',
};

export default async function LabPage() {
  const experiments = await getLabExperiments();

  return (
    <Section className="pt-16 sm:pt-20">
      <Container>
        <Eyebrow>Lab</Eyebrow>
        <h1 className="mt-6 max-w-[16ch] text-[clamp(2.4rem,8vw,6rem)] leading-[0.94] font-medium tracking-[-0.035em] text-ink">
          Things we are still arguing about.
        </h1>
        <p className="mt-8 mb-14 max-w-[52ch] text-[15px] leading-[1.7] text-ink-soft sm:text-base">
          Small pieces built to answer one question each. Some become projects, most do not, and
          that is the point of having somewhere to put them.
        </p>

        <ul className="grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {experiments.map((e) => (
            <li key={e.slug} className="flex flex-col bg-paper">
              {/* The toy itself will live in this frame — a canvas, a mini-app, a loop. */}
              <div
                className="flex items-center justify-center border-b border-dashed border-dash bg-paper-alt"
                style={{ aspectRatio: '4 / 3' }}
              >
                <span className="font-mono text-[10px] tracking-[0.22em] text-muted uppercase">
                  Experiment placeholder
                </span>
              </div>
              <div className="flex flex-1 flex-col justify-between gap-6 p-6">
                <div>
                  <div className="flex items-baseline justify-between gap-4">
                    <h2 className="text-lg font-medium tracking-[-0.01em] text-ink">{e.title}</h2>
                    <span className="font-mono text-[10px] tracking-[0.18em] text-muted uppercase">
                      {STATUS_LABEL[e.status]}
                    </span>
                  </div>
                  <p className="mt-3 text-[14px] leading-[1.65] text-ink-soft">{e.description}</p>
                </div>
                <span className="font-mono text-[10px] tracking-[0.22em] text-muted uppercase">
                  Not playable yet
                </span>
              </div>
            </li>
          ))}
        </ul>

        <WireNote>
          Wireframe: lab pieces have no detail route and nothing runs in the frames yet. Whether each
          experiment gets its own page or stays inline on this grid is still open.
        </WireNote>
      </Container>
    </Section>
  );
}
