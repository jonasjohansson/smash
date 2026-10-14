// The projects as the next site tells them (/next/work/ and /next/work/<slug>/).
//
// data.md is written in Jonas's own voice ("I built..."), for his portfolio.
// On SMASH's site the work is told by the studio, so each project's words are
// kept here in the studio's voice.
//
// A project's page shows its strongest pictures and films, whether or not the
// home page or the index also uses them.
//   `cover`  the still on the index: a file of the project's, or {src, ar, alt}
//   `hero`   the page's first picture, full bleed: a file of the project's,
//            unless `film` is given (a cut from the showreel: {src, poster, ar, alt})
//   `flow`   the rest of the page, in order, one block a line
//
// One flow for every project. Three kinds of block:
//   'plate a.jpg'        one picture across the 12 columns, at its own proportion
//                        (never taller than the screen allows)
//   'row a.jpg b.jpg'    two pictures side by side at one height: 6+6 when alike
//                        in shape, else 8+4, the wider taking the 8
//   'text: Key[; Key]'   words alone at column 7, each Key a paragraph (from
//                        `texts`, else data.md's block of that label)
// A flow opens on a plate of the work at its biggest (people inside the
// light), straight after the lead, and closes on a plate of the work. No two
// neighbouring blocks are of one kind. Words never stand beside a picture.
//
// `crop` sets a file's proportion where its own frame carries a letterbox;
// `posters` gives a film a poster other than data.md's; `alts` gives words to a
// picture data.md leaves without; `focus` keeps the hero's subject in view
// where the screen crops it, and `at` does the same for a picture in the flow;
// `zoom` draws a picture larger in its frame, past a letterbox of its own;
// `stills` names pictures from elsewhere on the site ({src, ar, alt}), for the
// flow to use like the project's own files.

import { readProjects } from '../../scripts/projects.js';

// Proper names are tied with no-break spaces (\u00A0), so a name never breaks across lines.

const STORY = {
  jagad: {
    cover: '07.jpg',
    hero: '01-corrected.jpg',
    lead: 'For three nights, a building in central Stockholm became a five-storey arcade game, played from joysticks on the pavement across the street.',
    alts: {
      '07.jpg': 'The Kanal 5 logo glows across the facade above a wet street at night.',
      '08.jpg': 'A crowd on the pavement at night watches the game cover the building across the street.',
      '02.jpg': 'Seen straight on, the windows are the game’s blocks, the streets between them lit yellow and pink.',
    },
    at: { '08.jpg': '50% 62%', 'controller-facade-first-frame.jpg': '50% 60%', '10.webm': '40% 50%' },
    texts: {
      'The game': 'To launch Kanal 5’s show *Jagad*, we rebuilt a classic top-down chase game onto the building itself. The windows became the blocks, and the gaps between them became the streets. Players worked arcade controllers we designed and built for the pavement, hunting celebrity avatars as they roamed the facade. Catch one, and the whole road network flooded with your colour. High scores and player names went straight back up onto the wall.',
      'The nights': 'Hundreds queued over the three nights, some of them to chase down their own avatar. For everyone who could not be there, a [web version](https://jagad.jonasjohansson.se/) put the same game on any phone.',
    },
    flow: [
      'plate 08.jpg',
      'text: The game',
      'plate 02.jpg',
      'row 10.webm 11.webm',
      'text: The nights',
      'row joystick-hero.jpg controller-facade-first-frame.jpg',
      'plate 07.jpg',
    ],
  },

  'vi-kommer-i-fred': {
    cover: '01.jpg',
    hero: '02-2x.webm',
    lead: 'In Kungsträdgården, facing the Royal Castle, a screen pulled everyone who walked past into an alien invasion of Stockholm.',
    alts: {
      '03.jpg': 'A visitor crouches and points up beside the screen in Kungsträdgården, the Royal Castle behind.',
      '04.jpg': 'At dusk, a passer-by stops at the screen in front of the Royal Castle, the craft hanging over the same view on it.',
      '05.jpg': 'On the tall screen, the alien craft hangs in dark cloud.',
      '06.jpg': 'On the tall screen, the craft breaks through bright cloud.',
    },
    at: { '03.jpg': '58% 50%', '04.jpg': '62% 50%', '05.jpg': '50% 30%', '06.jpg': '50% 30%', '09-wide.jpg': '70% 50%' },
    texts: {
      'The launch': 'For the launch of TV4’s science fiction drama *Vi kommer i fred*, a single-camera totem showed the show’s opening scene: a huge alien craft breaking through the clouds over the city its audience stood in.',
      'How it works': 'Behind the screen, the whole invasion ran live, mapped onto the camera feed so that anyone who stepped up landed inside the shot. Two versions of the scene, one for day and one for night, swapped on a timer to match the light. It ran around the clock for two weeks.',
    },
    flow: [
      'plate 03.jpg',
      'text: The launch',
      'row 01.jpg 07.webm',
      'text: How it works',
      'plate 09-wide.jpg',
      'row 05.jpg 06.jpg',
      'plate 04.jpg',
    ],
  },

  'dome-conductor': {
    cover: 'dome-orchestra.jpg',
    hero: 'young-conductor.jpg',
    focus: '14% 40%',
    lead: 'An orchestra follows your hands. Raise them, find a rhythm and conduct the music around you.',
    at: { 'dome-experience.jpg': '62% 50%', 'development.jpg': '40% 50%', 'fisheye-camera.jpg': '62% 50%' },
    texts: {
      'The commission': 'We made Dome Conductor with [IVAR Studios](https://ivar.studio/sv/projects/dome-conductor/) for KTH Royal Institute of Technology, and worked on its development and parts of its design. It premiered at Tekniska museet during the Baltic Sea Festival, and brought the Swedish Radio Symphony Orchestra into Wisdome Stockholm.',
      'How it works': 'A camera follows the visitor’s movements. KTH’s machine learning model, trained on recordings of conductors, turns those gestures into tempo: move faster and the orchestra speeds up; pause and it waits. There is no suit to wear and nothing to calibrate.',
      'The experience': 'It plays the opening ninety seconds of Beethoven’s Fifth Symphony, recorded with conductor Daniel Harding. A wide-angle camera filmed the orchestra for the dome’s 180° projection, and playback lets the visitor set the pace. The musicians also recorded their reactions: conduct them well, and they applaud.',
    },
    flow: [
      'plate dome-experience.jpg',
      'text: The commission',
      'plate orchestra-recording.jpg',
      'text: How it works',
      'row development.jpg fisheye-camera.jpg',
      'text: The experience',
      'plate dome-orchestra.jpg',
    ],
  },

  'danny-saucedo': {
    cover: '02.jpg',
    film: {
      src: '/next/assets/film/danny-saucedo.mp4',
      poster: 'src/next/film/danny-saucedo.jpg',
      ar: 16 / 9,
      alt: 'Lines of white light draw the gate and its staircase on the dark stage, then fill it with red as a figure stands in the arch.',
      focus: '40% 50%',
    },
    crop: { '01.jpg': 2.4, '01-poster.jpg': 1 },
    lead: 'A Romanesque gate on the Melodifestivalen stage, painted with light for Danny Saucedo’s *Happy That You Found Me* until it fell back into open sky.',
    alts: {
      '02.jpg': 'Danny Saucedo sings at the gate, its stone painted with climbing vines and violet flowers.',
      '03.jpg': 'Danny Saucedo sings on the Melodifestivalen stage, the projected gate behind him.',
      '01-poster.jpg': 'A performer stands on the dark stage inside rings of light drawn on the floor.',
    },
    at: { '02.jpg': '50% 30%', '03.jpg': '44% 40%' },
    zoom: { '01-poster.jpg': 1.4 },
    texts: {
      'The stage': 'The gate was real, an arch and staircase built for projection, set between LED walls and floor.',
      'The visuals': 'Before it falls, the visuals move through a moonlit evening and a garden like Elysium. We tested them on a physical maquette, and built our own camera tool to hold one precise direction of photography across every scene.',
    },
    flow: [
      'plate 02.jpg',
      'text: The stage',
      'row 03.jpg 01-poster.jpg',
      'text: The visuals',
      'plate 01.jpg',
    ],
  },

  heroes: {
    cover: '02.jpg',
    film: {
      src: '/next/assets/film/heroes.mp4',
      poster: 'src/next/film/heroes.jpg',
      ar: 16 / 9,
      alt: 'In black and white, the projection animates the Great Synagogue’s facade and its rose window as people watch from the street.',
      focus: '46% 30%',
    },
    lead: 'On the facade of Stockholm’s Great Synagogue, Raoul Wallenberg and Dag Hammarskjöld stand again, in light.',
    alts: {
      '02.jpg': 'From high above, through a wide lens: the synagogue’s lit rose window and the street below it, in black and white.',
    },
    at: { '02.jpg': '56% 50%', '01.jpg': '48% 50%' },
    texts: {
      'The tribute': 'Heroes honoured Raoul Wallenberg, who saved thousands of Jews in Budapest during the Holocaust, and Dag Hammarskjöld, Secretary‑General of the UN.',
      'The making': 'We scanned their statues in 3D and the synagogue’s facade by drone, so the animation could sit tight to the ornament of the architecture: black and white, high in contrast.',
    },
    // 03.jpg, a render on white, stays off the page.
    flow: [
      'plate 02.jpg',
      'text: The tribute; The making',
      'plate 01.jpg',
    ],
  },

  resonance: {
    cover: '03.jpg',
    film: {
      src: '/next/assets/film/resonance.mp4',
      poster: 'src/next/film/resonance.jpg',
      ar: 16 / 9,
      alt: 'Colour runs across Uppsala Town Hall as people stand on the four lit pads in the square, seen from the ground and then from above.',
      focus: '48% 50%',
    },
    lead: 'Four lit pads in the square let anyone paint Uppsala Town Hall in colour. Press all four at once, and the building answers.',
    alts: {
      '02.jpg': 'A visitor jumps between the lit pads in the square as colour runs across Uppsala Town Hall.',
      '03.jpg': 'From above, people stand on the four lit pads in the square, each ringed in a different colour.',
      '04.jpg': 'Boots and trainers on the lit pads, one ringed in orange light, one in blue.',
      '05.jpg': 'A visitor in a cap and blue jacket looks up at the town hall, its facade washed in blue light.',
    },
    at: { '02.jpg': '54% 60%', '01.jpg': '50% 60%' },
    texts: {
      'How it works': 'The pads were weatherproof, made to take snow, rain and countless jumps. Each one sent a ripple of colour across the facade, through an ocean scene animated on the building’s surface. Together, they set off a final sequence of light and music.',
      'The making': 'We laser cut a scale model of the town hall to test the projection on, and scanned the facade by drone to draw on its exact shape.',
    },
    flow: [
      'plate 02.jpg',
      'text: How it works',
      'row 03.jpg 05.jpg',
      'text: The making',
      'plate 01.jpg',
    ],
  },

  'sala-hjartslag': {
    cover: { src: 'src/next/film/sala-hjartslag-cover.jpg', ar: 16 / 9, alt: 'The curtain open on a forest stage, drawn in cyan light along the curve of the facade.' },
    film: {
      src: '/next/assets/film/sala-hjartslag.mp4',
      poster: 'src/next/film/sala-hjartslag.jpg',
      ar: 16 / 9,
      alt: 'A pink curtain opens across the curve of the facade onto a forest stage, then carved forms and a face in light.',
      focus: '42% 50%',
    },
    stills: {
      'forest.jpg': { src: 'src/next/film/sala-hjartslag-cover.jpg', ar: 16 / 9, alt: 'The curtain open on a forest stage, drawn in cyan light along the curve of the facade.' },
    },
    lead: 'Four hundred years of a town, in light, on the curve of one facade.',
    at: { '01.jpg': '50% 50%', 'forest.jpg': '40% 50%' },
    texts: {
      'The anniversary': 'For the 400th anniversary of the charter Gustav II Adolf gave Sala, the piece took visitors through four centuries of the town’s history, drawn onto the curve of one facade. Much of the work was done on site, fitting the projection to the architecture.',
    },
    flow: [
      'plate 01.jpg',
      'text: The anniversary',
      'plate forest.jpg',
    ],
  },
};

const base = (src = '') => src.split('/').pop();

// A row's two pictures on whole columns of the 12: 6+6 when alike in shape,
// else 8+4 with the wider picture taking the 8. The wider (the first of
// equals) is the `lead`: its own proportion sets the row's height, and the
// other is cropped to it.
export function columns(items) {
  const [a, b] = items.map((m) => m.ar);
  const spans = items.length !== 2 ? items.map(() => 12) : Math.max(a, b) / Math.min(a, b) < 1.5 ? [6, 6] : a > b ? [8, 4] : [4, 8];
  const lead = spans.indexOf(Math.max(...spans));
  return { items: items.map((m, i) => ({ ...m, span: spans[i], lead: i === lead })) };
}

function figure(b, s = {}) {
  const file = base(b.src);
  return {
    type: b.type,
    file,
    src: b.src, // image: projects/slug/file (the image shortcode); video: /projects/slug/file
    poster: s.posters?.[file] ?? b.poster ?? null,
    alt: s.alts?.[file] ?? b.alt ?? '',
    ar: Number(s.crop?.[file]) || Number(b.ar) || 1.5,
    focus: s.at?.[file] ?? null,
    zoom: Number(s.zoom?.[file]) || null,
  };
}

// For a project without a flow of its own: its pictures and words in
// data.md's order, words alone, wide pictures as plates, two tall pictures as
// a row.
function compose(blocks) {
  const flow = [];
  for (const b of blocks) {
    const prev = flow[flow.length - 1];
    if (b.type === 'text') { if (prev?.kind === 'text') prev.body += `\n\n${b.content}`; else flow.push({ kind: 'text', body: b.content }); }
    else if (b.ar < 1 && prev?.kind === 'plate' && prev.items[0].ar < 1) Object.assign(prev, { kind: 'row', items: [prev.items[0], b] });
    else flow.push({ kind: 'plate', items: [b] });
  }
  return flow;
}

export async function stories() {
  const list = await readProjects('projects');
  const out = {};
  for (const p of list) {
    const s = STORY[p.slug] ?? {};
    const media = p.blocks.filter((b) => b.type === 'image' || b.type === 'video').map((b) => figure(b, s));
    const byFile = Object.fromEntries(media.map((m) => [m.file, m]));
    for (const [name, still] of Object.entries(s.stills ?? {})) {
      byFile[name] = { ...figure({ type: 'image', ...still }, s), file: name, focus: s.at?.[name] ?? null };
    }
    const texts = p.blocks.filter((b) => b.type === 'text');
    const leadBlock = texts.find((b) => !b.label);
    const creditBlock = texts.find((b) => b.label === 'Credits');
    const text = (key) => s.texts?.[key] ?? texts.find((b) => b.label === key)?.content ?? '';

    const hero = s.film
      ? { type: 'video', file: base(s.film.src), ...s.film }
      : byFile[s.hero] ?? media.find((m) => m.ar >= 1.2) ?? media[0] ?? null;
    // The cover: one of the project's files, or a picture from elsewhere (a still of the reel).
    const cover = typeof s.cover === 'object'
      ? { type: 'image', file: base(s.cover.src), ...s.cover }
      : byFile[s.cover] ?? hero;

    let flow;
    if (s.flow) {
      flow = s.flow.map((line) => {
        if (line.startsWith('text:')) {
          return { kind: 'text', body: line.slice(5).split(/\s*;\s*/).map((k) => k.trim()).map(text).filter(Boolean).join('\n\n') };
        }
        const [kind, ...files] = line.trim().split(/\s+/);
        const items = files.map((f) => {
          if (!byFile[f]) console.warn(`[story] ${p.slug}: no file ${f} in data.md`);
          return byFile[f];
        }).filter(Boolean);
        return { kind, items };
      }).filter((r) => r.kind === 'text' ? r.body : r.items.length);
    } else {
      const rest = p.blocks.filter((b) => b !== leadBlock && b !== creditBlock && !(hero && b.src && base(b.src) === hero.file));
      flow = compose(rest.map((b) => (b.type === 'text' ? b : figure(b, s))));
    }

    flow.forEach((r, i) => {
      if (!['plate', 'row', 'text'].includes(r.kind)) console.warn(`[story] ${p.slug}: unknown block '${r.kind}'`);
      if (r.kind === 'row' && r.items.length !== 2) console.warn(`[story] ${p.slug}: a row holds two pictures, not ${r.items.length}`);
      if (r.kind === 'row') Object.assign(r, columns(r.items));
      if (i && flow[i - 1].kind === r.kind) console.warn(`[story] ${p.slug}: two '${r.kind}' blocks side by side`);
    });
    // Every page opens and closes on a plate of the work.
    if (flow.length && (flow[0].kind !== 'plate' || flow[flow.length - 1].kind !== 'plate')) console.warn(`[story] ${p.slug}: the flow should open and close on a plate`);

    out[p.slug] = {
      slug: p.slug,
      title: p.title,
      lead: s.lead ?? leadBlock?.content ?? '',
      hero: hero ? { ...hero, focus: s.film?.focus ?? s.focus ?? null } : null,
      // The picture that stands for the project on the index: a still.
      cover: cover ? { ...cover, still: cover.type === 'video' ? cover.poster : cover.src } : null,
      flow,
    };
  }
  return out;
}
