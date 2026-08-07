import { defineArrayMember, defineField, defineType } from 'sanity';

/**
 * Shared object types.
 *
 * `media` is the single media primitive for the whole site. It carries a label
 * even when an asset exists, because the label doubles as alt text and as the
 * wireframe placeholder caption — one field, two jobs, no drift.
 */

export const mediaType = defineType({
  name: 'media',
  title: 'Media',
  type: 'object',
  fields: [
    defineField({
      name: 'label',
      title: 'Label / alt text',
      type: 'string',
      description: 'Describes the shot. Used as alt text, and as the placeholder caption until an asset is uploaded.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'aspect',
      title: 'Aspect ratio',
      type: 'string',
      initialValue: '16/9',
      options: {
        list: [
          { title: 'Full bleed (21:9)', value: '21/9' },
          { title: 'Landscape (16:9)', value: '16/9' },
          { title: 'Portrait (4:5)', value: '4/5' },
          { title: 'Square (1:1)', value: '1/1' },
        ],
        layout: 'radio',
      },
      validation: (rule) => rule.required(),
    }),
    defineField({ name: 'caption', title: 'Caption', type: 'string' }),
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      options: { hotspot: true },
    }),
  ],
  preview: {
    select: { title: 'label', subtitle: 'aspect', media: 'image' },
  },
});

export const narrativeSectionType = defineType({
  name: 'narrativeSection',
  title: 'Narrative section',
  type: 'object',
  fields: [
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'body',
      title: 'Body',
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
      name: 'media',
      title: 'Media',
      type: 'array',
      of: [defineArrayMember({ type: 'media' })],
    }),
  ],
  preview: { select: { title: 'heading' } },
});

export const creditType = defineType({
  name: 'credit',
  title: 'Credit',
  type: 'object',
  fields: [
    defineField({ name: 'role', type: 'string', validation: (rule) => rule.required() }),
    defineField({ name: 'name', type: 'string', validation: (rule) => rule.required() }),
  ],
  preview: { select: { title: 'name', subtitle: 'role' } },
});

export const socialLinkType = defineType({
  name: 'socialLink',
  title: 'Social link',
  type: 'object',
  fields: [
    defineField({ name: 'label', type: 'string', validation: (rule) => rule.required() }),
    defineField({ name: 'url', type: 'url', validation: (rule) => rule.required() }),
  ],
  preview: { select: { title: 'label', subtitle: 'url' } },
});
