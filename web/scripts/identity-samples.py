"""The Typography section's pieces as pictures and PDFs, to share.

  python3 web/scripts/identity-samples.py [treatment ...]    (default: "black and white" and yellow)

Renders each piece of /identity's Typography section (web/src/identity/type.js: the specimens, the
compositions and the type in use) on its own, in
each treatment asked for (black and white, or an accent: acid, yellow, orange, red, pink, violet,
sky), the titles in the SMASH face and the marks round, and writes to
web/src/identity/samples/, which the site serves at /identity/samples/ and the section links,
and the same to identity/typography/, the identity as files:

  <treatment>/NN-<sample>.jpg            one picture per sample
  SMASH-typography-<treatment>.pdf       all of them, one a page

The wide samples are drawn 1600 px wide and the posters 1000, at twice the pixels (3200 and
2000 across).
"""

import io
import re
import shutil
import sys
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

sys.path.insert(0, str(Path(__file__).resolve().parent))
from importlib import import_module

shoot = import_module('identity-shoot')

ROOT = Path(__file__).resolve().parent.parent.parent
OUT = ROOT / 'web' / 'src' / 'identity' / 'samples'
FILES = ROOT / 'identity' / 'typography'  # a copy, beside the marks' files
WIDE, POSTER = 1600, 1000  # CSS px across, drawn at twice the pixels
slug = lambda s: re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')

# The pieces the section shows (the other face's are hidden by its switch), numbered.
SHOWN = '''() => {
  const figs = [...document.querySelectorAll('#type .ty-fig')].filter((f) => f.getClientRects().length);
  figs.forEach((f, i) => { f.dataset.shot = i; });
  return figs.length;
}'''
# Every piece drawn alone, top left of the window, at its width; each picture waited for.
ALONE = '''async ([i, w]) => {
  const fig = document.querySelector(`#type .ty-fig[data-shot="${i}"]`);
  fig.dataset.style = fig.getAttribute('style') ?? '';
  fig.style.cssText = `position:fixed;left:0;top:0;margin:0;width:${w}px;z-index:99999`;
  await Promise.all([...fig.querySelectorAll('img')].map((im) => { im.loading = 'eager'; return im.decode().catch(() => {}); }));
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  return fig.querySelector('figcaption').textContent;
}'''
BACK = '''(i) => { const fig = document.querySelector(`#type .ty-fig[data-shot="${i}"]`); fig.setAttribute('style', fig.dataset.style); }'''


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
        page.evaluate("document.querySelectorAll('#type details').forEach((d) => { d.open = true; })")  # the type in use, folded on the page
        page.evaluate('document.fonts.ready.then(() => true)')
        count = page.evaluate(SHOWN)
        for t in treatments:
            page.evaluate('(t) => window.__identity.extra("type").set({ treat: t })', t)
            folder = OUT / slug(t)
            folder.mkdir(parents=True, exist_ok=True)
            for old in folder.glob('*.jpg'):
                old.unlink()
            pages = []
            for i in range(count):
                fig = page.locator(f'#type .ty-fig[data-shot="{i}"]')
                poster = fig.locator('.ty-poster').count() > 0
                caption = page.evaluate(ALONE, [i, POSTER if poster else WIDE])
                art = fig.locator('.ty-art').first
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
            print(f'{t}: {count} samples, {pdf.name} ({pdf.stat().st_size / 1e6:.1f} MB), in {OUT.relative_to(ROOT)}/')
            copy = FILES / slug(t)
            if copy.exists():
                shutil.rmtree(copy)
            shutil.copytree(folder, copy)
            shutil.copy2(pdf, FILES / pdf.name)
        b.close()
    for line in log:
        print('  ', line)


if __name__ == '__main__':
    main()
