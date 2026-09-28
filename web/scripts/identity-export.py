"""Export the directions' marks as files to open in Illustrator.

  python3 web/scripts/identity-export.py [slug ...]      (all of them without a slug)

Writes identity/<nn>-<slug>/ at the repo root:
  wordmark.svg, symbol.svg, lockup.svg             one colour, black, no ground: the masters
  wordmark-on-ink.svg, wordmark-on-paper.svg       in the direction's colours, the ground as its own
  symbol-on-ink.svg, lockup-on-paper.svg             rectangle (id "ground"), easy to delete
  favicon-16.svg, favicon-32.svg, favicon-64.svg
  lockup-sm.svg, lockup-sm-on-paper.svg            the S M's lockup, where a chapter has one
  motion/t0.0.png … t1.0.png                       the motion, eleven frames at 1920 x 1080
  application.png                                  only where a chapter still shows one
Every SVG gets a width and height from its viewBox, and currentColor becomes a
real colour, since Illustrator knows neither CSS nor currentColor. It warns
about anything Illustrator handles badly: text, images, CSS, filters, masks.
"""

import re
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.path.insert(0, str(Path(__file__).resolve().parent))
from importlib import import_module

shoot = import_module('identity-shoot')

ROOT = Path(__file__).resolve().parent.parent.parent
OUT = ROOT / 'identity'
RISKY = {
    '<text': 'text (Illustrator needs outlines: draw the letters as paths)',
    '<image': 'an embedded image',
    '<foreignObject': 'HTML inside the SVG',
    '<style': 'a CSS style block',
    'filter=': 'an SVG filter',
    '<filter': 'an SVG filter',
    'mask=': 'a mask (prefer cutting the shapes: evenodd paths or clipped polygons)',
    'var(--': 'a CSS variable',
}

GET = '''async (slug) => {
  const m = await import(`/identity/directions/${slug}.js`);
  const call = (fn, arg) => { try { return typeof m[fn] === 'function' ? m[fn](arg) : null; } catch (e) { return 'ERROR ' + e.message; } };
  return {
    info: JSON.parse(JSON.stringify(m.info ?? {})),
    wordmark_ink: call('wordmark', { ground: 'ink' }), wordmark_paper: call('wordmark', { ground: 'paper' }),
    symbol_ink: call('symbol', { ground: 'ink' }), symbol_paper: call('symbol', { ground: 'paper' }),
    lockup_ink: call('lockup', { ground: 'ink' }), lockup_paper: call('lockup', { ground: 'paper' }),
    lockup_sm: typeof m.lockupSM === 'function' ? call('lockupSM', { ground: 'paper' }) : null,
    fav16: call('favicon', { size: 16 }), fav32: call('favicon', { size: 32 }), fav64: call('favicon', { size: 64 }),
  };
}'''


def viewbox(svg):
    m = re.search(r'viewBox="\s*([-\d.eE]+)[\s,]+([-\d.eE]+)[\s,]+([-\d.eE]+)[\s,]+([-\d.eE]+)\s*"', svg)
    return tuple(float(v) for v in m.groups()) if m else None


def prepare(svg, color, ground=None, size=None):
    """currentColor → color; width and height from the viewBox (or size); the ground as a first rectangle."""
    svg = svg.replace('currentColor', color).replace('currentcolor', color)
    vb = viewbox(svg)
    head = re.match(r'<svg\b[^>]*>', svg)
    if not head or not vb:
        return svg
    tag = head.group(0)
    tag = re.sub(r'\s(width|height)="[^"]*"', '', tag)
    w, h = (size, size) if size else (round(vb[2], 2), round(vb[3], 2))
    tag = tag[:-1].rstrip('/') + f' width="{w}" height="{h}">'
    if 'xmlns="http://www.w3.org/2000/svg"' not in tag:
        tag = tag.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"', 1)
    rect = f'<rect id="ground" x="{vb[0]}" y="{vb[1]}" width="{vb[2]}" height="{vb[3]}" fill="{ground}"/>' if ground else ''
    return tag + rect + svg[head.end():]


def export(page, slug, n):
    d = page.evaluate(GET, slug)
    info = d['info']
    pal = {'ink': '#000000', 'paper': '#ffffff'}  # black and white only (the focus round)
    out = OUT / f'{n:02d}-{slug}'
    out.mkdir(parents=True, exist_ok=True)
    warnings = []
    files = {
        'wordmark.svg': (d['wordmark_paper'], '#000000', None, None),
        'symbol.svg': (d['symbol_paper'], '#000000', None, None),
        'lockup.svg': (d['lockup_paper'], '#000000', None, None),
        'wordmark-on-ink.svg': (d['wordmark_ink'], pal['paper'], pal['ink'], None),
        'wordmark-on-paper.svg': (d['wordmark_paper'], pal['ink'], pal['paper'], None),
        'symbol-on-ink.svg': (d['symbol_ink'], pal['paper'], pal['ink'], None),
        'lockup-on-paper.svg': (d['lockup_paper'], pal['ink'], pal['paper'], None),
        **({'lockup-sm.svg': (d['lockup_sm'], '#000000', None, None),
            'lockup-sm-on-paper.svg': (d['lockup_sm'], pal['ink'], pal['paper'], None)} if d.get('lockup_sm') else {}),
        'favicon-16.svg': (d['fav16'], pal['paper'], None, 16),
        'favicon-32.svg': (d['fav32'], pal['paper'], None, 32),
        'favicon-64.svg': (d['fav64'], pal['paper'], None, 64),
    }
    for name, (svg, color, ground, size) in files.items():
        if not svg or not isinstance(svg, str) or not svg.lstrip().startswith('<svg'):
            warnings.append(f'{name}: no SVG ({str(svg)[:80]})')
            continue
        for needle, why in RISKY.items():
            if needle in svg:
                warnings.append(f'{name}: {why}')
        (out / name).write_text(prepare(svg, color, ground, size))
    return out, warnings


def frames(b, slug, out):
    page = b.new_page(viewport={'width': 1920, 'height': 1200}, device_scale_factor=1)
    page.goto(f'{shoot.BASE}/index.html?d={slug}&t=0', wait_until='networkidle')
    page.wait_for_function('document.documentElement.dataset.ready === "1"', timeout=60000)
    page.add_style_tag(content='#page { padding: 0 !important; } .ch-head, .ch-story, .controls { display: none !important; } .chapter { padding: 0 !important; }')
    page.evaluate(f'window.__identity.ready("{slug}")')
    motion = page.locator(f'section#{slug} .motion-el').first
    (out / 'motion').mkdir(exist_ok=True)
    for f in (out / 'motion').glob('*.png'):
        f.unlink()
    for i in range(11):
        t = i / 10
        page.evaluate(f'window.__identity.seek("{slug}", {t})')
        page.wait_for_timeout(120)
        motion.screenshot(path=out / 'motion' / f't{t:.1f}.png')
    # The focus round shows no applications: a picture only where a chapter still renders one.
    app = page.locator(f'section#{slug} .app-el')
    if app.count():
        app.first.scroll_into_view_if_needed()
        page.wait_for_timeout(800)
        app.first.screenshot(path=out / 'application.png')
    else:
        (out / 'application.png').unlink(missing_ok=True)
    page.close()



MODULAR = '''async () => {
  const m = await import('/identity/modular.js');
  const p = m.MODULAR_DEFAULTS;
  return {
    word: await m.outlineSVG(p, 4), sm: await m.outlineSVG(p, 1),
    fav16: m.faviconSVG(p, 16), fav32: m.faviconSVG(p, 32), fav64: m.faviconSVG(p, 64),
  };
}'''


def modular(page, out):
    """The modular mark (modular.js): true outlines, and its favicons, in 00-original/modular/."""
    d = page.evaluate(MODULAR)
    folder = out / 'modular'
    folder.mkdir(exist_ok=True)
    (folder / 'modular-wordmark.svg').write_text(d['word'])
    (folder / 'modular-sm.svg').write_text(d['sm'])
    for n in (16, 32, 64):
        (folder / f'favicon-{n}.svg').write_text(d[f'fav{n}'])
    print(f'   modular: wrote {folder.relative_to(ROOT)}/')


SHAPES = '''async () => {
  const m = await import('/identity/shapes.js');
  const cat = await m.catalogue();
  const blocks = m.blocks(cat, { ...m.SHAPES_DEFAULTS, show: 'both', from: 'all' });
  const out = {};
  for (const b of blocks) b.shapes.forEach((s, i) => { out[`${b.source}-${b.kind}-${String(i + 1).padStart(2, '0')}.svg`] = m.shapeSVG(s); });
  out['all-shapes.svg'] = m.sheetSVG(blocks.map((b) => b.shapes), 'true');
  out['all-shapes-fitted.svg'] = m.sheetSVG(blocks.map((b) => b.shapes), 'fitted');
  return out;
}'''


def shapes(page, out):
    """The Shapes section (shapes.js): every distinct shape as true outlines, and all of them on two sheets, in 00-original/shapes/."""
    d = page.evaluate(SHAPES)
    folder = out / 'shapes'
    folder.mkdir(exist_ok=True)
    for old in folder.glob('*.svg'):
        old.unlink()
    for name, svg in d.items():
        (folder / name).write_text(svg)
    print(f'   shapes: wrote {len(d)} files to {folder.relative_to(ROOT)}/')


def main():
    slugs_js = (ROOT / 'web/src/identity/directions.js').read_text()
    order = re.findall(r"'([a-z-]+)'", re.search(r'SLUGS = \[([^\]]*)\]', slugs_js).group(1))
    wanted = [a for a in sys.argv[1:] if not a.startswith('--')] or order
    shoot.ensure_server()
    with sync_playwright() as p:
        b = shoot.browser(p)
        page = b.new_page()
        page.goto(f'{shoot.BASE}/index.html?d=none', wait_until='networkidle')
        for slug in wanted:
            out, warnings = export(page, slug, order.index(slug))
            frames(b, slug, out)
            print(f'{slug}: wrote {out.relative_to(ROOT)}/')
            for w in warnings:
                print(f'   warning: {w}')
            if slug == 'original':
                modular(page, out)
                shapes(page, out)

        b.close()


if __name__ == '__main__':
    main()
