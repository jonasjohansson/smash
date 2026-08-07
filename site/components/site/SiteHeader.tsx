'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/work', label: 'Work' },
  { href: '/expertise/interactive-installations', label: 'Expertise', match: '/expertise' },
  { href: '/studio', label: 'Studio' },
  { href: '/lab', label: 'Lab' },
  { href: '/contact', label: 'Contact' },
] as const;

export default function SiteHeader() {
  const pathname = usePathname() ?? '/';
  const [open, setOpen] = React.useState(false);

  // Close the mobile menu on navigation. Adjusting state during render (rather
  // than in an effect) is React's documented pattern for "reset when a prop
  // changes" and avoids a second render pass with the menu still open.
  const [lastPath, setLastPath] = React.useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  const isActive = (href: string, match?: string) => {
    const base = match ?? href;
    return base === '/' ? pathname === '/' : pathname.startsWith(base);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between px-5 py-3 sm:px-8 lg:px-14">
        <Link
          href="/"
          className="font-mono text-[13px] font-bold tracking-[0.28em] text-ink"
          aria-label="SMASH — home"
        >
          SMASH
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-7 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isActive(l.href, 'match' in l ? l.match : undefined) ? 'page' : undefined}
              className={`font-mono text-[11px] tracking-[0.16em] uppercase transition-colors ${
                isActive(l.href, 'match' in l ? l.match : undefined)
                  ? 'text-ink underline underline-offset-[6px]'
                  : 'text-muted hover:text-ink'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          className="font-mono text-[11px] tracking-[0.16em] text-ink uppercase md:hidden"
        >
          {open ? 'Close' : 'Menu'}
        </button>
      </div>

      {open ? (
        <nav
          id="mobile-nav"
          aria-label="Primary mobile"
          className="border-t border-line bg-paper md:hidden"
        >
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="block border-b border-line px-5 py-4 font-mono text-[12px] tracking-[0.16em] text-ink uppercase"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
