"""Screenshots of one identity direction, for checking it by eye.

  python3 web/scripts/identity-shoot.py <slug> [--quick] [--out=DIR]
  python3 web/scripts/identity-shoot.py page [--out=DIR]     the whole page, top and overview

Writes web/.identity-shots/<slug>/: the chapter at 1440 and 390 wide, every
still on its own, the favicons blown up 8x (pixels kept square), six motion
frames (t 0, 0.2 … 1), the application, and the direction's four deck slides
(skipped with --quick). Prints the console errors and page errors it saw.
Starts a static server on web/src at port 8765 if none is running.
"""

import glob
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

WEB = Path(__file__).resolve().parent.parent
PORT = 8765
BASE = f'http://localhost:{PORT}/identity'


def ensure_server():
    try:
        urllib.request.urlopen(f'{BASE}/index.html', timeout=2)
        return
    except Exception:
        pass
    subprocess.Popen([sys.executable, str(WEB / 'scripts' / 'identity-serve.py'), str(PORT)],
                     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
    for _ in range(50):
        try:
            urllib.request.urlopen(f'{BASE}/index.html', timeout=1)
            return
        except Exception:
            time.sleep(0.2)
    raise SystemExit('could not start the static server on port 8765')


def browser(p):
    exe = sorted(glob.glob(str(Path.home() / 'Library/Caches/ms-playwright/chromium_headless_shell-*/*/chrome-headless-shell')))
    kw = {'executable_path': exe[-1]} if exe else {}
    return p.chromium.launch(args=['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'], **kw)


def watch(page, log):
    page.on('console', lambda m: m.type in ('error', 'warning') and log.append(f'console.{m.type}: {m.text}'))
    page.on('pageerror', lambda e: log.append(f'pageerror: {e}'))
    page.on('requestfailed', lambda r: log.append(f'requestfailed: {r.url} {r.failure}'))


def shoot_page(out):
    out.mkdir(parents=True, exist_ok=True)
    log = []
    ensure_server()
    with sync_playwright() as p:
        b = browser(p)
        page = b.new_page(viewport={'width': 1440, 'height': 900}, device_scale_factor=1)
        watch(page, log)
        page.goto(f'{BASE}/index.html?t=0.6', wait_until='networkidle')
        page.wait_for_function('document.documentElement.dataset.ready === "1"', timeout=60000)
        page.screenshot(path=out / 'cover.png')  # the top of the page
        # The whole page, in slices (a browser can't capture one picture that tall), then
        # stacked and shrunk to an overview. Each slice is scrolled to first, so its chapters draw.
        height = page.evaluate('document.documentElement.scrollHeight')
        slices = []
        for i, y in enumerate(range(0, height, 6000)):
            page.evaluate(f'window.scrollTo(0, {y})')
            page.wait_for_timeout(900)
            path = out / f'slice-{i:02d}.png'
            page.screenshot(path=path, full_page=True, clip={'x': 0, 'y': y, 'width': 1440, 'height': min(6000, height - y)})
            slices.append(str(path))
        subprocess.run(['magick', *slices, '+repage', '-append', '-resize', '35%', '+repage', str(out / 'page-overview.png')], check=False)
        for f in slices:
            Path(f).unlink()
        b.close()
    print(f'wrote cover.png, page-overview.png to {out}')
    for l in dict.fromkeys(log):
        print('  ', l)


def shoot(slug, quick=False, out=None):
    out = Path(out) if out else WEB / '.identity-shots' / slug
    out.mkdir(parents=True, exist_ok=True)
    for f in out.glob('*.png'):
        f.unlink()
    log = []
    ensure_server()
    with sync_playwright() as p:
        b = browser(p)

        # Desktop: the whole chapter, then each piece.
        page = b.new_page(viewport={'width': 1440, 'height': 900}, device_scale_factor=1)
        watch(page, log)
        page.goto(f'{BASE}/index.html?d={slug}&t=0.6', wait_until='networkidle')
        page.wait_for_function('document.documentElement.dataset.ready === "1"', timeout=30000)
        page.wait_for_timeout(400)
        page.screenshot(path=out / 'chapter-1440.png', full_page=True)
        sec = page.locator(f'section#{slug}')
        pieces = {
            'wordmark-ink': '.row.two .panel.ground-ink',
            'wordmark-paper': '.row.two .panel.ground-paper',
            'symbol': '.row.three .panel.ground-ink',
            'favicons': '.row.three .panel.ground-mid',
            'lockup': '.row.three .panel.ground-paper',
            'application': '.app-el',
            'specimen': '[data-specimen]',
        }
        for name, sel in pieces.items():
            loc = sec.locator(sel).first
            if loc.count():
                loc.scroll_into_view_if_needed()
                page.wait_for_timeout(150)
                loc.screenshot(path=out / f'{name}.png')
        page.evaluate(f'window.__identity.ready("{slug}")')
        motion = sec.locator('.motion-el').first
        motion.scroll_into_view_if_needed()
        for t in (0, 0.2, 0.4, 0.6, 0.8, 1):
            page.evaluate(f'window.__identity.seek("{slug}", {t})')
            page.wait_for_timeout(120)
            motion.screenshot(path=out / f'motion-t{t:.1f}.png')
        page.close()

        # Favicons at their true pixel sizes, blown up so the pixels can be judged.
        page = b.new_page(viewport={'width': 400, 'height': 300}, device_scale_factor=1)
        watch(page, log)
        page.goto(f'{BASE}/index.html?d={slug}&t=0.6', wait_until='networkidle')
        page.wait_for_function('document.documentElement.dataset.ready === "1"', timeout=30000)
        for i, size in enumerate((64, 32, 16)):
            loc = page.locator(f'section#{slug} .sizes .fav').nth(i)
            if loc.count():
                path = out / f'favicon-{size}.png'
                loc.screenshot(path=path)
                subprocess.run(['magick', str(path), '-filter', 'point', '-resize', '800%', str(out / f'favicon-{size}-x8.png')], check=False)
        page.close()

        # Phone.
        page = b.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
        watch(page, log)
        page.goto(f'{BASE}/index.html?d={slug}&t=0.6', wait_until='networkidle')
        page.wait_for_function('document.documentElement.dataset.ready === "1"', timeout=30000)
        page.wait_for_timeout(400)
        page.screenshot(path=out / 'chapter-390.png', full_page=True)
        page.close()

        # The deck's four slides for this direction.
        if not quick:
            page = b.new_page(viewport={'width': 1968, 'height': 1128}, device_scale_factor=1)
            watch(page, log)
            page.goto(f'{BASE}/deck.html?d={slug}', wait_until='networkidle')
            page.wait_for_function('document.documentElement.dataset.ready === "1"', timeout=60000)
            page.wait_for_timeout(300)
            for i in range(page.locator('.slide').count()):
                page.locator('.slide').nth(i).screenshot(path=out / f'deck-{i + 1}.png')
            page.close()
        b.close()

    print(f'wrote {len(list(out.glob("*.png")))} pictures to {out}')
    seen = set()
    errors = [l for l in log if not (l in seen or seen.add(l))]
    print('errors:' if errors else 'no console errors')
    for l in errors:
        print('  ', l)


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if not args:
        raise SystemExit(__doc__)
    out = next((a.split('=', 1)[1] for a in sys.argv[1:] if a.startswith('--out=')), None)
    if args[0] == 'page':
        shoot_page(Path(out) if out else WEB / '.identity-shots' / 'page')
    else:
        shoot(args[0], quick='--quick' in sys.argv, out=out)
