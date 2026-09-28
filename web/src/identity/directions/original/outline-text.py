"""Set a few lines of type as outlines, for the lockups' plain-vector stills.

The typeface is still to be chosen: the lines are set in Neue Montreal
Regular, the page's own neutral face, as a placeholder.

  python3 web/src/identity/directions/original/outline-text.py

Shapes each line with HarfBuzz (hb-shape: kerning, ligatures), draws its glyphs
with fontTools, and writes outlines.js next to this file: per line, one path
in em units (1 em = 1000, baseline at y 0, y down) using only absolute M, L,
Q, C and Z, so the module can scale and place it by transforming (x, y) pairs.
Also the font's cap height, x-height and the line's advance width.
Change LINES and run it again when the copy changes.
"""

import json
import subprocess
from pathlib import Path

from fontTools.pens.basePen import BasePen
from fontTools.ttLib import TTFont

HERE = Path(__file__).resolve().parent
LIB = Path.home() / 'Library/Fonts'

FONTS = {
    'regular': LIB / 'NeueMontreal-Regular.ttf',
}

# The lockups' lines, one per solid band: (font, text, tracking in 1/1000 em).
# The lockup (the block): studio, middle, stockholm. The S M's lockup: name,
# studio, stockholm.
LINES = {
    'studio': ('regular', 'Immersive experience studio'),
    'middle': ('regular', 'Installations, projection, stages'),
    'stockholm': ('regular', 'Stockholm'),
    'name': ('regular', 'SMASH', 40),
}


class Pen(BasePen):
    """Absolute M, L, Q, C, Z only, scaled to 1000 per em and flipped to y down."""

    def __init__(self, glyphset, k, dx):
        super().__init__(glyphset)
        self.k, self.dx, self.d = k, dx, []

    def p(self, pt):
        return f'{round(pt[0] * self.k + self.dx, 1):g} {round(-pt[1] * self.k, 1):g}'

    def _moveTo(self, pt):
        self.d.append('M' + self.p(pt))

    def _lineTo(self, pt):
        self.d.append('L' + self.p(pt))

    def _qCurveToOne(self, p1, p2):
        self.d.append('Q' + self.p(p1) + ' ' + self.p(p2))

    def _curveToOne(self, p1, p2, p3):
        self.d.append('C' + self.p(p1) + ' ' + self.p(p2) + ' ' + self.p(p3))

    def _closePath(self):
        self.d.append('Z')


def outline(key, text, track=0):
    path = FONTS[key]
    font = TTFont(path)
    upm = font['head'].unitsPerEm
    k = 1000 / upm
    shaped = json.loads(subprocess.run(
        ['hb-shape', '--output-format=json', '--no-glyph-names', str(path), text],
        capture_output=True, text=True, check=True).stdout)
    order = font.getGlyphOrder()
    gs = font.getGlyphSet()
    x = 0
    parts = []
    for i, g in enumerate(shaped):
        pen = Pen(gs, k, (x + g['dx']) * k)
        gs[order[g['g']]].draw(pen)
        parts.append(''.join(pen.d))
        x += g['ax'] + (track * upm / 1000 if i < len(shaped) - 1 else 0)
    os2 = font['OS/2']
    return {
        'd': ''.join(parts),
        'advance': round(x * k, 1),
        'cap': round(os2.sCapHeight * k, 1),
        'xh': round(os2.sxHeight * k, 1),
    }


def main():
    out = {name: outline(key, text, *rest) | {'text': text, 'font': FONTS[key].name} for name, (key, text, *rest) in LINES.items()}
    js = ('// Written by outline-text.py: lines of Neue Montreal (a placeholder) as outlines, 1000 per em,\n'
          '// baseline at y 0. Edit LINES there and run it again; don\'t edit this by hand.\n\n'
          f'export const OUTLINES = {json.dumps(out, indent=1)};\n')
    (HERE / 'outlines.js').write_text(js)
    for n, o in out.items():
        print(n, o['font'], 'advance', o['advance'], 'cap', o['cap'], 'x', o['xh'], len(o['d']), 'chars')


if __name__ == '__main__':
    main()
