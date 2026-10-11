# Slant: the mark with its curves cut straight

2026-10-11. An alternative logo and wordmark for `/identity/`, beside the original, after CM.SUPPLY's round 4
(2026-10-08, `identity/references/cm-supply-2026-10-08/`). Jonas: "i thought it was interesting with the slants
instead of the uniform inner curves, i also thought the alternate a was interesting."

## The rule

Every curve in the mark becomes a straight cut, and every cut has one slope: 8 down in 20 across (about 22°), so
every point stays on the grid of 4. The cuts all fall to the right and are parallel, so the S is still the same
upside down. Nothing else moves: the block 552 × 472, bars 32, slots 20, the pitch 52, the crossbars round 236.

1. **Slot ends.** A closed slot's round end becomes a cut across the slot. A top end's high corner is where the
   round tip is today (32 from the edge, a bar), its low corner 8 below; a bottom end is the same turned over. The obtuse
   corner gets a small round of 4 (one grid step), as in CM.SUPPLY's crop; the acute one stays sharp.
2. **S bends.** The inside of each turn stays sharp, as today. The outside, a quarter circle of 20 today, becomes a
   cut at the same slope, 20 across and 8 down.
3. **The a.** In the A's place and width, one slot at the A's column, closed at both ends and cut at the slope.
   Its slot's low corner a bar (32) above where the bowl meets the stem (a1, a2), or as the S's (a3).
   Three versions side by side:
   - a1, inside: the bowl's base curves up from the bottom-left corner into the slot; the stem on the right stands
     on the baseline, so the block's outline stays whole.
   - a2, below: the bowl dips about 12 under the baseline and swoops up to the stem, as CM.SUPPLY's.
   - a3, flat: a flat base, only the slot's ends cut.

## The set

As the original: the wordmark; the S M symbol and the S alone (as in the S M, on its side, drawn out to a
square); the lockups in Neue Montreal; favicons at 16, 32 and 64; on ink and on paper. Exported to
`identity/02-slant/` by `web/scripts/identity-export.py`.

## Where it goes

- `web/src/identity/directions/slant.js`: the chapter (the module contract in `web/src/identity/README.md`).
- `web/src/identity/directions/slant/geometry.js`: the letters, the S M and the S alone, on the original's measures
  (`directions/original/geometry.js`).
- `'slant'` added to `SLUGS` in `directions.js`, so it follows the original; `?d=slant` shows it alone.
- The Grid view shows the grid as for the original (with the small rounds' circles).

## Left out for now

Motion and the Pixel view: the chapter shows the stills and says the motion follows once a slant is chosen. The
modular mark and the sequence stay round.

## Tests

`npm test` in `web/`: every path closes; every point is on the grid of 4 (except the small rounds and the a's
swoop); the S is the same turned upside down.
