/**
 * Local seed content.
 *
 * This is what the site serves until a real Sanity project is connected (see
 * README → "Connecting the real Sanity project"). Every export here matches the
 * shape of the corresponding GROQ projection in `sanity/queries.ts`, so nothing
 * downstream has to know which source it got.
 *
 * `scripts/seed-sanity.ts` pushes this same content into Sanity once credentials
 * exist, so the first thing an editor sees is not an empty dataset.
 *
 * Copy status: written in SMASH's voice as *structural* placeholder. One project
 * is real (Reitan Artbox); the other three are explicitly labelled placeholders
 * so nobody mistakes a wireframe for a claim.
 */

import { media, pt } from './portable';
import type {
  CaseStudy,
  LabExperiment,
  Segment,
  SegmentSummary,
  SiteSettings,
} from '@/sanity/types';

/* ------------------------------------------------------------------ *
 * Segments — the four things SMASH makes.
 * ------------------------------------------------------------------ */

export const seedSegments: Segment[] = [
  {
    _id: 'segment.interactive-installations',
    title: 'Interactive Installations',
    slug: 'interactive-installations',
    intro: 'Work that only completes itself when someone walks up to it.',
    description: pt(
      'An installation earns its place when people choose to stay with it. We build pieces that read presence, movement and touch, and answer in a way that feels immediate rather than clever — the response has to arrive before the thought does.',
      'The craft is in the restraint. One clear invitation, understood without a sign, that rewards a second look and a third. We prototype with real people early, because a gesture that works on paper often does not survive a crowd.',
      'We handle the full path: concept, sensing, software, fabrication, install and the quiet part nobody sees — making it run unattended for months.',
    ),
  },
  {
    _id: 'segment.projection-mapping',
    title: 'Projection Mapping',
    slug: 'projection-mapping',
    intro: 'Light that takes a building at its word and then argues with it.',
    description: pt(
      'Mapping is a conversation with architecture. The surface already has a character — proportion, texture, history — and the projection either listens to that or fights it. We start by reading the building.',
      'From there it is measurement and rehearsal: survey, warp, blend, calibrate, and enough on-site nights to know how the piece behaves in rain, in wind, and with two thousand people standing in front of it.',
      'We work at the scale of a facade and at the scale of a single object, and we treat the audio and the audience position as part of the composition rather than as an afterthought.',
    ),
  },
  {
    _id: 'segment.immersive-environments',
    title: 'Immersive Environments',
    slug: 'immersive-environments',
    intro: 'Rooms that change how you behave inside them.',
    description: pt(
      'An immersive environment is a place, not a screen. Light, sound, scale and pacing do most of the work; the technology stays out of the way. What people remember is the atmosphere and the moment it shifted.',
      'We design the journey first — where you enter, where you slow down, where you are alone with it, where you turn to someone else and say something. Then we build the systems that hold that journey steady for every visitor.',
      'This is where the studio spends most of its time: long-form spatial work for cultural venues, brands and public space.',
    ),
  },
  {
    _id: 'segment.digital-experiences',
    title: 'Digital Experiences',
    slug: 'digital-experiences',
    intro: 'The part of the work that travels beyond the room.',
    description: pt(
      'Not every experience is physical, and the physical ones rarely end at the door. We build the screens, sites and tools that extend a project — before people arrive, while they are there, and after they leave with something in their pocket.',
      'Same standard as the rest of the studio: fast, accessible, and built to be maintained. We prefer a small number of things that work everywhere over a long feature list that works on one device.',
    ),
  },
];

const segmentSummary = (slug: string): SegmentSummary => {
  const s = seedSegments.find((x) => x.slug === slug);
  if (!s) throw new Error(`seed: unknown segment "${slug}"`);
  return { _id: s._id, title: s.title, slug: s.slug, intro: s.intro };
};

/* ------------------------------------------------------------------ *
 * Case studies — one real, three explicit placeholders.
 * ------------------------------------------------------------------ */

export const seedCaseStudies: CaseStudy[] = [
  {
    _id: 'case.reitan-artbox',
    title: 'Reitan Artbox',
    slug: 'reitan-artbox',
    client: 'Reitan',
    year: 2026,
    featured: true,
    order: 1,
    segments: [segmentSummary('immersive-environments'), segmentSummary('interactive-installations')],
    heroMedia: media('Hero still — Reitan Artbox, main room', '21/9'),
    idea: {
      heading: 'The idea',
      body: pt(
        'Reitan wanted a gathering to feel like an event rather than a schedule. Our starting point was simple: give the room one thing worth walking towards, and let everything else arrange itself around it.',
        'The Artbox is that thing — a built volume that behaves like a stage, a screen and a meeting point depending on where you stand.',
      ),
      media: [media('Concept sketch — Artbox volume in plan', '4/5')],
    },
    context: {
      heading: 'The context',
      body: pt(
        'A single-day show in a large venue, with a fixed rundown and a room that had to work for a keynote, a break and an after-party without being reset in between.',
        'That constraint shaped the design more than any reference did. Every element had to earn its place three times over.',
      ),
      media: [media('Venue plan — sightlines and circulation', '16/9')],
    },
    experience: {
      heading: 'The audience experience',
      body: pt(
        'People arrive into low light and a slow-moving field of colour. The Artbox reads as an object first — you notice the edges before you notice the content.',
        'As the room fills, the piece picks up on density and movement and lifts with it. By the time the programme starts, the audience has already had a moment with the work, which changes how they sit down.',
      ),
      media: [
        media('Audience wide shot — arrival', '16/9'),
        media('Detail — surface at close range', '1/1'),
      ],
    },
    transformation: {
      heading: 'What changed',
      body: pt(
        'The venue stopped being a hall with a stage in it. For one day it had a centre, and people navigated by it.',
        'The measurable version: guests stayed in the room between programme blocks instead of drifting to the foyer. The version that matters more: they talked about the space on the way out.',
      ),
      media: [media('Wide shot — full room during the show', '21/9')],
    },
    gallery: [
      media('Gallery 01 — build', '4/5'),
      media('Gallery 02 — programming on site', '4/5'),
      media('Gallery 03 — show', '4/5'),
    ],
    credits: [
      { _key: 'c1', role: 'Client', name: 'Reitan' },
      { _key: 'c2', role: 'Concept & direction', name: 'SMASH' },
      { _key: 'c3', role: 'Technical direction', name: 'SMASH' },
      { _key: 'c4', role: 'Production', name: 'Credit placeholder' },
    ],
  },
  {
    _id: 'case.placeholder-museum-atrium',
    title: 'Placeholder: Museum Atrium Installation',
    slug: 'placeholder-museum-atrium-installation',
    client: 'Placeholder Client',
    year: 2025,
    featured: true,
    order: 2,
    segments: [segmentSummary('interactive-installations'), segmentSummary('digital-experiences')],
    heroMedia: media('Hero still — atrium, wide', '21/9'),
    idea: {
      heading: 'The idea',
      body: pt(
        'Placeholder project. A permanent piece for a museum atrium — the room everyone crosses and nobody stops in — designed to give that crossing a reason to slow down.',
      ),
      media: [media('Concept image — atrium intervention', '4/5')],
    },
    context: {
      heading: 'The context',
      body: pt(
        'Placeholder copy. A busy circulation space with daylight, hard acoustics and visitors who are on their way somewhere else.',
      ),
      media: [media('Site photo — existing atrium', '16/9')],
    },
    experience: {
      heading: 'The audience experience',
      body: pt(
        'Placeholder copy. Visitors notice a shift in the room before they notice the work, then find that the shift is following them.',
      ),
      media: [media('Audience shot — visitors mid-space', '16/9')],
    },
    transformation: {
      heading: 'What changed',
      body: pt('Placeholder copy. A corridor became a room people arrange to meet in.'),
      media: [media('After — atrium in use', '21/9')],
    },
    gallery: [media('Gallery 01', '4/5'), media('Gallery 02', '4/5')],
    credits: [
      { _key: 'c1', role: 'Client', name: 'Placeholder Client' },
      { _key: 'c2', role: 'Concept & direction', name: 'SMASH' },
    ],
  },
  {
    _id: 'case.placeholder-festival-facade',
    title: 'Placeholder: Festival Facade Mapping',
    slug: 'placeholder-festival-facade-mapping',
    client: 'Placeholder Festival',
    year: 2025,
    featured: false,
    order: 3,
    segments: [segmentSummary('projection-mapping')],
    heroMedia: media('Hero still — facade at night', '21/9'),
    idea: {
      heading: 'The idea',
      body: pt(
        'Placeholder project. A twelve-minute piece for a listed facade, built around the building rather than projected onto it.',
      ),
      media: [media('Concept frame — facade study', '16/9')],
    },
    context: {
      heading: 'The context',
      body: pt('Placeholder copy. Four nights outdoors, a protected surface, and a public square.'),
      media: [media('Survey — facade geometry', '4/5')],
    },
    experience: {
      heading: 'The audience experience',
      body: pt(
        'Placeholder copy. The building appears to remember things about itself; the crowd stays for the loop twice.',
      ),
      media: [media('Audience shot — square at capacity', '16/9')],
    },
    transformation: {
      heading: 'What changed',
      body: pt('Placeholder copy. A square people walked through became a place people arrived at.'),
      media: [media('Wide — square and facade', '21/9')],
    },
    gallery: [media('Gallery 01', '4/5'), media('Gallery 02', '4/5')],
    credits: [
      { _key: 'c1', role: 'Client', name: 'Placeholder Festival' },
      { _key: 'c2', role: 'Direction', name: 'SMASH' },
    ],
  },
  {
    _id: 'case.placeholder-flagship-layer',
    title: 'Placeholder: Flagship Store Digital Layer',
    slug: 'placeholder-flagship-store-digital-layer',
    client: 'Placeholder Brand',
    year: 2024,
    featured: false,
    order: 4,
    segments: [segmentSummary('digital-experiences'), segmentSummary('immersive-environments')],
    heroMedia: media('Hero still — store interior', '21/9'),
    idea: {
      heading: 'The idea',
      body: pt(
        'Placeholder project. A digital layer for a flagship store that behaves like part of the architecture instead of like advertising.',
      ),
      media: [media('Concept image — in-store layer', '4/5')],
    },
    context: {
      heading: 'The context',
      body: pt('Placeholder copy. Retail hours, retail staff, and a fit-out already underway.'),
      media: [media('Plan — fixture integration', '16/9')],
    },
    experience: {
      heading: 'The audience experience',
      body: pt('Placeholder copy. Nothing asks for attention; everything responds when it is given.'),
      media: [media('Detail — customer interaction', '1/1')],
    },
    transformation: {
      heading: 'What changed',
      body: pt('Placeholder copy. Dwell time up, and staff using the piece to start conversations.'),
      media: [media('Wide — store floor', '21/9')],
    },
    gallery: [media('Gallery 01', '4/5')],
    credits: [
      { _key: 'c1', role: 'Client', name: 'Placeholder Brand' },
      { _key: 'c2', role: 'Direction', name: 'SMASH' },
    ],
  },
];

/* ------------------------------------------------------------------ *
 * Lab
 * ------------------------------------------------------------------ */

export const seedLabExperiments: LabExperiment[] = [
  {
    _id: 'lab.pressure-field',
    title: 'Pressure Field',
    slug: 'pressure-field',
    description:
      'A cursor that displaces the page the way a hand displaces water. Testing how much feedback a flat surface can carry before it stops feeling calm.',
    status: 'sketch',
  },
  {
    _id: 'lab.room-tone',
    title: 'Room Tone',
    slug: 'room-tone',
    description:
      'Microphone in, light out. A browser toy that turns the sound of wherever you are into a slow-moving field — the smallest possible version of what we build at building scale.',
    status: 'sketch',
  },
  {
    _id: 'lab.line-weight',
    title: 'Line Weight',
    slug: 'line-weight',
    description:
      'A drawing tool with no undo. Built to answer an internal argument about whether constraint makes people more expressive or less.',
    status: 'archived',
  },
];

/* ------------------------------------------------------------------ *
 * Site settings
 * ------------------------------------------------------------------ */

export const seedSiteSettings: SiteSettings = {
  missionStatement:
    'We turn spaces into experiences people remember — built with artists, engineers and a working knowledge of what survives contact with an audience.',
  aboutTeaser: pt(
    'SMASH is a creative studio working where art, design, technology and space meet. We make interactive installations, projection mapping, immersive environments and the digital work that carries them further.',
    'We take projects from the first idea to the last night of the run. That means we design for the room and for the crew who has to operate it at seven in the morning.',
  ),
  ctaText: 'Tell us about the space.',
  contactEmail: 'hello@smash.studio',
  contactPhone: '+00 000 00 000',
  addressLines: ['Street address placeholder', 'Postcode and city placeholder', 'Country placeholder'],
  social: [
    { _key: 's1', label: 'Instagram', url: 'https://instagram.com' },
    { _key: 's2', label: 'LinkedIn', url: 'https://linkedin.com' },
    { _key: 's3', label: 'Vimeo', url: 'https://vimeo.com' },
  ],
};
