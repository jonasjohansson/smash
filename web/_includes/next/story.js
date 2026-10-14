// The projects as the next site tells them (/next/work/ and /next/work/<slug>/).
//
// data.md is written in Jonas's own voice ("I built..."), for his portfolio.
// On SMASH's site the work is told by the studio, so each project's words are
// kept here in the studio's voice.
//
// One role per frame: a file stands for its project in one place only. The
// home page has its own (next.11tydata.js, HOME); here are the rest.
//   `cover`  the still on the index: a file of the project's, or {src, ar, alt}
//   `hero`   the page's first picture, full bleed: a file of the project's,
//            unless `film` is given (a cut from the showreel: {src, poster, ar, alt})
//   `flow`   the rest of the page, in order, one block a line
//
// A flow has three kinds of block, and each fills the row:
//   'plate a.jpg'                  one picture across the 12 columns, at its own proportions
//   'row a.jpg b.jpg ...'          pictures side by side on whole columns (8+4, 6+6, 4+4+4), one height
//   'pair a.jpg text: Key[; Key]'  the picture from column 1, its words at column 7, tops aligned;
//                                  each Key a paragraph (from `texts`, else data.md's block of that label)
// A pair's picture takes 6 columns when wide, 5 when near square, 4 when tall.
// Every flow ends on one of them, so every page closes on a full row.
//
// `crop` sets a file's proportion where its own frame carries a letterbox;
// `posters` gives a film a poster other than data.md's; `alts` gives words to a
// picture data.md leaves without; `focus` keeps the hero's subject in view
// where a phone crops it. Without a flow, one is made by the rules in `compose`.

import { readProjects } from '../../scripts/projects.js';

// Proper names are tied with no-break spaces (\u00A0), so a name never breaks across lines.

const STORY = {
  jagad: {
    cover: '07.jpg',
    hero: '01-corrected.jpg',
    lead: 'For three nights, a building in central Stockholm became a five-storey arcade game, played from joysticks on the pavement across the street.',
    alts: {
      '07.jpg': 'The Kanal 5 logo glows across the facade above a wet street at night.',
      '02.jpg': 'Seen straight on, the windows are the game’s blocks, the streets between them lit yellow and pink.',
    },
    texts: {
      'The game': 'To launch Kanal 5’s show *Jagad*, we rebuilt a classic top-down chase game onto the building itself. The windows became the blocks, and the gaps between them became the streets. Players worked arcade controllers we designed and built for the pavement, hunting celebrity avatars as they roamed the facade. Catch one, and the whole road network flooded with your colour. High scores and player names went straight back up onto the wall.',
      'The nights': 'Hundreds queued over the three nights, some of them to chase down their own avatar. For everyone who could not be there, a [web version](https://jagad.jonasjohansson.se/) put the same game on any phone.',
    },
    flow: [
      'pair controller-facade-first-frame.jpg text: The game',
      'row 02.jpg 10.webm 11.webm',
      'pair joystick-hero.jpg text: The nights',
    ],
  },

  'vi-kommer-i-fred': {
    cover: '01.jpg',
    hero: '02-2x.webm',
    lead: 'In Kungsträdgården, facing the Royal Castle, a screen pulled everyone who walked past into an alien invasion of Stockholm.',
    alts: {
      '04.jpg': 'At dusk, a passer-by stops at the screen in front of the Royal Castle, the craft hanging over the same view on it.',
      '05.jpg': 'On the tall screen, the alien craft hangs in dark cloud.',
      '06.jpg': 'On the tall screen, the craft breaks through bright cloud.',
    },
    texts: {
      'The launch': 'For the launch of TV4’s science fiction drama *Vi kommer i fred*, a single-camera totem showed the show’s opening scene: a huge alien craft breaking through the clouds over the city its audience stood in.',
      'How it works': 'Behind the screen, the whole invasion ran live, mapped onto the camera feed so that anyone who stepped up landed inside the shot. Two versions of the scene, one for day and one for night, swapped on a timer to match the light. It ran around the clock for two weeks.',
    },
    flow: [
      'pair 04.jpg text: The launch',
      'pair 09-wide.jpg text: How it works',
      'row 05.jpg 06.jpg 07.webm',
    ],
  },

  'dome-conductor': {
    cover: 'dome-orchestra.jpg',
    hero: 'young-conductor.jpg',
    focus: '14% 40%',
    lead: 'An orchestra follows your hands. Raise them, find a rhythm and conduct the music around you.',
    texts: {
      'The commission': 'We made Dome Conductor with [IVAR Studios](https://ivar.studio/sv/projects/dome-conductor/) for KTH Royal Institute of Technology, and worked on its development and parts of its design. It premiered at Tekniska museet during the Baltic Sea Festival, and brought the Swedish Radio Symphony Orchestra into Wisdome Stockholm.',
      'How it works': 'A camera follows the visitor’s movements. KTH’s machine learning model, trained on recordings of conductors, turns those gestures into tempo: move faster and the orchestra speeds up; pause and it waits. There is no suit to wear and nothing to calibrate.',
      'The experience': 'It plays the opening ninety seconds of Beethoven’s Fifth Symphony, recorded with conductor Daniel Harding. A wide-angle camera filmed the orchestra for the dome’s 180° projection, and playback lets the visitor set the pace. The musicians also recorded their reactions: conduct them well, and they applaud.',
    },
    flow: [
      'pair orchestra-recording.jpg text: The commission',
      'pair development.jpg text: How it works',
      'pair fisheye-camera.jpg text: The experience',
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
    lead: 'A Romanesque gate on the Melodifestivalen stage, painted with light for Danny Saucedo’s *Happy That You Found Me* until it fell back into open sky.',
    alts: {
      '02.jpg': 'Danny Saucedo sings at the gate, its stone painted with climbing vines and violet flowers.',
      '01-poster.jpg': 'A performer stands on the dark stage inside rings of light drawn on the floor.',
    },
    texts: {
      'The stage': 'The gate was real, an arch and staircase built for projection, set between LED walls and floor.',
      'The visuals': 'Before it falls, the visuals move through a moonlit evening and a garden like Elysium. We tested them on a physical maquette, and built our own camera tool to hold one precise direction of photography across every scene.',
    },
    flow: [
      'pair 01-poster.jpg text: The stage; The visuals',
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
    posters: { '01.mp4': 'src/next/film/heroes-making.jpg' },
    lead: 'On the facade of Stockholm’s Great Synagogue, Raoul Wallenberg and Dag Hammarskjöld stand again, in light.',
    alts: {
      '02.jpg': 'From high above, through a wide lens: the synagogue’s lit rose window and the street below it, in black and white.',
      '01.mp4': 'The making, from the drone scan of the synagogue’s rose window and the 3D scans of the statues to the projection on the facade.',
    },
    texts: {
      'The tribute': 'Heroes honoured Raoul Wallenberg, who saved thousands of Jews in Budapest during the Holocaust, and Dag Hammarskjöld, Secretary‑General of the UN.',
      'The making': 'We scanned their statues in 3D and the synagogue’s facade by drone, so the animation could sit tight to the ornament of the architecture: black and white, high in contrast.',
    },
    flow: [
      'pair 01.mp4 text: The tribute; The making',
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
      '03.jpg': 'From above, people stand on the four lit pads in the square, each ringed in a different colour.',
      '04.jpg': 'Boots and trainers on the lit pads, one ringed in orange light, one in blue.',
      '05.jpg': 'A visitor in a cap and blue jacket looks up at the town hall, its facade washed in blue light.',
    },
    texts: {
      'How it works': 'The pads were weatherproof, made to take snow, rain and countless jumps. Each one sent a ripple of colour across the facade, through an ocean scene animated on the building’s surface. Together, they set off a final sequence of light and music.',
      'The making': 'We laser cut a scale model of the town hall to test the projection on, and scanned the facade by drone to draw on its exact shape.',
    },
    flow: [
      'pair 01.jpg text: How it works; The making',
      'row 04.jpg 05.jpg',
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
    lead: 'Four hundred years of a town, in light, on the curve of one facade.',
    alts: {
      '01-poster.jpg': 'A pink curtain hangs across the corner of the building, a figure in the lit window behind it.',
    },
    texts: {
      'The anniversary': 'For the 400th anniversary of the charter Gustav II Adolf gave Sala, the piece took visitors through four centuries of the town’s history, drawn onto the curve of one facade. Much of the work was done on site, fitting the projection to the architecture.',
    },
    flow: [
      'pair 01-poster.jpg text: The anniversary',
    ],
  },
};

const base = (src = '') => src.split('/').pop();

// A row's pictures on whole columns of the 12: three are 4+4+4; two are 6+6
// when alike in shape, else 8+4 with the wider picture taking the 8. The
// widest (the first of equals) is the `lead`: its own proportion sets the
// row's height, and the others are cropped to it. `tall`: every picture is
// taller than wide, which keeps them side by side on a phone.
export function columns(items) {
  let spans;
  if (items.length >= 3) spans = items.map(() => 4);
  else if (items.length === 2) {
    const [a, b] = items.map((m) => m.ar);
    spans = Math.max(a, b) / Math.min(a, b) < 1.5 ? [6, 6] : a > b ? [8, 4] : [4, 8];
  } else spans = [12];
  const lead = spans.indexOf(Math.max(...spans));
  return {
    tall: items.every((m) => m.ar < 1),
    items: items.map((m, i) => ({ ...m, span: spans[i], lead: i === lead })),
  };
}

// A pair's picture: 6 columns when wide, 5 when near square, 4 when tall.
const pairClass = (ar) => (ar >= 1 ? '' : ar >= 0.8 ? 'pair-square' : 'pair-tall');

function figure(b, s = {}) {
  const file = base(b.src);
  return {
    type: b.type,
    file,
    src: b.src, // image: projects/slug/file (the image shortcode); video: /projects/slug/file
    poster: s.posters?.[file] ?? b.poster ?? null,
    alt: s.alts?.[file] ?? b.alt ?? '',
    ar: Number(s.crop?.[file]) || Number(b.ar) || 1.5,
  };
}

// For a project without a flow of its own: tall pictures side by side in a
// row of up to three; a lone picture right after words becomes a pair with
// them; any other lone picture a plate; words with no picture to follow stand
// at column 7.
function compose(blocks) {
  const flow = [];
  let run = [];
  let words = null;
  const flush = () => {
    let i = 0;
    while (i < run.length) {
      const m = run[i];
      const group = [m];
      if (m.ar < 1) while (i + group.length < run.length && group.length < 3 && run[i + group.length].ar < 1) group.push(run[i + group.length]);
      if (group.length > 1) flow.push({ kind: 'row', items: group });
      else if (words) { flow.push({ kind: 'pair', items: [m], body: words }); words = null; }
      else flow.push({ kind: 'plate', items: [m] });
      i += group.length;
    }
    run = [];
    if (words) { flow.push({ kind: 'text', body: words }); words = null; }
  };
  for (const b of blocks) {
    if (b.type === 'text') { flush(); words = b.content; } else run.push(b);
  }
  flush();
  return flow;
}

export async function stories() {
  const list = await readProjects('projects');
  const out = {};
  for (const p of list) {
    const s = STORY[p.slug] ?? {};
    const media = p.blocks.filter((b) => b.type === 'image' || b.type === 'video').map((b) => figure(b, s));
    const byFile = Object.fromEntries(media.map((m) => [m.file, m]));
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
        const [pics, words] = line.split(/\s+text:\s*/);
        const [kind, ...files] = pics.trim().split(/\s+/);
        const items = files.map((f) => {
          if (!byFile[f]) console.warn(`[story] ${p.slug}: no file ${f} in data.md`);
          return byFile[f];
        }).filter(Boolean);
        const r = { kind, items };
        if (words) r.body = words.split(/\s*;\s*/).map(text).filter(Boolean).join('\n\n');
        return r;
      }).filter((r) => r.items.length);
    } else {
      const rest = p.blocks.filter((b) => b !== leadBlock && b !== creditBlock && !(hero && b.src && base(b.src) === hero.file) && !(cover && b.src && base(b.src) === cover.file));
      flow = compose(rest.map((b) => (b.type === 'text' ? b : figure(b, s))));
    }

    for (const r of flow) {
      if (!['plate', 'row', 'pair', 'text'].includes(r.kind)) console.warn(`[story] ${p.slug}: unknown block '${r.kind}'`);
      if (r.kind === 'row') Object.assign(r, columns(r.items));
      if (r.kind === 'pair') r.shape = pairClass(r.items[0].ar);
    }
    // Every page closes on a block that fills the row.
    const last = flow[flow.length - 1];
    if (last && !['plate', 'row', 'pair'].includes(last.kind)) console.warn(`[story] ${p.slug}: the flow ends on a '${last.kind}', not a block that fills the row`);

    out[p.slug] = {
      slug: p.slug,
      title: p.title,
      lead: s.lead ?? leadBlock?.content ?? '',
      hero: hero ? { ...hero, focus: hero.focus ?? s.focus ?? null } : null,
      // The picture that stands for the project on the index: a still.
      cover: cover ? { ...cover, still: cover.type === 'video' ? cover.poster : cover.src } : null,
      flow,
    };
  }
  return out;
}
