"""A specimen sheet for fonts from Jonas's library, to choose type by eye.

  python3 web/scripts/identity-fontsheet.py FILE [FILE ...] --out=sheet.png
      [--text=SMASH] [--ground=ink|paper] [--mark] [--caps]

FILE is a path from the index (web/.identity-shots/font-index.tsv, its `file`
column: absolute). Fonts installed on this Mac (source `local`, ~/Library/Fonts)
load at once; the shared Drive library (source `drive`) holds its files online
only, so a Drive font may take long to fetch or never arrive: it is skipped
after 20 seconds. Each font gets a row:
its file name, the sample text large, the headline, and a paragraph. With
--mark, the current SMASH mark sits above each row's headline, to judge a font
next to the original logo. Up to about 16 fonts a sheet reads well.

Find candidates with, for example:
  awk -F'\\t' '$3 ~ /Monument|Druk|Sequel/ && $5 == "otf"' web/.identity-shots/font-index.tsv
The library: Display, Mono, Sans, Script, Serif, Trials, Variable (about 440
families, 14 000 files). Files marked `trial` are for trying only.
"""

import base64
import os
import sys
from concurrent.futures import ThreadPoolExecutor, TimeoutError
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.path.insert(0, str(Path(__file__).resolve().parent))
from importlib import import_module

shoot = import_module('identity-shoot')

LIBRARY = Path.home() / 'Library/CloudStorage/GoogleDrive-j@jonasjohansson.se/Shared drives/_PUBLIC/FONTS'
WEB = Path(__file__).resolve().parent.parent
FORMATS = {'otf': 'opentype', 'ttf': 'truetype', 'woff': 'woff', 'woff2': 'woff2'}
HEADLINE = 'Smash ultimately wants to make people feel.'
BODY = ('Smash is an immersive experience studio creating physical and digital experiences that make people '
        'feel. They combine art, technology, storytelling and spatial experiences to create memorable moments.')


POOL = ThreadPoolExecutor(max_workers=4)


def resolve(f):
    p = Path(f)
    return p if p.is_absolute() else LIBRARY / f


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    opt = dict(a[2:].split('=', 1) if '=' in a else (a[2:], '1') for a in sys.argv[1:] if a.startswith('--'))
    if not args or 'out' not in opt:
        raise SystemExit(__doc__)
    text = opt.get('text', 'SMASH')
    paper = opt.get('ground', 'ink') == 'paper'
    fg, bg = ('#0e0c0b', '#ecebe6') if paper else ('#ecebe6', '#0e0c0b')
    mark = (WEB / 'src/brand/smash-logo.svg').read_text() if 'mark' in opt else ''
    faces, rows = [], []
    for i, f in enumerate(args):
        path = resolve(f)
        if not path.exists():
            rows.append(f'<div class="row"><p class="name">missing: {f}</p></div>')
            continue
        ext = path.suffix.lower().lstrip('.')
        try:
            data = base64.b64encode(POOL.submit(path.read_bytes).result(timeout=20)).decode()
        except TimeoutError:
            rows.append(f'<div class="row"><p class="name">not fetched in 20 s (online-only on Drive): {path.name}</p></div>')
            continue
        faces.append(f'@font-face {{ font-family: "F{i}"; src: url(data:font/{ext};base64,{data}) format("{FORMATS.get(ext, "opentype")}"); }}')
        caps = 'text-transform: uppercase;' if 'caps' in opt else ''
        rows.append(f'''<div class="row">
          <p class="name">{path.name}</p>
          <div class="mark">{mark}</div>
          <p class="big" style="font-family: F{i}; {caps}">{text}</p>
          <p class="head" style="font-family: F{i}">{HEADLINE}</p>
          <p class="body" style="font-family: F{i}">{BODY}</p>
        </div>''')
    html = f'''<!doctype html><html><head><meta charset="utf-8"><style>
      {''.join(faces)}
      body {{ margin: 0; background: {bg}; color: {fg}; font: 13px/1.3 -apple-system, sans-serif; width: 1600px; }}
      .row {{ display: grid; grid-template-columns: 220px {'180px ' if mark else ''}1fr; grid-template-rows: auto auto auto; column-gap: 32px; padding: 28px 40px; border-bottom: 1px solid {fg}33; }}
      .name {{ grid-row: 1 / span 3; margin: 0; opacity: 0.6; word-break: break-all; }}
      .mark {{ grid-row: 1 / span 3; display: {'block' if mark else 'none'}; }}
      .mark svg {{ width: 180px; height: auto; display: block; }}
      .big {{ margin: 0; font-size: 110px; line-height: 1; }}
      .head {{ margin: 14px 0 0; font-size: 40px; line-height: 1.05; }}
      .body {{ margin: 12px 0 0; font-size: 17px; line-height: 1.45; max-width: 80ch; }}
    </style></head><body>{''.join(rows)}</body></html>'''
    out = Path(opt['out'])
    out.parent.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        b = shoot.browser(p)
        page = b.new_page(viewport={'width': 1600, 'height': 900})
        page.set_content(html, wait_until='load')
        page.evaluate('document.fonts.ready')
        page.wait_for_timeout(300)
        page.screenshot(path=str(out), full_page=True)
        b.close()
    print(f'wrote {out} ({len(args)} fonts)')
    sys.stdout.flush()
    os._exit(0)  # a Drive read that never returns must not keep the process alive


if __name__ == '__main__':
    main()
