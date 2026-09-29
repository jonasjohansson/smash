// The lock: every page of the site asks for the password first, once per
// browser. It keeps the site out of casual view while it is being made; it is
// not security (the site is static and its repository public, so anyone who
// reads the source can read the pages), and only a salted hash of the
// password is kept here. It is loaded first in every page's head, so nothing
// shows before it; not on localhost, so local tools see the pages.
(() => {
  const KEY = 'smash-lock';
  const SALT = 'smash-website:';
  const HASH = '92149cac92f76e9c79852d370d759c6aaa6b6fb6fbf8e04f28c5ebb6f6725c4b';
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return;
  try { if (localStorage.getItem(KEY) === HASH) return; } catch {}
  const root = document.documentElement;
  root.classList.add('locked');
  const style = document.createElement('style');
  style.textContent = `
html.locked, html.locked body { background: #000 !important; overflow: hidden !important; }
html.locked body { visibility: hidden !important; } /* hidden but laid out, so the page's own scripts measure it right */
.lock { position: fixed; inset: 0; z-index: 2147483647; display: grid; place-items: center; background: #000; color: #fff; visibility: visible; }
.lock form { display: grid; justify-items: center; gap: 28px; width: min(260px, 76vw); }
.lock i { display: block; width: 18px; height: 18px; background: #fff; }
.lock input { width: 100%; font: 16px/1.2 ui-monospace, Menlo, monospace; letter-spacing: 0.2em; text-align: center; color: #fff; background: none; border: 0; border-bottom: 1px solid rgba(255, 255, 255, 0.5); border-radius: 0; padding: 10px 0; outline: none; }
.lock input:focus { border-bottom-color: #fff; }
.lock input::placeholder { color: rgba(255, 255, 255, 0.35); letter-spacing: 0.08em; }
.lock.wrong form { animation: lock-no 0.36s; }
@keyframes lock-no { 20%, 60% { transform: translateX(-7px); } 40%, 80% { transform: translateX(7px); } }
@media (prefers-reduced-motion: reduce) { .lock.wrong form { animation: none; } }`;
  document.head.appendChild(style);
  const show = () => {
    const el = document.createElement('div');
    el.className = 'lock';
    el.innerHTML = '<form><i aria-hidden="true"></i><input type="password" name="password" placeholder="password" aria-label="Password" autocomplete="current-password" autocapitalize="off" spellcheck="false"></form>';
    document.body.appendChild(el);
    const form = el.querySelector('form');
    const input = el.querySelector('input');
    input.focus();
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(SALT + input.value));
      const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
      if (hex !== HASH) {
        el.classList.remove('wrong');
        void el.offsetWidth;
        el.classList.add('wrong');
        input.select();
        return;
      }
      try {
        localStorage.setItem(KEY, HASH);
        location.reload(); // open, the page runs as it should, laid out from the start
      } catch {
        el.remove(); // no storage (a private window): open it in place, for this visit
        root.classList.remove('locked');
        dispatchEvent(new Event('resize'));
      }
    });
  };
  if (document.body) show();
  else addEventListener('DOMContentLoaded', show);
})();
