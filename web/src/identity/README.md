# /identity/: the wide round

The original SMASH mark with its typeface (00), and six identity directions (01–06), each one
module, laid out by one harness:

- `index.html`: the live page (a cover, six chapters, a comparison). `?d=<slug>` shows only
  that chapter; `?t=0.5` seeks every motion to t = 0.5 and pauses it (for screenshots).
- `deck.html`: the same modules as 1920×1080 slides, for the PDF
  (`python3 web/scripts/identity-pdf.py`). `?d=<slug>` shows only that direction's slides.
- `lab.js`: "The mark, live", after chapter 00. It's the landing's v2: the parametric mark
  (`/js/mark.js`) as liquid glass (`/js/glass.js`), flat, or extruded in 3D (`extrude.js`, three.js,
  drag to turn it), with its settings panel (including each letter's own measures, and letters
  that move, each a beat after the last) and Export
  SVG. `?d=lab` shows it alone.
- `lib.js`: shared helpers (seeded random numbers, easing, polygons, a timeline, a canvas stage,
  the pictures). Read it; don't change it. If you need something different, copy it into your
  own module.
- `directions/<slug>.js`: one direction. **A builder touches only its own module** (and,
  if it needs one, its own folder `directions/<slug>/`).

Design brief and rules: `docs/plans/2026-09-28-smash-identity-wide-round-design.md`.

## The module contract

```js
export const info = {
  n: 1,                       // 1–6, its place in the round
  slug: 'struck',             // file name
  name: 'Struck',
  lane: 'Evolve the original',
  idea: 'One sentence: the idea, not the technique.',
  story: 'Two to four sentences for Ash: what it is and why it is SMASH.',
  dynamism: 'How it answers "more dynamism", in the still form and in motion.',
  keeps: 'What it keeps (equity, strategy, brief keywords it serves).',
  risk: 'The honest risk, and how it would be handled.',
  palette: { ink: '#0e0c0b', paper: '#ecebe6', accent: '#f7be04' }, // its grounds and accent
  interactive: 'Move the pointer over it: …',   // or '' if the motion does not respond
  application: { title: 'Site landing', aspect: '16/9' },
  type: {
    fonts: ['https://fonts.googleapis.com/css2?family=…&display=swap'], // stylesheets to load, or []
    display: { family: '"Archivo", sans-serif', css: 'font-weight: 900; font-stretch: 125%; letter-spacing: -0.02em; text-transform: uppercase;', name: 'Archivo Expanded Black', note: 'why' },
    text:    { family: '"Neue Montreal", sans-serif', css: '', name: 'Neue Montreal', note: 'why' },
  },
};

// Still drawings: each returns an SVG string with a viewBox and no width or height (the page
// sizes it). Draw in currentColor unless the colour is part of the idea; ground is 'ink' or 'paper'.
// They are exported for Illustrator (web/scripts/identity-export.py), so keep them plain vector:
// paths, polygons, rects, circles; fill-rule evenodd for holes. No <text> (draw the letters),
// no <image>, no <style> or CSS variables, no filters or masks. Gradients only if colour is the idea.
export function wordmark({ ground }) {}
export function symbol({ ground }) {}
export function lockup({ ground }) {}        // symbol and wordmark together
export function favicon({ size }) {}         // size 16, 32 or 64: a square SVG, its own ground included, simplified for small sizes as needed

// Live pieces: mount into el (the page sizes el; fill it, and follow its size) and return a controller.
export function motion(el, { ground }) {}      // → { duration, seek(t), play(), pause(), destroy() }; lib.timeline() makes one
export function application(el, { images }) {} // → { destroy() }; el has info.application.aspect; images = lib.IMAGES
export function specimen(el) {}                // optional; without it the page sets a standard specimen from info.type
```

Motion must be a pure function of t in [0, 1] (plus the pointer, if it is interactive), so
`seek(t)` always draws the same frame, and the deck can print a strip of five frames. A WebGL
context needs `preserveDrawingBuffer: true` (the deck copies canvases into pictures).

## Type from Jonas's library

Choose typefaces from Jonas's font library, not only Google Fonts. The index is
`web/.identity-shots/font-index.tsv` (source, category, family, trial, format, file). Fonts with
source `local` are installed on this Mac (~/Library/Fonts, about 360 families, including the ABC
Dinamo range, Druk, Founders Grotesk and Fakt) and load at once. Source `drive` is the shared
library (about 440 families); its files are online-only on Google Drive and may take long to fetch
or never arrive, so prefer local copies. See candidates side by side, next to the current mark if
useful:

```sh
python3 web/scripts/identity-fontsheet.py FILE [FILE ...] --out=web/.identity-shots/<slug>/type-1.png [--text=SMASH] [--mark] [--ground=paper]
```

To use a font: copy its file (woff2 preferred, otf or ttf fine) into
`web/src/identity/directions/<slug>/fonts/` (kept out of git: the fonts are licensed), write
`web/src/identity/directions/<slug>/fonts.css` with the `@font-face` rules (urls relative to that
css), and list it in `info.type.fonts` as `new URL('./<slug>/fonts.css', import.meta.url).href`.
Say in the note if a font is a trial version (fine for a proposal, and it would need a licence).

## Checking your work

A static server runs on web/src (`python3 -m http.server 8765 -d web/src`), so the page is at
`http://localhost:8765/identity/`. Screenshots and console errors for one direction:

```sh
python3 web/scripts/identity-shoot.py <slug>   # writes web/.identity-shots/<slug>/*.png, prints console errors
```

Look at every picture it writes. You can't judge a mark without seeing it.

Export for Illustrator, and fix every warning it prints:

```sh
python3 web/scripts/identity-export.py <slug>   # writes identity/<nn>-<slug>/ at the repo root
```
