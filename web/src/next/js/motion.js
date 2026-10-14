// Whether films may play by themselves: not with reduced motion, Save-Data
// or a slow connection. A change of the reduced-motion setting fires
// 'motionchange' on window.

const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const conn = navigator.connection;
const slow = () => Boolean(conn && (conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '')));

export const motion = {
  get reduced() { return reduced.matches; },
  get slow() { return slow(); },
  get auto() { return !reduced.matches && !slow(); },
};

reduced.addEventListener?.('change', () => dispatchEvent(new Event('motionchange')));
