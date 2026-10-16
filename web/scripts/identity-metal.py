"""The stencil business card in sheet metal: a DXF per person, to order laser cut (e.g. JLCCNC).

  python3 web/scripts/identity-metal.py [--margin 3] [--row 2.6] [--gap 1.1] [--radius 2.5]

One card for the studio, no names (Jonas, 2026-10-14). The front as the site's landing draws the mark
(identity-stencil.mjs, web/src/js/mark.js): the block stretched to the card's width, its five letters cut out (the
A's closed counter held by 1 mm bridges), hello@smash.studio in a row of Druk standing up the right edge, read
from the bottom, filling its length as the site's rows fill their width; the block fills the rest, a 3 mm margin all
round. The A's counter is held by two bridges, at the top and across the crossbar. In metal the rows can't be printed: they are engraved (laser marking) through the finish, black
anodising or a soft-white powder coat. Written to identity/kit/metal/:

  SMASH-card.dxf   millimetres, y up; layer CUT (the outline, corners rounded, and the letters), layer ENGRAVE
                   (the row, filled outlines)
  SMASH-card.png   a preview: metal in grey, cut away in white, engraving in black
"""

import argparse
import json
import re
import subprocess
import sys
import tempfile
from importlib import import_module
from pathlib import Path

import numpy as np
from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
shoot = import_module('identity-shoot')
OUT = ROOT / 'identity' / 'kit' / 'metal'
PX = 40  # px per mm, for tracing
CONTACT = 'hello@smash.studio'  # one card for the studio, no names, one address (Jonas, 2026-10-14)
LEAST = 0.8  # the site's rows: stretched to fill, never squeezed below this; then set smaller, centred
slug = lambda s: re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')


def fonts(work):
    """Druk (the trial) and Anton, as TTF for drawing; the trial lacks @ & /, which Anton sets, as on the site."""
    paths = []
    for n in ('Druk-Heavy-Trial', 'Anton-Regular'):
        p = work / f'{n}.ttf'
        f = TTFont(ROOT / 'web' / 'src' / 'fonts' / f'{n}.woff2')
        f.flavor = None
        f.save(p)
        paths.append(p)
    return paths, {chr(c) for c in TTFont(paths[0]).getBestCmap()}


def rows_bitmap(layout, texts, druk, anton, has):
    """The rows' type, black on white, at PX per mm: each row's ink filling its box (the site's paintInfo)."""
    cw, ch = layout['card']
    im = Image.new('L', (cw * PX, ch * PX), 255)
    for row, text in zip(layout['rows'], texts):
        size = 400
        fd, fa = ImageFont.truetype(str(druk), size), ImageFont.truetype(str(anton), int(size * 0.866))
        parts = [(c, fd if c in has else fa) for c in text.upper()]
        g = Image.new('L', (int(sum(f.getlength(c) for c, f in parts)) + 8, int(size * 1.6)), 0)
        d = ImageDraw.Draw(g)
        x = 4
        for c, f in parts:
            d.text((x, size * 1.2), c, font=f, fill=255, anchor='ls')
            x += f.getlength(c)
        g = g.crop(g.getbbox())
        turn = row.get('rotate', 0)
        bw, bh = (row['h'], row['w']) if turn else (row['w'], row['h'])  # set along the row's length
        bw, bh = bw * PX, bh * PX
        h = bh
        w = g.width * h / g.height
        scale = bw / w
        if scale < LEAST:
            h = bh * bw / (LEAST * w)
            w, scale = bw / LEAST, LEAST
        g = g.resize((round(w * scale), round(h)), Image.LANCZOS)
        if turn:  # standing up the side, read from the bottom
            g = g.rotate(90, expand=True)
            im.paste(0, (round(row['x'] * PX + (bh - h) / 2), round(row['y'] * PX)), g)
        else:
            im.paste(0, (round(row['x'] * PX), round(row['y'] * PX + (bh - h) / 2)), g)
    return im


def trace(img, work, name):
    """Black areas of a bitmap as rings of points in card mm (y up), via potrace."""
    pbm = work / f'{name}.pbm'
    img.point(lambda v: 0 if v < 128 else 255).convert('1').save(pbm)
    gj = work / f'{name}.json'
    subprocess.run(['potrace', '-b', 'geojson', '-a', '0.8', '-o', str(gj), str(pbm)], check=True)
    rings = []
    for feat in json.loads(gj.read_text())['features']:
        geom = feat['geometry']
        polys = geom['coordinates'] if geom['type'] == 'MultiPolygon' else [geom['coordinates']]
        for poly in polys:
            for ring in poly:
                rings.append(np.array(ring, float) / PX)  # potrace: pixels from the bottom left, y up
    return rings


def rounded_rect(w, h, r, n=12):
    pts = []
    for cx, cy, a0 in ((w - r, r, -90), (w - r, h - r, 0), (r, h - r, 90), (r, r, 180)):
        for k in range(n + 1):
            a = np.radians(a0 + 90 * k / n)
            pts.append((cx + r * np.cos(a), cy + r * np.sin(a)))
    return np.array(pts)


def dxf(path, layers):
    """A plain R12 DXF: closed polylines, one layer each."""
    out = ['0', 'SECTION', '2', 'HEADER', '9', '$INSUNITS', '70', '4', '0', 'ENDSEC',
           '0', 'SECTION', '2', 'TABLES', '0', 'TABLE', '2', 'LAYER', '70', str(len(layers))]
    for i, name in enumerate(layers):
        out += ['0', 'LAYER', '2', name, '70', '0', '62', str(i + 1), '6', 'CONTINUOUS']
    out += ['0', 'ENDTAB', '0', 'ENDSEC', '0', 'SECTION', '2', 'ENTITIES']
    for name, rings in layers.items():
        for ring in rings:
            out += ['0', 'POLYLINE', '8', name, '66', '1', '70', '1']
            for x, y in ring[:-1] if np.allclose(ring[0], ring[-1]) else ring:
                out += ['0', 'VERTEX', '8', name, '10', f'{x:.4f}', '20', f'{y:.4f}', '30', '0']
            out += ['0', 'SEQEND']
    out += ['0', 'ENDSEC', '0', 'EOF']
    path.write_text('\n'.join(out) + '\n')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--margin', type=float, default=3)
    ap.add_argument('--row', type=float, default=2.6)
    ap.add_argument('--gap', type=float, default=1.1)
    ap.add_argument('--radius', type=float, default=2.5)
    a = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        work = Path(tmp)
        subprocess.run(['node', str(ROOT / 'web' / 'scripts' / 'identity-stencil.mjs'), str(work),
                        str(a.margin), str(a.row), str(a.gap), 'side'], check=True)
        layout = json.loads((work / 'layout.json').read_text())
        cw, ch = layout['card']
        # the letters, drawn by the browser as the site draws them
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            b = shoot.browser(p)
            pg = b.new_page(viewport={'width': cw * 10, 'height': ch * 10}, device_scale_factor=PX / 10)
            pg.set_content(f'<html><body style="margin:0">{(work / "holes.svg").read_text()}</body></html>')
            pg.screenshot(path=str(work / 'holes.png'), clip={'x': 0, 'y': 0, 'width': cw * 10, 'height': ch * 10})
            b.close()
        holes = trace(Image.open(work / 'holes.png').convert('L'), work, 'holes')
        (druk, anton), has = fonts(work)
        outline = rounded_rect(cw, ch, a.radius)
        for name in ['SMASH']:
            rows = rows_bitmap(layout, (CONTACT,), druk, anton, has)
            engrave = trace(rows, work, 'rows')
            stem = OUT / 'SMASH-card'
            dxf(stem.with_suffix('.dxf'), {'CUT': [outline] + holes, 'ENGRAVE': engrave})
            # a preview: the plate grey, the cuts white, the engraving black
            prev = Image.new('RGB', (cw * PX, ch * PX), (255, 255, 255))
            d = ImageDraw.Draw(prev)
            flip = lambda r: [(x * PX, (ch - y) * PX) for x, y in r]
            d.polygon(flip(outline), fill=(150, 150, 150))
            for r in holes:
                d.polygon(flip(r), fill=(255, 255, 255))
            prev.paste((20, 20, 20), (0, 0), Image.eval(rows, lambda v: 255 - v))
            prev.resize((cw * 12, ch * 12), Image.LANCZOS).save(stem.with_suffix('.png'))
            print(stem.with_suffix('.dxf').relative_to(ROOT), f'{len(holes)} cut rings, {len(engrave)} engraved')


if __name__ == '__main__':
    main()
