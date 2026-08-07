import * as React from 'react';
import CanvasRoot from '@/components/canvas/CanvasRoot';
import DebugOverlay from '@/components/site/DebugOverlay';
import SiteHeader from '@/components/site/SiteHeader';
import SmoothScroll from '@/components/site/SmoothScroll';
import { SiteFooter } from '@/components/site/SiteFooter';
import { getSegments, getSiteSettings } from '@/sanity/fetch';

/**
 * The site shell.
 *
 * `<CanvasRoot />` is a SIBLING of `{children}` here, and that is the whole
 * persistence mechanism: the App Router swaps `{children}` on navigation but
 * keeps this layout's own subtree mounted, so the `<Canvas>` element identity
 * never changes and the WebGPU renderer is created exactly once per session.
 * Moving `CanvasRoot` into a page would silently undo that.
 *
 * This layout stays a Server Component; only the four components it mounts are
 * client components.
 */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [settings, segments] = await Promise.all([getSiteSettings(), getSegments()]);

  return (
    <SmoothScroll>
      <CanvasRoot />
      <div className="relative z-10 flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter
          settings={settings}
          segments={segments.map(({ _id, title, slug, intro }) => ({ _id, title, slug, intro }))}
        />
      </div>
      <DebugOverlay />
    </SmoothScroll>
  );
}
