# SMASH identity: the wide round

2026-09-28. Jonas's counter-round to CM.SUPPLY's logo work.

## Why

CM.SUPPLY's discovery (2026-08-24) went wide, with three directions: Resonance, Light refraction and
Brutalist Forms. Then it zoomed in. SMASH asked them to go wide again. Instead, the logo round
(2026-09-24) is 12 tweaks of one heavy, wide, knife-cut wordmark (cap height 180/240/320, a
few cut angles). It has no symbol, no motion and no second idea. Ash wants more dynamism; his
Shards example is CM's wordmark with a burst of shards set beside it. The wordmark and the
burst do not come from one idea.

### What CM has already built (know it, and don't copy it)

CM's "Identity system" deck (2026-09-21) merged their direction 2 (light refraction) and
direction 3 (brutalist forms) and "locked the concept". Their Sep 23 and Sep 24 rounds only
refine the wordmark. Their system, so far:

- **Wordmark:** heavy and wide, sitting in a thin rectangular frame that it touches. Every letter
  has knife-cut diagonal wedges (the S as two wedges, a slit in the M, a wedge counter in the A).
  There is also a monospaced variant.
- **Mutations:** the word stacked in a square (SM over H, or SM/AS/H), used as an avatar.
- **Icon (sizes S and XS):** an S made of diagonal wedges in a framed square, with a grey
  gradient at S size.
- **"Diagonal logic: wipes, masks, cracks":** diagonal gradient wipes as the motion language, and
  pictures masked inside the huge letters.
- **Colour:** electric blue with lime green; version 2 is red-orange with lavender and purple.
  Also light grey and brown-black grounds.
- **Type:** a neutral grotesk (it looks like ABC Diatype or similar), set small in
  uppercase-label style with [↓] markers.

Pictures: `/Users/jonas/.claude/jobs/f3f65284/tmp/identity/png/cm-system-1.png`,
`cm-system-2.png`, `cm-system-p05.png` (the wordmark), `cm-system-p06.png` (mutations),
`cm-system-p07.png` (sizing and icon), `cm-system-p13.png` (motion language), and
`cm-0923-part-0..2.png` (the Sep 23 strip).

**Rule:** no chapter may read as a variant of this system. Where a direction touches the same
territory (diagonals, a shard-S icon, pictures masked in huge letters, electric blue, lime or
purple, a framed wordmark), it has to be clearly different in form and say so in its `risk`.
Cut must not become diagonal wipes. Reassembled must not become knife-cut wedges. Impact's blue
must sit in a different system.

This round goes wide again, properly. The strategy is fixed (CM's brief, the brand truths in
CLAUDE.md, "Smash ultimately wants to make people feel"); the form is open.

## Shape

The original first, then six directions, each from a different lane, each taken the same distance
so they compare fairly:

| # | Name | Lane | One line |
|---|---|---|---|
| 0 | Original | Keep the mark | The mark stays as it is; a great typeface around it does the work (several pairings shown). |
| 1 | Struck | Evolve the original | The labyrinth block takes a hit; its slots lean into a radial fracture. |
| 2 | Reassembled | New wordmark | Letters cut into shards and put back; light comes through the gaps. |
| 3 | Impact | Symbol-led | A generative fracture; one seed is the logo, every place gets its own. |
| 4 | Cut | Graphic gesture | One diagonal slice through the name; the offset is the energy. |
| 5 | Alignment | Spatial | Fragments in space that only read SMASH from one viewpoint. |
| 6 | Crack Line | Light | The name written by one running crack of light. |

Each direction delivers: wordmark (on dark and on light), symbol, favicon (16/32/64), lockup,
one motion behaviour, one application, a typeface pairing, and a short honest rationale
(how it answers dynamism, what it keeps, the risk).

## Jonas's feedback during the build (acts on it: critics flag it, revisers fix it)

- **00 Original, the symbol** (the square crop of the mark), 2026-09-28 16:10: "pretty cool
  but reads as S I, maybe it can be S M more, otherwise it's nice! And I like the shapes it
  creates."
  - Keep the approach: a crop of the mark's own geometry, with the shapes the S bend and the slot
    ends make.
  - Make it read **S M**: take the crop through the whole M, up to the slot that closes the M
    (column c4), so that the M's three stems and both of its slots are inside it. That is about
    240 × 471 units, a tall block of roughly 1 : 1.95.
  - Either let it stand tall in the square (symbol and favicon), or bring it towards a square
    with the mark's own spread (`columns`) or a proportional slot width, but only as far as it
    still reads S M and keeps those shapes.
  - Check it at 32 and 16 px, where a tall SM may need its slots opened up. The favicon and the
    lockup follow the new symbol.

- **03 Impact, the shards**, 2026-09-28 16:15: "I think the shards look a bit like cob web."
  Jonas has confirmed the risk the builder named. The web look comes from four things: the
  concentric ring linking the spokes, spokes spaced almost evenly all round, a closed polygonal
  outline, and a centred hole. Change the rule, not only the seed:
  - **No rings.** At most a short partial secondary crack near the hit. Rings are what make a web.
  - **Fewer, longer, unequal wedges:** 4 to 7 sharp shards with clearly different angles and
    lengths, some long and thin, some broad. It should look like glass taking a hit, not a wheel.
  - **Directional.** The hit came from somewhere: the fracture is asymmetric, the shards on one
    side are longer and fly further, and the impact point sits off-centre.
  - **An open silhouette.** No closed outline and no pane edge drawn. Shards end at sharp points
    at different radii, and some separate outward with uneven gaps: the moment just after
    impact, which is where the dynamism is.
  - Ash's "compact impact" and "three shards" sketches (shards-1.png) point the same way: a few
    angular shards in an asymmetric cluster. Do better than those, but don't go back to a web.
  - Keep the system: seeded, one canonical seed as the logo, every place its own fracture, and
    shards as windows onto the work. Check the family grid and the favicon (a few big wedges)
    again, since they must not read as a web either.

### Jonas, 2026-09-28 19:30 (overrides the focus round where they differ)

- **Sculpture: the side is the S alone, not the S M.** From the front the object reads SMASH;
  from the side it reads only the S. (Screenshot: the current S M side reads "SM" on the left
  wall; Jonas wants just the S there.)
- **The modular mark** gets a setting for its symbol: the S M, or the S alone, and a turn of
  0, 90, 180 or 270 degrees (Claude is building this in `modular.js` directly).
- **No text on the page** beyond each section's number and name. No cover line, no ideas, no
  notes, no hints. Feedback only at `?feedback`.
- **New section, "Shapes"** (Jonas 19:35): "a section with all the interesting negative shapes
  that are created from the wordmark, the modular mark and logo, like things we can use in
  branding elsewhere, just all the shapes and objects". A catalogue of every distinct shape the
  marks are cut into: the negative shapes (the slots, the counters, the bends) and the positive
  pieces between them (the stems, the hooks, the arches). They are taken from the original mark
  (`web/src/js/mark.js`), the modular mark (`modular.js`) and the S M symbol
  (`directions/original/geometry.js`, `symbolA`). Each is shown on its own, in black and white, with no
  captions beyond the section's number and name, and each can be exported as an SVG.

### FOCUS ROUND, Jonas, 2026-09-28 18:50 (overrides everything below)

Jonas rated the page. The round narrows to **the wordmark and the logo**, drawn from the
original mark.

- **Black and white only:** white on black, and black on white. No brown, cream, yellow or blue,
  and no project pictures inside the marks. Pure #000 and #fff.
- **Less fluff:** the page shows marks and tools, not essays. No applications, no long copy, no
  type specimens (typography comes later), no side-by-side of dropped chapters.
- **Kept, in this order on the page:**
  1. **00 Original** (4/5): the mark, the S M symbol (the "smaller wordmark": "great"), the
     favicon and the motion. The lockup logic stays (the three lines on the mark's three solid
     bands, the middle one on the crossbar), with the font undecided. Its motion is the mark
     itself moving (crossbar and slots), in black and white, with no pictures.
  2. **The modular mark** (5/5, "love it"): the tool, in black and white.
  3. **The mark, live**, the generator (2/5): no slideshow. Simple 2D and 3D, black and white,
     with each letter's controls kept.
  4. **Mapping** (4/5): the columns, rows and presets are "very cool". No surfaces or photos,
     black and white only.
  5. **Sculpture** (3/5): "cool but not so useful". The side becomes **the smaller wordmark, the
     S M**, so one object is both the wordmark (the front) and the logo (the side). Black and
     white.
  6. **01 Struck**, reduced to its small cut (2/5, but the small wordmark "is quite interesting,
     let's keep this but without the cracks"): the lean, no cracks anywhere. Its symbol and its
     type (the SMASH variable face) were liked. Black and white.
- **Dropped:** 02 Reassembled ("too kitsch"), 03 Impact ("too generic and forgettable"), 05
  Alignment, 04 Cut, 06 Crack Line ("wasn't so interested"). The Impact lab is off.

### Jonas, 2026-09-28 17:40: 2D first, no glass effects

"Let's focus on the 2D and no glass effects." For every chapter still being worked on:

- **No glass rendering:** no refraction, liquid glass, glossy or translucent materials, spectral
  or rainbow fringes, glows, bloom or lens effects, in stills, motion or applications.
- **Flat, graphic 2D:** solid shapes, flat colour (the palette's ink, paper and one accent),
  and pictures of the work shown flat inside shapes.
  - Where a chapter used "light in the gaps" (Reassembled) or light in the cracks (Impact), use a
    flat accent colour, or simply the ground showing through.
  - Alignment's fragments are flat planes in flat tones, with the perspective drawn, not rendered
    as glass.
- **Motion stays**, but as 2D motion (position, rotation, scale, cuts), not as material effects.
- 3D is not the focus: keep a chapter's 3D only where it is the idea itself (Alignment's
  perspective). Don't add more.

### Jonas's verdicts, 2026-09-28 16:45 (these override the specs in the workflow prompts)

- **04 Cut: DROPPED.** "I don't like the Cut."
- **06 Crack Line: DROPPED.** "I don't like the crack line."
  Any agent working on Cut or Crack Line: stop at once. Change no files and don't shoot or
  export. Return a one-line summary saying "dropped by Jonas" (as a critic: score 0, verdict weak,
  and no problems). A cross-check skips them, and they will be taken off the page.
- **03 Impact:** "I don't like this cobweb design." The rule change above is mandatory, not a
  suggestion. If the fracture still reads as a web, a wheel, a dartboard or a bullet hole, drop
  the radial construction entirely. Replace it with an asymmetric cluster of 3 to 6 large,
  sharp shards flung from one side, like Ash's "three shards", done with more craft. Keep the
  seeded "every place its own" system on top of whichever construction wins.
- **02 Reassembled:** Jonas finds the two-line poster (SMA / ASH) interesting, but the A
  appears twice, which reads SMAASH. Make **one A, broken across the two lines**: its top half
  ends the first line (SM + top of A) and its bottom half starts the second (bottom of A + SH).
  The fracture through the A is the line break: one A, split by a crack, with the light in the
  split. Apply it wherever the word breaks over lines (poster, specimen), and check that it reads
  SMASH.
- **05 Alignment: a favourite.** "The perspective projection trompe l'oeil is pretty cool, maybe
  it can be more refined." Raise the craft:
  - fragments cut on the wordmark's own angles, no slivers;
  - a crisp, satisfying snap into alignment, and a longer hold on the aligned word;
  - light and material that make the planes read as objects in space (edge light, depth cues,
    subtle shadow or fog), not flat cut-outs;
  - the pointer-driven alignment feeling precise;
  - an installation application convincing enough to pitch as a real piece.
- **05 Alignment, 2026-09-28 17:10:** "I liked more of the previous examples. I think we can
  have more of the perspective refined logo, but without the dot." The first build (pictures
  kept in `web/.identity-shots/alignment-liked/`) is closer to what he wants than the
  revision. So:
  - **Remove the viewpoint dot everywhere:** the wordmark, symbol, favicon, lockup and
    applications. Drop the rays to the eye too; they only point at the dot.
  - **Symbol:** go back to the perspective idea of the first build, the word's fragments spread
    through depth and seen in perspective, and refine it. Use fewer and larger fragments, no
    slivers, a clear silhouette, and SMASH almost assembling, so the trompe l'oeil is the logo.
    Not the flat fan of a few thick shards from the revision.
  - **Wordmark:** the aligned word, clean, with no dot.
  - Keep the refinements that were good (crisper snap, longer hold, light on the planes).
- **06 Crack Line is skipped** (confirmed again, 17:10).
- **00 Original, the lockup: LIKED** (18:08). "I like how the middle word follows the logo
  centre." These are the three lines set in GT Sectra beside the mark:
  - "Immersive experience studio" on the top bar;
  - "Installations, projection, stages" on the crossbar, at the mark's centre;
  - "Stockholm" (italic) on the bottom bar.

  Keep exactly this logic: the lines sit on the mark's solid bands, and the middle line follows
  the crossbar. Protect it from critique. If the crossbar moves (the generator), the middle line
  moves with it. The modular mark has the same three bars (bar, slot, bar, slot, bar), so its
  lockup follows the same rule.
- **03 Impact, 2026-09-28 17:15:** "impact is interesting as well and we can have more
  variables … and maybe it can have a 3d version as well." He means the revised asymmetric
  cluster, not the web. Keep that direction. An **Impact lab** tool will be built after the
  chapter is final, with a panel of variables and a 3D mode, driving the chapter's own generator.
  So the reviser should:
  - keep the fracture generator a clean, exported, pure function of one rule object, with named
    variables: seed, shard count, spread (the angle of the fan), direction, reach and length
    variance, width, the gap, a hole or no hole, lift and separation, rotation jitter;
  - document each variable's range in the module, so a panel can drive it, and 3D can extrude
    its polygons.
  - Nothing else changes for the chapter.
- **00 Original, the S M symbol: sketches** in
  `web/.identity-shots/original-sm/sm-variants.png` (the source is `sm-variants.html` beside it).
  Note that the first build replaced Jonas's crop with the whole block; bring the crop back.
  - **A:** his crop, taken through the M. The S's slots run out of the top and bottom as in the
    crop he liked; the M's two slots stop under a top bar, with round ends. That gives 9 × 5 bands
    of the mark, wide.
  - **B:** the same, squared, with taller bars.
  - **C:** the mark itself, S and M only, squared.
  - **Jonas picked A (2026-09-28 17:00).** A is the symbol, and the favicon and lockup follow
    it. Drop B and C from the page. Match the sketch's geometry: the mark's own measures (slot
    20, bar 31.78, bend radius 10 on the centre line, the M's slot ends round), with 9 × 5 bands:
    about 239 × 135 units.
- **01 Struck:** "interesting". Jonas wants it to go towards projection mapping: warping the mark
  through mapping points. That is being built separately, as a tool (`mapping.js`, after chapter
  00). The Struck chapter goes on as specified. Where it helps, show the lean as a mapping warp:
  the grid and its points visible in the motion.
- **00 Original: liked.** The S M symbol from the crop of the mark (see above), and the live
  mark (glass, flat and 3D, extruded, in lab.js and extrude.js, which Jonas also likes) sit next
  to it.

## Rules every direction obeys

- SMASH in capitals, and it must read as SMASH at 200 px wide.
- The symbol must hold at 32 px, and still be something at 16 px.
- Works in one colour first; colour and light enhance but are never needed to read.
- Dynamism shows in the still form (diagonals, asymmetry, implied motion) and in motion.
- Glass is the association, not the illustration: no clip-art cracks, no bevels, glows or
  lens flares standing in for an idea.
- Generative parts are seeded; the canonical logo is one fixed seed, so it is reproducible.
- Grounds: ink `#0e0c0b` and paper `#ecebe6`. Existing SMASH palette for reference: brown
  `#1f1915`, cream `#f3efe8`, SMASH yellow `#f7be04`. Ash's example uses an electric blue.

## Build

Everything is drawn in code, parametric like `web/src/js/mark.js`, so the marks can move.

- `web/src/identity/index.html`: the live page. It has a cover, six chapters and a
  side-by-side comparison. It's served at `/identity/` (a passthrough copy).
- `web/src/identity/deck.html`: the same modules laid out as 1920×1080 slides; printed to
  PDF with headless Chromium (`web/scripts/identity-pdf.py`).
- `web/src/identity/directions/<slug>.js`: one module per direction, and the only file its
  builder touches. The contract is in `web/src/identity/README.md`.
- `web/src/identity/img/`: twelve project pictures (1280 px webp) for the applications.

Workflow: one builder per direction in parallel. Two critics with different lenses follow:
art direction (brand fit, craft, legibility, distinctiveness) and motion and system (dynamism,
behaviour, bugs, mobile). Then a revise pass and a second critique and revise round. Last, a
cross-direction pass checks that the six are genuinely different and equally deep, and the PDF
is exported.

Type comes from Jonas's font library: the installed copies in ~/Library/Fonts first, because the
shared Drive library is online-only and slow. Font files are copied next to each module and kept
out of git, since they are licensed; trials are marked as such.

Every mark is also exported as plain vector SVG for Illustrator, to `identity/<nn>-<slug>/`
(`web/scripts/identity-export.py`), with motion frames and the application as PNG.

## After

Ash picks two or three; those get developed (full alphabet, motion guidelines, applications).
