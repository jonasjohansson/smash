"""
SMASH: the typeface drawn from the SMASH mark, built from its rules.

Every letter is a small grid of cells on the mark's own measures (see
web/src/js/mark.js): columns alternate bar and slot (1, 2 or 3 bars), rows
are top rail, upper stem, upper strip, middle rail, lower strip, lower stem
and bottom rail, and for Q a tail row under the baseline, a rail deep (so
that Q is no wider than O). The outline of the inked cells is traced, and
every inside corner is rounded the way the mark's are: a half circle where a
counter ends against the top or bottom (flat against the middle rail, as in
the logo's A and H), a sideways half circle where a counter ends against a
bar, and the outer corner of every bend as wide as a slot. G breaks the grid a
little: the end of its lower stroke turns in towards its back, a wedge three
quarters of a slot long, so that it reads as G and not C. X is cut into five
columns, so that its waist can be a bar wide and it no wider than the rest.

Five axes, all straight lines in the mark's numbers, so ten masters
interpolate exactly:
  wght  slot width (24 light, 20 the logo, 12 heavy)
  wdth  bar pitch  (48 narrow, 51.78 the logo, 60 wide)
  CRSB  where the crossbar sits (180 high, 235.5 the logo, 300 low)
  ROND  the rounding, of the mark's (0 square, 100 the logo)
  HGHT  the letters' height (360 squat, 471 the logo, 560 tall), the
        crossbar keeping its place in the middle

  .venv/bin/python build.py          writes build/ (UFOs, designspace, .glyphs, fonts)
                                     and the files the site offers (web/src/typeface/)
"""

import math
import shutil
import subprocess
from pathlib import Path

import ufoLib2
from fontTools.designspaceLib import AxisDescriptor, DesignSpaceDocument, SourceDescriptor, InstanceDescriptor

OUT = Path(__file__).parent / 'build'
SITE = Path(__file__).parent.parent / 'web' / 'src' / 'typeface'  # offered on /typeface/
H = 471  # the mark's height, in its units
INSET = 42  # where closed slot ends stop, from top and bottom
GAP = 52  # between the two crossbar slots
UPM = 1000
CAP = 700
K = CAP / H  # mark units to font units
KAPPA = 0.5523  # a quarter circle as one cubic

# The letters, as in type/specimen.html. # is ink.
G = {
    'A': '###/#.#/#.#/###/#.#/#.#/#.#', 'B': '###/#.#/#.#/##./#.#/#.#/###', 'C': '###/#.#/#../#../#../#.#/###',
    'D': '##./#.#/#.#/#.#/#.#/#.#/##.', 'E': '###/#.#/#../###/#../#.#/###', 'F': '###/#.#/#../###/#../#../#..',
    'G': '###/#.#/#../#.#/#.#/#.#/###', 'H': '#.#/#.#/#.#/###/#.#/#.#/#.#', 'I': '#/#/#/#/#/#/#',
    'J': '..#/..#/..#/..#/#.#/#.#/###', 'K': '#.#/#.#/##./#../##./#.#/#.#', 'L': '#../#../#../#../#../#../###',
    'M': '#####/#.#.#/#.#.#/#.#.#/#.#.#/#.#.#/#.#.#', 'N': '###/#.#/#.#/#.#/#.#/#.#/#.#', 'O': '###/#.#/#.#/#.#/#.#/#.#/###',
    'P': '###/#.#/#.#/###/#../#../#..', 'Q': '###/#.#/#.#/#.#/#.#/#.#/###/..#', 'R': '###/#.#/#.#/##./#.#/#.#/#.#',
    'S': '###/#.#/#../###/..#/#.#/###', 'T': '#####/..#../..#../..#../..#../..#../..#..', 'U': '#.#/#.#/#.#/#.#/#.#/#.#/###',
    'V': '#.#/#.#/#.#/#.#/#.#/#.#/.#.', 'W': '#.#.#/#.#.#/#.#.#/#.#.#/#.#.#/#.#.#/#####',
    'X': '##.##/##.##/.###./.###./.###./##.##/##.##', 'Y': '#...#/#...#/#...#/#####/..#../..#../..#..', 'Z': '###/..#/..#/###/#../#../###',
    '0': '##./#.#/#.#/#.#/#.#/#.#/.##', '1': '###/#.#/..#/..#/..#/..#/..#', '2': '###/#.#/..#/###/#../#../###',
    '3': '###/#.#/..#/.##/..#/#.#/###', '4': '#.#/#.#/#.#/###/..#/..#/..#', '5': '###/#../#../###/..#/#.#/###',
    '6': '###/#../#../###/#.#/#.#/###', '7': '###/..#/..#/###/#../#../#..', '8': '###/#.#/#.#/###/#.#/#.#/###',
    '9': '###/#.#/#.#/###/..#/..#/###',
    '.': '././././././#', '-': '.../.../.../###/.../.../...', "'": '#/#/././././.', ':': './././#/././#',
    '!': '#/#/#/#/#/./#', '?': '###/#.#/..#/###/#../.../#..',
}
# The wide R, K, V and X that came first, as a stylistic set (ss01).
ALTS = {
    'R': '###../#.#../#.#../#####/#...#/#...#/#...#', 'K': '#.#../#.#../#.#../#####/#...#/#...#/#...#',
    'V': '#...#/#...#/#...#/#...#/#...#/##.##/.###.', 'X': '#...#/#...#/#####/..#../#####/#...#/#...#',
}
# Letters whose dot sits a slot under the stroke: the lower stem row shrinks
# to that gap, the stroke running down to it.
DOTTED = {'!', '?'}
# Letters on columns of their own: X's two bars are each cut in two, so that
# its waist (the inner halves and the slot between) is as wide as a bar.
COLS = {'X': lambda slot, pitch: [pitch / 2, pitch / 2 - slot, slot, pitch / 2 - slot, pitch / 2]}
# Where a stroke's end turns in: the grid point at the top of the stroke's
# inner side (row line, column line), and how far in, in slots.
SPURS = {'G': ((3, 2), 0.75)}

NAMES = {'.': 'period', '-': 'hyphen', "'": 'quotesingle', ':': 'colon', '!': 'exclam', '?': 'question',
         **{d: n for d, n in zip('0123456789', ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'])}}


def grid(rows, slot, pitch, crossbar, dotted=False, cols=None, height=H):
    """Column and row edges, in mark units (y down)."""
    n = len(rows[0])
    widths = cols(slot, pitch) if cols else [slot if c % 2 else pitch - slot for c in range(n)]
    xs = [0.0]
    for w in widths:
        xs.append(xs[-1] + w)
    up, lo = crossbar - GAP / 2, crossbar + GAP / 2
    ys = [0, INSET - slot / 2, up - slot / 2, up + slot / 2, lo - slot / 2, lo + slot / 2, height - INSET + slot / 2, height]
    if len(rows) > 7:  # a tail under the baseline, a rail deep
        ys.append(height + INSET - slot / 2)
    if dotted:
        ys[5] = ys[6] - slot
    return xs, ys


def trace(rows):
    """The inked cells' outline as loops of grid points (row line, column line),
    ink on the right of every step (clockwise on screen)."""
    n, m = len(rows[0]), len(rows)
    ink = lambda r, c: 0 <= r < m and 0 <= c < n and rows[r][c] == '#'
    edges = set()
    for r in range(m):
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
            # Where ink meets ink only at a corner, turn left: the two become one
            # outline, and both corners there are rounded as inside corners
            # (as in the specimen), joining them.
            if len(outs) > 1 and prev:
                d = (a[0] - prev[0], a[1] - prev[1])
                left = (-d[1], d[0])
                outs.sort(key=lambda b: (b[0] - a[0], b[1] - a[1]) != left)
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


def _near(p, q):
    return abs(p[0] - q[0]) < 1e-6 and abs(p[1] - q[1]) < 1e-6


def glyph_contours(rows, slot, pitch, crossbar, dotted=False, spur=None, cols=None, height=H, rounding=1.0):
    """Contours in font units (y up), each a list of (x, y, type) points.
    `rounding` scales every rounded corner (0 square, 1 the mark's); which
    points there are is decided at full rounding, so every master has the
    same ones and they interpolate."""
    xs, ys = grid(rows, slot, pitch, crossbar, dotted, cols, height)
    loops, ink = trace(rows)
    out = []
    for loop in loops:
        pts, full = [], []  # the points, and where they would be at full rounding
        m = len(loop)
        for i, v in enumerate(loop):
            a, b = loop[i - 1], loop[(i + 1) % m]
            din, dout = _dir(a, v), _dir(v, b)  # (drow, dcol)
            vx, vy = xs[v[1]], ys[v[0]]
            if spur and v == spur[0]:
                # The stroke's end turns in: up its inner side to a quarter
                # circle, which runs in to a point level with its top.
                r = spur[1] * slot
                wedge = [(vx, vy + r, 'line'), (vx, vy + r - KAPPA * r, None), (vx - r + KAPPA * r, vy, None), (vx - r, vy, 'curve')]
                pts += wedge
                full += wedge
                continue
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
                full.append((vx, vy, 'line'))
                continue
            ex, ey = din[1], din[0]  # unit step in (x, y) coming in
            fx, fy = dout[1], dout[0]  # going out

            def corner(r):
                A = (vx - r * ex, vy - r * ey)
                B = (vx + r * fx, vy + r * fy)
                return [(A[0], A[1], 'line'), (A[0] + KAPPA * r * ex, A[1] + KAPPA * r * ey, None),
                        (B[0] - KAPPA * r * fx, B[1] - KAPPA * r * fy, None), (B[0], B[1], 'curve')]
            whole, now = corner(rad), corner(rad * rounding)
            # Two half circles meeting: the curve starts where the last ended.
            skip = 1 if full and _near(full[-1], whole[0]) else 0
            pts += now[skip:]
            full += whole[skip:]
        # A last point on top of the first (two half circles meeting) goes.
        if len(full) > 1 and full[-1][2] and _near(full[-1], full[0]) and full[0][2] == 'line':
            pts = pts[1:]
            pts[-1] = (pts[-1][0], pts[-1][1], 'curve')
        out.append([(x * K, (height - y) * K, t) for x, y, t in pts])
    return out, xs[-1] * K


def write_master(path, slot, pitch, crossbar, style, height=H, rounding=1.0):
    ufo = ufoLib2.Font()
    ufo.info.familyName = 'SMASH'
    ufo.info.styleName = style
    ufo.info.unitsPerEm = UPM
    ufo.info.capHeight = round(height * K)
    ufo.info.xHeight = round(height * K)
    ufo.info.ascender = 850  # room for the tallest
    ufo.info.descender = -200
    ufo.info.copyright = 'SMASH'
    side = slot / 2 * K
    glyphs = [(ch, NAMES.get(ch, ch), table) for ch, table in G.items()]
    glyphs += [(ch, f'{ch}.ss01', table) for ch, table in ALTS.items()]
    for ch, name, table in glyphs:
        rows = table.split('/')
        g = ufo.newGlyph(name)
        if name.endswith('.ss01'):
            pass  # reached through ss01 only
        elif ch.isalpha():
            g.unicodes = [ord(ch), ord(ch.lower())]
        else:
            g.unicodes = [ord(ch)]
        contours, width = glyph_contours(rows, slot, pitch, crossbar, ch in DOTTED, SPURS.get(ch),
                                         COLS.get(ch) if not name.endswith('.ss01') else None, height, rounding)
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
    ufo.glyphOrder = ['.notdef', 'space'] + [name for _, name, _ in glyphs]
    subs = ' '.join(f'sub {ch} by {ch}.ss01;' for ch in ALTS)
    ufo.features.text = f'feature ss01 {{ {subs} }} ss01;\n'
    ufo.save(path, overwrite=True)


def main():
    OUT.mkdir(exist_ok=True)
    LOGO = dict(slot=20, pitch=51.78, crossbar=235.5, height=H, rounding=1.0)
    AT = dict(wght=500, wdth=100, CRSB=235.5, ROND=100, HGHT=H)  # the logo's place on every axis
    masters = [
        ('Regular', LOGO, {}),
        ('Light', {**LOGO, 'slot': 24}, dict(wght=300)),
        ('Heavy', {**LOGO, 'slot': 12}, dict(wght=800)),
        ('Narrow', {**LOGO, 'pitch': 48}, dict(wdth=93)),
        ('Wide', {**LOGO, 'pitch': 60}, dict(wdth=116)),
        ('High', {**LOGO, 'crossbar': 180}, dict(CRSB=180)),
        ('Low', {**LOGO, 'crossbar': 300}, dict(CRSB=300)),
        ('Square', {**LOGO, 'rounding': 0.0}, dict(ROND=0)),
        # Squat and tall, the crossbar where it is in the logo's height.
        ('Squat', {**LOGO, 'height': 360, 'crossbar': 235.5 * 360 / H}, dict(HGHT=360)),
        ('Tall', {**LOGO, 'height': 560, 'crossbar': 235.5 * 560 / H}, dict(HGHT=560)),
    ]
    axes = [('wght', 'Weight', 300, 800), ('wdth', 'Width', 93, 116), ('CRSB', 'Crossbar', 180, 300), ('ROND', 'Roundness', 0, 100), ('HGHT', 'Height', 360, 560)]
    doc = DesignSpaceDocument()
    for tag, name, lo, hi in axes:
        default = AT[tag]
        a = AxisDescriptor()
        a.tag, a.name, a.minimum, a.default, a.maximum = tag, name, lo, default, hi
        doc.addAxis(a)
    for style, p, loc in masters:
        path = OUT / f'SMASH-{style}.ufo'
        write_master(path, style=style, **p)
        src = SourceDescriptor()
        src.path = str(path)
        src.name = style
        src.familyName = 'SMASH'
        src.styleName = style
        src.location = {name: {**AT, **loc}[tag] for tag, name, _, _ in axes}
        doc.addSource(src)
    for style, w in [('Light', 300), ('Regular', 500), ('Bold', 650), ('Heavy', 800)]:
        inst = InstanceDescriptor()
        inst.familyName, inst.styleName = 'SMASH', style
        inst.location = {name: {**AT, 'wght': w}[tag] for tag, name, _, _ in axes}
        doc.addInstance(inst)
    ds = OUT / 'SMASH.designspace'
    doc.write(ds)
    venv = Path(__file__).parent / '.venv' / 'bin'
    subprocess.run([str(venv / 'fontmake'), '-m', str(ds), '-o', 'variable', '--output-dir', str(OUT / 'fonts'), '--no-production-names'], check=True)
    subprocess.run([str(venv / 'ufo2glyphs'), str(ds), '--output-path', str(OUT / 'SMASH.glyphs')], check=True)
    # What the site offers: the font, the Glyphs file, and the sources.
    SITE.mkdir(parents=True, exist_ok=True)
    shutil.copy(OUT / 'fonts' / 'SMASH-VF.ttf', SITE / 'SMASH-VF.ttf')
    shutil.copy(OUT / 'SMASH.glyphs', SITE / 'SMASH.glyphs')
    sources = OUT / 'sources'
    shutil.rmtree(sources, ignore_errors=True)
    sources.mkdir()
    for p in [ds, *OUT.glob('SMASH-*.ufo')]:
        (shutil.copytree if p.is_dir() else shutil.copy)(p, sources / p.name)
    shutil.make_archive(str(SITE / 'SMASH-sources'), 'zip', sources)


if __name__ == '__main__':
    main()
