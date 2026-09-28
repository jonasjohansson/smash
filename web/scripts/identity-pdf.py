"""The identity deck as a PDF: 1920 x 1080 pages, one per slide.

  python3 web/scripts/identity-pdf.py [out.pdf]

Renders web/src/identity/deck.html in headless Chromium once every live piece
has been frozen into a picture. Default out: web/.identity-shots/SMASH-identity-wide-round.pdf.
"""

import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.path.insert(0, str(Path(__file__).resolve().parent))
from importlib import import_module

shoot = import_module('identity-shoot')

WEB = Path(__file__).resolve().parent.parent


def main():
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else WEB / '.identity-shots' / 'SMASH-identity-wide-round.pdf'
    out.parent.mkdir(parents=True, exist_ok=True)
    shoot.ensure_server()
    log = []
    with sync_playwright() as p:
        b = shoot.browser(p)
        page = b.new_page(viewport={'width': 1968, 'height': 1128})
        shoot.watch(page, log)
        page.goto(f'{shoot.BASE}/deck.html', wait_until='networkidle')
        page.wait_for_function('document.documentElement.dataset.ready === "1"', timeout=180000)
        page.wait_for_timeout(500)
        page.emulate_media(media='print')
        page.pdf(path=str(out), width='1920px', height='1080px', print_background=True, prefer_css_page_size=True)
        slides = page.locator('.slide').count()
        b.close()
    print(f'wrote {out} ({slides} slides)')
    for l in log:
        print('  ', l)


if __name__ == '__main__':
    main()
