"""Our business cards tried on in the template library's photographs, to choose which templates to buy.

  python3 web/scripts/identity-tryon.py

Reads identity/kit/templates/try/corners.json (each scene's card faces, corner by corner, as fractions of the
picture) and writes identity/kit/templates/try/index.html: every scene with our cards warped onto its cards,
under the scene's own light, in any colour, each card turned to its front or back by a click. The light is taken
from the photograph: the card face unwarped, its printing removed (a max or min filter, then a blur) and its
brightest set to 1, laid on our card by multiply.

The previews are the studios' pictures, fetched from their shops for this comparison only, and they stay out of git
(try/previews, try/light): anything shown outside the studio is made from the bought template.
"""

import json
import re
import subprocess
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent.parent
TPL = ROOT / 'identity' / 'kit' / 'templates'
TRY = TPL / 'try'
KIT = ROOT / 'identity' / 'kit'
TREATMENTS = ['black-and-white', 'acid', 'yellow', 'red', 'sky']
PEOPLE = ['veronica-reed', 'ashley-reed', 'emile-pascoe']
LW, LH = 510, 330  # a light map, card-shaped
slug = lambda u: re.sub(r'[^a-z0-9]+', '-', u.lower().rstrip('/').rsplit('/', 1)[-1])[:60].strip('-')


def cards():
    """Our card faces as pictures, from the print PDFs: one front per colour, each person's back per colour."""
    out = TRY / 'cards'
    out.mkdir(parents=True, exist_ok=True)
    for t in TREATMENTS:
        for i, p in enumerate(PEOPLE):
            pdf = KIT / f'SMASH-card-{p}-{t}.pdf'
            names = ([f'front-{t}.jpg'] if i == 0 else []) + [f'back-{p}-{t}.jpg']
            if all((out / n).exists() for n in names):
                continue
            for page, n in zip(([0] if i == 0 else []) + [1], names):
                # 91 x 61 mm with bleed; the card is the middle 85 x 55
                subprocess.run(['magick', '-density', '300', f'{pdf}[{page}]', '-alpha', 'remove', '-gravity', 'center',
                                '-crop', '1004x650+0+0', '+repage', '-resize', '1020x660!', '-quality', '90', str(out / n)], check=True)


def fetch(url, path):
    if not path.exists():
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        path.write_bytes(urllib.request.urlopen(req, timeout=60).read())


def coeffs(quad, w, h):
    """PIL's perspective coefficients taking the w x h card rectangle to the quad in the picture."""
    rect = [(0, 0), (w, 0), (w, h), (0, h)]
    a, b = [], []
    for (x, y), (u, v) in zip(rect, quad):
        a += [[x, y, 1, 0, 0, 0, -u * x, -u * y], [0, 0, 0, x, y, 1, -v * x, -v * y]]
        b += [u, v]
    return np.linalg.solve(np.array(a, float), np.array(b, float)).tolist()


def light(img, quad, tone):
    """The scene's light on a card face, without the printing on it: 1 where the paper is brightest."""
    face = img.transform((LW, LH), Image.Transform.PERSPECTIVE, coeffs(quad, LW, LH), Image.Resampling.BICUBIC)
    lum = np.asarray(face.convert('L'), float) / 255
    # printing is removed by taking the paper's side of every neighbourhood: bigger on a dark card, where the
    # printing is light and covers more of it
    k = LW // (8 if tone == 'light' else 4)
    lum = (ndimage.maximum_filter if tone == 'light' else ndimage.minimum_filter)(lum, size=k)
    lum = ndimage.gaussian_filter(lum, LW / (25 if tone == 'light' else 12))
    lum = np.clip(lum / max(np.percentile(lum, 98), 1e-3), 0, 1)
    return Image.fromarray((lum * 255).astype(np.uint8))


def main():
    lib = json.loads((TPL / 'library.json').read_text())
    corners = json.loads((TRY / 'corners.json').read_text())
    (TRY / 'previews').mkdir(parents=True, exist_ok=True)
    (TRY / 'light').mkdir(parents=True, exist_ok=True)
    (TRY / '.gitignore').write_text('previews/\nlight/\ncut/\n')
    cards()
    scenes, seen = [], set()
    for t in lib:
        s = slug(t['url'])
        if s not in corners or not corners[s]['cards']:
            continue
        pic = TRY / 'previews' / f'{s}.jpg'
        fetch(t['preview'], pic)
        if pic.read_bytes()[:4096] in seen:  # two products sold with the same preview
            continue
        seen.add(pic.read_bytes()[:4096])
        img = Image.open(pic).convert('RGB')
        w, h = img.size
        faces = []
        # the bottom card first: the highest layer number, else the ones partly covered
        order = sorted(corners[s]['cards'], key=lambda c: (-c.get('layer', 0), not c.get('occluded')))
        for i, c in enumerate(order):
            quad = [(c[k][0] * w, c[k][1] * h) for k in ('tl', 'tr', 'br', 'bl')]
            light(img, quad, c.get('tone', 'light')).save(TRY / 'light' / f'{s}-{i}.png')
            # a dark card shows the front (the field), a light one a back
            faces.append({'q': [c[k] for k in ('tl', 'tr', 'br', 'bl')], 'light': f'light/{s}-{i}.png',
                          'side': 'front' if c.get('tone') == 'dark' else 'back'})
        scenes.append({'id': s, 'name': t['name'], 'url': t['url'], 'pic': f'previews/{s}.jpg', 'w': w, 'h': h,
                       'avg': t['avg'], 'faces': faces})
    scenes.sort(key=lambda x: -x['avg'])
    page = (TRY / 'page.html').read_text().replace('/*SCENES*/[]', json.dumps(scenes))
    (TRY / 'index.html').write_text(page)
    print(f'{len(scenes)} scenes: {(TRY / "index.html").relative_to(ROOT)}')


if __name__ == '__main__':
    main()
