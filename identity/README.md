# SMASH identity, as files

The marks from `/identity/` (`web/src/identity/`), exported for Illustrator, in black and white.

- `00-original/`: the mark, the S M symbol, the favicons, the lockups (the type is a placeholder)
  and the motion. `modular/` holds the modular mark; `shapes/` the building blocks (`kit/`), the symbols
  built from them (`symbols/`, with all of them on one sheet) and the patterns' seamless tiles (`patterns/`).
- `01-struck/`: Struck's lean (off /identity since 2026-09-30; kept).

In each folder:

- `wordmark.svg`, `symbol.svg`, `lockup.svg` (and `lockup-sm.svg`): the masters, black, no ground.
- `*-on-ink.svg`, `*-on-paper.svg`: on black or white. The ground is its own rectangle
  (`id="ground"`), easy to delete.
- `favicon-16.svg`, `favicon-32.svg`, `favicon-64.svg`: drawn for their size.
- `motion/t0.0.png` … `t1.0.png`: the motion, eleven frames at 1920 × 1080.

Every SVG is plain vector: paths with real colours and a width and height, with no text, CSS,
filters or masks. The source is code (`web/src/identity/`): edit it there and export again.

```sh
python3 web/scripts/identity-export.py [slug ...]    # from the repo root; all chapters without a slug
```

The export starts its own static server (port 8765 on `web/src`).
