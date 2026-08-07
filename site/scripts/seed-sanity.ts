/**
 * Push `content/seed.ts` into a real Sanity dataset.
 *
 *   npm run seed            # create or replace the seed documents
 *   npm run seed -- --dry   # print what would be written, touch nothing
 *
 * Requires, in `.env.local`:
 *   NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET,
 *   SANITY_API_WRITE_TOKEN  (Editor role)
 *
 * Idempotent: documents are written with deterministic `_id`s, so running it
 * twice replaces rather than duplicates. It uses `createOrReplace`, which means
 * it WILL overwrite editor changes to those specific documents — it is a
 * bootstrap tool, not a sync.
 *
 * Note: this has not been run yet. It exists so that connecting Sanity is a
 * config step rather than a content-entry evening.
 */

import { createClient } from '@sanity/client';
import { seedCaseStudies, seedLabExperiments, seedSegments, seedSiteSettings } from '../content/seed';
import type { Media, NarrativeSection } from '../sanity/types';

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production';
const token = process.env.SANITY_API_WRITE_TOKEN;
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? '2026-08-07';
const dryRun = process.argv.includes('--dry');

type SanityDoc = Record<string, unknown> & { _id: string; _type: string };

/** Seed ids are namespaced with a dot; Sanity ids allow it, but keep them tidy. */
const docId = (id: string) => id.replace(/\./g, '-');

const toSlug = (slug: string) => ({ _type: 'slug', current: slug });

const toMedia = (m: Media) => ({
  _type: 'media',
  _key: m._key,
  label: m.label,
  aspect: m.aspect,
  ...(m.caption ? { caption: m.caption } : {}),
});

const toNarrative = (n: NarrativeSection) => ({
  _type: 'narrativeSection',
  heading: n.heading,
  body: n.body,
  media: n.media.map(toMedia),
});

function buildDocuments(): SanityDoc[] {
  const docs: SanityDoc[] = [];

  seedSegments.forEach((s, i) => {
    docs.push({
      _id: docId(s._id),
      _type: 'segment',
      title: s.title,
      slug: toSlug(s.slug),
      intro: s.intro,
      description: s.description,
      order: (i + 1) * 10,
    });
  });

  seedCaseStudies.forEach((c) => {
    docs.push({
      _id: docId(c._id),
      _type: 'caseStudy',
      title: c.title,
      slug: toSlug(c.slug),
      client: c.client,
      year: c.year,
      featured: c.featured,
      order: c.order,
      segments: c.segments.map((s) => ({
        _type: 'reference',
        _key: s.slug,
        _ref: docId(s._id),
      })),
      heroMedia: toMedia(c.heroMedia),
      idea: toNarrative(c.idea),
      context: toNarrative(c.context),
      experience: toNarrative(c.experience),
      transformation: toNarrative(c.transformation),
      gallery: c.gallery.map(toMedia),
      credits: c.credits.map((cr) => ({ _type: 'credit', _key: cr._key, role: cr.role, name: cr.name })),
    });
  });

  seedLabExperiments.forEach((l, i) => {
    docs.push({
      _id: docId(l._id),
      _type: 'labExperiment',
      title: l.title,
      slug: toSlug(l.slug),
      description: l.description,
      status: l.status,
      order: (i + 1) * 10,
    });
  });

  docs.push({
    _id: 'siteSettings',
    _type: 'siteSettings',
    missionStatement: seedSiteSettings.missionStatement,
    aboutTeaser: seedSiteSettings.aboutTeaser,
    ctaText: seedSiteSettings.ctaText,
    contactEmail: seedSiteSettings.contactEmail,
    contactPhone: seedSiteSettings.contactPhone,
    addressLines: seedSiteSettings.addressLines,
    social: seedSiteSettings.social.map((s) => ({
      _type: 'socialLink',
      _key: s._key,
      label: s.label,
      url: s.url,
    })),
  });

  return docs;
}

async function main(): Promise<void> {
  const docs = buildDocuments();

  if (dryRun) {
    console.log(`[SMASH] dry run — ${docs.length} documents would be written:`);
    for (const d of docs) console.log(`  ${d._type.padEnd(16)} ${d._id}`);
    return;
  }

  if (!projectId || projectId === 'your-project-id') {
    throw new Error('NEXT_PUBLIC_SANITY_PROJECT_ID is not set — see .env.local.example');
  }
  if (!token) {
    throw new Error('SANITY_API_WRITE_TOKEN is not set — see .env.local.example');
  }

  const client = createClient({ projectId, dataset, apiVersion, token, useCdn: false });

  // Segments first: case studies reference them, and a transaction with a
  // dangling reference is rejected.
  const tx = docs.reduce((t, doc) => t.createOrReplace(doc), client.transaction());
  await tx.commit();

  console.log(`[SMASH] wrote ${docs.length} documents to ${projectId}/${dataset}`);
}

main().catch((error: unknown) => {
  console.error('[SMASH] seed failed:', error);
  process.exit(1);
});
