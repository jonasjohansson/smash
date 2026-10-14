// Whether films may play by themselves: the visitor's Motion toggle (kept in
// localStorage), reduced motion, Save-Data and a slow connection.
// motion.on is the toggle; motion.auto is whether anything may autoplay.
// A change fires 'motionchange' on window.

const KEY = 'smash-motion';
const read = () => { try { return localStorage.getItem(KEY) !== 'off'; } catch { return true; } };
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const conn = navigator.connection;
const slow = () => Boolean(conn && (conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '')));

let on = read();
const apply = () => { document.documentElement.dataset.motion = on ? 'on' : 'off'; };
apply();

export const motion = {
  get on() { return on; },
  get reduced() { return reduced.matches; },
  get slow() { return slow(); },
  get auto() { return on && !reduced.matches && !slow(); },
  set(value) {
    on = Boolean(value);
    try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* private window: this visit only */ }
    apply();
    dispatchEvent(new Event('motionchange'));
  },
};

reduced.addEventListener?.('change', () => dispatchEvent(new Event('motionchange')));
