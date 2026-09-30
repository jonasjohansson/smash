# /typography/: headings and body text for SMASH

The typography round. The display face is SMASH's own (`/typeface/SMASH-VF.ttf`); this page looks for the
heading, body and detail (mono) faces to go with it, from Jonas's font library, each beside a Google Fonts
alternative.

- `candidates.json`: the candidates, by role. Each names its library folder and the exact files for its styles
  (the library's weight data is wrong for several families, so the files are picked by hand), its Google
  alternative (a css2 family spec, and any axis setting it needs to match), and flags: `trial` (not to ship),
  `current` (on the site now), `googleOnly`.
- `index.html`, `typography.css`, `typography.js`: the page. The pairing: SMASH's typeface as the display, with
  the chosen heading, body and detail faces, in SMASH's own copy (the studio statement, and its projects Heroes, Resonance and Jagad, as the site tells them), on the palette's earth (or black, or paper)
  with a hyper accent (the colours are `/identity/colour.js`'s). Below it every candidate as a card; a click puts
  it in the pairing. The bar switches every font between the library and its Google alternative, or shows both
  side by side. The state is in the address (`?h=&b=&d=&src=&g=&a=`), so a pairing can be sent.
- `fonts/`: the library fonts as subset WOFF2 with `library.css`, made by
  `python3 web/scripts/typography-fonts.py` (from the repo root). They are desktop licences, so the folder is
  kept out of git: they show on a machine that has run the script. Elsewhere (the live site) each library font's
  Google alternative stands in, marked "Not here".
