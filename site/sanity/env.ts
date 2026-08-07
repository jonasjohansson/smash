/**
 * Sanity environment.
 *
 * Connecting the real project is a CONFIG step, not a code step: set the two
 * public vars in `.env.local` and every fetch in `sanity/fetch.ts` switches from
 * local seed data to live content. Until then `isSanityConfigured` is false and
 * the site runs entirely on `content/seed.ts`.
 */

/** Deliberately obvious so an unset env reads as unset, not as a broken project. */
export const PLACEHOLDER_PROJECT_ID = 'your-project-id';

export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? PLACEHOLDER_PROJECT_ID;
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production';
export const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? '2026-08-07';

/** Sanity project IDs are lowercase alphanumeric. */
const PROJECT_ID_RE = /^[a-z0-9]+$/;

export const isSanityConfigured: boolean =
  projectId !== PLACEHOLDER_PROJECT_ID && projectId.length > 0 && PROJECT_ID_RE.test(projectId);

/** Studio route. Kept here so the config and the route segment cannot drift apart. */
export const studioBasePath = '/admin';
