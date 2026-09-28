"""The identity page's local server: web/src on port 8765, never cached.

  python3 web/scripts/identity-serve.py [port]

Python's plain http.server lets a browser keep modules, so after an edit a page
can load a new file next to an old one (an import then fails). This one tells
the browser to store nothing.
"""

import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / 'src'


class NoStore(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, *args):
        pass


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    ThreadingHTTPServer(('', port), partial(NoStore, directory=str(ROOT))).serve_forever()
