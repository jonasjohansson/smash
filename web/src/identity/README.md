# /identity/: the wordmark and the logo

A page for the SMASH identity, in black and white: each section is its number, its name and
its marks, with no copy.

- `index.html` and `identity.js`: the page. Chapters come from `directions/<slug>.js` (the
  slugs are listed in `directions.js`), and the tools come from the `EXTRAS` list in
  `identity.js`. `?d=<slug>` shows one alone, `?t=0.5` seeks every motion to t = 0.5 and pauses
  it (for screenshots), and `?feedback` adds a rating and comment for each section.
- `directions/original.js`: the mark, the S M symbol, the favicons, the lockups and the motion.
- `modular.js`: the modular mark. The symbol is the S M or the S alone, and it can be turned.
- `shapes.js` and `shapes/`: the kit, the mark's negative shapes that aren't letters made into chunky building blocks
  (`kit.js`), and what they build: a gallery of symbols from a seeded grammar (`grammar.js`), as blocks or cut from a
  block, patterns, and a bench to build one by hand (`editor.js`). Every piece exports as an outline SVG (`outline.js`).
- `lab.js`: the parametric mark (`/js/mark.js`), live, in 2D or 3D (`extrude.js`), with each
  letter's own measures.
- `mapping.js`: a mapping grid for warping the mark.
- `sculpture.js`: one object that reads SMASH from the front and the S from the side.
- `directions/struck.js`: the mark with its slots leaning.
- `sequence/`: a page of its own (`/identity/sequence/`): the logo, framed like a stamp, taken down to the
  modular mark, the S M, the S and the square in its bottom left corner (the module), and back. One drawing: the modular mark's geometry between the
  logo's measures and its own. One thing moves at a time, each move with its own easing (a snap, a spring, a
  sweep, a landing) and its own sound, synthesised from the same curve (`sound.js`). Space pauses, the arrows step,
  i inverts, s turns the sound on, p (or `?punchy`) plays the punchier version; `?at=0`–`4` holds a state, `?t=`
  seeks. The download button gives the MP4 in `video/`, rendered frame by frame with its sound by
  `python3 web/scripts/identity-sequence-video.py [--punchy] [--paper] [--size=1920x1080]`.
- `deck.html`: the same modules as 1920 × 1080 slides, for a PDF
  (`python3 web/scripts/identity-pdf.py`).

The module contract: a chapter exports `info`, plus `wordmark`, `symbol`, `lockup` and `favicon`
(SVG strings in `currentColor`, plain vector), and `motion(el)`, which returns a timeline whose
`seek(t)` depends on t alone. A tool exports its HTML and `mount(section, { panel, settings })`,
which returns `{ ready, pause, resume, destroy, snapshot }`.

Licensed fonts are kept out of git (`web/.gitignore`).
