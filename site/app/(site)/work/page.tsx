import type { Metadata } from 'next';
import { WorkGrid } from '@/components/work/WorkGrid';
import { Container, Eyebrow, Section } from '@/components/wireframe/primitives';
import { getCaseStudies, getSegments } from '@/sanity/fetch';

export const metadata: Metadata = {
  title: 'Work',
  description: 'Selected projects: installations, mapping, environments and the digital work around them.',
};

export default async function WorkPage() {
  const [projects, segments] = await Promise.all([getCaseStudies(), getSegments()]);

  return (
    <Section className="pt-16 sm:pt-20">
      <Container>
        <Eyebrow>Work</Eyebrow>
        <h1 className="mt-6 max-w-[16ch] text-[clamp(2.4rem,8vw,6rem)] leading-[0.94] font-medium tracking-[-0.035em] text-ink">
          Projects, told properly.
        </h1>
        <p className="mt-8 mb-12 max-w-[52ch] text-[15px] leading-[1.7] text-ink-soft sm:text-base">
          Each project is written the same way: the idea, the context it landed in, what the audience
          actually experienced, and what changed because it existed.
        </p>

        <WorkGrid
          projects={projects}
          segments={segments.map(({ _id, title, slug, intro }) => ({ _id, title, slug, intro }))}
        />
      </Container>
    </Section>
  );
}
