// The projects as the next site tells them (/next/work/ and /next/work/<slug>/).
//
// data.md is written in Jonas's own voice ("I built..."), for his portfolio.
// On SMASH's site the work is told by the studio, so each project's words are
// kept here in the studio's voice.
//
// A page is a `flow`: the order its words and pictures come in, one line each.
//   'text: Key'              a text block (from STORY texts, else data.md's block of that label)
//   'room a.jpg'             full bleed, at most the screen's height
//   'plate a.jpg'            inside the margins, at its own proportions
//   'right a.jpg'            columns 7-12 / 'left a.jpg' columns 1-6
//   'portrait a.jpg'         a lone tall picture from column 1: 6 columns, 4 when taller than square
//   'row a.jpg b.jpg ...'    one project's pictures on whole columns (8+4, 6+6, 4+4+4), one height
// `hero` opens the page; `cover`, if given, stands for the project on the
// index instead. `crop` sets a file's proportion where its own frame carries
// a letterbox. `focus` keeps the hero's subject in view where a narrow screen
// crops it. Without a flow, one is made by the rules in `compose`.

import { readProjects } from '../../scripts/projects.js';

const STORY = {
  jagad: {
    hero: '01-corrected.jpg',
    lead: 'For three nights, a building in central Stockholm became a five-storey arcade game, played from joysticks on the pavement across the street.',
    texts: {
      'The game': 'To launch Kanal 5’s show *Jagad*, we rebuilt a classic top-down chase game onto the building itself. The windows became the blocks, and the gaps between them became the streets. Players worked arcade controllers we designed and built for the pavement, hunting celebrity avatars as they roamed the facade. Catch one, and the whole road network flooded with your colour. High scores and player names went straight back up onto the wall.',
      'The nights': 'Hundreds queued over the three nights, some of them to chase down their own avatar. For everyone who could not be there, a [web version](https://jagad.jonasjohansson.se/) put the same game on any phone.',
    },
    flow: [
      'room joystick-hero.jpg',
      'text: The game',
      'row 04.jpg controller-facade-first-frame.jpg',
      'right 02.jpg',
      'text: The nights',
      'room 08.jpg',
      'row 10.webm 11.webm',
      'left 07.jpg',
    ],
  },

  'vi-kommer-i-fred': {
    hero: '03.jpg',
    lead: 'In Kungsträdgården, facing the Royal Castle, a screen pulled everyone who walked past into an alien invasion of Stockholm.',
    texts: {
      'The launch': 'For the launch of TV4’s science fiction drama *Vi kommer i fred*, a single-camera totem showed the show’s opening scene: a huge alien craft breaking through the clouds over the city its audience stood in.',
      'How it works': 'Behind the screen, the whole invasion ran live, mapped onto the camera feed so that anyone who stepped up landed inside the shot. Two versions of the scene, one for day and one for night, swapped on a timer to match the light. It ran around the clock for two weeks.',
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
  },

  'dome-conductor': {
    hero: 'young-conductor.jpg',
    focus: '14% 40%',
    lead: 'An orchestra follows your hands. Raise them, find a rhythm and conduct the music around you.',
    texts: {
      'The commission': 'We made Dome Conductor with [IVAR Studios](https://ivar.studio/sv/projects/dome-conductor/) for KTH Royal Institute of Technology, and worked on its development and parts of its design. It premiered at Tekniska museet during the Baltic Sea Festival, and brought the Swedish Radio Symphony Orchestra into Wisdome Stockholm.',
      'How it works': 'A camera follows the visitor’s movements. KTH’s machine learning model, trained on recordings of conductors, turns those gestures into tempo: move faster and the orchestra speeds up; pause and it waits. There is no suit to wear and nothing to calibrate.',
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
  },

  'danny-saucedo': {
    hero: '03.jpg',
    crop: { '01.jpg': 2.4, '01-poster.jpg': 1 },
    lead: 'A Romanesque gate on the Melodifestivalen stage, painted with light for Danny Saucedo’s *Happy That You Found Me* until it fell back into open sky.',
    texts: {
      'The stage': 'The gate was real, an arch and staircase built for projection, set between LED walls and floor.',
      'The visuals': 'Before it falls, the visuals move through a moonlit evening and a garden like Elysium. We tested them on a physical maquette, and built our own camera tool to hold one precise direction of photography across every scene.',
    },
    flow: [
      'plate 01.jpg',
      'text: The stage',
      'right 02.jpg',
      'text: The visuals',
      'portrait 01-poster.jpg',
    ],
  },

  heroes: {
    hero: '01.jpg',
    lead: 'Statues of Raoul Wallenberg and Dag Hammarskjöld, scanned in 3D and set into the drone-scanned facade of Stockholm’s Great Synagogue.',
    texts: {
      'The tribute': 'Heroes honoured Raoul Wallenberg, who saved thousands of Jews in Budapest during the Holocaust, and Dag Hammarskjöld, Secretary-General of the UN.',
      'The making': 'The piece is black and white and high in contrast, its animation set tight to the ornament of the architecture.',
    },
    flow: [
      'room 02.jpg',
      'text: The tribute',
      'text: The making',
      'row 03.jpg 01.mp4',
    ],
  },

  resonance: {
    hero: '02.jpg',
    lead: 'Four lit pads in the square let anyone paint Uppsala Town Hall in colour. Press all four at once, and the building answers.',
    texts: {
      'How it works': 'The pads were weatherproof, made to take snow, rain and countless jumps. Each one sent a ripple of colour across the facade, through an ocean scene animated on the building’s surface. Together, they set off a final sequence of light and music.',
      'The making': 'We laser cut a scale model of the town hall to test the projection on, and scanned the facade by drone to draw on its exact shape.',
    },
    flow: [
      'room 01.jpg',
      'text: How it works',
      'row 03.jpg 04.jpg 05.jpg',
      'text: The making',
    ],
  },

  'sala-hjartslag': {
    hero: '01.jpg',
    lead: 'Four hundred years of a town’s history, drawn onto the curve of one facade for Sala’s anniversary.',
    texts: {
      'The anniversary': 'The story begins with the town charter Gustav II Adolf gave Sala. Much of the work was done on site, fitting the projection to the architecture.',
    },
    flow: [
      'text: The anniversary',
      'portrait 01-poster.jpg',
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

function figure(b, crop = {}) {
  const file = base(b.src);
  return {
    type: b.type,
    file,
    src: b.src, // image: projects/slug/file (the image shortcode); video: /projects/slug/file
    poster: b.poster ?? null,
    alt: b.alt ?? '',
    ar: Number(crop[file]) || Number(b.ar) || 1.5,
    full: Boolean(b.full),
  };
}

// For a project without a flow of its own: the first picture is a ROOM, and
// so is anything at 2:1 or wider; tall pictures in a row of up to three; a
// lone landscape a PLATE, the next ones alternating RIGHT and LEFT; a lone
// tall picture a PORTRAIT.
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
    if (b.type === 'text') { flush(); flow.push({ kind: 'text', body: b.content }); }
    else run.push(b);
  }
  flush();
  return flow;
}

export async function stories() {
  const list = await readProjects('projects');
  const out = {};
  for (const p of list) {
    const s = STORY[p.slug] ?? {};
    const media = p.blocks.filter((b) => b.type === 'image' || b.type === 'video').map((b) => figure(b, s.crop));
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
        if (t) return { kind: 'text', body: s.texts?.[t[1]] ?? texts.find((b) => b.label === t[1])?.content ?? '' };
        const [kind, ...files] = line.trim().split(/\s+/);
        return { kind, items: files.map((f) => byFile[f]).filter(Boolean) };
      }).filter((r) => (r.kind === 'text' ? r.body : r.items.length));
    } else {
      const rest = p.blocks.filter((b) => b !== leadBlock && b !== creditBlock && !(hero && b.src && base(b.src) === hero.file));
      flow = compose(rest.map((b) => (b.type === 'text' ? b : figure(b, s.crop))));
    }

    for (const r of flow) {
      if (r.kind === 'row') Object.assign(r, columns(r.items));
      // A lone tall picture takes 4 columns, so it stays within the screen; a squarer one takes 6.
      if (r.kind === 'portrait') r.span = r.items[0].ar < 0.8 ? 4 : 6;
    }

    out[p.slug] = {
      slug: p.slug,
      title: p.title,
      lead: s.lead ?? leadBlock?.content ?? '',
      hero: hero ? { ...hero, focus: s.focus ?? null } : null,
      // The picture that stands for the project on the index: a still.
      cover: cover ? { ...cover, still: cover.type === 'video' ? cover.poster : cover.src } : null,
      flow,
    };
  }
  return out;
}
