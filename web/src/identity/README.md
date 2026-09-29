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
- `sequence/`: a page of its own (`/identity/sequence/`): the logo, square, taken down one move at a time to
  the modular mark, the S M, the S, the ! (the S's stem over its corner square) and that square (the module); then,
  that square being the logo's block seen close, the logo writes itself back through it as its slots open, left to
  right. Eight bars at 120 a minute; every move lands its hit on a sixteenth, with its own easing and its own sound
  (`sound.js`: synthesised, one key, a room, a compressor and a limiter; the reveal plays a rising arpeggio, a note
  per slot column). Space pauses, the arrows step, i inverts, s turns the sound on, p (or `?punchy`) plays the
  punchier version (`?calm` the slow one); `?at=0`–`6` holds a state, `?t=` seeks. The download button makes an MP4
  of the loop right there, in the version and colours on screen: 1600 × 1200 for Dribbble, shift for 1920 × 1080, alt
  for 1080 × 1080, or `?size=WxH` (`export.js`: every frame drawn at its time, H.264 at a constant quality through
  WebCodecs, the sound rendered offline, folded so it loops without a seam and placed to the sample, mp4-muxer).
- `deck.html`: the same modules as 1920 × 1080 slides, for a PDF
  (`python3 web/scripts/identity-pdf.py`).

The module contract: a chapter exports `info`, plus `wordmark`, `symbol`, `lockup` and `favicon`
(SVG strings in `currentColor`, plain vector), and `motion(el)`, which returns a timeline whose
`seek(t)` depends on t alone. A tool exports its HTML and `mount(section, { panel, settings })`,
which returns `{ ready, pause, resume, destroy, snapshot }`.

Licensed fonts are kept out of git (`web/.gitignore`).
