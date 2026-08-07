import * as React from 'react';
import Link from 'next/link';
import { Container, Eyebrow } from '@/components/wireframe/primitives';
import type { SegmentSummary, SiteSettings } from '@/sanity/types';

/**
 * Global footer. The home page has its own larger contact moment above this —
 * the footer is the persistent, quieter version of the same invitation.
 */
export function SiteFooter({
  settings,
  segments,
}: {
  settings: SiteSettings;
  segments: SegmentSummary[];
}) {
  return (
    <footer className="relative z-10 mt-24 border-t border-line bg-paper">
      <Container wide className="py-14 lg:py-20">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="font-mono text-[13px] font-bold tracking-[0.28em] text-ink">SMASH</p>
            <p className="mt-4 max-w-[34ch] text-[15px] leading-[1.6] text-ink-soft">
              {settings.ctaText}
            </p>
            <Link
              href="/contact"
              className="mt-5 inline-block border-b border-ink pb-0.5 font-mono text-[11px] tracking-[0.16em] text-ink uppercase"
            >
              Get in touch
            </Link>
          </div>

          <div className="md:col-span-3">
            <Eyebrow>Expertise</Eyebrow>
            <ul className="mt-4 space-y-2">
              {segments.map((s) => (
                <li key={s.slug}>
                  <Link
                    href={`/expertise/${s.slug}`}
                    className="text-[14px] text-ink-soft transition-colors hover:text-ink"
                  >
                    {s.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-2">
            <Eyebrow>Site</Eyebrow>
            <ul className="mt-4 space-y-2">
              {[
                { href: '/work', label: 'Work' },
                { href: '/studio', label: 'Studio' },
                { href: '/lab', label: 'Lab' },
                { href: '/contact', label: 'Contact' },
              ].map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-[14px] text-ink-soft transition-colors hover:text-ink"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-2">
            <Eyebrow>Contact</Eyebrow>
            <ul className="mt-4 space-y-2 text-[14px] text-ink-soft">
              <li>
                <a href={`mailto:${settings.contactEmail}`} className="hover:text-ink">
                  {settings.contactEmail}
                </a>
              </li>
              <li>{settings.contactPhone}</li>
              {settings.addressLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1">
              {settings.social.map((s) => (
                <li key={s._key}>
                  <a
                    href={s.url}
                    rel="noreferrer noopener"
                    target="_blank"
                    className="font-mono text-[11px] tracking-[0.12em] text-muted uppercase hover:text-ink"
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-2 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[10px] tracking-[0.16em] text-muted uppercase">
            © {new Date().getFullYear()} SMASH
          </p>
          <p className="font-mono text-[10px] tracking-[0.16em] text-muted uppercase">
            Wireframe build · visual design pending
          </p>
        </div>
      </Container>
    </footer>
  );
}
