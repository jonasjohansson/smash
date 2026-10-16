"""The mockup template library: photographed scenes (Photoshop files with smart objects) to show the kit in.

  python3 web/scripts/identity-templates.py [round.json ...]

Merges each research round's keepers (a JSON with "kept": [...]) into identity/kit/templates/library.json, one
entry per product page, the better-scored one winning, then writes identity/kit/templates/index.html: the
library as a page to choose from, by category. With no rounds given it only rebuilds the page.
"""

import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
DIR = ROOT / 'identity' / 'kit' / 'templates'
LIB = DIR / 'library.json'
KEEP = ['name', 'studio', 'url', 'preview', 'category', 'price', 'licence', 'photographic', 'resolution', 'scenes',
        'smart_objects', 'why', 'scores', 'avg', 'notes']
CATEGORIES = ['business-card', 'stationery', 'book-editorial', 'poster', 'signage-spatial', 'screen-digital',
              'merch-packaging', 'multi']
NAMES = {'business-card': 'Business cards', 'stationery': 'Stationery', 'book-editorial': 'Books and print',
         'poster': 'Posters', 'signage-spatial': 'Signage and space', 'screen-digital': 'Screens',
         'merch-packaging': 'Merch and packaging', 'multi': 'Sets'}

key = lambda u: re.sub(r'[?#].*$', '', re.sub(r'^https?://(www\.)?', '', (u or '').lower())).rstrip('/')
free = lambda t: bool(re.match(r'\s*(free|\$?0\b|€?0\b|0\s*(usd|eur|\$|€))', t.get('price', ''), re.I))


def merge(lib, rounds):
    by = {key(t['url']): t for t in lib}
    for path in rounds:
        data = json.loads(Path(path).read_text())
        for t in data.get('kept', []):
            t = {k: t.get(k) for k in KEEP}
            old = by.get(key(t['url']))
            if not old or t['avg'] > old['avg']:
                by[key(t['url'])] = t
    return sorted(by.values(), key=lambda t: (CATEGORIES.index(t['category']) if t['category'] in CATEGORIES else 99, -t['avg']))


def page(lib):
    e = html.escape
    cats = [c for c in CATEGORIES if any(t['category'] == c for t in lib)]
    def card(t):
        img = f'<img src="{e(t["preview"])}" alt="" loading="lazy" referrerpolicy="no-referrer">' if t.get('preview') else '<div class="none"></div>'
        return (f'<a class="t" href="{e(t["url"])}" target="_blank" rel="noopener" data-cat="{e(t["category"])}" data-free="{int(free(t))}">'
                f'{img}<p class="n">{e(t["name"])}</p><p class="m">{e(t["studio"])} · {e(t["price"].split("/")[0].strip())} · {t["avg"]}</p></a>')
    buttons = ''.join(f'<button data-f="{c}">{NAMES[c]}</button>' for c in cats)
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Mockup templates</title><style>
:root {{ color-scheme: dark; }}
body {{ margin: 0; background: #000; color: #fff; font: 13px/1.4 "Neue Montreal", "Helvetica Neue", Arial, sans-serif; }}
nav {{ position: sticky; top: 0; z-index: 1; display: flex; flex-wrap: wrap; gap: 4px; padding: 12px 16px; background: #000; border-bottom: 1px solid #333; }}
button {{ padding: 6px 10px; background: none; color: #888; border: 1px solid #333; font: inherit; font-size: 12px; letter-spacing: .06em; text-transform: uppercase; cursor: pointer; }}
button[aria-pressed="true"], button:hover {{ color: #fff; border-color: #fff; }}
main {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px 16px; padding: 16px; }}
.t {{ color: inherit; text-decoration: none; min-width: 0; }}
.t img, .none {{ display: block; width: 100%; aspect-ratio: 3 / 2; object-fit: cover; background: #111; }}
.t:hover img {{ opacity: .85; }}
.n {{ margin: 8px 0 0; }} .m {{ margin: 2px 0 0; color: #888; }}
.t[hidden] {{ display: none; }}
</style></head><body>
<nav><button data-f="all" aria-pressed="true">All</button>{buttons}<button data-f="free">Free</button></nav>
<main>{''.join(card(t) for t in lib)}</main>
<script>
const bs = document.querySelectorAll('nav button');
for (const b of bs) b.onclick = () => {{
  for (const x of bs) x.setAttribute('aria-pressed', String(x === b));
  for (const t of document.querySelectorAll('.t')) t.hidden = !(b.dataset.f === 'all' || (b.dataset.f === 'free' ? t.dataset.free === '1' : t.dataset.cat === b.dataset.f));
}};
</script></body></html>
'''


def main():
    DIR.mkdir(parents=True, exist_ok=True)
    lib = json.loads(LIB.read_text()) if LIB.exists() else []
    lib = merge(lib, sys.argv[1:])
    LIB.write_text(json.dumps(lib, indent=1, ensure_ascii=False) + '\n')
    (DIR / 'index.html').write_text(page(lib))
    print(f'{len(lib)} templates: {LIB.relative_to(ROOT)}, {(DIR / "index.html").relative_to(ROOT)}')


if __name__ == '__main__':
    main()
