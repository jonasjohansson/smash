'use client';

/**
 * Sanity Studio, embedded at /admin.
 *
 * Nothing here needs editing to connect the real project — `sanity/env.ts` reads
 * NEXT_PUBLIC_SANITY_PROJECT_ID / NEXT_PUBLIC_SANITY_DATASET from the
 * environment. Until those are set the Studio still builds and mounts; it simply
 * has no project to talk to, and `/admin` renders a short instruction instead
 * (see `app/admin/[[...tool]]/page.tsx`).
 */

import { visionTool } from '@sanity/vision';
import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';

import { apiVersion, dataset, projectId, studioBasePath } from './sanity/env';
import { schemaTypes } from './sanity/schemas';

export default defineConfig({
  name: 'smash-studio',
  title: 'SMASH',
  basePath: studioBasePath,
  projectId,
  dataset,
  schema: { types: schemaTypes },
  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Content')
          .items([
            // Singleton — one settings document, opened directly.
            S.listItem()
              .title('Site settings')
              .id('siteSettings')
              .child(S.document().schemaType('siteSettings').documentId('siteSettings')),
            S.divider(),
            S.documentTypeListItem('caseStudy').title('Case studies'),
            S.documentTypeListItem('segment').title('Segments'),
            S.documentTypeListItem('labExperiment').title('Lab experiments'),
          ]),
    }),
    visionTool({ defaultApiVersion: apiVersion }),
  ],
});
