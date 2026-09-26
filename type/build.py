"""
SMASH Slot: the typeface drawn from the SMASH mark, built from its rules.

Every letter is a small grid of cells on the mark's own measures (see
web/src/js/mark.js): columns alternate bar and slot (1, 2 or 3 bars), rows
are top rail, upper stem, upper strip, middle rail, lower strip, lower stem
and bottom rail. The outline of the inked cells is traced, and every inside
corner is rounded the way the mark's are: a half circle where a counter ends
against the top or bottom (flat against the middle rail, as in the logo's A
and H), a sideways half circle where a counter ends against a bar, and the
outer corner of every bend as wide as a slot.

Three axes, all straight lines in the mark's numbers, so seven masters
interpolate exactly:
  wght  slot width (24 light, 20 the logo, 12 heavy)
  wdth  bar pitch  (48 narrow, 51.78 the logo, 60 wide)
  CRSB  where the crossbar sits (180 high, 235.5 the logo, 300 low)

  .venv/bin/python build.py          writes build/ (UFOs, designspace, .glyphs, fonts)
"""

import math
import subprocess
from pathlib import Path

import ufoLib2
from fontTools.designspaceLib import AxisDescriptor, DesignSpaceDocument, SourceDescriptor, InstanceDescriptor

OUT = Path(__file__).parent / 'build'
H = 471  # the mark's height, in its units
INSET = 42  # where closed slot ends stop, from top and bottom
GAP = 52  # between the two crossbar slots
UPM = 1000
CAP = 700
K = CAP / H  # mark units to font units
KAPPA = 0.5523  # a quarter circle as one cubic

# The letters, as in type/smash-slot-specimen.html. # is ink.
G = {
    'A': '###/#.#/#.#/###/#.#/#.#/#.#', 'B': '###/#.#/#.#/##./#.#/#.#/###', 'C': '###/#.#/#../#../#../#.#/###',
    'D': '##./#.#/#.#/#.#/#.#/#.#/##.', 'E': '###/#.#/#../###/#../#.#/###', 'F': '###/#.#/#../###/#../#../#..',
    'G': '###/#.#/#../#.#/#.#/#.#/###', 'H': '#.#/#.#/#.#/###/#.#/#.#/#.#', 'I': '#/#/#/#/#/#/#',
    'J': '..#/..#/..#/..#/#.#/#.#/###', 'K': '#.#../#.#../#.#../#####/#...#/#...#/#...#', 'L': '#../#../#../#../#../#../###',
    'M': '#####/#.#.#/#.#.#/#.#.#/#.#.#/#.#.#/#.#.#', 'N': '###/#.#/#.#/#.#/#.#/#.#/#.#', 'O': '###/#.#/#.#/#.#/#.#/#.#/###',
    'P': '###/#.#/#.#/###/#../#../#..', 'Q': '###../#.#../#.#../#.#../#.#../#.#../#####', 'R': '###../#.#../#.#../#####/#...#/#...#/#...#',
    'S': '###/#.#/#../###/..#/#.#/###', 'T': '#####/..#../..#../..#../..#../..#../..#..', 'U': '#.#/#.#/#.#/#.#/#.#/#.#/###',
    'V': '#...#/#...#/#...#/#...#/#...#/##.##/.###.', 'W': '#.#.#/#.#.#/#.#.#/#.#.#/#.#.#/#.#.#/#####',
    'X': '#...#/#...#/#####/..#../#####/#...#/#...#', 'Y': '#...#/#...#/#...#/#####/..#../..#../..#..', 'Z': '###/..#/..#/###/#../#../###',
    '0': '##./#.#/#.#/#.#/#.#/#.#/.##', '1': '###/#.#/..#/..#/..#/..#/..#', '2': '###/#.#/..#/###/#../#../###',
    '3': '###/#.#/..#/.##/..#/#.#/###', '4': '#.#/#.#/#.#/###/..#/..#/..#', '5': '###/#../#../###/..#/#.#/###',
    '6': '###/#../#../###/#.#/#.#/###', '7': '###/..#/..#/###/#../#../#..', '8': '###/#.#/#.#/###/#.#/#.#/###',
    '9': '###/#.#/#.#/###/..#/..#/###',
    '.': '././././././#', '-': '.../.../.../###/.../.../...', "'": '#/#/././././.', ':': './././#/././#',
    '!': '#/#/#/#/#/./#', '?': '###/#.#/..#/###/#../.../#..',
}
NAMES = {'.': 'period', '-': 'hyphen', "'": 'quotesingle', ':': 'colon', '!': 'exclam', '?': 'question',
         **{d: n for d, n in zip('0123456789', ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'])}}


def grid(rows, slot, pitch, crossbar):
    """Column and row edges, in mark units (y down)."""
    n = len(rows[0])
    xs = [0.0]
    for c in range(n):
        xs.append(xs[-1] + (slot if c % 2 else pitch - slot))
    up, lo = crossbar - GAP / 2, crossbar + GAP / 2
    ys = [0, INSET - slot / 2, up - slot / 2, up + slot / 2, lo - slot / 2, lo + slot / 2, H - INSET + slot / 2, H]
    return xs, ys


def trace(rows):
    """The inked cells' outline as loops of grid points (row line, column line),
    ink on the right of every step (clockwise on screen)."""
    n = len(rows[0])
    ink = lambda r, c: 0 <= r < 7 and 0 <= c < n and rows[r][c] == '#'
    edges = set()
    for r in range(7):
        for c in range(n):
            if not ink(r, c):
                continue
            for a, b in [((r, c), (r, c + 1)), ((r, c + 1), (r + 1, c + 1)), ((r + 1, c + 1), (r + 1, c)), ((r + 1, c), (r, c))]:
                if (b, a) in edges:
                    edges.discard((b, a))
                else:
                    edges.add((a, b))
    starts = {}
    for a, b in edges:
        starts.setdefault(a, []).append(b)
    loops = []
    while starts:
        a0 = min(starts)  # the same start in every master
        loop, a, prev = [a0], a0, None
        while True:
            outs = starts[a]
            if len(outs) > 1 and prev:  # where two loops touch, keep turning right
                d = (a[0] - prev[0], a[1] - prev[1])
                right = (d[1], -d[0])
                outs.sort(key=lambda b: (b[0] - a[0], b[1] - a[1]) != right)
            b = outs.pop(0)
            if not outs:
                del starts[a]
            prev, a = a, b
            if a == a0:
                break
            loop.append(a)
        # Drop points in the middle of straight runs.
        keep = []
        for i, p in enumerate(loop):
            q, s = loop[i - 1], loop[(i + 1) % len(loop)]
            if (p[0] - q[0], p[1] - q[1]) != (0, 0) and _dir(q, p) != _dir(p, s):
                keep.append(p)
        loops.append(keep)
    return loops, ink


def _dir(a, b):
    return ((b[0] > a[0]) - (b[0] < a[0]), (b[1] > a[1]) - (b[1] < a[1]))


def glyph_contours(rows, slot, pitch, crossbar):
    """Contours in font units (y up), each a list of (x, y, type) points."""
    xs, ys = grid(rows, slot, pitch, crossbar)
    loops, ink = trace(rows)
    out = []
    for loop in loops:
        pts = []
        m = len(loop)
        for i, v in enumerate(loop):
            a, b = loop[i - 1], loop[(i + 1) % m]
            din, dout = _dir(a, v), _dir(v, b)  # (drow, dcol)
            vx, vy = xs[v[1]], ys[v[0]]
            # A left turn (screen) is an inside corner of the ink.
            cross = din[1] * dout[0] - din[0] * dout[1]
            rad = 0
            if cross < 0:
                q = (dout[0] - din[0], dout[1] - din[1])  # the open quadrant, from v
                r = v[0] - 1 if q[0] < 0 else v[0]
                c = v[1] - 1 if q[1] < 0 else v[1]
                dy = 1 if q[0] < 0 else -1  # v is at this side of the open cell
                dx = 1 if q[1] < 0 else -1
                w, h = xs[c + 1] - xs[c], ys[r + 1] - ys[r]
                if ink(r, c - dx):
                    rad = 0 if r + dy == 3 else w / 2  # a counter's end, up or down
                elif ink(r - dy, c):
                    rad = h / 2  # a counter's end, sideways
                else:
                    rad = slot  # a bend
            if rad <= 0:
                pts.append((vx, vy, 'line'))
                continue
            ex, ey = din[1], din[0]  # unit step in (x, y) coming in
            fx, fy = dout[1], dout[0]  # going out
            A = (vx - rad * ex, vy - rad * ey)
            B = (vx + rad * fx, vy + rad * fy)
            if not pts or (abs(pts[-1][0] - A[0]) > 1e-6 or abs(pts[-1][1] - A[1]) > 1e-6):
                pts.append((A[0], A[1], 'line'))
            pts.append((A[0] + KAPPA * rad * ex, A[1] + KAPPA * rad * ey, None))
            pts.append((B[0] - KAPPA * rad * fx, B[1] - KAPPA * rad * fy, None))
            pts.append((B[0], B[1], 'curve'))
        # A last point on top of the first (two half circles meeting) goes.
        if len(pts) > 1 and pts[-1][2] and abs(pts[-1][0] - pts[0][0]) < 1e-6 and abs(pts[-1][1] - pts[0][1]) < 1e-6 and pts[0][2] == 'line':
            pts = pts[1:]
            pts[-1] = (pts[-1][0], pts[-1][1], 'curve')
        out.append([(x * K, (H - y) * K, t) for x, y, t in pts])
    return out, xs[-1] * K


def write_master(path, slot, pitch, crossbar, style):
    ufo = ufoLib2.Font()
    ufo.info.familyName = 'SMASH Slot'
    ufo.info.styleName = style
    ufo.info.unitsPerEm = UPM
    ufo.info.capHeight = CAP
    ufo.info.xHeight = CAP
    ufo.info.ascender = 800
    ufo.info.descender = -200
    ufo.info.copyright = 'SMASH'
    side = slot / 2 * K
    for ch, table in G.items():
        rows = table.split('/')
        name = NAMES.get(ch, ch)
        g = ufo.newGlyph(name)
        if ch.isalpha():
            g.unicodes = [ord(ch), ord(ch.lower())]
        else:
            g.unicodes = [ord(ch)]
        contours, width = glyph_contours(rows, slot, pitch, crossbar)
        pen = g.getPointPen()
        for pts in contours:
            pen.beginPath()
            for x, y, t in pts:
                pen.addPoint((round(x + side, 2), round(y, 2)), segmentType=t)
            pen.endPath()
        g.width = round(width + 2 * side, 2)
    space = ufo.newGlyph('space')
    space.unicodes = [0x20]
    space.width = round(pitch * K, 2)
    nd = ufo.newGlyph('.notdef')
    nd.width = round(2 * pitch * K, 2)
    ufo.glyphOrder = ['.notdef', 'space'] + [NAMES.get(c, c) for c in G]
    ufo.save(path, overwrite=True)


def main():
    OUT.mkdir(exist_ok=True)
    LOGO = dict(slot=20, pitch=51.78, crossbar=235.5)
    masters = [
        ('Regular', LOGO, dict(wght=500, wdth=100, CRSB=235.5)),
        ('Light', {**LOGO, 'slot': 24}, dict(wght=300, wdth=100, CRSB=235.5)),
        ('Heavy', {**LOGO, 'slot': 12}, dict(wght=800, wdth=100, CRSB=235.5)),
        ('Narrow', {**LOGO, 'pitch': 48}, dict(wght=500, wdth=93, CRSB=235.5)),
        ('Wide', {**LOGO, 'pitch': 60}, dict(wght=500, wdth=116, CRSB=235.5)),
        ('High', {**LOGO, 'crossbar': 180}, dict(wght=500, wdth=100, CRSB=180)),
        ('Low', {**LOGO, 'crossbar': 300}, dict(wght=500, wdth=100, CRSB=300)),
    ]
    doc = DesignSpaceDocument()
    for tag, name, lo, default, hi in [('wght', 'Weight', 300, 500, 800), ('wdth', 'Width', 93, 100, 116), ('CRSB', 'Crossbar', 180, 235.5, 300)]:
        a = AxisDescriptor()
        a.tag, a.name, a.minimum, a.default, a.maximum = tag, name, lo, default, hi
        doc.addAxis(a)
    for style, p, loc in masters:
        path = OUT / f'SMASHSlot-{style}.ufo'
        write_master(path, style=style, **p)
        src = SourceDescriptor()
        src.path = str(path)
        src.name = style
        src.familyName = 'SMASH Slot'
        src.styleName = style
        src.location = {'Weight': loc['wght'], 'Width': loc['wdth'], 'Crossbar': loc['CRSB']}
        doc.addSource(src)
    for style, w in [('Light', 300), ('Regular', 500), ('Bold', 650), ('Heavy', 800)]:
        inst = InstanceDescriptor()
        inst.familyName, inst.styleName = 'SMASH Slot', style
        inst.location = {'Weight': w, 'Width': 100, 'Crossbar': 235.5}
        doc.addInstance(inst)
    ds = OUT / 'SMASHSlot.designspace'
    doc.write(ds)
    venv = Path(__file__).parent / '.venv' / 'bin'
    subprocess.run([str(venv / 'fontmake'), '-m', str(ds), '-o', 'variable', '--output-dir', str(OUT / 'fonts'), '--no-production-names'], check=True)
    subprocess.run([str(venv / 'ufo2glyphs'), str(ds), '--output-path', str(OUT / 'SMASHSlot.glyphs')], check=True)


if __name__ == '__main__':
    main()
