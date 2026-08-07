import { defineField, defineType } from 'sanity';

/** A playground piece. Small, self-contained, allowed to be unfinished. */
export const labExperimentType = defineType({
  name: 'labExperiment',
  title: 'Lab experiment',
  type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', validation: (rule) => rule.required() }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: { source: 'title', maxLength: 64 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      type: 'text',
      rows: 3,
      description: 'What it is and what question it was built to answer.',
      validation: (rule) => rule.required().max(400),
    }),
    defineField({
      name: 'status',
      type: 'string',
      initialValue: 'sketch',
      options: {
        list: [
          { title: 'Sketch', value: 'sketch' },
          { title: 'Live', value: 'live' },
          { title: 'Archived', value: 'archived' },
        ],
        layout: 'radio',
      },
      validation: (rule) => rule.required(),
    }),
    defineField({ name: 'order', type: 'number', initialValue: 100 }),
  ],
  orderings: [{ title: 'Manual order', name: 'order', by: [{ field: 'order', direction: 'asc' }] }],
  preview: { select: { title: 'title', subtitle: 'status' } },
});
