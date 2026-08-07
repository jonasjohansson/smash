'use client';

import * as React from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import { Container, Eyebrow, SectionHead } from '@/components/wireframe/primitives';
import { error, log } from '@/lib/debug';

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

/**
 * The mission statement — the one piece of large type on the home page that is
 * pure voice, no navigation.
 *
 * SplitText ships in the free `gsap` package since 3.13. It is created inside
 * `useGSAP` with a scope so its DOM surgery is reverted on unmount; without that,
 * navigating away leaves orphaned wrapper spans behind and the next visit splits
 * an already-split element.
 */
export default function MissionStatement({ statement }: { statement: string }) {
  const root = React.useRef<HTMLDivElement>(null);
  const headingRef = React.useRef<HTMLParagraphElement>(null);

  useGSAP(
    () => {
      const el = headingRef.current;
      if (!el) return;
      let split: SplitText | null = null;
      try {
        split = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'wire-line' });
        gsap.from(split.lines, {
          yPercent: 115,
          duration: 0.95,
          stagger: 0.08,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none reverse' },
        });
        log(`splitText.created — ${split.lines.length} lines`);
      } catch (err) {
        error('splitText failed', err);
      }
      return () => split?.revert();
    },
    { scope: root, dependencies: [statement] },
  );

  return (
    <div ref={root}>
      <Container>
        <SectionHead index="01" label="What we do" />
        <p
          ref={headingRef}
          className="max-w-[19ch] text-[clamp(1.85rem,5.4vw,4.25rem)] leading-[1.04] font-medium tracking-[-0.03em] text-ink"
        >
          {statement}
        </p>
        <div className="mt-10 max-w-[62ch]">
          <Eyebrow>The short version</Eyebrow>
          <p className="mt-3 text-[15px] leading-[1.7] text-ink-soft sm:text-base">
            We start with the room and the people in it, not with the equipment list. Then we build
            the thing that makes the room worth standing in — and we stay on it until the last night
            of the run.
          </p>
        </div>
      </Container>
    </div>
  );
}
