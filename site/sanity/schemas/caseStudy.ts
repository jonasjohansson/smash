import { defineArrayMember, defineField, defineType } from 'sanity';

const narrative = (name: string, title: string, description: string) =>
  defineField({
    name,
    title,
    type: 'narrativeSection',
    description,
    group: 'narrative',
  });

/**
 * The case-study template follows the studio's own storytelling rule: idea →
 * context → audience experience → transformation. The four beats are separate
 * fields rather than one free-form body so a project can never quietly become a
 * list of tools and effects.
 */
export const caseStudyType = defineType({
  name: 'caseStudy',
  title: 'Case study',
  type: 'document',
  groups: [
    { name: 'meta', title: 'Meta', default: true },
    { name: 'narrative', title: 'Narrative' },
    { name: 'media', title: 'Media & credits' },
  ],
  fields: [
    defineField({ name: 'title', type: 'string', group: 'meta', validation: (rule) => rule.required() }),
    defineField({
      name: 'slug',
      type: 'slug',
      group: 'meta',
      options: { source: 'title', maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({ name: 'client', type: 'string', group: 'meta', validation: (rule) => rule.required() }),
    defineField({
      name: 'year',
      type: 'number',
      group: 'meta',
      validation: (rule) => rule.required().integer().min(2000).max(2100),
    }),
    defineField({
      name: 'segments',
      title: 'Segments',
      type: 'array',
      group: 'meta',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'segment' }] })],
      validation: (rule) => rule.min(1),
    }),
    defineField({
      name: 'heroMedia',
      title: 'Hero media',
      type: 'media',
      group: 'meta',
      validation: (rule) => rule.required(),
    }),
    defineField({ name: 'featured', title: 'Featured', type: 'boolean', group: 'meta', initialValue: false }),
    defineField({
      name: 'order',
      title: 'Order',
      type: 'number',
      group: 'meta',
      initialValue: 100,
      description: 'Lower sorts first on /work.',
    }),

    narrative('idea', 'Idea', 'What the project set out to do, before any technology is named.'),
    narrative('context', 'Context', 'The place, the constraints, the brief as it actually arrived.'),
    narrative('experience', 'Audience experience', 'What it is like to be there, in order, from the audience side.'),
    narrative('transformation', 'Transformation', 'What changed because the work existed.'),

    defineField({
      name: 'gallery',
      title: 'Gallery',
      type: 'array',
      group: 'media',
      of: [defineArrayMember({ type: 'media' })],
    }),
    defineField({
      name: 'credits',
      title: 'Credits',
      type: 'array',
      group: 'media',
      of: [defineArrayMember({ type: 'credit' })],
    }),
  ],
  orderings: [
    { title: 'Manual order', name: 'order', by: [{ field: 'order', direction: 'asc' }] },
    { title: 'Newest first', name: 'year', by: [{ field: 'year', direction: 'desc' }] },
  ],
  preview: {
    select: { title: 'title', client: 'client', year: 'year', media: 'heroMedia.image' },
    prepare: ({ title, client, year, media }) => ({
      title: title as string,
      subtitle: [client, year].filter(Boolean).join(' · '),
      media,
    }),
  },
});
