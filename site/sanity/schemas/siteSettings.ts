import { defineArrayMember, defineField, defineType } from 'sanity';

/** Singleton. The few strings that appear on every page. */
export const siteSettingsType = defineType({
  name: 'siteSettings',
  title: 'Site settings',
  type: 'document',
  fields: [
    defineField({
      name: 'missionStatement',
      title: 'Mission statement',
      type: 'text',
      rows: 3,
      description: 'The large-type statement under the home hero. One sentence if possible.',
      validation: (rule) => rule.required().max(320),
    }),
    defineField({
      name: 'aboutTeaser',
      title: 'About teaser',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [{ title: 'Normal', value: 'normal' }],
          lists: [],
        }),
      ],
      description: 'Two short paragraphs on the home page, linking through to /studio.',
    }),
    defineField({
      name: 'ctaText',
      title: 'CTA text',
      type: 'string',
      description: 'The closing invitation, used on the home page and in the footer.',
      validation: (rule) => rule.required(),
    }),
    defineField({ name: 'contactEmail', title: 'Contact email', type: 'string' }),
    defineField({ name: 'contactPhone', title: 'Contact phone', type: 'string' }),
    defineField({
      name: 'addressLines',
      title: 'Address lines',
      type: 'array',
      of: [defineArrayMember({ type: 'string' })],
    }),
    defineField({
      name: 'social',
      title: 'Social links',
      type: 'array',
      of: [defineArrayMember({ type: 'socialLink' })],
    }),
  ],
  preview: { prepare: () => ({ title: 'Site settings' }) },
});
