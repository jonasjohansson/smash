import type { Metadata } from 'next';
import Link from 'next/link';
import { MediaBlock } from '@/components/wireframe/MediaBlock';
import { Prose } from '@/components/wireframe/Prose';
import { Container, Eyebrow, Section, SectionHead, WireNote } from '@/components/wireframe/primitives';
import { media } from '@/content/portable';
import { getSegments, getSiteSettings } from '@/sanity/fetch';

export const metadata: Metadata = {
  title: 'Studio',
  description: 'Who SMASH is, how the studio works, and what it takes to deliver spatial work.',
};

/** WIREFRAME copy. Structure and length are the point; the words are a stand-in. */
const APPROACH = [
  {
    step: '01',
    title: 'Read the space',
    body: 'Before anything is designed we spend time in the room — proportion, light, sound, how people already move through it. Most of the good decisions come from that visit.',
  },
  {
    step: '02',
    title: 'Find the one idea',
    body: 'A project should be describable in a sentence. We work the concept until it is, then let the technology follow from it rather than the other way round.',
  },
  {
    step: '03',
    title: 'Prototype with people',
    body: 'Interaction that works in a studio often fails in a crowd. We test early, with strangers, and we throw away the parts that need explaining.',
  },
  {
    step: '04',
    title: 'Build for the run',
    body: 'Install is the beginning, not the end. We design for the crew who has to start it every morning and for the months after we have gone.',
  },
];

const CLIENTS = [
  'Reitan',
  'Client placeholder',
  'Client placeholder',
  'Client placeholder',
  'Client placeholder',
  'Client placeholder',
  'Client placeholder',
  'Client placeholder',
];

export default async function StudioPage() {
  const [settings, segments] = await Promise.all([getSiteSettings(), getSegments()]);

  return (
    <>
      {/* --- intro ------------------------------------------------------ */}
      <Section className="pt-16 sm:pt-20">
        <Container>
          <Eyebrow>Studio</Eyebrow>
          <h1 className="mt-6 max-w-[17ch] text-[clamp(2.4rem,8vw,6rem)] leading-[0.94] font-medium tracking-[-0.035em] text-ink">
            A studio built around the room.
          </h1>
          <div className="mt-10 max-w-[62ch]">
            <Prose value={settings.aboutTeaser} />
          </div>
        </Container>
      </Section>

      {/* --- story ------------------------------------------------------ */}
      <Section className="border-t border-line">
        <Container>
          <SectionHead index="01" label="Story" />
          <div className="grid gap-12 md:grid-cols-12">
            <div className="md:col-span-6">
              <h2 className="max-w-[20ch] text-[clamp(1.5rem,3.4vw,2.4rem)] leading-[1.1] font-medium tracking-[-0.02em] text-ink">
                We started because the interesting work kept falling between disciplines.
              </h2>
              <p className="mt-6 max-w-[58ch] text-[15px] leading-[1.7] text-ink-soft sm:text-base">
                Placeholder copy in the studio&apos;s voice. Artists who could not get their pieces
                built, and engineers who could build anything but were handed nothing worth building.
                SMASH exists in that gap, and the work has stayed there since.
              </p>
              <p className="mt-5 max-w-[58ch] text-[15px] leading-[1.7] text-ink-soft sm:text-base">
                Placeholder copy. The studio has grown by taking on projects slightly larger than was
                comfortable, and by keeping the people who made those projects work.
              </p>
              <WireNote>
                Wireframe: the real studio story goes here — founding, turning points, why the work
                looks the way it does. Two to four short paragraphs, specific rather than inflated.
              </WireNote>
            </div>
            <div className="md:col-span-6">
              <MediaBlock media={media('Studio portrait — team at work', '4/5')} />
            </div>
          </div>
        </Container>
      </Section>

      {/* --- approach --------------------------------------------------- */}
      <Section className="border-t border-line">
        <Container>
          <SectionHead index="02" label="Approach" />
          <ol className="grid gap-px border border-line bg-line sm:grid-cols-2">
            {APPROACH.map((a) => (
              <li key={a.step} className="bg-paper p-6 sm:p-8">
                <Eyebrow>{a.step}</Eyebrow>
                <h3 className="mt-4 text-xl font-medium tracking-[-0.01em] text-ink">{a.title}</h3>
                <p className="mt-3 max-w-[42ch] text-[15px] leading-[1.65] text-ink-soft">{a.body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      {/* --- capability / segments ------------------------------------- */}
      <Section className="border-t border-line">
        <Container>
          <SectionHead index="03" label="Capability" />
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {segments.map((s) => (
              <li key={s.slug} className="border-t border-ink pt-4">
                <Link href={`/expertise/${s.slug}`} className="group block">
                  <h3 className="text-lg font-medium tracking-[-0.01em] text-ink">{s.title}</h3>
                  <p className="mt-2 text-[14px] leading-[1.6] text-ink-soft">{s.intro}</p>
                  <span className="mt-3 inline-block font-mono text-[10px] tracking-[0.2em] text-muted uppercase group-hover:text-ink">
                    Read more →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      {/* --- team ------------------------------------------------------- */}
      <Section className="border-t border-line">
        <Container>
          <SectionHead index="04" label="Team" />
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((n) => (
              <li key={n}>
                <MediaBlock media={media(`Team portrait ${n}`, '4/5')} />
                <p className="mt-3 text-[15px] font-medium text-ink">Name placeholder</p>
                <p className="font-mono text-[11px] tracking-[0.12em] text-muted uppercase">
                  Role placeholder
                </p>
              </li>
            ))}
          </ul>
          <WireNote>
            Wireframe: team is a fixed grid for now. Whether it becomes a full team page, a short
            list, or nothing at all is a content decision — it is not modelled in Sanity yet.
          </WireNote>
        </Container>
      </Section>

      {/* --- credibility strip ------------------------------------------ */}
      <Section className="border-t border-line">
        <Container>
          <SectionHead index="05" label="Selected clients" />
          <ul className="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
            {CLIENTS.map((c, i) => (
              <li
                key={`${c}-${i}`}
                className="flex h-24 items-center justify-center bg-paper px-4 text-center"
              >
                <span className="font-mono text-[11px] tracking-[0.14em] text-muted uppercase">
                  {c}
                </span>
              </li>
            ))}
          </ul>
          <WireNote>
            Wireframe: client marks will replace these cells. One real name is shown; the rest are
            placeholders.
          </WireNote>
        </Container>
      </Section>
    </>
  );
}
