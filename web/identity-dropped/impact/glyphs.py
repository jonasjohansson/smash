"""Write S M A H of Scto Grotesk A Black (Schick Toikka) as path commands in font units (y up),
with advances, to letters.js, so the marks need no font at run time.

  python3 glyphs.py
"""
import json
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.boundsPen import BoundsPen

FONT = '/Users/jonas/Library/Fonts/SctoGroteskA-Black.otf'
f = TTFont(FONT)
gs = f.getGlyphSet()
cmap = f.getBestCmap()
out = {}
for ch in 'SMAH':
    g = gs[cmap[ord(ch)]]
    pen = RecordingPen()
    g.draw(pen)
    cmds = []
    for op, pts in pen.value:
        if op == 'moveTo':
            cmds.append(['M', *pts[0]])
        elif op == 'lineTo':
            cmds.append(['L', *pts[0]])
        elif op == 'curveTo':
            cmds.append(['C', *[v for p in pts for v in p]])
        elif op == 'qCurveTo':
            raise SystemExit('quadratic curves: not expected in a CFF font')
        elif op in ('closePath', 'endPath'):
            cmds.append(['Z'])
    b = BoundsPen(gs)
    g.draw(b)
    out[ch] = {'adv': g.width, 'box': list(b.bounds), 'd': cmds}

js = ['// The letters of the 03 Impact wordmark: S M A H of Scto Grotesk A Black (Schick Toikka),',
      '// as path commands in font units (cap height 694, y up). Made by glyphs.py; kept here as data',
      '// so the marks need no font. The spacing is set in impact.js.', '',
      f"export const CAP = {f['OS/2'].sCapHeight};", 'export const LETTERS = {']
for ch, g in out.items():
    js.append(f"  {ch}: {json.dumps(g, separators=(',', ':'))},")
js.append('};')
(Path(__file__).parent / 'letters.js').write_text('\n'.join(js) + '\n')
print('wrote letters.js')
