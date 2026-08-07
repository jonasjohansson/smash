import { defineQuery } from 'next-sanity';

/**
 * GROQ projections.
 *
 * Every projection is written so the JSON it returns is structurally identical
 * to the corresponding export in `content/seed.ts` — same keys, same nullability,
 * `slug` already flattened to a string, missing arrays coalesced to `[]`. The
 * data layer can then swap sources without a mapping step.
 */

const MEDIA = /* groq */ `{
  "_type": "media",
  "_key": coalesce(_key, label, "media"),
  "label": coalesce(label, "Untitled media"),
  "aspect": coalesce(aspect, "16/9"),
  "caption": coalesce(caption, null),
  "image": select(defined(image.asset) => image, null)
}`;

const narrative = (field: string, fallbackHeading: string) => /* groq */ `"${field}": {
  "heading": coalesce(${field}.heading, "${fallbackHeading}"),
  "body": coalesce(${field}.body, []),
  "media": coalesce(${field}.media[]${MEDIA}, [])
}`;

const SEGMENT_SUMMARY = /* groq */ `{
  _id,
  "title": coalesce(title, "Untitled"),
  "slug": slug.current,
  "intro": coalesce(intro, "")
}`;

const CASE_SUMMARY = /* groq */ `{
  _id,
  "title": coalesce(title, "Untitled"),
  "slug": slug.current,
  "client": coalesce(client, ""),
  "year": coalesce(year, 0),
  "segments": coalesce(segments[]->${SEGMENT_SUMMARY}, []),
  "heroMedia": coalesce(heroMedia${MEDIA}, {
    "_type": "media", "_key": "hero", "label": "Hero media", "aspect": "21/9",
    "caption": null, "image": null
  }),
  "featured": coalesce(featured, false),
  "order": coalesce(order, 100)
}`;

export const segmentsQuery = defineQuery(/* groq */ `
  *[_type == "segment" && defined(slug.current)] | order(coalesce(order, 100) asc, title asc) {
    ...${SEGMENT_SUMMARY},
    "description": coalesce(description, [])
  }
`);

export const segmentBySlugQuery = defineQuery(/* groq */ `
  *[_type == "segment" && slug.current == $slug][0] {
    ...${SEGMENT_SUMMARY},
    "description": coalesce(description, [])
  }
`);

export const caseStudiesQuery = defineQuery(/* groq */ `
  *[_type == "caseStudy" && defined(slug.current)] | order(coalesce(order, 100) asc, year desc) ${CASE_SUMMARY}
`);

export const caseStudyBySlugQuery = defineQuery(/* groq */ `
  *[_type == "caseStudy" && slug.current == $slug][0] {
    ...${CASE_SUMMARY},
    ${narrative('idea', 'The idea')},
    ${narrative('context', 'The context')},
    ${narrative('experience', 'The audience experience')},
    ${narrative('transformation', 'What changed')},
    "gallery": coalesce(gallery[]${MEDIA}, []),
    "credits": coalesce(credits[]{ "_key": coalesce(_key, role), role, name }, [])
  }
`);

export const labExperimentsQuery = defineQuery(/* groq */ `
  *[_type == "labExperiment" && defined(slug.current)] | order(coalesce(order, 100) asc, title asc) {
    _id,
    "title": coalesce(title, "Untitled"),
    "slug": slug.current,
    "description": coalesce(description, ""),
    "status": coalesce(status, "sketch")
  }
`);

export const siteSettingsQuery = defineQuery(/* groq */ `
  *[_type == "siteSettings"][0] {
    "missionStatement": coalesce(missionStatement, ""),
    "aboutTeaser": coalesce(aboutTeaser, []),
    "ctaText": coalesce(ctaText, ""),
    "contactEmail": coalesce(contactEmail, ""),
    "contactPhone": coalesce(contactPhone, ""),
    "addressLines": coalesce(addressLines, []),
    "social": coalesce(social[]{ "_key": coalesce(_key, label), label, url }, [])
  }
`);
