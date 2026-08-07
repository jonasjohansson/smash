import 'server-only';

import { getSanityClient } from './client';
import {
  caseStudiesQuery,
  caseStudyBySlugQuery,
  labExperimentsQuery,
  segmentBySlugQuery,
  segmentsQuery,
  siteSettingsQuery,
} from './queries';
import type {
  CaseStudy,
  CaseStudySummary,
  LabExperiment,
  Segment,
  SiteSettings,
} from './types';
import {
  seedCaseStudies,
  seedLabExperiments,
  seedSegments,
  seedSiteSettings,
} from '@/content/seed';

/**
 * The data layer.
 *
 * One rule: every function returns the seed value when Sanity is not configured,
 * or when a configured Sanity returns nothing. The rest of the app never learns
 * which happened — pages stay identical whether or not a CMS exists yet.
 */

/** Where the last fetch got its data. Surfaced in the ?debug=1 overlay. */
export type ContentSource = 'sanity' | 'seed';

async function query<T>(groq: string, params: Record<string, unknown> = {}): Promise<T | null> {
  const client = getSanityClient();
  if (!client) return null;
  try {
    return await client.fetch<T>(groq, params, {
      next: { revalidate: 60 },
    });
  } catch (error) {
    // A CMS outage must not take the site down: log and fall through to seed.
    console.error('[SMASH] sanity fetch failed, falling back to seed content', error);
    return null;
  }
}

const isEmpty = (v: unknown): boolean => v == null || (Array.isArray(v) && v.length === 0);

export async function getSegments(): Promise<Segment[]> {
  const result = await query<Segment[]>(segmentsQuery);
  return isEmpty(result) ? seedSegments : (result as Segment[]);
}

export async function getSegment(slug: string): Promise<Segment | null> {
  const result = await query<Segment | null>(segmentBySlugQuery, { slug });
  return result ?? seedSegments.find((s) => s.slug === slug) ?? null;
}

export async function getCaseStudies(): Promise<CaseStudySummary[]> {
  const result = await query<CaseStudySummary[]>(caseStudiesQuery);
  return isEmpty(result) ? seedCaseStudies : (result as CaseStudySummary[]);
}

export async function getCaseStudy(slug: string): Promise<CaseStudy | null> {
  const result = await query<CaseStudy | null>(caseStudyBySlugQuery, { slug });
  return result ?? seedCaseStudies.find((c) => c.slug === slug) ?? null;
}

/** Case studies tagged with a given segment — powers the "related work" strips. */
export async function getCaseStudiesForSegment(segmentSlug: string): Promise<CaseStudySummary[]> {
  const all = await getCaseStudies();
  return all.filter((c) => c.segments.some((s) => s.slug === segmentSlug));
}

/** The project after this one, wrapping around at the end. */
export async function getNextCaseStudy(slug: string): Promise<CaseStudySummary | null> {
  const all = await getCaseStudies();
  if (all.length < 2) return null;
  const index = all.findIndex((c) => c.slug === slug);
  if (index === -1) return all[0];
  return all[(index + 1) % all.length];
}

export async function getLabExperiments(): Promise<LabExperiment[]> {
  const result = await query<LabExperiment[]>(labExperimentsQuery);
  return isEmpty(result) ? seedLabExperiments : (result as LabExperiment[]);
}

export async function getSiteSettings(): Promise<SiteSettings> {
  const result = await query<SiteSettings | null>(siteSettingsQuery);
  return result ?? seedSiteSettings;
}
