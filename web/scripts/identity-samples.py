"""The Typography section's samples as pictures and PDFs, to share.

  python3 web/scripts/identity-samples.py [treatment ...]    (default: "black and white" and yellow)

Renders each sample of /identity's Typography section (web/src/identity/type.js) on its own, in
each treatment asked for (black and white, or an accent: acid, yellow, orange, red, pink, violet,
sky), the long texts in Season Mix as the site has them and the marks round, and writes to
web/src/identity/samples/, which the site serves at /identity/samples/ and the section links:

  <treatment>/NN-<sample>.jpg            one picture per sample
  SMASH-typography-<treatment>.pdf       all of them, one a page

The wide samples are drawn 1600 px wide and the posters 1000, at twice the pixels (3200 and
2000 across).
"""

import io
import re
import sys
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

sys.path.insert(0, str(Path(__file__).resolve().parent))
from importlib import import_module

shoot = import_module('identity-shoot')

OUT = Path(__file__).resolve().parent.parent / 'src' / 'identity' / 'samples'
WIDE, POSTER = 1600, 1000  # CSS px across, drawn at twice the pixels
slug = lambda s: re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')

# Every sample drawn alone, top left of the window, at its width; each picture waited for.
ALONE = '''async ([i, w]) => {
  const fig = document.querySelectorAll('#type .ty-fig')[i];
  fig.dataset.style = fig.getAttribute('style') ?? '';
  fig.style.cssText = `position:fixed;left:0;top:0;margin:0;width:${w}px;z-index:99999`;
  await Promise.all([...fig.querySelectorAll('img')].map((im) => { im.loading = 'eager'; return im.decode().catch(() => {}); }));
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  return fig.querySelector('figcaption').textContent;
}'''
BACK = '''(i) => { const fig = document.querySelectorAll('#type .ty-fig')[i]; fig.setAttribute('style', fig.dataset.style); }'''


def main():
    treatments = sys.argv[1:] or ['black and white', 'yellow']
    shoot.ensure_server()
    with sync_playwright() as p:
        b = shoot.browser(p)
        page = b.new_page(viewport={'width': WIDE + 100, 'height': 1600}, device_scale_factor=2)
        log = []
        shoot.watch(page, log)
        page.goto(f'{shoot.BASE}/index.html?d=type', wait_until='networkidle')
        page.wait_for_function('document.documentElement.dataset.ready === "1"', timeout=60000)
        page.wait_for_function('window.__identity?.extra("type")', timeout=30000)
        page.add_style_tag(content='.view-tools { display: none !important; }')
        page.evaluate('document.fonts.ready.then(() => true)')
        count = page.locator('#type .ty-fig').count()
        for t in treatments:
            page.evaluate('(t) => window.__identity.extra("type").set({ treat: t, long: "serif" })', t)
            folder = OUT / slug(t)
            folder.mkdir(parents=True, exist_ok=True)
            for old in folder.glob('*.jpg'):
                old.unlink()
            pages = []
            for i in range(count):
                poster = page.locator('#type .ty-fig').nth(i).locator('.ty-poster').count() > 0
                caption = page.evaluate(ALONE, [i, POSTER if poster else WIDE])
                art = page.locator('#type .ty-fig').nth(i).locator('.ty-art').first
                box = art.bounding_box()
                png = art.screenshot()
                page.evaluate(BACK, i)
                # Cut to the artwork's own box: an A-sized poster is not a whole number of pixels high, and
                # the screenshot rounds up into whatever is under it.
                im = Image.open(io.BytesIO(png)).convert('RGB')
                im = im.crop((0, 0, min(im.width, int(box['width'] * 2)), min(im.height, int(box['height'] * 2))))
                im.save(folder / f'{i + 1:02d}-{slug(caption)}.jpg', quality=90)
                pages.append(im)
            pdf = OUT / f'SMASH-typography-{slug(t)}.pdf'
            pages[0].save(pdf, 'PDF', save_all=True, append_images=pages[1:], resolution=144, quality=90)
            print(f'{t}: {count} samples in {folder.relative_to(OUT.parent.parent.parent.parent)}/, {pdf.name} ({pdf.stat().st_size / 1e6:.1f} MB)')
        b.close()
    for line in log:
        print('  ', line)


if __name__ == '__main__':
    main()
