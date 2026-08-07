import { defineArrayMember, defineField, defineType } from 'sanity';

/**
 * A segment is one of the four things the studio makes. Segments are referenced
 * by case studies and drive `/expertise/[slug]`.
 */
export const segmentType = defineType({
  name: 'segment',
  title: 'Segment',
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
      name: 'intro',
      title: 'Intro statement',
      type: 'text',
      rows: 2,
      description: 'One or two sentences. Shown on the home grid and at the top of the segment page.',
      validation: (rule) => rule.required().max(220),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [
            { title: 'Normal', value: 'normal' },
            { title: 'Sub-heading', value: 'h3' },
            { title: 'Quote', value: 'blockquote' },
          ],
          lists: [],
        }),
      ],
    }),
    defineField({
      name: 'order',
      title: 'Order',
      type: 'number',
      initialValue: 100,
    }),
  ],
  orderings: [{ title: 'Manual order', name: 'order', by: [{ field: 'order', direction: 'asc' }] }],
  preview: { select: { title: 'title', subtitle: 'intro' } },
});
