# The sequence, on the pulse: design

2026-09-29. Two new versions of the sequence (`web/src/identity/sequence/`), after a
reference Jonas found on LinkedIn (translucent blocks tumbling and restacking,
`~/Downloads/linkedin-7510329036603080704.mp4`). First a 2D one (this document); then
a 3D one, designed on its own once the 2D one is in.

The current sequence stays as it is: snappy is still the default, with `?punchy` and `?calm`.

## What the reference does

Measured frame to frame, it is a strict pulse: a hit every 0.5 s, a beat at 120 a minute,
the sequence's own tempo. Every beat has the same shape:

1. Drift: after a hit nothing stops; the blocks and the camera keep sliding, slowly.
2. Wind-up: in the last ~0.15 s before the beat, the speed builds sharply.
3. Whip: the change itself takes 2–3 frames, smeared by heavy motion blur. Blocks tip,
   restack and the camera re-angles, all at once.
4. Snap: a new arrangement lands exactly on the beat, and the drift starts again.

Nothing holds, and every beat is a new picture. The current sequence is the opposite: one
thing at a time, holds of up to 2.25 s, and the camera moving after each change.

## The 2D version: `?pulse`

The same drawing (the modular mark's geometry, flat, black and white) and the same story
(logo → modular mark → S M → S → ! → square → logo), told as a pulse: 8 bars, 32 beats, a
hit on every beat.

### Every beat

- **Whip**: the change is packed into the last ~0.12 s before the beat, slow off and fastest
  at the end.
- **Snap**: it lands exactly on the beat and stops dead, with no overshoot.
- **Drift**: from the hit to the next whip, the camera keeps a slow push of a few percent,
  so nothing is ever still.
- **Smear**: in the whips, each frame is the drawing at several moments across a shutter
  (a fixed ~1/40 s, the same live and in the MP4), averaged. It's real motion blur, and it only
  runs while something moves fast.

The camera reframes (zooms and pans) but never rotates, so the mark always reads straight.
Changing the angle is left to the 3D version.

### The beats

| Bar | Beats | |
|---|---|---|
| 1 | 1–4 | The logo: it lands wide; the camera punches in on the S M, across to A S H, back out. |
| 2 | 5–8 | The breaks: the S's top slot, its lower slot, the counter, the bands squashing. |
| 3 | 9–12 | A camera reframe; the crop takes the H, the S, the A: the S M. |
| 4 | 13–16 | The crop takes the M in two hits; two camera punches: the S. |
| 5 | 17–20 | The crop to the !; the camera punches on it (where the held breath was). |
| 6 | 21–24 | The drop to the square; the camera pushes in on each beat until it fills the screen. |
| 7 | 25–28 | The square is the logo's block: close-ups of it that drift, slow and tense. |
| 8 | 29–32 | The reveal in four hits: slot columns open in groups (S, M, A S, H); back to beat 1. |

**As built (after Jonas saw it):** the camera-only beats read as moving the logo around without doing
anything to it, the constant drift as a zoom, and the ! with half its stem as a colon. So every hit is now
the mark itself changing, with the camera moving only with a change; a beat with nothing to change holds
dead still; the ! drops to the square in one. 21 hits: the logo held for bar 1; the breaks and the squash;
the crop taking the H, the S, the A, the M in two; the !; the drop; the square growing to fill the screen
in two hits; the logo written back a column a beat. The smear's shutter looks ahead from each frame, so the
frame on the beat is crisp. The `/identity` section stays on the classic sequence for now.

### How it's built

- `sequence/pulse.js`: the new sequence. It exports the same things as `engine.js`
  (PERIOD, SEGMENTS, UNIT, VERSION, wrap, stateAt, draw, svgAt, viewBox, cueOf,
  loopSound, and so on), so the player, the page, the section and the MP4 use either one
  unchanged. It reuses `engine.js`'s drawing (STATES, the slots, `draw`) and camera maths
  (`fit`, `lens`, `between`), which `engine.js` now exports. Its score is 32 keyframes, one
  per beat, each a set of measures plus a framing; `stateAt(t)` is the whip into the
  keyframe of the coming beat, from the drifted framing of the last.
- `draw()` learns to open the slots column by column from given amounts (the reveal's four
  groups), next to its present per-column stagger.
- The smear: `svgAt` and the player draw several copies of the mark in an isolated group,
  each at 1/N opacity with `mix-blend-mode: plus-lighter`, so the copies add up to the true
  average coverage, on paper or on ink. The MP4 goes through the same SVG, so it smears too.
- Choosing the sequence: the page and the section load `pulse.js` or `engine.js` by
  `?pulse`, and hand it to the player (the player no longer imports `engine.js` itself).
  On the page, `p` still toggles punchy; a key for pulse gets added with it.
- The sound: one cue per beat, through `sound.js`'s existing kinds (snap, land, spring,
  sweep for the crops, follow for the camera punches, reveal for the columns), with each
  cue's hit on its beat. The reveal's four hits each pluck the notes of their columns.
- `?at=`, the arrows and `?t=` keep working: stepping goes beat by beat.

### Checking it

- Run the page with `?pulse` and look at stills with `?t=` on and between the beats.
- Measure motion energy on an MP4 export the way the reference was measured (the mean
  frame difference per frame): peaks exactly every 0.5 s, and never zero in between.
- Loop seam: the last beat lands on the first with no jump, in picture or sound.

## The 3D version: later

Designed on its own after the 2D one: the mark extruded as blocks (three.js, as in
`extrude.js`), pieces tipping over their edges and restacking, and a camera that re-angles
on the beat. It reuses the 2D version's beat map and sound.
