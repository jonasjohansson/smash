/**
 * The single source of truth for the shape of site content.
 *
 * These types describe what the GROQ queries in `sanity/queries.ts` project —
 * and, deliberately, exactly what `content/seed.ts` returns. That equivalence is
 * what lets the site run with no Sanity project connected: the data layer
 * (`sanity/fetch.ts`) swaps the source, never the shape.
 */

export interface SanityImageRef {
  _type: 'image';
  asset: { _ref: string; _type: 'reference' };
}

export interface PortableSpan {
  _type: 'span';
  _key: string;
  text: string;
  marks?: string[];
}

export interface PortableBlock {
  _type: 'block';
  _key: string;
  style: 'normal' | 'h3' | 'blockquote';
  markDefs: never[];
  children: PortableSpan[];
}

/** Portable Text, narrowed to the block styles this wireframe renders. */
export type PortableText = PortableBlock[];

export type MediaAspect = '21/9' | '16/9' | '4/5' | '1/1';

/**
 * A media slot. In the wireframe `image` is always null and the renderer draws a
 * labelled dashed block; once Sanity holds real assets the same slot renders the
 * image and keeps the label as the alt text.
 */
export interface Media {
  _type: 'media';
  _key: string;
  label: string;
  aspect: MediaAspect;
  caption: string | null;
  image: SanityImageRef | null;
  /** A local file under `public/`, for seed content that has real images before Sanity does. */
  src?: string | null;
}

export interface SegmentSummary {
  _id: string;
  title: string;
  slug: string;
  intro: string;
}

export interface Segment extends SegmentSummary {
  description: PortableText;
}

/** One beat of the case-study narrative: idea → context → experience → transformation. */
export interface NarrativeSection {
  heading: string;
  body: PortableText;
  media: Media[];
}

export interface CaseStudySummary {
  _id: string;
  title: string;
  slug: string;
  client: string;
  year: number;
  segments: SegmentSummary[];
  heroMedia: Media;
  featured: boolean;
  order: number;
}

export interface Credit {
  _key: string;
  role: string;
  name: string;
}

export interface CaseStudy extends CaseStudySummary {
  idea: NarrativeSection;
  context: NarrativeSection;
  experience: NarrativeSection;
  transformation: NarrativeSection;
  gallery: Media[];
  credits: Credit[];
}

export interface SocialLink {
  _key: string;
  label: string;
  url: string;
}

export interface SiteSettings {
  missionStatement: string;
  aboutTeaser: PortableText;
  ctaText: string;
  contactEmail: string;
  contactPhone: string;
  addressLines: string[];
  social: SocialLink[];
}

export type LabStatus = 'sketch' | 'live' | 'archived';

export interface LabExperiment {
  _id: string;
  title: string;
  slug: string;
  description: string;
  status: LabStatus;
}

/** The four narrative beats, in the order the case-study template renders them. */
export const NARRATIVE_KEYS = ['idea', 'context', 'experience', 'transformation'] as const;
export type NarrativeKey = (typeof NARRATIVE_KEYS)[number];
