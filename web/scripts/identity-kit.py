"""The kit's business cards as PDFs for a printer.

  python3 web/scripts/identity-kit.py [treatment ...]    (default: "black and white")

Prints the cards of /identity's Kit section (web/src/identity/kit.js), one PDF per person and treatment: the
front, then that person's back, each 85 x 55 mm with 3 mm of bleed on every side (a 91 x 61 mm page), the type
and the marks kept as vectors, the fonts embedded. Written to identity/kit/, the identity as files:

  SMASH-card-<person>-<treatment>.pdf
"""

import re
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.path.insert(0, str(Path(__file__).resolve().parent))
from importlib import import_module

shoot = import_module('identity-shoot')

ROOT = Path(__file__).resolve().parent.parent.parent
OUT = ROOT / 'identity' / 'kit'
W, H, BLEED = 85, 55, 3  # mm
slug = lambda s: re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')

# The page left with only the cards asked for, each a page at its printed size, its bleed round it. They are
# copies of the section's own (which stays, hidden, with its styles and colours).
SHEET = '''([keys, w, h, bleed]) => {
  const section = document.querySelector('#page #kit');
  document.querySelector('#kit-print')?.remove();
  const sheet = document.createElement('div');
  sheet.id = 'kit-print';
  const wrap = document.createElement('div');
  wrap.id = 'kit';
  wrap.setAttribute('style', section.getAttribute('style') ?? '');
  for (const key of keys) {
    const card = section.querySelector(`.kit-card[data-card="${key}"]`).cloneNode(true);
    card.style.cssText = `--bleed:${bleed}; width:${w + 2 * bleed}mm; box-shadow:none`;
    wrap.append(card);
  }
  sheet.append(wrap);
  document.body.append(sheet);
  if (!document.querySelector('#kit-print-style')) {
    const style = document.createElement('style');
    style.id = 'kit-print-style';
    style.textContent = `@page { size: ${w + 2 * bleed}mm ${h + 2 * bleed}mm; margin: 0 }
      html, body { margin: 0 !important; padding: 0 !important; background: none !important; }
      body > :not(#kit-print) { display: none !important; }
      #kit-print .kit-card { break-after: page; }`;
    document.head.append(style);
  }
}'''

def main():
    treatments = sys.argv[1:] or ['black and white']
    shoot.ensure_server()
    OUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        b = shoot.browser(p)
        page = b.new_page()
        log = []
        shoot.watch(page, log)
        page.goto(f'{shoot.BASE}/index.html?d=kit', wait_until='networkidle')
        page.wait_for_function('document.documentElement.dataset.ready === "1"', timeout=60000)
        page.wait_for_function('window.__identity?.extra("kit")', timeout=30000)
        page.evaluate('document.fonts.ready.then(() => true)')
        team = page.evaluate('''() => [...document.querySelectorAll('#kit .kit-card[data-card]')]
          .filter((c) => c.dataset.card !== 'front').map((c) => [c.dataset.card, c.querySelector('.kit-name').textContent])''')
        for t in treatments:
            page.evaluate('(t) => window.__identity.extra("kit").set({ treat: t })', t)
            for email, name in team:
                page.evaluate(SHEET, [['front', email], W, H, BLEED])
                page.evaluate('document.fonts.ready.then(() => true)')
                pdf = OUT / f'SMASH-card-{slug(name)}-{slug(t)}.pdf'
                page.pdf(path=str(pdf), print_background=True, prefer_css_page_size=True)
                print(f'{pdf.relative_to(ROOT)}')
        b.close()
    for line in log:
        print('  ', line)


if __name__ == '__main__':
    main()
