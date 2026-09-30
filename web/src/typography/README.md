# /typography/: headings and body text for SMASH

The typography round. The display face is SMASH's own (`/typeface/SMASH-VF.ttf`); this page looks for the
heading and body faces to go with it, from Jonas's font library, each beside a Google Fonts alternative. No
third face: the meta and credit lines are the body face, small and spaced (Jonas, round 1).

## Rounds

- Round 1 (2026-09-30): Jonas's ratings and notes are in `candidates.json` (`r1`, `note`) and show on the cards;
  the galleries run in that order. Top heading: Stolzl Display (4 of 5), then Sharp Grotesk, Integral and Anton;
  the contrast serifs, Druk, Monument Grotesk and GT America Expanded were set aside (1 of 5). Body: the neutral
  grotesks all at 3, Inter and Styrene B singled out, Lyon the serif with pull. The mono detail role was dropped.
  An idea for later, from the Stolzl note: a version of the logo closer to Stolzl, or the S tweaked to meet it.
- Round 2: the geometric direction Stolzl opened (Futura, ITC Avant Garde, FF Mark, Neuzeit Grotesk, Campton,
  Geomanist, Sharp Sans No. 1, Gerstner Programm, Styrene A) and Sharp Grotesk's other widths, marked New.

## Files


- `candidates.json`: the candidates, by role. Each names its library folder and the exact files for its styles
  (the library's weight data is wrong for several families, so the files are picked by hand), its Google
  alternative (a css2 family spec, and any axis setting it needs to match), and flags: `trial` (not to ship),
  `current` (on the site now), `googleOnly`, `r1` and `note` (round 1), `round: 2`.
- `index.html`, `typography.css`, `typography.js`: the page. The pairing: SMASH's typeface as the display, with
  the chosen heading and body faces, in SMASH's own copy (the studio statement, and its projects Heroes, Resonance and Jagad, as the site tells them), on the palette's earth (or black, or paper)
  with a hyper accent (the colours are `/identity/colour.js`'s). Below it every candidate as a card; a click puts
  it in the pairing. The bar switches every font between the library and its Google alternative, or shows both
  side by side. Sliders set the heading's size (in % of the stage's width) and line height and the body's size and line height, in the pairing and on the cards. The state is in the address (`?h=&b=&src=&g=&a=`, and `hs`, `hl`, `bs`, `bl` when moved), so a pairing can be sent.
- `fonts/`: the library fonts as subset WOFF2 with `library.css`, made by
  `python3 web/scripts/typography-fonts.py` (from the repo root; run it again after changing `candidates.json`).
  In git, so the live site shows them. A library font that is missing falls back to its Google alternative,
  marked "Not here".
- `feedback.js`: a rating (1–5) and a comment under every card and under the pairing (each pairing tried is kept
  on its own), free notes, and a Feedback button that gathers it all as text, best rated first, with a link to
  each rated pairing, to copy and paste into a conversation. Kept in the browser (localStorage) as you go;
  nothing is sent anywhere. Clear all takes a second click.
