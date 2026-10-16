"""A card DXF (identity-metal.py's CUT layer) extruded to a STEP plate: JLCCNC's sheet metal quote wants a 3D file
of the same name beside the DXF, or it refuses the drawing (2026-10-17).

  uv run --with build123d python web/scripts/identity-step.py identity/kit/metal/SMASH-card-stencil.dxf [0.5]

Writes the .step next to the .dxf, the plate `thickness` mm thick (0.5 by default). Rings nested an odd number of
times are cut away, even ones are metal, so a letter's counter left inside a cut would come back as an island.
"""

import sys
from pathlib import Path

from build123d import Polyline, export_step, extrude, make_face


def rings(path):
    """The closed polylines of an R12 DXF, as lists of (x, y)."""
    lines = [l.strip() for l in Path(path).read_text().split('\n')]
    out, cur, mode = [], None, None
    for c, v in zip(lines[0::2], lines[1::2]):
        if c == '0':
            mode = None
            if v == 'POLYLINE':
                cur, mode = [], 'p'
                out.append(cur)
            elif v == 'VERTEX':
                cur.append([0.0, 0.0])
                mode = 'v'
        elif mode == 'v' and c in ('10', '20'):
            cur[-1][c == '20'] = float(v)
    return [dedupe(r) for r in out]


def dedupe(r):
    out = [r[0]]
    for p in r[1:]:
        if abs(p[0] - out[-1][0]) + abs(p[1] - out[-1][1]) > 1e-4:
            out.append(p)
    if abs(out[0][0] - out[-1][0]) + abs(out[0][1] - out[-1][1]) < 1e-4:
        out.pop()
    return out


def area(r):
    return abs(sum(x0 * y1 - x1 * y0 for (x0, y0), (x1, y1) in zip(r, r[1:] + r[:1]))) / 2


def inside(p, r):
    x, y, hit = p[0], p[1], False
    for (x0, y0), (x1, y1) in zip(r, r[1:] + r[:1]):
        if (y0 > y) != (y1 > y) and x < x0 + (y - y0) * (x1 - x0) / (y1 - y0):
            hit = not hit
    return hit


def main():
    src = Path(sys.argv[1])
    thickness = float(sys.argv[2]) if len(sys.argv) > 2 else 0.5
    rs = sorted(rings(src), key=area, reverse=True)  # the outline first
    depth = [sum(inside(r[0], o) for o in rs if o is not r and area(o) > area(r)) for r in rs]
    plate = make_face(Polyline(*map(tuple, rs[0]), close=True))
    for r, d in sorted(zip(rs[1:], depth[1:]), key=lambda rd: rd[1]):
        face = make_face(Polyline(*map(tuple, r), close=True))
        plate = plate - face if d % 2 else plate + face
    solid = extrude(plate, thickness)
    dst = src.with_suffix('.step')
    export_step(solid, str(dst))
    size = solid.bounding_box().size
    print(dst, f'{len(rs)} rings, {size.X:.1f} x {size.Y:.1f} x {size.Z:.1f} mm, {solid.volume:.1f} mm³')


if __name__ == '__main__':
    main()
