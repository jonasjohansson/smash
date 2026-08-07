import { createClient, type SanityClient } from 'next-sanity';
import { apiVersion, dataset, isSanityConfigured, projectId } from './env';

/**
 * Returns a client only when a real project is configured.
 *
 * `createClient` with the placeholder id would build fine and then fail at
 * request time against a project that does not exist — returning `null` instead
 * lets the data layer fall back to seed content deliberately rather than by
 * catching an error.
 */
export function getSanityClient(): SanityClient | null {
  if (!isSanityConfigured) return null;
  return createClient({
    projectId,
    dataset,
    apiVersion,
    useCdn: process.env.NODE_ENV === 'production',
    perspective: 'published',
  });
}
