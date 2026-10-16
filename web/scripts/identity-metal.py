"""The stencil business card in sheet metal: a DXF per person, to order laser cut (e.g. JLCCNC).

  python3 web/scripts/identity-metal.py [--margin 3] [--row 2.6] [--gap 1.1] [--radius 2.5]
  python3 web/scripts/identity-metal.py --stencil --row 5 [--track 0.6] [--bridge 0.6]

One card for the studio, no names (Jonas, 2026-10-14). The front as the site's landing draws the mark
(identity-stencil.mjs, web/src/js/mark.js): the block stretched to the card's width, its five letters cut out (the
A's closed counter held by 1 mm bridges), hello@smash.studio in a row of Druk standing up the right edge, read
from the bottom, filling its length as the site's rows fill their width; the block fills the rest, a 3 mm margin all
round. The A's counter is held by two bridges, at the top and across the crossbar. In metal the rows can't be printed: they are engraved (laser marking) through the finish, black
anodising on aluminium, powder coat on steel (stainless can't be anodised). Engraving is most of the price: JLCCNC
quoted 100 in 0.5 mm 304, black powder coat, for $269 engraved against $88 without (2026-10-17). So `--stencil` cuts
the row through instead, as stencil letters (rows_stencil); 5 mm is the lowest row whose @ passes check(). Written to
identity/kit/metal/:

  SMASH-card.dxf   millimetres, y up; layer CUT (the outline, corners rounded, and the letters), layer ENGRAVE
                   (the row, filled outlines)
  SMASH-card-cut.dxf  the CUT layer alone, for an instant laser-cut quote (JLCCNC treats every line as a cut)
  SMASH-card-stencil.dxf, .png  with --stencil: everything on CUT, the row included
  (identity-step.py makes the .step JLCCNC wants beside each DXF)
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


def at_sign(h):
    """An @ drawn for cutting, `h` px tall (white ink on black): Anton's is too fine to cut at 5 mm. The ring
    opens on the right below the a, whose stem is the ring's right side, so the metal between them is held there;
    every stroke 0.13 of the height (0.65 mm at 5 mm) and every gap of metal 0.12, at least 0.6 mm."""
    s, g, c = 0.13 * h, 0.12 * h, 0.14 * h
    w = 2 * s + g + c + s
    im = Image.new('L', (round(w), round(h)), 0)
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, w - 1, h - 1), radius=0.2 * h, fill=255)
    d.rounded_rectangle((s, s, w - 1 - s, h - 1 - s), radius=0.07 * h, fill=0)
    y0, y1 = s + g, 0.71 * h  # the a's bowl, its stem the ring's right side
    d.rounded_rectangle((s + g, y0, w - 1, y1), radius=0.15 * h, fill=255)
    d.rounded_rectangle((2 * s + g, y0 + s, w - 1 - s, y1 - s), radius=0.06 * h, fill=0)
    d.rectangle((w - s - 1, y1, w, y1 + g), fill=0)  # the opening
    return im


def rows_stencil(layout, text, druk, anton, has, track, bridge):
    """The row cut through instead of engraved: each letter set on its own, `track` mm of metal between their
    ink, the whole stretched along the row as the site's rows are; every closed counter (O, A, D, @) held by a
    `bridge` mm strip across the letter at its middle, as the block's A is held. Black on white, PX per mm."""
    from scipy import ndimage
    cw, ch = layout['card']
    row = layout['rows'][0]
    length, height = (row['h'], row['w']) if row.get('rotate') else (row['w'], row['h'])
    size = 400
    fd, fa = ImageFont.truetype(str(druk), size), ImageFont.truetype(str(anton), int(size * 0.866))
    glyphs = []
    for c in text.upper():
        f = fd if c in has else fa
        g = Image.new('L', (int(f.getlength(c)) + size, int(size * 1.6)), 0)
        ImageDraw.Draw(g).text((size // 2, size * 1.2), c, font=f, fill=255, anchor='ls')
        glyphs.append(None if c == '@' else g)
    # one baseline and cap height for all: crop every letter to the row's common top and bottom
    top = min(g.getbbox()[1] for g in glyphs if g)
    bot = max(g.getbbox()[3] for g in glyphs if g)
    glyphs = [g.crop((g.getbbox()[0], top, g.getbbox()[2], bot)) if g else at_sign(bot - top) for g in glyphs]
    h = height * PX
    natural = sum(g.width * h / g.height for g in glyphs)
    gaps = (len(glyphs) - 1) * track * PX
    scale = (length * PX - gaps) / natural
    if scale < LEAST:  # too long: set smaller, centred across the row
        h *= scale / LEAST
        scale = LEAST
    strip = Image.new('L', (round(length * PX), round(h)), 0)
    x = 0.0
    for g in glyphs:
        g = g.resize((max(1, round(g.width * h / g.height * scale)), round(h)), Image.LANCZOS)
        a = np.array(g) >= 128
        # the counters: closed ones, and those held only by a neck under half a mm (the @'s inner bowl), found
        # by shrinking the metal a quarter mm first
        r = round(0.25 * PX)
        shrunk = ndimage.binary_erosion(np.pad(~a, r, constant_values=True),
                                        np.add.outer(np.arange(-r, r + 1) ** 2, np.arange(-r, r + 1) ** 2) <= r * r)[r:-r, r:-r]
        xs = []
        for metal in (~a, shrunk):
            holes, n = ndimage.label(metal)
            edge = set(np.unique(np.concatenate([holes[0], holes[-1], holes[:, 0], holes[:, -1]])))
            xs += [ndimage.center_of_mass(holes == k)[1] for k in range(1, n + 1) if k not in edge]
        half = bridge * PX / 2
        for cx in xs:
            a[:, max(0, round(cx - half)):round(cx + half)] = False  # metal across the letter, top to bottom
        # a sliver of cut a bridge leaves (under half a mm across) is left as metal: the laser can't cut it
        ink, n = ndimage.label(a)
        kept = ndimage.binary_erosion(np.pad(a, r), np.add.outer(np.arange(-r, r + 1) ** 2, np.arange(-r, r + 1) ** 2) <= r * r)[r:-r, r:-r]
        a &= np.isin(ink, np.unique(ink[kept]))
        strip.paste(Image.fromarray((a * 255).astype(np.uint8)), (round(x), 0))
        x += g.width + track * PX
    pad = (length * PX - x + track * PX) / 2  # what the clamp left over, shared at both ends
    im = Image.new('L', (cw * PX, ch * PX), 255)
    if row.get('rotate'):
        strip = strip.rotate(90, expand=True)
        im.paste(0, (round(row['x'] * PX + (row['w'] * PX - strip.width) / 2), round(row['y'] * PX + pad)), strip)
    else:
        im.paste(0, (round(row['x'] * PX + pad), round(row['y'] * PX + (row['h'] * PX - strip.height) / 2)), strip)
    return im, scale


def check(cut, ch, web, slot):
    """The plate as cut, a bitmap at PX per mm (True = metal): it must stay one piece, no web of metal under `web`
    mm and no cut narrower than `slot` mm, or the laser can't hold it. Returns the faults as text."""
    from scipy import ndimage
    # Eroding by half the limit: a web of metal thinner than `web` vanishes and the plate falls apart; a cut
    # narrower than `slot` vanishes or splits. Sharp corners only lose their tips, so they don't count.
    faults = []
    disk = lambda mm: (lambda r: np.add.outer(np.arange(-r, r + 1) ** 2, np.arange(-r, r + 1) ** 2) <= r * r)(round(mm * PX / 2) - 1)
    at = lambda s: f'({s[1].start / PX:.1f}, {ch - s[0].stop / PX:.1f}) mm'
    _, pieces = ndimage.label(cut)
    if pieces != 1:
        faults.append(f'{pieces} pieces of metal, not one')
    held, n = ndimage.label(ndimage.binary_erosion(cut, disk(web)))
    if n > 1:
        small = sorted(ndimage.find_objects(held), key=lambda s: (s[0].stop - s[0].start) * (s[1].stop - s[1].start))[:-1]
        faults += [f'metal held by a web under {web} mm at {at(s)}' for s in small]
    holes, n = ndimage.label(~cut)
    outside = set(np.unique(np.concatenate([holes[0], holes[-1], holes[:, 0], holes[:, -1]])))
    for k, s in enumerate(ndimage.find_objects(holes), 1):
        if k in outside:
            continue
        _, m = ndimage.label(ndimage.binary_erosion(np.pad(holes[s] == k, 2), disk(slot)))
        if m != 1:
            faults.append(f'cut under {slot} mm wide at {at(s)}' + (' (vanishes)' if m == 0 else f' (splits in {m})'))
    return faults


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
    ap.add_argument('--stencil', action='store_true', help='cut the row through, as stencil letters, not engraved')
    ap.add_argument('--track', type=float, default=0.6, help='--stencil: mm of metal between letters')
    ap.add_argument('--bridge', type=float, default=0.6, help='--stencil: mm width of the counters\' bridges')
    a = ap.parse_args()
    if a.stencil:
        return stencil(a)
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
            dxf(OUT / 'SMASH-card-cut.dxf', {'CUT': [outline] + holes})  # for quoting shops that cut every line
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


def stencil(a):
    """The card with the row cut through: SMASH-card-stencil.dxf, all on CUT, and its preview."""
    OUT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        work = Path(tmp)
        subprocess.run(['node', str(ROOT / 'web' / 'scripts' / 'identity-stencil.mjs'), str(work),
                        str(a.margin), str(a.row), str(a.gap), 'side'], check=True)
        layout = json.loads((work / 'layout.json').read_text())
        cw, ch = layout['card']
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            b = shoot.browser(p)
            pg = b.new_page(viewport={'width': cw * 10, 'height': ch * 10}, device_scale_factor=PX / 10)
            pg.set_content(f'<html><body style="margin:0">{(work / "holes.svg").read_text()}</body></html>')
            pg.screenshot(path=str(work / 'holes.png'), clip={'x': 0, 'y': 0, 'width': cw * 10, 'height': ch * 10})
            b.close()
        block = Image.open(work / 'holes.png').convert('L')
        (druk, anton), has = fonts(work)
        rows, scale = rows_stencil(layout, CONTACT, druk, anton, has, a.track, a.bridge)
        both = Image.fromarray(np.minimum(np.array(block), np.array(rows)))  # black: cut away
        holes = trace(both, work, 'holes')
        outline = rounded_rect(cw, ch, a.radius)
        stem = OUT / 'SMASH-card-stencil'
        dxf(stem.with_suffix('.dxf'), {'CUT': [outline] + holes})
        plate = Image.new('L', (cw * PX, ch * PX), 0)
        ImageDraw.Draw(plate).polygon([(x * PX, (ch - y) * PX) for x, y in outline], fill=255)
        metal = (np.array(plate) >= 128) & (np.array(both) >= 128)
        prev = Image.new('RGB', (cw * PX, ch * PX), (255, 255, 255))
        prev.paste((150, 150, 150), (0, 0), Image.fromarray((metal * 255).astype(np.uint8)))
        prev.resize((cw * 12, ch * 12), Image.LANCZOS).save(stem.with_suffix('.png'))
        print(stem.with_suffix('.dxf').relative_to(ROOT), f'{len(holes)} cut rings, row stretched {scale:.2f}')
        faults = check(metal, ch, web=0.5, slot=0.5)
        print('\n'.join(faults) if faults else 'one piece; no metal or cut under 0.5 mm')


if __name__ == '__main__':
    main()
