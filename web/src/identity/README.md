# /identity/: the wordmark and the logo

A page for the SMASH identity, in black and white: each section is its number, its name and
its marks, with no copy.

- `index.html` and `identity.js`: the page. Chapters come from `directions/<slug>.js` (the
  slugs are listed in `directions.js`), and the tools come from the `EXTRAS` list in
  `identity.js`. `?d=<slug>` shows one alone, `?t=0.5` seeks every motion to t = 0.5 and pauses
  it (for screenshots), and `?feedback` adds a rating and comment for each section.
- `directions/original.js`: the mark, the S M symbol, the favicons, the lockups and the motion.
- `modular.js`: the modular mark. The symbol is the S M or the S alone, and it can be turned.
- `shapes.js` and `shapes/` (off the page since 2026-09-29, at Jonas's word; kept for `identity-export.py`): the kit, the mark's negative shapes that aren't letters made into chunky building blocks
  (`kit.js`), and what they build: a gallery of symbols from a seeded grammar (`grammar.js`), as blocks or cut from a
  block, patterns, and a bench to build one by hand (`editor.js`). Every piece exports as an outline SVG (`outline.js`).
- `lab.js`: the parametric mark (`/js/mark.js`), live, in 2D or 3D (`extrude.js`), with each
  letter's own measures.
- `mapping.js`: a mapping grid for warping the mark.
- `sculpture.js`: one object that reads SMASH from the front and the S from the side.
- `illusion.js` and `illusion/` (off the page since 2026-09-30, at Jonas's word: it didn't give anything; Field was the one he liked): the mark as op art (the logo is already stripes, so it goes the other way): fifteen
  optical illusions, each with the mark as its figure, live, in black and white: Field (its slots run on out of it,
  so the letters are only where the stripes stop), Phase (an illusory contour), Grain (orientation), Ouchi, Current
  (Riley), Rings, Echo (its outline sent out again), Swell (the liquified letter), Vega (Vasarely), Moiré,
  Scanimation (a barrier grid), Motion (only there while it moves), Depth (a random-dot stereogram), and Turing and
  Fingerprint (reaction–diffusion grown from it). The stripes, rings, checkers and grown patterns are at the mark's own
  weight (a stem, then a slot, a pitch apart), so the mark reads as a piece of the pattern; only moiré, scanimation,
  motion and the stereogram stay fine, as they need to. One WebGL context draws every tile in turn (`gl.js`); the mark
  comes in as its signed distance (`field.js`); the shaders are `techniques.js`. The bar swaps in the modular mark
  and inverts; a click shows a tile wide; each has its MP4.
- `colour.js`: the one section in colour: the seven accents round the wheel (Acid, Yellow, Orange, Red, Pink, Violet, Sky), each with three darker steps
  (the hue kept, the lightness at 80, 62 and 44 % of the base in OKLCH), the site's ground and type, every
  swatch with its WCAG contrast (white and black type on it, it on the ground, worked out from the hex), and the mark
  in each accent on the ground, on its own Dark 3, and in ground or type on the accent.
- `directions/struck.js`: the mark with its slots leaning.
- `sequence/`: a page of its own (`/identity/sequence/`), and a section on this page: the logo, square, taken down
  one move at a time to the modular mark, the S M, the S, the ! (the S's stem over its corner square) and that square
  (the module); then, that square being the logo's block seen close, the logo writes itself back through it as its
  slots open, left to right. Eight bars at 120 a minute; every move lands its hit on a sixteenth, with its own easing
  and its own sound (`sound.js`: synthesised, one key, a room, a compressor and a limiter; the reveal plays a rising
  arpeggio, a note per slot column). `engine.js` is the sequence itself, `player.js` keeps it in time on a screen
  (the drawing, the sound, the MP4), `sequence.js` is its page and `section.js` its section here. On its page, space
  pauses, the arrows step, i inverts, s turns the sound on, p (or `?punchy`) plays the punchier version (`?calm` the
  slow one); `?at=0`–`6` holds a state, `?t=` seeks, `?paper` starts black on white. b (or `?pulse`) plays it on the
  pulse (`pulse.js`), after a reference of blocks tumbling and restacking: the same story in 23 hits on the beat, each
  one the mark itself changing (the camera only moves with a change), a whip into it (0.2 s, fastest at the end), a
  landing on it, a settle a touch past its mark and back (0.28 s), and a smear through the fast frames (8 to 32 moments across a fortieth of a second, added up, a
  blur joining the fastest); a beat with nothing to change holds still. `pulse.js` exports what `engine.js` does, so
  the player and the MP4 take either one; there `?at=` holds a beat (0–31). On this page, the section's Pulse button
  swaps between the two (and its Full screen link follows). Tests: `npm test` in `web/`.
- MP4s (`video.js`): the chapters' motions and the sequence each have a download button (MP4) that makes one loop of
  it right there: 1600 × 1200 for Dribbble, shift-click for 1920 × 1080, alt-click for 1080 × 1080, or `?size=WxH`;
  the sequence in the version and colours on screen, with its sound. Every frame is drawn at its time (not recorded
  off the screen), H.264 at a constant quality through WebCodecs, the sound rendered offline, folded so it loops
  without a seam and placed to the sample, mp4-muxer.
- `deck.html`: the same modules as 1920 × 1080 slides, for a PDF
  (`python3 web/scripts/identity-pdf.py`).

The module contract: a chapter exports `info`, plus `wordmark`, `symbol`, `lockup` and `favicon`
(SVG strings in `currentColor`, plain vector), and `motion(el)`, which returns a timeline whose
`seek(t)` depends on t alone; for its MP4, `frame(ctx, w, h, t)` draws the motion at t on any canvas, and
`duration` is its loop in seconds. A tool exports its HTML and `mount(section, { panel, settings })`,
which returns `{ ready, pause, resume, destroy, snapshot }`.

Licensed fonts are kept out of git (`web/.gitignore`).
