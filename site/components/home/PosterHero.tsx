'use client';

import * as React from 'react';
import Image from 'next/image';
import { useCanvasStore } from '@/lib/canvas-store';
import { Container, Eyebrow } from '@/components/wireframe/primitives';

/**
 * The hero, and the LCP element.
 *
 * The poster is a real server-rendered `<img>` (next/image with `priority` also
 * emits a `<link rel="preload">` in `<head>`). It has intrinsic dimensions so it
 * reserves layout, and it needs no JavaScript to paint. The 3D canvas is a
 * separate chunk that is not requested until `window.load` → idle, and it
 * cross-fades in over this image when its first frame renders. Under
 * `prefers-reduced-motion` the canvas never boots and this is the whole hero.
 *
 * WIREFRAME: the poster is a generated greyscale field (`scripts/make-poster.mjs`)
 * standing in for a real hero still or film frame.
 */
export default function PosterHero() {
  const canvasVisible = useCanvasStore((s) => s.canvasVisible);

  return (
    <section className="relative flex min-h-[86vh] w-full items-end overflow-hidden border-b border-line">
      <Image
        src="/hero-poster.png"
        alt="SMASH hero — placeholder still"
        width={1600}
        height={900}
        priority
        fetchPriority="high"
        sizes="100vw"
        className="absolute inset-0 -z-10 h-full w-full object-cover transition-opacity duration-1000"
        style={{ opacity: canvasVisible ? 0.15 : 1 }}
      />

      <Container wide className="relative z-10 pt-24 pb-14 sm:pb-20">
        <Eyebrow>Creative studio · Art, design, technology, space</Eyebrow>
        <h1 className="mt-6 max-w-[14ch] text-[clamp(2.75rem,11vw,9rem)] leading-[0.9] font-medium tracking-[-0.035em] text-ink">
          Spaces that answer back.
        </h1>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <p className="max-w-[46ch] text-[15px] leading-[1.6] text-ink-soft sm:text-base">
            Interactive installations, projection mapping, immersive environments and the digital work
            that carries them further — made to be walked into, not looked at.
          </p>
          <p className="font-mono text-[10px] tracking-[0.22em] text-muted uppercase">Scroll</p>
        </div>
      </Container>
    </section>
  );
}
