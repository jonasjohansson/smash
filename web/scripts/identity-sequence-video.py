"""Render the identity sequence (/identity/sequence/) as an MP4 with its sound.

  python3 web/scripts/identity-sequence-video.py [--punchy] [--paper] [--size=1920x1080] [--fps=60] [--out=PATH]

One whole loop (the logo to the square and back), so it loops without a seam:
each frame drawn at its exact time (seek, then a screenshot), the sound
rendered offline from the same moves (sound.js through an OfflineAudioContext),
and the two put together by ffmpeg (H.264 and AAC). By default it writes
web/src/identity/sequence/video/smash-sequence[-punchy][-paper].mp4, where
the page's download button finds it.
"""

import base64
import subprocess
import sys
import tempfile
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.path.insert(0, str(Path(__file__).resolve().parent))
from importlib import import_module

shoot = import_module('identity-shoot')

ROOT = Path(__file__).resolve().parent.parent.parent


def main():
    args = {a.split('=')[0]: (a.split('=', 1)[1] if '=' in a else True) for a in sys.argv[1:]}
    punchy, paper = bool(args.get('--punchy')), bool(args.get('--paper'))
    w, h = (int(v) for v in str(args.get('--size', '1920x1080')).split('x'))
    fps = int(args.get('--fps', 60))
    name = 'smash-sequence' + ('-punchy' if punchy else '') + ('-paper' if paper else '') + ('' if (w, h) == (1920, 1080) else f'-{w}x{h}')
    out = Path(args.get('--out', ROOT / 'web/src/identity/sequence/video' / f'{name}.mp4'))
    out.parent.mkdir(parents=True, exist_ok=True)
    query = '&'.join(['at=0'] + (['punchy'] if punchy else []) + (['paper'] if paper else []))

    shoot.ensure_server()
    with tempfile.TemporaryDirectory() as tmp, sync_playwright() as p:
        b = shoot.browser(p)
        page = b.new_page(viewport={'width': w, 'height': h}, device_scale_factor=1)
        page.goto(f'{shoot.BASE}/sequence/?{query}', wait_until='networkidle')
        page.wait_for_function('document.documentElement.dataset.ready === "1"')
        page.add_style_tag(content='.bar { display: none !important; } .seq { grid-template-rows: minmax(0, 1fr) !important; }')
        period = page.evaluate('window.__sequence.PERIOD')
        wav = Path(tmp) / 'sound.wav'
        wav.write_bytes(base64.b64decode(page.evaluate('window.__sequence.soundtrack()')))
        frames = round(period * fps)
        print(f'{name}: {period:.2f} s, {frames} frames at {w} x {h}, {fps} fps')
        ff = subprocess.Popen([
            'ffmpeg', '-y', '-loglevel', 'error',
            '-f', 'image2pipe', '-framerate', str(fps), '-i', '-',
            '-i', str(wav),
            '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-tune', 'animation', '-pix_fmt', 'yuv420p',
            '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart',
            str(out),
        ], stdin=subprocess.PIPE)
        for i in range(frames):
            page.evaluate(f'window.__sequence.seek({i / fps})')
            ff.stdin.write(page.screenshot(type='png'))
            if i % (fps * 5) == 0:
                print(f'   {i / fps:.0f} s')
        ff.stdin.close()
        if ff.wait():
            sys.exit('ffmpeg failed')
        b.close()
    print(f'wrote {out.relative_to(ROOT)} ({out.stat().st_size / 1e6:.1f} MB)')


if __name__ == '__main__':
    main()
