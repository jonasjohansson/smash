// The projects as the next site tells them (/next/work/ and /next/work/<slug>/).
//
// data.md is written in Jonas's own voice ("I built..."), for his portfolio.
// On SMASH's site the work is told by the studio, so each project's words are
// kept here in the studio's voice, alongside the facts the data does not hold
// yet (client, medium, credits by name) and a caption for every picture: a
// sentence of its own, beside the picture's alt text, never a copy of it.
//
// A page is a `flow`: the order its words and pictures come in, one line each.
//   'text: Label'            a labelled text block (from STORY texts, else data.md)
//   'room a.jpg'             full bleed, at most the screen's height
//   'plate a.jpg'            inside the margins, at its own proportions
//   'right a.jpg'            columns 4-11 / 'left a.jpg' columns 1-8
//   'portrait a.jpg'         a lone tall picture, columns 4-8
//   'row a.jpg b.jpg ...'    one project's pictures a gutter apart, one height
//   'row:paper a.jpg ...'    any of these on a lit paper band, full bleed (a white render)
// `hero` opens the page and is its Fig. 1; `cover`, if given, stands for the
// project on the index instead. `crop` sets a file's proportion where its own
// frame carries a letterbox. `focus` keeps the hero's subject in view where
// a narrow screen crops it. `run` is how long it ran, only where the text says so.
// Without a flow, one is made by the rules in `compose` (spec 9.5).
// Nothing here is random.

import { readProjects } from '../../scripts/projects.js';
import { readCategories } from '../../scripts/categories.js';

const STORY = {
  jagad: {
    hero: '09.webm',
    cover: '01-corrected.jpg',
    lead: 'For three nights, a building in central Stockholm became a five-storey arcade game, played from joysticks on the pavement across the street.',
    place: 'Central Stockholm',
    client: 'Kanal 5',
    medium: 'Projection mapping, interactive game',
    run: 'Three nights',
    texts: {
      'The game': 'To launch Kanal 5’s show *Jagad*, we rebuilt a classic top-down chase game onto the building itself. The windows became the blocks, and the gaps between them became the streets. Players worked arcade controllers we designed and built for the pavement, hunting celebrity avatars as they roamed the facade. Catch one, and the whole road network flooded with your colour. High scores and player names went straight back up onto the wall.',
      'The nights': 'Hundreds queued over the three nights, some of them to chase down their own avatar. For everyone who could not be there, a [web version](https://jagad.jonasjohansson.se/) put the same game on any phone.',
    },
    flow: [
      'room joystick-hero.jpg',
      'text: The game',
      'plate 01-corrected.jpg',
      'row 04.jpg controller-facade-first-frame.jpg',
      'right 02.jpg',
      'text: The nights',
      'room 08.jpg',
      'row 10.webm 11.webm',
      'left 07.jpg',
    ],
    credits: [
      ['Client', 'Kanal 5'],
      ['Made by', 'SMASH, with [Platon Marko](https://platon.design/)'],
      ['Game, real-time visuals, controllers and web version', 'Jonas Johansson'],
    ],
    caps: {
      '01-corrected.jpg': 'The facade as the board: every window a block, every gap a street, the score across the top floor.',
      'joystick-hero.jpg': 'One of the arcade controllers we designed and built for the pavement.',
      '09.webm': 'Each round opened with the title and a countdown, window by window.',
      '04.jpg': 'A controller table: two sticks, a screen, plywood that could stand a winter street.',
      'controller-facade-first-frame.jpg': 'The controllers face the building, so players see the whole board while they play.',
      '02.jpg': 'Catch a celebrity and the streets flood with your colour.',
      '08.jpg': 'Players and passers-by at the crossing as a round begins.',
      '10.webm': 'Inside the game: one of the celebrities on the run.',
      '11.webm': 'The city of the game, seen from above.',
      '07.jpg': 'Between rounds, the Kanal 5 mark held the facade over the wet street.',
    },
  },

  'vi-kommer-i-fred': {
    hero: '03.jpg',
    lead: 'In Kungsträdgården, facing the Royal Castle, a screen pulled everyone who walked past into an alien invasion of Stockholm.',
    place: 'Kungsträdgården, Stockholm',
    client: 'TV4',
    medium: 'Mixed reality, live camera',
    run: 'Two weeks, day and night',
    texts: {
      'The launch': 'For the launch of TV4’s science fiction drama *Vi kommer i fred*, we stood a single-camera totem in Kungsträdgården, facing the Royal Castle across the water. Whoever walked by was dropped straight into the show’s opening scene: a huge alien craft breaking through the clouds over the city they were standing in.',
      'How it works': 'Behind the screen, the whole invasion ran live in Resolume, mapped onto the camera feed so that anyone who stepped up landed inside the shot. Two versions of the scene, one for day and one for night, swapped on a timer to match the light. It ran around the clock for two weeks.',
    },
    flow: [
      'room 02-2x.webm',
      'text: The launch',
      'plate 01.jpg',
      'right 04.jpg',
      'text: How it works',
      'row 05.jpg 06.jpg 07.webm',
      'left 09-wide.jpg',
    ],
    credits: [
      ['Client', 'TV4'],
      ['Made by', 'SMASH'],
      ['Real-time integration and installation', 'Jonas Johansson'],
    ],
    caps: {
      '03.jpg': 'A visitor films her child on the screen, arms up under the craft, the Royal Castle behind them both.',
      '02-2x.webm': 'The scene everyone stepped into: the craft breaking through the clouds over Stockholm.',
      '01.jpg': 'The totem in Kungsträdgården. The castle across the water is in the shot as well as behind it.',
      '04.jpg': 'At dusk, people stop to find themselves in the invasion.',
      '05.jpg': 'The night version of the scene.',
      '06.jpg': 'The day version, swapped in on a timer as the light changed.',
      '07.webm': 'The live street view beneath the craft, as it played on the screen.',
      '09-wide.jpg': 'The scene running live in Resolume on site, by the water at night.',
    },
  },

  'dome-conductor': {
    hero: 'young-conductor.jpg',
    focus: '14% 40%',
    lead: 'An orchestra follows your hands. Raise them, find a rhythm and conduct the music around you.',
    place: 'Wisdome Stockholm, Tekniska museet',
    client: 'KTH Royal Institute of Technology',
    medium: 'Interactive installation, dome film',
    texts: {
      'The commission': 'We made Dome Conductor with [IVAR Studios](https://ivar.studio/sv/projects/dome-conductor/) for KTH Royal Institute of Technology, and worked on its development and parts of its design. It premiered at [Tekniska museet](https://www.tekniskamuseet.se/pa-gang/tekniska-pa-ostersjofestivalen/) during the 2025 Baltic Sea Festival, and brought the Swedish Radio Symphony Orchestra into Wisdome Stockholm.',
      'How it works': 'A camera follows the visitor’s movements. KTH’s machine learning model, trained on recordings of conductors, turns those gestures into tempo: move faster and the orchestra speeds up; pause and it waits. There is no suit to wear and nothing to calibrate. KTH researchers Hedvig Kjellström and Mert Mermerci worked on the project, supported by WASP and SeRC.',
      'The experience': 'It plays the opening ninety seconds of Beethoven’s Fifth Symphony, recorded with conductor Daniel Harding. A wide-angle camera filmed the orchestra for the dome’s 180° projection, and playback lets the visitor set the pace. The musicians also recorded their reactions: conduct them well, and they applaud.',
    },
    flow: [
      'room dome-experience.jpg',
      'text: The commission',
      'plate dome-orchestra.jpg',
      'text: How it works',
      'right development.jpg',
      'text: The experience',
      'row orchestra-recording.jpg fisheye-camera.jpg',
    ],
    credits: [
      ['Client', 'KTH Royal Institute of Technology'],
      ['Made with', '[IVAR Studios](https://ivar.studio/sv/projects/dome-conductor/)'],
      ['Producer', 'Fredrik Edström'],
      ['Cinematographer', 'Oliver Akermo'],
      ['Development', 'Emile Pascoe, Jonas Johansson, SMASH'],
      ['Research', 'Hedvig Kjellström, Mert Mermerci, KTH'],
      ['Music', 'Swedish Radio Symphony Orchestra, conducted by Daniel Harding'],
      ['Photographs', 'IVAR Studios'],
    ],
    caps: {
      'young-conductor.jpg': 'A child conducts the Swedish Radio Symphony Orchestra. The ring-lit camera reads each gesture as tempo.',
      'dome-experience.jpg': 'The orchestra fills the dome while the audience watches one visitor lead it.',
      'dome-orchestra.jpg': 'The title on the dome before the next conductor steps up.',
      'development.jpg': 'Tuning the projection and the tracking at the dome’s control desk.',
      'orchestra-recording.jpg': 'The recording session with the Swedish Radio Symphony Orchestra.',
      'fisheye-camera.jpg': 'The wide-angle lens that filmed the orchestra for the dome’s 180° projection.',
    },
  },

  'danny-saucedo': {
    hero: '03.jpg',
    crop: { '01.jpg': 2.4, '01-poster.jpg': 1 },
    lead: 'Stage design and projection mapping for Danny Saucedo’s *Happy That You Found Me* at Melodifestivalen 2024.',
    place: 'Melodifestivalen, SVT',
    client: 'Danny Saucedo',
    medium: 'Stage design, projection mapping',
    texts: {
      'The stage': 'Bringing something new to the [Melodifestivalen](https://en.wikipedia.org/wiki/Melodifestivalen) stage had long been a dream. The stage had three LED walls of 8 × 4.5 metres, an LED floor of 7.9 × 9.1 metres, and a physical Romanesque gate with a staircase, built to be projection mapped.',
      'The visuals': 'The visuals move through a moonlit Romanesque evening and a garden like Elysium, and build to a climax where the gate falls back into open sky.',
      'The making': 'We tested the visuals on a physical maquette, and wrote a custom camera tool in [Unity](https://unity.com/) to hold one precise direction of photography across every scene.',
    },
    flow: [
      'plate 01.jpg',
      'text: The stage',
      'right 02.jpg',
      'text: The visuals',
      'text: The making',
      'portrait 01-poster.jpg',
    ],
    credits: [
      ['Artist', 'Danny Saucedo'],
      ['Stage design, 3D modelling and animation', 'SMASH'],
      ['Technical direction', 'Jonas Johansson'],
      ['Maquette', '[Rose Hallgren](https://rosehallgren.se/)'],
    ],
    caps: {
      '01.jpg': 'The opening: a lone figure in the gate, the stage still dark around him.',
      '03.jpg': 'The climax, the arches of the LED walls in full colour around the gate.',
      '02.jpg': 'The garden: ivy and flowers grown over the Romanesque arch.',
      '01-poster.jpg': 'From the making: the LED floor lit beneath the performer.',
    },
  },

  heroes: {
    hero: '01.jpg',
    lead: 'Statues of Raoul Wallenberg and Dag Hammarskjöld, scanned in 3D and set into the drone-scanned facade of Stockholm’s Great Synagogue.',
    place: 'Great Synagogue, Stockholm',
    client: 'World Jewish Congress, Raoul Wallenberg Academy',
    medium: 'Projection mapping',
    texts: {
      'The tribute': 'Heroes was projection mapped onto the facade of [Stockholm’s Great Synagogue](https://en.wikipedia.org/wiki/Great_Synagogue_(Stockholm)) in 2022. It honoured [Raoul Wallenberg](https://en.wikipedia.org/wiki/Raoul_Wallenberg), who saved thousands of Jews in Budapest during the Holocaust, and [Dag Hammarskjöld](https://en.wikipedia.org/wiki/Dag_Hammarskj%C3%B6ld), Secretary-General of the UN and the 1961 Nobel Peace Prize laureate.',
      'The making': 'Real statues of both men were scanned in 3D, and the synagogue was captured by drone, which gave us the building’s exact geometry to draw on. The piece is black and white and high in contrast, its animation set tight to the ornament of the architecture.',
    },
    flow: [
      'room 02.jpg',
      'text: The tribute',
      'text: The making',
      'row:paper 03.jpg 01.mp4',
    ],
    credits: [
      ['Commissioned by', '[World Jewish Congress](https://www.worldjewishcongress.org/), [Raoul Wallenberg Academy](https://rwacademy.se/) and [Nobel Week Lights](https://nobelweeklights.se/)'],
      ['Made by', 'SMASH, with Jonas Johansson'],
      ['Music', '[Joseph Wilkinson](https://www.josephwilkinson.com)'],
    ],
    caps: {
      '01.jpg': 'Wallenberg and Hammarskjöld stand in a frame of light on the synagogue, watched from the street.',
      '02.jpg': 'From a roof across the street: the lit facade among the dark windows of Östermalm.',
      '03.jpg': 'The design: both scanned statues set into the synagogue’s own architecture.',
      '01.mp4': 'From the scans of statues and building to the projection on the night.',
    },
  },

  resonance: {
    hero: '02.jpg',
    lead: 'Four lit pads in the square let anyone paint Uppsala Town Hall in colour. Press all four at once, and the building answers.',
    place: 'Uppsala Town Hall',
    client: 'Allt ljus på Uppsala',
    medium: 'Interactive projection mapping',
    texts: {
      'How it works': 'Four weatherproof touch pads with light built in sat in the main square, made to take snow, rain and countless jumps. We built them with [Arduino](https://www.arduino.cc/), feeding an [Unreal Engine](https://www.unrealengine.com/) project over USB. Each pad sent a ripple of colour across the facade, through an ocean scene animated on the building’s surface. When all four were pressed at once, a final sequence of light and music played out.',
      'The making': 'We laser cut a scale model of the town hall to test the projection on, and scanned the facade by drone to build its digital twin.',
    },
    flow: [
      'room 01.jpg',
      'text: How it works',
      'row 03.jpg 04.jpg 05.jpg',
      'text: The making',
    ],
    credits: [
      ['For', '[Allt ljus på Uppsala](https://alltljuspauppsala.se/)'],
      ['Made by', 'SMASH, with [Rose Hallgren](https://rosehallgren.se/)'],
      ['Touch pads and real-time', 'Jonas Johansson'],
    ],
    caps: {
      '02.jpg': 'One visitor crosses the pads, and the town hall answers in colour.',
      '01.jpg': 'Four people on four pads. Pressed together, they start the final sequence of light and music.',
      '03.jpg': 'The pads from above, each lit in its own colour.',
      '04.jpg': 'Built to take snow, rain and countless jumps.',
      '05.jpg': 'Watching the colour move across the facade.',
    },
  },

  'sala-hjartslag': {
    hero: '01.jpg',
    lead: 'Four hundred years of a town’s history, drawn onto the curve of one facade for Sala’s anniversary.',
    place: 'Sala',
    client: 'City of Sala',
    medium: 'Projection mapping',
    texts: {
      'The anniversary': 'In 2024, Sala celebrated four hundred years since [Gustav II Adolf](https://en.wikipedia.org/wiki/Gustavus_Adolphus_of_Sweden) gave it its town charter. For the anniversary, the piece took its audience on a journey through those four centuries, mapped onto a curved building facade. Much of the work was done on site, fitting the projection to the architecture.',
    },
    flow: [
      'text: The anniversary',
      'portrait 01-poster.jpg',
    ],
    credits: [
      ['Client', 'City of Sala'],
      ['3D modelling and animation', 'SMASH'],
      ['Technical lead and projection mapping', 'Jonas Johansson'],
    ],
    caps: {
      '01.jpg': 'Two rooms of light opened in the curved facade, framed by projected curtains.',
      '01-poster.jpg': 'A later scene: the curtains drawn across the corner of the building.',
    },
  },
};

const MEDIUM = {
  mapping: 'Projection mapping', av: 'Audiovisual', 'mixed reality': 'Mixed reality',
  stage: 'Stage design', interactive: 'Interactive', game: 'Game',
};

const base = (src = '') => src.split('/').pop();

function figure(b, caps, crop = {}) {
  const file = base(b.src);
  return {
    type: b.type,
    file,
    src: b.src, // image: projects/slug/file (the image shortcode); video: /projects/slug/file
    poster: b.poster ?? null,
    alt: b.alt ?? '',
    cap: caps[file] ?? b.alt ?? '',
    ar: Number(crop[file]) || Number(b.ar) || 1.5,
    crop: Boolean(crop[file]),
    full: Boolean(b.full),
  };
}

// The rules of spec 9.5, for a project without a flow of its own: the first
// picture after the lead is a ROOM, and so is anything at 2:1 or wider; tall
// pictures in a row of up to three; a lone landscape a PLATE, the next ones
// alternating RIGHT and LEFT; a lone tall picture a PORTRAIT.
function compose(blocks) {
  const flow = [];
  let run = [];
  let first = true;
  let side = 0;
  const flush = () => {
    let i = 0;
    while (i < run.length) {
      const m = run[i];
      if (first || m.ar >= 2 || m.full) { flow.push({ kind: 'room', items: [m] }); first = false; i++; continue; }
      const group = [m];
      let sum = m.ar;
      while (i + group.length < run.length && sum + run[i + group.length].ar <= 4 && group.length < 3 && run[i + group.length].ar < 2) {
        sum += run[i + group.length].ar; group.push(run[i + group.length]);
      }
      if (group.length > 1) flow.push({ kind: 'row', items: group });
      else if (m.ar < 1) flow.push({ kind: 'portrait', items: [m] });
      else flow.push({ kind: ['plate', 'right', 'left'][side++ % 3], items: [m] });
      i += group.length;
    }
    run = [];
  };
  for (const b of blocks) {
    if (b.type === 'text') { flush(); flow.push({ kind: 'text', label: b.label, body: b.content }); }
    else run.push(b);
  }
  flush();
  return flow;
}

export async function stories() {
  const list = await readProjects('projects');
  const cats = Object.fromEntries(readCategories('categories').map((c) => [c.slug, c.name]));
  const out = {};
  list.forEach((p, i) => {
    const s = STORY[p.slug] ?? {};
    const caps = s.caps ?? {};
    const media = p.blocks.filter((b) => b.type === 'image' || b.type === 'video').map((b) => figure(b, caps, s.crop));
    const byFile = Object.fromEntries(media.map((m) => [m.file, m]));
    const texts = p.blocks.filter((b) => b.type === 'text');
    const leadBlock = texts.find((b) => !b.label);
    const creditBlock = texts.find((b) => b.label === 'Credits');
    const hero = byFile[s.hero] ?? media.find((m) => m.ar >= 1.2) ?? media[0] ?? null;
    const cover = byFile[s.cover] ?? hero;

    let flow;
    if (s.flow) {
      flow = s.flow.map((line) => {
        const t = line.match(/^text:\s*(.+)$/);
        if (t) {
          const label = t[1];
          return { kind: 'text', label, body: s.texts?.[label] ?? texts.find((b) => b.label === label)?.content ?? '' };
        }
        const [head, ...files] = line.trim().split(/\s+/);
        const [kind, mod] = head.split(':');
        return { kind, paper: mod === 'paper', items: files.map((f) => byFile[f]).filter(Boolean) };
      }).filter((r) => r.kind === 'text' ? r.body : r.items.length);
    } else {
      const rest = p.blocks.filter((b) => b !== leadBlock && b !== creditBlock && !(hero && b.src && base(b.src) === hero.file));
      flow = compose(rest.map((b) => (b.type === 'text' ? b : figure(b, caps, s.crop))));
    }

    // Figures are numbered through the page: the hero is Fig. 1.
    let n = hero ? 1 : 0;
    let firstMedia = true;
    for (const r of flow) {
      if (r.items) {
        // The slot reveal is used once a page: the first pictures after the lead.
        r.reveal = firstMedia;
        firstMedia = false;
        const sum = r.items.reduce((a, m) => a + m.ar, 0);
        r.items = r.items.map((m) => ({ ...m, fig: ++n, share: m.ar / sum }));
        r.sum = sum;
        // On a phone a pair with a landscape in it stacks (too small side by side); tall pairs stay joined.
        r.wide = r.items.every((m) => m.ar >= 1) || (r.items.length <= 2 && r.items.some((m) => m.ar >= 1));
      }
    }

    out[p.slug] = {
      slug: p.slug,
      title: p.title,
      year: p.year,
      color: p.color ?? '#5d6268',
      place: s.place ?? p.caption,
      url: `/next/work/${p.slug}/`,
      number: String(i + 1).padStart(2, '0'),
      lead: s.lead ?? leadBlock?.content ?? '',
      hero: hero ? { ...hero, fig: 1, focus: s.focus ?? null } : null,
      // The picture that stands for the project on the index: a still.
      cover: cover ? { ...cover, still: cover.type === 'video' ? cover.poster : cover.src } : null,
      flow,
      facts: [
        ['Client', s.client],
        ['Place', s.place ?? p.caption],
        ['Medium', s.medium ?? (p.tags ?? []).map((t) => MEDIUM[t]).filter(Boolean).join(', ')],
        ['Year', String(p.year)],
        ['Run', s.run],
      ].filter(([, v]) => v),
      credits: s.credits ?? (creditBlock ? [['', creditBlock.content]] : []),
      offering: cats[p.category] ?? null,
      category: p.category,
      next: list[(i + 1) % list.length].slug,
    };
  });
  return out;
}
