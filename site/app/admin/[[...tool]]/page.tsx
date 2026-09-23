import { NextStudio } from 'next-sanity/studio';
import config from '@/sanity.config';
import { isSanityConfigured, projectId } from '@/sanity/env';

/**
 * Sanity Studio, embedded.
 *
 * The optional catch-all is required: the Studio is a client-side router and
 * needs every path under `/admin` to resolve to this page.
 */
export const dynamic = 'force-static';

/** Static export needs at least the bare `/admin` path listed. */
export function generateStaticParams() {
  return [{ tool: [] }];
}

export { metadata, viewport } from 'next-sanity/studio';

export default function StudioPage() {
  if (!isSanityConfigured) {
    return (
      <div className="mx-auto max-w-[62ch] px-6 py-24 font-mono text-[13px] leading-[1.8] text-neutral-800">
        <h1 className="text-base font-bold">Sanity is not connected yet.</h1>
        <p className="mt-4">
          The Studio is built and ready — it just has no project to talk to.
          <br />
          Current <code>NEXT_PUBLIC_SANITY_PROJECT_ID</code>: <code>{projectId}</code>
        </p>
        <ol className="mt-6 list-decimal space-y-2 pl-5">
          <li>
            Create a project at <code>sanity.io/manage</code> (or run{' '}
            <code>npx sanity@latest init</code> from <code>site/</code>).
          </li>
          <li>
            Copy <code>.env.local.example</code> to <code>.env.local</code> and fill in the project
            id and dataset.
          </li>
          <li>
            Add <code>http://localhost:3000</code> as a CORS origin with credentials allowed.
          </li>
          <li>
            Restart the dev server. This page becomes the Studio, and the site starts reading live
            content instead of <code>content/seed.ts</code>.
          </li>
        </ol>
        <p className="mt-6">Full instructions are in the README.</p>
      </div>
    );
  }

  return <NextStudio config={config} />;
}
