import Link from 'next/link';
import PosterHero from '@/components/home/PosterHero';
import MissionStatement from '@/components/home/MissionStatement';
import { Prose } from '@/components/wireframe/Prose';
import { Container, Eyebrow, Section, SectionHead, WireNote } from '@/components/wireframe/primitives';
import { getSegments, getSiteSettings } from '@/sanity/fetch';

/**
 * Home.
 *
 * Structural rhythm, in order: a hero moment → one statement of intent → the
 * four things we make → who we are, briefly → an invitation. Each section hands
 * off to a destination rather than trying to be the destination.
 */
export default async function HomePage() {
  const [settings, segments] = await Promise.all([getSiteSettings(), getSegments()]);

  return (
    <>
      <PosterHero />

      <Section>
        <MissionStatement statement={settings.missionStatement} />
      </Section>

      {/* --- 02 · the four segments ------------------------------------- */}
      <Section className="border-t border-line">
        <Container>
          <SectionHead index="02" label="What we make" />
          <ul className="grid gap-px border border-line bg-line sm:grid-cols-2">
            {segments.map((segment, i) => (
              <li key={segment.slug} className="bg-paper">
                <Link
                  href={`/expertise/${segment.slug}`}
                  className="group flex h-full flex-col justify-between gap-8 p-6 transition-colors hover:bg-paper-alt sm:p-8 lg:p-10"
                >
                  <div>
                    <Eyebrow>{String(i + 1).padStart(2, '0')}</Eyebrow>
                    <h2 className="mt-4 text-[clamp(1.4rem,3vw,2.1rem)] leading-[1.08] font-medium tracking-[-0.02em] text-ink">
                      {segment.title}
                    </h2>
                    <p className="mt-4 max-w-[38ch] text-[15px] leading-[1.6] text-ink-soft">
                      {segment.intro}
                    </p>
                  </div>
                  <span className="font-mono text-[10px] tracking-[0.22em] text-muted uppercase group-hover:text-ink">
                    See the work →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      {/* --- 03 · about teaser ------------------------------------------ */}
      <Section className="border-t border-line">
        <Container>
          <SectionHead index="03" label="The studio" />
          <div className="grid gap-10 md:grid-cols-12">
            <div className="md:col-span-7">
              <Prose value={settings.aboutTeaser} />
              <Link
                href="/studio"
                className="mt-8 inline-block border-b border-ink pb-0.5 font-mono text-[11px] tracking-[0.16em] text-ink uppercase"
              >
                More about SMASH
              </Link>
            </div>
            <div className="md:col-span-5">
              <dl className="border-t border-line">
                {[
                  ['Founded', 'Placeholder'],
                  ['Based in', 'Placeholder city'],
                  ['Team', 'Placeholder — artists, engineers, producers'],
                  ['Works with', 'Cultural venues, brands, public space'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-6 border-b border-line py-3">
                    <dt className="font-mono text-[10px] tracking-[0.18em] text-muted uppercase">{k}</dt>
                    <dd className="text-right text-[14px] text-ink-soft">{v}</dd>
                  </div>
                ))}
              </dl>
              <WireNote>
                Wireframe: these facts are placeholders. Real figures go into Sanity → Site settings
                once they are agreed.
              </WireNote>
            </div>
          </div>
        </Container>
      </Section>

      {/* --- 04 · the invitation ---------------------------------------- */}
      <Section className="border-t border-line">
        <Container>
          <SectionHead index="04" label="Start something" />
          <p className="max-w-[16ch] text-[clamp(2.1rem,7vw,5.5rem)] leading-[0.95] font-medium tracking-[-0.035em] text-ink">
            {settings.ctaText}
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-10">
            <Link
              href="/contact"
              className="inline-block border border-ink px-6 py-3 font-mono text-[11px] tracking-[0.16em] text-ink uppercase transition-colors hover:bg-ink hover:text-paper"
            >
              Contact the studio
            </Link>
            <a
              href={`mailto:${settings.contactEmail}`}
              className="font-mono text-[12px] tracking-[0.08em] text-muted hover:text-ink"
            >
              {settings.contactEmail}
            </a>
          </div>
        </Container>
      </Section>
    </>
  );
}
