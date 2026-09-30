"""The typography round's library fonts, as web fonts, for /typography/ on this machine.

  python3 web/scripts/typography-fonts.py        # from the repo root

Reads web/src/typography/candidates.json and, for every candidate with a
`library` entry, subsets its files from Jonas's font library (_PUBLIC/FONTS on
the shared drive, found the way the fonts skill finds it; FONTS_DIR overrides)
to Latin and Latin Extended WOFF2 in web/src/typography/fonts/, with a
library.css of @font-face rules (family "L <id>"). The folder is in git, so
the live site has them; run this again after changing candidates.json. Needs `pip install fonttools brotli`.
"""

import glob
import json
import os
import sys
from pathlib import Path

from fontTools import subset

WEB = Path(__file__).resolve().parent.parent
SRC = WEB / 'src' / 'typography'
OUT = SRC / 'fonts'
# Basic Latin, Latin-1, Latin Extended-A and B, general punctuation, the euro and a few symbols.
UNICODES = [*range(0x20, 0x250), *range(0x2000, 0x2070), 0x20AC, 0x2122, 0x2191, 0x2193, 0x2192, 0x2190, 0x2212]
RANGE = 'U+0020-024F, U+2000-206F, U+20AC, U+2122, U+2190-2193, U+2212'


def library():
    if os.environ.get('FONTS_DIR'):
        return Path(os.environ['FONTS_DIR'])
    for pat in ['~/Library/CloudStorage/GoogleDrive-*/Shared drives/_PUBLIC/FONTS', '*:/Shared drives/_PUBLIC/FONTS']:
        hits = glob.glob(os.path.expanduser(pat))
        if hits:
            return Path(hits[0])
    sys.exit('the font library was not found; set FONTS_DIR')


def woff2(src, dst):
    options = subset.Options()
    options.flavor = 'woff2'
    options.layout_features = ['*']
    options.name_IDs = ['*']
    options.notdef_outline = True
    font = subset.load_font(str(src), options)
    s = subset.Subsetter(options)
    s.populate(unicodes=UNICODES)
    s.subset(font)
    subset.save_font(font, str(dst), options)


def main():
    root = library()
    data = json.loads((SRC / 'candidates.json').read_text())
    OUT.mkdir(exist_ok=True)
    # A family in two roles (a heading and a body) is one family: all its styles together.
    families = {}
    for role in ('heading', 'body', 'detail'):
        for c in data[role]:
            if c.get('library'):
                f = families.setdefault(c['id'], {'id': c['id'], 'library': {'dir': c['library']['dir'], 'files': {}}})
                f['library']['files'].update(c['library']['files'])
    rules, missing = [], []
    for c in families.values():
        lib = c['library']
        for style, file in lib['files'].items():
            src = root / lib['dir'] / file
            if not src.exists():
                missing.append(str(src))
                continue
            weight, italic = style.rstrip('i'), style.endswith('i')
            name = f"{c['id']}-{style}.woff2"
            dst = OUT / name
            if not dst.exists() or dst.stat().st_mtime < src.stat().st_mtime:
                woff2(src, dst)
            rules.append(f'@font-face {{ font-family: "L {c["id"]}"; font-weight: {weight}; font-style: {"italic" if italic else "normal"}; '
                         f'font-display: swap; src: url({name}) format("woff2"); unicode-range: {RANGE}; }}')
        print(f"{c['id']}: {len(lib['files'])} styles")
    (OUT / 'library.css').write_text('/* Made by web/scripts/typography-fonts.py from candidates.json: the library fonts, local only. */\n' + '\n'.join(rules) + '\n')
    for m in missing:
        print('missing:', m)
    print(f'{len(rules)} faces in {OUT.relative_to(WEB.parent)}')


if __name__ == '__main__':
    main()
