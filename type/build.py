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
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.ttLib import TTFont

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

# The L and T forms (calt, on unless turned off): the letter after an L
# stands on its foot, which runs on under it; the letters either side of a T
# tuck in under its arm, which runs on over them. As the specimen sets them.
FOOTABLE = [c for c in G if c.isalnum() and c not in 'TQ']  # stands on an L's foot
TUCKABLE = [c for c in G if (c.isalnum() and c != 'T') or c == "'"]  # tucks under a T's arm
STEM = '#/#/#/#/#/#/#'
T_FORMS = {'T.left': '###/#../#../#../#../#../#..', 'T.right': '###/..#/..#/..#/..#/..#/..#', 'T.both': STEM}

NAMES = {'.': 'period', '-': 'hyphen', "'": 'quotesingle', ':': 'colon', '!': 'exclam', '?': 'question',
         **{d: n for d, n in zip('0123456789', ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'])}}


def grid(rows, slot, pitch, crossbar, dotted=False, cols=None, height=H, top=0, bottom=None):
    """Column and row edges, in mark units (y down). `top` and `bottom` move
    the outer rails in (a letter under a T's arm, or on an L's foot); the
    middle ones stay level with the line."""
    n = len(rows[0])
    widths = cols(slot, pitch) if cols else [slot if c % 2 else pitch - slot for c in range(n)]
    xs = [0.0]
    for w in widths:
        xs.append(xs[-1] + w)
    up, lo = crossbar - GAP / 2, crossbar + GAP / 2
    bottom = height if bottom is None else bottom
    rail = INSET - slot / 2
    ys = [top, top + rail, up - slot / 2, up + slot / 2, lo - slot / 2, lo + slot / 2, bottom - rail, bottom]
    if len(rows) > 7:  # a tail under the baseline, a rail deep
        ys.append(bottom + rail)
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


def joins(w, slot, pitch, height, rounding, foot=False, arm=None):
    """What joins a letter to its neighbours, as contours (mark units, y down,
    clockwise on screen), the letter's ink running from 0 to w: an L's foot
    run on under it, from the L's stem, rounded into the stem as the mark's
    bends are; or a T's arm run on over it, from the T's stem on its right
    (`before`), on its left (`after`), or both (`between`), rounded into it."""
    bar, rail = pitch - slot, INSET - slot / 2
    r = slot * rounding
    k = KAPPA * r
    o = bar / 2  # how far each join reaches into the stem it meets, so no seam shows between the two
    out = []
    if foot:
        x0, xs, yt, yb = -(bar + slot), -slot, height - rail, height
        out.append([(x0, yt, 'line'), (xs - o, yt, 'line'), (xs - o, yt - r, 'line'), (xs, yt - r, 'line'), (xs, yt - r + k, None),
                    (xs + r - k, yt, None), (xs + r, yt, 'curve'), (w, yt, 'line'), (w, yb, 'line'), (x0, yb, 'line')])
    if arm:
        left, right = arm in ('after', 'between'), arm in ('before', 'between')
        x0, x1 = (-slot if left else 0), (w + slot if right else w)
        pts = [(x0 - o if left else x0, 0, 'line'), (x1 + o if right else x1, 0, 'line')]
        if right:
            pts += [(x1 + o, rail + r, 'line'), (x1, rail + r, 'line'), (x1, rail + r - k, None), (x1 - r + k, rail, None), (x1 - r, rail, 'curve')]
        else:
            pts += [(x1, rail, 'line')]
        if left:
            pts += [(x0 + r, rail, 'line'), (x0 + r - k, rail, None), (x0, rail + r - k, None), (x0, rail + r, 'curve'), (x0 - o, rail + r, 'line')]
        else:
            pts += [(x0, rail, 'line')]
        out.append(pts)
    return out


def glyph_contours(rows, slot, pitch, crossbar, dotted=False, spur=None, cols=None, height=H, rounding=1.0,
                   tucked=False, on_foot=False, arm=None):
    """Contours in font units (y up), each a list of (x, y, type) points.
    `rounding` scales every rounded corner (0 square, 1 the mark's); which
    points there are is decided at full rounding, so every master has the
    same ones and they interpolate."""
    rail = INSET - slot / 2
    top = rail + slot if tucked else 0  # a slot under the arm
    bottom = height - rail - slot if on_foot else height  # a slot over the foot
    xs, ys = grid(rows, slot, pitch, crossbar, dotted, cols, height, top, bottom)
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
    for pts in joins(xs[-1], slot, pitch, height, rounding, on_foot, arm):
        out.append([(x * K, (height - y) * K, t) for x, y, t in pts])
    return out, xs[-1] * K


def features():
    """ss01, the first R, K, V and X; calt, the L and T forms."""
    n = lambda ch: NAMES.get(ch, ch)
    cls = lambda names: '[' + ' '.join(names) + ']'
    foot = [n(c) for c in FOOTABLE]
    tuck = [n(c) for c in TUCKABLE]
    ss01 = ' '.join(f'sub {c} by {c}.ss01;' for c in ALTS)
    return f"""feature ss01 {{ {ss01} }} ss01;

@FOOT = {cls(foot)};
@FOOT_ONL = {cls(f'{g}.onL' for g in foot)};
@BEFORE = {cls(tuck + [f'{g}.onL' for g in foot])};
@BEFORE_T = {cls([f'{g}.beforeT' for g in tuck] + [f'{g}.onL.beforeT' for g in foot])};
@AFTER = {cls(tuck + ['L.stem'])};
@AFTER_T = {cls([f'{g}.afterT' for g in tuck] + ['L.stem.afterT'])};
@BETWEEN = {cls(tuck)};
@BETWEEN_T = {cls(f'{g}.betweenT' for g in tuck)};
@ARM_LEFT = {cls([f'{g}.beforeT' for g in tuck] + [f'{g}.onL.beforeT' for g in foot] + [f'{g}.betweenT' for g in tuck])};
@ARM_RIGHT = {cls([f'{g}.afterT' for g in tuck] + ['L.stem.afterT'] + [f'{g}.betweenT' for g in tuck])};

lookup L_STEM {{ sub L by L.stem; }} L_STEM;
lookup ON_L {{ sub @FOOT by @FOOT_ONL; }} ON_L;
lookup BEFORE_T {{ sub @BEFORE by @BEFORE_T; }} BEFORE_T;
lookup AFTER_T {{ sub @AFTER by @AFTER_T; }} AFTER_T;
lookup BETWEEN_T {{ sub @BETWEEN by @BETWEEN_T; }} BETWEEN_T;

feature calt {{
    # An L and the letter after it: the L's stem, the letter on its foot.
    lookup L_FEET {{
        sub L' lookup L_STEM @FOOT' lookup ON_L;
    }} L_FEET;
    # The letters either side of a T, under its arm.
    lookup T_ARMS {{
        sub T @BETWEEN' lookup BETWEEN_T T;
        sub @BEFORE' lookup BEFORE_T T;
        sub T @AFTER' lookup AFTER_T;
    }} T_ARMS;
    # The T itself: only its stem, or its stem and the reach of its arm on
    # the side with no letter under it.
    lookup T_STEMS {{
        sub @ARM_LEFT T' @ARM_RIGHT by T.both;
        sub @ARM_LEFT T' by T.left;
        sub T' @ARM_RIGHT by T.right;
    }} T_STEMS;
}} calt;
"""


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
    n = lambda ch: NAMES.get(ch, ch)
    # (character, glyph, cells, form); only the plain ones are typed, the
    # rest are reached through ss01 and calt.
    glyphs = [(ch, n(ch), table, None) for ch, table in G.items()]
    glyphs += [(ch, f'{ch}.ss01', table, {}) for ch, table in ALTS.items()]
    glyphs += [(ch, f'{n(ch)}.onL', G[ch], dict(on_foot=True)) for ch in FOOTABLE]
    glyphs += [(ch, f'{n(ch)}.onL.beforeT', G[ch], dict(on_foot=True, tucked=True, arm='before')) for ch in FOOTABLE]
    for where in ('before', 'after', 'between'):
        glyphs += [(ch, f'{n(ch)}.{where}T', G[ch], dict(tucked=True, arm=where)) for ch in TUCKABLE]
    glyphs += [('L', 'L.stem', STEM, {}), ('L', 'L.stem.afterT', STEM, dict(tucked=True, arm='after'))]
    glyphs += [('T', name, table, {}) for name, table in T_FORMS.items()]
    for ch, name, table, form in glyphs:
        rows = table.split('/')
        g = ufo.newGlyph(name)
        if form is None:
            g.unicodes = [ord(ch), ord(ch.lower())] if ch.isalpha() else [ord(ch)]
        form = form or {}
        plain = table == G[ch]  # its own cells, so its own columns and spur
        contours, width = glyph_contours(rows, slot, pitch, crossbar, ch in DOTTED and plain, SPURS.get(ch) if plain else None,
                                         COLS.get(ch) if plain else None, height, rounding, **form)
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
    ufo.glyphOrder = ['.notdef', 'space'] + [name for _, name, _, _ in glyphs]
    ufo.features.text = features()
    ufo.save(path, overwrite=True)


def og_svg(font_path, out):
    """The typeface's share picture, 1200 × 630, set in the font itself: SMASH
    in the yellow, the characters under it (the site makes it a JPEG, og.js)."""
    font = TTFont(font_path)
    cmap, glyphs = font.getBestCmap(), font.getGlyphSet()

    def line(text, x, baseline, cap, fill):
        k = cap / CAP  # font units to pixels
        parts = []
        for ch in text:
            name = 'space' if ch == ' ' else cmap[ord(ch)]
            pen = SVGPathPen(glyphs)
            glyphs[name].draw(pen)
            if ch != ' ':
                parts.append(f'<path transform="translate({x:.2f} {baseline:.2f}) scale({k:.5f} {-k:.5f})" d="{pen.getCommands()}"/>')
            x += glyphs[name].width * k
        return f'<g fill="{fill}">{"".join(parts)}</g>'

    out.write_text('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">'
                   '<rect width="1200" height="630" fill="#000"/>'
                   + line('SMASH', 64, 430, 360, '#f7be04')
                   + line('ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789', 64, 566, 72, '#f3efe8')
                   + '</svg>\n')


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
    og_svg(OUT / 'fonts' / 'SMASH-VF.ttf', SITE / 'og.svg')


if __name__ == '__main__':
    main()
